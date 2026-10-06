import {createBlueprintResolver,resolveCachedBlueprint} from './blueprint-inheritance.js';
import {parseNativeHeader,canonicalNativeText} from './native-model.js';

// Disk data stays separate from authored documents and composed editor views.
export class BlueprintWorkspace {
  constructor(read,opened=()=>undefined,readText){this.read=read;this.opened=opened;this.readText=readText;this.files=new Map();this.nativeMetadata=new Map();}
  async prepare(path,data){
    const files=new Map();const root=await createBlueprintResolver(async requested=>{
      const raw=requested===path&&data!==undefined?data:this.opened(requested)??await this.read(requested);
      let hydrated=structuredClone(raw);if(hydrated.native&&this.readText){const n=hydrated.native,header=canonicalNativeText(await this.readText(n.headerPath||'Source/DoorController.h')),source=canonicalNativeText(await this.readText(n.sourcePath||'Source/DoorController.cpp'));hydrated.native={...parseNativeHeader(header),header,source,headerPath:n.headerPath,sourcePath:n.sourcePath};this.nativeMetadata.set(requested,hydrated.native);}files.set(requested,hydrated);return hydrated;
    })(path);
    for(const [key,value] of files)this.files.set(key,value);return root;
  }
  view(path,data){return resolveCachedBlueprint(path,key=>{
    const raw=key===path&&data!==undefined?data:this.opened(key)??this.files.get(key);
    if(!raw)throw Error('부모 블루프린트를 다시 읽어야 해요: '+key);const native=this.nativeMetadata.get(key);return native&&raw.native&&native.headerPath===raw.native.headerPath&&native.sourcePath===raw.native.sourcePath?{...raw,native}:raw;
  });}
}
