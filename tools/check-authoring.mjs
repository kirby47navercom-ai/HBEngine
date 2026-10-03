import assert from 'node:assert/strict';
import {Scene} from 'three';
import {CollisionPreview} from '../prototype/collision-preview.js';
import {createAsset,validAsset} from '../prototype/asset-documents.js';
import {makeNode,connect,validBlueprint,makeDefinition,graphContext} from '../prototype/blueprint-model.js';
import {connectAutomatic,dropVariable,conversionFor,nodeBounds} from '../prototype/blueprint-connections.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {placementCatalog,createPlacedObject} from '../prototype/placement-catalog.js';
import {defaultSurface,validScene} from '../prototype/model.js';
import {materialPresets,makeMaterialPreset,evaluateMaterial,compileMaterial,makeMaterialNode,connectMaterial,materialDefaults} from '../prototype/material-runtime.js';

const root=()=>({...createAsset('blueprint','Authoring'),nodes:[],edges:[],variables:[{id:'count',name:'Count',type:'int',container:'single',value:42}]});
const add=(g,key,x=0,y=0)=>{const n=makeNode(key,x,y);g.nodes.push(n);return n;};
const pin=(n,pin)=>({node:n.id,pin});
const g=root(),begin=add(g,'beginPlay'),print=add(g,'print',550),getter=add(g,'getVariable',20,200);getter.variableId='count';
assert.ok(connect(g,pin(begin,'then'),pin(print,'exec')).ok);
const auto=connectAutomatic(g,pin(getter,'value'),pin(print,'message'));
assert.equal(auto.node.key,'intToString');assert.ok(validBlueprint(g));
const messages=[],actor=createPlacedObject('cube',{id:'actor'}),vm=new BlueprintRuntime([actor],[{root:g,self:'actor'}],{log:v=>messages.push(v)});
await vm.start();assert.deepEqual(messages,['42'],'자동 생성한 공용 변환 노드를 플레이 VM에서 실행');await vm.stop();

const dropped=dropVariable(g,'count',{...pin(begin,'then'),direction:'out'},{x:240,y:0});
assert.equal(dropped.node.key,'setVariable');
assert.ok(g.edges.some(e=>e.from.node===begin.id&&e.to.node===dropped.node.id));
assert.ok(g.edges.some(e=>e.from.node===dropped.node.id&&e.to.node===print.id),'기존 실행선 보존');
const inputDrop=dropVariable(g,'count',{...pin(print,'exec'),direction:'in'},{x:380,y:0});
assert.equal(inputDrop.node.key,'setVariable');assert.ok(validBlueprint(g));
const dataDrop=dropVariable(g,'count',{...pin(print,'message'),direction:'in'},{x:240,y:200});
assert.equal(dataDrop.node.key,'getVariable');assert.ok(validBlueprint(g));
for(const created of [dropped.node,inputDrop.node,dataDrop.node]){const a=nodeBounds(created,g);for(const other of g.nodes.filter(n=>n.id!==created.id)){const b=nodeBounds(other,g);assert.ok(a.x+a.width<=b.x||a.x>=b.x+b.width||a.y+a.height<=b.y||a.y>=b.y+b.height,'자동 삽입 노드는 기존 노드를 가리지 않는다');}}
const original=JSON.stringify(g);
assert.equal(dropVariable(g,'count',{...pin(getter,'value'),direction:'out'},{x:0,y:0}).ok,false);
assert.equal(JSON.stringify(g),original,'실패한 드롭은 원본 보존');
assert.equal(conversionFor({type:'int',array:true},{type:'float',array:true}),null,'배열을 스칼라처럼 변환하지 않음');
assert.equal(conversionFor({type:'object'},{type:'string'}),null,'참조를 임의 문자열로 바꾸지 않음');
for(const [a,b,key] of [['int','float','intToFloat'],['float','int','floatToInt'],['float','string','toString'],['bool','string','boolToString'],['vec2','vec3','vector2ToVector3'],['vec3','vec2','vector3ToVector2']])assert.equal(conversionFor({type:a},{type:b}).key,key);
const cyc=root(),a=add(cyc,'floatToInt'),b=add(cyc,'intToFloat');connect(cyc,pin(a,'return'),pin(b,'value'));const before=JSON.stringify(cyc);
assert.equal(connectAutomatic(cyc,pin(b,'return'),pin(a,'value')).ok,false);assert.equal(JSON.stringify(cyc),before,'순환 거절 시 변환 노드도 남지 않음');
const fn=root();makeDefinition(fn,'function','Work');const inner=graphContext(fn,fn.functions[0].id);dropVariable(inner,'count',null,{x:100,y:100},'get');assert.equal(fn.functions[0].graph.nodes.at(-1).key,'getVariable');assert.ok(validBlueprint(fn),'독립 함수 그래프 저장');

for(const recipe of placementCatalog){const object=createPlacedObject(recipe.key);assert.ok(validScene({version:1,objects:[object],surface:defaultSurface}),recipe.key);assert.notEqual(createPlacedObject(recipe.key).id,object.id);}
assert.equal(createPlacedObject('navigation2d').components.find(c=>c.type==='NavigationGrid').properties.plane,'XY');
assert.equal(createPlacedObject('trigger2d').components.find(c=>c.type==='BoxCollider2D').properties.trigger,true);
assert.equal(createPlacedObject('physicsCube').components.find(c=>c.type==='Rigidbody').properties.useGravity,true);
assert.equal(createPlacedObject('topdown2d').components.find(c=>c.type==='Rigidbody2D').properties.useGravity,false);
const parent=createPlacedObject('empty',{id:'parent',position:[3,4,5]}),child=createPlacedObject('trigger2d',{id:'child',position:[1,2,3]});child.parentId='parent';
const world=new Scene(),preview=new CollisionPreview(world),worldObjects=[parent,child];
preview.update(worldObjects,new Set(['child']));assert.equal(preview.items.size,1);
const line=[...preview.items.values()][0];assert.deepEqual(line.position.toArray(),[4,6,8],'2D 부모 계층 아래 충돌 미리보기');assert.equal(line.scale.z,.01);assert.equal(line.material,preview.trigger);
preview.update(worldObjects,new Set());assert.equal(preview.items.size,0,'선택 해제 때 잔상 제거');
preview.update(worldObjects,new Set(),{all:true});assert.equal(preview.items.size,1);
child.collisionEnabled=false;preview.update(worldObjects,new Set(),{all:true});assert.equal(preview.items.size,0,'비활성 충돌은 미리보기에서 제외');
preview.dispose();assert.equal(world.children.length,0);
for(const key of Object.keys(materialPresets)){const data={version:1,name:key,...makeMaterialPreset(key)};assert.ok(validAsset('material',data),key);assert.ok(compileMaterial(data).lines.length);assert.ok(evaluateMaterial(data));}
const node=makeMaterialNode('fresnel'),output=makeMaterialNode('surface'),mat={surface:materialDefaults,graph:{nodes:[node,output],edges:[]}};
connectMaterial(mat.graph,pin(node,'value'),pin(output,'roughness'));
assert.equal(evaluateMaterial(mat,{worldNormal:[0,0,1],viewDirection:[0,0,1]}).roughness,.04);
assert.equal(evaluateMaterial(mat,{worldNormal:[0,0,1],viewDirection:[1,0,0]}).roughness,1,'카메라 각도에 따라 Fresnel 변경');
console.log('제작 도구: 핀 자동 변환 실제 실행·변수 드롭·실행선 보존·순환 거절·함수 그래프·38종 배치·머테리얼 템플릿 검증 통과');
