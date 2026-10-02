import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const storageLimit=8*1024*1024;
const bases=new Set(['hbengine-ui-scene-v1','hbengine.documents.v2','hbengine.docks.v2','hbengine.project.folder','hbengine.project.view','hbengine.storage-migrated.v1']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
export class ProjectStorage {
  constructor(project,id){this.project=project;this.suffix='.project.'+encodeURIComponent(id);this.queue=Promise.resolve();}
  validKey(key){if(typeof key!=='string'||key.length>1000||!key.endsWith(this.suffix))return false;const base=key.slice(0,-this.suffix.length);return bases.has(base)||base.startsWith('hbengine.savegame.')&&base.length>18&&!/[\x00-\x1f]/.test(base);}
  validate(items,patch=false){if(!plain(items)||Object.entries(items).some(([key,value])=>!this.validKey(key)||!(typeof value==='string'||patch&&value===null)))throw Error('프로젝트 저장 데이터 형식 오류');}
  async load(check=()=>{}){
    check();const file=await this.project.resolve('Saved/Editor/storage.json',true,false);check();
    let bytes;try{if((await fs.stat(file)).size>storageLimit)throw Error('프로젝트 저장 크기 제한 초과');bytes=await fs.readFile(file);}catch(error){if(error.code==='ENOENT'){check();return {version:1,items:{}};}throw error;}
    check();if(bytes.length>storageLimit)throw Error('프로젝트 저장 크기 제한 초과');const data=JSON.parse(bytes.toString('utf8'));if(!plain(data)||data.version!==1)throw Error('프로젝트 저장 파일 형식 오류');this.validate(data.items);return data;
  }
  async read(check){await this.queue;return this.load(check);}
  patch(items,check=()=>{}){
    this.validate(items,true);if(Buffer.byteLength(JSON.stringify(items))>storageLimit)throw Error('프로젝트 저장 크기 제한 초과');
    const task=this.queue.then(async()=>{
      check();const data=await this.load(check);for(const [key,value] of Object.entries(items)){if(value===null)delete data.items[key];else data.items[key]=value;}
      const text=JSON.stringify({version:1,items:data.items});if(Buffer.byteLength(text)>storageLimit)throw Error('프로젝트 저장 크기 제한 초과');
      check();const file=await this.project.resolve('Saved/Editor/storage.json',true,false);check();await fs.mkdir(path.dirname(file),{recursive:true});check();
      const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,text,{flag:'wx'});check();await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
      check();return {ok:true};
    });this.queue=task.catch(()=>{});return task;
  }
}
