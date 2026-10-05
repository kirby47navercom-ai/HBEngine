import {validValue} from './blueprint-model.js';
import {nativeTargetPin} from './native-model.js';

export function nativeBindings(objects,builds,bindings,request,metadata){
  if(request?.command||metadata?.nativeModuleQueries!==1)return undefined;
  return objects.filter(o=>o.nativeClass&&builds.has(o.blueprintAsset)).map(o=>({id:o.id,token:builds.get(o.blueprintAsset).token,className:o.nativeClass,properties:o.nativeProperties||{},overrides:bindings.find(b=>b.self===o.id)?.root.nodes.filter(n=>n.key==='nativeEvent').map(n=>n.nativeId)||[]}));
}
export function validateNativeBindings(request,resolve){
  const rows=request.nativeBindings;if(rows===undefined)return;
  if(!Array.isArray(rows)||rows.length>2000||new Set(rows.map(r=>r?.id)).size!==rows.length)throw Error('C++ 모듈 바인딩 범위 오류');
  for(const row of rows){const module=resolve(row?.token),c=module?.metadata.classes.find(c=>c.name===row.className);if(!c||!request.objects.some(o=>o.id===row.id)||!row.properties||typeof row.properties!=='object'||Array.isArray(row.properties)||Object.keys(row).some(k=>!['id','token','className','properties','overrides'].includes(k)))throw Error('C++ 모듈 바인딩 오류');
    for(const [name,value] of Object.entries(row.properties)){const p=c.properties.find(p=>p.name===name);if(!p||!(p.array?Array.isArray(value)&&value.length<=100000&&value.every(v=>validValue(p.type,v)):validValue(p.type,value)))throw Error('C++ 모듈 속성 오류: '+name);}
    if(!Array.isArray(row.overrides)||row.overrides.length>500||row.overrides.some(id=>!c.functions.some(f=>f.event!=='none'&&row.className+'.'+f.name===id)))throw Error('C++ 모듈 이벤트 오류');
  }
}
export function nativeModuleWorld(objects,rows,token){
  return objects.map(o=>{const {nativeClass,nativeProperties,...base}=o,row=rows?.find(r=>r.id===o.id&&r.token===token);return row?{...base,nativeClass:row.className,nativeProperties:row.properties}:base;});
}
export function nativeModuleRequest(request,query,resolve){
  const args=query.args,row=request.nativeBindings?.find(r=>r.id===args?.target),module=row&&resolve(row.token),c=module?.metadata.classes.find(c=>c.name===row.className);
  if(!c||!['getFloat','setFloat','call'].includes(args.operation)||typeof args.member!=='string'||!args.member||args.member.length>80)throw Error('C++ 모듈 대상 또는 작업 오류');
  const p=c.properties.find(p=>p.name===args.member),f=c.functions.find(f=>f.name===args.member),call={nativeId:row.className+'.'+args.member,self:row.id,scope:query.scope||'',overrides:row.overrides};
  if(args.operation==='call'){if(!f||!args.arguments||typeof args.arguments!=='object'||Array.isArray(args.arguments))throw Error('C++ 모듈 함수 오류');call.key='nativeCall';call.args={...args.arguments,...(!f.static?{[nativeTargetPin(f)]:row.id}:{})};}
  else{if(!p||p.array||!['float','int'].includes(p.type)||args.operation==='setFloat'&&p.readOnly)throw Error('C++ 모듈 숫자 속성 오류');call.key=args.operation==='getFloat'?'nativeGet':'nativeSet';call.args={target:row.id,...(call.key==='nativeSet'?{value:args.value}:{})};}
  const rows=request.nativeBindings.map(r=>{const state=query.objects.find(o=>o.id===r.id);return state?.nativeClass===r.className?{...r,properties:state.nativeProperties||r.properties}:r;});
  return {token:row.token,call,request:{...call,input:request.input,scopes:request.scopes,nativeBindings:rows,objects:nativeModuleWorld(query.objects,rows,row.token)}};
}
// Foreign calls have already passed their owning module's typed protocol check.
// Merge their effects at the caller's real execution boundary, retaining ownership.
export function mergeNativeReply(result,self){
  const objects=[],events=[],operations=[];const walk=(reply,owner)=>{for(const foreign of reply.foreign||[])walk(foreign.result,foreign.call.self);objects.push(...reply.objects||[]);events.push(...reply.events||[]);operations.push(...(reply.operations||[]).map(o=>({...o,self:o.self||owner})));};walk(result,self);return {...result,objects,events,operations};
}
