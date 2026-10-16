import {sampleLightmapTexture} from './lightmap-textures.js';

// Same atan2(z,x)-rotation convention as path-environment-gpu.js. Environment
// radiance is evaluated only after a diffuse bounce; primary sky stays realtime.
export function lightmapEnvironmentRadiance(environment,direction){
 if(!environment)return [0,0,0];
 const intensity=environment.intensity??1;
 if(environment.texture){
  const u=(Math.atan2(direction[2],direction[0])-(environment.rotation||0)*Math.PI/180)/(2*Math.PI)+.5,v=Math.acos(Math.max(-1,Math.min(1,direction[1])))/Math.PI;
  return sampleLightmapTexture(environment.texture,[u,v],'linear',{sampler:{wrapS:'repeat',wrapT:'clamp',magFilter:'linear'}}).slice(0,3).map(value=>value*intensity);
 }
 const t=Math.max(0,Math.min(1,direction[1]*.5+.5));return environment.color.map((value,k)=>(value*t+environment.groundColor[k]*(1-t))*intensity);
}
