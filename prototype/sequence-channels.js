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
    const {read,apply,empty,valid=()=>true}=typeof options==='function'?options():options;if(!valid())return;
    if(!fields){fields=new Map();this.fields.set(target,fields);}
    if(!row){row={fields,key,baseline:read(),entries:new Map(),top:null,version:0};fields.set(key,row);}
    entry={owner,apply,empty,valid,value,completionMode};row.entries.set(owner,entry);let rows=this.owners.get(owner);if(!rows){rows=new Set();this.owners.set(owner,rows);}rows.add(row);if(!row.top||stronger(owner,row.top.owner))row.top=entry;
    row.version++;if(row.top===entry&&entry.valid())return entry.apply(value,false);
  }
  // Stage all edges before publication so a legal hierarchy swap is atomic.
  async writeBatch(owner,updates){
    const plans=[];for(const {target,key,value,options,completionMode='default'}of updates){
      const fields=this.fields.get(target),row=fields?.get(key),before=row?.entries.get(owner),adapter=before||options();if(adapter.valid&&!adapter.valid())continue;
      const entry={valid:()=>true,...adapter,owner,target,key,value,completionMode},entries=new Map(row?.entries);entries.set(owner,entry);let top;for(const candidate of entries.values())if(!top||stronger(candidate.owner,top.owner))top=candidate;
      plans.push({target,key,row:row||{fields:null,key,baseline:adapter.read(),entries:new Map(),top:null,version:0},entry,top,fresh:!row});
    }
    const selected=plans.filter(p=>p.top===p.entry).map(p=>({row:p.row,entry:p.entry,value:p.entry.value}));this.validateActions(selected);
    for(const p of plans){let fields=this.fields.get(p.target);if(!fields){fields=new Map();this.fields.set(p.target,fields);}p.row.fields=fields;if(p.fresh)fields.set(p.key,p.row);p.row.entries.set(owner,p.entry);p.row.top=p.top;p.row.version++;let rows=this.owners.get(owner);if(!rows){rows=new Set();this.owners.set(owner,rows);}rows.add(p.row);}
    for(const a of selected)a.version=a.row.version;await this.applyActions(selected,false);
  }
  actionGroups(actions){const groups=[],batches=new Map();for(const a of actions){const fn=a.entry.batch;if(!fn){groups.push([a]);continue;}let group=batches.get(fn);if(!group){group=[];batches.set(fn,group);groups.push(group);}group.push(a);}return groups;}
  validateActions(actions){for(const group of this.actionGroups(actions))group[0].entry.validateBatch?.(group.map(a=>({target:a.entry.target,key:a.entry.key,value:a.value})));}
  async applyActions(actions,restoring){
    let error;for(const group of this.actionGroups(actions)){
      const current=a=>a.row.version===a.version&&(!a.row.fields.has(a.row.key)||a.row.fields.get(a.row.key)===a.row)&&a.entry.valid(),live=group.filter(current);if(!live.length)continue;
      try{const first=live[0];if(first.entry.batch)await first.entry.batch(live.map(a=>({target:a.entry.target,key:a.entry.key,value:a.value,current:()=>current(a)})),restoring);else if(!first.empty)await first.entry.apply(first.value,restoring);}catch(e){error??=e;}
      for(const a of live)if(a.vacant&&current(a)&&!a.row.fields.has(a.row.key))try{await a.entry.empty?.();}catch(e){error??=e;}
    }if(error)throw error;
  }
  async release(owner,{restore=true,defaultRestore=restore,forceRestore=false,only}={}){
    const owned=this.owners.get(owner);if(!owned)return;const rows=only?[only]:[...owned];for(const row of rows)owned.delete(row);if(!owned.size)this.owners.delete(owner);const actions=[];
    // Remove every lease before invoking user-facing operations that may reenter.
    for(const row of rows){const entry=row.entries.get(owner);row.entries.delete(owner);row.version++;if(row.top!==entry)continue;
      row.top=null;for(const candidate of row.entries.values())if(!row.top||stronger(candidate.owner,row.top.owner))row.top=candidate;
      const next=row.top;if(!next)row.fields.delete(row.key);
      const restoring=restore&&(forceRestore||entry.completionMode==='restore'||entry.completionMode!=='keep'&&defaultRestore);if(next||restoring||entry.empty)actions.push({row,version:row.version,entry:next||entry,value:next?next.value:row.baseline,empty:!next&&!restoring,vacant:!next});
    }
    await this.applyActions(actions,true);
  }
  releaseField(owner,target,key,options){const row=this.fields.get(target)?.get(key);return row?.entries.has(owner)?this.release(owner,{...options,only:row}):Promise.resolve();}
  owns(owner,target,key,value){const top=this.fields.get(target)?.get(key)?.top;return top?.owner===owner&&top.value===value;}
  async reprioritize(owner){
    const actions=[];for(const row of this.owners.get(owner)||[]){let next;for(const entry of row.entries.values())if(!next||stronger(entry.owner,next.owner))next=entry;if(next!==row.top)actions.push({row,entry:next,value:next.value});}
    this.validateActions(actions);for(const a of actions){a.row.top=a.entry;a.version=++a.row.version;}await this.applyActions(actions,true);
  }
  has(target,key){return this.fields.get(target)?.has(key)===true;}
  active(target){return [...(this.fields.get(target)?.values()||[])].filter(row=>row.top).map(row=>({key:row.key,value:row.top.value}));}
  clear(){this.owners.clear();this.fields=new WeakMap();}
  stats(){let leases=0;const rows=new Set();for(const values of this.owners.values())for(const row of values){rows.add(row);leases++;}return {owners:this.owners.size,channels:rows.size,leases};}
}
export const sequenceCompletionTypes=new Set(['position','rotation','scale','visible','camera','timeScale','light','material','component','variable','nativeProperty','parent','skeletalPose','componentState','animation']);
export const sequenceCompletionChoices=[['default','시퀀스 기본값'],['restore','원래 값 복원'],['keep','마지막 값 유지']];
export const validSequenceCompletion=t=>t.completionMode===undefined||sequenceCompletionChoices.some(([mode])=>mode===t.completionMode)&&(t.completionMode==='default'||sequenceCompletionTypes.has(t.type));
export const validSequencePriority=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
export const sequenceChannelContract={fields:['position','rotation','scale','visible','camera','timeScale','light','material(parameter)','component(property)','variable','nativeProperty','parent','skeletalPose','componentState','animation clip'],priority:'higher int32 priority wins each sampled field; equal priority uses accepted playback start order; seek never changes it; asset optional priority default0; LevelSequence::SetPriority/GetPriority applies a runtime override immediately after queued writes',restore:'resume latest sampled lower owner immediately; last restoring owner restores the shared preanimated baseline; an unsampled field is untouched',keepState:'last owner follows track completionMode default/restore/keep; restoreState supplies default; forceRestore overrides keep; another active owner resumes first',completion:'optional completionMode on managed tracks; optional sequence forceRestore:boolean (defaultfalse); manual Stop and natural completion share it',structural:'parent edges stage/validate together; whole component takes and scalar properties share typed field leases; direct Transform/component position-rotation-scale use one field; component deletion retains hidden samples; skeletal last release clears controlled sampling',clips:'winning active animation clip only; section gaps yield that field to the latest lower sample without releasing unrelated fields; last active track wins inside a sequence; simple external sprite/timeline/imported-clip playback resumes its frozen clock/settings; keep holds final pose; graphs/montages remain pending',identity:'actor identity guarded; global camera values also retain referenced camera identity',reentry:'Stop detaches the old map entry before callbacks; old awaited samples cannot stop/overwrite a replacement',cost:'weak object keys, leases only for sampled fields, no whole-scene transform copies or idle timers; counters on explicit query',remaining:['pre-sequence animation graph/montage state restoration; private mixer fades and finite-loop history','animation versus skeletal/transform and renderer-parameter aliases; weighted blending','arbitrary asynchronous external setter rollback']};
