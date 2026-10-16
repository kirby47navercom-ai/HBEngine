import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {packagedRuntimeBytes} from './packaged-runtime.mjs';
import {moduleClosure} from './build-game.mjs';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/packaged-runtime-'));retainTestEvidence(work);const root=path.join(work,'node_modules/three'),build=path.join(root,'build');await fs.mkdir(build,{recursive:true});await fs.copyFile('node_modules/three/package.json',path.join(root,'package.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),sizes=[];
for(const name of ['three.core.js','three.module.js','three.webgpu.js','three.tsl.js']){
 const source='node_modules/three/build/'+name,original=await fs.readFile(source),packed=await packagedRuntimeBytes(source);assert.ok(packed.length<original.length,name);assert.match(packed.toString(),/@license[\s\S]*SPDX-License-Identifier: MIT/);assert.equal(/three\.[\w.]+\.min\.js/.test(packed.toString()),false);await fs.writeFile(path.join(build,name),packed);assert.equal(sha(await fs.readFile(source)),sha(original));sizes.push({name,original:original.length,packed:packed.length,saved:original.length-packed.length});
}
const M=await import(pathToFileURL(path.join(build,'three.module.js'))),G=await import(pathToFileURL(path.join(build,'three.webgpu.js'))),T=await import(pathToFileURL(path.join(build,'three.tsl.js'))),original=await import('three');assert.deepEqual(Object.keys(M).sort(),Object.keys(original).sort());assert.ok(new G.Mesh() instanceof M.Mesh);assert.equal(new M.MeshStandardMaterial().type,'MeshStandardMaterial');assert.equal(new G.MeshStandardNodeMaterial().type,'MeshStandardNodeMaterial');assert.equal(T.vec3(1,2,3).isNode,true);assert.deepEqual(new M.Vector3(1,2,3).applyMatrix4(new M.Matrix4().makeTranslation(2,3,4)).toArray(),[3,5,7]);
const closure=await moduleClosure('prototype/player.js');assert.equal([...closure].some(file=>/three\.[\w.]+\.min\.js$/.test(file)),false);for(const name of ['three.core.js','three.module.js','three.webgpu.js','three.tsl.js'])assert.ok(closure.has(path.resolve('node_modules/three/build',name)),name);const ordinary='prototype/player.js';assert.deepEqual(await packagedRuntimeBytes(ordinary),await fs.readFile(ordinary));
const result={passed:true,sourcePreserved:true,licensePreserved:true,exportsIdentical:true,coreIdentityShared:true,classicAndNodeMaterialTypes:true,tsl:true,noDuplicateMinImports:true,ordinaryFilesUnchanged:true,sizes,totalSaved:sizes.reduce((n,row)=>n+row.saved,0)};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
