import * as THREE from 'three';

// Software occlusion culling (Intel MOC / Umbra style, runtime only): the camera's big opaque meshes are rasterized into
// a small CPU depth buffer, then objects whose bounding sphere is fully behind it skip the main pass (shadows still draw).
// Conservative: triangles are written by pixel centre at their farthest vertex depth, then the buffer is eroded by one
// pixel (each pixel keeps the farthest depth of its 3x3 neighbourhood) so occluder edges never over-cover; a tested
// sphere uses its nearest depth and every pixel its screen rect touches.
// ponytail: CPU raster of up to 16 occluders at 128 px wide; a GPU Hi-Z readback if occluder counts must grow.
export class SoftwareOcclusion {
  constructor({width=128,maxOccluders=16,maxTriangles=4000,frameTriangles=6000,minScreenRadius=.08,refreshFrames=30}={}){
    Object.assign(this,{width,maxOccluders,maxTriangles,frameTriangles,minScreenRadius,refreshFrames});
    this.height=0;this.depth=null;this.view=new THREE.Matrix4();this.projection=new THREE.Matrix4();this.matrix=new THREE.Matrix4();
    this.v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];this.p=new THREE.Vector3();this.frame=0;this.candidates=[];this.occluders=new Set();
    this.stats={occluders:0,triangles:0,tested:0,culled:0};this.active=false;
  }
  // Candidate occluders: visible opaque, static-shaped, indexed meshes with few triangles (refreshed every refreshFrames).
  static candidate(node){
    if(!node.isMesh||node.isSkinnedMesh||node.isInstancedMesh||node.morphTargetInfluences?.length||!node.visible||!node.frustumCulled)return false;
    const m=node.material;if(Array.isArray(m)||!m||m.transparent||m.alphaTest>0||m.opacity<1||m.side===THREE.BackSide||m.isShaderMaterial||m.isPointsMaterial||m.isLineBasicMaterial)return false;
    const g=node.geometry,position=g?.attributes?.position;if(!position||g.isInstancedBufferGeometry)return false;
    const triangles=(g.index?g.index.count:position.count)/3;return triangles>=2;
  }
  begin(scene,camera,aspect,frustum){
    this.active=false;this.occluders.clear();this.stats={occluders:0,triangles:0,tested:0,culled:0};
    if(!camera.isPerspectiveCamera||!(aspect>0))return;
    this.height=Math.max(8,Math.round(this.width/aspect));const size=this.width*this.height;if(this.depth?.length!==size)this.depth=new Float32Array(size);this.depth.fill(Infinity);
    this.view.copy(camera.matrixWorldInverse);this.projection.copy(camera.projectionMatrix);this.near=camera.near;
    if(this.frame++%this.refreshFrames===0||this.candidates.some(n=>!n.parent)){const list=[];scene.traverseVisible(node=>{if(SoftwareOcclusion.candidate(node)&&(node.geometry.index?node.geometry.index.count:node.geometry.attributes.position.count)/3<=this.maxTriangles)list.push(node);});this.candidates=list;}
    const sphere=new THREE.Sphere(),center=new THREE.Vector3(),scored=[];
    for(const node of this.candidates){if(!node.parent||!node.visible)continue;const g=node.geometry;g.boundingSphere||g.computeBoundingSphere();sphere.copy(g.boundingSphere).applyMatrix4(node.matrixWorld);if(frustum&&!frustum.intersectsSphere(sphere))continue;
      center.copy(sphere.center).applyMatrix4(this.view);const depth=-center.z;if(depth<=this.near)continue;const screen=sphere.radius*this.projection.elements[5]/depth;if(screen>=this.minScreenRadius)scored.push([screen,node]);}
    scored.sort((a,b)=>b[0]-a[0]);
    for(const [,node] of scored.slice(0,this.maxOccluders)){const g=node.geometry,tris=(g.index?g.index.count:g.attributes.position.count)/3;if(this.stats.triangles+tris>this.frameTriangles)continue;this.rasterize(node);this.occluders.add(node);}
    this.erode();
    this.stats.occluders=this.occluders.size;this.active=this.occluders.size>0;
  }
  rasterize(node){
    const g=node.geometry,position=g.attributes.position,index=g.index,count=index?index.count:position.count,W=this.width,H=this.height,depth=this.depth,[a,b,c]=this.v;
    this.matrix.multiplyMatrices(this.view,node.matrixWorld);
    for(let t=0;t+2<count;t+=3){
      const ia=index?index.getX(t):t,ib=index?index.getX(t+1):t+1,ic=index?index.getX(t+2):t+2;
      a.fromBufferAttribute(position,ia).applyMatrix4(this.matrix);b.fromBufferAttribute(position,ib).applyMatrix4(this.matrix);c.fromBufferAttribute(position,ic).applyMatrix4(this.matrix);
      const da=-a.z,db=-b.z,dc=-c.z;if(da<=this.near||db<=this.near||dc<=this.near)continue; // crossing the near plane: dropped (never adds occlusion)
      const far=Math.max(da,db,dc);
      for(const v of this.v){v.applyMatrix4(this.projection);v.x=(v.x*.5+.5)*W;v.y=(1-(v.y*.5+.5))*H;}
      let area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<1e-9)continue;const s=area>0?-1:1;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(W-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(H-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      const edges=[[a,b],[b,c],[c,a]].map(([p,q])=>{const ex=(q.y-p.y)*s,ey=-(q.x-p.x)*s;return [ex,ey,-(ex*p.x+ey*p.y)];});
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const px=x+.5,py=y+.5;let inside=true;for(const [ex,ey,ec] of edges)if(ex*px+ey*py+ec<0){inside=false;break;}
        if(inside){const k=y*W+x;if(far<depth[k])depth[k]=far;}}
      this.stats.triangles++;
    }
  }
  erode(){
    const W=this.width,H=this.height,src=this.depth,out=this.eroded?.length===src.length?this.eroded:(this.eroded=new Float32Array(src.length));
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){let far=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;const d=yy<0||xx<0||yy>=H||xx>=W?Infinity:src[yy*W+xx];if(d>far)far=d;}out[y*W+x]=far;}
  }
  // True when the world-space sphere is hidden behind the occluders everywhere it could appear on screen.
  occludedSphere(sphere,node){
    if(!this.active||this.occluders.has(node))return false;this.stats.tested++;
    this.p.copy(sphere.center).applyMatrix4(this.view);const nearest=-this.p.z-sphere.radius;if(nearest<=this.near)return false;
    const e=this.projection.elements,sx=e[0]*sphere.radius/nearest,sy=e[5]*sphere.radius/nearest,cx=e[0]*this.p.x/-this.p.z+e[8]*0,cy=e[5]*this.p.y/-this.p.z;
    const W=this.width,H=this.height,x0=Math.floor(((cx-sx)*.5+.5)*W),x1=Math.floor(((cx+sx)*.5+.5)*W),y0=Math.floor((1-((cy+sy)*.5+.5))*H),y1=Math.floor((1-((cy-sy)*.5+.5))*H);
    if(x1<0||y1<0||x0>=W||y0>=H)return false;if(x0<0||y0<0||x1>=W||y1>=H)return false; // partly off the buffer: keep
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!(this.eroded[y*W+x]<nearest))return false;
    this.stats.culled++;return true;
  }
}
