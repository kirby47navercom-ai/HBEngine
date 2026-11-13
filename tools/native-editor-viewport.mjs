import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {createSky,applySceneEnvironment,disposeSceneEnvironment,syncSkyToCamera} from '../prototype/scene-environment.js';
import {cameraScreenRect,fallbackGameCamera,previewGameCamera,selectGameCamera} from '../prototype/game-camera.js';
import {defaultSurface} from '../prototype/model.js';
import {loadModel} from '../prototype/engine-services.js';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {installNativeAssets} from './native-game-platform.mjs';
import {projectBytes,projectText} from './project-bytes.mjs';
import {defaultViewportSettings} from '../prototype/viewport-controls.js';
import {applyViewportDirection,fitViewportSelection,viewportDirections} from '../prototype/viewport-presentation.js';

export function nativeEditorViewport(bridge,surface='native-editor') {
  const canvas={width:1,height:1,clientWidth:1,clientHeight:1,pixelRatio:1};
  let renderer, content, world, source, project, dimension, camera, orthoCamera, sky, visual, primitives, updateEnvironment;
  let selection='', gizmo, models=new Set(), groups=new Map(), owners=new Map();
  let previewTransform;
  const target=new THREE.Vector3(0,.45,0), orbit=new THREE.Spherical();
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
    gizmo?.geometry.dispose();gizmo?.material.dispose();gizmo=null;
    disposeSceneEnvironment(world);
    for (const model of models) disposeHeadlessModel(model);
    for (const group of groups.values()) visual.dispose(group);
    visual.dispose2D();primitives.dispose();
    for (const node of [sky.skyDome,sky.cloudGroup]) node.traverse(child=>{child.geometry?.dispose();child.material?.dispose();});
    world=null;groups.clear();models.clear();owners.clear();source=null;previewTransform=null;
  };
  const close=async()=>{
    try { if (renderer) await renderer.dispose(); }
    finally {releaseVisual();renderer=null;project=null;camera=orthoCamera=null;}
  };
  async function open(data,nextProject,assets) {
    if (source===data && project===nextProject) return;
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
    renderer??=await createNativeSceneRenderer(canvas,()=>{},{bridge,surface,graphicsAPI:'d3d12'});
    world=new THREE.Scene();
    primitives=scenePrimitives(data.surface||defaultSurface);
    const ambientLight=new THREE.HemisphereLight(0xffffff,0x444444,1);
    sky=createSky(world,renderer);world.add(ambientLight);
    const read=async name=>data.assetDraft?.path===name?data.assetDraft.data:JSON.parse((await projectText(project,name)).replace(/^\uFEFF/,''));
    const warnings=[];
    visual=sceneRendering({read,fileUrl:url,loadTexture:assets.texture,loadModel:async name=>{
      const model=/\.(?:gltf|glb)$/i.test(name)?await loadHeadlessModel(project,name,{geometry:true,loadTexture:assets.modelTexture}):await loadModel(name);
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
      orthoCamera=null;
      target.set(0,dimension==='2d'?0:.45,0);
      orbit.setFromVector3(camera.position.clone().sub(target));
    }
    updateEnvironment=()=>applySceneEnvironment({scene:world,environment:data.environment,surface:data.surface,runtimeSettings:data.runtime,ambientLight,mainRenderer:renderer,...sky,objects});
    updateEnvironment();
    source=data;content={objects,warnings};
  }
  async function draw(data,nextProject,{width,height,command='',dx=0,dy=0,x=0,y=0,id='',selected='',cameraId='',cameraOutputs=false,capture=false,flight,direction=''}) {
    const assets=installNativeAssets({url:name=>'hbasset:'+encodeURIComponent(name),manifest:{width,height},readBytes:(name,opts)=>projectBytes(nextProject,name,opts)});
    try{return await drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,direction},assets);}
    finally{assets.restore();}
  }
  async function drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,direction},assets) {
    canvas.clientWidth=width;canvas.clientHeight=height;
    if(previewTransform){previewTransform.group.position.copy(previewTransform.position);previewTransform=null;}
    await open(data,nextProject,assets);
    selection=selected;
    const aspect=width/height;
    if(direction&&!Object.hasOwn(viewportDirections,direction))throw Error('뷰포트 방향을 확인하세요.');
    const orthographic=direction&&direction!=='3d'||dimension==='2d'&&direction!=='3d';
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
    if (command==='focus') {
      const group=groups.get(id);
      if(group&&fitViewportSelection(editorCamera,{target,update(){}},new THREE.Box3().setFromObject(group))&&!orthographic)orbit.setFromVector3(editorCamera.position.clone().sub(target));
    } else if (command==='orbit' && !orthographic) {
      orbit.theta-=dx*.008;orbit.phi-=dy*.008;orbit.makeSafe();
    } else if (command==='pan'||command==='orbit') {
      const scale=(orthographic?14/editorCamera.zoom:orbit.radius)/height;
      target.add(new THREE.Vector3(-dx*scale,dy*scale,0).applyQuaternion(editorCamera.quaternion));
    } else if (command==='zoom') {
      if (orthographic) editorCamera.zoom=THREE.MathUtils.clamp(editorCamera.zoom*1.15**dy,.01,500);
      else orbit.radius=THREE.MathUtils.clamp(orbit.radius*1.15**-dy,.025,100000);
    }
    if(flight&&!cameraId&&!cameraOutputs&&!orthographic){
      const {forward=0,right=0,up=0,seconds=0,fast=false}=flight;
      if(![forward,right,up,seconds].every(Number.isFinite))throw Error('뷰포트 이동 값을 확인하세요.');
      const speed=defaultViewportSettings.speed*(fast?defaultViewportSettings.fastMultiplier:1);
      const delta=new THREE.Vector3(right,0,-forward).applyQuaternion(editorCamera.quaternion).add(new THREE.Vector3(0,up,0));
      if(delta.lengthSq()>1)delta.normalize();
      target.addScaledVector(delta,speed*THREE.MathUtils.clamp(seconds,0,.1));
    }
    prepareCamera();
    const size={width,height},current=id=>groups.get(id);
    const active=(cameraOutputs?selectGameCamera(content.objects,size,cameraId,current):cameraId&&previewGameCamera(content.objects,size,cameraId,current))||editorCamera;
    const views=active.userData.gameViews;
    world.updateMatrixWorld(true);
    let translation;
    if(!cameraId&&!cameraOutputs&&['translatePreview','translate'].includes(command)){
      const actor=content.objects.find(row=>row.id===selection),group=groups.get(selection);
      if(group&&!actor?.locked&&[x,y,dx,dy].every(Number.isFinite)){
        const center=group.getWorldPosition(new THREE.Vector3()).project(active);
        if(center.z>=-1&&center.z<=1){
          const before=new THREE.Vector3(2*x/width-1,1-2*y/height,center.z).unproject(active);
          const after=new THREE.Vector3(2*(x+dx)/width-1,1-2*(y+dy)/height,center.z).unproject(active);
          translation=after.clone().sub(before).toArray();
          if(command==='translatePreview'){
            previewTransform={group,position:group.position.clone()};
            const target=group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3().fromArray(translation));
            group.position.copy(group.parent.worldToLocal(target));group.updateWorldMatrix(false,true);
          }
        }
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
    if (gizmo) {world.remove(gizmo);gizmo.geometry.dispose();gizmo.material.dispose();gizmo=null;}
    const group=groups.get(selection);
    if (group) {
      const bounds=new THREE.Box3().setFromObject(group);
      if (!bounds.isEmpty()) {gizmo=new THREE.Box3Helper(bounds,0x68abff);gizmo.userData.editorHelper=true;world.add(gizmo);}
    }
    renderer.setSize(width,height,false);
    const render=async()=>{
      syncSkyToCamera(sky,active,0);
      visual.prepare2D(renderer,world,active);
      visual.renderBloom(renderer,world,active,content.objects,c=>syncSkyToCamera(sky,c,0));
      await renderer.hbFinishFrame();
    };
    await render();
    if (capture) {
      const end=Date.now()+70000;
      while (renderer.hbDiagnostics().shaderPreparation?.pending&&Date.now()<end) {
        await new Promise(resolve=>setTimeout(resolve,120));await render();
      }
    }
    const {backend,shaderPreparation,calls,cameraViews}=renderer.hbDiagnostics();
    return {backend,shaderPreparation,calls,cameraViews,selection,cameraPosition:active.position.toArray(),projection:active.isOrthographicCamera?'orthographic':'perspective',...(translation?{translation}:{}),warnings:content.warnings.slice(0,8)};
  }
  return {draw,close};
}
