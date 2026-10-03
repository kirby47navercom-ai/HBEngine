import {CollisionPreview} from './collision-preview.js';
import {placementCatalog,createPlacedObject} from './placement-catalog.js';
import {session,storageKey,storage,flushStorage} from './project-session.js';
import {connectAutomation,documentRevision,patchAsset} from './automation.js';
import {AssetDocuments,assetTypes,assetSuffix,assetTitle,materialGraph,createAsset,validAsset,evaluateMaterial} from './asset-documents.js';
import {blueprintClasses} from './class-types.js';
import {renderDataEditor,closeChoice} from './asset-editor-ui.js';
import {RuntimeProfiler,ProfilerPanel} from './profiler.js';
import {ReferenceViewer} from './reference-viewer.js';
import {WidgetEditor} from './ui-editor.js';
import {addWidget,removeWidget,duplicateWidget,reparentWidget} from './ui-assets.js';
import {AudioMixerEditor} from './audio-editor.js';
import {icon,assetIcon} from './icons.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STORAGE_KEY, defaultObjects, defaultSurface, defaultEnvironment,defaultRuntimeSettings,validRuntimeSettings,validSurface, clone, validScene, fileKind } from './model.js';
import {componentDefinitions,objectComponents,addSceneComponent,defaultsForObject,validComponents,validComponentProperties} from './scene-components.js';
import {preparePlayWorld,resolvePlayAsset} from './play-world.js';
import {componentInspector,componentPicker} from './scene-inspector.js';
import {hierarchyMarkup,sceneRows,copySceneObjects,pasteSceneObjects,removeSceneObjects,validParent,NavigationHistory,selectionMatrices,transformSceneSelection} from './scene-editor.js';
import {conversionFor,planConnection,connectAutomatic,dropVariable} from './blueprint-connections.js';
import { catalog, variableTypes, typeColors, defaultBlueprint, defaultsFor, defaultInputValue, validValue, fieldsFor, effectivePins, basePins, canConnect, connect, splitPin, makeNode, nodeTitle, validBlueprint, graphContext, allGraphContexts, collapseNodes, makeDefinition, makeComment, pasteNodes, validTimeline, sampleTimeline } from './blueprint-model.js';

import { detailsMarkup, componentDefaults } from './blueprint-details.js';
import {parseNativeHeader,nativeExample,nativeEntries,nativeMember,nativeWorld} from './native-model.js';
import {createCorePreview,evaluateCoreNode} from './core-preview.js';
import {DockLayout,restoreLayout,validLayout,defaultDockRatio} from './dock-layout.js';
import {TimelineEditor} from './timeline-editor.js';
import {BlueprintRuntime} from './blueprint-runtime.js';
import {ProjectBrowser,savedBrowserIds,editorRequest,fileUrl,droppedFiles} from './project-browser.js';
import {loadModel,engineOperations} from './engine-services.js';
import {sceneRendering} from './scene-rendering.js';
import {MaterialEditor} from './material-editor.js';
import {materialPresets,makeMaterialPreset,createThreeMaterial,resolveMaterialAsset,materialDefaults,validMaterialSurface} from './material-runtime.js';
import {renderTwoDEditor} from './two-d-editor.js';
import {GameplayEditor} from './gameplay-editor.js';
import {gameplayTypes} from './gameplay-assets.js';
import {make2DScene} from './scene-templates.js';
const profiler=new RuntimeProfiler();let activeProfileFrame=null;
let dock,project,runtime,runtimeServices,editWorld,nativeBuild,runtimeFrame,focusedWindow='scene';let activeScenePath=session.startupScene,activeBlueprintPath=session.startupBlueprint,codeHeaderPath='Source/DoorController.h',codeSourcePath='Source/DoorController.cpp';const documents=new Map();const assetDocs=new AssetDocuments();let switchingDocument=false;const assetPanes=new Map();const extraViewports=[];const timelineWindows=new Map();

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const previewText=value=>JSON.stringify(value,(_key,v)=>typeof v==='number'?Number(v.toPrecision(7)):v);
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function icons(root = document) { $$('[data-icon]', root).forEach(el => { if (!el.querySelector(':scope > svg')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); }); $$('button[aria-label]',root).forEach(el=>{if(!el.title)el.title=el.getAttribute('aria-label');}); }
icons();
$('#material-template').innerHTML='<option value="">그래프 템플릿</option>'+Object.entries(materialPresets).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('');
$('#material-template').onchange=e=>{if(!e.target.value||assetDocs.current?.kind!=='material')return;remember();const preset=makeMaterialPreset(e.target.value);Object.assign(assetDocs.current.data,preset);graphs.material=preset.graph;e.target.value='';renderGraph('material');materialEditor.fit();updateSurface();renderAssetInspector();changed();};
$('#component-type').innerHTML='<option value="CustomComponent">사용자 C++ 컴포넌트</option>'+Object.entries(componentDefinitions).filter(([type])=>type!=='Transform').map(([type,definition])=>'<option value="'+type+'">'+escapeHtml(definition.label)+'</option>').join('');
document.title=session.name+' — HBEngine';
const projectTitle=$('.project-title'),projectName=document.createElement('span');projectName.textContent=session.name;projectName.title=session.projectFile;for(const child of [...projectTitle.childNodes])if(child.nodeType===Node.TEXT_NODE)child.remove();projectTitle.insertBefore(projectName,projectTitle.querySelector('.divider'));

