import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createProject} from './project-manifest.mjs';
import {buildGame,readBuildProfiles} from './build-game.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {globalProbeFixture1120} from './global-probe-fixture-1120.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {makeEnvironmentActor} from '../prototype/scene-environment.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/physical-material-1147-'));
retainTestEvidence(work);
let probe,last;const rows=[];
try{
 const at=process.argv.indexOf('--executable'),installed=at<0?null:path.dirname(path.resolve(process.argv[at+1]));
 const builder=installed?await import(pathToFileURL(path.join(installed,'tools/build-game.mjs')).href):{buildGame,readBuildProfiles};
 const project=await createProject('PhysicalMaterial1147',work,'3d');
 const write=(p,j)=>project.project.write(p,typeof j==='string'?j:JSON.stringify(j));
 await globalProbeFixture1120(write,JSON.parse(await fs.readFile(path.join(project.root,project.manifest.startupScene),'utf8')));
 const scene=JSON.parse(await fs.readFile(path.join(project.root,'Assets/Scenes/Probes.hbscene.json'),'utf8'));
 scene.objects=scene.objects.filter(o=>['AmbientZero','ProbeDriver','Camera','Mirror'].includes(o.id));
 const camera=scene.objects.find(o=>o.id==='Camera');camera.position=[0,0,2];camera.components.find(c=>c.type==='Camera').properties.orthographicSize=8;
 scene.objects.push(makeEnvironmentActor('directionalLight',{id:'PhysicalSun',rotation:[0,15,0],properties:{intensity:2,castShadow:false,atmosphereSunLight:true}}));
 scene.runtime.renderBackend=process.argv.includes('--webgpu')?'webgpu':'webgl2';
 await write('Assets/Scenes/Probes.hbscene.json',scene);
 const material=createAsset('material','M_Physical');
 Object.assign(material.surface,{color:'#b9c2ce',metalness:.5,roughness:.35,clearcoat:.6,clearcoatRoughness:.2,iridescence:.6,iridescenceThickness:350});
 await write('Assets/M_Mirror.hbmaterial.json',material);
 const bp=JSON.parse(await fs.readFile(path.join(project.root,'Assets/BP_Probe.hbblueprint.json'),'utf8'));
 const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class ProbeDriver : public hb::Actor {public:HB_FUNCTION(BlueprintCallable) void Move(hb::Actor* target,float value);HB_FUNCTION(BlueprintCallable) void SetRoughness(hb::Actor* target,float value);};';
 const source='void ProbeDriver::Move(hb::Actor* target,float value){hb::Scene::SetPosition(target,{value,0,2});}void ProbeDriver::SetRoughness(hb::Actor* target,float value){hb::Materials::SetFloat(target,"Roughness",value);}';
 bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/ProbeDriver.h',sourcePath:'Source/ProbeDriver.cpp'};
 for(const [key,type,values]of [['R','setRotation',{target:'Camera',value:[0,.3*180/Math.PI,0]}],['T','setRotation',{target:'Camera',value:[0,0,0]}],['Q','materialFloat',{target:'Mirror',parameter:'Roughness',value:.35}]]){
  const event=makeNode('input'),node=makeNode(type);event.options={key};node.inputValues=values;bp.nodes.push(event,node);bp.edges.push({from:{node:event.id,pin:'then'},to:{node:node.id,pin:'exec'}});
 }
 await write('Source/ProbeDriver.h',header);await write('Source/ProbeDriver.cpp',source);await write('Assets/BP_Probe.hbblueprint.json',bp);
 const profile=(await builder.readBuildProfiles(project)).profiles[0];Object.assign(profile,{configuration:'development',windowsRenderer:process.argv.includes('--webgl')||process.argv.includes('--webgpu')?'scene':'d3d11',width:320,height:240,scenes:[{path:'Assets/Scenes/Probes.hbscene.json',enabled:true}]});
 const built=await builder.buildGame(project,profile);probe=await editorWindowProbe({work,mode:'player',executable:built.executable});
 await probe.until(()=>probe.evaluate('window.hbPlayerDebug?.ready?.()'),'physical material ready',120000);
 const capture=()=>probe.evaluate('(async()=>{const uri=await window.hbPlayerDebug.captureAsync(),image=await createImageBitmap(await(await fetch(uri)).blob()),c=new OffscreenCanvas(image.width,image.height).getContext("2d");c.drawImage(image,0,0);image.close();return{uri,pixels:[.4,.5,.6].map(x=>[...c.getImageData(Math.floor(c.canvas.width*x),c.canvas.height>>1,1,1).data])};})()');
 const key=async k=>{for(const type of ['keyDown','keyUp'])await probe.cdp('Input.dispatchKeyEvent',{type,key:k,code:'Key'+k,windowsVirtualKeyCode:k.charCodeAt(0)});};
 const difference=(a,b)=>Math.max(...a.slice(0,3).map((v,i)=>Math.abs(v-b[i])));
 for(const[name,action,reference,changed]of [
  ['initial',null,null,false],
  ['C++ material roughness',()=>probe.evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.SetRoughness",{target:"Mirror",value:.85})'),0,true],
  ['Blueprint material roughness restores',()=>key('Q'),0,false],
  ['Blueprint camera rotation',()=>key('R'),0,true],
  ['C++ camera position preserves rotation',()=>probe.evaluate('window.hbPlayerDebug.call("ProbeDriver","ProbeDriver.Move",{target:"Camera",value:2})'),3,false],
  ['Blueprint camera resets',()=>key('T'),0,false]
 ]){
  if(action)await action();
  await probe.until(async()=>{last=await capture();return last.pixels.every(p=>difference(p,last.pixels[1])<=2)&&last.pixels[1].slice(0,3).some(v=>v>10&&v<245)&&(reference===null||(changed?difference(last.pixels[1],rows[reference].pixels[1])>=4:difference(last.pixels[1],rows[reference].pixels[1])<=2));},name+' orthographic physical pixels',45000);
  const state=await probe.evaluate('window.hbPlayerDebug.inspect()');rows.push({name,backend:state.renderer.backend,pixels:last.pixels,camera:state.camera});
  await fs.writeFile(path.join(work,'state-'+rows.length+'.png'),Buffer.from(last.uri.split(',')[1],'base64'));
 }
 const exit=await probe.finish();probe=null;
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,installedDirectory:installed,rows,exit,scope:'Actual packaged physical metal/clearcoat/thin-film surface: independent off-axis plane invariance (2byte), visible camera/material changes (4byte), compiled C++ Scene::SetPosition/Materials::SetFloat and generated Blueprint rotation/material nodes restore the original pixels. Six states, three samples each; backend energy/tone policies are not required to be identical.'},null,2));
 console.log(JSON.stringify({passed:true,work,rows}));
}catch(error){
 if(last)await fs.writeFile(path.join(work,'failure.png'),Buffer.from(last.uri.split(',')[1],'base64'));
 await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,rows,pixels:last?.pixels,state:await probe?.evaluate('window.hbPlayerDebug?.inspect?.()').catch(e=>e.message),diagnostics:await probe?.diagnostics()},null,2));
 throw Error('physical material actual '+work+': '+error.message);
}finally{await probe?.stop();await pruneTestArtifacts(work);}
