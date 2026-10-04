import {Raycaster,Vector2,Vector3} from 'three';

const aliases={space:' ',spacebar:' ',mouse0:'leftmousebutton',mouseleft:'leftmousebutton',mouse1:'rightmousebutton',mouseright:'rightmousebutton',mouse2:'middlemousebutton',mousemiddle:'middlemousebutton'};
export const inputKey=key=>aliases[String(key).toLowerCase()]||String(key).toLowerCase();
const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
export function validPointer(pointer){return !!pointer&&vector(pointer.position,2)&&vector(pointer.size,2)&&pointer.size.every(v=>v>0&&v<=100000)&&pointer.position.every(v=>Math.abs(v)<=1000000)&&(pointer.inside===undefined||typeof pointer.inside==='boolean');}
export function validInputPacket(packet){return !!packet&&typeof packet==='object'&&(packet.pointer!==undefined||packet.key!==undefined)&&(packet.source===undefined||typeof packet.source==='string'&&packet.source.length>0&&packet.source.length<=160)&&(packet.pointer===undefined||validPointer(packet.pointer))&&(packet.key===undefined||typeof packet.key==='string'&&packet.key.length>0&&packet.key.length<=80&&(packet.value===undefined||Number.isFinite(packet.value)&&Math.abs(packet.value)<=1));}
export function validInputSnapshot(s){const p=s?.pointer;return !!s&&s.keys&&typeof s.keys==='object'&&!Array.isArray(s.keys)&&Object.entries(s.keys).length<=256&&Object.entries(s.keys).every(([k,v])=>k.length>0&&k.length<=80&&Number.isFinite(v)&&Math.abs(v)<=1)&&validPointer(p)&&['valid','inside','rayValid'].every(k=>typeof p[k]==='boolean')&&vector(p.delta,2)&&vector(p.origin,3)&&vector(p.direction,3)&&[...p.delta,...p.origin].every(v=>Math.abs(v)<=2000000)&&p.direction.every(v=>Math.abs(v)<=1.001)&&(!p.rayValid||p.valid&&p.inside&&Math.abs(Math.hypot(...p.direction)-1)<.001);}

// One state contract for Play, the packaged Player, C++ and headless scenarios.
// Positions and deltas use canvas-local CSS pixels, with (0,0) at the top left.
export class RuntimeInput {
  constructor(){this.keys=new Map();this.sources=new Map();this.clearPointer();}
  clearPointer(){this.pointer={valid:false,inside:false,position:[0,0],size:[1,1],delta:[0,0],origin:[0,0,0],direction:[0,0,0],rayValid:false};}
  clear(){this.keys.clear();this.sources.clear();this.clearPointer();}
  set(key,value,source='default'){key=inputKey(key);let values=this.sources.get(source);if(!values){if(!value)return this.keys.get(key)||0;if(this.sources.size>=256)throw Error('동시 입력 소스 제한 초과');values=new Map();this.sources.set(source,values);}if(value){if(!this.keys.has(key)&&this.keys.size>=256)throw Error('동시 입력 키 제한 초과');values.set(key,value);}else values.delete(key);if(!values.size)this.sources.delete(source);let sum=0;for(const values of this.sources.values())sum+=values.get(key)||0;const total=Math.max(-1,Math.min(1,sum));if(total)this.keys.set(key,total);else this.keys.delete(key);return total;}
  pointerSample(sample){if(!validPointer(sample))throw Error('마우스 좌표와 뷰포트 크기를 확인하세요.');const p=this.pointer,inside=sample.inside??(sample.position.every((v,i)=>v>=0&&v<=sample.size[i]));if(p.valid)for(let i=0;i<2;i++)p.delta[i]+=sample.position[i]-p.position[i];p.position=[...sample.position];p.size=[...sample.size];p.inside=inside;p.valid=true;}
  refresh(camera){const p=this.pointer;p.rayValid=false;p.origin=[0,0,0];p.direction=[0,0,0];if(!p.valid||!p.inside||!camera?.isCamera)return;camera.updateWorldMatrix(true,false);const ray=new Raycaster();ray.setFromCamera(new Vector2(p.position[0]/p.size[0]*2-1,1-p.position[1]/p.size[1]*2),camera);p.origin=ray.ray.origin.toArray();p.direction=ray.ray.direction.toArray();p.rayValid=true;}
  snapshot(camera){this.refresh(camera);return {keys:Object.fromEntries(this.keys),pointer:structuredClone(this.pointer)};}
  endFrame(){this.pointer.delta=[0,0];}
  query(key,args={}){const p=this.pointer;if(key==='inputKeyDown')return {return:!!this.keys.get(inputKey(args.key))};if(key==='inputAxisValue')return {return:this.keys.get(inputKey(args.key))||0};if(key==='mousePosition')return {return:p.valid&&p.inside,position:[...p.position]};if(key==='mouseDelta')return {return:[...p.delta]};if(key==='mouseRay')return {return:p.rayValid,origin:[...p.origin],direction:[...p.direction]};if(key==='mouseWorldPlane'){
    if(!vector(args.normal,3)||!vector(args.point,3))throw Error('조준 평면을 확인하세요.');const normal=new Vector3(...args.normal),denominator=normal.dot(new Vector3(...p.direction)),distance=normal.dot(new Vector3(...args.point).sub(new Vector3(...p.origin)))/denominator,valid=p.rayValid&&normal.lengthSq()>1e-12&&Math.abs(denominator)>1e-8&&Number.isFinite(distance)&&distance>=0;return {return:valid,position:valid?p.origin.map((v,i)=>v+p.direction[i]*distance):[0,0,0]};
  }}
}

