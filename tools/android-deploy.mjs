import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {androidSdk,runTool} from './mobile-android.mjs';

const serialValid=serial=>typeof serial==='string'&&serial.length<=200&&/^[a-zA-Z0-9_.:-]+$/.test(serial);
const adb=()=>path.join(androidSdk(),'platform-tools','adb'+(process.platform==='win32'?'.exe':''));
export async function androidDevices(){
  const output=await runTool(adb(),['devices','-l'],{timeout:15000});return output.split(/\r?\n/).map(line=>{
    const match=/^([^\s]+)\s+(device|unauthorized|offline)(?:\s+(.*))?$/.exec(line);if(!match||!serialValid(match[1]))return null;
    const fields=Object.fromEntries((match[3]||'').split(/\s+/).map(p=>p.split(':')).filter(p=>p.length===2));return {serial:match[1],state:match[2],model:fields.model||match[1]};
  }).filter(Boolean);
}
export async function deployAndroid(build,serial,{signal,onProgress=()=>{}}={}){
  if(!serialValid(serial)||build.artifactType!=='apk'||build.target!=='android'||!build.artifact||!build.artifactSha256)throw Error('설치할 APK와 Android 기기를 선택하세요.');
  const device=(await androidDevices()).find(d=>d.serial===serial);if(device?.state!=='device')throw Error('휴대폰의 USB 디버깅 연결과 승인을 확인하세요.');
  const bytes=await fs.readFile(build.artifact);if(createHash('sha256').update(bytes).digest('hex')!==build.artifactSha256)throw Error('설치 APK가 빌드 결과와 달라요.');
  const run=args=>runTool(adb(),['-s',serial,...args],{signal,timeout:180000});
  const abis=(await run(['shell','getprop','ro.product.cpu.abilist'])).trim().split(',');if(!build.mobile.abis.some(abi=>abis.includes(abi)))throw Error('기기 CPU와 APK CPU가 달라요: '+abis.join(', '));
  const sdk=Number((await run(['shell','getprop','ro.build.version.sdk'])).trim());if(!Number.isInteger(sdk)||sdk<build.mobile.minSdk)throw Error('기기의 Android 버전이 앱 최소 버전보다 낮아요.');
  onProgress('APK 설치');const installed=await run(['install','-r',build.artifact]);if(!/\bSuccess\b/.test(installed))throw Error('APK 설치 실패: '+installed);
  onProgress('앱 시작');const launch=await run(['shell','am','start','-W','-n',build.mobile.applicationId+'/com.hbengine.player.HBActivity']);if(!/Status:\s*ok/.test(launch))throw Error('앱 시작 실패: '+launch);
  const pid=(await run(['shell','pidof',build.mobile.applicationId])).trim().split(/\s+/)[0];if(!/^\d+$/.test(pid))throw Error('앱 실행 프로세스를 찾지 못했어요.');
  const logs=await run(['logcat','-d','--pid='+pid,'-s','HBPlayer']);
  // Activity start and a rendered game are separate facts. Readiness may arrive
  // later; this result never turns a missing log into successful gameplay.
  const reportLines=logs.split(/\r?\n/).filter(line=>line.includes('HBPlayer')&&line.includes('REPORT '));let runtimeReport=null;
  for(const line of reportLines)try{const value=JSON.parse(line.slice(line.indexOf('REPORT ')+7));if(value.frames>=10&&value.scene===build.startupScene)runtimeReport=value;}catch{}
  return {device:{...device,sdk,abis},installVerified:true,activityStarted:true,pid,launch,runtimeReady:runtimeReport?.ok===true,runtimeReport,logs};
}
