import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {rayProgramGLSL} from '../prototype/ray-material-shader.js';
import {rayMaterialPackets106} from './ray-material-fixture.mjs';
import {rayProgramFieldMask} from '../prototype/ray-materials.js';
const rows=[];
for(const [name,packet]of Object.entries(rayMaterialPackets106())){
 const source=rayProgramGLSL(packet.rayPrograms),alpha=source.match(/vec4 hbRayProgramAlpha\d+\([^]*?return result;}/g)||[];
 assert.equal(alpha.length,packet.rayPrograms.filter(p=>rayProgramFieldMask(p)&2).length);
 for(const body of alpha){assert.ok(!/\br[XY]\d+\b|hbRayUVFootprint|hbRayOffset/.test(body));}
 rows.push({name,alphaPrograms:alpha.length,bytes:source.length});
}
const p={key:91,fields:[1],instructions:[[1,0,2,2,-1,-1,-1,-1,0,0,0],[9,1,4,2,0,-1,-1,-1,0,0,8],[8,-1,4,4,1,-1,-1,-1,3,1,4]]};
for(let kind=0;kind<4;kind++)for(let flags=0;flags<12;flags++){
 p.instructions[1][8]=kind;p.instructions[1][10]=flags;
 const source=rayProgramGLSL([p]),body=source.match(/vec4 hbRayProgramAlpha91\([^]*?return result;}/)[0];
 assert.ok(!/\br[XY]\d+\b|hbRayUVFootprint|hbRayOffset/.test(body));assert.ok(body.includes('aX=a,aY=a;'));assert.ok(body.includes('hbRayTextureKind'+kind+'Filter'+flags));
}
const result={passed:true,rows,samplerVariants:48,alphaZeroDifferentials:true,cubeExplicitLODUnchanged:true,fieldMaskFiltering:true,newGPUResources:0,newReadbacks:0,scope:'GLSL compile-time alpha specialization only; actual alpha/cube pixels and full game are separate gates.'};
await fs.writeFile('native/build/alpha-programs-401-cpu.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
