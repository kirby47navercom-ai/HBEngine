// Built-in shapes carry a lightmap UV (UV1): inside 0..1 and one disjoint tile per geometry group.
import assert from 'node:assert/strict';
import {scenePrimitives} from '../prototype/scene-primitives.js';

const primitives=scenePrimitives({color:'#888888',roughness:.8,metalness:0}),checked={};
for(const kind of ['cube','sphere','cylinder','cone','capsule','plane']){
  const group=primitives.build({id:kind,kind,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[]});const meshes=[];group.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if(!meshes.length)continue;
  for(const mesh of meshes){
    const g=mesh.geometry,uv1=g.getAttribute('uv1');assert.ok(uv1,kind+' has UV1');
    for(let i=0;i<uv1.count;i++)assert.ok(uv1.getX(i)>=0&&uv1.getX(i)<=1&&uv1.getY(i)>=0&&uv1.getY(i)<=1,kind+' UV1 inside 0..1');
    const groups=g.groups.length?g.groups:[{start:0,count:g.index?g.index.count:uv1.count}],boxes=groups.map(gr=>{const b=[1,1,0,0];for(let j=gr.start;j<gr.start+gr.count;j++){const v=g.index?g.index.getX(j):j;b[0]=Math.min(b[0],uv1.getX(v));b[1]=Math.min(b[1],uv1.getY(v));b[2]=Math.max(b[2],uv1.getX(v));b[3]=Math.max(b[3],uv1.getY(v));}return b;});
    for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const p=boxes[a],q=boxes[b];assert.ok(p[2]<=q[0]||q[2]<=p[0]||p[3]<=q[1]||q[3]<=p[1],kind+' group tiles do not overlap');}
    checked[kind]=groups.length;
  }
}
assert.equal(checked.cube,6,'cube: one tile per face');
console.log(JSON.stringify({passed:true,groups:checked}));
