import {Quaternion} from 'three';
import {AnimationIK,animationIKDefaults,validAnimationIK} from './animation-ik.js';

// Multiple CCD chains share one pose. Targets are fixed for each solve, not
// repeatedly blended toward a moving endpoint, so partial weights do not compound.
export class FullBodyIK {
  constructor(owner,node,slot){
    if(!validAnimationIK('fullBodyIK',node.properties))throw Error('다중 목표 IK 설정 오류');
    this.owner=owner;this.node=node;this.p=node.properties;this.override={};this.effectors=new Map();this.rotation=new Quaternion();this.blendRotation=new Quaternion();this.initial=new Map();this.active=[];
    const excluded=new Set(this.p.excludedBones);this.chains=this.p.effectors.map(e=>{
      const tip=owner.group?.getObjectByName(e.bone),names=new Set();let bone=tip;while(bone){names.add(bone.name);if(bone.name===this.p.root)break;bone=bone.parent;}
      const properties={...animationIKDefaults('ccdIK'),root:this.p.root,tip:e.bone,iterations:1,precision:this.p.precision,debug:this.p.debug,enableRotationLimit:true,jointLimits:this.p.jointLimits.filter(l=>names.has(l.bone)&&!excluded.has(l.bone)),target:e.target,targetActor:e.targetActor,space:e.space,positionWeight:e.weight};
      const solver=new AnimationIK(owner,{...node,id:node.id+'/'+e.id,type:'ccdIK',properties},slot);solver.bones.forEach((b,i)=>{if(excluded.has(b.name))solver.rotationLimits[i]=0;});
      this.effectors.set(e.id,{settings:e,override:{},solver});return solver;
    });
    this.rows=[...this.effectors.values()];for(const solver of this.chains)for(const bone of solver.bones){const index=owner.slotKeys.get(bone.uuid+'|quaternion|');if(!this.initial.has(index))this.initial.set(index,new Float64Array(4));}
    this.jointLimits={set:value=>{const chains=this.chains.filter(s=>s.bones.some(b=>b.name===value.bone));if(!chains.length)throw Error('IK 관절이 없어요.');for(const s of chains)s.jointLimits.set(value);},clear:bone=>{for(const s of this.chains)s.jointLimits.clear(bone);}};
    this.debug={node:node.id,name:node.name,type:'fullBodyIK',tip:[0,0,0],error:0,weight:0,iterations:0,draw:this.p.debug,missingActor:'',effectors:this.p.effectors.map(e=>({id:e.id,bone:e.bone,tip:[0,0,0],target:[0,0,0],error:0,weight:e.weight,missingActor:''}))};
  }
  setEffector(id,field,value){const row=this.effectors.get(id);if(!row)throw Error('IK 목표 ID가 없어요.');const next={...row.settings,...row.override,[field]:value};if(!['target','targetActor','weight'].includes(field)||!validAnimationIK('fullBodyIK',{...this.p,effectors:[next]}))throw Error('IK 목표 값 범위를 확인하세요.');row.override[field]=Array.isArray(value)?[...value]:value;}
  apply(pose,weight){
    this.debug.weight=weight;this.debug.iterations=0;this.debug.missingActor='';for(const [index,value] of this.initial)value.set(pose[index]);
    const active=this.active;active.length=0;for(const [i,row] of this.rows.entries()){
      const s=row.solver,p={...row.settings,...row.override},d=this.debug.effectors[i];s.override={target:p.target,targetActor:p.targetActor};s.p.positionWeight=p.weight;s.readPose(pose);const available=s.targets();d.weight=p.weight;d.missingActor=s.debug.missingActor;d.target=s.target.toArray(d.target);if(d.missingActor)this.debug.missingActor=d.missingActor;if(available&&p.weight>0)active.push(s);
    }
    if(weight>0)for(let iteration=0;iteration<this.p.iterations;iteration++){
      for(let index=0;index<active.length;index++){const s=active[iteration%2?active.length-1-index:index];s.readPose(pose);s.ccd();for(let i=0;i<s.bones.length;i++)s.chain[i].quaternion.toArray(pose[this.owner.slotKeys.get(s.bones[i].uuid+'|quaternion|')]);}
      this.debug.iterations=iteration+1;let error=0;for(const s of active){s.readPose(pose);s.chain.at(-1).getWorldPosition(s.origin);error=Math.max(error,s.origin.distanceTo(s.target));}if(error<=this.p.precision)break;
    }
    if(weight<1)for(const [index,initial] of this.initial){this.rotation.fromArray(initial).slerp(this.blendRotation.fromArray(pose[index]),weight).toArray(pose[index]);}
    this.debug.error=0;for(const [i,s] of this.chains.entries()){s.readPose(pose);s.chain.at(-1).getWorldPosition(s.origin);const d=this.debug.effectors[i];s.origin.toArray(d.tip);d.error=d.missingActor?0:s.origin.distanceTo(s.target);if(d.weight>0)this.debug.error=Math.max(this.debug.error,d.error);s.debug.tip=d.tip;s.debug.weight=weight;s.debug.error=d.error;s.drawDebug();}for(let i=0;i<3;i++)this.debug.tip[i]=this.debug.effectors[0].tip[i];return this.debug;
  }
  dispose(){for(const s of this.chains)s.dispose();this.chains.length=0;this.effectors.clear();this.rows.length=0;this.active.length=0;this.initial.clear();}
}
