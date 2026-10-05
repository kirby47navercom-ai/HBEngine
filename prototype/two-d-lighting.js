import * as THREE from 'three';
import {defaultSortingLayers,sortingLayerIndex} from './sorting-layers.js';

// ponytail: at most64 active lamps per scene; spatial batches replace this ceiling when larger scenes need it.
export const light2dLimit=64;
const width=7,stride=width*4;
export function light2DUniforms(material){
  if(material.userData.hbLight2D)return material.userData.hbLight2D;
  const uniforms={hbLight2DData:{value:null},hbLight2DCount:{value:0},hbLight2DHeight:{value:1},hbLight2DLayer:{value:0},hbLight2DOrigin:{value:new THREE.Vector2()}};
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    compile.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
    for(const chunk of ['lights_fragment_begin','lights_fragment_maps','lights_fragment_end'])shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>','');
    shader.vertexShader='varying vec2 hbLight2DWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nhbLight2DWorld=(modelMatrix*vec4(transformed,1.0)).xy;');
    shader.fragmentShader=`varying vec2 hbLight2DWorld;
uniform sampler2D hbLight2DData;
uniform int hbLight2DCount;
uniform float hbLight2DHeight,hbLight2DLayer;
uniform vec2 hbLight2DOrigin;
vec4 hbLight2DRead(float column,float row){return texture2D(hbLight2DData,vec2((column+0.5)/7.0,(row+0.5)/hbLight2DHeight));}
float hbLight2DTarget(float row){
  float part=floor(hbLight2DLayer/8.0);vec4 bits=hbLight2DRead(part<4.0?5.0:6.0,row);
  float channel=mod(part,4.0),value=channel<0.5?bits.x:channel<1.5?bits.y:channel<2.5?bits.z:bits.w;
  return mod(floor(value/exp2(mod(hbLight2DLayer,8.0))),2.0);
}
float hbLight2DFade(float low,float high,float value){return high-low<0.00001?step(high,value):smoothstep(low,high,value);}
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`vec3 hbLight2DSum=vec3(0.0);
for(int hbIndex=0;hbIndex<64;hbIndex++){
  if(hbIndex>=hbLight2DCount)break;float row=float(hbIndex);if(hbLight2DTarget(row)<0.5)continue;
  vec4 origin=hbLight2DRead(0.0,row),tint=hbLight2DRead(1.0,row);float attenuation=1.0;
  if(origin.z>0.5){
    vec4 range=hbLight2DRead(2.0,row),settings=hbLight2DRead(3.0,row),basis=hbLight2DRead(4.0,row);
    vec2 delta=hbLight2DWorld-origin.xy,local=vec2(dot(basis.xy,delta),dot(basis.zw,delta));float distance2d=length(local);
    attenuation=pow(1.0-hbLight2DFade(range.x,range.y,distance2d),settings.x);
    if(origin.z>1.5&&distance2d>0.00001)attenuation*=hbLight2DFade(range.z,range.w,local.y/distance2d);
    if(origin.w>0.5){vec2 normalDelta=origin.xy-(origin.w<1.5?hbLight2DOrigin:hbLight2DWorld);
      vec3 surfaceNormal=inverseTransformDirection(normal,viewMatrix);
      attenuation*=max(0.0,dot(surfaceNormal,normalize(vec3(normalDelta,max(0.00001,settings.y)))));
    }
  }
  hbLight2DSum+=tint.rgb*tint.a*attenuation;
}
outgoingLight=diffuseColor.rgb*hbLight2DSum+totalEmissiveRadiance;
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'|hb-light2d-v1';material.needsUpdate=true;material.userData.hbLight2D=uniforms;return uniforms;
}

export class TwoDLighting{
  constructor(){this.texture=null;this.count=0;this.uploads=0;this.row=new Float32Array(stride);this.masks=new Uint8Array(8);}
  prepare(groups,entries,layers=defaultSortingLayers){
    const receivers=entries.filter(e=>e.properties.shading==='lit2d');
    if(!receivers.length){this.dispose();return {lights:0,lightBytes:0};}
    const lights=[];
    for(const group of groups){if(group.userData.disposed||!group.userData.light2d)continue;let shown=true;for(let node=group;node;node=node.parent)if(!node.visible){shown=false;break;}if(shown&&group.userData.light2d.enabled!==false)lights.push(group);}
    if(lights.length>light2dLimit)throw Error('활성 2D 광원은64개까지예요.');
    const capacity=Math.max(1,2**Math.ceil(Math.log2(lights.length||1)));
    if(lights.length&&(!this.texture||this.texture.image.height!==capacity)){
      this.texture?.dispose();this.texture=new THREE.DataTexture(new Float32Array(stride*capacity),width,capacity,THREE.RGBAFormat,THREE.FloatType);this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;
    }
    let changed=false;
    for(let row=0;row<lights.length;row++){
      const group=lights[row],p=group.userData.light2d,m=group.matrixWorld.elements,det=m[0]*m[5]-m[4]*m[1];
      if(p.lightType!=='global'&&(!Number.isFinite(det)||Math.abs(det)<1e-8))throw Error('2D 광원의 XY 변환이 평면에서 사라졌어요.');
      const masks=this.masks; masks.fill(0);for(let i=0;i<Math.min(64,layers.length);i++)if(p.targetSortingLayers.includes(layers[i].id))masks[Math.floor(i/8)]|=1<<(i%8);
      const data=this.row;data[0]=m[12];data[1]=m[13];data[2]=p.lightType==='global'?0:p.lightType==='point'?1:2;data[3]=p.normalMode==='disabled'?0:p.normalMode==='fast'?1:2;
      data[4]=p.color[0];data[5]=p.color[1];data[6]=p.color[2];data[7]=p.intensity;data[8]=p.innerRadius;data[9]=p.outerRadius;data[10]=Math.cos(p.outerAngle*Math.PI/360);data[11]=Math.cos(p.innerAngle*Math.PI/360);
      data[12]=p.falloff;data[13]=p.normalDistance;data[16]=p.lightType==='global'?1:m[5]/det;data[17]=p.lightType==='global'?0:-m[4]/det;data[18]=p.lightType==='global'?0:-m[1]/det;data[19]=p.lightType==='global'?1:m[0]/det;data.set(masks,20);
      for(let i=0;i<stride;i++){const at=row*stride+i,value=Math.fround(data[i]);if(this.texture.image.data[at]!==value){this.texture.image.data[at]=value;changed=true;}}
    }
    if(this.texture&&changed){this.texture.needsUpdate=true;this.uploads++;}
    if(!lights.length){this.texture?.dispose();this.texture=null;}
    this.count=lights.length;
    for(const entry of receivers)for(const material of Array.isArray(entry.node.material)?entry.node.material:[entry.node.material]){
      const u=light2DUniforms(material);u.hbLight2DData.value=this.texture;u.hbLight2DCount.value=this.count;u.hbLight2DHeight.value=capacity;u.hbLight2DLayer.value=sortingLayerIndex(layers,entry.properties.sortingLayer);
      u.hbLight2DOrigin.value.set(entry.node.matrixWorld.elements[12],entry.node.matrixWorld.elements[13]);
    }
    return {lights:this.count,lightBytes:this.texture?.image.data.byteLength||0,lightUploads:this.uploads};
  }
  dispose(){this.texture?.dispose();this.texture=null;this.count=0;}
}
