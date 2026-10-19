// Research candidate only, never used by the production renderer. Wrappers keep their own
// geometry/UV/normal preparation. Share only byte-identical generated IR bodies.
// Public field/program signatures and material packet addressing stay unchanged.
const contextTypes={uv:'vec2',uvX:'vec2',uvY:'vec2',normal:'vec3',normalX:'vec3',normalY:'vec3',pointX:'vec3',pointY:'vec3'};
function generatedFunction(source,name){
 const token='vec4 '+name+'(',start=source.indexOf(token);if(start<0)return null;const open=source.indexOf('{',start),args=source.slice(start+token.length,open-1);if(source[open-1]!==')')return null;let depth=1,end=open+1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}if(depth)throw Error('생성된 광선 함수가 닫히지 않았어요.');
 const text=source.slice(open+1,end-1),registers=text.match(/^(?:vec4 r(?:[XY])?\d+=vec4\(0,0,0,0\);)*/)?.[0]||'',instruction=text.indexOf('{vec4 value=hbGeometryLoad(pointer+');if(instruction<registers.length)return null;const context=text.slice(registers.length,instruction),body=text.slice(instruction);if(!body.endsWith('return result;'))return null;return {name,start,end,args,registers,context,body,variables:Object.keys(contextTypes).filter(key=>new RegExp('\\b'+key+'\\b').test(context))};
}
export function shareGLRayContextBodies(source){
 const keys=[...source.matchAll(/vec4 hbRayProgram(\d+)\(/g)].map(m=>m[1]),edits=[];let shared=0,savedBodyBytes=0;
 for(const key of new Set(keys)){const now=generatedFunction(source,'hbRayProgram'+key),old=generatedFunction(source,'hbRayPreviousProgram'+key);if(!now||!old||now.args!==old.args||now.registers!==old.registers||now.body!==old.body||now.variables.join()!==old.variables.join())continue;const bodyName=now.name+'ContextBody',extra=now.variables.map(v=>contextTypes[v]+' '+v),params=now.args+(extra.length?','+extra.join(','):''),args=now.args.split(',').map(arg=>arg.trim().split(/\s+/).at(-1)).concat(now.variables).join(','),wrapper=f=>'vec4 '+f.name+'('+f.args+'){'+f.context+'return '+bodyName+'('+args+');}',body='vec4 '+bodyName+'('+params+'){'+now.registers+now.body+'}\n';edits.push({start:now.start,end:now.end,text:body+wrapper(now)},{start:old.start,end:old.end,text:wrapper(old)});shared++;savedBodyBytes+=old.registers.length+old.body.length;}
 let result=source;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);return {source:result,shared,savedBodyBytes,sourceBytesBefore:source.length,sourceBytesAfter:result.length};
}
