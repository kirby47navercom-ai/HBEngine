import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cacheAssetReader} from '../prototype/runtime-storage.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {create2DAsset} from '../prototype/two-d-assets.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

let reads=0,fail=true;
const read=cacheAssetReader(async key=>{reads++;if(key==='retry'&&fail){fail=false;throw Error('read failed');}return {key,value:[1]};},{maxEntries:2,maxBytes:100});
const [a,b]=await Promise.all([read('same'),read('same')]);assert.equal(reads,1);a.value[0]=9;assert.equal(b.value[0],1);assert.equal((await read('same')).value[0],1);
await assert.rejects(read('retry'),/failed/);await read('retry');await read('third');assert.ok(read.inspect().entries<=2&&read.inspect().bytes<=100);await read('same');assert.equal(reads,5);read.clear();assert.deepEqual(read.inspect(),{entries:0,bytes:0});
let resolve;const pending=cacheAssetReader(()=>new Promise(r=>resolve=r));const request=pending('old');await Promise.resolve();pending.clear();resolve({old:true});await request;assert.equal(pending.inspect().entries,0);

const sprite=create2DAsset('sprite','S_Cached');sprite.texture='Assets/atlas.png';sprite.rect=[0,0,16,16];
let images=0,jsonReads=0;const load=THREE.TextureLoader.prototype.loadAsync;
THREE.TextureLoader.prototype.loadAsync=async()=>{images++;return new THREE.Texture({width:64,height:64});};
const groups=new Map(),visuals=sceneRendering({read:async()=>{jsonReads++;return sprite;},fileUrl:p=>p,current:id=>groups.get(id),all:()=>[...groups.values()],error:e=>{throw Error(e);}});
const object=id=>({id,kind:'sprite',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('SpriteRenderer',{sprite:'Assets/S_Cached.hbsprite.json'})]});
try{
  await visuals.prepareSpawn({templates:new Map([['cached',{objects:[object('template')]}]])});
  const first=object('first'),second=object('second');for(const o of [first,second]){const group=new THREE.Group();group.userData.objectId=o.id;groups.set(o.id,group);await visuals.build(o,group);}
  assert.equal(images,1);assert.equal(jsonReads,1);const maps=[...groups.values()].map(g=>g.children.find(c=>c.userData.sprite).material.map);
  assert.notEqual(maps[0],maps[1]);assert.equal(maps[0].source,maps[1].source);maps[0].offset.x=.5;assert.equal(maps[1].offset.x,0);
  visuals.dispose(groups.get('first'));assert.equal(groups.get('second').userData.disposed,undefined);
  visuals.invalidateAssets();const third=object('third'),group=new THREE.Group();group.userData.objectId=third.id;groups.set(third.id,group);await visuals.build(third,group);assert.equal(images,2);assert.equal(jsonReads,2);
  const raw=object('raw');raw.components[0].properties.sprite='';raw.components[0].properties.texture='Assets/slash.png';await visuals.prepareSpawn({templates:new Map([['raw',{objects:[raw]}]])});assert.equal(images,3);const rawGroup=new THREE.Group();rawGroup.userData.objectId=raw.id;groups.set(raw.id,rawGroup);await visuals.build(raw,rawGroup);assert.equal(images,3,'raw PNG prefab is ready before its first Spawn');assert.equal(jsonReads,2);
}finally{for(const group of groups.values())visuals.dispose(group);visuals.dispose2D();THREE.TextureLoader.prototype.loadAsync=load;}
console.log('실행별 에셋 캐시: 중복 읽기·변경 격리·실패 재시도·크기 제한·Stop 수명·스프라이트 이미지 공유/UV 독립·외부 변경 무효화 통과');
