const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((v,n,k)=>v+n*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function raycastGeometry(tree,origin,direction,{maxDistance=Infinity,minDistance=1e-7,ignore=null,anyHit=false}={}){
 let closest=maxDistance,result=null;
 for(let at=0;at<tree.nodes.length;){const node=tree.nodes[at];let near=minDistance,far=closest;
  for(let k=0;k<3;k++){if(Math.abs(direction[k])<1e-30){if(origin[k]<node.min[k]||origin[k]>node.max[k]){far=-Infinity;break;}}else{let a=(node.min[k]-origin[k])/direction[k],b=(node.max[k]-origin[k])/direction[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}}
  if(near>far){at=node.skip;continue;}
  if(node.count)for(let i=node.start;i<node.start+node.count;i++){const triangle=tree.triangles[i];if(triangle===ignore)continue;const[a,b,c]=triangle.points,e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<1e-12||triangle.doubleSided===false&&(triangle.backSide?det>0:det<0))continue;const t=sub(origin,a),u=dot(t,p)/det;if(u<0||u>1)continue;const q=cross(t,e1),v=dot(direction,q)/det;if(v<0||u+v>1)continue;const distance=dot(e2,q)/det;if(distance<=minDistance||distance>=closest)continue;closest=distance;result={triangle,distance,weights:[1-u-v,u,v],point:origin.map((n,k)=>n+direction[k]*distance),front:det>0};if(anyHit)return result;}
  at++;
 }return result;
}
