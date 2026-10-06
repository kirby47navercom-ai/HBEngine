import {RuntimeGame} from '../prototype/runtime-game.js';
import {createPersistentQueries} from '../prototype/runtime-storage.js';
import {nativeSpawnRequest} from '../prototype/native-spawn.js';
import {nativeBindings,mergeNativeReply} from '../prototype/native-module-query.js';
import {resolveSprite} from '../prototype/sprite-import.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {readProjectManifest} from './project-manifest.mjs';
import {NativeHost} from './native-host.mjs';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {SpriteRigPose} from '../prototype/sprite-rig-runtime.js';
import {validScene} from '../prototype/model.js';
import {validAsset} from '../prototype/asset-documents.js';
import {preparePlayWorld,resolvePlayAsset} from '../prototype/play-world.js';
import {componentDefaults,enabledComponent} from '../prototype/scene-components.js';
import {tileCollisionBoxes} from '../prototype/two-d-assets.js';
import {validInputPacket} from '../prototype/runtime-input.js';
import {createGameCamera,selectGameCamera,fallbackGameCamera} from '../prototype/game-camera.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {nativeRequestWorld} from '../prototype/native-model.js';
import {nativeWorldClient,advanceNativeFrames} from '../prototype/native-transport.js';
import {validValue} from '../prototype/blueprint-model.js';

