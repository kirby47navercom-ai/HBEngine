// Shared browser/server byte budgets. Serialize a finished result once; drain
// FIFO batches without retaining a second copy of its original object graph.
export const automationPollLimits={bodyBytes:16*1024*1024,resultBytes:14*1024*1024,stateBytes:1024*1024,results:50};
const encoder=new TextEncoder(),bytes=text=>encoder.encode(text).byteLength;
export function encodeAutomationResult(packet){
  let json=JSON.stringify(packet),size=bytes(json);
  if(size>automationPollLimits.resultBytes){json=JSON.stringify({id:packet.id,error:{code:'RESULT_TOO_LARGE',message:'응답이 14MiB를 넘었어요. 시퀀스 키는 sequence.keys.read의 offset/limit으로 나누어 조회하세요.'}});size=bytes(json);}
  return {json,bytes:size};
}
export function automationPollBody(clientId,state,pending){
  let header=JSON.stringify({clientId,state});
  if(bytes(header)>automationPollLimits.stateBytes)header=JSON.stringify({clientId,state:{projectId:state?.projectId,error:{code:'STATE_TOO_LARGE',message:'자동화 상태 요약이 1MiB를 넘었어요.'}}});
  const prefix=header.slice(0,-1)+',"results":[',suffix=']}',sent=[];let size=bytes(prefix)+bytes(suffix);
  for(const entry of pending){const next=size+entry.bytes+(sent.length?1:0);if(sent.length===automationPollLimits.results||next>automationPollLimits.bodyBytes)break;sent.push(entry);size=next;}
  return {body:prefix+sent.map(r=>r.json).join(',')+suffix,sent,bytes:size};
}
