import assert from 'node:assert/strict';
import * as THREE from 'three';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {defaultSurface} from '../prototype/model.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

const groups=new Map(),visuals=sceneRendering({read:async()=>{throw Error('unexpected asset');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected model');},current:id=>groups.get(id),all:()=>[...groups.values()]});
const disposed=new Map(),watch=r=>{disposed.set(r,0);r.addEventListener('dispose',()=>disposed.set(r,disposed.get(r)+1));return r;};
const factory=scenePrimitives(defaultSurface),shared=watch(factory.surfaceMaterial);
const make=(kind,id=kind,extra={})=>{const g=factory.build({kind,id,name:id,...extra});groups.set(id,g);return g;};
const first=make('cube','first'),second=make('cube','second'),firstGeometry=watch(first.children[0].geometry),secondGeometry=watch(second.children[0].geometry);
visuals.dispose(first);visuals.dispose(first);
assert.equal(disposed.get(firstGeometry),1);assert.equal(disposed.get(shared),0);assert.equal(second.children[0].material,shared);
const flower=make('grass'),water=make('water'),override=make('cube','override',{materialSurface:{...defaultSurface,color:'#f0cc88'}});
const unique=new Set();for(const g of [flower,water,override])g.traverse(c=>{if(c.isMesh&&g.userData.resources.has(c.material))unique.add(watch(c.material));});
assert.equal(unique.size,11,'9 flower materials, water, and per-object override are owned');
for(const g of [second,flower,water,override])visuals.dispose(g);
assert.equal(disposed.get(secondGeometry),1);for(const r of unique)assert.equal(disposed.get(r),1);
factory.dispose();factory.dispose();assert.equal(disposed.get(shared),1);

const borrowed=watch(new THREE.MeshStandardMaterial()),external=scenePrimitives(defaultSurface,borrowed),g=external.build({id:'borrowed',kind:'cube'});
visuals.dispose(g);external.dispose();assert.equal(disposed.get(borrowed),0,'caller owns a supplied material');borrowed.dispose();
const parent=new THREE.Group(),child=new THREE.Group();parent.userData.objectId='parent';child.userData.objectId='child';parent.add(child);
await visuals.build({id:'parent',kind:'empty',components:[makeSceneComponent('SpotLight',{castShadow:true})]},parent);
await visuals.build({id:'child',kind:'empty',components:[makeSceneComponent('PointLight',{castShadow:true})]},child);
for(const owner of [parent,child]){const light=owner.children.find(c=>c.isLight);light.shadow.map=watch(new THREE.WebGLRenderTarget(16,16));light.shadow.mapPass=watch(new THREE.WebGLRenderTarget(16,16));}
const childMap=child.children.find(c=>c.isLight).shadow.map;
visuals.dispose(parent);visuals.dispose(parent);assert.equal(disposed.get(childMap),0,'rebuilding parent must preserve child actor resources');visuals.dispose(child);
const sunFactory=scenePrimitives(defaultSurface),sun=sunFactory.build({id:'sun-light',kind:'light',components:[makeSceneComponent('DirectionalLight',{castShadow:true})]}),sunMap=watch(new THREE.WebGLRenderTarget(16,16));sun.children.find(c=>c.isLight).shadow.map=sunMap;visuals.dispose(sun);sunFactory.dispose();assert.equal(disposed.get(sunMap),1);
for(const [r,n] of disposed)assert.equal(n,1,r.type||r.constructor.name);visuals.dispose2D();
const actor={id:'frame-sprite',kind:'empty',components:[makeSceneComponent('SpriteRenderer',{width:1,height:1})]},spriteGroup=new THREE.Group();spriteGroup.userData.objectId=actor.id;groups.set(actor.id,spriteGroup);await visuals.build(actor,spriteGroup);const initialSprite=spriteGroup.userData.spriteMesh,initialMaterial=watch(initialSprite.material),initialGeometry=watch(initialSprite.geometry);for(let i=0;i<12;i++){await visuals.spriteFrame(actor,'');assert.equal(spriteGroup.userData.spriteMesh,initialSprite);assert.equal(initialSprite.material,initialMaterial);assert.equal(initialSprite.geometry,initialGeometry);}assert.equal(disposed.get(initialMaterial),0);assert.equal(disposed.get(initialGeometry),0);actor.components[0].properties.width=2;await visuals.spriteFrame(actor,'');assert.notEqual(spriteGroup.userData.spriteMesh.material,initialMaterial);assert.equal(disposed.get(initialMaterial),1);assert.equal(disposed.get(initialGeometry),1);visuals.dispose(spriteGroup);visuals.dispose2D();
console.log('도형·공유/외부 머테리얼·중첩 actor·광원 그림자 자원 소유권 PASS');
