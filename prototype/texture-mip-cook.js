import {cookTextureMips,textureImportPolicy,validateTextureMipPixels} from './texture-mip-policy.js';
// One lazy worker drains the queue and terminates when idle. Loader-owned
// decoded buffers may transfer; ordinary callers keep their input ownership.
let worker=null,ready=false,active=null,nextID=1,idle=null,unavailable=false,workerStarts=0;const queue=[];
function stop(){worker?.terminate();worker=null;ready=false;if(idle!==null)clearTimeout(idle);idle=null;}
async function local(job){try{await new Promise(resolve=>setTimeout(resolve,0));const result=cookTextureMips(job.pixels,job.policy);result.report.worker=false;job.resolve(result);}catch(error){job.reject(error);}finally{active=null;drain();}}
function drain(){
 if(active)return;if(!queue.length){if(worker)idle=setTimeout(stop,1000);return;}if(idle!==null)clearTimeout(idle);idle=null;const job=active=queue.shift();
 if(unavailable||typeof Worker==='undefined'||job.pixels.width*job.pixels.height<=65536){local(job);return;}
 try{
  if(!worker){const created=worker=new Worker(new URL('./texture-mip-worker.js',import.meta.url),{type:'module'});workerStarts++;created.onmessage=({data})=>{if(worker!==created)return;if(data.ready){ready=true;send();return;}const job=active;if(!job||data.id!==job.id)return;active=null;if(data.error)job.reject(Error(data.error));else{data.result.report.worker=true;job.resolve(data.result);}drain();};created.onerror=()=>{if(worker!==created)return;const pending=active;stop();unavailable=true;if(pending){if(pending.pixels.data.byteLength)local(pending);else{active=null;pending.reject(Object.assign(Error('텍스처 밉 작업의 원본을 다시 읽어야 해요.'),{retryTextureDecode:true}));drain();}}else drain();};}
  if(ready)send();
 }catch(error){stop();unavailable=true;if(job.pixels.data.byteLength)local(job);else{active=null;job.reject(error);drain();}}
}
function send(){const job=active;if(!job)return;try{worker.postMessage({id:job.id,pixels:job.pixels,policy:job.policy},job.transfer?[job.pixels.data.buffer]:[]);}catch(error){stop();unavailable=true;if(job.pixels.data.byteLength)local(job);else{active=null;job.reject(error);drain();}}}
export function cookTextureMipsAsync(pixels,value={},options={}){return new Promise((resolve,reject)=>{validateTextureMipPixels(pixels);const policy=textureImportPolicy(value);queue.push({id:nextID++,pixels,policy,transfer:options.transfer===true,resolve,reject});drain();});}
export const textureMipCookState=()=>Object.freeze({workers:worker?1:0,ready,busy:!!active,queued:queue.length,workerStarts,fallback:unavailable||typeof Worker==='undefined'});
