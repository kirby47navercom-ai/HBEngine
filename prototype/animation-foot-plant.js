import {Matrix4,Vector3,Quaternion} from 'three';
import {sceneWorldMatrix} from './scene-runtime.js';
export class FootPlantState{
 constructor(){this.states=new WeakMap();this.anchorMatrix=new Matrix4();this.inverseAnchor=new Matrix4();this.rotation=new Quaternion();this.anchorRotation=new Quaternion();this.point=new Vector3();this.scale=new Vector3();}
 apply(solver,weight,{context=solver.owner,epoch=0,time=solver.owner.time||0}={}){
  const p=solver.p,owner=solver.owner,enabled=owner.parameters.get(p.plantParameter)===true,anchorId=p.plantAnchorActor||'',objects=anchorId?(owner.objects?.()||[owner.object]):null,anchor=anchorId?objects.find(o=>o.id===anchorId&&o.poolActive!==false&&!o.destroying):null;
  const debug=solver.debug.plant??={active:false,weight:0,anchor:anchorId,position:[0,0,0],missingAnchor:''};debug.active=enabled;debug.anchor=anchorId;debug.missingAnchor=anchorId&&!anchor?anchorId:'';
  let state=this.states.get(context);if(!Number.isFinite(time)||time<0||!Number.isSafeInteger(epoch)||epoch<0)throw Error('발 고정 시계·평가 순서를 확인하세요.');
  if(weight<=0||anchorId&&!anchor){this.states.delete(context);debug.weight=0;return 0;}
  if(state&&(state.anchor!==anchor||state.time>time||state.epoch!==epoch&&state.epoch!==epoch-1)){this.states.delete(context);state=null;}
  if(!state&&!enabled){debug.weight=0;return 0;}
  if(anchor)this.anchorMatrix.copy(sceneWorldMatrix(anchor,objects));else this.anchorMatrix.identity();
  if(p.plantRotation!==false){for(let i=0;i<2;i++){const matrix=i?this.anchorMatrix:solver.world;matrix.decompose(this.point,this.rotation,this.scale);const e=matrix.elements,size=Math.max(this.scale.x,this.scale.y,this.scale.z),square=size*size,tolerance=1e-6*square;if(!Number.isFinite(square)||matrix.determinant()<=0||this.scale.x<=0||Math.abs(this.scale.x-this.scale.y)>1e-6*size||Math.abs(this.scale.x-this.scale.z)>1e-6*size||Math.abs(e[0]*e[4]+e[1]*e[5]+e[2]*e[6])>tolerance||Math.abs(e[0]*e[8]+e[1]*e[9]+e[2]*e[10])>tolerance||Math.abs(e[4]*e[8]+e[5]*e[9]+e[6]*e[10])>tolerance)throw Error('발 회전 고정에는 양의 균일 월드 크기가 필요해요.');}}
  if(enabled&&(!state||!state.enabled)){
   const position=solver.positions.at(-1).clone().applyMatrix4(solver.world).applyMatrix4(this.inverseAnchor.copy(this.anchorMatrix).invert()),rotation=new Quaternion();solver.world.decompose(this.point,this.rotation,this.scale);this.anchorMatrix.decompose(this.point,this.anchorRotation,this.scale);rotation.copy(this.anchorRotation).invert().multiply(this.rotation).multiply(solver.tipRotation).normalize();
   state={position,rotation,anchor,enabled:true,weight:1,time,epoch,releaseStart:null};this.states.set(context,state);
  }
  if(!enabled&&state.enabled){state.enabled=false;state.releaseStart=state.time;}
  state.weight=enabled?1:Math.max(0,1-(time-state.releaseStart)/(p.plantRelease??.15));if(!enabled&&(p.plantRelease??.15)===0)state.weight=0;state.time=time;state.epoch=epoch;
  if(!state.weight){this.states.delete(context);debug.weight=0;return 0;}
  this.point.copy(state.position).applyMatrix4(this.anchorMatrix);this.point.toArray(debug.position);solver.target.copy(this.point).applyMatrix4(solver.inverseWorld).lerp(solver.positions.at(-1),1-p.positionWeight);solver.debug.target=this.point.copy(state.position).applyMatrix4(this.anchorMatrix).applyMatrix4(solver.inverseWorld).toArray(solver.debug.target);
  // Keep the incoming knee pole, rather than turning a planted straight leg.
  solver.hint.copy(solver.positions[1]);solver.debug.hint=solver.hint.toArray(solver.debug.hint);
  if(p.plantRotation!==false){solver.world.decompose(this.point,this.rotation,this.scale);this.anchorMatrix.decompose(this.point,this.anchorRotation,this.scale);solver.targetRotation.copy(this.rotation).invert().multiply(this.anchorRotation).multiply(state.rotation).normalize();}
  debug.weight=state.weight;return state.weight;
 }
 invalidate(context){this.states.delete(context);}
 clear(){this.states=new WeakMap();}
}
export const footPlantContract=Object.freeze({node:'twoBoneIK',activation:'plantParameter names a Bool; empty preserves legacy IK, false passes incoming pose; true rising edge captures incoming foot position/orientation',fields:['plantParameter','plantAnchorActor','plantRotation','plantRelease'],spaces:'world lock by default; optional live actor anchor uses full affine position and captured actor identity. Rotation lock requires positive uniform world scales.',release:'linear plantRelease seconds (default .15), using graph clock; knee pole from incoming pose, existing joint/length/alpha weights respected',lifetime:'per evaluation context; inactive branch evaluation gaps, clock rewind, anchor replacement/missing actor and zero alpha invalidate. Budget-only skipped pose frames do not advance evaluation epoch. Dispose releases all contexts.',control:'Existing animGraphSetBool / hb::AnimationGraph::SetBool and document.patch/Undo for authoring',limits:['Contact state is authored by Bool; no automatic ground ray/contact sensing or stride/hip correction','Unreachable goals keep current IK limits and report residual error','Position supports affine anchor transforms; orientation rejects shear/nonuniform/reflected world frames']});
