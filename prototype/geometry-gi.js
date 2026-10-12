import {Vector3,Matrix4,DataTexture,RGBAFormat,FloatType,NearestFilter} from 'three';
import {evaluateMaterial,materialVectorValue} from './material-runtime.js';
const v=new Vector3(),matrix=new Matrix4(),instance=new Matrix4();
const finite=values=>values.every(Number.isFinite);
export function buildGeometryBVH(triangles){
 const ordered=[],nodes=[];
 const build=list=>{const index=nodes.length,node={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],start:0,count:0,skip:0};nodes.push(node);for(const t of list)for(const p of t.points)for(let j=0;j<3;j++){node.min[j]=Math.min(node.min[j],p[j]);node.max[j]=Math.max(node.max[j],p[j]);}
  if(list.length<=4){node.start=ordered.length;node.count=list.length;ordered.push(...list);}else{const extent=node.max.map((n,i)=>n-node.min[i]),axis=extent.indexOf(Math.max(...extent));list.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=Math.floor(list.length/2);build(list.slice(0,mid));build(list.slice(mid));}node.skip=nodes.length;return index;};
 if(triangles.length)build([...triangles]);return {nodes,triangles:ordered};
}
export function packGeometryGI(triangles,lights=[]){
 if(triangles.some(t=>t.points.length!==3||t.points.some(p=>p.length!==3||!finite(p))||t.color.length!==3||t.emission.length!==3||t.normal.length!==3||t.center.length!==3||!finite(t.center)||!finite(t.color)||!finite(t.emission)||!finite(t.normal)))throw Error('GI 삼각형 값을 확인하세요.');
 if(lights.some(l=>l.length!==16||!finite(l)))throw Error('GI 광원 값을 확인하세요.');
 const tree=buildGeometryBVH(triangles),values=[],offset=tree.nodes.length*3;for(const n of tree.nodes)values.push(...n.min,n.skip,...n.max,n.start,n.count,0,0,0);
 for(const t of tree.triangles){const [a,b,c]=t.points;values.push(...a,0,...b.map((x,i)=>x-a[i]),0,...c.map((x,i)=>x-a[i]),0,...t.normal,0,...t.color,0,...t.emission,0);}
 const lightsOffset=values.length/4;for(const l of lights)values.push(...l);const width=Math.min(4096,Math.max(1,Math.ceil(values.length/4))),height=Math.max(1,Math.ceil(values.length/(width*4))),data=new Float32Array(width*height*4);if(height>16384||values.length/4>=2**24)throw Error('GI 텍스처 주소가 GPU 한계를 넘었어요.');data.set(values);return {width,height,data,nodeCount:tree.nodes.length,triangleOffset:offset,lightsOffset,lightCount:lights.length,triangles:tree.triangles.length};
}
// shortcut: per-triangle centroid radiance treats masked triangles as solid; use texel/coverage tracing for textured GI.
export function collectGeometryGI(scene,build=true){
 scene.updateMatrixWorld();const triangles=[],lights=[],signature=[];scene.traverseVisible(o=>{
  if(o.isLight){o.getWorldPosition(v);const pos=v.toArray(),type=o.isDirectionalLight?0:o.isPointLight?1:o.isSpotLight?2:-1;if(type>=0){const direction=o.target?o.getWorldPosition(new Vector3()).sub(o.target.getWorldPosition(new Vector3())).normalize():new Vector3(0,0,1);if(type===2)direction.negate();lights.push([...pos,type,...direction.toArray(),o.distance||0,...o.color.toArray(),o.intensity,Math.cos(o.angle||0),Math.cos((o.angle||0)*(1-(o.penumbra||0))),o.decay??2,0]);}signature.push(o.uuid,...o.matrixWorld.elements,...o.color.toArray(),o.intensity,o.distance,o.decay,o.angle,o.penumbra,...(o.target?.matrixWorld.elements||[]));return;}
  if(!o.isMesh||o.userData.editorHelper||o.userData.sprite||o.userData.draw2d||o.geometry.isInstancedBufferGeometry&&!o.isInstancedMesh)return;const g=o.geometry,materials=Array.isArray(o.material)?o.material:[o.material],parts=Array.isArray(o.material)?g.groups:[{start:0,count:g.index?.count||g.attributes.position.count,materialIndex:0}];o.skeleton?.update();signature.push(o.uuid,g.uuid,g.attributes.position,g.attributes.position.version,g.attributes.position.count,g.index,g.index?.version,g.index?.count,g.drawRange.start,g.drawRange.count,...g.groups.flatMap(p=>[p.start,p.count,p.materialIndex]),...Object.values(g.morphAttributes).flatMap(list=>list.flatMap(a=>[a,a.version])),g.attributes.skinIndex,g.attributes.skinIndex?.version,g.attributes.skinWeight,g.attributes.skinWeight?.version,...o.matrixWorld.elements,o.instanceMatrix?.version,o.count,...(o.morphTargetInfluences||[]),...(o.skeleton?.boneMatrices||[]));
  for(const m of materials)signature.push(m?.uuid,m?.visible,m?.transparent,...(m?.color?.toArray()||[]),...(m?.emissive?.toArray()||[]),m?.emissiveIntensity,m?.metalness,JSON.stringify(m?.userData?.materialSource?.surface),JSON.stringify(m?.userData?.materialSource?.parameters),JSON.stringify(m?.userData?.materialSource?.graph));
  const animated=materials.some(m=>m?.userData?.materialSource?.graph?.nodes.some(n=>n.key==='time'));if(animated)signature.push(scene.userData.hbMaterialTime||0);
  if(!build)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiply(instance);}for(const part of parts){const m=materials[part.materialIndex];if(!m?.visible||m.transparent||m.userData.sky||m.userData.hbSky||m.uniforms?.topColor||m.displacementMap||m.positionNode)continue;const start=Math.max(part.start,g.drawRange.start),end=Math.min(part.start+part.count,g.drawRange.start+g.drawRange.count);for(let j=start;j+2<end;j+=3){const points=[0,1,2].map(k=>o.getVertexPosition(g.index?g.index.getX(j+k):j+k,new Vector3()).applyMatrix4(matrix).toArray()),[a,b,c]=points,normal=new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a)));if(normal.lengthSq()<1e-16)continue;normal.normalize();const center=a.map((x,k)=>(x+b[k]+c[k])/3),source=m.userData.materialSource,s=source?evaluateMaterial(source,{linearColors:true,time:scene.userData.hbMaterialTime||0,worldPosition:center,worldNormal:normal.toArray()}):null,color=(s?materialVectorValue(s.color):m.color?.toArray()||[1,1,1]).map(x=>Math.max(0,x)*(1-(s?.metalness??m.metalness??0))),emission=(s?materialVectorValue(s.emissive):m.emissive?.toArray()||[0,0,0]).map(x=>Math.max(0,x)*(s?.emissiveIntensity??m.emissiveIntensity??1));triangles.push({points,normal:normal.toArray(),center:a.map((x,k)=>(x+b[k]+c[k])/3),color,emission});}}}
 });return {triangles,lights,signature};
}
// Rebuild only when scene geometry, transforms, poses, materials or lights change; no GPU readback.
export class GeometryGIWorld{
 constructor(){this.signature=null;this.texture=null;this.packed=null;this.builds=0;}
 prepare(scene){const source=collectGeometryGI(scene,false),key=source.signature;if(this.signature&&key.length===this.signature.length&&key.every((v,i)=>v===this.signature[i]))return this.packed;
  const packed=packGeometryGI(collectGeometryGI(scene).triangles,source.lights);this.texture?.dispose();this.texture=new DataTexture(packed.data,packed.width,packed.height,RGBAFormat,FloatType);this.texture.minFilter=this.texture.magFilter=NearestFilter;this.texture.needsUpdate=true;this.packed=packed;this.signature=[...key];this.builds++;return packed;
 }
 dispose(){this.texture?.dispose();this.texture=null;this.signature=this.packed=null;}
}
