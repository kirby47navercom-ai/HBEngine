import {WorldAssetEditor} from '../prototype/world-asset-editor.js';
import {createWorldAsset, terrainBrush, editFoliage} from '../prototype/world-assets.js';

export async function runWorldEditWindow1060() {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;width:900px;height:600px;z-index:10000;background:#222'; document.body.append(host);
  let editor;
  const hooks = {running: () => false, before() {}, change() {}, error: message => {throw Error(message);}, read: async () => {throw Error('Unexpected dependency read');}, place() {}};
  const rows = [];
  try {
    for (const kind of ['terrain', 'foliage']) {
      const data = createWorldAsset(kind, 'GPU1060');
      if (kind === 'foliage') data.instances = Array.from({length: 2053}, (_, i) => ({id: 'plant_' + i, position: [i % 64 - 32, 0, Math.floor(i / 64) - 16], rotation: [0, 0, 0], scale: [1, 1, 1]}));
      const doc = {kind, path: kind === 'terrain' ? 'GPU.hbterrain.json' : 'GPU.hbfoliage.json', data};
      editor = new WorldAssetEditor(host, doc, () => [], hooks); await editor.rebuilding;
      editor.renderer.setSize(600, 400, false); editor.fit(); editor.stage.updateMatrixWorld(true); editor.renderer.render(editor.stage, editor.camera);
      const gl = editor.renderer.getContext(), originalData = gl.bufferData.bind(gl), originalSub = gl.bufferSubData.bind(gl), transfers = [];
      gl.bufferData = (...args) => {transfers.push({allocate: true, bytes: args[1]?.byteLength || args[1] || 0}); return originalData(...args);};
      gl.bufferSubData = (...args) => {transfers.push({allocate: false, bytes: args.length >= 5 ? args[4] * args[2].BYTES_PER_ELEMENT : args[2].byteLength}); return originalSub(...args);};
      const before = editor.previewState();
      editor.edit(d => kind === 'terrain' ? terrainBrush(d, {position: [0, 0], radius: 2, strength: 1, mode: 'raise'}) : editFoliage(d, {operation: 'transform', ids: ['plant_7'], delta: [0, 3, 0]}));
      await editor.rebuilding; editor.stage.updateMatrixWorld(true); editor.renderer.render(editor.stage, editor.camera);
      const after = editor.previewState(), subBytes = transfers.filter(row => !row.allocate).reduce((n, row) => n + row.bytes, 0);
      if (transfers.some(row => row.allocate)) throw Error(kind + ': editing allocated a new GPU buffer');
      if (before.meshes[0].geometry !== after.meshes[0].geometry) throw Error(kind + ': geometry was rebuilt');
      if (!(subBytes > 0 && subBytes < (kind === 'terrain' ? data.heights.length * 12 : data.instances.length * 64))) throw Error(kind + ': partial GPU transfer did not stay below the full buffer');
      if (gl.getError() !== gl.NO_ERROR) throw Error(kind + ': GL error');
      rows.push({kind, subBytes, transfers: transfers.length, geometryReused: true, gpuAllocations: 0, lastUpdate: after.lastUpdate, image: editor.renderer.domElement.toDataURL('image/png')});
      editor.dispose(); editor = null; host.replaceChildren();
    }
    return {passed: true, rows};
  } finally {editor?.dispose(); host.remove();}
}
