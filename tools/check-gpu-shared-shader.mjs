import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three/tsl';
import {WebGPURenderer,Vector2,Vector3,Vector4,Matrix3,Matrix4,DataTexture,FloatType,RGBAFormat,MeshPhysicalMaterial} from 'three/webgpu';
import {geometryGINode} from '../prototype/geometry-gi-gpu.js';
import {compileRayMaterial,rayShaderPlanForScene} from '../prototype/ray-materials.js';
import {gpuPathGuide} from '../prototype/path-guide-gpu.js';
import {makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';

// Build real WGSL without device initialization, drawing, or changing user projects.
const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){}}});
renderer.backend.utils={getTextureSampleData:()=>({primarySamples:1})};renderer.hasFeature=()=>true;
function fixture(advanced,transmission,features=null){
 const u={};for(const key of ['temporal','motion','reflection','indirect','coordinates','jitter','eye','forward','camera','hierarchy','geometry','geometryInfo','geometryRecords','geometryLimits','ambientAO','path','pathQuality','pathEnvironment','pathLens','pathMap','pathOptions','pathDenoise','pathCaustics','pathCausticTargets','pathFilter','transport'])u[key]=T.uniform(new Vector4());
 for(const key of ['inverseVP','currentVP','previousVP'])u[key]=T.uniform(new Matrix4());u.size=T.uniform(new Vector2(1280,720));
 const textures=Array.from({length:3},()=>new DataTexture(new Float32Array(64),4,4,RGBAFormat,FloatType)),[scene,environment,previous]=textures.map(t=>T.texture(t));
 const transport=geometryGINode(scene,u,[],[],false,environment,advanced,false,null,true,advanced,true,false,false,transmission,features);
 const worldAt=T.Fn(([at,depth])=>{const q=u.inverseVP.mul(T.vec4(at.x.mul(2).sub(1),at.y.mul(u.coordinates.z).add(u.coordinates.w),depth.mul(u.coordinates.x).add(u.coordinates.y),1));return q.xyz.div(q.w);});
 return {transport,previous,worldAt,textures,u};
}
function build(f,prefix){
 const builder=renderer.backend.createNodeBuilder(null,renderer);builder.setShaderStage('fragment');
 if(prefix){builder.getUniformFromNode(T.uniform(new Matrix3()),'mat3','fragment');builder.getUniformFromNode(T.uniform(new Vector3()),'vec3','fragment');builder.getUniformFromNode(T.uniform(1),'float','fragment');}
 const flow=builder.flowStagesNode(f.transport.path(T.vec2(.5),f.previous,f.worldAt),'vec4');
 return {code:builder.codes.fragment.map(c=>c.code).join('\n')+flow.code,uniforms:new Map(builder.uniforms.fragment.map(v=>[v.name,v.type]))};
}
const cases=[];
for(const transmission of [false,true])for(const advanced of [false,true]){
 const f=fixture(advanced,transmission);try{for(const prefix of [false,true]){
  const {code,uniforms}=build(f,prefix);assert.ok(!code.includes('fn hbSceneVertexLoad '),'fixed slots must not include the generic decoder');
  const names=[...code.matchAll(/\bfn (\w+)/g)].map(m=>m[1]);assert.equal(new Set(names).size,names.length,'unique explicit function names');
  for(const m of code.matchAll(/object\.(nodeUniform\d+)\.([xyzwrgba]+)/g)){const type=uniforms.get(m[1]),width=type==='color'?3:Number(type?.match(/^vec([234])$/)?.[1]);assert.ok(width,`${m[1]} ${type} has stale ${m[2]} access`);for(const c of m[2])assert.ok(('xyzw'.includes(c)?'xyzw':'rgba').indexOf(c)<width);}
  const start=code.indexOf('fn hbTrace ');assert.ok(start>=0);const end=code.indexOf('\nfn ',start+1),trace=code.slice(start,end<0?undefined:end);assert.ok(!trace.includes('hbSceneLoad('));assert.ok(trace.includes('hbSceneRawLoad('));
  if(!transmission)assert.ok(!code.includes('fn hbDielectricFresnel '),'opaque bounce omits dielectric branches');
  cases.push({advanced,transmission,prefix,sourceBytes:Buffer.byteLength(code),functions:names.length,uniforms:uniforms.size});
 }}finally{for(const texture of f.textures)texture.dispose();}
}
for(const transmission of [0,.001,.25,.5,1]){const material=new MeshPhysicalMaterial({transmission});assert.equal(compileRayMaterial(material).transmission,transmission>0);material.dispose();}
const lobes=[];for(const [name,property]of Object.entries({coat:'clearcoat',aniso:'anisotropy',sheen:'sheen',film:'iridescence'})){const material=new MeshPhysicalMaterial({[property]:1}),features=compileRayMaterial(material).features;assert.deepEqual(features,Object.fromEntries(['coat','aniso','sheen','film'].map(k=>[k,k===name])));const f=fixture(true,false,features);try{const {code}=build(f,true);const direction=code.slice(code.indexOf('fn hbPathDirection ')).split('\nfn ')[0];assert.ok(direction.includes('hbRayField5('),'direction keeps UV tangent rotation even without anisotropy');const size=Buffer.byteLength(code);assert.ok(size<cases.find(c=>c.advanced&&!c.transmission&&c.prefix).sourceBytes);lobes.push({name,features,sourceBytes:size});}finally{f.textures.forEach(t=>t.dispose());material.dispose();}}
const changing=new MeshPhysicalMaterial({clearcoat:1}),scene={traverseVisible(visit){visit({isMesh:true,userData:{},geometry:{},material:changing});}};assert.equal(rayShaderPlanForScene(scene).features.coat,true);changing.clearcoat=0;changing.anisotropy=1;assert.deepEqual(rayShaderPlanForScene(scene).features,{coat:false,aniso:true,sheen:false,film:false});changing.dispose();
for(const [name,property]of Object.entries({coat:'clearcoat',aniso:'anisotropy',sheen:'sheen',film:'iridescence'})){const material=new MeshPhysicalMaterial(),root=makeMaterialNode('surface'),time=makeMaterialNode('time');material.userData.materialSource={surface:{...materialDefaults},graph:{nodes:[root,time],edges:[{from:{node:time.id,pin:'value'},to:{node:root.id,pin:property}}]}};assert.equal(compileRayMaterial(material,0).features[name],true,'zero-time dynamic writes keep the lobe');material.dispose();}
const parameterMaterial=new MeshPhysicalMaterial(),root=makeMaterialNode('surface'),parameter=makeMaterialNode('scalarParameter');parameter.parameter='Coat';parameter.value=0;parameterMaterial.userData.materialSource={surface:{...materialDefaults},parameters:{Coat:0},graph:{nodes:[root,parameter],edges:[{from:{node:parameter.id,pin:'value'},to:{node:root.id,pin:'clearcoat'}}]}};const parameterScene={traverseVisible(visit){visit({isMesh:true,userData:{},geometry:{},material:parameterMaterial});}};assert.equal(rayShaderPlanForScene(parameterScene).features.coat,false);parameterMaterial.userData.materialSource.parameters.Coat=1;assert.equal(rayShaderPlanForScene(parameterScene).features.coat,true);parameterMaterial.dispose();
const guides=[];for(const [auxiliary,lens,curved,temporal] of [[false,false,false,false],[false,true,false,false],[true,true,false,false],[true,true,true,false],[true,false,false,true],[true,false,true,true],[true,true,true,true]]){const f=fixture(false,false);try{const node=gpuPathGuide(f.transport,f.u,f.worldAt,false,auxiliary,lens,curved,temporal,false),builder=renderer.backend.createNodeBuilder(node._quadMesh,renderer);builder.setShaderStage('fragment');const flow=builder.flowStagesNode(node.node,'vec4');assert.ok(flow.code.length>0);node.renderTarget.dispose();node._quadMesh.material.dispose();guides.push({auxiliary,lens,curved,temporal});}finally{for(const texture of f.textures)texture.dispose();}}
const result={passed:true,cases,lobes,guides,featureCacheChanges:true,freshUniformBindings:true,fixedSlotDecoders:true,rawBVHPrefix:true,weakTransmissionNotDropped:true,lensAndTemporalGuideCombinations:true,deviceInitializations:0,draws:0,actualGPUPixelsClaim:false};
if(process.argv.includes('--record'))await fs.writeFile('native/build/gpu-shared-shader-124.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
