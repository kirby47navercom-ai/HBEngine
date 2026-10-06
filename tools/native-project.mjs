import fs from 'node:fs/promises';
import path from 'node:path';
import {canonicalNativeText,parseNativeHeader} from '../prototype/native-model.js';

export const nativeSourceLimits=Object.freeze({root:'Source/',extensions:['h','hpp','hh','inl','cpp','cc','cxx'],maxFiles:512,maxFileBytes:500000,maxTotalBytes:8388608,compileTimeoutMs:60000});
export const nativeSourceFile=name=>/^Source\//.test(name)&&/\.(?:h|hpp|hh|inl|cpp|cc|cxx)$/i.test(name);
export function checkedNativeFiles(files){
  if(!Array.isArray(files)||files.length>nativeSourceLimits.maxFiles)throw Error('C++ Source 파일은 512개까지 지원해요.');
  let bytes=0;const seen=new Set();
  return files.map(file=>{if(!file||typeof file.path!=='string'||!nativeSourceFile(file.path)||file.path.length>2000||/[\\:\x00-\x1f]/.test(file.path)||file.path.split('/').some(part=>!part||part==='.'||part==='..')||seen.has(file.path.toLowerCase())||typeof file.content!=='string'||Buffer.byteLength(file.content)>nativeSourceLimits.maxFileBytes)throw Error('C++ Source 경로·중복·500KB 크기를 확인하세요.');seen.add(file.path.toLowerCase());bytes+=Buffer.byteLength(file.content);if(bytes>nativeSourceLimits.maxTotalBytes)throw Error('C++ Source 전체 크기는 8MB까지 지원해요.');return {path:file.path,content:canonicalNativeText(file.content)};}).sort((a,b)=>a.path.localeCompare(b.path));
}
export async function readNativeFiles(project){
  const files=(await project.files()).filter(file=>file.kind!=='folder'&&nativeSourceFile(file.path));
  if(files.length>nativeSourceLimits.maxFiles)throw Error('C++ Source 파일은 512개까지 지원해요.');
  const result=[];let bytes=0;for(const file of files){const info=await project.read(file.path);if(info.size>nativeSourceLimits.maxFileBytes)throw Error('C++ Source 파일 500KB 제한: '+file.path);bytes+=info.size;if(bytes>nativeSourceLimits.maxTotalBytes)throw Error('C++ Source 전체 크기 8MB 제한');result.push({path:file.path,content:await fs.readFile(info.file,'utf8')});}return checkedNativeFiles(result);
}
export function nativeProjectLayout(header,source,generated,files){
  files=checkedNativeFiles(files);const primarySource=files.find(file=>/\.(cpp|cc|cxx)$/i.test(file.path)&&file.content===canonicalNativeText(source)),stem=file=>file.path.replace(/\.[^.]+$/,'').toLowerCase(),headers=files.filter(file=>/\.(h|hpp|hh)$/i.test(file.path)),matching=headers.filter(file=>file.content===canonicalNativeText(header)),primaryHeader=matching.find(file=>primarySource&&stem(file)===stem(primarySource))||matching[0];
  // Same named public classes are independent BP modules, not helper units for
  // each other. Keep their files in the source/cache inventory but compile only
  // this entry and ordinary helpers. Explicit conflicting includes still fail.
  const classes=new Set(generated.metadata.classes.map(c=>c.name)),otherEntries=new Set();
  for(const file of headers)if(file!==primaryHeader){try{if(parseNativeHeader(file.content).classes.some(c=>classes.has(c.name)))otherEntries.add(stem(file));}catch{}}
  const sourcePath=primarySource?.path||'User.cpp',records=files.map(file=>{
    let content=file.content;
    if(file===primaryHeader)content='#pragma once\n'+generated.header;
    else if(file===primarySource)content=generated.source;
    else if(/\.(cpp|cc|cxx)$/i.test(file.path)){
      const stem=file.path.replace(/\.[^.]+$/,'').toLowerCase(),ownHeader=files.find(header=>/\.(h|hpp|hh)$/i.test(header.path)&&header.path.replace(/\.[^.]+$/,'').toLowerCase()===stem);
      const includes=[...content.matchAll(/^\s*#include\s*["<]([^">]+)[">]/gm)].map(match=>match[1]);
      const included=ownHeader&&includes.some(name=>name===path.posix.basename(ownHeader.path)||name===ownHeader.path||path.posix.normalize(path.posix.join(path.posix.dirname(file.path),name))===ownHeader.path);
      content='#include <HBEngine/Native.hpp>\n'+(ownHeader&&!included?'#include "'+path.posix.basename(ownHeader.path)+'"\n':'')+content;
    }
    return {...file,content};
  });
  if(!primarySource)records.push({path:sourcePath,content:generated.source});
  // Older engine templates used User.h regardless of the authored header name.
  // Preserve that alias only when no real project header has that name.
  if(!files.some(file=>path.posix.basename(file.path).toLowerCase()==='user.h')&&records.some(file=>/^\s*#include\s*"User\.h"/m.test(file.content)))records.push({path:'User.h',content:'#pragma once\n#include "User.hpp"\n'});
  return {header:primaryHeader?'#pragma once\n#include "'+primaryHeader.path+'"\n':'#pragma once\n'+generated.header,files:records,sourceFiles:records.filter(file=>/\.(cpp|cc|cxx)$/i.test(file.path)&&(file.path===sourcePath||!otherEntries.has(stem(file)))).map(file=>file.path),includeDirectories:[...new Set(['.','Source',...files.map(file=>path.posix.dirname(file.path))])],projectFiles:files.length};
}
export async function writeNativeProject(directory,generated,{prefix='',namespace=''}={}){
  const records=generated.files||[{path:'User.cpp',content:generated.source}],dirs=generated.includeDirectories||['.'];
  const known=new Set([...records.map(file=>file.path),'User.hpp']);
  // AOT modules share one compiler command. Resolve project includes relative to
  // their own file before global search paths can select another module's copy.
  const localIncludes=(content,file)=>content.replace(/^(\s*#include\s*)["<]([^">]+)[">]/gm,(line,start,name)=>{
    const base=path.posix.dirname(file),found=[path.posix.join(base,name),...dirs.map(dir=>path.posix.join(dir,name))].find(candidate=>known.has(path.posix.normalize(candidate)));
    return found?start+'"'+path.posix.relative(base,path.posix.normalize(found))+'"':line;
  });
  // Standard headers stay outside the per-module namespace; project headers keep
  // their relative include paths and each AOT module's independent C++ state.
  const globalIncludes=namespace?[generated.header,...records.map(file=>file.content)].map(content=>content.split('\n').filter(line=>{if(/^\s*#(?:if|ifdef|ifndef|elif|else|endif)\b/.test(line))return true;const include=line.match(/^\s*#include\s*<([^>]+)>\s*$/);return include&&!records.some(file=>file.path===include[1]||file.path.endsWith('/'+include[1]));}).join('\n')).join('\n')+'\n':'';
  const preamble=prefix+(namespace?'#include <HBEngine/Native.hpp>\n'+globalIncludes:'');
  await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'User.hpp'),preamble+(namespace?'namespace '+namespace+' {\n'+generated.header+'\n}\n':generated.header));
  for(const file of records){const target=path.join(directory,file.path);await fs.mkdir(path.dirname(target),{recursive:true});let content=namespace?localIncludes(file.content,file.path):file.content;if(namespace&&/\.(cpp|cc|cxx)$/i.test(file.path)){const user=path.relative(path.dirname(target),path.join(directory,'User.hpp')).split(path.sep).join('/');content=preamble+'#include "'+user+'"\nnamespace '+namespace+' {\n'+content.replace(/^#include "User.hpp"$/gm,'')+'\n}\n';}await fs.writeFile(target,content);}
  const worker=prefix+generated.worker.replace('#include "User.hpp"','#include "User.hpp"'+(namespace?'\nusing namespace '+namespace+';':''));await fs.writeFile(path.join(directory,'worker.cpp'),worker);
  return {sources:generated.sourceFiles||['User.cpp'],includeDirectories:dirs};
}
