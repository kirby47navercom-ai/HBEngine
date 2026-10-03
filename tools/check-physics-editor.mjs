import assert from 'node:assert/strict';
import {editorCommand,engineRequest} from './hb.mjs';
import {createAsset} from '../prototype/asset-documents.js';
import {defaultRuntimeSettings} from '../prototype/model.js';
import {makeSceneComponent as c} from '../prototype/scene-components.js';

const base=process.argv[2]||'http://127.0.0.1:5182',clients=(await engineRequest(base,'/api/automation')).clients.sort((a,b)=>b.seen-a.seen);
assert.ok(clients.length,'검증 전용 편집기를 먼저 연다');
const call=(method,params)=>editorCommand(base,method,params,{clientId:clients[0].id,timeout:30000}),original=await call('editor.state');
assert.equal(original.projectName,'authoring-qa','사용자 프로젝트를 변경하지 않는다');
assert.equal(original.running,false,'기존 플레이를 종료하거나 바꾸지 않는다');
const schema=await engineRequest(base,'/api/schema');
assert.equal(schema.physics.backend,'rapier');assert.deepEqual(schema.physics.dimensions,[2,3]);
assert.equal(schema.physics.units.angularVelocity,'rad/s');assert.equal(schema.physics.queryDefaults.mask,-1);
for(const key of schema.physics.queryKeys)assert.ok(schema.blueprint.nodes.find(n=>n.key===key)?.cppName);
for(const dim of ['','2D'])assert.ok(schema.components['PhysicsConstraint'+dim]&&schema.components['ConstantForce'+dim]);
for(const dimension of [2,3]){const response=await fetch(base+`/node_modules/@dimforge/rapier${dimension}d-compat/dist/rapier.mjs`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');}
const path=`Assets/Scenes/Physics_API_${Date.now()}.hbscene.json`,data=createAsset('scene','Physics API QA');data.runtime={...defaultRuntimeSettings,dimension:'2d'};
const object=(id,dim,body=false)=>({id,name:id,kind:'sphere',position:[dim===2?0:10,body?3:-.1,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[c('Transform',{},'transform'),c(dim===2?(body?'CircleCollider2D':'BoxCollider2D'):(body?'SphereCollider':'BoxCollider'),body?{}:{extent:[5,.1,5]},'collider'),...(body?[c(dim===2?'Rigidbody2D':'Rigidbody',{mass:2,useGravity:true,collisionDetection:'continuous'},'body')]:[])]});
data.objects=[object('Floor2D',2),object('Ball2D',2,true),object('Floor3D',3),object('Ball3D',3,true),object('Held2D',2,true)];
data.objects[4].position=[2,3,0];data.objects[4].components.push(c('PhysicsConstraint2D',{jointType:'fixed'},'joint'));
const response=await fetch(base+'/api/file?path='+encodeURIComponent(path),{method:'PUT',headers:{'X-HB-Editor':'1'},body:JSON.stringify(data)});assert.ok(response.ok,await response.text());
await call('document.open',{path});let before=await call('document.get',{path});const rbIndex=before.data.objects[1].components.findIndex(c=>c.type==='Rigidbody2D'),edit=[{op:'replace',path:`/objects/1/components/${rbIndex}/properties/mass`,value:7}];
const dry=await call('document.patch',{path,expectedRevision:before.revision,operations:edit,dryRun:true});assert.equal(dry.valid,true);assert.equal((await call('document.get',{path})).revision,before.revision);
const changed=await call('document.patch',{path,expectedRevision:before.revision,operations:edit});await assert.rejects(call('document.patch',{path,expectedRevision:before.revision,operations:edit}),error=>error.code==='REVISION_CONFLICT');
const undone=await call('editor.undo',{path,expectedRevision:changed.revision});assert.equal(undone.revision,before.revision);
const final=await call('document.patch',{path,expectedRevision:undone.revision,operations:edit});await call('document.save',{path,expectedRevision:final.revision});const saved=await call('document.get',{path});assert.equal(saved.dirty,false);
assert.deepEqual(await(await fetch(base+'/api/file?path='+encodeURIComponent(path))).json(),saved.data,'AI 설정도 실제 디스크에 저장한다');
try{
  assert.equal((await call('runtime.play')).running,true);let state=await call('runtime.state');
  for(let i=0;i<10&&!state.objects.find(o=>o.id==='Ball2D').grounded;i++)state=await call('runtime.state');
  assert.equal(state.physics.backend,'rapier');assert.deepEqual(state.physics.dimensions.map(d=>d.dimension),[2,3]);
  for(const dim of [2,3]){const ball=state.objects.find(o=>o.id==='Ball'+dim+'D');assert.ok(ball.grounded,'두 차원의 실제 중력·착지');assert.ok(Math.abs(ball.position[1]-.5)<.03);assert.equal(ball.gameplayDebug.physics.ccd,true);assert.ok(Math.abs(ball.gameplayDebug.physics.mass-(dim===2?7:2))<.001);}
  assert.equal(state.physics.dimensions[0].joints[0].owner,'Held2D');assert.ok(Math.abs(state.objects.find(o=>o.id==='Held2D').position[1]-3)<.02);
  await call('runtime.pause');assert.equal((await call('runtime.state')).paused,true);await assert.rejects(call('document.patch',{path,expectedRevision:saved.revision,operations:edit}),/실행 종료/);
}finally{await call('runtime.stop');}
assert.deepEqual((await call('document.get',{path})).data,saved.data,'Stop 뒤 편집 데이터 복구');assert.equal((await call('runtime.state')).physics,null,'종료된 물리 월드 정리');
if(original.activeDocument)await call('document.open',{path:original.activeDocument});
console.log('실제 편집기 물리 API: 스키마/모듈 MIME·revision/dryRun/Undo/저장·2D/3D 강체/CCD/관절·일시정지·원본 복구 통과');