export async function runProject(file,{scene:scenePath,frames=180,delta=1/60,inputs=[],onFrame,nativeDefaults={},preserveInputOnTravel=true,saveDirectory}={}){
  if(!Number.isInteger(frames)||frames<0||frames>36000||!Number.isFinite(delta)||delta<=0||delta>1||!Array.isArray(inputs)||inputs.length>10000||inputs.some(input=>!Number.isInteger(input.frame)||input.frame<0||input.frame>=frames||!validInputPacket(input)))throw Error('실행 프레임·시간·입력 시나리오를 확인하세요.');
  const {project,manifest}=await readProjectManifest(path.resolve(file)),readText=async name=>fs.readFile((await project.read(name)).file,'utf8'),readAsset=async name=>JSON.parse(await readText(name));
  const game=new RuntimeGame(),host=new NativeHost(),world=new THREE.Scene(),meshes=new Map(),models=new Map(),logs=[],visualEvents=[],savedGames=new Map(),sceneHistory=[];let vm,services,objects,prepared,builds,currentScene=scenePath||manifest.startupScene,uniqueBuilds=[],frame=0,fallback,carriedInput;
  host.persistentQueries=createPersistentQueries({readAsset,readSave:async slot=>saveDirectory?fs.readFile(path.join(saveDirectory,encodeURIComponent(slot)+'.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;}):savedGames.get(slot)??null,writeSave:async(slot,text)=>{if(saveDirectory){await fs.mkdir(saveDirectory,{recursive:true});const file=path.join(saveDirectory,encodeURIComponent(slot)+'.json');await fs.writeFile(file+'.tmp',text);await fs.rename(file+'.tmp',file);}savedGames.set(slot,text);},deleteSave:async slot=>{savedGames.delete(slot);if(saveDirectory)await fs.unlink(path.join(saveDirectory,encodeURIComponent(slot)+'.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});}});
  const releaseModel=id=>{disposeHeadlessModel(models.get(id));models.delete(id);};
  const clearModels=()=>{for(const id of models.keys())releaseModel(id);for(const group of meshes.values())group.userData.spriteSkin?.dispose();};
  const update=object=>{const mesh=meshes.get(object.id);if(mesh){mesh.position.fromArray(object.position);mesh.rotation.set(...object.rotation.map(THREE.MathUtils.degToRad));mesh.scale.fromArray(object.scale);mesh.visible=object.visible;}};
  const build=object=>{const group=new THREE.Group();group.userData.objectId=object.id;const p=enabledComponent(object,'Camera');if(p){const camera=createGameCamera(p);group.add(camera);group.userData.gameCamera=camera;}meshes.set(object.id,group);world.add(group);update(object);return group;};
  const openWorld=async(data,scenePath,travelArguments={})=>{
    if(!validScene(data))throw Error('장면 데이터 검증 실패: '+scenePath);
    const authored=structuredClone(data.objects);for(const o of authored){const defaults=nativeDefaults[o.id]||nativeDefaults[o.blueprintAsset];if(defaults)o.overrides={...o.overrides,nativeProperties:{...o.overrides?.nativeProperties,...defaults}};}prepared=await preparePlayWorld(authored,data.runtime,{game,gameInstance:manifest.gameInstance||'',travelArguments,readAsset,readText,listAssets:()=>project.files(),buildNative:(header,source)=>host.build(header,source)});objects=prepared.objects;builds=prepared.builds;fallback=fallbackGameCamera(data.runtime?.dimension||'3d');
    clearModels();world.clear();meshes.clear();currentScene=scenePath;sceneHistory.push({scene:currentScene,frame});
    objects.forEach(build);for(const object of objects)if(object.parent)meshes.get(object.parent)?.add(meshes.get(object.id));
    for(const object of objects){const name=object.components?.find(c=>c.type==='MeshRenderer')?.properties?.mesh||object.asset;if(name&&/\.(gltf|glb)$/i.test(name)){const loaded=await loadHeadlessModel(project,name),group=meshes.get(object.id);models.set(object.id,loaded.object);group.add(loaded.object);group.userData.animations=loaded.animations;}else if(name&&enabledComponent(object,'AnimationGraph'))throw Error('화면 없는 모델 애니메이션에는 glTF/GLB를 사용하세요: '+name);}
    for(const object of objects){const skin=object.components?.find(c=>c.type==='SpriteSkin'&&c.properties?.enabled!==false)?.properties;if(!skin?.rig)continue;if(!object.components.some(c=>c.type==='SpriteRenderer'&&c.properties?.enabled!==false))throw Error('Sprite Skin에는 활성 Sprite Renderer가 필요해요.');const data=await readAsset(skin.rig);await resolveSprite(await readAsset(data.sprite),readAsset);const pose=new SpriteRigPose(data,{requireSprite:true}),group=meshes.get(object.id);group.add(pose.group);group.userData.spriteSkin=pose;group.userData.animations=[...group.userData.animations||[],...pose.animations];}
    const files=await project.files();
    services=engineOperations({game:game,headless:true,visualEvents,persistentQueries:host.persistentQueries,storage:{getItem:key=>savedGames.get(key)??null,setItem:(key,value)=>savedGames.set(key,value),removeItem:key=>savedGames.delete(key)},storageKey:key=>key,spawnCatalog:prepared.spawnCatalog,gameplay:prepared.gameplay,physicsOptions:prepared.physicsOptions,readAsset,build,update,remove:object=>{releaseModel(object.id);meshes.get(object.id)?.userData.spriteSkin?.dispose();meshes.get(object.id)?.removeFromParent();meshes.delete(object.id);},mesh:id=>meshes.get(id),meshes:()=>[...meshes.values()],scene:()=>world,asset:async(name,kind)=>resolvePlayAsset(files,name,kind),spriteFrame:async(object,sprite)=>{await resolveSprite(await readAsset(sprite),readAsset);object.currentSprite=sprite;visualEvents.push({type:'spriteFrame',object:object.id,path:sprite});}});
    const native=async(request,build)=>{build??=builds.get((()=>{const o=objects.find(o=>o.id===request.self);return o?.blueprintAsset||o?.nativeBuildAsset;})());if(!build)throw Error('C++ 실행 바인딩이 없어요.');const assetPaths=new Set([...builds].filter(([,item])=>item.token===build.token).map(([name])=>name)),result=mergeNativeReply(await nativeWorldClient(build,vm).call({...request,...nativeSpawnRequest(vm,build,prepared.spawnCatalog),nativeBindings:nativeBindings(objects,builds,vm.bindings,request,build.metadata),scopes:[...vm.scopes],input:vm.inputSnapshot(),objects:nativeRequestWorld(objects,assetPaths,request,build.metadata,services.spriteSkinSnapshot)},build.metadata,packet=>host.call(build.token,packet)),request.self);
      const states=result.objects||[],stateObjects=states.length>8?new Map(objects.map(o=>[o.id,o])):null;for(const state of states){if(state.position!==undefined&&(!validValue('transform',state)||!state.scale.every(v=>v>=.01)||!['position','rotation','scale'].every(key=>state[key].every(v=>Math.abs(v)<=10000))))throw Error('C++ 변환 데이터 범위 오류');const object=stateObjects?stateObjects.get(state.id):objects.find(o=>o.id===state.id);if(object){Object.assign(object,state);if(state.position!==undefined)update(object);}}
      if(!request.calls)await vm.applyNativeOperations(result.operations||[],vm.bindings.find(b=>b.self===request.self)||{self:request.self,root:{components:[]}});
      if(result.clock){vm.core.scale=result.clock.scale;vm.core.paused=result.clock.paused;if(!request.command)vm.core.time=result.clock.time;}return result;};
    vm=new BlueprintRuntime(objects,prepared.bindings,{...services,game,startupScene:manifest.startupScene,scenePath,inputState:carriedInput,inputAssets:prepared.inputAssets,inputCamera:runtime=>selectGameCamera(objects,runtime.inputState.pointer.size[0]/runtime.inputState.pointer.size[1],runtime.sequenceCamera,id=>meshes.get(id))||(()=>{const aspect=runtime.inputState.pointer.size[0]/runtime.inputState.pointer.size[1];if(fallback.isOrthographicCamera){fallback.left=-7*aspect;fallback.right=7*aspect;}else fallback.aspect=aspect;fallback.updateProjectionMatrix();return fallback;})(),updateObject:update,native,nativeBuild:self=>builds.get((()=>{const o=objects.find(o=>o.id===self);return o?.blueprintAsset||o?.nativeBuildAsset;})()),log:(message,owner=vm)=>logs.push({scene:currentScene,time:owner.core.time,message}),operation:async(key,args,binding,runtime)=>{return services.operation(key,args,binding,runtime);}});
    // Blueprint components must be installed before tile collision preparation, just as in Play.
    for(const object of objects){const tilemap=enabledComponent(object,'TilemapRenderer')?.tilemap||object.tilemapAsset;if(tilemap)object.tileColliders=tileCollisionBoxes(await readAsset(tilemap)).map((box,index)=>({id:'tile_'+index,type:'BoxCollider2D',name:'Tile',properties:{...componentDefaults('BoxCollider2D'),center:box.center,extent:box.size.map(n=>n/2)}}));}
    uniqueBuilds=[...new Map([...builds.values()].map(build=>[build.token,build])).values()];for(const build of uniqueBuilds)await native({command:'reset'},build);await vm.start();return native;
  };
  try{
    let native=await openWorld(await readAsset(currentScene),currentScene);
    for(frame=0;frame<frames;frame++){for(const input of inputs.filter(input=>input.frame===frame))await vm.dispatchInput(input);await vm.flushInput();await advanceNativeFrames(builds,vm,delta,native);await vm.tick(delta);await onFrame?.(frame,vm);
      if(vm.sceneRequest){const request=vm.sceneRequest;carriedInput=preserveInputOnTravel?vm.inputState:null;if(request.reset){game.reset();carriedInput=undefined;vm.resetInput();}await vm.stop('LevelTransition');services.dispose('LevelTransition');native=await openWorld(request.data,request.path,request.arguments);}
    }
    const result={version:1,mode:'headless-logic',project:manifest.name,scene:currentScene,sceneHistory,frames,delta,time:vm.core.time,nativeFrameGroups:structuredClone(vm.nativeFrameGroups||null),objects:structuredClone(objects),animation:services.animationState(),spriteSkin:services.spriteSkinState({vertices:true}),gameplay:structuredClone(prepared.gameplay),game:game.snapshot(),widgets:objects.filter(o=>o.gameplayDebug?.ui).map(o=>({owner:o.id,instances:o.gameplayDebug.ui})),variables:vm.bindings.map(binding=>({self:binding.self,values:Object.fromEntries(binding.variables)})),logs,visualEvents,saves:Object.fromEntries([...savedGames].map(([key,value])=>[key,JSON.parse(value)]))};await vm.stop();return result;
  }finally{try{if(vm?.active)await vm.stop();}finally{try{services?.dispose();}finally{clearModels();host.close();}}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const [file,scenario]=process.argv.slice(2);if(!file)throw Error('node tools/run-project.mjs <project.hbproject> [scenario.json]');const options=scenario?JSON.parse(await fs.readFile(scenario,'utf8')):{};console.log(JSON.stringify(await runProject(file,options),null,2));}catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;}}
