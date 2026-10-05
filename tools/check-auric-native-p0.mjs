import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..'),directory=path.resolve(process.argv[2]||''),workspace=await fs.realpath(path.join(root,'native/build')),actual=await fs.realpath(directory);
if(!actual.startsWith(workspace+path.sep)||!path.basename(actual).startsWith('auric-native-p0-'))throw Error('준비한 격리 Auric P0 폴더를 지정하세요.');
const fixture=JSON.parse(await fs.readFile(path.join(actual,'fixture.json'),'utf8')),temporary=path.join(actual,'test-temp');await fs.mkdir(temporary,{recursive:true});
// The game uses TEMP files for its existing handoff workaround. Keep them local
// until P0-5 replaces that mechanism; never share the user's game/save files.
process.env.TEMP=temporary;process.env.TMP=temporary;process.env.AURIC_MUTE='1';
const {runProject}=await import('./run-project.mjs');
const report={version:1,fixture:actual,classes:false,demo:false,headlessPerformance:false,editorPerformance:false,playerPerformance:false,androidPerformance:false};
try{
 const result=await runProject(fixture.project,{scene:fixture.scenes.classes,frames:3,onFrame:(frame,vm)=>{if(frame<2)vm.objects.find(o=>o.id==='P0_Same').poolActive=frame!==0;}}),probe=result.objects.find(o=>o.id==='P0_Probe').nativeProperties;
 assert.equal(probe.Seen,7.25);assert.equal(probe.ForeignSeen,7.25);assert.equal(probe.Same,true);assert.equal(probe.Checks,3);assert.equal(result.objects.find(o=>o.id==='P0_Same').nativeProperties.MaxHp,8.25);assert.equal(result.objects.find(o=>o.id==='P0_Foreign').nativeProperties.MaxHp,7.75);report.classes=true;report.classProperties=probe;
 const demo=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(actual,'tools/check_demo.mjs')],{cwd:root,windowsHide:true,env:{...process.env,HB_ENGINE:root},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);child.once('error',reject);child.once('exit',async code=>{await fs.writeFile(path.join(actual,'candidate-demo.log'),output);code===0?resolve(output):reject(Error('Auric 9개 검사 실패: candidate-demo.log'));});});
 const baseline=await fs.readFile(path.join(fixture.snapshot,'baseline-installed-demo.log'),'utf8');assert.equal(demo.replaceAll('\r\n','\n').trim(),baseline.replaceAll('\r\n','\n').trim(),'all nine original numeric outputs must match the installed baseline');report.demo=true;
 if(process.argv.includes('--performance')){
  const samples=[];for(const phase of ['baseline','batch','batch','baseline']){let nativeMs=0,rpcs=0,completed=0;const started=performance.now(),result=await runProject(fixture.project,{scene:fixture.scenes[phase],frames:600,onFrame:(frame,vm)=>{if(frame===0){const original=vm.hooks.native;vm.hooks.native=async request=>{const at=performance.now();const result=await original(request);nativeMs+=performance.now()-at;rpcs++;completed+=result.results?.length??1;return result;};}}});
   if(phase==='batch')assert.ok(result.objects.filter(o=>o.id.startsWith('P0_Stats_')).every(o=>o.nativeProperties.Ticks===600));samples.push({phase,totalMs:performance.now()-started,nativeMs,rpcs,completed,frames:600});}
  const average=(phase,key)=>samples.filter(s=>s.phase===phase).reduce((sum,s)=>sum+s[key],0)/2;report.samples=samples;report.headlessRatio=average('batch','totalMs')/average('baseline','totalMs');report.nativeAdditionalMsPerFrame=(average('batch','nativeMs')-average('baseline','nativeMs'))/599;assert.ok(report.headlessRatio<=1.5,'600-frame headless runtime exceeds the 1.5× gate');report.headlessPerformance=true;
 }
 console.log(JSON.stringify(report,null,2));
}catch(error){report.error=error.message;throw error;}finally{await fs.writeFile(path.join(actual,'acceptance.json'),JSON.stringify(report,null,2)+'\n');}
