import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProject} from './project-manifest.mjs';
import {buildGame,readBuildProfiles} from './build-game.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[],'사용 중인 설치본이 있어 검사를 미뤄요.');
const work=await fs.mkdtemp(path.resolve('native/build/shader-cache-window-350-'));retainTestEvidence(work);
const sha=b=>createHash('sha256').update(b).digest('hex'),arg=process.argv.indexOf('--executable'),installed=arg<0?null:path.dirname(path.resolve(process.argv[arg+1])),owners=['native/desktop/HBEngine.cpp','native/desktop/SceneRenderBridge.hpp','native/include/HBEngine/ShaderBytecodeCompiler.hpp','native/include/HBEngine/ShaderBytecodeDiskCache.hpp','prototype/native-scene-renderer.js','prototype/game-renderer.js'];
let probe;
try{
 const checkedFiles=Object.fromEntries(await Promise.all(owners.map(async p=>[p,sha(await fs.readFile(p))])));
 const playerSHA=sha(await fs.readFile('dist/HBEngine/HBPlayer.exe'));if(installed){assert.equal(sha(await fs.readFile(path.join(installed,'HBPlayer.exe'))),playerSHA);for(const[p,h]of Object.entries(checkedFiles))assert.equal(sha(await fs.readFile(path.join(installed,p))),h,p);}
 const record=await createProject('ShaderCache350',work,'2d');
 const profile=(await readBuildProfiles(record)).profiles[0];Object.assign(profile,{windowsRenderer:'d3d11',configuration:'development',width:320,height:240});const built=await buildGame(record,profile),rows=[];
 for(const cycle of ['cold','warm']){
  if(cycle==='warm')await fs.unlink(path.join(work,'shell.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});
  probe=await editorWindowProbe({work,mode:'player',executable:built.executable});await probe.until(()=>probe.evaluate('window.hbPlayerDebug?.ready?.()'),'game ready');
  await probe.evaluate('window.hbPlayerDebug.captureAsync()');
  const info=await probe.until(async()=>{const value=await probe.evaluate('window.hbPlayerDebug.inspect()?.renderer');return value?.shaderDiskCache?.configured&&(cycle==='cold'?value.shaderDiskCache.writes>0:value.shaderDiskCache.hits>0)?value:null;},'native disk diagnostics');
  assert.equal(info.backend,'D3D11');assert.equal(info.shaderDiskCache.errors,0);assert.equal(info.shaderDiskCache.invalid,0);assert.ok(info.shaderDiskCache.lastScannedBytes<=info.shaderDiskCache.budgetBytes);if(cycle==='warm')assert.equal(info.shaderDiskCache.writes,0);
  const observed=[];for(let n=0;n<3;++n)observed.push((await probe.evaluate('window.hbPlayerDebug.inspect()?.renderer')).shaderDiskCache);assert.ok(observed.every(d=>JSON.stringify(d)===JSON.stringify(info.shaderDiskCache)));
  await probe.capture(cycle+'.png');rows.push({cycle,disk:info.shaderDiskCache,screen:info.shaderCompilation,cacheCountersStable:true,exit:await probe.finish()});probe=null;
 }
 const cache=path.join(work,'UserData/Cache/ShaderBytecode'),files=await fs.readdir(cache),bytes=(await Promise.all(files.filter(n=>n.endsWith('.hbsbc')).map(n=>fs.stat(path.join(cache,n)).then(s=>s.size)))).reduce((a,b)=>a+b,0);assert.ok(bytes>0&&bytes<=8388608);
 const result={passed:true,rows,checkedFiles,playerSHA256:playerSHA,installedDirectory:installed,cache:{private:true,bytes,budgetBytes:8388608},scope:'Two separate actual packaged D3D11 game processes with one private profile/cache. Optional installed flag proves exact installed runtime owners and base player bytes match the packaged source; package PE metadata is stamped by the ordinary build pipeline. No user profile, foreground UI, FPS or whole-engine completion claim.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;}finally{await probe?.stop();await pruneTestArtifacts(work);}
