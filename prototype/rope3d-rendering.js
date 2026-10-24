import * as T from 'three';
const TAU=Math.PI*2;
// Fixed topology tube over the physical particle chain. No TubeGeometry rebuild,
// camera-facing ribbon, extra solver or per-frame vector allocation.
export function buildRope3D(group,p,own){
 const count=p.particles,sides=p.renderSides,vertices=count*(sides+1),positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),uv=new Float32Array(vertices*2),indices=new Uint32Array((count-1)*sides*6),rest=new Float32Array(count*3),point=new T.Vector3(),end=new T.Vector3(...p.end);
 for(let i=0;i<count;i++){point.fromArray(p.start).lerp(end,i/(count-1)).toArray(rest,i*3);for(let side=0;side<=sides;side++){const at=i*(sides+1)+side;uv[at*2]=i/(count-1);uv[at*2+1]=side/sides;if(i<count-1&&side<sides){const next=side+1,a=at,b=i*(sides+1)+next,c=(i+1)*(sides+1)+side,d=(i+1)*(sides+1)+next;indices.set([a,c,b,b,c,d],(i*sides+side)*6);}}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(new T.BufferAttribute(indices,1));const material=new T.MeshStandardMaterial({color:0xd3b981,roughness:.8,side:T.DoubleSide}),mesh=new T.Mesh(geometry,material);mesh.userData.cloth=true;mesh.userData.rope3d=true;mesh.userData.hbMotionVectors='perVertex';own(group,geometry);own(group,material);group.add(mesh);
 group.userData.clothMesh={rope:true,p,mesh,geometry,rest,points:new Float32Array(count*3),version:null,inverse:new T.Matrix4(),point,tangent:new T.Vector3(),normal:new T.Vector3(),binormal:new T.Vector3(),axis:new T.Vector3()};updateRope3D(group,false);
}
export function updateRope3D(group,running){
 const state=group.userData.clothMesh;if(!state?.rope)return;const frame=running?group.userData.clothFrame:null,version=frame?.version??-1;if(state.version===version&&state.generation===frame?.generation)return;const source=frame?.positions||state.rest,{p,points,geometry,point,tangent,normal,binormal,axis}=state;if(source.length!==points.length)return;
 state.inverse.copy(group.matrixWorld).invert();for(let i=0;i<p.particles;i++){point.fromArray(source,i*3);if(frame)point.applyMatrix4(state.inverse);point.toArray(points,i*3);}
 const positions=geometry.attributes.position.array,normals=geometry.attributes.normal.array;
 for(let i=0;i<p.particles;i++){
  const prev=Math.max(0,i-1)*3,next=Math.min(p.particles-1,i+1)*3;tangent.set(points[next]-points[prev],points[next+1]-points[prev+1],points[next+2]-points[prev+2]);if(tangent.lengthSq()<1e-16)tangent.set(1,0,0);else tangent.normalize();
  if(i)normal.addScaledVector(tangent,-normal.dot(tangent));if(!i||normal.lengthSq()<1e-12){const x=Math.abs(tangent.x),y=Math.abs(tangent.y),z=Math.abs(tangent.z);axis.set(x<=y&&x<=z?1:0,y<x&&y<=z?1:0,z<x&&z<y?1:0);normal.crossVectors(tangent,axis);}normal.normalize();binormal.crossVectors(tangent,normal).normalize();
  for(let side=0;side<=p.renderSides;side++){const angle=side/p.renderSides*TAU,c=Math.cos(angle),s=Math.sin(angle),at=(i*(p.renderSides+1)+side)*3,nx=normal.x*c+binormal.x*s,ny=normal.y*c+binormal.y*s,nz=normal.z*c+binormal.z*s;positions[at]=points[i*3]+nx*p.renderWidth/2;positions[at+1]=points[i*3+1]+ny*p.renderWidth/2;positions[at+2]=points[i*3+2]+nz*p.renderWidth/2;normals[at]=nx;normals[at+1]=ny;normals[at+2]=nz;}
 }
 geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;geometry.computeBoundingSphere();geometry.computeBoundingBox();state.version=version;state.generation=frame?.generation;
}
