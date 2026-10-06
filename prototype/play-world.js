import {defaultRuntimeSettings,validScene} from './model.js';
import {assetTitle,loadSceneBindings,validAsset} from './asset-documents.js';
import {prepareGameplay} from './scene-runtime.js';
import {blueprintInstanceDefaults,installBlueprintInstances} from './blueprint-overrides.js';

// Editor Play and the scenario runner prepare exactly the same game objects.
export async function preparePlayWorld(objects,settings,{readAsset,readText,buildNative}){
  settings={...defaultRuntimeSettings,...settings};const reads=new Map(),read=path=>{if(!reads.has(path))reads.set(path,Promise.resolve().then(()=>readAsset(path)));return reads.get(path);};const config=settings.gameConfig?await read(settings.gameConfig):null;
  if(config&&!validAsset('gameconfig',config))throw Error('게임 설정 에셋 검증 실패');
  const initial=await loadSceneBindings(objects,read);installBlueprintInstances(objects,initial.bindings);const gameplay=await prepareGameplay(objects,{gameConfig:{...settings,...config,dimension:settings.dimension},readAsset:read}),loaded=await loadSceneBindings(objects,read),builds=new Map(),nativeBuilds=new Map();
  for(const binding of gameplay.bindings){const existing=loaded.bindings.find(item=>item.self===binding.self);if(existing)existing.root=binding.root;else loaded.bindings.push(binding);}
  installBlueprintInstances(objects,loaded.bindings);
  for(const {root,self,path} of loaded.bindings){
    const object=objects.find(item=>item.id===self),className=root.settings?.parentClass||'Actor',definition=root.native?.classes.find(item=>item.name===className);
    if(definition){object.nativeClass=className;object.nativeProperties=blueprintInstanceDefaults(root,object).nativeProperties;}else delete object.nativeClass;
    if(root.native&&!builds.has(path)){const header=await readText(root.native.headerPath||'Source/DoorController.h'),source=await readText(root.native.sourcePath||'Source/DoorController.cpp');if(header!==root.native.header||source!==root.native.source)throw Error(path+': 외부 C++ 변경 후 빌드가 필요해요.');const signature=JSON.stringify([header,source]);if(!nativeBuilds.has(signature))nativeBuilds.set(signature,{...await buildNative(header,source),header,source});builds.set(path,nativeBuilds.get(signature));}
  }
  for(const object of objects){const pool=object.components?.find(c=>c.type==='PooledActor'&&c.properties?.enabled!==false);if(pool){object.poolActive=pool.properties?.initiallyActive===true;object.poolVisible=object.visible;object.poolCollision=object.collisionEnabled!==false;if(!object.poolActive){object.visible=false;object.collisionEnabled=false;object.velocity=[0,0,0];object.angularVelocity=[0,0,0];}}}
  return {...loaded,objects,builds,gameplay:gameplay.gameplay,physicsOptions:gameplay.physicsOptions};
}

export async function requestSceneTravel(vm,name,{readAsset,asset}){
  if(!vm.active||vm.stopping)throw Error('활성 게임 월드에서만 장면을 열 수 있어요.');
  if(typeof name!=='string'||!name.trim()||name.length>1000)throw Error('장면 경로를 확인하세요.');
  if(vm.sceneRequest)throw Error('이미 장면 전환이 요청됐어요.');
  const generation=vm.generation,path=await asset(name,'scene');if(!path)throw Error('장면 에셋이 없어요: '+name);
  const data=await readAsset(path);if(!validScene(data))throw Error('장면 에셋 검증 실패: '+path);
  if(!vm.active||vm.stopping||vm.generation!==generation)throw Error('장면을 읽는 동안 실행이 종료됐어요.');
  if(vm.sceneRequest)throw Error('이미 장면 전환이 요청됐어요.');
  vm.sceneRequest={path,data:structuredClone(data)};return {};
}

export function resolvePlayAsset(files,name,kind){
  const exact=files.find(file=>file.kind===kind&&file.path===name);if(exact)return exact.path;
  const matches=files.filter(file=>file.kind===kind&&(file.name===name||assetTitle(file.path)===name));
  if(matches.length>1)throw Error('같은 이름의 에셋이 여러 개예요. 전체 경로를 사용하세요: '+name);
  return matches[0]?.path;
}
