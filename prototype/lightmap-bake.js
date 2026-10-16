import {validLightmapAsset} from './lightmap-assets.js';
export async function bakeSceneLightmaps(snapshot,settings={}, {name='Lightmap',signal,onProgress=()=>{}}={}){
 if(signal?.aborted)throw Error('조명 베이크를 취소했어요.');let result;
 if(typeof Worker==='undefined'){const {bakeLightmapCore}=await import('./lightmap-bake-core.js'),{packLightmapPages}=await import('./lightmap-pages.js');result=await packLightmapPages(bakeLightmapCore(snapshot,settings,onProgress),{name,pageSize:settings.pageSize});}
 else result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./lightmap-bake-worker.js',import.meta.url),{type:'module'});let finished=false;const finish=(error,value)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);},abort=()=>finish(Error('조명 베이크를 취소했어요.'));signal?.addEventListener('abort',abort,{once:true});worker.onerror=event=>finish(Error(event.message||'조명 베이크 오류'));worker.onmessage=({data})=>{try{if(data.progress)onProgress(data.progress);else finish(data.error?Error(data.error):null,data.result);}catch(error){finish(error);}};try{worker.postMessage({snapshot,settings,name});}catch(error){finish(error);}});
 if(!validLightmapAsset(result.asset))throw Error('베이크 에셋 결과 검증 실패');return result;
}
