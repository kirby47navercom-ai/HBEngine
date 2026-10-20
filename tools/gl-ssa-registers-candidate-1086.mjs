// Private generated-source experiment. Never accepts authored shader programs.
export function raySSARegisters1086(source){
 const pattern=/\bvec4 (hbRay(?:Previous)?Program(?:Alpha)?\d+)\([^{};]*\)\{/g,edits=[];let match,functions=0,assignments=0,initializers=0;
 while((match=pattern.exec(source))){
  const open=pattern.lastIndex-1;let depth=1,end=open+1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}if(depth)throw Error('Unclosed generated program');
  let body=source.slice(open+1,end-1);const physical=new Set();body=body.replace(/vec4 (r(?:[XY])?\d+)=vec4\(0,0,0,0\);/g,(_,name)=>{physical.add(name);initializers++;return '';});if(!physical.size){pattern.lastIndex=end;continue;}
  const current=new Map(),versions=new Map(),names=[];
  body=body.replace(/\br(?:[XY])?\d+\b/g,(name,at,text)=>{
   if(!physical.has(name))throw Error('Unexpected generated register '+name);
   if(/^\s*=(?!=)/.test(text.slice(at+name.length))){const version=versions.get(name)||0,next=version?name+'_s'+version:name;versions.set(name,version+1);current.set(name,next);names.push(next);assignments++;return next;}
   return current.get(name)||'vec4(0,0,0,0)';
  });
  edits.push({start:open+1,end:end-1,text:'vec4 '+names.join(',')+';'+body});functions++;pattern.lastIndex=end;
 }
 let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);return{source:result,functions,assignments,initializers,bytesBefore:source.length,bytesAfter:result.length};
}
