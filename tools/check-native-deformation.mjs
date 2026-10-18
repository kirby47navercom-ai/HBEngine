import assert from 'node:assert/strict';
import * as THREE from 'three';
import {packedDeformation,packedPose,createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {morphSnapshot,morphNames,morphWeight,setMorphWeight} from '../prototype/morph-controls.js';
import {engineOperations} from '../prototype/engine-services.js';
import {catalog,makeNode,validBlueprint,defaultBlueprint} from '../prototype/blueprint-model.js';

const geometry=new THREE.PlaneGeometry(1,1),count=geometry.attributes.position.count;
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array(count).fill([0,1,0,1]).flat(),4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array(count).fill([.25,.75,0,0]).flat(),4));
const base=geometry.attributes.position,morph=base.clone();for(let i=0;i<count;i++)morph.setX(i,base.getX(i)+2);geometry.morphAttributes.position=[morph];
const root=new THREE.Bone(),tip=new THREE.Bone();root.add(tip);tip.position.y=1;
const material=new THREE.MeshBasicMaterial({color:0xff0000}),mesh=new THREE.SkinnedMesh(geometry,material),scene=new THREE.Scene();mesh.add(root);scene.add(mesh);scene.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([root,tip]));tip.rotation.z=Math.PI/2;scene.updateMatrixWorld(true);
mesh.morphTargetInfluences[0]=.5;
mesh.name='Body';const name=Object.keys(mesh.morphTargetDictionary)[0];assert.deepEqual(morphNames(morphSnapshot(scene)),[name]);assert.equal(morphWeight(morphSnapshot(scene),name).weight,.5);setMorphWeight(scene,name,-.25);assert.equal(mesh.morphTargetInfluences[0],-.25);assert.throws(()=>setMorphWeight(scene,name,Infinity));assert.throws(()=>setMorphWeight(scene,'Missing',1));assert.throws(()=>setMorphWeight(scene,name,1,'Missing'));
const duplicate=new THREE.Mesh(geometry,material);duplicate.name='Other';scene.add(duplicate);assert.throws(()=>setMorphWeight(scene,name,1));setMorphWeight(scene,name,.75,'Other');assert.equal(duplicate.morphTargetInfluences[0],.75);assert.equal(mesh.morphTargetInfluences[0],-.25);scene.remove(duplicate);mesh.morphTargetInfluences[0]=.5;
const object={id:'Model'},vm={object:id=>id==='Model'?object:null,objects:[object]},services=engineOperations({mesh:()=>scene,readAsset:async()=>({}),headless:true});
assert.deepEqual((await services.operation('morphNames',{target:'Model'}, {self:'Model'},vm)).return,[name]);await services.operation('morphSetWeight',{target:'Model',name,value:.25},{self:'Model'},vm);assert.equal((await services.operation('morphWeight',{target:'Model',name},{self:'Model'},vm)).return,.25);assert.equal(object.gameplayDebug.morphs[0].weight,.25);await assert.rejects(()=>services.operation('morphSetWeight',{target:'Model',name,value:NaN},{self:'Model'},vm));mesh.morphTargetInfluences[0]=.5;
for(const key of ['morphNames','morphWeight','morphSetWeight']){assert.ok(catalog.some(n=>n.key===key&&n.cppName));assert.ok(validBlueprint({...structuredClone(defaultBlueprint),nodes:[makeNode(key)],edges:[]}));}
const data=packedDeformation(mesh),pose=packedPose(mesh);assert.equal(data.skin.length,count*8);assert.equal(data.targets.length,count*12);assert.deepEqual(data.targets.slice(0,4),[2,0,0,0]);assert.equal(pose.bones.length,2);
const expected=mesh.getVertexPosition(0,new THREE.Vector3()),input=new THREE.Vector3().fromBufferAttribute(base,0).add(new THREE.Vector3(1,0,0)),actual=new THREE.Vector3();
for(const [j,w] of [[0,.25],[1,.75]])actual.addScaledVector(input.clone().applyMatrix4(new THREE.Matrix4().fromArray(pose.bones[j])),w);
assert.ok(expected.distanceTo(actual)<1e-6,'morph before skin equals Three vertex transform');
const savedBind=mesh.bindMatrix.clone(),savedInverse=mesh.bindMatrixInverse.clone();mesh.bindMatrix.makeTranslation(1,2,3);mesh.bindMatrixInverse.copy(mesh.bindMatrix).invert();for(let i=0;i<count;i++){geometry.attributes.skinWeight.setX(i,.125);geometry.attributes.skinWeight.setY(i,.375);}const affinePose=packedPose(mesh),affineExpected=mesh.getVertexPosition(0,new THREE.Vector3()),affineActual=new THREE.Vector3();for(const [j,w] of [[0,.125],[1,.375]])affineActual.addScaledVector(input.clone().applyMatrix4(new THREE.Matrix4().fromArray(affinePose.bones[j])),w);affineActual.addScaledVector(new THREE.Vector3(...affinePose.bindTranslation),.5);assert.ok(affineExpected.distanceTo(affineActual)<1e-6,'folded bind inverse translation matches non-unit skin weights');mesh.bindMatrix.copy(savedBind);mesh.bindMatrixInverse.copy(savedInverse);for(let i=0;i<count;i++){geometry.attributes.skinWeight.setX(i,.25);geometry.attributes.skinWeight.setY(i,.75);}
geometry.morphTargetsRelative=true;const relative=packedDeformation(mesh);assert.equal(relative.targets[0],morph.getX(0));geometry.morphTargetsRelative=false;
mesh.morphTargetInfluences[0]=NaN;assert.throws(()=>packedPose(mesh));mesh.morphTargetInfluences[0]=.5;
geometry.attributes.skinIndex.setX(0,2);assert.throws(()=>packedDeformation(mesh));geometry.attributes.skinIndex.setX(0,0);
geometry.attributes.skinWeight.setX(0,-1);assert.throws(()=>packedDeformation(mesh));geometry.attributes.skinWeight.setX(0,.25);
const old=morph.count;morph.count=old-1;assert.throws(()=>packedDeformation(mesh));morph.count=old;
const channels=new THREE.BufferGeometry();channels.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));channels.setAttribute('color',new THREE.Float32BufferAttribute([1,0,0,.5,1,0,.5,0,1],3));channels.morphAttributes.normal=[new THREE.Float32BufferAttribute(Array(3).fill([0,1,0]).flat(),3)];channels.morphAttributes.color=[new THREE.Float32BufferAttribute(Array(3).fill([0,0,1,.25]).flat(),4)];const channelData=packedDeformation(new THREE.Mesh(channels,material));assert.deepEqual(channelData.targets.slice(4,8),[0,1,-1,0]);assert.deepEqual(channelData.targets.slice(8,12),[-1,0,1,-.75]);channels.dispose();

