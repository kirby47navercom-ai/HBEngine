import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {probeInfluenceFixture1426} from './probe-influence-fixture-1426.mjs';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/probe-influence-1426-native-'));retainTestEvidence(work);
try{
 await prepareNative();const run=promisify(execFile),compiler='C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},at=process.argv.indexOf('--executable'),root=at<0?process.cwd():path.dirname(path.resolve(process.argv[at+1])),fixture=probeInfluenceFixture1426();
 const header=await fs.readFile(path.join(root,'native/include/HBEngine/SceneProbes.hpp'),'utf8'),structure=header.match(/struct ProbeSettings\{[^}]+\};/)?.[0],start=header.indexOf('float3 probeLocal('),end=header.indexOf('float3 probeLight(',start);assert(structure&&start>=0&&end>start);
 await fs.writeFile(path.join(work,'probe.hlsl'),structure+'\n'+header.slice(start,end));
 const probe='Texture2D<float4> inputs:register(t7);RWStructuredBuffer<float4> destination:register(u0);float4 entry(uint index,uint row){uint at=index*22+row;return inputs.Load(int3(at%4096,at/4096,0));}[numthreads(1,1,1)]void Probe(uint3 id:SV_DispatchThreadID){uint i=id.x;ProbeSettings p;'+fixture.fields.map((f,i)=>'p.'+f+'=entry(i,'+i+');').join('')+'destination[i]=float4(probeShadingWeight(p,entry(i,19).xyz,entry(i,20).xyz,entry(i,21).xyz),0,0,1);}';
 const binary=path.join(work,'influence.exe');await run(compiler,['-std=c++17','-O2','-Wall','-Wextra','-Werror','-I',path.join(root,'native/include'),'-I',path.relative(process.cwd(),jsonInclude),'native/tests/probe-projection-1410.cpp','-o',path.relative(process.cwd(),binary)],{env,windowsHide:true,timeout:120000,maxBuffer:4*1024*1024});
 let maxError=0;const chunks=[];
 // The reused test driver has a 4096-value readback budget. Chunk the complete
 // fixture instead of reducing coverage or changing any production count limit.
 for(let offset=0;offset<fixture.count;offset+=4096){
  const count=Math.min(4096,fixture.count-offset),width=4096,height=Math.ceil(count*22/width),data=new Float32Array(width*height*4);data.set(fixture.data.slice(offset*88,(offset+count)*88));const packet=path.join(work,'packet-'+offset+'.json');
  await fs.writeFile(packet,JSON.stringify({standalone:true,probeCount:count,dispatchCount:count,width,height,data:[...data],constants:[0,0,0,0],probe}));
  const result=JSON.parse((await run(binary,[packet,path.join(work,'probe.hlsl')],{env,windowsHide:true,timeout:120000,maxBuffer:2*1024*1024})).stdout);
  assert(result.sdkProjectionGuards&&result.sdkInfluenceGuards&&result.directSettingsBytes===304&&result.atlasRecordBytes===320);assert.equal(result.values.length,count*4);
  for(let i=0;i<count;i++)for(let c=0;c<4;c++){const expected=[fixture.rows[offset+i].expected,0,0,1][c],actual=result.values[i*4+c],error=Math.abs(actual-expected);maxError=Math.max(maxError,error);assert(Number.isFinite(actual)&&error<.001,JSON.stringify({i:offset+i,c,actual,expected,error}));}
  chunks.push({offset,count,sdkInfluenceGuards:true,directSettingsBytes:304,atlasRecordBytes:320});
 }
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,installedDirectory:at<0?null:root,cases:fixture.count,maxError,chunks,scope:'Actual optimized D3D11 spatial/angular/normal influence HLSL against all independent transformed plane/analytic cases in bounded test-driver chunks; SDK atomic guards and304/320layout. No production count limit changed. Physical/raster/game separate.'},null,2));console.log(JSON.stringify({passed:true,work,cases:fixture.count,maxError,chunks:chunks.length}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,stderr:error.stderr},null,2));throw Error(String(error.stderr||error.stack).slice(-3500));}finally{await pruneTestArtifacts(work);}