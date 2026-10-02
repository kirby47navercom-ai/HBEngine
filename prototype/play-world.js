import {defaultRuntimeSettings,validScene} from './model.js';
import {assetTitle,loadSceneBindings,validAsset} from './asset-documents.js';
import {prepareGameplay} from './scene-runtime.js';
import {installBlueprintComponents} from './scene-components.js';
import {defaultsFor} from './blueprint-model.js';

// Editor Play and the scenario runner prepare exactly the same game objects.
export async function preparePlayWorld(objects,settings,{readAsset,readText,buildNative}){
  settings={...defaultRuntimeSettings,...settings};const config=settings.gameConfig?await readAsset(settings.gameConfig):null;
  if(config&&!validAsset('gameconfig',config))throw Error('게임 설정 에셋 검증 실패');
  const gameplay=await prepareGameplay(objects,{gameConfig:{...settings,...config,dimension:settings.dimension},readAsset}),loaded=await loadSceneBindings(objects,readAsset),builds=new Map();
  for(const binding of gameplay.bindings){const existing=loaded.bindings.find(item=>item.self===binding.self);if(existing)existing.root=binding.root;else loaded.bindings.push(binding);}
  installBlueprintComponents(objects,loaded.bindings);
  for(const {root,self,path} of loaded.bindings){
    const object=objects.find(item=>item.id===self),className=root.settings?.parentClass||'Actor',definition=root.native?.classes.find(item=>item.name===className);
    if(definition){object.nativeClass=className;object.nativeProperties=Object.fromEntries(definition.properties.map(property=>[property.name,structuredClone(root.settings?.nativeDefaults?.[className+'.'+property.name]??property.value??(property.array?[]:defaultsFor(property.type)))]));}else delete object.nativeClass;
    if(root.native&&!builds.has(path)){const header=await readText(root.native.headerPath||'Source/DoorController.h'),source=await readText(root.native.sourcePath||'Source/DoorController.cpp');if(header!==root.native.header||source!==root.native.source)throw Error(path+': 외부 C++ 변경 후 빌드가 필요해요.');builds.set(path,{...await buildNative(header,source),header,source});}
  }
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
