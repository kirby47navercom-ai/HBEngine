import {assetSuffix,assetTypes,createAsset,validAsset} from '../prototype/asset-documents.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileKind,validScene,defaultObjects,defaultSurface,defaultEnvironment} from '../prototype/model.js';
import {defaultBlueprint,validBlueprint} from '../prototype/blueprint-model.js';
const textExtensions=new Set(['.h','.hpp','.cpp','.c','.json','.txt','.md','.hlsl','.glsl','.obj','.gltf','.csv','.yaml','.yml']);
export function assetKind(name){return Object.entries(assetSuffix).find(([,suffix])=>name.endsWith(suffix))?.[0]||(/\.(cpp|hpp|h|c|hlsl|glsl)$/i.test(name)?'code':fileKind(name)==='unsupported'?'file':fileKind(name));}
export class ProjectService {
  constructor(root){this.root=path.resolve(root);this.index={};this.redirects={};this.queue=Promise.resolve();}
  async init(seed=false){await fs.mkdir(this.root,{recursive:true});this.root=await fs.realpath(this.root);try{this.index=JSON.parse(await fs.readFile(path.join(this.root,'.hbassets.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    try{this.redirects=JSON.parse(await fs.readFile(path.join(this.root,'.hbredirects.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(seed){const scene={version:1,sceneName:'Garden',objects:defaultObjects,surface:defaultSurface,environment:defaultEnvironment,blueprint:defaultBlueprint};const files={
      'Assets/Scenes/Garden.hbscene.json':JSON.stringify(scene,null,2),'Assets/Blueprints/BP_Garden.hbblueprint.json':JSON.stringify(defaultBlueprint,null,2),'Assets/Materials/Moss_stone.hbmaterial.json':JSON.stringify({version:1,surface:defaultSurface},null,2),
      'Assets/Models/Cube.obj':'o Cube\nv -0.5 -0.5 -0.5\nv 0.5 -0.5 -0.5\nv 0.5 0.5 -0.5\nv -0.5 0.5 -0.5\nv -0.5 -0.5 0.5\nv 0.5 -0.5 0.5\nv 0.5 0.5 0.5\nv -0.5 0.5 0.5\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 4 8 7 3\nf 1 5 8 4\nf 2 3 7 6\n',
      'Source/DoorController.h':await fs.readFile(new URL('../prototype/examples/DoorController.h',import.meta.url),'utf8'),'Source/DoorController.cpp':await fs.readFile(new URL('../prototype/examples/DoorController.cpp',import.meta.url),'utf8')};
      for(const [name,content] of Object.entries(files)){const file=await this.resolve(name,true);await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.writeFile(file,content,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}}
    }return this;
  }
  async resolve(relative='',allowMissing=false,followRedirects=true){
    if(typeof relative!=='string'||relative.length>1000||relative.includes('\\')||relative.startsWith('/')||relative.split('/').some(p=>p==='..'||p==='.'||/[<>:"|?*\x00-\x1f]/.test(p)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw Error('프로젝트 경로 오류');
    const visited=new Set();while(followRedirects){const from=Object.keys(this.redirects).sort((a,b)=>b.length-a.length).find(p=>relative===p||relative.startsWith(p+'/'));if(!from)break;if(visited.has(from))throw Error('에셋 참조 순환');visited.add(from);relative=this.redirects[from]+relative.slice(from.length);if(visited.size>32)throw Error('에셋 참조 깊이 초과');}
    const full=path.resolve(this.root,relative);if(full!==this.root&&!full.startsWith(this.root+path.sep))throw Error('프로젝트 범위 밖 경로');let cursor=full;
    while(true){try{const real=await fs.realpath(cursor);if(real!==this.root&&!real.startsWith(this.root+path.sep))throw Error('프로젝트 밖 링크는 사용할 수 없어요.');break;}catch(error){if(!allowMissing||error.code!=='ENOENT')throw error;cursor=path.dirname(cursor);}}
    return full;
  }
  async files(){const result=[];const visit=async(relative,depth=0)=>{if(depth>32||result.length>10000)throw Error('프로젝트 파일 검색 제한 초과');const dir=await this.resolve(relative);for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(result.length>=10000)throw Error('프로젝트 파일 검색 제한 초과');if(entry.name.startsWith('.')||['Library','node_modules','build'].includes(entry.name)||entry.isSymbolicLink())continue;const name=relative?relative+'/'+entry.name:entry.name;if(entry.isDirectory()){result.push({path:name,name:entry.name,kind:'folder'});await visit(name,depth+1);}else if(entry.isFile()){const stat=await fs.stat(await this.resolve(name));this.index[name]??={id:randomUUID()};result.push({path:name,name:entry.name,kind:assetKind(entry.name),size:stat.size,modified:stat.mtimeMs,id:this.index[name].id,text:textExtensions.has(path.extname(name).toLowerCase())});}}};await visit('');return result.sort((a,b)=>(a.kind!=='folder')-(b.kind!=='folder')||a.path.localeCompare(b.path));}
  async list({folder='',query='',type='all',contents=false,recursive=false}={}){await this.resolve(folder);const all=await this.files(),q=query.toLowerCase();let entries=all.filter(e=>(recursive?e.path.startsWith(folder?folder+'/':''):path.posix.dirname(e.path)===(folder||'.'))&&(type==='all'||e.kind===type));
    if(q){const matches=[];for(const e of entries){if(e.name.toLowerCase().includes(q)||e.path.toLowerCase().includes(q))matches.push(e);else if(contents&&e.text&&e.size<=1048576){const lines=(await fs.readFile(await this.resolve(e.path),'utf8')).split(/\r?\n/),line=lines.findIndex(s=>s.toLowerCase().includes(q));if(line>=0)matches.push({...e,line:line+1,match:lines[line].slice(0,160)});}}entries=matches;}
    await this.saveIndex();return {root:this.root,folder,entries,folders:all.filter(e=>e.kind==='folder'),total:all.filter(e=>e.kind!=='folder').length};
  }
  saveIndex(){const task=this.queue.then(async()=>{const file=path.join(this.root,'.hbassets.json'),temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(this.index,null,2));await fs.rename(temp,file);});this.queue=task.catch(()=>{});return task;}
  async import(folder,name,data){if(!name||name.includes('/')||name.includes('\\'))throw Error('가져올 파일 이름 오류');const dir=await this.resolve(folder);if(!(await fs.stat(dir)).isDirectory())throw Error('가져올 폴더가 없어요.');const ext=path.extname(name),stem=name.slice(0,name.length-ext.length);for(let i=0;i<10000;i++){const relative=(folder?folder+'/':'')+stem+(i?'_'+i:'')+ext,file=await this.resolve(relative,true);let handle;try{handle=await fs.open(file,'wx');await handle.writeFile(data);await handle.close();handle=null;this.index[relative]={id:randomUUID(),importedAt:new Date().toISOString(),status:'source'};await this.saveIndex();return {path:relative,kind:assetKind(relative)};}catch(error){if(handle){await handle.close().catch(()=>{});await fs.unlink(file).catch(()=>{});}if(error.code!=='EEXIST')throw error;}}throw Error('같은 이름의 파일이 너무 많아요.');}
  async mkdir(relative){await fs.mkdir(await this.resolve(relative,true),{recursive:true});}
  async read(relative){const file=await this.resolve(relative),stat=await fs.stat(file);if(!stat.isFile())throw Error('파일이 아니에요.');return {file,size:stat.size};}
  async write(relative,data){if(!textExtensions.has(path.extname(relative).toLowerCase()))throw Error('편집 가능한 텍스트 파일이 아니에요.');const file=await this.resolve(relative,true);const kind=assetKind(relative);if(assetSuffix[kind]&&!validAsset(kind,JSON.parse(data)))throw Error('에셋 검증 실패');if(relative.endsWith('.hbscene.json')&&!validScene(JSON.parse(data)))throw Error('장면 검증 실패');if(relative.endsWith('.hbblueprint.json')&&!validBlueprint(JSON.parse(data)))throw Error('블루프린트 검증 실패');await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,data,{flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}this.index[relative]??={id:randomUUID()};await this.saveIndex();}
  async create(folder,kind,name,parent){
    if(!assetTypes[kind]||kind==='code')throw Error('에셋 종류 오류');
    const data=createAsset(kind,name,parent);if(!validAsset(kind,data))throw Error('생성 데이터 검증 실패');
    const relative=(folder?folder+'/':'')+name+assetSuffix[kind],file=await this.resolve(relative,true);
    await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2),{flag:'wx'});
    this.index[relative]={id:randomUUID()};await this.saveIndex();return {path:relative,name:path.basename(relative),kind};
  }
  async rename(from,to){
    if(!from||!to||to.startsWith(from+'/'))throw Error('이름 변경 경로 오류');
    const old=await this.resolve(from),next=await this.resolve(to,true,false),source=path.relative(this.root,old).split(path.sep).join('/');
    if(next.startsWith(old+path.sep))throw Error('이름 변경 경로 오류');
    try{await fs.access(next);throw Error('같은 이름이 이미 있어요.');}catch(error){if(error.code!=='ENOENT')throw error;}
    const redirects={...this.redirects};delete redirects[to];redirects[source]=to;
    await fs.rename(old,next);const redirectFile=path.join(this.root,'.hbredirects.json'),temp=redirectFile+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temp,JSON.stringify(redirects,null,2),{flag:'wx'});await fs.rename(temp,redirectFile);this.redirects=redirects;}catch(error){await fs.rename(next,old);throw error;}finally{await fs.unlink(temp).catch(()=>{});}
    for(const key of Object.keys(this.index))if(key===source||key.startsWith(source+'/')){this.index[to+key.slice(source.length)]=this.index[key];delete this.index[key];}await this.saveIndex();
  }

}
