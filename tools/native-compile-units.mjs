import {availableParallelism,freemem} from 'node:os';

export const nativeBuildTimeoutMs=sourceCount=>Math.min(900000,60000+Math.max(0,sourceCount-1)*15000);
export async function compileNativeUnits(sources,compile,{signal,concurrency=Math.min(2,Math.max(1,availableParallelism()-1),freemem()>3*1024**3?2:1)}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>2)throw Error('C++ 동시 컴파일 수는 1–2여야 해요.');
 const abort=new AbortController(),combined=signal?AbortSignal.any([signal,abort.signal]):abort.signal;let next=0,failure;
 const jobs=Array.from({length:Math.min(concurrency,sources.length)},async()=>{try{for(;;){combined.throwIfAborted();const index=next++;if(index>=sources.length)return;await compile(sources[index],index,combined);}}catch(error){failure??=error;abort.abort(error);}});
 await Promise.all(jobs);if(failure)throw failure;
}
