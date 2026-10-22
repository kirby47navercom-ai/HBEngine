import {blueprintInstanceRecordSites} from './record-value-sites.js';
import {nativeRecordDefinition} from './native-records.js';

const at=(value,path)=>path.reduce((v,key)=>Array.isArray(v)&&typeof key==='string'?v.find(x=>x?.id===key):v?.[key],value);
const prefix=(a,b)=>a.length<=b.length&&a.every((key,i)=>key===b[i]);
function childPin(metadata,pin,path){
 for(const key of path){
  if(pin.array||pin.container==='array'){pin={...pin,array:false,container:'single'};continue;}
  if(pin.type!=='record')return null;
  pin=nativeRecordDefinition(metadata,pin)?.fields.find(f=>f.name===key);if(!pin)throw Error('구조체 오버라이드 멤버가 없어요: '+key);
 }
 return pin;
}

// Variant/conflict patches retain their authored paths, including stable array
// IDs. Resolve the owner only to locate declarations, never flatten the prefab.
export function migrateRecordOverrideValue(owner,schema,path,value,migrate){
 const sites=blueprintInstanceRecordSites(owner,schema);let next=value;
 for(const site of sites){
  if(prefix(path,site.path)){
   const tail=site.path.slice(path.length),current=at(next,tail);if(current===undefined)continue;
   const changed=migrate(site.pin,current);if(changed===current)continue;
   if(!tail.length){next=changed;continue;}
   if(next===value)next=structuredClone(value);const target=at(next,tail.slice(0,-1)),key=tail.at(-1);
   Object.defineProperty(target,key,{value:changed,writable:true,enumerable:true,configurable:true});
  }else if(prefix(site.path,path)){
   const pin=childPin(schema.native,site.pin,path.slice(site.path.length));if(pin?.type==='record')next=migrate(pin,next);
  }
 }
 return next;
}
