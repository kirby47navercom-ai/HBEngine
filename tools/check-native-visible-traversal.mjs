// Visible traversal of the native scene renderer: a hidden subtree is not visited (its 5000 children's visibility is
// never read), and showing, moving, hiding and root hiding add, update and remove exactly the hidden subtree's mesh
// draw and light. (Formerly an A/B against a source-patched scene.traverse baseline; the encoder now uses its own
// skipping traversal, so the invariants are checked on the current renderer directly.)
// node tools/check-native-visible-traversal.mjs
import {retainTestEvidence} from './test-artifacts.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';

const work=await fs.mkdtemp('native/build/visible-render-');retainTestEvidence(work);
const geometry=new T.BoxGeometry(),material=new T.MeshBasicMaterial({color:0x8844cc}),scene=new T.Scene(),shown=new T.Mesh(geometry,material),hidden=new T.Group(),child=new T.Mesh(geometry,material),lamp=new T.PointLight(0xff4400,2);scene.add(shown,hidden);hidden.add(child,lamp);hidden.visible=false;let hiddenReads=0;
for(let i=0;i<5000;i++){const node=new T.Object3D();Object.defineProperty(node,'visible',{configurable:true,get(){hiddenReads++;return true;}});hidden.add(node);}
const camera=new T.PerspectiveCamera(60,16/9,.1,100);camera.position.z=6;camera.updateMatrixWorld();
const listeners=new Set(),packets=[],bridge={addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),postMessage(p){if(['frame','upload'].includes(p.op))packets.push({op:p.op,data:structuredClone(p.data)});queueMicrotask(()=>{for(const fn of listeners)fn({data:{channel:'hb.render',id:p.id,ok:true,value:{calls:1,meshes:1,textures:0}}});});}};
const r=await createNativeSceneRenderer({clientWidth:640,clientHeight:360},error=>{throw error;},{bridge});
// Host state from the packets: held draws (updates/remove) and the light list.
const held=new Set();let lights=[];
const frame=async()=>{packets.length=0;await r.render(scene,camera);await r.hbFinishFrame();const f=packets.find(p=>p.op==='frame').data;for(const id of f.remove||[])held.delete(id);for(const d of f.updates||[])held.add(d.id);if(f.lights)lights=f.lights;return f;};
const childDraw=()=>[...held].some(id=>id.startsWith(child.uuid+':')),shownDraw=()=>[...held].some(id=>id.startsWith(shown.uuid+':'));
const rows=[];
try{
 const cases=[['hidden',()=>{},false],['show',()=>{hidden.visible=true;},true],['move',()=>{child.position.x=2;lamp.position.y=3;},true],['hide',()=>{hidden.visible=false;},false],['root hidden',()=>{scene.visible=false;},false],['restore',()=>{scene.visible=true;hidden.visible=true;},true]];
 for(const [name,change,childVisible] of cases){change();await frame();
  assert.equal(childDraw(),childVisible,name+': hidden subtree mesh draw');assert.equal(lights.length,childVisible?1:0,name+': hidden subtree light');
  assert.equal(shownDraw(),name!=='root hidden',name+': visible sibling draw');rows.push(name);}
 hidden.visible=false;await frame();hiddenReads=0;await frame();assert.equal(hiddenReads,0,'hidden subtree children are not visited');
 const result={passed:true,cases:rows,hiddenObjects:5000,hiddenReads,scope:'Current native renderer packets (bridge double): hidden subtrees skipped, show/move/hide/root-hide add/update/remove their draws and lights.'};
 await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{await r.dispose();geometry.dispose();material.dispose();}
