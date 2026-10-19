import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readProjectManifest} from './project-manifest.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const arg=n=>process.argv[process.argv.indexOf(n)+1];
assert(process.argv.includes('--fixture'));
const fixture=await fs.realpath(arg('--fixture')),root=await fs.realpath('native/build'),relative=path.relative(root,fixture);
assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Owned retained fixture only');
const install=JSON.parse(await fs.readFile('docs/research/USER_INSTALL_679.json','utf8'));
if(process.argv.includes('--executable')){install.executable=path.resolve(arg('--executable'));install.directory=path.dirname(install.executable);}
const tools=await import(pathToFileURL(path.join(install.directory,'tools/build-game.mjs')).href);
const work=await fs.mkdtemp(path.resolve('native/build/native-optical-capture-681-'));retainTestEvidence(work);let probe;
try{
 const descriptor=(await fs.readdir(fixture)).find(n=>n.endsWith('.hbproject'));
 const record=await readProjectManifest(path.join(fixture,descriptor)),profile=(await tools.readBuildProfiles(record)).profiles[0];
 Object.assign(profile,{windowsRenderer:'d3d11',configuration:'development',width:640,height:360,scenes:[{path:'Assets/Scenes/Complex141.hbscene.json',enabled:true}]});
 const built=await tools.buildGame(record,profile);probe=await editorWindowProbe({work,mode:'player',executable:built.executable});
 const evaluate=probe.evaluate,ready=()=>probe.until(()=>evaluate('window.hbPlayerDebug?.ready?.()'),'optical native readiness'),inspect=()=>evaluate('window.hbPlayerDebug.inspect()');
 const call=(method,args)=>evaluate('window.hbPlayerDebug.call("PostDriver","LightingDriver.'+method+'",'+JSON.stringify(args)+')');await ready();
 for(const property of ['pathTracingDenoise','pathTracingCurvedFilter','pathTracingDOF'])await call('Bool',{target:'Post',component:'PostProcessVolume',property,value:true});
 for(const[property,value]of Object.entries({pathTracingDenoiseTemporal:.8,pathTracingDenoiseLens:1,focusDistance:2}))await call('Float',{target:'Post',component:'PostProcessVolume',property,value});
 await call('Bool',{target:'Post',component:'PostProcessVolume',property:'pathTracingEnabled',value:true});
 const capture=await evaluate('window.hbPlayerDebug.captureAsync()');await ready();
 assert(capture?.startsWith('data:image/png;base64,'));await fs.writeFile(path.join(work,'native.png'),Buffer.from(capture.split(',')[1],'base64'));
 const pixels=await evaluate('(async()=>{const image=await createImageBitmap(await(await fetch('+JSON.stringify(capture)+')).blob()),canvas=new OffscreenCanvas(image.width,image.height),context=canvas.getContext("2d");context.drawImage(image,0,0);image.close();const data=context.getImageData(0,0,canvas.width,canvas.height).data;let lit=0,max=0,sum=0;for(let i=0;i<data.length;i+=4){const v=Math.max(data[i],data[i+1],data[i+2]);if(v>8)lit++;max=Math.max(max,v);sum+=v;}return {width:canvas.width,height:canvas.height,lit,max,mean:sum/(data.length/4)};})()');
 const enabled=await inspect();await fs.writeFile(path.join(work,'enabled.json'),JSON.stringify(enabled,null,2));
 assert.equal(enabled.renderer.pipelinePreparation.currentStage,'ready');assert(enabled.renderer.pathSamples>0);assert(pixels.lit>100&&pixels.max>16,'Native capture must contain visible scene pixels');
 await call('Bool',{target:'Post',component:'PostProcessVolume',property:'pathTracingEnabled',value:false});await ready();
 await probe.until(async()=>!(await inspect()).renderer.shaderPreparation?.queue?.worker,'compiler worker idle');const disabled=await inspect();
 const exit=await probe.finish();probe=null;
 const proof={passed:true,installedDirectory:install.directory,reusedOwnedFixture:fixture,pixels,enabled,disabled,exit,scope:'Installed C++/Blueprint native game; full denoise, curved proxy, temporal and physical lens enabled through public reflected C++ calls. PNG is captured by D3D renderer hbCapture, not CDP screenshot. Visible-pixel proof complements independent mathematical guide tests; no quality/FPS claim.'};
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:true,work,pixels,preparation:enabled.renderer.pipelinePreparation}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;}
finally{await probe?.stop();await pruneTestArtifacts(work);await pruneTestArtifacts(path.join(root,relative.split(path.sep)[0]));}
