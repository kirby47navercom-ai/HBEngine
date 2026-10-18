import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {rayTextureNeedsFootprint,rayCoordinateInstructions} from '../prototype/ray-mip.js';
import {rayProgramGLSL} from '../prototype/ray-material-shader.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/ray-footprint-304-'));retainTestEvidence(work);
const texture=(kind,flags,source=0,dest=2)=>[9,dest,4,4,source,1,-1,-1,kind,0,flags],point=[3,0,3,3,-1,-1,-1,-1,0,0,0],layer=[0,1,1,1,-1,-1,-1,-1,0,0,0],store=source=>[8,-1,4,4,source,-1,-1,-1,0,4,4],expected=[];
try{
 for(let kind=0;kind<4;kind++)for(let flags=0;flags<12;flags++){
  const required=kind!==3&&flags!==0&&flags!==11,op=texture(kind,flags),instructions=[point,layer,op,store(2)];expected.push(required);assert.equal(rayTextureNeedsFootprint(op),required);assert.deepEqual([...rayCoordinateInstructions(instructions)],required?[0,1]:[]);const source=rayProgramGLSL([{key:1,fields:[1],instructions}]),body=source.split('vec4 hbRayProgram1(')[1].split('return result;}')[0];assert.equal(body.includes('vec4 rX0='),required);assert.ok(body.includes(required?'aX=rX0':'aX=a'));
 }
 const nested=[point,layer,texture(0,0),texture(0,8,2,3),store(3)],code=rayProgramGLSL([{key:1,fields:[1],instructions:nested}]);assert.deepEqual([...rayCoordinateInstructions(nested)],[2,1]);assert.ok(code.includes('rX2=vX'));assert.ok(!code.includes('rX0'));assert.ok(code.includes('vec4 vX=v;'));
 const overwritten=[point,layer,texture(0,8),[0,0,3,3,-1,-1,-1,-1,0,0,0],texture(0,0,0,3),store(3)],mixed=rayProgramGLSL([{key:1,fields:[1],instructions:overwritten}]);assert.ok(mixed.includes('aX=rX0'));assert.ok(mixed.includes('aX=a'));assert.ok(!rayCoordinateInstructions(overwritten).has(3));
 const generated=await fs.readFile('native/include/HBEngine/RayPrograms.hpp','utf8'),match=generated.match(/textureFootprints\[48\]=\{([^}]+)\}/);assert.ok(match);assert.deepEqual(match[1].split(',').map(v=>v==='true'),expected);assert.ok(generated.includes('alpha||!textureFootprints[i[8]*12+i[10]]||i[4]<0'));assert.ok(generated.includes('if(i[0]!=9)for(int j=0;j<4;j++)'));assert.ok(generated.includes('if(uses(1,true))'));
 await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify({passed:true,variants:48,explicitCubeLOD:true,independentFilterTruthTable:true,nestedImageCoordinates:true,registerOverwrite:true,nativeParity:true,packetAndKeyUnchanged:true,scope:'Derivative liveness and native generated source; actual pixels/driver results are separate gates.'},null,2));console.log(JSON.stringify({work,passed:true,variants:48}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack},null,2));throw error;}
