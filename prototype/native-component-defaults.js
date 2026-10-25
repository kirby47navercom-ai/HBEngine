import {componentDefinitions} from './scene-components.js';

// Registered defaults are immutable schema data: no actor snapshot, renderer,
// physics world or operation replay is needed for a missing legacy property.
export function nativeComponentDefaultJson(args){
 if(!args||typeof args.type!=='string'||args.type.length>80||typeof args.property!=='string'||args.property.length>100||!Object.hasOwn(componentDefinitions,args.type)||!Object.hasOwn(componentDefinitions[args.type].properties,args.property))throw Error('등록된 컴포넌트 속성의 기본값만 읽을 수 있어요.');
 const value=componentDefinitions[args.type].properties[args.property].default;
 if(value===undefined)throw Error('컴포넌트 기본값이 없어요.');
 return JSON.stringify(value);
}
