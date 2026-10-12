import {Matrix4} from 'three';

export const objectMotionEnabled=p=>!!(p&&(p.antiAliasing==='taa'&&p.aaStrength>0||p.motionBlurEnabled&&p.motionBlurStrength>0));
// shortcut: rigid mesh transforms only; deforming vertices and individual instances need previous pose data.
export class ObjectMotionHistory{
 constructor(){this.records=new WeakMap();this.pending=new Set();this.serial=0;}
 begin(reset=false){if(reset)this.records=new WeakMap();this.pending.clear();this.serial++;}
 get(object,world=object.matrixWorld){
  const mode=object.userData.hbMotionVectors||'perObject';if(mode==='none')return {world,flag:2};if(mode==='camera')return {world,flag:0};
  const material=Array.isArray(object.material)?object.material:[object.material];
  if(!object.isMesh||object.isSkinnedMesh||object.isInstancedMesh||object.geometry?.isInstancedBufferGeometry||object.morphTargetInfluences?.length||object.userData.sprite||object.userData.draw2d||material.some(m=>m?.isShaderMaterial||m?.displacementMap))return {world,flag:0};
  const geometry=object.geometry,position=geometry?.attributes.position,index=geometry?.index;let record=this.records.get(object);
  if(!record){record={world:new Matrix4(),next:new Matrix4(),frame:-1};this.records.set(object,record);}
  const valid=record.frame===this.serial-1&&record.geometry===geometry&&record.position===position&&record.version===position?.version&&record.index===index&&record.indexVersion===index?.version;
  record.next.copy(world);record.nextGeometry=geometry;record.nextPosition=position;record.nextVersion=position?.version;record.nextIndex=index;record.nextIndexVersion=index?.version;this.pending.add(record);
  return {world:valid?record.world:world,flag:valid?1:-1};
 }
 end(success=true){for(const r of this.pending)if(success){r.world.copy(r.next);Object.assign(r,{frame:this.serial,geometry:r.nextGeometry,position:r.nextPosition,version:r.nextVersion,index:r.nextIndex,indexVersion:r.nextIndexVersion});}this.pending.clear();if(!success)this.records=new WeakMap();}
}
