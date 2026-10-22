import {readNativeHeaderFiles} from './native-header-files.js';

export function nativeWatchedSources(reference,metadata=reference,dependencies=[]){
 const paths=[reference?.headerPath,reference?.sourcePath,...[...metadata?.structs||[],...metadata?.enums||[]].map(d=>d.sourcePath),...dependencies];
 return [...new Set(paths.filter(p=>typeof p==='string'&&/^Source\/.+\.(?:h|hpp|hh|inl|cpp|cc|cxx)$/.test(p)&&!/[\\:\x00-\x1f]/.test(p)&&!p.split('/').some(v=>!v||v==='.'||v==='..')))];
}

// Missing earlier candidates matter too: creating a nearer relative include
// can change what the compiler resolves without touching the old dependency.
export async function readNativeSourceDependencies({header,source,headerPath,sourcePath},readText){
 const files=new Map([[headerPath,header],[sourcePath,source]]),reads=new Map(),paths=new Set([headerPath,sourcePath]);let bytes=new TextEncoder().encode(header+source).byteLength;
 const observe=path=>{paths.add(path);if(paths.size>4096)throw Error('C++ include 후보 경로의 크기를 확인하세요.');};
 const read=async path=>{if(files.has(path))return files.get(path);if(!reads.has(path))reads.set(path,Promise.resolve().then(async()=>{const text=await readText(path);if(typeof text!=='string')throw Object.assign(Error('C++ include 원본이 아니에요.'),{nativeDependencyFatal:true});bytes+=new TextEncoder().encode(text).byteLength;if(files.size>=512||bytes>8388608||text.length>500000)throw Object.assign(Error('C++ 소스 의존성 크기 제한'),{nativeDependencyFatal:true});files.set(path,text);return text;}));return reads.get(path);};
 await readNativeHeaderFiles(header,{sourcePath:headerPath,readText:read,onCandidate:observe});await readNativeHeaderFiles(source,{sourcePath,readText:read,onCandidate:observe});
 return {paths:[...paths],files:[...files].map(([path,content])=>({path,content}))};
}
