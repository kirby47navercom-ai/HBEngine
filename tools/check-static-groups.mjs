// Static groups (off-screen skip and matrix-update skip) must not change what is rendered: one scripted scene runs with
// staticConfig.enabled=false and =true; every frame the host main pass (ids, order, world matrices), the shadow casters
// and every mesh world matrix must be identical, and the enabled run must actually skip. A move without an announcement
// is caught by the sampled check, reported, and switches static skipping off.
// node tools/check-static-groups.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {watchStaticGroup,staticConfig} from '../prototype/static-groups.js';
import {touchTransform,touchComponents,revisionConfig,revisionMismatches} from '../prototype/object-revision.js';

revisionConfig.verify=false;
function world(withProbe){
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const objects=[],groups=new Map(),geometries=[new THREE.BoxGeometry(),new THREE.SphereGeometry(.5,10,8)];
 for(let i=0;i<600;i++){const object={id:'o'+i,position:[(i%30)*2-29,0,Math.floor(i/30)*2-19],rotation:[0,0,0],scale:[1,1,1],components:[{id:'t',type:'Transform'},{id:'m',type:'MeshRenderer'}]};
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometries[i%2],new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((i%7)/7,.5,.5)}));mesh.castShadow=mesh.receiveShadow=true;mesh.uuid='mesh-'+i;group.uuid='group-'+i;group.add(mesh);root.add(group);watchStaticGroup(group,object);groups.set(object.id,group);objects.push(object);}
 const sync=o=>{const g=groups.get(o.id);g.position.fromArray(o.position);g.rotation.set(...o.rotation);g.scale.fromArray(o.scale);touchTransform(o);};for(const o of objects)sync(o);
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(10,20,5);sun.castShadow=true;sun.shadow.camera.left=sun.shadow.camera.bottom=-8;sun.shadow.camera.right=sun.shadow.camera.top=8;scene.add(sun,sun.target);
 let probe=null;if(withProbe){probe=new THREE.Group();probe.userData={objectId:'Probe',reflectionProbes:[{id:'Room',properties:{size:[30,10,30],refreshVersion:0}}]};scene.add(probe);}
 const camera=new THREE.PerspectiveCamera(50,1,.1,60);camera.position.set(0,12,18);camera.lookAt(0,0,0);
 return {scene,camera,objects,groups,sync,sun,probe};
}
async function run(enabled,withProbe=false){
 staticConfig.enabled=enabled;const w=world(withProbe),state={draws:new Map(),order:[],casters:null,probes:null},frames=[];let skips=0,blocks=0;const updatesBefore=staticConfig.skippedUpdates;
 const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){const data=JSON.parse(JSON.stringify(packet.data??null));if(packet.op==='frame'){for(const id of data.remove||[])state.draws.delete(id);for(const d of data.updates||[])state.draws.set(d.id,d);if(data.order)state.order=data.order;if(data.shadowCasters)state.casters=data.shadowCasters;state.probes=data.probes??null;}for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
 const renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});renderer.hbSpriteBatching=false;
 try{
  for(let frame=0;frame<60;frame++){
   if(frame>=10&&frame<20)w.camera.position.x=(frame-10)*1.5;
   if(frame===25){const o=w.objects[310];o.position=[o.position[0],1,o.position[2]];w.sync(o);}
   if(frame===30){const g=w.groups.get('o315');g.children[0].material.color.set(0xff0000);touchComponents(w.objects[315]);}
   if(frame===35){w.groups.get('o320').removeFromParent();}
   if(frame===40)w.camera.position.set(-6,10,14);
   if(frame===45)w.sun.position.set(-10,20,-5);
   // Probe captures are re-rendered every frame so their draw lists are compared while groups are skipped.
   if(w.probe)w.probe.userData.reflectionProbes[0].properties.refreshVersion=frame;
   await renderer.render(w.scene,w.camera);await renderer.hbFinishFrame();
   const worlds=[];w.scene.traverse(n=>{if(n.isMesh)worlds.push(n.matrixWorld.elements.join());});
   skips+=renderer.hbStaticSkips||0;blocks+=renderer.hbStaticCellSkips||0;
   frames.push(JSON.stringify([state.order.map(id=>[id,state.draws.get(id)?.world]),state.casters?.map(c=>c.length),worlds,state.probes?.map(p=>[p.id,p.refresh,p.faces?.map(f=>[...f.draws].sort())??null])??null]));
  }
 }finally{await renderer.dispose();}
 return {frames,skips,blocks,skippedUpdates:staticConfig.skippedUpdates-updatesBefore};
}
const before=revisionMismatches.length,offRun=await run(false),onRun=await run(true),off=offRun.frames,on=onRun.frames;
for(let i=0;i<off.length;i++)assert.equal(on[i],off[i],'frame '+i);
// With a reflection probe covering the scene: off-screen static groups reuse their cached draws and probe entries.
const probeOff=await run(false,true),probeOn=await run(true,true);for(let i=0;i<probeOff.frames.length;i++)assert.equal(probeOn.frames[i],probeOff.frames[i],'probe frame '+i);assert(probeOn.skips>1000,'probe scene skips: '+probeOn.skips);assert(probeOn.blocks>0,'probe scene skips through static cells');assert(probeOff.frames.some(f=>JSON.parse(f)[3]?.some(p=>p[2]?.some(d=>d.length))),'probe captures with draws were compared');
assert.equal(offRun.skips,0);assert.equal(offRun.skippedUpdates,0);assert(onRun.skips>1000,'off-screen groups skipped: '+onRun.skips);assert(onRun.blocks>0,'static cells skipped');assert(onRun.skippedUpdates>10000,'matrix updates skipped: '+onRun.skippedUpdates);
assert.equal(revisionMismatches.length,before,'announced writes only: no reports');
// Safety net: an unannounced move of a static group is caught by the sampled real update.
{staticConfig.enabled=true;staticConfig.sampleEvery=1;const w=world(),renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge:{addEventListener(){},removeEventListener(){},postMessage(){}}}).catch(()=>null);
 for(let i=0;i<3;i++)w.scene.updateMatrixWorld();const g=w.groups.get('o5');g.position.x+=3;w.scene.updateMatrixWorld();
 assert.equal(staticConfig.enabled,false,'sampled check switches static skipping off');assert.equal(revisionMismatches.at(-1).kind,'staticGroup');assert.equal(g.children[0].matrixWorld.elements[12],g.position.x,'matrix updated after detection');
 renderer?.dispose?.();staticConfig.sampleEvery=64;staticConfig.enabled=true;}
console.log(JSON.stringify({passed:true,frames:off.length,skippedGroups:onRun.skips,cellSkips:onRun.blocks,probeSceneCellSkips:probeOn.blocks,probeSceneSkips:probeOn.skips,skippedMatrixUpdates:onRun.skippedUpdates,scope:'Static group skipping vs none: identical main pass, shadow casters and mesh matrices; unannounced move caught.'}));
