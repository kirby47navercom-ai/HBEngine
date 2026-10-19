import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {pathDenoiseGLSL} from '../prototype/path-denoise.js';
import {rayCoordinateBasisGLSL} from '../prototype/ray-coordinate-basis.js';
import {createProject} from './project-manifest.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/pixel-footprint-659-'));retainTestEvidence(work);
const baseline=process.argv.includes('--baseline'),run=promisify(execFile),compiler='C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},cases=[];
for(const scale of [1,1e-6,1e-10,1e6,1e10])for(const mode of ['orthogonal','mirrored','rotated','sheared','nearly-parallel','zero']){
 let x=mode==='rotated'?[.6,.8,0]:[mode==='mirrored'?-1:1,0,0],y=mode==='rotated'?[-.8,.6,0]:mode==='sheared'?[1,.01,0]:mode==='nearly-parallel'?[1,.0005,0]:mode==='zero'?[0,0,0]:[0,1,0];
 x=x.map(v=>v*scale);y=y.map(v=>v*scale);const delta=x.map((v,i)=>2.25*v-1.5*y[i]+(i===2?.7*scale:0)),expected=['nearly-parallel','zero'].includes(mode)?[0,0,0,1]:[2.25,-1.5,0,1];cases.push({scale,mode,x,y,delta,expected});
}
const data=cases.flatMap(c=>[...c.x,0,...c.y,0,...c.delta,0]),width=cases.length*3,helper=pathDenoiseGLSL.split('\n').find(line=>line.startsWith('vec2 hbPathOffset(')),guideSource=await fs.readFile('prototype/path-guide-gpu.js','utf8'),newGPU=guideSource.includes('offset=pathPixelOffsetGPU'),at=guideSource.indexOf('offset=(x,y,d)=>'),gpuSource=newGPU?null:guideSource.slice(at+7,guideSource.indexOf(';\n return T.rtt',at));assert(helper&& (newGPU||at>=0&&gpuSource.startsWith('(x,y,d)=>')));
let probe;
try{
 await fs.writeFile(path.join(work,'cases.json'),JSON.stringify(cases,null,2));const project=await createProject('PixelFootprint659',work,'2d');probe=await editorWindowProbe({work,project:project.file});
 const rows=await probe.evaluate(`(async()=>{
  const data=${JSON.stringify(data)},size=${cases.length},G=await import('three'),W=await import('three/webgpu'),T=await import('three/tsl'),result={},offset=${newGPU?"(await import('/prototype/path-pixel-footprint-gpu.js')).pathPixelOffsetGPU":'('+gpuSource+')'};
  for(const backend of ['webgl','webgpu']){
   const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer():new W.WebGPURenderer();if(backend==='webgpu')await renderer.init();renderer.setSize(size,1);const table=new C.DataTexture(new Float32Array(data),size*3,1,C.RGBAFormat,C.FloatType),target=backend==='webgl'?new G.WebGLRenderTarget(size,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(size,1,{type:W.FloatType,depthBuffer:false}),geometry=new C.PlaneGeometry(2,2),scene=new C.Scene(),camera=new C.OrthographicCamera(-1,1,1,-1,0,2);table.minFilter=table.magFilter=C.NearestFilter;table.needsUpdate=true;let material;
   try{
    if(backend==='webgl')material=new G.ShaderMaterial({uniforms:{table:{value:table}},vertexShader:'void main(){gl_Position=vec4(position,1);}',fragmentShader:'uniform sampler2D table;'+${JSON.stringify(rayCoordinateBasisGLSL+helper)}+'void main(){int i=int(gl_FragCoord.x)*3;vec3 x=texelFetch(table,ivec2(i,0),0).xyz,y=texelFetch(table,ivec2(i+1,0),0).xyz,d=texelFetch(table,ivec2(i+2,0),0).xyz;gl_FragColor=vec4(hbPathOffset(x,y,d),0,1);}'});
    else{const sample=T.texture(table),load=i=>T.textureLoad(sample,T.ivec2(i,0)).xyz;material=new W.MeshBasicNodeMaterial();material.fragmentNode=T.Fn(()=>{const i=T.uv().x.mul(size).floor().toInt().mul(3);return T.vec4(offset(load(i),load(i.add(1)),load(i.add(2))),0,1);})();}
    scene.add(new C.Mesh(geometry,material));renderer.setRenderTarget(target);if(backend==='webgl'){renderer.render(scene,camera);const pixels=new Float32Array(size*4);renderer.readRenderTargetPixels(target,0,0,size,1,pixels);if(renderer.getContext().getError())throw Error('GL footprint probe');result[backend]=[...pixels];}else{await renderer.renderAsync(scene,camera);result[backend]=[...await renderer.readRenderTargetPixelsAsync(target,0,0,size,1)];}
   }finally{material?.dispose();geometry.dispose();table.dispose();target.dispose();renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}
  }return result;
 })()`);await probe.finish();probe=null;await fs.writeFile(path.join(work,'browser.json'),JSON.stringify(rows,null,2));
 await prepareNative();const binary=path.join(work,'probe.exe');await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(process.cwd(),jsonInclude),'native/tests/path-previous-context-308.cpp','-o',path.relative(process.cwd(),binary)],{env,windowsHide:true,timeout:60000,maxBuffer:1048576});
 const header=await fs.readFile('native/include/HBEngine/ScreenEffectsPass.hpp','utf8'),prefix=header.split('const std::string code=R"HLSL(')[1].split(')HLSL"')[0].replace('RWTexture2D<float4> destination:register(u0);',''),body=(await fs.readFile('native/include/HBEngine/ScreenEffects.hpp','utf8')).split('R"HLSL(')[1].split(')HLSL"')[0],names=prefix.match(/cbuffer ScreenSettings:register\(b0\)\{float4 ([^;]+);/)[1].split(',').map(s=>s.trim().replace(/^hb/,'')),constants=new Float32Array(names.length*4+48);constants.set([width,1,0,0],names.indexOf('GeometryInfo')*4);
 const packet={data,width,height:1,programs:[],constants:[...constants],probeCount:cases.length,dispatchCount:cases.length,probe:'\nRWStructuredBuffer<float4> probeOut:register(u0);[numthreads(1,1,1)]void Probe(uint3 tid:SV_DispatchThreadID){float3 x=hbGeometryRawLoad(tid.x*3).xyz,y=hbGeometryRawLoad(tid.x*3+1).xyz,d=hbGeometryRawLoad(tid.x*3+2).xyz;probeOut[tid.x]=float4(hbPathOffset(x,y,d),0,1);}'};
 await fs.writeFile(path.join(work,'packet.json'),JSON.stringify(packet));await fs.writeFile(path.join(work,'probe.hlsl'),prefix+body);const native=JSON.parse((await run(binary,[path.join(work,'packet.json'),path.join(work,'probe.hlsl')],{env,windowsHide:true,timeout:60000,maxBuffer:1048576})).stdout);assert(native.hardware);rows.d3d11=native.values;
 const errors=Object.entries(rows).flatMap(([api,values])=>cases.map((c,i)=>({api,scale:c.scale,mode:c.mode,finite:values.slice(i*4,i*4+4).every(Number.isFinite),error:Math.max(...values.slice(i*4,i*4+4).map((v,j)=>Math.abs(v-c.expected[j])))})));
 const proof={baseline,passed:baseline?null:errors.every(e=>e.finite&&e.error<4e-5),cases,rows,errors,native,sourceSHA256:createHash('sha256').update(guideSource).digest('hex'),scope:'Actual GL/WebGPU/D3D11 production lens pixel-coordinate solve, dynamic float input table and independently authored projected displacement; 30 rotated/mirrored/sheared/zero/near-parallel frames across1e-10..1e10. Original4e-5 and relative collinearity rejection retained. Full lens guide and games are separate gates.'};await fs.writeFile(path.join(work,baseline?'baseline.json':'acceptance.json'),JSON.stringify(proof,null,2));if(!baseline)assert(proof.passed,JSON.stringify(errors));console.log(JSON.stringify({work,baseline,passed:proof.passed,failures:errors.filter(e=>!e.finite||e.error>=4e-5),maxError:Math.max(...errors.map(e=>e.error))}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr,diagnostics:await probe?.diagnostics()},null,2));throw error;}finally{await probe?.stop();await pruneTestArtifacts(work);}
