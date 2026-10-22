import {compileNativeTypeAsset} from './native-type-assets.js';
import {nativeTypeReference,validNative,snapshotNativeMetadata} from './native-model.js';

// A resolver belongs to one prepare/read transaction. Editing a library starts
// a new resolver, so no project-global cache can retain an old schema.
export function nativeTypeImportMetadata(reference,sources){
 if(!nativeTypeReference(reference))throw Error('블루프린트 타입 라이브러리 참조를 확인하세요.');
 const metadata={version:1,classes:[],enums:[],structs:[],typeLibrariesOnly:true,typeLibraries:[...reference.typeLibraries]},ids=new Set(),namespaces=new Set();let bytes=0;
 for(const path of reference.typeLibraries){const source=sources.get(path);if(!source)throw Error('타입 라이브러리를 다시 읽어야 해요: '+path);bytes+=source.bytes;if(bytes>8388608)throw Error('타입 라이브러리 원본은 합계8MB까지예요.');if(ids.has(source.id)||namespaces.has(source.namespace))throw Error('타입 라이브러리 ID·namespace가 중복돼요.');ids.add(source.id);namespaces.add(source.namespace);metadata.enums.push(...source.metadata.enums||[]);metadata.structs.push(...source.metadata.structs||[]);}
 if(!validNative(metadata))throw Error('합쳐진 타입 선언·기본값의 범위를 확인하세요.');return snapshotNativeMetadata(metadata);
}
export function createNativeTypeImportResolver(readText){
 const files=new Map(),sets=new Map(),sources=new Map();
 const resolve=async reference=>{
  if(!nativeTypeReference(reference))throw Error('블루프린트 타입 라이브러리 참조를 확인하세요.');
  if(typeof readText!=='function')throw Error('타입 라이브러리 원본 읽기 경로가 필요해요.');
  const key=JSON.stringify(reference.typeLibraries);if(sets.has(key))return sets.get(key);
  const pending=(async()=>{
   for(const path of reference.typeLibraries){
    if(!files.has(path))files.set(path,Promise.resolve().then(async()=>{const text=await readText(path);if(typeof text!=='string'||text.length>2097152)throw Error('타입 라이브러리 원본 크기를 확인하세요.');const data=JSON.parse(text),built=compileNativeTypeAsset(data);return {id:data.id,namespace:data.namespace,metadata:built.metadata,bytes:new TextEncoder().encode(text).byteLength};}));
    sources.set(path,await files.get(path));
   }
   return nativeTypeImportMetadata(reference,sources);
  })();sets.set(key,pending);return pending;
 };
 resolve.sources=sources;return resolve;
}
