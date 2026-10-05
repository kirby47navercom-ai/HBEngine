import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {mobileSettings} from '../prototype/build-profile.js';

const root=path.resolve(import.meta.dirname,'..');
export const androidSdk=()=>path.resolve(process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(process.env.LOCALAPPDATA||process.env.HOME,'HBEngine/Toolchains/Android'));
const javaHome=()=>process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-25':'');
const javaTool=name=>javaHome()?path.join(javaHome(),'bin',name+(process.platform==='win32'?'.exe':'')):name;
export function runTool(program,args,{cwd,signal,env=process.env,timeout=180000}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(program,args,{cwd,env,signal,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});let output='',failure;
    const append=data=>{output=(output+data.toString()).slice(-50000);};child.stdout.on('data',append);child.stderr.on('data',append);
    const timer=setTimeout(()=>{failure=Error('모바일 도구 시간 초과');child.kill();},timeout);child.once('error',error=>{failure=error;});child.once('close',code=>{clearTimeout(timer);failure?reject(failure):code===0?resolve(output):reject(Error(output||'모바일 도구 실패: '+path.basename(program)));});
  });
}
export async function mobileCapability(profile){
  const sdk=androidSdk(),tools=path.join(sdk,'build-tools/36.0.0'),platform=path.join(sdk,'platforms/android-36/android.jar'),ndk=path.join(sdk,'ndk/28.2.13676358'),host=process.platform==='win32'?'windows-x86_64':process.platform==='darwin'?'darwin-x86_64':'linux-x86_64',bin=path.join(ndk,'toolchains/llvm/prebuilt',host,'bin'),suffix=process.platform==='win32'?'.exe':'';
  const capability={sdk,tools,platform,ndk,bin,compileSdk:36,ndkVersion:'28.2.13676358',buildTools:'36.0.0',ready:false};
  try{for(const file of [platform,path.join(tools,'aapt2'+suffix),path.join(tools,'lib/d8.jar'),path.join(tools,'lib/apksigner.jar'),path.join(bin,'clang++'+suffix)])await fs.access(file);await runTool(javaTool('javac'),['-version'],{timeout:10000});if(mobileSettings(profile).format==='aab')await fs.access(path.join(sdk,'bundletool.jar'));capability.ready=true;}catch(error){capability.error='Android SDK36·Build Tools36.0.0·NDK28.2·JDK가 필요해요. SDK: '+sdk+'\n'+error.message;}return capability;
}
const xml=value=>String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
async function signing(settings,configuration,sdk,signal){
  const directory=path.join(process.env.LOCALAPPDATA||process.env.HOME,'HBEngine/Signing');await fs.mkdir(directory,{recursive:true});
  if(configuration==='release'){
    if(!settings.signingRef)throw Error('배포 빌드에는 서명 프로필을 지정하세요.');
    const config=JSON.parse(await fs.readFile(path.join(directory,settings.signingRef+'.json'),'utf8'));
    if(typeof config.keyStore!=='string'||typeof config.alias!=='string'||!/^HB_SIGN_[A-Z0-9_]+$/.test(config.storePasswordEnv)||!/^HB_SIGN_[A-Z0-9_]+$/.test(config.keyPasswordEnv)||!process.env[config.storePasswordEnv]||!process.env[config.keyPasswordEnv])throw Error('서명 파일·별칭·암호 환경 변수를 확인하세요.');await fs.access(config.keyStore);return config;
  }
  const keyStore=path.join(directory,'android-debug.keystore');try{await fs.access(keyStore);}catch(error){if(error.code!=='ENOENT')throw error;await runTool(javaTool('keytool'),['-genkeypair','-keystore',keyStore,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=HBEngine Android Debug, O=HBEngine, C=KR'],{signal});}
  return {keyStore,alias:'androiddebugkey',debug:true};
}
export async function packageMobile({out,assets,profile,settings,native,signal,onProgress,capability:c}){
  const run=(program,args,options={})=>runTool(program,args,{cwd:out,signal,...options}),suffix=process.platform==='win32'?'.exe':'',stage=path.join(out,'Android'),classes=path.join(stage,'classes'),dex=path.join(stage,'dex'),res=path.join(stage,'res'),apk=path.join(out,'Game.apk');
  for(const directory of [classes,dex,path.join(res,'values'),path.join(stage,'java/com/hbengine/player')])await fs.mkdir(directory,{recursive:true});
  const activity=path.join(stage,'java/com/hbengine/player/HBActivity.java');await fs.copyFile(path.join(root,'native/mobile/android/HBActivity.java'),activity);
  await fs.copyFile(path.join(root,'native/mobile/android/Bridge.cpp'),path.join(out,'Native/Bridge.cpp'));
  await fs.writeFile(path.join(res,'values/strings.xml'),'<resources><string name="app_name">'+xml(profile.productName)+'</string></resources>');
  const orientation=settings.orientation==='auto'?'fullSensor':settings.orientation;
  const manifest=`<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${xml(settings.applicationId)}" android:versionCode="${settings.versionCode}" android:versionName="${xml(settings.versionName)}"><uses-sdk android:minSdkVersion="${settings.minSdk}" android:targetSdkVersion="36"/><uses-feature android:glEsVersion="0x00030000" android:required="true"/><application android:label="@string/app_name" android:theme="@android:style/Theme.Material.NoActionBar" android:hardwareAccelerated="true" android:allowBackup="false" android:extractNativeLibs="true" android:debuggable="${profile.configuration==='development'}"><activity android:name="com.hbengine.player.HBActivity" android:exported="true" android:screenOrientation="${orientation}" android:configChanges="orientation|screenSize|keyboardHidden|density|uiMode" android:windowSoftInputMode="adjustResize"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`;
  await fs.writeFile(path.join(stage,'AndroidManifest.xml'),manifest);
  onProgress('Android Java');await run(javaTool('javac'),['--release','8','-encoding','UTF-8','-classpath',c.platform,'-d',classes,activity]);
  await run(javaTool('jar'),['cf',path.join(stage,'classes.jar'),'-C',classes,'.']);
  await run(javaTool('java'),['-cp',path.join(c.tools,'lib/d8.jar'),'com.android.tools.r8.D8','--lib',c.platform,'--min-api',String(settings.minSdk),'--output',dex,path.join(stage,'classes.jar')]);
  onProgress('Android C++');const nativeFiles=[];
  for(const abi of settings.abis){
    const directory=path.join(stage,'lib',abi);await fs.mkdir(directory,{recursive:true});const library=path.join(directory,'libhbgame.so'),triple=abi==='arm64-v8a'?'aarch64-linux-android':'x86_64-linux-android';
    await run(path.join(c.bin,'clang++'+suffix),['--target='+triple+settings.minSdk,'-std=c++17','-shared','-fPIC','-fvisibility=hidden','-static-libstdc++','-Wl,-z,max-page-size=16384',...(profile.configuration==='release'?['-O2','-Wl,-s']:['-O1','-g']),'-I',path.join(out,'Native'),'-I',path.join(out,'Native/include'),...native.sources.map(file=>path.relative(out,file)),path.join('Native','Bridge.cpp'),'-o',path.relative(out,library)]);
    const elf=await run(path.join(c.bin,'llvm-readelf'+suffix),['-h','-l',library]);if(!elf.includes('DYN')||!elf.includes(abi==='arm64-v8a'?'AArch64':'X86-64'))throw Error('Android ELF ABI 검사 실패');nativeFiles.push({abi,path:library,elf});
  }
  onProgress('Android 패키지');await run(path.join(c.tools,'aapt2'+suffix),['compile','--dir',res,'-o',path.join(stage,'resources.zip')]);
  const base=path.join(stage,'base.zip');await run(path.join(c.tools,'aapt2'+suffix),['link',...(settings.format==='aab'?['--proto-format']:[]),'-o',base,'-I',c.platform,'--manifest',path.join(stage,'AndroidManifest.xml'),'-A',assets,path.join(stage,'resources.zip')]);
  const key=await signing(settings,profile.configuration,c.sdk,signal),signEnv={...process.env};
  if(settings.format==='apk'){
    await fs.copyFile(path.join(dex,'classes.dex'),path.join(stage,'classes.dex'));await run(javaTool('jar'),['uf',base,'-C',stage,'classes.dex','-C',stage,'lib']);
    const aligned=path.join(stage,'aligned.apk');await run(path.join(c.tools,'zipalign'+suffix),['-P','16','-f','4',base,aligned]);
    const password=key.debug?['--ks-pass','pass:android','--key-pass','pass:android']:['--ks-pass','env:'+key.storePasswordEnv,'--key-pass','env:'+key.keyPasswordEnv];
    await run(javaTool('java'),['-jar',path.join(c.tools,'lib/apksigner.jar'),'sign','--ks',key.keyStore,'--ks-key-alias',key.alias,...password,'--out',apk,aligned],{env:signEnv});
    const verification=await run(javaTool('java'),['-jar',path.join(c.tools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk]);await run(path.join(c.tools,'zipalign'+suffix),['-c','-P','16','4',apk]);
    const badging=await run(path.join(c.tools,'aapt2'+suffix),['dump','badging',apk]);if(!badging.includes("name='"+settings.applicationId+"'"))throw Error('APK applicationId 검사 실패');
    return {artifact:apk,artifactType:'apk',nativeFiles,signing:{debug:key.debug===true,verification},packageInspection:badging,installVerified:false,launchVerified:false};
  }
  const module=path.join(stage,'bundle-base');await fs.mkdir(module);await run(javaTool('jar'),['xf',base],{cwd:module});await fs.mkdir(path.join(module,'manifest'));await fs.rename(path.join(module,'AndroidManifest.xml'),path.join(module,'manifest/AndroidManifest.xml'));await fs.cp(path.join(stage,'lib'),path.join(module,'lib'),{recursive:true});await fs.mkdir(path.join(module,'dex'));await fs.copyFile(path.join(dex,'classes.dex'),path.join(module,'dex/classes.dex'));
  const moduleZip=path.join(stage,'bundle-base.zip'),bundle=path.join(out,'Game.aab');await run(javaTool('jar'),['cMf',moduleZip,'-C',module,'.']);await run(javaTool('java'),['-jar',path.join(c.sdk,'bundletool.jar'),'build-bundle','--modules='+moduleZip,'--output='+bundle]);
  const password=key.debug?['-storepass','android','-keypass','android']:['-storepass:env',key.storePasswordEnv,'-keypass:env',key.keyPasswordEnv];await run(javaTool('jarsigner'),['-keystore',key.keyStore,...password,bundle,key.alias],{env:signEnv});const verification=await run(javaTool('jarsigner'),['-verify',bundle]);await run(javaTool('java'),['-jar',path.join(c.sdk,'bundletool.jar'),'validate','--bundle='+bundle]);
  return {artifact:bundle,artifactType:'aab',nativeFiles,signing:{debug:key.debug===true,verification},installVerified:false,launchVerified:false};
}
