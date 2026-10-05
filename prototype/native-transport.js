// JSON snapshots stay separate from the mutable game world. Clone only changed
// paths after a successful call; failures force the next request to send a full world.
export function worldPatch(previous,current,limit=4096){
  const operations=[],escape=value=>/[~/]/.test(value)?String(value).replace(/~/g,'~0').replace(/\//g,'~1'):String(value);
  const add=(operation,depth)=>{operations.push(operation);if(operations.length>limit||depth>64||operation.path.length>4096)throw Error('full snapshot');};
  function walk(a,b,path,depth=0){
    if(Object.is(a,b))return;
    const aa=Array.isArray(a),ba=Array.isArray(b),ao=a&&typeof a==='object',bo=b&&typeof b==='object';
    if(!ao||!bo||aa!==ba||aa&&a.length!==b.length){add({op:'replace',path,value:b},depth);return;}
    if(aa){if(a.length<=4){let changes=0,scalar=true;for(let i=0;i<a.length;i++){if(!Object.is(a[i],b[i]))changes++;if(a[i]!==null&&typeof a[i]==='object'||b[i]!==null&&typeof b[i]==='object')scalar=false;}if(!changes)return;if(scalar&&changes>1){add({op:'replace',path,value:b},depth);return;}}for(let i=0;i<a.length;i++){const value=b[i],type=typeof value;walk(a[i],value===undefined||type==='function'||type==='symbol'||type==='number'&&!Number.isFinite(value)?null:value,path+'/'+i,depth+1);}return;}
    for(const key in a)if(Object.hasOwn(a,key)&&(!Object.hasOwn(b,key)||b[key]===undefined))add({op:'remove',path:path+'/'+escape(key)},depth+1);
    for(const key in b)if(Object.hasOwn(b,key)&&b[key]!==undefined){const exists=Object.hasOwn(a,key);if(exists&&Object.is(a[key],b[key]))continue;const at=path+'/'+escape(key);if(!exists)add({op:'add',path:at,value:b[key]},depth+1);else walk(a[key],b[key],at,depth+1);}
  }
  try{walk(previous,current,'');return operations;}catch{return null;}
}
export function applyWorldPatch(previous,operations){
  if(!Array.isArray(operations)||operations.length>4096)throw Error('C++ snapshot patch limit');
  const copies=new Map(),copy=value=>{if(!value||typeof value!=='object')throw Error('C++ snapshot patch parent');if(copies.has(value))return copies.get(value);const next=Array.isArray(value)?value.slice():{...value};copies.set(value,next);copies.set(next,next);return next;};
  let result=previous;
  for(const op of operations){
    if(!op||!['add','remove','replace'].includes(op.op)||typeof op.path!=='string'||op.path.length>4096||op.op!=='remove'&&!Object.hasOwn(op,'value'))throw Error('C++ snapshot patch operation');
    if(op.path===''){if(op.op==='remove')throw Error('C++ snapshot root removal');result=op.value;continue;}
    if(!op.path.startsWith('/')||/\~(?![01])/.test(op.path))throw Error('C++ snapshot JSON Pointer');
    const parts=op.path.slice(1).split('/').map(p=>p.replace(/~1/g,'/').replace(/~0/g,'~'));if(parts.length>64)throw Error('C++ snapshot path depth');result=copy(result);let parent=result;
    for(const key of parts.slice(0,-1)){if(!Object.hasOwn(parent,key))throw Error('C++ snapshot missing parent');const child=copy(parent[key]);Object.defineProperty(parent,key,{value:child,writable:true,enumerable:true,configurable:true});parent=child;}
    const key=parts.at(-1),exists=Object.hasOwn(parent,key);
    if(Array.isArray(parent)){if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>parent.length||op.op!=='add'&&!exists)throw Error('C++ snapshot array index');const i=Number(key);if(op.op==='add')parent.splice(i,0,op.value);else if(op.op==='remove')parent.splice(i,1);else parent[i]=op.value;}
    else {if(op.op!=='add'&&!exists)throw Error('C++ snapshot missing field');if(op.op==='remove')delete parent[key];else Object.defineProperty(parent,key,{value:op.value,writable:true,enumerable:true,configurable:true});}
  }
  return result;
}
// Native values have already crossed the JSON/typed protocol boundary. Avoid
// structuredClone's message-transfer setup for these small property replies.
export function cloneNativeValue(value){
  if(Array.isArray(value))return value.map(cloneNativeValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,cloneNativeValue(child)]));
  return value;
}
export function commitNativeWorld(world,result){
  if(!result.worldCommitted?.length)return world;
  const ids=new Set(result.worldCommitted),states=new Map(result.objects.filter(o=>ids.has(o.id)).map(o=>[o.id,o]));
  return world.map(object=>states.has(object.id)?{...object,...cloneNativeValue(states.get(object.id))}:object);
}
// Engine-owned UI snapshots are immutable. Cache their JSON without hiding any
// UI fields from C++; ordinary mutable actor data is serialized on every call.
const immutableJSON=new WeakMap();
export function immutableNativeSnapshot(value){
  const snapshot=structuredClone(value),freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}};freeze(snapshot);immutableJSON.set(snapshot,JSON.stringify(snapshot));return snapshot;
}
function withJSONField(object,key,value){const text=JSON.stringify({...object,[key]:undefined});return text.slice(0,-1)+(text.length>2?',':'')+JSON.stringify(key)+':'+value+'}';}
function nativeRowJSON(object){
  const debug=object.gameplayDebug,ui=debug?.ui,encoded=ui&&immutableJSON.get(ui);return encoded===undefined?JSON.stringify(object):withJSONField(object,'gameplayDebug',withJSONField(debug,'ui',encoded));
}
export class NativeWorldClient {
  constructor(){this.id=crypto.randomUUID();this.world=null;this.rows=null;this.sequence=0;this.queue=Promise.resolve();this.frames=[];this.clockBatchable=false;this.clockState=null;}
  call(request,metadata,send){
    const job=this.queue.then(async()=>{
      if(metadata?.workerProtocol!==3)return send(request);
      if(request.command==='reset'){this.frames=[];this.clockBatchable=false;const result=await send(request);this.world=null;this.rows=null;this.sequence=0;this.clockBatchable=result.clockBatchable===true;this.clockState=result.clock;return result;}
      if(request.command==='frame'){
        if(!Number.isFinite(request.delta)||request.delta<0||request.delta>1||request.clock&&(!Number.isFinite(request.clock.scale)||request.clock.scale<0||typeof request.clock.paused!=='boolean'))return send(request);
        // With one module and no active C++ timers, only the next C++ read can
        // observe this clock. Carry each original step, preserving float rounding.
        const scale=Math.fround(request.clock?.scale),delta=request.clock?.paused?0:Math.fround(Math.fround(request.delta)*scale),time=Math.fround(this.clockState?.time+delta);
        if(request.deferFrame&&request.clock&&metadata.nativeFrameBatch===1&&this.clockBatchable&&this.frames.length<63&&Number.isFinite(time)&&Number.isFinite(scale)){this.frames.push({delta:request.delta,clock:{...request.clock}});this.clockState={time,delta,scale,paused:request.clock.paused};return {objects:[],events:[],operations:[],timerCallbacks:[],clock:this.clockState};}
        const {deferFrame,...plain}=request,frames=this.frames;this.frames=[];const result=await send({...plain,...(frames.length?{frameAdvances:frames}:{})});this.clockBatchable=result.clockBatchable===true;this.clockState=result.clock;return result;
      }
      // Native JSON serialization compares unchanged actor rows faster than walking
      // all their component/UI fields in JS. Keep only detached, immutable rows.
      const serializeStart=performance.now();let reusedRows=0;const rows=request.objects.map(object=>nativeRowJSON(object)??'null'),current=rows.map((row,i)=>{if(this.world&&row===this.rows?.[i]){reusedRows++;return this.world[i];}return JSON.parse(row);}),serializedAt=performance.now();
      let next,packet,sequence=this.sequence+1;const patch=this.world&&worldPatch(this.world,current);
      if(patch){next=applyWorldPatch(this.world,patch);packet={...request,objects:undefined,objectPatch:patch,worldTransport:1,worldId:this.id,baseSequence:this.sequence,worldSequence:sequence};}
      if(!packet){next=current;sequence=1;packet={...request,objects:next,worldTransport:1,worldId:this.id,baseSequence:0,worldSequence:sequence};}
      const frames=this.frames;this.frames=[];if(frames.length)packet.frameAdvances=frames;
      const preparedAt=performance.now(),result=await send(packet),acknowledgeAt=performance.now();this.clockBatchable=result.clockBatchable===true&&!result.nativeError;this.clockState=result.clock;if(result.worldSequence!==sequence)throw Error('C++ snapshot acknowledgment mismatch');const committed=commitNativeWorld(next,result);this.world=result.nativeError?null:committed;this.rows=result.nativeError?null:rows.map((row,i)=>committed[i]===next[i]?row:JSON.stringify(committed[i]));this.sequence=result.nativeError?0:sequence;if(result.transport)Object.assign(result.transport,{clientSerializeMs:serializedAt-serializeStart,clientPatchMs:preparedAt-serializedAt,clientAckMs:performance.now()-acknowledgeAt,worldRows:rows.length,reusedRows});return result;
    });
    this.queue=job.catch(()=>{this.world=null;this.rows=null;this.sequence=0;this.frames=[];this.clockBatchable=false;this.clockState=null;});return job;
  }
}
const owners=new WeakMap();
export function nativeWorldClient(build,owner=build){if(!owners.has(owner))owners.set(owner,new Map());const clients=owners.get(owner);if(!clients.has(build.token))clients.set(build.token,new NativeWorldClient());return clients.get(build.token);}
