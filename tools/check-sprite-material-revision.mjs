// Stage 3 of docs/CHANGE_TRACKING_DESIGN.md: retained sprite draws skip re-reading an announced-unchanged material.
// Announced changes apply; with sampling off an unannounced change is skipped (proves the skip); a sampled check finds it,
// reports it and switches the skip off; verify mode always re-reads.
// node tools/check-sprite-material-revision.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {touchMaterial,revisionConfig,revisionTrust,revisionMismatches} from '../prototype/object-revision.js';

revisionConfig.verify=false;revisionTrust.spriteMaterial=true;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.z=20;
const sprites=[];for(let i=0;i<4;i++){const material=new THREE.MeshBasicMaterial({color:0xffffff}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.userData.sprite=true;mesh.position.x=i*3-4;scene.add(mesh);touchMaterial(material);sprites.push(mesh);}
const draws=new Map(),instances=new Map();
const listeners=new Set(),bridge={addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),postMessage(packet){const data=JSON.parse(JSON.stringify(packet.data??null));if(packet.op==='frame'){for(const r of data.resources||[])if(r.kind==='instances')instances.set(r.id,r);for(const id of data.remove||[])draws.delete(id);for(const d of data.updates||[])draws.set(d.id,d);}for(const f of listeners)f({data:{channel:'hb.render',id:packet.id,ok:true,value:packet.op==='frame'?{calls:1,meshes:1,textures:0}:{}}});}};
const renderer=await createNativeSceneRenderer({clientWidth:64,clientHeight:64},()=>{},{bridge});renderer.hbSpriteBatching=false;
const frame=async()=>{await renderer.render(scene,camera);await renderer.hbFinishFrame();};
const color=i=>[...draws.values()].find(d=>d.id.startsWith(sprites[i].uuid)).material.color.slice(0,3);
await frame();await frame();assert.deepEqual(color(0),[1,1,1]);
// Announced change applies.
sprites[0].material.color.setRGB(1,0,0);touchMaterial(sprites[0].material);await frame();assert.deepEqual(color(0),[1,0,0]);
// Unannounced change with sampling off: skipped (stale) - the reason every writer must announce.
revisionConfig.sampleMask=(1<<30)-1;sprites[1].material.color.setRGB(0,1,0);await frame();assert.deepEqual(color(1),[1,1,1]);assert.equal(revisionMismatches.length,0);
// Sampling on: found, reported, trust off, applied.
revisionConfig.sampleMask=0;await frame();assert.deepEqual(color(1),[0,1,0]);assert.equal(revisionMismatches.at(-1)?.kind,'spriteMaterial');assert.equal(revisionTrust.spriteMaterial,false);
sprites[2].material.color.setRGB(0,0,1);await frame();assert.deepEqual(color(2),[0,0,1],'untrusted: unannounced changes apply');
// Verify mode re-reads even when trusted.
revisionTrust.spriteMaterial=true;revisionConfig.verify=true;revisionConfig.sampleMask=(1<<30)-1;sprites[3].material.color.setRGB(1,1,0);await frame();assert.deepEqual(color(3),[1,1,0],'verify mode re-reads');
await renderer.dispose();
console.log(JSON.stringify({passed:true,mismatches:revisionMismatches.length,scope:'Retained sprite material revision skip, sampling fallback and verify mode (JS packets).'}));
