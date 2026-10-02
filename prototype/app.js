import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STORAGE_KEY, defaultObjects, defaultSurface, defaultEnvironment, clone, validScene, fileKind } from './model.js';
import { catalog, variableTypes, typeColors, defaultBlueprint, defaultsFor, validValue, fieldsFor, effectivePins, basePins, canConnect, connect, splitPin, makeNode, nodeTitle, validBlueprint, graphContext, allGraphContexts, collapseNodes } from './blueprint-model.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  cloud: '<path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10z"/>',
  sky: '<path d="M3 17h18M5 13a7 7 0 0 1 14 0M12 2v2M3 6l2 2m14 0 2-2"/>',
  fog: '<path d="M3 8h18M5 12h14M3 16h18M7 20h10"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  cube: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9"/>',
  sphere: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  scene: '<path d="M3 5h18v14H3zM7 15l4-5 3 3 3-4 4 6"/><circle cx="7" cy="8" r="1"/>',
  material: '<circle cx="12" cy="12" r="9"/><path d="M7 5c6 1 11 7 10 14M4 16c4-2 9-2 15 0"/>',
  animation: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M3 16h18M7 4v4M17 4v4M7 16v4M17 16v4m-7-6 5-3-5-3z"/>',
  nodes: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h5a4 4 0 0 1 4 4v5M6 9v5a4 4 0 0 0 4 4h5"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
  play: '<path d="m8 4 12 8-12 8z"/>', pause: '<path d="M8 4v16M16 4v16"/>', stop: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1m3 0v7h10V3M7 21v-7h10v7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  focus: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/><circle cx="12" cy="12" r="3"/>',
  move: '<path d="M12 2v20M2 12h20m-14-6 4-4 4 4m-10 2-4 4 4 4m10-8 6 4-6 4m-8 2 4 4 4-4"/>',
  rotate: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  scale: '<path d="M4 14v6h6M14 4h6v6M20 4 4 20"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  folder: '<path d="M3 5h6l2 3h10v12H3z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  console: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 8 4 4-4 4m7 0h3"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 5"/>',
  volume: '<path d="M11 4 6 8H2v8h4l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  sliders: '<path d="M5 3v6m0 4v8M12 3v10m0 4v4M19 3v2m0 4v12M2 9h6m1 8h6m1-12h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  camera: '<path d="M3 7h12v12H3zM15 10l6-3v12l-6-3z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>', skip: '<path d="M5 4v16m14-16-12 8 12 8z"/>',
  diamond: '<path d="m12 3 9 9-9 9-9-9z"/>', loop: '<path d="M4 8h13l-3-3m3 3-3 3M20 16H7l3 3m-3-3 3-3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  leaf: '<path d="M4 20C1 7 12 3 21 3c0 9-4 20-17 17m0 0L16 8"/>'
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cube}</svg>`; }
function icons(root = document) { $$('[data-icon]', root).forEach(el => { if (!el.querySelector(':scope > svg')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); }); }
icons();

let objects = clone(defaultObjects), surface = clone(defaultSurface), selected = 'stone-arch', workspace = 'scene', dirty = false;
let environment = clone(defaultEnvironment), sceneName = 'Garden', skyDome, cloudGroup, ambientLight, groundFloor;
let savedBlueprint, selectedVariable='targetPosition', selectedNode='begin', palettePosition={x:60,y:60};
let blueprintView='event', blueprintZoom=1, selectedNodes=new Set(['begin']), collapseKind='function';
let running = false, paused = false, history = [], pendingFiles = [], logs = [], lastSaved = '', currentFilter = 'all';
let mainRenderer, scene, camera, orthoCamera, orbit, transform, grid, sun, selectionBox, previewRenderer, previewScene, previewCamera, previewSphere;
let activeCamera, viewMode = '3d', toastTimer, transformBefore, playTime = 0, importCounter = 0;
const meshMap = new Map(), objectUrls = [];
const undoLimit = 40; // ponytail: 40 snapshots; switch to command deltas if large-scene editing becomes necessary.
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (validScene(stored)) { objects = stored.objects; surface = stored.surface; environment=stored.environment||clone(defaultEnvironment); sceneName=stored.sceneName||'Garden'; savedBlueprint=stored.blueprint; lastSaved = stored.savedAt || ''; }
} catch { /* Invalid local data never replaces the default scene. */ }
const snapshot = () => ({ version: 1, sceneName, objects: clone(objects), surface: clone(surface), environment: clone(environment), blueprint:clone(graphs.blueprint) });
const remember = () => { history.push(snapshot()); if (history.length > undoLimit) history.shift(); };
function changed() { dirty = true; $('#dirty-mark').hidden = false; $('#status-text').textContent = '변경 사항 있음'; }
function notify(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.hidden = true, 3500); log(message); }
function log(message, kind = 'INFO') {
  logs.push({ message, kind, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) });
  if (logs.length > 100) logs.shift();
  $('#log-count').textContent = logs.length;
  $('#console-logs').innerHTML = logs.map(l => `<div class="log-row"><time>${l.time}</time><span class="log-kind">${l.kind}</span><span>${escapeHtml(l.message)}</span></div>`).join('');
}
function save() {
  if (running) { notify('실행을 종료한 뒤 편집 장면을 저장하세요.'); return; }
  const data=snapshot();if(!validScene(data))return notify('저장 데이터 검증에 실패했어요. 기존 저장은 보존돼요. JSON으로 내용을 확인하세요.');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() })); }
  catch { notify('브라우저 저장 공간을 사용할 수 없어요.'); return; }
  dirty = false; $('#dirty-mark').hidden = true; $('#status-text').textContent = '준비됨';
  $('#save-status').textContent = '방금 저장됨 · 이 브라우저'; notify('장면·환경·블루프린트를 이 브라우저에 저장했어요.');
}
function undo() {
  if (running) return notify('실행을 종료한 뒤 편집하세요.');
  const prev = history.pop(); if (!prev) return notify('되돌릴 변경 사항이 없어요.');
  objects = prev.objects; surface = prev.surface; environment=prev.environment; sceneName=prev.sceneName; graphs.blueprint=prev.blueprint; if(blueprintView!=='event'&&blueprintView!=='construction'&&![...graphs.blueprint.functions,...graphs.blueprint.macros].some(d=>d.id===blueprintView))blueprintView='event'; pendingPin=null; rebuildWorld(); updateSurface(); applyEnvironment(); renderHierarchy(); renderInspector(); renderBlueprintSidebar();renderBlueprintGraph();changed(); notify('마지막 편집을 되돌렸어요.');
}

const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x9faa91, roughness: 0.86, flatShading: true });
const darkStone = new THREE.MeshStandardMaterial({ color: 0x667c6d, roughness: 0.93, flatShading: true });
const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x7f9c61, roughness: 1, flatShading: true });
const paleGrass = new THREE.MeshStandardMaterial({ color: 0xa4b97c, roughness: 1, flatShading: true });
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x607851, roughness: 1, flatShading: true });
const crystalMaterial = new THREE.MeshPhysicalMaterial({ color: 0xc3e3b9, roughness: 0.13, metalness: 0.18, clearcoat: 1, emissive: 0x669853, emissiveIntensity: 0.13, flatShading: true });
const surfaceMaterial = new THREE.MeshStandardMaterial({ color: surface.color, roughness: surface.roughness, metalness: surface.metalness });
function mesh(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material); m.position.set(...position); m.rotation.set(...rotation); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
const box = (group, size, material, pos, rot) => mesh(group, new THREE.BoxGeometry(...size), material, pos, rot);
function plant(group, x, z, scale = 1, seed = 0) {
  for (let i = 0; i < 5; i++) {
    const leaf = mesh(group, new THREE.ConeGeometry(0.10 * scale, 0.73 * scale, 3), i % 2 ? grassMaterial : paleGrass, [x, .25 * scale, z]);
    leaf.rotation.z = (i - 2) * .27; leaf.rotation.y = seed + i * 1.7;
  }
}
function buildObject(object) {
  const g = new THREE.Group(); g.name = object.name; g.userData.objectId = object.id;
  switch (object.kind) {
    case 'arch': {
      for (const x of [-1.4, 1.4]) for (let j = 0; j < 4; j++) box(g, [.76, .48, .8], j === 3 ? surfaceMaterial : stoneMaterial, [x, .24 + j * .5, 0], [0, (j % 2 ? .015 : -.025), 0]);
      mesh(g, new THREE.TorusGeometry(1.4, .39, 4, 12, Math.PI), surfaceMaterial, [0, 1.78, 0]);
      box(g, [1.12, .18, 1.06], darkStone, [-1.4, -.04, 0]); box(g, [1.12, .18, 1.06], darkStone, [1.4, -.04, 0]);
      plant(g, -1.65, .1, .45, 0); plant(g, 1.52, -.15, .55, 1);
      break;
    }
    case 'crystal': mesh(g, new THREE.OctahedronGeometry(.50), crystalMaterial, [0, 0, 0], [0, 0, .09], [.75, 1.45, .75]); break;
    case 'ground': {
      mesh(g, new THREE.CylinderGeometry(4.7, 4.45, .6, 8), darkStone, [0, -.40, 0], [0, Math.PI / 8, 0]);
      mesh(g, new THREE.CylinderGeometry(4.6, 4.72, .22, 8), groundMaterial, [0, -.06, 0], [0, Math.PI / 8, 0]);
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z < 15 && !(x > 1 && z > 0)) {
        box(g, [.91, .075, .91], (x + z) % 3 ? groundMaterial : stoneMaterial, [x, .046, z], [0, Math.sin(x + z) * .025, 0]);
      }
      for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6; mesh(g, new THREE.DodecahedronGeometry(.42, 0), darkStone, [Math.cos(angle) * 4.2, -.32, Math.sin(angle) * 4.2], [.5, angle, 0], [1, .9, 1]); }
      break;
    }
    case 'path': {
      for (let i = 0; i < 5; i++) box(g, [1.25, .11, .64], stoneMaterial, [Math.sin(i * .8) * .15, .12, .25 + i * .72], [0, (i % 2 ? .025 : -.02), 0]);
      for (let i = 0; i < 3; i++) box(g, [1.5, .20, .52], stoneMaterial, [0, -.08 - .12 * i, 4 + i * .4]);
      break;
    }
    case 'grass': {
      const points = [[-3,-2],[-2.8,-1],[-3.1,.5],[-2.5,2.4],[-1.4,2.7],[1.4,2.9],[2.9,-2.3],[3.5,-.4],[2.2,-2.8],[-1,-3.3],[-3.4,1.7],[3.4,2.4],[1.5,.6],[-1.7,.5]];
      points.forEach(([x,z], i) => { plant(g, x, z, .8 + (i % 3) * .22, i); plant(g, x + .28, z + .17, .6, i + 1); });
      [[-2,1.7],[2.8,-1.2],[-2.3,-2.6]].forEach(([x,z]) => { for (let j = 0; j < 3; j++) { mesh(g, new THREE.CylinderGeometry(.025,.025,.5,4), grassMaterial, [x+j*.2,.3,z+j*.12]); mesh(g,new THREE.IcosahedronGeometry(.105,0), new THREE.MeshStandardMaterial({color:0xf1d59a,roughness:1}), [x+j*.2,.58,z+j*.12]); } });
      break;
    }
    case 'rocks': [[-2.7,-2.4,.6],[2.8,-2.3,.6],[-3,1.9,.4],[3.5,.1,.5],[-1.9,-2.8,.36],[2.9,2.5,.42]].forEach(([x,z,s],i) => mesh(g, new THREE.DodecahedronGeometry(s), i%2 ? darkStone : stoneMaterial, [x,s*.4,z], [.3,i,0],[1.1,.8,.8])); break;
    case 'water': mesh(g, new THREE.CylinderGeometry(1.3,1.25,.06,28), new THREE.MeshPhysicalMaterial({color:0x567f83,roughness:.16,metalness:.3,clearcoat:1}), [0,.08,0], [0,0,0],[1.05,1,.76]); break;
    case 'light': { const l = object.id === 'sun-light' ? new THREE.DirectionalLight(0xffeed7, surface.light) : new THREE.PointLight(0xffd6a0, 8, 15); g.add(l); if(object.id==='sun-light') { sun=l; l.castShadow=true; l.shadow.mapSize.set(2048,2048); Object.assign(l.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:25}); l.shadow.bias=-.001; l.shadow.normalBias=.025; } break; }
    case 'camera': break;
    case 'cube': box(g, [1,1,1], surfaceMaterial, [0,.5,0]); break;
    case 'sphere': mesh(g, new THREE.SphereGeometry(.6,32,24), surfaceMaterial, [0,.6,0]); break;
    case 'cylinder': mesh(g, new THREE.CylinderGeometry(.45,.45,1.2,24), surfaceMaterial, [0,.6,0]); break;
    case 'plane': box(g,[1.5,.08,1.5],surfaceMaterial,[0,.04,0]); break;
  }
  g.traverse(child => child.userData.objectId = object.id);
  meshMap.set(object.id, g); applyObject(object); scene.add(g); return g;
}
function applyObject(o) { const g=meshMap.get(o.id); if(!g) return; g.position.set(...o.position); g.rotation.set(...o.rotation.map(THREE.MathUtils.degToRad)); g.scale.set(...o.scale); g.visible=o.visible; }
function rebuildWorld() {
  if(!scene) return;
  transform?.detach();
  meshMap.forEach(g => { scene.remove(g); g.traverse(m => { m.geometry?.dispose(); if(m.isLight) m.dispose(); }); });
  meshMap.clear(); sun=null; objects.forEach(buildObject);
  if(!objects.some(o=>o.id===selected)) selected=objects[0]?.id || null;
  if(!selected){if(selectionBox)selectionBox.visible=false;$('#selection-chip-name').textContent='선택 없음';}
  selectObject(selected, false);
}
function initRendering() {
  try {
    mainRenderer=new THREE.WebGLRenderer({canvas:$('#scene-canvas'),antialias:true}); mainRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
    mainRenderer.shadowMap.enabled=true; mainRenderer.shadowMap.type=THREE.PCFSoftShadowMap; mainRenderer.toneMapping=THREE.ACESFilmicToneMapping; mainRenderer.toneMappingExposure=.83;
    scene=new THREE.Scene(); scene.background=new THREE.Color(0x526e71); scene.fog=new THREE.Fog(0x526e71,19,40);
    ambientLight=new THREE.HemisphereLight(0xd6e8ee,0x677955,1.15); scene.add(ambientLight); scene.environmentIntensity=.6;
    const envGenerator=new THREE.PMREMGenerator(mainRenderer); const room=new RoomEnvironment(); scene.environment=envGenerator.fromScene(room,.04).texture; room.dispose(); envGenerator.dispose();
    camera=new THREE.PerspectiveCamera(38,1,.1,100); camera.position.set(8.6,7.2,10.5); orthoCamera=new THREE.OrthographicCamera(-7,7,7,-7,.1,100); orthoCamera.position.set(0,15,.01); activeCamera=camera;
    orbit=new OrbitControls(camera,$('#scene-canvas')); orbit.target.set(0,.45,0); orbit.enableDamping=true; orbit.dampingFactor=.09; orbit.minDistance=4; orbit.maxDistance=28; orbit.maxPolarAngle=Math.PI*.49;
    grid=new THREE.GridHelper(30,30,0x789b9b,0x638586); grid.position.y=-.75; grid.material.transparent=true; grid.material.opacity=.24; scene.add(grid);
    groundFloor=mesh(scene,new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x526c6d,roughness:1}),[0,-.78,0],[-Math.PI/2,0,0]); groundFloor.castShadow=false;
    transform=new TransformControls(camera,$('#scene-canvas')); transform.setSize(.72); scene.add(transform.getHelper());
    transform.addEventListener('dragging-changed',e=> { orbit.enabled=!e.value; if(e.value) transformBefore=snapshot(); else if(transformBefore) { history.push(transformBefore); if(history.length>undoLimit)history.shift(); transformBefore=null; changed(); renderInspector(); } });
    transform.addEventListener('objectChange',()=> { const o=objects.find(o=>o.id===selected), g=meshMap.get(selected); if(!o||!g)return; o.position=g.position.toArray().map(n=>+n.toFixed(3)); o.rotation=[g.rotation.x,g.rotation.y,g.rotation.z].map(n=>+THREE.MathUtils.radToDeg(n).toFixed(2)); o.scale=g.scale.toArray().map(n=>Math.max(.01,+n.toFixed(3))); g.scale.set(...o.scale); selectionBox?.update(); });
    selectionBox=new THREE.BoxHelper(new THREE.Object3D(),0xc3e694); selectionBox.material.transparent=true; selectionBox.material.opacity=.8; selectionBox.visible=false; scene.add(selectionBox);
    objects.forEach(buildObject);
    initSky();applyEnvironment();
    const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down;
    $('#scene-canvas').addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
    $('#scene-canvas').addEventListener('pointerup',e=> { if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||transform.dragging||transform.axis||running) return; const rect=e.currentTarget.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(pointer,activeCamera); const hits=raycaster.intersectObjects([...meshMap.values()],true).filter(h=>h.object.isMesh); if(hits[0]) selectObject(hits[0].object.userData.objectId); });
    new ResizeObserver(resize).observe($('#scene-canvas-container'));
    initMaterialPreview();
    selectObject(selected,false); resize();
  } catch(error) { $('#render-fallback').hidden=false; log('3D 미리보기 초기화 실패: '+error.message,'ERROR'); }
}
function initMaterialPreview() {
  previewRenderer=new THREE.WebGLRenderer({canvas:$('#material-canvas'),antialias:true,alpha:true}); previewRenderer.setPixelRatio(Math.min(devicePixelRatio,2)); previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;
  previewScene=new THREE.Scene(); previewCamera=new THREE.PerspectiveCamera(35,1,.1,30); previewCamera.position.set(0,0,4.8);
  previewScene.add(new THREE.HemisphereLight(0xeef0e9,0x283a36,2)); const light=new THREE.DirectionalLight(0xffe3c9,4); light.position.set(-3,4,3); previewScene.add(light); const rim=new THREE.DirectionalLight(0xabcad2,2); rim.position.set(3,1,-2); previewScene.add(rim);
  const generator=new THREE.PMREMGenerator(previewRenderer); const room=new RoomEnvironment(); previewScene.environment=generator.fromScene(room,.04).texture; room.dispose();generator.dispose();
  previewSphere=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),surfaceMaterial); previewScene.add(previewSphere);
  const noise=new Uint8Array(64*64*4); let seed=913; for(let i=0;i<64*64;i++){seed=(seed*1664525+1013904223)>>>0;const v=100+seed%100;noise.set([v,v,v,255],i*4);} const bump=new THREE.DataTexture(noise,64,64); bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(3,3);bump.needsUpdate=true;surfaceMaterial.bumpMap=bump;surfaceMaterial.bumpScale=.035;
  new ResizeObserver(resize).observe($('#material-canvas-container'));
}
function resize() {
  const container=$('#scene-canvas-container');
  if(mainRenderer&&container.clientWidth&&container.clientHeight){mainRenderer.setSize(container.clientWidth,container.clientHeight,false);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();const aspect=camera.aspect;orthoCamera.left=-6.3*aspect;orthoCamera.right=6.3*aspect;orthoCamera.top=6.3;orthoCamera.bottom=-6.3;orthoCamera.updateProjectionMatrix();}
  const preview=$('#material-canvas-container'); if(previewRenderer&&preview.clientWidth&&preview.clientHeight){previewRenderer.setSize(preview.clientWidth,preview.clientHeight,false);previewCamera.aspect=preview.clientWidth/preview.clientHeight;previewCamera.updateProjectionMatrix();}
  requestAnimationFrame(drawWires);
}
function selectObject(id, refresh=true) {
  if(!id)return; selected=id; const o=objects.find(o=>o.id===id); if(!o)return;
  const g=meshMap.get(id); if(g&&transform){ if(o.visible&&!['camera','light','ground','grass','path','rocks','water'].includes(o.kind)&&!running){transform.attach(g);selectionBox.setFromObject(g);selectionBox.visible=true;}else{transform.detach();selectionBox.visible=false;} }
  $('#selection-chip-name').textContent=o.name;
  if(refresh){renderHierarchy();renderInspector();}
}
const kindIcon = kind => ({light:'sun',camera:'camera',grass:'leaf',water:'layers',ground:'grid',crystal:'diamond',sphere:'sphere'}[kind]||'cube');
function renderHierarchy() {
  const query=$('#hierarchy-search').value.toLowerCase(); let group='';
  $('#hierarchy-list').innerHTML=objects.filter(o=>o.name.toLowerCase().includes(query)).sort((a,b)=>Number(a.group==='ENVIRONMENT')-Number(b.group==='ENVIRONMENT')).map(o=>{ const heading=group!==o.group?`<div class="tree-separator">${escapeHtml(o.group||'WORLD')}</div>`:'';group=o.group;return `${heading}<button class="tree-item ${o.id===selected?'active':''}" data-select="${escapeHtml(o.id)}" aria-pressed="${o.id===selected}">${icon(kindIcon(o.kind))}<span class="tree-name">${escapeHtml(o.name)}</span><span class="eye">${o.visible?icon('eye'):''}</span></button>`;}).join('');
  $('#object-count').textContent=objects.length+' objects';
}
function vectorRow(label,key,o) { return `<div class="vector-row"><span>${label}</span>${['X','Y','Z'].map((axis,i)=>`<label class="vector-field"><em>${axis}</em><input type="number" step="${key==='rotation'?1:.1}" ${key==='scale'?'min="0.01"':''} value="${o[key][i]}" data-transform="${key}" data-axis="${i}" aria-label="${label} ${axis}" ${running?'disabled':''}></label>`).join('')}</div>`; }
function materialProperties() { return `<div class="property-row"><label for="surface-color">기본 색상</label><input type="color" id="surface-color" value="${surface.color}" data-surface="color" aria-label="기본 색상"></div><div class="range-property"><label for="roughness">거칠기 <output>${surface.roughness.toFixed(2)}</output></label><input type="range" id="roughness" min="0" max="1" step="0.01" value="${surface.roughness}" data-surface="roughness"></div><div class="range-property"><label for="metalness">금속성 <output>${surface.metalness.toFixed(2)}</output></label><input type="range" id="metalness" min="0" max="1" step="0.01" value="${surface.metalness}" data-surface="metalness"></div>`; }
function renderInspector() {
  if(workspace==='blueprint')return renderBlueprintInspector();
  const o=objects.find(o=>o.id===selected); if(!o){$('#inspector-content').innerHTML='<div class="inspector-empty">편집할 오브젝트를 선택하세요.</div>';return;}
  const material=workspace==='material';
  $('#inspector-content').innerHTML=`<div class="object-identity"><div class="object-identity-icon">${icon(material?'material':kindIcon(o.kind))}</div><div><h3>${material?'Moss stone':escapeHtml(o.name)}</h3><p>${material?'Material · Standard PBR':'Game object · '+escapeHtml(o.kind)}</p></div><label class="object-enable"><input type="checkbox" id="object-visible" ${o.visible?'checked':''} aria-label="오브젝트 표시" ${running?'disabled':''}></label></div><div class="object-tags"><span class="tag">${material?'Opaque':'Default layer'}</span><span class="tag">${material?'Lit':'Static'}</span><span class="tag">${material?'PBR':'ID: '+escapeHtml(o.id.slice(0,14))}</span></div>
  ${!material?`<section class="component-section"><h3>${icon('move')}Transform<span>Local</span></h3>${vectorRow('위치','position',o)}${vectorRow('회전','rotation',o)}${vectorRow('크기','scale',o)}</section>`:''}
  <section class="component-section"><h3>${icon('material')}${material?'표면 설정':'머테리얼'}<span>PBR</span></h3>${!material?`<button class="material-slot" data-action="open-material"><span class="mini-sphere"></span><span><strong>Moss stone</strong><span>Standard surface</span></span>${icon('chevron')}</button>`:''}${materialProperties()}<p class="inspector-note">${material?'값을 바꾸면 노드와 미리보기 구에 함께 반영돼요.':'선택한 표면의 색과 질감을 확인하세요.'}</p></section>
  <section class="component-section" id="lighting-section"><h3>${icon('sun')}조명<span>Environment</span></h3><div class="range-property"><label for="light-intensity">태양 밝기 <output>${surface.light.toFixed(1)}</output></label><input type="range" id="light-intensity" min="0" max="10" step="0.1" value="${surface.light}" data-surface="light"></div><div class="property-row"><label for="shadow-toggle">그림자</label><label><input type="checkbox" id="shadow-toggle" ${sun?.castShadow!==false?'checked':''}> 부드러운 그림자</label></div><p class="inspector-note">장면 미리보기에 즉시 반영돼요.</p></section>
  <section class="component-section"><h3>${icon(workspace==='blueprint'?'nodes':'code')}게임 로직</h3><button class="material-slot" data-action="open-blueprint">${icon('nodes')}<span><strong>Door interaction</strong><span>노드 그래프 예시</span></span>${icon('chevron')}</button><div class="property-row"><span class="subtle">C++ 컴포넌트</span><button data-action="open-code" style="text-align:left;color:var(--accent);font-size:10px">DoorController →</button></div></section><div class="inspector-actions"><button data-action="add-component" data-icon="plus">컴포넌트 추가</button></div>`;
  icons($('#inspector-content'));
}
function updateSurface() {
  surfaceMaterial.color.set(surface.color); surfaceMaterial.roughness=surface.roughness;surfaceMaterial.metalness=surface.metalness; if(sun)sun.intensity=environment.sunEnabled?surface.light:0;
  $$('[data-surface]').forEach(input=>{const key=input.dataset.surface;if(document.activeElement!==input)input.value=surface[key];const output=input.parentElement.querySelector('output')||input.previousElementSibling?.querySelector('output');if(output)output.textContent=Number(surface[key]).toFixed(key==='light'?1:2);});
  if($('.node-color'))$('.node-color').value=surface.color;if($('.node-roughness'))$('.node-roughness').value=surface.roughness;if($('.node-roughness-value'))$('.node-roughness-value').textContent=surface.roughness.toFixed(2);
  $('#environment-light-value').textContent=surface.light.toFixed(1);
}
const skyPresets={
  day:{top:0x548baf,horizon:0xc2d4cc,ground:0x536f70,cloud:0xe4eee8,ambient:1.1,exposure:.83,light:3.2,elevation:50},
  overcast:{top:0x74858e,horizon:0xb9c8c6,ground:0x52666b,cloud:0xb8c9c8,ambient:1.25,exposure:.88,light:1.2,elevation:40},
  sunset:{top:0x596487,horizon:0xe9b18b,ground:0x635858,cloud:0xeac5ae,ambient:.65,exposure:.9,light:3,elevation:15},
  night:{top:0x111e37,horizon:0x415672,ground:0x293849,cloud:0x64788d,ambient:.3,exposure:1,light:.45,elevation:25}
};
function initSky(){
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{topColor:{value:new THREE.Color()},horizonColor:{value:new THREE.Color()},sunDirection:{value:new THREE.Vector3()},sunColor:{value:new THREE.Color(0xffe5bd)}},
    vertexShader:'varying vec3 skyDirection; void main(){ skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 skyDirection; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDirection; uniform vec3 sunColor; void main(){ vec3 d=normalize(skyDirection); float h=smoothstep(-0.12,0.85,d.y); vec3 c=mix(horizonColor,topColor,h); c+=sunColor*pow(max(dot(d,normalize(sunDirection)),0.0),350.0)*0.55; gl_FragColor=vec4(c,1.0); }'});
  skyDome=new THREE.Mesh(new THREE.SphereGeometry(80,32,16),skyMaterial);skyDome.renderOrder=-1000;scene.add(skyDome);
  cloudGroup=new THREE.Group();const cloudMaterial=new THREE.MeshBasicMaterial({color:0xe4eee8,transparent:true,opacity:.60,depthWrite:false});
  for(let i=0;i<10;i++){const cluster=new THREE.Group(),angle=i*Math.PI/5;cluster.position.set(Math.cos(angle)*16,4+Math.sin(i*2)*1.2,Math.sin(angle)*16);
    for(let j=0;j<5;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.65+((i+j)%3)*.2,16,10),cloudMaterial);puff.position.set((j-2)*.8,Math.sin(j*2)*.23,Math.cos(j)*.3);puff.scale.set(1.3,.55,1);cluster.add(puff);}cluster.rotation.y=-angle;cloudGroup.add(cluster);
  }scene.add(cloudGroup);
}
function applyEnvironment(){
  const p=skyPresets[environment.preset];
  if(scene){scene.background.set(environment.skyEnabled?p.ground:0x272f34);scene.fog=environment.fogEnabled?new THREE.Fog(p.ground,10,90-environment.fogAmount*66):null;scene.environmentIntensity=environment.skyEnabled?.6:.12;ambientLight.intensity=environment.skyEnabled?p.ambient:.25;ambientLight.color.set(p.horizon);mainRenderer.toneMappingExposure=p.exposure;groundFloor.material.color.set(p.ground);
    skyDome.visible=environment.skyEnabled;skyDome.material.uniforms.topColor.value.set(p.top);skyDome.material.uniforms.horizonColor.value.set(p.horizon);
    const az=THREE.MathUtils.degToRad(environment.sunAzimuth),el=THREE.MathUtils.degToRad(environment.sunElevation),direction=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
    skyDome.material.uniforms.sunDirection.value.copy(environment.sunEnabled?direction:new THREE.Vector3(0,-1,0));
    if(sun){sun.intensity=environment.sunEnabled?surface.light:0;sun.color.set(environment.preset==='night'?0xa5b9e1:environment.preset==='sunset'?0xffbb80:0xffeed7);sun.parent.position.copy(direction.multiplyScalar(10));const o=objects.find(o=>o.id==='sun-light');if(o)o.position=sun.parent.position.toArray().map(n=>+n.toFixed(3));}
    cloudGroup.visible=environment.cloudsEnabled;cloudGroup.children.forEach((c,i)=>{c.visible=i<Math.ceil(environment.cloudDensity*10);c.children[0].material.color.set(p.cloud);});
  }
  $$('[data-environment]').forEach(input=>{if(input.type==='checkbox')input.checked=environment[input.dataset.environment];else input.value=environment[input.dataset.environment];});
  $$('[data-environment-value]').forEach(output=>{const key=output.dataset.environmentValue;output.textContent=['sunAzimuth','sunElevation'].includes(key)?environment[key]+'°':Math.round(environment[key]*100)+'%';});
  $('#scene-root-name').textContent=sceneName;$('#scene-file-name').textContent=sceneName+'.scene';if(workspace==='scene')$('#workspace-name').textContent=sceneName;
}
function createMap(){
  if(running){notify('실행을 종료한 뒤 새 맵을 만드세요.');return;}
  const name=$('#new-map-name').value.trim();if(!name){notify('맵 이름을 입력하세요.');$('#new-map-name').focus();return;}
  const template=$('input[name="map-template"]:checked').value;remember();sceneName=name;surface=clone(defaultSurface);environment=clone(defaultEnvironment);
  if(template==='garden')objects=clone(defaultObjects);
  else if(template==='empty'){objects=[];Object.assign(environment,{skyEnabled:false,sunEnabled:false,cloudsEnabled:false,fogEnabled:false});}
  else {objects=[{id:'map-ground',name:'Ground',kind:'plane',group:'WORLD',position:[0,0,0],rotation:[0,0,0],scale:[8,1,8],visible:true},clone(defaultObjects.find(o=>o.id==='sun-light')),clone(defaultObjects.find(o=>o.kind==='camera'))];if(template==='2d')Object.assign(environment,{skyEnabled:false,cloudsEnabled:false,fogEnabled:false});}
  sun=null;selected=objects[0]?.id||null;rebuildWorld();applyEnvironment();updateSurface();renderHierarchy();setWorkspace('scene');setView(template==='2d'?'2d':'3d');if(camera){camera.position.set(8.6,7.2,10.5);orbit.target.set(0,.45,0);}$('#new-map-dialog').close();changed();notify(name+' 맵을 만들었어요. Ctrl Z로 이전 장면을 복원할 수 있어요.');
}
function setWorkspace(name) {
  workspace=name; $$('.workspace-tab').forEach(b=>{b.classList.toggle('active',b.dataset.workspace===name);b.setAttribute('aria-selected',String(b.dataset.workspace===name));});
  $$('.workspace-view').forEach(v=>v.classList.toggle('active',v.id===name+'-workspace'));
  $('.hierarchy').classList.toggle('blueprint-mode',name==='blueprint');$('#blueprint-sidebar').hidden=name!=='blueprint';$('.hierarchy .panel-heading h2').innerHTML=name==='blueprint'?'블루프린트 <span>My Blueprint</span>':'장면 구조 <span>Hierarchy</span>';
  $('.hierarchy .panel-heading .icon-button').dataset.action=name==='blueprint'?'add-blueprint-node':'add-menu';
  const meta={scene:['Scenes',sceneName,'Scene view','scene'],material:['Materials','Moss stone','Material editor','material'],animation:['Animations','Float_loop','Animation editor','animation'],blueprint:['Blueprints',graphs.blueprint.name,'Graph editor','nodes'],code:['Source','DoorController.cpp','C++ preview','code']}[name];
  $('#workspace-path').textContent=meta[0];$('#workspace-name').textContent=meta[1];$('#workspace-kind').textContent=meta[2];$('#workspace-symbol').innerHTML=icon(meta[3]);
  renderInspector();if(graphs[name])renderGraph(name);if(name==='blueprint')renderBlueprintSidebar();resize();drawWires();
}
function setView(mode) {
  if(!orbit)return;viewMode=mode;activeCamera=mode==='2d'?orthoCamera:camera;
  orbit.dispose();orbit=new OrbitControls(activeCamera,$('#scene-canvas'));orbit.enableDamping=true;orbit.enableRotate=mode==='3d';orbit.target.set(0,mode==='2d'?0:.45,0);orbit.minDistance=4;orbit.maxDistance=28;orbit.maxPolarAngle=Math.PI*.49;transform.camera=activeCamera;
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));$('#scene-view-label').textContent=mode==='2d'?'Orthographic · Top':'Perspective · Lit';resize();
}
function focusObject() { const g=meshMap.get(selected);if(!g||!orbit)return;const center=new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());if(!Number.isFinite(center.x))return;orbit.target.copy(center);if(viewMode==='3d')camera.position.copy(center).add(new THREE.Vector3(5,4,6));else orthoCamera.position.set(center.x,15,center.z+.01);orbit.update(); }
function createObject(kind) {
  if(running)return notify('실행을 종료한 뒤 오브젝트를 추가하세요.');if(objects.length>=500)return notify('프로토타입은 오브젝트 500개까지 편집할 수 있어요.');remember();
  const names={cube:'Cube',sphere:'Sphere',cylinder:'Cylinder',plane:'Plane',light:'Point light'};
  const id=crypto.randomUUID();const o={id,name:names[kind]||'Object',kind,group:'WORLD',position:[-1.7,.1,1],rotation:[0,0,0],scale:[1,1,1],visible:true};objects.push(o);if(scene)buildObject(o);selectObject(id);setWorkspace('scene');changed();notify(o.name+'를 장면에 추가했어요.');
}
function startPlay() {if(running){paused=!paused;return updatePlayButtons();}running=true;paused=false;playTime=0;transform?.detach();if(selectionBox)selectionBox.visible=false;$('#play-banner').hidden=false;updatePlayButtons();notify('게임 실행 흐름 미리보기예요. 편집 장면은 보존돼요.');}
function stopPlay(){running=false;paused=false;$('#play-banner').hidden=true;objects.forEach(applyObject);selectObject(selected);updatePlayButtons();}
function updatePlayButtons(){ $('#play-button').innerHTML=icon(running?(paused?'play':'pause'):'play')+(running?(paused?'계속':'실행 중'):'실행');$('#play-button').classList.toggle('running',running); $('[data-action="pause"]').disabled=!running;$('[data-action="stop"]').disabled=!running;renderInspector(); }

const assetTypes={model:'Model',material:'Material',texture:'Texture',animation:'Animation',media:'Media'};
const assets=[
  {name:'Stone_arch',kind:'model',look:'stone',object:'stone-arch'}, {name:'Floating_crystal',kind:'model',look:'crystal',object:'floating-crystal'}, {name:'Garden_rock',kind:'model',look:'rock',object:'garden-rocks'}, {name:'Wild_grass',kind:'model',look:'plant',object:'wild-grass'},
  {name:'Moss_stone',kind:'material',look:'surface'}, {name:'Copper',kind:'material',look:'surface copper'}, {name:'Garden_tiles',kind:'texture',look:'tiles'}, {name:'Grass_albedo',kind:'texture',look:'noise'},
  {name:'Float_loop',kind:'animation',look:'',icon:'animation'}, {name:'Ambient_garden',kind:'media',look:'wave'}, {name:'Cloudy_sky',kind:'texture',look:'sky'}, {name:'Door_interaction',kind:'blueprint',look:'',icon:'nodes'}
];
function renderAssets() {
  const query=$('#asset-search').value.toLowerCase();const filtered=assets.filter(a=>(currentFilter==='all'||a.kind===currentFilter)&&a.name.toLowerCase().includes(query));
  $('#asset-grid').innerHTML=filtered.map(a=>`<button class="asset-card ${a.kind}" data-asset="${assets.indexOf(a)}" draggable="true" aria-label="${escapeHtml(a.name)} ${assetTypes[a.kind]||'Blueprint'}"><span class="asset-preview ${a.look||''}">${a.url?`<img src="${a.url}" alt="${escapeHtml(a.name)}">`:a.icon?icon(a.icon):''}<span class="asset-type-dot"></span></span><span class="asset-name">${escapeHtml(a.name)}</span><span class="asset-type">${a.imported?'Imported · UI preview':assetTypes[a.kind]||'Blueprint'}</span></button>`).join('') || '<p class="inspector-note">검색 결과가 없어요.</p>';
  $('#asset-count').textContent=assets.length;$('#asset-results').textContent=filtered.length+'개 에셋';
}
function openAsset(index) {const a=assets[index];if(!a)return;$$('.asset-card').forEach(b=>b.classList.toggle('selected',Number(b.dataset.asset)===index));if(a.kind==='material'){setWorkspace('material');if(a.name==='Copper')preset('copper');}else if(a.kind==='animation')setWorkspace('animation');else if(a.kind==='blueprint')setWorkspace('blueprint');else if(a.object){setWorkspace('scene');selectObject(a.object);}else notify(a.name+' · '+(a.imported?'가져온 파일 UI 미리보기':'에셋 미리보기'));}
function queueFiles(files) {
  if(!$('#import-dialog').open)$('#import-dialog').showModal();
  for(const file of files){if(pendingFiles.length>=20){notify('한 번에 20개 파일까지 미리볼 수 있어요.');break;}const kind=fileKind(file.name);pendingFiles.push({file,name:file.name,kind,size:file.size||0,demo:!!file.demo});}
  renderImportQueue();
}
function renderImportQueue(){ $('#import-file-list').innerHTML=pendingFiles.map((f,i)=>`<div class="import-file">${icon(f.kind==='model'?'cube':f.kind==='texture'?'image':f.kind==='media'?'volume':'info')}<div class="file-details"><strong>${escapeHtml(f.name)}</strong><small>${f.demo?'예시 파일':(f.size/1024/1024).toFixed(2)+' MB'} · ${f.kind==='unsupported'?'지원 형식 확인 필요':assetTypes[f.kind]}</small></div><span class="import-state">${f.kind==='unsupported'?'미지원':'미리보기 대기'}</span><button class="remove-file" data-remove-file="${i}" aria-label="${escapeHtml(f.name)} 목록에서 삭제">${icon('close')}</button></div>`).join('');$('#confirm-import').disabled=!pendingFiles.some(f=>f.kind!=='unsupported'); }
async function confirmImport(){
  const button=$('#confirm-import');button.disabled=true;button.textContent='미리보기 준비 중…';
  let count=0;
  try {for(const f of pendingFiles){if(f.kind==='unsupported')continue;const a={name:f.name.replace(/\.[^.]+$/,''),kind:f.kind,look:f.kind==='model'?'rock':f.kind==='media'?'wave':'noise',imported:true};if(f.kind==='texture'&&!f.demo&&/^image\/(jpeg|png|webp|gif|bmp)/.test(f.file.type)){if(f.size>25*1024*1024){log(f.name+' 이미지 미리보기 생략: 25 MB 초과','WARN');}else{a.url=URL.createObjectURL(f.file);objectUrls.push(a.url);}}assets.push(a);count++;}pendingFiles=[];renderImportQueue();currentFilter='all';$$('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));renderAssets();$('#import-dialog').close();notify(`${count}개 에셋을 목록에 추가했어요. 모델·영상은 변환 UI 미리보기예요.`);}finally{button.textContent='가져오기';button.disabled=false;$('#file-input').value='';}
}

let nodeCounter=0,pendingPin=null;
const graphs={
  material:{nodes:[{id:'color',title:'기본 색상',kind:'value',x:.04,y:24,body:'color',output:'색상'},{id:'rough',title:'거칠기',kind:'value',x:.04,y:132,body:'rough',output:'값'},{id:'surface',title:'Standard surface',kind:'output',x:.62,y:48,inputs:['Base color','Roughness','Metallic']}],edges:[['color','surface',0],['rough','surface',1]]},
  blueprint:clone(savedBlueprint||defaultBlueprint)
};
graphs.blueprint.functions??=[];graphs.blueprint.macros??=[];graphs.blueprint.construction??=clone(defaultBlueprint.construction);
const currentGraph=()=>graphContext(graphs.blueprint,blueprintView);
function switchBlueprintView(view){
  blueprintView=view;pendingPin=null;selectedNode=null;selectedNodes.clear();$('#blueprint-graph').scrollTo(0,0);renderBlueprintSidebar();renderBlueprintGraph();renderBlueprintInspector();
}
function updateGraphHeading(){
  const d=[...graphs.blueprint.functions,...graphs.blueprint.macros].find(d=>d.id===blueprintView);
  $('#blueprint-graph-name').textContent=blueprintView==='event'?'이벤트 그래프':blueprintView==='construction'?'Construction Script':d?.name||'그래프';
  $('#blueprint-back').hidden=blueprintView==='event';$('#workspace-name').textContent=graphs.blueprint.name;
  $('#blueprint-badge').textContent=graphs.blueprint.name;
  $('#selection-count').textContent=selectedNodes.size+'개 선택';
  $$('[data-action^="collapse-"]').forEach(b=>b.disabled=!selectedNodes.size);
}
function setGraphZoom(value,clientX,clientY){
  const c=$('#blueprint-graph'),r=c.getBoundingClientRect(),x=clientX===undefined?c.clientWidth/2:clientX-r.left,y=clientY===undefined?c.clientHeight/2:clientY-r.top;
  const modelX=(c.scrollLeft+x)/blueprintZoom,modelY=(c.scrollTop+y)/blueprintZoom;blueprintZoom=Math.min(1.8,Math.max(.4,value));drawBlueprintWires();c.scrollLeft=modelX*blueprintZoom-x;c.scrollTop=modelY*blueprintZoom-y;$('#graph-zoom').textContent=Math.round(blueprintZoom*100)+'%';
}
function openCollapse(kind){collapseKind=kind;$('#collapse-title').textContent=kind==='function'?'선택 노드를 함수로 묶기':'선택 노드를 매크로로 묶기';$('#collapse-name').value=kind==='function'?'NewFunction':'NewMacro';$('#collapse-dialog').showModal();$('#collapse-name').select();}
function confirmCollapse(){
  const root=graphs.blueprint,graph=currentGraph();if((root[collapseKind==='function'?'functions':'macros']||[]).length>=50)return notify('함수와 매크로는 각각 50개까지 만들 수 있어요.');
  const before=snapshot(),result=collapseNodes(root,graph,[...selectedNodes],collapseKind,$('#collapse-name').value);
  if(!result.ok)return notify(result.reason);history.push(before);if(history.length>undoLimit)history.shift();selectedNode=result.call.id;selectedNodes=new Set([selectedNode]);pendingPin=null;$('#collapse-dialog').close();renderBlueprintSidebar();renderBlueprintGraph();renderBlueprintInspector();changed();notify('연결을 유지하며 '+result.definition.name+'으로 묶었어요. 호출 노드를 두 번 클릭하면 내부를 편집해요.');
}
function renderGraph(name){if(name==='blueprint')return renderBlueprintGraph();const graph=graphs[name],container=$('#'+name+'-graph'),w=Math.max(container.clientWidth,name==='blueprint'?850:600);$('.graph-nodes',container).innerHTML=graph.nodes.map(n=>`<div class="graph-node ${n.kind}" data-node="${n.id}" style="left:${n.px??n.x*(w-155)}px;top:${n.y}px"><div class="node-title">${icon(n.kind==='event'?'play':n.kind==='output'?'material':'nodes')}${escapeHtml(n.title)}</div><div class="node-body">${n.caption?`<div class="node-caption">${escapeHtml(n.caption)}</div>`:''}${n.body==='color'?`<input type="color" class="node-color" value="${surface.color}" aria-label="노드 기본 색상" data-surface="color">`:n.body==='rough'?`<input type="range" class="node-roughness" min="0" max="1" step="0.01" value="${surface.roughness}" data-surface="roughness" aria-label="노드 거칠기"><span class="node-value node-roughness-value">${surface.roughness.toFixed(2)}</span>`:''}${(n.inputs||[]).map((label,i)=>`<div class="pin-row"><span class="pin-label"><button class="pin in ${name==='blueprint'?'exec':''}" data-pin="in" data-node-id="${n.id}" data-pin-index="${i}" aria-label="${escapeHtml(n.title+' '+label+' 입력 핀')}"></button>${escapeHtml(label)}</span></div>`).join('')}${n.output?`<div class="pin-row"><span></span><span class="pin-label">${escapeHtml(n.output)}<button class="pin out ${name==='blueprint'?'exec':''}" data-pin="out" data-node-id="${n.id}" aria-label="${escapeHtml(n.title+' 출력 핀')}"></button></span></div>`:''}</div></div>`).join('');
  $$('.node-title',container).forEach(header=>header.addEventListener('pointerdown',e=>{const el=header.parentElement,n=graph.nodes.find(n=>n.id===el.dataset.node),startX=e.clientX,startY=e.clientY,left=el.offsetLeft,top=el.offsetTop;header.setPointerCapture(e.pointerId);const move=ev=>{n.px=Math.max(0,left+ev.clientX-startX);n.y=Math.max(0,top+ev.clientY-startY);el.style.left=n.px+'px';el.style.top=n.y+'px';drawWires();};const up=()=>{header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',up);header.removeEventListener('pointercancel',up);};header.addEventListener('pointermove',move);header.addEventListener('pointerup',up);header.addEventListener('pointercancel',up);}));drawWires();
}
function drawWires(){drawBlueprintWires();for(const name of ['material']){const c=$('#'+name+'-graph');if(!c.clientWidth)continue;const base=c.getBoundingClientRect();let width=Math.max(c.clientWidth,600),height=Math.max(c.clientHeight,230);const wireMarkup=graphs[name].edges.map(([from,to,index])=>{const out=$(`[data-node-id="${from}"][data-pin="out"]`,c),input=$(`[data-node-id="${to}"][data-pin="in"][data-pin-index="${index}"]`,c);if(!out||!input)return '';const a=out.getBoundingClientRect(),b=input.getBoundingClientRect(),x1=a.left-base.left+c.scrollLeft+4,y1=a.top-base.top+c.scrollTop+4,x2=b.left-base.left+c.scrollLeft+4,y2=b.top-base.top+c.scrollTop+4;const bend=Math.max(40,Math.abs(x2-x1)*.5);width=Math.max(width,x1+100,x2+170);height=Math.max(height,y1+55,y2+75);return `<path d="M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}" fill="none" stroke="${name==='material'?'#a7c58a':'#aebdbb'}" stroke-width="2" opacity=".8"/>`;}).join('');const svg=$('.node-wires',c);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.style.width=width+'px';svg.style.height=height+'px';svg.innerHTML=wireMarkup;$('.graph-nodes',c).style.width=width+'px';$('.graph-nodes',c).style.height=height+'px';}}
function connectPin(button){if(button.closest('#blueprint-graph'))return connectBlueprintPin(button);const name=button.closest('.node-graph').id.startsWith('material')?'material':'blueprint';if(button.dataset.pin==='out'){pendingPin={name,id:button.dataset.nodeId};$$('.pin.pending').forEach(p=>p.classList.remove('pending'));button.classList.add('pending');return;}
  if(!pendingPin||pendingPin.name!==name)return notify('먼저 연결할 출력 핀을 선택하세요.');const target=button.dataset.nodeId,index=Number(button.dataset.pinIndex);if(target===pendingPin.id)return notify('같은 노드에는 연결할 수 없어요.');const graph=graphs[name];const reaches=(start,end,seen=new Set())=>{if(start===end)return true;if(seen.has(start))return false;seen.add(start);return graph.edges.filter(e=>e[0]===start).some(e=>reaches(e[1],end,seen));};if(reaches(target,pendingPin.id))return notify('순환 연결은 이 UI 예제에서 지원하지 않아요.');graph.edges=graph.edges.filter(e=>!(e[1]===target&&e[2]===index));graph.edges.push([pendingPin.id,target,index]);pendingPin=null;$$('.pin.pending').forEach(p=>p.classList.remove('pending'));drawWires();$('#graph-status').textContent=`노드 ${graphs.blueprint.nodes.length}개 · 연결 ${graphs.blueprint.edges.length}개`;notify('노드를 연결했어요. 세션에서 연결 흐름을 미리볼 수 있어요.');}
async function traceBlueprint(){
  const graph=currentGraph(),visited=new Set(),start=graph.nodes.find(n=>n.id===selectedNode&&basePins(n,'in',graph).length===0)||graph.nodes.find(n=>['beginPlay','construction','functionInput','macroInput'].includes(n.key));
  let id=start?.id; $('#graph-status').textContent='이벤트 실행 흐름 미리보기…';
  while(id&&!visited.has(id)){visited.add(id);const element=$(`#blueprint-graph [data-node="${id}"]`);element?.classList.add('tracing');await new Promise(r=>setTimeout(r,350));element?.classList.remove('tracing');id=graph.edges.find(e=>e.from.node===id&&effectivePins(graph.nodes.find(n=>n.id===id),'out',graph).find(p=>p.id===e.from.pin)?.type==='exec')?.to.node;}
  $('#graph-status').textContent=`${visited.size}개 노드를 따라 실행 흐름 확인`;notify('이벤트 흐름 UI 시뮬레이션이에요. 충돌·Tick을 실제 게임에서 실행하지는 않아요.');
}
function preset(name){remember();const values={moss:['#889878',.72,.08],copper:['#bb7959',.23,.93],ceramic:['#ded8c6',.24,.02],glass:['#91bfc6',.08,.30]}[name];[surface.color,surface.roughness,surface.metalness]=values;$$('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));updateSurface();changed();}

function renderBlueprintGraph(){
  const graph=currentGraph(),container=$('#blueprint-graph');
  selectedNodes=new Set([...selectedNodes].filter(id=>graph.nodes.some(n=>n.id===id)));updateGraphHeading();
  const pinMarkup=(p,n,direction)=>`<span class="pin-label" style="--pin-color:${typeColors[p.type]||typeColors.any}">${direction==='out'?escapeHtml(p.label):''}<button class="pin ${direction} ${p.type==='exec'?'exec':''} ${p.array?'array':''} ${pendingPin?.name==='blueprint'&&pendingPin.id===n.id&&pendingPin.pin===p.id?'pending':''}" data-pin="${direction}" data-node-id="${n.id}" data-pin-id="${p.id}" aria-label="${escapeHtml(nodeTitle(n,graph)+' '+p.label+' '+(direction==='out'?'출력':'입력')+' 핀')}"></button>${direction==='in'?escapeHtml(p.label):''}${p.type!=='exec'?`<span class="pin-type-label">${p.type}${p.array?'[]':''}</span>`:''}</span>`;
  $('.graph-nodes',container).innerHTML=graph.nodes.map(n=>{const spec=catalog.find(s=>s.key===n.key),inputs=effectivePins(n,'in',graph),outputs=effectivePins(n,'out',graph),caption=n.key==='callFunction'?'함수 · 두 번 클릭하여 편집':n.key==='callMacro'?'매크로 · 두 번 클릭하여 편집':n.key.endsWith('Input')||n.key.endsWith('Output')?'그래프 인터페이스':spec?.ko||'변수 '+(n.key==='getVariable'?'읽기':'쓰기');return `<div class="graph-node bp-node ${spec?.kind||'function'} ${n.key} ${selectedNodes.has(n.id)?'selected':''}" data-node="${n.id}" style="left:${n.position.x}px;top:${n.position.y}px"><div class="node-title"><span><strong>${escapeHtml(nodeTitle(n,graph))}</strong><small>${escapeHtml(caption)}</small></span>${icon(spec?.kind==='event'?'play':'nodes')}</div><div class="node-body">${Array.from({length:Math.max(inputs.length,outputs.length)},(_,i)=>`<div class="pin-row">${inputs[i]?pinMarkup(inputs[i],n,'in'):'<span></span>'}${outputs[i]?pinMarkup(outputs[i],n,'out'):'<span></span>'}</div>`).join('')}</div></div>`;}).join('');
  $$('.node-title',container).forEach(header=>header.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const el=header.parentElement,n=graph.nodes.find(n=>n.id===el.dataset.node),startX=e.clientX,startY=e.clientY;
    if(e.ctrlKey||e.metaKey||e.shiftKey){if(selectedNodes.has(n.id))selectedNodes.delete(n.id);else selectedNodes.add(n.id);}else if(!selectedNodes.has(n.id))selectedNodes=new Set([n.id]);
    selectedNode=n.id;renderBlueprintInspector();updateGraphHeading();$$('.bp-node',container).forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));
    const moving=graph.nodes.filter(n=>selectedNodes.has(n.id)).map(n=>({n,x:n.position.x,y:n.position.y}));let recorded=false;header.setPointerCapture(e.pointerId);
    const move=ev=>{if(!recorded){if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<=4)return;remember();recorded=true;}let dx=(ev.clientX-startX)/blueprintZoom,dy=(ev.clientY-startY)/blueprintZoom;if(moving.length){dx=Math.max(-Math.min(...moving.map(m=>m.x)),Math.min(10000-Math.max(...moving.map(m=>m.x)),dx));dy=Math.max(-Math.min(...moving.map(m=>m.y)),Math.min(10000-Math.max(...moving.map(m=>m.y)),dy));}for(const m of moving){m.n.position={x:m.x+dx,y:m.y+dy};const element=$(`[data-node="${m.n.id}"]`,container);element.style.left=m.n.position.x+'px';element.style.top=m.n.position.y+'px';}drawBlueprintWires();};
    const up=()=>{if(recorded)changed();header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',up);header.removeEventListener('pointercancel',up);};header.addEventListener('pointermove',move);header.addEventListener('pointerup',up);header.addEventListener('pointercancel',up);
  }));
  $$('.bp-node.callFunction .node-title,.bp-node.callMacro .node-title',container).forEach(header=>header.addEventListener('dblclick',()=>switchBlueprintView(graph.nodes.find(n=>n.id===header.parentElement.dataset.node).definitionId)));
  $('#graph-status').textContent=`노드 ${graph.nodes.length}개 · 연결 ${graph.edges.length}개`;drawBlueprintWires();
}
function drawBlueprintWires(){
  const container=$('#blueprint-graph');if(!container.clientWidth)return;const graph=currentGraph(),rect=container.getBoundingClientRect();let width=container.clientWidth/blueprintZoom,height=container.clientHeight/blueprintZoom;
  $$('.bp-node',container).forEach(n=>{width=Math.max(width,n.offsetLeft+n.offsetWidth+45);height=Math.max(height,n.offsetTop+n.offsetHeight+45);});
  const plane=$('.graph-plane',container),nodes=$('.graph-nodes',container),svg=$('.node-wires',container);plane.style.width=width*blueprintZoom+'px';plane.style.height=height*blueprintZoom+'px';for(const el of [nodes,svg]){el.style.width=width+'px';el.style.height=height+'px';el.style.transform=`scale(${blueprintZoom})`;}
  const wires=graph.edges.map(e=>{const out=$(`[data-node-id="${e.from.node}"][data-pin-id="${e.from.pin}"][data-pin="out"]`,container),input=$(`[data-node-id="${e.to.node}"][data-pin-id="${e.to.pin}"][data-pin="in"]`,container);if(!out||!input)return '';const a=out.getBoundingClientRect(),b=input.getBoundingClientRect(),x1=(a.left+a.width/2-rect.left+container.scrollLeft)/blueprintZoom,y1=(a.top+a.height/2-rect.top+container.scrollTop)/blueprintZoom,x2=(b.left+b.width/2-rect.left+container.scrollLeft)/blueprintZoom,y2=(b.top+b.height/2-rect.top+container.scrollTop)/blueprintZoom,bend=Math.max(50,Math.abs(x2-x1)*.45),node=graph.nodes.find(n=>n.id===e.from.node),type=effectivePins(node,'out',graph).find(p=>p.id===e.from.pin)?.type;return `<path d="M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}" fill="none" stroke="${typeColors[type]||typeColors.any}" stroke-width="2" opacity=".85"/>`;}).join('');svg.innerHTML=wires;
}
function connectBlueprintPin(button){
  if(button.dataset.pin==='out'){pendingPin={name:'blueprint',id:button.dataset.nodeId,pin:button.dataset.pinId};$$('.pin.pending').forEach(p=>p.classList.remove('pending'));button.classList.add('pending');$('#graph-status').textContent='입력 핀을 선택하거나 우클릭으로 연결할 노드를 검색하세요.';return;}
  if(!pendingPin||pendingPin.name!=='blueprint')return notify('먼저 연결할 출력 핀을 선택하세요.');const graph=currentGraph(),from={node:pendingPin.id,pin:pendingPin.pin},to={node:button.dataset.nodeId,pin:button.dataset.pinId};const result=canConnect(graph,from,to);if(!result.ok)return notify(result.reason);remember();connect(graph,from,to);pendingPin=null;renderBlueprintGraph();changed();
}
const normalizeSearch=s=>s.toLowerCase().replace(/[\s_-]/g,'');
function paletteEntries(){return [...catalog.filter(s=>blueprintView==='event'?s.key!=='construction':blueprintView==='construction'?s.kind!=='event':s.kind!=='event'&&(!(graphs.blueprint.functions||[]).some(d=>d.id===blueprintView)||s.key!=='delay')),...['functions','macros'].flatMap(kind=>(graphs.blueprint[kind]||[]).filter(d=>d.id!==blueprintView&&!(kind==='macros'&&graphs.blueprint.functions.some(d=>d.id===blueprintView))).map(d=>({key:kind==='functions'?'callFunction':'callMacro',definitionId:d.id,title:d.name,ko:kind==='functions'?'함수 호출':'매크로 호출',group:kind==='functions'?'함수':'매크로',keywords:d.name+' function macro 함수 매크로',inputs:d.inputs,outputs:d.outputs}))),...graphs.blueprint.variables.flatMap(v=>[{key:'getVariable',variableId:v.id,title:'Get '+v.name,ko:v.name+' 읽기',group:'변수',keywords:v.name+' get 읽기 변수',inputs:[],outputs:[{id:'value',type:v.type,array:v.container==='array'}]},{key:'setVariable',variableId:v.id,title:'Set '+v.name,ko:v.name+' 쓰기',group:'변수',keywords:v.name+' set 쓰기 변수',inputs:[{id:'exec',type:'exec',array:false},{id:'value',type:v.type,array:v.container==='array'}],outputs:[]}])];}
function renderPalette(){
  const query=normalizeSearch($('#node-search').value),graph=currentGraph(),outNode=pendingPin?.name==='blueprint'&&graph.nodes.find(n=>n.id===pendingPin.id),out=outNode&&effectivePins(outNode,'out',graph).find(p=>p.id===pendingPin.pin);let group='';
  $('#palette-results').innerHTML=paletteEntries().filter(s=>normalizeSearch(s.title+' '+s.ko+' '+s.key+' '+s.keywords).includes(query)&&(!out||!$('#context-sensitive').checked||s.inputs.some(p=>p.array===out.array&&(p.type===out.type||p.type==='any')))).map(s=>{const heading=group!==s.group?`<div class="palette-group">${s.group}</div>`:'';group=s.group;return heading+`<button class="palette-result ${s.kind||''}" data-spawn-node="${s.key}" ${s.variableId?`data-variable-id="${s.variableId}"`:''} ${s.definitionId?`data-definition-id="${s.definitionId}"`:''}><span class="palette-dot"></span><span><strong>${escapeHtml(s.title)}</strong><small>${escapeHtml(s.ko)}</small></span><span>${s.group==='이벤트'?'Event':''}</span></button>`;}).join('')||'<p class="inspector-note" style="padding:12px">일치하는 노드가 없어요. 타입 필터를 해제하거나 검색어를 바꿔보세요.</p>';
  $('#palette-footer').textContent=out?`${out.type}${out.array?'[]':''} 출력에서 연결할 노드를 찾고 있어요.`:'한글·영어 검색 · Enter로 첫 결과 추가 · Esc 닫기';
}
function openNodePalette(x,y){
  const graph=$('#blueprint-graph'),rect=graph.getBoundingClientRect();palettePosition={x:Math.max(0,(x-rect.left+graph.scrollLeft)/blueprintZoom),y:Math.max(0,(y-rect.top+graph.scrollTop)/blueprintZoom)};
  const panel=$('#node-palette');panel.hidden=false;panel.style.left=Math.max(8,Math.min(x,innerWidth-330))+'px';panel.style.top=Math.max(8,Math.min(y,innerHeight-445))+'px';$('#node-search').value='';renderPalette();$('#node-search').focus();
}
function spawnBlueprintNode(key,variableId,definitionId){
  const graph=currentGraph();if(graph.nodes.length>=200)return notify('프로토타입은 그래프마다 노드 200개까지 편집할 수 있어요.');remember();const n=makeNode(key,Math.min(10000,palettePosition.x),Math.min(10000,palettePosition.y),variableId);if(definitionId)n.definitionId=definitionId;graph.nodes.push(n);
  if(pendingPin?.name==='blueprint'){const from={node:pendingPin.id,pin:pendingPin.pin},input=effectivePins(n,'in',graph).find(p=>canConnect(graph,from,{node:n.id,pin:p.id}).ok);if(input)connect(graph,from,{node:n.id,pin:input.id});}
  pendingPin=null;selectedNode=n.id;selectedNodes=new Set([n.id]);$('#node-palette').hidden=true;renderBlueprintGraph();renderBlueprintInspector();$('#blueprint-graph').scrollTo({left:Math.max(0,n.position.x*blueprintZoom-25),top:Math.max(0,n.position.y*blueprintZoom-25)});changed();
}
function variableValueMarkup(v,index=-1){
  const value=index<0?v.value:v.value[index],attributes=`data-variable-value="${v.id}" data-value-index="${index}"`;
  if(['vec2','vec3','color'].includes(v.type))return `<div class="variable-vector">${value.map((n,i)=>`<label>${['X','Y','Z','W'][i]}<input type="number" step="0.1" value="${n}" ${attributes} data-vector-axis="${i}" aria-label="${escapeHtml(v.name)} ${index<0?'':'원소 '+index+' '}${['X','Y','Z','W'][i]}"></label>`).join('')}</div>`;
  if(v.type==='bool')return `<input type="checkbox" ${attributes} ${value?'checked':''} aria-label="${escapeHtml(v.name)} 기본값">`;
  if(['int','float'].includes(v.type))return `<input type="number" step="${v.type==='int'?1:.1}" value="${value}" ${attributes} aria-label="${escapeHtml(v.name)} 기본값">`;
  return `<input value="${escapeHtml(v.type==='string'?value:JSON.stringify(value))}" ${attributes} aria-label="${escapeHtml(v.name)} 기본값" placeholder="${v.type==='object'?'null 또는 오브젝트 ID':'JSON 기본값'}">`;
}
function renderBlueprintSidebar(){
  const g=graphs.blueprint;if(!g.variables.some(v=>v.id===selectedVariable))selectedVariable=g.variables[0]?.id;const v=g.variables.find(v=>v.id===selectedVariable);
  $('#blueprint-sidebar').innerHTML=`<div class="bp-section-heading">컴포넌트<button class="icon-button" data-action="new-component" aria-label="블루프린트 컴포넌트 추가">${icon('plus')}</button></div>${g.components.map(c=>`<div class="bp-component">${icon(c.type.includes('Collider')?'grid':c.type==='Transform'?'move':'cube')}<span>${escapeHtml(c.name)}</span></div>`).join('')}<div class="bp-section-heading">변수<button class="icon-button" data-action="new-variable" aria-label="변수 추가">${icon('plus')}</button></div>${g.variables.map(v=>`<div class="bp-variable ${v.container==='array'?'array':''} ${v.id===selectedVariable?'selected':''}"><span class="variable-type" style="background:${typeColors[v.type]}"></span><button data-select-variable="${v.id}">${escapeHtml(v.name)}${v.container==='array'?'[]':''}</button><button class="variable-get" data-variable-node="getVariable" data-variable-id="${v.id}" aria-label="${escapeHtml(v.name)} 읽기 노드 추가">읽기</button><button class="variable-get" data-variable-node="setVariable" data-variable-id="${v.id}" aria-label="${escapeHtml(v.name)} 쓰기 노드 추가">쓰기</button></div>`).join('')}${v?`<div class="bp-variable-editor"><h3>변수 설정</h3><label>이름<input id="edit-variable-name" value="${escapeHtml(v.name)}" maxlength="80" aria-label="변수 이름"></label><label>자료형<select id="edit-variable-type" aria-label="변수 자료형">${Object.entries(variableTypes).map(([key,label])=>`<option value="${key}" ${v.type===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="inline-label"><input type="checkbox" id="edit-variable-array" ${v.container==='array'?'checked':''}>배열로 사용</label><label>기본값</label>${v.container==='array'?v.value.map((_,i)=>`<div class="variable-value-row">${variableValueMarkup(v,i)}<button data-remove-array="${i}" aria-label="배열 원소 ${i} 삭제">${icon('close')}</button></div>`).join('')+`<button class="array-add" data-action="add-array-element">+ 원소 추가</button>`:variableValueMarkup(v)}<p class="inspector-note">자료형을 바꾸면 기본값이 초기화돼요. 배열은 최대 128개 원소를 편집해요.</p></div>`:''}<div class="bp-sidebar-footer">변수를 노드에서 읽고 쓰세요.<br>핀 우클릭으로 벡터·구조체를 분할해요.<br>JSON은 AI가 읽고 수정할 수 있어요.</div>`;
  const link=(view,label,detail='')=>`<button class="bp-graph-link ${blueprintView===view?'active':''}" data-graph-view="${view}">${icon('nodes')}<span>${escapeHtml(label)}</span><small>${detail}</small></button>`;
  $('#blueprint-sidebar').insertAdjacentHTML('afterbegin',`<div class="bp-section-heading">그래프</div>${link('event','이벤트 그래프')}${link('construction','Construction Script','구성')}<div class="bp-section-heading">함수 <span>${g.functions.length}</span></div>${g.functions.map(d=>link(d.id,d.name,'Function')).join('')||'<p class="inspector-note">노드를 선택해 함수로 묶으세요.</p>'}<div class="bp-section-heading">매크로 <span>${g.macros.length}</span></div>${g.macros.map(d=>link(d.id,d.name,'Macro')).join('')||'<p class="inspector-note">여러 실행 흐름을 묶을 수 있어요.</p>'}`);
}
function createVariable(){
  const name=$('#variable-name').value.trim(),type=$('#variable-type').value,array=$('#variable-array').checked;if(!name)return notify('변수 이름을 입력하세요.');if(graphs.blueprint.variables.some(v=>v.name===name))return notify('같은 이름의 변수가 있어요.');if(graphs.blueprint.variables.length>=100)return notify('변수 100개까지 편집할 수 있어요.');remember();const v={id:'var_'+crypto.randomUUID().replaceAll('-',''),name,type,container:array?'array':'single',value:array?[]:defaultsFor(type)};graphs.blueprint.variables.push(v);selectedVariable=v.id;$('#variable-dialog').close();renderBlueprintSidebar();changed();
}
function exportBlueprint(){
  $('#blueprint-json').value=JSON.stringify(graphs.blueprint,null,2);$('#blueprint-json-dialog').showModal();
}
function downloadBlueprint(){
  const url=URL.createObjectURL(new Blob([$('#blueprint-json').value],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=graphs.blueprint.name+'.blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('JSON 파일 다운로드를 요청했어요. 이 브라우저에서 지원하지 않으면 복사를 사용하세요.');
}
function applyBlueprintData(data){
  if(!validBlueprint(data))throw Error('노드·변수·내부 그래프·연결 데이터가 유효하지 않아요.');remember();graphs.blueprint=data;graphs.blueprint.functions??=[];graphs.blueprint.macros??=[];graphs.blueprint.construction??=clone(defaultBlueprint.construction);switchBlueprintView('event');changed();notify('검증한 블루프린트 JSON을 적용했어요. Ctrl Z로 되돌릴 수 있어요.');
}
$('#variable-type').innerHTML=Object.entries(variableTypes).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
$('#custom-pin-type').innerHTML=$('#variable-type').innerHTML;
function renderBlueprintInspector(){
  const g=currentGraph(),n=g.nodes.find(n=>n.id===selectedNode);if(!n){$('#inspector-content').innerHTML='<div class="inspector-empty">편집할 노드를 선택하세요.<br>Ctrl/Shift 클릭으로 여러 노드를 선택하고 함수·매크로로 묶을 수 있어요.</div>';return;}
  const spec=catalog.find(s=>s.key===n.key),custom=['customEvent','customFunction','callFunction','callMacro','functionInput','functionOutput','macroInput','macroOutput'].includes(n.key);
  const pins=direction=>effectivePins(n,direction,g).map(p=>`<div class="bp-pin-definition"><span style="background:${typeColors[p.type]||typeColors.any}"></span><strong>${escapeHtml(p.label)}</strong><small>${p.type}${p.array?'[]':''}</small></div>`).join('')||'<p class="inspector-note">이 방향의 핀이 없어요.</p>';
  $('#inspector-content').innerHTML=`<div class="object-identity"><div class="object-identity-icon">${icon('nodes')}</div><div><h3>${escapeHtml(nodeTitle(n,g))}</h3><p>${escapeHtml(spec?.ko||'변수 노드')}</p></div></div><div class="object-tags"><span class="tag">${escapeHtml(spec?.group||'변수')}</span><span class="tag">${escapeHtml(n.key)}</span></div><section class="component-section"><h3>노드 설정</h3><div class="property-row"><label for="edit-node-title">표시 이름</label><input id="edit-node-title" value="${escapeHtml(nodeTitle(n,g))}" maxlength="80" aria-label="노드 표시 이름"></div><p class="inspector-note">ID: ${escapeHtml(n.id)}<br>연결은 이름이 아닌 ID와 핀 ID로 유지돼요.</p></section><section class="component-section"><h3>입력 핀</h3>${pins('in')}</section><section class="component-section"><h3>출력 핀</h3>${pins('out')}${custom?'<button class="bp-add-pin" data-action="new-custom-pin">+ 매개변수·반환값 핀 추가</button>':''}</section><section class="component-section"><h3>편집 안내</h3><p class="inspector-note">노드 우클릭: 묶기·삭제<br>Ctrl/Shift 클릭: 여러 노드 선택<br>Ctrl+휠: 확대·축소<br>핀 우클릭: 연결 끊기·변수 생성<br>벡터·구조체: 핀 분할·합치기<br>클래스 참조: 공개 멤버 읽기 노드<br>출력 핀을 빈 곳으로 드래그하면 타입에 맞는 노드를 검색해요.</p></section><section class="component-section"><h3>실행 미리보기</h3><p class="inspector-note">시작·Tick·Overlap은 기본 이벤트 정의예요. 흐름 테스트는 선택한 이벤트를 한 번 따라가며 실제 충돌이나 게임 코드를 실행하지 않아요.</p></section>`;
}
function freeNodePosition(){const graph=currentGraph();let x=35,y=30;for(let i=0;i<graph.nodes.length+1;i++){const hit=graph.nodes.find(n=>x<n.position.x+200&&x+190>n.position.x&&y<n.position.y+75+Math.max(effectivePins(n,'in',graph).length,effectivePins(n,'out',graph).length)*27&&y+140>n.position.y);if(!hit)break;y=hit.position.y+100+Math.max(effectivePins(hit,'in',graph).length,effectivePins(hit,'out',graph).length)*27;}return {x,y:Math.min(10000,y)};}

let animationTime=0,animationPlaying=false;const positionKeys=[0,.75,1.5,2.25,3],rotationKeys=[0,1.5,3];
function updateAnimation(){const t=animationTime;$('#animation-time').textContent=t.toFixed(2)+' s';$('#timeline-scrubber').value=t;$('#playhead').style.left=(t/3*100)+'%';$('#animated-object').style.transform=`translateY(${-Math.sin(t/3*Math.PI*2)*25}px) rotate(${Math.sin(t/3*Math.PI*2)*7}deg)`;}
function renderKeys(){for(const [id,keys] of [['position-keyframes',positionKeys],['rotation-keyframes',rotationKeys]])$('#'+id).innerHTML=keys.map(t=>`<button class="keyframe" style="left:calc(${t/3*100}% - 4px)" data-key-time="${t}" aria-label="${t.toFixed(2)}초 키프레임"></button>`).join('');}
const codeExample=`#include <HBEngine/Game.hpp>\n\nusing namespace hb;\n\nclass DoorController : public Component {\npublic:\n    HB_PROPERTY()\n    float openAngle = 90.0f;\n\n    HB_NODE("문 열기")\n    void Open() {\n        owner().rotateTo({0, openAngle, 0}, 0.6f);\n        audio().play("door_open.wav");\n    }\n\n    void onStart() override {\n        input().onPressed(Key::E, [this] {\n            if (inventory().has("garden_key")) {\n                Open();\n            }\n        });\n    }\n};\n\n// API와 노드 노출 문법을 검토하는 예시예요.\n// 이 프로토타입에서 C++을 빌드하지 않아요.`;
$('#cpp-code').innerHTML=escapeHtml(codeExample).replace(/(\/\/[^\n]*)|("[^"\n]*")|\b(class|public|float|void|override|if|using|namespace)\b/g,(match,comment,string,keyword)=>`<span class="code-${comment?'comment':string?'string':'keyword'}">${match}</span>`);$('#code-lines').innerHTML=codeExample.split('\n').map((_,i)=>i+1).join('<br>');

const commands=[['장면 편집','scene','Workspace'],['머테리얼 편집','material','Workspace'],['애니메이션 편집','animation','Workspace'],['블루프린트 편집','blueprint','Workspace'],['C++ 코드 예시','code','Workspace'],['큐브 추가','create:cube','Object'],['구 추가','create:sphere','Object'],['광원 추가','create:light','Object'],['에셋 가져오기','import','Assets'],['장면 저장','save','Ctrl S'],['실행 취소','undo','Ctrl Z'],['선택 오브젝트에 초점','focus','F'],['사용 안내','help','Help']];
commands.push(['새 맵 만들기','new-map','World'],['하늘·햇빛·구름 설정','environment','World']);
function renderCommands(){const query=$('#command-input').value.toLowerCase();$('#command-results').innerHTML=commands.filter(c=>c[0].toLowerCase().includes(query)||c[2].toLowerCase().includes(query)).map(c=>`<button class="command-result" data-command="${c[1]}">${c[0]}<span>${c[2]}</span></button>`).join('')||'<p class="inspector-note" style="padding:12px">일치하는 명령이 없어요.</p>';}
function openMenu(button,items){const menu=$('#floating-menu');menu.innerHTML=items.map(item=>item?`<button ${item[2]||''} data-menu-command="${item[1]}">${item[0]}${item[3]?`<kbd>${item[3]}</kbd>`:''}</button>`:'<div class="menu-separator"></div>').join('');menu.hidden=false;const rect=button.getBoundingClientRect();menu.style.left=Math.min(rect.left,innerWidth-menu.offsetWidth-10)+'px';menu.style.top=Math.min(rect.bottom+5,innerHeight-menu.offsetHeight-10)+'px';}
function executeCommand(command){if(['scene','material','animation','blueprint','code'].includes(command))setWorkspace(command);else if(command.startsWith('create:'))createObject(command.split(':')[1]);else doAction(command);}
function doAction(action,button){
  if(action.startsWith('bp:'))return blueprintContextAction(action);
  switch(action){
    case 'blueprint-back':switchBlueprintView('event');break;
    case 'collapse-function':openCollapse('function');break;case 'collapse-macro':openCollapse('macro');break;case 'confirm-collapse':confirmCollapse();break;
    case 'zoom-in':setGraphZoom(blueprintZoom+.1);break;case 'zoom-out':setGraphZoom(blueprintZoom-.1);break;case 'zoom-reset':setGraphZoom(1);break;
    case 'zoom-fit':{const c=$('#blueprint-graph'),nodes=$$('.bp-node',c),width=Math.max(1,...nodes.map(n=>n.offsetLeft+n.offsetWidth+30)),height=Math.max(1,...nodes.map(n=>n.offsetTop+n.offsetHeight+30));setGraphZoom(Math.min(c.clientWidth/width,c.clientHeight/height,1));c.scrollTo(0,0);break;}
    case 'save':save();break;case 'undo':undo();break;case 'play':startPlay();break;case 'pause':paused=!paused;updatePlayButtons();break;case 'stop':stopPlay();break;
    case 'focus':if(workspace==='blueprint')doAction('zoom-fit');else focusObject();break;case 'grid':if(grid){grid.visible=!grid.visible;$('#grid-button').setAttribute('aria-pressed',String(grid.visible));}break;
    case 'environment':setWorkspace('scene');$('#environment-panel').hidden=!$('#environment-panel').hidden;$('.environment-button').setAttribute('aria-expanded',String(!$('#environment-panel').hidden));break;
    case 'new-map':$('#new-map-dialog').showModal();break;case 'cancel-new-map':$('#new-map-dialog').close();break;case 'create-map':createMap();break;
    case 'lighting':$('#lighting-section')?.scrollIntoView({block:'nearest',behavior:'smooth'});$('#light-intensity')?.focus();break;
    case 'open-material':setWorkspace('material');break;case 'open-blueprint':setWorkspace('blueprint');break;case 'open-code':setWorkspace('code');break;
    case 'import':$('#import-dialog').showModal();break;case 'choose-files':$('#file-input').click();break;
    case 'demo-import':queueFiles([{name:'Character.fbx',size:2516582,demo:true},{name:'Stone_albedo.jpg',size:522000,demo:true},{name:'Intro.avi',size:12500000,demo:true}]);break;
    case 'confirm-import':confirmImport();break;case 'asset-size':$('#asset-grid').classList.toggle('large');break;
    case 'command':$('#command-dialog').showModal();$('#command-input').value='';renderCommands();$('#command-input').focus();break;
    case 'help':$('#help-dialog').showModal();break;case 'close-help':$('#help-dialog').close();break;
    case 'reset-prototype':remember();objects=clone(defaultObjects);surface=clone(defaultSurface);environment=clone(defaultEnvironment);sceneName='Garden';rebuildWorld();renderHierarchy();renderInspector();updateSurface();applyEnvironment();changed();$('#help-dialog').close();notify('초기 장면으로 복원했어요. Ctrl Z로 되돌릴 수 있어요.');break;
    case 'clear-console':logs=[];$('#console-logs').innerHTML='';$('#log-count').textContent='0';break;
    case 'animation-play':animationPlaying=!animationPlaying;$('#animation-play').innerHTML=icon(animationPlaying?'pause':'play');break;
    case 'animation-reset':animationTime=0;animationPlaying=false;$('#animation-play').innerHTML=icon('play');updateAnimation();break;
    case 'keyframe':if(!positionKeys.some(t=>Math.abs(t-animationTime)<.015)){positionKeys.push(+animationTime.toFixed(2));renderKeys();notify(animationTime.toFixed(2)+'초에 위치 키프레임을 추가했어요.');}else notify('현재 위치에 키프레임이 있어요.');break;
    case 'run-blueprint':traceBlueprint();break;
    case 'add-material-node':graphs.material.nodes.push({id:'value-'+(++nodeCounter),title:'상수 값',kind:'value',x:.35,y:130,caption:'0.50',output:'값'});renderGraph('material');notify('상수 노드를 추가했어요. 값 계산은 UI 예시예요.');break;
    case 'add-blueprint-node':{const rect=$('#blueprint-graph').getBoundingClientRect();openNodePalette(rect.left+35,rect.top+40);palettePosition=freeNodePosition();break;}
    case 'new-custom-pin':{const n=currentGraph().nodes.find(n=>n.id===selectedNode);$('#custom-pin-direction').value=n?.key.endsWith('Input')?'in':'out';$('#custom-pin-direction').disabled=n?.key==='customEvent';$('#pin-dialog').showModal();break;}
    case 'create-custom-pin':{const n=currentGraph().nodes.find(n=>n.id===selectedNode),label=$('#custom-pin-name').value.trim(),direction=$('#custom-pin-direction').value,type=$('#custom-pin-type').value,array=$('#custom-pin-array').checked;if(!n)return;if(!label)return notify('핀 이름을 입력하세요.');const definition=[...graphs.blueprint.functions,...graphs.blueprint.macros].find(d=>d.id===n.definitionId),target=definition||n,key=definition?(direction==='out'?'outputs':'inputs'):(direction==='out'?'customOutputs':'customInputs');if(!definition&&!['customEvent','customFunction'].includes(n.key))return;if((target[key]||[]).length>=(definition?30:20))return notify('사용자 핀 개수 제한에 도달했어요.');remember();target[key]??=[];target[key].push({id:'pin_'+crypto.randomUUID().replaceAll('-',''),label,type,array});$('#pin-dialog').close();renderBlueprintGraph();renderBlueprintInspector();changed();break;}
    case 'new-variable':$('#variable-dialog').showModal();$('#variable-name').focus();break;case 'create-variable':createVariable();break;
    case 'new-component':$('#component-dialog').showModal();break;
    case 'create-component':{const name=$('#component-name').value.trim();if(!name)return notify('컴포넌트 이름을 입력하세요.');if(graphs.blueprint.components.length>=100)return notify('컴포넌트 100개까지 등록할 수 있어요.');remember();graphs.blueprint.components.push({id:'component_'+crypto.randomUUID().replaceAll('-',''),name,type:$('#component-type').value});$('#component-dialog').close();renderBlueprintSidebar();changed();notify('컴포넌트를 편집 데이터에 등록했어요. 네이티브 동작은 아직 없어요.');break;}
    case 'add-array-element':{const v=graphs.blueprint.variables.find(v=>v.id===selectedVariable);if(v&&v.value.length<128){remember();v.value.push(defaultsFor(v.type));renderBlueprintSidebar();changed();}break;}
    case 'export-blueprint':exportBlueprint();break;
    case 'download-blueprint-json':downloadBlueprint();break;
    case 'copy-blueprint-json':navigator.clipboard?.writeText($('#blueprint-json').value).then(()=>notify('블루프린트 JSON을 복사했어요.')).catch(()=>notify('복사 권한이 없어요. JSON 텍스트를 직접 선택해 복사하세요.'));break;
    case 'apply-blueprint-json':try{if($('#blueprint-json').value.length>1024*1024)throw Error('JSON은 1 MB 이하여야 해요.');applyBlueprintData(JSON.parse($('#blueprint-json').value));$('#blueprint-json-dialog').close();}catch(error){notify('적용 실패: '+error.message);}break;case 'import-blueprint':$('#blueprint-file-input').click();break;
    case 'copy-code':navigator.clipboard?.writeText(codeExample).then(()=>notify('C++ 예시를 복사했어요.')).catch(()=>notify('이 브라우저에서 클립보드에 접근할 수 없어요.'));break;
    case 'add-component':setWorkspace('blueprint');$('#component-dialog').showModal();break;
    case 'file-menu':openMenu(button,[['새 맵 만들기','new-map'],['에셋 가져오기','import'],['장면 저장','save','', 'Ctrl S'],null,['사용 안내','help']]);break;
    case 'edit-menu':openMenu(button,[['실행 취소','undo','', 'Ctrl Z'],['명령 검색','command','', 'Ctrl K']]);break;
    case 'add-menu':openMenu(button,[['큐브','create:cube'],['구','create:sphere'],['원기둥','create:cylinder'],['평면','create:plane'],null,['점 광원','create:light']]);break;
    case 'view-menu':openMenu(button,[['장면','scene'],['머테리얼','material'],['애니메이션','animation'],['블루프린트','blueprint'],['C++ 코드 예시','code']]);break;
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b){if(!e.target.closest('#floating-menu'))$('#floating-menu').hidden=true;return;}
  if(b.dataset.workspace)setWorkspace(b.dataset.workspace);else if(b.dataset.select)selectObject(b.dataset.select);else if(b.dataset.create)createObject(b.dataset.create);else if(b.dataset.view)setView(b.dataset.view);else if(b.dataset.tool){if(transform){transform.setMode({move:'translate',rotate:'rotate',scale:'scale'}[b.dataset.tool]);$$('[data-tool]').forEach(t=>t.classList.toggle('active',t===b));}}
  else if(b.dataset.bottom){$$('[data-bottom]').forEach(t=>t.classList.toggle('active',t===b));$('#assets-content').hidden=b.dataset.bottom!=='assets';$('#console-content').hidden=b.dataset.bottom!=='console';}
  else if(b.dataset.filter){currentFilter=b.dataset.filter;$$('[data-filter]').forEach(t=>t.classList.toggle('active',t===b));renderAssets();}
  else if(b.dataset.asset!==undefined)openAsset(Number(b.dataset.asset));else if(b.dataset.preset)preset(b.dataset.preset);else if(b.dataset.pin)connectPin(b);else if(b.dataset.keyTime){animationTime=Number(b.dataset.keyTime);updateAnimation();}
  else if(b.dataset.removeFile!==undefined){pendingFiles.splice(Number(b.dataset.removeFile),1);renderImportQueue();}
  else if(b.dataset.command){$('#command-dialog').close();executeCommand(b.dataset.command);}
  else if(b.dataset.menuCommand){$('#floating-menu').hidden=true;executeCommand(b.dataset.menuCommand);}
  else if(b.dataset.action)doAction(b.dataset.action,b);
  if(!b.closest('#floating-menu')&&!['file-menu','edit-menu','add-menu','view-menu','add-component'].includes(b.dataset.action))$('#floating-menu').hidden=true;
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(b?.dataset.spawnNode)spawnBlueprintNode(b.dataset.spawnNode,b.dataset.variableId,b.dataset.definitionId);
  else if(b?.dataset.graphView){switchBlueprintView(b.dataset.graphView);}
  else if(b?.dataset.selectVariable){selectedVariable=b.dataset.selectVariable;renderBlueprintSidebar();}
  else if(b?.dataset.variableNode){const c=$('#blueprint-graph');palettePosition=freeNodePosition();spawnBlueprintNode(b.dataset.variableNode,b.dataset.variableId);}
  else if(b?.dataset.removeArray!==undefined){const v=graphs.blueprint.variables.find(v=>v.id===selectedVariable);remember();v.value.splice(Number(b.dataset.removeArray),1);renderBlueprintSidebar();changed();}
  if(!e.target.closest('#node-palette')&&!e.target.closest('[data-action="add-blueprint-node"]')&&!e.target.closest('#blueprint-graph .pin'))$('#node-palette').hidden=true;
});
function blueprintContextAction(action){
  const [,operation,id,direction,pinId]=action.split(':');const graph=currentGraph(),node=graph.nodes.find(n=>n.id===id);if(!node)return;
  if(operation==='delete'){const ids=selectedNodes.has(id)?selectedNodes:new Set([id]);if(graph.nodes.some(n=>ids.has(n.id)&&(n.key.endsWith('Input')||n.key.endsWith('Output')||n.key==='construction')))return notify('Entry·Return·Construction 노드는 그래프의 인터페이스라 삭제할 수 없어요.');remember();graph.nodes=graph.nodes.filter(n=>!ids.has(n.id));graph.edges=graph.edges.filter(e=>!ids.has(e.from.node)&&!ids.has(e.to.node));pendingPin=null;selectedNodes.clear();selectedNode=null;renderBlueprintGraph();renderBlueprintInspector();changed();return;}
  if(operation==='disconnect'){remember();graph.edges=graph.edges.filter(e=>!((direction==='out'?e.from:e.to).node===id&&(direction==='out'?e.from:e.to).pin===pinId));renderBlueprintGraph();changed();return;}
  if(operation==='split'||operation==='recombine'){remember();splitPin(graph,id,direction,pinId,operation==='recombine');pendingPin=null;renderBlueprintGraph();changed();notify(operation==='split'?'핀을 필드별로 나눴어요. 해당 핀의 기존 연결은 다시 연결하세요.':'필드를 하나의 핀으로 합쳤어요.');return;}
  const p=effectivePins(node,direction,graph).find(p=>p.id===pinId);
  if(operation==='members'&&p?.type==='object'){pendingPin={name:'blueprint',id,pin:pinId};palettePosition={x:node.position.x+230,y:node.position.y};spawnBlueprintNode('members');return;}
  if(operation==='promote'&&p&&p.type!=='exec'&&p.type!=='any'){remember();const baseName=p.label.replace(/\s+/g,'')||'Value';let name=baseName,counter=1;while(graph.variables.some(v=>v.name===name))name=baseName+(counter++);const v={id:'var_'+crypto.randomUUID().replaceAll('-',''),name,type:p.type,container:p.array?'array':'single',value:p.array?[]:defaultsFor(p.type)};graph.variables.push(v);selectedVariable=v.id;renderBlueprintSidebar();changed();notify('핀의 자료형으로 변수를 만들었어요.');}
}
$('#blueprint-graph').addEventListener('contextmenu',e=>{
  e.preventDefault();$('#floating-menu').hidden=true;const button=e.target.closest('.pin'),nodeElement=e.target.closest('.bp-node'),graph=currentGraph();
  if(button){const id=button.dataset.nodeId,direction=button.dataset.pin,pinId=button.dataset.pinId,node=graph.nodes.find(n=>n.id===id),p=effectivePins(node,direction,graph).find(p=>p.id===pinId);let items=[];
    if(p&&!p.array&&fieldsFor(p.type).length)items.push(['핀 분할 · Split struct pin',`bp:split:${id}:${direction}:${pinId}`]);
    if(p?.parent)items.push(['핀 합치기 · Recombine',`bp:recombine:${id}:${direction}:${p.parent}`]);
    if(direction==='out'&&p?.type==='object'&&!p.array)items.push(['공개 멤버 읽기 · Get members',`bp:members:${id}:${direction}:${pinId}`]);
    if(p?.type!=='exec'&&p?.type!=='any')items.push(['변수로 만들기 · Promote',`bp:promote:${id}:${direction}:${pinId}`]);
    items.push(['연결 끊기 · Break links',`bp:disconnect:${id}:${direction}:${pinId}`]);openMenu(button,items);return;
  }
  if(nodeElement){if(!selectedNodes.has(nodeElement.dataset.node)){selectedNodes=new Set([nodeElement.dataset.node]);selectedNode=nodeElement.dataset.node;$$('.bp-node').forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));updateGraphHeading();renderBlueprintInspector();}openMenu($('.node-title',nodeElement),[['함수로 묶기 · Collapse to function','collapse-function'],['매크로로 묶기 · Collapse to macro','collapse-macro'],['선택 노드 삭제 · Delete',`bp:delete:${nodeElement.dataset.node}`]]);return;}
  openNodePalette(e.clientX,e.clientY);
});
$('#blueprint-graph').addEventListener('pointerdown',e=>{
  const source=e.target.closest('.pin.out');if(!source||e.button!==0)return;const startX=e.clientX,startY=e.clientY;let dragged=false;connectBlueprintPin(source);
  const move=ev=>{if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<5)return;dragged=true;const c=$('#blueprint-graph'),rect=c.getBoundingClientRect(),a=source.getBoundingClientRect(),x1=(a.left+a.width/2-rect.left+c.scrollLeft)/blueprintZoom,y1=(a.top+a.height/2-rect.top+c.scrollTop)/blueprintZoom,x2=(ev.clientX-rect.left+c.scrollLeft)/blueprintZoom,y2=(ev.clientY-rect.top+c.scrollTop)/blueprintZoom;$('#pending-wire')?.remove();$('.node-wires',c).insertAdjacentHTML('beforeend',`<path id="pending-wire" d="M${x1} ${y1} C${x1+60} ${y1},${x2-60} ${y2},${x2} ${y2}" fill="none" stroke="${typeColors.any}" stroke-width="2"/>`);};
  const up=ev=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);$('#pending-wire')?.remove();if(!dragged)return;const stopClick=event=>{event.stopImmediatePropagation();event.preventDefault();};document.addEventListener('click',stopClick,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',stopClick,true),250);const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.pin.in');if(target)connectBlueprintPin(target);else openNodePalette(ev.clientX,ev.clientY);};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
});
$('#blueprint-graph').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setGraphZoom(blueprintZoom*Math.exp(-e.deltaY*.002),e.clientX,e.clientY);}},{passive:false});
$('#scene-canvas').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault();},{passive:false});
$('#blueprint-graph').addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.bp-node'))return;const c=e.currentTarget,rect=c.getBoundingClientRect(),start={x:(e.clientX-rect.left+c.scrollLeft)/blueprintZoom,y:(e.clientY-rect.top+c.scrollTop)/blueprintZoom},original=e.ctrlKey||e.shiftKey?new Set(selectedNodes):new Set();
  const box=document.createElement('div');box.className='graph-selection';$('.graph-nodes',c).append(box);c.setPointerCapture(e.pointerId);
  const move=ev=>{const x=(ev.clientX-rect.left+c.scrollLeft)/blueprintZoom,y=(ev.clientY-rect.top+c.scrollTop)/blueprintZoom,left=Math.min(start.x,x),top=Math.min(start.y,y),right=Math.max(start.x,x),bottom=Math.max(start.y,y);Object.assign(box.style,{left:left+'px',top:top+'px',width:right-left+'px',height:bottom-top+'px'});selectedNodes=new Set(original);$$('.bp-node',c).forEach(el=>{if(el.offsetLeft<right&&el.offsetLeft+el.offsetWidth>left&&el.offsetTop<bottom&&el.offsetTop+el.offsetHeight>top)selectedNodes.add(el.dataset.node);el.classList.toggle('selected',selectedNodes.has(el.dataset.node));});selectedNode=[...selectedNodes][0]||null;updateGraphHeading();};
  const up=ev=>{if(Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)<4){selectedNodes=original;selectedNode=[...selectedNodes][0]||null;$$('.bp-node',c).forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));updateGraphHeading();}box.remove();c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);renderBlueprintInspector();};c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
});
$('#node-search').addEventListener('input',renderPalette);$('#context-sensitive').addEventListener('change',renderPalette);
$('#node-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#palette-results .palette-result')?.click();}});
function pruneVariableLinks(){for(const g of allGraphContexts(graphs.blueprint))g.edges=g.edges.filter(e=>canConnect({...g,edges:g.edges.filter(x=>x!==e)},e.from,e.to).ok);pendingPin=null;renderBlueprintGraph();}
document.addEventListener('change',e=>{
  const v=graphs.blueprint.variables.find(v=>v.id===selectedVariable),el=e.target;if(!v)return;
  if(el.id==='edit-variable-type'){remember();v.type=el.value;v.value=v.container==='array'?[]:defaultsFor(v.type);allGraphContexts(graphs.blueprint).forEach(g=>g.nodes.filter(n=>n.variableId===v.id).forEach(n=>n.splitPins=[]));pruneVariableLinks();renderBlueprintSidebar();changed();}
  else if(el.id==='edit-variable-array'){remember();if(el.checked){v.container='array';v.value=[v.value];}else{v.container='single';v.value=v.value[0]??defaultsFor(v.type);}allGraphContexts(graphs.blueprint).forEach(g=>g.nodes.filter(n=>n.variableId===v.id).forEach(n=>n.splitPins=[]));pruneVariableLinks();renderBlueprintSidebar();changed();}
  else if(el.id==='edit-variable-name'){const name=el.value.trim();if(!name||graphs.blueprint.variables.some(x=>x.id!==v.id&&x.name===name)){renderBlueprintSidebar();return notify('변수 이름은 비어 있거나 중복될 수 없어요.');}remember();v.name=name;renderBlueprintSidebar();renderBlueprintGraph();changed();}
  else if(el.dataset.variableValue){updateVariableValue(el);}
});
document.addEventListener('change',e=>{if(e.target.id==='edit-node-title'){const node=currentGraph().nodes.find(n=>n.id===selectedNode),title=e.target.value.trim();if(!node||!title)return;remember();node.title=title;renderBlueprintGraph();renderBlueprintInspector();changed();}});
function updateVariableValue(el){
  const v=graphs.blueprint.variables.find(v=>v.id===el.dataset.variableValue),index=Number(el.dataset.valueIndex);if(!v)return;let value;
  try{if(el.dataset.vectorAxis!==undefined){value=clone(index<0?v.value:v.value[index]);if(el.value==='')return;value[Number(el.dataset.vectorAxis)]=Number(el.value);}
    else if(v.type==='bool')value=el.checked;else if(['int','float'].includes(v.type)){if(el.value==='')return;value=Number(el.value);}else if(v.type==='string')value=el.value;else value=JSON.parse(el.value);
    if(!validValue(v.type,value))throw Error();remember();if(index<0)v.value=value;else v.value[index]=value;changed();
  }catch{notify('이 자료형에 맞는 기본값을 입력하세요. 구조체는 JSON을 사용해요.');renderBlueprintSidebar();}
}
document.addEventListener('input',e=>{if(e.target.dataset.variableValue&&['number','text'].includes(e.target.type)){const v=graphs.blueprint.variables.find(v=>v.id===e.target.dataset.variableValue);if(v&&['int','float','string','vec2','vec3','color'].includes(v.type))updateVariableValue(e.target);}});
$('#blueprint-file-input').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('파일은 1 MB 이하여야 해요.');applyBlueprintData(JSON.parse(await file.text()));}catch(error){notify('불러오기 실패: '+error.message);}finally{e.target.value='';}});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.environment){const key=el.dataset.environment;if(el.type==='range')return;remember();environment[key]=el.type==='checkbox'?el.checked:el.value;if(key==='preset'){surface.light=skyPresets[environment.preset].light;environment.sunElevation=skyPresets[environment.preset].elevation;updateSurface();}if(key==='sunEnabled'&&el.checked&&!objects.some(o=>o.id==='sun-light')){const o=clone(defaultObjects.find(o=>o.id==='sun-light'));objects.push(o);if(scene)buildObject(o);renderHierarchy();}applyEnvironment();renderInspector();changed();}
  else if(el.dataset.transform){const n=Number(el.value);if(el.value===''||!Number.isFinite(n)||Math.abs(n)>10000||(el.dataset.transform==='scale'&&n<.01)){renderInspector();return notify('유효한 범위의 숫자를 입력하세요. 크기는 0.01 이상이에요.');}}
  else if(el.id==='object-visible'){remember();const o=objects.find(o=>o.id===selected);o.visible=el.checked;applyObject(o);selectObject(selected);changed();}
  else if(el.id==='shadow-toggle'&&sun){sun.castShadow=el.checked;mainRenderer.shadowMap.needsUpdate=true;notify(el.checked?'그림자를 켰어요.':'그림자를 껐어요.');}
  else if(el.id==='snap-toggle'&&transform){transform.setTranslationSnap(el.checked?.5:null);transform.setRotationSnap(el.checked?Math.PI/12:null);transform.setScaleSnap(el.checked?.1:null);}
});
document.addEventListener('pointerdown',e=>{if(e.target.dataset.surface||(e.target.dataset.environment&&e.target.type==='range'))remember();});
document.addEventListener('focusin',e=>{if(e.target.dataset.transform||(e.target.dataset.surface&&e.target.type==='color'))remember();});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.environment&&el.type==='range'){environment[el.dataset.environment]=Number(el.value);applyEnvironment();if(selected==='sun-light')renderInspector();changed();}else if(el.dataset.transform){const o=objects.find(o=>o.id===selected),n=Number(el.value);if(running||!o||el.value===''||!Number.isFinite(n)||Math.abs(n)>10000||(el.dataset.transform==='scale'&&n<.01))return;o[el.dataset.transform][Number(el.dataset.axis)]=n;applyObject(o);selectionBox?.update();changed();}else if(el.dataset.surface){const key=el.dataset.surface;surface[key]=key==='color'?el.value:Number(el.value);updateSurface();changed();}else if(el.id==='hierarchy-search')renderHierarchy();else if(el.id==='asset-search')renderAssets();else if(el.id==='command-input')renderCommands();else if(el.id==='timeline-scrubber'){animationTime=Number(el.value);updateAnimation();}});
$('#file-input').addEventListener('change',e=>queueFiles([...e.target.files]));
for(const zone of [$('#assets-content'),$('#file-drop-zone')]){zone.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();zone.classList.add('drag-over');}});zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('drag-over');});zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files.length)queueFiles([...e.dataTransfer.files]);});}
$('#asset-grid').addEventListener('dragstart',e=>{const card=e.target.closest('[data-asset]');if(card)e.dataTransfer.setData('text/x-hbengine-asset',card.dataset.asset);});
$('#scene-canvas-container').addEventListener('dragover',e=>e.preventDefault());$('#scene-canvas-container').addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files.length)return queueFiles([...e.dataTransfer.files]);const index=e.dataTransfer.getData('text/x-hbengine-asset');if(index==='')return;const a=assets[Number(index)];if(a?.object){selectObject(a.object);notify(a.name+' 오브젝트를 선택했어요. 이 에셋은 이미 장면에 있어요.');}else if(a?.kind==='material'){setWorkspace('material');notify('머테리얼 편집으로 이동했어요.');}else notify('이 파일은 에셋 목록 미리보기로만 제공돼요.');});
document.addEventListener('keydown',e=>{
  const editing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName),dialog=$$('dialog').some(d=>d.open);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!dialog)doAction('command');}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!editing&&!dialog){e.preventDefault();undo();}
  else if((e.ctrlKey||e.metaKey)&&workspace==='blueprint'&&!editing&&!dialog&&['+','=','-','0','a'].includes(e.key.toLowerCase())){e.preventDefault();if(e.key.toLowerCase()==='a'){selectedNodes=new Set(currentGraph().nodes.map(n=>n.id));renderBlueprintGraph();}else setGraphZoom(e.key==='0'?1:blueprintZoom+(e.key==='-'?-.1:.1));}
  else if(e.key==='Escape'){pendingPin=null;$$('.pin.pending').forEach(p=>p.classList.remove('pending'));$('#floating-menu').hidden=true;$('#node-palette').hidden=true;$('#environment-panel').hidden=true;$('.environment-button').setAttribute('aria-expanded','false');if(running)stopPlay();}
  else if(!editing&&!dialog){if(workspace==='blueprint'&&e.key==='Delete'&&selectedNode)doAction('bp:delete:'+selectedNode);if(e.key.toLowerCase()==='f')doAction('focus');if('wer'.includes(e.key.toLowerCase())&&e.key.length===1){const tool={w:'move',e:'rotate',r:'scale'}[e.key.toLowerCase()];$(`[data-tool="${tool}"]`)?.click();}}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)));
