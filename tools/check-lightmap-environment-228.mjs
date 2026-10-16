import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DataTexture,RGBAFormat,HalfFloatType,Group} from 'three';
import {lightmapSceneSnapshot} from '../prototype/lightmap-scene.js';
import {lightmapEnvironmentRadiance} from '../prototype/lightmap-environment.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve(import.meta.dirname,'../native/build/lightmap-environment-228-'));retainTestEvidence(work);
try{
 const pixels=new Uint16Array([0x4000,0x3c00,0x3800,0x3c00]),map=new DataTexture(pixels,1,1,RGBAFormat,HalfFloatType),root=new Group();root.userData.skyEnvironment={path:'Assets/Sky.hdr',texture:map};const rows=[{object:{id:'Sky'},root,contribute:false}],ambient={color:[1,1,1,1],groundColor:[.1,.1,.1,1],indirectIntensity:3,source:{object:'Sky',path:'Assets/Sky.hdr',rotation:90}};
 const result=await lightmapSceneSnapshot(rows,[],{ambient});assert.equal(result.environment.rotation,90);assert.equal(result.environment.texture.float,true);assert.deepEqual([...result.environment.texture.pixels],[2,1,.5,1]);assert.deepEqual(lightmapEnvironmentRadiance(result.environment,[1,0,0]),[6,3,1.5]);pixels[0]=0;assert.equal(result.environment.texture.pixels[0],2);assert.equal(result.meshes.length,0);assert.equal(result.lights.length,0);
 assert.equal((await lightmapSceneSnapshot(rows,[],{ambient:{...ambient,indirectIntensity:0}})).environment,null);assert.deepEqual((await lightmapSceneSnapshot(rows,[],{ambient:{...ambient,source:null}})).environment.color,[1,1,1]);delete root.userData.skyEnvironment;await assert.rejects(lightmapSceneSnapshot(rows,[],{ambient}),/HDRI/);map.dispose();
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,checks:['actual HalfFloat HDRI copied to immutable linear worker snapshot','selected source rotation and indirect intensity','no fake geometry or light from environment actor','disabled and hemisphere fallback states','missing selected HDRI fails explicitly']},null,2));console.log(JSON.stringify({work,passed:true}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack}));throw error;}
