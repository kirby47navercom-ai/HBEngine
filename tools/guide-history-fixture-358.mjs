import * as G from 'three';
import {timedNormalFixture} from './rendering-187-fixture.mjs';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {rayGuidePreviousFields} from '../prototype/ray-surface-history-context.js';
import assert from 'node:assert/strict';

// A closed room gives the mirror a diffuse second hit. Only the surface input
// changes with time; the camera, triangle and normal map stay committed.
export function guideHistoryFixture358(field=0,{primaryNormal=null,primaryMirror=false}={}){
 const f=timedNormalFixture('static'),extras=[],geometry=new G.BoxGeometry(1,1,1);
 try{
  if(primaryNormal){const pixel=primaryNormal==='flat'?[128,128,255,255]:[180,128,240,255];f.texture.image.data.set([...pixel,...pixel]);f.texture.needsUpdate=true;}f.mesh.scale.set(4,4,1);f.mesh.rotation.y=.12;
  Object.assign(f.data.surface,{metalness:field===0||primaryMirror?1:0,roughness:field===0||primaryMirror?.02:1,clearcoat:field>=5?1:0,clearcoatRoughness:.02});
  const root=f.data.graph.nodes.find(n=>n.key==='surface'),time=makeMaterialNode('time'),amount=makeMaterialNode('multiply'),bias=makeMaterialNode('add');amount.inputValues={b:.01};bias.inputValues={b:field===7?.2:.02};f.data.graph.nodes.push(time,amount,bias);
  const wire=(a,p,b,q)=>f.data.graph.edges.push({from:{node:a.id,pin:p},to:{node:b.id,pin:q}});wire(time,'value',amount,'a');wire(amount,'value',bias,'a');wire(bias,'value',root,({0:'roughness',1:'baseColor',5:'clearcoatRoughness',6:'specularIntensity',7:'sheenRoughness',8:'iridescence'})[field]);
  for(const[x,y,z,sx,sy,sz]of[[0,0,-3,12,12,.1],[-5,0,2,.1,12,12],[5,0,2,.1,12,12],[0,-5,2,12,.1,12],[0,5,2,12,.1,12],[0,0,7,12,12,.1]]){const mesh=new G.Mesh(geometry,new G.MeshPhysicalMaterial({roughness:1}));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);f.scene.add(mesh);extras.push(mesh);}
  f.prepare(0);f.world.commit();const p=f.prepare(.5),historyFields=rayGuidePreviousFields(p.rayInfo.programs);assert.ok(historyFields.includes(field),JSON.stringify({field,historyFields}));assert.ok(p.motionOffset>0,'committed normal and positions must be present');
  return {data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:[...p.geometryRecords.slice(0,3),1],transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,1,1,p.motionOffset],limits:[4096,.00001,p.lightsOffset,p.lightCount],previousTime:p.previousMaterialTime,currentTime:.5,field,historyFields};
 }finally{geometry.dispose();for(const mesh of extras)mesh.material.dispose();f.dispose();}
}
