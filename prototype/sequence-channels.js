// Preanimated state is shared per *object identity and field*, not per director.
// Later-started sequences win; hidden sequences still retain their latest sample.
// Only sampled fields acquire a lease. No idle timer or whole-scene snapshot.
const stronger=(a,b)=>(a.priority??0)!==(b.priority??0)?(a.priority??0)>(b.priority??0):a.order>b.order;
export class SequenceChannels{
  constructor(){this.fields=new WeakMap();this.owners=new Map();}
  write(owner,target,key,value,options,completionMode='default'){
    let fields=this.fields.get(target),row=fields?.get(key),entry=row?.entries.get(owner);
    if(entry){
      if(typeof options!=='function'&&options.valid&&!options.valid()||!entry.valid())return;
      entry.value=value;entry.completionMode=completionMode;row.version++;if(row.top===entry)return entry.apply(value,false);return;
    }
    // Build field adapters only when this owner first samples this channel.
    const {read,apply,valid=()=>true}=typeof options==='function'?options():options;if(!valid())return;
    if(!fields){fields=new Map();this.fields.set(target,fields);}
    if(!row){row={fields,key,baseline:read(),entries:new Map(),top:null,version:0};fields.set(key,row);}
    entry={owner,apply,valid,value,completionMode};row.entries.set(owner,entry);let rows=this.owners.get(owner);if(!rows){rows=new Set();this.owners.set(owner,rows);}rows.add(row);if(!row.top||stronger(owner,row.top.owner))row.top=entry;
    row.version++;if(row.top===entry&&entry.valid())return entry.apply(value,false);
  }
  async release(owner,{restore=true,defaultRestore=restore,forceRestore=false}={}){
    const rows=this.owners.get(owner);if(!rows)return;this.owners.delete(owner);const actions=[];
    // Remove every lease before invoking user-facing operations that may reenter.
    for(const row of rows){const entry=row.entries.get(owner);row.entries.delete(owner);row.version++;if(row.top!==entry)continue;
      row.top=null;for(const candidate of row.entries.values())if(!row.top||stronger(candidate.owner,row.top.owner))row.top=candidate;
      const next=row.top;if(!next)row.fields.delete(row.key);
      if(next||restore&&(forceRestore||entry.completionMode==='restore'||entry.completionMode!=='keep'&&defaultRestore))actions.push({row,version:row.version,entry:next||entry,value:next?next.value:row.baseline});
    }
    let error;for(const action of actions){const{row,entry,value,version}=action;if(row.version!==version||row.fields.has(row.key)&&row.fields.get(row.key)!==row||!entry.valid())continue;try{await entry.apply(value,true);}catch(e){error??=e;}}if(error)throw error;
  }
  async reprioritize(owner){
    const actions=[];for(const row of this.owners.get(owner)||[]){const before=row.top;let next;for(const entry of row.entries.values())if(!next||stronger(entry.owner,next.owner))next=entry;if(next===before)continue;row.top=next;row.version++;actions.push({row,next,version:row.version});}
    let error;for(const {row,next,version}of actions){if(row.version!==version||row.fields.get(row.key)!==row||!next?.valid())continue;try{await next.apply(next.value,true);}catch(e){error??=e;}}if(error)throw error;
  }
  clear(){this.owners.clear();this.fields=new WeakMap();}
  stats(){let leases=0;const rows=new Set();for(const values of this.owners.values())for(const row of values){rows.add(row);leases++;}return {owners:this.owners.size,channels:rows.size,leases};}
}
export const sequenceCompletionTypes=new Set(['position','rotation','scale','visible','camera','timeScale','light','material','component','variable','nativeProperty']);
export const sequenceCompletionChoices=[['default','시퀀스 기본값'],['restore','원래 값 복원'],['keep','마지막 값 유지']];
export const validSequenceCompletion=t=>t.completionMode===undefined||sequenceCompletionChoices.some(([mode])=>mode===t.completionMode)&&(t.completionMode==='default'||sequenceCompletionTypes.has(t.type));
export const validSequencePriority=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
export const sequenceChannelContract={fields:['position','rotation','scale','visible','camera','timeScale','light','material(parameter)','component(property)','variable','nativeProperty'],priority:'higher int32 priority wins each sampled field; equal priority uses accepted playback start order; seek never changes it; asset optional priority default0; LevelSequence::SetPriority/GetPriority applies a runtime override immediately after queued writes',restore:'resume latest sampled lower owner immediately; last restoring owner restores the shared preanimated baseline; an unsampled field is untouched',keepState:'last owner follows track completionMode default/restore/keep; restoreState supplies default; forceRestore overrides keep; another active owner resumes first',completion:'optional completionMode on managed tracks; optional sequence forceRestore:boolean (defaultfalse); manual Stop and natural completion share it',identity:'actor identity guarded; global camera values also retain referenced camera identity',reentry:'Stop detaches the old map entry before callbacks; old awaited samples cannot stop/overwrite a replacement',cost:'weak object keys, leases only for sampled fields, no whole-scene transform copies or idle timers; counters on explicit query',remaining:['parent/componentState/skeletal/animation ownership','cross-representation channels and weighted blending','arbitrary asynchronous external setter rollback']};
