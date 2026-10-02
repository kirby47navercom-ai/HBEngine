import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {libraryFunctions} from '../prototype/library-spec.js';
import {catalog,defaultBlueprint,makeNode,validBlueprint} from '../prototype/blueprint-model.js';
import {createCorePreview,evaluateCore} from '../prototype/core-preview.js';
fs.mkdirSync('native/build',{recursive:true});
fs.writeFileSync('native/build/library-inputs.json',JSON.stringify(libraryFunctions.map(f=>f.sample)));
const type=t=>t;
const source='#include <HBEngine/Bridge.hpp>\n#include <fstream>\nint main(){using namespace hb;Json args;std::ifstream("native/build/library-inputs.json")>>args;Json values=Json::array();\n'+libraryFunctions.map((f,i)=>`{auto a=args.at(${i});values.push_back(Extended::${f.name}(${f.parameters.map(([t,name])=>`a.at("${name}").get<${type(t)}>()`).join(',')}));}`).join('\n')+'\nbool rejected=false;try{Extended::ArrayFloatGet({},0);}catch(const std::out_of_range&){rejected=true;}if(!rejected)return 2;try{Extended::IntDivide(1,0);return 3;}catch(const std::invalid_argument&){}std::cout<<values.dump();}\n';
fs.writeFileSync('native/build/library-check.cpp',source);
const compiler=process.env.CXX||(process.platform==='win32'?'C:/msys64/ucrt64/bin/g++.exe':'g++'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},binary='native/build/library-check'+(process.platform==='win32'?'.exe':'');
const compile=spawnSync(compiler,['-std=c++17','-Wall','-Wextra','-Werror','-I','native/include','-I','native/build/deps','native/build/library-check.cpp','-o',binary],{env,windowsHide:true,encoding:'utf8'});assert.equal(compile.status,0,compile.stderr||String(compile.error));
const native=spawnSync(path.resolve(binary),[],{env,windowsHide:true,encoding:'utf8'});assert.equal(native.status,0,native.stderr);const outputs=JSON.parse(native.stdout),context=createCorePreview();
const compare=(a,b,label)=>{if(typeof a==='number'){assert.ok(Math.abs(a-b)<=1e-5*Math.max(1,Math.abs(a)),label+': '+a+' / '+b);}else if(Array.isArray(a)){assert.equal(a.length,b.length,label);a.forEach((v,i)=>compare(v,b[i],label));}else if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),label);Object.keys(a).forEach(k=>compare(a[k],b[k],label));}else assert.equal(a,b,label);};
for(const [i,f] of libraryFunctions.entries()){
  const actual=evaluateCore(f.key,f.sample,context).return;compare(actual,outputs[i],f.key);
  const root={...structuredClone(defaultBlueprint),nodes:[{...makeNode(f.key),inputValues:structuredClone(f.sample)}],edges:[]};assert.ok(validBlueprint(JSON.parse(JSON.stringify(root))),f.key+' 저장/타입');assert.ok(catalog.some(s=>s.key===f.key&&s.cppName));
}
assert.throws(()=>evaluateCore('arrayFloatGet',{array:[],index:0},context),/인덱스/);assert.throws(()=>evaluateCore('intDivide',{a:1,b:0},context),/0/);assert.throws(()=>evaluateCore('arrayIntLength',{array:['bad']},context),/입력/);
assert.throws(()=>evaluateCore('intDivide',{a:-2147483648,b:-1},context),/범위|출력/);assert.throws(()=>evaluateCore('intAdd',{a:2147483648,b:0},context),/입력/);
console.log(`새 공통 함수 ${libraryFunctions.length}개: 실제 C++ / 브라우저 결과·배열 타입·JSON 저장·오류 검사 통과`);
