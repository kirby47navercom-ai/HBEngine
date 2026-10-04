import {OrthographicCamera,PerspectiveCamera,Vector3} from 'three';

export function createGameCamera(p){const camera=p.projection==='orthographic'?new OrthographicCamera(-p.orthographicSize,p.orthographicSize,p.orthographicSize,-p.orthographicSize,p.near,p.far):new PerspectiveCamera(p.fieldOfView,1,p.near,p.far);camera.userData.cameraProperties=p;return camera;}
export function selectGameCamera(objects,aspect,override,current){
  const selected=objects.map(object=>({object,camera:current(object.id)?.userData.gameCamera})).filter(x=>x.camera&&x.object.visible!==false&&(override?x.object.id===override:x.camera.userData.cameraProperties.main)).sort((a,b)=>b.camera.userData.cameraProperties.priority-a.camera.userData.cameraProperties.priority)[0];if(!selected)return null;
  const c=selected.camera,p=c.userData.cameraProperties;if(c.isOrthographicCamera){c.left=-p.orthographicSize*aspect;c.right=p.orthographicSize*aspect;}else c.aspect=aspect;
  if(p.followTarget){const target=current(p.followTarget);if(target){const position=target.getWorldPosition(new Vector3()).add(new Vector3(...(p.followOffset||[0,0,10])));c.parent.updateWorldMatrix(true,false);c.position.copy(c.parent.worldToLocal(position));}}
  c.updateProjectionMatrix();c.updateWorldMatrix(true,false);return c;
}
export function fallbackGameCamera(dimension,aspect=1){const camera=dimension==='2d'?new OrthographicCamera(-7*aspect,7*aspect,7,-7,.05,100000):new PerspectiveCamera(60,aspect,.05,100000);if(dimension==='2d')camera.position.set(0,0,20);else{camera.position.set(8.6,7.2,10.5);camera.lookAt(0,.45,0);}camera.updateWorldMatrix(true,false);return camera;}
