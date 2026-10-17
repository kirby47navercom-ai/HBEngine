// Preanimated state is shared per *object identity and field*, not per director.
// Later-started sequences win; hidden sequences still retain their latest sample.
// Only sampled fields acquire a lease. No idle timer or whole-scene snapshot.
export class SequenceChannels{
  constructor(){this.fields=new WeakMap();this.owners=new Map();}
  write(owner,target,key,value,{read,apply,valid=()=>true}){
    if(!valid())return;
    let fields=this.fields.get(target);if(!fields){fields=new Map();this.fields.set(target,fields);}
    let row=fields.get(key);if(!row){row={fields,key,baseline:read(),entries:new Map(),top:null,version:0};fields.set(key,row);}
    let entry=row.entries.get(owner);if(!entry){entry={owner,apply,valid,value};row.entries.set(owner,entry);let rows=this.owners.get(owner);if(!rows){rows=new Set();this.owners.set(owner,rows);}rows.add(row);if(!row.top||owner.order>row.top.owner.order)row.top=entry;}
    entry.value=value;row.version++;if(row.top===entry&&entry.valid())return entry.apply(value,false);
  }
  async release(owner,{restore=true}={}){
    const rows=this.owners.get(owner);if(!rows)return;this.owners.delete(owner);const actions=[];
    // Remove every lease before invoking user-facing operations that may reenter.
    for(const row of rows){const entry=row.entries.get(owner);row.entries.delete(owner);row.version++;if(row.top!==entry)continue;
      row.top=null;for(const candidate of row.entries.values())if(!row.top||candidate.owner.order>row.top.owner.order)row.top=candidate;
      const next=row.top;if(!next)row.fields.delete(row.key);
      if(next||restore)actions.push({row,version:row.version,entry:next||entry,value:next?next.value:row.baseline});
    }
    let error;for(const action of actions){const{row,entry,value,version}=action;if(row.version!==version||row.fields.has(row.key)&&row.fields.get(row.key)!==row||!entry.valid())continue;try{await entry.apply(value,true);}catch(e){error??=e;}}if(error)throw error;
  }
  clear(){this.owners.clear();this.fields=new WeakMap();}
  stats(){let leases=0;const rows=new Set();for(const values of this.owners.values())for(const row of values){rows.add(row);leases++;}return {owners:this.owners.size,channels:rows.size,leases};}
}
export const sequenceChannelContract={fields:['position','rotation','scale','visible','camera','timeScale','light','material(parameter)','component(property)','variable','nativeProperty'],priority:'later-started sequence wins each sampled field; seek never changes priority',restore:'resume latest sampled lower owner immediately; last restoring owner restores the shared preanimated baseline; an unsampled field is untouched',keepState:'last owner with restoreState=false keeps its final value and releases the lease',identity:'actor identity guarded; global camera values also retain referenced camera identity',reentry:'Stop detaches the old map entry before callbacks; old awaited samples cannot stop/overwrite a replacement',cost:'weak object keys, leases only for sampled fields, no whole-scene transform copies or idle timers; counters on explicit query',remaining:['parent/componentState/skeletal/animation ownership','cross-representation channels and weighted blending','arbitrary asynchronous external setter rollback']};
