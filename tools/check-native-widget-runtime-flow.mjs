import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {WidgetSystem} from '../prototype/ui-runtime.js';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {NativeWidgetLayer} from './native-widget-layer.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

const work=await fs.mkdtemp('native/build/widget-runtime-flow-');retainTestEvidence(work);const source=createCanvas(32,32),c=source.getContext('2d');c.fillStyle='#3c88e1';c.fillRect(0,0,32,32);await fs.writeFile(work+'/picture.png',source.toBuffer('image/png'));source.width=source.height=1;
const data=createWidgetAsset('runtime'),text=createWidgetNode('Text','label'),panel=createWidgetNode('Panel','panel'),image=createWidgetNode('Image','image','panel');panel.properties.visible=false;image.properties.texture='picture.png';data.nodes.push(text,panel,image);for(const n of data.nodes)n.name=n.id;
const owner={id:'actor',components:[]},vm={objects:[owner],object:id=>id==='actor'?owner:null,generation:1,active:true,paused:false,stopping:false},reads=[],layer=new NativeWidgetLayer({async resolve(name){reads.push(name);assert.equal(name,'picture.png');return path.resolve(work,name);}},async()=>{},{profile:true}),ui=new WidgetSystem({readAsset:async()=>structuredClone(data),createView:layer.create}),call=(key,args={})=>ui.operation(key,{target:'self',instance:'HUD',...args},{self:'actor'},vm);
try{
 await call('uiShow',{asset:'Assets/UI/runtime.hbwidget.json'});assert.equal(layer.views.size,1);assert.deepEqual(reads,[]);await call('uiSetText',{element:'label',text:'첫 프레임 한글 HUD'});assert.equal(owner.gameplayDebug.ui.HUD.label.text,'첫 프레임 한글 HUD');await layer.draw(320,180);assert(layer.lastProfile.changed);
 await call('uiSetVisible',{element:'panel',visible:true});await layer.draw(320,180);assert.deepEqual(reads,['picture.png']);assert(layer.images.has('picture.png'));assert.equal(owner.gameplayDebug.ui.HUD.panel.visible,true);
 await call('uiSetText',{element:'label',text:'다음 프레임'});await layer.draw(320,180);assert.equal(owner.gameplayDebug.ui.HUD.label.text,'다음 프레임');assert.deepEqual(reads,['picture.png']);
 await call('uiSetVisible',{element:'panel',visible:false});await layer.draw(320,180);assert.equal(layer.images.size,0);ui.dispose('fixture complete');assert.equal(layer.views.size,0);assert.equal(layer.ownedViews.size,0);const result={passed:true,firstFrameText:true,sharedAPIVisibilityAndNativeSnapshot:true,lazyAssetsAcrossUpdates:true,profileStages:true,scope:'WidgetSystem public operations through actual NativeWidgetLayer; generated fixture, no desktop/game instance or C++ execution'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{ui.dispose('fixture cleanup');layer.dispose();}
