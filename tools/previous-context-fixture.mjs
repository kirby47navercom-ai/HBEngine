import * as THREE from 'three';
import {timedNormalFixture} from './rendering-187-fixture.mjs';
import {makeMaterialNode} from '../prototype/material-runtime.js';

export function previousContextFixtures(){
 const cases=[];
 for(const variant of ['worldPosition','worldNormal','viewDirection','normal','worldPositionUV','worldNormalUV','viewDirectionUV','worldPositionUV:morph','worldNormal:morph','normal:morph','worldPositionUV:skin','worldNormal:skin','normal:instance','worldNormal:smooth','worldNormalUV:smooth','normal:smooth','worldPosition:smooth']){
  const [mode,deformation]=variant.split(':');const f=timedNormalFixture(mode.endsWith('UV')?'normal':mode);let bone;
  try{
   if(mode.endsWith('UV')){const g=f.data.graph,uv=g.nodes.find(n=>n.key==='uv'),pad=makeMaterialNode('add'),split=makeMaterialNode('split'),combine=makeMaterialNode('combine');uv.key=mode.slice(0,-2);pad.inputValues.b=[0,0,0,0];g.nodes.push(pad,split,combine);for(const e of g.edges)if(e.from.node===uv.id)e.from={node:combine.id,pin:'rg'};g.edges.push({from:{node:uv.id,pin:'value'},to:{node:pad.id,pin:'a'}},{from:{node:pad.id,pin:'value'},to:{node:split.id,pin:'value'}},...['x','y'].map(pin=>({from:{node:split.id,pin},to:{node:combine.id,pin}})));}
   if(mode==='normal'||mode.endsWith('UV')){
    const size=32,bytes=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)bytes.set((x+y)%2?[255,96,180,255]:[64,192,255,255],(y*size+x)*4);
    f.texture.generateMipmaps=true;f.texture.image={data:bytes,width:size,height:size};f.texture.minFilter=THREE.LinearMipmapLinearFilter;f.texture.magFilter=THREE.LinearFilter;f.texture.wrapS=f.texture.wrapT=THREE.RepeatWrapping;f.texture.needsUpdate=true;
   }
   if(deformation==='smooth')f.mesh.geometry.setAttribute('normal',new THREE.Float32BufferAttribute([[.5,.1,1],[-.2,.5,1],[.1,-.3,1],[-.4,-.2,1]].flatMap(n=>new THREE.Vector3(...n).normalize().toArray()),3));
   if(deformation==='morph'){const g=f.mesh.geometry;g.morphTargetsRelative=true;g.morphAttributes.position=[new THREE.Float32BufferAttribute([0,0,.2,0,0,-.1,0,0,.05,0,0,-.15],3)];g.morphAttributes.normal=[new THREE.Float32BufferAttribute([.2,.1,0,-.1,.2,0,.15,-.15,0,-.2,.05,0],3)];f.mesh.updateMorphTargets();f.mesh.morphTargetInfluences[0]=.25;}
   if(deformation==='skin'){const original=f.mesh,g=original.geometry;g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array(16).fill(0),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array.from({length:4},()=>[1,0,0,0]).flat(),4));const mesh=new THREE.SkinnedMesh(g,f.material);bone=new THREE.Bone();mesh.add(bone);mesh.bind(new THREE.Skeleton([bone]));bone.rotation.y=.15;f.scene.remove(original);f.scene.add(mesh);f.mesh=mesh;}
   if(deformation==='instance'){const original=f.mesh,mesh=new THREE.InstancedMesh(original.geometry,f.material,1);mesh.setMatrixAt(0,new THREE.Matrix4().makeRotationZ(.15));f.scene.remove(original);f.scene.add(mesh);f.mesh=mesh;}
   f.mesh.position.set(.2,-.3,.1);f.mesh.rotation.set(.1,-.2,.15);f.mesh.scale.set(.8,1.3,1.1);
   const original=f.prepare(.2),source=original.frameTriangles[0].sourceID,point=original.frameTriangles[0].points.reduce((out,p,i)=>out.map((v,k)=>v+p[k]*[.2,.3,.5][i]),[0,0,0]);
   const packet=p=>({data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,0,1,p.motionOffset],forward:[0,0,-1,p.previousMaterialTime??.2]});
   const prior=packet(original);f.world.commit();if(deformation==='morph')f.mesh.morphTargetInfluences[0]=.75;if(bone)bone.rotation.y=.45;if(deformation==='instance'){f.mesh.setMatrixAt(0,new THREE.Matrix4().makeRotationX(.4));f.mesh.instanceMatrix.needsUpdate=true;}f.mesh.position.set(1.3,-.7,.4);f.mesh.rotation.set(.3,.5,-.25);f.mesh.scale.set(-1.5,.6,1.2);const now=f.prepare(.7),id=now.frameTriangles.findIndex(t=>t.sourceID===source);
   cases.push({mode:variant,prior,current:packet(now),id,point,view:new THREE.Vector3(.2,.3,1).normalize().toArray(),width:.003,currentWidth:.12});
  }catch(error){throw Error(variant+': '+error.message,{cause:error});}finally{f.dispose();}
 }
 return cases;
}
