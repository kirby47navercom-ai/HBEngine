const page=(offset,limit)=>{if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>128)throw Error('클래스 조회 범위는1–128이에요.');};
const pin=p=>Object.fromEntries(['id','label','type','array','className','structName','enumName','maskEnumName','readOnly'].filter(key=>p[key]!==undefined).map(key=>[key,p[key]]));
const summary=c=>({name:c.name,cppName:c.cppName||c.name,cppNamespace:[...(c.cppNamespace||[])],base:c.base,blueprintable:c.blueprintable,properties:c.properties.length,functions:c.functions.length});
export function inspectNativeClasses(metadata,{name,kind='all',offset=0,limit=32}={}){
 page(offset,limit);if(!['all','property','function'].includes(kind)||name!==undefined&&typeof name!=='string')throw Error('클래스·멤버 종류를 확인하세요.');const classes=metadata?.classes||[];
 if(name===undefined)return {readOnly:true,count:classes.length,offset,classes:classes.slice(offset,offset+limit).map(summary)};
 const c=classes.find(c=>c.name===name||c.cppName===name);if(!c)throw Error('C++ 클래스 선언이 없어요.');
 const properties=kind==='function'?[]:c.properties,functions=kind==='property'?[]:c.functions,count=properties.length+functions.length,members=[];
 for(let index=offset;index<Math.min(count,offset+limit);index++){
  if(index<properties.length){const p=properties[index];members.push({kind:'property',name:p.name,cppAccess:p.cppAccess||'public',...pin(p),hasDefault:Object.hasOwn(p,'value')});}
  else{const f=functions[index-properties.length];members.push({kind:'function',name:f.name,label:f.label,category:f.category,cppAccess:f.cppAccess||'public',pure:f.pure,static:f.static,event:f.event,...f.lifecycle?{lifecycle:f.lifecycle}:{},inputs:f.inputs.map(pin),outputs:f.outputs.map(pin)});}
 }
 return {readOnly:true,...summary(c),kind,count,offset,members};
}
