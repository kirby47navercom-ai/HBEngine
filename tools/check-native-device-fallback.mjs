import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
assert.deepEqual(await activeInstalledVersions(path.join(process.env.USERPROFILE,'HBEngine')),[]);
const engine=path.resolve(process.argv[2]||'.'),work=await fs.mkdtemp('native/build/device-fallback-');retainTestEvidence(work);
const cpp=`#include <HBEngine/Compute.hpp>
#include <cassert>
#include <iostream>
int main(){using namespace hb::gpu;
 auto real=detail::libraries().symbol<decltype(&D3D11CreateDevice)>(detail::libraries().d3d,"D3D11CreateDevice");
 detail::Com<ID3D11Device> device;detail::Com<ID3D11DeviceContext> context;int hardware=0,software=0;
 auto absentHardware=[&](IDXGIAdapter* a,D3D_DRIVER_TYPE driver,HMODULE s,UINT flags,const D3D_FEATURE_LEVEL* levels,UINT count,UINT sdk,ID3D11Device** out,D3D_FEATURE_LEVEL* actual,ID3D11DeviceContext** ctx){if(driver==D3D_DRIVER_TYPE_HARDWARE){hardware++;return HRESULT(DXGI_ERROR_UNSUPPORTED);}software++;return real(a,driver,s,flags,levels,count,sdk,out,actual,ctx);};
 assert(detail::createCompatibleDevice(absentHardware,DeviceDriver::Automatic,device,context)==D3D_DRIVER_TYPE_WARP);assert(hardware==1&&software==1&&device.p&&context.p);
 try{detail::createCompatibleDevice(absentHardware,DeviceDriver::Hardware,device,context);assert(false);}catch(const std::exception& e){assert(std::string(e.what()).find("hardware")!=std::string::npos);}assert(hardware==2&&software==1);
 assert(detail::createCompatibleDevice(absentHardware,DeviceDriver::Software,device,context)==D3D_DRIVER_TYPE_WARP);assert(hardware==2&&software==2);
 auto neither=[](auto...){return HRESULT(E_FAIL);};try{detail::createCompatibleDevice(neither,DeviceDriver::Automatic,device,context);assert(false);}catch(const std::exception& e){assert(std::string(e.what()).find("WARP HRESULT")!=std::string::npos);}
 Device gpu(DeviceDriver::Software);assert(gpu.software());auto values=gpu.create({1,2,3,4});auto kernel=gpu.compile("RWStructuredBuffer<float> data:register(u0);[numthreads(4,1,1)]void Main(uint3 id:SV_DispatchThreadID){data[id.x]+=2;}");gpu.dispatch(kernel,{&values},1);assert((gpu.read(values)==std::vector<float>{3,4,5,6}));std::cout<<"hardware-failure/software-forced/dual-failure/WARP-compute passed";
}`;
await fs.writeFile(work+'/fixture.cpp',cpp);const env={...process.env,PATH:'C:/msys64/ucrt64/bin;'+process.env.PATH};const run=(file,args)=>new Promise((resolve,reject)=>{const p=spawn(file,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',v=>output+=v);p.stderr.on('data',v=>output+=v);p.once('error',reject);p.once('close',code=>resolve({code,output}));});
const output=path.join(work,'fixture.exe'),compile=await run('C:/msys64/ucrt64/bin/g++.exe',['-std=c++17','-O2','-s','-static','-I'+path.relative(process.cwd(),path.join(engine,'native/include')),work+'/fixture.cpp','-o',output,'-ld3d11','-ldxgi','-ld3dcompiler','-lole32']);assert.equal(compile.code,0,compile.output);
const result=await run(path.resolve(output),[]);assert.equal(result.code,0,result.output);const owners={};for(const f of ['native/include/HBEngine/D3DDevice.hpp','native/include/HBEngine/Compute.hpp','native/include/HBEngine/ComputePlatform.hpp'])owners[f]=createHash('sha256').update(await fs.readFile(path.join(engine,f))).digest('hex');owners['fixture.exe']=createHash('sha256').update(await fs.readFile(output)).digest('hex');await fs.writeFile(work+'/acceptance.json',JSON.stringify({passed:true,owners,hardwareFailureFallback:true,hardwareOnlyFailure:true,softwareOnly:true,bothFailuresDiagnosed:true,actualWarpCompute:[3,4,5,6],engine},null,2));console.log(JSON.stringify({work,passed:true,output:result.output}));
