import {sampleLightmapTexture} from './lightmap-textures.js';
import {skyRadiance} from './sky-radiance.js';
import {resampleSphericalEnvironment} from './environment-mips.js';
import {prepareSkyDirections} from './lightmap-directions.js';

// Same atan2(z,x)-rotation convention as path-environment-gpu.js. Environment
// radiance is evaluated only after a diffuse bounce; primary sky stays realtime.
export function lightmapEnvironmentRadiance(environment,direction){
 if(!environment)return [0,0,0];
 const intensity=environment.intensity??1;
 if(environment.texture){
  const u=(Math.atan2(direction[2],direction[0])-(environment.rotation||0)*Math.PI/180)/(2*Math.PI)+.5,v=Math.atan2(Math.hypot(direction[0],direction[2]),direction[1])/Math.PI;
  return sampleLightmapTexture(environment.texture,[u,v],'linear',{sampler:{wrapS:'repeat',wrapT:'clamp',magFilter:'linear'}}).slice(0,3).map(value=>value*intensity);
 }
 if(environment.procedural)return skyRadiance(environment.procedural,direction).map(value=>value*intensity);
 const t=Math.max(0,Math.min(1,direction[1]*.5+.5));return environment.color.map((value,k)=>(value*t+environment.groundColor[k]*(1-t))*intensity);
}

// Cache only queried levels in this explicit bake; the original immutable pixels are shared.
export function prepareLightmapEnvironment(environment){
 if(!environment?.texture?.float)return {sample:direction=>lightmapEnvironmentRadiance(environment,direction),directions:prepareSkyDirections(environment),stats:()=>null};
 const texture=environment.texture,{width,height,pixels}=texture,last=Math.floor(Math.log2(Math.max(width,height))),levels=new Map([[0,{data:pixels,width,height}]]);let generatedTexels=0;
 const level=index=>{if(levels.has(index))return levels.get(index);let start=Math.max(...[...levels.keys()].filter(i=>i<index)),value=levels.get(start);for(;start<index;start++){const w=Math.max(1,Math.floor(value.width/2)),h=Math.max(1,Math.floor(value.height/2));value={data:resampleSphericalEnvironment(value.data,value.width,value.height,w,h),width:w,height:h};generatedTexels+=w*h;}levels.set(index,value);return value;};
 const at=(m,x,y,c)=>m.data[(Math.max(0,Math.min(m.height-1,y))*m.width+((x%m.width)+m.width)%m.width)*4+c],sampleLevel=(uv,index)=>{const m=level(index),x=uv[0]*m.width-.5,y=uv[1]*m.height-.5,a=Math.floor(x),b=Math.floor(y),fx=x-a,fy=y-b,first=[0,1,2].map(c=>at(m,a,b,c)*(1-fx)+at(m,a+1,b,c)*fx),second=[0,1,2].map(c=>at(m,a,b+1,c)*(1-fx)+at(m,a+1,b+1,c)*fx);let result=first.map((v,c)=>v*(1-fy)+second[c]*fy);
  if(!m.poles){m.poles=[0,m.height-1].map(row=>Float32Array.from([0,1,2],c=>{let sum=0;for(let col=0;col<m.width;col++)sum+=m.data[(row*m.width+col)*4+c];return sum/m.width;}));}
  if(uv[1]*m.height<.5){const weight=uv[1]*m.height*2;result=first.map((v,c)=>m.poles[0][c]*(1-weight)+v*weight);}if((1-uv[1])*m.height<.5){const weight=(1-uv[1])*m.height*2;result=second.map((v,c)=>m.poles[1][c]*(1-weight)+v*weight);}return result;
 };
 return {sample:(direction,spread=.5)=>{const u=((direction[0]**2+direction[2]**2<1e-12?0:Math.atan2(direction[2],direction[0]))-(environment.rotation||0)*Math.PI/180)/(2*Math.PI)+.5,rawV=Math.atan2(Math.hypot(direction[0],direction[2]),direction[1])/Math.PI,v=texture.flipY?1-rawV:rawV,latitude=Math.max(.00001,Math.hypot(direction[0],direction[2])/Math.max(Math.hypot(...direction),1e-30)),footprint=Math.max(spread*width/(2*Math.PI*latitude),spread*height/Math.PI),lod=Math.max(0,Math.min(last,Math.log2(Math.max(1,footprint)))),index=Math.floor(lod),blend=lod-index,first=sampleLevel([u,v],index),second=blend?sampleLevel([u,v],Math.min(last,index+1)):first;return first.map((n,c)=>(n*(1-blend)+second[c]*blend)*(environment.intensity??1));},stats:()=>({levels:[...levels.keys()].filter(i=>i>0).sort((a,b)=>a-b),retainedMipBytes:[...levels].reduce((n,[i,m])=>n+(i?m.data.byteLength:0)+(m.poles?24:0),0),generatedTexels,basePixelsReused:levels.get(0).data===pixels,spreadModel:'existing radiance integrator diffuse spread 0.5; lat-long angular footprint and trilinear mip/pole filtering'})};
}
