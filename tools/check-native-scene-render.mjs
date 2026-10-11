import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as THREE from 'three';
import {packedGeometry,nativeMaterial,rgbaBase64,nativeShadows} from '../prototype/native-scene-renderer.js';
import {configureLightShadow} from '../prototype/scene-rendering.js';
import {componentDefaults,validComponentProperties,componentPropertyVisible} from '../prototype/scene-components.js';
import {validBuildProfile} from '../prototype/build-profile.js';
import {compileNativeMaterial} from '../prototype/native-materials.js';
import {materialCatalog,makeMaterialNode,materialPins,materialDefaults} from '../prototype/material-runtime.js';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-scene-')),exec=promisify(execFile),compiler=process.env.CXX||'C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const box=new THREE.BoxGeometry(1,1,1),packed=packedGeometry(box);assert.equal(packed.indices.length,36);assert.equal(packed.vertices.length,24*12);assert.throws(()=>packedGeometry(new THREE.BufferGeometry()));
const material=new THREE.MeshBasicMaterial({color:0xff0000,transparent:true,toneMapped:false});assert.equal(nativeMaterial(material).blend,0);assert.deepEqual(nativeMaterial(material).color,[1,0,0,1]);material.userData.hbMaterial=true;assert.throws(()=>nativeMaterial(material));box.dispose();material.dispose();
const uvMaterial=new THREE.MeshStandardMaterial();uvMaterial.map=new THREE.Texture();uvMaterial.emissiveMap=new THREE.Texture();uvMaterial.map.offset.set(.2,.1);uvMaterial.emissiveMap.offset.set(.8,.5);assert.equal(nativeMaterial(uvMaterial).uvX[0][2],.2);assert.equal(nativeMaterial(uvMaterial).uvX[4][2],.8);uvMaterial.map.dispose();uvMaterial.emissiveMap.dispose();uvMaterial.dispose();
for(const count of [1,2,3,4,32769]){const bytes=Uint8Array.from({length:count},(_,i)=>i%256);assert.deepEqual(new Uint8Array(Buffer.from(rgbaBase64(bytes),'base64')),bytes);}
for(const kind of ['DirectionalLight','PointLight','SpotLight']){const light=new THREE[kind]();light.castShadow=true;configureLightShadow(light,{shadowMapWidth:128,shadowMapHeight:64,shadowBias:-.001,shadowNormalBias:.02,shadowRadius:2,shadowIntensity:.6});light.updateMatrixWorld(true);const records=nativeShadows(light);assert.equal(records.length,kind==='PointLight'?6:1);assert.deepEqual(records[0].packed.slice(16),[-.001,.02,2,.6,128,64,0,0]);assert.ok(validComponentProperties(kind,componentDefaults(kind)));assert.ok(!validComponentProperties(kind,{shadowNear:3,shadowFar:2}));assert.equal(componentPropertyVisible(kind,'shadowBias',{castShadow:false}),false);assert.throws(()=>configureLightShadow(light,{shadowMapWidth:1.5}));light.castShadow=false;assert.equal(nativeShadows(light).length,0);}
const point=new THREE.PointLight();point.castShadow=true;point.updateMatrixWorld(true);const faces=nativeShadows(point);for(const [i,d] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]].entries())assert.ok(faces[i].frustum.containsPoint(new THREE.Vector3(...d).multiplyScalar(2)));
const profile={id:'windows',name:'Windows',productName:'test',configuration:'development',width:640,height:360,scenes:[{path:'Assets/a.hbscene.json',enabled:true}]};assert.ok(validBuildProfile(profile));assert.ok(validBuildProfile({...profile,windowsRenderer:'d3d11'}));assert.ok(!validBuildProfile({...profile,windowsRenderer:'invalid'}));
const programs=[];for(const spec of materialCatalog){
  if(['sampleCube','sampleArray','sampleVolume','breakAttributes','getAttributes','functionInput'].includes(spec.key))continue;
  const node=makeMaterialNode(spec.key,0,0),surface=makeMaterialNode('surface',200,0),graph={nodes:[node,surface],edges:[]},pin=materialPins(node,graph).outputs.find(p=>p.type==='vec3')||materialPins(node,graph).outputs.find(p=>['float','vec2','vec4'].includes(p.type));if(!pin)continue;
  if(spec.key==='texture')node.texture='Assets/Color.svg';if(['vec2','vec4'].includes(pin.type)){const length=makeMaterialNode('length',100,0);graph.nodes.push(length);graph.edges.push({from:{node:node.id,pin:pin.id},to:{node:length.id,pin:'value'}},{from:{node:length.id,pin:'value'},to:{node:surface.id,pin:'baseColor'}});}else graph.edges.push({from:{node:node.id,pin:pin.id},to:{node:surface.id,pin:'baseColor'}});
  const data={surface:materialDefaults,graph},plan=compileNativeMaterial(data);programs.push({key:spec.key,declarations:plan.declarations,evaluation:plan.evaluation,uniforms:plan.floatBindings.map(b=>b.value)});
}
const catalog=path.join(work,'catalog.json');await fs.writeFile(catalog,JSON.stringify(programs));
await prepareNative();try{const results={};for(const [name,flags] of [['hardware',[]],['unavailable',['-DHB_COMPUTE_UNAVAILABLE']]]){const binary=path.join(work,name+'.exe');await exec(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(root,jsonInclude),'native/tests/scene-render.cpp',...flags,'-o',path.relative(root,binary)],{cwd:root,env,windowsHide:true,timeout:60000,maxBuffer:2097152});const {stdout}=await exec(binary,[path.relative(root,catalog)],{cwd:root,env,windowsHide:true,timeout:30000});results[name]=JSON.parse(stdout);}await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({work,...results}));}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({message:error.message,stderr:error.stderr},null,2));throw error;}
