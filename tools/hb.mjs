import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export async function engineRequest(base,route,data){const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'X-HB-Editor':'1','Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
export async function editorCommand(base,method,params={},options={}){
  const state=await engineRequest(base,'/api/automation'),clientId=options.clientId||(state.clients.length===1?state.clients[0].id:null);if(!clientId)throw Error('편집기를 열거나 --client ID로 대상 창을 지정하세요.');
  let command=await engineRequest(base,'/api/automation/command',{clientId,method,params,requestId:options.requestId||crypto.randomUUID()}),deadline=Date.now()+(options.timeout||120000);
  while(!['done','error'].includes(command.status)){if(Date.now()>deadline)throw Error('명령 대기 시간 초과: '+command.id);await new Promise(resolve=>setTimeout(resolve,250));command=await engineRequest(base,'/api/automation/command?id='+command.id);}
  if(command.error)throw Object.assign(Error(command.error.message),{code:command.error.code});return command.result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{
  const args=process.argv.slice(2),take=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args.splice(index,2)[1];},base=take('--url','http://127.0.0.1:5173'),clientId=take('--client'),[method='help',input]=args;
  const params=input?JSON.parse(input.startsWith('@')?await fs.readFile(input.slice(1),'utf8'):input):{};
  const output=method==='help'?{usage:'node tools/hb.mjs schema | clients | editor.state | document.get | document.patch @params.json [--url URL] [--client ID]',details:'docs/AI_ENGINE_API.md'}:method==='schema'?await engineRequest(base,'/api/schema'):method==='clients'?await engineRequest(base,'/api/automation'):await editorCommand(base,method,params,{clientId});console.log(JSON.stringify(output,null,2));
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code||'REQUEST_FAILED'}));process.exitCode=1;}}
