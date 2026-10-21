import {RenderTarget,WebGLRenderTarget,DataTexture,Vector2,RGBAFormat,FloatType,HalfFloatType,LinearFilter,NearestFilter} from 'three';
import {reflectionProbeAtlasLayout} from './reflection-probe-atlas-layout.js';
import {probeMapLayout} from './reflection-probe-blend.js';
import {ProbeSpatialIndex,probeSpatialRecordTexels} from './reflection-probe-spatial.js';

export const probeAtlasRecordTexels=9;
function copyAtlasRegion(renderer,source,target,rect){
 const backend=renderer.backend;
 if(backend?.isWebGLBackend&&source.isRenderTargetTexture){
  // This Three fallback passes width/height as the destination endpoint,
  // shrinking RT copies with a nonzero offset. Keep its tracked FBO state.
  const {gl,state}=backend,from=backend.get(source),to=backend.get(target),read=backend.get(from.renderTarget).framebuffers?.[from.cacheKey],draw=backend.get(to.renderTarget).framebuffers?.[to.cacheKey];
  if(!read||!draw)throw Error('반사 아틀라스의 폴백 프레임버퍼를 확인하세요.');
  try{state.bindFramebuffer(gl.READ_FRAMEBUFFER,read);state.bindFramebuffer(gl.DRAW_FRAMEBUFFER,draw);gl.blitFramebuffer(0,0,rect.width,rect.height,rect.x,rect.y,rect.x+rect.width,rect.y+rect.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);}finally{state.bindFramebuffer(gl.READ_FRAMEBUFFER,null);state.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);}
 }else renderer.copyTextureToTexture(source,target,null,new Vector2(rect.x,rect.y));
}
export class ReflectionProbeAtlas{
 constructor(){this.target=null;this.table=null;this.regions=[];this.maps=[];this.copies=0;this.uploads=0;this.count=0;this.signature='';this.width=0;this.renderer=null;this.maxSize=0;this.spatial=new ProbeSpatialIndex();this.sourceOrder=[];this.uniqueSources=[];this.sourceIndices=new Int32Array();}
 update(renderer,probes,entries){
  if(!probes.length){this.dispose();return this;}if(this.renderer&&this.renderer!==renderer)throw Error('반사 아틀라스의 렌더러 소유자가 달라요.');this.renderer=renderer;
  const sources=probes.map(p=>entries.get(p.id)?.target.texture);if(sources.some(t=>!t))throw Error('반사 캡처가 아틀라스에 준비되지 않았어요.');
  if(this.sourceOrder.length!==sources.length||sources.some((source,i)=>source!==this.sourceOrder[i])){const bySource=new Map(),unique=[],indices=new Int32Array(sources.length);for(let i=0;i<sources.length;i++){let index=bySource.get(sources[i]);if(index===undefined){index=unique.length;bySource.set(sources[i],index);unique.push(sources[i]);}indices[i]=index;}this.sourceOrder=sources;this.uniqueSources=unique;this.sourceIndices=indices;}
  const unique=this.uniqueSources;
  const gl=renderer.backend?.gl,maximum=this.maxSize||renderer.capabilities?.maxTextureSize||renderer.backend?.device?.limits.maxTextureDimension2D||gl?.getParameter(gl.MAX_TEXTURE_SIZE);this.maxSize=maximum;const signature=unique.map(t=>[t.image.width,t.image.height,t.type].join(':')).join('|'),layout=this.signature===signature?{width:this.target.width,height:this.target.height,regions:this.regions}:reflectionProbeAtlasLayout(unique.map(t=>({width:t.image.width,height:t.image.height})),maximum);
  if(sources.some(t=>t.type!==sources[0].type)||sources[0].type!==HalfFloatType&&sources[0].type!==FloatType)throw Error('반사 아틀라스 맵 형식이 달라요.');
  if(this.signature!==signature){const C=renderer.hbBackend==='webgpu'?RenderTarget:WebGLRenderTarget,next=new C(layout.width,layout.height,{type:sources[0].type,format:RGBAFormat,depthBuffer:false,stencilBuffer:false,minFilter:LinearFilter,magFilter:LinearFilter,generateMipmaps:false});const previous=renderer.getRenderTarget();try{renderer.setRenderTarget(next);renderer.clear();}catch(error){next.dispose();throw error;}finally{renderer.setRenderTarget(previous);}this.target?.dispose();this.target=next;this.maps=[];this.signature=signature;this.regions=layout.regions;}
  for(let i=0;i<unique.length;i++){const source=unique[i];if(this.maps[i]?.source===source&&this.maps[i].version===source.version)continue;copyAtlasRegion(renderer,source,this.target.texture,layout.regions[i]);this.maps[i]={source,version:source.version};this.copies++;}
  this.maps.length=unique.length;const texels=probes.length*probeAtlasRecordTexels+(probes.length*2-1)*probeSpatialRecordTexels,width=Math.min(maximum,Math.max(probeAtlasRecordTexels,Math.ceil(Math.sqrt(texels)))),height=Math.ceil(texels/width);if(height>maximum)throw Error('반사 후보 자료가 장치 한도를 넘어요.');
  if(this.table?.image.width!==width||this.table?.image.height!==height){this.table?.dispose();this.table=new DataTexture(new Float32Array(width*height*4),width,height,RGBAFormat,FloatType);this.table.minFilter=this.table.magFilter=NearestFilter;this.table.generateMipmaps=false;this.table.needsUpdate=true;this.uploads++;}
  const data=this.table.image.data;let changed=false;const store=(at,values,w=values[3]??0)=>{for(let k=0;k<4;k++){const value=Math.fround(k===3?w:values[k]);if(!Number.isFinite(value))throw Error('반사 후보 좌표가 GPU 유한 범위를 넘어요.');if(!Object.is(data[at*4+k],value)){data[at*4+k]=value;changed=true;}}};
  for(let i=0;i<probes.length;i++){const p=probes[i],b=p.localBox,at=i*probeAtlasRecordTexels,rect=layout.regions[this.sourceIndices[i]];store(at,p.center,p.p.intensity);store(at+1,b.minimum,p.p.blendDistance);store(at+2,b.maximum,p.p.diffuseIntensity);store(at+3,b.localX);store(at+4,b.localY);store(at+5,b.localZ);store(at+6,b.faceScale,p.p.boxProjection?1:0);store(at+7,probeMapLayout(sources[i]),sources[i].isRenderTargetTexture?1:0);store(at+8,[rect.x/layout.width,rect.y/layout.height,rect.width/layout.width,rect.height/layout.height]);}
  if(this.spatial.update(data,probes.length)){data.set(this.spatial.data,probes.length*probeAtlasRecordTexels*4);changed=true;}
  if(changed){this.table.needsUpdate=true;this.uploads++;}this.count=probes.length;this.width=width;return this;
 }
 info(){return {count:this.count,mapCount:this.uniqueSources.length,sourceIndexBytes:this.sourceIndices.byteLength,copies:this.copies,uploads:this.uploads,spatial:this.spatial.info(),bytes:(this.target?this.target.width*this.target.height*4*(this.target.texture.type===HalfFloatType?2:4):0)+(this.table?.image.data.byteLength||0)};}
 dispose(){this.target?.dispose();this.table?.dispose();this.target=this.table=null;this.maps=[];this.regions=[];this.count=0;this.signature='';this.renderer=null;this.maxSize=0;this.spatial=new ProbeSpatialIndex();this.sourceOrder=[];this.uniqueSources=[];this.sourceIndices=new Int32Array();}
}
