import assert from 'node:assert/strict';import {previousContextFixtures} from './previous-context-fixture.mjs';
export function previousFieldsFixtures361(){
 const wanted=['worldPosition:smooth','worldNormalUV:smooth','viewDirectionUV','normal:morph','worldPositionUV:skin'],fixtures=previousContextFixtures().filter(f=>wanted.includes(f.mode));assert.equal(fixtures.length,wanted.length);
 for(const f of fixtures)for(const[packet,id]of[[f.prior,0],[f.current,f.id]]){
  const count=packet.geometryRecords[0],raw=logical=>logical>=packet.geometryInfo[3]+count*6?logical-count:logical,read=logical=>packet.data.slice(raw(logical)*4,raw(logical)*4+4),attributes=read(packet.transport[0]+id*2+1)[2],material=read(attributes+1)[2],normal=read(material+7),header=[];assert.ok(attributes>0&&normal[1]>0);
  for(let field=0;field<10;field++)header.push(...(field<5?read(material+field*2):[[0,.1,0,0],[1,1,1,1],[1,1,1,.5],[0,1.3,400,0],[0,0,1,0]][field-5]),...normal);
  const pointer=packet.data.length/4+count;packet.data.push(...header);packet.height=Math.ceil(packet.data.length/(packet.width*4));while(packet.data.length<packet.width*packet.height*4)packet.data.push(0);packet.geometryInfo[1]=packet.height;if(count)packet.geometryRecords[1]=packet.width*packet.height+count;packet.data[raw(attributes+1)*4+2]=pointer;packet.data[raw(attributes+1)*4+3]=10;
  const program=packet.rayInfo.programs.find(p=>p.key===normal[3]);assert.ok(program);program.fields=Array.from({length:10},(_,i)=>i);packet.rayInfo.fields=[...program.fields];packet.rayInfo.advanced=true;
 }
 const legacy=structuredClone(fixtures.find(f=>f.mode==='worldPosition:smooth'));legacy.mode='legacy:all-defaults';legacy.prior.transport[1]=legacy.current.transport[1]=1;fixtures.push(legacy);return fixtures;
}
