import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {retainTestEvidence} from './test-artifacts.mjs';
const engine=path.resolve(process.argv[2]||'.'),{nativeUITilePacket}=await import(pathToFileURL(path.join(engine,'tools/native-ui-tiles.mjs'))),work=await fs.mkdtemp('native/build/ui-tiles-');retainTestEvidence(work);
const decode=(packet,previous,width,height)=>{const out=Buffer.from(previous),count=packet.readUInt32LE(0);let at=4;for(let i=0;i<count;i++){const [x,y,w,h]=[0,4,8,12].map(n=>packet.readUInt32LE(at+n));at+=16;assert(x+w<=width&&y+h<=height&&w&&h);for(let row=0;row<h;row++){packet.copy(out,((y+row)*width+x)*4,at,at+w*4);at+=w*4;}}assert.equal(at,packet.length);return out;};
const cases=[];
for(const [width,height]of [[1280,720],[257,193],[769,65]])for(const unaligned of [false,true]){
 const storage=Buffer.alloc(width*height*4+(unaligned?1:0)),previous=storage.subarray(unaligned?1:0),next=Buffer.from(previous),set=(x,y,rgba)=>next.set(rgba,(y*width+x)*4);
 set(1,1,[17,41,61,127]);set(width-1,height-1,[1,2,3,255]);const packet=nativeUITilePacket(next,previous,width,height);assert(packet&&packet.length<next.length);assert.deepEqual(decode(packet,previous,width,height),next);
 const erased=Buffer.alloc(next.length),erase=nativeUITilePacket(erased,next,width,height);assert(erase);assert.deepEqual(decode(erase,next,width,height),erased);
 const full=Buffer.alloc(next.length,255);assert.equal(nativeUITilePacket(full,previous,width,height),null);assert.equal(nativeUITilePacket(previous,previous,width,height),null);cases.push({width,height,unaligned,fullBytes:next.length,tileBytes:packet.length});
}
const report={passed:true,cases,transparentErasure:true,fullChangeFallback:true,edgeAndUnalignedBuffers:true};await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
