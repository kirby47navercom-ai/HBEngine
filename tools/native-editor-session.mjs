import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {AssetDocuments, assetSuffix, assetTypes, validAsset} from '../prototype/asset-documents.js';
import {documentRevision, patchAsset} from '../prototype/automation.js';
import {catalog, defaultInputValue, effectivePins, graphContext, makeNode, nodeTitle, typeColors} from '../prototype/blueprint-model.js';
import {connectAutomatic} from '../prototype/blueprint-connections.js';
import {connectMaterial, disconnectMaterial, makeMaterialNode, materialCatalog, materialGraph, materialPins, normalizedMaterialEdges, removeMaterialNodes} from '../prototype/material-runtime.js';
import {assetKind} from './project-service.mjs';
import {createProject, readProjectManifest, recentProjects, rememberProject} from './project-manifest.mjs';

const materialKinds = new Set(['material', 'materialfunction', 'materiallayer', 'materialblend']);
const graphKind = doc => doc.kind === 'blueprint' || materialKinds.has(doc.kind);
const editableText = /\.(?:cpp|hpp|h|c|hlsl|glsl|txt|md|json|yaml|yml|csv|svg|obj|gltf)$/i;
const names = data => [
  ['event', '이벤트 그래프'],
  ...(data.construction ? [['construction', 'Construction Script']] : []),
  ...[...(data.functions || []), ...(data.macros || [])].map(row => [row.id, row.name])
];
const packPin = pin => ({id:pin.id, label:pin.label, color:typeColors[pin.type] || typeColors.any});
const pointerPart = key => key.replaceAll('~','~0').replaceAll('/','~1');
const fieldLabels = {name:'이름',sceneName:'레벨 이름',objects:'오브젝트',environment:'환경',position:'위치',rotation:'회전',scale:'크기',parent:'부모 에셋',clip:'오디오 클립',volume:'볼륨',pitch:'피치',loop:'반복',friction:'마찰',restitution:'반발력',density:'밀도',parameters:'매개변수',surfaceOverrides:'표면 오버라이드'};

export function nativeEditorSession() {
  let record, documents = new AssetDocuments();
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
    const candidate = await next();
    await rememberProject(candidate);
    record = candidate;
    documents = new AssetDocuments();
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
    const palette = (bp ? catalog.filter(row => row.kind !== 'event' && row.kind !== 'variable') : materialCatalog.filter(row => row.key !== 'surface' && row.key !== 'functionCall'))
      .map(row => ({id:row.key, title:row.title}));
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
  const methods = {
    'project.open': ({file}) => openProject(() => readProjectManifest(file)),
    'project.create': ({name,directory,template}) => openProject(() => createProject(name,directory,template)),
    'project.recent': () => recentProjects(),
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
      const field = fieldsFor(doc,parts).find(row=>row.key===key);
      if (!field || field.control.disabled || field.type==='object') throw Error('편집 가능한 속성을 선택하세요.');
      if (field.type==='number' && typeof value==='string' && value.trim()) value=Number(value);
      if (typeof value!==field.type || typeof value==='number' && !Number.isFinite(value)) throw Error('속성 값의 형식을 확인하세요.');
      const pointer = '/'+[...parts,key].map(pointerPart).join('/');
      change(doc,patchAsset(doc.kind,doc.data,[{op:'replace',path:pointer,value}]));
      return response(doc);
    },
    'graph.read': ({view='event'}) => graphModel(current(),view),
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
          graph.nodes.push(bp ? makeNode(key,x,y) : {...makeMaterialNode(key,x,y),px:x});
        }
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
  const dispatch = nativeEditorSession();
  for await (const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
    try {
      const {method,params} = JSON.parse(line);
      process.stdout.write(JSON.stringify({ok:true,value:await dispatch(method,params)})+'\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({ok:false,error:error.message,code:error.code || (error.status===409?'REVISION_CONFLICT':'COMMAND_FAILED')})+'\n');
    }
  }
}
