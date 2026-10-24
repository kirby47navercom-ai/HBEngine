// Only reflected, parsed defaults cross the wire; never evaluate C++ text.
export function nativeInputDefaults(metadata,request){
  if(!request||typeof request!=='object')return request;
  const callDefaults=call=>{
    if(call?.key!=='nativeCall'||!call.args||typeof call.args!=='object'||Array.isArray(call.args))return call;
    const [owner,name]=String(call.nativeId).split('.'),fn=metadata.classes.find(c=>c.name===owner)?.functions.find(f=>f.name===name);let args;
    for(const pin of fn?.inputs||[])if(!Object.hasOwn(call.args,pin.id)&&Object.hasOwn(pin,'default')&&pin.default!==undefined){args??={...call.args};Object.defineProperty(args,pin.id,{value:structuredClone(pin.default),writable:true,enumerable:true,configurable:true});}
    return args?{...call,args}:call;
  };
  if(request.calls===undefined)return callDefaults(request);
  if(!Array.isArray(request.calls)||!request.calls.length||request.calls.length>1000)return request;
  const calls=request.calls.map(callDefaults);return calls.some((call,i)=>call!==request.calls[i])?{...request,calls}:request;
}
export const nativeInputDefaultsContract={missing:'A missing own input uses only its already parsed reflected default; the regular type, enum, record and actor-reference validation still runs before dispatch.',explicit:'An explicit null, undefined, false, zero or empty string is never replaced. Required inputs, nativeSet values and receiver pins stay required.',ownership:'Copy only changed packets and args; deep-copy each inserted default per call. No mutation of caller requests or shared metadata.',scope:'Same NativeProtocol decoding for desktop and mobile/AOT; unsupported C++ expressions still require an explicit value. No C++ text evaluation.'};
