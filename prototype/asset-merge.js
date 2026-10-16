const missing=Symbol('missing');
const equal=(a,b)=>a===missing||b===missing?a===b:JSON.stringify(a)===JSON.stringify(b);
const object=v=>v!==missing&&v&&typeof v==='object'&&!Array.isArray(v);
const escape=s=>String(s).replaceAll('~','~0').replaceAll('/','~1');
function safe(value){let count=0;const active=new Set();function visit(v,depth){if(depth>64||++count>1000000)throw Error('병합 자료 크기·깊이를 확인하세요.');if(v===null||typeof v==='boolean'||typeof v==='string')return;if(typeof v==='number'&&Number.isFinite(v))return;if(typeof v!=='object'||active.has(v)||!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)throw Error('병합 자료는 순환 없는 JSON이어야 해요.');active.add(v);if(Array.isArray(v))for(const item of v)visit(item,depth+1);else for(const [key,item]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))throw Error('병합 속성 이름을 확인하세요.');visit(item,depth+1);}active.delete(v);}visit(value,0);}
function identity(arrays){if(!object(arrays.find(a=>a.length)?.[0]))return;const rows=arrays.flat();if(!rows.every(object))return;for(const key of ['id','name','key','culture','time'])if(rows.every(r=>Object.hasOwn(r,key)&&(key==='time'?Number.isFinite(r[key]):typeof r[key]==='string'&&!!r[key]))){for(const array of arrays)if(new Set(array.map(r=>r[key])).size!==array.length)throw Error('병합할 안정 ID가 중복돼요: '+key);return key;}}
// IDs identify graph/scene rows; positional geometry arrays remain atomic.
export function mergeAsset(base,ours,theirs,{resolutions={}}={}){
 for(const value of [base,ours,theirs,resolutions])safe(value);if(!object(resolutions))throw Error('충돌 선택은 경로별 객체예요.');
 const conflicts=[],resolved=[],used=new Set(),copy=v=>v===missing?v:structuredClone(v);
 function conflict(path,b,a,t,kind='value'){
  const id='/'+path.map(escape).join('/'),row={id,path,kind,hasBase:b!==missing,hasOurs:a!==missing,hasTheirs:t!==missing,...(b!==missing?{base:copy(b)}:{}),...(a!==missing?{ours:copy(a)}:{}),...(t!==missing?{theirs:copy(t)}:{})};
  if(Object.hasOwn(resolutions,id)){const choice=resolutions[id];used.add(id);let value;if(['base','ours','theirs'].includes(choice))value=choice==='base'?b:choice==='ours'?a:t;else if(object(choice)&&Object.keys(choice).length===1&&Object.hasOwn(choice,'value'))value=choice.value;else throw Error('충돌 선택은 base/ours/theirs 또는 {value}예요.');resolved.push({...row,choice:copy(choice)});return copy(value);}
  conflicts.push(row);return copy(a);
 }
 function merge(b,a,t,path){
  if(equal(a,t))return copy(a);if(equal(a,b))return copy(t);if(equal(t,b))return copy(a);
  if(a===missing||t===missing)return conflict(path,b,a,t,'delete-modify');
  if(object(b)&&object(a)&&object(t)){const result={};for(const key of new Set([...Object.keys(a),...Object.keys(t),...Object.keys(b)])){const value=merge(Object.hasOwn(b,key)?b[key]:missing,Object.hasOwn(a,key)?a[key]:missing,Object.hasOwn(t,key)?t[key]:missing,[...path,key]);if(value!==missing)result[key]=value;}return result;}
  if(Array.isArray(b)&&Array.isArray(a)&&Array.isArray(t)){
   const key=identity([b,a,t]);if(key){const maps=[b,a,t].map(rows=>new Map(rows.map(r=>[r[key],r]))),ids=[...new Set([...a,...t,...b].map(r=>r[key]))],result=new Map();
    for(const id of ids){const value=merge(...maps.map(m=>m.has(id)?m.get(id):missing),[...path,'@'+key+'='+id]);if(value!==missing)result.set(id,value);}
    if(key==='time')return [...result.values()].sort((a,b)=>a.time-b.time);
    const orders=[b,a,t].map(rows=>rows.map(r=>r[key]).filter(id=>result.has(id))),present=orders.map(ids=>new Set(ids)),common=new Set(orders[0].filter(id=>present[1].has(id)&&present[2].has(id))),relative=orders.map(ids=>ids.filter(id=>common.has(id)));let order=orders[1];
    if(equal(relative[1],relative[0]))order=orders[2];else if(!equal(relative[2],relative[0])&&!equal(relative[1],relative[2]))order=conflict([...path,'$order'],orders[0],orders[1],orders[2],'order');
    if(!Array.isArray(order)||new Set(order).size!==order.length||order.some(id=>!result.has(id)))throw Error('병합 순서 선택을 확인하세요.');order=[...order];
    const head=Symbol('head'),links=new Map(),prev=new Map(),included=new Set(order);let tail=head;for(const id of order){links.set(tail,id);prev.set(id,tail);tail=id;}
    for(const list of [orders[1],orders[2]])for(let i=0;i<list.length;i++)if(!included.has(list[i])){let anchor=i-1;while(anchor>=0&&!included.has(list[anchor]))anchor--;let before;if(anchor>=0)before=list[anchor];else{let next=i+1;while(next<list.length&&!included.has(list[next]))next++;before=next<list.length?prev.get(list[next]):tail;}const next=links.get(before),id=list[i];links.set(before,id);prev.set(id,before);if(next!==undefined){links.set(id,next);prev.set(next,id);}else tail=id;included.add(id);}
    const sorted=[];for(let id=links.get(head);id!==undefined;id=links.get(id))sorted.push(result.get(id));return sorted;
   }
   if(['position','rotation','scale','color','baseColor','offset','alignment','anchors'].includes(path.at(-1))&&b.length===a.length&&a.length===t.length&&a.length<=4&&[b,a,t].every(rows=>rows.every(Number.isFinite)))return a.map((v,i)=>merge(b[i],v,t[i],[...path,String(i)]));
  }
  return conflict(path,b,a,t,b===missing?'add-add':'value');
 }
 const data=merge(base,ours,theirs,[]);for(const key of Object.keys(resolutions))if(!used.has(key))throw Error('존재하지 않는 충돌 경로예요: '+key);if(data===missing)throw Error('루트 에셋을 삭제하는 병합은 허용하지 않아요.');safe(data);return {data,conflicts,resolved,clean:conflicts.length===0};
}
