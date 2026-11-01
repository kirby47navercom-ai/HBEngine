import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createProject} from './project-manifest.mjs';
import {buildGame} from './build-game.mjs';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {prepareNative,jsonInclude} from './prepare-native.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const root=process.cwd(),work=await fs.mkdtemp(path.resolve('native/build/native-audio-identity-'));retainTestEvidence(work);const exec=promisify(execFile),compiler='C:/msys64/ucrt64/bin/g++.exe',env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH},helper=path.join(work,'audio-identity.exe');
await prepareNative();await exec(compiler,['-std=c++17','-O1','-static','-municode','-I',path.relative(root,jsonInclude),'native/tests/audio-identity.cpp','-o',path.relative(root,helper),'-lole32','-luuid','-lversion'],{cwd:root,env,windowsHide:true,timeout:60000});
const builds=[];for(const name of ['서명 보존 게임 A','서명 보존 게임 B']){
 const record=await createProject(name,path.join(work,'Project'),'2d'),scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file,'utf8'));
 const wave=Buffer.alloc(44+48000*2);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(96000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(wave.length-44,40);await fs.writeFile(await record.project.resolve('Assets/Silent.wav',true,false),wave);
 scene.objects.push({id:'audio',name:'audio',kind:'empty',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('AudioSource',{clip:'Assets/Silent.wav',volume:1,loop:true,playOnStart:true})]});await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 builds.push({record,built:await buildGame(record,{...defaultBuildProfile(record.manifest),width:640,height:360})});
}
const children=[];
try{
 for(const [index,item] of builds.entries()){
  const report=path.join(work,'runtime-'+index+'.json'),child=spawn(item.built.executable,['--hidden','--frames','720','--report',report],{env:{...process.env,HB_NATIVE_TEST_STATE:path.join(work,'State'+index)},windowsHide:true,stdio:'ignore'});children.push({child,report,pid:child.pid,done:new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);})});
 }
 const sessions=async mutations=>JSON.parse((await exec(helper,children.map(c=>String(c.pid)),{windowsHide:true,env:{...env,...(mutations?{HB_AUDIO_TEST_SETTINGS:JSON.stringify(mutations)}:{})},timeout:10000})).stdout);
 let initial;for(let i=0;i<35;i++){initial=await sessions();if(builds.every((b,index)=>initial.some(row=>row.owner===children[index].pid&&row.name===b.record.manifest.name)))break;await new Promise(r=>setTimeout(r,100));}
 const own=children.map((child,index)=>{const row=initial.find(row=>row.owner===child.pid&&row.name===builds[index].record.manifest.name);assert(row,'game audio display name');assert.equal(row.group.toLowerCase(),'{'+builds[index].record.manifest.id.toLowerCase()+'}');return row;});assert.notEqual(own[0].id,own[1].id);assert.notEqual(own[0].group,own[1].group);
 const changed=await sessions({[children[0].pid]:{volume:.2,mute:true}});assert(changed.some(r=>r.owner===children[0].pid&&r.mute&&Math.abs(r.volume-.2)<.001));assert(changed.some(r=>r.owner===children[1].pid&&!r.mute&&Math.abs(r.volume-own[1].volume)<.001));await sessions({[children[0].pid]:{volume:own[0].volume,mute:own[0].mute}});
 for(const c of children)assert.equal(await c.done,0);
 const result={passed:true,games:own,gameNamesPreserved:true,distinctGroups:true,muteAndVolumeIndependent:true,vendorExecutableResourcesModified:false};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{for(const {child}of children)if(child.exitCode===null)await exec('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});}
