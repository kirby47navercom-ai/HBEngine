import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareAuricSpawn} from './prepare-auric-spawn.mjs';

const engine=path.resolve(import.meta.dirname,'..'),original='C:/Users/kirby/OneDrive/바탕 화면/git/Auric_Loop',fixture=process.argv[2]?{out:path.resolve(process.argv[2])}:await prepareAuricSpawn(original),out=fixture.out;
const hash=b=>createHash('sha256').update(b).digest('hex'),expected='55e77b195642b74fc61d1646be3caff641309f87d7332e1f7a1f0063a2958de3';
const checked=await fs.realpath(out),workspace=await fs.realpath(path.join(engine,'native/build'));assert.ok(checked.startsWith(workspace+path.sep)&&path.basename(checked).startsWith('auric-spawn-'),'격리 생성 검사 복사본만 사용해요.');
async function inventory(directory,relative=''){const rows=[];for(const file of await fs.readdir(path.join(directory,relative),{withFileTypes:true})){if(file.isSymbolicLink()||['Builds','Saved','.git','Library'].includes(file.name))continue;const name=path.join(relative,file.name);if(file.isDirectory())rows.push(...await inventory(directory,name));else if(file.isFile())rows.push([name,hash(await fs.readFile(path.join(directory,name)))]);}return rows;}
const originalFiles=await inventory(path.join(original,'AuricLoop'));
const originalMode=process.argv.includes('--original'),checkerRoot=originalMode?original:out;
assert.equal(hash(await fs.readFile(path.join(original,'tools/check_demo.mjs'))),expected);assert.equal(hash(await fs.readFile(path.join(out,'tools/check_demo.mjs'))),expected);
const proof=await fs.mkdtemp(path.join(out,'checker-')),snapshot=path.join(proof,'Engine');await fs.mkdir(snapshot);for(const name of ['tools','prototype','native/include'])await fs.cp(path.join(engine,name),path.join(snapshot,name),{recursive:true});await fs.copyFile(path.join(engine,'package.json'),path.join(snapshot,'package.json'));await fs.symlink(path.join(engine,'node_modules'),path.join(snapshot,'node_modules'),'junction');await fs.symlink(path.join(engine,'native/build'),path.join(snapshot,'native/build'),'junction');
const snapshotFiles=await inventory(snapshot),snapshotHash=hash(JSON.stringify(snapshotFiles));
const temporary=path.join(proof,'Temp');await fs.mkdir(temporary);let output='';
const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(checkerRoot,'tools/check_demo.mjs')],{cwd:checkerRoot,env:{...process.env,HB_ENGINE:snapshot,HB_USER_DATA_DIR:path.join(proof,'UserData'),TEMP:temporary,TMP:temporary},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.once('error',reject);child.once('close',resolve);});
const sourcePreserved=JSON.stringify(originalFiles)===JSON.stringify(await inventory(path.join(original,'AuricLoop'))),snapshotPreserved=JSON.stringify(snapshotFiles)===JSON.stringify(await inventory(snapshot));
await fs.writeFile(path.join(proof,'source-inventory.json'),JSON.stringify({original:originalFiles,engine:snapshotFiles},null,2));await fs.writeFile(path.join(proof,'original-checker.log'),output);await fs.writeFile(path.join(proof,'acceptance.json'),JSON.stringify({passed:code===0&&sourcePreserved&&snapshotPreserved,code,originalCheckerHash:expected,fileCount:originalFiles.length,sourcePreserved,snapshotHash,snapshotPreserved,fixture:JSON.parse(await fs.readFile(path.join(out,'fixture.json'),'utf8'))},null,2));console.log(JSON.stringify({out,proof,code,passed:code===0&&sourcePreserved&&snapshotPreserved}));assert.ok(sourcePreserved,'원본 게임 파일 보존');assert.ok(snapshotPreserved,'고정 엔진 소스 보존');assert.equal(code,0,output);
