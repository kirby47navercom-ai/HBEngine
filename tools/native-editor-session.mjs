import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Worker} from 'node:worker_threads';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {AssetDocuments, assetSuffix, assetTitle, assetTypes, createAsset, validAsset} from '../prototype/asset-documents.js';
import {documentRevision, patchAsset} from '../prototype/automation.js';
import {blueprintClipboard, catalog, defaultInputValue, defaultsFor, effectivePins, graphContext, makeComment, makeDefinition, makeNode, nodeTitle, pasteNodes, sampleTimeline, timelineLength, typeColors, variableTypes} from '../prototype/blueprint-model.js';
import {connectAutomatic} from '../prototype/blueprint-connections.js';
import {connectMaterial, copyMaterialNodes, disconnectMaterial, evaluateMaterial, resolveMaterialAsset, makeMaterialFunctionCall, makeMaterialNode, materialCatalog, materialFunctionDependencies, materialFunctionTypes, materialGraph, materialLiteralDefault, materialPins, materialPortName, newMaterialLayer, normalizedMaterialEdges, pasteMaterialNodes, refreshMaterialFunctionCall, removeMaterialNodes, resolveMaterialPreview, validMaterialLayer} from '../prototype/material-runtime.js';
import {blueprintClasses} from '../prototype/class-types.js';
import {blueprintClassDefinition,blueprintClassKind} from '../prototype/blueprint-class-defaults.js';
import {nativeEntries, nativeSourceReference, readNativeHeader} from '../prototype/native-model.js';
import {assetKind} from './project-service.mjs';
import {modelSource} from './model-import-state.mjs';
import {modelImportDefaults,modelUnitChoices,modelUpChoices,remapModelOverrides} from '../prototype/model-import.js';
import {createProject, readProjectManifest, recentProjects, rememberProject} from './project-manifest.mjs';
import {createPlacedObject,placementCatalog} from '../prototype/placement-catalog.js';
import {addSceneComponent,componentDefinitions,componentPropertyVisible,defaultsForObject,installBlueprintComponents,objectComponents} from '../prototype/scene-components.js';
import {addMobileControls,addWidget,duplicateWidget,removeWidget,reparentWidget,setWidgetAnchorPreset,transformWidgetSlot,widgetContainers,widgetTypes} from '../prototype/ui-assets.js';
import {projectBytes,projectText} from './project-bytes.mjs';
import {createPrefabInstance} from '../prototype/prefab-instances.js';
import {resolvePrefab} from '../prototype/prefab-variants.js';
import {validateSpriteRigProgram} from '../prototype/sprite-rig-assets.js';
import {editFoliage,editMesh,eraseFoliage,scatterFoliage,simplifyMesh,terrainBrush,terrainStroke,worldAssetTypes} from '../prototype/world-assets.js';
import {withWorldDraft} from '../prototype/world-draft.js';
import {selectMeshBoundaryLoops} from '../prototype/mesh-boundary-selection.js';
import {inspectMeshUV} from '../prototype/mesh-uv-inspection.js';
import {meshUVSelection} from '../prototype/mesh-uv.js';
import {copySceneObjects,editSceneTransform,pasteSceneObjects,setObjectMatrix,validParent} from '../prototype/scene-editor.js';
import {sceneWorldMatrix} from '../prototype/scene-runtime.js';
import {addState,behaviorNodes,makeBehaviorNode,makeSequenceTrack,removeState} from '../prototype/gameplay-assets.js';
import {timelineRows} from '../prototype/timeline-rows.js';
import {timelineSnap} from '../prototype/timeline-rate.js';
import {SequenceSampler} from '../prototype/sequence-sampling.js';
import {makeAnimationNotifyState} from '../prototype/animation-sync.js';
import {addAnimationGraphNode,addAnimationStatePose,animationGraphNodes,animationInputs} from '../prototype/animation-graph-assets.js';
import {addAnimationTransition,animationBlendCurves,animationConditionOps,animationInterrupts,removeAnimationOwnedNodes,removeAnimationState} from '../prototype/animation-state-assets.js';
import {animationPinLabel,animationScopeNodes,statePoseOutput} from '../prototype/animation-state-editor.js';
import {resolveSprite} from '../prototype/sprite-import.js';
import {applyTileTool,spriteAnimationFrame,spriteImage} from '../prototype/two-d-assets.js';
import {tileCellsInRect} from '../prototype/tilemap-editing.js';
import {editSequenceSection,loadSequenceTree} from '../prototype/sequence-sections.js';
import {configureSequenceCurve,sequenceCurveModes,sequenceCurveType,sequenceRangeModes} from '../prototype/sequence-curves.js';
import {editSequenceCurves} from '../prototype/sequence-curve-edit.js';
import {curveControlValue,curveKeyWeight} from '../prototype/curve-sampling.js';
import {defaultEnvironment,defaultSurface} from '../prototype/model.js';
import {createBlueprintResolver} from '../prototype/blueprint-inheritance.js';
import {resolveTakePresetTree,takePresetGroups,takePresetRevisionGuard} from '../prototype/take-preset-inheritance.js';
import {applyTakePreset,takePresetFromSequence} from '../prototype/take-preset-assets.js';
import {captureSaveSettings} from '../prototype/audio-capture-save.js';

const materialKinds = new Set(['material', 'materialfunction', 'materiallayer', 'materialblend']);
const gameplayGraphs=new Set(['behaviortree','statemachine','animgraph']);
const graphKind = doc => doc.kind === 'blueprint' || materialKinds.has(doc.kind) || gameplayGraphs.has(doc.kind);
const previewKind = doc => doc.kind==='blueprint'||doc.kind==='materialinstance'||doc.kind==='modelimport'||Object.hasOwn(worldAssetTypes,doc.kind)||materialKinds.has(doc.kind);
const timelineKind = doc => ['curve','animation','sequenceasset','montage'].includes(doc.kind);
const sequenceTracks=['position','rotation','scale','visible','camera','timeScale','event','animation','audio'];
const sampleSequenceTrack=(sampler,track,time)=>['audio','animation'].includes(track.type)
  ?sampler.clip(track,time)?.clip
  :sampler.sample(track,time,{reference:['camera','event','parent'].includes(track.type)});
function timelineItems(kind,data,track){
  if(kind==='montage'){
    if(track==='sections'||track==='notifies')return [track,data[track],'time'];
    if(track.startsWith('notify-state:'))return ['notifyStates',data.notifyStates??=[],'time'];
    if(track.startsWith('slot:'))return ['clips',data.clips,'start'];
  }
  if(track.startsWith('section-row:'))return ['sections',data.sections??=[],'start'];
  const index=data.tracks?.findIndex(row=>row.id===track);
  if(index>=0)return [String(index),data.tracks[index].clips,'start'];
  throw Error('타임라인 항목을 선택하세요.');
}
const editableText = /\.(?:cpp|hpp|h|c|hlsl|glsl|txt|md|json|yaml|yml|csv|svg|obj|gltf)$/i;
const names = data => [
  ['event', '이벤트 그래프'],
  ...(data.construction ? [['construction', 'Construction Script']] : []),
  ...[...(data.functions || []), ...(data.macros || [])].map(row => [row.id, row.name])
];
const packPin = pin => ({id:pin.id, label:pin.label, color:typeColors[pin.type] || typeColors.any});
const pointerPart = key => key.replaceAll('~','~0').replaceAll('/','~1');
const fieldLabels = {settings:'설정',convertUnits:'파일 단위 변환',sourceUnit:'원본 단위',sourceUp:'원본 위 축',flipForward:'앞 방향 뒤집기',translation:'이동',name:'이름',sceneName:'레벨 이름',objects:'오브젝트',environment:'환경',position:'위치',rotation:'회전',scale:'크기',parent:'부모 에셋',clip:'오디오 클립',volume:'볼륨',pitch:'피치',loop:'반복',friction:'마찰',restitution:'반발력',density:'밀도',parameters:'매개변수',surfaceOverrides:'표면 오버라이드'};