const savedWindow=globalThis.window,savedDocument=globalThis.document,packets=[],listeners=new Set(),bridge={addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),postMessage(packet){packets.push(structuredClone(packet));queueMicrotask(()=>{for(const fn of listeners)fn({data:{channel:'hb.render',id:packet.id,ok:true,value:{calls:1,meshes:1,textures:0}}});});}};
globalThis.window={chrome:{webview:bridge}};globalThis.document={documentElement:{classList:{add(){},remove(){}}}};
let renderer,shadowReceiver;
try{
  renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64});const camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,100);camera.position.z=10;camera.updateMatrixWorld(true);
  const render=async()=>{packets.length=0;renderer.render(scene,camera);await renderer.hbFinishFrame();return packets;};
  let p=await render();assert.deepEqual(p.find(p=>p.op==='upload').data.map(r=>r.kind),['deformation','mesh']);assert.equal(p.find(p=>p.op==='frame').data.poses.length,1);
  p=await render();assert.equal(p.some(p=>p.op==='upload'),false);assert.equal(p.find(p=>p.op==='frame').data.poses.length,0);assert.equal(p.find(p=>p.op==='frame').data.updates.length,0);
  assert.equal(p.find(p=>p.op==='frame').data.shadowRefresh,false,'no shadow light does not request a shadow pass');
  const shadowLight=new THREE.DirectionalLight();shadowLight.position.set(0,2,5);shadowLight.castShadow=true;mesh.castShadow=true;scene.add(shadowLight);shadowReceiver=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial());shadowReceiver.position.z=-1;shadowReceiver.receiveShadow=true;scene.add(shadowReceiver);renderer.shadowMap.enabled=true;p=await render();assert.equal(p.find(p=>p.op==='frame').data.shadowRefresh,true);p=await render();assert.equal(p.find(p=>p.op==='frame').data.shadowRefresh,false);
  tip.position.x=2;p=await render();assert.equal(p.some(p=>p.op==='upload'),false);assert.equal(p.find(p=>p.op==='frame').data.poses.length,1);assert.equal(p.find(p=>p.op==='frame').data.shadowRefresh,true);
  mesh.morphTargetInfluences[0]=.75;p=await render();assert.deepEqual(p.find(p=>p.op==='frame').data.poses[0].weights,[.75]);assert.equal(p.some(p=>p.op==='upload'),false);
  morph.setX(0,3);morph.needsUpdate=true;p=await render();assert.deepEqual(p.find(p=>p.op==='upload').data.map(r=>r.kind),['deformation']);assert.equal(p.find(p=>p.op==='frame').data.poses.length,1);
  // The bind pose lies outside the camera; its morphed geometry must still be submitted.
  mesh.position.x=100;p=await render();assert.equal(p.find(p=>p.op==='frame').data.remove.length,0);
  scene.remove(mesh);geometry.dispose();p=await render();assert.deepEqual(p.find(p=>p.op==='frame').data.release.deformations,[mesh.uuid]);assert.deepEqual(p.find(p=>p.op==='frame').data.release.meshes,[geometry.uuid]);
  await renderer.hbReleaseScene();
}finally{await renderer?.dispose();globalThis.window=savedWindow;globalThis.document=savedDocument;geometry.dispose();material.dispose();mesh.skeleton.dispose();shadowReceiver?.geometry.dispose();shadowReceiver?.material.dispose();}
console.log('Native deformation: Three skin/morph order, validation, sparse poses, static mesh reuse, shadow dirtiness and disposal passed');
