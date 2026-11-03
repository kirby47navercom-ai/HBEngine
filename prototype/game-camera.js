import {OrthographicCamera,PerspectiveCamera,Vector3,Vector4,Color} from 'three';
import {enabledComponent} from './scene-components.js';

export function cameraFieldOfView(p){return p.physicalLens?2*Math.atan((p.sensorHeight??24)/(2*(p.focalLength??50)))*180/Math.PI:p.fieldOfView;}
export function createGameCamera(p){const camera=p.projection==='orthographic'?new OrthographicCamera(-p.orthographicSize,p.orthographicSize,p.orthographicSize,-p.orthographicSize,p.near,p.far):new PerspectiveCamera(cameraFieldOfView(p),1,p.near,p.far);camera.userData.cameraProperties=p;return camera;}
export function pixelPerfectViewport(width,height,p,pixelRatio=1){
  const cssWidth=width,cssHeight=height;width=Math.round(width*pixelRatio);height=Math.round(height*pixelRatio);
  const ppu=p.pixelPixelsPerUnit||32,reference=[p.pixelReferenceWidth||640,p.pixelReferenceHeight||360],nativeHeight=Math.max(1,Math.round(2*p.orthographicSize*ppu)),nativeWidth=Math.max(1,Math.round(nativeHeight*reference[0]/reference[1]));
  const fit=Math.min(width/nativeWidth,height/nativeHeight),scale=fit>=1?Math.floor(fit):fit;
  const w=Math.min(width,Math.round(nativeWidth*scale)),h=Math.min(height,Math.round(nativeHeight*scale));
  return {x:Math.floor((width-w)/2)/pixelRatio,y:Math.floor((height-h)/2)/pixelRatio,width:w/pixelRatio,height:h/pixelRatio,aspect:nativeWidth/nativeHeight,scale,ppu,cssWidth,cssHeight,pixelRatio};
}
export const cameraScreenRegions={full:[0,0,1,1],left:[0,0,.5,1],right:[.5,0,.5,1],top:[0,0,1,.5],bottom:[0,.5,1,.5],topRight:[.67,.02,.31,.31],bottomRight:[.67,.67,.31,.31]};
export function cameraScreenRegion(p){
  if(!p.screenOutput)return [0,0,1,1];if(p.screenRegion!=='custom')return cameraScreenRegions[p.screenRegion]||cameraScreenRegions.full;
  const x=Math.min(.999,Math.max(0,p.screenX??0)),y=Math.min(.999,Math.max(0,p.screenY??0));return [x,y,Math.max(.001,Math.min(1-x,p.screenWidth??1)),Math.max(.001,Math.min(1-y,p.screenHeight??1))];
}
export function cameraScreenRect(region,width,height,ratio=1){const [x,y,w,h]=region,left=Math.round(x*width*ratio),top=Math.round(y*height*ratio),right=Math.round((x+w)*width*ratio),bottom=Math.round((y+h)*height*ratio);return {x:left/ratio,y:height-bottom/ratio,width:Math.max(1,right-left)/ratio,height:Math.max(1,bottom-top)/ratio};}
function prepareCamera(selected,size,current){
  let c=selected.camera;const p=selected.properties,aspect=typeof size==='number'?size:size.width/Math.max(1,size.height);
  if(Boolean(c.isOrthographicCamera)!==(p.projection==='orthographic')){const previous=c,parent=c.parent;c=createGameCamera(p);c.position.copy(previous.userData.basePosition||previous.position);c.quaternion.copy(previous.quaternion);c.scale.copy(previous.scale);previous.removeFromParent();parent?.add(c);if(parent)parent.userData.gameCamera=c;}
  c.userData.cameraProperties=p;c.near=p.near;c.far=p.far;if(c.isPerspectiveCamera)c.fov=cameraFieldOfView(p);
  c.userData.pixelViewport=c.isOrthographicCamera&&p.pixelPerfect&&typeof size==='object'?pixelPerfectViewport(size.width,size.height,p):null;
  const ratio=c.userData.pixelViewport?.aspect||aspect;
  if(c.isOrthographicCamera){c.top=p.orthographicSize;c.bottom=-p.orthographicSize;c.left=-p.orthographicSize*ratio;c.right=p.orthographicSize*ratio;}else c.aspect=aspect;
  c.userData.basePosition??=c.position.clone();c.position.copy(c.userData.basePosition);
  if(p.followTarget){const target=current(p.followTarget);if(target){const position=target.getWorldPosition(new Vector3()).add(new Vector3(...(p.followOffset||[0,0,10])));c.parent?.updateWorldMatrix(true,false);c.position.copy(c.parent?c.parent.worldToLocal(position):position);}}
  const shake=selected.object.cameraShake;if(shake?.remaining>0){const t=shake.duration-shake.remaining,amplitude=shake.intensity*shake.remaining/Math.max(.001,shake.duration);c.position.x+=Math.sin(t*73.9)*amplitude;c.position.y+=Math.cos(t*91.7)*amplitude;}
  if(c.isOrthographicCamera&&p.pixelPerfect){const ppu=p.pixelPixelsPerUnit||32;c.parent?.updateWorldMatrix(true,false);const at=c.parent?c.parent.localToWorld(c.position.clone()):c.position.clone();at.x=Math.round(at.x*ppu)/ppu;at.y=Math.round(at.y*ppu)/ppu;c.position.copy(c.parent?c.parent.worldToLocal(at):at);}
  delete c.userData.gameViews;c.updateProjectionMatrix();c.updateWorldMatrix(true,false);return c;
}
export function selectGameCamera(objects,size,override,current,{single=false}={}){
  const entries=[];let selected;
  for(const object of objects){
    if(object.visible===false)continue;const authored=object.components?enabledComponent(object,'Camera'):null;if(object.components&&!authored)continue;
    const camera=current(object.id)?.userData.gameCamera,properties=authored||camera?.userData.cameraProperties;if(!camera||!properties)continue;
    const entry={object,camera,properties};entries.push(entry);if(override?object.id===override:properties.main&&(!selected||properties.priority>selected.properties.priority))selected=entry;
  }
  if(!selected&&!override)selected=entries.find(e=>e.properties.screenOutput);if(!selected)return null;
  const outputs=single?[selected]:entries.filter(e=>e===selected||e.properties.screenOutput);
  if(single||outputs.length===1&&!selected.properties.screenOutput)return prepareCamera(selected,size,current);
  outputs.sort((a,b)=>(a.properties.screenOrder||0)-(b.properties.screenOrder||0)||Number(b===selected)-Number(a===selected));
  const views=outputs.map(entry=>{const region=cameraScreenRegion(entry.properties),viewSize=typeof size==='number'?size*region[2]/region[3]:{width:size.width*region[2],height:size.height*region[3]};return {id:entry.object.id,camera:prepareCamera(entry,viewSize,current),region};});
  const primary=views.find(v=>v.id===selected.object.id).camera;Object.defineProperty(primary.userData,'gameViews',{value:views,configurable:true,writable:true});return primary;
}
// Editor previews own their projection and world pose; rendering another viewport cannot change them.
export function previewGameCamera(objects,size,id,current,previous){const source=selectGameCamera(objects,size,id,current,{single:true});if(!source)return null;const camera=previous?.type===source.type?previous:source.clone();camera.copy(source,false);delete camera.userData.gameViews;source.matrixWorld.decompose(camera.position,camera.quaternion,camera.scale);camera.updateMatrixWorld(true);return camera;}
// Viewport values are CSS pixels; Three applies the drawing-buffer pixel ratio.
export function renderGameViewport(renderer,camera,draw){
  let rect=camera.userData.pixelViewport;if(camera.userData.gameViews||!rect)return draw();const ratio=renderer.getPixelRatio();if(rect.pixelRatio!==ratio)camera.userData.pixelViewport=rect=pixelPerfectViewport(rect.cssWidth,rect.cssHeight,camera.userData.cameraProperties,ratio);
  const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),test=renderer.getScissorTest(),color=renderer.getClearColor(new Color()),alpha=renderer.getClearAlpha();
  try{renderer.setScissorTest(false);renderer.setClearColor(0,1);renderer.clear();renderer.setClearColor(color,alpha);renderer.setViewport(rect.x,rect.y,rect.width,rect.height);renderer.setScissor(rect.x,rect.y,rect.width,rect.height);renderer.setScissorTest(true);return draw();}
  finally{renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.setClearColor(color,alpha);}
}
export function fallbackGameCamera(dimension,aspect=1){const camera=dimension==='2d'?new OrthographicCamera(-7*aspect,7*aspect,7,-7,.05,100000):new PerspectiveCamera(60,aspect,.05,100000);if(dimension==='2d')camera.position.set(0,0,20);else{camera.position.set(8.6,7.2,10.5);camera.lookAt(0,.45,0);}camera.updateWorldMatrix(true,false);return camera;}
