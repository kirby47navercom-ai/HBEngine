// Incremental C++ builds: each translation unit's object file is cached by what decides its machine code — compiler,
// SDK, flags, the unit's own text and every project header — so a build after editing one .cpp recompiles only that
// file (plus the link). An object with debug information is reused only while the source file it was compiled from
// still exists, so debugger source listings never point at a deleted file.
import fs from 'node:fs/promises';
import path from 'node:path';
import {existsSync,statSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';

const unitFile=/\.(cpp|cc|cxx|c)$/i;
export function compilerIdentity(compiler){try{const s=statSync(compiler);return compiler+'|'+s.size+'|'+s.mtimeMs;}catch{return compiler;}}
// Every non-translation-unit file of the generated project (User.hpp, project headers), path and content.
export async function projectHeaderDigest(directory){
  const hash=createHash('sha256'),walk=async relative=>{for(const entry of (await fs.readdir(path.join(directory,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=relative?relative+'/'+entry.name:entry.name;if(entry.isDirectory())await walk(name);else if(entry.isFile()&&!unitFile.test(entry.name)&&!/\.(o|exe|tmp|res|rc)$/i.test(entry.name)){hash.update(name+'\0');hash.update(await fs.readFile(path.join(directory,name)));hash.update('\0');}}};
  await walk('');return hash.digest('hex');
}
export class NativeObjectCache {
  constructor(directory,{maxEntries=3000}={}){this.directory=directory;this.maxEntries=maxEntries;this.hits=0;this.misses=0;}
  key(parts){return createHash('sha256').update(JSON.stringify(parts)).digest('hex');}
  entry(key){return path.join(this.directory,key.slice(0,2),key);}
  // Copies a cached object to objectPath; false when absent or its debug source is gone.
  async reuse(key,objectPath){
    const entry=this.entry(key);try{const meta=JSON.parse(await fs.readFile(path.join(entry,'meta.json'),'utf8'));if(meta.source&&!existsSync(meta.source))return false;
      await fs.copyFile(path.join(entry,'unit.o'),objectPath);const now=new Date();await fs.utimes(path.join(entry,'meta.json'),now,now).catch(()=>{});this.hits++;return true;}catch{return false;}
  }
  async store(key,objectPath,source=null){
    this.misses++;const entry=this.entry(key),staging=entry+'.tmp-'+randomUUID();
    try{await fs.mkdir(staging,{recursive:true});await fs.copyFile(objectPath,path.join(staging,'unit.o'));await fs.writeFile(path.join(staging,'meta.json'),JSON.stringify({source,stored:Date.now()}));
      await fs.rm(entry,{recursive:true,force:true});await fs.rename(staging,entry);}catch{/* another build stored it, or the cache is not writable: the build itself already succeeded */}
    finally{await fs.rm(staging,{recursive:true,force:true}).catch(()=>{});}
  }
  // Compile through the cache: reuse the object or compile and remember it.
  async compile(parts,objectPath,compileNow,{debugSource=null}={}){const key=this.key(parts);if(await this.reuse(key,objectPath))return true;await compileNow();await this.store(key,objectPath,debugSource);return false;}
  // ponytail: count-based LRU by last use; add a byte budget if objects grow large.
  async prune(){
    const rows=[];for(const shard of await fs.readdir(this.directory).catch(()=>[]))for(const name of await fs.readdir(path.join(this.directory,shard)).catch(()=>[])){if(name.includes('.tmp-'))continue;const meta=path.join(this.directory,shard,name,'meta.json');try{rows.push({dir:path.join(this.directory,shard,name),time:(await fs.stat(meta)).mtimeMs});}catch{}}
    if(rows.length<=this.maxEntries)return 0;rows.sort((a,b)=>a.time-b.time);const remove=rows.slice(0,rows.length-this.maxEntries);for(const row of remove)await fs.rm(row.dir,{recursive:true,force:true}).catch(()=>{});return remove.length;
  }
}
