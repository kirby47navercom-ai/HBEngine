#!/usr/bin/env node
// HBEngine MCP server (stdio): lets AI apps (Claude Desktop / Claude Code / any MCP client) drive the running native editor
// live through its local AI bridge. Start the editor, open a project, then register this server:
//   claude mcp add hbengine -- node "<engine>/tools/hb-mcp.mjs"
// Options: --data <user data folder> (default: newest ai-bridge.json under %LOCALAPPDATA%/HBEngine).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2),dataArg=args.includes('--data')?args[args.indexOf('--data')+1]:process.env.HB_USER_DATA_DIR;
async function bridgeFile(){
  if(dataArg)return path.join(dataArg,'ai-bridge.json');
  const base=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'HBEngine'),found=[];
  for(const dir of [base,path.join(base,'User'),...(await fs.readdir(base,{withFileTypes:true}).catch(()=>[])).filter(e=>e.isDirectory()).map(e=>path.join(base,e.name))]){
    const file=path.join(dir,'ai-bridge.json');const stat=await fs.stat(file).catch(()=>null);if(stat)found.push([stat.mtimeMs,file]);}
  found.sort((a,b)=>b[0]-a[0]);if(!found.length)throw Error('실행 중인 HBEngine 편집기를 찾지 못했어요. 편집기를 열고 프로젝트를 연 뒤 다시 시도하세요.');return found[0][1];
}
export async function callEditor(method,params={}){
  const info=JSON.parse(await fs.readFile(await bridgeFile(),'utf8'));
  const response=await fetch(`http://127.0.0.1:${info.port}/rpc`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+info.token},body:JSON.stringify({method,params})}).catch(()=>{throw Error('편집기 연결이 끊겼어요. 편집기가 열려 있는지 확인하세요.');});
  const body=await response.json();if(!body.ok)throw Error(body.error||'편집기 명령 실패');return body.value;
}
// Scene edits need the document's current revision; fetch it so the AI never has to.
const sceneEdit=async(path,edit)=>{const doc=await callEditor('document.open',{path});return callEditor('scene.edit',{...edit,path,expectedRevision:doc.revision});};
const summary=doc=>({path:doc.path,kind:doc.kind,revision:doc.revision,dirty:doc.dirty,selection:doc.selection});

