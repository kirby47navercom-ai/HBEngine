// AI bridge end to end: an editor session (as the native editor starts it) opens the bridge; the MCP server lists tools,
// adds an object through it, the change is visible to the editor's own channel and bumps the external revision;
// a wrong token is refused and project switching stays with the editor.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import {createProject} from './project-manifest.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/ai-bridge-'));
const userData=path.join(work,'UserData'),env={...process.env,HB_USER_DATA_DIR:userData};
const lines=child=>{const queue=[],waiters=[];readline.createInterface({input:child.stdout}).on('line',line=>{if(waiters.length)waiters.shift()(line);else queue.push(line);});return ()=>queue.length?Promise.resolve(queue.shift()):new Promise(resolve=>waiters.push(resolve));};
const session=spawn(process.execPath,[path.join(root,'tools/native-editor-session.mjs')],{env,stdio:['pipe','pipe','inherit']}),nextSession=lines(session);
const editor=async(method,params={})=>{session.stdin.write(JSON.stringify({method,params})+'\n');for(;;){const packet=JSON.parse(await nextSession());if(packet.channel)continue;if(!packet.ok)throw Error(packet.error);return packet.value;}};
let mcp;
try{
  process.env.HB_USER_DATA_DIR=userData;const record=await createProject('Bridge',work,'3d');
  await editor('project.open',{file:record.file});const scene=record.manifest.startupScene;const before=JSON.parse((await editor('document.open',{path:scene})).text).objects.length;
  for(let i=0;i<50&&!(await fs.stat(path.join(userData,'ai-bridge.json')).catch(()=>null));i++)await new Promise(r=>setTimeout(r,50));
  const bridge=JSON.parse(await fs.readFile(path.join(userData,'ai-bridge.json'),'utf8'));
  const wrong=await fetch(`http://127.0.0.1:${bridge.port}/rpc`,{method:'POST',headers:{authorization:'Bearer nope'},body:'{"method":"editor.methods"}'});assert.equal(wrong.status,401,'token required');
  const denied=await (await fetch(`http://127.0.0.1:${bridge.port}/rpc`,{method:'POST',headers:{authorization:'Bearer '+bridge.token},body:JSON.stringify({method:'project.open',params:{}})})).json();assert.match(denied.error,/편집기에서 직접/);
  mcp=spawn(process.execPath,[path.join(root,'tools/hb-mcp.mjs'),'--data',userData],{env,stdio:['pipe','pipe','inherit']});const nextMcp=lines(mcp);let id=0;
  const rpc=async(method,params)=>{const ask=++id;mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:ask,method,params})+'\n');for(;;){const m=JSON.parse(await nextMcp());if(m.id===ask)return m;}};
  const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'check',version:'1'}});assert.equal(init.result.serverInfo.name,'hbengine');
  const list=await rpc('tools/list',{});const names=list.result.tools.map(t=>t.name);for(const name of ['hbengine_status','hbengine_add_object','hbengine_call','hbengine_save'])assert.ok(names.includes(name),name);
  const revision0=(await editor('editor.externalRevision')).revision;
  const added=await rpc('tools/call',{name:'hbengine_add_object',arguments:{path:scene,kind:'cube',position:[3,1,0]}});assert.ok(!added.result.isError,added.result.content[0].text);
  const after=JSON.parse((await editor('document.open',{path:scene})).text);assert.equal(after.objects.length,before+1,'object added live');assert.ok(after.objects.some(o=>JSON.stringify(o.position)==='[3,1,0]'));
  assert.ok((await editor('editor.externalRevision')).revision>revision0,'editor sees an external change');
  const bad=await rpc('tools/call',{name:'hbengine_call',arguments:{method:'no.such'}});assert.equal(bad.result.isError,true);
  console.log(JSON.stringify({passed:true,tools:names.length,port:bridge.port}));
}finally{mcp?.kill();session.stdin.end();await new Promise(r=>{session.once('exit',r);setTimeout(r,3000);});session.kill();await fs.rm(work,{recursive:true,force:true}).catch(()=>{});}
