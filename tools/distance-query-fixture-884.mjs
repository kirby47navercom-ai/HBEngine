import * as G from 'three';import {prepareDistanceFieldMesh,bakeMeshDistanceField} from '../prototype/mesh-distance-field-core.js';import {MeshDistanceFieldAtlas} from '../prototype/mesh-distance-field-atlas.js';
export async function distanceQueryFixture884(kind='overlap-box'){
 const general=kind==='overlap-volume',geometry=general?new G.OctahedronGeometry(1):new G.BoxGeometry(2,2,2),p=geometry.attributes.position,index=geometry.index,count=index?.count??p.count;
 try{
  const mesh=prepareDistanceFieldMesh(Array.from({length:count/3},(_,i)=>({points:[0,1,2].map(j=>{const at=index?index.getX(i*3+j):i*3+j;return [p.getX(at),p.getY(at),p.getZ(at)];})}))),field=await bakeMeshDistanceField(mesh,{resolution:9,preferAnalytic:!general}),objects=kind==='overlap-box'?2048:257,atlas=new MeshDistanceFieldAtlas(),packed=atlas.prepare(Array.from({length:objects},(_,i)=>({id:'query-'+String(i).padStart(5,'0'),field,matrixWorld:new G.Matrix4().makeTranslation(kind==='sparse-box'?i*3:0,0,0)})),{byteBudget:1048576});
  const points=kind==='sparse-box'?[[[0,0,0],20],[[1.5,.25,0],20],[[4.5,0,0],20],[[400.5,0,0],20],[[800,0,0],20]]:[[[0,0,0],20],[[.5,.5,.5],20],[[1,0,0],20],[[2,0,0],20],[[21,0,0],20],[[21.25,0,0],20]];
  return {kind,objects,packed,packet:{data:[...packed.data],width:packed.width,height:packed.height,encodedSize:packed.encodedSize,points}};
 }finally{geometry.dispose();}
}