export function nativeEditorSession(bridge) {
  let record, documents = new AssetDocuments(), viewport, preview, previewSource, previewScene, previewNode, build, buildJobs, lastBuild;
  const sequenceSamplers=new WeakMap();
  const sceneViews=new Map();
  let nativeMetadata=new WeakMap();
  let audioPreview,cppJob,contentScan,meshAtlas;
  let contentScanId=0;
  async function stopAudioPreview(){
    if(!audioPreview)return;
    const {context,source}=audioPreview;
    audioPreview=null;
    try{source?.stop();}catch{}
    await context.close();
  }
  const project = () => {
    if (!record) throw Error('프로젝트를 먼저 여세요.');
    return record.project;
  };
  const current = () => {
    if (!documents.current) throw Error('문서를 먼저 여세요.');
    return documents.current;
  };
  function targetDocument(file) {
    if (file===undefined) return current();
    const doc=documents.items.get(file);
    if (!doc) throw Error('열린 문서를 선택하세요.');
    return doc;
  }
  const summary = doc => ({path:doc.path, kind:doc.kind, dirty:doc.dirty});
  const tabs = () => [...documents.items.values()].map(summary);
  const animationTransition=(doc,view,id)=>{
    if(doc.kind!=='animgraph')throw Error('애니메이션 상태 그래프를 선택하세요.');
    const {machine,state}=animationView(doc.data,view);
    const transition=!state&&machine?.properties.transitions.find(row=>row.id===id);
    if(!transition)throw Error('전이를 선택하세요.');
    return {machine,transition};
  };
  const conditionOps=type=>type==='trigger'?['true']:type==='bool'?['true','false']:type==='enum'?['eq','ne']:['eq','ne','gt','ge','lt','le'];
  const revision = doc => documentRevision(doc.data);
  const response = async doc => ({...summary(doc), revision:await revision(doc), tabs:tabs(), text:doc.kind === 'text' ? doc.data : JSON.stringify(doc.data, null, 2), graph:graphKind(doc), form:doc.kind !== 'text' && !graphKind(doc)});
  const check = async (doc, expected) => {
    if (await revision(doc) !== expected) throw Object.assign(Error('문서가 변경됐어요. 다시 읽으세요.'), {code:'REVISION_CONFLICT'});
  };
  function change(doc, next) {
    if (!validAsset(doc.kind, next)) throw Error('에셋 형식이나 값 범위를 확인하세요.');
    if (JSON.stringify(next) === JSON.stringify(doc.data)) return;
    doc.history.push(doc.data);
    if (doc.history.length > 80) doc.history.shift();
    doc.future.length = 0;
    doc.data = next;
    if(doc.kind==='text'&&doc.path.startsWith('Source/'))nativeMetadata=new WeakMap();
    doc.dirty = JSON.stringify(next) !== doc.saved;
  }
  async function loadDocument(file) {
    if(typeof file!=='string')throw Error('프로젝트 문서를 선택하세요.');
    const kind = assetKind(file);
    if (!assetSuffix[kind] && !editableText.test(file)) throw Error('이 파일은 전용 미리보기에서 열어야 해요.');
    if (!documents.items.has(file)) {
      const source = await project().read(file);
      const text = await fs.readFile(source.file,'utf8');
      documents.open(file, assetSuffix[kind] ? kind : 'text', assetSuffix[kind] ? JSON.parse(text.replace(/^\uFEFF/, '')) : text);
    }
    return documents.items.get(file);
  }
  async function openDocument(file) {
    await loadDocument(file);
    return response(documents.select(file));
  }
  function cppPaths(doc,headerPath,sourcePath){
    const native=doc.kind==='blueprint'?doc.data.native:null;
    if(native?.headerPath||native?.classes){headerPath=native.headerPath||'Source/DoorController.h';sourcePath=native.sourcePath||'Source/DoorController.cpp';}
    else if(doc.kind==='text'&&/^Source\/.*\.(?:h|hpp|hh|cpp|cc|cxx)$/i.test(doc.path)){
      const base=doc.path.replace(/\.[^.]+$/,'');
      headerPath??=/\.(h|hpp|hh)$/i.test(doc.path)?doc.path:base+'.h';
      sourcePath??=/\.(cpp|cc|cxx)$/i.test(doc.path)?doc.path:base+'.cpp';
    }else throw Error('C++ 소스 또는 C++ 클래스 블루프린트를 열어 주세요.');
    return {headerPath,sourcePath};
  }
  async function openProject(next) {
    if (tabs().some(doc => doc.dirty)) throw Error('변경한 문서를 먼저 저장하거나 닫으세요.');
    if(cppJob?.status==='running'||build&&buildJobs.get(record,build).status==='running')throw Error('빌드가 끝나면 프로젝트를 바꾸세요.');
    const candidate = await next();
    await stopAudioPreview();
    for(const view of sceneViews.values())await view.close();
    sceneViews.clear();
    await rememberProject(candidate);
    contentScan?.controller.abort();contentScan=undefined;
    if(meshAtlas?.worker)await meshAtlas.worker.terminate();
    meshAtlas=undefined;
    record = candidate;
    documents = new AssetDocuments();
    buildJobs?.close();buildJobs=undefined;build=undefined;lastBuild=undefined;
    cppJob=undefined;
    nativeMetadata=new WeakMap();
    return {file:record.file, name:record.manifest.name, startupScene:record.manifest.startupScene};
  }
  async function placeSceneAsset(next,doc,asset,actor,position){
    if(typeof asset!=='string'||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))
      throw Error('배치할 에셋과 위치를 확인하세요.');
    const kind=assetKind(asset);
    const readText=async name=>{
      const open=documents.items.get(name);
      return open?.kind==='text'?open.data:projectText(project(),name);
    };
    const read=async name=>documents.items.get(name)?.data??JSON.parse((await projectText(project(),name)).replace(/^\uFEFF/,''));
    const data=Object.hasOwn(assetSuffix,kind)?await read(asset):null;
    if(data&&!validAsset(kind,data))throw Error('에셋 형식을 확인하세요.');
    const attached={navmesh:'NavigationMesh',ability:'AbilitySystem',animgraph:'AnimationGraph',behaviortree:'BehaviorTree',statemachine:'StateMachine',montage:'MontagePlayer',sequenceasset:'SequencePlayer'}[kind];
    if(attached||kind==='material'||kind==='materialinstance'){
      if(!actor||actor.locked)throw Error('잠겨 있지 않은 장면 오브젝트를 먼저 선택하세요.');
      if(attached){
        const component=objectComponents(actor).find(row=>row.type===attached)||addSceneComponent(actor,attached);
        component.properties[kind==='ability'?'ability':'asset']=asset;
      }else{
        actor.materialSurface=evaluateMaterial(await resolveMaterialAsset(data,read));
        actor.materialAsset=asset;
        const renderer=objectComponents(actor).find(row=>row.type==='MeshRenderer');
        if(renderer)renderer.properties.material=asset;
      }
      return actor.id;
    }
    if(kind==='prefab'){
      const dependencies=new Set();
      const prefab=await resolvePrefab(asset,name=>{dependencies.add(name);return read(name);},{validate:row=>validAsset('prefab',row)});
      const rows=createPrefabInstance(asset,{...prefab,dependencies:[...dependencies],sourceRevision:await documentRevision(data)});
      const root=rows.find(row=>row.prefabLink);
      root.position=root.position.map((value,index)=>value+position[index]);
      next.objects.push(...rows);return root.id;
    }
    let object;
    const make=(kind,group='WORLD')=>({id:crypto.randomUUID(),name:assetTitle(asset),kind,group,position:[...position],rotation:[0,0,0],scale:[1,1,1],visible:true,components:defaultsForObject(kind)});
    if(kind==='blueprint'){
      const root=await createBlueprintResolver(read,readText)(asset),parent=root.settings?.parentClass||'Actor';
      if(!blueprintClassDefinition(parent,root.native)?.placeable)throw Error('이 클래스는 장면에 배치할 수 없어요.');
      object=make(blueprintClassKind(parent,root.components,root.native));
      object.name=root.name;object.blueprint=root.name;object.blueprintAsset=asset;object.components=[];
      installBlueprintComponents([object],[{self:object.id,root}]);
    }else if(kind==='model'&&/\.(?:gltf|glb|obj|fbx)$/i.test(asset)){
      await project().read(asset);
      object=make('model');object.asset=asset;
    }else if(Object.hasOwn(worldAssetTypes,kind)){
      object=make('empty');
      addSceneComponent(object,'MeshRenderer').properties.mesh=asset;
      addSceneComponent(object,'WorldCollision').properties.enabled=kind!=='foliage';
    }else if(kind==='scene'){
      if(asset===doc.path)throw Error('현재 장면을 자기 안에 배치할 수 없어요.');
      object=make('empty','LEVELS');
      Object.assign(addSceneComponent(object,'LevelStreaming').properties,{scene:asset,mode:'always'});
    }else if(kind==='tilemap'){
      object=make('tilemap');
      object.components.find(row=>row.type==='TilemapRenderer').properties.tilemap=asset;
    }else if(kind==='audioasset'){
      object=make('audio');
      Object.assign(object.components.find(row=>row.type==='AudioSource').properties,{clip:asset,playOnStart:data.autoplay});
    }else if(['texture','sprite','spriterig','spriteanimation'].includes(kind)){
      object=make('sprite');
      const sprite=object.components.find(row=>row.type==='SpriteRenderer').properties;
      if(kind==='texture'){await project().read(asset);sprite.texture=asset;}
      else if(kind==='sprite')sprite.sprite=asset;
      else if(kind==='spriterig'){
        validateSpriteRigProgram(data);sprite.sprite=data.sprite;
        addSceneComponent(object,'SpriteSkin').properties.rig=asset;
        if(data.solvers?.length)addSceneComponent(object,'IKManager2D');
      }else{
        sprite.sprite=data.frames[0]?.sprite||'';
        addSceneComponent(object,'Animator').properties.clip=asset;
      }
    }else throw Error('장면에 배치할 수 없는 에셋이에요.');
    next.objects.push(object);return object.id;
  }
  function graphFor(doc, data, view) {
    if (!graphKind(doc)) throw Error('노드 그래프 문서를 선택하세요.');
    if (doc.kind !== 'blueprint') return data.graph ??= materialGraph();
    if (!names(data).some(([id]) => id === view)) throw Error('그래프가 없어요.');
    if(nativeMetadata.has(doc.data))data.native=nativeMetadata.get(doc.data);
    return graphContext(data, view);
  }
  async function loadGraphNative(doc){
    const native=doc.kind==='blueprint'&&doc.data.native;
    if(!native?.headerPath||nativeMetadata.has(doc.data))return;
    const readText=async file=>{
      const open=documents.items.get(file);
      return open?.kind==='text'?open.data:(await projectBytes(project(),file)).toString('utf8');
    };
    const header=await readText(native.headerPath);
    nativeMetadata.set(doc.data,{...await readNativeHeader(header,{sourcePath:native.headerPath,readText}),header,headerPath:native.headerPath,sourcePath:native.sourcePath});
  }
  function graphModel(doc, view) {
    if(doc.kind==='animgraph')return animationGraphModel(doc.data,view);
    if(gameplayGraphs.has(doc.kind))return gameplayGraph(doc.kind,doc.data);
    const data = structuredClone(doc.data), bp = doc.kind === 'blueprint', graph = graphFor(doc, data, view);
    const nodes = graph.nodes.map(node => {
      const pins = bp ? {inputs:effectivePins(node,'in',graph),outputs:effectivePins(node,'out',graph)} : materialPins(node,graph);
      const x = bp ? node.position.x : node.px ?? (Math.abs(node.x) < 2 ? node.x * 580 : node.x);
      return {id:node.id,breakpoint:bp&&node.breakpoint===true, title:bp ? nodeTitle(node,graph) : node.portName || node.title || node.key || node.id, x, y:bp ? node.position.y : node.y,
        inputs:pins.inputs.map(packPin), outputs:pins.outputs.map(packPin)};
    });
    const palette = (bp ? catalog.filter(row => row.kind !== 'variable' && (row.kind!=='event'||view==='event'&&!graph.nodes.some(node=>node.key===row.key))) : materialCatalog.filter(row => graph.mode==='function'
      ? !['surface','layerStack','legacyColor','legacyRough'].includes(row.key)&&(!data.domain||!['functionInput','functionOutput'].includes(row.key))
      : !['surface','functionInput','functionOutput'].includes(row.key)))
      .map(row => ({id:row.key, title:row.title}));
    if(bp){
      for(const variable of data.variables)for(const prefix of ['get','set'])palette.push({id:prefix+'Variable:'+variable.id,title:(prefix==='get'?'Get ':'Set ')+variable.name});
      for(const [kind,items] of [['callFunction',data.functions],['callMacro',data.macros]])for(const definition of items||[])if(definition.id!==view)palette.push({id:kind+':'+definition.id,title:definition.name});
      const symbolActions={dispatcherCall:'Call',dispatcherBind:'Bind',dispatcherUnbind:'Unbind',dispatcherEvent:'Event',interfaceCall:'Message'};
      for(const [kind,items] of [['dispatcher',data.dispatchers],['interface',data.interfaces]])for(const symbol of items||[]){
        const actions=kind==='interface'?['interfaceCall']:['dispatcherCall','dispatcherBind','dispatcherUnbind',...(view==='event'&&!graph.nodes.some(node=>node.key==='dispatcherEvent'&&node.symbolId===symbol.id)?['dispatcherEvent']:[])];
        for(const key of actions)palette.push({id:key+':'+symbol.id,title:symbolActions[key]+' '+symbol.name});
      }
      for(const entry of nativeEntries(graph))if(entry.kind!=='event'||view==='event'&&!graph.nodes.some(node=>node.key===entry.key&&node.nativeId===entry.nativeId))
        palette.push({id:entry.key+':'+entry.nativeId,title:entry.title+' · '+entry.group});
    }
    return {kind:doc.kind, view, views:bp ? names(data) : [], nodes, edges:bp ? graph.edges : normalizedMaterialEdges(graph), comments:graph.comments || [], palette};
  }
  function materialNodeProperties(node,data){
    const field=(id,label,value,extra={})=>({id,label,value,linked:false,property:true,...extra});
    const rows=[];
    if(['functionInput','functionOutput'].includes(node.key)){
      rows.push(field('portName','핀 이름',node.portName),field('priority','핀 순서',node.priority),field('description','핀 설명',node.description));
      if(node.key==='functionInput')rows.push(field('useDefault','기본값 사용',node.useDefault));
    }
    if(['functionInput','functionOutput','staticSwitch'].includes(node.key)){
      const types=node.key==='staticSwitch'?['numeric',...materialFunctionTypes]:materialFunctionTypes;
      rows.push(field('valueType','핀 자료형',node.valueType,{linked:!!data.domain&&node.key!=='staticSwitch',options:types.map(type=>[type,type])}));
    }
    if(node.key==='functionCall')rows.push(field('refreshFunction','함수',node.asset,{button:'핀 갱신'}));
    if(node.key==='layerStack'){
      rows.push(field('layer:add','레이어 스택','',{button:'레이어 추가',assetKind:'materiallayer'}));
      for(const [index,layer] of node.layers.entries()){
        const id='layer:'+layer.id+':';
        rows.push(field(id+'name',`${index+1}. 레이어 이름`,layer.name),
          field(id+'asset',layer.asset,layer.asset,{button:'레이어 교체',assetKind:'materiallayer'}),
          field(id+'parameters','레이어 파라미터',layer.parameters),
          field(id+'duplicate','레이어','',{button:'복제'}));
        if(index)rows.push(field(id+'enabled','레이어 표시',layer.enabled),
          field(id+'blend',layer.blend||'블렌드',layer.blend,{button:'블렌드 선택',assetKind:'materialblend'}),
          field(id+'blendClear','블렌드','',{button:'블렌드 해제',linked:!layer.blend}),
          field(id+'blendParameters','블렌드 파라미터',layer.blendParameters,{linked:!layer.blend}),
          field(id+'up','레이어 순서','',{button:'위로',linked:index===1}),
          field(id+'down','레이어 순서','',{button:'아래로',linked:index===node.layers.length-1}),
          field(id+'remove','레이어','',{button:'삭제'}));
      }
    }
    return rows;
  }
  function editMaterialNodeProperty(data,graph,node,property,value){
    if(property.id.startsWith('layer:')){
      const [,layerId,key]=property.id.split(':');
      const index=node.layers.findIndex(layer=>layer.id===layerId),layer=node.layers[index];
      if(property.assetKind&&(typeof value!=='string'||assetKind(value)!==property.assetKind))throw Error('레이어 에셋 형식을 확인하세요.');
      if(layerId==='add')node.layers.push(newMaterialLayer(value,value.split('/').at(-1).split('.').slice(0,-2).join('.').slice(0,80)));
      else if(key==='duplicate')node.layers.splice(index+1,0,{...structuredClone(layer),id:newMaterialLayer(layer.asset,layer.name).id,name:(layer.name+' 복사').slice(0,80)});
      else if(key==='remove')node.layers.splice(index,1);
      else if(key==='up'||key==='down'){
        const other=index+(key==='up'?-1:1);
        [node.layers[index],node.layers[other]]=[node.layers[other],node.layers[index]];
      }else if(key==='blendClear'){layer.blend='';layer.blendParameters={};}
      else{
        layer[key]=value;
        if(key==='asset')layer.parameters={};
        if(key==='blend')layer.blendParameters={};
      }
      return;
    }
    if(property.options&&!property.options.some(option=>option[0]===value))throw Error('핀 자료형을 확인하세요.');
    if(property.id==='valueType'&&value!==node.valueType){
      if(node.key==='functionInput')node.value=materialLiteralDefault(value);
      node.inputValues={};
      graph.edges=normalizedMaterialEdges(graph).filter(edge=>edge.from.node!==node.id&&edge.to.node!==node.id);
    }
    node[property.id]=value;
  }
  function animationView(data,view){
    if(view==='event')return {};
    const [kind,id,subview]=view.split(':');
    const machine=data.nodes.find(node=>node.id===id&&node.type==='stateMachine');
    const state=machine?.properties.states.find(row=>row.id===subview);
    if(!machine||kind!=='machine'&&kind!=='pose'||kind==='pose'&&!state)throw Error('애니메이션 그래프 보기를 선택하세요.');
    return {machine,state};
  }
  function animationGraphModel(data,view){
    const {machine,state}=animationView(data,view);
    const views=[['event','포즈 그래프']];
    for(const node of data.nodes)if(node.type==='stateMachine'){
      views.push(['machine:'+node.id,node.name]);
      for(const row of node.properties.states)views.push(['pose:'+node.id+':'+row.id,node.name+' / '+row.name]);
    }
    const pin=(id,label=id)=>({id,label,color:typeColors.object});
    if(machine&&!state){
      const {entry,states,transitions}=machine.properties;
      const graphNode=(id,title,x,y,input=true)=>({id,title,x,y,inputs:input?[pin('in','진입')]:[],outputs:[pin('out','전이')]});
      const edge=(from,to)=>({from:{node:from,pin:'out'},to:{node:to,pin:'in'}});
      return {view,views,comments:[],palette:[{id:'state',title:'상태'}],
        nodes:[graphNode('entry','Entry',20,80,false),graphNode('any','Any State',20,260,false),...states.map(row=>graphNode(row.id,row.name,row.x,row.y))],
        edges:[edge('entry',entry),...transitions.map(row=>edge(row.from,row.to))]};
    }
    const nodes=animationScopeNodes({doc:{data},poseScope:state?{machine:machine.id,state:state.id}:null});
    const ids=new Set(nodes.map(node=>node.id));
    return {view,views,comments:[],palette:Object.entries(animationGraphNodes).filter(([id])=>id!=='output').map(([id,meta])=>({id,title:meta.label})),
      nodes:nodes.map(node=>({id:node.id,title:node.name,x:node.x,y:node.y,inputs:animationInputs(node).map((id,index)=>pin(id,animationPinLabel(node,id,index,data))),
        outputs:node.type==='output'?[]:[pin('pose','포즈')]})),
      edges:nodes.flatMap(node=>Object.entries(node.inputs).filter(([,source])=>ids.has(source))
        .map(([input,source])=>({from:{node:source,pin:'pose'},to:{node:node.id,pin:input}})))};
  }
  function editAnimationGraph(data,view,{action,id,key,x,y,from,to,pin,output}){
    const {machine,state}=animationView(data,view);
    if(machine&&!state){
      const props=machine.properties,selected=props.states.find(row=>row.id===id);
      if(action==='add'||action==='move'){
        if(![x,y].every(Number.isFinite))throw Error('상태 위치를 확인하세요.');
        if(action==='add')addAnimationStatePose(data,machine,{x,y});
        else if(selected)Object.assign(selected,{x,y});
        else throw Error('이동할 상태를 선택하세요.');
      }else if(action==='connect'){
        if(from?.pin!=='out'||to?.pin!=='in'||!props.states.some(row=>row.id===to.node))throw Error('상태 전이를 연결하세요.');
        if(from.node==='entry')props.entry=to.node;
        else{
          if(from.node===to.node||props.transitions.some(row=>row.from===from.node&&row.to===to.node))throw Error('이미 연결된 전이예요.');
          addAnimationTransition(machine,from.node,to.node,data.parameters);
        }
      }else if(action==='disconnect')props.transitions=props.transitions.filter(row=>row[output?'from':'to']!==id);
      else if(action==='delete')removeAnimationState(machine,id,data);
      else throw Error('상태 그래프 편집 명령을 확인하세요.');
      return;
    }
    const visible=new Set(animationScopeNodes({doc:{data},poseScope:state?{machine:machine.id,state:state.id}:null}).map(row=>row.id));
    const node=data.nodes.find(row=>row.id===id&&visible.has(row.id));
    if(action==='add'||action==='move'){
      if(![x,y].every(Number.isFinite))throw Error('노드 위치를 확인하세요.');
      if(action==='move'){
        if(!node)throw Error('노드를 선택하세요.');
        Object.assign(node,{x,y});
      }else{
        if(key==='output'||!Object.hasOwn(animationGraphNodes,key))throw Error('애니메이션 노드 종류를 확인하세요.');
        addAnimationGraphNode(data,key,x,y,state?machine.id+'/'+state.id:undefined);
      }
    }else if(action==='connect'){
      const source=data.nodes.find(row=>row.id===from?.node&&visible.has(row.id));
      if(!source||source.type==='output'||from.pin!=='pose')throw Error('포즈 연결을 확인하세요.');
      if(state&&to?.node===statePoseOutput&&to.pin==='pose')machine.inputs[state.input]=source.id;
      else{
        const target=data.nodes.find(row=>row.id===to?.node&&visible.has(row.id));
        if(!target||!animationInputs(target).includes(to.pin))throw Error('포즈 연결을 확인하세요.');
        target.inputs[to.pin]=source.id;
      }
    }else if(action==='disconnect'||action==='delete'){
      if(action==='disconnect'&&!output&&state&&id===statePoseOutput){delete machine.inputs[state.input];return;}
      if(!node)throw Error('노드를 선택하세요.');
      if(action==='delete'){
        if(id===data.output)throw Error('출력 노드는 유지해야 해요.');
        removeAnimationOwnedNodes(data,new Set([id]),new Set([id]));
      }else if(!output)delete node.inputs[pin];
      else for(const row of data.nodes)for(const [input,source] of Object.entries(row.inputs))if(source===id)delete row.inputs[input];
    }else throw Error('포즈 그래프 편집 명령을 확인하세요.');
  }
  function gameplayGraph(kind,data){
    const behavior=kind==='behaviortree',rows=behavior?data.nodes:data.states;
    const inputs=[{id:'in',label:behavior?'부모':'진입',color:'#d1dadd'}],outputs=[{id:'out',label:behavior?'자식':'전이',color:'#d1dadd'}];
    const nodes=rows.map(row=>({id:row.id,title:row.name,x:row.x,y:row.y,inputs:behavior&&row.id===data.root?[]:inputs,
      outputs:behavior&&behaviorNodes[row.type].children===0?[]:outputs}));
    const edges=(behavior?rows.flatMap(row=>row.children.map(child=>({from:row.id,to:child}))):data.transitions)
      .map(edge=>({from:{node:edge.from,pin:'out'},to:{node:edge.to,pin:'in'}}));
    const palette=behavior?Object.entries(behaviorNodes).map(([id,node])=>({id,title:node.label})):[{id:'state',title:'상태'}];
    return {nodes,edges,views:[],comments:[],palette};
  }
  function changeGameplayGraph(doc,next,{action,id,key,x,y,from,to,pin,output}){
    const behavior=doc.kind==='behaviortree',rows=behavior?next.nodes:next.states;
    const get=id=>{const node=rows.find(row=>row.id===id);if(!node)throw Error('노드를 선택하세요.');return node;};
    if(action==='add'||action==='move'){
      if(![x,y].every(Number.isFinite))throw Error('노드 위치를 확인하세요.');
      x=Math.max(-10000,Math.min(10000,x));y=Math.max(-10000,Math.min(10000,y));
      if(action==='move')Object.assign(get(id),{x,y});
      else if(behavior){
        const parent=get(id||next.root),node=makeBehaviorNode(key,x,y);
        parent.children.push(node.id);rows.push(node);
      }else addState(next,{position:[x,y]});
    }else if(action==='connect'){
      const a=get(from.node),b=get(to.node);
      if(a===b)throw Error('서로 다른 노드를 선택하세요.');
      if(behavior){
        if(b.id===next.root)throw Error('루트 노드에는 부모가 없어요.');
        for(const row of rows)row.children=row.children.filter(child=>child!==b.id);
        a.children.push(b.id);
      }else if(!next.transitions.some(edge=>edge.from===a.id&&edge.to===b.id)){
        next.transitions.push({id:crypto.randomUUID(),from:a.id,to:b.id,exitTime:0,hasExitTime:false,event:'',conditions:[]});
      }
    }else if(action==='disconnect'&&!behavior)next.transitions=next.transitions.filter(edge=>edge[output?'from':'to']!==id);
    else if(action==='delete'){
      get(id);
      if(behavior){
        if(id===next.root)throw Error('루트 노드는 유지해야 해요.');
        const removed=new Set(),pending=[id];
        while(pending.length){const item=get(pending.pop());if(removed.has(item.id))continue;removed.add(item.id);pending.push(...item.children);}
        next.nodes=rows.filter(row=>!removed.has(row.id));
        for(const row of next.nodes)row.children=row.children.filter(child=>!removed.has(child));
      }else removeState(next,id);
    }else throw Error('이 그래프에서 사용할 수 있는 편집 명령을 선택하세요.');
    change(doc,next);
  }
  function fieldsFor(doc, parts) {
      if (doc.kind === 'text' || graphKind(doc)&&!gameplayGraphs.has(doc.kind)) throw Error('속성 편집 문서를 선택하세요.');
    let data = doc.data;
    for (const key of parts) {
      if (!data || typeof data !== 'object' || !Object.hasOwn(data,key)) throw Error('속성 경로를 다시 선택하세요.');
      data = data[key];
    }
    if (!data || typeof data !== 'object') throw Error('속성 경로를 다시 선택하세요.');
    const modelSettings=doc.kind==='modelimport'&&parts.length===1&&parts[0]==='settings';
    const lodMode=doc.kind==='lod'&&!parts.length;
    const component=doc.kind==='scene'&&parts.length===5&&parts[0]==='objects'&&parts[2]==='components'&&parts[4]==='properties'
      ? doc.data.objects[parts[1]]?.components[parts[3]] : null;
    return Object.entries(data).filter(([key])=>!component||componentPropertyVisible(component.type,key,data)).map(([key,value]) => {
      const type = value === null ? 'null' : typeof value;
      const definition=component&&componentDefinitions[component.type]?.properties[key];
      const label = definition?.label || fieldLabels[key] || value?.name || key;
      const modelChoices=modelSettings?(key==='sourceUnit'?modelUnitChoices:key==='sourceUp'?modelUpChoices:null)
        :lodMode&&key==='mode'?[['distance','거리'],['screen','화면 높이']]:null;
      const control = modelChoices ? {kind:'select',value,options:modelChoices}
        : definition?.type==='select' ? {kind:'select',value,options:definition.choices.map(choice=>Array.isArray(choice)?choice:[choice,choice])}
        : type === 'object' ? {kind:'button',text:Array.isArray(value) ? `열기 (${value.length})` : '열기'}
        : type === 'boolean' ? {kind:'checkbox',checked:value}
        : {kind:'text',value:String(value),disabled:key==='version' || type==='null'};
      return {key, label, type, control};
    });
  }
  const scene=()=>{
    const doc=current();
    if (doc.kind!=='scene') throw Error('장면 문서를 선택하세요.');
    return doc;
  };
  const assetOfKind=(kind,doc=current())=>{
    if (kind==='timeline'? !timelineKind(doc):doc.kind!==kind) throw Error('편집기와 일치하는 에셋을 선택하세요.');
    return doc;
  };
  const takePreset=async (file,root)=>{
    const owner=project();
    const read=async name=>{
      const data=JSON.parse((await projectText(owner,name)).replace(/^\uFEFF/,''));
      return {data,revision:await documentRevision(data)};
    };
    return resolveTakePresetTree(file,read,root?{root:{data:root.data,revision:await revision(root)}}:{});
  };
  const methods = {
    'project.open': ({file}) => openProject(() => readProjectManifest(file)),
    'project.create': ({name,directory,template}) => openProject(() => createProject(name,directory,template)),
    'project.recent': () => recentProjects(),
    'project.recovery': params=>project().assetRecovery(params),
    'project.recover': params=>project().resolveRecovery(params),
    'project.buildProfiles': async ()=>{
      project();
      const {readBuildProfiles}=await import('./build-game.mjs');
      const {profiles,revision}=await readBuildProfiles(record);
      const {profileTarget,frameSettings,kioskSettings,mobileSettings,nativeGraphicsAPI,windowsRuntime,windowsRenderer}=await import('../prototype/build-profile.js');
      const effective=Object.fromEntries(profiles.map(profile=>[profile.id,{
        target:profileTarget(profile),...frameSettings(profile),kiosk:kioskSettings(profile),
        mobile:mobileSettings(profile),nativeGraphicsAPI:nativeGraphicsAPI(profile),
        windowsRuntime:windowsRuntime(profile),windowsRenderer:windowsRenderer(profile),
      }]));
      return {profiles,revision,effective};
    },
    'project.buildProfileSave': async ({id,changes,expectedRevision,action='edit',newId})=>{
      project();
      const {readBuildProfiles}=await import('./build-game.mjs');
      const {profiles,revision}=await readBuildProfiles(record);
      if(revision!==expectedRevision)throw Error('빌드 프로필이 변경됐어요. 다시 읽으세요.');
      const index=profiles.findIndex(item=>item.id===id);
      if(index<0)throw Error('빌드 프로필을 선택하세요.');
      const profile=profiles[index];
      const editable=new Set(['name','productName','configuration','width','height','targetFrameRate','framePacing','scenes','nativeGraphicsAPI','mobile','windowsSigning','kiosk','target','windowsRuntime','windowsRenderer']);
      if(action==='delete')profiles.splice(index,1);
      else{
        if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).some(key=>!editable.has(key)))throw Error('편집할 빌드 설정을 확인하세요.');
        if(action==='edit')Object.assign(profile,changes);
        else if(action==='copy')profiles.push({...profile,...changes,id:newId});
        else throw Error('빌드 프로필 명령을 확인하세요.');
      }
      buildJobs??=new (await import('./build-jobs.mjs')).BuildJobs();
      const saved=await buildJobs.save(record,{version:1,profiles},expectedRevision);
      return {profiles:saved.profiles,revision:saved.revision};
    },
    'project.build': async ({id,expectedRevision,dryRun=false})=>{
      project();
      if(tabs().some(doc=>doc.dirty))throw Error('빌드하기 전에 변경한 문서를 저장하세요.');
      if(typeof dryRun!=='boolean')throw Error('빌드 검사 옵션을 확인하세요.');
      buildJobs??=new (await import('./build-jobs.mjs')).BuildJobs();
      const job=await buildJobs.start(record,{profileId:id,expectedRevision,dryRun});
      build=job.id;
      return job;
    },
    'project.buildStatus': ()=>{
      if(!build)return {status:'idle'};
      const job=buildJobs.get(record,build);
      if(job.status==='done'&&job.result?.executable)lastBuild=job.id;
      return job;
    },
    'project.buildCancel': ()=>build&&buildJobs.cancel(record,build),
    'project.buildRun': ()=>{
      if(!lastBuild)throw Error('실행할 Windows 빌드가 없어요.');
      return buildJobs.open(record,lastBuild,'run');
    },
    'cpp.parents': ()=>Object.keys(blueprintClasses),
    'cpp.create': async ({folder='Source',name,parent='Actor',tick=false})=>{
      if(typeof folder!=='string'||!/^Source(?:\/[^/]+)*$/.test(folder))throw Error('Source 폴더를 선택하세요.');
      const {createCppClass}=await import('./external-editor.mjs');
      const files=await createCppClass(project(),folder,name,parent,{tick});
      await loadDocument(files.source);
      return openDocument(files.path);
    },
    'cpp.openExternal': async ({path})=>{
      const {openExternal}=await import('./external-editor.mjs');
      return openExternal(project(),path);
    },
    'cpp.build': async ({path,expectedRevision,headerPath,sourcePath})=>{
      if(cppJob?.status==='running')throw Error('C++ 빌드가 실행 중이에요.');
      const doc=targetDocument(path),owner=project();
      await check(doc,expectedRevision);
      ({headerPath,sourcePath}=cppPaths(doc,headerPath,sourcePath));
      if(tabs().some(item=>item.dirty&&(item.path.startsWith('Source/')||item.path===doc.path)))throw Error('빌드할 소스와 문서를 저장하세요.');
      const job={status:'running',path:doc.path};cppJob=job;
      (async()=>{
        const {readNativeFiles}=await import('./native-project.mjs');
        const files=await readNativeFiles(owner);
        const header=files.find(file=>file.path===headerPath)?.content,source=files.find(file=>file.path===sourcePath)?.content;
        if(header===undefined||source===undefined)throw Error('C++ 헤더와 구현 파일을 확인하세요.');
        const {NativeHost}=await import('./native-host.mjs');
        const host=new NativeHost();
        try{
          const result=await host.build(header,source,{files,headerPath,sourcePath});
          Object.assign(job,{status:'done',compiler:result.compiler,classes:result.metadata.classes.map(row=>row.name),key:result.cacheKey});
        }finally{await host.close();}
      })().catch(error=>Object.assign(job,{status:'failed',error:error.message}));
      return {...job};
    },
    'cpp.buildStatus': ()=>cppJob?{...cppJob}:{status:'idle'},
    'cpp.classes': async ({path,headerPath,sourcePath}={})=>{
      const doc=targetDocument(path),readText=async file=>(await projectBytes(project(),file)).toString('utf8');
      ({headerPath,sourcePath}=cppPaths(doc,headerPath,sourcePath));
      const header=await readText(headerPath),data=await readNativeHeader(header,{sourcePath:headerPath,readText});
      return {headerPath,sourcePath,classes:data.classes.filter(row=>row.blueprintable).map(row=>row.name)};
    },
    'cpp.blueprint': async ({folder='Assets',name,className,headerPath,sourcePath})=>{
      if(typeof folder!=='string'||!/^Assets(?:\/[^/]+)*$/.test(folder)||typeof name!=='string'||!name.trim()||/[/\\:<>?"|*\x00-\x1f]/.test(name)||
        typeof headerPath!=='string'||!/^Source\/.+\.(?:h|hpp|hh)$/i.test(headerPath)||typeof sourcePath!=='string'||!/^Source\/.+\.(?:cpp|cc|cxx)$/i.test(sourcePath))throw Error('클래스 블루프린트 이름과 경로를 확인하세요.');
      const readText=async file=>(await projectBytes(project(),file)).toString('utf8');
      const header=await readText(headerPath),source=await readText(sourcePath);
      const metadata=await readNativeHeader(header,{sourcePath:headerPath,readText});
      if(!metadata.classes.some(row=>row.name===className&&row.blueprintable))throw Error('블루프린트에서 상속할 수 있는 C++ 클래스를 선택하세요.');
      const data=createAsset('blueprint',name.trim());
      data.settings.parentClass=className;
      data.native=nativeSourceReference({header,source,headerPath,sourcePath});
      const file=folder+'/'+name.trim()+assetSuffix.blueprint;
      await project().checkedBatch([{path:file,text:JSON.stringify(data,null,2),expected:null}]);
      return openDocument(file);
    },
    'content.types': () => Object.entries(assetTypes).filter(([kind,info])=>assetSuffix[kind]&&!info.sourceOnly)
      .map(([kind,info])=>({kind,suffix:assetSuffix[kind],label:info.label,prefix:info.prefix})),
    'content.list': async ({folder='',query='',recursive=!!query,contents=false,type='all'},signal) => {
      const listed = await project().list({folder,query,browse:true,recursive,contents,type,signal});
      const found = new Map(listed.entries.map(row => [row.path,row]));
      for (const row of listed.folders) {
        const parent = path.posix.dirname(row.path);
        if (!query && parent === (folder || '.')) found.set(row.path,row);
      }
      const entries = [...found.values()];
      entries.sort((a,b) => Number(b.kind==='folder')-Number(a.kind==='folder') || a.path.localeCompare(b.path));
      return {entries,folders:listed.folders,total:listed.total,issues:listed.issues||[]};
    },
    'content.listStart': params=>{
      project();
      const previous=contentScan;
      const controller=new AbortController(),id=++contentScanId;
      const scan={controller,id,status:'running'};
      contentScan=scan;
      previous?.controller.abort();
      const activeProject=record;
      scan.done=(async()=>{
        await previous?.done;
        try{
          controller.signal.throwIfAborted();
          if(record!==activeProject)throw Error('콘텐츠를 검색하는 동안 프로젝트가 변경됐어요.');
          scan.result=await methods['content.list'](params,controller.signal);
          scan.status='done';
        }catch(error){
          scan.error=error.message;
          scan.status=controller.signal.aborted?'canceled':'error';
        }
      })();
      return {id};
    },
    'content.listStatus': ({id})=>{
      const scan=contentScan;
      if(!scan||scan.id!==id)return {status:'canceled'};
      const {status,result,error}=scan;
      if(status!=='running')contentScan=undefined;
      return {status,result,error};
    },
    'content.create': async ({folder,kind,name}) => {
      if (typeof folder!=='string' || !/^Assets(?:\/|$)/.test(folder) || !Object.hasOwn(assetSuffix,kind) || typeof name!=='string' || !name.trim() || /[/\\:<>?"|*\x00-\x1f]/.test(name)) throw Error('Assets 폴더와 에셋 이름, 종류를 확인하세요.');
      return openDocument((await project().create(folder,kind,name.trim())).path);
    },
    'take.preset.resolve': ({path,draft=false})=>takePreset(path,draft?assetOfKind('takepreset',targetDocument(path)):null),
    'take.preset.edit': async ({path,action,parent,group,enabled,expectedRevision})=>{
      const doc=assetOfKind('takepreset',targetDocument(path));
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data);
      if(action==='parent'){
        if(typeof parent!=='string')throw Error('상위 녹화 프리셋을 선택하세요.');
        next.parentPreset=parent;next.overrides??=[];
        await takePreset(doc.path,{...doc,data:next});
      }else if(action==='override'){
        if(!next.parentPreset||typeof enabled!=='boolean'||!takePresetGroups.some(([key])=>key===group))
          throw Error('상속할 녹화 설정 그룹을 선택하세요.');
        if(enabled&&!next.overrides.includes(group)){
          const inherited=await takePreset(doc.path,doc);
          if(inherited.data[group]===undefined)delete next[group];else next[group]=inherited.data[group];
          next.overrides.push(group);
        }else if(!enabled)next.overrides=next.overrides.filter(key=>key!==group);
      }else if(action==='flatten'){
        const resolved=await takePreset(doc.path,doc);
        change(doc,resolved.data);return response(doc);
      }else throw Error('녹화 프리셋 상속 명령을 확인하세요.');
      change(doc,next);return response(doc);
    },
    'take.preset.apply': async ({path,presetAsset,expectedRevision,expectedPresetRevisions})=>{
      const doc=assetOfKind('sequenceasset',targetDocument(path));
      await check(doc,expectedRevision);
      const resolved=await takePreset(presetAsset);
      takePresetRevisionGuard(resolved.chain,expectedPresetRevisions);
      change(doc,applyTakePreset(doc.data,resolved.data));return response(doc);
    },
    'take.preset.fromSequence': async ({path:file,name,expectedRevision})=>{
      const doc=assetOfKind('sequenceasset',targetDocument(file));
      await check(doc,expectedRevision);
      if(typeof name!=='string'||!name.trim())throw Error('새 프리셋 이름을 입력하세요.');
      const data=takePresetFromSequence(doc.data,name.trim());
      const target=path.posix.join(path.posix.dirname(doc.path),data.name+assetSuffix.takepreset);
      if(!validAsset('takepreset',data)||/[\\/:<>?"|*\x00-\x1f]/.test(data.name))throw Error('새 프리셋 이름을 확인하세요.');
      await project().checkedBatch([{path:target,text:JSON.stringify(data,null,2),expected:null}]);
      return openDocument(target);
    },
    'audio.importCapture': async ({name,file})=>{
      const {folder,name:stem}=captureSaveSettings({name});
      if(typeof file!=='string'||!path.isAbsolute(file)||!/^mix-\d+-\d+\.wav$/.test(path.basename(file)))
        throw Error('편집기에서 녹음한 WAV 파일을 선택하세요.');
      const directory=process.env.HB_USER_DATA_DIR;
      if(!directory||path.relative(path.join(directory,'Sessions'),path.dirname(file))!=='')throw Error('편집기 녹음 저장 경로를 확인하세요.');
      const owner=project(),stat=await fs.lstat(file);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size<=44||stat.size>32*1024*1024+44)throw Error('녹음된 WAV 크기를 확인하세요.');
      const handle=await fs.open(file,'r');
      try{
        const header=Buffer.alloc(44);
        if((await handle.read(header,0,44,0)).bytesRead!==44||header.toString('ascii',0,4)!=='RIFF'||
          header.toString('ascii',8,12)!=='WAVE'||header.readUInt32LE(40)!==stat.size-44)
          throw Error('녹음된 WAV 형식을 확인하세요.');
      }finally{await handle.close();}
      await owner.mkdir(folder);
      return owner.importStream(folder,stem+'.wav',createReadStream(file),()=>{},{expectedBytes:stat.size});
    },
    'timeline.importTake': async ({name,data})=>{
      if(typeof name!=='string'||!name.trim()||name.length>70||/[\/\\:<>?"|*\x00-\x1f]/.test(name)||
        !validAsset('sequenceasset',data)||data.name!==name||!data.tracks.length)throw Error('녹화 이름과 시퀀스 데이터를 확인하세요.');
      const file='Assets/'+name+'.hbsequence.json';
      await project().checkedBatch([{path:file,text:JSON.stringify(data,null,2),expected:null}]);
      return openDocument(file);
    },
    'tilemap.view': ({x=0,y=0,columns,rows})=>{
      const doc=assetOfKind('tilemap'),{width,height,layers,layout,tileset,tileSize}=doc.data;
      if(![x,y,columns,rows].every(Number.isSafeInteger)||x<0||y<0||columns<1||rows<1||columns*rows>16384)
        throw Error('타일 편집기의 표시 범위를 확인하세요.');
      return {width,height,layout,atlasSource:[tileset,tileSize],layers:layers.map(({id,name,visible,collision})=>({id,name,visible,collision})),
        tiles:layers.filter(row=>row.visible).flatMap(row=>tileCellsInRect(row,[x,y,x+columns-1,y+rows-1]).map(({x,y,index,rotation,flipX,flipY})=>({x,y,index,rotation,flipX,flipY})))};
    },
    'tilemap.atlas': async ()=>{
      const {tileset,tileSize}=assetOfKind('tilemap').data;
      if(!tileset)return null;
      const {createCanvas,loadImage}=await import('@napi-rs/canvas');
      const image=await loadImage(await projectBytes(project(),tileset));
      const [tileWidth,tileHeight]=tileSize,columns=Math.floor(image.width/tileWidth),rows=Math.floor(image.height/tileHeight);
      if(!columns||!rows)return null;
      const scale=Math.min(1,2048/Math.max(image.width,image.height));
      const width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
      const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
      ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,width,height);
      return {width,height,columns,rows,tileWidth:tileWidth*width/image.width,tileHeight:tileHeight*height/image.height,pixels:canvas.data().toString('base64')};
    },
    'world.edit': async ({path:file,action,settings={},expectedRevision})=>{
      const doc=targetDocument(file),kind=doc.kind,owner=project();
      if(!Object.hasOwn(worldAssetTypes,kind))throw Error('월드 에셋을 선택하세요.');
      await check(doc,expectedRevision);
      const read=async name=>JSON.parse((await projectText(owner,name)).replace(/^\uFEFF/,''));
      const terrain=kind==='foliage'&&action==='scatter'&&doc.data.terrain?await read(doc.data.terrain):undefined;
      const reference=kind==='foliage'&&action==='reference'||kind==='lod'&&['addLevel','replaceLevel'].includes(action);
      if(reference&&settings.asset){
        const allowed=kind==='lod'?['mesh','terrain','foliage']:settings.key==='terrain'?['terrain']:['mesh','terrain'];
        if(!allowed.includes(assetKind(settings.asset))||settings.asset===doc.path)throw Error('월드 에셋 참조 종류를 확인하세요.');
        await owner.read(settings.asset);
      }
      if(owner!==project())throw Error('편집 중 프로젝트가 변경됐어요.');
      await check(doc,expectedRevision);
      const {draft,result}=withWorldDraft(doc.data,data=>{
        if(kind==='terrain'){
          if(action==='brush'){
            return settings.points===undefined?terrainBrush(data,settings):terrainStroke(data,settings.points,settings);
          }
          if(action==='terrainSize'){data.size=settings.size;return;}
          if(action==='layerColor'&&data.layers[settings.index]){data.layers[settings.index].color=settings.color;return;}
          if(action==='addLayer'){
            if(data.layers.length>=8)throw Error('지형 레이어는 최대 8개예요.');
            data.layers.push({name:settings.name,color:settings.color});
            for(const weights of data.weights)weights.push(0);
            return;
          }
        }else if(kind==='foliage'){
          if(action==='scatter'||action==='erase'){
            const apply=center=>action==='scatter'?scatterFoliage(data,{...settings,center,terrain}):eraseFoliage(data,center,settings.radius);
            if(!settings.points)return apply(settings.center);
            if(!Array.isArray(settings.points)||!settings.points.length)throw Error('폴리지 브러시 경로를 확인하세요.');
            for(const center of settings.points)apply(center);
            return;
          }
          if(action==='instances')return editFoliage(data,settings);
          if(action==='reference'&&['mesh','terrain'].includes(settings.key)){data[settings.key]=settings.asset;return;}
        }else if(kind==='mesh'&&action==='geometry')return editMesh(data,settings);
        else if(kind==='lod'){
          if(action==='addLevel'){
            if(settings.asset===doc.path)throw Error('LOD에 자기 자신을 추가할 수 없어요.');
            data.levels.push({asset:settings.asset,threshold:settings.threshold});return;
          }
          if(action==='replaceLevel'&&Number.isInteger(settings.index)&&data.levels[settings.index]){
            if(settings.asset===doc.path)throw Error('LOD에 자기 자신을 추가할 수 없어요.');
            data.levels[settings.index]={asset:settings.asset,threshold:settings.threshold};return;
          }
          if(action==='removeLevel'&&Number.isInteger(settings.index)&&settings.index>=0&&settings.index<data.levels.length){
            data.levels.splice(settings.index,1);
            data.forced=data.forced===settings.index?-1:data.forced>settings.index?data.forced-1:data.forced;
            const collision=data.collisionLevel||0;
            data.collisionLevel=Math.max(0,Math.min(data.levels.length-1,collision>settings.index?collision-1:collision));
            return;
          }
        }
        throw Error('월드 에셋 편집 도구를 확인하세요.');
      });
      change(doc,result||draft);
      return response(doc);
    },
    'world.meshBoundary': async ({path:file,edges,expectedRevision})=>{
      const doc=assetOfKind('mesh',targetDocument(file));
      await check(doc,expectedRevision);
      return selectMeshBoundaryLoops(doc.data,edges);
    },
    'world.meshUVView': async ({path:file,channel=0,width,height,center,zoom=1,faces=[],pick,expectedRevision})=>{
      const doc=assetOfKind('mesh',targetDocument(file));
      await check(doc,expectedRevision);
      if(![0,1].includes(channel)||![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=1280)||
        !Number.isFinite(zoom)||zoom<.000001||zoom>10000||center&&(!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)))
        throw Error('UV 보기 크기·채널·확대를 확인하세요.');
      const {indices}=doc.data,uvs=channel===1?doc.data.uvs1:doc.data.uvs;
      if(!uvs)throw Error('선택한 UV 채널이 없어요.');
      if(!center){
        const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
        for(const uv of uvs)for(let i=0;i<2;i++){min[i]=Math.min(min[i],uv[i]);max[i]=Math.max(max[i],uv[i]);}
        center=min.map((value,i)=>(value+max[i])/2);
        zoom=1/Math.max(.0001,max[0]-min[0],max[1]-min[1]);
      }
      zoom=Math.min(10000,Math.max(.000001,zoom));
      if(pick&&(!Array.isArray(pick.point)||pick.point.length!==2||!pick.point.every(Number.isFinite)))throw Error('UV 선택 좌표를 확인하세요.');
      const unit=Math.min(width,height)*.8*zoom;
      const point=uv=>[width/2+(uv[0]-center[0])*unit,height/2-(uv[1]-center[1])*unit];
      const {createCanvas}=await import('@napi-rs/canvas');
      const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
      ctx.fillStyle='#20262d';ctx.fillRect(0,0,width,height);
      const [left,top]=point([0,1]);ctx.strokeStyle='#56616e';ctx.strokeRect(left,top,unit,unit);
      const selected=new Set(faces),marks=[];
      let hit=-1;
      ctx.strokeStyle='#8094aa';ctx.beginPath();
      for(let i=0;i<indices.length;i+=3){
        const a=point(uvs[indices[i]]),b=point(uvs[indices[i+1]]),c=point(uvs[indices[i+2]]);
        if(Math.max(a[0],b[0],c[0])<0||Math.min(a[0],b[0],c[0])>width||
          Math.max(a[1],b[1],c[1])<0||Math.min(a[1],b[1],c[1])>height)continue;
        ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();
        const face=i/3;
        if(selected.has(face))marks.push([a,b,c]);
        if(pick){
          const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
          const ab=cross(a,b,pick.point),bc=cross(b,c,pick.point),ca=cross(c,a,pick.point);
          if(cross(a,b,c)!==0&&((ab>=0&&bc>=0&&ca>=0)||(ab<=0&&bc<=0&&ca<=0)))hit=face;
        }
      }
      ctx.stroke();
      ctx.strokeStyle='#69b8ff';ctx.fillStyle='rgba(90,160,230,.30)';
      for(const [a,b,c] of marks){ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();ctx.fill();ctx.stroke();}
      const selection=hit<0?[]:pick.island?meshUVSelection(doc.data,[hit],{wholeIsland:true}):[hit];
      return {width,height,center,zoom,unit,selection,pixels:canvas.data().toString('base64')};
    },
    'world.meshAtlasStart': async ({path:file,settings={},expectedRevision})=>{
      const doc=assetOfKind('mesh',targetDocument(file)),owner=record;
      await check(doc,expectedRevision);
      if(meshAtlas)throw Error('이전 UV 아틀라스 작업 결과를 확인하세요.');
      const worker=new Worker(new URL('./native-mesh-atlas-thread.mjs',import.meta.url),{
        workerData:{mesh:doc.data,settings},execArgv:[],
      });
      const job={worker,doc,owner,expectedRevision,status:'running'};
      meshAtlas=job;
      worker.on('message',packet=>{
        if(job.status!=='running')return;
        if(packet.progress)job.progress=packet.progress;
        else if(packet.error){job.status='error';job.error=packet.error;}
        else{job.status='ready';job.result=packet.result;}
      });
      worker.on('error',error=>{if(job.status==='running'){job.status='error';job.error=error.message;}});
      worker.on('exit',()=>{job.worker=null;if(job.status==='running'){job.status='error';job.error='UV 작업이 종료됐어요.';}});
      return {path:doc.path,status:job.status};
    },
    'world.meshAtlasCancel': async ()=>{
      const job=meshAtlas;
      meshAtlas=undefined;
      if(job?.worker)await job.worker.terminate();
      return {status:'canceled'};
    },
    'world.meshAtlasStatus': async ({apply=false}={})=>{
      const job=meshAtlas;
      if(!job)return {status:'canceled'};
      const {status,progress,error}=job;
      if(status==='error'){meshAtlas=undefined;return {status,error};}
      if(status!=='ready'||!apply)return {status,progress};
      meshAtlas=undefined;
      if(record!==job.owner||documents.items.get(job.doc.path)!==job.doc)throw Error('UV 작업 중 문서가 닫혔어요.');
      await check(job.doc,job.expectedRevision);
      change(job.doc,job.result.data);
      const {data,...summary}=job.result;
      return {status:'done',path:job.doc.path,result:summary};
    },
    'world.meshUVInspect': async ({path:file,channel=0,expectedRevision})=>{
      const doc=assetOfKind('mesh',targetDocument(file));
      await check(doc,expectedRevision);
      return inspectMeshUV(doc.data,{channel});
    },
    'world.simplify': async ({path:file,name,cellSize,expectedRevision})=>{
      const doc=assetOfKind('mesh',targetDocument(file)),owner=project();
      await check(doc,expectedRevision);
      if(typeof name!=='string'||!name.trim()||name.length>80||/[\\/:<>?"|*]/.test(name)||/[. ]$/.test(name))
        throw Error('LOD 메시 이름을 확인하세요.');
      const result=simplifyMesh(doc.data,cellSize);
      result.name=name;
      const target=path.posix.join(path.posix.dirname(doc.path),name+assetSuffix.mesh);
      await owner.checkedBatch([{path:target,text:JSON.stringify(result,null,2),expected:null}]);
      return {path:target};
    },
    'tilemap.paint': async ({layer,tool,from,to,index,expectedRevision})=>{
      const doc=assetOfKind('tilemap');await check(doc,expectedRevision);
      const edit=applyTileTool(doc.data,layer,tool,from,to,index);
      if(edit.changed)change(doc,edit.data);
      return response(doc);
    },
    'content.mkdir': async ({folder,name})=>{
      if(typeof folder!=='string'||!/^(Assets|Source|Settings)(?:\/|$)/.test(folder)||
        typeof name!=='string'||!name.trim()||/[\/\\:<>?"|*\x00-\x1f]/.test(name))throw Error('상위 폴더와 새 폴더 이름을 확인하세요.');
      const target=folder+'/'+name.trim();
      await project().mkdir(target);
      return {path:target};
    },
    'content.import': async ({folder,file})=>{
      if(typeof folder!=='string'||!/^Assets(?:\/|$)/.test(folder)||typeof file!=='string'||!path.isAbsolute(file))throw Error('Assets 폴더와 가져올 파일을 선택하세요.');
      const stat=await fs.stat(file);
      if(!stat.isFile())throw Error('가져올 파일을 선택하세요.');
      return project().importStream(folder,path.basename(file),createReadStream(file),()=>{},{expectedBytes:stat.size});
    },
    'content.rename': async ({path:file,name})=>{
      name=typeof name==='string'?name.trim():'';
      if(typeof file!=='string'||!/^(?:Assets|Source|Settings)\//.test(file)||!name||name==='.'||name==='..'||/[/\\:<>?"|*\x00-\x1f]/.test(name))throw Error('이름을 바꿀 프로젝트 에셋을 확인하세요.');
      const next=path.posix.join(path.posix.dirname(file),name);
      if(next===file)return {path:file};
      if(tabs().some(doc=>doc.path===file||doc.path.startsWith(file+'/')||doc.path===file+'.import.json'))throw Error('이름을 바꿀 에셋의 문서를 먼저 닫으세요.');
      if(assetKind(file)!==assetKind(next))throw Error('에셋 파일 형식을 유지하세요.');
      await project().rename(file,next);
      nativeMetadata=new WeakMap();
      return {path:next};
    },
    'modelimport.open': async ({path:source})=>{
      if(!modelSource(source))throw Error('원본 모델을 선택하세요.');
      const existing=documents.items.get(source+'.import.json');
      if(existing)return response(documents.select(existing.path));
      const {path:file}=await project().prepareModelImport(source);
      return openDocument(file);
    },
    'modelimport.extract': async params=>{
      if(!['material','animation'].includes(params.kind))throw Error('추출할 하위 에셋 종류를 확인하세요.');
      const doc=assetOfKind('modelimport',targetDocument(params.path));
      await check(doc,params.expectedRevision);
      const owner=project(),data=doc.data,folder=path.posix.dirname(doc.path);
      const assertOwner=()=>{
        if(record?.project!==owner||documents.items.get(doc.path)!==doc||doc.data!==data)
          throw Object.assign(Error('추출 중 모델 문서가 변경됐어요.'),{code:'REVISION_CONFLICT'});
      };
      const {loadHeadlessModel,disposeHeadlessModel}=await import('./headless-model.mjs');
      const {installNativeAssets}=await import('./native-game-platform.mjs');
      const isGltf=/\.(gltf|glb)$/i.test(data.source);
      const assets=installNativeAssets({url:name=>'hbasset:'+encodeURIComponent(name),manifest:{width:1,height:1},readBytes:name=>projectBytes(owner,name)});
      let result;
      try{
        if(isGltf)result=await loadHeadlessModel(owner,data.source,{
          geometry:params.kind==='material',loadTexture:params.kind==='material'?async()=>new (await import('three')).Texture():undefined,
          metadata:null,extract:true
        });
        else{
          const {loadModel}=await import('../prototype/engine-services.js');
          result=await loadModel(data.source,{metadata:null});
        }
      }finally{assets.restore();}
      try{
        assertOwner();
        if(data.sourceHash&&result.sourceHash!==data.sourceHash)throw Error('원본 모델이 변경됐어요. 다시 가져오세요.');
        const preview={result,ready:Promise.resolve(),snapshot:assertOwner};
        const hooks={
          document:async()=>{assertOwner();return {doc,revision:params.expectedRevision};},
          preview:()=>preview,
          create:async(_doc,asset,images)=>{
            assertOwner();
            if(images)return (await import('./model-material-publish.mjs')).publishModelMaterial(owner,{...images,folder,name:asset.name,data:asset},assertOwner);
            return owner.create(folder,params.kind==='material'?'material':'skeletalclip',asset.name,assertOwner,asset);
          },
        };
        if(params.kind==='material'){
          hooks.images=async(_doc,options)=>(await import('./model-material-publish.mjs')).prepareModelImages(owner,{...options,folder},assertOwner);
          return await (await import('../prototype/model-material-extraction.js')).extractModelMaterialDocument(params,hooks);
        }
        return await (await import('../prototype/model-clip-extraction.js')).extractModelClipDocument(params,hooks);
      }finally{
        if(isGltf)disposeHeadlessModel(result.object);
        else{
          const resources=new Set();
          result.object.traverse(node=>{
            if(node.geometry)resources.add(node.geometry);
            if(node.skeleton)resources.add(node.skeleton);
            for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
              resources.add(material);
              for(const value of Object.values(material))if(value?.isTexture)resources.add(value);
            }
          });
          for(const resource of resources)resource.dispose();
        }
      }
    },
    'modelimport.reimport': async ({path,expectedRevision})=>{
      const doc=assetOfKind('modelimport',targetDocument(path));
      await check(doc,expectedRevision);
      if(doc.dirty)throw Error('다시 가져오기 전에 설정을 저장하세요.');
      await project().prepareModelImport(doc.data.source);
      return methods['document.reload']({path:doc.path,expectedRevision});
    },
    'modelimport.edit': async ({path,expectedRevision,action,id,key,value,target})=>{
      const doc=assetOfKind('modelimport',targetDocument(path));
      await check(doc,expectedRevision);
      let next=structuredClone(doc.data);
      if(action==='remap')next=remapModelOverrides(next,id,target);
      else if(action==='override'){
        const row=next.subassets.find(row=>row.id===id&&row.kind==='mesh');
        if(!row||!['visible','castShadow','receiveShadow'].includes(key)||value!==null&&typeof value!=='boolean')
          throw Error('메시 오버라이드 항목을 확인하세요.');
        if(value===null)delete row.overrides[key];else row.overrides[key]=value;
      }else if(action==='settings'){
        if(!value||typeof value!=='object'||Array.isArray(value))throw Error('모델 변환 설정을 확인하세요.');
        next.settings={...modelImportDefaults,...next.settings,...value};
      }
      else throw Error('모델 가져오기 편집을 확인하세요.');
      change(doc,next);
      return response(doc);
    },
    'document.open': ({path}) => openDocument(path),
    'document.load': async ({path})=>response(await loadDocument(path)),
    'document.read': ({path}) => response(targetDocument(path)),
    'document.reload': async ({path,discard=false,expectedRevision})=>{
      const doc=targetDocument(path);await check(doc,expectedRevision);
      if(doc.dirty&&!discard)throw Error('저장하지 않은 변경 사항이 있어요.');
      const text=(await projectBytes(project(),doc.path)).toString('utf8');
      const data=doc.kind==='text'?text:JSON.parse(text.replace(/^\uFEFF/,''));
      if(!validAsset(doc.kind,data))throw Error('디스크 문서 형식을 확인하세요.');
      doc.data=data;doc.saved=JSON.stringify(data);doc.history.length=0;doc.future.length=0;doc.dirty=false;
      if(doc.kind==='text'&&doc.path.startsWith('Source/'))nativeMetadata=new WeakMap();
      return response(doc);
    },
    'document.reorder': async ({path,before})=>{
      const doc=targetDocument(path);
      if(before===path)return response(current());
      const ordered=[...documents.items.values()].filter(row=>row!==doc);
      const index=before==null?ordered.length:ordered.findIndex(row=>row.path===before);
      if(index<0)throw Error('탭을 선택하세요.');
      ordered.splice(index,0,doc);
      documents.items=new Map(ordered.map(row=>[row.path,row]));
      return response(current());
    },
    'document.replace': async ({path,text,expectedRevision}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
      if (typeof text !== 'string') throw Error('문서 내용을 확인하세요.');
      change(doc,doc.kind === 'text' ? text : JSON.parse(text));
      return response(doc);
    },
    'document.patch': async ({path,operations,expectedRevision,dryRun=false}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
      const next = patchAsset(doc.kind,doc.data,operations);
      if (dryRun) return {valid:true, revision:await documentRevision(next), data:next};
      change(doc,next);
      return response(doc);
    },
    'document.save': async ({path,expectedRevision}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
      await documents.save(doc,(file,text,expected) => project().checkedWrite(file,text,expected));
      return response(doc);
    },
    'document.close': ({path,discard=false}) => {
      if (!documents.close(path,discard)) throw Error('저장하지 않은 변경 사항이 있어요.');
      return documents.current ? response(documents.current) : {tabs:tabs()};
    },
    'editor.undo': ({path,expectedRevision}) => restore('history','future',path,expectedRevision),
    'editor.redo': ({path,expectedRevision}) => restore('future','history',path,expectedRevision),
    'scene.catalog': () => ({placements:placementCatalog.map(({key,label,category})=>({id:key,label,group:category})),components:Object.keys(componentDefinitions)}),
    'scene.hierarchy': () => scene().data.objects.map(({id,name,kind,parent,visible,locked,components})=>({id,name,kind,parent,visible,locked,camera:components?.some(c=>c.type==='Camera'&&c.properties?.enabled!==false)??kind==='camera'})),
    'scene.edit': async ({path,action,id,target,key,delta,axis,value,asset,position,expectedRevision}) => {
      const doc=targetDocument(path);
      if(doc.kind!=='scene')throw Error('장면 문서를 선택하세요.');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data), byId=new Map(next.objects.map(actor=>[actor.id,actor]));
      const actor=byId.get(id);
      let selection=id;
      if (action==='add') {
        const created=createPlacedObject(key);next.objects.push(created);selection=created.id;
      } else if(action==='placeAsset')selection=await placeSceneAsset(next,doc,asset,actor,position);
      else {
        if (!actor) throw Error('오브젝트를 선택하세요.');
        if (actor.locked&&action!=='lock'&&action!=='visible') throw Error('오브젝트 잠금을 해제하세요.');
        if (action==='lock') actor.locked=!actor.locked;
        else if (action==='visible') actor.visible=!actor.visible;
        else if (action==='component') addSceneComponent(actor,key);
        else if(action==='translate'||action==='rotate'||action==='scale')editSceneTransform(actor,next.objects,{mode:action,axis,value:action==='translate'?delta:value});
        else if (action==='reparent') {
          if (!validParent(next.objects,id,target)) throw Error('오브젝트의 부모를 확인하세요.');
          const world=sceneWorldMatrix(actor,next.objects),parent=byId.get(target);
          if(parent)world.premultiply(sceneWorldMatrix(parent,next.objects).invert());
          if (target) actor.parent=target; else delete actor.parent;
          setObjectMatrix(actor,world);
        } else if(action==='duplicate'){
          const copied=copySceneObjects(next.objects,[id]);
          selection=pasteSceneObjects(next.objects,copied,{offset:[.5,0,.5]})[0].id;
        } else if (action==='delete') {
          if (next.objects.some(item=>item.parent===id)) throw Error('하위 오브젝트를 이동한 뒤 삭제하세요.');
          next.objects=next.objects.filter(item=>item.id!==id);selection='';
        } else throw Error('장면 편집 명령을 확인하세요.');
      }
      change(doc,next);
      return {...await response(doc),selection};
    },
    'scene.viewport': async params=>{
      const {width,height}=params;
      if (!bridge||![width,height].every(value=>Number.isInteger(value)&&value>0&&value<=16384)) throw Error('장면 뷰포트 연결이나 크기를 확인하세요.');
      const {nativeEditorViewport}=await import('./native-editor-viewport.mjs');
      if(params.surface!==undefined){
        if(typeof params.surface!=='string'||!/^native-scene-\d+$/.test(params.surface))throw Error('독립 장면 표면을 확인하세요.');
        const doc=targetDocument(params.path);
        if(doc.kind!=='scene')throw Error('장면 문서를 선택하세요.');
        let view=sceneViews.get(params.surface);
        if(!view){view=nativeEditorViewport(bridge,params.surface);sceneViews.set(params.surface,view);}
        return view.draw(doc.data,project(),params);
      }
      viewport??=nativeEditorViewport(bridge);
      return viewport.draw(scene().data,project(),params);
    },
    'scene.viewportClose': async ({surface})=>{
      const view=sceneViews.get(surface);
      if(view){try{await view.close();}finally{sceneViews.delete(surface);}}
      return {closed:!!view};
    },
    'asset.preview': async params=>{
      const {width,height,node}=params;
      if(!bridge||![width,height].every(value=>Number.isInteger(value)&&value>0&&value<=4096))throw Error('3D 미리보기 연결이나 크기를 확인하세요.');
      const doc=current();
      if(!previewKind(doc))throw Error('미리 볼 에셋을 선택하세요.');
      preview??=(await import('./native-editor-viewport.mjs')).nativeEditorViewport(bridge,'native-preview');
      if(previewSource!==doc.data||previewNode!==node){
        const asset=async name=>name===doc.path?doc.data:JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
        const worldAsset=Object.hasOwn(worldAssetTypes,doc.kind);
        const actor=createPlacedObject(doc.kind==='blueprint'?'cube':doc.kind==='modelimport'||worldAsset?'empty':'sphere',{id:'asset-preview'});
        let data=doc.data;
        if(doc.kind==='blueprint'){
          const root=await createBlueprintResolver(asset,async name=>(await projectBytes(project(),name)).toString('utf8'))(doc.path);
          actor.components=structuredClone(root.components);
          if(!actor.components.some(component=>component.type==='MeshRenderer'))actor.kind='empty';
        }else if(doc.kind==='modelimport'||worldAsset)addSceneComponent(actor,'MeshRenderer').properties.mesh=worldAsset?doc.path:data.source;
        else{
          if(materialKinds.has(doc.kind)&&doc.kind!=='material'){
            const graph=data.graph;
            const selected=graph?.nodes.find(row=>row.id===node)||graph?.nodes.find(row=>row.key==='functionOutput'&&materialPins(row,graph).inputs.length);
            if(!selected)throw Error('미리 볼 머테리얼 함수 출력을 선택하세요.');
            data=(await resolveMaterialPreview(data,{node:selected.id},asset)).data;
          }
          actor.materialAsset=doc.path;
        }
        const objects=[actor];
        if(doc.kind==='foliage'&&data.terrain){
          const ground=createPlacedObject('empty',{id:'asset-preview-terrain'});
          addSceneComponent(ground,'MeshRenderer').properties.mesh=data.terrain;
          objects.push(ground);
        }
        previewScene={objects,surface:defaultSurface,environment:defaultEnvironment,assetDraft:{path:doc.path,data,kind:worldAsset?doc.kind:undefined}};
        previewSource=doc.data;previewNode=node;
      }
      return preview.draw(previewScene,project(),params.command==='focus'?{...params,id:'asset-preview'}:params);
    },
    'asset.previewClose': async ()=>{
      if(preview)await preview.close();
      previewSource=previewNode=previewScene=null;
      return {ok:true};
    },
    'timeline.read': () => {
      const doc=assetOfKind('timeline'),{timeline}=doc.data;
      if(!timeline){
        const rows=timelineRows(doc.kind,doc.data,{keyItems:track=>track.keys.map((key,index)=>({id:track.id+':'+index,start:key.time,key:true}))});
      if(doc.kind==='montage'){
        if(!rows.some(row=>row.id==='slot:DefaultSlot'))rows.push({id:'slot:DefaultSlot',type:'slot',name:'DefaultSlot',items:()=>[]});
        rows.push({id:'notify-state:',type:'notify-state-add',name:'구간 알림 추가',items:()=>[]});
      }else{
        for(const [kind,name] of [['shot','샷 추가'],['subsequence','하위 시퀀스 추가']]){
          const id='section-row:'+kind+':0';
          if(!rows.some(row=>row.id===id))rows.push({id,type:kind,name,items:()=>[]});
        }
      }
      return {length:doc.data.length,tracks:rows.map(row=>{
          const items=row.items();
          return {id:row.id,name:row.name,type:row.type,
            keys:items.filter(item=>item.key).map(item=>item.start),
            clips:items.filter(item=>!item.key).map(item=>({id:item.id,start:item.start,duration:item.duration||0,label:item.name||item.clip||''}))};
        })};
      }
      const length=timelineLength(timeline);
      return {length, tracks:timeline.tracks.map(track=>({id:track.id,name:track.name,type:track.type,keys:track.keys.map(key=>key.time)}))};
    },
    'timeline.trackTypes': ()=>sequenceTracks,
    'timeline.curveGraph': ({track})=>{
      const doc=assetOfKind('sequenceasset'),row=doc.data.tracks.find(item=>item.id===track);
      if(!row||!sequenceCurveType(row)||!row.keys.length)throw Error('키가 있는 곡선 트랙을 선택하세요.');
      let sampler=sequenceSamplers.get(doc.data);
      if(!sampler){sampler=new SequenceSampler(doc.data.tracks);sequenceSamplers.set(doc.data,sampler);}
      const channels=value=>Array.isArray(value)?value:[value];
      const samples=Array.from({length:385},(_,index)=>{
        const time=doc.data.length*index/384;
        return {time,value:channels(sampler.sample(row,time))};
      });
      const keys=row.keys.map((key,index)=>({index,time:key.time,value:channels(key.value)}));
      return {track,length:doc.data.length,name:row.name,samples,keys};
    },
    'timeline.curveHandles': ({track,index,channel})=>{
      const row=assetOfKind('sequenceasset').data.tracks.find(item=>item.id===track),key=row?.keys[index];
      if(!key||row.quaternionInterpolation||!sequenceCurveType(row))return [];
      const value=Array.isArray(key.value)?key.value[channel]:channel===0?key.value:undefined;
      if(value===undefined)return [];
      return ['arrive','leave'].flatMap(side=>{
        const neighbour=row.keys[index+(side==='arrive'?-1:1)];
        if(!neighbour||neighbour.time===key.time)return [];
        return [{side,time:key.time+(neighbour.time-key.time)*curveKeyWeight(key,channel,side+'Weight'),
          value:value+curveControlValue(row.keys,index,channel,side,'linear')}];
      });
    },
    'timeline.curveHandleMove': async ({track,index,channel,side,time,value,expectedRevision})=>{
      const doc=assetOfKind('sequenceasset');await check(doc,expectedRevision);
      const next=structuredClone(doc.data),row=next.tracks.find(item=>item.id===track),key=row?.keys[index];
      const valid=methods['timeline.curveHandles']({track,index,channel}).some(handle=>handle.side===side);
      if(!valid||!Number.isFinite(time)||!Number.isFinite(value))throw Error('곡선 탄젠트 핸들을 선택하세요.');
      const neighbour=row.keys[index+(side==='arrive'?-1:1)];
      const weight=Math.max(0,Math.min(1,(time-key.time)/(neighbour.time-key.time)));
      const component=Array.isArray(key.value)?key.value[channel]:key.value;
      const values=(field,replacement,defaultValue)=>Array.isArray(key.value)
        ?key.value.map((_,i)=>i===channel?replacement:defaultValue(i)):replacement;
      configureSequenceCurve(next,{track,key:index,
        [side+'Weight']:values(side+'Weight',weight,i=>curveKeyWeight(key,i,side+'Weight')),
        [side+'Control']:values(side+'Control',value-component,i=>curveControlValue(row.keys,index,i,side,'linear'))});
      change(doc,next);return response(doc);
    },
    'timeline.curveOptions': ({track,index})=>{
      const row=assetOfKind('sequenceasset').data.tracks.find(item=>item.id===track);
      if(!row)throw Error('시퀀스 트랙을 선택하세요.');
      return {
        interpolation:row.keys[index]&&sequenceCurveType(row)?row.quaternionInterpolation?['linear','constant']:sequenceCurveModes:[],
        infinity:sequenceRangeModes(row),
        tools:sequenceCurveType(row)&&!row.quaternionInterpolation&&row.keys.length?['smooth','flatten','straighten','linearTangents',...(row.type==='rotation'?['eulerFilter']:[])]:[]
      };
    },
    'timeline.curveEdit': async ({track,index,key,value,expectedRevision})=>{
      const doc=assetOfKind('sequenceasset');await check(doc,expectedRevision);
      const next=structuredClone(doc.data),options=methods['timeline.curveOptions']({track,index});
      if(key==='tool'&&options.tools.includes(value))editSequenceCurves(next,{track,operation:value});
      else if(key==='interpolation'&&options.interpolation.includes(value))configureSequenceCurve(next,{track,key:index,interpolation:value});
      else if(['preInfinity','postInfinity'].includes(key)&&options.infinity.includes(value))configureSequenceCurve(next,{track,[key]:value});
      else throw Error('곡선 편집 옵션을 확인하세요.');
      change(doc,next);return response(doc);
    },
    'timeline.curveKeyMove': async ({track,index,channel,time,value,selections,expectedRevision})=>{
      const doc=assetOfKind('sequenceasset');await check(doc,expectedRevision);
      const next=structuredClone(doc.data),row=next.tracks.find(item=>item.id===track),key=row?.keys[index];
      if(!key||!sequenceCurveType(row)||!Number.isFinite(value)||!Number.isFinite(time)||time<0||time>next.length||
        !Number.isInteger(channel)||channel<0||channel>=(Array.isArray(key.value)?key.value.length:1))throw Error('곡선 키를 확인하세요.');
      time=Math.min(next.length,timelineSnap(next,time));
      if(selections!==undefined){
        if(!Array.isArray(selections)||!selections.some(item=>item?.index===index&&item.channels?.includes(channel)))throw Error('이동할 곡선 키를 선택하세요.');
        const anchor=Array.isArray(key.value)?key.value[channel]:key.value;
        const timeOffset=time-key.time;
        const original=row.keys;
        editSequenceCurves(next,{operation:'transform',selections:selections.map(item=>({...item,track})),timeOffset,valueOffset:value-anchor});
        if(row.keys.some(item=>item.time<0||item.time>next.length))throw Error('곡선 키가 시퀀스 범위를 벗어나요.');
        const indices=new Map(row.keys.map((nextKey,i)=>[nextKey.time,i]));
        const indexMap=Object.fromEntries(selections.map(item=>[item.index,indices.get(original[item.index].time+timeOffset)]));
        change(doc,next);return {...await response(doc),keyIndex:indexMap[index],indexMap};
      }
      if(row.keys.some((other,i)=>i!==index&&other.time===time))throw Error('같은 시간에 키가 있어요.');
      key.time=time;
      if(Array.isArray(key.value))key.value[channel]=value;else key.value=value;
      row.keys.sort((a,b)=>a.time-b.time);
      change(doc,next);return {...await response(doc),keyIndex:row.keys.indexOf(key)};
    },
    'timeline.inspectorPath': ({track,id})=>{
      const {kind,data}=assetOfKind('timeline');
      const [key,items]=timelineItems(kind,data,track);
      const index=items.findIndex(item=>item.id===id);
      if(index<0)return [];
      return data.tracks&&key!=='sections'?['tracks',key,'clips',String(index)]:[key,String(index)];
    },
    'timeline.sample': ({time}) => {
      const doc=assetOfKind('timeline'),timeline=doc.data.timeline;
      if(!timeline){
        if(doc.kind!=='sequenceasset'||!Number.isFinite(time))return [];
        let sampler=sequenceSamplers.get(doc.data);
        if(!sampler){sampler=new SequenceSampler(doc.data.tracks);sequenceSamplers.set(doc.data,sampler);}
        return doc.data.tracks.map(track=>({id:track.name,value:sampleSequenceTrack(sampler,track,time)}));
      }
      return timeline.tracks.map(track=>({id:track.name,value:sampleTimeline(track,time)}));
    },
    'timeline.edit': async ({action,track,index,time,type,value,id,asset,slot,expectedRevision})=>{
      const doc=assetOfKind('timeline');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data);
      if(action==='trackAdd'&&doc.kind==='sequenceasset'){
        if(!sequenceTracks.includes(type))throw Error('시퀀스 트랙 종류를 확인하세요.');
        next.tracks.push(makeSequenceTrack(type));change(doc,next);return response(doc);
      }
      if(action==='clipAdd'||action==='clipMove'||action==='clipDelete'){
        if(typeof track!=='string'||!['montage','sequenceasset'].includes(doc.kind))throw Error('시퀀스나 몽타주 타임라인을 선택하세요.');
        const [key,items,position]=timelineItems(doc.kind,next,track);
        const clipIndex=items.findIndex(item=>item.id===id);
        if(doc.kind==='sequenceasset'&&key==='sections'){
          if(action==='clipDelete')editSequenceSection(next,{operation:'remove',id});
          else{
            if(!Number.isFinite(time)||time<0||time>=next.length)throw Error('구간 시간을 확인하세요.');
            const start=Math.min(next.length,timelineSnap(next,time));
            if(action==='clipMove')editSequenceSection(next,{operation:'update',id,section:{start}});
            else{
              if(typeof asset!=='string'||assetKind(asset)!=='sequenceasset')throw Error('하위 시퀀스 에셋을 선택하세요.');
              const [,kind,row]=track.split(':');
              editSequenceSection(next,{operation:'add',section:{asset,name:path.posix.basename(asset,'.hbsequence.json').slice(0,80),kind,row:Number(row),start,duration:Math.min(1,next.length-start)}});
              await loadSequenceTree(doc.path,async name=>{
                if(name===doc.path)return next;
                const source=await project().read(name);
                const data=JSON.parse((await fs.readFile(source.file,'utf8')).replace(/^\uFEFF/,''));
                if(!validAsset('sequenceasset',data))throw Error('하위 시퀀스 에셋을 확인하세요.');
                return data;
              });
            }
          }
          change(doc,next);return response(doc);
        }
        if(action==='clipDelete'){
          if(clipIndex<0)throw Error('삭제할 항목을 선택하세요.');
          const [removed]=items.splice(clipIndex,1);
          if(doc.kind==='montage'&&key==='sections')for(const section of items)if(section.next===removed.name)section.next='';
        }else{
          if(!Number.isFinite(time)||time<0||time>next.length)throw Error('타임라인 시간을 확인하세요.');
          if(doc.kind==='sequenceasset')time=Math.min(next.length,timelineSnap(next,time));
          if(action==='clipMove'){
            if(clipIndex<0)throw Error('이동할 항목을 선택하세요.');
            items[clipIndex][position]=time;
          }else if(doc.kind==='montage'&&['sections','notifies','notifyStates'].includes(key)){
            if(typeof value!=='string'||!value.trim())throw Error('항목 이름을 입력하세요.');
            const name=value.trim();
            if(key==='sections')items.push({id:crypto.randomUUID(),name,time,next:''});
            else if(key==='notifies')items.push({id:crypto.randomUUID(),event:name,time});
            else items.push(makeAnimationNotifyState(name,time,Math.min(.25,next.length-time)));
          }else{
            const audio=doc.kind==='sequenceasset'&&next.tracks[Number(key)]?.type==='audio';
            if(doc.kind==='sequenceasset'&&!['audio','animation'].includes(next.tracks[Number(key)]?.type))
              throw Error('애니메이션 또는 오디오 트랙을 선택하세요.');
            const kind=typeof asset==='string'?assetKind(asset):null;
            const allowed=audio?kind==='audioasset'||kind==='media'&&/\.(wav|mp3|ogg|flac)$/i.test(asset):['animation','spriteanimation','skeletalclip'].includes(kind);
            if(!allowed)throw Error('트랙에 맞는 클립 에셋을 선택하세요.');
            await project().read(asset);
            const slotName=typeof slot==='string'&&slot.trim()?slot.trim():track.startsWith('slot:')?track.slice(5):'DefaultSlot';
            const duration=Math.min(1,next.length-time);
            items.push({id:crypto.randomUUID(),clip:asset,slot:slotName,start:time,duration,sourceStart:0,rate:1});
          }
        }
        items.sort((a,b)=>a[position]-b[position]);
        change(doc,next);return response(doc);
      }
      const row=(next.timeline?.tracks||next.tracks||[]).find(item=>item.id===track);
      if(!row)throw Error('트랙을 선택하세요.');
      if(action==='delete'){
        if(!Number.isInteger(index)||!row.keys[index])throw Error('키를 선택하세요.');
        row.keys.splice(index,1);
      }else{
        const length=next.timeline?timelineLength(next.timeline):next.length;
        if(!Number.isFinite(time)||time<0||time>length)throw Error('키의 시간을 확인하세요.');
        if(doc.kind==='sequenceasset')time=Math.min(length,timelineSnap(next,time));
        if(action==='move'){
          if(!Number.isInteger(index)||!row.keys[index])throw Error('이동할 키를 선택하세요.');
          if(row.keys.some((key,i)=>i!==index&&key.time===time))throw Error('이 시간에 이미 키가 있어요.');
          row.keys[index].time=time;
        }else if(action==='add'){
          if(row.type==='event'&&typeof value!=='string')throw Error('이벤트 이름을 입력하세요.');
          if(['animation','audio'].includes(row.type))throw Error('클립은 트랙 속성에서 선택하세요.');
          if(row.keys.some(key=>key.time===time))throw Error('이 시간에 이미 키가 있어요.');
          const sampled=next.timeline?sampleTimeline(row,time):sampleSequenceTrack(new SequenceSampler([row]),row,time);
          row.keys.push({time,value:value??sampled??makeSequenceTrack(row.type).keys[0]?.value});
        }else throw Error('키 편집 명령을 확인하세요.');
        row.keys.sort((a,b)=>a.time-b.time);
      }
      change(doc,next);
      return response(doc);
    },
    'widget.catalog': ()=>Object.entries(widgetTypes).map(([id,label])=>({id,label})),
    'asset.imagePreview': async ({index=0,level=0,time,previousFrame}={})=>{
      const doc=current(),data=doc.data;
      if(!Number.isInteger(index)||index<0||!Number.isInteger(level)||level<0)throw Error('이미지 미리보기 범위를 확인하세요.');
      const read=async name=>JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
      let sprite,images,filter='linear',frameInfo;
      if(doc.kind==='sprite'||doc.kind==='spriteanimation'){
        const frame=doc.kind==='spriteanimation'?(time===undefined?data.frames[index]:spriteAnimationFrame(data,time)):null;
        if(doc.kind==='spriteanimation'&&!frame)return null;
        if(time!==undefined&&frame){
          frameInfo={index:frame.index,finished:frame.finished};
          if(previousFrame===frame.index)return {frame:frameInfo};
        }
        sprite=await resolveSprite(frame?await read(frame.sprite):data,read);filter=sprite.filter;
        const texture=assetKind(sprite.texture)==='texture2d'?await read(sprite.texture):null;
        images=[texture?.images?.[0]||sprite.texture];
      }else if(['texture2d','cubemap','texturearray','volumetexture'].includes(doc.kind)){
        images=level===0?data.images:data.mips?.[level-1]?.images;
        filter=data.sampler?.magFilter||filter;
      }else throw Error('스프라이트 또는 텍스처 문서를 선택하세요.');
      if(!images?.[index])return null;
      const source=await project().read(images[index]);
      const {createCanvas,loadImage}=await import('@napi-rs/canvas');
      const image=await loadImage(await fs.readFile(source.file));
      const rect=sprite?spriteImage(sprite,image)?.rect:[0,0,image.width,image.height];
      if(!rect)throw Error('스프라이트가 이미지 범위를 벗어났어요.');
      const [x,y,w,h]=rect,scale=Math.min(1,960/Math.max(w,h)),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
      const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
      ctx.imageSmoothingEnabled=filter!=='nearest';
      ctx.drawImage(image,x,y,w,h,0,0,width,height);
      return {width,height,nearest:filter==='nearest',pixels:canvas.data().toString('base64'),frame:frameInfo};
    },
    'spriteAnimation.edit': async ({action,index,asset,duration,expectedRevision})=>{
      const doc=assetOfKind('spriteanimation');await check(doc,expectedRevision);
      const next=structuredClone(doc.data);
      if(action==='add'){
        if(typeof asset!=='string'||assetKind(asset)!=='sprite')throw Error('스프라이트 에셋을 선택하세요.');
        await project().read(asset);
        next.frames.push({sprite:asset,duration:.1});
      }else{
        if(!Number.isInteger(index)||!next.frames[index])throw Error('편집할 프레임을 선택하세요.');
        if(action==='duration')next.frames[index].duration=duration;
        else if(action==='delete')next.frames.splice(index,1);
        else if(action==='up'&&index>0)[next.frames[index-1],next.frames[index]]=[next.frames[index],next.frames[index-1]];
        else throw Error('프레임 편집 명령을 확인하세요.');
      }
      change(doc,next);return response(doc);
    },
    'asset.audioPreview': async ({play=false,silent=false}={})=>{
      await stopAudioPreview();
      const doc=assetOfKind('audioasset');
      if(!doc.data.clip)throw Error('오디오 클립을 선택하세요.');
      const bytes=await projectBytes(project(),doc.data.clip);
      const {AudioContext}=await import('node-web-audio-api');
      const context=new AudioContext(silent||!play?{sinkId:{type:'none'}}:{});
      audioPreview={context};
      try{
        const audio=await context.decodeAudioData(Uint8Array.from(bytes).buffer);
        const channels=Array.from({length:audio.numberOfChannels},(_,index)=>audio.getChannelData(index));
        const count=Math.min(audio.length,256);
        const bins=Array.from({length:count},(_,index)=>{
          const start=Math.floor(index*audio.length/count);
          const end=Math.floor((index+1)*audio.length/count);
          let low=0,high=0;
          for(const channel of channels)for(let sample=start;sample<end;sample++){low=Math.min(low,channel[sample]);high=Math.max(high,channel[sample]);}
          return [low,high];
        });
        if(play){
          const source=context.createBufferSource(),gain=context.createGain();
          source.buffer=audio;source.loop=doc.data.loop;source.playbackRate.value=doc.data.pitch;
          gain.gain.value=doc.data.volume;source.connect(gain);gain.connect(context.destination);
          audioPreview.source=source;
          source.onended=()=>{if(audioPreview?.source===source)void stopAudioPreview().catch(()=>{});};
          source.start();
        }else await stopAudioPreview();
        return {duration:audio.duration,bins};
      }catch(error){await stopAudioPreview();throw error;}
    },
    'asset.audioStop': async ()=>{await stopAudioPreview();return {ok:true};},
    'widget.nodes': ()=>assetOfKind('widget').data.nodes.map(({id,name,type})=>({id,name,type})),
    'widget.preview': async ({width,height})=>{
      if(![width,height].every(size=>Number.isInteger(size)&&size>0&&size<=4096))throw Error('위젯 미리보기 크기를 확인하세요.');
      const data=assetOfKind('widget').data;
      const [{NativeWidgetLayer},{resolveWidgetPresentation}]=await Promise.all([
        import('./native-widget-layer.mjs'),import('../prototype/widget-presentation.js')
      ]);
      const read=async name=>JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
      const display=await resolveWidgetPresentation(data,read);
      const layer=new NativeWidgetLayer({readBytes:name=>projectBytes(project(),name)},async()=>({ok:true}));
      layer.preview=true;
      layer.layout=[];
      const view=layer.create(display,{acceptInput:()=>false,event:()=>{}},{owner:'editor'});
      try {
        await view.fontsReady();
        await layer.draw(width,height);
        const nodes=new Map(data.nodes.map(node=>[node.id,node]));
        const rows=layer.layout.map(row=>({...row,editable:['Canvas','Panel','Widget','NamedSlot'].includes(nodes.get(nodes.get(row.id)?.parent)?.type)}));
        return {width,height,pixels:layer.canvas.data().toString('base64'),rows};
      } finally {await layer.dispose();}
    },
    'widget.edit': async ({action,id,key,parent,dx,dy,expectedRevision})=>{
      const doc=assetOfKind('widget');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data),node=next.nodes.find(item=>item.id===id);
      let selection=id;
      if(action==='add'){
        const owner=widgetContainers.has(node?.type)?node.id:node?.parent||next.nodes.find(item=>!item.parent).id;
        selection=addWidget(next,key,{parent:owner});
      }else if(action==='delete'){removeWidget(next,id);selection='';}
      else if(action==='reparent')reparentWidget(next,id,parent);
      else if(action==='duplicate')selection=duplicateWidget(next,id);
      else if(action==='mobile')selection=addMobileControls(next,{movement:key})[0];
      else if(action==='anchor'){
        if(!node?.parent)throw Error('앵커를 바꿀 위젯을 선택하세요.');
        setWidgetAnchorPreset(node,key);
      }
      else if(action==='move'||action==='resize'){
        if(!node?.parent||![dx,dy].every(Number.isFinite))throw Error('이동할 위젯과 위치를 확인하세요.');
        const owner=next.nodes.find(item=>item.id===node.parent);
        if(!['Canvas','Panel','Widget','NamedSlot'].includes(owner.type))throw Error('자동 배치 위젯의 슬롯은 속성에서 수정하세요.');
        transformWidgetSlot(node.slot,{dx,dy,resize:action==='resize'});
      }else throw Error('위젯 편집 명령을 확인하세요.');
      change(doc,next);
      return {...await response(doc),selection};
    },
    'asset.fields': ({path,parts=[]}) => fieldsFor(targetDocument(path),parts),
    'graph.inputs': async ({path,view='event',id}) => {
      const doc=targetDocument(path);await loadGraphNative(doc);
      const graph=graphFor(doc,structuredClone(doc.data),view), node=graph.nodes.find(row=>row.id===id);
      if (!node) throw Error('노드가 없어요.');
      const bp=doc.kind==='blueprint', pins=bp?effectivePins(node,'in',graph):materialPins(node,graph).inputs;
      const incoming=new Set((bp?graph.edges:normalizedMaterialEdges(graph)).filter(edge=>edge.to.node===id).map(edge=>edge.to.pin));
      const inputs=pins.filter(pin=>pin.type!=='exec').map(pin=>({
        id:pin.id,label:pin.label,linked:incoming.has(pin.id),
        value:bp?defaultInputValue(node,pin):node.inputValues?.[pin.id]??pin.value??null
      }));
      if (!bp && Object.hasOwn(node,'value')) inputs.unshift({id:'',label:'값',linked:false,value:node.value});
      if (!bp) inputs.push(...materialNodeProperties(node,doc.data));
      return inputs;
    },
    'asset.fieldEdit': async ({path,parts=[],key,value,expectedRevision}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
      if(doc.kind==='scene'&&parts[0]==='objects'&&doc.data.objects[Number(parts[1])]?.locked)throw Error('오브젝트 잠금을 해제하세요.');
      const field = fieldsFor(doc,parts).find(row=>row.key===key);
      if (!field || field.control.disabled || field.type==='object') throw Error('편집 가능한 속성을 선택하세요.');
      if (field.type==='number' && typeof value==='string' && value.trim()) value=Number(value);
      if (typeof value!==field.type || typeof value==='number' && !Number.isFinite(value)) throw Error('속성 값의 형식을 확인하세요.');
      if(doc.kind==='lod'&&!parts.length&&key==='mode'&&value!==doc.data.mode){
        const next=structuredClone(doc.data);next.mode=value;
        next.levels.forEach((level,index)=>level.threshold=value==='distance'?.001+index*20:1/(index+1));
        change(doc,next);return response(doc);
      }
      const pointer = '/'+[...parts,key].map(pointerPart).join('/');
      change(doc,patchAsset(doc.kind,doc.data,[{op:'replace',path:pointer,value}]));
      return response(doc);
    },
    'graph.read': async ({path,view='event'})=>{
      const doc=targetDocument(path);await loadGraphNative(doc);return graphModel(doc,view);
    },
    'graph.copy': ({path,view='event',ids})=>{
      const doc=targetDocument(path);
      if(!Array.isArray(ids)||!ids.length||!ids.every(id=>typeof id==='string')||gameplayGraphs.has(doc.kind))throw Error('복사할 블루프린트 또는 머테리얼 노드를 선택하세요.');
      const graph=graphFor(doc,structuredClone(doc.data),view);
      return doc.kind==='blueprint'?{type:'HBBlueprintNodes',...blueprintClipboard(doc.data,graph,ids)}:copyMaterialNodes(graph,new Set(ids));
    },
    'graph.transitions': ({view})=>{
      const doc=current(),{machine,state}=animationView(assetOfKind('animgraph',doc).data,view);
      if(!machine||state)throw Error('애니메이션 상태 머신 보기를 선택하세요.');
      const names=new Map(machine.properties.states.map(row=>[row.id,row.name]));
      names.set('any','Any State');
      return machine.properties.transitions.map(row=>({id:row.id,label:names.get(row.from)+' → '+names.get(row.to)}));
    },
    'graph.transitionFields': ({view,id})=>{
      const doc=current(),{machine,transition}=animationTransition(doc,view,id);
      const fields=[];
      const field=(label,key,value,options,index)=>{
        const control=options?{kind:'select',value:String(value),options}
          :typeof value==='boolean'?{kind:'checkbox',checked:value}:{kind:'text',value:String(value)};
        fields.push({label,key,index,control});
      };
      const states=machine.properties.states.map(row=>[row.id,row.name]);
      field('출발 상태','from',transition.from,[['any','Any State'],...states]);
      field('도착 상태','to',transition.to,states);
      for(const [label,key] of [['우선순위','priority'],['종료 시점 사용','hasExitTime'],['종료 비율','exitTime'],
        ['초 단위','fixedDuration'],['혼합 시간','duration'],['대상 시작 비율','offset'],['순서대로 중단','ordered'],
        ['자기 상태 전이','allowSelf'],['시작 이벤트','onStart'],['완료 이벤트','onEnd'],['중단 이벤트','onInterrupt']])
        field(label,key,transition[key]);
      field('혼합 곡선','curve',transition.curve,Object.entries(animationBlendCurves));
      field('중단 검사','interrupt',transition.interrupt,Object.entries(animationInterrupts));
      for(const [index,condition] of transition.conditions.entries()){
        const parameter=doc.data.parameters.find(row=>row.name===condition.parameter);
        field('파라미터 '+(index+1),'parameter',parameter.name,doc.data.parameters.map(row=>[row.name,row.name]),index);
        field('비교','op',condition.op,conditionOps(parameter.type).map(op=>[op,animationConditionOps[op]]),index);
        if(!['bool','trigger'].includes(parameter.type))
          field('값','value',condition.value,parameter.values?.map(row=>[String(row.value),row.name]),index);
        fields.push({label:'조건 '+(index+1),key:'removeCondition',index,control:{kind:'button',text:'삭제'}});
      }
      fields.push({label:'전이 조건',key:'addCondition',control:{kind:'button',text:'추가',disabled:doc.data.parameters.length===0}},
        {label:'전이',key:'delete',control:{kind:'button',text:'삭제'}});
      return fields;
    },
    'graph.transitionEdit': async ({view,id,key,index,value,expectedRevision})=>{
      const doc=current();await check(doc,expectedRevision);
      const next=structuredClone(doc.data),{machine,transition}=animationTransition({...doc,data:next},view,id);
      const listed=methods['graph.transitionFields']({view,id}).find(row=>row.key===key&&row.index===index);
      if(!listed||listed.control.disabled)throw Error('편집할 전이 속성을 선택하세요.');
      const defaultCondition=parameter=>({parameter:parameter.name,op:conditionOps(parameter.type)[0],
        value:['bool','trigger'].includes(parameter.type)?true:parameter.values?.[0]?.value??0});
      if(key==='delete')machine.properties.transitions=machine.properties.transitions.filter(row=>row!==transition);
      else if(key==='addCondition')transition.conditions.push(defaultCondition(next.parameters[0]));
      else if(key==='removeCondition')transition.conditions.splice(index,1);
      else if(key==='parameter'){
        const parameter=next.parameters.find(row=>row.name===value);
        if(!parameter)throw Error('전이 파라미터를 선택하세요.');
        transition.conditions[index]=defaultCondition(parameter);
      }else{
        const target=index===undefined?transition:transition.conditions[index];
        if(typeof target[key]==='number'&&typeof value==='string'&&value.trim())value=Number(value);
        if(typeof value!==typeof target[key])throw Error('전이 속성의 형식을 확인하세요.');
        target[key]=value;
        if(key==='op'&&(value==='true'||value==='false'))target.value=value==='true';
      }
      change(doc,next);return response(doc);
    },
    'graph.inspectorPath': ({id,view='event'})=>{
      const doc=current();
      if(!gameplayGraphs.has(doc.kind))throw Error('게임플레이 그래프를 선택하세요.');
      if(doc.kind==='animgraph'&&view.startsWith('machine:')){
        const {machine}=animationView(doc.data,view),index=machine.properties.states.findIndex(row=>row.id===id);
        if(index>=0)return ['nodes',String(doc.data.nodes.indexOf(machine)),'properties','states',String(index)];
      }
      const key=doc.kind==='statemachine'?'states':'nodes';
      const index=doc.data[key].findIndex(row=>row.id===id);
      return index<0?[]:[key,String(index)];
    },
    'blueprint.members': () => ({
      types:Object.entries(variableTypes).filter(([id])=>id!=='record').map(([id,label])=>({id,label})),
      variables:assetOfKind('blueprint').data.variables,
      dispatchers:assetOfKind('blueprint').data.dispatchers||[],interfaces:assetOfKind('blueprint').data.interfaces||[]
    }),
    'blueprint.newPort': ({label,type,array=false})=>{
      if(typeof label!=='string'||!label.trim()||label.length>80||!Object.hasOwn(variableTypes,type)||typeof array!=='boolean')throw Error('핀 이름과 자료형을 확인하세요.');
      return {id:'pin_'+crypto.randomUUID().replaceAll('-',''),label:label.trim(),type,array};
    },
    'blueprint.symbolPorts': async ({id,direction,ports,expectedRevision})=>{
      const doc=assetOfKind('blueprint');await check(doc,expectedRevision);
      const next=structuredClone(doc.data),dispatcher=next.dispatchers?.find(row=>row.id===id),symbol=dispatcher||next.interfaces?.find(row=>row.id===id);
      if(!symbol||!['inputs','outputs'].includes(direction)||dispatcher&&direction==='outputs'||!Array.isArray(ports))throw Error('편집할 시그니처와 핀 방향을 확인하세요.');
      const prior=symbol[direction],changed=new Set(prior.filter(pin=>!ports.some(row=>row?.id===pin.id&&row.type===pin.type&&row.array===pin.array)).map(pin=>pin.id));
      symbol[direction]=structuredClone(ports);
      for(const view of names(next).map(([id])=>id)){
        const graph=graphContext(next,view),ids=new Set(graph.nodes.filter(node=>node.symbolId===id).map(node=>node.id));
        for(const node of graph.nodes)if(ids.has(node.id)){
          for(const key of Object.keys(node.inputValues||{}))if(changed.has(key.split('.')[0]))delete node.inputValues[key];
          node.splitPins=node.splitPins?.filter(pin=>!changed.has(pin.split(':').at(-1).split('.')[0]))||[];
        }
        graph.edges=graph.edges.filter(edge=>!(ids.has(edge.from.node)&&changed.has(edge.from.pin.split('.')[0])||ids.has(edge.to.node)&&changed.has(edge.to.pin.split('.')[0])));
      }
      change(doc,next);return response(doc);
    },
    'blueprint.memberAdd': async ({kind,name,type,inputs=[],outputs=[],expectedRevision})=>{
      const doc=assetOfKind('blueprint');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data);
      let view='event';
      if(kind==='variable'){
        if(typeof name!=='string'||!name.trim()||!Object.hasOwn(variableTypes,type)||type==='record'||next.variables.some(item=>item.name===name.trim()))throw Error('변수 이름과 자료형을 확인하세요.');
        next.variables.push({id:'var_'+crypto.randomUUID().replaceAll('-',''),name:name.trim(),type,container:'single',value:defaultsFor(type)});
      }else if(kind==='dispatcher'||kind==='interface'){
        const key=kind==='dispatcher'?'dispatchers':'interfaces',symbols=next[key]??=[];
        if(typeof name!=='string'||!name.trim()||name.length>80||symbols.some(row=>row.name===name.trim()))throw Error('시그니처 이름을 확인하세요.');
        symbols.push({id:'symbol_'+crypto.randomUUID().replaceAll('-',''),name:name.trim(),inputs,outputs});
      }else{
        const result=makeDefinition(next,kind,name);
        if(!result.ok)throw Error(result.reason);
        view=result.definition.id;
      }
      change(doc,next);
      return {...await response(doc),view};
    },
    'graph.edit': async ({path,view='event',action,id,x,y,key,from,to,pin,output,value,asset,clipboard,expectedRevision}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
      await loadGraphNative(doc);
      if(gameplayGraphs.has(doc.kind)){
        const next=structuredClone(doc.data);
        if(doc.kind==='animgraph'){
          editAnimationGraph(next,view,{action,id,key,x,y,from,to,pin,output});change(doc,next);
          return {...await response(doc),model:animationGraphModel(doc.data,view)};
        }
        changeGameplayGraph(doc,next,{action,id,key,x,y,from,to,pin,output});
        return {...await response(doc),model:gameplayGraph(doc.kind,doc.data)};
      }
      const next = structuredClone(doc.data), graph = graphFor(doc,next,view), bp = doc.kind === 'blueprint';
      const readMaterial=async name=>{
        if(name===doc.path)return next;
        const open=documents.items.get(name);
        return open?.data??JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
      };
      if (action === 'move' || action === 'add') {
        if (![x,y].every(Number.isFinite)) throw Error('노드 위치를 확인하세요.');
        x = Math.max(-10000,Math.min(10000,x));
        y = Math.max(-10000,Math.min(10000,y));
        if (action === 'move') {
          const node = graph.nodes.find(row => row.id === id);
          if (!node) throw Error('노드가 없어요.');
          if (bp) node.position = {x,y}; else Object.assign(node,{px:x,y});
        } else {
          if (!graphModel(doc,view).palette.some(row => row.id === key)) throw Error('노드 종류를 확인하세요.');
          if(bp){
            const [type,target]=key.split(':'),node=makeNode(type,x,y,['getVariable','setVariable'].includes(type)?target:undefined);
            if(['callFunction','callMacro'].includes(type))node.definitionId=target;
            if(type.startsWith('native'))node.nativeId=target;
            if(type.startsWith('dispatcher')||type==='interfaceCall')node.symbolId=target;
            graph.nodes.push(node);
          }else if(key==='functionCall'){
            if(typeof asset!=='string'||asset===doc.path||assetKind(asset)!=='materialfunction')throw Error('다른 머테리얼 함수 에셋을 선택하세요.');
            graph.nodes.push({...makeMaterialFunctionCall(asset,await readMaterial(asset),x,y),px:x});
            await materialFunctionDependencies(graph,readMaterial,{checkSignatures:false});
          }else{
            const node={...makeMaterialNode(key,x,y),px:x};
            if(node.portName)node.portName=materialPortName(graph,key,node.portName);
            graph.nodes.push(node);
          }
        }
      }else if(action==='breakpoint'&&bp){
        const node=graph.nodes.find(row=>row.id===id);
        if(!node)throw Error('중단점을 설정할 노드를 선택하세요.');
        node.breakpoint=!node.breakpoint;
      } else if(action==='watch'&&bp){
        const node=graph.nodes.find(row=>row.id===id);
        if(!node||!output||!effectivePins(node,'out',graph).some(row=>row.id===pin&&row.type!=='exec'))
          throw Error('관찰할 출력 값 핀을 선택하세요.');
        const watches=next.watches??=[];
        const index=watches.findIndex(row=>row.view===view&&row.node===id&&row.pin===pin&&row.direction==='out');
        if(index>=0)watches.splice(index,1);
        else if(watches.length<100)watches.push({view,node:id,direction:'out',pin});
        else throw Error('관찰 핀은 최대 100개까지 설정할 수 있어요.');
      } else if(action==='paste'){
        if(![x,y].every(Number.isFinite)||clipboard?.type!==(bp?'HBBlueprintNodes':'HBMaterialNodes'))throw Error('같은 유형의 그래프에서 복사한 노드를 확인하세요.');
        const position={x:Math.max(-10000,Math.min(10000,x)),y:Math.max(-10000,Math.min(10000,y))};
        const result=bp?pasteNodes(next,view,clipboard,position):pasteMaterialNodes(graph,clipboard,position);
        if(!result.ok)throw Error(result.reason);
        if(!bp&&result.nodes.some(node=>node.key==='functionCall'))await materialFunctionDependencies(graph,readMaterial,{checkSignatures:false});
      } else if(action==='refreshFunction'&&!bp){
        const node=graph.nodes.find(row=>row.id===id&&row.key==='functionCall');
        if(!node)throw Error('머테리얼 함수 호출 노드를 선택하세요.');
        refreshMaterialFunctionCall(graph,id,await readMaterial(node.asset));
        await materialFunctionDependencies(graph,readMaterial,{checkSignatures:false});
      } else if(action==='property'&&!bp){
        const node=graph.nodes.find(row=>row.id===id);
        const property=node&&materialNodeProperties(node,next).find(row=>row.id===pin);
        if(!property||property.linked||pin==='refreshFunction')throw Error('편집할 머테리얼 노드 속성을 선택하세요.');
        if(property.assetKind&&(typeof value!=='string'||assetKind(value)!==property.assetKind||!validMaterialLayer(await readMaterial(value),property.assetKind==='materialblend')))throw Error('레이어 에셋을 확인하세요.');
        editMaterialNodeProperty(next,graph,node,property,value);
      } else if(action==='comment'){
        if(!bp)throw Error('블루프린트 그래프를 선택하세요.');
        if(![x,y].every(Number.isFinite))throw Error('주석 위치를 확인하세요.');
        const comment=makeComment(graph,id?[id]:[],{x,y});
        (graph.comments??=[]).push(comment);
      } else if (action === 'connect') {
        const result = bp ? connectAutomatic(graph,from,to) : connectMaterial(graph,from,to);
        if (!result.ok) throw Error(result.reason);
      } else if (action === 'disconnect') {
        const side = output ? 'from' : 'to';
        if (bp) graph.edges = graph.edges.filter(edge => edge[side].node!==id || edge[side].pin!==pin);
        else disconnectMaterial(graph,id,pin,side);
      } else if (action === 'input') {
        const input=(await methods['graph.inputs']({path,view,id})).find(row=>row.id===pin);
        if (!input || input.linked || input.property) throw Error('편집할 수 있는 기본값을 선택하세요.');
        const node=graph.nodes.find(row=>row.id===id);
        if (pin) (node.inputValues??={})[pin]=value;
        else node.value=value;
      } else if (action === 'delete') {
        if (bp) {
          graph.nodes = graph.nodes.filter(node => node.id !== id);
          graph.edges = graph.edges.filter(edge => edge.from.node !== id && edge.to.node !== id);
          if (graph.comments?.length) graph.comments = graph.comments.map(comment=>({...comment,nodeIds:comment.nodeIds.filter(node=>node!==id)}));
          if (next.watches) next.watches = next.watches.filter(watch=>watch.view!==view || watch.node!==id);
        } else removeMaterialNodes(graph,new Set([id]));
      } else throw Error('그래프 편집 명령을 확인하세요.');
      if(bp&&nativeMetadata.has(doc.data)){
        const metadata=nativeMetadata.get(doc.data);
        next.native=doc.data.native;
        nativeMetadata.set(next,metadata);
      }
      change(doc,next);
      return {...await response(doc), model:graphModel(doc,view)};
    }
  };
  async function restore(from,to,file,expected) {
    const doc = targetDocument(file);
    if(file!==undefined||expected!==undefined)await check(doc,expected);
    if (doc[from].length) {
      doc[to].push(doc.data);
      doc.data = doc[from].pop();
      doc.dirty = JSON.stringify(doc.data) !== doc.saved;
      if(doc.kind==='text'&&doc.path.startsWith('Source/'))nativeMetadata=new WeakMap();
    }
    return response(doc);
  }
  return async (method,params={}) => {
    if (!Object.hasOwn(methods,method)) throw Error('지원하지 않는 편집기 명령이에요.');
    return methods[method](params);
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const listeners=new Set();
  const write=packet=>process.stdout.write(JSON.stringify(packet)+'\n');
  const dispatch = nativeEditorSession({
    postMessage:write,
    postSerializedMessage:text=>process.stdout.write(text+'\n'),
    addEventListener:(_type,listener)=>listeners.add(listener),
    removeEventListener:(_type,listener)=>listeners.delete(listener)
  });
  let queue=Promise.resolve();
  for await (const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
    try {
      const packet=JSON.parse(line);
      if (packet.channel==='hb.render') {
        for (const listener of listeners) listener({data:packet});
        continue;
      }
      queue=queue.then(async()=>{
        try {write({ok:true,value:await dispatch(packet.method,packet.params)});}
        catch(error) {write({ok:false,error:error.message,code:error.code || (error.status===409?'REVISION_CONFLICT':'COMMAND_FAILED')});}
      });
    } catch (error) {
      write({ok:false,error:error.message,code:'COMMAND_FAILED'});
    }
  }
  await queue;
}
