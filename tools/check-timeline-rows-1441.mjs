import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {timelineRows,timelineRowContains,timelineRowSelection,readTimelineRows} from '../prototype/timeline-rows.js';
import {sequenceTrackWindow} from '../prototype/sequence-track-window.js';
import {createAsset,validAsset} from '../prototype/asset-documents.js';
import {makeAnimationNotifyState} from '../prototype/animation-sync.js';
import {assetShortcutCommands} from '../prototype/asset-shortcut-commands.js';
import {dispatchAssetShortcut} from '../prototype/asset-shortcuts.js';

const montage=createAsset('montage','DenseMontage');montage.length=4;
montage.clips=Array.from({length:256},(_,i)=>({id:'clip-'+i,clip:'Assets/A.hbanimation.json',slot:i===0?'notifies':i===1?'sections':'Slot_'+i,start:0,duration:1,sourceStart:0,rate:1}));
montage.notifyStates=Array.from({length:64},(_,i)=>({...makeAnimationNotifyState('알림'+i,.25,1),id:'state-'+i}));assert(validAsset('montage',montage));
let presentationReads=0;
for(const value of [...montage.notifyStates,...montage.sections]){const name=value.name;Object.defineProperty(value,'name',{enumerable:true,get(){presentationReads++;return name;}});}
const rows=timelineRows('montage',montage);assert.equal(rows.length,322);assert.equal(presentationReads,64,'row names read once, no eager notify presentation spread');
presentationReads=0;const metadata=readTimelineRows(rows,{offset:250,limit:72});assert.equal(metadata.items.at(-1).index,321);assert.equal(metadata.nextOffset,null);assert.equal(presentationReads,0);assert(!metadata.items.some(value=>'items'in value||'contains'in value));
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);assert.equal(rows[1].id,'slot:notifies');assert.equal(rows[2].id,'slot:sections');
const window=sequenceTrackWindow(rows.length,315*46,400);const visible=rows.slice(window.first,window.end).map(row=>row.items());assert(visible.length<20);assert.equal(presentationReads,visible.length);const visiblePresentationReads=presentationReads;assert(timelineRowContains(rows.at(-1),'state-63'));assert.deepEqual(timelineRowSelection(rows,{row:rows.at(-1).id,item:'state-63'}),{row:'notify-state:state-63',index:321,selection:'state-63'});assert.equal(timelineRowSelection(rows,{row:rows.at(-1).id}).selection,'state-63');
const filtered=timelineRows('montage',montage,{query:'알림63'});assert.equal(filtered.length,1);assert.equal(readTimelineRows(filtered).items[0].index,321);
metadata.items[0].name='changed';assert.notEqual(rows[250].name,'changed');
let keySamples=0,groupReads=0;
const data={tracks:Array.from({length:256},(_,i)=>({id:'track-'+i,name:'트랙 '+i,type:'position',target:'Target',keys:[{time:0,value:[i,0,0]},{time:4,value:[i+1,0,0]}],clips:[]})),sections:Array.from({length:512},(_,i)=>({id:'section-'+i,name:'구간 '+i,asset:'Assets/Child.hbsequence.json',get kind(){groupReads++;return i%2?'shot':'subsequence';},get row(){groupReads++;return i%256;},start:0,duration:1}))};
const sequenceRows=timelineRows('sequenceasset',data,{keyItems:track=>{keySamples++;return track.keys.map((key,i)=>({id:track.id+':'+i,start:key.time,duration:0}));}});assert.equal(sequenceRows.length,512);assert.equal(groupReads,512*2,'one pass grouping');const groupingReads=groupReads;assert.equal(keySamples,0);readTimelineRows(sequenceRows,{limit:256});assert.equal(keySamples,0);sequenceRows[4].items();assert.equal(keySamples,1);assert.equal(sequenceRows[300].items().length,2);
for(const item of ['track-4:2','track-4:-1','track-4:01','track-4:NaN','track-4:','track-4:0:1'])assert.throws(()=>timelineRowSelection(sequenceRows,{row:'track-4',item}));assert.equal(timelineRowSelection(sequenceRows,{row:'track-4',item:'track-4:1'}).selection,'track-4:1');assert.throws(()=>timelineRowSelection(sequenceRows,{row:'track-4',item:'section-0'}));
for(const params of [{limit:257},{offset:-1},{limit:0},{offset:.5}])assert.throws(()=>readTimelineRows(rows,params));assert.throws(()=>timelineRows('blueprint',data));assert.throws(()=>timelineRows('montage',montage,{query:3}));
let direction=0,focused=0;const editor={doc:{kind:'montage'},moveSequenceTrack(value){direction=value;},element:{querySelector(){return {focus(){focused++;}};}}};assert(dispatchAssetShortcut('sequenceNextTrack',editor,{}));assert.equal(direction,1);assert(dispatchAssetShortcut('sequenceFindTrack',editor,{}));assert.equal(focused,1);for(const id of ['sequencePreviousTrack','sequenceNextTrack','sequenceFindTrack'])assert(!assetShortcutCommands.find(command=>command.id===id).when);editor.hooks={running:()=>true};assert.equal(dispatchAssetShortcut('sequenceNextTrack',editor,{}),false);
const report={passed:true,montage:{rows:rows.length,visible:visible.length,readOnlyRows:metadata.items.length,uniqueSlotAndSpecialIDs:true,visiblePresentationReads},sequence:{tracks:256,sections:512,rows:sequenceRows.length,groupingReads,additionalPresentationReads:groupReads-groupingReads,keySamples},guardedKeySelection:true,sharedShortcutContexts:true,scope:'Pure per-render linear grouping/lazy row item construction, original row indices, bounded detached metadata, generic selection guards, montage central shortcut dispatch. Does not increase authored limits or virtualize clips within one visible row; actual window follows.'};
await fs.writeFile('native/build/timeline-rows-1441.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
