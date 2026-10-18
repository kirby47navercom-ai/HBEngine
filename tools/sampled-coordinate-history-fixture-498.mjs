import * as THREE from 'three';import {timedNormalFixture} from './rendering-187-fixture.mjs';import {makeMaterialNode} from '../prototype/material-runtime.js';
export const sampledCoordinateKinds498=Object.freeze(['texture2d','texturearray','texture3d','texturecube']);
export function sampledCoordinateHistoryFixture498(kind){
 if(!sampledCoordinateKinds498.includes(kind))throw Error('Unknown sampled coordinate kind');
 const f=timedNormalFixture('normal');let warp;
 try{
  f.mesh.geometry.dispose();f.mesh.geometry=new THREE.PlaneGeometry(4,4);f.mesh.position.x=10000000;
  f.texture.type=THREE.FloatType;f.texture.image={data:Float32Array.from({length:64*4},(_,i)=>i%4===0?Math.floor(i/4)%2:i%4===3?1:.5),width:64,height:1};f.texture.generateMipmaps=true;f.texture.minFilter=THREE.LinearMipmapLinearFilter;f.texture.magFilter=THREE.NearestFilter;f.texture.wrapS=f.texture.wrapT=THREE.RepeatWrapping;f.texture.needsUpdate=true;
  const slice=()=>Float32Array.from({length:4*4*4},(_,i)=>i%4===0?Math.floor(i/4)%4/3:i%4===1?Math.floor(i/16)/3:i%4===3?1:0);
  if(kind==='texturecube')warp=new THREE.CubeTexture(Array.from({length:6},()=>new THREE.DataTexture(slice(),4,4,THREE.RGBAFormat,THREE.FloatType)));
  else if(kind==='texturearray'||kind==='texture3d'){const bytes=new Float32Array(4*4*4*3);for(let z=0;z<3;z++)bytes.set(slice(),z*64);warp=kind==='texturearray'?new THREE.DataArrayTexture(bytes,4,4,3):new THREE.Data3DTexture(bytes,4,4,3);warp.type=THREE.FloatType;}
  else warp=new THREE.DataTexture(slice(),4,4,THREE.RGBAFormat,THREE.FloatType);
  warp.generateMipmaps=false;warp.minFilter=warp.magFilter=THREE.LinearFilter;warp.wrapS=warp.wrapT=warp.wrapR=THREE.ClampToEdgeWrapping;warp.needsUpdate=true;
  const graph=f.data.graph,target=graph.nodes.find(n=>n.key==='texture'),edge=graph.edges.find(e=>e.to.node===target.id&&e.to.pin==='uv'),source=edge.from,warpNode=makeMaterialNode({texture2d:'texture',texturearray:'sampleArray',texture3d:'sampleVolume',texturecube:'sampleCube'}[kind]),coordinate=makeMaterialNode('add'),combine=makeMaterialNode('combine'),scale=makeMaterialNode('multiply');
  warpNode.texture='Assets/Warp'+kind+'.'+(kind==='texture2d'?'svg':kind==='texturearray'?'hbtexturearray.json':kind==='texture3d'?'hbvolumetexture.json':'hbcubemap.json');warpNode.parameter='Warp';warpNode.colorSpace='linear';coordinate.inputValues={b:kind==='texture3d'?[0,0,.5]:kind==='texturecube'?[0,0,1]:[0,0]};scale.inputValues={b:32};graph.nodes.push(warpNode,coordinate,combine,scale);
  const wire=(from,to,pin)=>graph.edges.push({from,to:{node:to.id,pin}});wire(source,coordinate,'a');wire({node:coordinate.id,pin:'value'},warpNode,kind==='texturecube'?'direction':'uv');wire({node:warpNode.id,pin:'r'},combine,'x');wire({node:warpNode.id,pin:'g'},combine,'y');wire({node:combine.id,pin:'rg'},scale,'a');edge.from={node:scale.id,pin:'value'};
  f.material.userData.rayTextures=()=>[{map:f.texture,type:'texture2d',parameter:'Bands',path:'Assets/RayBands.svg'},{map:warp,type:kind,parameter:'Warp',path:warpNode.texture}];
  const pack=p=>({data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,0,1,p.motionOffset],forward:[0,0,-1,p.previousMaterialTime??0]});
  const priorPacket=f.prepare(0),triangle=priorPacket.frameTriangles[0],sourceID=triangle.sourceID,point=triangle.points.reduce((out,p,i)=>out.map((v,k)=>v+p[k]*[.3,.3,.4][i]),[0,0,0]),prior=pack(priorPacket);f.world.commit();f.mesh.position.set(10000002,.4,.2);f.mesh.rotation.set(.2,.5,-.3);f.mesh.scale.set(-1.2,.8,1.1);const current=f.prepare(.5);
  return{kind,prior,current:pack(current),id:current.frameTriangles.findIndex(t=>t.sourceID===sourceID),point,view:[0,0,1],width:.5,currentWidth:.0001,expectedWideNormal:[0,0,1,0],expectedNarrowMagnitude:1,oracle:'The target normal map alternates +/-X per texel. A full coarsest mip is (.5,.5,.5), decoded through the existing zero-normal +Z fallback; narrow samples stay +/-X. First warp is a bilinear 4x4 gradient without mips; three slices/six faces share that gradient.'};
 }finally{if(warp?.isCubeTexture)for(const face of warp.image)face.dispose();warp?.dispose();f.dispose();}
}
