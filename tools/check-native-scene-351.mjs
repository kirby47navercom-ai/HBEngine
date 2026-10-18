// Resume the actual scene checks from a completed, private package. This avoids
// rebuilding the same C++ modules and assets when only the window runner failed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
import {packagedRuntimeBytes} from './packaged-runtime.mjs';
const packageDir=await fs.realpath(process.argv[2]||''),build=await fs.realpath('native/build'),rel=path.relative(build,packageDir);
assert.ok(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel),'개발 검사에서 생성한 패키지만 재사용해요.');
const transmissionOnly=process.argv.includes('--transmission-only'),coatingOnly=process.argv.includes('--coating-only');assert.ok(!(transmissionOnly&&coatingOnly),'검사 모드는 하나만 지정해요.');
const inside=p=>{const r=path.relative(packageDir,p);assert.ok(r&&!r.startsWith('..')&&!path.isAbsolute(r),'private package target escaped');};
const work=await fs.mkdtemp(path.join(build,'native-scene-351-'));retainTestEvidence(work);
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 const manifest=JSON.parse(await fs.readFile(path.join(packageDir,'game.hbpack.json'))),executable=await fs.realpath(path.join(packageDir,manifest.windowsApplication.executable));inside(executable);assert.ok((await fs.lstat(executable)).isFile());const requiredClass=transmissionOnly?'LightingDriver':coatingOnly?'CoatingDriver':'NativeScene';assert.ok(manifest.nativeModules.some(m=>m.metadata?.classes?.some(c=>c.name===requiredClass)),requiredClass+' C++ fixture가 필요해요.');
 for(const file of manifest.files){const relative=path.relative(packageDir,path.resolve(packageDir,file.path));assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));const target=await fs.realpath(path.join(packageDir,file.path));inside(target);assert.ok(!(await fs.lstat(path.join(packageDir,file.path))).isSymbolicLink());assert.equal(sha(await fs.readFile(target)),file.sha256,file.path);}
 const runtimePatches=[];
 if(process.argv.includes('--sync-runtime')){
  await fs.writeFile(path.join(work,'original-package-manifest.json'),JSON.stringify(manifest,null,2));
  for(const file of ['prototype/native-scene-renderer.js','prototype/reflection-probes.js']){const entry=manifest.files.find(e=>e.path===file);assert.ok(entry,file);const bytes=await packagedRuntimeBytes(path.resolve(file)),next=sha(bytes);if(entry.sha256!==next){runtimePatches.push({path:file,before:entry.sha256,after:next,bytes:bytes.length});const target=await fs.realpath(path.join(packageDir,file));inside(target);assert.ok(!(await fs.lstat(path.join(packageDir,file))).isSymbolicLink());await fs.writeFile(target,bytes);Object.assign(entry,{sha256:next,bytes:bytes.length});}}
  await fs.writeFile(path.join(packageDir,'game.hbpack.json'),JSON.stringify(manifest,null,2));await fs.writeFile(path.join(work,'runtime-patches.json'),JSON.stringify(runtimePatches,null,2));
 }
 const original=await fs.readFile('tools/check-native-scene-window.mjs','utf8'),start=original.indexOf('const transmissionOnly='),tail=original.indexOf('const reservation=');assert.ok(start>0&&tail>start);
 const imports=original.slice(0,start).replace(/from '(\.{1,2}\/[^']+)'/g,(_,value)=>'from '+JSON.stringify(pathToFileURL(path.resolve('tools',value)).href));
 const replay=imports+'\nconst sleep=ms=>new Promise(r=>setTimeout(r,ms)),transmissionOnly='+transmissionOnly+',coatingOnly='+coatingOnly+',work='+JSON.stringify(work)+',project={manifest:'+JSON.stringify({startupScene:manifest.startupScene})+'},built={executable:'+JSON.stringify(executable)+'};\n'+original.slice(tail);
 const file=path.join(work,'replay.mjs');await fs.writeFile(file,replay);await import(pathToFileURL(file));
 const report=JSON.parse(await fs.readFile(path.join(work,'acceptance.json')));assert.equal(report.passed,true);report.preparedPackage={directory:packageDir,verifiedFiles:manifest.files.length,playerSHA256:sha(await fs.readFile(executable)),runnerSHA256:sha(Buffer.from(original)),transmissionOnly,coatingOnly,flags:process.argv.slice(3),runtimePatches,scope:'Full scene checks resumed from the verified private package. Optional runtime sync uses the ordinary packaging reader and updates the owned fixture manifest; C++ and assets are not rebuilt.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({work,passed:true,preparedFiles:manifest.files.length}));
}catch(error){await fs.writeFile(path.join(work,'resume-failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{await pruneTestArtifacts(work);}