let objects = session.legacyStorage?clone(defaultObjects):[], surface = clone(defaultSurface), selected = 'stone-arch', workspace = 'scene', dirty = false;
let environment = clone(defaultEnvironment), sceneName = assetTitle(activeScenePath), skyDome, cloudGroup, ambientLight, groundFloor;
let runtimeSettings=clone(defaultRuntimeSettings),sceneClipboard,componentClipboard,sceneSelection=new Set(),sceneAnchor=null,navigatingScene=false;const collapsedObjects=new Set(),sceneNavigation=new NavigationHistory(),projectBrowsers=new Map();
let savedBlueprint, selectedVariable='targetPosition', selectedNode='begin', palettePosition={x:60,y:60};
let blueprintView='event', blueprintZoom=1, blueprintPan={x:30,y:30}, selectedNodes=new Set(['begin']), collapseKind='function', creatingDefinition=false;
const quickNodeKeys={b:'branch',d:'delay',s:'sequence',g:'gate',f:'forEach',m:'multiGate',n:'doN',o:'doOnce',p:'beginPlay'};let heldNodeKey=null;
let selectedDetail={kind:'blueprint'}, lastGraphPointer={x:40,y:40}, graphPanActive=false;
let running = false, paused = false, history = [], future = [], pendingFiles = [], importing = false, logs = [], lastSaved = '';
let collisionPreview,showCollisionBounds=false,gridVisible=true;
let mainRenderer, scene, camera, orthoCamera, orbit, transform, grid, sun, selectionBox, previewRenderer, previewScene, previewCamera, previewSphere;
let transformPivot,transformSelectionStart,transformPivotStart;
let activeCamera, viewMode = '3d', toastTimer, transformBefore, playTime = 0, importCounter = 0;
const meshMap = new Map(), objectUrls = [];
const readAsset=async path=>clone(assetDocs.items.get(path)?.data||await(await editorRequest(fileUrl(path))).json());
const visuals=sceneRendering({read:readAsset,fileUrl,loadModel,current:id=>meshMap.get(id),all:()=>[...meshMap.values()],error:message=>log(String(message),'ERROR')});
let materialEditor,previewMaterialSignature='',renderGameView=true;
const corePreview=createCorePreview();
corePreview.object=id=>objects.find(o=>o.id===(id==='self'?selected:id));
corePreview.updateObject=o=>{applyObject(o);changed();};
const undoLimit = 40; // ponytail: 40 snapshots; switch to command deltas if large-scene editing becomes necessary.
let cachedScene=false,startupDiskData;
try {
  const stored = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
  if (validScene(stored)) { cachedScene=true;runtimeSettings=clone(stored.runtime||defaultRuntimeSettings);objects = stored.objects; surface = stored.surface; environment=stored.environment||clone(defaultEnvironment); sceneName=stored.sceneName||assetTitle(activeScenePath); savedBlueprint=stored.blueprint; lastSaved = stored.savedAt || ''; }
} catch { /* Invalid local data never replaces the default scene. */ }
try{const data=await(await editorRequest(fileUrl(activeScenePath))).json();startupDiskData=clone(data);if(!cachedScene){if(!validScene(data))throw Error('시작 레벨 데이터 검증 실패');runtimeSettings=clone(data.runtime||defaultRuntimeSettings);objects=data.objects;surface=data.surface;environment=data.environment||clone(defaultEnvironment);sceneName=data.sceneName||assetTitle(activeScenePath);}}catch(error){location.replace('/prototype/project-hub.html?error='+encodeURIComponent(error.message));throw error;}
const sceneSnapshot=()=>({version:1,sceneName,objects:clone(objects),surface:clone(surface),environment:clone(environment),runtime:clone(runtimeSettings)});
const snapshot=()=>({kind:assetDocs.current?.kind||'scene',data:clone(captureDocumentData())});
const remember = () => { future=[]; history.push(snapshot()); if (history.length > undoLimit) history.shift(); };
function changed() { if(assetDocs.current&&!switchingDocument){assetDocs.current.data=captureDocumentData();assetDocs.current.dirty=true;renderDocumentTabs();queueRecovery();}dirty = true; $('#dirty-mark').hidden = false; $('#status-text').textContent = '변경 사항 있음'; }
function notify(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.hidden = true, 3500); log(message); }
function log(message, kind = 'INFO') {
  logs.push({ message, kind, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) });
  if (logs.length > 100) logs.shift();
  $('#log-count').textContent = logs.length;
  $('#console-logs').innerHTML = logs.map(l => `<div class="log-row"><time>${l.time}</time><span class="log-kind">${l.kind}</span><span>${escapeHtml(l.message)}</span></div>`).join('');
}
async function save(all=false) {
  if(running)return notify('실행을 종료한 뒤 저장하세요.');assetPanes.get(assetDocs.active)?.editor?.flush?.();captureDocument();
  const docs=all?[...assetDocs.items.values()].filter(d=>d.dirty):[assetDocs.current];
  try{for(const doc of docs.filter(Boolean)){if(!assetSuffix[doc.kind]&&doc.kind!=='text')continue;await assetDocs.save(doc,(path,text,expected)=>editorRequest('/api/asset/write',{method:'POST',body:JSON.stringify({path,text,expected})}));}
    dirty=[...assetDocs.items.values()].some(d=>d.dirty);$('#dirty-mark').hidden=!dirty;$('#status-text').textContent=dirty?'저장하지 않은 에셋':'준비됨';$('#save-status').textContent='프로젝트 저장됨';renderDocumentTabs();queueRecovery();await Promise.all([...projectBrowsers.values()].map(browser=>browser.refresh()));notify(all?'모든 에셋 저장됨':'에셋 저장됨');return true;
  }catch(error){notify('저장 실패: '+error.message);return false;}
}
function restoreEdit(data){
  const doc=assetDocs.current;if(!doc)return;doc.data=clone(data.data);installDocumentData(doc);changed();
}
function undo(){assetPanes.get(assetDocs.active)?.editor?.flush?.();if(running)return notify('실행을 종료한 뒤 편집하세요.');const data=history.pop();if(!data)return notify('되돌릴 변경 사항이 없어요.');future.push(snapshot());restoreEdit(data);}
function redo(){if(running)return;const data=future.pop();if(!data)return;history.push(snapshot());restoreEdit(data);}

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
  const g = new THREE.Group();g.name = object.name;g.userData.objectId = object.id;
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
    case 'cone': mesh(g,new THREE.ConeGeometry(.6,1.2,32),surfaceMaterial,[0,.6,0]);break;
    case 'capsule': mesh(g,new THREE.CapsuleGeometry(.35,.8,8,24),surfaceMaterial,[0,.75,0]);break;
    case 'torus': mesh(g,new THREE.TorusGeometry(.6,.2,12,32),surfaceMaterial,[0,.8,0]);break;
    case 'sphere': mesh(g, new THREE.SphereGeometry(.6,32,24), surfaceMaterial, [0,.6,0]); break;
    case 'cylinder': mesh(g, new THREE.CylinderGeometry(.45,.45,1.2,24), surfaceMaterial, [0,.6,0]); break;
    case 'plane': box(g,[1.5,.08,1.5],surfaceMaterial,[0,.04,0]); break;
    case 'character': mesh(g,new THREE.CapsuleGeometry(.35,1.1,8,16),surfaceMaterial,[0,.9,0]);break;
  }
  if(object.materialSurface&&validSurface(object.materialSurface)){const m=new THREE.MeshStandardMaterial({color:object.materialSurface.color,roughness:object.materialSurface.roughness,metalness:object.materialSurface.metalness});g.traverse(child=>{if(child.isMesh)child.material=m;});}
  g.traverse(child => child.userData.objectId = object.id);
  meshMap.set(object.id, g); applyObject(object); scene.add(g);g.userData.ready=visuals.build(object,g);g.userData.ready.catch(error=>log(object.name+': '+error.message,'ERROR'));return g;
}
function applyObject(o) { let g=meshMap.get(o.id);if(!g)return;if(g.userData.componentSignature!==undefined&&g.userData.componentSignature!==JSON.stringify(o.components)){const old=g,parent=g.parent,children=g.children.filter(child=>child.userData.objectId&&child.userData.objectId!==o.id);visuals.dispose(old);old.removeFromParent();g=buildObject(o);if(parent)parent.add(g);for(const child of children)g.add(child);old.traverse(child=>child.geometry?.dispose());}g.position.set(...o.position); g.rotation.set(...o.rotation.map(THREE.MathUtils.degToRad)); g.scale.set(...o.scale); g.visible=o.visible; }
function rebuildWorld() {
  if(!scene) return;
  transform?.detach();
  meshMap.forEach(g => { visuals.dispose(g);g.removeFromParent(); g.traverse(m => { m.geometry?.dispose(); if(m.isLight) m.dispose(); }); });
  meshMap.clear(); sun=null; objects.forEach(buildObject);
  for(const object of objects){const parent=meshMap.get(object.parent);if(parent)parent.add(meshMap.get(object.id));}
  if(!objects.some(o=>o.id===selected)) selected=objects[0]?.id || null;
  if(!selected){if(selectionBox)selectionBox.visible=false;$('#selection-chip-name').textContent='선택 없음';}
  const selection=new Set(sceneSelection);selectObject(selected, false);sceneSelection=new Set([...selection].filter(id=>meshMap.has(id)));if(!sceneSelection.size&&selected)sceneSelection.add(selected);
}
function initRendering() {
  try {
    mainRenderer=new THREE.WebGLRenderer({canvas:$('#scene-canvas'),antialias:true}); mainRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
    mainRenderer.shadowMap.enabled=true; mainRenderer.shadowMap.type=THREE.PCFSoftShadowMap; mainRenderer.toneMapping=THREE.ACESFilmicToneMapping; mainRenderer.toneMappingExposure=.83;
    scene=new THREE.Scene(); collisionPreview=new CollisionPreview(scene); scene.background=new THREE.Color(0x526e71); scene.fog=new THREE.Fog(0x526e71,19,40);
    ambientLight=new THREE.HemisphereLight(0xd6e8ee,0x677955,1.15); scene.add(ambientLight); scene.environmentIntensity=.6;
    const envGenerator=new THREE.PMREMGenerator(mainRenderer); const room=new RoomEnvironment(); scene.environment=envGenerator.fromScene(room,.04).texture; room.dispose(); envGenerator.dispose();
    camera=new THREE.PerspectiveCamera(38,1,.1,100); camera.position.set(8.6,7.2,10.5); orthoCamera=new THREE.OrthographicCamera(-7,7,7,-7,.1,100); orthoCamera.position.set(0,15,.01); activeCamera=camera;
    orbit=new OrbitControls(camera,$('#scene-canvas')); orbit.target.set(0,.45,0); orbit.enableDamping=true; orbit.dampingFactor=.09; orbit.minDistance=4; orbit.maxDistance=28; orbit.maxPolarAngle=Math.PI*.49;
    grid=new THREE.GridHelper(30,30,0x789b9b,0x638586); grid.position.y=-.75; grid.material.transparent=true; grid.material.opacity=.24; scene.add(grid);
    groundFloor=mesh(scene,new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x526c6d,roughness:1}),[0,-.78,0],[-Math.PI/2,0,0]); groundFloor.castShadow=false;
    transformPivot=new THREE.Object3D();scene.add(transformPivot);transform=new TransformControls(camera,$('#scene-canvas')); transform.setSize(.72); scene.add(transform.getHelper());
    transform.addEventListener('dragging-changed',e=> { orbit.enabled=!e.value; if(e.value){transformBefore=snapshot();transformSelectionStart=selectionMatrices(objects,sceneSelection);transform.object.updateWorldMatrix(true,false);transformPivotStart=transform.object.matrixWorld.clone();} else if(transformBefore) { history.push(transformBefore); if(history.length>undoLimit)history.shift(); transformBefore=null; changed(); renderInspector(); } });
    transform.addEventListener('objectChange',()=> { if(transform.object===transformPivot&&transformPivotStart){transformPivot.updateWorldMatrix(true,false);transformSceneSelection(objects,transformSelectionStart,transformPivot.matrixWorld.clone().multiply(transformPivotStart.clone().invert()));for(const item of transformSelectionStart)applyObject(objects.find(o=>o.id===item.id));selectionBox?.update();return;}const o=objects.find(o=>o.id===selected), g=meshMap.get(selected); if(!o||!g)return; o.position=g.position.toArray().map(n=>+n.toFixed(3)); o.rotation=[g.rotation.x,g.rotation.y,g.rotation.z].map(n=>+THREE.MathUtils.radToDeg(n).toFixed(2)); o.scale=g.scale.toArray().map(n=>Math.max(.01,+n.toFixed(3))); g.scale.set(...o.scale); selectionBox?.update(); });
    selectionBox=new THREE.BoxHelper(new THREE.Object3D(),0xc3e694); selectionBox.material.transparent=true; selectionBox.material.opacity=.8; selectionBox.visible=false; scene.add(selectionBox);
    rebuildWorld();
    initSky();applyEnvironment();
    const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down;
    $('#scene-canvas').addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
    $('#scene-canvas').addEventListener('pointerup',e=> { if(e.button!==0||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||transform.dragging||transform.axis||running) return; const rect=e.currentTarget.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(pointer,activeCamera); const hits=raycaster.intersectObjects([...meshMap.values()],true).filter(h=>h.object.isMesh); const hit=hits.find(hit=>!objects.find(o=>o.id===hit.object.userData.objectId)?.locked);if(hit)selectObject(hit.object.userData.objectId,true,e); });
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
  previewSphere=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.MeshStandardMaterial({color:surface.color,roughness:surface.roughness,metalness:surface.metalness})); previewScene.add(previewSphere);
  const noise=new Uint8Array(64*64*4); let seed=913; for(let i=0;i<64*64;i++){seed=(seed*1664525+1013904223)>>>0;const v=100+seed%100;noise.set([v,v,v,255],i*4);} const bump=new THREE.DataTexture(noise,64,64); bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(3,3);bump.needsUpdate=true;surfaceMaterial.bumpMap=bump;surfaceMaterial.bumpScale=.035;
  new ResizeObserver(resize).observe($('#material-canvas-container'));
}
function resize() {
  const container=$('#scene-canvas-container');
  if(mainRenderer&&container.clientWidth&&container.clientHeight){mainRenderer.setSize(container.clientWidth,container.clientHeight,false);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();const aspect=camera.aspect;orthoCamera.left=-6.3*aspect;orthoCamera.right=6.3*aspect;orthoCamera.top=6.3;orthoCamera.bottom=-6.3;orthoCamera.updateProjectionMatrix();}
  const preview=$('#material-canvas-container'); if(previewRenderer&&preview.clientWidth&&preview.clientHeight){previewRenderer.setSize(preview.clientWidth,preview.clientHeight,false);previewCamera.aspect=preview.clientWidth/preview.clientHeight;previewCamera.updateProjectionMatrix();}
  requestAnimationFrame(drawWires);
}
function selectObject(id, refresh=true, event={}) {
  if(!id)return; selected=id; const o=objects.find(o=>o.id===id); if(!o)return;
  if(event.preserveSelection){}
  else if(event.shiftKey&&sceneAnchor){const rows=sceneRows(objects,$('#hierarchy-search').value,collapsedObjects).map(row=>row.object.id),a=rows.indexOf(sceneAnchor),b=rows.indexOf(id);if(a>=0&&b>=0){if(!event.ctrlKey)sceneSelection.clear();rows.slice(Math.min(a,b),Math.max(a,b)+1).forEach(id=>sceneSelection.add(id));}}
  else if(event.ctrlKey||event.metaKey){sceneSelection.has(id)?sceneSelection.delete(id):sceneSelection.add(id);sceneAnchor=id;}
  else {sceneSelection=new Set([id]);sceneAnchor=id;}
  if(!navigatingScene&&!running)sceneNavigation.push(sceneNavigationState());
  const g=meshMap.get(id); if(g&&transform){ if(o.visible&&!o.locked&&!['camera','ground','grass','path','rocks','water'].includes(o.kind)&&!running){if(sceneSelection.size>1){g.updateWorldMatrix(true,false);transformPivot.position.copy(g.getWorldPosition(new THREE.Vector3()));transformPivot.quaternion.identity();transformPivot.scale.set(1,1,1);transform.attach(transformPivot);}else transform.attach(g);selectionBox.setFromObject(g);selectionBox.visible=true;}else{transform.detach();selectionBox.visible=false;} }
  $('#selection-chip-name').textContent=o.name;$('.selection-chip [data-icon]').innerHTML=icon(kindIcon(o.kind));
  if(refresh){renderHierarchy();renderInspector();}
}
const kindIcon = kind => ({particles:'sun',navigation:'grid',decal:'material',light:'sun',directionalLight:'sun',pointLight:'light',spotLight:'light',camera:'camera',grass:'leaf',water:'layers',ground:'grid',crystal:'diamond',sphere:'sphere',empty:'component',group:'folder',sprite:'image',tilemap:'tilemap',character:'character',character2d:'character',playerStart:'pawn',audio:'volume',controller:'controller'}[kind]||'cube');
function renderHierarchy() {
  sceneSelection=new Set([...sceneSelection].filter(id=>objects.some(o=>o.id===id)));if(!sceneSelection.size&&selected)sceneSelection.add(selected);
  $('#hierarchy-list').innerHTML=hierarchyMarkup(objects,sceneSelection,$('#hierarchy-search').value,collapsedObjects,kindIcon);
  $('#object-count').textContent=objects.length+'개'+(sceneSelection.size>1?' · '+sceneSelection.size+'개 선택':'');
}
function vectorRow(label,key,o) { return `<div class="vector-row"><span>${label}</span>${['X','Y','Z'].map((axis,i)=>`<label class="vector-field"><em>${axis}</em><input type="number" step="${key==='rotation'?1:.1}" ${key==='scale'?'min="0.01"':''} value="${o[key][i]}" data-transform="${key}" data-axis="${i}" aria-label="${label} ${axis}" ${running?'disabled':''}></label>`).join('')}</div>`; }
function materialProperties() { const surface=editingSurface();return `<div class="property-row"><label for="surface-color">기본 색상</label><input type="color" id="surface-color" value="${surface.color}" data-surface="color" aria-label="기본 색상"></div><div class="range-property"><label for="roughness">거칠기 <output>${surface.roughness.toFixed(2)}</output></label><input type="range" id="roughness" min="0" max="1" step="0.01" value="${surface.roughness}" data-surface="roughness"></div><div class="range-property"><label for="metalness">금속성 <output>${surface.metalness.toFixed(2)}</output></label><input type="range" id="metalness" min="0" max="1" step="0.01" value="${surface.metalness}" data-surface="metalness"></div>`; }
function materialSurfaceDetails(){const s=editingSurface();return `<div class="component-property"><label>혼합</label><select data-material-setting="blendMode" aria-label="혼합 모드">${[['opaque','불투명'],['masked','마스크'],['translucent','반투명']].map(([v,label])=>`<option value="${v}" ${s.blendMode===v?'selected':''}>${label}</option>`).join('')}</select></div><div class="component-property"><label>양면</label><input type="checkbox" data-material-setting="doubleSided" aria-label="양면" ${s.doubleSided?'checked':''}></div>`+[['emissive','발광 색상','color',0,1],['emissiveIntensity','발광 강도','number',0,10000],['opacity','불투명도','number',0,1],['alphaTest','마스크 기준','number',0,1],['ao','주변 차폐','number',0,1],['clearcoat','코팅','number',0,1],['clearcoatRoughness','코팅 거칠기','number',0,1],['transmission','투과','number',0,1],['ior','굴절률','number',1,2.5]].map(([key,label,type,min,max])=>`<div class="component-property"><label>${label}</label><input type="${type}" data-material-setting="${key}" aria-label="${label}" value="${s[key]??materialDefaults[key]}" min="${min}" max="${max}" step=".01"></div>`).join('');}
function renderInspector() {
  if(workspace==='blueprint')return renderBlueprintInspector();if(workspace==='code')return renderNativeInspector();
  if(workspace!=='scene'){renderAssetInspector();return;}
  const o=objects.find(o=>o.id===selected); if(!o){$('#inspector-content').innerHTML='<div class="inspector-empty">편집할 오브젝트를 선택하세요.</div>';return;}
  $('#inspector-content').innerHTML=`<div class="object-identity" title="${escapeHtml(o.id)}"><div class="object-identity-icon">${icon(kindIcon(o.kind))}</div><div><input class="object-name" data-object-name value="${escapeHtml(o.name)}" aria-label="오브젝트 이름" maxlength="200" ${running?'disabled':''}><p>${sceneSelection.size>1?sceneSelection.size+'개 선택 · ':''}${escapeHtml(o.kind)}</p></div><label class="object-enable"><input type="checkbox" id="object-visible" ${o.visible?'checked':''} aria-label="오브젝트 표시" ${running?'disabled':''}></label></div>
  <section class="component-section"><h3>${icon('move')}Transform<span>Local</span></h3>${vectorRow('위치','position',o)}${vectorRow('회전','rotation',o)}${vectorRow('크기','scale',o)}</section>
  ${objectComponents(o).some(c=>c.type==='MeshRenderer')?`<section class="component-section"><h3>${icon('material')}머테리얼<span>PBR</span></h3><button class="material-slot" data-action="open-material"><span class="mini-sphere"></span><span><strong>${escapeHtml(o.materialAsset?assetTitle(o.materialAsset):'기본 표면')}</strong></span>${icon('chevron')}</button><select data-object-asset="materialAsset" aria-label="오브젝트 머테리얼">${assetOptions('material',o.materialAsset)}</select>${materialProperties()}</section>`:''}
  <section class="component-section"><h3>${icon('blueprint')}블루프린트</h3><select data-object-asset="blueprintAsset" aria-label="오브젝트 블루프린트" ${running?'disabled':''}>${assetOptions('blueprint',o.blueprintAsset)}</select>${o.blueprintAsset?`<button class="asset-open-link" data-action="open-blueprint">${icon('external')}${escapeHtml(assetTitle(o.blueprintAsset))}</button>`:''}</section>
  <section class="component-section"><div class="component-property"><label>부모</label><select data-scene-parent aria-label="부모 오브젝트" ${running?'disabled':''}><option value="">장면 루트</option>${objects.filter(parent=>parent.id!==o.id&&validParent(objects,o.id,parent.id)).map(parent=>`<option value="${escapeHtml(parent.id)}" ${o.parent===parent.id?'selected':''}>${escapeHtml(parent.name)}</option>`).join('')}</select></div><div class="component-property"><label>태그</label><input data-scene-tags value="${escapeHtml((o.tags||[]).join(', '))}" maxlength="200" aria-label="오브젝트 태그" ${running?'disabled':''}></div></section>${componentInspector(o,projectAssetFiles,{running})}`;
  icons($('#inspector-content'));
}
function updateSurface() {
  surfaceMaterial.color.set(surface.color); surfaceMaterial.roughness=surface.roughness;surfaceMaterial.metalness=surface.metalness; if(sun)sun.intensity=environment.sunEnabled?surface.light:0;
  const edited=editingSurface();if(previewSphere){const doc=assetDocs.current;if(doc?.kind==='material'){const signature=JSON.stringify(doc.data);if(signature!==previewMaterialSignature){try{const next=createThreeMaterial(THREE,doc.data,{fileUrl,onError:message=>log(String(message),'ERROR')});previewSphere.material.dispose();previewSphere.material=next;previewMaterialSignature=signature;}catch(error){log(error.message,'ERROR');}}}else{previewSphere.material.color.set(edited.color);previewSphere.material.roughness=edited.roughness;previewSphere.material.metalness=edited.metalness;previewMaterialSignature='';}}
  $$('[data-surface]').forEach(input=>{const key=input.dataset.surface;if(document.activeElement!==input)input.value=key==='light'?surface.light:edited[key];const output=input.parentElement.querySelector('output')||input.previousElementSibling?.querySelector('output');if(output)output.textContent=Number(key==='light'?surface.light:edited[key]).toFixed(key==='light'?1:2);});
  if(assetDocs.current?.kind==='material')$$('[data-material-surface]').forEach(input=>{if(document.activeElement!==input)input.value=edited[input.dataset.materialSurface];});
  $('#environment-light-value').textContent=surface.light.toFixed(1);
  $('#shadow-toggle').checked=environment.shadowEnabled!==false;
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
  if(scene){scene.background.set(environment.skyEnabled?p.ground:0x272f34);scene.fog=environment.fogEnabled?new THREE.Fog(p.ground,10,90-environment.fogAmount*66):null;scene.environmentIntensity=environment.skyEnabled?.6:.12;ambientLight.intensity=environment.skyEnabled?p.ambient:.25;ambientLight.color.set(p.horizon);mainRenderer.toneMappingExposure=p.exposure;groundFloor.material.color.set(p.ground);groundFloor.visible=runtimeSettings.dimension!=='2d';
    skyDome.visible=environment.skyEnabled;skyDome.material.uniforms.topColor.value.set(p.top);skyDome.material.uniforms.horizonColor.value.set(p.horizon);
    const az=THREE.MathUtils.degToRad(environment.sunAzimuth),el=THREE.MathUtils.degToRad(environment.sunElevation),direction=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
    skyDome.material.uniforms.sunDirection.value.copy(environment.sunEnabled?direction:new THREE.Vector3(0,-1,0));
    if(sun){sun.castShadow=environment.shadowEnabled!==false;mainRenderer.shadowMap.needsUpdate=true;sun.intensity=environment.sunEnabled?surface.light:0;sun.color.set(environment.preset==='night'?0xa5b9e1:environment.preset==='sunset'?0xffbb80:0xffeed7);sun.parent.position.copy(direction.multiplyScalar(10));const o=objects.find(o=>o.id==='sun-light');if(o)o.position=sun.parent.position.toArray().map(n=>+n.toFixed(3));}
    cloudGroup.visible=environment.cloudsEnabled;cloudGroup.children.forEach((c,i)=>{c.visible=i<Math.ceil(environment.cloudDensity*10);c.children[0].material.color.set(p.cloud);});
  }
  $$('[data-environment]').forEach(input=>{if(input.type==='checkbox')input.checked=input.dataset.environment==='shadowEnabled'?environment.shadowEnabled!==false:environment[input.dataset.environment];else input.value=environment[input.dataset.environment];});
  $$('[data-environment-value]').forEach(output=>{const key=output.dataset.environmentValue;output.textContent=['sunAzimuth','sunElevation'].includes(key)?environment[key]+'°':Math.round(environment[key]*100)+'%';});
  $('#scene-root-name').textContent=sceneName;$('#scene-file-name').textContent=assetTitle(assetDocs.active||activeScenePath);if(workspace==='scene')$('#workspace-name').textContent=sceneName;
}
function createMap(){
  if(running){notify('실행을 종료한 뒤 새 맵을 만드세요.');return;}
  const name=$('#new-map-name').value.trim();if(!name){notify('맵 이름을 입력하세요.');$('#new-map-name').focus();return;}
  const template=$('input[name="map-template"]:checked').value;remember();runtimeSettings=clone(defaultRuntimeSettings);runtimeSettings.dimension=template==='2d'?'2d':'3d';sceneName=name;surface=clone(defaultSurface);environment=clone(defaultEnvironment);
  if(template==='garden')objects=clone(defaultObjects);
  else if(template==='empty'){objects=[];Object.assign(environment,{skyEnabled:false,sunEnabled:false,cloudsEnabled:false,fogEnabled:false});}
  else if(template==='2d'){objects=make2DScene();Object.assign(environment,{skyEnabled:false,sunEnabled:false,cloudsEnabled:false,fogEnabled:false});}
  else {objects=[{id:'map-ground',name:'Ground',kind:'plane',group:'WORLD',position:[0,0,0],rotation:[0,0,0],scale:[8,1,8],visible:true},clone(defaultObjects.find(o=>o.id==='sun-light')),clone(defaultObjects.find(o=>o.kind==='camera'))];}
  sun=null;selected=objects[0]?.id||null;rebuildWorld();applyEnvironment();updateSurface();renderHierarchy();setWorkspace('scene');setView(template==='2d'?'2d':'3d');if(camera){camera.position.set(8.6,7.2,10.5);orbit.target.set(0,.45,0);}$('#new-map-dialog').close();changed();notify(name+' 맵을 만들었어요. Ctrl Z로 이전 장면을 복원할 수 있어요.');
}
function setWorkspace(name,activate=true) {
  if(name==='code'){const path=assetDocs.current?.data.native?.headerPath||projectAssetFiles.find(f=>f.kind==='code'&&f.path===codeHeaderPath)?.path||projectAssetFiles.find(f=>f.kind==='code'&&/\.(h|hpp|cpp)$/i.test(f.path))?.path;if(path)openCodeExternal(path);else project?.createDialog('code');return;}
  if(activate&&assetDocs.current?.kind!==name){const target=[...assetDocs.items.values()].reverse().find(d=>d.kind===name);if(target){activateDocument(target.path);return;}const defaults={blueprint:activeBlueprintPath,material:projectAssetFiles.find(f=>f.kind==='material')?.path,scene:activeScenePath};if(defaults[name])openProjectAsset({kind:name,path:defaults[name],name:assetTitle(defaults[name])}).catch(e=>notify(e.message));else project?.createDialog(name);return;}
  workspace=name;document.body.dataset.editor=name;$('.editor-grid').classList.toggle('dedicated-editor',['widget','audiomixer','sprite','tilemap','spriteanimation'].includes(name));$('.hierarchy').classList.toggle('blueprint-mode',name==='blueprint');$('#blueprint-sidebar').hidden=name!=='blueprint';
  const sceneMode=name==='scene';for(const el of $$('.hierarchy > .search-field,.hierarchy > .scene-root,.hierarchy > #hierarchy-list,.hierarchy > .hierarchy-footer'))el.hidden=!sceneMode;
  $('.hierarchy .panel-heading h2').textContent=name==='blueprint'?'블루프린트':sceneMode?'아웃라이너':'에셋';
  const add=$('.hierarchy .panel-heading .icon-button');add.dataset.action=name==='blueprint'?'add-blueprint-node':sceneMode?'add-menu':'create-asset';add.ariaLabel=name==='blueprint'?'노드 추가':sceneMode?'오브젝트 추가':'에셋 만들기';add.title=add.ariaLabel;
  const doc=assetDocs.current,nativeBlueprint=name==='blueprint'&&!!doc?.data.native;$('#scene-file-name').textContent=assetTitle(doc?.path||activeScenePath);$('[data-action="build-native"]').hidden=!nativeBlueprint;$('[data-action="build-native"]').disabled=!nativeBlueprint||!!doc.building;$('#external-code-button').hidden=!nativeBlueprint;$('#workspace-path').textContent=doc?.path.split('/').slice(0,-1).join('/')||'Assets';$('#workspace-name').textContent=doc?assetTitle(doc.path):sceneName;$('#workspace-kind').textContent=name==='blueprint'?graphs.blueprint.settings?.parentClass||'Actor':assetTypes[name]?.label||name;$('#workspace-symbol').innerHTML=icon(assetIcon(name));
  const preview=$('.material-preview');if(preview.parentElement!==$('.hierarchy'))$('.hierarchy').append(preview);preview.hidden=name!=='material';
  $('#asset-side-summary')?.remove();if(!sceneMode&&name!=='blueprint'){const summary=document.createElement('div');summary.id='asset-side-summary';summary.className='editor-asset-summary';summary.innerHTML=icon(assetIcon(name))+'<h3>'+escapeHtml(doc?.data.name||assetTitle(doc?.path||''))+'</h3><p>'+escapeHtml(doc?.path||'')+'</p><button data-action="browse-document">'+icon('folder')+'콘텐츠에서 찾기</button>';$('.hierarchy').append(summary);}
  renderInspector();if(graphs[name])renderGraph(name);if(name==='blueprint')renderBlueprintSidebar();resize();drawWires();
}
function setView(mode) {
  if(!orbit)return;viewMode=mode;if(grid){grid.rotation.x=mode==='2d'?Math.PI/2:0;grid.position.set(0,mode==='2d'?0:-.75,mode==='2d'?-.05:0);}activeCamera=mode==='3d'?camera:orthoCamera;if(mode!=='3d'){orthoCamera.up.set(0,1,0);orthoCamera.position.set(...(mode==='top'?[0,15,.01]:[0,0,15]));orthoCamera.lookAt(0,0,0);}
  orbit.dispose();orbit=new OrbitControls(activeCamera,$('#scene-canvas'));orbit.enableDamping=true;orbit.enableRotate=mode==='3d';orbit.target.set(0,mode!=='3d'?0:.45,0);orbit.minDistance=4;orbit.maxDistance=28;orbit.maxPolarAngle=mode==='3d'?Math.PI*.49:Math.PI;transform.camera=activeCamera;orbit.addEventListener('end',()=>{if(!navigatingScene&&!running)sceneNavigation.push(sceneNavigationState());});
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));$('#scene-view-label').textContent=mode==='top'?'Orthographic · Top':mode==='2d'?'Orthographic · XY':'Perspective · Lit';$('#scene-canvas').setAttribute('aria-label',mode==='2d'?'2D 장면 뷰포트':mode==='top'?'상단 장면 뷰포트':'3D 장면 뷰포트');resize();
}
function sceneNavigationState(){return {selected,selection:[...sceneSelection],viewMode,position:activeCamera?.position.toArray(),target:orbit?.target.toArray(),zoom:activeCamera?.zoom};}
function navigateScene(direction){const state=sceneNavigation.navigate(direction);if(!state)return false;navigatingScene=true;try{if(state.viewMode!==viewMode)setView(state.viewMode);if(state.selected&&objects.some(o=>o.id===state.selected))selectObject(state.selected);sceneSelection=new Set(state.selection.filter(id=>objects.some(o=>o.id===id)));if(state.position&&activeCamera)activeCamera.position.fromArray(state.position);if(state.target&&orbit)orbit.target.fromArray(state.target);if(state.zoom&&activeCamera){activeCamera.zoom=state.zoom;activeCamera.updateProjectionMatrix();}orbit?.update();renderHierarchy();}finally{navigatingScene=false;}return true;}
function focusObject() { const g=meshMap.get(selected);if(!g||!orbit)return;sceneNavigation.push(sceneNavigationState());const bounds=new THREE.Box3();for(const id of sceneSelection){const mesh=meshMap.get(id);if(mesh)bounds.union(new THREE.Box3().setFromObject(mesh));}const center=bounds.isEmpty()?g.getWorldPosition(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3());if(!Number.isFinite(center.x))return;orbit.target.copy(center);if(viewMode==='3d')camera.position.copy(center).add(new THREE.Vector3(5,4,6));else orthoCamera.position.copy(center).add(viewMode==='top'?new THREE.Vector3(0,15,.01):new THREE.Vector3(0,0,15));orbit.update();sceneNavigation.push(sceneNavigationState());$('#hierarchy-list [data-scene-row="'+selected+'"]')?.scrollIntoView({block:'nearest'}); }
function sceneTargets(){return objects.filter(o=>sceneSelection.has(o.id));}
function editScene(change,{rebuild=false}={}){if(running)return notify('실행을 종료한 뒤 편집하세요.');remember();change();if(rebuild)rebuildWorld();else sceneTargets().forEach(applyObject);renderHierarchy();renderInspector();changed();}
function parentObject(id,parent,record=true){if(!validParent(objects,id,parent))throw Error('부모 연결이 순환하거나 대상이 없어요.');const o=objects.find(o=>o.id===id),g=meshMap.get(id),target=parent?meshMap.get(parent):scene;if(!o||!g||!target)return;if(record)remember();scene.updateMatrixWorld(true);target.attach(g);o.position=g.position.toArray();o.rotation=[g.rotation.x,g.rotation.y,g.rotation.z].map(THREE.MathUtils.radToDeg);o.scale=g.scale.toArray();if(parent)o.parent=parent;else delete o.parent;renderHierarchy();renderInspector();changed();}
function sceneAction(action){
  if(running)return notify('실행을 종료한 뒤 편집하세요.');const selectedObjects=sceneTargets();
  if(action==='copy'||action==='cut'){sceneClipboard=copySceneObjects(objects,sceneSelection);if(action==='copy')return;if(action==='cut')return sceneAction('delete');}
  if(action==='duplicate'){sceneClipboard=copySceneObjects(objects,sceneSelection);return sceneAction('paste');}
  if(action==='paste'){if(!sceneClipboard?.length)return;editScene(()=>{const copied=pasteSceneObjects(objects,sceneClipboard,{offset:[.5,0,.5]});sceneSelection=new Set(copied.map(o=>o.id));selected=copied[0]?.id;},{rebuild:true});return;}
  if(action==='delete'){editScene(()=>{removeSceneObjects(objects,sceneSelection);sceneSelection.clear();selected=objects[0]?.id||null;},{rebuild:true});return;}
  if(action==='group'){if(!selectedObjects.length)return;editScene(()=>{const roots=selectedObjects.filter(o=>!sceneSelection.has(o.parent)),group={id:crypto.randomUUID(),name:'Group',kind:'group',group:'WORLD',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:defaultsForObject('group')};objects.push(group);buildObject(group);for(const o of roots)parentObject(o.id,group.id,false);selected=group.id;sceneSelection=new Set([group.id]);});return;}
  if(action==='ungroup'){editScene(()=>{for(const o of selectedObjects){if(o.kind==='group'){for(const child of objects.filter(c=>c.parent===o.id))parentObject(child.id,o.parent||'',false);objects.splice(objects.indexOf(o),1);meshMap.get(o.id)?.removeFromParent();meshMap.delete(o.id);}else parentObject(o.id,'',false);}selected=objects[0]?.id;sceneSelection=new Set(selected?[selected]:[]);},{rebuild:true});return;}
  if(action==='rename'){const input=$('[data-object-name]');input?.focus();input?.select();return;}
  if(action==='focus')return focusObject();
  if(action==='hide'||action==='lock')return editScene(()=>selectedObjects.forEach(o=>{const key=action==='hide'?'visible':'locked';o[key]=!o[key];}));
  if(action==='add-component')return componentPicker({add:type=>editScene(()=>selectedObjects.forEach(o=>addSceneComponent(o,type)),{rebuild:true}),error:notify});
  if(action.startsWith('component:')){const [,command,id]=action.split(':'),o=objects.find(o=>o.id===selected),component=o?.components?.find(c=>c.id===id);if(!component)return;if(command==='copy'){componentClipboard=clone(component);return;}editScene(()=>{if(command==='remove')o.components=o.components.filter(c=>c!==component);else if(command==='reset')component.properties=componentDefaults(component.type);else if(command==='paste'&&componentClipboard?.type===component.type)component.properties=clone(componentClipboard.properties);else if(command==='up'||command==='down'){const index=o.components.indexOf(component),next=Math.max(1,Math.min(o.components.length-1,index+(command==='up'?-1:1)));o.components.splice(index,1);o.components.splice(next,0,component);}}, {rebuild:true});return;}
}
function sceneContextMenu(event){event.preventDefault();event.stopPropagation();const row=event.target.closest('[data-scene-row]');if(row&&!sceneSelection.has(row.dataset.sceneRow))selectObject(row.dataset.sceneRow);focusedWindow='scene';const anchor={getBoundingClientRect:()=>({left:event.clientX,bottom:event.clientY})};openMenu(anchor,sceneSelection.size?[['오브젝트 배치','window:placement'],['선택에 초점','scene:focus','','F'],['이름 변경','scene:rename','','F2'],null,['복사','scene:copy','','Ctrl C'],['잘라내기','scene:cut','','Ctrl X'],['붙여넣기','scene:paste','','Ctrl V'],['복제','scene:duplicate','','Ctrl D'],null,['그룹 만들기','scene:group','','Ctrl G'],['그룹 해제 / 부모 분리','scene:ungroup','','Ctrl Shift G'],['컴포넌트 추가','scene:add-component'],['표시 전환','scene:hide','','H'],['선택 잠금 전환','scene:lock','','L'],null,['삭제','scene:delete','','Delete']]:[['오브젝트 배치','window:placement'],['빈 오브젝트','create:empty'],['2D 스프라이트','create:sprite'],['캐릭터','create:character'],['플레이어 시작점','create:playerStart'],['붙여넣기','scene:paste','','Ctrl V']]);}
$('#hierarchy-list').addEventListener('contextmenu',sceneContextMenu);
$('#hierarchy-list').addEventListener('pointerdown',()=>focusedWindow='scene');
$('#hierarchy-list').addEventListener('dragstart',event=>{const row=event.target.closest('[data-select]');if(row)event.dataTransfer.setData('application/x-hb-scene',row.dataset.select);});
$('#hierarchy-list').addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-hb-scene')){event.preventDefault();event.dataTransfer.dropEffect='move';}});
$('#hierarchy-list').addEventListener('drop',event=>{const id=event.dataTransfer.getData('application/x-hb-scene');if(!id)return;event.preventDefault();event.stopPropagation();try{parentObject(id,event.target.closest('[data-scene-row]')?.dataset.sceneRow||'');}catch(error){notify(error.message);}});
let scenePointerStart=null,scenePointerMoved=false;$('#scene-canvas').addEventListener('pointerdown',e=>{scenePointerStart=[e.clientX,e.clientY];scenePointerMoved=false;});$('#scene-canvas').addEventListener('pointermove',e=>{if(e.buttons&&scenePointerStart&&Math.hypot(e.clientX-scenePointerStart[0],e.clientY-scenePointerStart[1])>4)scenePointerMoved=true;});$('#scene-canvas').addEventListener('contextmenu',event=>{event.preventDefault();if(!running&&!scenePointerMoved)sceneContextMenu(event);});
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
  if(button.dataset.fold){collapsedObjects.has(button.dataset.fold)?collapsedObjects.delete(button.dataset.fold):collapsedObjects.add(button.dataset.fold);renderHierarchy();}
  else if(button.dataset.sceneVisible||button.dataset.sceneLock){const id=button.dataset.sceneVisible||button.dataset.sceneLock,key=button.dataset.sceneVisible?'visible':'locked';editScene(()=>{const object=objects.find(o=>o.id===id);object[key]=!object[key];});}
  else if(button.dataset.openComponentAsset){const file=projectAssetFiles.find(f=>f.path===button.dataset.openComponentAsset);if(file)openProjectAsset(file).catch(error=>notify(error.message));}
  else if(button.dataset.componentMenu){event.preventDefault();const id=button.dataset.componentMenu;openMenu(button,[['기본값 복원','scene:component:reset:'+id],['컴포넌트 복사','scene:component:copy:'+id],['값 붙여넣기','scene:component:paste:'+id,componentClipboard?'':'disabled'],['위로 이동','scene:component:up:'+id],['아래로 이동','scene:component:down:'+id],null,['컴포넌트 제거','scene:component:remove:'+id]]);}
});
document.addEventListener('change',event=>{const input=event.target;if(!input.matches('[data-scene-component],[data-object-name],[data-scene-parent],[data-scene-tags]'))return;if(running)return;
  const object=objects.find(o=>o.id===selected);if(!object)return;
  try{
    if(input.hasAttribute('data-object-name')){const name=input.value.trim();if(!name||name.length>200)throw Error('오브젝트 이름을 확인하세요.');editScene(()=>object.name=name);return;}
    if(input.hasAttribute('data-scene-parent')){parentObject(object.id,input.value);return;}
    if(input.hasAttribute('data-scene-tags')){const tags=[...new Set(input.value.split(',').map(s=>s.trim()).filter(Boolean))];if(tags.length>32||tags.some(t=>t.length>80))throw Error('태그 길이를 확인하세요.');editScene(()=>sceneTargets().forEach(o=>o.tags=tags));return;}
    const component=objectComponents(object).find(c=>c.id===input.dataset.sceneComponent),key=input.dataset.componentField,properties={...componentDefaults(component.type),...component.properties};let value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
    if(input.dataset.componentAxis!==undefined){value=[...properties[key]];value[Number(input.dataset.componentAxis)]=Number(input.value);}
    const next={...properties,[key]:value};if(!validComponentProperties(component.type,next))throw Error('컴포넌트 값의 범위와 자료형을 확인하세요.');
    editScene(()=>{for(const target of sceneTargets()){const c=objectComponents(target).find(c=>c.type===component.type);if(c)c.properties={...componentDefaults(c.type),...c.properties,[key]:clone(value)};}},{rebuild:true});
  }catch(error){notify(error.message);renderInspector();}
});
function focusedProjectBrowser(){return projectBrowsers.get(focusedWindow)||project;}
async function reloadImportedAssets(result){
  if(running)throw Error('실행 종료 후 장면을 갱신하세요.');captureDocument();const affected=new Set(result.affected),active=assetDocs.current;
  for(const doc of assetDocs.items.values())if(affected.has(doc.path)&&!doc.dirty){const data=await(await editorRequest(fileUrl(doc.path))).json();if(!validAsset(doc.kind,data))throw Error('다시 가져온 에셋 검증 실패: '+doc.path);doc.data=data;doc.saved=JSON.stringify(data);doc.history.length=0;doc.future.length=0;}
  if(active)installDocumentData(active);rebuildWorld();updateSurface();renderDocumentTabs();queueRecovery();notify(result.changed.length+'개 에셋 갱신');
}
function projectHooks(){return {references:file=>openReferenceViewer(file.path),open:openProjectAsset,reimport:reloadImportedAssets,error:notify,import:()=>doAction('import'),wrap:wrapSource,rename:renameDocumentPaths,files:files=>{assets.splice(0,assets.length,...files);refreshAssetIndex();},newBrowser:folder=>createProjectWindow({folder,target:dock.paneFor(focusedWindow)}),windowMenu:event=>openMenu({getBoundingClientRect:()=>({left:event.clientX,bottom:event.clientY})},[['오브젝트 배치','window:placement'],['콘텐츠 브라우저','window:project'],['뷰포트','window:viewport'],['출력 로그','window:console'],['월드 설정','window:world']]),select:file=>{$('#inspector-content').innerHTML='<div class="editor-asset-summary">'+icon(assetIcon(file.kind))+'<h3>'+escapeHtml(assetTitle(file.path))+'</h3><p>'+escapeHtml(file.path)+'</p><p>'+escapeHtml(assetTypes[file.kind]?.label||file.kind)+' · '+((file.size||0)/1024).toFixed(1)+' KB</p></div>';}};}
function openReferenceViewer(path){const id='references:'+path;if(dock.entries.has(id))return dock.open(id);const element=document.createElement('div'),viewer=new ReferenceViewer(element,path,{open:openProjectAsset,error:notify});dock.add({id,kind:'references',title:'참조 · '+assetTitle(path),element,navigateHistory:direction=>viewer.navigateHistory(direction),dispose:()=>viewer.dispose()},dock.paneFor(focusedWindow));}
function createProjectWindow({id,folder,target}={}){if(!id){let number=2;while(projectBrowsers.has('project:'+number)&&number<999)number++;id='project:'+number;}if(dock?.entries.has(id)){dock.open(id,target);return dock.entries.get(id);}const element=document.createElement('div');element.className='workspace-view extra-project-browser';const header=document.createElement('div');header.className='document-toolbar';const breadcrumb=document.createElement('span');header.append(breadcrumb);const content=document.createElement('div');content.className='assets-content';element.append(header,content);const browser=new ProjectBrowser(content,breadcrumb,projectHooks(),{id,folder});projectBrowsers.set(id,browser);const entry={id,kind:'project',title:'콘텐츠 브라우저 '+id.split(':')[1],element,browser,navigateHistory:direction=>browser.navigateHistory(direction),dispose:()=>{browser.dispose();projectBrowsers.delete(id);}};if(dock)dock.add(entry,target||dock.paneFor(focusedWindow)||dock.leaves().at(-1));return entry;}
function openProfiler(target){if(dock.entries.has('profiler'))return dock.open('profiler',target);const element=document.createElement('div'),panel=new ProfilerPanel(element,profiler);dock.add({id:'profiler',kind:'profiler',title:'프로파일러',element,dispose:()=>panel.dispose()},target||dock.paneFor(focusedWindow),'bottom');}
function createEditorWindow(kind,{target,sourceId}={}){if(kind==='profiler')return openProfiler(target);if(kind==='placement')return openPlacement(target);if(kind==='project')return createProjectWindow({folder:projectBrowsers.get(sourceId)?.folder||focusedProjectBrowser()?.folder,target});if(kind==='viewport')return createViewportWindow(target);if(kind==='console')return dock.open('console',target);if(kind==='world')return openWorldSettings(target);if(kind==='editor')return dock.open(ensureAssetPane(assetDocs.current),target);}
function openWorldSettings(target){if(assetDocs.current?.kind!=='scene')activateDocument(activeScenePath);const id='world:'+activeScenePath;if(dock.entries.has(id)){dock.open(id,target);return;}const element=document.createElement('div');element.className='workspace-view world-settings';const render=()=>{element.innerHTML='<header class="asset-editor-heading"><h2>월드 설정</h2></header><div class="asset-form"><section><h3>게임플레이</h3><label>게임 설정<select data-world-field="gameConfig">'+assetOptions('gameconfig',runtimeSettings.gameConfig)+'</select></label><label>차원<select data-world-field="dimension"><option value="3d" '+(runtimeSettings.dimension==='3d'?'selected':'')+'>3D / 2.5D</option><option value="2d" '+(runtimeSettings.dimension==='2d'?'selected':'')+'>2D</option></select></label></section><section><h3>물리</h3>'+runtimeSettings.gravity.map((v,i)=>'<label>중력 '+['X','Y','Z'][i]+'<input type="number" step=".1" min="-1000" max="1000" data-world-gravity="'+i+'" value="'+v+'"></label>').join('')+'<label>고정 시간 간격<input type="number" data-world-field="fixedDeltaTime" min="0.004166667" max=".1" step=".001" value="'+runtimeSettings.fixedDeltaTime+'"></label><label>최대 하위 스텝<input type="number" data-world-field="maxSubsteps" min="1" max="32" value="'+runtimeSettings.maxSubsteps+'"></label></section></div>';};element.onchange=e=>{const next=clone(runtimeSettings);if(e.target.dataset.worldGravity!==undefined)next.gravity[Number(e.target.dataset.worldGravity)]=Number(e.target.value);else if(e.target.dataset.worldField)next[e.target.dataset.worldField]=e.target.type==='number'?Number(e.target.value):e.target.value;else return;if(!validRuntimeSettings(next)){notify('월드 설정 값의 범위를 확인하세요.');render();return;}remember();runtimeSettings=next;if(next.dimension==='2d')setView('2d');changed();render();};render();dock.add({id,kind:'world',title:'월드 설정',element,path:activeScenePath,render},target||dock.paneFor('scene'),'right');}
function navigateFocusedWindow(direction){const entry=dock?.entries.get(focusedWindow);if(entry?.navigateHistory)return entry.navigateHistory(direction);if(focusedWindow==='scene'||entry?.kind==='viewport')return navigateScene(direction);return false;}
document.addEventListener('keydown',event=>{if(event.key==='BrowserBack'||event.key==='BrowserForward'||event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(!$$('dialog').some(d=>d.open))Promise.resolve(navigateFocusedWindow(['BrowserBack','ArrowLeft'].includes(event.key)?-1:1)).catch(error=>notify(error.message));}},true);
document.addEventListener('pointerup',event=>{if(event.button===3||event.button===4){event.preventDefault();event.stopPropagation();navigateFocusedWindow(event.button===3?-1:1);}},true);
document.addEventListener('pointerdown',event=>{if(event.button===3||event.button===4)event.preventDefault();},true);
document.addEventListener('auxclick',event=>{if(event.button===3||event.button===4)event.preventDefault();},true);
function createObject(kind,position) {
  if(assetDocs.current?.kind!=='scene')activateDocument(activeScenePath);if(running)return notify('실행을 종료한 뒤 오브젝트를 추가하세요.');if(objects.length>=500)return notify('오브젝트 제한에 도달했어요.');
  const o=createPlacedObject(kind==='light'?'directionalLight':kind,{position:position||(runtimeSettings.dimension==='2d'?[0,0,0]:[orbit?.target.x||0,orbit?.target.y||0,orbit?.target.z||0])});remember();objects.push(o);if(scene)buildObject(o);selectObject(o.id);setWorkspace('scene');changed();return o;
}
function placementPoint(x,y){
  const rect=$('#scene-canvas').getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),activeCamera);
  const plane=new THREE.Plane(runtimeSettings.dimension==='2d'||viewMode==='2d'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,point))return [0,0,0];if($('#snap-toggle').checked){const step=Number($('#snap-position').value);point.toArray().forEach((v,i)=>point.setComponent(i,Math.round(v/step)*step));}return point.toArray().map(v=>Math.max(-10000,Math.min(10000,v)));
}
function openPlacement(target){
  if(dock.entries.has('placement'))return dock.open('placement',target);const element=document.createElement('div');element.className='workspace-view placement-panel';
  element.innerHTML='<div class="placement-search"><input type="search" aria-label="오브젝트 배치 검색" placeholder="오브젝트 검색"><select aria-label="오브젝트 분류"><option value="">전체</option>'+[...new Set(placementCatalog.map(p=>p.category))].map(c=>'<option>'+c+'</option>').join('')+'</select></div><div class="placement-list"></div>';
  const list=$('.placement-list',element),search=$('input',element),category=$('select',element);const render=()=>{const matches=placementCatalog.filter(p=>(!category.value||p.category===category.value)&&normalizeSearch(p.key+p.label).includes(normalizeSearch(search.value)));let group='';list.innerHTML=matches.map(p=>{const heading=group===p.category?'':'<div class="placement-category">'+p.category+'</div>';group=p.category;return heading+'<button draggable="true" data-place="'+p.key+'">'+icon(kindIcon(p.kind))+'<span>'+escapeHtml(p.label)+'</span></button>';}).join('');};search.oninput=render;category.onchange=render;list.onclick=e=>{const button=e.target.closest('[data-place]');if(button)createObject(button.dataset.place);};list.ondragstart=e=>{const button=e.target.closest('[data-place]');if(button){e.dataTransfer.setData('application/x-hb-placement',button.dataset.place);e.dataTransfer.effectAllowed='copy';}};render();dock.add({id:'placement',kind:'placement',title:'오브젝트 배치',element},target||dock.paneFor('scene'),'left');const size=n=>{if(n.tabs)return;if(n.axis==='row'&&n.a.tabs?.includes('placement'))n.ratio=.3;size(n.a);size(n.b);};size(dock.tree);dock.render();
}
$('#scene-canvas').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-hb-placement')){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';}});
$('#scene-canvas').addEventListener('drop',e=>{const key=e.dataTransfer.getData('application/x-hb-placement');if(!key)return;e.preventDefault();e.stopPropagation();createObject(key,placementPoint(e.clientX,e.clientY));});

