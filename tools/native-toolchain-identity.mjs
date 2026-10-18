import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';

const run=promisify(execFile),memo=new Map(),hash=value=>createHash('sha256').update(value).digest('hex');
const inside=(root,file)=>{const r=path.relative(root,file);return r&&!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);};
export function gccDiagnosticArguments(line){
 const args=[];let token='',quoted=false,started=false;
 for(let i=0;i<line.length;i++){const c=line[i],next=line[i+1];if(c==='"'){quoted=!quoted;started=true;}else if(quoted&&c==='\\'&&(next==='\\'||next==='"')){token+=next;i++;started=true;}else if(!quoted&&/\s/.test(c)){if(started){args.push(token);token='';started=false;}}else{token+=c;started=true;}}
 if(quoted)throw Error('GCC 도구 진단의 인용부호를 확인하세요.');if(started)args.push(token);return args;
}
export async function nativeToolFilesIdentity(files,{signal}={}){
 const result=createHash('sha256'),rows=[];let hashedBytes=0;
 for(const file of [...new Set(files.map(file=>path.resolve(file)))].sort()){
  signal?.throwIfAborted();const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('일반 C++ 도구 파일이 아니에요.');const stamp=JSON.stringify([stat.size,stat.mtimeMs,stat.ctimeMs,stat.birthtimeMs,String(stat.ino)]),old=memo.get(file);let digest;
  if(old?.stamp===stamp){digest=old.digest;memo.delete(file);memo.set(file,old);}else{const content=createHash('sha256');for await(const chunk of createReadStream(file,{signal})){content.update(chunk);hashedBytes+=chunk.length;}const after=await fs.stat(file);if(JSON.stringify([after.size,after.mtimeMs,after.ctimeMs,after.birthtimeMs,String(after.ino)])!==stamp)throw Error('C++ 도구가 검사 중 바뀌었어요.');digest=content.digest('hex');memo.delete(file);memo.set(file,{stamp,digest});}
  rows.push({file,size:stat.size,sha256:digest});result.update(JSON.stringify([file,stat.size,digest])+'\n');
 }
 while(memo.size>128)memo.delete(memo.keys().next().value);
 return {fingerprint:result.digest('hex'),files:rows.length,bytes:rows.reduce((n,row)=>n+row.size,0),hashedBytes,rows};
}

// Resolve the actual MinGW driver link line. Unknown drivers/environment fall
// back to version-bound builds; do not guess an equivalent runtime/toolchain.
export async function nativeToolchainIdentity(compiler,{configuration,env=process.env,signal}={}){
 const fallback=reason=>({supported:false,reason,fingerprint:hash(JSON.stringify([compiler,configuration]))});
 if(process.platform!=='win32'||!path.isAbsolute(compiler)||!/^g\+\+(?:\.exe)?$/i.test(path.basename(compiler)))return fallback('unsupported-driver');
 if(['GCC_EXEC_PREFIX','COMPILER_PATH','LIBRARY_PATH','CPLUS_INCLUDE_PATH','CPATH'].some(name=>env[name]))return fallback('custom-environment');
 try{
  signal?.throwIfAborted();const compilerFile=await fs.realpath(compiler),root=path.dirname(path.dirname(compilerFile)),staticLink=configuration!=='editor',diagnostic=await run(compiler,['-###','-std=c++17',...(staticLink?['-static']:[]),'-x','c++','NUL','-o','hb-toolchain-probe.exe'],{env,windowsHide:true,timeout:10000,maxBuffer:1048576,signal});
  if(!diagnostic.stderr.includes('gcc version '))return fallback('unsupported-diagnostic');
  const commands=diagnostic.stderr.split(/\r?\n/).map(line=>{try{return gccDiagnosticArguments(line);}catch{return [];}}).filter(args=>args[0]&&path.isAbsolute(args[0])&&/\.(exe)$/i.test(args[0]));const link=commands.find(args=>/collect2\.exe$/i.test(args[0]));if(!link)return fallback('link-line-missing');
  const directories=link.filter(arg=>arg.startsWith('-L')).map(arg=>path.resolve(arg.slice(2))),files=new Set([compilerFile]),libraries=[];let dynamic=!staticLink;
  for(const args of commands)for(let i=0;i<args.length;i++){
   const arg=args[i],value=arg.startsWith('-plugin-opt=')?arg.slice(12):arg;
   if(path.isAbsolute(value)&&inside(root,value)&&/\.(exe|dll|o|a)$/i.test(value))files.add(path.resolve(value));
  }
  for(const arg of link){
   if(arg.startsWith('@')||arg.startsWith('-l')&&!/^-l[A-Za-z0-9_+.-]+$/.test(arg))return fallback('opaque-link-input');
   if(arg==='-Bstatic')dynamic=false;else if(arg==='-Bdynamic')dynamic=true;else if(/^-l[A-Za-z0-9_+.-]+$/.test(arg)){
    const name=arg.slice(2),names=dynamic?['lib'+name+'.dll.a','lib'+name+'.a']:['lib'+name+'.a'];let found;
    for(const dir of directories){for(const name of names){const file=path.join(dir,name);if(await fs.stat(file).then(stat=>stat.isFile(),()=>false)){found=file;break;}}if(found)break;}
    if(!found||!inside(root,found))return fallback('unresolved-library');files.add(path.resolve(found));libraries.push({name,dynamic,file:path.resolve(found)});
   }
  }
  const linker=(await run(compiler,['-print-prog-name=ld'],{env,windowsHide:true,timeout:10000,maxBuffer:1048576,signal})).stdout.trim();if(!path.isAbsolute(linker)||!inside(root,linker))return fallback('unresolved-linker');files.add(path.resolve(linker));
  for(const name of ['libstdc++-6.dll','libgcc_s_seh-1.dll','libwinpthread-1.dll']){const file=path.join(path.dirname(compilerFile),name);if(await fs.stat(file).then(stat=>stat.isFile(),()=>false))files.add(file);}
  const identity=await nativeToolFilesIdentity([...files],{signal}),flags=link.filter(arg=>!path.isAbsolute(arg)&&!arg.startsWith('-plugin-opt=')&&!arg.startsWith('-L')&&arg!=='hb-toolchain-probe.exe');
  return {supported:true,...identity,fingerprint:hash(JSON.stringify([identity.fingerprint,flags,libraries])),libraries,memo:'content hashes revalidated by size/mtime/ctime/birthtime/inode; bounded128 entries',scope:'driver/tools, resolved startup objects/link libraries and compiler runtime DLLs; OS DLL implementations and external include trees are not copied'};
 }catch(error){signal?.throwIfAborted();return fallback('toolchain-discovery');}
}
