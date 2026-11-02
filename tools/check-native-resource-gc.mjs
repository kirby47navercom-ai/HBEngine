import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {retainTestEvidence} from './test-artifacts.mjs';

const engine=path.resolve(process.argv[2]||'.');
if(typeof globalThis.gc!=='function'){
  // Collection is forced only in this isolated proof process, never in a game.
  const child=spawn(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),engine],{windowsHide:true,stdio:'inherit'});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(code!==0)throw Error('격리 GC 검사 실패: '+code);
}else{
  const work=await fs.mkdtemp('native/build/resource-gc-');retainTestEvidence(work);
  const url=file=>pathToFileURL(path.join(engine,file)).href;
  const T=await import(url('node_modules/three/build/three.module.js'));
  const {NativeModelInstances}=await import(url('tools/native-model-instances.mjs'));
  const {disposeHeadlessModel}=await import(url('tools/headless-model.mjs'));
  const {registerDeferredTexture}=await import(url('prototype/deferred-texture-source.js'));
  const tick=()=>new Promise(resolve=>setImmediate(resolve)),weak=[];
  let loaded=0,sourceDisposals=0,decoded=0;
  const watch=(kind,value)=>{weak.push({kind,ref:new WeakRef(value)});return value;};
  const cache=new NativeModelInstances(async name=>{
    loaded++;
    const object=watch('sourceObject',new T.Group()),pixels=watch('pixelBuffer',new Uint8Array(512*1024*4));
    pixels[0]=loaded;pixels[pixels.length-1]=255;
    const texture=watch('sourceTexture',new T.DataTexture(null,1,1));
    // The deferred loader closure also owns pixels until the first visible use.
    registerDeferredTexture(texture,async()=>{decoded++;return {data:pixels,width:512,height:1024};});
    const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:texture}));
    object.add(mesh);object.name=name;
    texture.addEventListener('dispose',()=>sourceDisposals++);
    return {object,animations:[]};
  },disposeHeadlessModel);
  async function collect(){
    let alive=weak.length;
    for(let attempt=0;attempt<12;attempt++){
      await tick();globalThis.gc();await tick();globalThis.gc();await tick();
      alive=weak.reduce((sum,item)=>sum+(item.ref.deref()===undefined?0:1),0);
      if(!alive)return {attempts:attempt+1,alive};
    }
    return {alive,retainedKinds:weak.filter(item=>item.ref.deref()!==undefined).map(item=>item.kind)};
  }
  const before=process.memoryUsage(),rounds=[];
  for(let round=0;round<4;round++){
    await (async()=>{
      const instances=await Promise.all(Array.from({length:32},(_,i)=>cache.acquire('model-'+(i%4))));
      assert.equal(cache.diagnostics().sources,4);assert.equal(cache.diagnostics().instances,32);
      for(const instance of instances){watch('instanceObject',instance.object);watch('instanceTexture',instance.object.children[0].material.map);}
      await cache.prepareVisible();assert.equal(cache.diagnostics().decodedPixelBytes,4*512*1024*4);
      // Pool return retains an actor for reuse. GC must not erase live pixels.
      for(const instance of instances)instance.object.visible=false;
      await tick();globalThis.gc();await tick();
      assert(instances.every(instance=>instance.object.children[0].material.map.image.data.length===512*1024*4));
      assert.equal(cache.diagnostics().instances,32);
      for(const instance of instances)disposeHeadlessModel(instance.object);
      assert.equal(cache.diagnostics().sources,0);assert.equal(cache.diagnostics().instances,0);
      assert.equal(cache.leases.size,0);assert.equal(cache.diagnostics().decodedPixelBytes,0);
    })();
    const result=await collect();assert.equal(result.alive,0,'삭제 자원이 GC root에 남았어요: '+JSON.stringify(result));
    rounds.push({...result,memory:process.memoryUsage()});
  }
  assert.equal(loaded,16);assert.equal(sourceDisposals,16);assert.equal(decoded,16);
  cache.dispose();
  const owners={};for(const file of ['tools/native-model-instances.mjs','tools/headless-model.mjs','prototype/sprite-texture-source.js','prototype/deferred-texture-source.js'])owners[file]=createHash('sha256').update(await fs.readFile(path.join(engine,file))).digest('hex');
  const report={passed:true,engine,node:process.version,forcedCollectionScope:'isolated test only; production does not request GC',instances:128,sourceLoads:loaded,decodedSources:decoded,releasedSourceDisposals:sourceDisposals,weakReferences:weak.length,allReleasedGraphsCollected:true,poolLivePixelsRetained:true,cacheKeptAliveDuringCollection:true,before,rounds,owners,scope:'bounded Three model/texture/deferred-source/lease ownership test; not long-run game, C++ heap, GPU driver, or frame-pause proof'};
  await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({work,passed:report.passed,instances:report.instances,weakReferences:weak.length,rounds:rounds.map(r=>({attempts:r.attempts,alive:r.alive,arrayBuffers:r.memory.arrayBuffers}))}));
}
