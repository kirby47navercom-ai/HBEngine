// Gameplay nodes: Apply Damage / Apply Radial Damage fire Any Damage, map and set helpers, sort/max/min, insert/clear,
// string to number, seeded random, rotator interp, object name/distance/bounds, Delay Until Next Tick, Set Input Mode
// (ui blocks input events), and On Clicked / Begin·End Cursor Over through the runtime mouse path.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {blueprintPure as p} from '../prototype/core-preview.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

// pure helpers
let m=p.mapAdd({map:{},key:'hp',value:3}).return;m=p.mapAdd({map:m,key:'mp',value:[1,2]}).return;
assert.deepEqual(p.mapFind({map:m,key:'mp'}),{return:[1,2],found:true});assert.equal(p.mapFind({map:m,key:'x'}).found,false);
assert.deepEqual(p.mapKeys({map:p.mapRemove({map:m,key:'hp'}).return}).return,['mp']);assert.equal(p.mapLength({map:m}).return,2);assert.equal(p.mapContains({map:m,key:'hp'}).return,true);
assert.deepEqual(p.arrayUnion({a:[1,2,2],b:[2,3]}).return,[1,2,3]);assert.deepEqual(p.arrayIntersection({a:[1,2,3,2],b:[2,3,4]}).return,[2,3]);assert.deepEqual(p.arrayDifference({a:[1,2,3],b:[2]}).return,[1,3]);
assert.deepEqual(p.arraySort({array:[3,1,2]}).return,[1,2,3]);assert.deepEqual(p.arraySort({array:['b','a'],descending:true}).return,['b','a']);
assert.deepEqual(p.arrayMax({array:[4,9,2]}),{return:9,index:1});assert.deepEqual(p.arrayMin({array:[4,9,2]}),{return:2,index:2});assert.deepEqual(p.arrayMax({array:[]}),{return:0,index:-1});
assert.deepEqual(p.stringToFloat({value:' 2.5 '}),{return:2.5,valid:true});assert.equal(p.stringToFloat({value:'abc'}).valid,false);assert.deepEqual(p.stringToInt({value:'-12'}),{return:-12,valid:true});assert.equal(p.stringToInt({value:'1.5'}).valid,false);
assert.equal(p.seededRandom({seed:7,index:3}).return,p.seededRandom({seed:7,index:3}).return,'same seed, same value');assert.notEqual(p.seededRandom({seed:7,index:3}).return,p.seededRandom({seed:8,index:3}).return);
for(let i=0;i<100;i++){const v=p.seededRandomInRange({seed:1,index:i,min:2,max:5}).return;assert.ok(v>=2&&v<=5&&Number.isInteger(v));}
assert.deepEqual(p.rinterpTo({current:[170,0,0],target:[-170,0,0],deltaTime:.5,speed:1}).return.map(Math.round),[-180,0,0],'interp takes the short way across 180');
assert.deepEqual(p.rinterpToConstant({current:[0,0,0],target:[90,0,0],deltaTime:1,speed:30}).return,[30,0,0]);

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/utility-nodes-3-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Utility3',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const wire=(x,xp,y,yp)=>assert.ok(connect(graph,{node:x,pin:xp},{node:y,pin:yp}).ok,x+'.'+xp+' -> '+y+'.'+yp);
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8')),owner=scene.objects[0];
  const begin=graph.nodes.find(n=>n.key==='beginPlay');
  // damage: self damages itself, then radial damage around its position
  const damage=node('anyDamage'),toText=node('toString'),print=node('print'),apply=node('applyDamage',{target:'self',damage:7}),radial=node('applyRadialDamage',{origin:[...(owner.position||[0,0,0])],radius:1000,damage:4,falloff:false}),
    countText=node('intToString'),countPrint=node('print'),next=node('delayNextTick'),later=node('print',{message:'next tick'}),name=node('getDisplayName',{target:'self'}),namePrint=node('print'),mode=node('setInputMode',{mode:'ui'});
  wire(damage.id,'then',print.id,'exec');wire(damage.id,'damage',toText.id,'value');wire(toText.id,'return',print.id,'message');
  wire(begin.id,'then',apply.id,'exec');wire(apply.id,'then',radial.id,'exec');wire(radial.id,'then',countPrint.id,'exec');wire(radial.id,'count',countText.id,'value');wire(countText.id,'return',countPrint.id,'message');
  wire(countPrint.id,'then',namePrint.id,'exec');wire(name.id,'return',namePrint.id,'message');wire(namePrint.id,'then',next.id,'exec');wire(next.id,'then',later.id,'exec');wire(later.id,'then',mode.id,'exec');
  const key=node('input');key.options={key:'K'};const keyPrint=node('print',{message:'key K'});wire(key.id,'then',keyPrint.id,'exec');
  await fs.writeFile(file,JSON.stringify(graph));owner.blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const logs=[];let vm,frames=[];
  await runProject(record.file,{frames:4,onLog:line=>logs.push(String(line?.text??line)),beforeFrame:async(frame,state)=>{vm=state;frames.push(logs.length);if(frame===2){await state.input('K',1);await state.input('K',0);await state.flushInput?.();}}});
  assert.ok(logs.includes('7'),'Apply Damage fired Any Damage: '+JSON.stringify(logs));assert.ok(logs.includes('4'),'radial damage in range: '+JSON.stringify(logs));assert.ok(logs.includes('1'),'radial hit count');
  assert.ok(logs.includes(String(owner.name??owner.id)),'display name');
  const nextIndex=logs.indexOf('next tick');assert.ok(nextIndex>logs.indexOf(String(owner.name??owner.id)),'next tick runs after');
  assert.equal(vm.inputMode,'ui');assert.ok(!logs.includes('key K'),'ui input mode blocks key events');
  // cursor events through the runtime: a fake trace hits the owner
  const events=[];vm.inputMode='gameAndUi';vm.hooks.operation=async(k)=>k==='lineTrace'?{hit:{hit:true,position:[0,0,0],normal:[0,1,0],actor:owner.id}}:{};vm.inputState.query=()=>({return:true,origin:[0,0,0],direction:[0,0,1]});
  const b=vm.bindings.find(x=>x.self===owner.id);b.root.nodes.push({id:'clk',key:'onClicked',position:{x:0,y:0}},{id:'ovr',key:'beginCursorOver',position:{x:0,y:0}});const emit=vm.emit.bind(vm);vm.emit=async(binding,k,args,...rest)=>{if(['onClicked','beginCursorOver','endCursorOver'].includes(k))events.push(k+':'+(args.button||''));return emit(binding,k,args,...rest);};
  vm.active=true;vm.paused=false;await vm.cursorEvents(null);await vm.cursorEvents(null);await vm.applyInput('LeftMouseButton',1);await vm.applyInput('LeftMouseButton',0);
  assert.deepEqual(events,['beginCursorOver:','onClicked:LeftMouseButton'],'hover once, click once');
  console.log(JSON.stringify({passed:true,logs:logs.length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
