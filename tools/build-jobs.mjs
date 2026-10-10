import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readBuildProfiles,saveBuildProfiles,buildGame} from './build-game.mjs';
import {androidDevices,deployAndroid} from './android-deploy.mjs';
import {prepareAndroid} from './prepare-android.mjs';
import {startWebServer} from './web-server.mjs';
import {prepareWeb} from './prepare-web.mjs';
export class BuildJobs{
  constructor(){this.jobs=new Map();this.queue=Promise.resolve();}
  async prepareWebTools(record){
    if([...this.jobs.values()].some(j=>j.status==='running'))throw Error('진행 중인 빌드가 끝난 뒤 도구를 준비하세요.');
    const id=randomUUID(),controller=new AbortController(),job={id,root:record.root,kind:'web-tools',status:'running',stage:'웹 C++ 도구 준비',controller};this.jobs.set(id,job);
    prepareWeb({signal:controller.signal,onProgress:stage=>{job.stage=stage;}}).then(result=>{job.result=result;job.status='done';},error=>{job.error=error.message;job.status=controller.signal.aborted?'canceled':'error';});return this.get(record,id);
  }
  async prepareTools(record,{acceptLicense=false}={}){
    if(acceptLicense!==true)throw Error('Google Android SDK 이용약관에 직접 동의해야 해요.');
    if([...this.jobs.values()].some(j=>j.status==='running'))throw Error('진행 중인 빌드가 끝난 뒤 도구를 준비하세요.');
    const id=randomUUID(),controller=new AbortController(),job={id,root:record.root,kind:'android-tools',status:'running',stage:'Android 도구 준비',startedAt:new Date().toISOString(),controller};this.jobs.set(id,job);
    prepareAndroid({acceptLicense,signal:controller.signal,onProgress:stage=>{job.stage=stage;}}).then(result=>{job.result=result;job.status='done';},error=>{job.error=error.message;job.status=controller.signal.aborted?'canceled':'error';}).finally(()=>{job.finishedAt=new Date().toISOString();});return this.get(record,id);
  }
  save(record,data,revision,checkOwner=()=>{}){const task=this.queue.then(()=>{checkOwner();return saveBuildProfiles(record,data,revision,checkOwner);});this.queue=task.catch(()=>{});return task;}
  async start(record,{profileId,expectedRevision,dryRun=false}={}){await this.queue;const settings=await readBuildProfiles(record);if(settings.revision!==expectedRevision)throw Error('빌드 프로필이 변경됐어요. 다시 읽으세요.');const profile=settings.profiles.find(p=>p.id===profileId);if(!profile)throw Error('빌드 프로필이 없어요.');if([...this.jobs.values()].some(j=>j.status==='running'&&(j.root===record.root||j.kind==='android-tools')))throw Error('이 프로젝트를 빌드 중이에요.');const id=randomUUID(),controller=new AbortController(),job={id,root:record.root,profileId,status:'running',stage:'검증',startedAt:new Date().toISOString(),controller};this.jobs.set(id,job);
    buildGame(record,profile,{dryRun,signal:controller.signal,onProgress:stage=>{job.stage=stage;}}).then(result=>{job.result=result;job.status='done';},error=>{job.error=error.message;job.status=controller.signal.aborted?'canceled':'error';}).finally(()=>{job.finishedAt=new Date().toISOString();});for(const [key,value] of this.jobs)if(this.jobs.size>50&&value.status!=='running')this.jobs.delete(key);return this.get(record,id);}
  get(record,id){const job=this.jobs.get(id);if(!job||job.root!==record.root)throw Error('빌드 기록이 없어요.');const {controller,root,...data}=job;return data;}
  cancel(record,id){const job=this.jobs.get(id);this.get(record,id);if(job.status==='running')job.controller.abort(Error('사용자가 빌드를 취소했어요.'));return this.get(record,id);}
  devices(){return androidDevices();}
  async deploy(record,id,serial){
    const job=this.jobs.get(id),snapshot=this.get(record,id);if(snapshot.status!=='done'||snapshot.result?.artifactType!=='apk'||job.deploying)throw Error('설치할 완료 APK 빌드를 선택하세요.');
    const file=await fs.realpath(snapshot.result.artifact),base=await fs.realpath(path.join(record.root,'Builds')),root=await fs.realpath(record.root);if(!base.toLowerCase().startsWith((root+path.sep).toLowerCase())||!file.toLowerCase().startsWith((base+path.sep).toLowerCase())||path.basename(file)!=='Game.apk')throw Error('APK 빌드 경로 오류');
    job.deploying=true;try{const result=await deployAndroid(snapshot.result,serial);job.deployment=result;await fs.writeFile(path.join(snapshot.result.output,'deploy-report.json'),JSON.stringify(result,null,2));return result;}finally{job.deploying=false;}
  }
  async open(record,id,action){
    if(!['run','reveal'].includes(action))throw Error('빌드 동작 오류');const job=this.get(record,id);if(job.status!=='done'||!job.result?.executable&&!job.result?.artifact)throw Error('완료된 게임 빌드가 없어요.');
    if(job.result.artifactType==='web'){
      const file=await fs.realpath(job.result.artifact),base=await fs.realpath(path.join(record.root,'Builds')),root=await fs.realpath(record.root);
      if(!base.toLowerCase().startsWith((root+path.sep).toLowerCase())||!file.toLowerCase().startsWith((base+path.sep).toLowerCase())||path.basename(file)!=='index.html')throw Error('웹 빌드 경로 오류');
      const item=this.jobs.get(id);if(action==='run'){item.webServerPromise??=startWebServer(path.dirname(file));item.webServer=await item.webServerPromise;if(this.closed)throw Error('편집기가 종료됐어요.');}
      const args=action==='run'?[item.webServer.url]:[path.dirname(file)];
      await new Promise((resolve,reject)=>{const child=spawn(path.join(process.env.SystemRoot,'explorer.exe'),args,{stdio:'ignore',detached:true,windowsHide:true});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});return {ok:true,action,url:item.webServer?.url};
    }
    if(action==='run'&&!job.result.executable)throw Error('모바일 앱은 휴대폰에 설치하거나 Mac의 Xcode에서 실행하세요.');
    const exe=await fs.realpath(job.result.executable||job.result.artifact),base=await fs.realpath(path.join(record.root,'Builds')),root=await fs.realpath(record.root);if(!base.toLowerCase().startsWith((root+path.sep).toLowerCase())||!exe.toLowerCase().startsWith((base+path.sep).toLowerCase())||!(job.result.executable?path.basename(exe)==='Game.exe':['Game.apk','Game.aab','HBGame.xcodeproj'].includes(path.basename(exe))))throw Error('빌드 경로 오류');
    const env={...process.env};for(const key of ['PORT','HB_USER_DATA_DIR','HB_PROJECT_FILE','HB_PROJECT_DIR','HB_READY_FILE','HB_PLAYER_SMOKE'])delete env[key];
    const program=action==='run'?exe:path.join(process.env.SystemRoot,'explorer.exe'),args=action==='run'?[]:[path.dirname(exe)];
    await new Promise((resolve,reject)=>{const child=spawn(program,args,{cwd:path.dirname(exe),env,shell:false,detached:true,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});return {ok:true,action};
  }
  close(){this.closed=true;for(const job of this.jobs.values()){if(job.status==='running')job.controller.abort(Error('편집기가 종료됐어요.'));job.webServerPromise?.then(server=>server.close()).catch(()=>{});}}
}
