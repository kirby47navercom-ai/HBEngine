import {isNativeTypeAssetKind,nativeTypeAssetKind} from './native-type-paths.js';
import {validNativeTypeAsset,nativeTypeAssetDefault,compileNativeTypeAsset,checkNativeTypeIdentity} from './native-type-assets.js';
import {createNativeTypeImportResolver,readNativeTypeDependencies} from './native-type-imports.js';
import {nativeTypeReference} from './native-model.js';
import {nativeRecordDefault} from './native-records.js';
import {validBlueprint,isBlueprintParent} from './blueprint-model.js';

function page(values,{offset=0,limit=32,query=''}={}){
 if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>128||typeof query!=='string'||query.length>160)throw Error('자료형 검색 범위를 확인하세요.');
 const q=query.trim().toLowerCase(),filtered=q?values.filter(value=>[value.path,value.name,value.label,value.kind].some(v=>typeof v==='string'&&v.toLowerCase().includes(q))):values;
 return {readOnly:true,count:filtered.length,offset,items:filtered.slice(offset,offset+limit),nextOffset:offset+limit<filtered.length?offset+limit:null};
}
export function inspectNativeTypeCatalog(files,options={}){
 return page(files.filter(f=>isNativeTypeAssetKind(f.kind)).map(f=>({path:f.path,name:f.name||f.path.split('/').pop(),kind:f.kind})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),options);
}
export function inspectNativeTypeDeclarations(data,path,options={}){
 if(!validNativeTypeAsset(data,nativeTypeAssetKind(path)))throw Error('자료형 에셋 선언을 확인하세요.');
 return {...page([...(data.enums||[]).map(d=>({id:d.id,kind:'enum',name:data.namespace+'::'+d.symbol,label:d.label})),...(data.structs||[]).map(d=>({id:d.id,kind:'record',name:data.namespace+'::'+d.symbol,label:d.label}))],options),path,assetId:data.id,namespace:data.namespace};
}
function declaration(data,path,id){if(!validNativeTypeAsset(data,nativeTypeAssetKind(path)))throw Error('자료형 에셋 선언을 확인하세요.');const e=data.enums.find(d=>d.id===id),d=e||data.structs.find(d=>d.id===id);if(!d)throw Error('선택한 자료형 선언이 없어요.');return {id:d.id,kind:e?'enum':'record',name:data.namespace+'::'+d.symbol,label:d.label};}
export async function applyCatalogBlueprintVariable(data,source,params,readText){
 if(isBlueprintParent(data.settings?.parentClass)||data.native&&!nativeTypeReference(data.native)&&!data.native.typeLibrariesOnly)throw Error('독립 BP에서 타입 에셋을 선택하세요. C++ 클래스는 생성 헤더를 포함해 사용하세요.');
 const selected=declaration(source,params.source,params.declarationId),next=structuredClone(data),old=params.variableId?next.variables.find(v=>v.id===params.variableId):null;
 if(params.variableId&&!old)throw Error('변수를 찾을 수 없어요.');const name=params.name??old?.name,container=params.container??old?.container??'single';
 if(typeof name!=='string'||!name.trim()||name.length>80||next.variables.some(v=>v!==old&&v.name===name)||!['single','array'].includes(container)||!old&&next.variables.length>=100)throw Error('변수 이름·컨테이너·개수를 확인하세요.');
 const paths=[...new Set([...(next.native?.typeLibraries||[]),params.source])];next.native={version:1,sourceReference:true,typeLibraries:paths};
 const metadata=await createNativeTypeImportResolver(path=>path===params.source?JSON.stringify(source):readText(path))(next.native),pin=selected.kind==='enum'?{type:'int',enumName:selected.name}:{type:'record',structName:selected.name};
 const unchanged=old&&old.type===pin.type&&old.enumName===pin.enumName&&old.structName===pin.structName&&old.container===container,value=unchanged?old.value:container==='array'?[]:pin.type==='record'?nativeRecordDefault(metadata,pin):metadata.enums.find(e=>e.name===pin.enumName).entries[0].value;
 const variable={...(old||{}),id:old?.id||'var_'+crypto.randomUUID().replaceAll('-',''),name,...pin,container,value};for(const key of ['enumName','enumSource','structName','className','maskEnumName'])if(!Object.hasOwn(pin,key))delete variable[key];
 if(old)next.variables[next.variables.indexOf(old)]=variable;else next.variables.push(variable);
 if(!validBlueprint({...next,native:metadata}))throw Error('변수 자료형과 연결된 값·핀을 확인하세요.');return {data:next,variableId:variable.id,declaration:selected};
}
export async function applyCatalogTypeField(data,source,params,readAsset,{saved}={}){
 const selected=declaration(source,params.source,params.declarationId),next=structuredClone(data),field=next.structs.flatMap(d=>d.fields).find(f=>f.id===params.fieldId);if(!field)throw Error('구조체 필드를 찾을 수 없어요.');
 if(source.id!==next.id)next.imports=[...new Set([...(next.imports||[]),params.source])];
 const libraries=await readNativeTypeDependencies(next,path=>path===params.source?source:readAsset(path));
 if(field.type!==selected.kind||field.typeId!==selected.id){const replacement={...field,type:selected.kind,typeId:selected.id};replacement.value=nativeTypeAssetDefault(next,replacement,{libraries});Object.assign(field,replacement);}
 compileNativeTypeAsset(next,{libraries});if(saved)checkNativeTypeIdentity(saved,next);return {data:next,fieldId:field.id,declaration:selected};
}
export const nativeTypeCatalogContract=Object.freeze({
 owner:'prototype/native-type-catalog.js',read:'project.types.read',apply:'project.types.apply',
 discovery:'Project inventory discovers enum/struct/library assets without reading every body. Select a source asset for declaration ID/name/kind metadata, then resolve only its explicit dependency closure.',
 selection:'A declaration ID plus sourceRevision and target expectedRevision. BP variable create/change or unsaved type-asset field change and required imports are one document Undo. Same type preserves its value.',
 limits:{defaultPage:32,maxPage:128,query:160},
 safety:'Selected source must be saved. Shape discovery is not full dependency validation; application/prepare/save validate the closure. dryRun preserves authored data. Saved field ABI changes, C++/inherited BP auto-include edits are rejected.',
 remaining:['General C++ header type discovery','Runtime global type registry','Destructive type migration']
});
