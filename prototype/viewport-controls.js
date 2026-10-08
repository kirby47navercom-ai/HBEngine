import {EventDispatcher,Euler,MathUtils,Spherical,Vector3} from 'three';

export const defaultViewportSettings=Object.freeze({speed:6,speedScalar:1,fastMultiplier:4,sensitivity:.003,scrollZoomSpeed:1,distanceBasedSpeed:false,worldSpaceVerticalPan:false,invertMiddleMousePan:false,invertOrbitY:false,invertDolly:false,invertLookY:false,zoomToCursor:true,flightMode:'rmb',restoreFov:true});
const numericalRanges={speed:[.001,1e6],speedScalar:[.001,1e4],fastMultiplier:[1,100],sensitivity:[.00001,.1],scrollZoomSpeed:[.01,100]};
const boolSettings=['distanceBasedSpeed','worldSpaceVerticalPan','invertMiddleMousePan','invertOrbitY','invertDolly','invertLookY','zoomToCursor','restoreFov'];
const flyCodes=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyR','KeyF','KeyZ','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Numpad8','Numpad2','Numpad4','Numpad6','Numpad7','Numpad9','Numpad1','Numpad3']);
const vectorArray=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
const directions=new Set(['3d','2d','top','bottom','front','back','left','right']);
const normalArray=(v,n)=>vectorArray(v,n)&&v.some(x=>x!==0)&&Number.isFinite(v.reduce((sum,x)=>sum+x*x,0));
const editable=target=>target?.isContentEditable||!!target?.closest?.('input,textarea,select,[contenteditable="true"]');
const eventCode=e=>e.code||(/^[a-z]$/i.test(e.key||'')?'Key'+e.key.toUpperCase():e.key);

export function validViewportCameraState(state,camera){
  return !!state&&vectorArray(state.position,3)&&vectorArray(state.target,3)&&(!state.quaternion||normalArray(state.quaternion,4))&&(!state.up||normalArray(state.up,3))&&(state.direction===undefined||directions.has(state.direction))&&(state.projection===undefined||['perspective','orthographic'].includes(state.projection))&&(!state.direction||!state.projection||(state.direction==='3d')===(state.projection==='perspective'))&&(state.zoom===undefined||Number.isFinite(state.zoom)&&state.zoom>0)&&(state.fov===undefined||Number.isFinite(state.fov)&&state.fov>0&&state.fov<180)&&(state.near===undefined||Number.isFinite(state.near)&&state.near>0)&&(state.far===undefined||Number.isFinite(state.far))&&(state.far??camera?.far??Infinity)>(state.near??camera?.near??0);
}

