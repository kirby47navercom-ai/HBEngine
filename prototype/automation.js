import {validAsset,assetValidationError} from './asset-documents.js';

export async function documentRevision(data){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)));return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
export function patchAsset(kind,data,operations){
  if(!Array.isArray(operations)||!operations.length||operations.length>1000)throw Error('패치는 1~1000개 작업이어야 해요.');let result=structuredClone(data);
  for(const operation of operations){
    if(!operation||!['test','add','replace','remove'].includes(operation.op)||typeof operation.path!=='string'||operation.path.length>2000)throw Error('패치 형식 오류');
    const parts=operation.path===''?[]:operation.path.startsWith('/')?operation.path.slice(1).split('/').map(part=>{if(/~(?![01])/u.test(part))throw Error('JSON Pointer 이스케이프 오류');return part.replaceAll('~1','/').replaceAll('~0','~');}):null;
    if(!parts||parts.some(part=>['__proto__','prototype','constructor'].includes(part)))throw Error('패치 경로 오류');
    let parent={root:result};const keys=parts.length?parts:['root'];if(parts.length)parent=result;
    for(const key of keys.slice(0,-1)){if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('패치 대상 없음: '+operation.path);parent=parent[key];}
    const key=keys.at(-1);if(!parent||typeof parent!=='object')throw Error('패치 대상이 객체가 아니에요.');
    const array=Array.isArray(parent),index=array?(key==='-'&&operation.op==='add'?parent.length:/^(0|[1-9]\d*)$/.test(key)?Number(key):-1):key,exists=array?index>=0&&index<parent.length:Object.hasOwn(parent,key);
    if(array&&(index<0||index>parent.length)||operation.op!=='add'&&!exists)throw Error('패치 대상 없음: '+operation.path);
    if(operation.op==='test'){if(JSON.stringify(parent[index])!==JSON.stringify(operation.value))throw Error('패치 전제조건 불일치: '+operation.path);continue;}
    if(operation.op==='remove'){if(array)parent.splice(index,1);else delete parent[index];}
    else{if(!Object.hasOwn(operation,'value'))throw Error('패치 값이 없어요.');const value=structuredClone(operation.value);if(array&&operation.op==='add')parent.splice(index,0,value);else parent[index]=value;}
    if(!parts.length)result=parent.root;
  }
  if(!validAsset(kind,result))throw Error('패치 결과가 에셋 규칙에 맞지 않아요. '+assetValidationError(kind,result));return result;
}

// Commands call the same editor functions as human actions; DOM simulation is unnecessary.
export function connectAutomation({request,state,methods}){
  const clientId=crypto.randomUUID();let results=[],stopped=false,timer;
  async function poll(){try{const sent=results;const response=await(await request('/api/automation/poll',{method:'POST',body:JSON.stringify({clientId,state:state(),results:sent})})).json();results=results.filter(result=>!sent.includes(result));for(const command of response.commands){try{const method=methods[command.method];if(!method)throw Error('지원하지 않는 편집기 명령');results.push({id:command.id,result:await method(command.params||{})});}catch(error){results.push({id:command.id,error:{message:error.message,code:error.code||'COMMAND_FAILED'}});}}}catch{}finally{if(!stopped)timer=setTimeout(poll,500);}}
  poll();return ()=>{stopped=true;clearTimeout(timer);};
}
