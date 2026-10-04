// RFC 6902 replacements, including sparse array edits; the C++ input cache is
// separate from its mutable gameplay world. A full request remains the fallback.
export function worldPatch(previous,current,limit=4096){
  const operations=[],escape=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
  const add=operation=>{operations.push(operation);if(operations.length>limit)throw Error('full snapshot');};
  function walk(a,b,path){if(Object.is(a,b))return;const aObject=a&&typeof a==='object',bObject=b&&typeof b==='object';
    if(!aObject||!bObject||Array.isArray(a)!==Array.isArray(b)||Array.isArray(a)&&a.length!==b.length){add({op:'replace',path,value:b});return;}
    for(const key of Object.keys(a))if(!Object.hasOwn(b,key))add({op:'remove',path:path+'/'+escape(key)});
    for(const [key,value] of Object.entries(b)){const at=path+'/'+escape(key);if(!Object.hasOwn(a,key))add({op:'add',path:at,value});else walk(a[key],value,at);}
  }
  try{walk(previous,current,'');return operations;}catch{return null;}
}
