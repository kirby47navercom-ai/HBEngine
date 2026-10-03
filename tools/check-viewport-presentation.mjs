import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {ViewportPresentation,applyViewportDirection,fitViewportSelection,validViewportSettings,defaultViewportSettings,viewportModes} from '../prototype/viewport-presentation.js';
let count=0;const check=(value,message)=>{assert.ok(value,message);count++;};const near=(a,b,message)=>check(Math.abs(a-b)<1e-7,message||`${a} ≈ ${b}`);
const effectiveVisible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
const fixture=()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.01,100000),original=new THREE.MeshStandardMaterial({color:'#ab342f',roughness:.4,opacity:.7,transparent:true}),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),original),sprite=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#33aa88'})),helper=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial()),selection=new THREE.BoxHelper(mesh),grid=new THREE.GridHelper(),collision=new THREE.Group(),sky=new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshBasicMaterial()),light=new THREE.DirectionalLight();
  mesh.userData.objectId='mesh';sprite.userData.objectId='sprite';helper.userData.editorHelper=true;scene.add(mesh,sprite,helper,selection,grid,collision,sky,light);scene.fog=new THREE.Fog('#224466',1,200);scene.environment=new THREE.Texture();scene.userData.heightFogUniforms={hbHeightFogEnabled:{value:1}};
  const renderer={toneMappingExposure:.8,render(world,c){this.snapshot={camera:c,material:mesh.material,spriteMaterial:sprite.material,color:mesh.material.color?.getHex(),map:mesh.material.map,opacity:mesh.material.opacity,visibility:new Map([mesh,sprite,helper,selection,grid,collision,sky,light].map(o=>[o,effectiveVisible(o)])),fog:world.fog,environment:world.environment,exposure:this.toneMappingExposure,heightFog:world.userData.heightFogUniforms.hbHeightFogEnabled.value};if(this.fail)throw Error('GPU sample failure');}};
  const options={grid,helpers:[helper],selection,collision,sky:[sky],objects:[{id:'mesh',kind:'cube'},{id:'sprite',kind:'sprite'}]};return {scene,camera,original,mesh,sprite,helper,selection,grid,collision,sky,light,renderer,options};
};
check(validViewportSettings(structuredClone(defaultViewportSettings)),'default viewport settings valid');check(!validViewportSettings({...structuredClone(defaultViewportSettings),mode:'unsupported'}),'unknown rendering mode rejected');check(!validViewportSettings({...structuredClone(defaultViewportSettings),camera:{fov:60,near:10,far:5}}),'invalid clipping planes rejected');
{
  const f=fixture(),presentation=new ViewportPresentation();presentation.configure({flags:{meshes:false,sprites:false,lights:false,sky:false,fog:false},exposure:2});const fog=f.scene.fog,environment=f.scene.environment;presentation.render(f.renderer,f.scene,f.camera,f.options);const shot=f.renderer.snapshot;
  for(const o of [f.mesh,f.sprite,f.light,f.sky])check(shot.visibility.get(o)===false,'show flags hide corresponding render objects');check(shot.fog===null&&shot.heightFog===0,'fog show flag hides both linear and height fog');check(shot.environment===null,'lighting show flag disables environment lighting');near(shot.exposure,1.6,'per-viewport exposure multiplies scene exposure');check(f.scene.fog===fog&&f.scene.environment===environment,'shared scene fog/environment restored');near(f.renderer.toneMappingExposure,.8,'renderer exposure restored');near(f.scene.userData.heightFogUniforms.hbHeightFogEnabled.value,1,'height fog restored');check(f.mesh.visible&&f.sprite.visible&&f.light.visible&&f.sky.visible,'other viewports retain original object visibility');presentation.dispose();
}
{
  const f=fixture(),presentation=new ViewportPresentation();f.sprite.visible=false;presentation.configure({gameView:true,flags:{collision:true}});presentation.render(f.renderer,f.scene,f.camera,f.options);for(const o of [f.helper,f.selection,f.grid,f.collision])check(f.renderer.snapshot.visibility.get(o)===false,'game view hides editor overlays');check(f.renderer.snapshot.visibility.get(f.mesh)===true,'game view retains game mesh');check(f.sprite.visible===false,'an originally hidden object remains hidden');presentation.dispose();
}
{
  const f=fixture(),presentation=new ViewportPresentation();presentation.configure({mode:'unlit'});presentation.render(f.renderer,f.scene,f.camera,f.options);const first=f.renderer.snapshot.material;check(first.isMeshBasicMaterial,'unlit draws without scene lights');check(f.mesh.material===f.original,'source material restored after render');near(f.renderer.snapshot.color,f.original.color.getHex(),'unlit initially reflects source color');f.original.color.set('#3366dd');f.original.opacity=.2;f.original.map=new THREE.Texture();presentation.render(f.renderer,f.scene,f.camera,f.options);near(f.renderer.snapshot.color,f.original.color.getHex(),'unlit refreshes edited material color');near(f.renderer.snapshot.opacity,.2,'unlit refreshes edited material opacity');check(f.renderer.snapshot.map===f.original.map,'unlit refreshes changed texture reference');check(f.mesh.material===f.original,'editing never replaces stored scene material');presentation.dispose();
}
{
  const f=fixture(),presentation=new ViewportPresentation();presentation.configure({mode:'detailLighting'});presentation.render(f.renderer,f.scene,f.camera,f.options);f.original.normalMap=new THREE.Texture();f.original.bumpMap=new THREE.Texture();f.original.bumpScale=.15;presentation.render(f.renderer,f.scene,f.camera,f.options);check(f.renderer.snapshot.material.normalMap===f.original.normalMap,'detail lighting refreshes normal texture after edit');check(f.renderer.snapshot.material.bumpMap===f.original.bumpMap,'detail lighting refreshes bump texture after edit');near(f.renderer.snapshot.material.bumpScale,.15,'detail lighting refreshes bump scale');presentation.dispose();
}
{
  const f=fixture(),presentation=new ViewportPresentation(),second=new THREE.MeshStandardMaterial({color:'#33ff22'});f.mesh.material=[f.original,second];const material=f.mesh.material,fog=f.scene.fog,environment=f.scene.environment;presentation.configure({mode:'wireframe',gameView:true,flags:{sky:false,fog:false,lights:false},exposure:3});f.renderer.fail=true;assert.throws(()=>presentation.render(f.renderer,f.scene,f.camera,f.options),/GPU sample failure/);check(f.mesh.material===material&&f.mesh.material[0]===f.original&&f.mesh.material[1]===second,'render exception restores every original material slot');check(f.scene.fog===fog&&f.scene.environment===environment,'render exception restores shared scene');check(f.helper.visible&&f.grid.visible&&f.sky.visible&&f.light.visible,'render exception restores all temporary visibility overrides');near(f.renderer.toneMappingExposure,.8,'render exception restores exposure');near(f.scene.userData.heightFogUniforms.hbHeightFogEnabled.value,1,'render exception restores height fog');presentation.dispose();
}
{
  const f=fixture(),presentation=new ViewportPresentation(),replacement=new THREE.MeshStandardMaterial({color:'#8844aa'}),texture=new THREE.Texture(),sourceDisposals=new Map(),copyDisposals=new Map();
  const track=(material,map)=>{if(map.has(material))return;map.set(material,0);material.addEventListener('dispose',()=>map.set(material,map.get(material)+1));};
  f.original.map=texture;for(const source of [f.original,replacement,f.sprite.material,texture])track(source,sourceDisposals);
  for(const mode of ['unlit','wireframe','normals']){presentation.configure({mode});presentation.render(f.renderer,f.scene,f.camera,f.options);}
  const oldCopies=[...presentation.cache.get(f.original).values()];oldCopies.forEach(material=>track(material,copyDisposals));
  check(oldCopies.length===3,'one source retains diagnostic copies for each visited mode');
  const shared=new THREE.Mesh(f.mesh.geometry,[f.original]);shared.visible=false;f.scene.add(shared);f.mesh.material=replacement;
  presentation.configure({mode:'unlit'});presentation.render(f.renderer,f.scene,f.camera,f.options);
  check(presentation.cache.has(f.original),'hidden shared mesh and array material slot keep a live source cache');
  check(oldCopies.every(material=>copyDisposals.get(material)===0),'replacing one mesh does not dispose copies still shared by another mesh');
  f.scene.remove(shared);presentation.render(f.renderer,f.scene,f.camera,f.options);
  check(!presentation.cache.has(f.original),'removing last scene reference releases old source cache key');
  check(oldCopies.every(material=>copyDisposals.get(material)===1),'every removed source diagnostic copy is disposed exactly once');
  check(presentation.cache.has(replacement),'current replacement material retains its usable diagnostic cache');
  check([...sourceDisposals.values()].every(value=>value===0),'pruning never disposes source materials or their shared textures');
  for(const modes of presentation.cache.values())for(const material of modes.values())track(material,copyDisposals);
  const nextScene=new THREE.Scene(),nextSource=new THREE.MeshStandardMaterial({color:'#22cc88'}),nextMesh=new THREE.Mesh(new THREE.BoxGeometry(),nextSource);
  nextScene.add(nextMesh);nextScene.userData.heightFogUniforms={hbHeightFogEnabled:{value:0}};track(nextSource,sourceDisposals);
  presentation.configure({mode:'lit'});presentation.render(f.renderer,nextScene,f.camera);
  check(presentation.cache.size===0,'switching scenes prunes all departed caches even while rendering lit');
  check([...copyDisposals.values()].every(value=>value===1),'scene replacement disposes stale copies without double-disposing previous removals');
  check([...sourceDisposals.values()].every(value=>value===0),'scene replacement leaves reusable source assets alive');
  presentation.configure({mode:'unlit'});presentation.render(f.renderer,nextScene,f.camera);const nextCopy=presentation.cache.get(nextSource).get('unlit');track(nextCopy,copyDisposals);
  check(presentation.cache.size===1&&nextMesh.material===nextSource,'new scene creates a fresh cache and restores its authored material');
  presentation.dispose();
  check(presentation.cache.size===0&&copyDisposals.get(nextCopy)===1,'viewport disposal releases its remaining diagnostic copy');
  check([...copyDisposals.values()].every(value=>value===1),'viewport disposal does not revisit copies already pruned');
  check([...sourceDisposals.values()].every(value=>value===0),'all original scene materials and textures survive viewport disposal');
}
{
  const f=fixture(),presentation=new ViewportPresentation(),canvas=Object.assign(new EventTarget(),{style:{}}),transform=new TransformControls(f.camera,canvas),gizmo=transform.getHelper();
  f.camera.position.set(6,5,8);f.camera.lookAt(f.mesh.position);f.scene.add(gizmo);transform.attach(f.mesh);transform.axis='X';f.options.helpers.push(gizmo);
  // Mesh descendants need exclusion even when only their overlay root is registered.
  const overlayRoots=[f.grid,...f.options.helpers,f.selection,f.collision,...f.options.sky],overlayMaterials=new Map();
  for(const root of overlayRoots){const nested=new THREE.Group();nested.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshBasicMaterial({color:'#ee7700'})));root.add(nested);root.traverse(node=>{if(node.material)overlayMaterials.set(node,node.material);});}
  const unchanged=()=>[...overlayMaterials].every(([node,material])=>node.material===material),render=f.renderer.render;
  f.renderer.render=function(world,camera){
    check(unchanged(),'diagnostic render keeps original gizmo and overlay descendant materials during rendering');
    world.updateMatrixWorld(true);camera.updateMatrixWorld(true);render.call(this,world,camera);
  };
  try{
    for(const tool of ['translate','rotate','scale'])for(const mode of Object.keys(viewportModes)){
      transform.setMode(tool);presentation.configure({mode,flags:{collision:true}});
      assert.doesNotThrow(()=>presentation.render(f.renderer,f.scene,f.camera,f.options),tool+' gizmo updates without material.color failures in '+mode);count++;
      check(unchanged(),tool+' overlay materials remain unchanged after '+mode+' rendering');
      check(f.mesh.material===f.original,'selected scene source material restored in '+mode);
      check(mode==='lit'?f.renderer.snapshot.material===f.original:f.renderer.snapshot.material!==f.original,'diagnostic mode still overrides the selected game mesh: '+mode);
    }
  }finally{presentation.dispose();transform.dispose();}
}
const directionForward={top:[0,-1,0],bottom:[0,1,0],front:[0,0,-1],'2d':[0,0,-1],back:[0,0,1],left:[1,0,0],right:[-1,0,0]};
for(const [direction,forward] of Object.entries(directionForward)){
  const c=new THREE.OrthographicCamera(-8,8,6,-6,.01,1e7),target=new THREE.Vector3(500,60,-200);c.position.copy(target).add(new THREE.Vector3(10,20,30));applyViewportDirection(c,direction,target);c.updateMatrixWorld();check(c.getWorldDirection(new THREE.Vector3()).distanceTo(new THREE.Vector3(...forward))<1e-7,direction+' has exact viewing axis');const ndc=target.clone().project(c);near(ndc.x,0,direction+' centers target x');near(ndc.y,0,direction+' centers target y');const screenUp=new THREE.Vector3(0,1,0).applyQuaternion(c.quaternion).add(target).project(c);check(screenUp.y>0,direction+' keeps predictable up orientation');
}
const corners=bounds=>Array.from({length:8},(_,i)=>new THREE.Vector3(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z));
for(const projection of ['perspective','orthographic'])for(const aspect of [.4,1,3]){
  const c=projection==='perspective'?new THREE.PerspectiveCamera(60,aspect,.01,1e7):new THREE.OrthographicCamera(-8*aspect,8*aspect,6,-6,.01,1e7),bounds=new THREE.Box3(new THREE.Vector3(900,10,-500),new THREE.Vector3(1100,110,-420)),controls={target:new THREE.Vector3(0,0,0),update(){c.updateMatrixWorld();}};c.position.set(20,15,30);c.lookAt(controls.target);check(fitViewportSelection(c,controls,bounds),projection+' focus succeeds');for(const corner of corners(bounds)){const p=corner.project(c);check(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>=-1&&p.z<=1,projection+' focus fits every box corner at aspect '+aspect);}check(controls.target.distanceTo(bounds.getCenter(new THREE.Vector3()))<1e-7,'focus moves pivot to selected center');
}
{
  const c=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),update(){}};check(!fitViewportSelection(c,controls,new THREE.Box3()),'empty selection leaves camera unchanged');
}
console.log(`뷰포트 보기 격리·머테리얼 수정·오류 복구·직교 방향·선택 프레이밍 ${count}개 검사 통과`);
