import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runTool,mobileCapability} from './mobile-android.mjs';
import {readProjectManifest} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {androidDevices} from './android-deploy.mjs';

const root=path.resolve(import.meta.dirname,'..');await fs.mkdir(path.join(root,'native/build'),{recursive:true});const out=await fs.mkdtemp(path.join(root,'native/build/android-mobile-')),proofAt=process.argv.indexOf('--proof'),proofFile=proofAt>=0?path.resolve(process.argv[proofAt+1]):path.join(out,'mobile-proof.json');
if(proofAt<0)await runTool(process.execPath,['tools/check-mobile-player.mjs'],{cwd:root,env:{...process.env,HB_MOBILE_PROOF_EXPORT:proofFile},timeout:300000,onOutput:text=>process.stdout.write(text)});
const proof=JSON.parse(await fs.readFile(proofFile,'utf8')),projectRoot=path.resolve(proof.output,'../../..');
assert.ok(projectRoot.startsWith(path.join(root,'native/build/mobile-player-')),'공용 검사가 만든 격리 프로젝트만 사용해요.');
const projectFile=(await fs.readdir(projectRoot)).find(name=>name.endsWith('.hbproject')),record=await readProjectManifest(path.join(projectRoot,projectFile));
assert.ok(record.root.startsWith(path.join(root,'native/build/mobile-player-')),'프로젝트 실제 경로도 격리 검사 안이어야 해요.');
const original=await Promise.all((await record.project.files()).filter(file=>file.kind!=='folder'&&!file.path.startsWith('Builds/')&&!file.path.startsWith('.hb')).map(async file=>[file.path,createHash('sha256').update(await fs.readFile(await record.project.resolve(file.path))).digest('hex')]));
const base={...defaultBuildProfile(record.manifest),target:'android',configuration:'development'},apkProfile={...base,id:'android-apk',mobile:{format:'apk',abis:['arm64-v8a','x86_64']}},aabProfile={...base,id:'android-aab',mobile:{format:'aab',abis:['arm64-v8a','x86_64']}};
const capability=await mobileCapability(aabProfile);assert.equal(capability.ready,true,capability.error);
const javaHome=process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-25':''),java=name=>javaHome?path.join(javaHome,'bin',name+(process.platform==='win32'?'.exe':'')):name;
let apk,aab;
try{
  apk=await buildGame(record,apkProfile,{onProgress:console.log});aab=await buildGame(record,aabProfile,{onProgress:console.log});
  for(const [build,type] of [[apk,'apk'],[aab,'aab']]){
    assert.equal(build.artifactType,type);assert.equal(build.nativeFiles.length,2);assert.ok(build.nativeFiles.every(file=>file.alignmentVerified));
    assert.equal(createHash('sha256').update(await fs.readFile(build.artifact)).digest('hex'),build.artifactSha256);
    const names=(await runTool(java('jar'),['tf',build.artifact])).split(/\r?\n/);
    for(const abi of ['arm64-v8a','x86_64'])assert.ok(names.includes((type==='aab'?'base/':'')+'lib/'+abi+'/libhbgame.so'));
    assert.ok(names.includes(type==='aab'?'base/dex/classes.dex':'classes.dex'));
    assert.ok(names.includes((type==='aab'?'base/':'')+'assets/prototype/mobile-player.js'));
    assert.ok(names.includes((type==='aab'?'base/':'')+'assets/Content/Assets/MobileVector.svg'));
    assert.equal(names.some(name=>name.endsWith('node.exe')||name.includes('tools/serve.mjs')),false);
    assert.deepEqual(await fs.readFile(path.join(build.output,'Android/java/com/hbengine/player/HBActivity.java')),await fs.readFile(path.join(root,'native/mobile/android/HBActivity.java')));
    const packed=JSON.parse(await fs.readFile(path.join(build.output,'Assets/game.hbpack.json'),'utf8'));assert.equal(packed.targetFrameRate,60);assert.equal(packed.framePacing,'display');
  }
  const packageId=(await runTool(java('java'),['-jar',path.join(capability.sdk,'bundletool.jar'),'dump','manifest','--bundle='+aab.artifact,'--xpath=/manifest/@package'])).trim().split(/\r?\n/).at(-1);assert.equal(packageId,aab.mobile.applicationId);
  for(const [name,hash] of original)assert.equal(createHash('sha256').update(await fs.readFile(await record.project.resolve(name))).digest('hex'),hash,'원본 보존: '+name);
  const devices=await androidDevices();
  await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify({ok:true,javaDexCompiled:true,jniCppCompiled:true,abis:['arm64-v8a','x86_64'],elf16KBAligned:true,apk,aab,sourcePreserved:true,devices,deviceInstalled:false,runtimeVerified:false},null,2));
  console.log('Android 실제 Java·DEX·JNI·C++ 두 CPU·16KB ELF·APK 정렬/서명·AAB 검증·원본 보존 통과: '+out);
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:error.message,apk,aab},null,2));throw error;}
