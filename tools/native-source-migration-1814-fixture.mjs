import fs from 'node:fs/promises';import path from 'node:path';
import {typeMigration1700Fixture} from './native-type-migration-1700-fixture.mjs';
import {header as originalHeader,headerPath,sourcePath} from './native-record-fixture-1472.mjs';
import {readNativeHeader} from '../prototype/native-model.js';

export async function sourceMigration1814Fixture(work,{copies=0}={}){
 const f=await typeMigration1700Fixture(work,{copies}),commonPath='Source/Records/CombatTypes.h',at=originalHeader.indexOf('HB_CLASS'),before=originalHeader.slice(0,at).replace(':std::uint8_t',':std::int32_t'),ownerHeader='#pragma once\n#include "CombatTypes.h"\n'+originalHeader.slice(at),after=before.replace('hb::Vec3 Direction={1,2,3};','hb::Vec3 Direction={1,2,3};HB_PROPERTY(BlueprintReadWrite) float Weight=2.0f;');
 await f.project.write(commonPath,before);await f.project.write(headerPath,ownerHeader);
 for(const file of (await f.project.files()).filter(r=>r.kind==='blueprint')){const bp=JSON.parse(await fs.readFile(path.join(f.root,file.path),'utf8'));if(bp.native){bp.native={version:1,sourceReference:true,headerPath,sourcePath};bp.settings.parentClass='RecordOwner';await f.project.write(file.path,JSON.stringify(bp));}}
 const cpp=JSON.parse(await fs.readFile(path.join(f.root,f.cppPath),'utf8')),readText=name=>fs.readFile(path.join(f.root,name),'utf8');cpp.native={...await readNativeHeader(ownerHeader,{sourcePath:headerPath,readText}),header:ownerHeader,source:await readText(sourcePath),headerPath,sourcePath};await f.project.write(f.cppPath,JSON.stringify(cpp));
 return{...f,commonPath,before,after,headerPath,sourcePath,ownerHeader};
}
