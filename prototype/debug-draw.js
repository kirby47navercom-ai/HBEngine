import * as THREE from 'three';

// Debug draw (Unreal DrawDebugLine/Sphere/Box, Unity Debug.DrawLine): blueprint nodes add shapes that stay for
// `duration` seconds of game time (0 = the current frame) and render as one LineSegments in the game world.
const circle=24;
export class DebugDraw {
  constructor({limit=4096}={}){this.limit=limit;this.shapes=[];this.lines=null;}
  add(shape,now){
    const kind=['line','sphere','box','arrow'].includes(shape?.shape)?shape.shape:null;if(!kind)return;
    const vec=v=>Array.isArray(v)&&v.length>=3&&v.slice(0,3).every(Number.isFinite)?v.slice(0,3):[0,0,0];
    const color=vec(shape.color),duration=Number.isFinite(shape.duration)?Math.max(0,Math.min(3600,shape.duration)):0;
    if(this.shapes.length>=this.limit)this.shapes.shift();
    this.shapes.push({kind,start:vec(shape.start),end:vec(shape.end),center:vec(shape.center),extent:vec(shape.extent),radius:Math.max(0,Number(shape.radius)||0),color:color.some(c=>c>0)?color:[1,.15,.1],until:now+duration});
  }
  segments(){
    const out=[];
    for(const s of this.shapes){
      if(s.kind==='line')out.push([s.start,s.end,s.color]);
      else if(s.kind==='arrow'){out.push([s.start,s.end,s.color]);const d=s.end.map((v,i)=>v-s.start[i]),len=Math.hypot(...d);if(len>1e-6){const u=d.map(v=>v/len),side=Math.abs(u[1])<.95?[0,1,0]:[1,0,0],n=[u[1]*side[2]-u[2]*side[1],u[2]*side[0]-u[0]*side[2],u[0]*side[1]-u[1]*side[0]],nl=Math.hypot(...n),head=Math.min(len*.25,1);
        for(const sign of [1,-1])out.push([s.end,s.end.map((v,i)=>v-u[i]*head+sign*n[i]/nl*head*.5),s.color]);}}
      else if(s.kind==='box'){const [cx,cy,cz]=s.center,[ex,ey,ez]=s.extent,p=(i)=>[cx+(i&1?ex:-ex),cy+(i&2?ey:-ey),cz+(i&4?ez:-ez)];for(const [a,b] of [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]])out.push([p(a),p(b),s.color]);}
      else{const [cx,cy,cz]=s.center,r=s.radius;for(let axis=0;axis<3;axis++)for(let i=0;i<circle;i++){const a=i/circle*Math.PI*2,b=(i+1)/circle*Math.PI*2,pt=t=>{const u=Math.cos(t)*r,v=Math.sin(t)*r;return axis===0?[cx,cy+u,cz+v]:axis===1?[cx+u,cy,cz+v]:[cx+u,cy+v,cz];};out.push([pt(a),pt(b),s.color]);}}
    }
    return out;
  }
  update(world,now){
    this.shapes=this.shapes.filter(s=>s.until>=now);
    const segments=this.segments();
    if(!segments.length){if(this.lines)this.lines.visible=false;return 0;}
    if(!this.lines){this.lines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,toneMapped:false}));this.lines.frustumCulled=false;this.lines.userData.debugDraw=true;}
    if(this.lines.parent!==world)world.add(this.lines);
    const position=new Float32Array(segments.length*6),color=new Float32Array(segments.length*6);
    segments.forEach(([a,b,c],i)=>{position.set(a,i*6);position.set(b,i*6+3);color.set(c,i*6);color.set(c,i*6+3);});
    const g=this.lines.geometry;g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setAttribute('color',new THREE.BufferAttribute(color,3));g.setDrawRange(0,segments.length*2);this.lines.visible=true;
    return segments.length;
  }
  dispose(){this.lines?.removeFromParent();this.lines?.geometry.dispose();this.lines?.material.dispose();this.lines=null;this.shapes=[];}
}
