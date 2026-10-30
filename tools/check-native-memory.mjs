import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRigidPhysics} from '../prototype/physics-world.js';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {NativeWidgetLayer} from './native-widget-layer.mjs';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {retainTestEvidence} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=process.argv[2]?await fs.realpath(process.argv[2]):await fs.mkdtemp(path.join(root,'native/build/native-memory-'));
if(path.dirname(work)!==path.join(root,'native/build')||!/^native-memory-[A-Za-z0-9]{6}$/.test(path.basename(work)))throw Error('소유 메모리 검사 디렉터리를 확인하세요.');
retainTestEvidence(work);
const cases=[],record=name=>cases.push(name),object=(id,dim)=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[c(dim===2?'BoxCollider2D':'BoxCollider'),c(dim===2?'Rigidbody2D':'Rigidbody',{useGravity:false})]});

for(const dim of [2,3]){
 const objects=[object('first',dim)],world=createRigidPhysics(objects,{dimension:dim,lazyDimensions:true});
 await Promise.all([world.ready(),world.ready()]);assert.deepEqual(world.inspect().dimensions.map(d=>d.dimension),[dim]);world.velocity(objects[0],[1,0,0]);world.step(1/60);assert.ok(objects[0].position[0]>0);
 const other=dim===2?3:2;objects.push(object('second',other));await world.ready();assert.deepEqual(world.inspect().dimensions.map(d=>d.dimension).sort(),[2,3]);world.velocity(objects[1],[2,0,0]);world.step(1/60);assert.ok(objects[1].position[0]>0);
 world.dispose();await assert.rejects(world.ready(),/종료/);record(dim+'D selective init, concurrent ready, opposite dimension spawn and cleanup');
}
const empty=createRigidPhysics([],{dimension:2,lazyDimensions:true});await empty.ready();await empty.ready(3);assert.equal(empty.query('physicsRaycast',{dimension:3,start:[0,0,0],end:[1,0,0]}).hit,false);empty.dispose();record('explicit opposite dimension empty query');
const stopped=createRigidPhysics([],{dimension:2,lazyDimensions:true}),pending=stopped.ready();stopped.dispose();await assert.rejects(pending,/종료/);record('dispose during asynchronous preparation');
const body=object('service',2),services=engineOperations({physicsOptions:{dimension:2,lazyDimensions:true},readAsset:async()=>null,update:()=>{}}),vm=new BlueprintRuntime([body],[],services);
await vm.start();assert.deepEqual(services.physicsState().dimensions.map(d=>d.dimension),[2]);assert.equal((await services.operation('physicsRaycast',{dimension:3,start:[0,0,0],end:[1,0,0]},{self:body.id},vm)).return.hit,false);vm.objects.push(object('spawned',3));await services.operation('setVelocity',{target:'spawned',velocity:[2,0,0]},{self:body.id},vm);await vm.tick(1/60);assert.ok(vm.object('spawned').position[0]>0);await vm.stop();services.dispose();record('common Blueprint services: query and new 3D actor in a 2D world');

for(const name of ['red','blue'])await fs.writeFile(path.join(work,name+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="'+name+'"/></svg>');
let uploads=0,lastPNG,fail=false;const layer=new NativeWidgetLayer({resolve:async name=>path.join(work,path.basename(name))},async(op,data)=>{if(fail){fail=false;throw Error('upload probe');}uploads++;lastPNG=Buffer.from(data.png,'base64');});
await layer.draw(1280,720);assert.equal(layer.canvas,undefined);assert.equal(uploads,0);
const widget=createWidgetAsset('HUD'),image=createWidgetNode('Image','image');image.properties.texture='Assets/red.svg';image.slot.offset=[10,10,32,32];widget.nodes.push(image);
const opts={acceptInput:()=>true,event:()=>{},input:()=>{}},a=layer.create(structuredClone(widget),opts,{owner:'a'}),b=layer.create(structuredClone(widget),opts,{owner:'b'});
await layer.draw(1280,720);const canvas=layer.canvas;assert.equal(layer.defaultFont,undefined);assert.equal(layer.images.size,1);a.dispose();assert.equal(layer.images.size,1);assert.ok(!layer.hits.some(hit=>hit.view===a));
b.data.nodes.find(n=>n.id===image.id).properties.texture='Assets/blue.svg';b.update();assert.equal(layer.images.size,0);await layer.draw(1280,720);assert.equal(layer.canvas,canvas);assert.deepEqual([...layer.images.keys()],['Assets/blue.svg']);
const steady=uploads;await layer.draw(1280,720);assert.equal(uploads,steady);
b.update();fail=true;await assert.rejects(layer.draw(1280,720),/upload probe/);await layer.draw(1280,720);assert.equal(uploads,steady+1);
await layer.draw(1920,1080);assert.equal(layer.canvas,canvas);assert.equal(canvas.width,1920);assert.equal(canvas.height,1080);b.dispose();assert.equal(layer.images.size,0);await layer.draw(1280,720);assert.equal(layer.hits.length,0);layer.dispose();assert.equal(layer.canvas,null);assert.equal(layer.ownedViews.size,0);assert.equal(canvas.width,1);await fs.writeFile(path.join(work,'hud.png'),lastPNG);record('native HUD reuses one canvas, retains shared images, releases switched/disposed images, resize and failed upload retry');

const project=await createProject('메모리 수명 검증',await fs.mkdtemp(path.join(work,'project-')),'2d');let fullState,compactState;
const full=await runProject(project.file,{frames:2,lazyPhysics:true,onFrame:(frame,vm,{services})=>{fullState=services.physicsState();}}),compact=await runProject(project.file,{frames:2,lazyPhysics:true,captureState:false,onFrame:(frame,vm,{services})=>{compactState=services.physicsState();}});
assert.ok(full.objects.length);assert.ok(!('objects'in compact));assert.equal(full.time,compact.time);assert.deepEqual(fullState,compactState);assert.deepEqual(fullState.dimensions.map(d=>d.dimension),[2]);record('shared runProject selective physics and compact exit preserve simulation; full reports remain available');

const sample=path.join(work,'sample.mjs');let comparison=null;
if(await fs.access(sample).then(()=>true,()=>false)){
 const exec=promisify(execFile),samples=[];for(const dim of [2,3])for(let i=0;i<3;i++){const r=await exec(process.execPath,['--expose-gc',sample,String(dim)],{windowsHide:true,timeout:20000,env:{...process.env,DISABLE_SYSTEM_FONTS_LOAD:'1'}});const value=JSON.parse(r.stdout);assert.deepEqual(value.worlds,[dim]);samples.push(value);}
 const baseline=JSON.parse(await fs.readFile(path.join(work,'baseline.json'),'utf8'));comparison={node:process.version,scope:baseline.scope,baseline:baseline.samples,after:samples};await fs.writeFile(path.join(work,'comparison.json'),JSON.stringify(comparison,null,2));record('three fresh process samples per dimension, same runner imports and physics fixture');
}
const report={passed:true,cases,comparison:comparison?'comparison.json':null,scope:'Owned CPU/native canvas fixtures only. No user project, foreground window, C++ compiler or installed process mutation.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
