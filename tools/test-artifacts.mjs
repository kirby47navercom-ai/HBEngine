import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),build=path.join(root,'native/build');
const inside=(base,file)=>{const rel=path.relative(base,file);return rel!==''&&!rel.startsWith('..')&&!path.isAbsolute(rel);};
const scheduled=new Set();
export function retainTestEvidence(directory){
  const rel=path.relative(build,path.resolve(directory));if(!inside(build,path.resolve(directory)))return;
  const name=rel.split(path.sep)[0];if(!/^[a-z0-9-]+-[A-Za-z0-9]{6}$/.test(name)||scheduled.has(name))return;
  scheduled.add(name);
  // Runs only once Node has no live test/child work; reports and fixtures remain.
  process.once('beforeExit',async()=>{try{await pruneTestArtifacts(path.join(build,name));}catch(error){console.error('검사 캐시 정리 실패:',error.message);process.exitCode=1;}});
}
async function measure(dir){let bytes=0,files=0;const list=await fs.readdir(dir,{withFileTypes:true}).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e));for(const e of list){if(e.isSymbolicLink())throw Error('검사 캐시 링크를 정리하지 않아요: '+dir);const p=path.join(dir,e.name);if(e.isDirectory()){const n=await measure(p);bytes+=n.bytes;files+=n.files;}else if(e.isFile()){const stat=await fs.stat(p).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));if(stat){bytes+=stat.size;files++;}}}return {bytes,files};}
export async function pruneTestArtifacts(work=null){
  if(process.platform!=='win32')return {skipped:'Windows 전용 검사 캐시 정리'};
  const prefixes=new Set();for(const name of await fs.readdir(import.meta.dirname)){if(!/\.mjs$/.test(name))continue;const text=await fs.readFile(path.join(import.meta.dirname,name),'utf8');for(const m of text.matchAll(/native\/build\/([a-z0-9-]+)-/g))prefixes.add(m[1]+'-');}
  const owned=name=>/^[a-z0-9-]+-[A-Za-z0-9]{6}$/.test(name)&&[...prefixes].some(p=>name.startsWith(p));
  const names=work?[path.basename(path.resolve(work))]:(await fs.readdir(build,{withFileTypes:true})).filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&owned(e.name)).map(e=>e.name);
  if(work&&(!inside(build,path.resolve(work))||path.dirname(path.resolve(work))!==build||!owned(names[0])))throw Error('검사 디렉터리 범위를 확인하세요.');
  const entries=[],manifests=[],receipt=path.join(build,'cache-prune-'+Date.now());await fs.mkdir(receipt);
  const add=async(p,kind)=>{if(!inside(build,p))throw Error('검사 경로 범위 오류');entries.push({path:p,kind,...await measure(p)});};
  async function archive(dir,owner){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('검사 패키지 링크');const p=path.join(dir,e.name);if(e.isDirectory())await archive(p,owner);else if(/^(game\.hbpack|build-report|build-failed)\.json$/.test(e.name)){const data=await fs.readFile(p),sha256=createHash('sha256').update(data).digest('hex'),name=manifests.length+'-'+e.name;await fs.writeFile(path.join(receipt,name),data);manifests.push({original:path.relative(build,p),retained:name,sha256,owner});}}}
  async function visit(dir,owner){const list=await fs.readdir(dir,{withFileTypes:true});for(const e of list){if(!e.isDirectory()||e.isSymbolicLink())continue;const p=path.join(dir,e.name);if(e.name==='Builds'&&list.some(f=>f.isFile()&&f.name.endsWith('.hbproject'))){await archive(p,owner);await add(p,'fixture-build');}else if(e.name==='WebView2'){await add(p,'fixture-profile');}else if(e.name==='plugins'&&path.basename(dir)==='build'&&path.basename(path.dirname(dir))==='native'){await add(p,'fixture-native-cache');}else await visit(p,owner);}}
  for(const name of names)await visit(path.join(build,name),name);
  if(!work){
    // Published game folders remain; only historical private browser profiles go.
    const pages=path.join(build,'auric-pages-084');for(const e of await fs.readdir(pages,{withFileTypes:true}).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)))if(e.isDirectory()&&!e.isSymbolicLink()&&/^(?:perf-)?chrome-[A-Za-z0-9]{6}$/.test(e.name))await add(path.join(pages,e.name),'pages-profile');
    const plugins=path.join(build,'plugins'),cached=[];for(const e of await fs.readdir(plugins,{withFileTypes:true}).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)))if(e.isDirectory()&&!e.isSymbolicLink()&&/^[a-f0-9]{20}$/.test(e.name)){const p=path.join(plugins,e.name);cached.push({path:p,time:(await fs.stat(path.join(p,'worker.exe')).catch(()=>fs.stat(p))).mtimeMs});}cached.sort((a,b)=>b.time-a.time);for(const item of cached.slice(32))await add(item.path,'plugin-cache');
  }
  const plan=path.join(receipt,'plan.json');await fs.writeFile(plan,JSON.stringify({build,entries,manifests},null,2));
  if(entries.length){await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(import.meta.dirname,'remove-test-cache.ps1'),'-PlanFile',plan],{windowsHide:true,timeout:600000,maxBuffer:1048576});return JSON.parse((await fs.readFile(path.join(receipt,'result.json'),'utf8')).replace(/^\uFEFF/,''));}
  return {deleted:0,bytes:0,receipt};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await pruneTestArtifacts(process.argv[2]||null)));
