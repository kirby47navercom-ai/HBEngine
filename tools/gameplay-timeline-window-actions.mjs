import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function authorTimeline({call,change,click,evaluate,element,cdp,dir}){
  const asset='Assets/AM_Upper.hbmontage.json';await call('document.open',{path:asset});const before=await call('document.get',{path:asset});
  const time=()=>element('[data-scrub]', '.valueAsNumber'),near=async expected=>assert.ok(Math.abs(await time()-expected)<1e-7);
  await change('[data-time]','.255');await click('[data-act=previous-frame]');await near(.25);await click('[data-act=next-frame]');await near(16/60);
  await change('[data-time-unit]','frames');assert.equal(await element('[data-time]','.value'),'16');await change('[data-time]','7');await near(7/60);
  const key=async(value,code,vk,modifiers=0)=>{await evaluate('document.querySelector(".gameplay-timeline").focus()');for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  await key('.','Period',190);await near(8/60);await key(',','Comma',188);await near(7/60);await key('.','Period',190,1);await near(2);await key(',','Comma',188,1);await near(0);await key('End','End',35);await near(2);await key('Home','Home',36);await near(0);
  await change('[data-time-unit]','seconds');const point=await evaluate('(()=>{const e=document.querySelector(".gameplay-ruler>div");e.scrollIntoView({block:"nearest"});const r=e.getBoundingClientRect();return {x:r.x+r.width*.4,y:r.y+r.height/2};})()');
  for(const type of ['mousePressed','mouseReleased'])await cdp('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});assert.ok(Math.abs(await time()-.8)<.01,'physical ruler scrub');
  await change('[data-time]','.37');const after=await call('document.get',{path:asset});assert.equal(after.revision,before.revision);assert.deepEqual(after.data,before.data);
  await fs.writeFile(path.join(dir,'timeline-authoring.json'),JSON.stringify({before,after,time:await time(),sourcePreserved:true},null,2));
  const sequence='Assets/LS_MontageProbe.hbsequence.json';await call('document.open',{path:sequence});await change('[data-time]','.2');await click('[data-act=next-frame]');await near(7/30);await key('.','Period',190,1);await near(.5);await key(',','Comma',188,1);await near(0);await change('[data-time]','.1');await call('document.open',{path:asset});await near(.37);
}

export async function observeTimeline({call,until,evaluate,element,dir,cdp}){
  await call('document.open',{path:'Assets/AM_Upper.hbmontage.json'});await until(()=>element('[data-runtime-time]','.textContent.includes("0.50 s")'),'paused montage live cursor');
  const state=await evaluate('({preview:document.querySelector("[data-time]").value,live:document.querySelector("[data-runtime-time]").textContent,heads:[...document.querySelectorAll(".gameplay-editor.active .gameplay-playhead")].map(e=>({live:e.classList.contains("gameplay-runtime-playhead"),hidden:e.hidden,left:e.style.left}))})');await fs.writeFile(path.join(dir,'timeline-live.json'),JSON.stringify(state,null,2));assert.ok(state.heads.length>0);assert.equal(state.preview,'0.37');assert.ok(state.live.includes('일시정지'));assert.ok(state.heads.filter(h=>h.live).every(h=>!h.hidden&&h.left==='25%'));assert.ok(state.heads.filter(h=>!h.live).every(h=>h.left==='18.5%'));
  await fs.writeFile(path.join(dir,'timeline-live.json'),JSON.stringify(state,null,2));await fs.writeFile(path.join(dir,'timeline-live.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
}

export async function runSequenceTimeline({key,inspect,until,call,element,evaluate,dir,cdp}){
  await key('Z');await until(async()=>{const s=await inspect();return s.objects.find(o=>o.id==='Model').gameplayDebug.sequence?.asset==='Assets/LS_MontageProbe.hbsequence.json';},'C++ direct sequence asset identity');await key('C');await key('U');const paused=await until(async()=>{const s=await inspect(),v=s.objects.find(o=>o.id==='Model').gameplayDebug.sequence;return v?.paused&&v.time===.75?s:null;},'C++ pause/seek sequence');
  if(call){await call('document.open',{path:'Assets/LS_MontageProbe.hbsequence.json'});await until(()=>element('[data-runtime-time]','.textContent.includes("0.75 s")'),'direct C++ sequence live cursor');assert.equal(await element('[data-time]','.value'),'0.10');assert.equal(await element('.gameplay-editor.active .gameplay-runtime-playhead','.style.left'),'7.5%');assert.ok(await element('[data-runtime-time]','.textContent.includes("23 f")'));await fs.writeFile(path.join(dir,'sequence-live.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));}
  await key('G');const stopped=await until(async()=>{const s=await inspect();return s.objects.find(o=>o.id==='Model').gameplayDebug.sequence===null?s:null;},'C++ sequence stop');assert.ok(stopped.objects.find(o=>o.id==='Sprite').position.every((n,i)=>Math.abs(n-[-2,0,.1][i])<1e-6));await fs.writeFile(path.join(dir,'sequence-timeline-runtime.json'),JSON.stringify({paused,stopped},null,2));
  if(call){await until(()=>element('[data-runtime-time]','.hidden'),'stopped sequence hides live cursor');assert.equal(await element('[data-time]','.value'),'0.10');assert.equal(await element('.gameplay-runtime-playhead','.hidden'),true);}
}