let previous=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.1);previous=now;
  if(workspace==='scene'&&mainRenderer&&scene){orbit?.update();if(running&&!paused){playTime+=dt;const g=meshMap.get('floating-crystal'),o=objects.find(o=>o.id==='floating-crystal');if(g&&o){g.position.y=o.position[1]+Math.sin(playTime*1.6)*.22;g.rotation.y=THREE.MathUtils.degToRad(o.rotation[1])+playTime*.25;}}if(selectionBox?.visible)selectionBox.update();mainRenderer.render(scene,activeCamera);}
  if(workspace==='material'&&previewRenderer){previewSphere.rotation.y+=dt*.09;previewRenderer.render(previewScene,previewCamera);}
  if(workspace==='animation'&&animationPlaying){animationTime=(animationTime+dt*Number($('#animation-speed').value))%3;updateAnimation();}
}
const layout=$('.editor-grid');
layout.insertAdjacentHTML('beforeend','<button class="resize-grip" data-resize="left" aria-label="장면 구조 패널 폭 조절"></button><button class="resize-grip" data-resize="right" aria-label="속성 패널 폭 조절"></button><button class="resize-grip" data-resize="bottom" aria-label="에셋 패널 높이 조절"></button>');
function resizePanel(type,delta){
  const vars={left:['--left-panel','.hierarchy',150,300],right:['--right-panel','.inspector',215,360],bottom:['--assets-panel','.asset-panel',160,Math.max(160,layout.clientHeight-230)]};
  const [variable,selector,min,max]=vars[type],rect=$(selector).getBoundingClientRect();
  layout.style.setProperty(variable,Math.min(max,Math.max(min,(type==='bottom'?rect.height:rect.width)+delta))+'px');
}
$$('[data-resize]').forEach(handle=>{
  handle.addEventListener('pointerdown',e=>{handle.setPointerCapture(e.pointerId);const type=handle.dataset.resize;let previous=type==='bottom'?e.clientY:e.clientX;
    const move=ev=>{const current=type==='bottom'?ev.clientY:ev.clientX;resizePanel(type,(current-previous)*(type==='left'?1:-1));previous=current;};
    const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
  });
  handle.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();resizePanel(handle.dataset.resize,['ArrowRight','ArrowUp'].includes(e.key)?10:-10);}});
});
renderHierarchy();renderAssets();renderInspector();renderGraph('material');renderGraph('blueprint');renderKeys();updateAnimation();renderCommands();initRendering();updateSurface();
if(lastSaved)$('#save-status').textContent='로컬 저장 장면을 불러왔어요';
log('HBEngine 편집기 UI 프로토타입을 열었어요.');
log('모델·영상 변환과 C++ 빌드는 UI 시뮬레이션으로 표시해요.');
requestAnimationFrame(animate);
