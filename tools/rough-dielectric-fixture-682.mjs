import * as G from 'three';
import assert from 'node:assert/strict';
import {GeometryGIWorld} from '../prototype/geometry-gi.js';
import {makeMaterialNode,materialDefaults} from '../prototype/material-runtime.js';
import {rayMaterialFixture} from './ray-material-fixture.mjs';
// Static world-position roughness; translating both scene and camera changes the
// current input without inventing a time dependency or invalidating the atlas.
export function roughDielectricFixture682({roughOn=true,bias=.2,ior=1.5,rate=.01,shift=.075}={}){
 const scene=new G.Scene(),world=new GeometryGIWorld(),plane=new G.PlaneGeometry(8,8),glass=new G.MeshPhysicalMaterial(),backMaterial=new G.MeshPhysicalMaterial(),surface=makeMaterialNode('surface'),position=makeMaterialNode('worldPosition'),x=makeMaterialNode('dot'),multiply=makeMaterialNode('multiply'),add=makeMaterialNode('add');
 x.inputValues={b:[1,0,0]};multiply.inputValues={b:rate};add.inputValues={b:bias};const nodes=[surface,position,x,multiply,add],edges=[],wire=(a,p,b,q)=>edges.push({from:{node:a.id,pin:p},to:{node:b.id,pin:q}});
 wire(position,'value',x,'a');wire(x,'value',multiply,'a');wire(multiply,'value',add,'a');wire(add,'value',surface,'roughness');glass.userData.materialSource={surface:{...materialDefaults,transmission:1,roughness:bias,ior,closedVolume:0},graph:{nodes,edges}};
 const backSource=rayMaterialFixture('normal'),bytes=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++)bytes.set([Math.floor(x/8)%2?32:224,128,224,255],(y*64+x)*4);
 const texture=new G.DataTexture(bytes,64,64);texture.flipY=false;texture.wrapS=texture.wrapT=G.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=G.LinearMipmapLinearFilter;texture.magFilter=G.LinearFilter;texture.needsUpdate=true;
 backMaterial.userData.materialSource=backSource;backMaterial.userData.rayTextures=()=>[{map:texture,type:'texture2d',parameter:'Bands',path:'Assets/RayBands.svg'}];
 const front=new G.Mesh(plane,glass),back=new G.Mesh(plane,backMaterial);back.position.z=-3;scene.add(front,back);
 try{world.prepare(scene,true,null,true,true,false,true);world.commit();scene.position.x=shift;const p=world.prepare(scene,true,null,true,true,false,true);assert(p.motionOffset>0&&p.previousGeometry.nodeCount>0);return {roughOn,bias,ior,rate,cameraShift:shift,data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:[...p.geometryRecords.slice(0,3),1],transport:[p.materialsOffset,p.transportVersion,0,64],pathFilter:[.8,1,1,p.motionOffset],limits:[4096,1e-5,p.lightsOffset,p.lightCount],previousTime:0,currentTime:0,field:0};}
 finally{world.dispose();plane.dispose();glass.dispose();backMaterial.dispose();texture.dispose();}
}
export function expectedRoughDielectric682(backend,uv,packet){
 const camera=new G.PerspectiveCamera(60,1,.1,30);camera.coordinateSystem=backend==='webgl'?2000:2001;camera.position.set(.05,.03,4);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const inverse=new G.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).invert(),ray=at=>new G.Vector3(at[0]*2-1,backend==='webgl'?at[1]*2-1:1-at[1]*2,backend==='webgl'?.9999*2-1:.9999).applyMatrix4(inverse).sub(camera.position).normalize(),d=ray(uv),spread=Math.max(ray([uv[0]+1/16,uv[1]]).distanceTo(d),ray([uv[0],uv[1]+1/16]).distanceTo(d)),first=4/-d.z,point=camera.position.clone().addScaledVector(d,first),ratio=1/packet.ior,cosine=Math.sqrt(1-ratio*ratio*(1-d.z*d.z)),second=3/cosine;
 const oldRough=packet.bias+packet.rate*point.x,currentRough=oldRough+packet.rate*packet.cameraShift,rough=r=>packet.roughOn&&r>=.05&&Math.abs(ratio-1)>.0001,grow=r=>rough(r)?Math.min(1.57,spread+Math.max(.02,r)**2*.5):Math.min(1.57,spread*ratio*Math.abs(d.z)/Math.max(.01,cosine)),now=grow(currentRough),old=grow(oldRough),valid=rough(oldRough)===rough(currentRough);
 return {oldRough,currentRough,valid,value:[spread*first+now*(second-2e-5),spread*first+old*second,now,valid?old:-1]};
}
export function roughDielectricProbe682(source,packet){
 source=source.replace('const vp=new C.Matrix4()', 'const previousVP=new C.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);camera.position.x+=packet.cameraShift;camera.lookAt(packet.cameraShift,0,0);camera.updateMatrixWorld();const vp=new C.Matrix4()').replace('u.hbPreviousVP.value.copy(vp)','u.hbPreviousVP.value.copy(previousVP)').replace("(key==='inverseVP'?inverse:vp).clone()","(key==='inverseVP'?inverse:key==='previousVP'?previousVP:vp).clone()");
 source=source.replace('const u=pass.material.uniforms;', 'if(packet.roughOn)pass.material.defines.HB_PATH_ROUGH_DIELECTRIC=1;else delete pass.material.defines.HB_PATH_ROUGH_DIELECTRIC;const u=pass.material.uniforms;').replace('packet.field>=5,false,null,','packet.field>=5,packet.roughOn,null,');return source;
}
export const roughDielectricPixels682=[{x:8,y:8,uv:[.53125,.53125]},{x:7,y:8,uv:[.46875,.53125]},{x:8,y:7,uv:[.53125,.46875]}];
