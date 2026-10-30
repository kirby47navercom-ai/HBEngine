import fs from 'node:fs';
import path from 'node:path';
export function nativeGameStorage(directory){
 const file=path.join(directory,'storage.json');let values={};try{values=JSON.parse(fs.readFileSync(file,'utf8'));if(!values||typeof values!=='object'||Array.isArray(values))throw Error('저장 데이터 형식 오류');}catch(error){if(error.code!=='ENOENT')throw error;}
 const change=(key,value,remove=false)=>{const next={...values};if(remove)delete next[key];else next[key]=String(value);fs.mkdirSync(directory,{recursive:true});const temporary=file+'.'+process.pid+'.tmp';try{fs.writeFileSync(temporary,JSON.stringify(next),{flag:'wx'});fs.renameSync(temporary,file);values=next;}finally{try{fs.unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}};
 return {getItem:key=>Object.hasOwn(values,key)?values[key]:null,setItem:(key,value)=>change(key,value),removeItem:key=>change(key,null,true)};
}
