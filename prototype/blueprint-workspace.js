import {createBlueprintResolver,resolveCachedBlueprint} from './blueprint-inheritance.js';
import {createNativeTypeImportResolver,nativeTypeImportMetadata} from './native-type-imports.js';
import {nativeTypeReference,nativeSourceMatches} from './native-model.js';
import {readNativeHeader,canonicalNativeText} from './native-model.js';

// Disk data stays separate from authored documents and composed editor views.
export class BlueprintWorkspace {
  constructor(read,opened=()=>undefined,readText){this.read=read;this.opened=opened;this.readText=readText;this.files=new Map();this.nativeMetadata=new Map();this.nativeTypeSources=new Map();}
  async prepare(path,data){
    const files=new Map(),typeImports=createNativeTypeImportResolver(this.readText);const root=await createBlueprintResolver(async requested=>{
      const raw=requested===path&&data!==undefined?data:this.opened(requested)??await this.read(requested);
      let hydrated=structuredClone(raw);if(nativeTypeReference(hydrated.native)){hydrated.native=await typeImports(hydrated.native);this.nativeMetadata.set(requested,hydrated.native);}else if(hydrated.native&&this.readText){const n=hydrated.native,header=canonicalNativeText(await this.readText(n.headerPath||'Source/DoorController.h')),source=canonicalNativeText(await this.readText(n.sourcePath||'Source/DoorController.cpp'));hydrated.native={...await readNativeHeader(header,{sourcePath:n.headerPath||'Source/DoorController.h',readText:this.readText}),header,source,headerPath:n.headerPath,sourcePath:n.sourcePath};this.nativeMetadata.set(requested,hydrated.native);}files.set(requested,hydrated);return hydrated;
    })(path);
    for(const [key,value] of files)this.files.set(key,value);for(const [key,value]of typeImports.sources)this.nativeTypeSources.set(key,value);return root;
  }
  view(path,data){return resolveCachedBlueprint(path,key=>{
    const raw=key===path&&data!==undefined?data:this.opened(key)??this.files.get(key);
    if(!raw)throw Error('부모 블루프린트를 다시 읽어야 해요: '+key);let native=this.nativeMetadata.get(key);if(nativeTypeReference(raw.native)&&(!native||!nativeSourceMatches(native,raw.native))){native=nativeTypeImportMetadata(raw.native,this.nativeTypeSources);this.nativeMetadata.set(key,native);}return native&&raw.native&&nativeSourceMatches(native,raw.native)?{...raw,native}:raw;
  });}
}
