import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {NativeWebPAnimation} from './native-webp-animation.mjs';

const work=await fs.mkdtemp(path.resolve('native/build/native-webp-'));
const chunk=(tag,data)=>{const b=Buffer.alloc(8+data.length+(data.length&1));b.write(tag);b.writeUInt32LE(data.length,4);data.copy(b,8);return b;};
const u24=(b,at,n)=>{b[at]=n&255;b[at+1]=n>>8&255;b[at+2]=n>>16&255;};
async function frame(color,width,height,{x=0,y=0,flags=2}={}){
 const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,width,height);const webp=await c.encode('webp',100),parts=[];
 for(let at=12;at<webp.length;){const n=webp.readUInt32LE(at+4),end=at+8+n+(n&1),tag=webp.toString('ascii',at,at+4);if(['ALPH','VP8 ','VP8L'].includes(tag))parts.push(webp.subarray(at,end));at=end;}
 const header=Buffer.alloc(16);u24(header,0,x/2);u24(header,3,y/2);u24(header,6,width-1);u24(header,9,height-1);u24(header,12,100);header[15]=flags;return chunk('ANMF',Buffer.concat([header,...parts]));
}
const ext=Buffer.alloc(10);ext[0]=0x12;u24(ext,4,7);u24(ext,7,3);const control=Buffer.alloc(6);control.writeUInt16LE(1,4);
const payload=Buffer.concat([chunk('VP8X',ext),chunk('ANIM',control),await frame('red',8,4),await frame('blue',4,4,{x:2,flags:3}),await frame('lime',2,2,{x:0,flags:2})]),webp=Buffer.alloc(12+payload.length);webp.write('RIFF');webp.writeUInt32LE(payload.length+4,4);webp.write('WEBP',8);payload.copy(webp,12);await fs.writeFile(path.join(work,'animation.webp'),webp);
const animation=await NativeWebPAnimation.load(webp,0),pixel=(x,y)=>[...animation.canvas.getContext('2d').getImageData(x,y,1,1).data];assert(animation);assert(pixel(3,1)[0]>240);assert.equal(await animation.advance(50),false);
assert(await animation.advance(125));assert(pixel(3,1)[2]>240);assert(pixel(0,3)[0]>240);
assert(await animation.advance(225));assert(pixel(0,0)[1]>240);assert.equal(pixel(3,1)[3],0);assert(pixel(7,3)[0]>240);
assert.equal(await animation.advance(1000),false,'finite loop remains at final frame');
const invalid=Buffer.from(webp);invalid.writeUInt32LE(webp.length*2,4);await assert.rejects(()=>NativeWebPAnimation.load(invalid),/잘렸/);
animation.dispose();assert.equal(animation.frames.length,0);assert.equal(animation.canvas.width,1);
const result={passed:true,frames:3,composition:true,partialFrames:true,disposal:true,finiteLoop:true,noEagerDecodedFrameCache:true,release:true};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
