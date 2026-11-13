import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {AssetDocuments, assetSuffix, assetTypes, validAsset} from '../prototype/asset-documents.js';
import {documentRevision, patchAsset} from '../prototype/automation.js';
import {catalog, defaultInputValue, defaultsFor, effectivePins, graphContext, makeComment, makeDefinition, makeNode, nodeTitle, sampleTimeline, timelineLength, typeColors, variableTypes} from '../prototype/blueprint-model.js';
import {connectAutomatic} from '../prototype/blueprint-connections.js';
import {connectMaterial, disconnectMaterial, makeMaterialNode, materialCatalog, materialGraph, materialPins, normalizedMaterialEdges, removeMaterialNodes} from '../prototype/material-runtime.js';
import {assetKind} from './project-service.mjs';
import {createProject, readProjectManifest, recentProjects, rememberProject} from './project-manifest.mjs';
import {createPlacedObject,placementCatalog} from '../prototype/placement-catalog.js';
import {addSceneComponent,componentDefinitions} from '../prototype/scene-components.js';
import {addWidget,removeWidget,reparentWidget,widgetContainers,widgetTypes} from '../prototype/ui-assets.js';
import {projectBytes} from './project-bytes.mjs';
import {copySceneObjects,pasteSceneObjects,setObjectMatrix,validParent} from '../prototype/scene-editor.js';
import {sceneWorldMatrix} from '../prototype/scene-runtime.js';

const materialKinds = new Set(['material', 'materialfunction', 'materiallayer', 'materialblend']);
const graphKind = doc => doc.kind === 'blueprint' || materialKinds.has(doc.kind);
const timelineKind = doc => doc.kind === 'curve' || doc.kind === 'animation';
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
  let record, documents = new AssetDocuments(), viewport, build, buildJobs, lastBuild;
  const project = () => {
    if (!record) throw Error('프로젝트를 먼저 여세요.');
    return record.project;
  };
  const current = () => {
    if (!documents.current) throw Error('문서를 먼저 여세요.');
    return documents.current;
  };
  const summary = doc => ({path:doc.path, kind:doc.kind, dirty:doc.dirty});
  const tabs = () => [...documents.items.values()].map(summary);
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
  async function openDocument(file) {
    const kind = assetKind(file);
    if (!assetSuffix[kind] && !editableText.test(file)) throw Error('이 파일은 전용 미리보기에서 열어야 해요.');
    if (!documents.items.has(file)) {
      const source = await project().read(file);
      const text = await fs.readFile(source.file,'utf8');
      documents.open(file, assetSuffix[kind] ? kind : 'text', assetSuffix[kind] ? JSON.parse(text.replace(/^\uFEFF/, '')) : text);
    }
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
  function fieldsFor(doc, parts) {
    if (doc.kind === 'text' || graphKind(doc)) throw Error('속성 편집 문서를 선택하세요.');
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
    'content.import': async ({folder,file})=>{
      if(typeof folder!=='string'||!/^Assets(?:\/|$)/.test(folder)||typeof file!=='string'||!path.isAbsolute(file))throw Error('Assets 폴더와 가져올 파일을 선택하세요.');
      const stat=await fs.stat(file);
      if(!stat.isFile())throw Error('가져올 파일을 선택하세요.');
      return project().importStream(folder,path.basename(file),createReadStream(file),()=>{},{expectedBytes:stat.size});
    },
    'document.open': ({path}) => openDocument(path),
    'document.read': () => response(current()),
    'document.replace': async ({text,expectedRevision}) => {
      const doc = current();
      await check(doc,expectedRevision);
      if (typeof text !== 'string') throw Error('문서 내용을 확인하세요.');
      change(doc,doc.kind === 'text' ? text : JSON.parse(text));
      return response(doc);
    },
    'document.patch': async ({operations,expectedRevision,dryRun=false}) => {
      const doc = current();
      await check(doc,expectedRevision);
      const next = patchAsset(doc.kind,doc.data,operations);
      if (dryRun) return {valid:true, revision:await documentRevision(next), data:next};
      change(doc,next);
      return response(doc);
    },
    'document.save': async ({expectedRevision}) => {
      const doc = current();
      await check(doc,expectedRevision);
      await documents.save(doc,(file,text,expected) => project().checkedWrite(file,text,expected));
      return response(doc);
    },
    'document.close': ({path,discard=false}) => {
      if (!documents.close(path,discard)) throw Error('저장하지 않은 변경 사항이 있어요.');
      return documents.current ? response(documents.current) : {tabs:tabs()};
    },
    'editor.undo': () => restore('history','future'),
    'editor.redo': () => restore('future','history'),
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
    'timeline.read': () => {
      const {timeline}=assetOfKind('timeline').data;
      const length=timelineLength(timeline);
      return {length, tracks:timeline.tracks.map(track=>({id:track.id,name:track.name,type:track.type,keys:track.keys.map(key=>key.time)}))};
    },
    'timeline.sample': ({time}) => {
      const {timeline}=assetOfKind('timeline').data;
      return timeline.tracks.map(track=>({id:track.id,value:sampleTimeline(track,time)}));
    },
    'timeline.edit': async ({action,track,index,time,expectedRevision})=>{
      const doc=assetOfKind('timeline');
      await check(doc,expectedRevision);
      const next=structuredClone(doc.data),row=next.timeline.tracks.find(item=>item.id===track);
      if(!row)throw Error('트랙을 선택하세요.');
      if(action==='delete'){
        if(!Number.isInteger(index)||!row.keys[index])throw Error('키를 선택하세요.');
        row.keys.splice(index,1);
      }else{
        if(!Number.isFinite(time)||time<0||time>timelineLength(next.timeline))throw Error('키의 시간을 확인하세요.');
        if(action==='move'){
          if(!Number.isInteger(index)||!row.keys[index])throw Error('이동할 키를 선택하세요.');
          if(row.keys.some((key,i)=>i!==index&&key.time===time))throw Error('이 시간에 이미 키가 있어요.');
          row.keys[index].time=time;
        }else if(action==='add'){
          if(row.type==='event')throw Error('이벤트 키 값은 속성에서 편집하세요.');
          if(row.keys.some(key=>key.time===time))throw Error('이 시간에 이미 키가 있어요.');
          row.keys.push({time,value:sampleTimeline(row,time)});
        }else throw Error('키 편집 명령을 확인하세요.');
        row.keys.sort((a,b)=>a.time-b.time);
      }
      change(doc,next);
      return response(doc);
    },
    'widget.catalog': ()=>Object.entries(widgetTypes).map(([id,label])=>({id,label})),
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
    'graph.inputs': ({view='event',id}) => {
      const doc=current(), graph=graphFor(doc,structuredClone(doc.data),view), node=graph.nodes.find(row=>row.id===id);
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
    'graph.read': ({view='event'}) => graphModel(current(),view),
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
    'graph.edit': async ({view='event',action,id,x,y,key,from,to,pin,output,value,expectedRevision}) => {
      const doc = current();
      await check(doc,expectedRevision);
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
        const input=methods['graph.inputs']({view,id}).find(row=>row.id===pin);
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
  async function restore(from,to) {
    const doc = current();
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
