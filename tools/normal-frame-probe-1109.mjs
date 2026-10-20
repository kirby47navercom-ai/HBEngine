import * as G from 'three';
import * as W from 'three/webgpu';
import * as T from 'three/tsl';
import {normalFrameGLSL,materialNormalFrameNode} from '../prototype/normal-map.js';
export async function normalFrame1109(){
 const results=[];
 for(const backend of ['webgl','webgpu']){
  const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer({antialias:false}):new W.WebGPURenderer({antialias:false});
  if(backend==='webgpu')await renderer.init();renderer.setSize(4,1);
  const target=backend==='webgl'?new G.WebGLRenderTarget(4,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(4,1,{type:W.FloatType,depthBuffer:false}),rows=[];
  try{
   for(const mode of ['valid','degenerate','collinear','missing']){
    const scene=new C.Scene(),camera=new C.OrthographicCamera(-1,1,1,-1,.1,10),geometry=new C.PlaneGeometry(2,2),value=new C.Vector3(0,0,1);
    camera.position.z=2;if(mode==='degenerate')geometry.attributes.uv.array.fill(0);if(mode==='collinear'){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i),uv.getX(i));}if(mode==='missing')geometry.deleteAttribute('uv');
    let material,primary;
    if(backend==='webgl')material=new G.ShaderMaterial({uniforms:{mapped:{value}},vertexShader:'varying vec3 eye;varying vec2 texUV;void main(){vec4 p=modelViewMatrix*vec4(position,1);eye=p.xyz;texUV=uv;gl_Position=projectionMatrix*p;}',fragmentShader:normalFrameGLSL+'uniform vec3 mapped;varying vec3 eye;varying vec2 texUV;void main(){gl_FragColor=vec4(hbMaterialNormalFrame(eye,vec3(0,0,1),mapped,texUV),1);}'});
    else{material=new W.MeshBasicNodeMaterial();material.fragmentNode=T.vec4(materialNormalFrameNode(T,T.uniform(value)),1);}
    scene.add(new C.Mesh(geometry,material));
    try{
     for(const input of [[0,0,1],[0,0,-1],[0,0,0],[.6,.2,Math.sqrt(.6)],[.6,.2,-Math.sqrt(.6)],[6e30,2e30,Math.sqrt(.6)*1e31]]){
      value.fromArray(input);renderer.setRenderTarget(target);let output;
      if(backend==='webgl'){renderer.render(scene,camera);output=new Float32Array(16);renderer.readRenderTargetPixels(target,0,0,4,1,output);if(renderer.getContext().getError())throw Error('normal frame GL');}
      else{await renderer.renderAsync(scene,camera);const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,4,1);output=bytes instanceof Float32Array?bytes:new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);}
      const length=Math.hypot(...input),expected=input[0]===0&&input[1]===0?[0,0,input[2]<0?-1:1]:mode==='valid'?input.map(v=>v/length):[0,0,1],actual=Array.from(output.subarray(0,3));
      if(actual.some((v,i)=>!Number.isFinite(v)||Math.abs(v-expected[i])>2e-5))throw Error('normal frame '+JSON.stringify({backend,mode,input,actual,expected}));
      rows.push({mode,input,actual,expected});
     }
    }catch(error){primary=error;throw error;}finally{try{material.dispose();geometry.dispose();}catch(error){if(!primary)throw error;}}
   }
   results.push({backend,rows});
  }finally{target.dispose();renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}
 }
 return results;
}
