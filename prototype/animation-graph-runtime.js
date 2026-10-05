import * as THREE from 'three';
import {validateAnimationProgram} from './animation-graph-assets.js';
import {sampleTimeline,timelineLength} from './blueprint-model.js';
import {valid2DAsset,spriteAnimationFrame} from './two-d-assets.js';
import {validAsset} from './asset-documents.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const rotation=v=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...v.map(THREE.MathUtils.degToRad),'XYZ')).toArray();
const copyPose=(out,input)=>{for(let i=0;i<out.length;i++)out[i].set(input[i]);};

// Compilation resolves bindings and allocates pose buffers once. Ticks reuse them.
export class AnimationGraphPlayer {
  static async load(data,{object,group,readAsset,asset,update,spriteFrame}={}){
    const reachable=validateAnimationProgram(data),clips=new Map(),loaded=new Map();
    for(const node of data.nodes.filter(n=>reachable.has(n.id)&&n.type==='clip')){
      const name=node.properties.clip,native=group?.userData.animations?.find(c=>c.name===name);
      if(native){clips.set(node.id,{type:'native',clip:native,length:native.duration});continue;}
      let path;for(const kind of ['animation','spriteanimation']){path=await asset(name,kind);if(path)break;}if(!path)throw Error('그래프 클립이 없어요: '+name);
      if(!loaded.has(path))loaded.set(path,await readAsset(path));const stored=loaded.get(path);
      if(path.endsWith('.hbspriteanimation.json')){if(!valid2DAsset('spriteanimation',stored)||!stored.frames.length||!spriteFrame)throw Error('그래프 스프라이트 클립 오류: '+path);clips.set(node.id,{type:'sprite',data:stored,length:stored.frames.reduce((a,f)=>a+f.duration,0),path});}
      else {if(!validAsset('animation',stored))throw Error('그래프 트랜스폼 클립 오류: '+path);const tracks=stored.timeline.tracks.filter(t=>['position','rotation','scale'].includes(t.id));if(!tracks.length||tracks.some(t=>t.type!=='vec3'||!t.keys.length))throw Error('그래프 트랜스폼 클립에는 Vector 키가 필요해요.');clips.set(node.id,{type:'transform',data:stored,tracks,length:timelineLength(stored.timeline),path});}
    }
    return new AnimationGraphPlayer(data,{object,group,update,spriteFrame,reachable,clips});
  }
  constructor(data,{object,group,update,spriteFrame,reachable,clips}){
    this.data=structuredClone(data);this.object=object;this.group=group;this.update=update;this.spriteFrame=spriteFrame;this.nodes=new Map(this.data.nodes.map(n=>[n.id,n]));this.reachable=reachable;this.clips=clips;this.parameters=new Map(this.data.parameters.map(p=>[p.name,p.value]));this.slots=[];this.slotKeys=new Map();this.compiled=new Map();this.poses=new Map();this.elapsed=new Map();this.selections=new Map();this.active=new Set();this.weights=new Map();this.time=0;this.paused=false;this.disposed=false;this.sprite='';this.generation=0;const referenceSprite=object.currentSprite||object.components?.find(c=>c.type==='SpriteRenderer')?.properties.sprite;this.referenceSprites=new Map(referenceSprite?[[referenceSprite,1]]:[]);
    const slot=(key,value,type,target,binding)=>{if(this.slotKeys.has(key)){const index=this.slotKeys.get(key),old=this.slots[index];if(old.type!==type||old.rest.length!==value.length)throw Error('클립 간 포즈 자료형이 달라요: '+key);return index;}if(this.slots.length>=1024)throw Error('그래프 속성 바인딩 제한1024');const index=this.slots.length;this.slotKeys.set(key,index);this.slots.push({key,rest:new Float64Array(value),type,target,binding});return index;};
    for(const [id,source] of clips){if(!Number.isFinite(source.length)||source.length<=0)throw Error('클립 길이를 확인하세요.');const compiled=[];
      if(source.type==='transform')for(const track of source.tracks){const property=track.id==='rotation'?'quaternion':track.id,type=property==='quaternion'?'quaternion':'number',value=property==='quaternion'?rotation(object.rotation):object[property];compiled.push({slot:slot('root|'+property,value,type,group||null,null),track,rotation:property==='quaternion'});}
      if(source.type==='native')for(const track of source.clip.tracks){const binding=THREE.PropertyBinding.create(group,track.name);binding.bind();const interpolant=track.createInterpolant(),size=interpolant.resultBuffer.length,value=new Array(size).fill(NaN);binding.getValue(value,0);if(!value.every(Number.isFinite)||size<1||size>256)throw Error('지원하지 않거나 누락된 모델 트랙: '+track.name);const target=binding.targetObject,type=track.ValueTypeName==='quaternion'?'quaternion':'number',key=(target===group?'root':target?.uuid||track.name)+'|'+binding.parsedPath.propertyName+'|'+(binding.propertyIndex??'');const canonical=target===group&&['position','quaternion','scale'].includes(binding.parsedPath.propertyName)&&binding.propertyIndex===undefined?'root|'+binding.parsedPath.propertyName:key;compiled.push({slot:slot(canonical,value,type,target,binding),interpolant});}
      this.compiled.set(id,compiled);
    }
    if(this.slots.reduce((a,s)=>a+s.rest.length,0)>8192)throw Error('그래프 포즈 값 제한8192');
    this.rest=this.slots.map(s=>new Float64Array(s.rest));for(const id of reachable)this.poses.set(id,this.rest.map(v=>new Float64Array(v)));
    this.masks=new Map();for(const node of this.data.nodes.filter(n=>reachable.has(n.id)&&n.type==='layer')){
      const filters=node.properties.filters.map(f=>{const bone=f.bone==='*'?null:group?.getObjectByName(f.bone)||group?.userData.spriteSkin?.bone(f.bone);if(f.bone!=='*'&&!bone)throw Error('레이어 뼈가 없어요: '+f.bone);return {...f,bone};});
      this.masks.set(node.id,this.slots.map(s=>{let weight=0;for(const f of filters){let distance=0,target=s.target;if(f.bone){while(target&&target!==f.bone){distance++;target=target.parent;}if(!target)continue;}const amount=f.depth===0?1:Math.min(1,(distance+1)/Math.abs(f.depth));weight=clamp(weight+(f.depth<0?-amount:amount));}return weight;}));
    }
  }
  setParameter(name,value){const param=this.data.parameters.find(p=>p.name===name);if(!param||(param.type==='float'?typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>100000:typeof value!=='boolean'))throw Error('애니메이션 파라미터 자료형 오류: '+name);this.parameters.set(name,value);}
  getParameter(name){if(!this.parameters.has(name))throw Error('애니메이션 파라미터가 없어요: '+name);return this.parameters.get(name);}
  alpha(p){return clamp(p.parameter?this.parameters.get(p.parameter):p.alpha);}
  mix(out,a,b,weight,mask){for(let i=0;i<out.length;i++){const alpha=weight*(mask?.[i]??1);if(this.slots[i].type==='quaternion')THREE.Quaternion.slerpFlat(out[i],0,a[i],0,b[i],0,alpha);else for(let j=0;j<out[i].length;j++)out[i][j]=a[i][j]*(1-alpha)+b[i][j]*alpha;}}
  evaluate(delta){
    const memo=new Map(),sprites=new Map();this.active.clear();this.weights.clear();
    const evaluate=id=>{if(!id)return {pose:this.rest,sprites:this.referenceSprites};if(memo.has(id))return memo.get(id);const node=this.nodes.get(id),p=node.properties,out=this.poses.get(id);copyPose(out,this.rest);this.active.add(id);const result={pose:out,sprites:this.referenceSprites};memo.set(id,result);
      const child=input=>evaluate(node.inputs[input]);
      const mergeSprites=(a,b,w)=>{const values=new Map();for(const [key,value] of a)values.set(key,value*(1-w));for(const [key,value] of b)values.set(key,(values.get(key)||0)+value*w);return values;};
      const blend=(a,b,w,mask)=>{this.mix(out,a.pose,b.pose,w,mask);result.sprites=mergeSprites(a.sprites,b.sprites,w);};
      if(node.type==='output'){const source=child('pose');copyPose(out,source.pose);result.sprites=source.sprites;}
      else if(node.type==='clip'){
        const source=this.clips.get(id),elapsed=(this.elapsed.get(id)||0)+delta*p.rate;this.elapsed.set(id,elapsed);const absolute=elapsed+p.offset,time=p.loop?absolute%source.length:Math.min(absolute,source.length);this.weights.set(id,1);
        for(const track of this.compiled.get(id)){const value=track.interpolant?track.interpolant.evaluate(time):sampleTimeline(track.track,time);out[track.slot].set(track.rotation?rotation(value):value);}
        if(source.type==='sprite'){result.sprites=new Map();const frame=spriteAnimationFrame(source.data,time,{loop:p.loop,rate:1});if(frame)result.sprites.set(frame.sprite,1);}
      }else if(node.type==='blend'||node.type==='layer'){const w=this.alpha(p);blend(w<1?child(node.type==='layer'?'base':'a'):{pose:this.rest,sprites:new Map()},w>0?child(node.type==='layer'?'overlay':'b'):{pose:this.rest,sprites:new Map()},w,node.type==='layer'?this.masks.get(id):null);if(node.type==='layer'&&w===1){const base=child('base');this.mix(out,base.pose,child('overlay').pose,w,this.masks.get(id));result.sprites=mergeSprites(base.sprites,child('overlay').sprites,w);}}
      else if(node.type==='select'){const desired=this.parameters.get(p.parameter)?1:0;let selection=this.selections.get(id);if(!selection){selection={weight:desired,from:desired,target:desired,time:0};this.selections.set(id,selection);}if(desired!==selection.target){selection.from=selection.weight;selection.target=desired;selection.time=0;}selection.time+=delta;selection.weight=p.duration?selection.from+(selection.target-selection.from)*clamp(selection.time/p.duration):desired;const w=selection.weight;this.weights.set(id,w);blend(w<1?child('false'):{pose:this.rest,sprites:new Map()},w>0?child('true'):{pose:this.rest,sprites:new Map()},w);}
      else if(node.type==='blend1d'){const samples=[...p.samples].sort((a,b)=>a.threshold-b.threshold),value=this.parameters.get(p.parameter);let hi=samples.findIndex(s=>s.threshold>=value);if(hi<0)hi=samples.length-1;const lo=Math.max(0,hi-1),w=hi===lo||value<=samples[0].threshold?0:clamp((value-samples[lo].threshold)/(samples[hi].threshold-samples[lo].threshold));this.weights.set(id,w);blend(w<1?child(samples[lo].input):{pose:this.rest,sprites:new Map()},w?child(samples[hi].input):{pose:this.rest,sprites:new Map()},w);}
      else if(node.type==='direct'){const samples=p.samples.map(s=>({...s,value:clamp(s.parameter?this.parameters.get(s.parameter):s.weight)})),sum=samples.reduce((a,s)=>a+s.value,0),scale=p.normalize&&sum?1/sum:1;let accumulated=Math.max(0,1-sum*scale);result.sprites=new Map([...this.referenceSprites].map(([key,value])=>[key,value*accumulated]));for(let i=0;i<out.length;i++)if(this.slots[i].type!=='quaternion')for(let j=0;j<out[i].length;j++)out[i][j]=this.rest[i][j]*accumulated;for(const s of samples){const weight=s.value*scale;if(!weight)continue;const value=child(s.input),alpha=weight/(accumulated+weight);for(let i=0;i<out.length;i++)if(this.slots[i].type==='quaternion')THREE.Quaternion.slerpFlat(out[i],0,out[i],0,value.pose[i],0,alpha);else for(let j=0;j<out[i].length;j++)out[i][j]+=value.pose[i][j]*weight;for(const [key,w] of value.sprites)result.sprites.set(key,(result.sprites.get(key)||0)+w*weight);accumulated+=weight;}this.weights.set(id,sum);}
      else if(node.type==='additive'){const base=child('base'),add=child('additive'),w=this.alpha(p);copyPose(out,base.pose);for(let i=0;i<out.length;i++){if(this.slots[i].type==='quaternion'){const delta=new THREE.Quaternion().fromArray(this.rest[i]).invert().multiply(new THREE.Quaternion().fromArray(add.pose[i])),q=new THREE.Quaternion().slerp(delta,w);new THREE.Quaternion().fromArray(base.pose[i]).multiply(q).normalize().toArray(out[i]);}else for(let j=0;j<out[i].length;j++)out[i][j]=base.pose[i][j]+(add.pose[i][j]-this.rest[i][j])*w;}result.sprites=base.sprites;}
      return result;
    };return evaluate(this.data.output);
  }
  async tick(delta=0){if(this.disposed||this.paused)return;if(!Number.isFinite(delta)||delta<0)throw Error('애니메이션 갱신 시간 오류');this.time+=delta;const {pose,sprites}=this.evaluate(delta),epoch=this.generation;for(let i=0;i<this.slots.length;i++){const slot=this.slots[i],value=pose[i];if(!value.every(Number.isFinite))throw Error('애니메이션 포즈 계산 오류');if(slot.binding)slot.binding.setValue(value,0);if(slot.key.startsWith('root|')){const key=slot.key.slice(5);if(key==='quaternion'){const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(value),'XYZ');this.object.rotation=[e.x,e.y,e.z].map(THREE.MathUtils.radToDeg);}else if(['position','scale'].includes(key))this.object[key]=Array.from(value);}}
    this.update?.(this.object);const sprite=[...sprites].sort((a,b)=>b[1]-a[1])[0]?.[0];if(sprite&&sprite!==this.sprite){await this.spriteFrame(this.object,sprite);if(this.disposed||this.generation!==epoch)return;this.sprite=sprite;}this.publish();
  }
  publish(){this.publishedState={asset:this.path,time:this.time,paused:this.paused,parameters:Object.fromEntries(this.parameters),active:[...this.active],weights:Object.fromEntries(this.weights),clips:[...this.elapsed].map(([id,time])=>({id,time})),bindings:this.slots.length};this.object.gameplayDebug={...this.object.gameplayDebug,animationGraph:this.publishedState};}
  snapshot(){return {actor:this.object.id,asset:this.path,slots:this.slots.map(s=>{const value=new Array(s.rest.length).fill(0);if(s.binding)s.binding.getValue(value,0);else if(s.key==='root|quaternion')value.splice(0,value.length,...rotation(this.object.rotation));else value.splice(0,value.length,...this.object[s.key.slice(5)]);return {name:s.binding?.path||s.key,type:s.type,value};})};}
  dispose(){this.disposed=true;this.generation++;if(this.publishedState&&this.object.gameplayDebug?.animationGraph===this.publishedState)delete this.object.gameplayDebug.animationGraph;for(const slot of this.slots)slot.binding?.unbind();this.poses.clear();this.compiled.clear();}
}
