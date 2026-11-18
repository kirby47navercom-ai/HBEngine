// Rotating Movement turns at the set rate, Projectile Movement falls under gravity, bounces or stops on a hit,
// Spring Arm keeps the camera behind its parent and pulls in on a blocking hit, Text Render shows a valid one-text
// widget and Set Text Render Text updates it; a project run applies the movement step after Tick.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {MovementComponents} from '../prototype/movement-components.js';
import {textRenderWidget} from '../prototype/engine-services.js';
import {validWidgetAsset} from '../prototype/ui-assets.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const object=(id,components,extra={})=>({id,name:id,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components,...extra});
const none=async()=>({hit:false});
{const spin=object('spin',[{type:'RotatingMovement',properties:{rotationRate:[0,90,0]}}]),m=new MovementComponents();await m.step([spin],.5,{trace:none});assert.equal(spin.rotation[1],45);await m.step([spin],2,{trace:none});assert.equal(spin.rotation[1],-135,'wraps to -180..180');}
{const shot=object('shot',[{type:'ProjectileMovement',properties:{initialSpeed:10,rotationFollowsVelocity:false}}]),m=new MovementComponents();await m.step([shot],.1,{trace:none});assert.ok(Math.abs(shot.position[2]-1)<1e-9,'forward +Z: '+shot.position);assert.ok(shot.position[1]<0,'gravity');}
{const ball=object('ball',[{type:'ProjectileMovement',properties:{initialSpeed:10,shouldBounce:true,bounciness:.5,gravityScale:0}}]),m=new MovementComponents();
  await m.step([ball],.1,{trace:async()=>({hit:true,position:[0,0,.5],normal:[0,0,-1],actor:'wall'})});assert.ok(Math.abs(ball.position[2]-.49)<1e-9);assert.ok(m.projectiles.get('ball').velocity[2]<0,'bounced back');
  const stop=object('stop',[{type:'ProjectileMovement',properties:{initialSpeed:10,gravityScale:0}}]);await m.step([stop],.1,{trace:async()=>({hit:true,position:[0,0,.5],normal:[0,0,-1],actor:'wall'})});assert.equal(m.projectiles.get('stop').stopped,true,'stops without bounce');}
{const pawn=object('pawn',[]),camera=object('cam',[{type:'SpringArm',properties:{armLength:4,targetOffset:[0,1,0],collision:true}}],{parentId:'pawn'}),m=new MovementComponents();
  await m.step([pawn,camera],.1,{trace:none});assert.deepEqual(camera.position.map(v=>Math.round(v*1e6)/1e6),[0,1,4],'4 behind the pivot (camera looks -Z)');
  await m.step([pawn,camera],.1,{trace:async()=>({hit:true,position:[0,1,2],normal:[0,0,-1],actor:'wall'})});assert.ok(Math.abs(camera.position[2]-1.8)<1e-9,'pulled in: '+camera.position);
  await m.step([pawn,camera],.1,{trace:async()=>({hit:true,position:[0,1,.5],normal:[0,0,1],actor:'pawn'})});assert.ok(Math.abs(camera.position[2]-4)<1e-9,'own pawn does not block');}
assert.ok(validWidgetAsset(textRenderWidget({text:'Hello',fontSize:32,color:[1,.5,0,1],drawWidth:400,drawHeight:80})));

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/movement-components-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Movement',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8')),owner=scene.objects[0];
  owner.components=[...(owner.components||[]),{id:'spin',name:'Rotating Movement',type:'RotatingMovement',properties:{enabled:true,rotationRate:[0,30,0]}},{id:'label',name:'Text Render',type:'TextRender',properties:{enabled:true,text:'Start'}}];const start=owner.rotation[1];
  const set=makeNode('textRenderSetText');set.inputValues={...set.inputValues,target:'self',text:'Changed'};graph.nodes.push(set);const begin=graph.nodes.find(n=>n.key==='beginPlay');
  assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:set.id,pin:'exec'}).ok);
  await fs.writeFile(file,JSON.stringify(graph));owner.blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const errors=[];let vm;
  await runProject(record.file,{frames:6,onError:e=>errors.push(String(e?.message||e)),beforeFrame:async(frame,state)=>{vm=state;}});
  const live=vm.objects.find(o=>o.id===owner.id);assert.ok(Math.abs(live.rotation[1]-start)>.1,'rotating movement ran in the game loop: '+live.rotation);
  assert.equal(live.components.find(c=>c.type==='TextRender').properties.text,'Changed','Set Text Render Text');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,rotation:live.rotation[1]}));
}finally{await fs.rm(work,{recursive:true,force:true});}
