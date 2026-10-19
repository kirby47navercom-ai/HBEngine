import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {rayChannelMetadata,rayStaticChannel} from '../prototype/ray-channel-layout.js';import {rayProgramLayouts} from '../prototype/ray-materials.js';import {rayProgramGLSL} from '../prototype/ray-material-shader.js';import {channelLayoutFixture863} from './channel-layout-fixture-863.mjs';
const keys=[];for(let rotate=0;rotate<4;rotate++){
 const f=channelLayoutFixture863({rotate}),channels=f.program.instructions.filter(i=>i[0]===6);keys.push(f.program.key);assert.deepEqual(channels.map(rayStaticChannel),Array.from({length:4},(_,i)=>(i+rotate)%4));
 const changed=channelLayoutFixture863({rotate,values:[-3,4,5,6]});assert.equal(changed.program.key,f.program.key,'mutable literal does not change layout key');
 const old=channelLayoutFixture863({rotate,legacy:true});assert(old.program.instructions.filter(i=>i[0]===6).every(i=>rayStaticChannel(i)===null));const source=rayProgramGLSL([f.program]),legacy=rayProgramGLSL([old.program]);assert(!source.includes('a[int(value.x)]'));assert(legacy.includes('a[int(value.x)]'));
}
assert.equal(new Set(keys).size,4,'authored selector change invalidates immutable layout/cache');
for(const metadata of [[-1,1,0],[4,1,0],[.5,1,0],[0,2,0],[0,1,1]])assert.throws(()=>rayStaticChannel([6,0,1,4,-1,-1,-1,-1,...metadata]));
assert.deepEqual(rayChannelMetadata([6,0,1,4,-1,-1,-1,-1,.5,0,0]),[0,0,0],'non-static legacy selector keeps fallback');
const original=[0,0,4,4,-1,-1,-1,-1,1,2,3,4],plain=rayProgramLayouts([[original]],[3])[0];assert.deepEqual(plain.instructions[0].slice(8),[0,0,0]);
const report={passed:true,keys,mutableLiteralPreserved:true,legacyDynamicPreserved:true,malformedFlagRejected:true,scope:'CPU layout identity and generated GLSL only; actual GPU values/differentials/native compatibility are separate gates.'};await fs.writeFile('native/build/channel-layout-863.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
