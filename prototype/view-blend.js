// Set View Target with Blend: when the chosen game camera changes to a new view target, the rendered camera moves from the
// previous view to the new one over the blend time (position lerp, rotation slerp, field of view lerp).
import * as THREE from 'three';

export class ViewBlend {
  constructor(){this.camera=new THREE.PerspectiveCamera(60,16/9,.05,100000);this.target=null;this.from=null;this.start=0;this.duration=0;}
  // last: the camera rendered last frame; chosen: the camera picked this frame; request: {id, blend} from the node.
  resolve(last,chosen,request,now){
    if(request&&request.id!==this.target){this.target=request.id;this.duration=Math.max(0,Number(request.blend)||0);this.start=now;
      this.from=last?{position:last.getWorldPosition(new THREE.Vector3()),quaternion:last.getWorldQuaternion(new THREE.Quaternion()),fov:last.isPerspectiveCamera?last.fov:60}:null;}
    if(!this.from||!chosen?.isPerspectiveCamera||this.duration<=0)return chosen;
    const t=Math.min(1,(now-this.start)/this.duration);if(t>=1){this.from=null;return chosen;}
    const k=t*t*(3-2*t),c=this.camera;
    c.position.copy(this.from.position).lerp(chosen.getWorldPosition(new THREE.Vector3()),k);
    c.quaternion.copy(this.from.quaternion).slerp(chosen.getWorldQuaternion(new THREE.Quaternion()),k);
    c.fov=this.from.fov+(chosen.fov-this.from.fov)*k;c.aspect=chosen.aspect;c.near=chosen.near;c.far=chosen.far;c.updateProjectionMatrix();c.updateMatrixWorld(true);
    return c;
  }
}