/** Shared editor camera input. Selection, transforms, renderer and projection ownership stay with the editor. */
export function createViewportControls(camera,canvas,options={}){return new ViewportControls(camera,canvas,options);}
export class ViewportControls extends EventDispatcher{
  constructor(camera,canvas,options={}){
    super();this._camera=camera;this.domElement=canvas;this.options=options;this.target=new Vector3();this.settings={...defaultViewportSettings};this.enableRotate=true;this.enablePan=true;this.enableZoom=true;this._enabled=true;this._disposed=false;this._keys=new Set();this._gesture=null;this._lastDragged=false;this._bookmarks=new Map();this._listeners=[];this._documentListeners=[];this._clock=options.now||(()=>performance.now());this._lastTime=this._clock();this._shift=false;
    this._doc=canvas.ownerDocument||globalThis.document;this._window=options.eventTarget||this._doc?.defaultView||globalThis.window;
    this._position=camera.position.clone();this._quaternion=camera.quaternion.clone();this._target=this.target.clone();this._zoom=camera.zoom;this._fov=camera.fov;
    this._oldTouchAction=canvas.style?.touchAction;this._oldTabIndex=canvas.getAttribute?.('tabindex');if(canvas.style)canvas.style.touchAction='none';if(canvas.tabIndex<0)canvas.tabIndex=0;
    if(options.target)this.target.copy(options.target.isVector3?options.target:new Vector3(...options.target));if(options.settings)this.setSettings(options.settings);
    const listen=(target,name,handler,opts)=>{target?.addEventListener(name,handler,opts);this._listeners.push(()=>target?.removeEventListener(name,handler,opts));};
    listen(canvas,'pointerdown',e=>this._pointerDown(e));listen(canvas,'pointermove',e=>this._pointerMove(e));listen(canvas,'pointerup',e=>this._pointerUp(e));listen(canvas,'pointercancel',e=>this._pointerUp(e,true));listen(canvas,'lostpointercapture',()=>this.cancel());
    listen(canvas,'wheel',e=>this._wheel(e),{passive:false});listen(canvas,'contextmenu',e=>{if(this.enabled)e.preventDefault();});
    listen(canvas,'hb:document-moved',()=>this._bindDocument());this._bindDocument();
    this._position.set(NaN,NaN,NaN);this.update(0);
  }
  get object(){return this._camera;}
  set object(camera){this.cancel();this._camera=camera;this._position.set(NaN,NaN,NaN);this._quaternion.copy(camera.quaternion);this._zoom=camera.zoom;this._fov=camera.fov;this.update(0);}
  get camera(){return this._camera;}
  get enabled(){return this._enabled&&!this._disposed;}
  set enabled(value){this._enabled=!!value;if(!value)this.cancel();}
  get isNavigating(){return !!this._gesture&&!this._gesture.marquee;}
  get isFlying(){return !!(this.enabled&&this.camera.isPerspectiveCamera&&this.settings.flightMode!=='never'&&((this._gesture?.buttons&2)&&!this._gesture?.marquee||this.settings.flightMode==='always'&&this._focused()));}
  wasDragged(){return this._gesture?.moved||this._lastDragged;}
  getSettings(){return {...this.settings};}
  _bindDocument(){
    this.cancel();this._documentListeners.splice(0).forEach(remove=>remove());this._doc=this.domElement.ownerDocument||globalThis.document;this._window=this.options.eventTarget||this._doc?.defaultView||globalThis.window;
    const listen=(target,name,handler,opts)=>{target?.addEventListener(name,handler,opts);this._documentListeners.push(()=>target?.removeEventListener(name,handler,opts));};
    listen(this._doc,'pointerup',e=>{if(e.target!==this.domElement)this._pointerUp(e);});listen(this._doc,'pointercancel',()=>this.cancel());listen(this._window,'keydown',e=>this._keyDown(e),true);listen(this._window,'keyup',e=>this._keyUp(e),true);listen(this._window,'blur',()=>this.cancel());listen(this._doc,'visibilitychange',()=>{if(this._doc.hidden)this.cancel();});
  }
  setSettings(patch={}){
    const next={...this.settings};for(const [key,[min,max]] of Object.entries(numericalRanges))if(key in patch){if(!Number.isFinite(patch[key])||patch[key]<min||patch[key]>max)throw new RangeError('뷰포트 설정 범위: '+key);next[key]=patch[key];}
    for(const key of boolSettings)if(key in patch){if(typeof patch[key]!=='boolean')throw new TypeError('뷰포트 설정 형식: '+key);next[key]=patch[key];}
    if('flightMode' in patch){if(!['rmb','always','never'].includes(patch.flightMode))throw new TypeError('뷰포트 비행 조작 형식');next.flightMode=patch.flightMode;}
    this.settings=next;this.dispatchEvent({type:'settings',settings:this.getSettings()});return this;
  }
  getState(){const c=this.camera;return {projection:c.isOrthographicCamera?'orthographic':'perspective',...(c.userData.viewportDirection?{direction:c.userData.viewportDirection}:{}),position:c.position.toArray(),target:this.target.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),zoom:c.zoom,...(c.isPerspectiveCamera?{fov:c.fov}:{}),near:c.near,far:c.far,settings:this.getSettings()};}
  setState(state,{restoreSettings=true}={}){
    if(!validViewportCameraState(state,this.camera))return false;
    const projection=this.camera.isOrthographicCamera?'orthographic':'perspective';if(state.projection&&state.projection!==projection)return false;
    if(state.direction&&(state.direction==='3d')!==!!this.camera.isPerspectiveCamera)return false;
    if(restoreSettings&&state.settings){try{this.setSettings(state.settings);}catch{return false;}}
    this.cancel();const c=this.camera;c.position.fromArray(state.position);this.target.fromArray(state.target);if(state.up)c.up.fromArray(state.up).normalize();if(state.direction)c.userData.viewportDirection=state.direction;if(state.quaternion)c.quaternion.fromArray(state.quaternion).normalize();else c.lookAt(this.target);
    for(const key of ['zoom','near','far'])if(state[key]!==undefined)c[key]=state[key];if(c.isPerspectiveCamera&&state.fov!==undefined)c.fov=state.fov;c.updateProjectionMatrix();this._commit();this.dispatchEvent({type:'end'});return true;
  }
  saveBookmark(slot){if(!Number.isInteger(slot)||slot<0||slot>9)return false;this._bookmarks.set(slot,this.getState());this.dispatchEvent({type:'bookmark',slot});return true;}
  getBookmark(slot){const value=this._bookmarks.get(slot);return value?structuredClone(value):null;}
  restoreBookmark(slot){const value=this.getBookmark(slot);if(!value||!validViewportCameraState(value))return false;if(this.options.onRestoreBookmark)return this.options.onRestoreBookmark(value,slot)!==false;return this.setState(value);}
  removeBookmark(slot){return this._bookmarks.delete(slot);}
  getBookmarks(){return [...this._bookmarks].map(([slot,state])=>({slot,state:structuredClone(state)}));}
  setBookmarks(bookmarks){this._bookmarks.clear();for(const row of Array.isArray(bookmarks)?bookmarks:[])if(Number.isInteger(row.slot)&&row.slot>=0&&row.slot<=9&&row.state&&vectorArray(row.state.position,3)&&vectorArray(row.state.target,3))this._bookmarks.set(row.slot,structuredClone(row.state));return this;}
  _focused(){return this._doc?.activeElement===this.domElement||this.domElement.contains?.(this._doc?.activeElement);}
  _distance(){return Math.max(.000001,this.camera.position.distanceTo(this.target));}
  _speed(){return this.settings.speed*this.settings.speedScalar*(this._shift?this.settings.fastMultiplier:1)*(this.settings.distanceBasedSpeed?Math.max(.001,this._distance()/10):1);}
  _forward(){return this.camera.getWorldDirection(new Vector3());}
  _right(){return new Vector3(1,0,0).applyQuaternion(this.camera.quaternion);}
  _up(){return new Vector3(0,1,0).applyQuaternion(this.camera.quaternion);}
  _translate(offset){this.camera.position.add(offset);this.target.add(offset);this._commit();}
  _commit(){const c=this.camera;c.updateMatrixWorld();this._position.copy(c.position);this._quaternion.copy(c.quaternion);this._target.copy(this.target);this._zoom=c.zoom;this._fov=c.fov;this.dispatchEvent({type:'change'});}
  _look(dx,dy,yawOnly=false){if(!this.enableRotate)return;const c=this.camera,distance=this._distance(),euler=new Euler().setFromQuaternion(c.quaternion,'YXZ');euler.y-=dx*this.settings.sensitivity;if(!yawOnly)euler.x=MathUtils.clamp(euler.x-dy*this.settings.sensitivity*(this.settings.invertLookY?-1:1),-Math.PI/2+.000001,Math.PI/2-.000001);c.quaternion.setFromEuler(euler);this.target.copy(c.position).addScaledVector(this._forward(),distance);this._commit();}
  _orbit(dx,dy){if(!this.enableRotate)return;const offset=this.camera.position.clone().sub(this.target),s=new Spherical().setFromVector3(offset);s.radius=Math.max(.000001,s.radius);s.theta-=dx*this.settings.sensitivity;s.phi=MathUtils.clamp(s.phi-dy*this.settings.sensitivity*(this.settings.invertOrbitY?-1:1),.000001,Math.PI-.000001);this.camera.position.copy(this.target).add(new Vector3().setFromSpherical(s));this.camera.lookAt(this.target);this._commit();}
  _unitsPerPixel(){const c=this.camera,height=Math.max(1,this.domElement.getBoundingClientRect().height);return c.isOrthographicCamera?(c.top-c.bottom)/(c.zoom*height):2*this._distance()*Math.tan(MathUtils.degToRad(c.fov/2))/height;}
  _pan(dx,dy){if(!this.enablePan)return;const unit=this._unitsPerPixel(),sign=this.settings.invertMiddleMousePan?-1:1,up=this.settings.worldSpaceVerticalPan&&!this.camera.isOrthographicCamera?new Vector3(0,1,0):this._up();this._translate(this._right().multiplyScalar(-dx*unit*sign).addScaledVector(up,dy*unit*sign));}
  _zoomOrtho(amount,event){if(!this.enableZoom)return;const c=this.camera,rect=this.domElement.getBoundingClientRect(),x=event?2*(event.clientX-rect.left)/Math.max(1,rect.width)-1:0,y=event?1-2*(event.clientY-rect.top)/Math.max(1,rect.height):0; c.updateMatrixWorld();const before=new Vector3(x,y,0).unproject(c);c.zoom=MathUtils.clamp(c.zoom*Math.exp(MathUtils.clamp(amount,-10,10)),1e-9,1e9);c.updateProjectionMatrix();if(this.settings.zoomToCursor&&event){const after=new Vector3(x,y,0).unproject(c),offset=before.sub(after);c.position.add(offset);this.target.add(offset);}this._commit();}
  _dolly(amount,event,orbit=false){if(!this.enableZoom)return;if(this.camera.isOrthographicCamera)return this._zoomOrtho(-amount,event);if(orbit){const distance=this._distance(),next=Math.max(.000001,distance*Math.exp(MathUtils.clamp(amount,-10,10)));this.camera.position.copy(this.target).addScaledVector(this._forward(),-next);this._commit();}else this._translate(this._forward().multiplyScalar(-amount*this._speed()));}
  _pointerDown(e){
    if(!this.enabled||e.button>2||editable(e.target)||this.options.shouldHandle?.(e)===false)return;e.preventDefault();this.domElement.focus?.({preventScroll:true});this._shift=e.shiftKey;
    if(this._gesture){const g=this._gesture;if(e.pointerId!==g.id)return;if(g.marquee&&((e.buttons&3)===3||e.buttons&4)){if(g.moved)this._marqueeEvent(e,'cancel');g.marquee=null;}g.buttons=e.buttons;g.x=e.clientX;g.y=e.clientY;return;}
    const marquee=this.camera.isOrthographicCamera&&!this.options.orbitOnLeftDrag&&!e.altKey&&(e.button===0||e.button===2&&e.ctrlKey)?(e.ctrlKey&&e.button===2?'subtract':e.shiftKey?'add':'replace'):null;
    this._gesture={id:e.pointerId,buttons:e.buttons||[1,4,2][e.button],button:e.button,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,marquee,baseFov:this.camera.fov};this._lastDragged=false;this.domElement.setPointerCapture?.(e.pointerId);this.dispatchEvent({type:'start'});
  }
  _marqueeEvent(e,stage){const g=this._gesture,rect=this.domElement.getBoundingClientRect();this.options.onMarquee?.({stage,mode:g.marquee,x1:g.startX-rect.left,y1:g.startY-rect.top,x2:e.clientX-rect.left,y2:e.clientY-rect.top,event:e});}
  _pointerMove(e){
    const g=this._gesture;if(!this.enabled||!g||e.pointerId!==g.id)return;if(!e.buttons){this._pointerUp(e,true);return;}e.preventDefault();this._shift=e.shiftKey;const dx=e.clientX-g.x,dy=e.clientY-g.y;g.x=e.clientX;g.y=e.clientY;g.buttons=e.buttons;
    if(!g.moved&&Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>=4){g.moved=true;if(g.marquee)this._marqueeEvent(e,'start');}if(!g.moved)return;
    if(g.marquee){this._marqueeEvent(e,'move');return;}
    if(this.options.orbitOnLeftDrag&&g.buttons===1){this.camera.isOrthographicCamera?this._pan(dx,dy):this._orbit(dx,dy);return;}
    if(e.altKey){if(g.buttons&4)this._pan(dx,dy);else if(g.buttons&2)this._dolly(dy*.01*(this.settings.invertDolly?-1:1),e,true);else if(g.buttons&1){if(this.camera.isOrthographicCamera)this._pan(dx,dy);else this._orbit(dx,dy);}return;}
    if(this.camera.isOrthographicCamera){if((g.buttons&3)===3)this._zoomOrtho(-dy*.01,e);else if(g.buttons&6)this._pan(dx,dy);return;}
    if((g.buttons&3)===3||g.buttons&4)this._pan(dx,dy);else if(g.buttons&2)this._look(dx,dy);else if(g.buttons&1){this._look(dx,0,true);const forward=this._forward();forward.y=0;if(forward.lengthSq()<1e-12)forward.set(0,0,-1);this._translate(forward.normalize().multiplyScalar(dy*this._unitsPerPixel()));}
  }
  _restoreFov(){const g=this._gesture;if(g&&this.camera.isPerspectiveCamera&&this.settings.restoreFov&&this.camera.fov!==g.baseFov){this.camera.fov=g.baseFov;this.camera.updateProjectionMatrix();this._commit();}}
  _pointerUp(e,cancelled=false){
    const g=this._gesture;if(!g||e.pointerId!==g.id)return;this._lastDragged=g.moved;
    if(!cancelled&&e.buttons){if(!(e.buttons&2)){this._restoreFov();this._keys.clear();}g.buttons=e.buttons;return;}
    if(g.marquee&&g.moved)this._marqueeEvent(e,cancelled?'cancel':'end');
    if(!cancelled&&!g.moved){if(g.button===0)this.options.onSelect?.(e);else if(g.button===2&&!e.ctrlKey&&!e.altKey)this.options.onContextMenu?.(e);}
    this._restoreFov();this._gesture=null;this._keys.clear();this._shift=false;try{if(this.domElement.hasPointerCapture?.(g.id))this.domElement.releasePointerCapture(g.id);}catch{}this.dispatchEvent({type:'end'});
  }
  cancel(){if(!this._gesture){this._keys?.clear();this._shift=false;return;}const g=this._gesture;this._pointerUp({pointerId:g.id,buttons:0,clientX:g.x,clientY:g.y},true);}
  _wheel(e){if(!this.enabled||this.options.shouldHandle?.(e)===false)return;e.preventDefault();e.stopPropagation();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.domElement.getBoundingClientRect().height:1);if(!delta)return;
    if(this._gesture?.buttons&2&&!e.altKey&&!this._gesture.marquee){this.setSettings({speed:MathUtils.clamp(this.settings.speed*Math.exp(MathUtils.clamp(-delta*.002,-4,4)),.001,1e6)});}else if(this.camera.isOrthographicCamera)this._zoomOrtho(-delta*.002*this.settings.scrollZoomSpeed,e);else this._dolly(delta/120*.35*this.settings.scrollZoomSpeed,e,!!e.altKey||this.options.orbitOnLeftDrag);this.dispatchEvent({type:'end'});
  }
  _keyDown(e){if(!this.enabled||editable(e.target)||!this._focused()&&!this._gesture)return;const code=eventCode(e);this._shift=e.shiftKey;if(code==='Escape'&&this._gesture){this.cancel();e.preventDefault();e.stopPropagation();return;}
    if(this.isFlying&&flyCodes.has(code)){this._keys.add(code);e.preventDefault();e.stopPropagation();return;}
    if(code==='KeyF'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&this.options.onFocus){this.options.onFocus(e);e.preventDefault();e.stopPropagation();return;}
    if(/^Digit[0-9]$/.test(code)&&this.options.bookmarkShortcuts){const slot=Number(code.at(-1));if(e.ctrlKey||e.metaKey)this.saveBookmark(slot);else if(!e.altKey)this.restoreBookmark(slot);else return;e.preventDefault();e.stopPropagation();}
  }
  _keyUp(e){const code=eventCode(e),held=this._keys.delete(code);this._shift=e.shiftKey;if(held){e.preventDefault();e.stopPropagation();}}
  update(delta){if(this._disposed)return false;if(this.domElement.ownerDocument&&this.domElement.ownerDocument!==this._doc)this._bindDocument();const now=this._clock(),dt=Math.min(.25,Math.max(0,Number.isFinite(delta)?delta:(now-this._lastTime)/1000));this._lastTime=now;let changed=false;
    const c=this.camera;if(!this._position.equals(c.position)||!this._target.equals(this.target)){if(c.position.distanceToSquared(this.target)>1e-16)c.lookAt(this.target);this._commit();changed=true;}else if(!this._quaternion.equals(c.quaternion)||this._zoom!==c.zoom||this._fov!==c.fov){this._commit();changed=true;}
    if(!this.isFlying||!dt)return changed;const has=(...codes)=>codes.some(code=>this._keys.has(code)),forward=+has('KeyW','ArrowUp','Numpad8')-+has('KeyS','ArrowDown','Numpad2'),right=+has('KeyD','ArrowRight','Numpad6')-+has('KeyA','ArrowLeft','Numpad4'),up=+has('KeyE','PageUp','Numpad9')-+has('KeyQ','PageDown','Numpad7'),localUp=+has('KeyR')-+has('KeyF');
    const motion=this._forward().multiplyScalar(forward).addScaledVector(this._right(),right).add(new Vector3(0,up,0)).addScaledVector(this._up(),localUp);if(motion.lengthSq()>0){motion.normalize().multiplyScalar(this._speed()*dt);this._translate(motion);changed=true;}
    const fov=+has('KeyZ','Numpad1')-+has('KeyC','Numpad3');if(fov){c.fov=MathUtils.clamp(c.fov+fov*30*dt,5,150);c.updateProjectionMatrix();this._commit();changed=true;}return changed;
  }
  dispose(){if(this._disposed)return;this.cancel();this._disposed=true;this._listeners.splice(0).forEach(remove=>remove());this._documentListeners.splice(0).forEach(remove=>remove());if(this.domElement.style)this.domElement.style.touchAction=this._oldTouchAction||'';if(this._oldTabIndex===null)this.domElement.removeAttribute?.('tabindex');else if(this._oldTabIndex!==undefined)this.domElement.setAttribute?.('tabindex',this._oldTabIndex);}
}
