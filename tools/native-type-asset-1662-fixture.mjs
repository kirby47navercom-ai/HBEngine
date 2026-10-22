import {createNativeTypeAsset,compileNativeTypeAsset} from '../prototype/native-type-assets.js';
import {header as originalHeader,source,headerPath,sourcePath,owner} from './native-record-fixture-1472.mjs';
import {parseNativeHeader} from '../prototype/native-model.js';
export {source,headerPath,sourcePath,owner};
const base=(symbol,label=symbol)=>({id:crypto.randomUUID(),symbol,label,tooltip:''});
export function typeLibrary1662(){
 const data=createNativeTypeAsset('공유 전투 타입');data.namespace='Combat';
 const state={...base('State','상태'),flags:false,entries:[{...base('Idle','대기'),value:4,hidden:false},{...base('Attack','공격'),value:12,hidden:false}]};
 const field=(symbol,type,value,extra={})=>({...base(symbol),type,value,array:false,readOnly:false,...extra});
 const damage={...base('Damage','피해'),fields:[field('Amount','int',42),field('Direction','vec3',[1,2,3])]};
 const stats={...base('Stats','능력치'),fields:[field('Hit','record',{Amount:42,Direction:[1,2,3]},{typeId:damage.id}),field('Label','string','Vec3{체력}'),field('Mode','enum',12,{typeId:state.id}),field('Target','object',null),field('Hits','record',[{Amount:7,Direction:[0,1,0]}],{typeId:damage.id,array:true})]};
 data.enums=[state];data.structs=[stats,damage];return data;
}
export const library=typeLibrary1662(),built=compileNativeTypeAsset(library);
export const header='#pragma once\n#include "'+built.path.slice(7)+'"\n'+originalHeader.slice(originalHeader.indexOf('HB_CLASS'));
export const files=[{path:built.path,content:built.header},{path:headerPath,content:header},{path:sourcePath,content:source}];
export const metadata=()=>parseNativeHeader(header,{sourcePath:headerPath,files});
export const statsDefault=()=>Object.fromEntries(metadata().structs.find(d=>d.name==='Combat::Stats').fields.map(f=>[f.name,structuredClone(f.value)]));
