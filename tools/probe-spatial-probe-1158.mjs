import * as G from 'three';import * as W from 'three/webgpu';import * as T from 'three/tsl';
import {ProbeSpatialIndex} from '../prototype/reflection-probe-spatial.js';
import {gpuProbeSpatialChoice} from '../prototype/gpu-probe-spatial.js';
import {gpuProbeVolumeNodes} from '../prototype/reflection-probe-volume-gpu.js';
import {probeVolumeGLSL} from '../prototype/reflection-probe-volume.js';
import {probeAtlasPhysicalGLSL} from '../prototype/reflection-probe-atlas-shader.js';
import {installGPUCameraView} from '../prototype/gpu-camera-view.js';
import {probeSpatialFixture1157} from './probe-spatial-fixture-1157.mjs';

export async function probeSpatial1158(){
 const results=[];
 for(const backend of ['webgl','webgpu','webgpu-fallback']){
  const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false,forceWebGL:backend==='webgpu-fallback'});
  if(backend!=='webgl'){await renderer.init();installGPUCameraView(renderer);}if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend||backend==='webgpu-fallback'&&!renderer.backend.isWebGLBackend)throw Error('spatial backend selection');
  renderer.outputColorSpace=C.LinearSRGBColorSpace;const cases=[];
  try{
   for(const grid of [false,true]){
    const {records,probes,points}=probeSpatialFixture1157(grid),index=new ProbeSpatialIndex();index.update(records,probes.length);
    const count=probes.length,texels=count*9+index.data.length/4,width=256,height=Math.ceil(texels/width),data=new Float32Array(width*height*4);data.set(records);data.set(index.data,records.length);
    const queryData=new Float32Array(points.length*4);points.forEach((p,i)=>queryData.set([...p,1],i*4));
    const table=new C.DataTexture(data,width,height,C.RGBAFormat,C.FloatType),queries=new C.DataTexture(queryData,points.length,1,C.RGBAFormat,C.FloatType);for(const map of [table,queries]){map.minFilter=map.magFilter=C.NearestFilter;map.generateMipmaps=false;map.needsUpdate=true;}
    const target=backend==='webgl'?new G.WebGLRenderTarget(points.length,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(points.length,1,{type:W.FloatType,depthBuffer:false}),geometry=new C.PlaneGeometry(2,2),scene=new C.Scene(),camera=new C.OrthographicCamera(-1,1,1,-1,.1,10),materials=[];camera.position.z=1;renderer.setSize(points.length,1);
    try{
     const shader=probeAtlasPhysicalGLSL(),start=shader.indexOf('uniform sampler2D hbProbeAtlas'),end=shader.indexOf('vec3 hbAtlasBilinear',start),selector=shader.slice(start,end);if(start<0||end<start)throw Error('production GLSL selection owner');
     const material=mode=>{
      if(backend==='webgl'){
       const prefix='precision highp float;precision highp int;uniform sampler2D queries;vec3 hbProbePosition;out vec4 outputColor;\n'+probeVolumeGLSL+'\n'+selector;
       const linear='for(int i=0;i<hbProbeAtlasCount;i++){vec4 lo=hbAtlasLoad(i,1),hi=hbAtlasLoad(i,2);float weight=hbProbeVolumeFade(hbProbeLocalPoint(hbProbePosition,hbAtlasLoad(i,3),hbAtlasLoad(i,4),hbAtlasLoad(i,5)),lo.xyz,hi.xyz,hbAtlasLoad(i,6).xyz,lo.w);if(weight>0.0){if(hbAtlasFirst<0){hbAtlasFirst=i;hbAtlasWeights.x=weight;}else{hbAtlasSecond=i;hbAtlasWeights.y=weight;break;}}}';
       return new G.RawShaderMaterial({glslVersion:G.GLSL3,uniforms:{queries:{value:queries},hbProbeTable:{value:table},hbProbeTableWidth:{value:width},hbProbeAtlasCount:{value:count}},vertexShader:'precision highp float;in vec3 position;void main(){gl_Position=vec4(position,1);}',fragmentShader:prefix+'\nvoid main(){hbProbePosition=texelFetch(queries,ivec2(int(gl_FragCoord.x),0),0).xyz;'+(mode==='spatial'?'hbAtlasChoose();':mode==='linear'?linear:'')+(mode==='word'?'outputColor=vec4(float(hbAtlasWord(3.0,256.0)-16777216),float(hbAtlasWord(5.0,256.0)-16777216),.25,.75);':'outputColor=vec4(float(hbAtlasFirst),float(hbAtlasSecond),hbAtlasWeights);')+'}'});
      }
      const texture=T.texture(table),rowWidth=T.uniform(width,'int'),n=T.uniform(count,'int'),point=T.texture(queries).load(T.ivec2(T.int(T.screenCoordinate.x),0)).xyz,load=(i,field)=>{const at=T.int(i).mul(9).add(field);return texture.load(T.ivec2(at.mod(rowWidth),at.div(rowWidth)));};
      const linear=T.Fn(()=>{const first=T.int(-1).toVar(),second=T.int(-1).toVar(),weights=T.vec2(0).toVar();T.Loop({start:T.int(0),end:n,type:'int',condition:'<'},({i})=>{const lo=load(i,1).toVar(),hi=load(i,2).toVar(),box=gpuProbeVolumeNodes({minimum:lo.xyz,maximum:hi.xyz,localX:load(i,3),localY:load(i,4),localZ:load(i,5),faceScale:load(i,6).xyz,blend:lo.w},point,T.vec3(0,0,1),T.vec3(0));T.If(box.fade.greaterThan(0),()=>{T.If(first.lessThan(0),()=>{first.assign(i);weights.x.assign(box.fade);}).Else(()=>{second.assign(i);weights.y.assign(box.fade);T.Break();});});});return T.uvec4(T.uint(first.add(1)),T.uint(second.add(1)),T.floatBitsToUint(weights.x),T.floatBitsToUint(weights.y));});
      const choice=mode==='spatial'?gpuProbeSpatialChoice(texture,rowWidth,n,point):mode==='linear'?linear():T.uvec4(T.uint(16777219),T.uint(16777221),T.floatBitsToUint(T.float(.25)),T.floatBitsToUint(T.float(.75))),selected=choice.toVar(),node=new W.MeshBasicNodeMaterial();
      node.fragmentNode=T.vec4(T.float(T.int(selected.x).sub(mode==='word'?16777216:1)),T.float(T.int(selected.y).sub(mode==='word'?16777216:1)),T.uintBitsToFloat(selected.z),T.uintBitsToFloat(selected.w));return node;
     };
     const mesh=new C.Mesh(geometry,null);mesh.frustumCulled=false;scene.add(mesh);
     const draw=async mode=>{const m=material(mode);materials.push(m);mesh.material=m;renderer.setRenderTarget(target);if(backend==='webgl'){renderer.render(scene,camera);const values=new Float32Array(points.length*4);renderer.readRenderTargetPixels(target,0,0,points.length,1,values);if(renderer.getContext().getError())throw Error('spatial GL error');return values;}await renderer.renderAsync(scene,camera);return await renderer.readRenderTargetPixelsAsync(target,0,0,points.length,1);};
     const expected=await draw('linear'),actual=await draw('spatial');let weightError=0;for(let i=0;i<points.length;i++)for(let k=0;k<4;k++){const delta=Math.abs(actual[i*4+k]-expected[i*4+k]);if(!Number.isFinite(actual[i*4+k])||delta>(k<2?0:2e-5))throw Error('spatial versus original linear '+JSON.stringify({backend,grid,point:points[i],k,expected:expected[i*4+k],actual:actual[i*4+k]}));if(k>=2)weightError=Math.max(weightError,delta);}
     const words=await draw('word');for(let k=0;k<4;k++)if(words[k]!==[3,5,.25,.75][k])throw Error('integer selection lost index bits');cases.push({count,queries:points.length,weightError,indexWordsAbove2pow24:true,spatial:index.info()});
    }finally{for(const m of materials)m.dispose();geometry.dispose();target.dispose();table.dispose();queries.dispose();}
   }
   results.push({backend,cases});
  }finally{renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}
 }
 return results;
}