export function bindRuntimePointer(canvas,{runtime,enabled=()=>true,camera,error=console.error}){
  let doc,win;const held=new Map(),listeners=[],documentListeners=[];
  const listen=(element,type,handler,options)=>{element.addEventListener(type,handler,options);listeners.push(()=>element.removeEventListener(type,handler,options));};
  const sample=e=>{const r=canvas.getBoundingClientRect();return r.width>0&&r.height>0?{position:[e.clientX-r.left,e.clientY-r.top],size:[r.width,r.height]}:null;};
  const current=()=>enabled()?runtime():null,send=(vm,packet)=>vm?.dispatchInput(packet,camera).catch(error);
  const accepted=e=>!e.pointerType||['mouse','pen'].includes(e.pointerType)||e.pointerType==='touch'&&e.isPrimary!==false;
  const move=e=>{const vm=current();if(!vm||!accepted(e))return;const pointer=sample(e);if(pointer)vm.pointer(pointer,camera);};
  const button=e=>({0:'LeftMouseButton',1:'MiddleMouseButton',2:'RightMouseButton'})[e.button];
  const down=e=>{const vm=current(),key=button(e);if(!vm||!key||!accepted(e))return;const pointer=sample(e);if(!pointer)return;e.preventDefault();canvas.focus({preventScroll:true});held.set(key,{vm,id:e.pointerId});try{canvas.setPointerCapture(e.pointerId);}catch{}send(vm,{pointer,key,value:1,source:'pointer:'+e.pointerId});};
  const up=e=>{const key=button(e),state=held.get(key);if(!state||state.id!==e.pointerId)return;held.delete(key);e.preventDefault();const pointer=sample(e);send(state.vm,{...(pointer?{pointer}:{}),key,value:0,source:'pointer:'+state.id});if(![...held.values()].some(s=>s.id===state.id))try{canvas.releasePointerCapture(state.id);}catch{}};
  const cancel=()=>{const states=[...held.values()],vms=new Set(states.map(s=>s.vm));const vm=runtime();if(vm)vms.add(vm);held.clear();for(const {id} of states)try{canvas.releasePointerCapture(id);}catch{}for(const vm of vms)vm.releaseInput().catch(error);};
  listen(canvas,'pointermove',move);listen(canvas,'pointerdown',down);listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',()=>{if(held.size)cancel();});
  listen(canvas,'pointerleave',e=>{if(!held.size&&current()){const pointer=sample(e);if(pointer)current().pointer({...pointer,inside:false},camera);}});
  listen(canvas,'contextmenu',e=>{if(current())e.preventDefault();});
  listen(canvas,'wheel',e=>{const vm=current();if(!vm)return;e.preventDefault();const pointer=sample(e);if(pointer)vm.pointer(pointer,camera);send(vm,{key:'MouseWheelAxis',value:-Math.sign(e.deltaY)});},{passive:false});
  const refreshDocument=()=>{if(doc===canvas.ownerDocument)return;if(doc)cancel();documentListeners.splice(0).forEach(remove=>remove());doc=canvas.ownerDocument;win=doc.defaultView;const on=(element,type,handler,options)=>{element.addEventListener(type,handler,options);documentListeners.push(()=>element.removeEventListener(type,handler,options));};on(doc,'pointerup',up,{capture:true});on(win,'blur',cancel);on(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});};
  listen(canvas,'blur',cancel);refreshDocument();
  const dispose=()=>{cancel();listeners.forEach(remove=>remove());documentListeners.splice(0).forEach(remove=>remove());};dispose.refreshDocument=refreshDocument;return dispose;
}
