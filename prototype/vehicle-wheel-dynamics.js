// Longitudinal wheel inertia is opt-in. Rapier still owns suspension/lateral contact.
export const wheelInertia=w=>w.inertia??1.2;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function solveWheelContact({omega,inertia,radius,driveTorque,brakeTorque,velocity,inverseMass,maxImpulse,dt}){
 const free=omega+driveTorque*dt/inertia,cap=Math.max(0,maxImpulse),brake=Math.max(0,brakeTorque)*dt;
 const lockImpulse=inverseMass>0?clamp(-velocity/inverseMass,-cap,cap):0,lockBrake=inertia*free-lockImpulse*radius;
 if(Math.abs(lockBrake)<=brake)return{omega:0,impulse:lockImpulse,brakeImpulse:lockBrake};
 const b=Math.sign(lockBrake)*brake,impulse=clamp((radius*(free-b/inertia)-velocity)/(inverseMass+radius*radius/inertia),-cap,cap);
 return{omega:free-(b+impulse*radius)/inertia,impulse,brakeImpulse:b};
}
export function limitedSlipTorques(wheels,omega,output,coupling,maxTorque,dt){
 output.fill(0);if(!coupling||!maxTorque)return output;
 for(const front of [true,false]){let inertia=0,momentum=0,count=0;for(let i=0;i<wheels.length;i++){const w=wheels[i];if(w.drive&&(w.position[2]>0)===front){const m=wheelInertia(w);inertia+=m;momentum+=omega[i]*m;count++;}}if(count<2)continue;
 const mean=momentum/inertia,alpha=1-Math.exp(-coupling*dt);let peak=0;for(let i=0;i<wheels.length;i++){const w=wheels[i];if(w.drive&&(w.position[2]>0)===front){output[i]=wheelInertia(w)*(mean-omega[i])*alpha/dt;peak=Math.max(peak,Math.abs(output[i]));}}if(peak>maxTorque)for(let i=0;i<wheels.length;i++)if(wheels[i].drive&&(wheels[i].position[2]>0)===front)output[i]*=maxTorque/peak;
 }return output;
}
function effectiveInverseMass(body,point,d){
 if(!body?.isDynamic())return 0;const m=body.effectiveInvMass(),c=body.worldCom(),r={x:point.x-c.x,y:point.y-c.y,z:point.z-c.z},a={x:r.y*d.z-r.z*d.y,y:r.z*d.x-r.x*d.z,z:r.x*d.y-r.y*d.x},i=body.effectiveWorldInvInertia();
 return Math.max(0,d.x*d.x*m.x+d.y*d.y*m.y+d.z*d.z*m.z+a.x*(i.m11*a.x+i.m12*a.y+i.m13*a.z)+a.y*(i.m21*a.x+i.m22*a.y+i.m23*a.z)+a.z*(i.m31*a.x+i.m32*a.y+i.m33*a.z));
}
function wheelDirection(body,steering,normal){
 const q=body.rotation(),x=Math.sin(steering),z=Math.cos(steering),d={x:(1-2*(q.y*q.y+q.z*q.z))*x+2*(q.x*q.z+q.w*q.y)*z,y:2*(q.x*q.y+q.w*q.z)*x+2*(q.y*q.z-q.w*q.x)*z,z:2*(q.x*q.z-q.w*q.y)*x+(1-2*(q.x*q.x+q.y*q.y))*z},dot=d.x*normal.x+d.y*normal.y+d.z*normal.z;
 d.x-=dot*normal.x;d.y-=dot*normal.y;d.z-=dot*normal.z;const n=Math.hypot(d.x,d.y,d.z);if(n<1e-8)return null;d.x/=n;d.y/=n;d.z/=n;return d;
}
export class InertialVehicleWheels{
 constructor(wheels){const n=wheels.length;this.omega=new Float64Array(n);this.rotation=new Float64Array(n);this.rpm=new Float64Array(n);this.slip=new Float64Array(n);this.force=new Float64Array(n);this.brakeFactor=new Float64Array(n).fill(1);this.absActive=new Uint8Array(n);this.couplingTorque=new Float64Array(n);}
 get moving(){return this.omega.some(v=>Math.abs(v)>1e-4);}
 step(p,controller,body,powertrain,dt){
 if(p.differential==='limitedSlip')limitedSlipTorques(p.wheels,this.omega,this.couplingTorque,p.differentialCoupling,p.differentialMaxTorque,dt);else this.couplingTorque.fill(0);
 for(let i=0;i<p.wheels.length;i++){
  const w=p.wheels[i],contact=controller.wheelIsInContact(i),normal=contact&&controller.wheelContactNormal(i),point=contact&&controller.wheelContactPoint(i),direction=normal&&wheelDirection(body,controller.wheelSteering(i)||0,normal),ground=direction&&controller.wheelGroundObject(i)?.parent();
  let velocity=0,k=0,cap=0;if(direction&&point){const v=body.velocityAtPoint(point),g=ground?.velocityAtPoint(point)||{x:0,y:0,z:0};velocity=(v.x-g.x)*direction.x+(v.y-g.y)*direction.y+(v.z-g.z)*direction.z;k=effectiveInverseMass(body,point,direction)+effectiveInverseMass(ground,point,direction);const friction=Math.max(0,w.friction*(controller.wheelGroundObject(i)?.friction()??1)),limit=Math.max(0,controller.wheelSuspensionForce(i)||0)*dt*friction,side=controller.wheelSideImpulse(i)||0;cap=Math.sqrt(Math.max(0,limit*limit-side*side));}
  const surface=this.omega[i]*w.radius,slip=(surface-velocity)/Math.max(Math.abs(velocity),Math.abs(surface),1),braking=w.brake?Math.max(p.brake,powertrain.braking):0,lock=-Math.sign(velocity)*slip,active=!!(p.absEnabled&&braking&&direction&&Math.abs(velocity)>=p.absMinSpeed&&lock>p.absSlipThreshold);
  this.absActive[i]=active?1:0;this.brakeFactor[i]=!p.absEnabled||!braking||!direction||Math.abs(velocity)<p.absMinSpeed?1:clamp(this.brakeFactor[i]+(active?-p.absReleaseRate:p.absReapplyRate)*dt,0,1);
  const brake=Math.max(braking*p.brakeTorque*this.brakeFactor[i],w.handbrake?p.handbrake*p.handbrakeTorque:0),drive=powertrain.forces[i]*w.radius+this.couplingTorque[i],result=solveWheelContact({omega:this.omega[i],inertia:wheelInertia(w),radius:w.radius,driveTorque:drive,brakeTorque:brake,velocity,inverseMass:k,maxImpulse:cap,dt});
  this.omega[i]=result.omega;this.rotation[i]+=result.omega*dt;this.rpm[i]=result.omega*60/(2*Math.PI);this.slip[i]=slip;this.force[i]=result.impulse/dt;
  if(direction&&result.impulse){const j={x:direction.x*result.impulse,y:direction.y*result.impulse,z:direction.z*result.impulse};body.applyImpulseAtPoint(j,point,true);if(ground?.isDynamic())ground.applyImpulseAtPoint({x:-j.x,y:-j.y,z:-j.z},point,true);}
 }powertrain.wheelRPM.set(this.rpm);return this;
 }
}