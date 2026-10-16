import * as T from 'three/tsl';
import {WebGPURenderer,DataTexture,Vector4,RGBAFormat,FloatType} from 'three/webgpu';
import {rayMaterialNode} from '../prototype/ray-material-gpu.js';
import {previousNormalGPU} from '../prototype/path-previous-normal-gpu.js';
export function previousNormalShader189(programs,{forceTime}={}){
 const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){}}});renderer.backend.utils={getTextureSampleData:()=>({primarySamples:1})};renderer.hasFeature=()=>true;
 const texture=new DataTexture(new Float32Array(64),4,4,RGBAFormat,FloatType),sample=T.texture(texture),load=i=>T.textureLoad(sample,T.ivec2(i.mod(4),i.div(4).floor())),u=Object.fromEntries(['geometryInfo','geometryRecords','transport','pathFilter','forward'].map(k=>[k,T.uniform(new Vector4())])),ray=rayMaterialNode(load,u,programs,[3]);
 if(forceTime!==undefined)ray.hasTime=forceTime;
 const prior=previousNormalGPU({load,ray},u),point=T.vec3(-.25,-.25,0),view=T.vec3(0,0,1),normal=ray.normal(T.float(0),point,view,T.float(.01)),builder=renderer.backend.createNodeBuilder(null,renderer);builder.setShaderStage('fragment');
 const flow=builder.flowStagesNode(prior(T.float(0),point,normal,view,T.float(.01)),'vec3'),code=builder.codes.fragment.map(c=>c.code).join('\n')+flow.code;texture.dispose();return {bytes:Buffer.byteLength(code),code,hasTime:ray.hasTime??null};
}
