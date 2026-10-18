import * as G from 'three';import assert from 'node:assert/strict';import {GeometryGIWorld} from '../prototype/geometry-gi.js';import {makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';

export function previousMediumGuideFixture372(moved=false){
 const scene=new G.Scene(),world=new GeometryGIWorld(),meshes=[],materials=[];
 try{
  for(const[size,ior]of [[12,1.3],[4,1.5],[1.5,1.1]]){const material=new G.MeshPhysicalMaterial({transmission:1,ior});material.userData.materialSource={surface:{...materialDefaults,transmission:1,ior,roughness:.02,closedVolume:1},graph:{nodes:[makeMaterialNode('surface')],edges:[]}};const mesh=new G.Mesh(new G.BoxGeometry(size,size,size),material);scene.add(mesh);meshes.push(mesh);materials.push(material);}
  const back=new G.Mesh(new G.PlaneGeometry(16,16),new G.MeshPhysicalMaterial({roughness:1}));back.position.z=-3;scene.add(back);meshes.push(back);materials.push(back.material);if(moved)meshes[0].position.z=11;world.prepare(scene,true,null,true,true,false,true);world.commit();meshes[0].position.z=0;const p=world.prepare(scene,true,null,true,true,false,true);assert.ok(p.previousGeometry.nodeCount>0);assert.equal(p.mediumCount,3);
  return {data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:[...p.geometryRecords.slice(0,3),1],transport:[p.materialsOffset,p.transportVersion,0,64],pathFilter:[.8,1,1,p.motionOffset],limits:[4096,1e-5,p.lightsOffset,p.lightCount],pathOptions:[1,1,0,1],previousTime:0,currentTime:.5,field:0};
 }finally{world.dispose();for(const mesh of meshes)mesh.geometry.dispose();for(const material of materials)material.dispose();}
}

export function mediumGuideProbe372(source){
 return source.replace('packet.rayInfo.fields,false,sample','packet.rayInfo.fields,true,sample').replace('true,false,false),worldAt','true,false,true),worldAt').replace('true,true,false);guide.setSize','true,true,true);guide.setSize').replace("'path','pathLens']","'path','pathLens','pathOptions']").replace('u.coordinates.value.set(1,0,-2,1);','u.coordinates.value.set(1,0,-2,1);u.pathOptions.value.fromArray(packet.pathOptions);').replace('u.hbGeometry.value.set(1,30,4,1);','u.hbGeometry.value.set(1,30,4,1);u.hbPathOptions.value.fromArray(packet.pathOptions);').replaceAll('.value.set(1,4,0,0)','.value.set(1,16,0,0)');
}
