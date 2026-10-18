import assert from 'node:assert/strict';
import {previousContextFixtures} from './previous-context-fixture.mjs';
// Reuse real graph/texture/pose packets, assigning the normal graph to two more
// fields without changing its IR, atlas texture inputs, or committed geometry.
export function previousSurfaceFixtures353(){
 const fixtures=previousContextFixtures();
 for(const f of fixtures)for(const[packet,id]of[[f.prior,0],[f.current,f.id]]){
  const count=packet.geometryRecords[0],raw=logical=>logical>=packet.geometryInfo[3]+count*6?logical-count:logical,read=logical=>packet.data.slice(raw(logical)*4,raw(logical)*4+4),transport=packet.transport[0]+id*2+1,attributes=read(transport)[2],material=read(attributes+1)[2],normal=read(material+7);assert.ok(attributes>0&&normal[1]>0&&normal[3]>0);
  const pointer=packet.data.length/4+count,header=Array(48).fill(0);for(let n=0;n<10;n++)header.splice(n*4,4,...read(material+n));header.splice(4,4,...normal);header.splice(40,4,0,.1,0,0);header.splice(44,4,...normal);
  packet.data.push(...header);packet.height=Math.ceil(packet.data.length/(packet.width*4));while(packet.data.length<packet.width*packet.height*4)packet.data.push(0);packet.geometryInfo[1]=packet.height;if(count)packet.geometryRecords[1]=packet.width*packet.height+count;
  packet.data[raw(attributes+1)*4+2]=pointer;packet.data[raw(attributes+1)*4+3]=6;
  const program=packet.rayInfo.programs.find(p=>p.key===normal[3]);assert.ok(program);program.fields=[...new Set([...(program.fields||[3]),0,3,5])].sort();packet.rayInfo.fields=[...new Set([...(packet.rayInfo.fields||[]),0,3,5])].sort();packet.rayInfo.advanced=true;
 }
 const legacy=structuredClone(fixtures.find(f=>f.mode==='worldNormal:smooth'));legacy.mode='legacy:physical-flags';legacy.prior.transport[1]=legacy.current.transport[1]=1;fixtures.push(legacy);return fixtures;
}
