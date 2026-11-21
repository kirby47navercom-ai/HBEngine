import {availableParallelism,freemem} from 'node:os';

// Each compiler or link step gets its own limit (a large translation unit no longer fails a whole-build 60 s budget).
export const nativeStepTimeoutMs=300000;
export const nativeBuildTimeoutMs=sourceCount=>Math.min(900000,60000+Math.max(0,sourceCount-1)*15000);
// Parallel units: one per spare core, at most 8, and about 1.5 GB of free memory each.
export const nativeUnitConcurrency=()=>Math.max(1,Math.min(8,availableParallelism()-1,Math.floor(freemem()/(1.5*1024**3))));
export async function compileNativeUnits(sources,compile,{signal,concurrency=nativeUnitConcurrency()}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>16)throw Error('C++ 동시 컴파일 수는 1–16이어야 해요.');
 const abort=new AbortController(),combined=signal?AbortSignal.any([signal,abort.signal]):abort.signal;let next=0,failure;
 const jobs=Array.from({length:Math.min(concurrency,sources.length)},async()=>{try{for(;;){combined.throwIfAborted();const index=next++;if(index>=sources.length)return;await compile(sources[index],index,combined);}}catch(error){failure??=error;abort.abort(error);}});
 await Promise.all(jobs);if(failure)throw failure;
}
