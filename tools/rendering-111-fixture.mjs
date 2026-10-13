import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {packPathEnvironment} from '../prototype/path-environment.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
export function checkerHDR111(width=256,height=128){const values=new Float32Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)values.set((x+y)%2?[2,2,2,1]:[0,0,0,1],(y*width+x)*4);return new THREE.DataTexture(values,width,height,THREE.RGBAFormat,THREE.FloatType);}
export function rendering111Packets(){const map=checkerHDR111(),result={};for(const lod of [false,true]){const p=packPathEnvironment(map,lod);result[lod?'mip':'raw']={width:p.textureWidth,height:p.textureHeight,sourceWidth:p.width,sourceHeight:p.height,mipOffset:p.mipOffset,texels:p.texels,data:[...p.values]};}map.dispose();return result;}
export async function writeRendering111(write,scene,project){
 const map=checkerHDR111(1024,512),pixels=Buffer.alloc(1024*512*4);for(let i=0;i<1024*512;i++)if(map.image.data[i*4])pixels.set([128,128,128,130],i*4);const file=await project.resolve('Assets/Hdr111.hdr',true);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,Buffer.concat([Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 512 +X 1024\n'),pixels]),{flag:'wx'});map.dispose();
 const base=structuredClone(scene);base.runtime.dimension='3d';Object.assign(base.environment,{sunEnabled:false,skyEnabled:false,fogEnabled:false,cloudsEnabled:false,groundColor:'#000000'});
 const camera={...createPlacedObject('camera',{id:'Camera'}),position:[0,0,10],components:[makeSceneComponent('Camera',{main:true,projection:'perspective',fieldOfView:170})]},post={...createPlacedObject('empty',{id:'Post'}),components:[makeSceneComponent('PostProcessVolume',{bloomEnabled:false,pathTracingHDRI:'Assets/Hdr111.hdr',pathTracingHDRILOD:true,pathTracingBounces:2,pathTracingSamples:1,pathTracingSamplesPerFrame:1,pathTracingEnvironment:[0,0,0,1]})]},driver={...createPlacedObject('empty',{id:'PostDriver'}),blueprintAsset:'Assets/BP_PostDriver.hbblueprint.json'};await write('Assets/Scenes/Hdr111.hbscene.json',{...base,objects:[camera,post,driver],selection:'Post'});
}
export async function checkRendering111({evaluate,ready,inspect}){
 await evaluate('window.hbPlayerDebug.open("Assets/Scenes/Hdr111.hbscene.json")');await ready();await evaluate('window.hbPlayerDebug.call("PostDriver","PostDriver.Bool",{target:"Post",property:"pathTracingEnabled",value:true})');
 const stats=async()=>evaluate('(async()=>{const image=await createImageBitmap(await(await fetch(await window.hbPlayerDebug.captureAsync())).blob()),c=new OffscreenCanvas(image.width,image.height),ctx=c.getContext("2d");ctx.drawImage(image,0,0);image.close();const d=ctx.getImageData(Math.floor((c.width-32)/2),Math.floor((c.height-32)/2),32,32).data;let sum=0,sum2=0;for(let i=0;i<d.length;i+=4){sum+=d[i];sum2+=d[i]*d[i];}return {mean:sum/1024,variance:sum2/1024-(sum/1024)**2};})()');
 await evaluate('window.hbPlayerDebug.call("PostDriver","PostDriver.Bool",{target:"Post",property:"pathTracingHDRILOD",value:false})');const raw=await stats();await evaluate('window.hbPlayerDebug.call("PostDriver","PostDriver.Bool",{target:"Post",property:"pathTracingHDRILOD",value:true})');const mip=await stats();assert.ok(raw.variance>100,JSON.stringify({raw,mip}));assert.ok(mip.mean>25&&mip.mean<240&&mip.variance<raw.variance*.8,JSON.stringify({raw,mip}));
 await evaluate('window.hbPlayerDebug.call("PostDriver","PostDriver.Bool",{target:"Post",property:"pathTracingEnabled",value:false})');return {passed:true,typedCPP:true,hdrLOD:true,raw,mip,backend:(await inspect()).renderer.backend};
}
