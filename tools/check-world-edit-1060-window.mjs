import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProject} from './project-manifest.mjs';
import {createWorldAsset} from '../prototype/world-assets.js';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence, pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'), [], '사용 중이면 숨긴 실제 창 검사는 나중에 진행해요.');
const work = await fs.mkdtemp(path.resolve('native/build/world-edit-1060-')); retainTestEvidence(work);
const at = process.argv.indexOf('--executable'), executable = at < 0 ? path.resolve('HBEngine.exe') : path.resolve(process.argv[at + 1]);
const record = await createProject('WorldEdit1060', work, '3d'); let probe;
try {
  const terrainPath = 'Assets/T_Edit.hbterrain.json', foliagePath = 'Assets/F_Edit.hbfoliage.json';
  const terrain = createWorldAsset('terrain', 'T_Edit'), foliage = createWorldAsset('foliage', 'F_Edit');
  foliage.instances = [{id: 'a', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]}, {id: 'b', position: [3, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]}];
  for (const [file, data] of [[terrainPath, terrain], [foliagePath, foliage]]) await fs.writeFile(path.join(record.root, file), JSON.stringify(data));
  probe = await editorWindowProbe({work, project: record.file, executable});
  const call = probe.call, get = file => call('document.get', {path: file});
  await call('document.open', {path: terrainPath});
  const before = await call('world.preview.read', {path: terrainPath}); assert.ok(before.ready);
  let doc = await get(terrainPath);
  await call('world.terrain.brush', {path: terrainPath, expectedRevision: doc.revision, settings: {position: [0, 0], radius: 2, strength: 1, mode: 'raise'}});
  const after = await call('world.preview.read', {path: terrainPath}); assert.equal(after.meshes[0].geometry, before.meshes[0].geometry); assert.ok(after.lastUpdate.positionWrites > 0);
  doc = await get(terrainPath); await call('editor.undo', {path: terrainPath, expectedRevision: doc.revision});
  assert.deepEqual((await get(terrainPath)).data.heights, terrain.heights);
  assert.equal((await call('world.preview.read', {path: terrainPath})).meshes[0].geometry, before.meshes[0].geometry);
  const key = async (code, value, vk) => {for (const type of ['keyDown', 'keyUp']) await probe.cdp('Input.dispatchKeyEvent', {type, code, key: value, windowsVirtualKeyCode: vk});};
  const settings = await call('editor.shortcuts.get'), profile = structuredClone(settings.data);
  profile.active = 'World1060'; profile.profiles.push({id: 'World1060', name: 'World1060', bindings: {worldRadiusUp: ['F8']}});
  await call('editor.shortcuts.set', {data: profile, expectedRevision: settings.revision});
  await probe.evaluate('document.querySelector(".world-asset-preview canvas").focus()');
  const radius = () => probe.evaluate('Number(document.querySelector("[data-world-setting=radius]").value)');
  const radiusBefore = await radius(); await key('BracketRight', ']', 221); assert.equal(await radius(), radiusBefore);
  await key('F8', 'F8', 119); assert.ok(await radius() > radiusBefore);
  const rebound = await radius(); await probe.evaluate('document.querySelector("[data-world-setting=radius]").focus()'); await key('F8', 'F8', 119); assert.equal(await radius(), rebound);
  await call('document.open', {path: foliagePath});
  const plantsBefore = await call('world.preview.read', {path: foliagePath}); doc = await get(foliagePath);
  await call('world.foliage.edit', {path: foliagePath, expectedRevision: doc.revision, settings: {operation: 'transform', ids: ['a'], delta: [0, 3, 0]}});
  const plantsAfter = await call('world.preview.read', {path: foliagePath});
  assert.equal(plantsAfter.meshes[0].geometry, plantsBefore.meshes[0].geometry); assert.equal(plantsAfter.lastUpdate.matrixWrites, 1);
  const revision = (await get(foliagePath)).revision; await call('world.preview.read', {path: foliagePath, offset: 0, limit: 1}); assert.equal((await get(foliagePath)).revision, revision);
  const source = (await fs.readFile(new URL('./world-edit-window-probe-1060.mjs', import.meta.url), 'utf8')).replaceAll('../prototype/', probe.base + '/prototype/');
  const moduleURL = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const gpu = await probe.evaluate('(async()=>{const module=await import(' + JSON.stringify(moduleURL) + ');return module.runWorldEditWindow1060();})()');
  for (const row of gpu.rows) {await fs.writeFile(path.join(work, row.kind + '.png'), Buffer.from(row.image.split(',')[1], 'base64')); delete row.image;}
  await fs.writeFile(path.join(work,'checks-complete.json'),JSON.stringify({passed:true,before,after,plantsBefore,plantsAfter,gpu},null,2));
  doc=await get(foliagePath);await call('document.save',{path:foliagePath,expectedRevision:doc.revision});
  const exit = await probe.finish(); probe = null;
  const result = {passed: true, executable, checks: {humanAndAISharedPartialUpdates: true, undoPreservesGeometry: true, reboundKeyAndOldKeyIsolation: true, textInputIsolation: true, readOnlyPreviewRevision: true}, before, after, plantsBefore, plantsAfter, gpu, exit};
  await fs.writeFile(path.join(work, 'acceptance.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify({work, ...result}));
} catch (error) {await fs.writeFile(path.join(work, 'failure.json'), JSON.stringify({error: error.stack, diagnostics: await probe?.diagnostics()}, null, 2)); throw error;}
finally {await probe?.stop(); await pruneTestArtifacts(work);}
