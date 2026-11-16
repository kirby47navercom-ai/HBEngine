import * as THREE from 'three';
import {createNativeSceneRenderer} from '../prototype/native-scene-renderer.js';
import {scenePrimitives} from '../prototype/scene-primitives.js';
import {sceneRendering} from '../prototype/scene-rendering.js';
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

// Unreal axes on screen: X forward (red, three -z), Y right (green, three +x), Z up (blue, three +y).
const axisSign=axis=>axis===2?-1:1;
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
  let solidGizmo=null;
  let previewTransform,worldOutline,outlineKey;
  // The last gizmo drag draft stays on screen across redraws until the drag commits or cancels (no snap-back frames).
  let dragDraft=null;
  const target=new THREE.Vector3(0,.45,0), orbit=new THREE.Spherical();
  // Focus (F / outliner double-click) flies the camera over a short ease-out instead of jumping, like Unreal.
  let flyTo=null;const FLY_MS=350;
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
    visual=sceneRendering({read,fileUrl:url,loadTexture:assets.texture,loadModel:async name=>{
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
  async function draw(data,nextProject,{width,height,command='',dx=0,dy=0,x=0,y=0,id='',selected='',cameraId='',cameraOutputs=false,capture=false,flight,smooth=false,snap,direction='',tool='translate',axis=-1,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges}) {
    const assets=installNativeAssets({url:name=>'hbasset:'+encodeURIComponent(name),manifest:{width,height},readBytes:(name,opts)=>projectBytes(nextProject,name,opts)});
    try{return await drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,smooth,snap,direction,tool,axis,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges},assets);}
    finally{assets.restore();}
  }
  async function drawFrame(data,nextProject,{width,height,command,dx,dy,x,y,id,selected,cameraId,cameraOutputs,capture,flight,smooth,snap,direction,tool,axis,tangent,points,brushSpacing,faces,instances,meshVertices,meshEdges},assets) {
    const timing={start:performance.now()};
    canvas.clientWidth=width;canvas.clientHeight=height;
    if(previewTransform){transform(previewTransform.actor,previewTransform.group);previewTransform=null;}
    await open(data,nextProject,assets);timing.open=performance.now();
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
    if(command&&command!=='focus'&&command!=='pick')flyTo=null;
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
    if(flyTo){
      const t=Math.min(1,(performance.now()-flyTo.start)/FLY_MS),k=1-(1-t)**3;
      target.lerpVectors(flyTo.from.target,flyTo.to.target,k);
      if(flyTo.orthographic)editorCamera.zoom=THREE.MathUtils.lerp(flyTo.from.zoom,flyTo.to.zoom,k);
      else orbit.radius=THREE.MathUtils.lerp(flyTo.from.radius,flyTo.to.radius,k);
      animating=t<1;if(!animating)flyTo=null;
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
    if(authoring&&['translatePreview','translate','transformPreview','transform'].includes(command)){
      const actor=content.objects.find(row=>row.id===selection),group=groups.get(selection);
      if(group?.visible&&!actor.locked&&[x,y,dx,dy].every(Number.isFinite)){
        const origin=group.getWorldPosition(new THREE.Vector3()),center=origin.clone().project(active);
        if(center.z>=-1&&center.z<=1){
          if(command.startsWith('translate')){
            const before=new THREE.Vector3(2*x/width-1,1-2*y/height,center.z).unproject(active);
            const after=new THREE.Vector3(2*(x+dx)/width-1,1-2*(y+dy)/height,center.z).unproject(active);
            translation=after.sub(before).toArray();
          }else if(Number.isInteger(axis)&&axis>=0&&axis<3&&Array.isArray(tangent)&&tangent.length===2&&tangent.every(Number.isFinite)){
            const distance=dx*tangent[0]+dy*tangent[1];
            if(tool==='translate'){
              const length=handleSize(origin);
              const from=screen(origin),to=screen(origin.clone().addScaledVector(new THREE.Vector3().setComponent(axis,axisSign(axis)),length));
              const pixels=Math.hypot(to[0]-from[0],to[1]-from[1]);
              if(pixels>=6&&Math.abs(distance)>1e-6)translation=new THREE.Vector3().setComponent(axis,axisSign(axis)*distance*length/pixels).toArray();
            }else if(Math.abs(distance)>1e-6&&(tool==='rotate'||tool==='scale')){
              sceneTransform={axis,value:tool==='rotate'?distance/60:Math.exp(THREE.MathUtils.clamp(distance/60,-12,12))};
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
    if(group)gizmo.box.setFromObject(group);
    gizmo.visible=Boolean(group)&&!gizmo.box.isEmpty();
    const segments=[];
    const actor=content.objects.find(row=>row.id===selection);
    if(handles)handles.visible=false;
    if(solidGizmo)solidGizmo.visible=false;
    if(authoring&&group?.visible&&!actor.locked){
      const origin=group.getWorldPosition(new THREE.Vector3()),center=origin.clone().project(active);
      if(Math.abs(center.x)<=1&&Math.abs(center.y)<=1&&Math.abs(center.z)<=1){
        const length=handleSize(origin),positions=[],colors=[];
        const localBasis=axis=>new THREE.Vector3().setComponent(axis,1).applyQuaternion(group.quaternion).transformDirection(group.parent.matrixWorld);
        for(let axis=0;axis<3;axis++){
          const color=new THREE.Color([0x62df91,0x70adff,0xff6669][axis]).toArray();
          const count=tool==='rotate'?24:1;
          const u=tool==='rotate'?localBasis((axis+1)%3):tool==='scale'?localBasis(axis).multiplyScalar(axisSign(axis)):new THREE.Vector3().setComponent(axis,axisSign(axis));
          const v=tool==='rotate'?localBasis((axis+2)%3):null;
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
        poseSolidGizmo(solidGizmo,{tool,origin,length,basis:a=>tool==='translate'?new THREE.Vector3().setComponent(a,axisSign(a)):tool==='scale'?localBasis(a).multiplyScalar(axisSign(a)):localBasis(a),active:command.startsWith('transform')||command.startsWith('translate')?axis:-1});
      }
    }
    renderer.setSize(width,height,false);timing.scene=performance.now();
    const render=async()=>{
      syncSkyToCamera(sky,active,0);
      visual.prepare2D(renderer,world,active);
      visual.renderBloom(renderer,world,active,content.objects,c=>syncSkyToCamera(sky,c,0));timing.submit=performance.now();
      await renderer.hbFinishFrame();timing.finish=performance.now();
    };
    await render();
    if (capture) {
      const end=Date.now()+70000;
      while (renderer.hbDiagnostics().shaderPreparation?.pending&&Date.now()<end) {
        await new Promise(resolve=>setTimeout(resolve,120));await render();
      }
    }
    const {backend,shaderPreparation,calls,cameraViews}=renderer.hbDiagnostics();
    const ms=(a,b)=>Math.round((timing[b]-timing[a])*100)/100;
    return {animating,timing:{openMs:ms("start","open"),sceneMs:ms("open","scene"),submitMs:ms("scene","submit"),finishMs:ms("submit","finish")},backend,shaderPreparation,calls,cameraViews,selection,cameraPosition:active.position.toArray(),projection:active.isOrthographicCamera?'orthographic':'perspective',segments,...(worldBrush?{worldBrush}:{}),...(worldSelection?{worldSelection}:{}),...(placement?{placement}:{}),...(translation?{translation}:{}),...(sceneTransform?{sceneTransform}:{}),...(preview?{preview}:{}),warnings:content.warnings.slice(0,8)};
  }
  return {draw,close};
}
