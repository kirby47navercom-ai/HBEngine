import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import * as T from 'three';
import {createWorldAsset, terrainBrush, terrainMesh, editFoliage, eraseFoliage} from '../prototype/world-assets.js';
import {loadWorldVisual, worldBufferGeometry, disposeWorldVisual} from '../prototype/world-rendering.js';
import {updateWorldVisual} from '../prototype/world-visual-update.js';
import {raycastTerrainGrid} from '../prototype/terrain-grid-raycast.js';
import {WorldAssetEditor} from '../prototype/world-asset-editor.js';
import {assetShortcutContexts, assetShortcutScope, dispatchAssetShortcut} from '../prototype/asset-shortcuts.js';

const began = performance.now(), result = {passed: false}, dispose = [];
function terrain(size = 65) {
  const data = createWorldAsset('terrain', 'EditableTerrain'); data.resolution = [size, size];
  data.heights = Array.from({length: size * size}, (_, i) => Math.sin(i % size * .3) * Math.cos(Math.floor(i / size) * .15));
  data.layers.push({name: 'Rock', color: [.8, .5, .3]});
  data.weights = data.heights.map((_, i) => [i % 3 / 2, 1 - i % 3 / 2]);
  data.holes = Array.from({length: (size - 1) ** 2}, (_, i) => i % 31 === 4); return data;
}
function compareGeometry(actual, expected) {
  for (const name of ['position', 'normal', 'color', 'uv']) {
    assert.equal(actual.attributes[name].count, expected.attributes[name].count);
    let error = 0; for (let i = 0; i < actual.attributes[name].array.length; i++) error = Math.max(error, Math.abs(actual.attributes[name].array[i] - expected.attributes[name].array[i]));
    assert.ok(error < 2e-6, name + ' error ' + error);
  }
  assert.deepEqual(actual.index.array, expected.index.array);
}
try {
  let data = terrain(); const source = structuredClone(data), group = await loadWorldVisual('Terrain.hbterrain.json', async () => data); dispose.push(group);
  const geometry = group.children[0].geometry, uv = geometry.attributes.uv, index = geometry.index;
  const patchRows = [];
  for (const mode of ['raise', 'lower', 'flatten', 'smooth', 'paint', 'stamp']) {
    data = terrainBrush(data, {position: [.3, -.2], radius: 1.7, strength: .4, mode, height: .7, layer: 1});
    assert.equal(updateWorldVisual(group, data), true);
    assert.equal(group.children[0].geometry, geometry); assert.equal(geometry.attributes.uv, uv); assert.equal(geometry.index, index);
    const expected = worldBufferGeometry(terrainMesh(data)); compareGeometry(geometry, expected); expected.dispose();
    patchRows.push({...group.userData.worldUpdate});
    assert.ok(geometry.attributes.position.updateRanges.length <= 64);
    for (const key of ['position', 'normal', 'color']) geometry.attributes[key].clearUpdateRanges();
  }
  assert.ok(patchRows.some(row => row.positionWrites > 0 && row.positionWrites < row.vertices / 10));
  const versions = Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, value.version]));
  assert.equal(updateWorldVisual(group, structuredClone(data)), true);
  assert.deepEqual(Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, value.version])), versions);
  const hole = terrainBrush(data, {position: [0, 0], radius: 2, strength: 1, mode: 'hole'});
  assert.equal(updateWorldVisual(group, hole), false); assert.equal(geometry.index, index);
  result.terrain = {modes: patchRows, immutableIndicesAndUV: true, noChangeUploads: 0, structuralFallbackBeforeMutation: true};
  let foliage = createWorldAsset('foliage', 'EditableFoliage');
  foliage.instances = Array.from({length: 2053}, (_, i) => ({id: 'plant_' + i, position: [i % 64, 0, Math.floor(i / 64)], rotation: [0, i % 90, 0], scale: [1, 1, 1]}));
  const original = structuredClone(foliage), plants = await loadWorldVisual('Plants.hbfoliage.json', async () => foliage); dispose.push(plants);
  let plant = plants.children[0], initial = plant; const originalGeometry = plant.geometry, originalMaterial = plant.material;
  foliage = editFoliage(foliage, {operation: 'transform', ids: ['plant_7', 'plant_9', 'plant_18'], delta: [0, 5, 0]});
  assert.equal(updateWorldVisual(plants, foliage), true); assert.equal(plants.children[0], plant);
  assert.equal(plants.userData.worldUpdate.matrixWrites, 3); assert.equal(plant.instanceMatrix.updateRanges.reduce((n, range) => n + range.count, 0), 48);
  const pending = plant.instanceMatrix.updateRanges.map(range => ({...range}));
  foliage = editFoliage(foliage, {operation: 'transform', ids: ['plant_8'], delta: [0, 2, 0]}); updateWorldVisual(plants, foliage);
  assert.ok(plant.instanceMatrix.updateRanges.length > pending.length, 'Pending previous-frame writes survive a second edit');
  let disposedInstance = 0; plant.addEventListener('dispose', () => disposedInstance++);
  foliage = editFoliage(foliage, {operation: 'duplicate', ids: ['plant_7'], delta: [100, 0, 0]}); updateWorldVisual(plants, foliage); plant = plants.children[0];
  assert.equal(disposedInstance, 1); assert.notEqual(plant, initial); assert.equal(plant.geometry, originalGeometry); assert.equal(plant.material, originalMaterial);
  assert.equal(plant.instanceMatrix.count, 4096); assert.equal(plant.count, 2054);
  foliage = eraseFoliage(foliage, [0, 0], 1e6); updateWorldVisual(plants, foliage); assert.equal(plant.count, 0); assert.ok(plant.boundingBox.isEmpty());
  foliage = structuredClone(original); foliage.instances = foliage.instances.slice(0, 5); updateWorldVisual(plants, foliage);
  assert.equal(plant.count, 5); assert.equal(plant.instanceMatrix.count, 4096); assert.equal(plants.children[0], plant);
  const m = new T.Matrix4(), expected = new T.Matrix4();
  foliage.instances.forEach((item, i) => {plant.getMatrixAt(i, m); expected.makeRotationY(T.MathUtils.degToRad(item.rotation[1])).setPosition(...item.position); assert.ok(m.elements.every((value, k) => Math.abs(value - expected.elements[k]) < 1e-6));});
  assert.deepEqual(original.instances[7].position, [7, 0, 0]); assert.deepEqual(source, terrain());
  result.foliage = {initialInstances: 2053, changedInstances: 3, matrixComponentsSent: 48, fullMatrixComponents: 2053 * 16, geometryAndMaterialReused: true, oldInstanceDisposedOnGrowth: true, growthCapacity: 4096, zeroAndReuse: true};
  let state = 91, checked = 0, maxError = 0, triangleTests = 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const mesh = group.children[0]; mesh.updateMatrixWorld(true);
  for (let i = 0; i < 500; i++) {
    const origin = new T.Vector3((random() - .5) * 48, 10 + random() * 10, (random() - .5) * 48);
    const target = new T.Vector3((random() - .5) * 32, 0, (random() - .5) * 32);
    if (i < 20) {origin.set(i % 2 ? 0 : -16, 15, i % 3 ? 0 : 16); target.set(origin.x, 0, origin.z);}
    const ray = new T.Ray(origin, target.sub(origin).normalize()), actual = raycastTerrainGrid(mesh, ray);
    const oracle = new T.Raycaster(ray.origin, ray.direction).intersectObject(mesh)[0];
    assert.equal(!!actual, !!oracle, 'ray ' + i);
    if (actual) {maxError = Math.max(maxError, actual.point.distanceTo(oracle.point)); triangleTests += actual.testedTriangles; assert.ok(maxError < 1e-5);}
    checked++;
  }
  result.raycast = {rays: checked, maxError, triangleTests, bruteForceTriangleTests: 500 * geometry.index.count / 3};
  const scene = new T.Scene(); let reads = 0, releaseRead;
  const readGate = new Promise(resolve => releaseRead = resolve);
  const fake = {epoch: 0, doc: {path: 'Queued.hbfoliage.json', data: {...original, mesh: 'Assets/Source.hbmesh.json'}}, stage: scene, updateSelection() {}, read: async () => {reads++; await readGate; return createWorldAsset('mesh', 'Source');}};
  fake.rebuild = WorldAssetEditor.prototype.rebuild.bind(fake);
  const first = fake.rebuild(); await new Promise(resolve => setTimeout(resolve, 0));
  fake.doc.data = {...fake.doc.data, instances: original.instances.slice(0, 2)}; const second = fake.rebuild();
  fake.doc.data = {...fake.doc.data, instances: original.instances.slice(0, 4)}; fake.rebuild(); releaseRead(); await first; await second;
  assert.equal(reads, 2); assert.equal(fake.group.userData.foliageCount, 4); assert.equal(scene.children.length, 1); dispose.push(fake.group);
  result.queue = {rapidRevisions: 3, dependencyLoads: reads, latestInstanceCount: 4, staleResultDiscarded: true};
  // Actual common dispatcher/registry; no local key handler bypass.
  assert.equal(assetShortcutScope({id: 'a'}, 'terrain', 'a'), 'world');
  const fields = new Map(), editor = {doc: {kind: 'terrain'}, settings: {radius: 2, mode: 'raise'}, element: {querySelector: key => {if (!fields.has(key)) fields.set(key, {}); return fields.get(key);}}, fit() {this.fitted = true;}};
  assert.ok(assetShortcutContexts(editor).includes('worldBrush'));
  assert.equal(dispatchAssetShortcut('worldTerrainSmooth', editor), true); assert.equal(editor.settings.mode, 'smooth');
  dispatchAssetShortcut('worldRadiusUp', editor); assert.equal(editor.settings.radius, 2.5); dispatchAssetShortcut('worldFocus', editor); assert.equal(editor.fitted, true);
  editor.hooks = {running: () => true}; assert.equal(dispatchAssetShortcut('worldRadiusUp', editor), false); assert.equal(editor.settings.radius, 2.5);
  result.shortcuts = {terrainModes: 8, commonRadiusAndFocus: true, runningIsolation: true};
  result.passed = true; result.totalMs = +(performance.now() - began).toFixed(2);
  await fs.writeFile('native/build/world-edit-batch-1059.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally {for (const group of dispose) disposeWorldVisual(group);}
