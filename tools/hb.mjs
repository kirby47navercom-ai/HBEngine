import {readSchemaSection,schemaSectionKeys} from './schema-sections.mjs';
import fs from 'node:fs/promises';
import {readEngineStatus} from './engine-status.mjs';
import {pathToFileURL} from 'node:url';

export async function engineRequest(base,route,data){const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'X-HB-Editor':'1','Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
export function schemaSection(schema,section){return readSchemaSection(schema,section);}
export async function requestEngineSchema(base,{section,list=false,local=false}={}){
 if(section!==undefined)schemaSectionKeys(section);if(list&&section!==undefined)throw Error('--list와 --section은 함께 사용할 수 없어요.');
 if(local){const {engineSchema}=await import('./editor-automation.mjs');return engineSchema(list?{list:true}:section===undefined?undefined:{section});}
 const query=new URLSearchParams(list?{list:'1'}:section===undefined?{}:{section}),result=await engineRequest(base,'/api/schema'+(query.size?'?'+query:''));
 if(list)return result.valuesOmitted===true&&Array.isArray(result.sections)?result:{sections:Object.keys(result),valuesOmitted:true,readOnly:true};
 return section===undefined?result:result.section===section?result:schemaSection(result,section);
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
  const args=process.argv.slice(2),take=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args.splice(index,2)[1];},base=take('--url','http://127.0.0.1:5173'),clientId=take('--client'),section=take('--section'),localIndex=args.indexOf('--local'),local=localIndex>=0;if(local)args.splice(localIndex,1);const listIndex=args.indexOf('--list'),list=listIndex>=0;if(list)args.splice(listIndex,1);const [method='help',input]=args;
  if(list&&method!=='schema')throw Error('--list는 schema에 사용하세요.');if(list&&section!==undefined)throw Error('--list와 --section은 함께 사용할 수 없어요.');
  if(section!==undefined&&method!=='schema')throw Error('--section은 schema에 사용하세요.');
  const params=input?JSON.parse(input.startsWith('@')?await fs.readFile(input.slice(1),'utf8'):input):{};
  const output=method==='patch.create'?await (await import('./content-patch.mjs')).createContentPatch(params.before,params.after,{privateKey:params.privateKey?await fs.readFile(params.privateKey):undefined}):method==='patch.apply'?await (await import('./content-patch.mjs')).applyContentPatch(params.root,JSON.parse(await fs.readFile(params.patch,'utf8')),{publicKey:params.publicKey?await fs.readFile(params.publicKey):undefined,requireSignature:params.requireSignature??!!params.publicKey}):method==='patch.recover'?await (await import('./content-patch.mjs')).recoverContentPatches(params.root):method==='help'?{usage:'node tools/hb.mjs context [작업명] [--symbol 이름] [--compact] | status [--local] | schema [--section 경로 | --list] [--local] | clients | editor.state | document.get | document.patch @params.json [--url URL] [--client ID]',start:'docs/AI_START.md',details:'docs/AI_ENGINE_API.md'}:method==='status'?(local?await readEngineStatus(params):await engineRequest(base,'/api/engine/status?'+new URLSearchParams(params))):method==='schema'?await requestEngineSchema(base,{section,list,local}):method==='clients'?await engineRequest(base,'/api/automation'):await editorCommand(base,method,params,{clientId});if(method==='patch.create'&&params.out){await fs.writeFile(params.out,JSON.stringify(output));console.log(JSON.stringify({ok:true,path:params.out,changed:output.changes.length,removed:output.removed.length,signed:!!output.signature}));}else console.log(JSON.stringify(output,null,2));
  }
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code||'REQUEST_FAILED'}));process.exitCode=1;}}
