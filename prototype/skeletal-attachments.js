import {GameplayCueAnchor} from './gameplay-cue-anchor.js';
import {componentDefaultValues} from './scene-components.js';

// Actor registration follows the existing construction/pool/level lifecycle.
// No full-world or full-skeleton traversal is added to a frame without bindings.
export class SkeletalAttachments {
 constructor({mesh,update,log}){Object.assign(this,{mesh,update,log});this.actors=new Map();this.bindings=new WeakMap();}
 register(object){if(object.components?.some(c=>c.type==='SkeletalAttachment'))this.actors.set(object.id,object);}
 retire(object){if(this.actors.get(object.id)===object)this.actors.delete(object.id);this.bindings.delete(object);}
 status(object,value){const prior=object.gameplayDebug?.skeletalAttachment;if(prior&&Object.keys(value).length===Object.keys(prior).length&&Object.entries(value).every(([k,v])=>prior[k]===v))return;object.gameplayDebug={...object.gameplayDebug,skeletalAttachment:value};if(value.error)this.log?.('골격 부착 실패: '+value.error);}
 tick(vm,selected){if(!this.actors.size)return;const done=new Map(),visiting=new Set();
  const apply=object=>{
   if(done.has(object))return done.get(object);if(visiting.has(object))throw Error('골격 부착 부모가 순환해요.');visiting.add(object);
   try{
    if(vm.object(object.id)!==object||object.poolActive===false){this.retire(object);done.set(object,false);return false;}
    const matches=(object.components||[]).filter(c=>c.type==='SkeletalAttachment'&&c.properties?.enabled!==false);if(!matches.length){this.status(object,{active:false});done.set(object,true);return true;}if(matches.length!==1)throw Error('활성 SkeletalAttachment는 하나만 사용하세요.');
    const component=matches[0],p={...componentDefaultValues('SkeletalAttachment'),...component.properties},owner=vm.object(object.parentId||object.parent);if(!owner||owner.poolActive===false)throw Error('골격 부착에는 활성 부모 오브젝트가 필요해요.');
    if(this.actors.get(owner.id)===owner&&!apply(owner))throw Error('부모 골격 부착이 준비되지 않았어요.');
    // Weak identity storage lives on this registry, never in serialized actors.
    let binding=this.bindings.get(object);if(!binding||binding.component!==component){const row={vfxAttach:true};binding={component,row,anchor:new GameplayCueAnchor(row)};this.bindings.set(object,binding);}
    Object.assign(binding.row,{vfxAnchor:p.anchor,vfxAnchorName:p.anchorName,vfxPosition:p.position,vfxRotation:p.rotation,vfxScale:p.scale});
    const transform=binding.anchor.transform(owner,vm.objects,this.mesh?.(owner.id));Object.assign(object,transform);this.update?.(object);this.status(object,{active:true,owner:owner.id,anchor:p.anchor,name:p.anchorName});done.set(object,true);return true;
   }catch(error){this.status(object,{active:false,error:String(error.message||error).slice(0,500)});done.set(object,false);return false;}finally{visiting.delete(object);}
  };
  for(const object of selected||this.actors.values())if(object&&this.actors.get(object.id)===object)apply(object);
 }
 clear(){this.actors.clear();this.bindings=new WeakMap();}
}
