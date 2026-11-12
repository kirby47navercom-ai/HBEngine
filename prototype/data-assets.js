import {validGameJson} from './game-json.js';

export const dataTypes=['string','float','bool','json'];
export const dataDefault=type=>({string:'',float:0,bool:false,json:{}}[type]);
export const validDataValue=(type,value)=>type==='json'?validGameJson(value,{object:false,bounded:false}):type==='float'?Number.isFinite(value):typeof value==={string:'string',bool:'boolean'}[type];
const name=value=>typeof value==='string'&&/^[A-Za-z_가-힣][\w가-힣]{0,79}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
export function validDataAsset(data){
  if(!data||data.version!==1||typeof data.name!=='string'||!data.name||data.name.length>80)return false;
  if(data.columns!==undefined||data.rows!==undefined){
    return Array.isArray(data.columns)&&new Set(data.columns.map(c=>c?.name)).size===data.columns.length&&data.columns.every(c=>name(c?.name)&&dataTypes.includes(c.type))&&data.rows&&Object.getPrototypeOf(data.rows)===Object.prototype&&Object.entries(data.rows).every(([id,row])=>name(id)&&row&&Object.getPrototypeOf(row)===Object.prototype&&Object.keys(row).every(key=>data.columns.some(c=>c.name===key))&&data.columns.every(c=>validDataValue(c.type,row[c.name])))&&validGameJson(data.rows,{bounded:false});
  }
  return Array.isArray(data.fields)&&new Set(data.fields.map(f=>f?.name)).size===data.fields.length&&data.fields.every(f=>name(f?.name)&&dataTypes.includes(f.type)&&validDataValue(f.type,f.value))&&validGameJson(data.fields,{object:false,bounded:false});
}
export function dataContents(data){if(!validDataAsset(data))return data;return data.rows??Object.fromEntries(data.fields.map(f=>[f.name,structuredClone(f.value)]));}
