import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readProjectManifest} from './project-manifest.mjs';
import {buildGame,readBuildProfiles} from './build-game.mjs';
import {deployAndroid} from './android-deploy.mjs';

export async function runAndroid(project,profileId,serial,options={}){
  if(!project||!profileId||!serial)throw Error('node tools/run-android.mjs <project.hbproject> <Android 프로필 ID> <ADB serial>');
  const record=await readProjectManifest(path.resolve(project)),profiles=await readBuildProfiles(record),profile=profiles.profiles.find(p=>p.id===profileId);
  if(!profile||profile.target!=='android'||profile.mobile?.format==='aab')throw Error('설치할 Android APK 프로필을 선택하세요.');
  const progress=options.onProgress||(()=>{}),build=await buildGame(record,profile,{...options,onProgress:progress});
  const deployment=await deployAndroid(build,serial,{...options,onProgress:progress});return {build,deployment};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log(JSON.stringify(await runAndroid(...process.argv.slice(2),{onProgress:phase=>console.error(phase)}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
