// Input assets are shared by the editor and game; keyboard repeat never drives held actions.
export class InputActions {
  constructor(contexts=[],actions=new Map()) {this.contexts=[...contexts].sort((a,b)=>b.priority-a.priority);this.actions=actions;this.keys=new Map();this.previous=new Map();}
  set(key,value){this.keys.set(key.toLowerCase(),value);}
  clear(){this.keys.clear();}
  sample(frame=false){
    const values=new Map(),consumed=new Set(),claimed=new Set();
    for(const context of this.contexts){
      const grouped=new Map();for(const mapping of context.mappings){if(!grouped.has(mapping.action))grouped.set(mapping.action,[]);grouped.get(mapping.action).push(mapping);}
      for(const [path,mappings] of grouped){const action=this.actions.get(path);if(!action||claimed.has(path))continue;claimed.add(path);const vector=[0,0,0],used=[];
        for(const m of mappings){const key=m.key.toLowerCase();if(consumed.has(key))continue;const v=this.keys.get(key)||0;vector[m.axis]+=v*m.scale;if(v)used.push(key);}
        const length=action.valueType==='vec3'?3:action.valueType==='vec2'?2:1;let v=vector.slice(0,length).map(v=>Math.max(-1,Math.min(1,v)));if(Math.hypot(...v)<=action.deadZone)v=v.map(()=>0);
        const active=v.some(Boolean);values.set(path,action.valueType==='bool'?active:length===1?v[0]:v);if(active&&action.consumeInput)used.forEach(k=>consumed.add(k));
      }
    }
    const result=[];for(const [path,action] of this.actions){const zero=action.valueType==='bool'?false:action.valueType==='vec2'?[0,0]:action.valueType==='vec3'?[0,0,0]:0,value=values.get(path)??zero,old=this.previous.get(path)??zero,on=v=>Array.isArray(v)?v.some(Boolean):!!v,active=on(value),was=on(old);const events=[];
      if(active&&!was)events.push('started');if(!active&&was)events.push('completed');if(action.trigger==='held'?frame&&active:action.trigger==='released'?!active&&was:active&&!was)events.push('triggered');
      for(const event of events)result.push({path,event,value});this.previous.set(path,value);
    }return result;
  }
}
