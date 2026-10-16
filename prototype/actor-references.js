import {componentDefinitions} from './scene-components.js';
export const remapActorValue=(value,ids)=>typeof value==='string'?(ids.has(value)?ids.get(value):value):Array.isArray(value)?value.map(v=>remapActorValue(v,ids)):value;
export function remapActorReferences(objects,bindings,ids){
 for(const o of objects){for(const field of ['parent','parentId','owner','controller','pawn','prefabRoot'])if(ids.has(o[field]))o[field]=ids.get(o[field]);if(o.prefabLink)for(const key of Object.keys(o.prefabLink.ids))if(ids.has(o.prefabLink.ids[key]))o.prefabLink.ids[key]=ids.get(o.prefabLink.ids[key]);for(const c of o.components||[])for(const [key,field] of Object.entries(componentDefinitions[c.type]?.properties||{}))if(field.objectReference&&Object.hasOwn(c.properties||{},key))c.properties[key]=remapActorValue(c.properties[key],ids);
  const binding=bindings.find(b=>b.self===o.id),definition=binding?.root.native?.classes.find(c=>c.name===o.nativeClass);for(const p of definition?.properties||[])if(p.type==='object'&&Object.hasOwn(o.nativeProperties||{},p.name))o.nativeProperties[p.name]=remapActorValue(o.nativeProperties[p.name],ids);
 }
 for(const b of bindings){b.variableValues??={};for(const variable of b.root.variables.filter(v=>v.type==='object')){const value=Object.hasOwn(b.variableValues,variable.id)?b.variableValues[variable.id]:variable.value;b.variableValues[variable.id]=remapActorValue(value,ids);}}
}
