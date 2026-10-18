import * as G from 'three';import assert from 'node:assert/strict';import {GeometryGIWorld} from '../prototype/geometry-gi.js';import {makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';

export function previousMediaFixture371(){
 const scene=new G.Scene(),world=new GeometryGIWorld(),meshes=[],materials=[];
 try{
  for(const[size,ior]of [[8,1.3],[4,1.5],[1.5,1.1]]){const material=new G.MeshPhysicalMaterial({transmission:1,ior});material.userData.materialSource={surface:{...materialDefaults,transmission:1,ior,roughness:.02,closedVolume:1,attenuationColor:"#804020",attenuationDistance:2},graph:{nodes:[makeMaterialNode('surface')],edges:[]}};const mesh=new G.Mesh(new G.BoxGeometry(size,size,size),material);scene.add(mesh);meshes.push(mesh);materials.push(material);}
  world.prepare(scene,true,null,true,true,false,true);world.commit();for(const mesh of meshes)mesh.position.x=20;const p=world.prepare(scene,true,null,true,true,false,true);assert.ok(p.previousGeometry.nodeCount>0);assert.equal(p.mediumCount,3);
  const rows=[{point:[.13,.17,0],expected:[3,1.1,1,3]},{point:[.13,.17,1],expected:[2,1.5,1,2]},{point:[.13,.17,3],expected:[1,1.3,1,1]},{point:[.13,.17,6],expected:[0,1,0,0]},{point:[20.13,.17,0],expected:[0,1,0,0],currentExpected:[3,1.1,0,0],currentRGBA:[...new G.Color('#804020').toArray().map(v=>-Math.log(v)/2),1.1]}];
  return {packet:{data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,64],pathFilter:[.8,0,1,p.motionOffset],forward:[0,0,-1,0],geometry:[1,100,4,1],geometryLimits:[4096,1e-5,p.lightsOffset,p.lightCount],pathOptions:[1,1,0,1]},rows};
 }finally{world.dispose();for(const mesh of meshes)mesh.geometry.dispose();for(const material of materials)material.dispose();}
}
