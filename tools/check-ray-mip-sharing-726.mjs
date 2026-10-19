import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as G from 'three';
import {rayMipChain,releaseRayMips} from '../prototype/ray-mip.js';

const rows=[];
for(const family of ['2d','array','cube','volume'])for(const srgb of [false,true]){
 const w=5,h=3,d=family==='2d'?1:family==='cube'?6:3,map=new G.Texture(),data=Uint8Array.from({length:w*h*d*4},(_,i)=>(i*19+37)%256),p={width:w,height:h,depth:d,data,version:1},volume=family==='volume';map.minFilter=G.LinearMipmapLinearFilter;map.generateMipmaps=false;
 const single=rayMipChain(map,p,srgb,volume);assert.equal(single.length,1);map.generateMipmaps=true;const full=rayMipChain(map,p,srgb,volume);assert.equal(full.length,3);assert.equal(single[0],full[0]);assert.equal(single.length,1);assert.notEqual(single,full);
 // Independent whole-volume average oracle: each level must retain the mean
 // over each layer (or all volume voxels), including odd edge areas.
 const mean=(values,channel)=>{let sum=0;for(let i=channel;i<values.length;i+=4)sum+=values[i];return sum/(values.length/4);};
 for(let z=0;z<(volume?1:d);z++)for(let c=0;c<4;c++){const source=volume?data:data.subarray(z*w*h*4,(z+1)*w*h*4),linear=Float32Array.from(source,(v,i)=>{v/=255;return srgb&&i%4!==3?(v<=.04045?v/12.92:((v+.055)/1.055)**2.4):v;}),actual=full.at(-1).data[z*4+c];assert(Math.abs(actual-mean(linear,c))<2e-7,family+':'+srgb+':'+z+':'+c);}
 map.generateMipmaps=false;assert.equal(rayMipChain(map,p,srgb,volume),single);map.generateMipmaps=true;assert.equal(rayMipChain(map,p,srgb,volume),full);const original=full[0].data[0];data[0]=11;p.version++;const next=rayMipChain(map,p,srgb,volume);assert.notEqual(next[0].data,full[0].data);assert.equal(full[0].data[0],original);assert.notEqual(next[0].data[0],original);releaseRayMips([map]);assert.notEqual(rayMipChain(map,p,srgb,volume)[0].data,next[0].data);
 rows.push({family,srgb,baseBytesShared:full[0].data.byteLength,levels:full.length,noMipSnapshotLength:single.length,versionInvalidation:true});map.dispose();
}
const proof={passed:true,rows,scope:'One generated float base per texture version/color interpretation/volume layout; mip toggles share immutable level data but preserve caller level-list length, version mutation and explicit release. Area-average independent oracle, no heap/FPS claim.'};await fs.writeFile('native/build/ray-mip-sharing-726.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
