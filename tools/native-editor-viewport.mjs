import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
import {createSky,applySceneEnvironment,disposeSceneEnvironment,syncSkyToCamera} from '../prototype/scene-environment.js';
import {fallbackGameCamera,previewGameCamera} from '../prototype/game-camera.js';
import {defaultSurface} from '../prototype/model.js';
import {loadModel} from '../prototype/engine-services.js';
import {loadHeadlessModel,disposeHeadlessModel} from './headless-model.mjs';
import {installNativeAssets} from './native-game-platform.mjs';
import {projectBytes,projectText} from './project-bytes.mjs';

export function nativeEditorViewport(bridge) {
  const canvas={width:1,height:1,clientWidth:1,clientHeight:1,pixelRatio:1};
  let renderer, content, assets, world, source, project, dimension, camera, sky, visual, primitives;
  let selection='', previewCamera='', gizmo, models=new Set(), groups=new Map(), owners=new Map();
  const target=new THREE.Vector3(0,.45,0), orbit=new THREE.Spherical();
  const ray=new THREE.Raycaster();
  const releaseVisual=()=>{
    if (!world) return;
    gizmo?.geometry.dispose();gizmo?.material.dispose();gizmo=null;
    disposeSceneEnvironment(world);
    for (const model of models) disposeHeadlessModel(model);
    for (const group of groups.values()) visual.dispose(group);
    visual.dispose2D();primitives.dispose();
    for (const node of [sky.skyDome,sky.cloudGroup]) node.traverse(child=>{child.geometry?.dispose();child.material?.dispose();});
    world=null;groups.clear();models.clear();owners.clear();source=null;
  };
  const close=async()=>{
    try { if (renderer) await renderer.dispose(); }
    finally {releaseVisual();assets?.restore();renderer=null;assets=null;project=null;}
  };
  async function open(data,nextProject) {
    if (source===data && project===nextProject) return;
    if (project && project!==nextProject) await close();
    if (renderer && source) await renderer.hbReleaseScene();
    releaseVisual();
    project=nextProject;
    const url=name=>'hbasset:'+encodeURIComponent(name);
    assets??=installNativeAssets({url,manifest:{width:canvas.width,height:canvas.height},readBytes:(name,opts)=>projectBytes(project,name,opts)});
    renderer??=await createNativeSceneRenderer(canvas,()=>{},{bridge,surface:'native-editor',graphicsAPI:'d3d12'});
    world=new THREE.Scene();
    primitives=scenePrimitives(data.surface||defaultSurface);
    const ambientLight=new THREE.HemisphereLight(0xffffff,0x444444,1);
    sky=createSky(world,renderer);world.add(ambientLight);
    const read=async name=>JSON.parse((await projectText(project,name)).replace(/^\uFEFF/,''));
    const warnings=[];
    visual=sceneRendering({read,fileUrl:url,loadTexture:assets.texture,loadModel:async name=>{
      const model=/\.(?:gltf|glb)$/i.test(name)?await loadHeadlessModel(project,name,{geometry:true,loadTexture:assets.modelTexture}):await loadModel(name);
      models.add(model.object);return model;
    },current:id=>groups.get(id),all:()=>[...groups.values()],editor:true,gameRenderer:renderer,error:message=>warnings.push(message)});
    const objects=structuredClone(data.objects);
    for (const actor of objects) {
      const group=primitives.build(actor);groups.set(actor.id,group);owners.set(group,actor.id);
      group.position.fromArray(actor.position);group.rotation.set(...actor.rotation.map(THREE.MathUtils.degToRad));
      group.scale.fromArray(actor.scale);group.visible=actor.visible;world.add(group);
    }
    for (const actor of objects) if (actor.parent) groups.get(actor.parent)?.add(groups.get(actor.id));
    for (const actor of objects) {
      try {await visual.build(actor,groups.get(actor.id));} catch(error) {warnings.push(actor.name+': '+error.message);}
    }
    const nextDimension=data.runtime?.dimension||'3d';
    if (!camera||dimension!==nextDimension) {
      dimension=nextDimension;camera=fallbackGameCamera(dimension);
      target.set(0,dimension==='2d'?0:.45,0);
      orbit.setFromVector3(camera.position.clone().sub(target));
    }
    applySceneEnvironment({scene:world,environment:data.environment,surface:data.surface,runtimeSettings:data.runtime,ambientLight,mainRenderer:renderer,...sky,objects});
    source=data;content={objects,warnings};
  }
  async function draw(data,nextProject,{width,height,command='',dx=0,dy=0,x=0,y=0,id='',selected='',cameraId='',capture=false}) {
    canvas.clientWidth=width;canvas.clientHeight=height;
    await open(data,nextProject);
    selection=selected;previewCamera=cameraId;
    if (command==='focus') {
      const group=groups.get(id);
      if (group) target.copy(group.getWorldPosition(new THREE.Vector3()));
      orbit.radius=5;
    } else if (command==='orbit' && dimension!=='2d') {
      orbit.theta-=dx*.008;orbit.phi-=dy*.008;orbit.makeSafe();
    } else if (command==='pan'||command==='orbit') {
      const scale=(dimension==='2d'?14/camera.zoom:orbit.radius)/height;
      target.add(new THREE.Vector3(-dx*scale,dy*scale,0).applyQuaternion(camera.quaternion));
    } else if (command==='zoom') {
      if (dimension==='2d') camera.zoom=THREE.MathUtils.clamp(camera.zoom*1.15**dy,.01,500);
      else orbit.radius=THREE.MathUtils.clamp(orbit.radius*1.15**-dy,.025,100000);
    }
    const aspect=width/height;
    if (dimension==='2d') {
      camera.left=-7*aspect;camera.right=7*aspect;camera.position.copy(target).add(new THREE.Vector3(0,0,20));
    } else {
      camera.aspect=aspect;camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(target);
    }
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const active=previewCamera&&previewGameCamera(content.objects,{width,height},previewCamera,id=>groups.get(id))||camera;
    world.updateMatrixWorld(true);
    if (command==='pick') {
      ray.setFromCamera({x:2*x/width-1,y:1-2*y/height},active);
      selection='';
      for (const hit of ray.intersectObjects(world.children,true)) {
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
      const end=Date.now()+25000;
      while (renderer.hbDiagnostics().shaderPreparation?.pending&&Date.now()<end) {
        await new Promise(resolve=>setTimeout(resolve,25));await render();
      }
    }
    const {backend,shaderPreparation,calls}=renderer.hbDiagnostics();
    return {backend,shaderPreparation,calls,selection,warnings:content.warnings.slice(0,8)};
  }
  return {draw,close};
}
