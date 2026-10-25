import fs from 'node:fs/promises';
import {readEngineStatus} from './engine-status.mjs';
import {pathToFileURL} from 'node:url';

export async function engineRequest(base,route,data){const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'X-HB-Editor':'1','Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
export function schemaSection(schema,section){
  if(section===undefined)return schema;
  if(typeof section!=='string'||!section||section.length>160)throw Error('스키마 section 경로를 확인하세요.');
  let value=schema;for(const key of section.split('.')){if(!key||['__proto__','prototype','constructor'].includes(key)||!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('스키마 항목 없음: '+section);value=value[key];}return {section,value};
}
export async function editorCommand(base,method,params={},options={}){
  const state=await engineRequest(base,'/api/automation'),clientId=options.clientId||(state.clients.length===1?state.clients[0].id:null);if(!clientId)throw Error('편집기를 열거나 --client ID로 대상 창을 지정하세요.');
  let command=await engineRequest(base,'/api/automation/command',{clientId,method,params,requestId:options.requestId||crypto.randomUUID()}),deadline=Date.now()+(options.timeout||120000);
  while(!['done','error'].includes(command.status)){if(Date.now()>deadline)throw Error('명령 대기 시간 초과: '+command.id);await new Promise(resolve=>setTimeout(resolve,250));command=await engineRequest(base,'/api/automation/command?id='+command.id);}
  if(command.error)throw Object.assign(Error(command.error.message),{code:command.error.code});return command.result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{
  if(process.argv[2]==='context'){const {engineContext,contextArgs}=await import('./ai-context.mjs');console.log(JSON.stringify(await engineContext(contextArgs(process.argv.slice(3))),null,2));}else{
  const sectionIndex=process.argv.indexOf('--section');if(sectionIndex>=0&&(!process.argv[sectionIndex+1]||process.argv[sectionIndex+1].startsWith('--')))throw Error('--section 경로가 필요해요.');
  const args=process.argv.slice(2),take=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args.splice(index,2)[1];},base=take('--url','http://127.0.0.1:5173'),clientId=take('--client'),section=take('--section'),localIndex=args.indexOf('--local'),local=localIndex>=0;if(local)args.splice(localIndex,1);const [method='help',input]=args;
  if(section!==undefined&&method!=='schema')throw Error('--section은 schema에 사용하세요.');
  const params=input?JSON.parse(input.startsWith('@')?await fs.readFile(input.slice(1),'utf8'):input):{};
  const output=method==='patch.create'?await (await import('./content-patch.mjs')).createContentPatch(params.before,params.after,{privateKey:params.privateKey?await fs.readFile(params.privateKey):undefined}):method==='patch.apply'?await (await import('./content-patch.mjs')).applyContentPatch(params.root,JSON.parse(await fs.readFile(params.patch,'utf8')),{publicKey:params.publicKey?await fs.readFile(params.publicKey):undefined,requireSignature:params.requireSignature??!!params.publicKey}):method==='patch.recover'?await (await import('./content-patch.mjs')).recoverContentPatches(params.root):method==='help'?{usage:'node tools/hb.mjs context [작업명] [--symbol 이름] [--compact] | status [--local] | schema [--section 경로] | clients | editor.state | document.get | document.patch @params.json [--url URL] [--client ID]',start:'docs/AI_START.md',details:'docs/AI_ENGINE_API.md'}:method==='status'?(local?await readEngineStatus(params):await engineRequest(base,'/api/engine/status?'+new URLSearchParams(params))):method==='schema'?schemaSection(await engineRequest(base,'/api/schema'),section):method==='clients'?await engineRequest(base,'/api/automation'):await editorCommand(base,method,params,{clientId});if(method==='patch.create'&&params.out){await fs.writeFile(params.out,JSON.stringify(output));console.log(JSON.stringify({ok:true,path:params.out,changed:output.changes.length,removed:output.removed.length,signed:!!output.signature}));}else console.log(JSON.stringify(output,null,2));
  }
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code||'REQUEST_FAILED'}));process.exitCode=1;}}
