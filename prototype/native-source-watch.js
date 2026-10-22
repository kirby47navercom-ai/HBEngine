// Reflected declarations retain the actual included header path. Watch these
// alongside the primary pair; arbitrary non-reflected includes remain separate.
export function nativeWatchedSources(reference,metadata=reference){
 const paths=[reference?.headerPath,reference?.sourcePath,...[...metadata?.structs||[],...metadata?.enums||[]].map(d=>d.sourcePath)];
 return [...new Set(paths.filter(p=>typeof p==='string'&&/^Source\/.+\.(?:h|hpp|hh|inl|cpp|cc|cxx)$/.test(p)&&!/[\\:\x00-\x1f]/.test(p)&&!p.split('/').some(v=>!v||v==='.'||v==='..')))];
}
