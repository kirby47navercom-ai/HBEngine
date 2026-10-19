import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {textureHistoryFixture467} from './texture-history-fixture-467.mjs';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
import {curvedGuideGLSL} from '../prototype/path-curved-guide.js';
import {surfaceHistoryGLSL} from '../prototype/path-surface-history.js';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const normals=process.argv.includes('--normals'),shared=process.argv.includes('--shared-local'),work=await fs.mkdtemp(path.resolve(normals?'native/build/normal-scale-646-native-':'native/build/triangle-scale-644-native-'));
retainTestEvidence(work);
const run=promisify(execFile),compiler='C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
try{
 await prepareNative();
 const binary=path.join(work,'probe.exe');
 await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I','native/include','-I',path.relative(process.cwd(),jsonInclude),'native/tests/path-previous-context-308.cpp','-o',path.relative(process.cwd(),binary)],{env,windowsHide:true,timeout:60000,maxBuffer:1048576});
 const header=await fs.readFile('native/include/HBEngine/ScreenEffectsPass.hpp','utf8'),prefix=header.split('const std::string code=R"HLSL(')[1].split(')HLSL"')[0].replace('RWTexture2D<float4> destination:register(u0);',''),body=(await fs.readFile('native/include/HBEngine/ScreenEffects.hpp','utf8')).split('R"HLSL(')[1].split(')HLSL"')[0],names=prefix.match(/cbuffer ScreenSettings:register\(b0\)\{float4 ([^;]+);/)[1].split(',').map(s=>s.trim().replace(/^hb/,'')),rows=[];
 for(const shape of [{needle:1,shear:0},{needle:.001,shear:1},{needle:.00001,shear:1}])for(const worldScale of [1,.000001,1000000]){
  const f=textureHistoryFixture467('normal',{lobes:true,worldScale:shared?1:worldScale,localScale:shared?worldScale:1,shared,...shape}),contexts=[];
  for(const [p,prior]of [[f.prior,false],[f.current,true]]){
   const constants=new Float32Array(names.length*4+48);
   for(const key of ['geometryInfo','geometryRecords','transport','pathFilter','forward'])constants.set(p[key],names.indexOf(key[0].toUpperCase()+key.slice(1))*4);
   const id=prior?f.id:0,name=prior?'hbRayPrevious':'hbRay',calls=[];
   for(const width of [f.width,f.currentWidth]){
    calls.push('float4('+name+'Bary('+id+'.0,p),1)','float4('+name+'BaryOffset('+id+'.0,p,float3(0,'+width+',0)),1)','testUV('+id+'.0,p,v,'+width+')');
    if(normals){const args=id+'.0,p,v,'+width,normal=prior?'hbRayPreviousNormalContextLod('+args+',float2(hbForward.w,1))':'hbRayNormalLod('+args+')',coat=prior?'hbRayPreviousCoatNormalContextLod('+args+',float2(hbForward.w,1))':'hbRayCoatNormalLod('+args+')';for(const call of [normal,coat,prior?'hbTestCommittedBase('+args+')':normal,prior?'hbTestCommittedCoat('+args+')':coat])calls.push('float4('+call+',1)');}
    else for(const field of [1,3,5,9])calls.push((prior?'hbRayPreviousField'+field+'TimeLod':'hbRayField'+field+'Lod')+'('+id+'.0,p,v,'+width+(prior?',float2(hbForward.w,1)':'')+')');
   }
   const probe='\nfloat4 testUV(float id,float3 p,float3 v,float w){float2 uv,dx,dy;'+name+'UVFootprint(id,p,v,w,uv,dx,dy);return float4(dx,dy);}\nRWStructuredBuffer<float4> probeOut:register(u0);[numthreads(1,1,1)]void Probe(uint3 tid:SV_DispatchThreadID){float3 p=float3('+f.point.join(',')+'),v=float3('+f.view.join(',')+');'+calls.map((call,i)=>'probeOut['+i+']='+call+';').join('')+'}',packet={probeCount:calls.length,data:p.data,width:p.width,height:p.height,programs:p.rayInfo.programs,constants:[...constants],probe},label='s'+worldScale+'-n'+shape.needle+(prior?'-prior':'-current'),base=path.join(work,label),shader='#define HB_PATH_ADVANCED 1\n'+p.rayInfo.operations.map(op=>'#define HB_RAY_OP_'+op+' 1\n').join('')+[1,3,5,9].map(field=>'#define HB_RAY_FIELD_'+field+' 1\n').join('')+'#define HB_GUIDE_OPAQUE 1\n'+prefix+body;
   const gate=normals?[[curvedGuideGLSL,'hbPathCommittedNormal','hbTestCommittedBase'],[surfaceHistoryGLSL,'hbPathCommittedCoatNormal','hbTestCommittedCoat']].map(([code,name,alias])=>code.split('\n').find(line=>line.startsWith('vec3 '+name+'(')).replace(name,alias).replaceAll('vec3','float3').replaceAll('vec2','float2').replace(/\bpoint\b/g,'hbPoint')).join('\n'):'';
   await fs.writeFile(base+'.json',JSON.stringify(packet));await fs.writeFile(base+'.hlsl',(p.geometryRecords[0]>0?'#define HB_GEOMETRY_SHARED 1\n':'')+shader+'\n'+gate);
   const result=JSON.parse((await run(binary,[base+'.json',base+'.hlsl'],{env,windowsHide:true,timeout:60000,maxBuffer:1048576})).stdout);
   assert(result.hardware&&result.values.every(Number.isFinite));
   const coordinates=[],expected=[],material=[];
   for(let j=0;j<2;j++){
    const k=j?.002:.45;
    coordinates.push(...result.values.slice(j*28,j*28+12));
    expected.push(.1,.2,.7,1,.1+k+k*shape.shear,.2-k,.7-k*shape.shear,1,-k*shape.needle,0,k*shape.shear,-k);
    material.push(...result.values.slice(j*28+12,j*28+28));
   }
   const coordinateError=Math.max(...coordinates.map((v,i)=>Math.abs(v-expected[i])));
   contexts.push({prior,...result,coordinateError,material});
   await fs.writeFile(path.join(work,'observed.json'),JSON.stringify({rows,pending:{worldScale,...shape,contexts}},null,2));
   assert(coordinateError<4e-5,JSON.stringify({worldScale,...shape,prior,coordinateError,coordinates,expected}));
  }
  const priorError=Math.max(...contexts[0].material.map((v,i)=>Math.abs(v-contexts[1].material[i])));
  const reference=worldScale===1?contexts:rows.find(row=>row.worldScale===1&&row.needle===shape.needle).contexts;
  const scaleError=Math.max(...contexts.flatMap((context,j)=>context.material.map((v,i)=>Math.abs(v-reference[j].material[i]))));
  rows.push({worldScale,...shape,contexts,priorError,scaleError});
  assert(priorError<4e-5&&scaleError<4e-5,JSON.stringify(rows.at(-1)));
 }
 const proof={passed:true,normals,shared,rows,scope:'D3D11 hardware generated production HLSL: independent authored barycentric/offset/UV oracle plus current/prior material normal/mip values (or decoded base/coat and both temporal validity gates with --normals) at scales1e-6/1/1e6 and shear/needle1/.001/.00001. Shared local mesh scale is selected with --shared-local. Existing4e-5 tolerance. No ray-intersection or full-world scale claim.'};
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(proof,null,2));
 console.log(JSON.stringify({work,passed:true,contexts:rows.length*2,maxError:Math.max(...rows.flatMap(row=>[row.priorError,row.scaleError,...row.contexts.map(c=>c.coordinateError)]))}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw error;}finally{await pruneTestArtifacts(work);}
