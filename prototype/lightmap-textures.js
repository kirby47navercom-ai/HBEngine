import {lightmapMipSelection} from './lightmap-texture-mips.js';
const srgb=n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
export function sampleLightmapTexture(texture,coordinates,colorSpace='linear',options={}){
 if(!texture)return [1,1,1,1];const selection=lightmapMipSelection(texture,coordinates,colorSpace,options);if(!selection)return sampleLightmapLevel(texture,coordinates,colorSpace,options);
 const {levels,lod,spatial,converted}=selection,first=Math.floor(lod),alpha=lod-first,sample=index=>{const level=levels[index];return sampleLightmapLevel({...texture,...level,pixels:level.data,float:converted||texture.float},coordinates,converted?'linear':colorSpace,{...options,sampler:{...options.sampler,magFilter:spatial}});},a=sample(first);if(alpha===0)return a;const b=sample(Math.min(first+1,levels.length-1));return a.map((n,i)=>n*(1-alpha)+b[i]*alpha);
}
function sampleLightmapLevel(texture,coordinates,colorSpace='linear',{type='texture2d',index=0,sampler,wrap:wrapMode}={}){
 if(!texture)return [1,1,1,1];const {width:w,height:h,depth=1,pixels,float=false,flipY=false}=texture,wrapS=sampler?.wrapS??wrapMode??texture.wrapS??'clamp',wrapT=sampler?.wrapT??wrapMode??texture.wrapT??'clamp',wrapR=sampler?.wrapR??wrapMode??texture.wrapR??'clamp',filter=sampler?.magFilter??texture.filter??'linear';let uv=[...coordinates],layer=index;
 if(type==='texturecube'){const v=coordinates.every(n=>n===0)?[0,0,1]:coordinates,axis=v.reduce((a,n,i)=>Math.abs(n)>Math.abs(v[a])?i:a,0),m=Math.max(1e-30,Math.abs(v[axis])),positive=v[axis]>=0;layer=axis*2+(positive?0:1);uv=axis===0?[positive?-v[2]:v[2],-v[1]]:axis===1?[v[0],positive?v[2]:-v[2]]:[positive?v[0]:-v[0],-v[1]];uv=uv.map(n=>n/m*.5+.5);}
 const wrap=(i,n,mode)=>mode==='repeat'?((i%n)+n)%n:mode==='mirror'?Math.min(((i%(2*n))+2*n)%(2*n),2*n-1-((i%(2*n))+2*n)%(2*n)):Math.max(0,Math.min(n-1,i));
 if(type!=='texturecube'&&texture.matrix){const m=texture.matrix,x=uv[0],y=uv[1];uv=[m[0]*x+m[3]*y+m[6],m[1]*x+m[4]*y+m[7]];}
 const volume=type==='texture3d',z=volume?(coordinates[2]||0)*depth-.5:Math.max(0,Math.min(depth-1,Math.round(layer))),z0=Math.floor(z),z1=z0+1,t=volume&&filter!=='nearest'?z-z0:0;
 const x=uv[0]*w-.5,y=(flipY?1-uv[1]:uv[1])*h-.5,at=(i,j,c,k)=>{const value=pixels[((wrap(k,depth,volume?wrapR:'clamp')*h+wrap(j,h,wrapT))*w+wrap(i,w,wrapS))*4+c]/(float?1:255);return c<3&&colorSpace==='srgb'?srgb(value):value;};
 if(filter==='nearest')return[0,1,2,3].map(c=>at(Math.floor(x+.5),Math.floor(y+.5),c,Math.floor(z+.5)));
 const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,plane=(c,k)=>(at(a,b,c,k)*(1-u)+at(a+1,b,c,k)*u)*(1-v)+(at(a,b+1,c,k)*(1-u)+at(a+1,b+1,c,k)*u)*v;return[0,1,2,3].map(c=>plane(c,z0)*(1-t)+(t?plane(c,z1)*t:0));
}
