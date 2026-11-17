import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {CollisionPreview} from '../prototype/collision-preview.js';
import {createSky,applySceneEnvironment,disposeSceneEnvironment,syncSkyToCamera} from '../prototype/scene-environment.js';
import {cameraScreenRect,fallbackGameCamera,previewGameCamera,selectGameCamera} from '../prototype/game-camera.js';
import {raycastTerrainGrid} from '../prototype/terrain-grid-raycast.js';
import {editSceneTransform} from '../prototype/scene-editor.js';
import {defaultSurface} from '../prototype/model.js';
import {loadModel} from '../prototype/engine-services.js';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {installNativeAssets} from './native-game-platform.mjs';
import {projectBytes,projectText} from './project-bytes.mjs';
import {defaultViewportSettings} from '../prototype/viewport-controls.js';
import {applyViewportDirection,fitViewportSelection,viewportDirections} from '../prototype/viewport-presentation.js';

// Unreal axes on screen: X forward (red, three +z = the map front), Y right (green, three -x), Z up (blue, three +y).
const axisSign=axis=>axis===0?-1:1;
// Solid transform gizmo meshes (shared unit geometry; posed every frame, drawn on top without depth).
function createSolidGizmo(){
  const group=new THREE.Group();group.userData.editorHelper=true;group.renderOrder=1001;
  const mat=c=>new THREE.MeshBasicMaterial({color:c,depthTest:false,depthWrite:false,toneMapped:false});
  group.userData.materials=[0x4dd96b,0x4d8dff,0xff4d4d].map(mat);group.userData.active=mat(0xffd84d);
  const shaft=new THREE.CylinderGeometry(1,1,1,10),cone=new THREE.ConeGeometry(1,1,16),cube=new THREE.BoxGeometry(1,1,1),ring=new THREE.TorusGeometry(1,.018,6,64);
  for(let axis=0;axis<3;axis++)for(const [kind,geometry] of [['shaft',shaft],['cone',cone],['cube',cube],['ring',ring]]){const mesh=new THREE.Mesh(geometry,group.userData.materials[axis]);mesh.userData={editorHelper:true,axis,kind};mesh.renderOrder=1001;mesh.frustumCulled=false;group.add(mesh);}
  return group;
}
function poseSolidGizmo(group,{tool,origin,length,basis,active}){
  const up=new THREE.Vector3(0,1,0),z=new THREE.Vector3(0,0,1);group.visible=true;
  for(const mesh of group.children){
    const {axis,kind}=mesh.userData,u=basis(axis).normalize();mesh.material=axis===active?group.userData.active:group.userData.materials[axis];
    const show=tool==='rotate'?kind==='ring':kind==='shaft'||(tool==='translate'?kind==='cone':kind==='cube');mesh.visible=show;if(!show)continue;
    if(kind==='ring'){mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(z,u);mesh.scale.setScalar(length);}
    else if(kind==='shaft'){mesh.quaternion.setFromUnitVectors(up,u);mesh.position.copy(origin).addScaledVector(u,length*.42);mesh.scale.set(length*.018,length*.84,length*.018);}
    else if(kind==='cone'){mesh.quaternion.setFromUnitVectors(up,u);mesh.position.copy(origin).addScaledVector(u,length*.92);mesh.scale.set(length*.065,length*.2,length*.065);}
    else{mesh.quaternion.setFromUnitVectors(up,u);mesh.position.copy(origin).addScaledVector(u,length*.9);mesh.scale.setScalar(length*.11);}
  }
  group.updateMatrixWorld(true);
}
export function nativeEditorViewport(bridge,surface='native-editor') {
  const canvas={width:1,height:1,clientWidth:1,clientHeight:1,pixelRatio:1};
  let renderer, content, world, source, project, dimension, camera, orthoCamera, sky, visual, primitives, updateEnvironment;
  let selection='', gizmo, handles, models=new Set(), groups=new Map(), owners=new Map();
  let solidGizmo=null,collisionView=null,particleClock=0,particleRestartSeen=0;const streamingRings=new Map();
  const ringMaterials=[new THREE.LineBasicMaterial({color:0x7bdc8a,depthTest:false,transparent:true,opacity:.9}),new THREE.LineBasicMaterial({color:0xf0a35a,depthTest:false,transparent:true,opacity:.9})];
  const unitRing=new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2),0,Math.sin(i/64*Math.PI*2))));
  let previewTransform,worldOutline,outlineKey;
  // The last gizmo drag draft stays on screen across redraws until the drag commits or cancels (no snap-back frames).
  let dragDraft=null;
  const target=new THREE.Vector3(0,.45,0), orbit=new THREE.Spherical();
  // Focus (F / outliner double-click) flies the camera over a short ease-out instead of jumping, like Unreal.
  let flyTo=null;const FLY_MS=350;
  // Editor viewport extras: floor grid, view modes (unlit / wireframe), marquee, camera bookmarks, quad panes.
  let grid=null,gridStep=0,marqueeLine=null,lastPane=0,viewModeShown='lit';const wire=new Map(),unlitMaterials=new WeakMap(),bookmarks=new Map();
  const wireMaterial=new THREE.LineBasicMaterial({color:0x9fc4ff,toneMapped:false});
  const panes=[null,{direction:'top',target:new THREE.Vector3()},{direction:'front',target:new THREE.Vector3()},{direction:'right',target:new THREE.Vector3()}];
  const unlitFor=m=>{if(Array.isArray(m))return m.map(unlitFor);let u=unlitMaterials.get(m);if(!u){u=new THREE.MeshBasicMaterial({color:m.color?.clone()??new THREE.Color(1,1,1),map:m.map??null,transparent:m.transparent,opacity:m.opacity,side:m.side,alphaTest:m.alphaTest,vertexColors:m.vertexColors});unlitMaterials.set(m,u);}return u;};
  const shownInChain=node=>{for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;};
  const ray=new THREE.Raycaster();
  const visualKey=object=>{
    const {position,rotation,scale,visible,locked,name,parent,...appearance}=object;
    return JSON.stringify(appearance);
  };
  const transform=(actor,group)=>{
    group.name=actor.name;
    group.position.fromArray(actor.position);
    group.rotation.set(...actor.rotation.map(THREE.MathUtils.degToRad));
    group.scale.fromArray(actor.scale);
    group.visible=actor.visible;
  };
  const releaseVisual=()=>{
    if (!world) return;
    if(worldOutline){worldOutline.geometry.dispose();worldOutline.material.dispose();worldOutline=null;}
    outlineKey=null;
    gizmo?.geometry.dispose();gizmo?.material.dispose();gizmo=null;
    handles?.geometry.dispose();handles?.material.dispose();handles=null;
    disposeSceneEnvironment(world);
    for (const model of models) disposeHeadlessModel(model);
    for (const group of groups.values()) visual.dispose(group);
    visual.dispose2D();primitives.dispose();
    for (const node of [sky.skyDome,sky.cloudGroup]) node.traverse(child=>{child.geometry?.dispose();child.material?.dispose();});
    for(const line of wire.values())line.geometry.dispose();wire.clear();if(grid){grid.geometry.dispose();grid.material.dispose();grid=null;}if(marqueeLine){marqueeLine.geometry.dispose();marqueeLine.material.dispose();marqueeLine=null;}viewModeShown='lit';
    world=null;groups.clear();models.clear();owners.clear();source=null;previewTransform=null;dragDraft=null;
  };
  const close=async()=>{
    try { if (renderer) await renderer.dispose(); }
    finally {releaseVisual();renderer=null;project=null;camera=orthoCamera=null;}
  };
  async function open(data,nextProject,assets) {
    if (source===data && project===nextProject) return;
    const draft=data.assetDraft;
    if(draft?.kind&&source?.assetDraft?.path===draft.path&&project===nextProject&&draft.data.terrain===source.assetDraft.data.terrain&&visual.updateWorldAsset(content.objects[0],draft.path,draft.data)){
      source=data;outlineKey=null;return;
    }
    if(source&&project===nextProject&&!data.assetDraft&&!source.assetDraft&&data.objects.length===source.objects.length&&
      ['surface','environment','runtime'].every(key=>JSON.stringify(source[key])===JSON.stringify(data[key]))&&
      data.objects.every((actor,index)=>actor.id===source.objects[index].id&&visualKey(actor)===visualKey(source.objects[index]))){
      for(const [index,actor] of data.objects.entries()){
        const group=groups.get(actor.id);
        for(const key of ['position','rotation','scale','visible','locked','name','parent'])content.objects[index][key]=actor[key];
        transform(actor,group);
        const parent=groups.get(actor.parent)||world;
        if(group.parent!==parent)world.add(group);
      }
      for(const actor of data.objects){
        const parent=groups.get(actor.parent);
        if(parent&&groups.get(actor.id).parent!==parent)parent.add(groups.get(actor.id));
      }
      updateEnvironment();source=data;return;
    }
    if (project && project!==nextProject) {
      if(renderer)await renderer.hbReleaseScene();
      releaseVisual();camera=orthoCamera=null;
    }
    if (renderer && source) await renderer.hbReleaseScene();
    releaseVisual();
    project=nextProject;
    const url=name=>'hbasset:'+encodeURIComponent(name);
    renderer??=await createNativeSceneRenderer(canvas,()=>{},{bridge,surface,graphicsAPI:'d3d12',drawEditorHelpers:true});
    world=new THREE.Scene();
    primitives=scenePrimitives(data.surface||defaultSurface);
    const ambientLight=new THREE.HemisphereLight(0xffffff,0x444444,1);
    sky=createSky(world,renderer);world.add(ambientLight);
    const read=async name=>data.assetDraft?.path===name?data.assetDraft.data:JSON.parse((await projectText(project,name)).replace(/^\uFEFF/,''));
    const warnings=[];
    visual=sceneRendering({navigationOverlay:true,read,fileUrl:url,loadTexture:assets.texture,loadModel:async name=>{
      const metadata=data.assetDraft?.data?.source===name?data.assetDraft.data:undefined;
      const model=/\.(?:gltf|glb)$/i.test(name)?await loadHeadlessModel(project,name,{geometry:true,loadTexture:assets.modelTexture,metadata}):await loadModel(name,{metadata});
      models.add(model.object);return model;
    },current:id=>groups.get(id),all:()=>[...groups.values()],editor:true,gameRenderer:renderer,error:message=>warnings.push(message)});
    const objects=structuredClone(data.objects);
    for (const actor of objects) {
      const group=primitives.build(actor);groups.set(actor.id,group);owners.set(group,actor.id);
      transform(actor,group);world.add(group);
    }
    for (const actor of objects) if (actor.parent) groups.get(actor.parent)?.add(groups.get(actor.id));
    for (const actor of objects) {
      try {await visual.build(actor,groups.get(actor.id));} catch(error) {warnings.push(actor.name+': '+error.message);}
    }
    const nextDimension=data.runtime?.dimension||'3d';
    if (!camera||dimension!==nextDimension) {
      dimension=nextDimension;camera=fallbackGameCamera('3d');
      orthoCamera=null;flyTo=null;
      target.set(0,dimension==='2d'?0:.45,0);
      orbit.setFromVector3(camera.position.clone().sub(target));
    }
    updateEnvironment=()=>applySceneEnvironment({scene:world,environment:data.environment,surface:data.surface,runtimeSettings:data.runtime,ambientLight,mainRenderer:renderer,...sky,objects});
    updateEnvironment();
    source=data;content={objects,warnings};
  }
  async function draw(data,nextProject,{width,height,command='',dx=0,dy=0,x=0,y=0,id='',selected='',cameraId='',cameraOutputs=false,capture=false,flight,smooth=false,snap,direction='',tool='translate',axis=-1,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges,...extra}) {
    const assets=installNativeAssets({url:name=>'hbasset:'+encodeURIComponent(name),manifest:{width,height},readBytes:(name,opts)=>projectBytes(nextProject,name,opts)});
    try{return await drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,smooth,snap,direction,tool,axis,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges},assets,extra);}
    finally{assets.restore();}
  }
  async function drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,smooth,snap,direction,tool,axis,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges},assets,extra={}) {
    const timing={start:performance.now()};
    const {quad=false,viewMode='lit',gameView=false,showGrid=false,gridSize=1,space='world',surfaceSnap=false,vertexSnap=false,pilot='',pivotMode='pivot',showNavigation=false,showCollision=false,showStreaming=false,particlePlaying=true,particleRestart=0,particleSpeed=1}=extra;
    visual?.navigationDebug?.(showNavigation);
    // Pivot / center (Unity): the gizmo sits on the object's pivot or on its bounds centre.
    const gizmoOrigin=g=>{if(pivotMode==='center'){const box=new THREE.Box3().setFromObject(g);if(!box.isEmpty())return box.getCenter(new THREE.Vector3());}return g.getWorldPosition(new THREE.Vector3());};
    let box=Array.isArray(extra.box)&&extra.box.length===4&&extra.box.every(Number.isFinite)?extra.box.slice():null;
    canvas.clientWidth=width;canvas.clientHeight=height;
    if(previewTransform){transform(previewTransform.actor,previewTransform.group);previewTransform=null;}
    await open(data,nextProject,assets);timing.open=performance.now();
    selection=selected;
    // Quad view: commands act in the pane under the cursor (or the last used pane); each ortho pane keeps its own target and zoom.
    const fullWidth=width,fullHeight=height,savedTarget=target.clone(),savedOrtho=orthoCamera;let pane=null;
    if(quad){
      const hw=Math.max(1,Math.floor(width/2)),hh=Math.max(1,Math.floor(height/2)),rects=[[0,0,hw,hh],[hw,0,Math.max(1,width-hw),hh],[0,hh,hw,Math.max(1,height-hh)],[hw,hh,Math.max(1,width-hw),Math.max(1,height-hh)]];
      const at=box?[box[0],box[1]]:[x,y],positioned=['orbit','pan','zoom','pick','place','translate','translatePreview','transform','transformPreview','marquee','boxSelect'].includes(command);
      const hit=positioned?rects.findIndex(([rx,ry,rw,rh])=>at[0]>=rx&&at[0]<rx+rw&&at[1]>=ry&&at[1]<ry+rh):-1;if(hit>=0)lastPane=hit;
      pane={index:lastPane,rect:rects[lastPane],rects};
      x-=pane.rect[0];y-=pane.rect[1];width=pane.rect[2];height=pane.rect[3];if(box)box=box.map((v,i)=>v-pane.rect[i%2]);
      if(pane.index>0){const p=panes[pane.index];p.camera??=fallbackGameCamera('2d');orthoCamera=p.camera;target.copy(p.target);direction=p.direction;}else direction='3d';
    }
    const aspect=width/height;
    if(direction&&!Object.hasOwn(viewportDirections,direction))throw Error('뷰포트 방향을 확인하세요.');
    const orthographic=direction&&direction!=='3d'||dimension==='2d'&&direction!=='3d'&&!(pane&&pane.index===0);
    const editorCamera=orthographic?(orthoCamera??=fallbackGameCamera('2d')):camera;
    const prepareCamera=()=>{
      if(orthographic){
        editorCamera.left=-7*aspect;editorCamera.right=7*aspect;
        editorCamera.position.copy(target).add(new THREE.Vector3(0,0,20));
        applyViewportDirection(editorCamera,direction||'2d',target);
      }else{
        editorCamera.aspect=aspect;editorCamera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));editorCamera.lookAt(target);
      }
      editorCamera.updateProjectionMatrix();editorCamera.updateMatrixWorld();
    };
    prepareCamera();
    if(command&&!['focus','pick','bookmarkGo'].includes(command))flyTo=null;
    // Camera bookmarks (Ctrl+1..9 save, 1..9 fly back).
    let bookmarkResult;
    if(command==='bookmarkSet'&&Number.isInteger(extra.bookmark)){bookmarks.set(extra.bookmark,{target:target.clone(),orbit:orbit.clone(),zoom:editorCamera.zoom,orthographic,pane:lastPane});bookmarkResult={index:extra.bookmark,saved:true};}
    if(command==='bookmarkGo'&&Number.isInteger(extra.bookmark)){const mark=bookmarks.get(extra.bookmark);bookmarkResult={index:extra.bookmark,found:!!mark};
      if(mark&&mark.orthographic===!!orthographic){let theta=mark.orbit.theta;while(theta-orbit.theta>Math.PI)theta-=2*Math.PI;while(theta-orbit.theta<-Math.PI)theta+=2*Math.PI;
        flyTo={from:{target:target.clone(),radius:orbit.radius,zoom:editorCamera.zoom,theta:orbit.theta,phi:orbit.phi},to:{target:mark.target.clone(),radius:mark.orbit.radius,zoom:mark.zoom,theta,phi:mark.orbit.phi},start:performance.now()-16,orthographic};}}
    // Pilot: the editor camera takes the object's place and view direction (-Z forward).
    if(command==='pilot'&&!orthographic){const g=groups.get(id||pilot);if(g){g.updateWorldMatrix(true,false);const at=g.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(0,0,-1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));target.copy(at).add(forward);orbit.setFromVector3(at.clone().sub(target));}}
    if (command==='focus') {
      const group=groups.get(id);
      if(group){
        group.updateWorldMatrix(true,true);
        const bounds=new THREE.Box3().setFromObject(group);
        // UI widgets and sprites may have no mesh bounds: frame their position at a 1-unit size instead.
        if(bounds.isEmpty()||!bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite))bounds.setFromCenterAndSize(group.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(1,1,1));
        const probe=editorCamera.clone(),goal={target:target.clone(),update(){}};
        if(fitViewportSelection(probe,goal,bounds)){
          const end={target:goal.target,radius:probe.position.distanceTo(goal.target),zoom:probe.zoom};
          // Start one frame in so the first draw already moves.
          flyTo={from:{target:target.clone(),radius:orbit.radius,zoom:editorCamera.zoom},to:end,start:performance.now()-(smooth?16:FLY_MS),orthographic};
        }
      }
    } else if (command==='orbit' && !orthographic) {
      orbit.theta-=dx*.008;orbit.phi-=dy*.008;orbit.makeSafe();
    } else if (command==='pan'||command==='orbit') {
      const scale=(orthographic?14/editorCamera.zoom:orbit.radius)/height;
      target.add(new THREE.Vector3(-dx*scale,dy*scale,0).applyQuaternion(editorCamera.quaternion));
    } else if (command==='zoom') {
      if (orthographic) editorCamera.zoom=THREE.MathUtils.clamp(editorCamera.zoom*1.15**dy,.01,500);
      else orbit.radius=THREE.MathUtils.clamp(orbit.radius*1.15**-dy,.025,100000);
    }
    let animating=false;
    // Particle preview: emitters (GPU simulation through the native renderer, CPU points otherwise) advanced by wall time (capped 0.1 s) while playing; restart resets every emitter.
    const particleStates=()=>[...groups.values()].flatMap(g=>[...(g.userData.particleStates?.values?.()||[]),g.userData.particleState].filter(Boolean));
    if(particleRestart!==particleRestartSeen){particleRestartSeen=particleRestart;for(const s of particleStates())s.simulation?.reset?.();}
    const particleNow=performance.now(),particleDelta=particleClock?Math.min(.1,(particleNow-particleClock)/1000):0;particleClock=particleNow;
    const emitters=data.objects.some(o=>(o.components||[]).some(c=>c.type==='ParticleSystem'&&c.properties?.enabled!==false));
    if(emitters&&visual?.tickParticles){visual.tickParticles(data.objects,particlePlaying?particleDelta*particleSpeed:0,!particlePlaying);if(particlePlaying)animating=true;}
    if(flyTo){
      const t=Math.min(1,(performance.now()-flyTo.start)/FLY_MS),k=1-(1-t)**3;
      target.lerpVectors(flyTo.from.target,flyTo.to.target,k);
      if(flyTo.orthographic)editorCamera.zoom=THREE.MathUtils.lerp(flyTo.from.zoom,flyTo.to.zoom,k);
      else orbit.radius=THREE.MathUtils.lerp(flyTo.from.radius,flyTo.to.radius,k);
      if(flyTo.to.theta!==undefined&&!flyTo.orthographic){orbit.theta=THREE.MathUtils.lerp(flyTo.from.theta,flyTo.to.theta,k);orbit.phi=THREE.MathUtils.lerp(flyTo.from.phi,flyTo.to.phi,k);orbit.makeSafe();}
      animating=t<1;if(!animating)flyTo=null;
    }
    if(flight&&!cameraId&&!cameraOutputs&&!orthographic){
      const {forward=0,right=0,up=0,seconds=0,fast=false}=flight;
      if(![forward,right,up,seconds].every(Number.isFinite))throw Error('뷰포트 이동 값을 확인하세요.');
      const scale=Number.isFinite(flight.speedScale)?Math.min(100,Math.max(.01,flight.speedScale)):1;
      const speed=defaultViewportSettings.speed*scale*(fast?defaultViewportSettings.fastMultiplier:1);
      const delta=new THREE.Vector3(right,0,-forward).applyQuaternion(editorCamera.quaternion).add(new THREE.Vector3(0,up,0));
      if(delta.lengthSq()>1)delta.normalize();
      target.addScaledVector(delta,speed*THREE.MathUtils.clamp(seconds,0,.1));
    }
    prepareCamera();
    const size={width,height},current=id=>groups.get(id);
    let active=(cameraOutputs?selectGameCamera(content.objects,size,cameraId,current):cameraId&&previewGameCamera(content.objects,size,cameraId,current))||editorCamera;
    const views=active.userData.gameViews;
    world.updateMatrixWorld(true);
    const authoring=!cameraId&&!cameraOutputs;
    const screen=point=>{
      const p=point.clone().project(active);
      return [(p.x+1)*width/2,(1-p.y)*height/2];
    };
    const handleSize=origin=>{
      const depth=-origin.clone().applyMatrix4(active.matrixWorldInverse).z;
      return 120*(active.isOrthographicCamera?1:depth)/(height*active.projectionMatrix.elements[5]);
    };
    let translation,sceneTransform,preview;
    // Gizmo axes in world or local space (Unreal Ctrl+`); scale is always local.
    const axisOf=(group,a,local=space==='local')=>local?new THREE.Vector3().setComponent(a,1).applyQuaternion(group.quaternion).transformDirection(group.parent.matrixWorld):new THREE.Vector3().setComponent(a,1);
    if(authoring&&['translatePreview','translate','transformPreview','transform'].includes(command)){
      const actor=content.objects.find(row=>row.id===selection),group=groups.get(selection);
      if(group?.visible&&!actor.locked&&[x,y,dx,dy].every(Number.isFinite)){
        const origin=gizmoOrigin(group),center=origin.clone().project(active);
        if(center.z>=-1&&center.z<=1){
          if(command.startsWith('translate')){
            const before=new THREE.Vector3(2*x/width-1,1-2*y/height,center.z).unproject(active);
            const after=new THREE.Vector3(2*(x+dx)/width-1,1-2*(y+dy)/height,center.z).unproject(active);
            translation=after.sub(before).toArray();
            // Surface snapping puts the object's base on the surface under the cursor; holding V snaps its pivot to the nearest vertex.
            if(surfaceSnap||vertexSnap){
              const own=new Set();group.traverse(n=>own.add(n));ray.setFromCamera({x:2*(x+dx)/width-1,y:1-2*(y+dy)/height},active);
              const hit=ray.intersectObjects(world.children,true).find(h=>h.object.isMesh&&!own.has(h.object)&&!h.object.userData.editorHelper&&shownInChain(h.object));
              if(hit){
                if(vertexSnap&&hit.face&&!hit.object.isInstancedMesh){const p=hit.object.geometry.attributes.position;const best=[hit.face.a,hit.face.b,hit.face.c].map(i=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(hit.object.matrixWorld)).sort((a,b)=>a.distanceToSquared(hit.point)-b.distanceToSquared(hit.point))[0];translation=best.sub(origin).toArray();}
                else{const bounds=new THREE.Box3().setFromObject(group);translation=hit.point.clone().add(new THREE.Vector3(0,bounds.isEmpty()?0:origin.y-bounds.min.y,0)).sub(origin).toArray();}
              }
            }
          }else if(Number.isInteger(axis)&&axis>=0&&axis<3&&Array.isArray(tangent)&&tangent.length===2&&tangent.every(Number.isFinite)){
            const distance=dx*tangent[0]+dy*tangent[1];
            if(tool==='translate'){
              const length=handleSize(origin);
              const along=axisOf(group,axis).multiplyScalar(axisSign(axis));
              const from=screen(origin),to=screen(origin.clone().addScaledVector(along,length));
              const pixels=Math.hypot(to[0]-from[0],to[1]-from[1]);
              if(pixels>=6&&Math.abs(distance)>1e-6)translation=along.multiplyScalar(distance*length/pixels).toArray();
            }else if(Math.abs(distance)>1e-6&&(tool==='rotate'||tool==='scale')){
              sceneTransform={axis,value:tool==='rotate'?distance/60:Math.exp(THREE.MathUtils.clamp(distance/60,-12,12)),...(tool==='rotate'?{space}:{})};
            }
          }
          // Preview and commit frames both draw the result (live, like Unreal), with grid/angle snap as the session will commit it.
          if(translation||sceneTransform){
            const draft={...actor},round=(v,step)=>Number((Math.round(v/step)*step).toFixed(6));
            editSceneTransform(draft,content.objects,translation?{mode:'translate',value:translation}:{mode:tool,...sceneTransform});
            if(translation&&snap?.grid>0)draft.position=draft.position.map(v=>round(v,snap.grid));
            if(!translation&&tool==='rotate'&&snap?.angle>0)draft.rotation=draft.rotation.map((v,i)=>i===sceneTransform.axis?round(v,snap.angle):v);
            previewTransform={group,actor};
            transform(draft,group);group.updateWorldMatrix(false,true);
            preview={id:actor.id,position:draft.position,rotation:draft.rotation,scale:draft.scale};
            dragDraft=command.endsWith('Preview')?{id:actor.id,draft}:null;
          }
        }
      }
    }
    if(['translate','transform','translateCancel'].includes(command))dragDraft=null;
    else if(!preview&&dragDraft){
      const actor=content.objects.find(row=>row.id===dragDraft.id),group=groups.get(dragDraft.id);
      if(actor&&group){previewTransform={group,actor};transform(dragDraft.draft,group);group.updateWorldMatrix(false,true);}else dragDraft=null;
    }
    let placement;
    if(command==='place'&&authoring&&x>=0&&y>=0&&x<width&&y<height){
      ray.setFromCamera({x:2*x/width-1,y:1-2*y/height},active);
      const normal=new THREE.Vector3(0,dimension==='2d'?0:1,dimension==='2d'?1:0);
      const plane=new THREE.Plane(normal,0);
      placement=(ray.ray.intersectPlane(plane,new THREE.Vector3())||target).toArray();
    }
    let worldBrush,worldSelection;
    if(data.assetDraft?.kind&&command==='worldBrush'&&Array.isArray(points)){
      const surface=groups.get('asset-preview');
      const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
      let terrain;
      (groups.get('asset-preview-terrain')||surface).traverse(node=>{
        if(node.geometry?.userData.terrainGrid)terrain=node;
      });
      worldBrush=[];
      for(const [px,py] of points){
        if(!(px>=0&&py>=0&&px<width&&py<height))continue;
        ray.setFromCamera({x:2*(px+.5)/width-1,y:1-2*(py+.5)/height},active);
        const point=raycastTerrainGrid(terrain,ray.ray)?.point||ray.ray.intersectPlane(plane,new THREE.Vector3());
        const last=worldBrush.at(-1);
        if(point&&(!last||Math.hypot(point.x-last[0],point.z-last[1])>=(brushSpacing||0)))worldBrush.push([point.x,point.z]);
      }
    }
    if(data.assetDraft?.kind&&command==='worldSelect'){
      const surface=groups.get('asset-preview');
      ray.setFromCamera({x:2*(x+.5)/width-1,y:1-2*(y+.5)/height},active);
      const hit=ray.intersectObject(surface,true).find(hit=>hit.object.isMesh&&!hit.object.userData.editorHelper);
      if(hit){
        const ids=[hit.face.a,hit.face.b,hit.face.c],position=hit.object.geometry.attributes.position;
        const points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(hit.object.matrixWorld));
        const cursor=new THREE.Vector2(x+.5,y+.5),projected=points.map(point=>new THREE.Vector2(...screen(point)));
        let vertex=0,edge=0,minEdge=Infinity;
        for(let i=0;i<3;i++){
          if(projected[i].distanceToSquared(cursor)<projected[vertex].distanceToSquared(cursor))vertex=i;
          const a=projected[i],b=projected[(i+1)%3],delta=b.clone().sub(a);
          const t=delta.lengthSq()?THREE.MathUtils.clamp(cursor.clone().sub(a).dot(delta)/delta.lengthSq(),0,1):0;
          const distance=delta.multiplyScalar(t).add(a).distanceToSquared(cursor);
          if(distance<minEdge){minEdge=distance;edge=i;}
        }
        worldSelection={face:hit.faceIndex,vertices:ids,vertex:ids[vertex],edge:[ids[edge],ids[(edge+1)%3]],
          instance:hit.object.userData.foliageIds?.[hit.instanceId]};
      }
    }
    const outline=data.assetDraft?.kind&&JSON.stringify([faces,instances,meshVertices,meshEdges]);
    if(outline!==outlineKey){
      outlineKey=outline;
      if(worldOutline){world.remove(worldOutline);worldOutline.geometry.dispose();worldOutline.material.dispose();worldOutline=null;}
      const positions=[],selectedFaces=new Set(faces),selectedInstances=new Set(instances);
      if(selectedFaces.size||selectedInstances.size||meshVertices?.length||meshEdges?.length)groups.get('asset-preview')?.traverse(node=>{
        if(!node.isMesh)return;
        const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),{geometry}=node;
        const line=(a,b)=>positions.push(...a.toArray(),...b.toArray());
        if(node.isInstancedMesh&&node.userData.foliageIds&&selectedInstances.size){
          node.userData.foliageIds.forEach((id,i)=>{
            if(!selectedInstances.has(id))return;
            const box=geometry.boundingBox;
            if(!box)return;
            node.getMatrixAt(i,matrix);matrix.premultiply(node.matrixWorld);
            const corners=Array.from({length:8},(_,i)=>new THREE.Vector3(
              i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z,
            ).applyMatrix4(matrix));
            for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))line(corners[i],corners[i|bit]);
          });
        }else if(geometry.index){
          const at=i=>point.fromBufferAttribute(geometry.attributes.position,i).clone().applyMatrix4(node.matrixWorld);
          const valid=i=>Number.isInteger(i)&&i>=0&&i<geometry.attributes.position.count;
          for(const face of selectedFaces){
            if(face*3+2>=geometry.index.count)continue;
            const corners=[0,1,2].map(i=>at(geometry.index.getX(face*3+i)));
            for(let i=0;i<3;i++)line(corners[i],corners[(i+1)%3]);
          }
          for(const [a,b] of meshEdges||[])if(valid(a)&&valid(b))line(at(a),at(b));
          const radius=(geometry.boundingSphere?.radius||1)*.018;
          for(const id of meshVertices||[])if(valid(id)){
            const p=at(id);
            for(let axis=0;axis<3;axis++){
              const offset=new THREE.Vector3().setComponent(axis,radius);
              line(p.clone().sub(offset),p.clone().add(offset));
            }
          }
        }
      });
      if(positions.length){
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        worldOutline=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x68abff,depthTest:false}));
        worldOutline.userData.editorHelper=true;
        world.add(worldOutline);
      }
    }
    if (command==='pick') {
      selection='';
      const hitY=height-y-.5;
      const hitView=views?.findLast(view=>{
        const rect=cameraScreenRect(view.region,width,height);
        return x>=rect.x&&x<rect.x+rect.width&&hitY>=rect.y&&hitY<rect.y+rect.height;
      });
      const hitCamera=views?hitView?.camera:active;
      const region=hitView?cameraScreenRect(hitView.region,width,height):{x:0,y:0,width,height};
      const fit=hitCamera?.userData.pixelViewport;
      const rect=fit?{...fit,x:region.x+fit.x,y:region.y+fit.y}:region;
      const cursor={x:2*(x+.5-rect.x)/rect.width-1,y:2*(hitY-rect.y)/rect.height-1};
      const inside=hitCamera&&Math.abs(cursor.x)<=1&&Math.abs(cursor.y)<=1;
      if(inside)ray.setFromCamera(cursor,hitCamera);
      for (const hit of inside?ray.intersectObjects(world.children,true):[]) {
        if (!hit.object.isMesh||hit.object.userData.editorHelper) continue;
        let found='';
        for (let group=hit.object;group&&group.visible;group=group.parent) {
          found ||= owners.get(group)||'';
          if (group===world) {selection=found;break;}
        }
        if (selection) break;
      }
    }
    // One selection box reused every frame (a new helper per frame re-uploaded its mesh each draw).
    const group=groups.get(selection);
    if(!gizmo){gizmo=new THREE.Box3Helper(new THREE.Box3(),0x68abff);gizmo.userData.editorHelper=true;gizmo.material.depthTest=false;gizmo.renderOrder=999;gizmo.frustumCulled=false;}
    if(gizmo.parent!==world)world.add(gizmo);
    // Show Collision (Unreal Alt+C): every collider's shape as wire lines, triggers in yellow.
    if(showCollision){collisionView??=new CollisionPreview(world);if(collisionView.group.parent!==world)world.add(collisionView.group);collisionView.update(data.objects,new Set(selection?[selection]:[]),{all:true,visible:!gameView});}else collisionView?.update([],new Set(),{visible:false});
    // Level streaming ranges (Unreal streaming volumes): load radius green, unload radius orange, around each LevelStreaming object.
    const ringsUsed=new Set();
    if(showStreaming&&!gameView)for(const object of data.objects){const root=groups.get(object.id);if(!root||object.visible===false)continue;for(const c of object.components||[]){if(c.type!=='LevelStreaming'||c.properties?.enabled===false)continue;const center=root.getWorldPosition(new THREE.Vector3());
      for(const [k,radius] of [[0,c.properties.loadRadius??50],[1,c.properties.unloadRadius??65]]){const key=c.id+':'+k;let ring=streamingRings.get(key);if(!ring){ring=new THREE.LineLoop(unitRing,ringMaterials[k]);ring.userData.editorHelper=true;ring.renderOrder=999;ring.frustumCulled=false;streamingRings.set(key,ring);}if(ring.parent!==world)world.add(ring);ring.position.copy(center);ring.scale.setScalar(Math.max(.01,radius));ring.updateMatrixWorld(true);ring.visible=true;ringsUsed.add(key);}}}
    for(const [key,ring] of streamingRings)if(!ringsUsed.has(key)){ring.removeFromParent();streamingRings.delete(key);}
    if(group)gizmo.box.setFromObject(group);
    gizmo.visible=Boolean(group)&&!gizmo.box.isEmpty();
    const segments=[];
    const actor=content.objects.find(row=>row.id===selection);
    if(handles)handles.visible=false;
    if(solidGizmo)solidGizmo.visible=false;
    if(authoring&&group?.visible&&!actor.locked){
      const origin=gizmoOrigin(group),center=origin.clone().project(active);
      if(Math.abs(center.x)<=1&&Math.abs(center.y)<=1&&Math.abs(center.z)<=1){
        const length=handleSize(origin),positions=[],colors=[];
        const localBasis=axis=>new THREE.Vector3().setComponent(axis,1).applyQuaternion(group.quaternion).transformDirection(group.parent.matrixWorld);
        for(let axis=0;axis<3;axis++){
          const color=new THREE.Color([0x62df91,0x70adff,0xff6669][axis]).toArray();
          const count=tool==='rotate'?24:1;
          const u=tool==='rotate'?axisOf(group,(axis+1)%3):tool==='scale'?localBasis(axis).multiplyScalar(axisSign(axis)):axisOf(group,axis).multiplyScalar(axisSign(axis));
          const v=tool==='rotate'?axisOf(group,(axis+2)%3):null;
          const endpoint=index=>{
            if(!v)return origin.clone().addScaledVector(u,length*(index||.18));
            const angle=index*2*Math.PI/count;
            return origin.clone().addScaledVector(u,length*Math.cos(angle)).addScaledVector(v,length*Math.sin(angle));
          };
          let from=endpoint(0);
          for(let index=1;index<=count;index++){
            const to=endpoint(index),a=screen(from),b=screen(to);
            if(Math.hypot(b[0]-a[0],b[1]-a[1])>=1){
              positions.push(...from.toArray(),...to.toArray());colors.push(...color,...color);
              segments.push([axis,...a,...b]);
            }
            from=to;
          }
        }
        if(positions.length){
          if(!handles){
            const geometry=new THREE.BufferGeometry();
            geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(72*6),3));
            geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(72*6),3));
            handles=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,linewidth:3,toneMapped:false,depthTest:false,depthWrite:false}));
            handles.userData.editorHelper=true;handles.frustumCulled=false;handles.renderOrder=1000;world.add(handles);
          }
          const {position,color}=handles.geometry.attributes;
          if(handles.geometry.drawRange.count!==positions.length/3||positions.some((value,index)=>Math.fround(value)!==position.array[index])){
            position.array.set(positions);color.array.set(colors);position.needsUpdate=true;color.needsUpdate=true;
          }
          handles.geometry.setDrawRange(0,positions.length/3);handles.visible=false;
        }
        // Unreal-style gizmo: arrows (move), rings (rotate), cube tips (scale); the dragged axis turns yellow.
        solidGizmo??=createSolidGizmo();if(!solidGizmo.parent)world.add(solidGizmo);
        poseSolidGizmo(solidGizmo,{tool,origin,length,basis:a=>tool==='translate'?axisOf(group,a).multiplyScalar(axisSign(a)):tool==='scale'?localBasis(a).multiplyScalar(axisSign(a)):axisOf(group,a),active:command.startsWith('transform')||command.startsWith('translate')?axis:-1});
      }
    }
    // Drop to floor (End): each object's lowest point moves onto the first surface below it.
    let drops;
    if(command==='dropToFloor'&&authoring){drops=[];
      for(const dropId of Array.isArray(extra.ids)&&extra.ids.length?extra.ids:[selection]){const g=groups.get(dropId),actor=content.objects.find(row=>row.id===dropId);if(!g||actor?.locked)continue;g.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(g);if(bounds.isEmpty())continue;
        const own=new Set();g.traverse(n=>own.add(n));const middle=bounds.getCenter(new THREE.Vector3());ray.set(new THREE.Vector3(middle.x,bounds.min.y+1e-3,middle.z),new THREE.Vector3(0,-1,0));
        const hit=ray.intersectObjects(world.children,true).find(h=>h.object.isMesh&&!own.has(h.object)&&!h.object.userData.editorHelper&&shownInChain(h.object));
        if(hit&&Math.abs(hit.point.y-bounds.min.y)>1e-5)drops.push({id:dropId,delta:[0,hit.point.y-bounds.min.y,0]});}}
    // Marquee rectangle while dragging; box select returns every object whose bounds centre falls inside.
    let boxSelection;
    if(marqueeLine)marqueeLine.visible=false;
    if(box&&authoring){
      const [x0,y0,x1,y1]=[Math.min(box[0],box[2]),Math.min(box[1],box[3]),Math.max(box[0],box[2]),Math.max(box[1],box[3])];
      if(command==='marquee'){
        if(!marqueeLine){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24),3));marqueeLine=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false,toneMapped:false}));marqueeLine.userData.editorHelper=true;marqueeLine.frustumCulled=false;marqueeLine.renderOrder=1003;}
        if(marqueeLine.parent!==world)world.add(marqueeLine);
        const corner=(px,py)=>new THREE.Vector3(2*px/width-1,1-2*py/height,-.98).unproject(active),c=[corner(x0,y0),corner(x1,y0),corner(x1,y1),corner(x0,y1)];
        const p=marqueeLine.geometry.attributes.position;[0,1,1,2,2,3,3,0].forEach((k,i)=>p.setXYZ(i,c[k].x,c[k].y,c[k].z));p.needsUpdate=true;marqueeLine.visible=true;
      }else if(command==='boxSelect'){boxSelection=[];
        for(const actor of content.objects){const g=groups.get(actor.id);if(!g||!shownInChain(g))continue;const bounds=new THREE.Box3().setFromObject(g);const point=(bounds.isEmpty()?g.getWorldPosition(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3())).project(active);
          const sx=(point.x+1)*width/2,sy=(1-point.y)*height/2;if(point.z>=-1&&point.z<=1&&sx>=x0&&sx<=x1&&sy>=y0&&sy<=y1)boxSelection.push(actor.id);}}
    }
    let pilotPose;
    if(command==='pilotEnd'&&!orthographic){const e=new THREE.Euler().setFromQuaternion(editorCamera.quaternion);pilotPose={position:editorCamera.position.toArray(),rotation:[e.x,e.y,e.z].map(THREE.MathUtils.radToDeg)};}
    // Quad view: restore the shared camera state and render all four panes into one frame.
    if(pane){
      if(pane.index>0){panes[pane.index].target.copy(target);target.copy(savedTarget);orthoCamera=savedOrtho;}
      for(const s of segments){s[1]+=pane.rect[0];s[2]+=pane.rect[1];s[3]+=pane.rect[0];s[4]+=pane.rect[1];}
      width=fullWidth;height=fullHeight;
      const cameras=pane.rects.map(([,,rw,rh],i)=>{const a=rw/rh;
        if(i===0){if(pane.index!==0){camera.aspect=a;camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();}return camera;}
        const p=panes[i];p.camera??=fallbackGameCamera('2d');const c=p.camera;if(i!==pane.index){c.left=-7*a;c.right=7*a;c.position.copy(p.target).add(new THREE.Vector3(0,0,20));applyViewportDirection(c,p.direction,p.target);c.updateProjectionMatrix();c.updateMatrixWorld();}return c;});
      active=cameras[0];Object.defineProperty(active.userData,'gameViews',{value:cameras.map((c,i)=>({id:'pane'+i,camera:c,region:[pane.rects[i][0]/width,pane.rects[i][1]/height,pane.rects[i][2]/width,pane.rects[i][3]/height]})),configurable:true,writable:true});
    }
    // Floor grid (Unreal show flag), game view (G hides every editor helper) and view modes.
    if(showGrid&&dimension!=='2d'){const step=Math.max(.01,gridSize);if(!grid||gridStep!==step){if(grid){grid.removeFromParent();grid.geometry.dispose();grid.material.dispose();}const cells=Math.max(20,Math.min(200,Math.round(30/step)));grid=new THREE.GridHelper(step*cells,cells,0x5c5c5c,0x3a3a3a);grid.userData.editorHelper=true;grid.frustumCulled=false;gridStep=step;}if(grid.parent!==world)world.add(grid);grid.visible=true;}else if(grid)grid.visible=false;
    const hiddenForFrame=[];
    if(gameView){segments.length=0;world.traverse(n=>{if(n.userData.editorHelper&&n.visible)hiddenForFrame.push(n);});}
    if(viewMode!==viewModeShown){world.traverse(n=>{if(n.isMesh&&n.userData.hbLit){n.material=n.userData.hbLit;delete n.userData.hbLit;}});for(const line of wire.values())line.visible=false;viewModeShown=viewMode;}
    if(viewMode!=='lit'){const meshes=[];world.traverse(n=>{if(n.isMesh&&!n.isInstancedMesh&&!n.userData.editorHelper&&n.visible&&n.geometry)meshes.push(n);});
      for(const n of meshes){if(viewMode==='unlit'){if(!n.userData.hbLit){n.userData.hbLit=n.material;n.material=unlitFor(n.material);}continue;}
        let line=wire.get(n);if(!line){line=new THREE.LineSegments(new THREE.WireframeGeometry(n.geometry),wireMaterial);line.userData.editorHelper=true;line.matrixAutoUpdate=false;line.frustumCulled=false;wire.set(n,line);}
        if(line.parent!==world)world.add(line);line.matrix.copy(n.matrixWorld);line.matrixWorld.copy(n.matrixWorld);line.visible=!gameView;hiddenForFrame.push(n);}}
    if(pilot){const g=groups.get(pilot);if(g?.visible)hiddenForFrame.push(g);}
    for(const n of hiddenForFrame)n.visible=false;
    renderer.setSize(width,height,false);timing.scene=performance.now();
    const render=async()=>{
      syncSkyToCamera(sky,active,0);
      visual.prepare2D(renderer,world,active);
      visual.renderBloom(renderer,world,active,content.objects,c=>syncSkyToCamera(sky,c,0));timing.submit=performance.now();
      await renderer.hbFinishFrame();timing.finish=performance.now();
    };
    try{
      await render();
      if (capture) {
        const end=Date.now()+70000;
        while (renderer.hbDiagnostics().shaderPreparation?.pending&&Date.now()<end) {
          await new Promise(resolve=>setTimeout(resolve,120));await render();
        }
      }
    }finally{for(const n of hiddenForFrame)n.visible=true;if(pane)delete active.userData.gameViews;}
    const {backend,shaderPreparation,calls,cameraViews,upscales,ldrAntiAliasingPasses}=renderer.hbDiagnostics();
    const ms=(a,b)=>Math.round((timing[b]-timing[a])*100)/100;
    return {animating,particles:[...groups.values()].reduce((n,g)=>n+[...(g.userData.particleStates?.values?.()||[]),g.userData.particleState].filter(Boolean).reduce((m,s)=>m+(s.simulation?.particles?.length||0)+(s.simulation?.birthUploads||0),0),0),streamingRings:streamingRings.size,collisionShapes:collisionView?.group.visible?collisionView.group.children.filter(c=>c.visible).length:0,target:target.toArray(),gpuMs:renderer.hbDiagnostics().gpuTimeMs??null,resolution:{...renderer.hbResolution,upscales,ldrAntiAliasingPasses},timing:{openMs:ms("start","open"),sceneMs:ms("open","scene"),submitMs:ms("scene","submit"),finishMs:ms("submit","finish")},backend,shaderPreparation,calls,cameraViews,selection,cameraPosition:active.position.toArray(),projection:active.isOrthographicCamera?'orthographic':'perspective',segments,...(worldBrush?{worldBrush}:{}),...(worldSelection?{worldSelection}:{}),...(placement?{placement}:{}),...(translation?{translation}:{}),...(sceneTransform?{sceneTransform}:{}),...(preview?{preview}:{}),...(drops?{drops}:{}),...(boxSelection?{boxSelection}:{}),...(pilotPose?{pilotPose}:{}),...(bookmarkResult?{bookmark:bookmarkResult}:{}),warnings:content.warnings.slice(0,8)};
  }
  // Lightmap bake input: one row per drawn object, world matrices current.
  const bakeRows=objects=>objects.flatMap(object=>{const root=groups.get(object.id);if(!root)return[];root.updateMatrixWorld(true);const renderer=(object.components||[]).find(c=>c.type==='MeshRenderer');return[{object,root,contribute:!!renderer&&renderer.properties?.enabled!==false&&renderer.properties?.contributeGI!==false}];});
  return {draw,close,bakeRows};
}
