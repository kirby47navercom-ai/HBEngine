// Optional, bounded event records. Coordinates follow the emitter's simulationSpace.
export const particleEventStride=12;
export function particleInteraction(p){
  const mode=p.collisionMode??'none',normal=p.collisionNormal??[0,1,0],offset=p.collisionOffset??0,restitution=p.collisionRestitution??.5,friction=p.collisionFriction??0,capacity=p.eventCapacity??256;
  if(!['none','bounce','kill'].includes(mode)||!Array.isArray(normal)||normal.length!==3||!normal.every(Number.isFinite)||Math.hypot(...normal)<1e-8||!Number.isFinite(offset)||!Number.isFinite(restitution)||restitution<0||restitution>1||!Number.isFinite(friction)||friction<0||friction>1||!Number.isInteger(capacity)||capacity<1||capacity>4096||typeof(p.deathEvents??false)!=='boolean'||typeof(p.collisionEvents??false)!=='boolean')throw Error('파티클 충돌·이벤트 설정을 확인하세요.');
  const length=Math.hypot(...normal);return {mode:mode==='none'?0:mode==='bounce'?1:2,normal:normal.map(v=>v/length),offset,restitution,friction,capacity,death:!!p.deathEvents,collision:!!p.collisionEvents,enabled:!!(p.deathEvents||p.collisionEvents)};
}
export function collideParticle(particle,c){
  if(!c.mode)return false;const x=particle.position,v=particle.velocity,n=c.normal,d=x[0]*n[0]+x[1]*n[1]+x[2]*n[2]-c.offset;if(d>=0)return false;
  for(let k=0;k<3;k++)x[k]-=n[k]*d;const speed=v[0]*n[0]+v[1]*n[1]+v[2]*n[2];if(speed>=0)return false;
  if(c.mode===2)particle.age=particle.lifetime;else for(let k=0;k<3;k++)v[k]=(v[k]-speed*n[k])*(1-c.friction)-speed*n[k]*c.restitution;
  return true;
}
export function particleEvent(state,type,particle,index){
  const limit=state.p.eventCapacity??256;state.eventQueue??=[];
  if(state.eventQueue.length>=limit){state.eventDropped=(state.eventDropped||0)+1;return;}
  state.eventQueue.push({type,index,position:[...particle.position],velocity:[...particle.velocity],age:particle.age,lifetime:particle.lifetime,time:state.time});
}
export function acceptParticleEventBytes(state,bytes,capacity,epoch,time){
  if(state.disposed||state.eventEpoch!==epoch)return;
  if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==(4+capacity*particleEventStride)*4)throw Error('GPU 입자 이벤트 버퍼 길이가 달라요.');
  const u=new Uint32Array(bytes),f=new Float32Array(bytes),count=Math.min(u[0],capacity);state.eventDropped=(state.eventDropped||0)+Math.max(0,u[0]-capacity);
  for(let i=0;i<count;i++){const at=4+i*particleEventStride,type=u[at];if(type!==1&&type!==2)throw Error('GPU 입자 이벤트 종류가 달라요.');const values=Array.from(f.subarray(at+2,at+10));if(!values.every(Number.isFinite))throw Error('GPU 입자 이벤트 값이 유한하지 않아요.');
    const oldTime=state.time;state.time=time;try{particleEvent(state,type===1?'death':'collision',{position:values.slice(0,3),age:values[3],velocity:values.slice(4,7),lifetime:values[7]},u[at+1]);}finally{state.time=oldTime;}
  }
}
export function syncParticleEvents(state){const p=state.p,key=[!!p.deathEvents,!!p.collisionEvents,p.eventCapacity??256,p.eventName??'OnParticleEvents'].join(':');if(state.eventConfiguration!==key){resetParticleEvents(state);state.eventConfiguration=key;}}
export function resetParticleEvents(state){state.eventEpoch=(state.eventEpoch||0)+1;state.eventQueue?.splice(0);state.eventError=null;}
export function takeParticleEvents(state){if(state.eventError){const error=state.eventError;state.eventError=null;throw error;}const result=state.eventQueue||[];state.eventQueue=null;return result;}
export const particleInteractionContract={coordinates:'simulationSpace (local or world); dot(normalized collisionNormal,position)=collisionOffset',collision:'single analytic plane, endpoint penetration correction; normal restitution and tangential friction; kill also emits death',events:'opt-in deathEvents/collisionEvents; eventName custom Blueprint event, component:String/events:JSON, bounded by eventCapacity 1..4096',record:{type:'death|collision',index:'reused GPU slot / CPU birth index; not actor ID',position:'vec3 simulation space',velocity:'vec3 simulation space',age:'seconds',lifetime:'seconds',time:'emitter submission time'},delivery:'CPU same tick; GPU asynchronously on a later tick; reset/clear/dispose discard old generations; ordering across GPU slots is unspecified',cost:'off: no event buffers/readbacks; enabled: (16+48*capacity) bytes plus backend staging, bounded queue; overflow/drop diagnostics, no living-position readback',limitations:['no scene geometry/rigid body collision','no deterministic inter-particle GPU event ordering','individual ribbons and VFX graph remain separate']};
