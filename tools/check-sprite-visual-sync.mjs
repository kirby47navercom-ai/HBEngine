import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {makeSceneComponent} from '../prototype/scene-components.js';

let loads=0;const object={id:'floor',kind:'sprite',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[makeSceneComponent('SpriteRenderer',{texture:'tile.svg',drawMode:'tiled',pixelsPerUnit:32,useCustomSize:true})]},group=new THREE.Group();group.userData.objectId=object.id;
const visual=sceneRendering({read:async()=>{throw Error('no asset expected');},fileUrl:p=>p,current:id=>id===object.id?group:null,all:()=>[group],loadTexture:async()=>{loads++;return new THREE.DataTexture(new Uint8Array(32*32*4).fill(255),32,32);}});
const properties=object.components[0].properties;
await visual.build(object,group);const initial=group.userData.spriteMesh.geometry;
for(let i=0;i<300;i++){object.position[0]++;assert.equal(visual.syncSprite(object),undefined);}
assert.equal(group.userData.spriteMesh.geometry,initial);assert.equal(loads,1);
let disposed=0;initial.addEventListener('dispose',()=>disposed++);properties.width=4.5;properties.height=2.5;await visual.syncSprite(object);
const tiled=group.userData.spriteMesh.geometry;tiled.computeBoundingBox();assert.equal(tiled.boundingBox.max.x-tiled.boundingBox.min.x,4.5);assert.equal(tiled.attributes.position.count,5*3*6);assert.equal(disposed,1);assert.equal(loads,1);
properties.drawMode='simple';await visual.syncSprite(object);assert.equal(group.userData.spriteMesh.geometry.type,'PlaneGeometry');assert.equal(group.userData.spriteMesh.geometry.parameters.width,4.5);
properties.enabled=false;visual.syncSprite(object);assert.equal(group.userData.spriteMesh.visible,false);properties.enabled=true;visual.syncSprite(object);assert.equal(group.userData.spriteMesh.visible,true);
properties.visible=false;visual.syncSprite(object);assert.equal(group.userData.spriteMesh.visible,false);properties.visible=true;visual.syncSprite(object);assert.equal(group.userData.spriteMesh.visible,true);
properties.drawMode='tiled';properties.flipX=true;await visual.syncSprite(object);assert.equal(group.userData.spriteMesh.scale.x,-1);
const retained=group.userData.resources.size;for(let i=0;i<20;i++){properties.width=i%2?3:4;await visual.syncSprite(object);}assert.equal(group.userData.resources.size,retained);assert.equal(loads,1);
visual.dispose(group);visual.dispose2D();assert.equal(group.userData.resources.size,0);assert.equal(visual.syncSprite(object),undefined);
console.log(JSON.stringify({passed:true,unchangedUpdates:300,resizes:21,textureLoads:loads,disposed:true,disableEnable:true}));
