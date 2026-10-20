import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {createWorldAsset, editFoliage, terrainBrush} from '../prototype/world-assets.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {addSceneComponent} from '../prototype/scene-components.js';

const groups = new Map(), terrainPath = 'Assets/Terrain.hbterrain.json', foliagePath = 'Assets/Plants.hbfoliage.json';
let terrain = createWorldAsset('terrain', 'Terrain'), foliage = createWorldAsset('foliage', 'Plants');
foliage.instances = [{id: 'a', position: [0,0,0], rotation: [0,0,0], scale: [1,1,1]}];
let changes = 0;
const visuals = sceneRendering({read: async file => file === terrainPath ? terrain : foliage, fileUrl: file => file, loadModel: async () => {throw Error('Unexpected model');}, current: id => groups.get(id), all: () => [...groups.values()], editor: true, onVisualChange: () => changes++, error: message => {throw Error(message);}});
const actors = [];
try {
  for (const path of [terrainPath, foliagePath]) {
    const actor = createPlacedObject('cube'), group = new T.Group();
    actor.components.find(component => component.type === 'MeshRenderer').properties.mesh = path;
    group.userData.objectId = actor.id; groups.set(actor.id, group); actors.push(actor); await visuals.build(actor, group);
  }
  const terrainGroup = groups.get(actors[0].id), terrainGeometry = terrainGroup.children[0].children[0].geometry;
  terrain = terrainBrush(terrain, {position: [0,0], radius: 2, strength: 1, mode: 'raise'});
  assert.equal(visuals.updateWorldAsset(actors[0], terrainPath, terrain), true);
  assert.equal(terrainGroup.children[0].children[0].geometry, terrainGeometry);
  const plantsGroup = groups.get(actors[1].id), previous = plantsGroup.children[0].children[0]; let disposed = 0;
  previous.addEventListener('dispose', () => disposed++);
  foliage = editFoliage(foliage, {operation: 'duplicate', ids: ['a'], delta: [3,0,0]});
  assert.equal(visuals.updateWorldAsset(actors[1], foliagePath, foliage), true);
  const next = plantsGroup.children[0].children[0]; assert.notEqual(next, previous); assert.equal(disposed, 1);
  assert.equal(next.userData.objectId, actors[1].id); assert.ok(plantsGroup.userData.resources.has(next));
  let released = 0; next.addEventListener('dispose', () => released++);
  addSceneComponent(actors[0], 'WorldCollision');
  assert.equal(visuals.updateWorldAsset(actors[0], terrainPath, terrain), false, 'Collision-bearing actors retain the complete rebuild path');
  assert.equal(visuals.updateWorldAsset(actors[1], terrainPath, terrain), false, 'Unrelated dependencies must not change this actor');
  visuals.dispose(plantsGroup); groups.delete(actors[1].id); assert.equal(released, 1);
  const report = {passed: true, terrainActorGeometryReused: true, foliageGrowthOwnsNewInstance: true, sourceObjectIdPreserved: true, oldAndNewInstanceResourcesReleased: true, collisionFallback: true, unrelatedAssetRejected: true, visualChangeNotifications: changes};
  await fs.writeFile('native/build/world-scene-1061.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} finally {for (const group of groups.values()) visuals.dispose(group); visuals.dispose2D();}
