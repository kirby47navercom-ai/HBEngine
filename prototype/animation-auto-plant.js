import {Vector3,Matrix4,Quaternion} from 'three';
import {sceneWorldMatrix} from './scene-runtime.js';

export const autoPlantDefaults=()=>({enabled:false,parameter:'',enterHeight:.04,exitHeight:.1,enterSpeed:.2,exitSpeed:.5,minContact:.04,maxGap:.25});
const fields=new Set(Object.keys(autoPlantDefaults())),bounded=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max;
export function validAutoPlant(value){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.has(k)))return false;
 const p={...autoPlantDefaults(),...value};return typeof p.enabled==='boolean'&&typeof p.parameter==='string'&&p.parameter.length<=160&&bounded(p.enterHeight,100)&&bounded(p.exitHeight,100)&&p.exitHeight>=p.enterHeight&&bounded(p.enterSpeed,1000)&&bounded(p.exitSpeed,1000)&&p.exitSpeed>=p.enterSpeed&&bounded(p.minContact,10)&&Number.isFinite(p.maxGap)&&p.maxGap>0&&p.maxGap<=10;
}

// Consumes the existing ground ray. State belongs to one evaluated graph branch,
// and raw input foot motion is measured relative to the live contact actor.
export class AutoFootPlantIK{
 constructor(solver){this.solver=solver;this.p={...autoPlantDefaults(),...solver.p.autoPlant};this.states=new WeakMap();this.world=new Matrix4();this.inverse=new Matrix4();this.raw=new Vector3();this.previous=new Vector3();this.local=new Vector3();this.normal=new Vector3();this.goal=new Vector3();this.rotation=new Quaternion();this.debug=solver.debug.autoPlant={active:false,phase:'inactive',height:0,speed:0,contactTime:0,anchor:'',resets:0};}
 apply(weight,{context=this.solver.owner,epoch=0,time=this.solver.owner.time||0}={}){
  const s=this.solver,p=this.p,d=this.debug,g=s.debug.ground;
  if(!Number.isFinite(time)||time<0||!Number.isSafeInteger(epoch)||epoch<0)throw Error('자동 발 접촉 시계를 확인하세요.');
  const id=s.p.plantAnchorActor||g?.actor||'',objects=id?(s.owner.objects?.()||[s.owner.object]):null,anchor=id?objects.find(o=>o.id===id&&o.poolActive!==false&&!o.destroying):null,enabled=weight>0&&g?.hit&&(!p.parameter||s.owner.parameters.get(p.parameter)===true);
  const info={id,objects,anchor};let state=this.states.get(context);d.active=!!enabled;d.anchor=id;d.phase='inactive';d.contactTime=0;d.speed=0;
  if(anchor)this.world.copy(sceneWorldMatrix(anchor,objects));else this.world.identity();
  this.raw.copy(s.strideWarp?.debug.active?s.strideWarp.pose:s.positions.at(-1)).applyMatrix4(s.world);this.normal.fromArray(g?.normal||[0,1,0]);this.previous.fromArray(g?.position||[0,0,0]).addScaledVector(this.normal,-s.groundProjection.p.offset);d.height=-this.previous.sub(this.raw).dot(this.normal);
  if(state&&(state.anchor!==anchor||state.id!==id||time<state.time||time-state.time>p.maxGap||state.epoch!==epoch&&state.epoch!==epoch-1)){this.states.delete(context);s.footPlant.invalidate(context);state=null;d.resets++;}
  if(!enabled||id&&!anchor){this.states.delete(context);d.phase=id&&!anchor?'missing-anchor':'inactive';return this.blend(weight,false,info,{context,epoch,time});}
  this.local.copy(this.raw).applyMatrix4(this.inverse.copy(this.world).invert());
  const dt=state?time-state.time:0;
  if(state&&dt>0){this.previous.copy(state.local).applyMatrix4(this.world);d.speed=this.raw.distanceTo(this.previous)/dt;}
  if(!state){state={id,anchor,local:this.local.clone(),time,epoch,contact:0,planted:false};this.states.set(context,state);}
  const height=Math.abs(d.height),enter=height<=p.enterHeight&&d.speed<=p.enterSpeed,exit=height>p.exitHeight||d.speed>p.exitSpeed;
  if(state.planted){if(exit){state.planted=false;state.contact=0;}}
  else{state.contact=enter?state.contact+dt:0;if(enter&&state.contact+1e-9>=p.minContact)state.planted=true;}
  state.time=time;state.epoch=epoch;state.local.copy(this.local);d.contactTime=state.contact;d.phase=state.planted?'planted':height>p.enterHeight?'height':d.speed>p.enterSpeed?'speed':'settling';
  return this.blend(weight,state.planted,info,{context,epoch,time});
 }
 blend(weight,enabled,anchorInfo,frame){const s=this.solver;this.goal.copy(s.target);this.rotation.copy(s.targetRotation);const plant=s.footPlant.apply(s,weight,{...frame,activation:enabled,anchorInfo,capturePosition:s.debug.ground?.position,captureRotation:s.groundProjection.aligned?s.targetRotation:undefined});s.target.lerpVectors(this.goal,s.target,plant);s.targetRotation.slerp(this.rotation,1-plant);s.target.toArray(s.debug.target);if(s.strideWarp)s.strideWarp.debug.plantOverride=plant>0;return weight;}
 invalidate(context){this.states.delete(context);this.solver.footPlant.invalidate(context);this.debug.active=false;this.debug.phase='no-ground';this.debug.contactTime=0;this.debug.speed=0;if(this.solver.debug.plant){this.solver.debug.plant.active=false;this.solver.debug.plant.weight=0;}}
 clear(){this.states=new WeakMap();this.solver=null;}
}

export const autoPlantContract=Object.freeze({node:'twoBoneIK',property:'optional autoPlant; absent/disabled preserves authored plant/legacy IK',fields:autoPlantDefaults(),prerequisite:'enabled groundProjection with pose source; explicit plantParameter keeps authored Bool control and takes priority',sensing:'Same one ground ray per active evaluated context. Signed raw incoming foot height above unoffset surface and world speed relative to current contact actor; stride-warped pose is the input when enabled.',phase:'enterHeight/enterSpeed and minContact seconds latch contact, separate exitHeight/exitSpeed release it; graph-clock/epoch gaps, rewind and replaced contact actor reset. Equal-time samples do not advance dwell.',anchor:'Explicit plantAnchorActor overrides ray actor; otherwise follows live hit actor. Missing contact actor does not create a phantom lock. Grounded target position/orientation captured on rise; existing plantRelease, position/rotation weights and IK limits apply.',control:'Optional Bool gate uses existing animGraphSetBool/hb::AnimationGraph::SetBool. Typed folded fields, parameter rename/Undo/validation and graph JSON share one schema.',limits:['Ray-based animation contact inference, not physical foot contact, predictive gait or pelvis correction','No extra ray, scene physics step, scene-wide foot snapshot or SDK API; per evaluated branch weak state and scratch','No actual GUI/GPU/device or whole-character performance guarantee']});
