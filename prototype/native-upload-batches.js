const packetLimit=128*1024*1024-4096;
const utf8Bytes=text=>typeof Buffer!=='undefined'?Buffer.byteLength(text):new TextEncoder().encode(text).length;

// Preserve resource order and the host's existing 128 MiB packet boundary.
// The native runner can write this exact JSON without serializing assets twice.
export function* nativeUploadBatches(resources,budget=4*1024*1024){
 if(!Array.isArray(resources)||!Number.isSafeInteger(budget)||budget<2||budget>packetLimit)throw Error('DirectX 업로드 묶음 한도를 확인하세요.');
 let data=[],parts=[],bytes=2;
 for(const resource of resources){
  if(!resource||typeof resource!=='object'||Array.isArray(resource))throw Error('DirectX 업로드 자원 형식을 확인하세요.');
  const text=JSON.stringify(resource),size=utf8Bytes(text);if(size+2>packetLimit)throw Error('DirectX 개별 자원이 전송 한도를 넘었어요. 분할 업로드가 필요해요.');
  if(data.length&&bytes+size+1>budget){yield {data,json:'['+parts.join(',')+']',bytes};data=[];parts=[];bytes=2;}
  if(data.length)bytes++;data.push(resource);parts.push(text);bytes+=size;
 }
 if(data.length)yield {data,json:'['+parts.join(',')+']',bytes};
}
