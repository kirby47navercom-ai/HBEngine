import assert from 'node:assert/strict';
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
console.log('Frame targets: PC120/mobile60 defaults, profile validation, fixed/display pacing, delayed-work cap, cancellation and real measured budget passed');
