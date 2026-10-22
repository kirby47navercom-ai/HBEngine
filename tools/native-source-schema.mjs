import {parseNativeHeader} from '../prototype/native-model.js';
import {readNativeHeaderFiles} from '../prototype/native-header-files.js';

export const nativeHeaderPath=name=>/^Source\/.+\.(?:h|hpp)$/i.test(name);
export function nativeSchemaCandidates(rows){return rows.filter(r=>nativeHeaderPath(r.path)&&!/^Source\/HBGenerated\//i.test(r.path)&&r.before!==null&&r.after!==null&&r.before!==r.after&&(/\bHB_STRUCT\s*\(/.test(r.before+'\n'+r.after)||/\bHB_CLASS\s*\(/.test(r.before+'\n'+r.after)&&JSON.stringify(r.before.match(/^\s*#\s*include\s*"[^"\n]+"/gm))!==JSON.stringify(r.after.match(/^\s*#\s*include\s*"[^"\n]+"/gm))));}
const shape=d=>JSON.stringify(d.fields.map(f=>[f.name,f.type,!!f.array,f.structName||'',f.enumName||'',f.enumSource||'',f.className||'',f.maskEnumName||'']));
export async function changedNativeSourceRecords(rows,read){
 const names=new Set();for(const row of rows){const metadata=async(previous)=>{const header=previous?row.before:row.after,files=await readNativeHeaderFiles(header,{sourcePath:row.path,readText:name=>read(name,previous)});return parseNativeHeader(header,{sourcePath:row.path,files,typesOnly:true,maxLength:500000});},before=await metadata(true),after=await metadata(false);
  for(const old of before.structs||[]){const next=after.structs?.find(d=>d.name===old.name&&d.sourcePath===old.sourcePath);if(!next||shape(old)!==shape(next))names.add(old.name);}
 }
 return names;
}
