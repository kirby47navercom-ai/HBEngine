import {createHash} from 'node:crypto';
const digest=v=>createHash('sha256').update(v).digest('hex');
export function modelSubassets(bytes,path,sourceId,previous=[]){let data;const rows=[];
  if(/\.glb$/i.test(path)){if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(12)+20>bytes.length||bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('GLB 헤더 오류');data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));}
  else if(/\.gltf$/i.test(path))data=JSON.parse(bytes.toString('utf8'));
  if(data)for(const kind of ['meshes','materials','animations','skins']){const values=data[kind]||[],names=new Map();for(const value of values)names.set(value.name,(names.get(value.name)||0)+1);values.forEach((value,index)=>{const identity=value.extras?.hbId||value.name&&names.get(value.name)===1&&value.name||'index:'+index;rows.push({kind:kind.slice(0,-1),name:value.name||kind+' '+index,sourceIndex:index,sourceKey:kind+':'+identity});});}
  else if(/\.obj$/i.test(path)){const seen=new Set();for(const match of bytes.toString('utf8').matchAll(/^(o|g|usemtl)\s+([^\r\n]+)$/gm)){const kind=match[1]==='usemtl'?'material':'mesh',key=kind+':'+match[2].trim();if(!seen.has(key)){seen.add(key);rows.push({kind,name:match[2].trim(),sourceKey:key});}}}
  const old=new Map(previous.map(row=>[row.sourceKey,row]));return rows.map(row=>({...row,id:old.get(row.sourceKey)?.id||digest(sourceId+'|'+row.sourceKey).slice(0,32),overrides:structuredClone(old.get(row.sourceKey)?.overrides||{})}));
}