const tools=[
  {name:'hbengine_status',description:'Open project, startup scene and open documents of the running HBEngine editor. Call first.',inputSchema:{type:'object',properties:{}},run:async()=>{const scene=await callEditor('scene.hierarchy',{}).catch(()=>null);return {objects:scene?.length??null,commands:(await callEditor('editor.methods',{})).length};}},
  {name:'hbengine_methods',description:'List every editor command name usable with hbengine_call.',inputSchema:{type:'object',properties:{}},run:()=>callEditor('editor.methods',{})},
  {name:'hbengine_call',description:'Run any editor command: {method, params}. Edits need expectedRevision from document.open. Changes appear live in the editor and are undoable there.',inputSchema:{type:'object',properties:{method:{type:'string'},params:{type:'object'}},required:['method']},run:a=>callEditor(a.method,a.params||{})},
  {name:'hbengine_list_assets',description:'List project assets (recursive). Optional query filters by name.',inputSchema:{type:'object',properties:{query:{type:'string'}}},run:async a=>(await callEditor('content.list',{query:a.query||'',recursive:true})).entries.map(e=>({path:e.path,kind:e.kind}))},
  {name:'hbengine_open',description:'Open a document (scene, blueprint, material…) in the editor and return its JSON text.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path']},run:async a=>{const doc=await callEditor('document.open',{path:a.path});return {...summary(doc),text:doc.text};}},
  {name:'hbengine_scene_objects',description:'Objects of a scene (id, name, kind, parent).',inputSchema:{type:'object',properties:{path:{type:'string',description:'Scene path, e.g. Assets/Scenes/Garden.hbscene.json'}},required:['path']},run:async a=>{await callEditor('document.open',{path:a.path});return callEditor('scene.hierarchy',{});}},
  {name:'hbengine_add_object',description:'Add an object to a scene. kind: cube, sphere, cylinder, cone, capsule, plane, empty, light, directionalLight, camera, character, audio, sprite… position [x,y,z].',inputSchema:{type:'object',properties:{path:{type:'string'},kind:{type:'string'},position:{type:'array',items:{type:'number'}}},required:['path','kind']},run:async a=>summary(await sceneEdit(a.path,{action:'add',key:a.kind,...(a.position?{position:a.position}:{})}))},
  {name:'hbengine_edit_object',description:'Edit scene objects with scene.edit: action translate (delta [x,y,z]), rotate (axis 0-2, value radians), scale, rename (value), delete, duplicate, component (key = component type), removeComponent (key = component id), resetTransform, pasteTransform (value {position,rotation,scale}), groupParent (ids), reparent (target).',inputSchema:{type:'object',properties:{path:{type:'string'},action:{type:'string'},id:{type:'string'},ids:{type:'array',items:{type:'string'}},key:{type:'string'},value:{},delta:{type:'array',items:{type:'number'}},axis:{type:'number'},target:{type:'string'}},required:['path','action']},run:async a=>{const {path,...edit}=a;return summary(await sceneEdit(path,edit));}},
  {name:'hbengine_set_property',description:'Set one field with asset.fieldEdit. parts is the JSON path inside the document, e.g. ["objects","2","components","1","properties"] with key "intensity".',inputSchema:{type:'object',properties:{path:{type:'string'},parts:{type:'array',items:{type:'string'}},key:{type:'string'},value:{}},required:['path','key','value']},run:async a=>{const doc=await callEditor('document.open',{path:a.path});return summary(await callEditor('asset.fieldEdit',{path:a.path,parts:a.parts||[],key:a.key,value:a.value,expectedRevision:doc.revision}));}},
  {name:'hbengine_create_asset',description:'Create an asset: kind (blueprint, material, prefab, scene, widget, …), folder (e.g. Assets/Blueprints), name.',inputSchema:{type:'object',properties:{kind:{type:'string'},folder:{type:'string'},name:{type:'string'}},required:['kind','folder','name']},run:a=>callEditor('content.create',{kind:a.kind,folder:a.folder,name:a.name})},
  {name:'hbengine_save',description:'Save every changed open document.',inputSchema:{type:'object',properties:{}},run:()=>callEditor('document.saveAll',{})},
];

const reply=(id,result,error)=>process.stdout.write(JSON.stringify(error?{jsonrpc:'2.0',id,error}:{jsonrpc:'2.0',id,result})+'\n');
async function handle(message){
  const {id,method,params}=message;
  if(method==='initialize')return reply(id,{protocolVersion:params?.protocolVersion||'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'hbengine',version:'0.1.0'},instructions:'HBEngine editor tools. Edits show up live in the open editor and can be undone there (Ctrl+Z). Use hbengine_status first, pass explicit scene paths, and save with hbengine_save when the user wants the changes kept.'});
  if(method==='ping')return reply(id,{});
  if(method==='tools/list')return reply(id,{tools:tools.map(({run,...t})=>t)});
  if(method==='tools/call'){const tool=tools.find(t=>t.name===params?.name);if(!tool)return reply(id,null,{code:-32602,message:'unknown tool'});
    try{const value=await tool.run(params.arguments||{});return reply(id,{content:[{type:'text',text:JSON.stringify(value,null,1).slice(0,200000)}]});}
    catch(error){return reply(id,{content:[{type:'text',text:error.message}],isError:true});}}
  if(id!==undefined&&id!==null)reply(id,null,{code:-32601,message:'method not found'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){if(!line.trim())continue;let message;try{message=JSON.parse(line);}catch{continue;}await handle(message);}
}
export {tools,handle};
