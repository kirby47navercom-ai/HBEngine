// Native texture pixels: raw {data,width,height} images from the native TextureLoader and decoded images both read back (with flip).
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {installNativeAssets} from './native-game-platform.mjs';
import {textureImagePixels} from '../prototype/texture-image-load.js';

const png=createCanvas(2,2),ctx=png.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,2,1);ctx.fillStyle='#0000ff';ctx.fillRect(0,1,2,1);
const bytes=png.toBuffer('image/png');
const platform=installNativeAssets({manifest:{width:2,height:2},url:name=>'hbasset:'+encodeURIComponent(name),readBytes:async()=>bytes});
try{
  const raw=await platform.pixels('Assets/T.png');
  const top=textureImagePixels(raw),flipped=textureImagePixels(raw,true);
  assert.deepEqual([top.width,top.height,top.data[0],top.data[2]],[2,2,255,0],'raw pixels pass through');
  assert.deepEqual([flipped.data[0],flipped.data[2]],[0,255],'raw pixels flip by rows');
  const decoded=await globalThis.hbNativeLoadImage('hbasset:Assets%2FT.png');
  assert.equal(textureImagePixels(decoded).data[0],255,'decoded images still draw');
  console.log(JSON.stringify({passed:true,raw:true,flip:true,decoded:true}));
}finally{platform.restore();}
