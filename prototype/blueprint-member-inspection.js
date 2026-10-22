import {blueprintAccess,blueprintMemberOwner,blueprintClassKey,blueprintMemberVisible,blueprintOverrideAllowed} from './blueprint-access.js';
const kinds=['functions','macros','variables'];
const ports=items=>(items||[]).map(p=>({id:p.id,label:p.label,type:p.type,array:!!p.array,...p.structName?{structName:p.structName}:{},...p.enumName?{enumName:p.enumName}:{}}));
// No graph bodies, variable values, defaults or retained per-document index.
export function inspectBlueprintMembers(root,{kind='all',offset=0,limit=32,query=''}={}){
  if(kind!=='all'&&!kinds.includes(kind))throw Error('멤버 종류는 all/functions/macros/variables 중 하나예요.');
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>128||typeof query!=='string'||query.length>200)throw Error('조회 범위는 offset 0 이상, limit 1–128이에요.');
  const text=query.normalize('NFKC').toLowerCase(),items=[];
  for(const group of kind==='all'?kinds:[kind])for(const member of root[group]||[]){
    if(member.parentImplementation||text&&!String(member.name).normalize('NFKC').toLowerCase().includes(text))continue;
    const owner=blueprintMemberOwner(root,member,group),current=blueprintClassKey(root),visible=blueprintMemberVisible(root,member,group);
    items.push({kind:group,id:member.id,name:member.name,access:blueprintAccess(member,group),owner:typeof owner==='string'?owner:'current',inherited:owner!==current,callable:visible,editable:!root.inheritance?.inherited?.[group]?.includes(member.id),...group==='variables'?{type:member.type,array:member.container==='array',...member.structName?{structName:member.structName}:{},...member.enumName?{enumName:member.enumName}:{}}:{pure:!!member.pure,overrideAllowed:group==='functions'&&blueprintOverrideAllowed(root,member),inputs:ports(member.inputs),outputs:ports(member.outputs)}});
  }
  return {readOnly:true,count:items.length,offset,limit,nextOffset:offset+limit<items.length?offset+limit:null,members:items.slice(offset,offset+limit)};
}