async function nativeCall(request,build){const owner=runtime,generation=owner.generation,services=runtimeServices;build??=runtimeBuilds.get(owner.objects.find(o=>o.id===request.self)?.blueprintAsset)||nativeBuild;if(!build)throw Error('C++을 먼저 빌드하세요.');const result=await (await editorRequest('/api/native/call',{method:'POST',body:JSON.stringify({token:build.token,request:{...request,objects:nativeWorld(owner.objects,new Set([...runtimeBuilds].filter(([,b])=>b.token===build.token).map(([path])=>path)))}})})).json();if(runtime!==owner||owner.generation!==generation)return {outputs:{},events:[],objects:[]};for(const state of result.objects||[]){const o=owner.objects.find(o=>o.id===state.id);if(o){if(state.position!==undefined&&(!validValue('transform',state)||!state.scale.every(v=>v>=.01)||!['position','rotation','scale'].every(k=>state[k].every(v=>Math.abs(v)<=10000))||(state.visible!==undefined&&typeof state.visible!=='boolean')))throw Error('C++ 객체 상태 범위 오류: '+state.id);Object.assign(o,state);if(running&&runtime===owner)applyObject(o);}}for(const operation of result.operations||[])await services.operation(operation.key,operation.args,owner.bindings.find(b=>b.self===request.self)||{self:request.self,root:{components:[]}},owner);if(result.clock){owner.core.scale=result.clock.scale;owner.core.paused=result.clock.paused;if(!request.command)owner.core.time=result.clock.time;}return result;}
let stoppingPlay=false,startingPlay=false,playPresentation,runtimeScenePath;const runtimeBuilds=new Map();
async function startPlay(travel){
  if(stoppingPlay)return;
  if(running){if(runtime.pending)runtime.continue();else if(paused)runtime.continue();else runtime.pause();paused=runtime.paused;return updatePlayButtons();}
  if(startingPlay)return;startingPlay=true;captureDocument();let prepared,gameplay;
  try{
    const world=clone(travel?.data.objects||objects),settings=travel?(travel.data.runtime||defaultRuntimeSettings):runtimeSettings;
    // Legacy assignments are upgraded without changing the edit world.
    if(!travel){for(const o of world)if(!o.blueprintAsset&&o.blueprint===graphs.blueprint.name)o.blueprintAsset=activeBlueprintPath;
    if(!world.some(o=>o.blueprintAsset)&&assetDocs.current?.kind==='blueprint'){const o=world.find(o=>o.id===selected);if(o)o.blueprintAsset=activeBlueprintPath;}}
    prepared=await preparePlayWorld(world,settings,{readAsset,readText:async path=>(await editorRequest(fileUrl(path))).text(),buildNative:async(header,source)=>(await editorRequest('/api/native/build',{method:'POST',body:JSON.stringify({header,source})})).json()});gameplay=prepared;runtimeBuilds.clear();for(const [path,build] of prepared.builds)runtimeBuilds.set(path,build);
    playPresentation={surface:clone(surface),environment:clone(environment),runtimeSettings:clone(runtimeSettings),viewMode};runtimeScenePath=travel?.path||activeScenePath;editWorld=objects;objects=world;if(travel){surface=clone(travel.data.surface);environment=clone(travel.data.environment||defaultEnvironment);runtimeSettings=clone(travel.data.runtime||defaultRuntimeSettings);setView(runtimeSettings.dimension==='2d'?'2d':'3d');updateSurface();applyEnvironment();}

  const overlay=document.createElement('div');overlay.className='runtime-overlay';$('#scene-canvas-container').append(overlay);
  rebuildWorld();await Promise.all([...meshMap.values()].map(group=>group.userData.ready));await visuals.preparePhysics(objects);runtimeServices=engineOperations({particleSnapshot:visuals.particleSnapshot,material:visuals.material,materialFloat:visuals.materialFloat,spriteFrame:visuals.spriteFrame,gameplay:gameplay.gameplay,physicsOptions:gameplay.physicsOptions,listenerPosition:()=>activeCamera?.getWorldPosition(new THREE.Vector3()).toArray(),build:buildObject,remove:o=>{const group=meshMap.get(o.id);if(group){visuals.dispose(group);group.traverse(child=>child.geometry?.dispose());group.removeFromParent();}meshMap.delete(o.id);},update:applyObject,mesh:id=>meshMap.get(id),meshes:()=>[...meshMap.values()],scene:()=>scene,overlay:()=>overlay,readAsset,asset:async(name,kind)=>{const data=await (await editorRequest('/api/project?recursive=1')).json();return resolvePlayAsset(data.entries,name,kind);}});
  runtime=new BlueprintRuntime(objects,prepared.bindings,{...runtimeServices,inputAssets:prepared.inputAssets,physics:(...args)=>profiler.measure(activeProfileFrame,'물리·AI·애니메이션',()=>runtimeServices.physics(...args),'블루프린트'),updateObject:applyObject,log:v=>log(v),native:request=>nativeCall(request),trace:n=>{const el=$(`#blueprint-graph [data-node="${n.id}"]`);el?.classList.add('tracing');setTimeout(()=>el?.classList.remove('tracing'),200);},breakpoint:(n,f)=>{paused=true;const path=objects.find(o=>o.id===f.b.self)?.blueprintAsset;if(path&&path!==assetDocs.active){captureDocument();if(!assetDocs.items.has(path))assetDocs.open(path,'blueprint',f.b.root);switchingDocument=true;activateDocument(path);}const view=graphViews().find(([id])=>graphContext(graphs.blueprint,id).nodes.some(x=>x.id===n.id))?.[0]||'event';switchBlueprintView(view);selectedNode=n.id;selectedNodes=new Set([n.id]);selectedDetail={kind:'node',id:n.id};setWorkspace('blueprint');renderBlueprintGraph();renderBlueprintInspector();showBlueprintResults('debug');$('#graph-status').textContent='중단점 · '+[graphs.blueprint.name,...f.stack,nodeTitle(n,f.g)].join(' → ');updatePlayButtons();}});
  running=true;paused=false;playTime=0;runtimeFrame=null;queuedDelta=0;transform?.detach();if(selectionBox)selectionBox.visible=false;$('#play-banner').hidden=false;updatePlayButtons();
  for(const build of new Map([...runtimeBuilds.values()].map(b=>[b.token,b])).values())await nativeCall({command:'reset'},build);await runtime.start();if(!dock.visible('scene'))dock.open('scene');$('#scene-canvas').focus();notify('실행');}catch(error){log(error.message,'ERROR');await stopPlay();notify('실행 오류: '+error.message);}finally{startingPlay=false;}
}
async function stopPlay(reason='Stopped'){if(stoppingPlay||!running&&!editWorld)return;stoppingPlay=true;const started=running;running=false;try{if(started)await runtime.stop(reason);}catch(error){log(error.message,'ERROR');}runtimeServices?.dispose();runtimeServices=null;$('.runtime-overlay')?.remove();running=false;paused=false;objects=editWorld||objects;editWorld=null;if(playPresentation){({surface,environment,runtimeSettings}=playPresentation);setView(playPresentation.viewMode);updateSurface();playPresentation=null;}runtimeScenePath=null;$('#play-banner').hidden=true;rebuildWorld();applyEnvironment();selectObject(selected);updatePlayButtons();stoppingPlay=false;}
async function travelPlayWorld(owner){const request=owner.sceneRequest;if(!request||!running||runtime!==owner)return;owner.sceneRequest=null;await stopPlay('LevelTransition');await startPlay(request);if(!running)throw Error('장면 전환 준비 실패: '+request.path);log('장면 전환: '+request.path);}
let queuedDelta=0;async function tickGame(delta){if(!running||runtime.paused)return;queuedDelta=Math.min(1,queuedDelta+delta);if(runtimeFrame)return;delta=queuedDelta;queuedDelta=0;const current=runtime,profileFrame=profiler.begin();activeProfileFrame=profileFrame;runtimeFrame=(async()=>{for(const build of new Map([...runtimeBuilds.values()].map(b=>[b.token,b])).values()){const result=await profiler.measure(profileFrame,'C++ 프레임 / IPC',()=>nativeCall({command:'frame',delta,clock:{scale:current.core.scale,paused:current.core.paused}},build));if(!running||runtime!==current)return;for(const event of result.timerEvents||[])for(const b of current.bindings.filter(b=>runtimeBuilds.get(objects.find(o=>o.id===b.self)?.blueprintAsset)?.token===build.token))await current.custom(b,event);}if(!running||runtime!==current)return;await profiler.measure(profileFrame,'블루프린트',()=>current.tick(delta));playTime=current.core.time;if(resultsMode==='debug')renderBlueprintResults();await travelPlayWorld(current);})().catch(error=>{log(error.message,'ERROR');stopPlay();notify('실행 오류: '+error.message);}).finally(()=>{profiler.finish(profileFrame,{objects:current.objects.length,latentJobs:current.jobs.length,timelines:current.timelines.size});if(activeProfileFrame===profileFrame)activeProfileFrame=null;if(runtime===current)runtimeFrame=null;});}
function updatePlayButtons(){ $('#play-button').innerHTML=icon(running?(paused?'play':'pause'):'play')+(running?(paused?'계속':'일시 정지'):'실행');$('#play-button').classList.toggle('running',running);const pause=$('[data-action="pause"]');pause.disabled=!running;pause.innerHTML=icon(paused?'play':'pause');pause.ariaLabel=paused?'실행 재개':'일시 정지';pause.title=pause.ariaLabel;$('[data-action="stop"]').disabled=!running;const step=$('[data-action="run-blueprint"]');step.disabled=!running||!runtime?.pending;step.title='중단점에서 한 단계 실행';renderInspector(); }

const assets=[];
function renderAssets(){for(const browser of projectBrowsers.values())browser.refresh();}
async function openCodeExternal(path){try{const result=await (await editorRequest('/api/editor/open',{method:'POST',body:JSON.stringify({path})})).json();notify(result.editor+'에서 열었어요.');}catch(error){notify(error.message);}}
async function openProjectAsset(file){
  if(file.kind==='code'){codeHeaderPath=/\.(h|hpp)$/i.test(file.path)?file.path:file.path.replace(/\.cpp$/i,'.h');codeSourcePath=file.path.replace(/\.(?:cpp|h|hpp)$/i,'.cpp');return openCodeExternal(file.path);}
  if(running&&!gameplayTypes[file.kind]&&file.path!==activeScenePath)throw Error('실행 중에는 현재 장면과 게임플레이 진단 에셋을 열 수 있어요.');
  if(assetDocs.items.has(file.path)){activateDocument(file.path);return;}
  if(assetSuffix[file.kind]){const data=await (await editorRequest(fileUrl(file.path))).json();assetDocs.open(file.path,file.kind,data);activateDocument(file.path);return;}
  const id='asset:'+file.path;if(documents.has(id)){activateDocument(file.path);return;}const element=document.createElement('div');element.className='workspace-view asset-document';const entry={id,title:file.name,element,path:file.path};
  const toolbar=document.createElement('div');toolbar.className='document-toolbar';toolbar.textContent=file.path;element.append(toolbar);
  if(file.kind==='texture'){const img=document.createElement('img');img.src=fileUrl(file.path);img.alt=file.name;element.append(img);}
  else if(file.kind==='media'){const player=document.createElement(/\.(wav|mp3|ogg|flac)$/i.test(file.path)?'audio':'video');player.src=fileUrl(file.path);player.controls=true;player.onerror=()=>notify('브라우저 디코더가 이 파일을 재생하지 못해요.');element.append(player);}
  else if(file.kind==='model'){const button=document.createElement('button');button.textContent='장면에 배치';toolbar.append(button);button.onclick=()=>placeModel({...file,path:entry.path,name:entry.title}).catch(error=>notify(error.message));const result=await loadModel(file.path),canvas=document.createElement('canvas');element.append(canvas);const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));const world=new THREE.Scene();world.background=new THREE.Color('#252f32');world.add(new THREE.HemisphereLight(0xffffff,0x46563e,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,3);world.add(light);world.add(result.object);const bounds=new THREE.Box3().setFromObject(result.object),center=bounds.getCenter(new THREE.Vector3()),size=Math.max(...bounds.getSize(new THREE.Vector3()).toArray(),1),view=new THREE.PerspectiveCamera(45,1,.01,size*100);view.position.copy(center).add(new THREE.Vector3(size,size,size*1.5));const controls=new OrbitControls(view,canvas);controls.target.copy(center);const observer=new ResizeObserver(()=>{if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);view.aspect=canvas.clientWidth/canvas.clientHeight;view.updateProjectionMatrix();});observer.observe(element);let disposed=false;entry.dispose=()=>{disposed=true;observer.disconnect();controls.dispose();renderer.dispose();const resources=new Set();world.traverse(child=>{if(child.geometry)resources.add(child.geometry);for(const material of child.material?(Array.isArray(child.material)?child.material:[child.material]):[]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}if(child.skeleton?.boneTexture)resources.add(child.skeleton.boneTexture);});for(const resource of resources)resource.dispose();};const render=()=>{if(disposed||!element.isConnected)return;if(dock.visible(entry.id)){controls.update();renderer.render(world,view);}requestAnimationFrame(render);};requestAnimationFrame(render);}
  else if(file.text){const text=await (await editorRequest(fileUrl(file.path))).text();if(text.length>1048576)throw Error('편집 가능한 파일 크기 초과');file.kind='text';assetDocs.open(file.path,'text',text);const textarea=document.createElement('textarea');textarea.value=text;textarea.ariaLabel=file.name+' 내용';textarea.spellcheck=false;element.append(textarea);textarea.onfocus=remember;textarea.oninput=()=>{assetDocs.items.get(entry.path).data=textarea.value;changed();};}
  else throw Error('미리보기 임포터가 없는 파일: '+file.name);
  documents.set(id,element);dock.entries.set(id,entry);if(!assetDocs.items.has(file.path))assetDocs.open(file.path,file.kind,{name:file.name});activateDocument(file.path);
}
async function placeBlueprint(file){
  const owner=assetDocs.items.get(activeScenePath);if(owner?.kind!=='scene')throw Error('블루프린트를 배치할 장면을 여세요.');
  if(running)throw Error('실행을 종료한 뒤 배치하세요.');const root=assetDocs.items.get(file.path)?.data||await(await editorRequest(fileUrl(file.path))).json();if(!validBlueprint(root))throw Error('블루프린트 검증 실패');const parent=root.settings?.parentClass||'Actor',base=blueprintClasses[parent]?parent:root.native?.classes.find(c=>c.name===parent)?.base;if(!blueprintClasses[base]?.placeable)throw Error('이 클래스는 장면에 직접 배치하지 않아요.');
  if(assetDocs.items.get(owner.path)!==owner)throw Error('대상 장면이 닫혔어요.');if(running)throw Error('실행을 종료한 뒤 배치하세요.');activateDocument(owner.path);if(objects.length>=500)throw Error('장면 오브젝트 한도 초과');remember();const o={id:crypto.randomUUID(),name:root.name,kind:base==='Character'?'character':base==='Pawn'?'character':root.components.some(c=>c.type==='SpriteRenderer')?'sprite':root.components.some(c=>c.type==='MeshRenderer')?'cube':'empty',components:clone(root.components),blueprint:root.name,blueprintAsset:file.path,group:'WORLD',visible:true,position:[0,.5,0],rotation:[0,0,0],scale:[1,1,1]};objects.push(o);buildObject(o);selectObject(o.id);changed();
}

function openComponentViewport(){
  const doc=assetDocs.current;if(doc?.kind!=='blueprint')return;const id='components:'+doc.path;if(dock.entries.has(id)){dock.open(id);return;}
  const element=document.createElement('div');element.className='workspace-view component-viewport';const canvas=document.createElement('canvas');canvas.ariaLabel='블루프린트 컴포넌트 미리보기';element.append(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true}),world=new THREE.Scene(),view=new THREE.PerspectiveCamera(42,1,.1,100),group=new THREE.Group();world.background=new THREE.Color('#20242b');world.add(group,new THREE.HemisphereLight(0xeaf1ff,0x333c4e,2),new THREE.GridHelper(12,12,0x68768e,0x343d4d));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);world.add(light);view.position.set(4,3,5);const controls=new OrbitControls(view,canvas);controls.target.set(0,.5,0);controls.update();
  const observer=new ResizeObserver(()=>{if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);view.aspect=canvas.clientWidth/canvas.clientHeight;view.updateProjectionMatrix();});observer.observe(element);let signature='',disposed=false;
  const clear=()=>{for(const child of [...group.children]){child.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});group.remove(child);}};
  const frame=()=>{if(disposed)return;if(dock.visible('components:'+doc.path)){const next=JSON.stringify(doc.data.components);if(next!==signature){signature=next;clear();for(const c of doc.data.components){const p={...componentDefaults(c.type),...c.properties};if(p.enabled===false||p.visible===false)continue;let geometry;if(c.type==='MeshRenderer')geometry=new THREE.BoxGeometry(1,1,1);if(c.type==='BoxCollider')geometry=new THREE.BoxGeometry(...p.extent.map(v=>Math.max(.01,v*2)));if(c.type==='CapsuleCollider')geometry=new THREE.CapsuleGeometry(p.radius,Math.max(.01,p.height-p.radius*2),8,16);if(geometry){const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:c.type.includes('Collider')?'#83d8ac':'#a2b7dd',wireframe:c.type.includes('Collider'),roughness:.5}));object.userData.component=c.id;object.position.fromArray(p.center||[0,.5,0]);group.add(object);}}const t=doc.data.components.find(c=>c.type==='Transform')?.properties;if(t){group.position.fromArray(t.position);group.rotation.set(...t.rotation.map(THREE.MathUtils.degToRad));group.scale.fromArray(t.scale);}}controls.update();renderer.render(world,view);}requestAnimationFrame(frame);};requestAnimationFrame(frame);
  canvas.onclick=e=>{const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),view);const hit=ray.intersectObjects(group.children)[0];if(hit){selectedDetail={kind:'component',id:hit.object.userData.component};renderBlueprintInspector();renderBlueprintSidebar();}};
  dock.add({id,title:'컴포넌트 뷰포트',element,dispose:()=>{disposed=true;observer.disconnect();controls.dispose();renderer.dispose();clear();}},dock.leaves()[0],'center');
}
async function placeModel(file){if(assetDocs.current?.kind!=='scene')activateDocument(activeScenePath);const owner=assetDocs.current;if(owner?.kind!=='scene')throw Error('모델을 배치할 장면을 여세요.');if(running)throw Error('실행을 종료한 뒤 배치하세요.');await loadModel(file.path);if(assetDocs.items.get(owner.path)!==owner)throw Error('모델을 배치할 장면이 닫혔어요.');if(running)throw Error('실행을 종료한 뒤 배치하세요.');activateDocument(owner.path);if(objects.length>=500)throw Error('장면 오브젝트 한도 초과');remember();const object={id:crypto.randomUUID(),name:file.name,asset:file.path,kind:'model',group:'WORLD',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};objects.push(object);buildObject(object);selectObject(object.id);changed();setWorkspace('scene');}
function queueFiles(files,immediate=false){if(importing)return notify('가져오기가 끝난 뒤 다시 놓아 주세요.');for(const item of files){if(pendingFiles.length>=100){notify('한 번에 100개 파일까지 가져올 수 있어요.');break;}const file=item.file||item;pendingFiles.push({file,relativePath:item.relativePath,name:file.name,kind:fileKind(file.name),size:file.size||0});}renderImportQueue();if(immediate)confirmImport();else if(!$('#import-dialog').open)$('#import-dialog').showModal();}
function renderImportQueue(){$('#import-file-list').innerHTML=pendingFiles.map((f,i)=>`<div class="import-file"><div class="file-details"><strong>${escapeHtml(f.name)}</strong><small>${(f.size/1024/1024).toFixed(2)} MB</small></div><span class="import-state">${f.state||'대기'}</span><button class="remove-file" data-remove-file="${i}" aria-label="${escapeHtml(f.name)} 목록에서 삭제">×</button></div>`).join('');$('#confirm-import').disabled=!pendingFiles.length;}
async function confirmImport(){if(importing)return;importing=true;const button=$('#confirm-import');button.disabled=true;button.textContent='가져오는 중…';let count=0;const failed=[];try{for(const f of pendingFiles){try{if(f.size>104857600)throw Error('파일당 100 MB 제한 초과');let folder=focusedProjectBrowser()?.folder||'Assets';const relative=f.relativePath||f.file.webkitRelativePath;if(relative){const parts=relative.split('/');parts.pop();folder+=(folder?'/':'')+parts.join('/');await editorRequest('/api/folder',{method:'POST',body:JSON.stringify({path:folder})});}await editorRequest('/api/import?'+new URLSearchParams({folder,name:f.name}),{method:'POST',body:f.file});count++;}catch(error){f.state='실패';failed.push(f);log(f.name+': '+error.message,'ERROR');}}pendingFiles=failed;renderImportQueue();await Promise.all([...projectBrowsers.values()].map(browser=>browser.refresh()));if(!failed.length)$('#import-dialog').close();else if(!$('#import-dialog').open)$('#import-dialog').showModal();notify(count+'개 파일 가져옴');}finally{importing=false;button.textContent='가져오기';button.disabled=!pendingFiles.length;$('#file-input').value='';$('#folder-input').value='';}}

