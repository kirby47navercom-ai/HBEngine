import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {frameSettings,validFrameSettings,validBuildProfile,defaultBuildProfile} from '../prototype/build-profile.js';
import {createFrameLoop} from '../prototype/frame-loop.js';
import {FrameProfiler} from '../prototype/frame-profiler.js';
assert.deepEqual(frameSettings(),{targetFrameRate:120,framePacing:'fixed'});
for(const target of ['android','ios'])assert.deepEqual(frameSettings({target}),{targetFrameRate:60,framePacing:'display'});
assert.equal(frameSettings({mobile:true}).targetFrameRate,60);
for(const targetFrameRate of [0,-1,14,241,120.5,'120',NaN,Infinity])assert.equal(validFrameSettings({targetFrameRate}),false);
assert.equal(validFrameSettings({framePacing:'unlimited'}),false);
assert.ok(validBuildProfile(defaultBuildProfile({name:'Game',startupScene:'Assets/Game.hbscene.json'})));
async function run(settings,work=0){let now=0,next=null,sequence=0,cancelled=0;const starts=[];const host={performance:{now:()=>now},setTimeout:(fn,delay)=>{next={fn,at:now+delay};return ++sequence;},clearTimeout:()=>{next=null;cancelled++;},requestAnimationFrame:fn=>{next={fn,at:now+1000/144};return ++sequence;},cancelAnimationFrame:()=>{next=null;cancelled++;}};
 const loop=createFrameLoop(async t=>{starts.push(t);now+=work;},settings,host);loop.start();loop.start();while(next&&next.at<1000){const {fn,at}=next;next=null;now=at;await fn();}loop.stop();assert.equal(next,null);assert.ok(cancelled>0);return starts;
}
const pc=await run(frameSettings()),mobile=await run(frameSettings({mobile:true}));assert.ok(pc.length>=119&&pc.length<=121,pc.length);assert.ok(mobile.length>=59&&mobile.length<=61,mobile.length);
const delayed=await run(frameSettings(),30);assert.ok(delayed.length<=34);assert.ok(delayed.slice(1).every((t,i)=>t-delayed[i]>=30),'no catch-up burst');
const p=new FrameProfiler(600,120);p.frame(0,9,8,1);p.frame(10,19,8,1);const report=p.snapshot();assert.equal(report.targetFrameRate,120);assert.equal(report.overBudget,1);assert.equal(report.fps,100);assert.ok(report.budgetMs<8.334);
const active=new FrameProfiler(600,120);active.frame(active.time(0),active.time(9),8,1);const started=active.time(10);active.setActive(false,14);active.setActive(false,20);assert.equal(active.time(5000),14);active.setActive(true,6014);active.setActive(true,6015);active.frame(started,active.time(6019),active.time(6018)-started,1);assert.deepEqual(active.snapshot(),report,'Background duration is excluded from both frame intervals and an in-flight awaited frame; work samples remain');active.reset();assert.equal(active.time(6020),20,'Clearing samples preserves the active clock');
if(process.env.SHARED_REVISION){
  assert.match(process.env.SHARED_REVISION,/^[0-9a-f]{40}$/);
  const base=execFileSync('git',['show',process.env.SHARED_REVISION+':prototype/frame-profiler.js'],{encoding:'utf8',windowsHide:true}),actual=await fs.readFile(new URL('../prototype/frame-profiler.js',import.meta.url),'utf8');
  const methods='  setActive(active,now){if(!active&&this.pausedAt===null)this.pausedAt=now;else if(active&&this.pausedAt!==null){this.inactiveMs+=now-this.pausedAt;this.pausedAt=null;}}\n  time(now){return now-this.inactiveMs-(this.pausedAt===null?0:now-this.pausedAt);}\n';
  const expected=base.replace('this.targetFrameRate=targetFrameRate;this.reset();','this.targetFrameRate=targetFrameRate;this.inactiveMs=0;this.pausedAt=null;this.reset();').replace('  frame(start,end,simulation,render)',methods+'  frame(start,end,simulation,render)');
  assert.ok(actual===base||actual===expected,'Other profiler changes require the full checks');
}
console.log('Frame targets: PC120/mobile60 defaults, profile validation, fixed/display pacing, delayed-work cap, cancellation and real measured budget passed');
