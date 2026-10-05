import assert from 'node:assert/strict';
import {GameplayEditor} from '../prototype/gameplay-editor.js';

// Clock/navigation contract only; real DOM, pointer and native playback are checked by the window fixture.
const editor=Object.create(GameplayEditor.prototype),samples=[],errors=[];
Object.assign(editor,{doc:{kind:'sequenceasset',data:{length:2,rate:1,fps:30,loop:false,tracks:[{keys:[{time:.5},{time:1.5}],clips:[{start:.75,duration:.5}]}]}},element:{ownerDocument:{defaultView:{cancelAnimationFrame(){},requestAnimationFrame(){return 1;}}}},hooks:{error:e=>errors.push(e)},visualPreview:{sample:t=>samples.push(t)},timelineTime(){}});
const near=expected=>assert.ok(Math.abs(editor.time-expected)<1e-8);
editor.scrub(.255);editor.timelineMove(-1);near(7/30);editor.timelineMove(1);near(8/30);editor.timelineMove(1,true);near(.5);editor.timelineMove(1,true);near(.75);editor.timelineMove(-1,true);near(.5);editor.scrub(2);editor.timelineMove(1);near(2);editor.scrub(-5);near(0);editor.timelineMove(-1);near(0);
editor.scrub(.4);editor.scrub(Infinity);editor.scrub(NaN);near(.4);assert.equal(errors.length,2);assert.equal(samples.at(-1),.4);
editor.time=1.9;editor.preview=true;editor.last=0;editor.previewFrame(200);near(2);assert.equal(editor.preview,false);assert.equal(samples.at(-1),2);
editor.doc.data.loop=true;editor.time=1.9;editor.preview=true;editor.last=0;editor.previewFrame(200);near(.1);assert.equal(editor.preview,true);editor.scrub(1);assert.equal(editor.preview,false);
editor.doc.kind='montage';editor.doc.data={length:2,sections:[{time:0},{time:1.1}],notifies:[{time:.25}],clips:[{start:.4,duration:.4}]};editor.scrub(.255);editor.timelineMove(-1);near(.25);editor.timelineMove(1,true);near(.4);editor.timelineMove(1,true);near(.8);editor.timelineMove(1,true);near(1.1);
editor.doc.kind='sequenceasset';editor.doc.data={length:86400,fps:240,tracks:Array.from({length:256},()=>({keys:Array.from({length:1024},(_,time)=>({time})),clips:[]}))};editor.scrub(0);editor.timelineMove(1,true);near(1);editor.scrub(1024);editor.timelineMove(-1,true);near(1023);
console.log('Timeline: bounded finite scrub, 30/60 fps, key boundaries, large valid key count, terminal/loop clock and independent preview time passed');
