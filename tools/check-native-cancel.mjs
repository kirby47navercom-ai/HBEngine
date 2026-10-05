import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),script=fileURLToPath(import.meta.url);
const exists=async file=>fs.access(file).then(()=>true,()=>false);
const json=data=>JSON.stringify(data,null,2)+'\n';
const temporaryExecutables=async directory=>(await fs.readdir(directory)).filter(name=>/^worker-.*\.tmp(?:\.exe)?$/.test(name));
const compiler=process.env.CXX||(process.platform==='win32'&&existsSync('C:/msys64/ucrt64/bin/g++.exe')?'C:/msys64/ucrt64/bin/g++.exe':'g++');
const compilerEnv={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
const request=()=>({key:'nativeCall',nativeId:'CancelProbe.Echo',args:{value:17},objects:[]});

async function waitForPartial(marker){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    try{const name=(await fs.readFile(marker,'utf8')).trim();if(name&&await exists(path.resolve(root,name)))return path.resolve(root,name);}catch(error){if(error.code!=='ENOENT')throw error;}
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  throw Error('컴파일러 대역이 일부 출력을 생성하지 않았어요.');
}

async function child(mode,fixture){
  const data=JSON.parse(await fs.readFile(path.join(fixture,'input.json'),'utf8'));
  const {NativeHost}=await import('./native-host.mjs');
  const host=new NativeHost();
  try{
    if(mode==='cancel'){
      const controller=new AbortController(),compilation=host.build(data.header,data.source,{signal:controller.signal});
      // Attach a rejection handler immediately so a spawn failure is never an
      // unhandled rejection while this test waits for the compiler's marker.
      compilation.catch(()=>{});
      let temporary;
      try{
        temporary=await waitForPartial(path.join(fixture,'partial.txt'));
        assert.match(path.basename(temporary),/^worker\.o$/);
        assert.equal(await fs.readFile(temporary,'utf8'),'partial output');
        assert.match(path.basename(path.dirname(temporary)),/^compile-/);assert.equal(await exists(path.join(path.dirname(path.dirname(temporary)),process.platform==='win32'?'worker.exe':'worker')),false);
      }finally{controller.abort(Error('부분 출력 생성 후 취소'));}
      await assert.rejects(compilation,error=>error.name==='AbortError'||/취소|abort/i.test(error.message));
      assert.equal(await exists(temporary),false,'취소한 일부 object 파일도 정리해야 해요.');const directory=path.dirname(path.dirname(temporary)),binary=path.join(directory,process.platform==='win32'?'worker.exe':'worker');
      assert.equal(await exists(binary),false,'취소한 부분 실행 파일이 완성 캐시에 들어가지 않아야 해요.');
      assert.deepEqual(await temporaryExecutables(directory),[],'취소한 임시 실행 파일을 지워야 해요.');
      await fs.writeFile(path.join(fixture,'cancel.json'),json({directory,binary,partialObserved:true,partialKind:'object',cacheCreated:false,temporaryFiles:0}));
      console.log('부분 object 출력 후 실제 컴파일 프로세스 취소·일부 출력 정리·캐시 보존 통과');
      return;
    }
    if(mode==='retry'){
      const canceled=JSON.parse(await fs.readFile(path.join(fixture,'cancel.json'),'utf8')),result=await host.build(data.header,data.source),binary=host.sessions.get(result.token).binary;
      assert.equal(binary,canceled.binary,'실제 컴파일 재시도가 취소 검사와 같은 해시를 사용해야 해요.');
      assert.equal((await fs.readFile(binary)).subarray(0,2).toString(),process.platform==='win32'?'MZ':'\x7fE');
      assert.equal((await host.call(result.token,request())).outputs.result,42);
      assert.deepEqual(await temporaryExecutables(path.dirname(binary)),[]);
      await fs.writeFile(path.join(fixture,'retry.json'),json({binary,result:42,temporaryFiles:0}));
      console.log('동일 입력 실제 g++ 재시도·사용자 C++ 반환값 42·임시 실행 파일 정리 통과');
      return;
    }
    if(mode==='concurrent'){
      const second=new NativeHost(),source=data.source+'\n// concurrent '+data.id;
      try{
        const [firstResult,secondResult]=await Promise.all([host.build(data.header,source),second.build(data.header,source)]),binary=host.sessions.get(firstResult.token).binary;
        assert.equal(second.sessions.get(secondResult.token).binary,binary);
        const attempts=(await fs.readdir(path.dirname(binary))).filter(name=>name.startsWith('compile-'));
        assert.equal(attempts.length,2,'새 해시에서 서로 다른 두 컴파일 시도가 실행돼야 해요.');
        for(const attempt of attempts)for(const name of ['worker.o','User.o'])assert.equal(await exists(path.join(path.dirname(binary),attempt,name)),false,'두 컴파일 시도 모두 object 중간 파일을 정리해야 해요.');
        const values=await Promise.all([host.call(firstResult.token,request()),second.call(secondResult.token,request())]);
        assert.deepEqual(values.map(value=>value.outputs.result),[42,42]);
        assert.deepEqual(await temporaryExecutables(path.dirname(binary)),[]);
        await fs.writeFile(path.join(fixture,'concurrent.json'),json({binary,attempts:attempts.length,results:[42,42],temporaryFiles:0}));
        console.log('동일 해시 실제 g++ 동시 빌드 2회·공유 완성 캐시·두 실행 반환값 42 통과');
      }finally{second.close();}
      return;
    }
    throw Error('검사 모드 오류');
  }finally{host.close();}
}

if(process.argv[2]==='--child'){
  await child(process.argv[3],path.resolve(process.argv[4]));
}else{
  const fixture=await fs.mkdtemp(path.join(root,'native/build/native-cancel-')),id=randomUUID(),input={id,header:'#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class CancelProbe : public hb::Library { public: HB_FUNCTION(BlueprintCallable) static int Echo(int value); };',source:'int CancelProbe::Echo(int value){ return value+25; }\n// '+id};
  await fs.writeFile(path.join(fixture,'input.json'),json(input));
  const doubleSource=`#include <filesystem>
#include <fstream>
#include <string>
#include <thread>
#include <chrono>
#include <cstdlib>
#ifdef _WIN32
#include <windows.h>
int wmain(int argc,wchar_t** argv){
  std::filesystem::path output;for(int i=1;i+1<argc;i++)if(std::wstring(argv[i])==L"-o")output=argv[i+1];
  const wchar_t* marker=_wgetenv(L"HB_COMPILER_PARTIAL");if(output.empty()||!marker)return 2;
  {std::ofstream file(output,std::ios::binary);file<<"partial output";if(!file)return 3;}
  const auto wide=output.wstring();const int size=WideCharToMultiByte(CP_UTF8,0,wide.data(),int(wide.size()),nullptr,0,nullptr,nullptr);std::string name(size,'\\0');WideCharToMultiByte(CP_UTF8,0,wide.data(),int(wide.size()),name.data(),size,nullptr,nullptr);
  {std::ofstream file(std::filesystem::path(marker),std::ios::binary);file<<name;}
#else
int main(int argc,char** argv){
  std::filesystem::path output;for(int i=1;i+1<argc;i++)if(std::string(argv[i])=="-o")output=argv[i+1];
  const char* marker=std::getenv("HB_COMPILER_PARTIAL");if(output.empty()||!marker)return 2;
  {std::ofstream file(output,std::ios::binary);file<<"partial output";if(!file)return 3;}
  {std::ofstream file(marker,std::ios::binary);file<<output.string();}
#endif
  std::this_thread::sleep_for(std::chrono::seconds(60));return 0;
}`;
  const sourceFile=path.join(fixture,'partial-compiler.cpp'),double=path.join(fixture,process.platform==='win32'?'partial-compiler.exe':'partial-compiler');
  await fs.writeFile(sourceFile,doubleSource);
  await exec(compiler,['-std=c++17','-O0',...(process.platform==='win32'?['-static','-municode']:[]),path.relative(root,sourceFile),'-o',path.relative(root,double)],{cwd:root,env:compilerEnv,windowsHide:true,timeout:30000,maxBuffer:1048576});
  const unicodeTemp=path.join(fixture,'한글 임시');await fs.mkdir(unicodeTemp);
  for(const mode of ['cancel','retry','concurrent']){
    const env={...compilerEnv,TEMP:unicodeTemp,TMP:unicodeTemp,CXX:mode==='cancel'?double:compiler,HB_COMPILER_PARTIAL:path.join(fixture,'partial.txt')};
    const {stdout}=await exec(process.execPath,[script,'--child',mode,fixture],{cwd:root,env,windowsHide:true,timeout:120000,maxBuffer:4194304});
    process.stdout.write(stdout);
  }
  await fs.writeFile(path.join(fixture,'proof.json'),json({fixture,id,cancel:JSON.parse(await fs.readFile(path.join(fixture,'cancel.json'))),retry:JSON.parse(await fs.readFile(path.join(fixture,'retry.json'))),concurrent:JSON.parse(await fs.readFile(path.join(fixture,'concurrent.json')))}));
  console.log('네이티브 취소·재시도·동시 컴파일 증거:',fixture);
}
