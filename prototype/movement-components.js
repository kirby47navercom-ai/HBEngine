// Rotating Movement, Projectile Movement and Spring Arm components, stepped once per game frame after blueprint Tick.
// trace(start,end) returns a hit ({hit,position,normal,actor}); update(object) pushes the transform to rendering.
import {Vector3} from 'three';
import {sceneWorldMatrix,sceneWorldPosition,setSceneWorldPosition} from './scene-runtime.js';
import {componentDefaults} from './scene-components.js';

const props=(o,type)=>{const c=o.components?.find(c=>c.type===type&&c.properties?.enabled!==false);return c&&{...componentDefaults(type),...c.properties};};
const wrap=v=>((v+180)%360+360)%360-180;
const direction=(o,objects,local)=>new Vector3(...local).transformDirection(sceneWorldMatrix(o,objects)).toArray();

export class MovementComponents {
  constructor(){this.projectiles=new Map();this.arms=new Map();}
  async step(objects,dt,{trace,update}){
    for(const o of objects){if(o.poolActive===false)continue;
      const rotating=props(o,'RotatingMovement');
      if(rotating){o.rotation=o.rotation.map((v,i)=>wrap(v+(Number(rotating.rotationRate[i])||0)*dt));update?.(o);}
      const projectile=props(o,'ProjectileMovement');
      if(projectile)await this.projectile(o,objects,projectile,dt,trace,update);
      const arm=props(o,'SpringArm');
      if(arm)await this.arm(o,objects,arm,dt,trace,update);
    }
  }
  async projectile(o,objects,p,dt,trace,update){
    let state=this.projectiles.get(o.id);
    if(!state){state={velocity:direction(o,objects,[0,0,1]).map(v=>v*p.initialSpeed),stopped:false};this.projectiles.set(o.id,state);}
    if(state.stopped)return;const v=state.velocity;v[1]-=9.81*p.gravityScale*dt;
    const speed=Math.hypot(...v);if(p.maxSpeed>0&&speed>p.maxSpeed)for(let i=0;i<3;i++)v[i]*=p.maxSpeed/speed;
    const from=sceneWorldPosition(o,objects);let to=from.map((x,i)=>x+v[i]*dt);
    const hit=trace&&Math.hypot(...v)*dt>1e-9?await trace(from,to):null;
    if(hit?.hit&&hit.actor!==o.id){
      const n=hit.normal,dot=v[0]*n[0]+v[1]*n[1]+v[2]*n[2];to=hit.position.map((x,i)=>x+n[i]*.01);
      if(p.shouldBounce&&Math.hypot(...v)*p.bounciness>.5)for(let i=0;i<3;i++)v[i]=(v[i]-2*dot*n[i])*p.bounciness;else{state.stopped=true;v.fill(0);}
    }
    setSceneWorldPosition(o,to,objects);
    if(p.rotationFollowsVelocity&&Math.hypot(...v)>1e-6&&!(o.parentId||o.parent)){const h=Math.hypot(v[0],v[2]);o.rotation=[-Math.atan2(v[1],h)*180/Math.PI,Math.atan2(v[0],v[2])*180/Math.PI,0];}
    update?.(o);
  }
  // Camera child of a pawn: sits armLength behind the pivot (parent position + offset) along its own view direction,
  // pulled in when the trace from the pivot hits something else; lagSpeed > 0 smooths the move.
  async arm(o,objects,p,dt,trace,update){
    const parentId=o.parentId||o.parent,parent=parentId&&objects.find(x=>x.id===parentId);if(!parent)return;
    const pivot=sceneWorldPosition(parent,objects).map((v,i)=>v+(Number(p.targetOffset[i])||0)),view=direction(o,objects,[0,0,-1]);
    let length=Math.max(0,p.armLength);const desired=pivot.map((v,i)=>v-view[i]*length);
    if(p.collision&&trace&&length>0){const hit=await trace(pivot,desired);if(hit?.hit&&hit.actor!==parent.id&&hit.actor!==o.id)length=Math.max(0,Math.hypot(...hit.position.map((v,i)=>v-pivot[i]))-.2);}
    let target=pivot.map((v,i)=>v-view[i]*length);const last=this.arms.get(o.id);
    if(last&&p.lagSpeed>0){const k=1-Math.exp(-p.lagSpeed*dt);target=last.map((v,i)=>v+(target[i]-v)*k);}
    this.arms.set(o.id,target);setSceneWorldPosition(o,target,objects);update?.(o);
  }
}
