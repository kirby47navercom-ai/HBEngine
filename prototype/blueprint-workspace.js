import {createBlueprintResolver,resolveCachedBlueprint} from './blueprint-inheritance.js';

// Disk data stays separate from authored documents and composed editor views.
export class BlueprintWorkspace {
  constructor(read,opened=()=>undefined){this.read=read;this.opened=opened;this.files=new Map();}
  async prepare(path,data){
    const files=new Map();const root=await createBlueprintResolver(async requested=>{
      const raw=requested===path&&data!==undefined?data:this.opened(requested)??await this.read(requested);
      files.set(requested,structuredClone(raw));return raw;
    })(path);
    for(const [key,value] of files)this.files.set(key,value);return root;
  }
  view(path,data){return resolveCachedBlueprint(path,key=>{
    const raw=key===path&&data!==undefined?data:this.opened(key)??this.files.get(key);
    if(!raw)throw Error('부모 블루프린트를 다시 읽어야 해요: '+key);return raw;
  });}
}
