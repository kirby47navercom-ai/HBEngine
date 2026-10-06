import assert from 'node:assert/strict';
import {mock} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mobileDefaults} from '../prototype/build-profile.js';

const work=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/android-deploy-'));
const artifact=path.join(work,'Game.apk'),bytes=Buffer.from('isolated deployment contract');await fs.writeFile(artifact,bytes);
const build={target:'android',artifactType:'apk',artifact,artifactSha256:createHash('sha256').update(bytes).digest('hex'),mobile:{...mobileDefaults,abis:['x86_64']},profile:{configuration:'development'},startupScene:'Assets/Test.hbscene.json'};
const serial='emulator-5554',env={...process.env,ADB_SERVER_SOCKET:'tcp:127.0.0.1:43219'},calls=[];let respond,clock=0;
mock.module(new URL('./mobile-android.mjs',import.meta.url).href,{namedExports:{androidSdk:()=>work,runTool:async(program,args,options)=>{
  assert.equal(options.env,env);assert.ok(options.timeout>0);calls.push({args,timeout:options.timeout});
  if(args[0]==='devices')return 'List of devices attached\n'+serial+' device model:isolated\n';
  assert.deepEqual(args.slice(0,2),['-s',serial]);const command=args.slice(2);
  if(command.join(' ')==='shell getprop ro.product.cpu.abilist')return 'x86_64';
  if(command.join(' ')==='shell getprop ro.build.version.sdk')return '36';
  if(command[0]==='install')return 'Success';
  if(command[0]==='shell'&&command[1]==='am')return 'Status: ok';
  if(command[0]==='shell'&&command[1]==='pidof')return '1959';
  assert.ok(options.timeout<=4000,'Runtime probes must fit the remaining 15-second deadline.');return respond(command,options);
}}});
const {deployAndroid}=await import('./android-deploy.mjs'),report={ok:true,frames:10,scene:build.startupScene};
const results=[];
try{
  respond=()=>JSON.stringify(report);let r=await deployAndroid(build,serial,{env});assert.equal(r.runtimeReady,true);assert.equal(r.runtimeProbeError,null);assert.equal(calls.filter(c=>c.args.includes('logcat')).length,0);results.push('ready file skips logcat');
  calls.length=0;respond=()=>JSON.stringify({...report,ok:false,error:'real runtime failure'});r=await deployAndroid(build,serial,{env});assert.equal(r.runtimeReady,false);assert.equal(r.runtimeReport.error,'real runtime failure');assert.equal(calls.filter(c=>c.args.includes('logcat')).length,0);results.push('runtime error preserved');
  calls.length=0;respond=command=>{if(command[0]==='shell')throw Error('file unavailable');assert.ok(command.includes('-t')&&command.includes('200'));return 'I HBPlayer: REPORT '+JSON.stringify(report);};r=await deployAndroid(build,serial,{env});assert.equal(r.runtimeReady,true);assert.equal(r.runtimeProbeError,null);results.push('bounded log fallback');
  calls.length=0;const previousNow=Date.now;Date.now=()=>clock;
  try{respond=(command,options)=>{clock+=options.timeout;throw Error('stalled adb');};r=await deployAndroid(build,serial,{env});}finally{Date.now=previousNow;}
  assert.equal(r.runtimeReady,false);assert.equal(r.runtimeReport,null);assert.equal(r.runtimeProbeError,'stalled adb');assert.equal(clock,15000);assert.deepEqual(calls.filter(c=>c.timeout<=4000).map(c=>c.timeout),[4000,4000,4000,3000]);results.push('stalled adb returns unready within total budget');
  calls.length=0;respond=()=>JSON.stringify({...report,scene:'Assets/Old.hbscene.json'});r=await deployAndroid({...build,profile:{configuration:'release'}},serial,{env});assert.equal(r.runtimeReady,false);assert.equal(calls.filter(c=>c.args.includes('run-as')).length,0);results.push('wrong scene never ready');
  calls.length=0;const controller=new AbortController();respond=()=>{controller.abort();throw Error('aborted');};await assert.rejects(deployAndroid(build,serial,{env,signal:controller.signal}),{name:'AbortError'});results.push('abort preserved');
  calls.length=0;await fs.writeFile(artifact,'changed');await assert.rejects(deployAndroid(build,serial,{env}),/설치 APK/);assert.equal(calls.some(c=>c.args.includes('install')),false);results.push('APK hash verified before install');
  await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({work,passed:true,results}));
}finally{mock.restoreAll();}
