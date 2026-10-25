import {StorageInstancedBufferAttribute,Vector3} from 'three/webgpu';
import {Fn,If,storage,uniform,instanceIndex,uint,min,exp,atomicAdd,atomicStore,floatBitsToUint} from 'three/tsl';
import {particleInteraction,acceptParticleEventBytes,resetParticleEvents} from './particle-events.js';
import {ParticleEventReadback} from './gpu-particle-event-readback.js';

export function gpuParticleInteraction(sim,nodes){
  const c=particleInteraction(sim.p),{positions,velocities,indices,args,births,speeds}=nodes,mode=uniform(c.mode),normal=uniform(new Vector3(...c.normal)),offset=uniform(c.offset),bounce=uniform(c.restitution),friction=uniform(c.friction),death=uniform(c.death,'bool'),collision=uniform(c.collision,'bool');
  const buffer=c.enabled?new StorageInstancedBufferAttribute(new Uint32Array(4+c.capacity*12),1):null,events=buffer?storage(buffer,'uint',4+c.capacity*12).toAtomic():null;
  const record=(kind,position,velocity)=>{if(!events)return;const index=atomicAdd(events.element(0),uint(1)).toVar();If(index.lessThan(c.capacity),()=>{const at=index.mul(12).add(4);atomicStore(events.element(at),uint(kind));atomicStore(events.element(at.add(1)),instanceIndex);for(let k=0;k<4;k++)atomicStore(events.element(at.add(2+k)),floatBitsToUint(position.element(k)));for(let k=0;k<4;k++)atomicStore(events.element(at.add(6+k)),floatBitsToUint(velocity.element(k)));});};
  const reset=events?Fn(()=>{atomicStore(events.element(0),uint(0));})().compute(1):null;
  const reader=buffer?new ParticleEventReadback(sim.renderer,buffer):null;
  const update=Fn(()=>{If(instanceIndex.lessThan(sim.capacity),()=>{
    const position=positions.element(instanceIndex).toVar(),velocity=velocities.element(instanceIndex).toVar();
    If(position.w.lessThan(velocity.w),()=>{
      const dt=min(sim.delta,velocity.w.sub(position.w)),half=dt.mul(dt).mul(.5);position.xyz.addAssign(velocity.xyz.mul(dt).add(sim.force.mul(half)));velocity.xyz.assign(velocity.xyz.add(sim.force.mul(dt)).mul(exp(sim.drag.mul(dt).negate())));position.w.addAssign(sim.delta);
      if(c.mode)If(sim.delta.greaterThan(0),()=>{const distance=position.xyz.dot(normal).sub(offset).toVar();If(distance.lessThan(0),()=>{position.xyz.subAssign(normal.mul(distance));const speed=velocity.xyz.dot(normal).toVar();If(speed.lessThan(0),()=>{If(mode.greaterThan(1),()=>{position.w.assign(velocity.w);}).Else(()=>{velocity.xyz.assign(velocity.xyz.sub(normal.mul(speed)).mul(friction.oneMinus()).sub(normal.mul(speed).mul(bounce)));});if(events)If(collision,()=>{record(2,position,velocity);});});});});
      if(events)If(position.w.greaterThanEqual(velocity.w).and(death),()=>{record(1,position,velocity);});
    });
    If(position.w.greaterThanEqual(velocity.w),()=>{const birth=atomicAdd(args.element(4),uint(1)).toVar();If(birth.lessThan(sim.requestCount),()=>{position.assign(births.element(birth));velocity.assign(speeds.element(birth));});});
    positions.element(instanceIndex).assign(position);velocities.element(instanceIndex).assign(velocity);
    If(position.w.lessThan(velocity.w),()=>{const index=atomicAdd(args.element(1),uint(1));indices.element(index).assign(instanceIndex);});
  });})().compute(sim.capacity);
  return {key:`${c.mode?1:0}:${c.enabled?c.capacity:0}`,buffer,reset,update,bytes:buffer?buffer.array.byteLength:0,pending:null,
    sync(p){const v=particleInteraction(p);mode.value=v.mode;normal.value.fromArray(v.normal);offset.value=v.offset;bounce.value=v.restitution;friction.value=v.friction;death.value=v.death;collision.value=v.collision;},
    read(){if(!buffer||this.pending)return;const epoch=sim.eventEpoch,time=sim.time;sim.eventReadbacks=(sim.eventReadbacks||0)+1;this.pending=reader.read().then(bytes=>acceptParticleEventBytes(sim,bytes,c.capacity,epoch,time)).catch(error=>{if(!sim.disposed&&sim.eventEpoch===epoch)sim.eventError=error;}).finally(()=>{this.pending=null;});},
    dispose(){resetParticleEvents(sim);reader?.dispose();update.dispose();reset?.dispose();if(buffer)sim.renderer._attributes.delete(buffer);}
  };
}
