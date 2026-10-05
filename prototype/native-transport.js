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
export class NativeWorldClient {
  constructor(){this.id=crypto.randomUUID();this.world=null;this.sequence=0;this.queue=Promise.resolve();}
  call(request,metadata,send){
    const job=this.queue.then(async()=>{
      if(metadata?.workerProtocol!==3)return send(request);
      if(['frame','reset'].includes(request.command)){const result=await send(request);if(request.command==='reset'){this.world=null;this.sequence=0;}return result;}
      let next,packet,sequence=this.sequence+1;const operations=this.world&&worldPatch(this.world,request.objects);
      if(operations){try{const patch=JSON.parse(JSON.stringify(operations));next=applyWorldPatch(this.world,patch);packet={...request,objects:undefined,objectPatch:patch,worldTransport:1,worldId:this.id,baseSequence:this.sequence,worldSequence:sequence};}catch{/* Non-JSON fields and paths outside the patch limits use the full JSON contract. */}}
      if(!packet){next=JSON.parse(JSON.stringify(request.objects));sequence=1;packet={...request,objects:next,worldTransport:1,worldId:this.id,baseSequence:0,worldSequence:sequence};}
      const result=await send(packet);if(result.worldSequence!==sequence)throw Error('C++ snapshot acknowledgment mismatch');this.world=result.nativeError?null:next;this.sequence=result.nativeError?0:sequence;return result;
    });
    this.queue=job.catch(()=>{this.world=null;this.sequence=0;});return job;
  }
}
const owners=new WeakMap();
export function nativeWorldClient(build,owner=build){if(!owners.has(owner))owners.set(owner,new Map());const clients=owners.get(owner);if(!clients.has(build.token))clients.set(build.token,new NativeWorldClient());return clients.get(build.token);}
