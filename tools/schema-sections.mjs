export function schemaSectionKeys(section){
 if(typeof section!=='string'||!section||section.length>160)throw Error('스키마 section 경로를 확인하세요.');
 const keys=section.split('.');if(keys.some(key=>!key||['__proto__','prototype','constructor'].includes(key)))throw Error('스키마 항목 없음: '+section);return keys;
}
export function readSchemaSection(schema,section){
 if(section===undefined)return schema;const keys=schemaSectionKeys(section);let value=schema;
 for(const key of keys){if(!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('스키마 항목 없음: '+section);value=value[key];}return{section,value};
}
export function schemaResponse(registry,options){
 if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['section','list'].includes(k))||options.list!==undefined&&typeof options.list!=='boolean'||options.list&&options.section!==undefined))throw Error('스키마 조회 옵션을 확인하세요.');
 if(options?.list)return{sections:Object.keys(registry),valuesOmitted:true,readOnly:true};
 if(options?.section!==undefined){const keys=schemaSectionKeys(options.section),top=keys[0];if(!Object.hasOwn(registry,top))throw Error('스키마 항목 없음: '+options.section);const json=JSON.stringify(registry[top]);if(json===undefined)throw Error('스키마 항목 없음: '+options.section);return readSchemaSection({[top]:JSON.parse(json)},options.section);}
 return Object.fromEntries(Object.keys(registry).map(key=>[key,registry[key]]));
}
