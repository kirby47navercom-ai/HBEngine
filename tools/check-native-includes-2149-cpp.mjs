import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {activeInstalledVersions} from './install-editor.mjs';import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';import {header,source,files,headerPath,sourcePath,owner} from './native-includes-2148-fixture.mjs';
const active=await activeInstalledVersions('C:/Users/kirby/HBEngine');if(active.length){console.log(JSON.stringify({deferred:true,active,reason:'Installed runtime in use; no compilation or execution started.'}));process.exit(0);}
const work=await fs.mkdtemp(path.resolve('native/build/native-includes-2149-cpp-'));retainTestEvidence(work);let host;
try{
 const engine=process.argv[2]?await fs.realpath(process.argv[2]):path.resolve(import.meta.dirname,'..');
 // Set isolation before importing NativeHost: mutable-path roots are read once.
 process.env.HB_USER_DATA_DIR=path.join(work,'UserData');process.env.LOCALAPPDATA=path.join(work,'LocalAppData');
 const {NativeHost}=await import(pathToFileURL(path.join(engine,'tools/native-host.mjs')));host=new NativeHost();
 const build=await host.build(header,source,{files,headerPath,sourcePath}),objects=[structuredClone(owner)],reply=await host.call(build.token,{key:'nativeCall',nativeId:'ScanOwner.Read',self:owner.id,args:{target:owner.id},objects,overrides:[]});
 assert.equal(reply.outputs.result,42);assert.deepEqual(reply.objects.find(o=>o.id===owner.id).position,[7,3,2]);assert.equal(build.metadata.structs[0].name,'Payload');
 const receipt={passed:true,engine,installed:!!process.argv[2],actualCpp:true,result:reply.outputs.result,position:reply.objects.find(o=>o.id===owner.id).position,files:files.map(f=>({path:f.path,sha256:createHash('sha256').update(f.content).digest('hex')})),scope:'One real C++ worker module with raw documentation, spliced reflected include, ordinary helper header inferred despite raw example and preserved actor origin. No GUI/FPS/device/full-native-SDK claim.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({passed:true,work,result:42,engine}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}finally{host?.close();await pruneTestArtifacts(work);}
