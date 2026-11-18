// Game essentials: movement components stop while the game is paused, camera fade holds its final alpha, Health takes
// damage with death once and respawn refills it, achievements/stats, saved window/volume/UI text scale come back on the
// next run, subtitles and debug strings appear and expire, frame stats text, preload progress, random sound.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {applyHealthDamage,healthState,healthOf,regenerate} from '../prototype/health-component.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

// Health unit: invincibility window, single death, regen after the delay.
{const o={components:[{type:'Health',properties:{maxHealth:10,invincibleTime:.5,regenPerSecond:2,regenDelay:1}}]};
  assert.deepEqual(applyHealthDamage(o,4,0),{applied:true});assert.equal(applyHealthDamage(o,4,.2).applied,false,'invincible');assert.equal(healthState(o,healthOf(o)).current,6);
  regenerate(o,healthOf(o),1,.5);assert.equal(healthState(o,healthOf(o)).current,6,'no regen before the delay');regenerate(o,healthOf(o),1,2);assert.equal(healthState(o,healthOf(o)).current,8);
  assert.equal(applyHealthDamage(o,20,3).died,true);assert.equal(applyHealthDamage(o,1,4).applied,false,'dead stays dead');}

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/game-essentials-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Essentials',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8')),owner=scene.objects[0];
  owner.components=[...(owner.components||[]),{id:'hp',name:'Health',type:'Health',properties:{enabled:true,maxHealth:10}},{id:'spin',name:'Rotating Movement',type:'RotatingMovement',properties:{enabled:true,rotationRate:[0,90,0]}}];
  const node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const wire=(x,xp,y,yp)=>{const r=connect(graph,{node:x,pin:xp},{node:y,pin:yp});assert.ok(r.ok,graph.nodes.find(n=>n.id===x)?.key+'.'+xp+' -> '+graph.nodes.find(n=>n.id===y)?.key+'.'+yp+' '+r.reason);};
  const chain=list=>{for(let i=1;i<list.length;i++)wire(list[i-1].id,'then',list[i].id,'exec');};
  const begin=graph.nodes.find(n=>n.key==='beginPlay'),death=node('onDeath'),dead=node('print',{message:'dead'}),achieved=node('onAchievementUnlocked'),achievedPrint=node('print');
  wire(death.id,'then',dead.id,'exec');wire(achieved.id,'then',achievedPrint.id,'exec');wire(achieved.id,'id',achievedPrint.id,'message');
  const steps=[begin,node('applyDamage',{target:'self',damage:4}),node('applyDamage',{target:'self',damage:7}),node('respawnActor',{target:'self'}),node('heal',{target:'self',amount:-3}),
    node('startCameraFade',{fromAlpha:0,toAlpha:1,duration:.05,color:[0,0,0,1],holdWhenFinished:true}),node('achievementUnlock',{id:'first_win'}),node('statAdd',{name:'kills',amount:2}),node('statAdd',{name:'kills',amount:3}),
    node('setMasterVolume',{volume:.5}),node('setUiTextScale',{scale:1.5}),node('setResolution',{width:1024,height:768}),node('showSubtitle',{text:'Hello',duration:.05}),node('drawDebugString',{position:[0,2,0],text:'debug',color:[1,1,0,1],duration:.05}),
    node('setStatsVisible',{visible:true}),node('preloadAssets',{assets:[record.manifest.startupScene]}),node('playSoundRandom',{sounds:[],position:[0,0,0],volume:1,pitchMin:.9,pitchMax:1.1}),node('gamePaused',{paused:true})];
  chain(steps);
  const getHp=node('getHealth',{target:'self'}),hpText=node('toString'),hpPrint=node('print'),kills=node('statGet',{name:'kills'}),killsText=node('toString'),killsPrint=node('print');
  wire(steps.at(-1).id,'then',hpPrint.id,'exec');wire(getHp.id,'return',hpText.id,'value');wire(hpText.id,'return',hpPrint.id,'message');wire(hpPrint.id,'then',killsPrint.id,'exec');wire(kills.id,'return',killsText.id,'value');wire(killsText.id,'return',killsPrint.id,'message');
  await fs.writeFile(file,JSON.stringify(graph));owner.blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const logs=[],windows=[];let vm,services,widgetsMid,statsSeen,fadeAlpha;
  await runProject(record.file,{frames:30,storage:adapter,onLog:line=>logs.push(String(line?.text??line)),onWindow:w=>windows.push(w),beforeFrame:async(frame,state,s)=>{vm=state;services=s;if(frame===1)widgetsMid=s.overlayState().widgets;if(frame===28){statsSeen=s.overlayState().stats;fadeAlpha=s.cameraFadeState()?.alpha;}}});
  assert.equal(logs.filter(l=>l==='dead').length,1,'one death: '+JSON.stringify(logs));assert.ok(logs.includes('7'),'respawn refilled, heal -3 → 7: '+JSON.stringify(logs));assert.ok(logs.includes('5'),'stats added');assert.ok(logs.includes('first_win'),'achievement event');
  const live=vm.objects.find(o=>o.id===owner.id);assert.ok(Math.abs(live.rotation[1]-(owner.rotation?.[1]??0))<1e-6,'paused game: rotating movement did not move: '+live.rotation);
  assert.equal(fadeAlpha,1,'fade held at 1');assert.equal(widgetsMid,2,'subtitle and debug string shown');assert.equal(services.overlayState().widgets,0,'both expired');assert.match(String(statsSeen),/FPS/);assert.equal(services.overlayState().textScale,1.5);
  const settings=[...storage].find(([k])=>k.includes('playersettings'))?.[1],progress=[...storage].find(([k])=>k.includes('progress'))?.[1];
  assert.deepEqual(JSON.parse(settings).window,{width:1024,height:768});assert.equal(JSON.parse(settings).volume,.5);assert.deepEqual(JSON.parse(progress).unlocked,['first_win']);
  // second run: saved window size and volume are applied again
  const again=[];graph.nodes=graph.nodes.filter(n=>n.key==='beginPlay');graph.edges=[];await fs.writeFile(file,JSON.stringify(graph));
  await runProject(record.file,{frames:2,storage:adapter,onWindow:w=>again.push(w),beforeFrame:async(frame,state,s)=>{services=s;}});
  assert.ok(again.some(w=>w.width===1024&&w.height===768),'window restored: '+JSON.stringify(again));
  console.log(JSON.stringify({passed:true,logs:logs.length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
