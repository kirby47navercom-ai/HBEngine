const missing=Symbol('missing');
const object=v=>v!==missing&&v!==null&&typeof v==='object'&&!Array.isArray(v);
const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
function same(a,b){if(a===b)return true;if(a===missing||b===missing||a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));}

// Arrays are atomic: index-wise merging would silently reconnect graph nodes,
// reorder keys or combine independently edited geometry with the wrong IDs.
export function planDocumentMerge(base,mine,disk,choices={}){
 if(!object(choices)||Object.values(choices).some(v=>!['mine','disk'].includes(v)))throw Error('충돌 선택은 경로별 mine 또는 disk예요.');
 const conflicts=[],used=new Set();
 const merge=(a,b,c,pointer)=>{
  if(same(b,c))return b;if(same(a,b))return c;if(same(a,c))return b;
  if(object(a)&&object(b)&&object(c))return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b),...Object.keys(c)])].flatMap(key=>{const value=merge(Object.hasOwn(a,key)?a[key]:missing,Object.hasOwn(b,key)?b[key]:missing,Object.hasOwn(c,key)?c[key]:missing,pointer+'/'+escape(key));return value===missing?[]:[[key,value]];}));
  const choice=Object.hasOwn(choices,pointer)?choices[pointer]:null;if(choice)used.add(pointer);conflicts.push({pointer,basePresent:a!==missing,minePresent:b!==missing,diskPresent:c!==missing,choice});return choice==='disk'?c:b;
 };
 const data=merge(base,mine,disk,'');if(Object.keys(choices).some(key=>!used.has(key)))throw Error('현재 충돌에 없는 선택 경로예요.');
 return{data:structuredClone(data),conflicts,unresolved:conflicts.filter(row=>!row.choice).length};
}
const stale=()=>Object.assign(Error('충돌을 확인하는 동안 문서가 변경됐어요. 다시 비교하세요.'),{code:'REVISION_CONFLICT'});
export class DocumentMergeSession {
 constructor(doc){this.doc=doc;this.path=doc.path;this.kind=doc.kind;this.source=JSON.stringify(doc.data);this.saved=doc.saved;this.recovery=JSON.stringify([doc.view.recoveredBase,doc.view.recoveredDraft]);this.base=doc.view.recoveredDraft!==undefined&&typeof doc.view.recoveredBase!=='string'?undefined:JSON.parse(doc.view.recoveredBase??doc.saved);this.mine=structuredClone(doc.view.recoveredDraft??doc.data);}
 assertCurrent(documents){const d=this.doc;if(documents.items.get(this.path)!==d||d.path!==this.path||d.kind!==this.kind||JSON.stringify(d.data)!==this.source||d.saved!==this.saved||JSON.stringify([d.view.recoveredBase,d.view.recoveredDraft])!==this.recovery)throw stale();}
 plan(disk,choices,valid){const plan=planDocumentMerge(this.base,this.mine,disk,choices);plan.valid=plan.unresolved===0&&valid(this.kind,plan.data);return plan;}
 apply(documents,disk,plan,valid){this.assertCurrent(documents);if(plan.unresolved)throw Object.assign(Error('같은 속성의 변경을 먼저 선택하세요.'),{code:'DOCUMENT_MERGE_CONFLICT',conflicts:plan.conflicts});if(!plan.valid||!valid(this.kind,plan.data))throw Error('합친 에셋의 형식이 맞지 않아요.');const d=this.doc;d.history.push({kind:d.kind,data:structuredClone(d.data)});d.future=[];d.data=structuredClone(plan.data);d.saved=JSON.stringify(disk);d.dirty=JSON.stringify(d.data)!==d.saved;delete d.view.recoveredDraft;delete d.view.recoveredBase;delete d.view.nativeBuild;delete d.view.nativeMetadata;return d;}
}
export const documentMergeContract={command:'document.conflict.merge',choices:'JSON Pointer → mine|disk. Empty pointer selects a conflicting text/scalar root. Unknown choices reject.',semantics:'Three-way comparison from the saved base, current/recovered draft and freshly read disk. Independent object fields merge; overlapping arrays/text and deletion versus edit require explicit selection. No index-wise array merge.',publication:'Validated document draft, one Undo, current disk as save-CAS baseline. No disk write until ordinary document.save. Identity/path/current revision/recovered draft rechecked after IO.',dryRun:'Compact by default; includeData=true returns detached candidate. Unresolved conflicts are reported, never partially applied.',limits:['Binary write-ahead transaction recovery is a separate flow','No line-wise source/text merge','No automatic array ID/topology merge','No power-loss hardware durability claim']};
