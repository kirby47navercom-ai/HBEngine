// Game UI IME: composition previews after the committed text without changed events, the result replaces it,
// and a syllable still being composed after a result stays visible.
import assert from 'node:assert/strict';
import {NativeWidgetLayer} from './native-widget-layer.mjs';
import {NativeInputQueue} from './native-input-queue.mjs';

const node={type:'TextInput',properties:{text:'안',maxLength:256}},changes=[];
const ui=Object.assign(Object.create(NativeWidgetLayer.prototype),{focus:{node,enabled:true,view:{options:{acceptInput:()=>true}}},event:(_f,name)=>changes.push(name)});
ui.composition('ㄴ');assert.equal(node.properties.text,'안ㄴ');
ui.composition('녀');assert.equal(node.properties.text,'안녀');assert.equal(changes.length,0,'preview fires no changed event');
// Result only (WM_IME_COMPOSITION without GCS_COMPSTR): the player sends an empty composition, then WM_CHAR.
ui.composition('녕');ui.composition('');ui.text('녕');assert.equal(node.properties.text,'안녕');assert.deepEqual(changes,['changed']);
// Result plus the next syllable in one message: the new composition arrives before the WM_CHAR result.
ui.composition('ㅎ');ui.composition('하');ui.composition('세');ui.text('하');assert.equal(node.properties.text,'안녕하세','next syllable shown after a result');
ui.composition('');assert.equal(node.properties.text,'안녕하','cancel restores the committed text');
const queue=new NativeInputQueue();queue.push({event:'composition',text:'가'});assert.throws(()=>queue.push({event:'composition',text:7}));
console.log(JSON.stringify({passed:true,text:node.properties.text}));
