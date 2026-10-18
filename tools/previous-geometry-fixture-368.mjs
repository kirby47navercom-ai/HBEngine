import assert from 'node:assert/strict';import * as G from 'three';import {GeometryGIWorld} from '../prototype/geometry-gi.js';import {rayMaterialFixture} from './ray-material-fixture.mjs';

export function previousGeometryFixtures368(){
 const cases=[];
 for(const mode of ['shared-instances','masked']){
  const scene=new G.Scene(),world=new GeometryGIWorld(),geometry=mode==='masked'?new G.PlaneGeometry(4,4):new G.BoxGeometry(1,1,1),materials=[],meshes=[];let texture;
  try{
   if(mode==='masked'){
    const glass=new G.Mesh(geometry,new G.MeshPhysicalMaterial({transmission:1,roughness:.02}));scene.add(glass);meshes.push(glass);materials.push(glass.material);
    const source=rayMaterialFixture('mask'),material=new G.MeshPhysicalMaterial();source.graph.nodes.find(n=>n.key==='texture').texture='Assets/Mask.svg';source.surface.closedVolume=0;material.userData.materialSource=source;texture=new G.DataTexture(new Uint8Array([255,255,255,0,255,255,255,255]),2,1);texture.magFilter=texture.minFilter=G.NearestFilter;texture.flipY=false;texture.needsUpdate=true;material.userData.rayTextures=()=>[{map:texture,type:'texture2d',parameter:'Bands',path:'Assets/Mask.svg'}];const mask=new G.Mesh(geometry,material);mask.position.z=1;scene.add(mask);meshes.push(mask);materials.push(material);
   }else{
    const material=new G.MeshPhysicalMaterial({transmission:1,roughness:.02});materials.push(material);for(let i=0;i<12;i++){const mesh=new G.Mesh(geometry,material);mesh.position.set((i%4)*2-3,Math.floor(i/4)*2-2,0);scene.add(mesh);meshes.push(mesh);}
   }
   world.prepare(scene,true,null,true,true,false,true);world.commit();for(let i=0;i<meshes.length;i++){meshes[i].position.x+=20+i*.1;meshes[i].rotation.set(.2,.4,.1);meshes[i].scale.set(i%2?-1.2:1.3,.7,1.1);}
   const packed=world.prepare(scene,true,null,true,true,false,true);assert.ok(packed.previousGeometry.nodeCount>0);assert.equal(!!packed.geometryRecords[0],mode==='shared-instances');
   const old=packed.frameTriangles.map((t,id)=>({id,points:world.motion.get(t.sourceID),mask:mode==='masked'&&t.instanceID===meshes[1].uuid+':0'})),rays=[];
   const origins=mode==='masked'?[[-1,.13,4],[1,.13,4],[5,.13,4]]:meshes.map((mesh,i)=>[(i%4)*2-3+.17,Math.floor(i/4)*2-2+.13,5]);
   for(const origin of origins)for(const [direction,maxDistance] of [[[0,0,-1],30],[[1e-9,0,-1],30],[[0,0,1],30],[[0,0,-1],.1]]){
    const ray=new G.Ray(new G.Vector3(...origin),new G.Vector3(...direction).normalize());let closest=maxDistance,id=-1;
    for(const t of old){const p=ray.intersectTriangle(...t.points.map(p=>new G.Vector3(...p)),false,new G.Vector3());if(!p||t.mask&&p.x<0)continue;const distance=p.distanceTo(ray.origin);if(distance>1e-5&&distance<closest){closest=distance;id=t.id;}}
    rays.push({origin,direction:ray.direction.toArray(),maxDistance,expected:[closest,id,id<0?0:1,1]});
   }
   cases.push({mode,packet:{data:[...packed.data],width:packed.width,height:packed.height,rayInfo:packed.rayInfo,geometryInfo:[packed.width,packed.height,packed.nodeCount,packed.triangleOffset],geometryRecords:packed.geometryRecords,transport:[packed.materialsOffset,packed.transportVersion,0,32],pathFilter:[.8,0,1,packed.motionOffset],forward:[0,0,-1,0],geometryLimits:[4096,1e-5,packed.lightsOffset,packed.lightCount]},rays,storage:packed.previousGeometry});
  }finally{world.dispose();geometry.dispose();for(const material of materials)material.dispose();texture?.dispose();}
 }
 return cases;
}

export function previousGeometryTraversalFixtures368(){
 const base=previousGeometryFixtures368().find(f=>f.mode==='masked'),missing=structuredClone(base),limited=structuredClone(base);
 missing.mode='missing-bvh';missing.packet.data[(missing.packet.pathFilter[3]+1)*4+3]=0;missing.rays=[{origin:[0,0,4],direction:[0,0,-1],maxDistance:30,expected:[30,-1,0,0]}];
 const p=limited.packet,pointer=p.data.length/4,count=4097;p.data[(p.pathFilter[3]+1)*4+3]=pointer;p.data[(p.pathFilter[3]+2)*4+3]=count;
 // A synthetic long walk checks failure closure without manufacturing thousands of scene assets.
 for(let i=0;i<count;i++)p.data.push(-10,-10,-10,i===0?count:i+1,10,10,10,0,0,0,0,0);
 p.height=Math.ceil(p.data.length/(p.width*4));while(p.data.length<p.width*p.height*4)p.data.push(0);p.geometryInfo[1]=p.height;
 limited.mode='incomplete-walk';limited.rays=[{origin:[0,0,4],direction:[0,0,-1],maxDistance:30,expected:[30,-1,0,0]},{origin:[20,0,4],direction:[0,0,-1],maxDistance:30,expected:[30,-1,0,1]}];
 return [missing,limited];
}
