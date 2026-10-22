import {allGraphContexts,basePins,effectivePins} from './blueprint-model.js';
import {blueprintOverridePin} from './blueprint-overrides.js';

const own=(object,key)=>!!object&&Object.hasOwn(object,key);
const at=(data,path)=>path.reduce((value,key)=>value[key],data);
function applySites(data,sites,migrate){
 const edits=[];for(const site of sites){const {path,pin}=site,value=at(data,path),next=migrate(pin,value,site);if(next!==value)edits.push({path,value:next});}if(!edits.length)return {data,values:0};const result=structuredClone(data);for(const {path,value}of edits){const target=at(result,path.slice(0,-1));Object.defineProperty(target,path.at(-1),{value,writable:true,enumerable:true,configurable:true});}return {data:result,values:edits.length};
}

// Locations come from declarations and actual pin descriptors, never from the
// shape of arbitrary JSON. Hidden base and expanded split pins are both kept.
export function migrateBlueprintRecordValues(data,schema,migrate){
 const sites=[],append=(path,pin)=>{if(pin?.type==='record')sites.push({path,pin});},defs=(key)=>{for(const [i,d]of (data[key]||[]).entries())for(const direction of ['inputs','outputs'])for(const [p,definition]of (d[direction]||[]).entries())if(own(definition,'default'))append([key,i,direction,p,'default'],definition);};
 for(const [i,v]of (data.variables||[]).entries())if(own(v,'value'))append(['variables',i,'value'],v);
 for(const kind of ['functions','macros','dispatchers','interfaces'])defs(kind);
 for(const [id]of Object.entries(data.settings?.variableDefaults||{})){const definition=schema.variables.find(v=>v.id===id);if(definition)append(['settings','variableDefaults',id],definition);}
 for(const [id]of Object.entries(data.settings?.nativeDefaults||{})){const [className,name]=id.split('.'),definition=schema.native?.classes?.find(c=>c.name===className)?.properties.find(p=>p.name===name);if(definition)append(['settings','nativeDefaults',id],definition);}
 const contexts=allGraphContexts(data),schemaContexts=allGraphContexts(schema);
 for(let i=0;i<contexts.length;i++){const graph=contexts[i],prefix=i===0?[]:graph.nodes===data.construction?.nodes?['construction']:null;let path=prefix;if(path===null){for(const kind of ['functions','macros']){const index=(data[kind]||[]).findIndex(d=>d.graph?.nodes===graph.nodes);if(index>=0)path=[kind,index,'graph'];}}if(path===null)throw Error('타입 값 그래프의 소유 문서를 확인하세요.');const shape={...(schemaContexts.find(g=>g.nodes===graph.nodes)||schema),nodes:graph.nodes,edges:graph.edges};for(const [n,node]of graph.nodes.entries()){const pins=new Map([...basePins(node,'in',shape),...effectivePins(node,'in',shape)].map(p=>[p.id,p]));for(const key of Object.keys(node.inputValues||{})){const pin=pins.get(key);if(pin)append([...path,'nodes',n,'inputValues',key],pin);}}}
 return applySites(data,sites,migrate);
}
export function blueprintInstanceRecordSites(object,schema){
 const sites=[],append=(path,key,namespace)=>{const pin=blueprintOverridePin(schema,key,namespace);if(pin?.type==='record')sites.push({path,pin});};
 if(schema.native?.classes?.some(c=>c.name===schema.settings?.parentClass))for(const key of Object.keys(object.nativeProperties||{}))append(['nativeProperties',key],key,'nativeProperties');
 const values=object.overrides||{};for(const namespace of ['variables','nativeProperties'])for(const key of Object.keys(values[namespace]||{}))append(['overrides',namespace,key],key,namespace);
 for(const key of Object.keys(values))if(!['variables','nativeProperties','components'].includes(key))append(['overrides',key],key);
 return sites;
}
export function migrateBlueprintInstanceRecords(object,schema,migrate){return applySites(object,blueprintInstanceRecordSites(object,schema),migrate);}
export function migrateSequenceRecordValues(data,migrationFor){
 const sites=[];for(const [i,track]of (data.tracks||[]).entries())if(['variable','nativeProperty'].includes(track.type)&&track.valueType==='record')for(const [k,key]of track.keys.entries())sites.push({path:['tracks',i,'keys',k,'value'],pin:{type:'record',structName:track.structName,array:track.array},track});
 return applySites(data,sites,(pin,value,site)=>migrationFor(pin,value,site.track));
}
