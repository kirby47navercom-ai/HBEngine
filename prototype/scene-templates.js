import {defaultsForObject} from './scene-components.js';
import {defaultSurface,defaultEnvironment,defaultRuntimeSettings} from './model.js';
const object=(id,kind,position,scale=[1,1,1])=>({id,name:id,kind,group:'WORLD',position,rotation:[0,0,0],scale,visible:true,components:defaultsForObject(kind)});
const properties=(object,type)=>object.components.find(c=>c.type===type).properties;
export function make2DScene(){
  const floor=object('Ground','sprite',[0,-1,0],[16,1,1]);properties(floor,'SpriteRenderer').color=[.24,.38,.46,1];
  const player=object('Player','character2d',[-3,2,.1]);Object.assign(properties(player,'SpriteRenderer'),{color:[.91,.66,.29,1],width:.7,height:1.8});properties(player,'CharacterMovement2D').autoPossess=true;
  const camera=object('Camera','camera',[0,2,12]);Object.assign(properties(camera,'Camera'),{projection:'orthographic',orthographicSize:5,main:true,followTarget:'Player',followOffset:[0,2,12]});
  const platforms=[[-1,.5],[3,1.8],[7,3]].map(([x,y],i)=>{const platform=object('Platform '+(i+1),'sprite',[x,y,0],[2.5,.4,1]);properties(platform,'SpriteRenderer').color=[.33,.55,.62,1];return platform;});return [floor,player,camera,...platforms];
}
export function makeStarterScene(name,dimension='3d'){
  const environment=structuredClone(defaultEnvironment);if(dimension==='2d')Object.assign(environment,{skyEnabled:false,sunEnabled:false,cloudsEnabled:false,fogEnabled:false});
  let objects=make2DScene();if(dimension==='3d'){const floor=object('Ground','plane',[0,-.08,0],[16,1,16]),player=object('Player','character',[0,2,0]),camera=object('Camera','camera',[0,4,10]),light=object('Sun','directionalLight',[4,8,5]);properties(player,'CharacterMovement').autoPossess=true;Object.assign(properties(camera,'Camera'),{main:true,followTarget:'Player',followOffset:[0,3,9]});camera.rotation=[-12,0,0];light.rotation=[-45,25,0];objects=[floor,player,camera,light];}
  return {version:1,sceneName:name,objects,surface:structuredClone(defaultSurface),environment,runtime:{...structuredClone(defaultRuntimeSettings),dimension}};
}
