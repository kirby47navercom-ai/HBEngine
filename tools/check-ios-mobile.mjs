import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runTool} from './mobile-android.mjs';

if(process.platform!=='darwin')throw Error('iOS 실행 검증에는 Mac과 Xcode가 필요해요.');
const proof=JSON.parse(await fs.readFile(process.env.HB_MOBILE_PROOF_EXPORT||'native/build/mobile-proof.json','utf8'));
const out=proof.output,derived=path.join(out,'DerivedData'),app=path.join(derived,'Build/Products/Debug-iphonesimulator/HBGame.app');
const run=async(args)=>{const result=await runTool('xcrun',args,{timeout:180000,maxOutput:args.includes('--json')?1000000:50000});if(!args.includes('--json'))console.log(result.trim());return result;};
const build=async(platform,dir)=>{
  console.log('Xcode '+platform+' 컴파일 시작');
  await runTool('xcodebuild',['-project',path.join(out,'HBGame.xcodeproj'),'-scheme','HBGame','-configuration','Debug','-destination','generic/platform='+platform,'-derivedDataPath',dir,'CODE_SIGNING_ALLOWED=NO','build'],{timeout:600000,onOutput:text=>process.stdout.write(text)});
  console.log('Xcode '+platform+' 컴파일 통과');
};
await build('iOS Simulator',derived);
await build('iOS',path.join(out,'DeviceDerivedData'));
const devices=JSON.parse(await run(['simctl','list','devices','available','--json']));
const device=Object.entries(devices.devices).filter(([runtime])=>runtime.includes('iOS')).sort((a,b)=>b[0].localeCompare(a[0],undefined,{numeric:true})).flatMap(([,list])=>list).find(d=>d.isAvailable&&d.name.startsWith('iPhone'));
console.log('시뮬레이터 선택:',device?.name,device?.udid);
assert.ok(device,'설치된 iPhone 시뮬레이터가 없어요.');
if(device.state!=='Booted')await run(['simctl','boot',device.udid]);
await runTool('open',['-a','Simulator','--args','-CurrentDeviceUDID',device.udid],{timeout:60000});
await run(['simctl','bootstatus',device.udid,'-b']);
await run(['simctl','install',device.udid,app]);
await run(['simctl','launch',device.udid,proof.applicationId]);
const data=(await run(['simctl','get_app_container',device.udid,proof.applicationId,'data'])).trim();
const reportFile=path.join(data,'Library/Application Support/runtime-report.json');
let report;
for(let i=0;i<90;i++){
  try{report=JSON.parse(await fs.readFile(reportFile,'utf8'));}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  if(report&&(!report.ok||report.frames>=10))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(report,'WKWebView 실행 보고가 없어요.');
console.log('실행 보고:',JSON.stringify({ok:report.ok,frames:report.frames,drawCalls:report.drawCalls,error:report.error}));
await fs.copyFile(reportFile,path.join(out,'ios-runtime-report.json'));
assert.equal(report.ok,true,report.error);
assert.ok(report.frames>=10,'첫 10프레임까지 실행되어야 해요.');
assert.ok(report.drawCalls>0,'WebGL2가 장면을 그려야 해요.');
for(const [i,count] of [[0,1],[1,10]]){
  const actor=report.objects.find(o=>o.id==='mobile-probe-'+i);
  assert.ok(actor,'C++ 블루프린트 액터가 없어요.');
  assert.equal(actor.nativeProperties.GroundHit,true,'앱의 실제 C++ 동기 질의가 Rapier 2D 충돌을 읽어야 해요.');
  assert.equal(actor.nativeProperties.Count,count,'동일 클래스의 두 C++ 모듈이 각각 실행되어야 해요.');
  assert.deepEqual(actor.position,[i?2:-2,1,0],'C++ 시작 실행이 배치 위치를 보존해야 해요.');
}
const origin=report.mobileHost.assetOrigin;assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
const asset=async(name,options={})=>{console.log('iOS 에셋 요청:',name,options.headers?.range||'전체');return fetch(origin+name,{...options,signal:AbortSignal.timeout(15000)});};
const whole=await asset('/Content/Assets/MobileVector.svg');assert.equal(whole.status,200);assert.equal(whole.headers.get('content-type'),'image/svg+xml');const image=await whole.text();
await Promise.all(Array.from({length:8},async()=>{const response=await asset('/Content/Assets/MobileVector.svg');assert.equal(response.status,200);assert.equal(await response.text(),image);}));
for(const [range,expected] of [['bytes=0-7',image.slice(0,8)],['bytes=-8',image.slice(-8)]]){const response=await asset('/Content/Assets/MobileVector.svg',{headers:{range}});assert.equal(response.status,206);assert.equal(await response.text(),expected);}
assert.equal((await asset('/Content/Assets/MobileVector.svg',{headers:{range:'bytes=invalid'}})).status,416);
assert.equal((await asset('/Native/Main.mm')).status,404);
await run(['simctl','launch',device.udid,'com.apple.mobilesafari']);
await new Promise(resolve=>setTimeout(resolve,3000));const paused=JSON.parse(await fs.readFile(reportFile,'utf8'));
await new Promise(resolve=>setTimeout(resolve,3000));const background=JSON.parse(await fs.readFile(reportFile,'utf8'));
assert.equal(background.ok,true,background.error);assert.equal(background.frames,paused.frames,'백그라운드에서는 게임 프레임을 멈춰야 해요.');
await run(['simctl','launch',device.udid,proof.applicationId]);
for(let i=0;i<90;i++){report=JSON.parse(await fs.readFile(reportFile,'utf8'));if(!report.ok||report.frames>paused.frames)break;await new Promise(resolve=>setTimeout(resolve,1000));}
assert.equal(report.ok,true,report.error);assert.ok(report.frames>paused.frames,'앱 복귀 후 프레임이 재개되어야 해요.');
for(const [i,count] of [[0,1],[1,10]])assert.equal(report.objects.find(o=>o.id==='mobile-probe-'+i).nativeProperties.Count,count,'복귀가 Begin Play를 다시 실행하지 않아야 해요.');
await fs.copyFile(reportFile,path.join(out,'ios-runtime-report.json'));
await fs.writeFile(path.join(out,'ios-acceptance.json'),JSON.stringify({ok:true,simulatorCompiled:true,deviceCompiled:true,simulatorInstalled:true,simulatorLaunched:true,sharedCppBlueprint:true,synchronousPhysics:true,assetRangeVerified:true,backgroundPaused:true,resumePreservesWorld:true,physicalDeviceVerified:false,signingVerified:false,device:device.name,report},null,2));
await run(['simctl','io',device.udid,'screenshot',path.join(out,'ios-simulator.png')]);
console.log('iOS: 실제 Xcode 기기·시뮬레이터 컴파일과 WKWebView·블루프린트·C++ 두 모듈 실행 통과');
