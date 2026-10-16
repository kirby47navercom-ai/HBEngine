import {fileContent} from './build-content.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const build=path.resolve(import.meta.dirname,'../node_modules/three/build');
const bundles=new Set(['three.core.js','three.module.js','three.webgpu.js','three.tsl.js','three.webgpu.nodes.js']);
// Use the installed dependency's own licensed distribution. Editor/source files
// and game assets stay byte-for-byte untouched; runtime URLs remain compatible.
export async function packagedRuntimeBytes(file){
 const full=path.resolve(file),name=path.basename(full);
 if(path.dirname(full)===build&&bundles.has(name)){
  let source;try{source=await fs.readFile(full.replace(/\.js$/,'.min.js'),'utf8');}catch(error){if(error.code==='ENOENT')return fs.readFile(full);throw error;}
  for(const bundle of bundles)source=source.replaceAll('./'+bundle.replace(/\.js$/,'.min.js'),'./'+bundle);
  return Buffer.from(source);
 }
 return fs.readFile(full);
}

export async function packagedRuntimeContent(file,options={}){
 const full=path.resolve(file);return path.dirname(full)===build&&bundles.has(path.basename(full))?packagedRuntimeBytes(full):fileContent(full,options);
}
