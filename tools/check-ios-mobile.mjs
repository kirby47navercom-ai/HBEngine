import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runTool} from './mobile-android.mjs';
import {iosAudioProbe,validTonePlayback} from './ios-audio-probe.mjs';
import {audioMeterReuseProof} from './audio-meter-proof.mjs';

if(process.platform!=='darwin')throw Error('iOS 실행 검증에는 Mac과 Xcode가 필요해요.');
const proof=JSON.parse(await fs.readFile(process.env.HB_MOBILE_PROOF_EXPORT||'native/build/mobile-proof.json','utf8'));
const out=proof.output,derived=path.join(out,'DerivedData'),app=path.join(derived,'Build/Products/Debug-iphonesimulator/HBGame.app');
const mainFile=path.join(out,'Native/Main.mm'),originalMain=await fs.readFile(mainFile,'utf8'),marker='NSMutableDictionary* report=[data mutableCopy];';assert.ok(originalMain.includes(marker)&&originalMain.includes('BOOL foreground;'));
const probeScript='void ('+iosAudioProbe.toString()+')('+JSON.stringify('/Content/Assets/MobileTone.wav')+','+audioMeterReuseProof.toString()+');',probeHook='if(!self->audioProbeStarted){self->audioProbeStarted=YES;dispatch_async(dispatch_get_main_queue(),^{[self->web evaluateJavaScript:@'+JSON.stringify(probeScript)+' completionHandler:nil];});}dispatch_async(dispatch_get_main_queue(),^{[self->web evaluateJavaScript:@"window.hbIOSAudioProbe" completionHandler:^(id value,NSError* error){if([value isKindOfClass:NSDictionary.class])[encode(value) writeToURL:[[self->saveFile URLByDeletingLastPathComponent] URLByAppendingPathComponent:@"audio-probe.json"] atomically:YES];}];});';
const instrumentedMain=originalMain.replace('BOOL foreground;','BOOL audioProbeStarted;BOOL foreground;').replace(marker,marker+probeHook);await fs.writeFile(mainFile,instrumentedMain);await fs.writeFile(path.join(out,'ios-audio-instrumentation.json'),JSON.stringify({testOnly:true,originalSha256:createHash('sha256').update(originalMain).digest('hex'),instrumentedSha256:createHash('sha256').update(instrumentedMain).digest('hex')},null,2));
const run=async(args)=>{console.log('iOS 명령 시작:',args.join(' '));const result=await runTool('xcrun',args,{timeout:180000,maxOutput:args.includes('--json')?1000000:50000});if(!args.includes('--json'))console.log(result.trim());return result;};
const build=async(platform,dir)=>{
  console.log('Xcode '+platform+' 컴파일 시작');
  await runTool('xcodebuild',['-project',path.join(out,'HBGame.xcodeproj'),'-scheme','HBGame','-configuration','Debug','-destination','generic/platform='+platform,'-derivedDataPath',dir,'CODE_SIGNING_ALLOWED=NO','build'],{timeout:600000,onOutput:text=>process.stdout.write(text)});
  console.log('Xcode '+platform+' 컴파일 통과');
};
await build('iOS Simulator',derived);
await build('iOS',path.join(out,'DeviceDerivedData'));
const devices=JSON.parse(await run(['simctl','list','devices','available','--json']));
await fs.writeFile(path.join(out,'ios-devices.json'),JSON.stringify(devices,null,2));
const sdk=(await run(['--sdk','iphonesimulator','--show-sdk-version'])).trim(),runtimes=Object.entries(devices.devices).filter(([runtime])=>runtime.includes('iOS')).sort((a,b)=>b[0].localeCompare(a[0],undefined,{numeric:true})),matching=runtimes.find(([runtime])=>runtime.endsWith('iOS-'+sdk.replaceAll('.','-')));
const runtime=matching?.[0]||runtimes[0]?.[0];assert.ok(runtime,'설치된 iOS 시뮬레이터 런타임이 없어요.');
const types=JSON.parse(await run(['simctl','list','devicetypes','--json'])),type=types.devicetypes.find(t=>t.name==='iPhone SE (3rd generation)');assert.ok(type,'설치된 iPhone SE 시뮬레이터 타입이 없어요.');
const device={name:type.name,udid:(await run(['simctl','create','HBEngine-'+proof.applicationId.slice(-8),type.identifier,runtime])).trim()};
await fs.writeFile(path.join(out,'ios-device.json'),JSON.stringify({sdk,runtime,device,owned:true,headless:true},null,2));
console.log('독립 시뮬레이터 기준:',{sdk,runtime,device});
let reportFile,audioProbeReportFile;
try{
await run(['simctl','boot',device.udid]);
await run(['simctl','bootstatus',device.udid,'-b']);
await run(['simctl','install',device.udid,app]);
await run(['simctl','launch',device.udid,proof.applicationId]);
const data=(await run(['simctl','get_app_container',device.udid,proof.applicationId,'data'])).trim();
reportFile=path.join(data,'Library/Application Support/runtime-report.json');
audioProbeReportFile=path.join(data,'Library/Application Support/audio-probe.json');
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
const packed=JSON.parse(await fs.readFile(path.join(out,'Assets/game.hbpack.json'),'utf8')),tone=packed.files.find(file=>file.path==='Content/Assets/MobileTone.wav');assert.ok(tone);
const bundled=await fs.readFile(path.join(app,'Assets',tone.path));assert.equal(createHash('sha256').update(bundled).digest('hex'),tone.sha256,'Xcode 앱의 WAV는 출력한 원본 바이트와 같아야 해요.');
await fs.writeFile(path.join(out,'ios-audio-file.txt'),await runTool('/usr/bin/afinfo',[path.join(app,'Assets',tone.path)],{timeout:30000}));
const response=await fetch(report.mobileHost.assetOrigin+'/'+tone.path,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const served=Buffer.from(await response.arrayBuffer());assert.deepEqual(served,bundled,'앱 서버의 WAV 전체 응답은 원본과 같아야 해요.');
for(const [range,start,end] of [['bytes=0-1',0,2],['bytes=0-'+(bundled.length-1),0,bundled.length],['bytes=44-4095',44,4096],['bytes=-44',bundled.length-44,bundled.length]]){const part=await fetch(report.mobileHost.assetOrigin+'/'+tone.path,{headers:{range},signal:AbortSignal.timeout(15000)});assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),'bytes '+start+'-'+(end-1)+'/'+bundled.length);assert.deepEqual(Buffer.from(await part.arrayBuffer()),bundled.subarray(start,end));}
const audioSamples=[];for(let i=0;i<15;i++){report=JSON.parse(await fs.readFile(reportFile,'utf8'));assert.equal(report.ok,true,report.error);if(audioSamples.at(-1)?.frames!==report.frames)audioSamples.push({frames:report.frames,audio:report.audio});if(validTonePlayback(audioSamples))break;await new Promise(resolve=>setTimeout(resolve,1000));}await fs.writeFile(path.join(out,'ios-audio.json'),JSON.stringify(audioSamples,null,2));await fs.copyFile(reportFile,path.join(out,'ios-runtime-report.json'));try{await fs.copyFile(audioProbeReportFile,path.join(out,'ios-audio-probe.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('실제 오디오 상태:',JSON.stringify(report.audio));assert.ok(validTonePlayback(audioSamples),'최소4초에 걸친 세 게임 보고에서 WAV2초 길이·재생 시간 진행·실제 믹서 신호와 반복 사이의 길이 보존을 확인해야 해요.');
let audioProbe;for(let i=0;i<30;i++){try{audioProbe=JSON.parse(await fs.readFile(audioProbeReportFile,'utf8'));}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}if(audioProbe?.phase==='failed'||audioProbe?.phase==='done')break;await new Promise(resolve=>setTimeout(resolve,1000));}
assert.equal(audioProbe?.phase,'done',audioProbe?.error||'실제 WKWebView 오디오 대조가 완료되지 않았어요.');assert.equal(audioProbe.meterReuse?.reuse,true,'반복 효과음의 측정 버퍼 재사용을 확인해야 해요.');await fs.copyFile(audioProbeReportFile,path.join(out,'ios-audio-probe.json'));
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
assert.equal(paused.mobileActive,false);assert.equal(paused.audio.state,'suspended','앱 전환 시 오디오를 멈춰야 해요.');
await new Promise(resolve=>setTimeout(resolve,3000));const background=JSON.parse(await fs.readFile(reportFile,'utf8'));
assert.equal(background.ok,true,background.error);assert.equal(background.frames,paused.frames,'백그라운드에서는 게임 프레임을 멈춰야 해요.');
await run(['simctl','launch',device.udid,proof.applicationId]);
for(let i=0;i<90;i++){report=JSON.parse(await fs.readFile(reportFile,'utf8'));if(!report.ok||report.frames>paused.frames&&report.audio.state==='running')break;await new Promise(resolve=>setTimeout(resolve,1000));}
assert.equal(report.ok,true,report.error);assert.ok(report.frames>paused.frames,'앱 복귀 후 프레임이 재개되어야 해요.');
assert.equal(report.mobileActive,true);assert.equal(report.audio.state,'running','게임 복귀 시 오디오를 재개해야 해요.');
const resumedAudio=[];for(let i=0;i<15;i++){report=JSON.parse(await fs.readFile(reportFile,'utf8'));assert.equal(report.ok,true,report.error);if(resumedAudio.at(-1)?.frames!==report.frames)resumedAudio.push({frames:report.frames,audio:report.audio});if(validTonePlayback(resumedAudio))break;await new Promise(resolve=>setTimeout(resolve,1000));}await fs.writeFile(path.join(out,'ios-audio-resume.json'),JSON.stringify(resumedAudio,null,2));assert.ok(validTonePlayback(resumedAudio),'복귀 후에도 WAV 길이·재생·믹서 신호를 다시 확인해야 해요.');
for(const [i,count] of [[0,1],[1,10]])assert.equal(report.objects.find(o=>o.id==='mobile-probe-'+i).nativeProperties.Count,count,'복귀가 Begin Play를 다시 실행하지 않아야 해요.');
await fs.copyFile(reportFile,path.join(out,'ios-runtime-report.json'));
await fs.writeFile(path.join(out,'ios-acceptance.json'),JSON.stringify({ok:true,audioDiagnosticsInstrumented:true,audioMeterReuse:audioProbe.meterReuse,simulatorCompiled:true,deviceCompiled:true,simulatorInstalled:true,simulatorLaunched:true,sharedCppBlueprint:true,synchronousPhysics:true,assetRangeVerified:true,audioSignalVerified:true,audioBackgroundPaused:true,audioResumed:true,audioHeard:false,backgroundPaused:true,resumePreservesWorld:true,physicalDeviceVerified:false,signingVerified:false,device:device.name,report},null,2));
await run(['simctl','io',device.udid,'screenshot',path.join(out,'ios-simulator.png')]);
console.log('iOS: 실제 Xcode 기기·시뮬레이터 컴파일과 WKWebView·블루프린트·C++ 두 모듈 실행 통과');
}catch(error){
  console.error('iOS 실행 검사 실패:',error.message);
  if(reportFile)try{await fs.copyFile(reportFile,path.join(out,'ios-runtime-report.json'));}catch(failure){console.error('iOS 마지막 실행 보고 수집:',failure.message);}
  if(audioProbeReportFile)try{await fs.copyFile(audioProbeReportFile,path.join(out,'ios-audio-probe.json'));}catch(failure){console.error('iOS 오디오 경로 대조 수집:',failure.message);}
  try{const logs=await runTool('xcrun',['simctl','spawn',device.udid,'log','show','--last','5m','--style','compact','--predicate','process == "HBGame" OR eventMessage CONTAINS "'+proof.applicationId+'" OR (process CONTAINS "WebKit" AND (eventMessage CONTAINS[c] "audio" OR eventMessage CONTAINS[c] "media"))'],{timeout:30000,maxOutput:200000});await fs.writeFile(path.join(out,'ios-failure-log.txt'),logs);}catch(failure){console.error('iOS 실패 로그 수집:',failure.message);}
  const crashes=path.join(process.env.HOME,'Library/Logs/DiagnosticReports');try{for(const name of await fs.readdir(crashes))if(name.startsWith('HBGame')&&name.endsWith('.ips'))await fs.copyFile(path.join(crashes,name),path.join(out,name));}catch(failure){if(failure.code!=='ENOENT')console.error('iOS 충돌 기록 수집:',failure.message);}
  throw error;
}finally{
  try{await run(['simctl','shutdown',device.udid]);}catch(error){console.error('독립 시뮬레이터 종료:',error.message);}
  try{await run(['simctl','delete',device.udid]);}catch(error){console.error('독립 시뮬레이터 정리:',error.message);}
}
