import * as G from 'three';import assert from 'node:assert/strict';import {timedNormalFixture} from './rendering-187-fixture.mjs';

export function previousVisibilityFixture369(blocked){
 const f=timedNormalFixture('static'),geometry=new G.PlaneGeometry(16,16),back=new G.Mesh(geometry,new G.MeshPhysicalMaterial({roughness:1})),block=new G.Mesh(new G.PlaneGeometry(1.5,1.5),new G.MeshPhysicalMaterial({roughness:1}));
 try{
  f.texture.image.data.set([128,128,255,255,128,128,255,255]);f.texture.needsUpdate=true;f.mesh.scale.set(8,8,1);Object.assign(f.data.surface,{transmission:1,ior:1.2,roughness:.02,closedVolume:0});back.position.z=-3;block.position.set(blocked?0:5,0,1);f.scene.add(back,block);f.prepare(0);f.world.commit();block.position.x=5;const p=f.prepare(.5);assert.ok(p.previousGeometry.nodeCount>0);const packet={data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:[...p.geometryRecords.slice(0,3),1],transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,1,1,p.motionOffset],limits:[4096,.00001,p.lightsOffset,p.lightCount],previousTime:p.previousMaterialTime,currentTime:.5,field:0};return packet;
 }finally{f.dispose();geometry.dispose();back.material.dispose();block.geometry.dispose();block.material.dispose();}
}

export function visibilityProbe369(source,orthographic){
 source=source.replace('true,false,false),worldAt','true,false,true),worldAt').replace('true,true,false);guide.setSize','true,true,true);guide.setSize');
 if(orthographic){const camera='new C.PerspectiveCamera(60,1,.1*worldScale,30*worldScale)';assert.equal(source.split(camera).length-1,1,'scaled camera fixture anchor');source=source.replace(camera,'new C.OrthographicCamera(-2*worldScale,2*worldScale,2*worldScale,-2*worldScale,.1*worldScale,30*worldScale)').replaceAll('...camera.position.toArray(),0','...camera.position.toArray(),1');}
 return source;
}
