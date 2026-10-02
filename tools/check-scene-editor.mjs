import assert from 'node:assert/strict';
import {copySceneObjects,pasteSceneObjects,removeSceneObjects,validParent,sceneRows,sceneMatches,NavigationHistory,selectionMatrices,transformSceneSelection} from '../prototype/scene-editor.js';
import {sceneWorldMatrix} from '../prototype/scene-runtime.js';
import {Matrix4} from 'three';
const object=(id,parent)=>({id,name:id,kind:'cube',position:[1,2,3],rotation:[0,0,0],scale:[1,1,1],visible:true,...(parent?{parent}:{})});
const objects=[object('parent'),object('child','parent'),object('other')];
assert.equal(validParent(objects,'parent','child'),false);assert.equal(validParent(objects,'other','child'),true);assert.equal(validParent(objects,'child','missing'),false);
let id=0;const cloned=pasteSceneObjects(objects,copySceneObjects(objects,['parent']),{offset:[1,0,0],newId:()=>String(++id)});
assert.equal(cloned.length,2);assert.equal(cloned[1].parent,cloned[0].id);assert.deepEqual(cloned[0].position,[2,2,3]);assert.deepEqual(cloned[1].position,[1,2,3]);assert.equal(objects[0].name,'parent');
objects[0].rotation=[0,30,45];objects[0].scale=[2,2,2];const detached=copySceneObjects(objects,['child'])[0];assert.equal(detached.parent,undefined);assert.ok(sceneWorldMatrix(detached,[detached]).elements.every((v,i)=>Math.abs(v-sceneWorldMatrix(objects[1],objects).elements[i])<1e-8),'부모 없이 자식만 복사해도 월드 자세를 보존한다');
assert.equal(sceneRows(objects,'',new Set(['parent'])).some(row=>row.object.id==='child'),false);
assert.equal(sceneRows(objects,'child',new Set(['parent']))[0].object.id,'parent');assert.equal(sceneMatches(objects[0],'t:cube -sphere'),true);
removeSceneObjects(objects,['parent']);assert.equal(objects.some(o=>o.id==='child'),false);assert.equal(objects.some(o=>o.id==='other'),true);
const history=new NavigationHistory({folder:'Assets'});history.push({folder:'Assets/Materials'});history.push({folder:'Assets/Blueprints'});assert.deepEqual(history.navigate(-1),{folder:'Assets/Materials'});history.push({folder:'Source'});assert.equal(history.navigate(1),null);assert.deepEqual(history.navigate(-1),{folder:'Assets/Materials'});
console.log('장면 계층·복사·삭제·검색·패널 탐색 검사 통과');

const groupObjects=[object('root'),object('nested','root'),object('separate')],matrices=selectionMatrices(groupObjects,['root','nested','separate']);assert.equal(matrices.length,2);transformSceneSelection(groupObjects,matrices,new Matrix4().makeTranslation(3,0,0));assert.deepEqual(groupObjects[0].position,[4,2,3]);assert.deepEqual(groupObjects[1].position,[1,2,3],'부모와 자식을 함께 이동해도 자식이 두 번 이동하지 않는다');assert.deepEqual(groupObjects[2].position,[4,2,3]);
