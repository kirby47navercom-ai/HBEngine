import {DataUtils,HalfFloatType,FloatType} from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
const cache=new WeakMap();
export async function loadPathEnvironment(path,url){
 if(!/^Assets\/(?:[^/\\:\x00-\x1f]+\/)*[^/\\:\x00-\x1f]+\.(hdr|exr)$/i.test(path)||path.split('/').some(p=>p==='.'||p==='..'))throw Error('HDRI는 프로젝트의 HDR·EXR 파일을 지정하세요.');
 const loader=/\.exr$/i.test(path)?new EXRLoader():new HDRLoader();loader.setDataType(FloatType);return loader.loadAsync(url(path));
}
// Exact lat-long texel solid angles keep the sampling PDF finite at both poles.
export function packPathEnvironment(map){
 if(!map)return null;const old=cache.get(map);if(old?.version===map.version&&old.image===map.image)return old;
 const {width:w,height:h,data}=map.image||{};if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>16384||h>16384||!data||data.length!==w*h*4||w*h+Math.ceil(w*h/2)>=2**24)throw Error('HDRI 크기와 RGBA 원본을 확인하세요.');
 const textureWidth=Math.min(4096,w*h+Math.ceil(w*h/2)),textureHeight=Math.ceil((w*h+Math.ceil(w*h/2))/textureWidth),values=new Float32Array(textureWidth*textureHeight*4),weights=new Float64Array(w*h);let total=0;
 for(let y=0;y<h;y++){const area=2*Math.PI/w*(Math.cos(Math.PI*y/h)-Math.cos(Math.PI*(y+1)/h));for(let x=0;x<w;x++){const i=y*w+x;for(let c=0;c<3;c++){const v=map.type===HalfFloatType?DataUtils.fromHalfFloat(data[i*4+c]):data[i*4+c];if(!Number.isFinite(v)||v<0||v>65000)throw Error('HDRI 선형 방사휘도 범위를 확인하세요.');values[i*4+c]=v;}weights[i]=area*(.2126*values[i*4]+.7152*values[i*4+1]+.0722*values[i*4+2]);total+=weights[i];}}
 const small=[],large=[],scaled=new Float64Array(w*h);
 for(let i=0;i<w*h;i++){const y=Math.floor(i/w),area=2*Math.PI/w*(Math.cos(Math.PI*y/h)-Math.cos(Math.PI*(y+1)/h)),probability=total>0?weights[i]/total:area/(4*Math.PI);values[i*4+3]=probability/area;scaled[i]=probability*w*h;(scaled[i]<1?small:large).push(i);}
 while(small.length&&large.length){const a=small.pop(),b=large.pop();const at=w*h*4+a*2;values[at]=scaled[a];values[at+1]=b;scaled[b]+=scaled[a]-1;(scaled[b]<1?small:large).push(b);}
 for(const i of [...small,...large]){values[w*h*4+i*2]=1;values[w*h*4+i*2+1]=i;}
 const result={values,width:w,height:h,textureWidth,textureHeight,version:map.version,image:map.image};cache.set(map,result);return result;
}
export function releasePathEnvironment(map){if(map)cache.delete(map);}
