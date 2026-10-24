// Preanimated state is shared per *object identity and field*, not per director.
// Legacy owners use priority/start order. Opt-in compatible fields can blend.
// Only sampled fields acquire a lease. No idle timer or whole-scene snapshot.
import {sequenceEntryEnabled,blendSequenceEntries} from './sequence-blending.js';
import {sequenceReferenceStateContract} from './sequence-reference-state.js';
const stronger=(a,b)=>(a.priority??0)!==(b.priority??0)?(a.priority??0)>(b.priority??0):a.order>b.order;
const resolve=(row,entries=row.entries)=>{if(row.resolve)return row.resolve(row,entries);let top;for(const entry of entries.values())if(sequenceEntryEnabled(entry)&&(!top||stronger(entry.owner,top.owner)))top=entry;return {top:top||null,value:top?blendSequenceEntries(top,entries):row.baseline};};
const changed=(row,next)=>row.top!==next.top||row.value!==next.value;
const contributes=(row,entry)=>row.top===entry||sequenceEntryEnabled(entry)&&(!row.top||stronger(entry.owner,row.top.owner)||entry.mix===row.top.mix&&entry.mix&&entry.owner.blendMode==='normalized'&&row.top.owner.blendMode==='normalized'&&(entry.owner.priority??0)===(row.top.owner.priority??0));
export class SequenceChannels{
  constructor(){this.fields=new WeakMap();this.owners=new Map();}
  write(owner,target,key,value,options,completionMode='default'){
    let fields=this.fields.get(target),row=fields?.get(key),before=row?.entries.get(owner);
    if(before&&(typeof options!=='function'&&options.valid&&!options.valid()||!before.valid()))return;
    // Reuse the accepted adapter on ordinary hot-path samples. Save two scalar
    // fields; allocate a restoration plan only if the setter actually fails.
    if(before&&!row.resolve&&(!row.top?.mix||row.top.owner.blendMode!=='normalized')){
      const previousValue=before.value,previousMode=before.completionMode,token=before.sampleVersion=(before.sampleVersion||0)+1;
      before.value=value;before.completionMode=completionMode;const version=++row.version;
      if(row.top!==before)return;row.value=value;
      const current=()=>row.version===version&&row.fields.get(key)===row&&before.valid();
      const failed=error=>this.failedFastSingle(owner,target,key,row,before,token,version,previousValue,previousMode,error);
      try{const result=before.apply(value,false,current);return result&&typeof result.then==='function'?Promise.resolve(result).catch(failed):result;}catch(error){return failed(error);}
    }
    const adapter=before||(typeof options==='function'?options():options);if(!before&&adapter.valid&&!adapter.valid())return;
    const entry={valid:()=>true,...adapter,owner,target,key,value,completionMode,sampleVersion:0};
    if(!row){const baseline=adapter.read();row={fields:null,key,baseline,value:baseline,entries:new Map(),top:null,version:0};}
    const snapshot={top:row.top,resolve:row.resolve},wasTop=row.top===before,participates=!before||contributes(row,before);
    let next,publish=false;
    if(before&&!row.resolve&&!participates)next={top:row.top,value:row.value};
    else if(before&&!row.resolve&&(!row.top?.mix||row.top.owner.blendMode!=='normalized')){next=wasTop?{top:entry,value}:{top:row.top,value:row.value};publish=wasTop;}
    else {const entries=new Map(row.entries);entries.set(owner,entry);next=resolve(row,entries);publish=changed(row,next);}
    if(!fields){fields=new Map();this.fields.set(target,fields);}row.fields=fields;fields.set(key,row);row.entries.set(owner,entry);let rows=this.owners.get(owner);if(!rows)this.owners.set(owner,rows=new Set());rows.add(row);
    Object.assign(row,next);const plan={target,key,row,entry,before,snapshot,sampleVersion:0,version:++row.version};
    if(!publish||!(next.top||snapshot.top))return;
    const selected=next.top||snapshot.top,current=()=>row.version===plan.version&&row.fields.get(key)===row&&selected.valid();
    if(!current())return;
    // Preserve the synchronous success fast path and O(1) ordinary overrides.
    // Only a failed setter enters the asynchronous restoration path.
    try{const result=selected.apply(next.value,false,current);return result&&typeof result.then==='function'?Promise.resolve(result).catch(error=>this.failedSingle(owner,plan,error)):result;}
    catch(error){return this.failedSingle(owner,plan,error);}
  }
  async failedFastSingle(owner,target,key,row,entry,token,version,value,completionMode,error){
    if(row.entries.get(owner)===entry&&entry.sampleVersion===token){const before={...entry,value,completionMode};await this.failedSingle(owner,{target,key,row,entry,before,snapshot:{top:entry,resolve:row.resolve},sampleVersion:token,version},error);}throw error;
  }
  async failedSingle(owner,plan,error){try{await this.rollbackBatch(owner,[plan]);}catch(rollback){throw new AggregateError([error,rollback],'시퀀스 적용·복원 실패',{cause:error});}throw error;}
  // Stage all edges before publication so a legal hierarchy swap is atomic.
  async writeBatch(owner,updates){
    // Last authored write wins for one target/field, with one baseline/lease.
    if(!Array.isArray(updates))updates=[...updates];
    const last=new Map();for(let i=0;i<updates.length;i++){const {target,key}=updates[i];let fields=last.get(target);if(!fields)last.set(target,fields=new Map());fields.set(key,i);}
    const plans=[];for(const [index,{target,key,value,options,resolve:compose,completionMode='default'}]of updates.entries()){
      if(last.get(target).get(key)!==index)continue;
      const fields=this.fields.get(target),row=fields?.get(key),before=row?.entries.get(owner),adapter=before||options();if(adapter.valid&&!adapter.valid())continue;
      const entry={valid:()=>true,...adapter,owner,target,key,value,completionMode},entries=new Map(row?.entries);entries.set(owner,entry);const baseline=row?row.baseline:adapter.read(),field=row||{fields:null,key,baseline,value:baseline,entries:new Map(),top:null,version:0},next=resolve(compose?{...field,resolve:compose}:field,entries);
      plans.push({target,key,row:field,entry,next,compose,fresh:!row,before,sampleVersion:0,snapshot:row?{top:row.top,resolve:row.resolve}:null});
    }
    const selected=plans.filter(p=>(p.next.top===p.entry||changed(p.row,p.next))&&(p.next.top||p.row.top)).map(p=>({row:p.row,entry:p.next.top||p.row.top,value:p.next.value}));this.validateActions(selected);
    for(const p of plans){let fields=this.fields.get(p.target);if(!fields){fields=new Map();this.fields.set(p.target,fields);}p.row.fields=fields;if(p.fresh)fields.set(p.key,p.row);p.row.entries.set(owner,p.entry);if(p.compose)p.row.resolve=p.compose;Object.assign(p.row,p.next);p.version=++p.row.version;let rows=this.owners.get(owner);if(!rows){rows=new Set();this.owners.set(owner,rows);}rows.add(p.row);}
    for(const a of selected)a.version=a.row.version;try{await this.applyActions(selected,false);}catch(error){try{await this.rollbackBatch(owner,plans);}catch(rollback){throw new AggregateError([error,rollback],'시퀀스 적용·복원 실패: '+(error?.message||String(error)),{cause:error});}throw error;}
  }
  async rollbackBatch(owner,plans){
    const actions=[];for(const p of plans){const row=this.fields.get(p.target)?.get(p.key);if(!row)continue;
      // A later sample by this owner or a replacement channel keeps its state.
      if(row===p.row&&row.entries.get(owner)===p.entry&&(p.entry.sampleVersion||0)===(p.sampleVersion||0)){const latest=row.version===p.version;if(p.before)row.entries.set(owner,p.before);else{row.entries.delete(owner);const owned=this.owners.get(owner);owned?.delete(row);if(!owned?.size)this.owners.delete(owner);}if(latest){if(p.snapshot?.resolve)row.resolve=p.snapshot.resolve;else delete row.resolve;}Object.assign(row,resolve(row));row.version++;if(!row.entries.size)row.fields.delete(row.key);const entry=row.top||p.snapshot?.top||p.before||p.entry;actions.push({row,version:row.version,entry,value:row.value,vacant:!row.entries.size});}
      else if(row.top)actions.push({row,version:row.version,entry:row.top,value:row.value});
    }
    this.validateActions(actions);await this.applyActions(actions,true);
  }
  actionGroups(actions){const groups=[],batches=new Map();for(const a of actions){const fn=a.entry.batch;if(!fn){groups.push([a]);continue;}let group=batches.get(fn);if(!group){group=[];batches.set(fn,group);groups.push(group);}group.push(a);}return groups;}
  validateActions(actions){for(const group of this.actionGroups(actions))group[0].entry.validateBatch?.(group.map(a=>({target:a.entry.target,key:a.entry.key,value:a.value})));}
  async applyActions(actions,restoring){
    let error,failed=false;for(const group of this.actionGroups([...actions].sort((a,b)=>Number(a.entry.key==='animation')-Number(b.entry.key==='animation')))){
      const current=a=>a.row.version===a.version&&(!a.row.fields.has(a.row.key)||a.row.fields.get(a.row.key)===a.row)&&a.entry.valid(),live=group.filter(current);if(!live.length)continue;
      try{const first=live[0],writes=live.filter(a=>!a.empty);if(first.entry.batch){if(writes.length)await first.entry.batch(writes.map(a=>({target:a.entry.target,key:a.entry.key,value:a.value,current:()=>current(a)})),restoring);}else if(!first.empty)await first.entry.apply(first.value,restoring,()=>current(first));}catch(e){if(!failed){error=e;failed=true;}}
      for(const a of live)if(a.vacant&&current(a)&&!a.row.fields.has(a.row.key))try{await a.entry.empty?.(a.row.baseline);}catch(e){if(!failed){error=e;failed=true;}}
    }if(failed)throw error;
  }
  async release(owner,{restore=true,defaultRestore=restore,forceRestore=false,only}={}){
    const owned=this.owners.get(owner);if(!owned)return;const rows=only?[only]:[...owned];for(const row of rows)owned.delete(row);if(!owned.size)this.owners.delete(owner);const actions=[];
    // Remove every lease before invoking user-facing operations that may reenter.
    for(const row of rows){const entry=row.entries.get(owner),before=row.top;row.entries.delete(owner);row.version++;const next=resolve(row),publish=changed(row,next);Object.assign(row,next);const vacant=!row.entries.size;if(vacant)row.fields.delete(row.key);
      const restoring=restore&&(forceRestore||entry.completionMode==='restore'||entry.completionMode!=='keep'&&defaultRestore);if(next.top&&publish||!vacant&&before&&publish||vacant&&(before===entry||entry.empty)&&(restoring||entry.empty))actions.push({row,version:row.version,entry:next.top||before||entry,value:next.value,empty:vacant&&!restoring,vacant});
    }
    await this.applyActions(actions,true);
  }
  releaseField(owner,target,key,options){const row=this.fields.get(target)?.get(key);return row?.entries.has(owner)?this.release(owner,{...options,only:row}):Promise.resolve();}
  owns(owner,target,key,value){const top=this.fields.get(target)?.get(key)?.top;return top?.owner===owner&&top.value===value;}
  matches(target,key,value){return this.fields.get(target)?.get(key)?.value===value;}
  updateUnderlying(target,key,value){const row=this.fields.get(target)?.get(key);if(!row?.resolve)return;row.underlying=value;Object.assign(row,resolve(row));row.version++;}
  preanimated(target,key){return this.fields.get(target)?.get(key)?.baseline;}
  presentation(target,key){const row=this.fields.get(target)?.get(key);return row?.top?row.value:undefined;}
  async reprioritize(owner){
    return this.refreshOwners([owner]);
  }
  async refreshOwners(owners){
    const rows=new Set(),actions=[];for(const owner of owners)for(const row of this.owners.get(owner)||[])rows.add(row);for(const row of rows){const next=resolve(row);if(changed(row,next)&&(next.top||row.top))actions.push({row,entry:next.top||row.top,value:next.value,next});}
    this.validateActions(actions);for(const a of actions){Object.assign(a.row,a.next);a.version=++a.row.version;}await this.applyActions(actions,true);
  }
  has(target,key){return this.fields.get(target)?.has(key)===true;}
  hasPrefix(target,prefix){for(const key of this.fields.get(target)?.keys()||[])if(key.startsWith(prefix))return true;return false;}
  discardTarget(target){const fields=this.fields.get(target);if(!fields)return;for(const row of fields.values()){row.version++;for(const owner of row.entries.keys()){const owned=this.owners.get(owner);owned?.delete(row);if(!owned?.size)this.owners.delete(owner);}row.entries.clear();row.top=null;}fields.clear();this.fields.delete(target);}
  active(target){return [...(this.fields.get(target)?.values()||[])].filter(row=>row.top).map(row=>({key:row.key,value:row.value}));}
  clear(){const rows=new Set();for(const owned of this.owners.values())for(const row of owned)rows.add(row);for(const row of rows){row.version++;row.entries.clear();row.top=null;row.fields.delete(row.key);}this.owners.clear();this.fields=new WeakMap();}
  stats(){let leases=0;const rows=new Set();for(const values of this.owners.values())for(const row of values){rows.add(row);leases++;}return {owners:this.owners.size,channels:rows.size,leases};}
}
export const sequenceCompletionTypes=new Set(['position','rotation','scale','visible','camera','timeScale','light','material','materialVector','component','variable','nativeProperty','parent','skeletalPose','componentState','animation']);
export const sequenceCompletionChoices=[['default','시퀀스 기본값'],['restore','원래 값 복원'],['keep','마지막 값 유지']];
export const validSequenceCompletion=t=>t.completionMode===undefined||sequenceCompletionChoices.some(([mode])=>mode===t.completionMode)&&(t.completionMode==='default'||sequenceCompletionTypes.has(t.type));
export const validSequencePriority=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
export const sequenceChannelContract={fields:['position','rotation','scale','visible','camera','timeScale','light','material(parameter)','component(property)','variable','nativeProperty','parent','skeletalPose(bone name)','componentState','animation clip'],priority:'higher int32 priority wins each sampled field; equal priority uses accepted playback start order; seek never changes it; asset optional priority default0; LevelSequence::SetPriority/GetPriority applies a runtime override immediately after queued writes',restore:'resume latest sampled lower owner immediately; last restoring owner restores the shared preanimated baseline; an unsampled field is untouched',keepState:'last owner follows track completionMode default/restore/keep; restoreState supplies default; forceRestore overrides keep; another active owner resumes first',completion:'optional completionMode on managed tracks; optional sequence forceRestore:boolean (defaultfalse); manual Stop and natural completion share it',structural:'parent edges stage/validate together; whole component takes and scalar properties share typed field leases; direct Transform/component, HB and imported actor-root animation position-rotation-scale use one field; imported model children alias by actual node/field identity; component deletion retains hidden samples; skeletal ownership is per sampled bone; layout gaps yield dropped bones; last release clears controlled sampling; identity-safe preanimated restore and optional poseWeight0..1 share the playback service',clips:'override uses the winning active animation clip; opt-in normalized animation entries mix compatible imported actions or HB transform clips at the winning priority, with independent source clocks and explicit incompatible-family diagnostics; zero normalized weight yields and retains the shared original evaluator for reactivation; section gaps yield that field to the latest lower sample without releasing unrelated fields; last active track wins inside a sequence; external sprite/timeline/imported clip/graph/montage resumes its detached original evaluator; finite-loop counts, managed action fades, machine transitions and montage blend histories stay frozen; notify windows end with sequence-suspended and re-enter on the next tick, scoped latent work is cancelled; keep holds final pose and releases retained resources',identity:'actor identity guarded; global camera values also retain referenced camera identity',reentry:'Stop detaches the old map entry before callbacks; old awaited samples cannot stop/overwrite a replacement',batchWrites:'Last authored duplicate target/field wins with one lease. Managed writeBatch failures remove failed samples and restore prior presentation/peers; newer samples stay. Async setters receive current() as their third argument; clear/retirement invalidates it. Restoration failures preserve both errors. Single writes restore the previous lease/presentation on setter failure while preserving synchronous successful overrides and current() guards. Controls/releases and arbitrary external side effects remain outside this batch guarantee.',cost:'weak object keys, leases only for sampled fields, no whole-scene transform copies or idle timers; counters on explicit query',remaining:['unmanaged additional mixer actions and arbitrary notify callback/latent-work rollback','different Euler orders/rotated-origin axis projection; renderer-parameter aliases','arbitrary asynchronous external setter rollback']};
sequenceChannelContract.referenceState=sequenceReferenceStateContract;
