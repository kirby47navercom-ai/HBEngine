// Free debug camera for editor Play: F8 ejects from the player (the game keeps running, input flies this camera),
// F8 again returns. Simulate starts ejected at the editor camera. W/A/S/D move, Q/E down/up, Shift faster,
// right mouse drag looks around, arrow keys turn.
import * as THREE from 'three';

export class DebugCamera {
  constructor(){this.enabled=false;this.camera=null;this.keys=new Set();this.looking=false;this.last=null;this.yaw=0;this.pitch=0;}
  // Start from another camera (the game camera in use) or from a position looking at a target.
  enable(from,{position,target}={}){
    this.camera=new THREE.PerspectiveCamera(from?.isPerspectiveCamera?from.fov:60,from?.aspect||16/9,.05,100000);
    if(position)this.camera.position.fromArray(position);else if(from)this.camera.position.copy(from.getWorldPosition?from.getWorldPosition(new THREE.Vector3()):from.position);
    if(target)this.camera.lookAt(new THREE.Vector3().fromArray(target));else if(from)this.camera.quaternion.copy(from.getWorldQuaternion?from.getWorldQuaternion(new THREE.Quaternion()):from.quaternion);
    const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=e.y;this.pitch=e.x;
    this.enabled=true;this.keys.clear();this.looking=false;this.last=null;
  }
  disable(){this.enabled=false;this.keys.clear();this.looking=false;this.last=null;}
  // Input queue entries while ejected: keys and mouse drive the camera instead of the game.
  consume(events){
    for(const event of events){
      if(event?.event!=='input')continue;const p=event.packet;
      if(typeof p.key==='string'){const key=p.key.toLowerCase(),down=p.value===undefined||p.value>0;
        if(key==='rightmousebutton'){this.looking=down;this.last=null;}else if(down)this.keys.add(key);else this.keys.delete(key);}
      if(p.pointer?.position&&this.looking){const [x,y]=p.pointer.position;if(this.last){this.yaw-=(x-this.last[0])*.004;this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch-(y-this.last[1])*.004));}this.last=[x,y];}
    }
  }
  update(delta,aspect){
    if(!this.enabled||!this.camera)return;const dt=Math.min(.25,Math.max(0,delta||0)),k=this.keys;
    if(k.has('arrowleft'))this.yaw+=1.6*dt;if(k.has('arrowright'))this.yaw-=1.6*dt;if(k.has('arrowup'))this.pitch=Math.min(1.55,this.pitch+1.2*dt);if(k.has('arrowdown'))this.pitch=Math.max(-1.55,this.pitch-1.2*dt);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));
    const speed=(k.has('shift')?24:7)*dt,forward=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
    if(k.has('w'))this.camera.position.addScaledVector(forward,speed);if(k.has('s'))this.camera.position.addScaledVector(forward,-speed);
    if(k.has('d'))this.camera.position.addScaledVector(right,speed);if(k.has('a'))this.camera.position.addScaledVector(right,-speed);
    if(k.has('e'))this.camera.position.y+=speed;if(k.has('q'))this.camera.position.y-=speed;
    if(aspect>0&&this.camera.aspect!==aspect){this.camera.aspect=aspect;}this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
  }
}
