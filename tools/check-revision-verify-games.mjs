// Gate for trusting revisions (docs/CHANGE_TRACKING_DESIGN.md): every project template, packaged and run in
// revision verify mode, must report no value change that skipped its revision announcement.
// node tools/check-revision-verify-games.mjs [frames=600] [templates=shooter2d,gameplay2d,garden,2d,3d]
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {retainTestEvidence} from './test-artifacts.mjs';
import {activeInstalledVersions} from './install-editor.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const frames=Number(process.argv[2]||600),templates=(process.argv[3]||'shooter2d,gameplay2d,garden,2d,3d').split(',');
const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/revision-verify-'));retainTestEvidence(work);
await fs.mkdir(path.join(work,'Temp'),{recursive:true});
const rows=[];
for(const template of templates){
 const record=await createProject('리비전 검증 '+template,path.join(work,template),template),built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360});
 const reports=path.join(work,'reports-'+template),report=path.join(work,'run-'+template+'.json');await fs.mkdir(reports,{recursive:true});
 const env={SystemRoot:process.env.SystemRoot||'C:/Windows',WINDIR:process.env.WINDIR||'C:/Windows',PATH:(process.env.SystemRoot||'C:/Windows')+'/System32',TEMP:path.join(work,'Temp'),TMP:path.join(work,'Temp'),LOCALAPPDATA:path.join(work,'User-'+template),APPDATA:path.join(work,'User-'+template,'Roaming'),HB_NATIVE_TEST_STATE:path.join(work,'State-'+template),HB_VERIFY_REVISIONS:'1',HB_REVISION_REPORT_DIR:reports};
 const child=spawn(built.executable,['--hidden','--silent','--uncapped','--frames',String(frames),'--report',report,'--graphics-api','d3d12'],{windowsHide:true,env});let stderr='';child.stderr.on('data',b=>stderr+=b);
 const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error(template+' timeout'));},600000);child.once('error',reject);child.once('close',c=>{clearTimeout(timer);resolve(c);});});
 assert.equal(code,0,template+' '+stderr+await fs.readFile(path.join(work,'State-'+template,'native-runtime.log'),'utf8').catch(()=>''));
 const files=await fs.readdir(reports);assert(files.length>0,template+' wrote a revision report');
 const mismatches=(await Promise.all(files.map(async f=>JSON.parse(await fs.readFile(path.join(reports,f),'utf8')).mismatches))).flat();
 const result=JSON.parse(await fs.readFile(report,'utf8'));rows.push({template,frames:result.frames,mismatches:mismatches.length,sample:mismatches.slice(0,5)});console.log(JSON.stringify(rows.at(-1)));
}
const failed=rows.filter(r=>r.mismatches);
await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:!failed.length,frames,rows,scope:'Packaged template games in revision verify mode; physics static collider check only.'},null,2));
assert.equal(failed.length,0,'unannounced writes: '+JSON.stringify(failed));
console.log(JSON.stringify({passed:true,templates:rows.length,frames}));
