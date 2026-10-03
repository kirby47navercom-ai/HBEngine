import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProject} from './project-manifest.mjs';
import {readBuildProfiles,saveBuildProfiles} from './build-game.mjs';
import {BuildJobs} from './build-jobs.mjs';
import {BuildPanel} from '../prototype/build-panel.js';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/build-profiles-'));
const record=await createProject('프로필 검증',dir,'2d');
const initial=await readBuildProfiles(record),modified=structuredClone(initial);modified.profiles[0].name='수정';
let checks=0;
await assert.rejects(saveBuildProfiles(record,modified,initial.revision,()=>{if(++checks===2)throw Error('프로젝트 변경');}),/프로젝트 변경/);
assert.equal((await readBuildProfiles(record)).revision,initial.revision);

const jobs=new BuildJobs(),outside=path.join(dir,'outside-build');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'Game.exe'),'never execute this fixture');
await fs.symlink(outside,path.join(record.root,'Builds'),process.platform==='win32'?'junction':'dir');
jobs.jobs.set('escape',{id:'escape',root:record.root,status:'done',result:{executable:path.join(record.root,'Builds/Game.exe')}});
await assert.rejects(jobs.open(record,'escape','run'),/빌드 경로/);
assert.deepEqual((await fs.readdir(path.join(record.root,'Settings'))).filter(f=>f.endsWith('.tmp')),[]);
let unlock;const gate=new Promise(resolve=>{unlock=resolve;});jobs.queue=gate;
let switched=false;const saving=jobs.save(record,modified,initial.revision,()=>{if(switched)throw Error('프로젝트 변경');});
switched=true;unlock();await assert.rejects(saving,/프로젝트 변경/);
assert.equal((await readBuildProfiles(record)).revision,initial.revision);

// Hold a real panel save response while another edit and save arrive.
const panel=Object.create(BuildPanel.prototype),label={textContent:''},requests=[];
Object.assign(panel,{data:structuredClone(initial),dirty:true,element:{querySelector:()=>label},request:(_url,data)=>new Promise(resolve=>requests.push({data,resolve}))});
panel.data.profiles[0].name='첫 편집';const first=panel.save();await Promise.resolve();
panel.data.profiles[0].name='후속 편집';const second=panel.save();
assert.equal(requests.length,1);requests[0].resolve({...initial,revision:'saved-first',profiles:requests[0].data.profiles});await first;
assert.equal(panel.data.profiles[0].name,'후속 편집');assert.equal(panel.dirty,true);assert.equal(label.textContent,'저장하지 않은 변경');
await Promise.resolve();assert.equal(requests.length,2);assert.equal(requests[1].data.expectedRevision,'saved-first');
requests[1].resolve({...initial,revision:'saved-second',profiles:requests[1].data.profiles});await second;
assert.equal(panel.dirty,false);assert.equal(panel.data.profiles[0].name,'후속 편집');assert.equal(panel.data.revision,'saved-second');
panel.request=async()=>{throw Error('revision 충돌');};panel.data.profiles[0].name='보존';panel.dirty=true;
await assert.rejects(panel.save(),/revision 충돌/);assert.equal(panel.data.profiles[0].name,'보존');assert.equal(panel.dirty,true);
jobs.close();console.log('Build profiles: queued project switch, atomic cleanup, output junction rejection, in-flight edits, serialized revision and save failure preservation passed.');
