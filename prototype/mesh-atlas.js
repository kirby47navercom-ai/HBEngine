import {validWorldAsset} from './world-assets.js';
export async function generateMeshAtlas(data,settings={}, {signal,onProgress=()=>{}}={}){
 if(!validWorldAsset('mesh',data))throw Error('유효한 메시가 필요해요.');
 if(signal?.aborted)throw Error('UV 펼치기를 취소했어요.');
 let result;
 if(typeof Worker==='undefined'){const {computeMeshAtlas}=await import('./mesh-atlas-core.js');result=await computeMeshAtlas(data,settings,onProgress);}
 else result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./mesh-atlas-worker.js',import.meta.url),{type:'module'});const finish=(error,value)=>{signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);},abort=()=>finish(Error('UV 펼치기를 취소했어요.'));signal?.addEventListener('abort',abort,{once:true});worker.onerror=event=>finish(Error(event.message||'UV 작업 오류'));worker.onmessage=({data})=>{if(data.progress)onProgress(data.progress);else finish(data.error?Error(data.error):null,data.result);};try{worker.postMessage({mesh:data,settings});}catch(error){finish(error);}});
 if(!validWorldAsset('mesh',result.data))throw Error('UV 결과 검증 실패');return result;
}
