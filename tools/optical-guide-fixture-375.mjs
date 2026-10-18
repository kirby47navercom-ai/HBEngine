import * as G from 'three';import {GeometryGIWorld} from '../prototype/geometry-gi.js';import {rayMaterialFixture} from './ray-material-fixture.mjs';

export function opticalGuideFixture375(){
 const scene=new G.Scene(),world=new GeometryGIWorld(),plane=new G.PlaneGeometry(4,4),glass=new G.MeshPhysicalMaterial({transmission:1,ior:1.5,roughness:.02}),surface=rayMaterialFixture('normal'),material=new G.MeshPhysicalMaterial(),bytes=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)bytes.set([Math.floor(x/8)%2?32:224,128,224,255],(y*64+x)*4);
 const texture=new G.DataTexture(bytes,64,64);texture.flipY=false;texture.wrapS=texture.wrapT=G.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=G.LinearMipmapLinearFilter;texture.magFilter=G.LinearFilter;texture.needsUpdate=true;surface.graph.nodes.find(n=>n.key==='texture').texture='Assets/Footprint.svg';material.userData.materialSource=surface;material.userData.rayTextures=()=>[{map:texture,type:'texture2d',parameter:'Bands',path:'Assets/Footprint.svg'}];const front=new G.Mesh(plane,glass),back=new G.Mesh(plane,material);back.position.z=-3;scene.add(front,back);
 try{world.prepare(scene,true,null,true,true,false,true);world.commit();const p=world.prepare(scene,true,null,true,true,false,true);return {data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:[...p.geometryRecords.slice(0,3),1],transport:[p.materialsOffset,p.transportVersion,0,64],pathFilter:[.8,1,1,p.motionOffset],limits:[4096,1e-5,p.lightsOffset,p.lightCount],previousTime:0,currentTime:0,field:0};}finally{world.dispose();plane.dispose();glass.dispose();material.dispose();texture.dispose();}
}

export function expectedOpticalWidth375(backend,uv){
 const camera=new G.PerspectiveCamera(60,1,.1,30);camera.coordinateSystem=backend==='webgl'?2000:2001;camera.position.set(.05,.03,4);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();const inverse=new G.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).invert(),ray=at=>new G.Vector3(at[0]*2-1,backend==='webgl'?at[1]*2-1:1-at[1]*2,backend==='webgl'?.9999*2-1:.9999).applyMatrix4(inverse).sub(camera.position).normalize(),d=ray(uv),spread=Math.max(ray([uv[0]+1/16,uv[1]]).distanceTo(d),ray([uv[0],uv[1]+1/16]).distanceTo(d)),ratio=1/1.5,cosine=Math.sqrt(1-ratio*ratio*(1-d.z*d.z)),nextSpread=Math.min(1.57,spread*ratio*Math.abs(d.z)/Math.max(.01,cosine)),width=spread*(4/-d.z)+nextSpread*(3/cosine);return [width,width,nextSpread,nextSpread];
}

export function opticalGuideGL375(source,mode){
 const marker='return vec4(oldUV.xy,expected,coc);';if(!source.includes(marker))throw Error('optical guide GL return marker');
 if(mode==='width')return source.replace(marker,'return vec4(width,oldWidth,cone.y,oldSpread);');
 source=source.replace('vec3 nearPoint=hbWorldAt(uv,0.0)','float probeOriginalSpread=0.0;vec3 nearPoint=hbWorldAt(uv,0.0)').replace('oldSpread=oldCone.y;','oldSpread=oldCone.y;probeOriginalSpread=oldSpread;');
 return source.replace(marker,'return vec4(hbRayField3Lod(hit.y,p,-direction,width).x,hbRayPreviousField3TimeLod(hit.y,oldP,oldView,oldWidth,vec2(hbForward.w,1)).x,hbRayPreviousField3TimeLod(hit.y,oldP,oldView,oldWidth+(probeOriginalSpread-oldSpread)*oldSecondary,vec2(hbForward.w,1)).x,1);');
}

export function opticalGuideGPU375(source,mode){
 const marker='result.assign(T.vec4(previousValid.and(inside).select(at.xy,T.vec2(-1)),expected,coc));';if(!source.includes(marker))throw Error('optical guide GPU return marker');
 if(mode==='width')return source.replace(marker,'result.assign(T.vec4(width,oldWidth,cone.y,oldSpread));');
 source=source.replace('const uv=T.uv(),','const probeOriginalSpread=T.float(0).toVar();const uv=T.uv(),').replace('oldSpread.assign(previousCone.y);','oldSpread.assign(previousCone.y);probeOriginalSpread.assign(oldSpread);');
 return source.replace(marker,'result.assign(T.vec4(transport.ray.field(hit.y,p,direction.negate(),3,width).x,priorRay.field(hit.y,oldP,oldView,3,oldWidth,false,T.vec2(u.forward.w,1)).x,priorRay.field(hit.y,oldP,oldView,3,oldWidth.add(probeOriginalSpread.sub(oldSpread).mul(oldSecondary)),false,T.vec2(u.forward.w,1)).x,1));');
}
