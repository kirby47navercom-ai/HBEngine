import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {prepareAuricFeatures} from './prepare-auric-features.mjs';
import {prepareAuricProjectiles} from './prepare-auric-projectiles.mjs';
import {prepareAuricSpawnProbe} from './prepare-auric-spawn-probe.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/auric-features-batch-')),rows=[];
async function step(name,args){const log=path.join(work,name+'.log'),output=await fs.open(log,'w'),started=Date.now();console.log('통합 검사 시작: '+name);const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore',output.fd,output.fd],env:{...process.env,HB_ANDROID_PROOF_CORES:'4',HB_ANDROID_PROOF_GPU:'host'}});child.once('error',reject);child.once('close',resolve);});await output.close();rows.push({name,code,seconds:(Date.now()-started)/1000,log});await fs.writeFile(path.join(work,'progress.json'),JSON.stringify({work,fixture:fixture?.out,rows},null,2));console.log(name+': '+(code===0?'PASS':'FAIL')+' / '+log);return code===0;}
let fixture;const previous=process.argv[2]&&process.argv[2]!=='--fresh'?JSON.parse(await fs.readFile(path.resolve(process.argv[2]),'utf8')):null;
await step('generate-api',['tools/generate-api.mjs']);
fixture=process.argv[3]?{out:path.resolve(process.argv[3])}:await prepareAuricFeatures('C:/Users/kirby/OneDrive/바탕 화면/git/Auric_Loop');if(!process.argv[3])await prepareAuricProjectiles(fixture.out);await prepareAuricSpawnProbe(fixture.out);await fs.writeFile(path.join(work,'fixture.json'),JSON.stringify(fixture,null,2));console.log('격리 Auric: '+fixture.out);
for(const [name,args] of [
 ['features',['tools/check-runtime-features.mjs']],
 ['asset-cache',['tools/check-asset-cache.mjs']],
 ['actor-pool',['tools/check-actor-pool.mjs']],
 ['native-spawn',['tools/check-native-spawn.mjs']],
 ['native-frame',['tools/check-native-frame.mjs']],
 ['state-native-batch',['tools/check-state-native-batch.mjs']],
 ['behavior-native-batch',['tools/check-behavior-native-batch.mjs']],
 ['native-profiler',['tools/check-profiler-native.mjs']],
 ['state-hierarchy',['tools/check-state-hierarchy.mjs']],
 ['animation-notify',['tools/check-animation-notify-policy.mjs']],
 ['player-lifecycle',['tools/check-player-lifecycle.mjs']],
 ['environment',['tools/check-environment-actors.mjs']],
 ['2d-extensions',['tools/check-2d-extensions.mjs']],
 ['runtime',['tools/check-runtime.mjs']],
 ['input',['tools/check-runtime-input.mjs']],
 ['ui-audio',['tools/check-ui-audio.mjs']],
 ['audio-sources',['tools/check-audio-sources.mjs']],
 ['buffered-audio',['tools/check-buffered-audio.mjs']],
 ['ui-layout',['tools/check-ui-layout.mjs']],
 ['scene-runtime',['tools/check-scene-runtime.mjs']],
 ['inheritance',['tools/check-blueprint-inheritance.mjs','--cpp']],
 ['native',['tools/check-native.mjs']],
 ['mobile-aot',['tools/check-mobile-player.mjs']],
 ['auric-headless',['tools/check-auric-features-headless.mjs',fixture.out]],
 ['auric-nine',['tools/check-auric-spawn.mjs',fixture.out]],
 ['desktop-build',['tools/build-desktop.mjs']],
]){if(!previous?.rows.some(r=>r.name===name&&r.code===0)||name==='desktop-build')await step(name,args);else rows.push({...previous.rows.find(r=>r.name===name),preservedEvidence:true});}
if(rows.every(r=>r.code===0))for(const [name,args] of [
 ['2d-effects-player',['tools/check-2d-effects-window.mjs']],
 ['auric-player',['tools/check-auric-features-window.mjs',fixture.out]],
 ['auric-editor',['tools/check-auric-features-editor.mjs',fixture.out]],
 ['auric-android',['tools/check-auric-spawn-android.mjs',fixture.out]],
])await step(name,args);
const passed=rows.every(r=>r.code===0)&&rows.some(r=>r.name==='auric-android');await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({work,fixture:fixture.out,passed,rows},null,2));console.log(JSON.stringify({work,fixture:fixture.out,passed}));process.exitCode=passed?0:1;