let nodeCounter=0,pendingPin=null;
const graphs={
  material:{nodes:[{id:'color',title:'기본 색상',kind:'value',x:.04,y:24,body:'color',output:'색상'},{id:'rough',title:'거칠기',kind:'value',x:.04,y:132,body:'rough',output:'값'},{id:'surface',title:'Standard surface',kind:'output',x:.62,y:48,inputs:['Base color','Roughness','Metallic']}],edges:[['color','surface',0],['rough','surface',1]]},
  blueprint:clone(savedBlueprint||defaultBlueprint)
};
graphs.blueprint.functions??=[];graphs.blueprint.macros??=[];graphs.blueprint.construction??=clone(defaultBlueprint.construction);graphs.blueprint.comments??=[];graphs.blueprint.dispatchers??=[];graphs.blueprint.interfaces??=[];
const currentGraph=()=>graphContext(graphs.blueprint,blueprintView);
function switchBlueprintView(view){
  corePreview.values.clear();blueprintView=view;pendingPin=null;selectedNode=view==='construction'?'construction':null;selectedNodes.clear();selectedDetail=view==='event'?{kind:'blueprint'}:view==='construction'?{kind:'node',id:'construction'}:{kind:'definition',id:view};blueprintPan={x:30,y:30};renderBlueprintSidebar();renderBlueprintGraph();renderBlueprintInspector();renderNativeRegistry();
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
  const modelX=(x-blueprintPan.x)/blueprintZoom,modelY=(y-blueprintPan.y)/blueprintZoom;blueprintZoom=Math.min(1.8,Math.max(.01,value));blueprintPan={x:x-modelX*blueprintZoom,y:y-modelY*blueprintZoom};drawBlueprintWires();$('#graph-zoom').textContent=Math.round(blueprintZoom*100)+'%';
}
function openCollapse(kind,create=false){creatingDefinition=create;collapseKind=kind;$('#collapse-title').textContent=(kind==='function'?'함수':'매크로')+(create?' 추가':'로 묶기');$('#collapse-name').value=kind==='function'?'NewFunction':'NewMacro';$('#collapse-dialog').showModal();$('#collapse-name').select();}
function confirmCollapse(){
  const root=graphs.blueprint,graph=currentGraph();if((root[collapseKind==='function'?'functions':'macros']||[]).length>=50)return notify('함수와 매크로는 각각 50개까지 만들 수 있어요.');
  const before=snapshot(),result=creatingDefinition?makeDefinition(root,collapseKind,$('#collapse-name').value):collapseNodes(root,graph,[...selectedNodes],collapseKind,$('#collapse-name').value);
  if(!result.ok)return notify(result.reason);future=[];history.push(before);if(history.length>undoLimit)history.shift();pendingPin=null;$('#collapse-dialog').close();if(creatingDefinition)switchBlueprintView(result.definition.id);else{selectedNode=result.call.id;selectedNodes=new Set([selectedNode]);selectedDetail={kind:'node',id:selectedNode};renderBlueprintSidebar();renderBlueprintGraph();renderBlueprintInspector();}changed();notify(result.definition.name+' 생성됨');
}
function focusGraph(selectionOnly=false){const c=$('#blueprint-graph'),nodes=$$('.bp-node',c).filter(n=>!selectionOnly||!selectedNodes.size||selectedNodes.has(n.dataset.node)),left=nodes.length?Math.min(...nodes.map(n=>n.offsetLeft)):0,top=nodes.length?Math.min(...nodes.map(n=>n.offsetTop)):0,right=nodes.length?Math.max(...nodes.map(n=>n.offsetLeft+n.offsetWidth)):300,bottom=nodes.length?Math.max(...nodes.map(n=>n.offsetTop+n.offsetHeight)):150;setGraphZoom(Math.min((c.clientWidth-40)/(right-left),(c.clientHeight-40)/(bottom-top),1));blueprintPan={x:(c.clientWidth-(right-left)*blueprintZoom)/2-left*blueprintZoom,y:(c.clientHeight-(bottom-top)*blueprintZoom)/2-top*blueprintZoom};drawBlueprintWires();}
function renderGraph(name){
  if(name==='blueprint')return renderBlueprintGraph();if(name!=='material'||assetDocs.current?.kind!=='material')return;
  if(!materialEditor)materialEditor=new MaterialEditor($('#material-graph'),()=>assetDocs.current,{before:remember,change:()=>{graphs.material=assetDocs.current.data.graph;changed();updateSurface();renderAssetInspector();},error:notify,files:()=>projectAssetFiles,undo,redo,view:queueRecovery});else materialEditor.render();
}
function drawWires(){drawBlueprintWires();materialEditor?.drawWires();}
function connectPin(button){if(button.closest('#blueprint-graph'))connectBlueprintPin(button);}
async function traceBlueprint(){if(running&&runtime.pending){runtime.continue(true);paused=false;updatePlayButtons();}else await startPlay();}
function preset(name){remember();const surface=editingSurface(),values={moss:['#889878',.72,.08],copper:['#bb7959',.23,.93],ceramic:['#ded8c6',.24,.02],glass:['#91bfc6',.08,.30]}[name];[surface.color,surface.roughness,surface.metalness]=values;$$('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));updateSurface();changed();}

function renderBlueprintGraph(){
  for(const [id] of timelineWindows)if(!graphs.blueprint.nodes.some(n=>'timeline:'+n.id===id)){dock?.remove(id);timelineWindows.delete(id);}
  const graph=currentGraph(),container=$('#blueprint-graph');
  selectedNodes=new Set([...selectedNodes].filter(id=>graph.nodes.some(n=>n.id===id)));updateGraphHeading();
  const inlineValue=(p,n,direction)=>{if(direction!=='in'||p.array||!['float','int','bool','string'].includes(p.type)||graph.edges.some(e=>e.to.node===n.id&&e.to.pin===p.id))return '';const value=defaultInputValue(n,p);return `<input class="bp-inline-value" data-inline-node="${n.id}" data-inline-pin="${p.id}" type="${p.type==='bool'?'checkbox':p.type==='string'?'text':'number'}" ${p.type==='bool'?(value?'checked':''):`value="${escapeHtml(value)}"`} ${p.type==='float'?'step=".1"':p.type==='int'?'step="1"':'maxlength="1000"'} aria-label="${escapeHtml(nodeTitle(n,graph)+' '+p.label+' 값')}">`;};
  const pinMarkup=(p,n,direction)=>`<span class="pin-label" style="--pin-color:${typeColors[p.type]||typeColors.any}">${direction==='out'&&!p.header?escapeHtml(p.label):''}<button class="pin ${direction} ${p.type==='exec'?'exec':''} ${p.array?'array':''} ${pendingPin?.name==='blueprint'&&pendingPin.id===n.id&&pendingPin.pin===p.id?'pending':''}" title="${escapeHtml(p.label+' · '+p.type+(p.array?'[]':''))}" data-pin="${direction}" data-node-id="${n.id}" data-pin-id="${p.id}" aria-label="${escapeHtml(nodeTitle(n,graph)+' '+p.label+' '+(direction==='out'?'출력':'입력')+' 핀')}"></button>${direction==='in'?escapeHtml(p.label):''}${inlineValue(p,n,direction)}</span>`;
  $('.graph-nodes',container).innerHTML=graph.nodes.map(n=>{const spec=catalog.find(s=>s.key===n.key)||nativeEntries(graphs.blueprint).find(s=>s.key===n.key&&s.nativeId===n.nativeId),inputs=effectivePins(n,'in',graph),allOutputs=effectivePins(n,'out',graph),headerPin=spec?.kind==='event'?allOutputs.find(p=>p.type==='exec'):n.key==='getVariable'?allOutputs[0]:null,outputs=allOutputs.filter(p=>p!==headerPin),caption=n.key==='callFunction'?'함수':n.key==='callMacro'?'매크로':n.key.endsWith('Input')||n.key.endsWith('Output')?'그래프 인터페이스':spec?.ko||(n.symbolId?'시그니처':'변수 ')+(n.key==='getVariable'?'읽기':'쓰기');return `<div class="graph-node bp-node ${spec?.kind||'function'} ${n.key} ${n.enabled===false?'disabled-node':''} ${n.breakpoint?'breakpoint':''} ${selectedNodes.has(n.id)?'selected':''}" data-node="${n.id}" style="left:${n.position.x}px;top:${n.position.y}px;width:${Math.max(n.key==='timeline'?350:230,Math.max(0,...inputs.map(p=>p.label.length))*6+Math.max(0,...outputs.map(p=>p.label.length))*6+75)}px">${n.comment?`<div class="node-comment-bubble" title="${escapeHtml(n.comment)}">${escapeHtml(n.comment)}</div>`:''}<div class="node-title"><span><strong>${escapeHtml(nodeTitle(n,graph))}</strong><small>${escapeHtml(caption)}</small></span>${headerPin?pinMarkup({...headerPin,header:true},n,'out'):icon('nodes')}</div><div class="node-body">${Array.from({length:Math.max(inputs.length,outputs.length)},(_,i)=>`<div class="pin-row">${inputs[i]?pinMarkup(inputs[i],n,'in'):'<span></span>'}${outputs[i]?pinMarkup(outputs[i],n,'out'):'<span></span>'}</div>`).join('')}</div></div>`;}).join('');
  $$('.node-title',container).forEach(header=>header.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('.pin'))return;const el=header.parentElement,n=graph.nodes.find(n=>n.id===el.dataset.node),startX=e.clientX,startY=e.clientY;
    if(e.ctrlKey||e.metaKey||e.shiftKey){if(selectedNodes.has(n.id))selectedNodes.delete(n.id);else selectedNodes.add(n.id);}else if(!selectedNodes.has(n.id))selectedNodes=new Set([n.id]);
    selectedNode=n.id;selectedDetail={kind:'node',id:n.id};renderBlueprintInspector();updateGraphHeading();$$('.bp-node',container).forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));
    const moving=graph.nodes.filter(n=>selectedNodes.has(n.id)).map(n=>({n,x:n.position.x,y:n.position.y}));let recorded=false;header.setPointerCapture(e.pointerId);
    const move=ev=>{if(!recorded){if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<=4)return;remember();recorded=true;}let dx=(ev.clientX-startX)/blueprintZoom,dy=(ev.clientY-startY)/blueprintZoom;if(moving.length){dx=Math.max(-10000-Math.min(...moving.map(m=>m.x)),Math.min(10000-Math.max(...moving.map(m=>m.x)),dx));dy=Math.max(-10000-Math.min(...moving.map(m=>m.y)),Math.min(10000-Math.max(...moving.map(m=>m.y)),dy));}for(const m of moving){m.n.position={x:m.x+dx,y:m.y+dy};const element=$(`[data-node="${m.n.id}"]`,container);element.style.left=m.n.position.x+'px';element.style.top=m.n.position.y+'px';}drawBlueprintWires();};
    const up=()=>{if(recorded)changed();header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',up);header.removeEventListener('pointercancel',up);};header.addEventListener('pointermove',move);header.addEventListener('pointerup',up);header.addEventListener('pointercancel',up);
  }));
  $$('.bp-node.callFunction .node-title,.bp-node.callMacro .node-title',container).forEach(header=>header.addEventListener('dblclick',()=>switchBlueprintView(graph.nodes.find(n=>n.id===header.parentElement.dataset.node).definitionId)));
  $$('.bp-node.timeline',container).forEach(el=>el.addEventListener('dblclick',e=>{if(!e.target.closest('.pin'))openTimeline(el.dataset.node);}));
  renderGraphComments();$('#graph-status').textContent=`노드 ${graph.nodes.length} · 연결 ${graph.edges.length}`;drawBlueprintWires();
}
function openTimeline(id=selectedNode){
  const root=graphs.blueprint,node=root.nodes.find(n=>n.id===id);if(!node||node.key!=='timeline')return;
  const doc=assetDocs.current;const windowId='timeline:'+doc.path+':'+id,existing=timelineWindows.get(windowId);if(existing){existing.render();dock.open(windowId);return;}
  const element=document.createElement('div');const editor=new TimelineEditor(element,()=>doc.data.nodes.find(n=>n.id===id),{before:remember,error:notify,change:()=>{changed();renderBlueprintGraph();if(workspace==='blueprint')renderBlueprintInspector();},removePin:pin=>{root.edges=root.edges.filter(e=>!(e.from.node===id&&(e.from.pin===pin||e.from.pin.startsWith(pin+'.'))));renderBlueprintGraph();}});
  timelineWindows.set(windowId,editor);dock.add({id:windowId,title:node.title||'Timeline',element},dock.leaves().find(l=>l.tabs.includes('blueprint'))||dock.leaves()[0]);
}
function createViewportWindow(target){
  const id='viewport:'+crypto.randomUUID(),element=document.createElement('div');element.className='workspace-view';const content=document.createElement('div');content.className='extra-viewport';element.append(content);const canvas=document.createElement('canvas'),selector=document.createElement('select');selector.ariaLabel='추가 뷰포트 방향';selector.innerHTML='<option value="3d">Perspective</option><option value="top">Top</option><option value="front">Front</option>';content.append(canvas,selector);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=mainRenderer.toneMapping;renderer.toneMappingExposure=mainRenderer.toneMappingExposure;renderer.shadowMap.enabled=true;const perspective=camera.clone(),ortho=new THREE.OrthographicCamera(-7,7,7,-7,.1,100),view={id,renderer,camera:perspective,controls:new OrbitControls(perspective,canvas),navigation:new NavigationHistory()};view.controls.target.copy(orbit.target);view.controls.enableDamping=true;
  const recordView=()=>{if(!view.navigating)view.navigation.push({mode:selector.value,position:view.camera.position.toArray(),target:view.controls.target.toArray(),zoom:view.camera.zoom});};view.controls.addEventListener('end',recordView);recordView();
  const resizeView=()=>{const w=content.clientWidth,h=content.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const c=view.camera;if(c.isOrthographicCamera){c.left=-7*w/h;c.right=7*w/h;}else c.aspect=w/h;c.updateProjectionMatrix();};
  selector.onchange=()=>{view.controls.dispose();view.camera=selector.value==='3d'?perspective:ortho;if(selector.value!=='3d'){ortho.position.set(...(selector.value==='top'?[0,16,.001]:[0,0,16]));ortho.lookAt(0,0,0);}view.controls=new OrbitControls(view.camera,canvas);view.controls.enableRotate=selector.value==='3d';view.controls.enableDamping=true;view.controls.update();view.controls.addEventListener('end',recordView);resizeView();recordView();};
  const observer=new ResizeObserver(resizeView);observer.observe(content);extraViewports.push(view);dock.add({id,kind:'viewport',title:'뷰포트 '+extraViewports.length,element,navigateHistory:direction=>{const state=view.navigation.navigate(direction);if(!state)return false;view.navigating=true;selector.value=state.mode;selector.onchange();view.camera.position.fromArray(state.position);view.camera.zoom=state.zoom;view.controls.target.fromArray(state.target);view.controls.update();view.camera.updateProjectionMatrix();view.navigating=false;return true;},dispose:()=>{observer.disconnect();view.controls.dispose();renderer.dispose();extraViewports.splice(extraViewports.indexOf(view),1);}},target||dock.leaves()[0],'right');return view;
}
function addGraphComment(){
  const graph=currentGraph();if((graph.comments||[]).length>=100)return notify('주석은 그래프마다 100개까지 만들 수 있어요.');remember();const c=makeComment(graph,[...selectedNodes],lastGraphPointer);graph.comments=[...(graph.comments||[]),c];selectedNode=null;selectedNodes.clear();selectedDetail={kind:'comment',id:c.id};renderBlueprintGraph();renderBlueprintInspector();drawBlueprintWires();changed();$('.bp-detail-group textarea')?.focus();
}
function renderGraphComments(){
  const graph=currentGraph(),container=$('#blueprint-graph');$('.graph-comments',container).innerHTML=(graph.comments||[]).map(c=>`<div class="graph-comment ${selectedDetail.kind==='comment'&&selectedDetail.id===c.id?'selected':''}" data-comment="${c.id}" style="left:${c.position.x}px;top:${c.position.y}px;width:${c.size.width}px;height:${c.size.height}px;--comment-color:${c.color};font-size:${c.fontSize}px"><div class="comment-title">${escapeHtml(c.text)}</div><button class="comment-resize" aria-label="주석 크기 조절"></button></div>`).join('');
  $$('.graph-comment',container).forEach(el=>{
    const c=graph.comments.find(c=>c.id===el.dataset.comment);
    const start=e=>{if(e.button!==0)return;e.stopPropagation();const resizing=e.target.closest('.comment-resize'),origin=clone(c),x=e.clientX,y=e.clientY;selectedDetail={kind:'comment',id:c.id};selectedNode=null;selectedNodes.clear();renderBlueprintInspector();$$('.bp-node',container).forEach(n=>n.classList.remove('selected'));$$('.graph-comment',container).forEach(n=>n.classList.toggle('selected',n===el));updateGraphHeading();const moving=c.moveNodes&&!resizing?graph.nodes.filter(n=>n.position.x>=c.position.x&&n.position.x<c.position.x+c.size.width&&n.position.y>=c.position.y&&n.position.y<c.position.y+c.size.height).map(n=>({n,position:{...n.position}})):[];let recorded=false;const handle=e.currentTarget;handle.setPointerCapture(e.pointerId);
      const move=ev=>{if(!recorded){if(Math.hypot(ev.clientX-x,ev.clientY-y)<4)return;remember();recorded=true;c.nodeIds=moving.map(m=>m.n.id);}let dx=(ev.clientX-x)/blueprintZoom,dy=(ev.clientY-y)/blueprintZoom;
        if(resizing){c.size.width=Math.min(10000,Math.max(120,origin.size.width+dx));c.size.height=Math.min(10000,Math.max(80,origin.size.height+dy));el.style.width=c.size.width+'px';el.style.height=c.size.height+'px';}
        else{if(moving.length){dx=Math.max(-10000-Math.min(...moving.map(m=>m.position.x)),Math.min(10000-Math.max(...moving.map(m=>m.position.x)),dx));dy=Math.max(-10000-Math.min(...moving.map(m=>m.position.y)),Math.min(10000-Math.max(...moving.map(m=>m.position.y)),dy));}c.position.x=Math.max(-10000,Math.min(10000,origin.position.x+dx));c.position.y=Math.max(-10000,Math.min(10000,origin.position.y+dy));el.style.left=c.position.x+'px';el.style.top=c.position.y+'px';for(const m of moving){m.n.position={x:m.position.x+dx,y:m.position.y+dy};const n=$(`[data-node="${m.n.id}"]`,container);n.style.left=m.n.position.x+'px';n.style.top=m.n.position.y+'px';}}drawBlueprintWires();};
      const up=()=>{if(recorded){changed();renderBlueprintInspector();}handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    };$('.comment-title',el).addEventListener('pointerdown',start);$('.comment-resize',el).addEventListener('pointerdown',start);$('.comment-title',el).addEventListener('dblclick',()=>{$('[data-detail-field="text"]')?.focus();$('[data-detail-field="text"]')?.select();});
  });
}
function drawBlueprintWires(){
  const container=$('#blueprint-graph');if(!container.clientWidth)return;$('#graph-zoom').textContent=Math.round(blueprintZoom*100)+'%';const graph=currentGraph(),rect=container.getBoundingClientRect();let width=container.clientWidth/blueprintZoom,height=container.clientHeight/blueprintZoom;
  $$('.bp-node',container).forEach(n=>{width=Math.max(width,n.offsetLeft+n.offsetWidth+45);height=Math.max(height,n.offsetTop+n.offsetHeight+45);});
  const plane=$('.graph-plane',container),nodes=$('.graph-nodes',container),svg=$('.node-wires',container);plane.style.width=container.clientWidth+'px';plane.style.height=container.clientHeight+'px';for(const el of [nodes,svg,$('.graph-comments',container)]){el.style.width=width+'px';el.style.height=height+'px';el.style.transform=`translate(${blueprintPan.x}px,${blueprintPan.y}px) scale(${blueprintZoom})`;}
  const wires=graph.edges.map((e,index)=>{const out=$(`[data-node-id="${e.from.node}"][data-pin-id="${e.from.pin}"][data-pin="out"]`,container),input=$(`[data-node-id="${e.to.node}"][data-pin-id="${e.to.pin}"][data-pin="in"]`,container);if(!out||!input)return '';const a=out.getBoundingClientRect(),b=input.getBoundingClientRect(),x1=(a.left+a.width/2-rect.left-blueprintPan.x)/blueprintZoom,y1=(a.top+a.height/2-rect.top-blueprintPan.y)/blueprintZoom,x2=(b.left+b.width/2-rect.left-blueprintPan.x)/blueprintZoom,y2=(b.top+b.height/2-rect.top-blueprintPan.y)/blueprintZoom,bend=Math.max(50,Math.abs(x2-x1)*.45),node=graph.nodes.find(n=>n.id===e.from.node),type=effectivePins(node,'out',graph).find(p=>p.id===e.from.pin)?.type;return `<path data-wire="${index}" d="M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}" fill="none" stroke="${typeColors[type]||typeColors.any}" stroke-width="2" opacity=".85"/>`;}).join('');svg.innerHTML=wires;
}
function connectBlueprintPin(button){
  const direction=button.dataset.pin,endpoint={node:button.dataset.nodeId,pin:button.dataset.pinId};
  if(!pendingPin||pendingPin.name!=='blueprint'||(pendingPin.direction||'out')===direction){
    pendingPin={name:'blueprint',id:endpoint.node,pin:endpoint.pin,direction};$$('.pin.pending').forEach(p=>p.classList.remove('pending'));button.classList.add('pending');return;
  }
  const other={node:pendingPin.id,pin:pendingPin.pin},from=direction==='in'?other:endpoint,to=direction==='in'?endpoint:other,graph=currentGraph(),result=planConnection(graph,from,to);
  if(!result.ok)return notify(result.reason);remember();connectAutomatic(graph,from,to);pendingPin=null;renderBlueprintGraph();renderBlueprintInspector();changed();
}
const normalizeSearch=s=>s.toLowerCase().replace(/[\s_-]/g,'');
function paletteEntries(){return [...(blueprintView==='event'?projectAssetFiles.filter(f=>f.kind==='inputaction').map(f=>({...catalog.find(s=>s.key==='inputAction'),title:assetTitle(f.path),inputAsset:f.path})):[]),...catalog.filter(s=>blueprintView==='event'?s.key!=='construction':blueprintView==='construction'?s.kind!=='event'&&s.key!=='timeline':s.kind!=='event'&&s.key!=='timeline'&&(!(graphs.blueprint.functions||[]).some(d=>d.id===blueprintView)||!['delay','retriggerDelay'].includes(s.key))),...['functions','macros'].flatMap(kind=>(graphs.blueprint[kind]||[]).filter(d=>d.id!==blueprintView&&!(kind==='macros'&&graphs.blueprint.functions.some(d=>d.id===blueprintView))).map(d=>({key:kind==='functions'?'callFunction':'callMacro',definitionId:d.id,title:d.name,ko:kind==='functions'?'함수 호출':'매크로 호출',group:kind==='functions'?'함수':'매크로',keywords:d.name+' function macro 함수 매크로',inputs:d.inputs,outputs:d.outputs}))),...nativeEntries(graphs.blueprint).filter(s=>s.key!=='nativeEvent'||blueprintView==='event'),...symbolEntries(),...graphs.blueprint.variables.flatMap(v=>[{key:'getVariable',variableId:v.id,title:'Get '+v.name,ko:v.name+' 읽기',group:'변수',keywords:v.name+' get 읽기 변수',inputs:[],outputs:[{id:'value',type:v.type,array:v.container==='array'}]},{key:'setVariable',variableId:v.id,title:'Set '+v.name,ko:v.name+' 쓰기',group:'변수',keywords:v.name+' set 쓰기 변수',inputs:[{id:'exec',type:'exec',array:false},{id:'value',type:v.type,array:v.container==='array'}],outputs:[]}])];}
function renderPalette(){
  const query=normalizeSearch($('#node-search').value),graph=currentGraph(),outNode=pendingPin?.name==='blueprint'&&graph.nodes.find(n=>n.id===pendingPin.id),out=outNode&&effectivePins(outNode,pendingPin.direction||'out',graph).find(p=>p.id===pendingPin.pin);let group='';
  $('#palette-results').innerHTML=paletteEntries().filter(s=>normalizeSearch(s.title+' '+s.ko+' '+s.key+' '+s.keywords).includes(query)&&(!out||!$('#context-sensitive').checked||(pendingPin.direction==='in'?s.outputs:s.inputs).some(p=>pendingPin.direction==='in'?conversionFor(p,out):conversionFor(out,p)))).map(s=>{const heading=group!==s.group?`<div class="palette-group">${s.group}</div>`:'';group=s.group;return heading+`<button class="palette-result ${s.kind||''}" data-spawn-node="${s.key}" ${s.inputAsset?`data-input-asset="${escapeHtml(s.inputAsset)}"`:''} ${s.variableId?`data-variable-id="${s.variableId}"`:''} ${s.definitionId?`data-definition-id="${s.definitionId}"`:''} ${s.nativeId?`data-native-id="${escapeHtml(s.nativeId)}"`:''} ${s.symbolId?`data-symbol-id="${s.symbolId}"`:''}><span class="palette-dot"></span><span><strong>${escapeHtml(s.title)}</strong><small>${escapeHtml(s.ko)}</small></span><span>${s.group==='이벤트'?'Event':''}</span></button>`;}).join('')||'<p class="inspector-note" style="padding:12px">검색 결과 없음</p>';
  $('#palette-footer').textContent=out?`${out.type}${out.array?'[]':''}`:$('#palette-results .palette-result')?$$('#palette-results .palette-result').length+'개':'';
}
function openNodePalette(x,y){
  const graph=$('#blueprint-graph'),rect=graph.getBoundingClientRect();palettePosition={x:(x-rect.left-blueprintPan.x)/blueprintZoom,y:(y-rect.top-blueprintPan.y)/blueprintZoom};
  const panel=$('#node-palette');panel.hidden=false;panel.style.left=Math.max(8,Math.min(x,innerWidth-330))+'px';panel.style.top=Math.max(8,Math.min(y,innerHeight-445))+'px';$('#node-search').value='';renderPalette();$('#node-search').focus();
}
function spawnBlueprintNode(key,variableId,definitionId,nativeId,symbolId,inputAsset){
  const graph=currentGraph();if(graph.nodes.length>=1000)return notify('프로토타입은 그래프마다 노드 1000개까지 편집할 수 있어요.');remember();const n=makeNode(key,Math.max(-10000,Math.min(10000,palettePosition.x)),Math.max(-10000,Math.min(10000,palettePosition.y)),variableId);if(definitionId)n.definitionId=definitionId;if(nativeId)n.nativeId=nativeId;if(symbolId)n.symbolId=symbolId;if(inputAsset){n.options={action:inputAsset};n.title=assetTitle(inputAsset);n.valueType=inputActionTypes.get(inputAsset)||'bool';}graph.nodes.push(n);
  if(pendingPin?.name==='blueprint'){const endpoint={node:pendingPin.id,pin:pendingPin.pin},reverse=pendingPin.direction==='in',pin=effectivePins(n,reverse?'out':'in',graph).find(p=>planConnection(graph,reverse?{node:n.id,pin:p.id}:endpoint,reverse?endpoint:{node:n.id,pin:p.id}).ok);if(pin)connectAutomatic(graph,reverse?{node:n.id,pin:pin.id}:endpoint,reverse?endpoint:{node:n.id,pin:pin.id});}
  pendingPin=null;selectedNode=n.id;selectedDetail={kind:'node',id:n.id};selectedNodes=new Set([n.id]);$('#node-palette').hidden=true;renderBlueprintGraph();renderBlueprintInspector();drawBlueprintWires();changed();
}
let blueprintSidebarSearch='';const blueprintSidebarClosed=new Set();
function renderBlueprintSidebar(){
  const g=graphs.blueprint,link=(view,label,detail='')=>`<button class="bp-graph-link ${blueprintView===view?'active':''}" data-graph-view="${view}">${icon('nodes')}<span>${escapeHtml(label)}</span><small>${detail}</small></button>`;
  $('#blueprint-sidebar').innerHTML=`<div class="bp-section-heading">My Blueprint</div><div class="bp-section-heading">그래프<button class="icon-button" data-action="blueprint-defaults" aria-label="클래스 기본값">${icon('sliders')}</button></div><button class="bp-graph-link" data-action="component-viewport">${icon('cube')}<span>컴포넌트 뷰포트</span></button>${link('event','이벤트 그래프')}${link('construction','Construction Script')}<div class="bp-section-heading">함수<button class="icon-button" data-action="new-function" aria-label="함수 추가">${icon('plus')}</button></div>${g.functions.map(d=>link(d.id,d.name)).join('')}<div class="bp-section-heading">매크로<button class="icon-button" data-action="new-macro" aria-label="매크로 추가">${icon('plus')}</button></div>${g.macros.map(d=>link(d.id,d.name)).join('')}${symbolSidebar()}${g.native?`<div class="bp-section-heading">C++<button class="icon-button" data-action="open-code" aria-label="C++ 공개 헤더 편집">${icon('code')}</button></div>`:''}${(g.native?.classes||[]).map(c=>`<button class="bp-native-class" data-native-class="${escapeHtml(c.name)}">${icon('code')}<span>${escapeHtml(c.name)}</span></button>`).join('')}<div class="bp-section-heading">컴포넌트<button class="icon-button" data-action="new-component" aria-label="블루프린트 컴포넌트 추가">${icon('plus')}</button></div>${g.components.map(c=>`<button class="bp-component ${selectedDetail.kind==='component'&&selectedDetail.id===c.id?'active':''}" data-select-component="${c.id}">${icon(c.type.includes('Collider')?'grid':c.type==='Transform'?'move':'cube')}<span>${escapeHtml(c.name)}</span></button>`).join('')}<div class="bp-section-heading">변수<button class="icon-button" data-action="new-variable" aria-label="변수 추가">${icon('plus')}</button></div>${g.variables.map(v=>`<div data-drag-variable="${v.id}" title="${escapeHtml(v.name+' · '+v.type+(v.container==='array'?'[]':''))}" class="bp-variable ${v.container==='array'?'array':''} ${selectedDetail.kind==='variable'&&v.id===selectedDetail.id?'selected':''}"><span class="variable-type" style="background:${typeColors[v.type]}"></span><button data-select-variable="${v.id}">${escapeHtml(v.name)}${v.container==='array'?'[]':''}</button><button class="variable-get" data-variable-node="getVariable" data-variable-id="${v.id}" aria-label="${escapeHtml(v.name)} 읽기 노드 추가">Get</button><button class="variable-get" data-variable-node="setVariable" data-variable-id="${v.id}" aria-label="${escapeHtml(v.name)} 쓰기 노드 추가">Set</button></div>`).join('')}`;
  const sidebar=$('#blueprint-sidebar'),fragment=document.createDocumentFragment();let content;
  for(const child of [...sidebar.children]){if(child.classList.contains('bp-section-heading')){
    if(child.textContent.trim()==='My Blueprint')continue;
    const key=child.firstChild.textContent.trim(),details=document.createElement('details'),summary=document.createElement('summary');details.className='bp-sidebar-section';details.dataset.section=key;details.open=!blueprintSidebarClosed.has(key);summary.append(...child.childNodes);content=document.createElement('div');content.className='bp-section-content';details.append(summary,content);details.ontoggle=()=>{if(blueprintSidebarSearch)return;if(details.open)blueprintSidebarClosed.delete(key);else blueprintSidebarClosed.add(key);};fragment.append(details);
  }else if(content)content.append(child);}
  sidebar.replaceChildren();const search=document.createElement('input');search.type='search';search.placeholder='블루프린트 검색';search.ariaLabel='블루프린트 멤버 검색';search.className='bp-member-search';search.value=blueprintSidebarSearch;search.oninput=()=>{blueprintSidebarSearch=search.value;filterBlueprintSidebar();};sidebar.append(search,fragment);filterBlueprintSidebar();

}
function filterBlueprintSidebar(){
  const q=normalizeSearch(blueprintSidebarSearch);$$('#blueprint-sidebar details').forEach(section=>{let visible=0;$$('.bp-section-content > *',section).forEach(row=>{const match=!q||normalizeSearch(row.textContent+' '+(row.title||'')).includes(q);row.hidden=!match;if(match)visible++;});section.hidden=!!q&&!visible;if(q)section.open=true;else section.open=!blueprintSidebarClosed.has(section.dataset.section);});
}
function finishVariableDrop(variableId,target,position,mode){
  const graph=currentGraph(),candidate={...graph,nodes:clone(graph.nodes),edges:clone(graph.edges)},result=dropVariable(candidate,variableId,target,position,mode);if(!result.ok)return notify(result.reason);
  remember();graph.nodes=candidate.nodes;graph.edges=candidate.edges;selectedNode=result.node.id;selectedNodes=new Set([selectedNode]);selectedDetail={kind:'node',id:selectedNode};pendingPin=null;renderBlueprintGraph();renderBlueprintInspector();changed();
}
$('#blueprint-sidebar').addEventListener('pointerdown',event=>{
  const row=event.target.closest('[data-drag-variable]');if(!row||event.button!==0||event.target.closest('.variable-get'))return;
  const start={x:event.clientX,y:event.clientY};let moving=false,ghost;
  const move=e=>{if(!moving&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<6)return;moving=true;e.preventDefault();if(!ghost){ghost=document.createElement('div');ghost.className='variable-drag-preview';ghost.textContent=graphs.blueprint.variables.find(v=>v.id===row.dataset.dragVariable)?.name;document.body.append(ghost);}ghost.style.left=e.clientX+14+'px';ghost.style.top=e.clientY+14+'px';$$('.pin.drop-target').forEach(p=>p.classList.remove('drop-target'));document.elementFromPoint(e.clientX,e.clientY)?.closest('#blueprint-graph .pin')?.classList.add('drop-target');};
  const end=e=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);ghost?.remove();$$('.pin.drop-target').forEach(p=>p.classList.remove('drop-target'));if(!moving||e.type==='pointercancel')return;
    const stop=click=>{click.preventDefault();click.stopImmediatePropagation();};document.addEventListener('click',stop,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',stop,true),250);
    const under=document.elementFromPoint(e.clientX,e.clientY);if(!under?.closest('#blueprint-graph'))return;const pin=under.closest('.pin'),rect=$('#blueprint-graph').getBoundingClientRect(),position={x:Math.max(-10000,Math.min(10000,(e.clientX-rect.left-blueprintPan.x)/blueprintZoom+(pin?.dataset.pin==='out'?45:-260))),y:Math.max(-10000,Math.min(10000,(e.clientY-rect.top-blueprintPan.y)/blueprintZoom+45))},target=pin?{node:pin.dataset.nodeId,pin:pin.dataset.pinId,direction:pin.dataset.pin}:null;
    if(pin||e.ctrlKey||e.metaKey||e.altKey)finishVariableDrop(row.dataset.dragVariable,target,position,e.altKey?'set':'get');else{
      const menu=$('#floating-menu');menu.innerHTML='<button data-drop-variable-mode="get">Get · 읽기</button><button data-drop-variable-mode="set">Set · 쓰기</button>';menu.hidden=false;menu.style.left=Math.min(e.clientX,innerWidth-180)+'px';menu.style.top=Math.min(e.clientY,innerHeight-95)+'px';$$('button',menu).forEach(button=>button.onclick=()=>{menu.hidden=true;finishVariableDrop(row.dataset.dragVariable,null,position,button.dataset.dropVariableMode);});
    }
  };document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
});
function createVariable(){
  const name=$('#variable-name').value.trim(),type=$('#variable-type').value,array=$('#variable-array').checked;if(!name)return notify('변수 이름을 입력하세요.');if(graphs.blueprint.variables.some(v=>v.name===name))return notify('같은 이름의 변수가 있어요.');if(graphs.blueprint.variables.length>=100)return notify('변수 100개까지 편집할 수 있어요.');remember();const v={id:'var_'+crypto.randomUUID().replaceAll('-',''),name,type,container:array?'array':'single',value:array?[]:defaultsFor(type)};graphs.blueprint.variables.push(v);selectedVariable=v.id;selectedDetail={kind:'variable',id:v.id};$('#variable-dialog').close();renderBlueprintSidebar();renderBlueprintInspector();changed();
}
function exportBlueprint(){
  $('#blueprint-json').value=JSON.stringify(graphs.blueprint,null,2);$('#blueprint-json-dialog').showModal();
}
function downloadBlueprint(){
  const url=URL.createObjectURL(new Blob([$('#blueprint-json').value],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=graphs.blueprint.name+'.blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('JSON 파일 다운로드를 요청했어요. 이 브라우저에서 지원하지 않으면 복사를 사용하세요.');
}
function applyBlueprintData(data){
  if(running)throw Error('실행을 종료한 뒤 블루프린트를 불러오세요.');if(!validBlueprint(data))throw Error('블루프린트 데이터 검증 실패');remember();restoreEdit({kind:'blueprint',data:{...data,functions:data.functions||[],macros:data.macros||[],construction:data.construction||clone(defaultBlueprint.construction),comments:data.comments||[]}});switchBlueprintView('event');notify('블루프린트를 불러왔어요.');
}
$('#variable-type').innerHTML=Object.entries(variableTypes).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
$('#custom-pin-type').innerHTML=$('#variable-type').innerHTML;
function renderBlueprintInspector(){
  $('#inspector-content').innerHTML=detailsMarkup(graphs.blueprint,currentGraph(),selectedDetail,objects,projectAssetFiles);
  const output=(running?runtime.values:corePreview.values).get(selectedDetail.id);if(output&&$('#node-api-result'))$('#node-api-result').textContent=previewText(output);
}
function freeNodePosition(){const graph=currentGraph();let x=35,y=30;for(let i=0;i<graph.nodes.length+1;i++){const hit=graph.nodes.find(n=>x<n.position.x+200&&x+190>n.position.x&&y<n.position.y+75+Math.max(effectivePins(n,'in',graph).length,effectivePins(n,'out',graph).length)*27&&y+140>n.position.y);if(!hit)break;y=hit.position.y+100+Math.max(effectivePins(hit,'in',graph).length,effectivePins(hit,'out',graph).length)*27;}return {x,y:Math.min(10000,y)};}

let animationTime=0,animationPlaying=false;const positionKeys=[0,.75,1.5,2.25,3],rotationKeys=[0,1.5,3];
function updateAnimation(){const t=animationTime;$('#animation-time').textContent=t.toFixed(2)+' s';$('#timeline-scrubber').value=t;$('#playhead').style.left=(t/3*100)+'%';$('#animated-object').style.transform=`translateY(${-Math.sin(t/3*Math.PI*2)*25}px) rotate(${Math.sin(t/3*Math.PI*2)*7}deg)`;}
function renderKeys(){for(const [id,keys] of [['position-keyframes',positionKeys],['rotation-keyframes',rotationKeys]])$('#'+id).innerHTML=keys.map(t=>`<button class="keyframe" style="left:calc(${t/3*100}% - 4px)" data-key-time="${t}" aria-label="${t.toFixed(2)}초 키프레임"></button>`).join('');}
function symbolSidebar(){return ['dispatchers','interfaces'].map(kind=>`<div class="bp-section-heading">${kind==='dispatchers'?'이벤트 디스패처':'인터페이스'}<button class="icon-button" data-new-symbol="${kind}" aria-label="${kind==='dispatchers'?'디스패처':'인터페이스'} 추가">${icon('plus')}</button></div>${(graphs.blueprint[kind]||[]).map(d=>`<button class="bp-graph-link ${selectedDetail.id===d.id?'active':''}" data-inspect-symbol="${d.id}">${icon('nodes')}<span>${escapeHtml(d.name)}</span></button>`).join('')}`).join('');}
function symbolEntries(){return ['dispatchers','interfaces'].flatMap(kind=>(graphs.blueprint[kind]||[]).flatMap(d=>(kind==='interfaces'?['interfaceCall']:['dispatcherCall','dispatcherBind','dispatcherUnbind',...(blueprintView==='event'?['dispatcherEvent']:[])]).map(key=>({key,symbolId:d.id,title:({interfaceCall:'Message ',dispatcherCall:'Call ',dispatcherBind:'Bind ',dispatcherUnbind:'Unbind ',dispatcherEvent:'Event '}[key])+d.name,ko:kind==='interfaces'?'인터페이스 메시지':({dispatcherCall:'디스패처 호출',dispatcherBind:'이벤트 바인딩',dispatcherUnbind:'바인딩 해제',dispatcherEvent:'디스패처 이벤트'}[key]),group:kind==='interfaces'?'인터페이스':'이벤트 디스패처',keywords:d.name+' dispatcher interface bind unbind 디스패처 인터페이스 바인딩',kind:key==='dispatcherEvent'?'event':undefined,inputs:basePins({key,symbolId:d.id},'in',graphs.blueprint),outputs:basePins({key,symbolId:d.id},'out',graphs.blueprint)}))));}
function renderNativeInspector(){const classes=graphs.blueprint.native?.classes||[];$('#inspector-content').innerHTML='<div class="bp-detail-title"><h3>C++ Native API</h3></div>'+classes.map(c=>`<details class="bp-detail-group" open><summary>${escapeHtml(c.name)} : ${escapeHtml(c.base)}</summary><div class="bp-readonly">${c.functions.length} 함수 · ${c.properties.length} 속성</div>${c.functions.map(f=>`<div class="bp-detail-row"><span>${escapeHtml(f.name)}</span><span>${f.event==='none'?f.pure?'Pure':'Callable':f.event==='native'?'Native Event':'Implementable Event'}</span></div>`).join('')}</details>`).join('');}
function renderNativeRegistry(){
  const classes=graphs.blueprint.native?.classes||[];$('#native-parent').innerHTML=classes.filter(c=>c.blueprintable).map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  $('#native-members').innerHTML=nativeEntries(graphs.blueprint).map(s=>`<button class="native-member" data-spawn-native="${s.nativeId}" data-native-key="${s.key}">${escapeHtml(s.title)}<span>${escapeHtml(s.group)}</span></button>`).join('');
  if(!classes.length)$('#native-members').innerHTML='<span class="bp-readonly">등록된 클래스 없음</span>';
  $('[data-action="wrap-native"]').disabled=!classes.some(c=>c.blueprintable);if(workspace==='code')renderNativeInspector();
}
function registerNative(){
  try{const source=$('#cpp-code').value,native={...parseNativeHeader(source),header:source,source:$('#cpp-source').value},candidate={...graphs.blueprint,native};if(!validBlueprint(candidate))throw Error('기존 C++ 노드와 새 시그니처가 호환되지 않아요. 기존 노드·기본값을 먼저 수정하세요.');remember();graphs.blueprint.native=native;renderNativeRegistry();renderBlueprintSidebar();renderBlueprintGraph();changed();notify(native.classes.length+'개 C++ 클래스의 공개 노드를 등록했어요.');}catch(error){notify('등록 실패: '+error.message);}
}
async function buildNative(){
  if(running)return notify('실행을 종료한 뒤 빌드하세요.');const owner=assetDocs.current;if(owner?.kind!=='blueprint'||!owner.data.native)return notify('C++ 클래스로 만든 블루프린트를 먼저 여세요.');if(owner.building)return;
  captureDocument();const headerPath=owner.data.native.headerPath||codeHeaderPath,sourcePath=owner.data.native.sourcePath||codeSourcePath,button=$('[data-action="build-native"]'),diagnostics=$('#native-diagnostics');owner.building=true;button.disabled=true;diagnostics.hidden=false;diagnostics.textContent='빌드 중…';
  try{
    const header=await(await editorRequest(fileUrl(headerPath))).text(),source=await(await editorRequest(fileUrl(sourcePath))).text(),metadata=parseNativeHeader(header);if(!validBlueprint({...owner.data,native:{...metadata,header,source}}))throw Error('기존 노드와 새 C++ 시그니처가 호환되지 않아요.');
    const result=await(await editorRequest('/api/native/build',{method:'POST',body:JSON.stringify({header,source})})).json();
    if(assetDocs.items.get(owner.path)!==owner)throw Error('빌드 결과를 적용할 문서가 닫혔어요.');
    const native={...result.metadata,header,source,headerPath:owner.data.native?.headerPath||headerPath,sourcePath:owner.data.native?.sourcePath||sourcePath};if(!validBlueprint({...owner.data,native}))throw Error('빌드 중 변경한 노드와 C++ 시그니처가 호환되지 않아요.');
    owner.history.push({kind:'blueprint',data:clone(owner.data)});if(owner.history.length>undoLimit)owner.history.shift();owner.future=[];owner.data.native=native;owner.dirty=true;owner.view.nativeBuild={...result,header,source};owner.view.nativeDiagnostics='빌드 성공 · '+result.compiler;
    if(assetDocs.current===owner){graphs.blueprint=owner.data;future=owner.future;nativeBuild=owner.view.nativeBuild;$('#cpp-code').value=header;$('#cpp-source').value=source;diagnostics.textContent=owner.view.nativeDiagnostics;renderNativeRegistry();renderBlueprintSidebar();renderBlueprintGraph();}
    renderDocumentTabs();queueRecovery();notify(assetTitle(owner.path)+' C++ 빌드 성공');return true;
  }catch(error){owner.view.nativeDiagnostics=error.message;if(assetDocs.current===owner)diagnostics.textContent=error.message;log(assetTitle(owner.path)+': '+error.message,'ERROR');dock.open('console');notify('C++ 빌드 실패 · 콘솔 확인');return false;}
  finally{owner.building=false;button.disabled=running||workspace!=='blueprint'||!assetDocs.current?.data.native||!!assetDocs.current.building;}
}

async function saveCode(){try{await editorRequest(fileUrl(codeHeaderPath),{method:'PUT',body:$('#cpp-code').value});await editorRequest(fileUrl(codeSourcePath),{method:'PUT',body:$('#cpp-source').value});project.refresh();notify('C++ 파일 저장됨');}catch(error){notify(error.message);}}
function wrapNative(){
  const name=$('#native-parent').value;if(!graphs.blueprint.native?.classes.some(c=>c.name===name&&c.blueprintable))return;
  if(allGraphContexts(graphs.blueprint).some(g=>g.nodes.some(n=>n.key==='nativeEvent'&&nativeMember(graphs.blueprint,n).c?.name!==name)))return notify('현재 부모의 재정의 이벤트를 먼저 제거하세요.');
  remember();graphs.blueprint.settings??={};graphs.blueprint.settings.parentClass=name;graphs.blueprint.name='BP_'+name;setWorkspace('blueprint');switchBlueprintView('event');selectedDetail={kind:'blueprint'};renderBlueprintInspector();changed();
}
let resultsMode='find',graphClipboard=null;
function graphViews(){return [['event','이벤트 그래프'],['construction','Construction Script'],...['functions','macros'].flatMap(k=>(graphs.blueprint[k]||[]).map(d=>[d.id,d.name]))];}
function showBlueprintResults(mode){resultsMode=mode;$('#blueprint-results').hidden=false;$('#blueprint-results-title').textContent={find:'찾기',validate:'검증 결과',debug:'중단점 / 관찰'}[mode];$('#blueprint-find').hidden=mode!=='find';renderBlueprintResults();if(mode==='find')$('#blueprint-find').focus();}
function renderBlueprintResults(){
  const list=$('#blueprint-results-list'),q=normalizeSearch($('#blueprint-find').value),rows=[];
  if(resultsMode==='validate'){
    if(!validBlueprint(graphs.blueprint)){list.innerHTML='<div class="bp-result error">그래프 데이터 검증 실패</div>';return;}
    for(const [view,label] of graphViews()){const g=graphContext(graphs.blueprint,view);for(const n of g.nodes){const exec=effectivePins(n,'in',g).filter(p=>p.type==='exec');if(exec.length&&!g.edges.some(e=>e.to.node===n.id&&exec.some(p=>p.id===e.to.pin)))rows.push(`<button class="bp-result" data-find-node="${n.id}" data-find-view="${view}">${escapeHtml(nodeTitle(n,g))}<span>${escapeHtml(label)} · 실행 입력 미연결</span></button>`);}}
    list.innerHTML='<div class="bp-results-message">편집 데이터 검증 통과</div>'+rows.join('');return;
  }
  for(const [view,label] of graphViews())for(const n of graphContext(graphs.blueprint,view).nodes){const title=nodeTitle(n,graphs.blueprint);if(resultsMode==='debug'?!n.breakpoint:!normalizeSearch(title+' '+(n.comment||'')+' '+(n.nativeId||'')+' '+label).includes(q))continue;rows.push(`<button class="bp-result" data-find-node="${n.id}" data-find-view="${view}">${escapeHtml(title)}<span>${resultsMode==='debug'?'중단점':escapeHtml(label)}</span></button>`);}
  if(resultsMode==='find')for(const v of graphs.blueprint.variables.filter(v=>normalizeSearch(v.name).includes(q)))rows.push(`<button class="bp-result" data-find-variable="${v.id}">${escapeHtml(v.name)}<span>변수 · ${v.type}</span></button>`);
  if(resultsMode==='debug')for(const w of graphs.blueprint.watches||[]){const g=graphContext(graphs.blueprint,w.view),n=g.nodes.find(n=>n.id===w.node);if(n){let value=w.direction==='out'?(running?runtime.values:corePreview.values).get(n.id):undefined,type=basePins(n,w.direction,g).find(p=>p.id===w.pin.split('.')[0])?.type;const [base,...fields]=w.pin.split('.');value=value?.[base];for(const part of fields){const metadata=fieldsFor(type),index=metadata.findIndex(f=>f.id===part);value=Array.isArray(value)?value[index]:value?.[part];type=metadata[index]?.type;}rows.push(`<button class="bp-result" data-find-node="${n.id}" data-find-view="${w.view}">${escapeHtml(nodeTitle(n,g))} · ${escapeHtml(w.pin)}<span>${value===undefined?'미실행':escapeHtml(previewText(value))}</span></button>`);}}
  list.innerHTML=rows.join('')||'<div class="bp-results-message">항목 없음</div>';
}
function copyGraphNodes(){const g=currentGraph(),nodes=g.nodes.filter(n=>selectedNodes.has(n.id)&&!n.key.endsWith('Input')&&!n.key.endsWith('Output')&&n.key!=='construction');if(!nodes.length)return;const ids=new Set(nodes.map(n=>n.id));graphClipboard=clone({nodes,edges:g.edges.filter(e=>ids.has(e.from.node)&&ids.has(e.to.node))});}
function pasteGraphNodes(){if(!graphClipboard)return;const before=snapshot(),result=pasteNodes(graphs.blueprint,blueprintView,graphClipboard,lastGraphPointer);if(!result.ok)return notify(result.reason);future=[];history.push(before);if(history.length>undoLimit)history.shift();selectedNodes=new Set(result.nodes.map(n=>n.id));selectedNode=result.nodes[0].id;selectedDetail={kind:'node',id:selectedNode};renderBlueprintGraph();renderBlueprintInspector();changed();}

$('#blueprint-find').addEventListener('input',renderBlueprintResults);
$('#cpp-code').value=graphs.blueprint.native?.header||nativeExample;
renderNativeRegistry();

const commands=[['장면 편집','scene','Workspace'],['머테리얼 편집','material','Workspace'],['애니메이션 편집','animation','Workspace'],['블루프린트 편집','blueprint','Workspace'],['C++ 공개 API','code','Workspace'],...placementCatalog.map(p=>[p.label,'create:'+p.key,p.category]),['프로파일러','window:profiler','Window'],['오브젝트 배치 창','window:placement','Window'],['새 콘텐츠 브라우저','window:project','Window'],['새 뷰포트','window:viewport','Window'],['에셋 가져오기','import','Assets'],['장면 저장','save','Ctrl S'],['실행 취소','undo','Ctrl Z'],['선택 오브젝트에 초점','focus','F'],['사용 안내','help','Help']];
commands.push(['새 맵 만들기','new-map','World'],['하늘·햇빛·구름 설정','environment','World']);
function renderCommands(){const query=$('#command-input').value.toLowerCase();$('#command-results').innerHTML=commands.filter(c=>c[0].toLowerCase().includes(query)||c[2].toLowerCase().includes(query)).map(c=>`<button class="command-result" data-command="${c[1]}">${c[0]}<span>${c[2]}</span></button>`).join('')||'<p class="inspector-note" style="padding:12px">일치하는 명령이 없어요.</p>';}
function openMenu(button,items){const menu=$('#floating-menu');menu.innerHTML=items.map(item=>item?`<button ${item[2]||''} data-menu-command="${item[1]}">${item[0]}${item[3]?`<kbd>${item[3]}</kbd>`:''}</button>`:'<div class="menu-separator"></div>').join('');menu.hidden=false;const rect=button.getBoundingClientRect();menu.style.left=Math.min(rect.left,innerWidth-menu.offsetWidth-10)+'px';menu.style.top=Math.min(rect.bottom+5,innerHeight-menu.offsetHeight-10)+'px';}
function executeCommand(command){if(command.startsWith('align:'))return alignBlueprintNodes(command.slice(6));if(command.startsWith('scene:'))sceneAction(command.slice(6));else if(command.startsWith('window:'))createEditorWindow(command.slice(7));else if(['scene','material','animation','blueprint','code'].includes(command))setWorkspace(command);else if(command.startsWith('create:'))createObject(command.split(':')[1]);else doAction(command);}
function doAction(action,button){
  if(action.startsWith('bp:'))return blueprintContextAction(action);
  switch(action){
    case 'preview-api':{try{const n=detailTarget(),spec=catalog.find(s=>s.key===n?.key);if(spec?.group==='변환'&&!spec.pure){if(running)throw Error('장면 변경 미리보기는 실행을 멈춘 뒤 호출하세요.');remember();}const result=evaluateCoreNode(currentGraph(),n.id,corePreview);$('#node-api-result').textContent=Object.keys(result).length?previewText(result):'호출 완료';if(resultsMode==='debug')renderBlueprintResults();}catch(error){notify(error.message);}break;}
    case 'register-native':registerNative();break;case 'wrap-native':wrapNative();break;case 'native-example':$('#cpp-code').value=nativeExample;fetch('/prototype/examples/DoorController.cpp').then(r=>r.text()).then(source=>$('#cpp-source').value=source);break;case 'build-native':buildNative();break;case 'save-code':saveCode();break;case 'choose-folders':$('#folder-input').click();break;
    case 'validate-blueprint':showBlueprintResults('validate');break;case 'find-blueprint':showBlueprintResults('find');break;case 'debug-blueprint':showBlueprintResults('debug');break;case 'close-blueprint-results':$('#blueprint-results').hidden=true;break;
    case 'copy-nodes':copyGraphNodes();break;case 'paste-nodes':pasteGraphNodes();break;case 'duplicate-nodes':copyGraphNodes();pasteGraphNodes();break;
    case 'create-symbol':{const name=$('#symbol-name').value.trim(),kind=$('#symbol-kind').value;if(!name||name.length>80)return notify('이름을 확인하세요.');const list=graphs.blueprint[kind];if(list.length>=50||list.some(d=>d.name===name))return notify('개수나 중복된 이름을 확인하세요.');remember();const id='symbol_'+crypto.randomUUID().replaceAll('-','');list.push({id,name,inputs:[],outputs:[]});$('#symbol-dialog').close();selectedDetail={kind:'symbol',id};renderBlueprintSidebar();renderBlueprintInspector();changed();break;}
    case 'delete-comment':{const g=currentGraph();remember();g.comments=(g.comments||[]).filter(c=>c.id!==selectedDetail.id);selectedDetail={kind:'blueprint'};renderGraphComments();renderBlueprintInspector();changed();break;}
    case 'blueprint-back':switchBlueprintView('event');break;
    case 'collapse-function':openCollapse('function');break;case 'collapse-macro':openCollapse('macro');break;case 'confirm-collapse':confirmCollapse();break;
    case 'zoom-in':setGraphZoom(blueprintZoom+.1);break;case 'zoom-out':setGraphZoom(blueprintZoom-.1);break;case 'zoom-reset':setGraphZoom(1);break;
    case 'zoom-fit':focusGraph();break;
    case 'blueprint-defaults':selectedDetail={kind:'blueprint'};renderBlueprintInspector();break;
    case 'new-function':openCollapse('function',true);break;case 'new-macro':openCollapse('macro',true);break;
    case 'add-comment':addGraphComment();break;
    case 'component-viewport':openComponentViewport();break;case 'save':save();break;case 'save-all':save(true);break;case 'create-asset':focusedProjectBrowser().createDialog();break;case 'browse-document':browseDocument();break;case 'redo':redo();break;case 'undo':undo();break;case 'play':startPlay();break;case 'pause':if(paused)runtime.continue();else runtime.pause();paused=runtime.paused;updatePlayButtons();break;case 'stop':stopPlay();break;
    case 'focus':if(workspace==='blueprint')doAction('zoom-fit');else focusObject();break;case 'grid':gridVisible=!gridVisible;$('#grid-button').setAttribute('aria-pressed',String(gridVisible));break;case 'collision-bounds':showCollisionBounds=!showCollisionBounds;button?.setAttribute('aria-pressed',String(showCollisionBounds));break;
    case 'environment':setWorkspace('scene');$('#environment-panel').hidden=!$('#environment-panel').hidden;$('.environment-button').setAttribute('aria-expanded',String(!$('#environment-panel').hidden));break;
    case 'new-map':$('#new-map-dialog').showModal();break;case 'cancel-new-map':$('#new-map-dialog').close();break;case 'create-map':createMap();break;
    case 'lighting':$('#lighting-section')?.scrollIntoView({block:'nearest',behavior:'smooth'});$('#light-intensity')?.focus();break;
    case 'material-zoom-out':materialEditor?.setZoom(materialEditor.zoom/1.2);break;case 'material-zoom-in':materialEditor?.setZoom(materialEditor.zoom*1.2);break;case 'material-zoom-reset':materialEditor?.fit(false,1);break;case 'material-fit':materialEditor?.fit();break;
    case 'apply-material':{if(assetDocs.current?.kind==='material')assignObjectAsset('materialAsset',assetDocs.current.path).catch(error=>notify(error.message));break;}case 'open-material':{const o=objects.find(o=>o.id===selected);if(o?.materialAsset)openProjectAsset({kind:'material',path:o.materialAsset});else setWorkspace('material');break;}case 'open-blueprint':{const o=objects.find(o=>o.id===selected);if(o?.blueprintAsset)openProjectAsset({kind:'blueprint',path:o.blueprintAsset});else setWorkspace('blueprint');break;}case 'open-code':setWorkspace('code');break;
    case 'import':$('#import-dialog').showModal();break;case 'choose-files':$('#file-input').click();break;
    case 'confirm-import':confirmImport();break;case 'asset-size':{const browser=focusedProjectBrowser();browser.setView(browser.view==='tiles'?'list':'tiles');break;}
    case 'command':$('#command-dialog').showModal();$('#command-input').value='';renderCommands();$('#command-input').focus();break;
    case 'help':$('#help-dialog').showModal();break;case 'close-help':$('#help-dialog').close();break;
    case 'reset-prototype':remember();objects=clone(defaultObjects);surface=clone(defaultSurface);environment=clone(defaultEnvironment);sceneName='Garden';rebuildWorld();renderHierarchy();renderInspector();updateSurface();applyEnvironment();changed();$('#help-dialog').close();notify('초기 장면으로 복원했어요. Ctrl Z로 되돌릴 수 있어요.');break;
    case 'clear-console':logs=[];$('#console-logs').innerHTML='';$('#log-count').textContent='0';break;
    case 'animation-play':animationPlaying=!animationPlaying;$('#animation-play').innerHTML=icon(animationPlaying?'pause':'play');break;
    case 'animation-reset':animationTime=0;animationPlaying=false;$('#animation-play').innerHTML=icon('play');updateAnimation();break;
    case 'keyframe':if(!positionKeys.some(t=>Math.abs(t-animationTime)<.015)){positionKeys.push(+animationTime.toFixed(2));renderKeys();notify(animationTime.toFixed(2)+'초에 위치 키프레임을 추가했어요.');}else notify('현재 위치에 키프레임이 있어요.');break;
    case 'run-blueprint':traceBlueprint();break;
    case 'add-material-node':materialEditor?.menu({clientX:button.getBoundingClientRect().left,clientY:button.getBoundingClientRect().bottom,target:$('#material-graph')});break;
    case 'add-blueprint-node':{const rect=$('#blueprint-graph').getBoundingClientRect();openNodePalette(rect.left+35,rect.top+40);palettePosition=freeNodePosition();break;}
    case 'new-custom-pin':{const n=currentGraph().nodes.find(n=>n.id===selectedNode);$('#custom-pin-direction').value=button?.dataset.pinDirection||(n?.key.endsWith('Input')?'in':'out');$('#custom-pin-direction').disabled=n?.key==='customEvent';$('#pin-dialog').showModal();break;}
    case 'create-custom-pin':{const n=currentGraph().nodes.find(n=>n.id===selectedNode),label=$('#custom-pin-name').value.trim(),direction=$('#custom-pin-direction').value,type=$('#custom-pin-type').value,array=$('#custom-pin-array').checked;if(!label)return notify('핀 이름을 입력하세요.');const definition=[...graphs.blueprint.functions,...graphs.blueprint.macros,...(graphs.blueprint.dispatchers||[]),...(graphs.blueprint.interfaces||[])].find(d=>d.id===(['definition','symbol'].includes(selectedDetail.kind)?selectedDetail.id:n?.definitionId)),target=definition||n,key=definition?(direction==='out'?'outputs':'inputs'):(direction==='out'?'customOutputs':'customInputs');if(!target||(!definition&&!['customEvent','customFunction'].includes(n.key)))return;if(graphs.blueprint.dispatchers.some(d=>d===target)&&direction==='out')return notify('디스패처에는 입력 인자만 추가할 수 있어요.');if((target[key]||[]).length>=(definition?30:20))return notify('핀 개수 제한에 도달했어요.');remember();target[key]??=[];target[key].push({id:'pin_'+crypto.randomUUID().replaceAll('-',''),label,type,array});$('#pin-dialog').close();renderBlueprintGraph();renderBlueprintInspector();changed();break;}
    case 'new-variable':$('#variable-dialog').showModal();$('#variable-name').focus();break;case 'create-variable':createVariable();break;
    case 'new-component':componentPicker({extra:{CustomComponent:{label:'C++ Component · 사용자 컴포넌트',group:'C++',icon:'code'}},error:notify,add:type=>{if(type==='CustomComponent'){$('#component-type').value=type;setTimeout(()=>$('#component-dialog').showModal(),0);return;}if(graphs.blueprint.components.length>=100)throw Error('컴포넌트 제한에 도달했어요.');let name=type,index=2;while(graphs.blueprint.components.some(c=>c.name===name))name=type+index++;remember();const c={id:'component_'+crypto.randomUUID().replaceAll('-',''),name,type,properties:componentDefaults(type)};graphs.blueprint.components.push(c);selectedDetail={kind:'component',id:c.id};renderBlueprintSidebar();renderBlueprintInspector();changed();}});break;
    case 'scene-add-component':sceneAction('add-component');break;
    case 'create-component':{const name=$('#component-name').value.trim();if(!name)return notify('컴포넌트 이름을 입력하세요.');if(graphs.blueprint.components.length>=100)return notify('컴포넌트 100개까지 등록할 수 있어요.');remember();const id='component_'+crypto.randomUUID().replaceAll('-','');graphs.blueprint.components.push({id,name,type:$('#component-type').value,properties:componentDefaults($('#component-type').value)});selectedDetail={kind:'component',id};$('#component-dialog').close();renderBlueprintSidebar();renderBlueprintInspector();changed();notify('컴포넌트 추가됨');break;}
    case 'add-array-element':{const v=graphs.blueprint.variables.find(v=>v.id===selectedVariable);if(v&&v.value.length<128){remember();v.value.push(defaultsFor(v.type));renderBlueprintSidebar();changed();}break;}
    case 'export-blueprint':exportBlueprint();break;
    case 'download-blueprint-json':downloadBlueprint();break;
    case 'copy-blueprint-json':navigator.clipboard?.writeText($('#blueprint-json').value).then(()=>notify('블루프린트 JSON을 복사했어요.')).catch(()=>notify('복사 권한이 없어요. JSON 텍스트를 직접 선택해 복사하세요.'));break;
    case 'apply-blueprint-json':try{if($('#blueprint-json').value.length>1024*1024)throw Error('JSON은 1 MB 이하여야 해요.');applyBlueprintData(JSON.parse($('#blueprint-json').value));$('#blueprint-json-dialog').close();}catch(error){notify('적용 실패: '+error.message);}break;case 'import-blueprint':$('#blueprint-file-input').click();break;
    case 'copy-code':navigator.clipboard?.writeText($('#cpp-source').hidden?$('#cpp-code').value:$('#cpp-source').value).then(()=>notify('C++ 예시를 복사했어요.')).catch(()=>notify('이 브라우저에서 클립보드에 접근할 수 없어요.'));break;
    case 'add-component':setWorkspace('blueprint');$('#component-dialog').showModal();break;
    case 'graph-menu':openMenu(button,[['노드 추가','add-blueprint-node'],['블루프린트 JSON 불러오기','import-blueprint'],['JSON 내보내기','export-blueprint']]);break;
    case 'project-hub':switchProject();break;
    case 'file-menu':openMenu(button,[['프로젝트 선택','project-hub'],null,['새 맵 만들기','new-map'],['에셋 가져오기','import'],['에셋 만들기','create-asset'],['현재 에셋 저장','save','', 'Ctrl S'],['모두 저장','save-all','','Ctrl Shift S'],null,['사용 안내','help']]);break;
    case 'edit-menu':openMenu(button,[['실행 취소','undo','', 'Ctrl Z'],['다시 실행','redo','','Ctrl Y'],['명령 검색','command','', 'Ctrl K']]);break;
    case 'add-menu':openPlacement();break;
    case 'view-menu':openMenu(button,[['레벨 편집기','scene'],['오브젝트 배치','window:placement'],['콘텐츠 브라우저','browse-document'],['Visual Studio에서 열기','code'],['새 콘텐츠 브라우저','window:project'],['새 뷰포트','window:viewport'],['월드 설정','window:world'],['프로파일러','window:profiler'],['레이아웃 초기화','reset-layout']]);break;case 'reset-layout':activateDocument(assetDocs.active,true);break;
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b){if(!e.target.closest('#floating-menu'))$('#floating-menu').hidden=true;return;}
  if(b.dataset.workspace)setWorkspace(b.dataset.workspace);else if(b.dataset.select){focusedWindow='scene';selectObject(b.dataset.select,true,e);}else if(b.dataset.create)createObject(b.dataset.create);else if(b.dataset.view)setView(b.dataset.view);else if(b.dataset.tool){if(transform){transform.enabled=b.dataset.tool!=='select';if(transform.enabled)transform.setMode({move:'translate',rotate:'rotate',scale:'scale'}[b.dataset.tool]);$$('[data-tool]').forEach(t=>t.classList.toggle('active',t===b));}}
  else if(b.dataset.bottom){$$('[data-bottom]').forEach(t=>t.classList.toggle('active',t===b));$('#assets-content').hidden=b.dataset.bottom!=='assets';$('#console-content').hidden=b.dataset.bottom!=='console';}
  else if(b.dataset.asset!==undefined)openAsset(Number(b.dataset.asset));else if(b.dataset.preset)preset(b.dataset.preset);else if(b.dataset.pin){if(e.altKey&&b.closest('#blueprint-graph'))blueprintContextAction(`bp:disconnect:${b.dataset.nodeId}:${b.dataset.pin}:${b.dataset.pinId}`);else if(e.altKey&&b.closest('#material-graph')){remember();graphs.material.edges=graphs.material.edges.filter(w=>!(b.dataset.pin==='out'?w[0]===b.dataset.nodeId:w[1]===b.dataset.nodeId&&w[2]===Number(b.dataset.pinIndex)));drawWires();updateSurface();changed();}else connectPin(b);}else if(b.dataset.keyTime){animationTime=Number(b.dataset.keyTime);updateAnimation();}
  else if(b.dataset.removeFile!==undefined&&!importing){pendingFiles.splice(Number(b.dataset.removeFile),1);renderImportQueue();}
  else if(b.dataset.command){$('#command-dialog').close();executeCommand(b.dataset.command);}
  else if(b.dataset.menuCommand){$('#floating-menu').hidden=true;executeCommand(b.dataset.menuCommand);}
  else if(b.dataset.action)doAction(b.dataset.action,b);
  if(!b.closest('#floating-menu')&&!['file-menu','edit-menu','add-menu','view-menu','add-component'].includes(b.dataset.action))$('#floating-menu').hidden=true;
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(b?.dataset.spawnNode)spawnBlueprintNode(b.dataset.spawnNode,b.dataset.variableId,b.dataset.definitionId,b.dataset.nativeId,b.dataset.symbolId,b.dataset.inputAsset);
  else if(b?.dataset.addTimelineTrack){const n=detailTarget();if(n.key!=='timeline'||n.timeline.tracks.length>=16)return;remember();const id='Track_'+crypto.randomUUID().replaceAll('-',''),type=b.dataset.addTimelineTrack;n.timeline.tracks.push({id,name:type+' '+(n.timeline.tracks.length+1),type,interpolation:'linear',keys:[{time:0,value:defaultsFor(type)},{time:n.timeline.length,value:defaultsFor(type)}]});renderBlueprintGraph();renderBlueprintInspector();changed();}
  else if(b?.dataset.newSymbol){$('#symbol-kind').value=b.dataset.newSymbol;$('#symbol-name').value=b.dataset.newSymbol==='dispatchers'?'OnChanged':'Interact';$('#symbol-dialog').showModal();$('#symbol-name').select();}
  else if(b?.dataset.inspectSymbol){selectedDetail={kind:'symbol',id:b.dataset.inspectSymbol};renderBlueprintSidebar();renderBlueprintInspector();}
  else if(b?.dataset.nativeClass){setWorkspace('code');$('#native-parent').value=b.dataset.nativeClass;}
  else if(b?.dataset.spawnNative){setWorkspace('blueprint');switchBlueprintView('event');palettePosition=freeNodePosition();spawnBlueprintNode(b.dataset.nativeKey,null,null,b.dataset.spawnNative);}
  else if(b?.dataset.findNode){switchBlueprintView(b.dataset.findView);selectedNode=b.dataset.findNode;selectedNodes=new Set([selectedNode]);selectedDetail={kind:'node',id:selectedNode};renderBlueprintGraph();renderBlueprintInspector();focusGraph(true);$('#blueprint-graph').focus();}
  else if(b?.dataset.findVariable){selectedDetail={kind:'variable',id:b.dataset.findVariable};renderBlueprintInspector();}
  else if(b?.dataset.selectComponent){selectedDetail={kind:'component',id:b.dataset.selectComponent};renderBlueprintSidebar();renderBlueprintInspector();}
  else if(b?.dataset.inspectDefinition){selectedDetail={kind:'definition',id:b.dataset.inspectDefinition};renderBlueprintInspector();}
  else if(b?.dataset.interfaceRemove){const d=detailTarget();remember();d[b.dataset.interfaceDirection]=d[b.dataset.interfaceDirection].filter(p=>p.id!==b.dataset.interfaceRemove);clearDefinitionInputs(d.id);pruneVariableLinks();renderBlueprintInspector();changed();}
  else if(b?.dataset.componentEvent){switchBlueprintView('event');palettePosition=freeNodePosition();spawnBlueprintNode(b.dataset.componentEvent);currentGraph().nodes.find(n=>n.id===selectedNode).options={componentId:b.dataset.componentId};renderBlueprintInspector();}
  else if(b?.dataset.graphView){switchBlueprintView(b.dataset.graphView);}
  else if(b?.dataset.selectVariable){selectedVariable=b.dataset.selectVariable;selectedDetail={kind:'variable',id:selectedVariable};renderBlueprintSidebar();renderBlueprintInspector();}
  else if(b?.dataset.variableNode){const c=$('#blueprint-graph');palettePosition=freeNodePosition();spawnBlueprintNode(b.dataset.variableNode,b.dataset.variableId);}
  else if(b?.dataset.removeArray!==undefined){const v=graphs.blueprint.variables.find(v=>v.id===selectedVariable);remember();v.value.splice(Number(b.dataset.removeArray),1);renderBlueprintSidebar();changed();}
  if(!e.target.closest('#node-palette')&&!e.target.closest('[data-action="add-blueprint-node"]')&&!e.target.closest('#blueprint-graph .pin'))$('#node-palette').hidden=true;
});
function blueprintContextAction(action){
  const [,operation,id,direction,pinId]=action.split(':');const graph=currentGraph(),node=graph.nodes.find(n=>n.id===id);if(!node)return;
  if(operation==='delete'){const ids=selectedNodes.has(id)?selectedNodes:new Set([id]);if(graph.nodes.some(n=>ids.has(n.id)&&(n.key.endsWith('Input')||n.key.endsWith('Output')||n.key==='construction')))return notify('Entry·Return·Construction 노드는 그래프의 인터페이스라 삭제할 수 없어요.');remember();graph.nodes=graph.nodes.filter(n=>!ids.has(n.id));graph.edges=graph.edges.filter(e=>!ids.has(e.from.node)&&!ids.has(e.to.node));pendingPin=null;selectedNodes.clear();selectedNode=null;renderBlueprintGraph();renderBlueprintInspector();changed();return;}
  if(operation==='watch'){remember();const root=graphs.blueprint;root.watches??=[];const index=root.watches.findIndex(w=>w.view===blueprintView&&w.node===id&&w.direction===direction&&w.pin===pinId);if(index>=0)root.watches.splice(index,1);else if(root.watches.length<100)root.watches.push({view:blueprintView,node:id,direction,pin:pinId});showBlueprintResults('debug');changed();return;}
  if(operation==='breakpoint'){remember();node.breakpoint=!node.breakpoint;renderBlueprintGraph();renderBlueprintInspector();changed();return;}
  if(operation==='disconnect'){remember();graph.edges=graph.edges.filter(e=>!((direction==='out'?e.from:e.to).node===id&&(direction==='out'?e.from:e.to).pin===pinId));renderBlueprintGraph();renderBlueprintInspector();changed();return;}
  if(operation==='split'||operation==='recombine'){remember();splitPin(graph,id,direction,pinId,operation==='recombine');pendingPin=null;renderBlueprintGraph();renderBlueprintInspector();changed();notify(operation==='split'?'핀을 필드별로 나눴어요. 해당 핀의 기존 연결은 다시 연결하세요.':'필드를 하나의 핀으로 합쳤어요.');return;}
  const p=effectivePins(node,direction,graph).find(p=>p.id===pinId);
  if(operation==='members'&&p?.type==='object'){pendingPin={name:'blueprint',id,pin:pinId};palettePosition={x:node.position.x+230,y:node.position.y};spawnBlueprintNode(p.className&&graphs.blueprint.native?.classes.some(c=>c.name===p.className)?'nativeMembers':'members',null,null,p.className?p.className+'.__members':null);return;}
  if(operation==='promote'&&p&&p.type!=='exec'&&p.type!=='any'){remember();const baseName=p.label.replace(/\s+/g,'')||'Value';let name=baseName,counter=1;while(graph.variables.some(v=>v.name===name))name=baseName+(counter++);const v={id:'var_'+crypto.randomUUID().replaceAll('-',''),name,type:p.type,container:p.array?'array':'single',value:p.array?[]:defaultsFor(p.type)};graph.variables.push(v);selectedVariable=v.id;renderBlueprintSidebar();changed();notify('핀의 자료형으로 변수를 만들었어요.');}
}
function blueprintContextMenu(e){
  if(!e.target)return;
  $('#floating-menu').hidden=true;const button=e.target.closest('.pin'),nodeElement=e.target.closest('.bp-node'),graph=currentGraph();
  const comment=e.target.closest('.graph-comment');if(comment){selectedDetail={kind:'comment',id:comment.dataset.comment};renderBlueprintInspector();openMenu($('.comment-title',comment),[['주석 삭제','delete-comment']]);return;}
  if(button){const id=button.dataset.nodeId,direction=button.dataset.pin,pinId=button.dataset.pinId,node=graph.nodes.find(n=>n.id===id),p=effectivePins(node,direction,graph).find(p=>p.id===pinId);let items=[];
    if(p&&!p.array&&fieldsFor(p.type).length)items.push(['핀 분할 · Split struct pin',`bp:split:${id}:${direction}:${pinId}`]);
    if(p?.parent)items.push(['핀 합치기 · Recombine',`bp:recombine:${id}:${direction}:${p.parent}`]);
    if(direction==='out'&&p?.type==='object'&&!p.array)items.push(['공개 멤버 읽기 · Get members',`bp:members:${id}:${direction}:${pinId}`]);
    if(p?.type!=='exec'&&p?.type!=='any')items.push(['변수로 만들기 · Promote',`bp:promote:${id}:${direction}:${pinId}`]);
    if(p?.type!=='exec')items.push(['값 관찰 · Watch value',`bp:watch:${id}:${direction}:${pinId}`]);
    items.push(['연결 끊기 · Break links',`bp:disconnect:${id}:${direction}:${pinId}`]);openMenu(button,items);return;
  }
  if(nodeElement){if(!selectedNodes.has(nodeElement.dataset.node)){selectedNodes=new Set([nodeElement.dataset.node]);selectedNode=nodeElement.dataset.node;selectedDetail={kind:'node',id:selectedNode};$$('.bp-node').forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));updateGraphHeading();renderBlueprintInspector();}openMenu($('.node-title',nodeElement),[['복사 · Copy','copy-nodes','','Ctrl C'],['복제 · Duplicate','duplicate-nodes','','Ctrl D'],['중단점 · Breakpoint',`bp:breakpoint:${nodeElement.dataset.node}`,'','F9'],null,['왼쪽 맞춤','align:left-x'],['위쪽 맞춤','align:top-y'],['가로 간격 맞춤','align:distribute-x'],['세로 간격 맞춤','align:distribute-y'],null,['함수로 묶기 · Collapse to function','collapse-function'],['매크로로 묶기 · Collapse to macro','collapse-macro'],['선택 노드 삭제 · Delete',`bp:delete:${nodeElement.dataset.node}`]]);return;}
  openNodePalette(e.clientX,e.clientY);
}
function editInlinePin(e){
  const control=e.target.closest('[data-inline-pin]');if(!control)return;const graph=currentGraph(),node=graph.nodes.find(n=>n.id===control.dataset.inlineNode),pin=node&&effectivePins(node,'in',graph).find(p=>p.id===control.dataset.inlinePin);if(!pin)return;
  const value=pin.type==='bool'?control.checked:pin.type==='string'?control.value:Number(control.value);
  if((control.type==='number'&&control.value==='')||!validValue(pin.type,value)){if(e.type==='change'){control.value=defaultInputValue(node,pin);notify('핀 값의 자료형과 범위를 확인하세요.');}return;}
  if(defaultInputValue(node,pin)===value)return;rememberDetail(control);node.inputValues??={};node.inputValues[pin.id]=value;renderBlueprintInspector();changed();
}
$('#blueprint-graph').addEventListener('input',editInlinePin);
$('#blueprint-graph').addEventListener('change',editInlinePin);
$('#blueprint-graph').addEventListener('dblclick',e=>{
  const wire=e.target.closest('[data-wire]');if(!wire)return;const graph=currentGraph(),edge=graph.edges[Number(wire.dataset.wire)],source=graph.nodes.find(n=>n.id===edge.from.node),pin=effectivePins(source,'out',graph).find(p=>p.id===edge.from.pin);if(pin.type==='exec')return;
  const rect=e.currentTarget.getBoundingClientRect(),node=makeNode('reroute',(e.clientX-rect.left-blueprintPan.x)/blueprintZoom,(e.clientY-rect.top-blueprintPan.y)/blueprintZoom);node.valueType=pin.type;node.array=pin.array;
  const candidate={...graph,nodes:[...graph.nodes,node],edges:graph.edges.filter(x=>x!==edge)};if(!connect(candidate,edge.from,{node:node.id,pin:'value'}).ok||!connect(candidate,{node:node.id,pin:'value'},edge.to).ok||candidate.nodes.length>1000)return;
  remember();graph.nodes=candidate.nodes;graph.edges=candidate.edges;selectedNodes=new Set([node.id]);renderBlueprintGraph();changed();
});
function alignBlueprintNodes(mode){
  const nodes=currentGraph().nodes.filter(n=>selectedNodes.has(n.id));if(nodes.length<2)return;remember();const axis=mode.endsWith('x')?'x':'y';
  if(mode.startsWith('distribute')){nodes.sort((a,b)=>a.position[axis]-b.position[axis]);const min=nodes[0].position[axis],step=(nodes.at(-1).position[axis]-min)/(nodes.length-1);nodes.forEach((n,i)=>n.position[axis]=min+i*step);}else{const value=Math.min(...nodes.map(n=>n.position[axis]));nodes.forEach(n=>n.position[axis]=value);}renderBlueprintGraph();changed();
}
$('#blueprint-graph').addEventListener('contextmenu',e=>e.preventDefault());
$('#blueprint-graph').addEventListener('auxclick',e=>e.preventDefault());
$('#blueprint-graph').addEventListener('pointermove',e=>{const r=e.currentTarget.getBoundingClientRect();lastGraphPointer={x:(e.clientX-r.left-blueprintPan.x)/blueprintZoom,y:(e.clientY-r.top-blueprintPan.y)/blueprintZoom};});
$('#blueprint-graph').addEventListener('pointerdown',e=>{
  if(e.button===0&&heldNodeKey&&!e.target.closest('.bp-node,.graph-comment,.pin')){const rect=e.currentTarget.getBoundingClientRect();palettePosition={x:(e.clientX-rect.left-blueprintPan.x)/blueprintZoom,y:(e.clientY-rect.top-blueprintPan.y)/blueprintZoom};pendingPin=null;spawnBlueprintNode(heldNodeKey);heldNodeKey=null;e.preventDefault();e.stopImmediatePropagation();return;}

  if(![1,2].includes(e.button))return;e.preventDefault();const c=e.currentTarget,startX=e.clientX,startY=e.clientY,origin={...blueprintPan};let moved=false;graphPanActive=true;c.setPointerCapture(e.pointerId);$('#floating-menu').hidden=true;$('#node-palette').hidden=true;
  const move=ev=>{if(Math.hypot(ev.clientX-startX,ev.clientY-startY)>4)moved=true;if(!moved)return;blueprintPan={x:origin.x+ev.clientX-startX,y:origin.y+ev.clientY-startY};c.classList.add('panning');drawBlueprintWires();};
  const up=ev=>{c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);graphPanActive=false;c.classList.remove('panning');if(!moved&&e.button===2&&ev.type!=='pointercancel')blueprintContextMenu({target:document.elementFromPoint(ev.clientX,ev.clientY),clientX:ev.clientX,clientY:ev.clientY});};c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
});
$('#blueprint-graph').addEventListener('pointerdown',e=>{
  const source=e.target.closest('.pin');if(!source||e.button!==0||e.altKey)return;const startX=e.clientX,startY=e.clientY;let dragged=false;
  const move=ev=>{if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<5)return;if(!dragged)pendingPin={name:'blueprint',id:source.dataset.nodeId,pin:source.dataset.pinId,direction:source.dataset.pin};dragged=true;const c=$('#blueprint-graph'),rect=c.getBoundingClientRect(),a=source.getBoundingClientRect(),x1=(a.left+a.width/2-rect.left-blueprintPan.x)/blueprintZoom,y1=(a.top+a.height/2-rect.top-blueprintPan.y)/blueprintZoom,x2=(ev.clientX-rect.left-blueprintPan.x)/blueprintZoom,y2=(ev.clientY-rect.top-blueprintPan.y)/blueprintZoom;$('#pending-wire')?.remove();$('.node-wires',c).insertAdjacentHTML('beforeend',`<path id="pending-wire" d="M${x1} ${y1} C${x1+60} ${y1},${x2-60} ${y2},${x2} ${y2}" fill="none" stroke="${typeColors.any}" stroke-width="2"/>`);};
  const up=ev=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);$('#pending-wire')?.remove();if(ev.type==='pointercancel'){pendingPin=null;return;}if(!dragged)return;const stopClick=event=>{event.stopImmediatePropagation();event.preventDefault();};document.addEventListener('click',stopClick,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',stopClick,true),250);const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.pin');if(target&&target.dataset.pin!==source.dataset.pin)connectBlueprintPin(target);else if(document.elementFromPoint(ev.clientX,ev.clientY)?.closest('#blueprint-graph'))openNodePalette(ev.clientX,ev.clientY);};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});document.addEventListener('pointercancel',up,{once:true});
});
$('#blueprint-graph').addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey){blueprintPan.x-=e.deltaY;drawBlueprintWires();}else setGraphZoom(Math.min(e.ctrlKey||e.metaKey?1.8:1,blueprintZoom*Math.exp(-e.deltaY*.002)),e.clientX,e.clientY);},{passive:false});
$('#scene-canvas').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault();},{passive:false});
$('#blueprint-graph').addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.bp-node,.graph-comment'))return;const c=e.currentTarget,rect=c.getBoundingClientRect(),start={x:(e.clientX-rect.left-blueprintPan.x)/blueprintZoom,y:(e.clientY-rect.top-blueprintPan.y)/blueprintZoom},original=e.ctrlKey||e.shiftKey?new Set(selectedNodes):new Set();
  const box=document.createElement('div');box.className='graph-selection';$('.graph-nodes',c).append(box);c.setPointerCapture(e.pointerId);
  const move=ev=>{const x=(ev.clientX-rect.left-blueprintPan.x)/blueprintZoom,y=(ev.clientY-rect.top-blueprintPan.y)/blueprintZoom,left=Math.min(start.x,x),top=Math.min(start.y,y),right=Math.max(start.x,x),bottom=Math.max(start.y,y);Object.assign(box.style,{left:left+'px',top:top+'px',width:right-left+'px',height:bottom-top+'px'});selectedNodes=new Set(original);$$('.bp-node',c).forEach(el=>{if(el.offsetLeft<right&&el.offsetLeft+el.offsetWidth>left&&el.offsetTop<bottom&&el.offsetTop+el.offsetHeight>top)selectedNodes.add(el.dataset.node);el.classList.toggle('selected',selectedNodes.has(el.dataset.node));});selectedNode=[...selectedNodes][0]||null;updateGraphHeading();};
  const up=ev=>{if(Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)<4){selectedNodes=original;selectedNode=[...selectedNodes][0]||null;$$('.bp-node',c).forEach(el=>el.classList.toggle('selected',selectedNodes.has(el.dataset.node)));updateGraphHeading();}selectedDetail=selectedNode?{kind:'node',id:selectedNode}:{kind:'blueprint'};box.remove();c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);renderBlueprintInspector();};c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
});
$('#node-search').addEventListener('input',renderPalette);$('#context-sensitive').addEventListener('change',renderPalette);
$('#node-search').addEventListener('keydown',e=>{const rows=$$('#palette-results .palette-result');if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const old=rows.findIndex(row=>row.classList.contains('keyboard-active')),next=Math.max(0,Math.min(rows.length-1,old+(e.key==='ArrowDown'?1:-1)));rows.forEach((row,i)=>row.classList.toggle('keyboard-active',i===next));rows[next]?.scrollIntoView({block:'nearest'});}else if(e.key==='Enter'){e.preventDefault();(rows.find(row=>row.classList.contains('keyboard-active'))||rows[0])?.click();}});
function pruneVariableLinks(){for(const g of allGraphContexts(graphs.blueprint))g.edges=g.edges.filter(e=>canConnect({...g,edges:g.edges.filter(x=>x!==e)},e.from,e.to).ok);pendingPin=null;renderBlueprintGraph();}
function detailTarget(){const g=currentGraph();return selectedDetail.kind==='variable'?graphs.blueprint.variables.find(v=>v.id===selectedDetail.id):selectedDetail.kind==='component'?graphs.blueprint.components.find(c=>c.id===selectedDetail.id):selectedDetail.kind==='comment'?(g.comments||[]).find(c=>c.id===selectedDetail.id):['definition','symbol'].includes(selectedDetail.kind)?[...graphs.blueprint.functions,...graphs.blueprint.macros,...(graphs.blueprint.dispatchers||[]),...(graphs.blueprint.interfaces||[])].find(d=>d.id===selectedDetail.id):selectedDetail.kind==='node'?g.nodes.find(n=>n.id===selectedDetail.id):graphs.blueprint;}
function clearDefinitionInputs(id){allGraphContexts(graphs.blueprint).forEach(g=>g.nodes.filter(n=>n.definitionId===id||n.symbolId===id).forEach(n=>{n.inputValues={};n.splitPins=[];}));}
function readControlValue(el,type,current,array=false){
  if(el.dataset.valueAxis!==undefined){const value=clone(current);value[Number(el.dataset.valueAxis)]=Number(el.value);return value;}
  return array||['transform','hit'].includes(type)?JSON.parse(el.value):type==='bool'?el.checked:type==='object'?(el.value==='null'?null:el.value):['float','int'].includes(type)?Number(el.value):el.value;
}
let detailControl,detailRecorded=false;
document.addEventListener('focusin',e=>{if(e.target!==detailControl){detailControl=e.target;detailRecorded=false;}});
function rememberDetail(el){if(detailControl===el&&detailRecorded)return;remember();detailControl=el;detailRecorded=true;}
function handleDetailEdit(e){
  const el=e.target,target=detailTarget();if(!target)return;if(e.type==='input'&&el.value==='')return;
  try{
    if(el.dataset.detailField){
      const path=el.dataset.detailField.split('.'),key=path.at(-1),value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
      if(typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>10000))throw Error('숫자 범위를 확인하세요.');
      if(key==='name'&&(!value.trim()||value.length>80))throw Error('이름을 확인하세요.');
      if(selectedDetail.kind==='variable'&&key==='name'&&graphs.blueprint.variables.some(v=>v!==target&&v.name===value.trim()))throw Error('중복된 변수 이름이에요.');
      if(selectedDetail.kind==='definition'&&key==='name'&&[...graphs.blueprint.functions,...graphs.blueprint.macros].some(d=>d!==target&&d.name===value.trim()))throw Error('중복된 함수·매크로 이름이에요.');
      if(['tickInterval','intensity','radius'].includes(key)&&value<0)throw Error('0 이상의 값을 입력하세요.');
      if(path[0]==='timeline'&&key==='length'&&(value<=0||target.timeline.tracks.some(t=>t.keys.some(k=>k.time>value))))throw Error('길이는 마지막 키프레임 시간 이상이어야 해요.');
      if(selectedDetail.kind==='comment'&&((key==='fontSize'&&(value<10||value>32))||(key==='width'&&value<120)||(key==='height'&&value<80)))throw Error('주석 크기 범위를 확인하세요.');
      if(key==='parentClass'&&allGraphContexts(graphs.blueprint).some(g=>g.nodes.some(n=>n.key==='nativeEvent'&&nativeMember(graphs.blueprint,n).c?.name!==value)))throw Error('현재 부모의 재정의 이벤트를 먼저 제거하세요.');
      rememberDetail(el);let owner=target;if(path.length===2){owner[path[0]]??={};owner=owner[path[0]];}owner[key]=key==='name'?value.trim():value;
      if(selectedDetail.kind==='variable'&&['type','container'].includes(key)){target.value=target.container==='array'?[]:defaultsFor(target.type);allGraphContexts(graphs.blueprint).forEach(g=>g.nodes.filter(n=>n.variableId===target.id).forEach(n=>{n.splitPins=[];n.inputValues={};}));pruneVariableLinks();renderBlueprintInspector();}
      else if(key==='valueType'||(key==='array'&&target.key==='reroute')){target.splitPins=[];target.inputValues={};pruneVariableLinks();renderBlueprintInspector();}
      if(key==='pure'&&value&&target.graph.nodes.some(n=>['delay','timeline','callMacro'].includes(n.key))){owner[key]=false;throw Error('지연·타임라인·매크로가 있는 함수는 순수 함수로 만들 수 없어요.');}
      if(key==='pure'&&selectedDetail.kind==='definition'){target.inputs=target.inputs.filter(p=>p.type!=='exec');target.outputs=target.outputs.filter(p=>p.type!=='exec');if(!value){target.inputs.unshift({id:'exec',label:'실행',type:'exec',array:false});target.outputs.unshift({id:'then',label:'다음',type:'exec',array:false});}clearDefinitionInputs(target.id);pruneVariableLinks();renderBlueprintInspector();}
      if(key==='action'&&target.key==='inputAction'){target.valueType=inputActionTypes.get(value)||'bool';target.splitPins=[];pruneVariableLinks();renderBlueprintInspector();}
      if(key==='parentClass')renderNativeRegistry();
      if(selectedDetail.kind==='comment')renderGraphComments();else{renderBlueprintSidebar();renderBlueprintGraph();}$('.bp-detail-title h3').textContent=selectedDetail.kind==='comment'?'주석':target.name||target.title||nodeTitle(target,currentGraph());changed();
    }else if(el.dataset.nodeInput){
      const p=effectivePins(target,'in',currentGraph()).find(p=>p.id===el.dataset.nodeInput),current=defaultInputValue(target,p),value=readControlValue(el,p.type,current,p.array);if(!(p.array?Array.isArray(value)&&value.length<=128&&value.every(v=>p.type==='any'||validValue(p.type,v)):validValue(p.type,value)))throw Error('입력 자료형을 확인하세요.');rememberDetail(el);target.inputValues??={};target.inputValues[p.id]=value;changed();
    }else if(el.dataset.timelineKeys||el.dataset.timelineInterpolation){const track=target.timeline.tracks.find(t=>t.id===(el.dataset.timelineKeys||el.dataset.timelineInterpolation)),candidate=clone(target.timeline),copy=candidate.tracks.find(t=>t.id===track.id);if(el.dataset.timelineKeys)copy.keys=JSON.parse(el.value);else copy.interpolation=el.value;if(!validTimeline(candidate))throw Error('키프레임 시간·자료형·순서를 확인하세요.');rememberDetail(el);target.timeline=candidate;changed();
    }else if(el.dataset.nativeDefault){const {c,p}=nativeMember(graphs.blueprint,{nativeId:el.dataset.nativeDefault}),current=graphs.blueprint.settings?.nativeDefaults?.[el.dataset.nativeDefault]??p.value??(p.array?[]:defaultsFor(p.type)),value=readControlValue(el,p.type,current,p.array);if(!(p.array?Array.isArray(value)&&value.length<=128&&value.every(v=>validValue(p.type,v)):validValue(p.type,value)))throw Error('상속 속성 기본값을 확인하세요.');rememberDetail(el);graphs.blueprint.settings??={};graphs.blueprint.settings.nativeDefaults??={};graphs.blueprint.settings.nativeDefaults[c.name+'.'+p.name]=value;changed();
    }else if(el.dataset.variableDefault){const v=graphs.blueprint.variables.find(v=>v.id===el.dataset.variableDefault),value=readControlValue(el,v.type,v.value,v.container==='array');if(!(v.container==='array'?Array.isArray(value)&&value.length<=128&&value.every(x=>validValue(v.type,x)):validValue(v.type,value)))throw Error('변수 기본값을 확인하세요.');rememberDetail(el);v.value=value;changed();}
    else if(el.dataset.componentProperty){const key=el.dataset.componentProperty,type=el.dataset.valueType,current=target.properties?.[key]??componentDefaults(target.type)[key],value=readControlValue(el,type,current);if(!validValue(type,value)||!validComponentProperties(target.type,{...target.properties,[key]:value}))throw Error('컴포넌트 값을 확인하세요.');rememberDetail(el);target.properties??={};target.properties[key]=value;changed();}
    else if(el.dataset.interfacePin){if(!el.value.trim())throw Error('핀 이름을 입력하세요.');rememberDetail(el);target[el.dataset.interfaceDirection].find(p=>p.id===el.dataset.interfacePin).label=el.value.trim();renderBlueprintGraph();changed();}
    else if(el.dataset.interfaceType||el.dataset.interfaceArray){rememberDetail(el);const p=target[el.dataset.interfaceDirection].find(p=>p.id===(el.dataset.interfaceType||el.dataset.interfaceArray));if(el.dataset.interfaceType)p.type=el.value;else p.array=el.checked;clearDefinitionInputs(target.id);pruneVariableLinks();renderBlueprintInspector();changed();}
  }catch(error){if(e.type==='input')return;notify(error.message);renderBlueprintInspector();}
}
document.addEventListener('change',handleDetailEdit);
document.addEventListener('input',e=>{if(e.target.dataset.timelinePreview){const n=detailTarget(),track=n?.timeline?.tracks.find(t=>t.id===e.target.dataset.timelinePreview);if(track)$('[data-timeline-value="'+track.id+'"]').textContent=JSON.stringify(sampleTimeline(track,Number(e.target.value)));}});
document.addEventListener('input',e=>{if(e.target.matches('[data-detail-field],[data-node-input],[data-variable-default],[data-native-default],[data-component-property],[data-interface-pin],[data-timeline-keys]')&&!['checkbox','select-one','color'].includes(e.target.type))handleDetailEdit(e);});
document.addEventListener('input',e=>{if(e.target.classList.contains('bp-property-search')){const q=e.target.value.toLowerCase();$$('.bp-detail-row').forEach(row=>row.hidden=!row.dataset.propertySearch.includes(q));}});
$('#blueprint-file-input').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('파일은 1 MB 이하여야 해요.');applyBlueprintData(JSON.parse(await file.text()));}catch(error){notify('불러오기 실패: '+error.message);}finally{e.target.value='';}});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.environment){const key=el.dataset.environment;if(el.type==='range')return;remember();environment[key]=el.type==='checkbox'?el.checked:el.value;if(key==='preset'){surface.light=skyPresets[environment.preset].light;environment.sunElevation=skyPresets[environment.preset].elevation;updateSurface();}if(key==='sunEnabled'&&el.checked&&!objects.some(o=>o.id==='sun-light')){const o=clone(defaultObjects.find(o=>o.id==='sun-light'));objects.push(o);if(scene)buildObject(o);renderHierarchy();}applyEnvironment();renderInspector();changed();}
  else if(el.dataset.transform){const n=Number(el.value);if(el.value===''||!Number.isFinite(n)||Math.abs(n)>10000||(el.dataset.transform==='scale'&&n<.01)){renderInspector();return notify('유효한 범위의 숫자를 입력하세요. 크기는 0.01 이상이에요.');}}
  else if(el.id==='object-visible')editScene(()=>sceneTargets().forEach(o=>o.visible=el.checked));
  else if(['snap-toggle','snap-position','snap-rotation','snap-scale','transform-space'].includes(el.id)&&transform){const on=$('#snap-toggle').checked;transform.setTranslationSnap(on?Number($('#snap-position').value):null);transform.setRotationSnap(on?Number($('#snap-rotation').value)*Math.PI/180:null);transform.setScaleSnap(on?Number($('#snap-scale').value):null);transform.setSpace($('#transform-space').value);}
});
document.addEventListener('pointerdown',e=>{if(e.target.dataset.surface||(e.target.dataset.environment&&e.target.type==='range'))remember();});
document.addEventListener('focusin',e=>{if(e.target.dataset.materialValue||e.target.dataset.transform||(e.target.dataset.surface&&e.target.type==='color'))remember();});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.materialValue){const n=graphs.material.nodes.find(n=>n.id===el.dataset.materialValue),value=Number(el.value);if(n&&Number.isFinite(value)&&Math.abs(value)<=10000){n.value=value;updateSurface();changed();}}else if(el.id==='cpp-code'||el.id==='cpp-source'){changed();if(graphs.blueprint.native&&el.id==='cpp-source')graphs.blueprint.native.source=el.value;}else if(el.dataset.environment&&el.type==='range'){environment[el.dataset.environment]=Number(el.value);applyEnvironment();if(selected==='sun-light')renderInspector();changed();}else if(el.dataset.transform){const o=objects.find(o=>o.id===selected),n=Number(el.value);if(running||!o||el.value===''||!Number.isFinite(n)||Math.abs(n)>10000||(el.dataset.transform==='scale'&&n<.01))return;const key=el.dataset.transform,axis=Number(el.dataset.axis),old=o[key][axis];for(const target of sceneTargets()){target[key][axis]=key==='scale'?Math.max(.01,target[key][axis]*(n/old)):target[key][axis]+n-old;applyObject(target);}selectionBox?.update();changed();}else if(el.dataset.surface){const key=el.dataset.surface,target=key==='light'?surface:editingSurface();target[key]=key==='color'?el.value:Number(el.value);updateSurface();if(workspace==='scene'&&objects.find(o=>o.id===selected)?.materialSurface)rebuildWorld();changed();}else if(el.id==='hierarchy-search')renderHierarchy();else if(el.id==='command-input')renderCommands();else if(el.id==='timeline-scrubber'){animationTime=Number(el.value);updateAnimation();}});
$('#file-input').addEventListener('change',e=>queueFiles([...e.target.files]));
$('#folder-input').addEventListener('change',e=>queueFiles([...e.target.files]));
for(const zone of [$('#assets-content'),$('#file-drop-zone')]){zone.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();zone.classList.add('drag-over');}});zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('drag-over');});zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files.length)queueFiles([...e.dataTransfer.files]);});}
$('#scene-canvas-container').addEventListener('dragover',e=>e.preventDefault());$('#scene-canvas-container').addEventListener('drop',e=>{e.preventDefault();const raw=e.dataTransfer.getData('application/x-hb-assets');if(raw)for(const file of JSON.parse(raw))if(true)placeAsset(file).catch(error=>notify(error.message));});
document.addEventListener('keyup',()=>heldNodeKey=null);window.addEventListener('blur',()=>{heldNodeKey=null;if(running)runtime.releaseInput().catch(e=>notify(e.message));});
document.addEventListener('keydown',e=>{
  if(!e.isComposing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable]')&&focusedWindow==='blueprint'&&quickNodeKeys[e.key.toLowerCase()])heldNodeKey=quickNodeKeys[e.key.toLowerCase()];
  if(e.isComposing)return;const editing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable,dialog=$$('dialog').some(d=>d.open);
  const widgetPane=assetPanes.get(assetDocs.active);if(!editing&&!dialog&&workspace==='widget'&&focusedWindow===widgetPane?.id&&!widgetPane.element.contains(e.target)){widgetPane.element.onkeydown?.(e);if(e.defaultPrevented)return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='Tab'&&!dialog){e.preventDefault();const paths=[...assetDocs.items.keys()],i=paths.indexOf(assetDocs.active);activateDocument(paths[(i+(e.shiftKey?-1:1)+paths.length)%paths.length]);}
  else if((e.ctrlKey||e.metaKey)&&e.code==='Space'&&!editing&&!dialog){e.preventDefault();dock.maximized=dock.maximized?null:dock.paneFor(focusedWindow);dock.render();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='b'&&!dialog){e.preventDefault();browseDocument();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='w'&&!dialog){e.preventDefault();closeDocument(assetDocs.active);}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&!dialog){e.preventDefault();save(e.shiftKey);}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!dialog)doAction('command');}
  else if(focusedWindow==='scene'&&!editing&&!dialog&&!running&&((e.ctrlKey||e.metaKey)&&['c','x','v','d','g','a'].includes(e.key.toLowerCase())||['Delete','F2'].includes(e.key)||['h','l'].includes(e.key.toLowerCase()))){e.preventDefault();const key=e.key.toLowerCase();if(key==='a'){sceneSelection=new Set(objects.map(o=>o.id));renderHierarchy();renderInspector();}else sceneAction({c:'copy',x:'cut',v:'paste',d:'duplicate',g:e.shiftKey?'ungroup':'group',delete:'delete',f2:'rename',h:'hide',l:'lock'}[key]);}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!editing&&!dialog){e.preventDefault();redo();}
  else if((e.ctrlKey||e.metaKey)&&focusedWindow==='blueprint'&&!editing&&!dialog&&['c','v','x','d','f'].includes(e.key.toLowerCase())){e.preventDefault();const key=e.key.toLowerCase();if(key==='f')showBlueprintResults('find');else if(key==='v')pasteGraphNodes();else{copyGraphNodes();if(key==='d')pasteGraphNodes();if(key==='x'&&selectedNode)doAction('bp:delete:'+selectedNode);}}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!editing&&!dialog){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.ctrlKey||e.metaKey)&&focusedWindow==='blueprint'&&!editing&&!dialog&&['+','=','-','0','a'].includes(e.key.toLowerCase())){e.preventDefault();if(e.key.toLowerCase()==='a'){selectedNodes=new Set(currentGraph().nodes.map(n=>n.id));renderBlueprintGraph();}else setGraphZoom(e.key==='0'?1:blueprintZoom+(e.key==='-'?-.1:.1));}
  else if(e.key==='Escape'){pendingPin=null;$$('.pin.pending').forEach(p=>p.classList.remove('pending'));$('#floating-menu').hidden=true;$('#node-palette').hidden=true;$('#environment-panel').hidden=true;$('.environment-button').setAttribute('aria-expanded','false');if(running)stopPlay();}
  else if(!editing&&!dialog){
    if(focusedWindow==='blueprint'){
      if(e.key.toLowerCase()==='c'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();addGraphComment();}
      if(e.key==='Delete'){if(selectedDetail.kind==='comment')doAction('delete-comment');else if(selectedNode)doAction('bp:delete:'+selectedNode);}
      if(e.key==='Home'){e.preventDefault();focusGraph(true);}
      if(e.key==='F2'){e.preventDefault();const el=$('[data-detail-field="text"],[data-detail-field="title"],[data-detail-field="name"]');el?.focus();el?.select();}
      if(e.key==='PageUp'){e.preventDefault();switchBlueprintView('event');}
      if(e.key==='PageDown'){e.preventDefault();const n=currentGraph().nodes.find(n=>n.id===selectedNode);if(n?.definitionId)switchBlueprintView(n.definitionId);else if(n?.key==='timeline')openTimeline();}
      if(e.key==='F7'){e.preventDefault();showBlueprintResults('validate');}
      if(e.key==='F9'&&e.ctrlKey&&e.shiftKey){e.preventDefault();remember();allGraphContexts(graphs.blueprint).forEach(g=>g.nodes.forEach(n=>n.breakpoint=false));renderBlueprintGraph();renderBlueprintInspector();changed();}
      else if(e.key==='F9'&&selectedNode){e.preventDefault();const n=currentGraph().nodes.find(n=>n.id===selectedNode);remember();n.breakpoint=!n.breakpoint;renderBlueprintGraph();renderBlueprintInspector();changed();}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectedNodes.size){e.preventDefault();remember();const step=e.shiftKey?10:1;currentGraph().nodes.filter(n=>selectedNodes.has(n.id)).forEach(n=>{n.position.x=Math.max(-10000,Math.min(10000,n.position.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));n.position.y=Math.max(-10000,Math.min(10000,n.position.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));});renderBlueprintGraph();changed();}
    }
    if(e.key==='F1'){e.preventDefault();doAction('help');}if(e.key.toLowerCase()==='f'&&['scene','blueprint'].includes(focusedWindow))doAction('focus');if(focusedWindow==='scene'&&e.code==='Space'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const modes=['move','rotate','scale'],i=modes.indexOf($('[data-tool].active')?.dataset.tool);$(`[data-tool="${modes[(i+1)%3]}"]`)?.click();}if(focusedWindow==='scene'&&'qwer'.includes(e.key.toLowerCase())&&e.key.length===1){const tool={q:'select',w:'move',e:'rotate',r:'scale'}[e.key.toLowerCase()];$(`[data-tool="${tool}"]`)?.click();}
  }
});
let fileDragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();fileDragDepth++;$('#global-file-drop').hidden=false;}});
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
document.addEventListener('dragleave',e=>{if(e.dataTransfer?.types.includes('Files')){fileDragDepth=Math.max(0,fileDragDepth-1);if(!fileDragDepth)$('#global-file-drop').hidden=true;}});
function clearFileDrag(){fileDragDepth=0;$('#global-file-drop').hidden=true;$$('.drag-over').forEach(zone=>zone.classList.remove('drag-over'));}
document.addEventListener('drop',async e=>{clearFileDrag();if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();e.stopPropagation();try{queueFiles(await droppedFiles(e.dataTransfer),true);}catch(error){notify(error.message);}},true);
document.addEventListener('dragend',clearFileDrag);
window.addEventListener('blur',clearFileDrag);
let leavingProject=false;
window.addEventListener('beforeunload',e=>{persistRecovery();if(dirty&&!leavingProject){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)));
let previous=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.1);previous=now;
  if(running&&!paused)tickGame(dt);else corePreview.delta=0;assetPanes.get(assetDocs.active)?.editor?.runtimeState?.(objects,running);
  if((!dock||dock.visible('scene'))&&mainRenderer&&scene){orbit?.update();if(selectionBox?.visible)selectionBox.update();const gameCamera=running&&renderGameView?visuals.gameCamera(objects,camera.aspect,runtime?.sequenceCamera):null;grid.visible=gridVisible&&!gameCamera;transform.getHelper().visible=!gameCamera&&transform.enabled;collisionPreview?.update(objects,sceneSelection,{all:showCollisionBounds,visible:!gameCamera});selectionBox.visible=!gameCamera&&!!transform.object;visuals.tickParticles(objects,dt,running);visuals.syncNavigation(objects);visuals.syncDecals();const pf=profiler.begin('뷰포트 렌더'),start=performance.now();mainRenderer.render(scene,gameCamera||activeCamera);if(pf)pf.samples.push({name:'WebGL 렌더 제출',parent:'',start:start-pf.start,duration:performance.now()-start});profiler.finish(pf,{drawCalls:mainRenderer.info.render.calls,triangles:mainRenderer.info.render.triangles,geometries:mainRenderer.info.memory.geometries,textures:mainRenderer.info.memory.textures});}
  for(const group of meshMap.values())group.traverse(child=>{for(const material of child.material?(Array.isArray(child.material)?child.material:[child.material]):[])material.userData.updateTime?.(now/1000);});
  for(const view of extraViewports)if(dock.visible(view.id)){view.controls.update();view.renderer.render(scene,view.camera);}
  if((!dock||dock.visible('material'))&&previewRenderer){previewSphere.rotation.y+=dt*.09;previewSphere.material.userData.updateTime?.(now/1000);previewRenderer.render(previewScene,previewCamera);}

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
let recoveryTimer;
function editingSurface(){return assetDocs.current?.kind==='material'?assetDocs.current.data.surface:workspace==='scene'?(objects.find(o=>o.id===selected)?.materialSurface||surface):surface;}
function dataEditorHooks(){return {before:remember,change:changed,error:notify,readAsset,captureSelection:()=>copySceneObjects(objects,sceneSelection),instantiate:doc=>placeAsset({path:doc.path,kind:doc.kind}).catch(error=>notify(error.message))};}
async function placeAsset(file){
  if(file.kind==='model')return placeModel(file);if(file.kind==='blueprint')return placeBlueprint(file);
  if(running)throw Error('실행을 종료한 뒤 배치하세요.');
  if(['material','materialinstance'].includes(file.kind))return assignObjectAsset('materialAsset',file.path);
  const data=file.kind==='texture'?null:await readAsset(file.path);if(data&&!validAsset(file.kind,data))throw Error('에셋 검증 실패');
  activateDocument(activeScenePath);if(assetDocs.current?.kind!=='scene')throw Error('배치할 장면이 없어요.');remember();
  const attached={behaviortree:'BehaviorTree',statemachine:'StateMachine',montage:'MontagePlayer',sequenceasset:'SequencePlayer'}[file.kind];
  if(attached){const o=objects.find(o=>o.id===selected);if(!o)throw Error('장면에서 대상을 먼저 선택하세요.');const component=objectComponents(o).find(c=>c.type===attached)||addSceneComponent(o,attached);component.properties.asset=file.path;applyObject(o);renderInspector();changed();return;}
  if(file.kind==='prefab'){const created=pasteSceneObjects(objects,data.objects);for(const object of created)object.prefabAsset=file.path;rebuildWorld();sceneSelection=new Set(created.map(o=>o.id));selected=created[0]?.id;renderHierarchy();renderInspector();changed();return;}
  if(!['sprite','texture','tilemap','spriteanimation','audioasset'].includes(file.kind))throw Error('장면에 배치할 수 없는 에셋이에요.');
  if(objects.length>=500)throw Error('장면 오브젝트 한도 초과');const kind=file.kind==='audioasset'?'audio':file.kind==='tilemap'?'tilemap':'sprite',object={id:crypto.randomUUID(),name:assetTitle(file.path),kind,group:'WORLD',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:defaultsForObject(kind)};
  if(kind==='sprite'){const p=object.components.find(c=>c.type==='SpriteRenderer').properties;if(file.kind==='texture')p.texture=file.path;else if(file.kind==='sprite')p.sprite=file.path;else{p.sprite=data.frames[0]?.sprite||'';addSceneComponent(object,'Animator').properties.clip=file.path;}}
  if(kind==='tilemap')object.components.find(c=>c.type==='TilemapRenderer').properties.tilemap=file.path;
  if(kind==='audio'){const p=object.components.find(c=>c.type==='AudioSource').properties;p.clip=file.path;p.playOnStart=data.autoplay;}
  objects.push(object);buildObject(object);selectObject(object.id);changed();
}
function assetOptions(kind,value){const files=projectAssetFiles.filter(f=>f.kind===kind||kind==='material'&&f.kind==='materialinstance');if(value&&!files.some(f=>f.path===value))files.push({path:value,name:assetTitle(value)});return '<option value="">없음</option>'+files.map(f=>`<option value="${escapeHtml(f.path)}" ${f.path===value?'selected':''}>${escapeHtml(assetTitle(f.path))}</option>`).join('');}
function captureDocumentData(){
  const doc=assetDocs.current;
  if(!doc||doc.kind==='scene')return sceneSnapshot();
  if(doc.kind==='blueprint')return graphs.blueprint;
  if(doc.kind==='material')return {...doc.data,graph:graphs.material};
  return doc.data;
}
function captureDocument(){
  assetPanes.get(assetDocs.active)?.editor?.flush?.();
  const doc=assetDocs.current;if(!doc||switchingDocument||running)return;
  doc.data=captureDocumentData();doc.history=history;doc.future=future;
  doc.layout=dock?clone(dock.tree):doc.layout;
  if(doc.kind==='scene')doc.view.sceneNavigation={items:clone(sceneNavigation.items),index:sceneNavigation.index};
  if(doc.kind==='blueprint')doc.view={...doc.view,blueprintView,blueprintPan:clone(blueprintPan),blueprintZoom,selectedNode,selectedVariable,selectedNodes:[...selectedNodes],selectedDetail:clone(selectedDetail),nativeBuild};
}
function persistRecovery(){try{captureDocument();storage.setItem(storageKey('hbengine.documents.v2'),JSON.stringify({active:assetDocs.active,scene:activeScenePath,documents:[...assetDocs.items.values()].filter(d=>(assetSuffix[d.kind]||d.kind==='text')).map(d=>({path:d.path,kind:d.kind,data:d.data,saved:d.saved,dirty:d.dirty,view:{...d.view,nativeBuild:undefined},layout:d.layout}))}));return true;}catch(error){log('복구 저장 실패: '+error.message,'ERROR');return false;}}
function queueRecovery(){clearTimeout(recoveryTimer);recoveryTimer=setTimeout(persistRecovery,300);}
async function switchProject(){try{clearTimeout(recoveryTimer);if(!persistRecovery())return;await flushStorage();leavingProject=true;location.href='/prototype/project-hub.html';}catch(error){notify('프로젝트 전환 실패: '+error.message);}}
window.addEventListener('hbengine-storage-error',event=>notify('복구 저장 실패: '+event.detail));
function renderDocumentTabs(){
  dirty=[...assetDocs.items.values()].some(d=>d.dirty);$('#dirty-mark').hidden=!dirty;
  $('#document-tabs').innerHTML=[...assetDocs.items.values()].map(d=>`<div class="asset-tab ${d.path===assetDocs.active?'active':''}" data-kind="${d.kind}"><button role="tab" aria-selected="${d.path===assetDocs.active}" draggable="true" data-document="${escapeHtml(d.path)}" title="${escapeHtml(d.path)}">${icon(assetIcon(d.kind,d.data?.settings?.parentClass))}<span>${escapeHtml(assetTitle(d.path))}</span>${d.dirty?'<i class="modified" aria-label="저장하지 않은 변경"></i>':''}</button><button class="tab-close" data-close-document="${escapeHtml(d.path)}" aria-label="${escapeHtml(assetTitle(d.path))} 닫기">${icon('close')}</button></div>`).join('');
}
function installDocumentData(doc){
  if(doc.kind==='scene'){sceneNavigation.items=clone(doc.view.sceneNavigation?.items||[]);sceneNavigation.index=doc.view.sceneNavigation?.index??-1;runtimeSettings=clone(doc.data.runtime||defaultRuntimeSettings);objects=clone(doc.data.objects);surface=clone(doc.data.surface);environment=clone(doc.data.environment||defaultEnvironment);sceneName=doc.data.sceneName||assetTitle(doc.path);activeScenePath=doc.path;setView(runtimeSettings.dimension==='2d'?'2d':'3d');rebuildWorld();applyEnvironment();renderHierarchy();}
  if(doc.kind==='blueprint'){
    graphs.blueprint=doc.data;for(const key of ['functions','macros','comments','dispatchers','interfaces'])graphs.blueprint[key]??=[];graphs.blueprint.construction??=clone(defaultBlueprint.construction);activeBlueprintPath=doc.path;
    const v=doc.view;blueprintView=v.blueprintView||'event';if(!['event','construction',...graphs.blueprint.functions.map(d=>d.id),...graphs.blueprint.macros.map(d=>d.id)].includes(blueprintView))blueprintView='event';
    blueprintPan=clone(v.blueprintPan||{x:50,y:50});blueprintZoom=v.blueprintZoom||1;selectedNode=v.selectedNode||null;selectedVariable=v.selectedVariable||null;selectedNodes=new Set(v.selectedNodes||[]);selectedDetail=clone(v.selectedDetail||{kind:'blueprint'});nativeBuild=v.nativeBuild||null;pendingPin=null;corePreview.values.clear();
    $('#cpp-code').value=graphs.blueprint.native?.header||'';$('#cpp-source').value=graphs.blueprint.native?.source||'';const diagnostics=$('#native-diagnostics');diagnostics.hidden=!doc.building&&!doc.view.nativeDiagnostics;diagnostics.textContent=doc.building?'빌드 중…':doc.view.nativeDiagnostics||'';
    if(graphs.blueprint.native?.headerPath)codeHeaderPath=graphs.blueprint.native.headerPath;if(graphs.blueprint.native?.sourcePath)codeSourcePath=graphs.blueprint.native.sourcePath;
    renderBlueprintSidebar();renderBlueprintGraph();renderNativeRegistry();
  }
  if(doc.kind==='text'){const input=documents.get('asset:'+doc.path)?.querySelector('textarea');if(input)input.value=doc.data;}
  if(doc.kind==='material'){doc.data.graph??=materialGraph();graphs.material=doc.data.graph;$('.material-preview-caption h3').textContent=doc.data.name||assetTitle(doc.path);renderGraph('material');}
  if(['animation','curve'].includes(doc.kind)){
    const pane=assetPanes.get(doc.path);if(pane?.editor){pane.editor.selection.clear();pane.editor.trackId=doc.data.timeline.tracks[0]?.id;pane.editor.render();}
  }
  if(['audiomixer','widget','sprite','tilemap','spriteanimation',...Object.keys(gameplayTypes)].includes(doc.kind))assetPanes.get(doc.path)?.editor?.render();
  else if(!['scene','blueprint','material','animation','curve','text'].includes(doc.kind)&&assetPanes.has(doc.path))renderDataEditor(assetPanes.get(doc.path).element,doc,projectAssetFiles,dataEditorHooks());
  updateSurface();renderInspector();
}
const projectAssetFiles=[],inputActionTypes=new Map();
async function refreshAssetIndex(){try{const data=await(await editorRequest('/api/project?recursive=1')).json();projectAssetFiles.splice(0,projectAssetFiles.length,...data.entries);for(const f of data.entries.filter(f=>f.kind==='inputaction')){const d=assetDocs.items.get(f.path)?.data||await(await editorRequest(fileUrl(f.path))).json();if(validAsset('inputaction',d))inputActionTypes.set(f.path,d.valueType);}if(workspace==='audiomixer'&&!assetPanes.get(assetDocs.active)?.element.contains(document.activeElement))assetPanes.get(assetDocs.active)?.editor?.render();else if(workspace==='scene'&&!$('#inspector-content').contains(document.activeElement))renderInspector();else if(workspace==='blueprint'&&!$('#inspector-content').contains(document.activeElement))renderBlueprintInspector();else if(['inputaction','inputmapping','data'].includes(workspace)&&!assetPanes.get(assetDocs.active)?.element.contains(document.activeElement)){const doc=assetDocs.current,pane=assetPanes.get(doc.path);if(pane)renderDataEditor(pane.element,doc,projectAssetFiles,{before:remember,change:changed,error:notify});}}catch(error){log(error.message,'ERROR');}}
function ensureAssetPane(doc){
  if(['scene','blueprint','material'].includes(doc.kind))return doc.kind;
  const id='asset:'+doc.path;
  if(documents.has(id))return id;
  if(assetPanes.has(doc.path))return assetPanes.get(doc.path).id;
  const element=document.createElement('div');element.className='workspace-view asset-document';
  const pane={id,element};assetPanes.set(doc.path,pane);
  dock.entries.set(id,{id,title:assetTypes[doc.kind]?.label||doc.kind,element,path:doc.path});
  if(doc.kind==='text'){const input=document.createElement('textarea');input.value=doc.data;input.ariaLabel=assetTitle(doc.path)+' 내용';input.onfocus=remember;input.oninput=()=>{doc.data=input.value;changed();};element.append(input);documents.set(id,element);}
  else if(['animation','curve'].includes(doc.kind)){
    element.className='workspace-view asset-curve-workspace';
    const curve=document.createElement('div');element.append(curve);
    pane.editor=new TimelineEditor(curve,()=>doc.data,{before:remember,change:()=>{changed();renderAssetInspector();},error:notify});
    if(doc.kind==='animation'){
      const preview=document.createElement('div');preview.className='asset-animation-preview';element.prepend(preview);const canvas=document.createElement('canvas');preview.append(canvas);
      const renderer=new THREE.WebGLRenderer({canvas,antialias:true}),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,100);world.background=new THREE.Color('#20242b');camera.position.set(4,3,5);world.add(new THREE.HemisphereLight(0xe8f1ff,0x293546,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,4);world.add(light);world.add(new THREE.GridHelper(12,12,0x65738b,0x343e4e));
      const object=new THREE.Group();const cube=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshStandardMaterial({color:'#9fadd0',roughness:.35}));cube.position.y=.35;object.add(cube);world.add(object);const controls=new OrbitControls(camera,canvas);controls.target.set(0,.6,0);controls.update();
      const observer=new ResizeObserver(()=>{if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();});observer.observe(preview);
      const frame=()=>{if(pane.disposed)return;if(dock.visible(pane.id)){const tracks=doc.data.timeline.tracks;for(const [name,key] of [['position','position'],['rotation','rotation'],['scale','scale']]){const track=tracks.find(t=>t.id===name&&t.type==='vec3');if(track){const value=sampleTimeline(track,pane.editor.time);object[key].set(...(name==='rotation'?value.map(THREE.MathUtils.degToRad):value));}}controls.update();renderer.render(world,camera);}requestAnimationFrame(frame);};requestAnimationFrame(frame);
      pane.dispose=()=>{pane.disposed=true;observer.disconnect();controls.dispose();renderer.dispose();cube.geometry.dispose();cube.material.dispose();};
    }
  }else if(['sprite','tilemap','spriteanimation'].includes(doc.kind))pane.editor=renderTwoDEditor(element,doc,()=>projectAssetFiles,{before:remember,change:changed,error:notify,read:readAsset,placeAsset:()=>placeAsset({path:doc.path,kind:doc.kind}),createAsset:async(kind,name,data)=>{const folder=doc.path.split('/').slice(0,-1).join('/');const result=await(await editorRequest('/api/asset/create',{method:'POST',body:JSON.stringify({folder,kind,name})})).json();await editorRequest(fileUrl(result.path),{method:'PUT',body:JSON.stringify(data,null,2)});renderAssets();return result;}});
  else if(gameplayTypes[doc.kind]){pane.editor=new GameplayEditor(element,doc,()=>projectAssetFiles,{before:remember,change:changed,error:notify,running:()=>running,read:readAsset,asset:async(name,kind)=>{const data=await(await editorRequest('/api/project?recursive=1')).json();return resolvePlayAsset(data.entries,name,kind);},world:()=>({objects,groups:meshMap,selected,scene:runtimeScenePath||activeScenePath,dimension:runtimeSettings.dimension}),place:()=>placeAsset({path:doc.path,kind:doc.kind}).catch(error=>notify(error.message))});pane.dispose=()=>pane.editor.dispose();}
  else if(doc.kind==='widget'){pane.editor=new WidgetEditor(element,doc,()=>projectAssetFiles,{before:remember,change:changed,error:notify});pane.dispose=()=>pane.editor.dispose();}
  else if(doc.kind==='audiomixer'){pane.editor=new AudioMixerEditor(element,doc,{before:remember,change:changed,error:notify,files:()=>projectAssetFiles});pane.dispose=()=>pane.editor.dispose();}
  else renderDataEditor(element,doc,projectAssetFiles,dataEditorHooks());
  return id;
}
function activateDocument(path,reset=false){
  if(running&&!switchingDocument&&!gameplayTypes[assetDocs.items.get(path)?.kind]&&path!==activeScenePath)return notify('실행 중에는 현재 장면과 게임플레이 진단 에셋을 열 수 있어요.');
  if(!assetDocs.items.has(path))return;
  if(assetDocs.active===path&&!reset){renderInspector();return;}
  captureDocument();switchingDocument=true;const doc=assetDocs.select(path);workspace=doc.kind;history=doc.history;future=doc.future;
  try{
    if(!running||doc.kind!=='scene')installDocumentData(doc);const paneId=ensureAssetPane(doc);focusedWindow=doc.kind==='blueprint'?'blueprint':paneId;
    const ids=new Set(dock.entries.keys()),restored=!reset&&restoreLayout(doc.layout,ids);
    dock.maximized=null;dock.tree=restored&&validLayout(restored,ids)?restored:{axis:'column',ratio:defaultDockRatio(),a:{tabs:[paneId],active:paneId},b:{tabs:['project','console'],active:'project'}};
    // A document may only expose its own editor and its own auxiliary panels.
    const allowed=new Set([paneId,...[...dock.entries].filter(([,entry])=>['project','console','world','placement','references','profiler'].includes(entry.kind)).map(([id])=>id),'project','console',...extraViewports.map(v=>v.id),...(doc.kind==='blueprint'?['components:'+path,...[...timelineWindows.keys()].filter(k=>k.startsWith('timeline:'+path+':'))]:[])]);
    dock.tree=restoreLayout(dock.tree,allowed)||{tabs:[paneId],active:paneId};dock.render();setWorkspace(doc.kind,false);renderDocumentTabs();
    $('#blueprint-results').hidden=true;$('#node-palette').hidden=true;$('#floating-menu').hidden=true;
  }finally{switchingDocument=false;}queueRecovery();
}
async function closeDocument(path){
  if(running)return notify('실행을 종료한 뒤 문서를 닫으세요.');captureDocument();const doc=assetDocs.items.get(path);if(!doc)return;
  if(doc.dirty){const choice=await closeChoice(assetTitle(path));if(choice==='cancel')return;if(choice==='save'){try{await assetDocs.save(doc,(p,text,expected)=>editorRequest('/api/asset/write',{method:'POST',body:JSON.stringify({path:p,text,expected})}));if(doc.dirty)return notify('저장 중 새 변경 사항이 생겼어요. 다시 저장한 뒤 닫으세요.');}catch(error){return notify('저장 실패: '+error.message);}}}
  const closingWorld=doc.kind==='scene'&&activeScenePath===path;let worldDoc=closingWorld?[...assetDocs.items.values()].filter(d=>d.kind==='scene'&&d!==doc).at(-1):null,worldSaved;
  if(closingWorld&&!worldDoc){try{worldSaved=JSON.parse(doc.saved);if(!validScene(worldSaved))throw Error('장면 저장 기준 검증 실패');}catch(error){return notify(error.message);}}
  const componentId='components:'+path;dock.entries.get(componentId)?.dispose?.();dock.entries.get(componentId)?.element.remove();dock.entries.delete(componentId);const wasActive=assetDocs.active===path;assetDocs.close(path,true);const documentId='asset:'+path;dock.entries.get(documentId)?.dispose?.();documents.get(documentId)?.remove();documents.delete(documentId);dock.entries.delete(documentId);const pane=assetPanes.get(path);pane?.editor?.dispose?.();pane?.dispose?.();if(pane){pane.element.remove();dock.entries.delete(pane.id);assetPanes.delete(path);}for(const id of [...timelineWindows.keys()])if(id.startsWith('timeline:'+path+':')){timelineWindows.get(id)?.dispose?.();dock.entries.get(id)?.element.remove();dock.entries.delete(id);timelineWindows.delete(id);}
  if(closingWorld){worldDoc??=assetDocs.open(doc.path,'scene',worldSaved);installDocumentData(worldDoc);}
  if(wasActive){const next=assetDocs.active||[...assetDocs.items.keys()].at(-1);assetDocs.active=null;if(next)activateDocument(next);else{try{const data=doc.kind==='scene'?JSON.parse(doc.saved):await(await editorRequest(fileUrl(activeScenePath))).json();const d=assetDocs.open(activeScenePath,'scene',data);activateDocument(d.path);}catch(error){notify(error.message);}}}else renderDocumentTabs();dirty=[...assetDocs.items.values()].some(d=>d.dirty);$('#dirty-mark').hidden=!dirty;queueRecovery();
}
function renderAssetInspector(){
  const doc=assetDocs.current;if(!doc)return;const kind=doc.kind;
  $('#inspector-content').innerHTML=`<div class="editor-asset-summary">${icon(assetIcon(kind))}<h3>${escapeHtml(doc.data.name||assetTitle(doc.path))}</h3><p>${escapeHtml(assetTypes[kind]?.label||kind)}</p><p>${escapeHtml(doc.path)}</p></div>`+(kind==='material'?`<section class="component-section"><h3>표면</h3>${materialProperties()}${materialSurfaceDetails()}</section><section class="component-section"><button data-action="apply-material" data-icon="check">선택 오브젝트에 적용</button></section>`:kind==='blueprint'?'':`<section class="component-section"><div class="property-row"><span>상태</span><span>${doc.dirty?'수정됨':'저장됨'}</span></div></section>`);icons($('#inspector-content'));
}
function renameDocumentPaths(from,to){
  captureDocument();
  const remap=p=>typeof p==='string'&&(p===from||p.startsWith(from+'/'))?to+p.slice(from.length):p;
  const paneId=id=>{for(const prefix of ['asset:','components:'])if(id?.startsWith(prefix))return prefix+remap(id.slice(prefix.length));if(id?.startsWith('timeline:')){const split=id.lastIndexOf(':');return 'timeline:'+remap(id.slice(9,split))+id.slice(split);}return id;};
  const layout=n=>{if(!n)return;if(n.tabs){n.tabs=n.tabs.map(paneId);n.active=paneId(n.active);}else{layout(n.a);layout(n.b);}};
  const referenceKeys=new Set(['blueprintAsset','materialAsset','asset','inputMapping','headerPath','sourcePath','action','model','texture','spriteAsset','tilemapAsset','prefabAsset','parent','physicalMaterial','defaultInputMapping','startupScene','startupBlueprint','clip','tileset','sprite','gameConfig','gameMode','gameState','playerController','playerState','defaultPawn']);
  const references=value=>{let changed=false;if(!value||typeof value!=='object')return false;for(const [key,v] of Object.entries(value)){if(referenceKeys.has(key)&&typeof v==='string'){const next=remap(v);if(next!==v){value[key]=next;changed=true;}}else if(v&&typeof v==='object')changed=references(v)||changed;}return changed;};
  activeScenePath=remap(activeScenePath);activeBlueprintPath=remap(activeBlueprintPath);codeHeaderPath=remap(codeHeaderPath);codeSourcePath=remap(codeSourcePath);
  assetDocs.rename(from,to);
  for(const doc of assetDocs.items.values()){if(references(doc.data))doc.dirty=true;for(const snapshot of [...doc.history,...doc.future])references(snapshot);layout(doc.layout);}
  references(objects);
  for(const [id,element] of [...documents]){const next=paneId(id);if(next!==id){documents.delete(id);documents.set(next,element);}}
  for(const [id,entry] of [...dock.entries]){const next=paneId(id);if(next!==id){dock.entries.delete(id);entry.id=next;if(entry.path){entry.path=remap(entry.path);entry.title=assetTitle(entry.path);const toolbar=entry.element.querySelector('.document-toolbar');if(toolbar)toolbar.firstChild.textContent=entry.path;}dock.entries.set(next,entry);}}
  for(const [path,pane] of [...assetPanes]){const next=remap(path);if(next!==path){assetPanes.delete(path);pane.id=paneId(pane.id);assetPanes.set(next,pane);}}
  for(const [id,editor] of [...timelineWindows]){const next=paneId(id);if(next!==id){timelineWindows.delete(id);timelineWindows.set(next,editor);}}
  for(const [path,type] of [...inputActionTypes]){const next=remap(path);if(next!==path){inputActionTypes.delete(path);inputActionTypes.set(next,type);}}
  for(const file of projectAssetFiles){const next=remap(file.path);if(next!==file.path){file.path=next;file.name=next.split('/').pop();}}
  layout(dock.tree);focusedWindow=paneId(focusedWindow);dock.render();setWorkspace(workspace,false);renderDocumentTabs();queueRecovery();
}
async function browseDocument(){const doc=assetDocs.current,browser=focusedProjectBrowser();if(!doc||!browser)return;await browser.navigate(doc.path.split('/').slice(0,-1).join('/'));browser.selected=new Set([doc.path]);browser.selection();dock.open(browser.id);}
async function wrapSource(file){
  try{const header=/\.(h|hpp)$/i.test(file.path)?file.path:file.path.replace(/\.cpp$/i,'.h'),source=header.replace(/\.(h|hpp)$/i,'.cpp');const text=await(await editorRequest(fileUrl(header))).text(),implementation=await(await editorRequest(fileUrl(source))).text(),meta=parseNativeHeader(text),c=meta.classes.find(c=>c.blueprintable);if(!c)throw Error('Blueprintable 클래스를 찾을 수 없어요.');
    const name='BP_'+c.name,data=createAsset('blueprint',name,blueprintClasses[c.base]?c.base:'Actor');data.native={...meta,header:text,source:implementation,headerPath:header,sourcePath:source};data.settings.parentClass=c.name;
    const result=await(await editorRequest('/api/import?'+new URLSearchParams({folder:focusedProjectBrowser()?.folder||'Assets',name:name+assetSuffix.blueprint}),{method:'POST',body:JSON.stringify(data,null,2)})).json();await project.refresh();await openProjectAsset({...result,name});
  }catch(error){notify(error.message);}
}
$('#document-tabs').addEventListener('click',e=>{const close=e.target.closest('[data-close-document]'),tab=e.target.closest('[data-document]');if(close)closeDocument(close.dataset.closeDocument);else if(tab)activateDocument(tab.dataset.document);});
$('#document-tabs').addEventListener('dragstart',e=>{const tab=e.target.closest('[data-document]');if(tab)e.dataTransfer.setData('application/x-hb-document',tab.dataset.document);});
$('#document-tabs').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-hb-document'))e.preventDefault();});
$('#document-tabs').addEventListener('drop',e=>{const target=e.target.closest('[data-document]'),path=e.dataTransfer.getData('application/x-hb-document');if(!target||!assetDocs.items.has(path))return;e.preventDefault();const doc=assetDocs.items.get(path),entries=[...assetDocs.items].filter(([p])=>p!==path),i=entries.findIndex(([p])=>p===target.dataset.document);entries.splice(i<0?entries.length:i,0,[path,doc]);assetDocs.items=new Map(entries);renderDocumentTabs();queueRecovery();});
$('#document-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const paths=[...assetDocs.items.keys()],i=paths.indexOf(assetDocs.active);activateDocument(paths[(i+(e.key==='ArrowLeft'?-1:1)+paths.length)%paths.length]);$('#document-tabs [aria-selected="true"]')?.focus();}});
$('#document-tabs').addEventListener('auxclick',e=>{if(e.button===1){const tab=e.target.closest('[data-document]');if(tab){e.preventDefault();closeDocument(tab.dataset.document);}}});

const dockHost=document.createElement('div');dockHost.id='dock-host';$('.center-workspace').append(dockHost);$('.editor-grid').classList.add('docked');
const assetPanel=$('.asset-panel'),consolePanel=$('#console-content');consolePanel.hidden=false;assetPanel.querySelector('.asset-panel-tabs').hidden=true;
const recoveredBrowsers=savedBrowserIds().filter(id=>id!=='project').map(id=>createProjectWindow({id}));
dock=new DockLayout(dockHost,[...['scene','material','blueprint'].map(id=>({id,title:{scene:'뷰포트',material:'머테리얼 그래프',blueprint:'그래프'}[id],element:$('#'+id+'-workspace'),...(id==='scene'?{navigateHistory:direction=>navigateScene(direction)}:{})})),{id:'project',kind:'project',title:'콘텐츠 브라우저',element:assetPanel,navigateHistory:direction=>project?.navigateHistory(direction)},{id:'console',kind:'console',title:'출력 로그',element:consolePanel},...recoveredBrowsers],id=>{focusedWindow=id;if(!switchingDocument&&!['project','console'].includes(dock?.entries.get(id)?.kind))renderInspector();},{createWindow:createEditorWindow,windows:[{kind:'placement',title:'오브젝트 배치'},{kind:'project',title:'새 콘텐츠 브라우저'},{kind:'viewport',title:'새 뷰포트'},{kind:'editor',title:'에셋 편집기'},{kind:'console',title:'출력 로그'},{kind:'world',title:'월드 설정'}],onChange:()=>{if(!switchingDocument&&assetDocs.current)queueRecovery();}});
$('#animation-workspace').remove();
const windowMenu=document.createElement('select');windowMenu.className='window-selector';windowMenu.ariaLabel='작업창 추가';windowMenu.innerHTML='<option value="">창</option>'+[['placement','오브젝트 배치'],['newViewport','새 뷰포트'],['newBrowser','새 콘텐츠 브라우저'],['world','월드 설정'],['profiler','프로파일러'],['editor','에셋 편집기'],['project','콘텐츠 브라우저'],['console','출력 로그'],['reset','배치 초기화']].map(([id,title])=>`<option value="${id}">${title}</option>`).join('');$('.workspace-bar').append(windowMenu);windowMenu.onchange=()=>{const id=windowMenu.value;windowMenu.value='';if(id==='placement')openPlacement();else if(id==='newViewport')createViewportWindow();else if(id==='newBrowser')createProjectWindow();else if(id==='world')openWorldSettings();else if(id==='profiler')openProfiler();else if(id==='reset')activateDocument(assetDocs.active,true);else if(id==='editor')dock.open(ensureAssetPane(assetDocs.current));else dock.open(id);};
document.addEventListener('click',e=>{if(e.target.closest('[data-action="edit-timeline"]'))openTimeline();const b=e.target.closest('[data-code-tab]');if(b){$('#cpp-code').hidden=b.dataset.codeTab!=='header';$('#cpp-source').hidden=b.dataset.codeTab!=='source';$$('[data-code-tab]').forEach(el=>el.classList.toggle('active',el===b));}});
document.addEventListener('change',event=>{const key=event.target.dataset.materialSetting;if(!key||assetDocs.current?.kind!=='material')return;const next={...editingSurface(),[key]:event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?Number(event.target.value):event.target.value};if(!validMaterialSurface(next)){notify('머테리얼 값의 범위를 확인하세요.');renderAssetInspector();return;}remember();assetDocs.current.data.surface=next;updateSurface();changed();});
async function assignObjectAsset(key,path){
  const owner=assetDocs.items.get(activeScenePath),id=selected;if(owner?.kind!=='scene'||running)return;
  const kind=key==='blueprintAsset'?'blueprint':path.endsWith('.hbmaterialinstance.json')?'materialinstance':'material',data=path?(assetDocs.items.get(path)?.data||await(await editorRequest(fileUrl(path))).json()):null;
  if(data&&!validAsset(kind,data))throw Error('에셋 검증 실패');
  const resolved=data&&kind!=='blueprint'?await resolveMaterialAsset(data,readAsset):null;
  if(assetDocs.items.get(owner.path)!==owner)throw Error('대상 장면이 닫혔어요.');if(running)throw Error('실행을 종료한 뒤 편집하세요.');activateDocument(owner.path);
  const o=objects.find(o=>o.id===id);if(!o)throw Error('대상 오브젝트가 삭제됐어요.');remember();
  if(path){o[key]=path;if(kind==='blueprint')o.blueprint=data.name;else{o.materialSurface=evaluateMaterial(resolved);const renderer=objectComponents(o).find(c=>c.type==='MeshRenderer');if(renderer)renderer.properties.material=path;}}else{delete o[key];delete o[kind==='blueprint'?'blueprint':'materialSurface'];if(kind!=='blueprint'){const renderer=objectComponents(o).find(c=>c.type==='MeshRenderer');if(renderer)renderer.properties.material='';}}
  rebuildWorld();renderInspector();changed();
}
document.addEventListener('change',async e=>{if(e.target.matches('[data-object-asset]')){try{await assignObjectAsset(e.target.dataset.objectAsset,e.target.value);}catch(error){notify(error.message);renderInspector();}return;}if(e.target.matches('[data-object-blueprint]')){if(running)return;remember();const o=objects.find(o=>o.id===selected);if(e.target.checked){o.blueprint=graphs.blueprint.name;o.blueprintAsset=activeBlueprintPath;}else{delete o.blueprint;delete o.blueprintAsset;}changed();}});
$('#scene-canvas').addEventListener('blur',()=>{if(running)runtime.releaseInput().catch(e=>notify(e.message));});$('#scene-canvas').tabIndex=0;$('#scene-canvas').addEventListener('keydown',e=>{if(running&&!e.isComposing&&e.key!=='Escape'){e.preventDefault();e.stopPropagation();if(runtime.paused)return;runtime.input(e.key,1).catch(error=>notify(error.message));}});$('#scene-canvas').addEventListener('keyup',e=>{if(running){e.preventDefault();e.stopPropagation();if(runtime.paused)return;runtime.input(e.key,0).catch(error=>notify(error.message));}});
project=new ProjectBrowser($('#assets-content'),$('#asset-breadcrumb'),projectHooks());projectBrowsers.set('project',project);dock.entries.get('project').browser=project;
renderHierarchy();renderInspector();renderGraph('material');renderGraph('blueprint');renderCommands();initRendering();updateSurface();
assetDocs.open(activeScenePath,'scene',sceneSnapshot()).saved=JSON.stringify(startupDiskData);
let restoredPath,restoredScene;
try{const recovery=JSON.parse(storage.getItem(storageKey('hbengine.documents.v2'))||'null');if(Array.isArray(recovery?.documents)){for(const record of recovery.documents){if(!(assetSuffix[record.kind]||record.kind==='text')||!validAsset(record.kind,record.data))continue;const doc=assetDocs.open(record.path,record.kind,record.data);Object.assign(doc,{data:record.data,saved:record.saved,dirty:!!record.dirty,view:record.view||{},layout:record.layout});}restoredPath=recovery.active;restoredScene=recovery.scene;}}catch{}
if(assetDocs.items.get(restoredScene)?.kind==='scene')installDocumentData(assetDocs.items.get(restoredScene));
if(!restoredPath&&savedBlueprint){const legacy=assetDocs.open(activeBlueprintPath,'blueprint',savedBlueprint);legacy.dirty=true;}
activateDocument(assetDocs.items.has(restoredPath)?restoredPath:activeScenePath);
await refreshAssetIndex();

if(lastSaved)$('#save-status').textContent='이전 작업 복원';
editorRequest('/api/editor').then(r=>r.json()).then(data=>$('#external-code-button').title=data.name||'Visual Studio / Visual Studio Code').catch(()=>{});
let closingEngine=false;
window.hbEngineRequestClose=async()=>{
  if(closingEngine)return false;closingEngine=true;
  try{if(running)await stopPlay();captureDocument();const modified=[...assetDocs.items.values()].filter(d=>d.dirty);
    if(modified.length){const choice=await closeChoice(session.name);if(choice==='cancel')return false;if(choice==='save'){if(!await save(true)||[...assetDocs.items.values()].some(d=>d.dirty))return false;}else{
      const saved=modified.map(doc=>{const data=JSON.parse(doc.saved);if(!validAsset(doc.kind,data))throw Error('저장 기준 데이터 검증 실패: '+doc.path);return {doc,data};});
      for(const {doc,data} of saved){doc.data=data;doc.dirty=false;doc.history=[];doc.future=[];}
      const worldDoc=assetDocs.items.get(activeScenePath);if(worldDoc?.kind==='scene')installDocumentData(worldDoc);if(assetDocs.current)installDocumentData(assetDocs.current);history=assetDocs.current?.history||[];future=assetDocs.current?.future||[];renderDocumentTabs();renderInspector();updateSurface();
    }}
    clearTimeout(recoveryTimer);if(!persistRecovery())return false;await flushStorage();window.chrome?.webview?.postMessage('hbengine.close');return true;
  }catch(error){notify('종료 실패: '+error.message);return false;}finally{closingEngine=false;}
};
const automationState=()=>({projectId:session.id,projectName:session.name,activeDocument:assetDocs.active,focusedWindow,workspace,running,paused,startingPlay,selection:[...sceneSelection],documents:[...assetDocs.items.values()].map(doc=>({path:doc.path,kind:doc.kind,dirty:doc.dirty})),layout:clone(dock.tree)});
function automationEditable(inspect=false){if(running&&!inspect||startingPlay||stoppingPlay)throw Error('실행 종료 후 편집할 수 있어요.');if(transform?.dragging||$$('dialog').some(dialog=>dialog.open))throw Object.assign(Error('편집 중인 동작을 먼저 마무리하세요.'),{code:'EDITOR_BUSY'});}
async function automationDocument(params,mutate=false){if(mutate)automationEditable();captureDocument();const doc=assetDocs.items.get(params.path||assetDocs.active);if(!doc)throw Error('문서를 먼저 여세요.');const before=JSON.stringify(doc.data),revision=await documentRevision(doc.data);captureDocument();if(assetDocs.items.get(doc.path)!==doc||JSON.stringify(doc.data)!==before||mutate&&params.expectedRevision!==revision)throw Object.assign(Error('문서가 변경됐어요. 최신 revision을 조회하세요.'),{code:'REVISION_CONFLICT'});return {doc,revision};}
async function automationAuthoringEdit(params,kind,edit){
  const {doc}=await automationDocument(params,true);if(doc.kind!==kind)throw Error('문서 종류를 확인하세요.');const next=clone(doc.data),result=edit(next);if(!validAsset(kind,next))throw Error('편집 결과 검증 실패');
  if(params.dryRun)return {valid:true,data:next,result,revision:await documentRevision(next)};
  activateDocument(doc.path);const previous=clone(doc.data),previousHistory=[...history],previousFuture=[...future],previousDirty=doc.dirty;remember();
  try{doc.data=next;installDocumentData(doc);changed();}catch(error){doc.data=previous;doc.dirty=previousDirty;history=doc.history=previousHistory;future=doc.future=previousFuture;try{installDocumentData(doc);}catch{}throw error;}
  return {path:doc.path,dirty:true,result,revision:await documentRevision(doc.data)};
}
function automationGraph(data,view='event'){if(!['event',...(data.construction?['construction']:[]),...data.functions.map(d=>d.id),...data.macros.map(d=>d.id)].includes(view))throw Error('그래프 ID를 확인하세요.');return graphContext(data,view);}
const disconnectAutomation=connectAutomation({request:editorRequest,state:automationState,methods:{
  'editor.state':()=>({...automationState(),logs:clone(logs.slice(-100))}),
  'profiler.read':()=>profiler.snapshot(),
  'profiler.record':({recording})=>{if(typeof recording!=='boolean')throw Error('기록 여부는 Boolean이에요.');profiler.recording=recording;return {recording};},
  'profiler.clear':()=>{profiler.clear();return {cleared:true};},
  'widget.add':params=>automationAuthoringEdit(params,'widget',data=>({node:addWidget(data,params.type,{parent:params.parent,name:params.name})})),
  'widget.reparent':params=>automationAuthoringEdit(params,'widget',data=>{reparentWidget(data,params.node,params.parent);return {node:params.node,parent:params.parent};}),
  'widget.duplicate':params=>automationAuthoringEdit(params,'widget',data=>({node:duplicateWidget(data,params.node,{parent:params.parent,offset:params.offset})})),
  'widget.remove':params=>automationAuthoringEdit(params,'widget',data=>({removed:removeWidget(data,params.node)})),
  'document.open':async({path})=>{automationEditable(true);if(typeof path!=='string')throw Error('에셋 경로가 필요해요.');if(!projectAssetFiles.some(file=>file.path===path))await refreshAssetIndex();const file=projectAssetFiles.find(file=>file.path===path);if(!file)throw Error('프로젝트 파일이 없어요.');await openProjectAsset(file);return automationState();},
  'document.get':async params=>{const {doc,revision}=await automationDocument(params);return {path:doc.path,kind:doc.kind,revision,dirty:doc.dirty,data:clone(doc.data)};},
  'document.patch':async params=>{const {doc}=await automationDocument(params,true),next=patchAsset(doc.kind,doc.data,params.operations);if(params.dryRun)return {valid:true,revision:await documentRevision(next),data:next};activateDocument(doc.path);const previous=clone(doc.data),previousHistory=[...history],previousFuture=[...future],previousDirty=doc.dirty;remember();try{doc.data=next;installDocumentData(doc);changed();}catch(error){doc.data=previous;doc.dirty=previousDirty;history=doc.history=previousHistory;future=doc.future=previousFuture;try{installDocumentData(doc);}catch{}throw error;}log('AI 명령으로 에셋 수정: '+doc.path);return {path:doc.path,revision:await documentRevision(doc.data),dirty:true};},
  'document.save':async params=>{const {doc}=await automationDocument(params,true);activateDocument(doc.path);if(!await save())throw Error('저장 실패');return {path:doc.path,revision:await documentRevision(doc.data),dirty:doc.dirty};},
  'editor.undo':async params=>{const {doc}=await automationDocument(params,true);activateDocument(doc.path);undo();return {path:doc.path,revision:await documentRevision(doc.data),dirty:doc.dirty};},
  'editor.redo':async params=>{const {doc}=await automationDocument(params,true);activateDocument(doc.path);redo();return {path:doc.path,revision:await documentRevision(doc.data),dirty:doc.dirty};},
  'blueprint.connect':params=>automationAuthoringEdit(params,'blueprint',data=>{if(!params.from||!params.to)throw Error('양쪽 핀이 필요해요.');const result=connectAutomatic(automationGraph(data,params.view),params.from,params.to);if(!result.ok)throw Error(result.reason);return {conversionNode:result.node?.id||null};}),
  'blueprint.variable.drop':params=>automationAuthoringEdit(params,'blueprint',data=>{if(!params.position||!['x','y'].every(k=>Number.isFinite(params.position[k])&&Math.abs(params.position[k])<=10000)||params.target&&!['in','out'].includes(params.target.direction))throw Error('드롭 위치와 핀 방향을 확인하세요.');const result=dropVariable(automationGraph(data,params.view),params.variableId,params.target,params.position,params.mode);if(!result.ok)throw Error(result.reason);return {node:result.node.id};}),
  'scene.place':params=>automationAuthoringEdit(params,'scene',data=>{const object=createPlacedObject(params.key,{position:params.position||[0,0,0]});data.objects.push(object);return {object:object.id};}),
  'scene.select':({ids,focus=false})=>{automationEditable();if(!Array.isArray(ids)||ids.some(id=>!objects.some(object=>object.id===id)))throw Error('장면 오브젝트 ID를 확인하세요.');activateDocument(activeScenePath);sceneSelection=new Set(ids);if(ids.length)selectObject(ids[0],true,{preserveSelection:true});else{selected=null;transform?.detach();if(selectionBox)selectionBox.visible=false;renderInspector();}renderHierarchy();if(focus)focusObject();return automationState();},
  'runtime.play':async()=>{if(running)return automationState();automationEditable();await startPlay();if(!running)throw Error('실행 준비 실패. 출력 로그를 확인하세요.');return automationState();},
  'runtime.stop':async()=>{await stopPlay();return automationState();},
  'runtime.pause':()=>{if(!running)throw Error('게임이 실행 중이 아니에요.');runtime.pause();paused=true;updatePlayButtons();return automationState();},
  'runtime.resume':()=>{if(!running)throw Error('게임이 실행 중이 아니에요.');runtime.continue();paused=false;updatePlayButtons();return automationState();},
  'runtime.input':async({key,value=1})=>{if(!running||runtime.paused)throw Error('실행 중 일시 정지를 해제하세요.');if(typeof key!=='string'||!key||key.length>80||!Number.isFinite(value)||Math.abs(value)>1)throw Error('입력 키와 -1~1 값을 확인하세요.');await runtime.input(key,value);return automationState();},
  'runtime.openScene':async({path})=>{if(!running||startingPlay||stoppingPlay)throw Error('장면 전환 가능한 게임 실행이 필요해요.');await runtimeServices.operation('openScene',{scene:path},{self:runtime.bindings[0]?.self},runtime);return {requested:runtime.sceneRequest?.path||path};},
  'runtime.state':()=>({running,paused,scene:runtimeScenePath||activeScenePath,pendingScene:runtime?.sceneRequest?.path||null,dimension:runtimeSettings.dimension,viewMode,environment:clone(environment),time:playTime,objects:clone(objects),gameplay:clone(runtimeServices?.gameplay||null),logs:clone(logs.slice(-100))}),
  'native.build':async({path})=>{automationEditable();const doc=assetDocs.items.get(path||assetDocs.active);if(doc?.kind!=='blueprint'||!doc.data.native)throw Error('C++이 연결된 블루프린트가 필요해요.');activateDocument(doc.path);if(!await buildNative())throw Error(doc.view.nativeDiagnostics||'빌드가 완료되지 않았어요.');return {path:doc.path,built:!!doc.view.nativeBuild};}
}});
window.addEventListener('pagehide',disconnectAutomation,{once:true});
log('프로젝트를 열었어요.');requestAnimationFrame(animate);window.chrome?.webview?.postMessage('hbengine.ready.editor');
