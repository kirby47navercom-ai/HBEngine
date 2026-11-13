import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {AssetDocuments, assetSuffix, assetTypes, validAsset} from '../prototype/asset-documents.js';
import {documentRevision, patchAsset} from '../prototype/automation.js';
import {catalog, defaultInputValue, defaultsFor, effectivePins, graphContext, makeComment, makeDefinition, makeNode, nodeTitle, sampleTimeline, timelineLength, typeColors, variableTypes} from '../prototype/blueprint-model.js';
import {connectAutomatic} from '../prototype/blueprint-connections.js';
import {connectMaterial, disconnectMaterial, makeMaterialNode, materialCatalog, materialGraph, materialPins, normalizedMaterialEdges, removeMaterialNodes, resolveMaterialPreview} from '../prototype/material-runtime.js';
import {assetKind} from './project-service.mjs';
import {createProject, readProjectManifest, recentProjects, rememberProject} from './project-manifest.mjs';
import {createPlacedObject,placementCatalog} from '../prototype/placement-catalog.js';
import {addSceneComponent,componentDefinitions} from '../prototype/scene-components.js';
import {addWidget,removeWidget,reparentWidget,widgetContainers,widgetTypes} from '../prototype/ui-assets.js';
import {projectBytes} from './project-bytes.mjs';
import {copySceneObjects,pasteSceneObjects,setObjectMatrix,validParent} from '../prototype/scene-editor.js';
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
import {spriteImage} from '../prototype/two-d-assets.js';
import {editSequenceSection,loadSequenceTree} from '../prototype/sequence-sections.js';
import {configureSequenceCurve,sequenceCurveModes,sequenceCurveType,sequenceRangeModes} from '../prototype/sequence-curves.js';
import {editSequenceCurves} from '../prototype/sequence-curve-edit.js';
import {defaultEnvironment,defaultSurface} from '../prototype/model.js';
import {createBlueprintResolver} from '../prototype/blueprint-inheritance.js';

const materialKinds = new Set(['material', 'materialfunction', 'materiallayer', 'materialblend']);
const gameplayGraphs=new Set(['behaviortree','statemachine','animgraph']);
const graphKind = doc => doc.kind === 'blueprint' || materialKinds.has(doc.kind) || gameplayGraphs.has(doc.kind);
const previewKind = doc => doc.kind==='blueprint'||doc.kind==='materialinstance'||materialKinds.has(doc.kind);
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
const fieldLabels = {name:'이름',sceneName:'레벨 이름',objects:'오브젝트',environment:'환경',position:'위치',rotation:'회전',scale:'크기',parent:'부모 에셋',clip:'오디오 클립',volume:'볼륨',pitch:'피치',loop:'반복',friction:'마찰',restitution:'반발력',density:'밀도',parameters:'매개변수',surfaceOverrides:'표면 오버라이드'};

