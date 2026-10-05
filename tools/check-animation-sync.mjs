import assert from 'node:assert/strict';
import * as THREE from 'three';
import {animationSyncFixture} from './animation-sync-fixture.mjs';
import {animationStatesFixture} from './animation-state-fixture.mjs';
import {AnimationGraphPlayer} from '../prototype/animation-graph-runtime.js';
import {makeAnimationNode,validAnimationGraph} from '../prototype/animation-graph-assets.js';
import {makeAnimationNotify} from '../prototype/animation-sync.js';
import {createAsset} from '../prototype/asset-documents.js';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
const near=(a,b,why='')=>assert.ok(Math.abs(a-b)<1e-7,why+' '+a+' ≠ '+b);
const object=()=>({id:'Root',name:'Sync actor',kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});
const load=f=>AnimationGraphPlayer.load(f.data,{object:object(),group:new THREE.Group(),asset:async name=>Object.hasOwn(f.assets,name)?name:null,readAsset:async name=>structuredClone(f.assets[name]),spriteFrame:async()=>{},update:()=>{}});
const clock=(p,n)=>p.mainContext.elapsed.get(n.id)+n.properties.offset;
{
 const f=animationSyncFixture();for(const n of [f.a,f.b])n.properties.sync.markers=[];const p=await load(f);await p.tick(.5);near(clock(p,f.a),.5);near(clock(p,f.b),1);near(p.object.position[0],.25);assert.equal(p.syncGroups.snapshot()[0].method,'length');assert.equal(p.syncGroups.snapshot()[0].leader.id,f.a.id);p.setParameter('Speed',.75);await p.tick(0);near(clock(p,f.a),.5,'leader change without phase jump');near(clock(p,f.b),1);await p.tick(.25);near(clock(p,f.a),.625);near(clock(p,f.b),1.25);near(p.object.position[0],.3125);p.paused=true;await p.tick(1);near(clock(p,f.b),1.25);p.dispose();assert.equal(p.syncGroups.groups.size,0);
}
{
 const f=animationSyncFixture(),p=await load(f);await p.tick(.5);near(clock(p,f.a),.5);near(clock(p,f.b),1.5,'matching marker interval fraction');near(p.syncGroups.snapshot()[0].marker.ratio,.5);assert.equal(p.syncGroups.snapshot()[0].method,'markers');assert.equal(p.takeEvents().filter(e=>e.phase==='notify').length,1,'follower suppressed');p.setParameter('Speed',.75);await p.tick(0);near(clock(p,f.b),1.5);near(clock(p,f.a),.5,'marker leader handoff');await p.tick(1.5);near(clock(p,f.b),3);near(clock(p,f.a),1);assert.equal(p.syncGroups.snapshot()[0].marker.previous,'Right');
}
{
 const f=animationSyncFixture();f.a.properties.sync.role='leader';f.assets[f.a.properties.clip].timeline.length=4;f.assets[f.a.properties.clip].timeline.tracks[0].keys[1].time=4;f.assets[f.b.properties.clip].timeline.length=2;f.assets[f.b.properties.clip].timeline.tracks[0].keys[1].time=2;f.a.properties.sync.markers=['Left','Right','Left','Right'].map((name,time)=>({id:crypto.randomUUID(),name,time}));f.b.properties.sync.markers=['Left','Right'].map((name,time)=>({id:crypto.randomUUID(),name,time}));f.a.properties.notifies=f.b.properties.notifies=[];const p=await load(f);await p.tick(.5);near(clock(p,f.b),.5);await p.tick(2);near(clock(p,f.b),2.5,'multiple repeated marker intervals');await p.tick(1.6);near(clock(p,f.a),4.1);near(clock(p,f.b),4.1,'leader loop continues repeated follower cycles');
}
{
 const f=animationSyncFixture();f.b.properties.sync.markers[1].name='Other';const p=await load(f);await p.tick(.5);assert.equal(p.syncGroups.snapshot()[0].method,'length');near(clock(p,f.b),1);
 f.a.properties.sync.role=f.b.properties.sync.role='follower';const q=await load(f);await q.tick(.5);assert.equal(q.syncGroups.snapshot()[0].leader.id,f.a.id);f.a.properties.sync.role=f.b.properties.sync.role='leader';const r=await load(f);await r.tick(.5);assert.equal(r.syncGroups.snapshot()[0].leader.id,f.b.id);
 f.b.properties.sync.role='transitionLeader';f.a.properties.sync.role='canLeader';const s=await load(f);await s.tick(.5);assert.equal(s.syncGroups.snapshot()[0].participants.length,1);s.setParameter('Speed',1);await s.tick(.1);assert.equal(s.syncGroups.snapshot()[0].leader.id,f.b.id);s.setParameter('Speed',.5);await s.tick(.1);assert.equal(s.syncGroups.snapshot()[0].leader.id,f.b.id,'transition leader remains until completely blended out');s.setParameter('Speed',0);await s.tick(.1);s.setParameter('Speed',.5);await s.tick(.1);assert.equal(s.syncGroups.snapshot()[0].participants.length,1,'relevant gap resets completed transition role');
}
{
 const f=animationSyncFixture();for(const n of [f.a,f.b]){n.properties.sync.method='none';n.properties.sync.markers=[];n.properties.notifies=[makeAnimationNotify(n.name+'0',0),makeAnimationNotify(n.name+'Half',.5)];}const p=await load(f);await p.tick(0);assert.deepEqual(p.takeEvents().map(e=>e.name),['Walk0','Run0']);await p.tick(0);assert.equal(p.takeEvents().length,0);await p.tick(.5);assert.deepEqual(p.takeEvents().map(e=>e.name),['WalkHalf','RunHalf']);await p.tick(4);assert.deepEqual(p.takeEvents().map(e=>e.name),['Walk0','WalkHalf','Walk0','Run0','WalkHalf','RunHalf'],'notify callback order follows crossing time across clips');
 const g=animationSyncFixture();g.b.properties.notifies[0].triggerOnFollower=true;const q=await load(g);await q.tick(.5);assert.equal(q.takeEvents().length,2);g.b.properties.notifies[0].minWeight=.5;const r=await load(g);await r.tick(.5);assert.equal(r.takeEvents().length,1);
}
{
 const f=animationSyncFixture();delete f.a.properties.sync;delete f.a.properties.notifies;delete f.b.properties.sync;delete f.b.properties.notifies;const p=await load(f);await p.tick(.5);near(clock(p,f.b),.5,'legacy unsynced assets');assert.equal(p.syncGroups.snapshot().length,0);f.a.properties.sync={method:'group',role:'canLeader',group:'',markers:[]};assert.equal(validAnimationGraph(f.data),false);
 const g=animationSyncFixture();g.a.properties.sync.markers[1].time=2;assert.ok(validAnimationGraph(g.data),'authoring does not know external clip duration');await assert.rejects(()=>load(g),/길이보다 짧아야/);g.a.properties.sync.markers[1].time=0;assert.equal(validAnimationGraph(g.data),false,'duplicate marker time');
 const h=animationSyncFixture();h.output.inputs.pose=h.blend.id;const q=await load(h);await assert.rejects(()=>q.tick(0),/Sync 포즈/);
}
{
 const f=animationSyncFixture(),second=makeAnimationNode('sync'),mix=makeAnimationNode('blend');second.properties.group='Other';second.inputs.pose=f.blend.id;mix.inputs={a:f.sync.id,b:second.id};f.output.inputs.pose=mix.id;f.data.nodes.push(second,mix);const p=await load(f);await assert.rejects(()=>p.tick(.1),/서로 다른 Sync/);
 f.a.properties.sync.method=f.b.properties.sync.method='group';f.a.properties.sync.group=f.b.properties.sync.group='Explicit';const q=await load(f);await q.tick(.1);near(clock(q,f.a),.1,'shared DAG clock once');assert.equal(q.syncGroups.snapshot()[0].participants.length,2);near(q.syncGroups.snapshot()[0].participants[0].weight,.75,'merged DAG weights');
}
{
 const f=animationStatesFixture();for(const n of f.clips){n.properties.sync.method='group';n.properties.sync.group='States';}const p=await load(f);await p.tick(0);p.setParameter('Moving',true);await p.tick(.25);near(p.machine('Locomotion').snapshot().transition.progress,.25,'plan/sample advances transition once');near(p.machine('Locomotion').snapshot().time,.25);assert.equal(p.syncGroups.snapshot()[0].participants.length,2);await p.tick(.75);assert.equal(p.machine('Locomotion').snapshot().stateName,'Run');assert.equal(p.syncGroups.snapshot()[0].leader.context,p.machine('Locomotion').stateContext(f.run.id).key);
}
{
 const f=animationSyncFixture();f.a.properties.notifies=[makeAnimationNotify('Flood',0)];f.a.properties.sync.method='none';const p=await load(f);await assert.rejects(()=>p.tick(9000),/알림 경계 한도/);
 const g=animationSyncFixture();g.a.properties.sync.role='leader';const q=await load(g);await assert.rejects(()=>q.tick(9000),/마커 경계 한도/);
}
{
 const f=animationSyncFixture(),o=object(),calls=[],bp=createAsset('blueprint','BP_Sync'),services=engineOperations({readAsset:async name=>name==='Assets/AG.hbanimgraph.json'?f.data:f.assets[name],asset:async(name,kind)=>kind==='animgraph'?'Assets/AG.hbanimgraph.json':name,mesh:()=>new THREE.Group(),update:()=>{},physicsOptions:{backend:'legacy'}}),binding={self:o.id,root:bp},vm=new BlueprintRuntime([o],[binding],{...services});vm.active=true;vm.custom=async(b,name,args)=>{calls.push({name,...args});};const op=(key,a={})=>services.operation(key,{target:o.id,...a},binding,vm);await op('animGraphPlay',{asset:'Graph'});await services.physics(.5,vm);assert.equal((await op('animGraphSyncLeader',{group:'Locomotion'})).return,f.a.id);near((await op('animGraphSyncPhase',{group:'Locomotion'})).return,.25);assert.equal((await op('animGraphSyncMode',{group:'Locomotion'})).return,'markers');assert.equal(calls.length,1);assert.equal(calls[0].clip,f.a.id);await assert.rejects(()=>op('animGraphSyncPhase',{group:'Missing'}),/활성/);vm.custom=async()=>{await op('animGraphStop');};await services.physics(2,vm);assert.equal(o.gameplayDebug.animationGraph,undefined,'notify stop cancels remaining stale graph callbacks');services.dispose();
}
{
 const f=animationSyncFixture();for(const [i,n] of [f.a,f.b].entries()){n.properties.loop=false;n.properties.sync.markers=[];n.properties.notifies=[makeAnimationNotify('Once',0)];}const p=await load(f);await p.tick(0);assert.equal(p.takeEvents().length,1);await p.tick(5);near(clock(p,f.b),4,'nonloop follower clamps at end');await p.tick(2);assert.equal(p.takeEvents().length,0,'nonloop notify never repeats');
}
{
 const f=animationSyncFixture();for(const [i,n] of [f.a,f.b].entries()){const data=createAsset('spriteanimation','SA_'+i);data.frames=[{sprite:'Assets/S'+i+'0.hbsprite.json',duration:i?2:1},{sprite:'Assets/S'+i+'1.hbsprite.json',duration:i?2:1}];n.properties.clip='Assets/SA_'+i+'.hbspriteanimation.json';f.assets[n.properties.clip]=data;}let frame;const o=object();o.position=[3,-2,.1];const p=await AnimationGraphPlayer.load(f.data,{object:o,group:new THREE.Group(),asset:async name=>name,readAsset:async name=>structuredClone(f.assets[name]),spriteFrame:async(_,sprite)=>{frame=sprite;},update:()=>{}});await p.tick(.5);assert.equal(frame,'Assets/S00.hbsprite.json');await p.tick(1);assert.equal(frame,'Assets/S01.hbsprite.json');f.b.properties.sync.role='leader';p.setParameter('Speed',.75);await p.tick(0);assert.equal(frame,'Assets/S11.hbsprite.json');assert.deepEqual(o.position,[3,-2,.1],'synced 2D sprite animation keeps placed transform');const bytes=p.poseBytes,buffer=p.poses.get(f.a.id);await p.tick(.1);assert.equal(p.poseBytes,bytes);assert.equal(p.poses.get(f.a.id),buffer,'sync ticks reuse pose buffers');
}
console.log('Animation sync: roles/leader handoff, marker/repeated intervals, fallback, graph groups, legacy, notify ordering/weight/loops, BP services, 2D sprites/state clocks and bounds passed');
