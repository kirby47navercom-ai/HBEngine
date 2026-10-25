// Merge central slope moments, rather than subtracting nearly equal squares.
// Four floats per texel; retain one reduced level, no runtime sampler/state.
export function directionalRoughnessComposite(policy,normalPixels,base,srgb){
 let moment=normalPixels,peakMomentLevelBytes=0,clampedSourceSamples=0;const levels=[],channels=[policy.channel,policy.secondaryChannel].map(c=>'rgba'.indexOf(c));
 const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
 function reduce(width,height){const source=moment,raw=source===normalPixels,data=new Float32Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const x0=x*source.width/width,x1=(x+1)*source.width/width,y0=y*source.height/height,y1=(y+1)*source.height/height;let total=0,mx=0,my=0,vx=0,vy=0;
  for(let sy=Math.floor(y0);sy<Math.ceil(y1);sy++)for(let sx=Math.floor(x0);sx<Math.ceil(x1);sx++){
   const weight=(Math.min(sx+1,x1)-Math.max(sx,x0))*(Math.min(sy+1,y1)-Math.max(sy,y0)),at=(sx+sy*source.width)*4;let a,b,va=0,vb=0;
   if(raw){const z=source.data[at+2]/127.5-1,denominator=Math.max(z,1e-4),px=(source.data[at]/127.5-1)/denominator,py=(source.data[at+1]/127.5-1)/denominator;a=Math.max(-policy.maxSlope,Math.min(policy.maxSlope,px));b=Math.max(-policy.maxSlope,Math.min(policy.maxSlope,py));if(z<=1e-4||a!==px||b!==py)clampedSourceSamples++;}
   else{a=source.data[at];b=source.data[at+1];va=source.data[at+2];vb=source.data[at+3];}
   const next=total+weight,dx=a-mx,dy=b-my;vx+=weight*va+dx*dx*total*weight/next;vy+=weight*vb+dy*dy*total*weight/next;mx+=dx*weight/next;my+=dy*weight/next;total=next;
  }
  const at=(x+y*width)*4;data[at]=mx;data[at+1]=my;data[at+2]=vx/total;data[at+3]=vy/total;
 }moment={width,height,data};peakMomentLevelBytes=Math.max(peakMomentLevelBytes,data.byteLength);}
 const advance=(width,height)=>{if(policy.power&&(moment.width!==width||moment.height!==height))reduce(width,height);};
 return{report:{policy,normalSource:{width:normalPixels.width,height:normalPixels.height},method:'central tangent-slope moments, axis-aligned directional roughness channels',levels},advance,apply(level,sourceMip){
  advance(level.width,level.height);if(!policy.power||moment===normalPixels){levels.push({sourceMip,meanVariance:0,maxVariance:0,meanVarianceX:0,meanVarianceY:0,adjustedPixels:0,peakMomentLevelBytes,clampedSourceSamples});return level;}
  let data=level.data,sumX=0,sumY=0,max=0,adjusted=0;for(let i=0;i<data.length;i+=4){let changed=false;for(let axis=0;axis<2;axis++){
   const variance=Math.min(policy.varianceLimit,Math.max(0,moment.data[i+2+axis]-policy.varianceThreshold));if(axis===0)sumX+=variance;else sumY+=variance;max=Math.max(max,variance);if(!variance)continue;const channel=channels[axis],stored=level.data[i+channel]/255,r=srgb&&channel<3?decode(stored):stored,out=Math.min(1,r**4+policy.power*variance)**.25,next=Math.round((srgb&&channel<3?encode(out):out)*255);if(next!==level.data[i+channel]){if(data===level.data)data=new Uint8Array(level.data);data[i+channel]=next;changed=true;}
  }if(changed)adjusted++;}
  const pixels=data.length/4;levels.push({sourceMip,meanVariance:(sumX+sumY)/(2*pixels),maxVariance:max,meanVarianceX:sumX/pixels,meanVarianceY:sumY/pixels,adjustedPixels:adjusted,peakMomentLevelBytes,clampedSourceSamples});if(data!==level.data&&channels.includes(3)&&level.coverage){let covered=0;for(let i=3;i<data.length;i+=4)if(data[i]/255>=(base.alphaCutoff??.5))covered++;const achieved=covered/pixels;return{...level,data,coverage:{...level.coverage,achieved,error:Math.abs(achieved-level.coverage.target)}};}return data===level.data?level:{...level,data};
 }};
}
