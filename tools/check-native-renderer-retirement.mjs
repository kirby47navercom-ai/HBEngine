import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {retainTestEvidence} from './test-artifacts.mjs';

if(!globalThis.gc){
 const child=spawn(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),...process.argv.slice(2)],{windowsHide:true,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});assert.equal(code,0);
}else{
 const engine=path.resolve(process.argv[2]||'.'),base=path.resolve(process.argv[3]||engine),work=await fs.mkdtemp('native/build/renderer-retirement-');retainTestEvidence(work);
 const url=(root,file)=>pathToFileURL(path.join(root,file)).href,T=await import(url(engine,'node_modules/three/build/three.module.js'));
 const tick=()=>new Promise(resolve=>setImmediate(resolve)),collect=async()=>{for(let i=0;i<8;i++){await tick();globalThis.gc();await tick();}};
 const count=asset=>asset._listeners?.dispose?.length||0;
 function transport(){const listeners=new Set(),messages=[];let failReset=false;const bridge={addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),postMessage(packet){messages.push(packet);for(const fn of listeners)fn({data:{channel:'hb.render',id:packet.id,ok:!(failReset&&packet.op==='reset'),error:'owned reset failure',value:packet.op==='frame'?{calls:1,meshes:1,textures:1}:{}}});}};return {bridge,listeners,messages,setFailReset:()=>failReset=true};}
 async function lifetime(root,{resetFailure=false,reuse=false}={}){
  const {createNativeSceneRenderer}=await import(url(root,'prototype/native-scene-renderer.js')),wire=transport(),geometry=new T.BoxGeometry(),texture=new T.DataTexture(new Uint8Array([255,0,0,255]),1,1);texture.needsUpdate=true;
  let ref;
  await (async()=>{const renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge:wire.bridge}),scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.z=3;const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture}));mesh.frustumCulled=false;scene.add(mesh);
   await renderer.render(scene,camera);await renderer.hbFinishFrame();assert.equal(count(geometry),1);assert.equal(count(texture),1);
   if(reuse){await renderer.hbReleaseScene();assert.equal(count(geometry),0);assert.equal(count(texture),0);assert.equal(renderer.hbDiagnostics().resourceSubscriptions,0);await renderer.render(scene,camera);await renderer.hbFinishFrame();assert.equal(count(geometry),1);geometry.dispose();texture.dispose();assert.equal(count(geometry),0);await renderer.render(scene,camera);await renderer.hbFinishFrame();assert.equal(count(geometry),1,'dispose/reupload rearms disposal');}
   ref=new WeakRef(renderer);if(resetFailure)wire.setFailReset();const closing=renderer.dispose();if(reuse)assert.equal(renderer.dispose(),closing);if(resetFailure)await assert.rejects(closing,/종료 실패/);else await closing;
  })();await collect();return {geometryListeners:count(geometry),textureListeners:count(texture),bridgeListeners:wire.listeners.size,disposedRendererRetained:!!ref.deref(),nativeDisposeAttempted:wire.messages.some(p=>p.op==='dispose')};
 }
 const before=await lifetime(base),after=await lifetime(engine,{reuse:true}),failure=await lifetime(engine,{resetFailure:true});
 for(const result of [after,failure]){assert.equal(result.geometryListeners,0);assert.equal(result.textureListeners,0);assert.equal(result.bridgeListeners,0);assert.equal(result.disposedRendererRetained,false);assert.equal(result.nativeDisposeAttempted,true);}
 const {createNativeSceneRenderer}=await import(url(engine,'prototype/native-scene-renderer.js')),{beginSpriteTextureClone,registerSpriteTextureClone,spriteTextureUploadKey}=await import(url(engine,'prototype/sprite-texture-source.js'));
 const wire=transport(),renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge:wire.bridge}),a=new T.DataTexture(new Uint8Array([0,255,0,255]),1,1);a.needsUpdate=true;const b=a.clone(),maps=[a,b].map(base=>registerSpriteTextureClone(base.clone(),base,beginSpriteTextureClone(base))),scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.z=3;
 for(const map of maps){const node=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial({map}));node.frustumCulled=false;scene.add(node);}await renderer.render(scene,camera);await renderer.hbFinishFrame();const key=spriteTextureUploadKey(maps[0],a);a.dispose();await renderer.render(scene,camera);await renderer.hbFinishFrame();assert(!wire.messages.at(-1).data.release?.textures?.includes(key),'shared atlas retained until last source owner');await renderer.hbReleaseScene();assert.equal(count(b),0);assert.equal(renderer.hbDiagnostics().resourceSubscriptions,0);await renderer.dispose();
 const report={passed:true,before,after,failure,reuseAfterSceneRelease:true,rearmAfterResourceDisposal:true,concurrentDisposeShared:true,sharedAtlasOwnerPreserved:true,forcedGC:'isolated test child only; no production GC forcing'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
}