export function nativeEditorSession(bridge) {
  let record, documents = new AssetDocuments(), viewport, preview, previewSource, previewScene, previewNode, build, buildJobs, lastBuild;
  const sequenceSamplers=new WeakMap();
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
  async function openProject(next) {
    if (tabs().some(doc => doc.dirty)) throw Error('변경한 문서를 먼저 저장하거나 닫으세요.');
    if(build&&buildJobs.get(record,build).status==='running')throw Error('빌드가 끝나면 프로젝트를 바꾸세요.');
    const candidate = await next();
    await rememberProject(candidate);
    record = candidate;
    documents = new AssetDocuments();
    buildJobs?.close();buildJobs=undefined;build=undefined;lastBuild=undefined;
    return {file:record.file, name:record.manifest.name, startupScene:record.manifest.startupScene};
  }
  function graphFor(doc, data, view) {
    if (!graphKind(doc)) throw Error('노드 그래프 문서를 선택하세요.');
    if (doc.kind !== 'blueprint') return data.graph ??= materialGraph();
    if (!names(data).some(([id]) => id === view)) throw Error('그래프가 없어요.');
    return graphContext(data, view);
  }
  function graphModel(doc, view) {
    if(doc.kind==='animgraph')return animationGraphModel(doc.data,view);
    if(gameplayGraphs.has(doc.kind))return gameplayGraph(doc.kind,doc.data);
    const data = structuredClone(doc.data), bp = doc.kind === 'blueprint', graph = graphFor(doc, data, view);
    const nodes = graph.nodes.map(node => {
      const pins = bp ? {inputs:effectivePins(node,'in',graph),outputs:effectivePins(node,'out',graph)} : materialPins(node,graph);
      const x = bp ? node.position.x : node.px ?? (Math.abs(node.x) < 2 ? node.x * 580 : node.x);
      return {id:node.id, title:bp ? nodeTitle(node,graph) : node.portName || node.title || node.key || node.id, x, y:bp ? node.position.y : node.y,
        inputs:pins.inputs.map(packPin), outputs:pins.outputs.map(packPin)};
    });
    const palette = (bp ? catalog.filter(row => row.kind !== 'variable' && (row.kind!=='event'||view==='event'&&!graph.nodes.some(node=>node.key===row.key))) : materialCatalog.filter(row => row.key !== 'surface' && row.key !== 'functionCall'))
      .map(row => ({id:row.key, title:row.title}));
    if(bp){
      for(const variable of data.variables)for(const prefix of ['get','set'])palette.push({id:prefix+'Variable:'+variable.id,title:(prefix==='get'?'Get ':'Set ')+variable.name});
      for(const [kind,items] of [['callFunction',data.functions],['callMacro',data.macros]])for(const definition of items||[])if(definition.id!==view)palette.push({id:kind+':'+definition.id,title:definition.name});
    }
    return {view, views:bp ? names(data) : [], nodes, edges:bp ? graph.edges : normalizedMaterialEdges(graph), comments:graph.comments || [], palette};
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
    return Object.entries(data).map(([key,value]) => {
      const type = value === null ? 'null' : typeof value;
      const label = fieldLabels[key] || value?.name || key;
      const control = type === 'object' ? {kind:'button',text:Array.isArray(value) ? `열기 (${value.length})` : '열기'}
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
      return {profiles,revision};
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
    'content.types': () => Object.entries(assetTypes).filter(([kind,info])=>assetSuffix[kind]&&!info.sourceOnly)
      .map(([kind,info])=>({kind,suffix:assetSuffix[kind],label:info.label,prefix:info.prefix})),
    'content.list': async ({folder='',query=''}) => {
      const listed = await project().list({folder,query,browse:true,recursive:!!query});
      const found = new Map(listed.entries.map(row => [row.path,row]));
      for (const row of listed.folders) {
        const parent = path.posix.dirname(row.path);
        if (!query && parent === (folder || '.')) found.set(row.path,row);
      }
      const entries = [...found.values()];
      entries.sort((a,b) => Number(b.kind==='folder')-Number(a.kind==='folder') || a.path.localeCompare(b.path));
      return {entries, issues:listed.issues || []};
    },
    'content.create': async ({folder,kind,name}) => {
      if (typeof folder!=='string' || !/^Assets(?:\/|$)/.test(folder) || !Object.hasOwn(assetSuffix,kind) || typeof name!=='string' || !name.trim() || /[/\\:<>?"|*\x00-\x1f]/.test(name)) throw Error('Assets 폴더와 에셋 이름, 종류를 확인하세요.');
      return openDocument((await project().create(folder,kind,name.trim())).path);
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
    'document.open': ({path}) => openDocument(path),
    'document.load': async ({path})=>response(await loadDocument(path)),
    'document.read': ({path}) => response(targetDocument(path)),
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
    'scene.catalog': () => ({placements:placementCatalog.map(([id,label,group])=>({id,label,group})),components:Object.keys(componentDefinitions)}),
    'scene.hierarchy': () => scene().data.objects.map(({id,name,kind,parent,visible,locked,components})=>({id,name,kind,parent,visible,locked,camera:components?.some(c=>c.type==='Camera'&&c.properties?.enabled!==false)??kind==='camera'})),
    'scene.edit': async ({action,id,target,key,expectedRevision}) => {
      const doc=scene();
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data), byId=new Map(next.objects.map(actor=>[actor.id,actor]));
      const actor=byId.get(id);
      let selection=id;
      if (action==='add') {
        const created=createPlacedObject(key);next.objects.push(created);selection=created.id;
      } else {
        if (!actor) throw Error('오브젝트를 선택하세요.');
        if (actor.locked&&action!=='lock'&&action!=='visible') throw Error('오브젝트 잠금을 해제하세요.');
        if (action==='lock') actor.locked=!actor.locked;
        else if (action==='visible') actor.visible=!actor.visible;
        else if (action==='component') addSceneComponent(actor,key);
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
      const doc=scene();
      viewport??=(await import('./native-editor-viewport.mjs')).nativeEditorViewport(bridge);
      return viewport.draw(doc.data,project(),params);
    },
    'asset.preview': async params=>{
      const {width,height,node}=params;
      if(!bridge||![width,height].every(value=>Number.isInteger(value)&&value>0&&value<=4096))throw Error('3D 미리보기 연결이나 크기를 확인하세요.');
      const doc=current();
      if(!previewKind(doc))throw Error('미리 볼 에셋을 선택하세요.');
      preview??=(await import('./native-editor-viewport.mjs')).nativeEditorViewport(bridge,'native-preview');
      if(previewSource!==doc.data||previewNode!==node){
        const asset=async name=>name===doc.path?doc.data:JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
        const actor=createPlacedObject(doc.kind==='blueprint'?'cube':'sphere',{id:'asset-preview'});
        let data=doc.data;
        if(doc.kind==='blueprint'){
          const root=await createBlueprintResolver(asset,async name=>(await projectBytes(project(),name)).toString('utf8'))(doc.path);
          actor.components=structuredClone(root.components);
          if(!actor.components.some(component=>component.type==='MeshRenderer'))actor.kind='empty';
        }else{
          if(materialKinds.has(doc.kind)&&doc.kind!=='material'){
            const graph=data.graph;
            const selected=graph?.nodes.find(row=>row.id===node)||graph?.nodes.find(row=>row.key==='functionOutput'&&materialPins(row,graph).inputs.length);
            if(!selected)throw Error('미리 볼 머테리얼 함수 출력을 선택하세요.');
            data=(await resolveMaterialPreview(data,{node:selected.id},asset)).data;
          }
          actor.materialAsset=doc.path;
        }
        previewScene={objects:[actor],surface:defaultSurface,environment:defaultEnvironment,assetDraft:{path:doc.path,data}};
        previewSource=doc.data;previewNode=node;
      }
      return preview.draw(previewScene,project(),params);
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
    'asset.imagePreview': async ({index=0,level=0}={})=>{
      const doc=current(),data=doc.data;
      if(!Number.isInteger(index)||index<0||!Number.isInteger(level)||level<0)throw Error('이미지 미리보기 범위를 확인하세요.');
      const read=async name=>JSON.parse((await projectBytes(project(),name)).toString('utf8').replace(/^\uFEFF/,''));
      let sprite,images,filter='linear';
      if(doc.kind==='sprite'){
        sprite=await resolveSprite(data,read);filter=sprite.filter;
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
      return {width,height,nearest:filter==='nearest',pixels:canvas.data().toString('base64')};
    },
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
        return {width,height,pixels:layer.canvas.data().toString('base64'),rows:layer.layout};
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
      else if(action==='move'){
        if(!node?.parent||![dx,dy].every(Number.isFinite))throw Error('이동할 위젯과 위치를 확인하세요.');
        const owner=next.nodes.find(item=>item.id===node.parent);
        if(!['Canvas','Panel','Widget','NamedSlot'].includes(owner.type))throw Error('자동 배치 위젯의 슬롯은 속성에서 수정하세요.');
        const {anchors:a,offset:o}=node.slot;
        o[0]+=dx;o[1]+=dy;if(a[0]!==a[2])o[2]-=dx;if(a[1]!==a[3])o[3]-=dy;
      }else throw Error('위젯 편집 명령을 확인하세요.');
      change(doc,next);
      return {...await response(doc),selection};
    },
    'asset.fields': ({parts=[]}) => fieldsFor(current(),parts),
    'graph.inputs': ({path,view='event',id}) => {
      const doc=targetDocument(path), graph=graphFor(doc,structuredClone(doc.data),view), node=graph.nodes.find(row=>row.id===id);
      if (!node) throw Error('노드가 없어요.');
      const bp=doc.kind==='blueprint', pins=bp?effectivePins(node,'in',graph):materialPins(node,graph).inputs;
      const incoming=new Set((bp?graph.edges:normalizedMaterialEdges(graph)).filter(edge=>edge.to.node===id).map(edge=>edge.to.pin));
      const inputs=pins.filter(pin=>pin.type!=='exec').map(pin=>({
        id:pin.id,label:pin.label,linked:incoming.has(pin.id),
        value:bp?defaultInputValue(node,pin):node.inputValues?.[pin.id]??pin.value??null
      }));
      if (!bp && Object.hasOwn(node,'value')) inputs.unshift({id:'',label:'값',linked:false,value:node.value});
      return inputs;
    },
    'asset.fieldEdit': async ({parts=[],key,value,expectedRevision}) => {
      const doc = current();
      await check(doc,expectedRevision);
      if(doc.kind==='scene'&&parts[0]==='objects'&&doc.data.objects[Number(parts[1])]?.locked)throw Error('오브젝트 잠금을 해제하세요.');
      const field = fieldsFor(doc,parts).find(row=>row.key===key);
      if (!field || field.control.disabled || field.type==='object') throw Error('편집 가능한 속성을 선택하세요.');
      if (field.type==='number' && typeof value==='string' && value.trim()) value=Number(value);
      if (typeof value!==field.type || typeof value==='number' && !Number.isFinite(value)) throw Error('속성 값의 형식을 확인하세요.');
      const pointer = '/'+[...parts,key].map(pointerPart).join('/');
      change(doc,patchAsset(doc.kind,doc.data,[{op:'replace',path:pointer,value}]));
      return response(doc);
    },
    'graph.read': ({path,view='event'}) => graphModel(targetDocument(path),view),
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
      variables:assetOfKind('blueprint').data.variables
    }),
    'blueprint.memberAdd': async ({kind,name,type,expectedRevision})=>{
      const doc=assetOfKind('blueprint');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data);
      let view='event';
      if(kind==='variable'){
        if(typeof name!=='string'||!name.trim()||!Object.hasOwn(variableTypes,type)||type==='record'||next.variables.some(item=>item.name===name.trim()))throw Error('변수 이름과 자료형을 확인하세요.');
        next.variables.push({id:'var_'+crypto.randomUUID().replaceAll('-',''),name:name.trim(),type,container:'single',value:defaultsFor(type)});
      }else{
        const result=makeDefinition(next,kind,name);
        if(!result.ok)throw Error(result.reason);
        view=result.definition.id;
      }
      change(doc,next);
      return {...await response(doc),view};
    },
    'graph.edit': async ({path,view='event',action,id,x,y,key,from,to,pin,output,value,expectedRevision}) => {
      const doc = targetDocument(path);
      await check(doc,expectedRevision);
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
            graph.nodes.push(node);
          }else graph.nodes.push({...makeMaterialNode(key,x,y),px:x});
        }
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
        const input=methods['graph.inputs']({path,view,id}).find(row=>row.id===pin);
        if (!input || input.linked) throw Error('편집할 수 있는 기본값을 선택하세요.');
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
