export const runtimeLODDefaults={enabled:true,distanceMode:'auto',nearDistance:20,farDistance:60,boundsRadius:0,hysteresis:.1,forcedLevel:-1,midAnimationRate:15,farAnimationRate:5,alwaysAnimate:false};
export function validRuntimeLOD(p){
 return !!p&&typeof p.enabled==='boolean'&&typeof p.alwaysAnimate==='boolean'&&['auto','xyz','xy','xz'].includes(p.distanceMode)&&Number.isFinite(p.nearDistance)&&p.nearDistance>=0&&p.nearDistance<=1000000&&Number.isFinite(p.farDistance)&&p.farDistance>p.nearDistance&&p.farDistance<=1000000&&Number.isFinite(p.boundsRadius)&&p.boundsRadius>=0&&p.boundsRadius<=1000000&&Number.isFinite(p.hysteresis)&&p.hysteresis>=0&&p.hysteresis<=.5&&Number.isInteger(p.forcedLevel)&&p.forcedLevel>=-1&&p.forcedLevel<=2&&['midAnimationRate','farAnimationRate'].every(key=>Number.isFinite(p[key])&&p[key]>=0&&p[key]<=240);
}
export function runtimeLODBand(p,distance,previous=-1){
 if(!validRuntimeLOD(p)||!Number.isFinite(distance)||distance<0)throw Error('실행 LOD 거리·단계 설정을 확인하세요.');
 if(p.forcedLevel>=0)return p.forcedLevel;
 let level=distance<p.nearDistance?0:distance<p.farDistance?1:2;
 if(previous>=0&&previous<=2){level=previous;const boundaries=[p.nearDistance,p.farDistance];while(level<2&&distance>=boundaries[level]*(1+p.hysteresis))level++;while(level>0&&distance<boundaries[level-1]*(1-p.hysteresis))level--;}
 return level;
}
// Pose presentation is scheduled independently of animation time/events/gameplay.
// Weak keys release pooled/deleted actor state without retaining scene objects.
export class RuntimeLODPolicy {
 constructor(){this.states=new WeakMap();}
 sample(object,settings,position,reference,delta,{always=false,reason=''}={}){
  const p={...runtimeLODDefaults,...settings};if(!validRuntimeLOD(p)||!Number.isFinite(delta)||delta<0)throw Error('실행 LOD 설정·시간을 확인하세요.');
  const sprite=object.components?.find(c=>c.type==='SpriteRenderer'&&c.properties?.enabled!==false),mode=p.distanceMode==='auto'?(object.kind==='sprite'||sprite)&&!sprite?.properties?.billboard?'xy':'xyz':p.distanceMode,axes=mode==='xy'?[0,1]:mode==='xz'?[0,2]:[0,1,2];
  const previous=this.states.get(object),hasCamera=Array.isArray(reference)&&reference.length===3&&reference.every(Number.isFinite),distance=hasCamera?Math.max(0,Math.hypot(...axes.map(i=>position[i]-reference[i]))-p.boundsRadius):0;
  const mirrored=object.gameplayDebug?.runtimeLOD?.level,fallback=Number.isInteger(mirrored)&&mirrored>=0&&mirrored<=2?mirrored:0;
  const level=!p.enabled?0:!hasCamera&&p.forcedLevel<0?fallback:runtimeLODBand(p,distance,previous?.level),rate=!p.enabled||!hasCamera||always||p.alwaysAnimate?0:[0,p.midAnimationRate,p.farAnimationRate][level],interval=rate?1/rate:0,elapsed=(previous?.elapsed||0)+delta,changed=!previous||previous.level!==level||previous.rate!==rate;
  const visual=changed||!interval||elapsed+1e-10>=interval;
  const remainder=visual&&interval?Math.max(0,elapsed-Math.max(1,Math.floor((elapsed+1e-10)/interval))*interval):interval?elapsed:0;
  const state={level,rate,visual,elapsed:remainder,reason:always?reason||'always-animate':!hasCamera?'no-camera':p.alwaysAnimate?'always-animate':''};this.states.set(object,state);return state;
 }
 release(object){this.states.delete(object);}
 clear(){this.states=new WeakMap();}
}
