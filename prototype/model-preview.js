import * as THREE from 'three';
import {createViewportControls} from './viewport-controls.js';
import {fitViewportSelection} from './viewport-presentation.js';
import {editorAnimationFrame,cancelEditorAnimationFrame} from './detached-window.js';
import {applyModelImportTransform} from './model-import.js';
import {applyModelOverrides} from './model-subasset-overrides.js';

// The source viewer and import editor share the same renderer and resource owner.
export class ModelPreview {
  constructor(element,{load,visible=()=>true,error=()=>{}}){
    this.element=element;this.visible=visible;this.error=error;this.disposed=false;this.dirty=true;
    this.canvas=element.ownerDocument.createElement('canvas');this.canvas.ariaLabel='모델 미리보기';element.append(this.canvas);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true});
    this.renderer.setPixelRatio(Math.min(element.ownerDocument.defaultView.devicePixelRatio||1,2));
    this.world=new THREE.Scene();this.world.background=new THREE.Color('#252a32');
    this.world.add(new THREE.HemisphereLight(0xffffff,0x46563e,2));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,3);this.world.add(light);
    this.camera=new THREE.PerspectiveCamera(45,1,.01,100000);
    this.bounds=new THREE.Box3();this.controls=createViewportControls(this.camera,this.canvas,{onFocus:()=>this.fit()});
    this.controls.addEventListener('change',()=>this.dirty=true);
    this.observer=new ResizeObserver(()=>{
      if(!this.canvas.clientWidth||!this.canvas.clientHeight||this.disposed)return;
      this.renderer.setSize(this.canvas.clientWidth,this.canvas.clientHeight,false);
      this.camera.aspect=this.canvas.clientWidth/this.canvas.clientHeight;this.camera.updateProjectionMatrix();this.dirty=true;
    });this.observer.observe(element);
    this.ready=Promise.resolve().then(load).then(result=>{
      if(this.disposed){this.release(result.object);return;}
      this.result=result;this.originalFlags=new Map();result.object.traverse(object=>this.originalFlags.set(object,{visible:object.visible,castShadow:object.castShadow,receiveShadow:object.receiveShadow}));
      this.update(this.metadata,true);this.canvas.dataset.modelReady='true';
    }).catch(e=>{if(!this.disposed){this.loadError=e.message;error(e.message);}});
    const render=()=>{
      if(this.disposed)return;
      if(this.visible()&&this.element.isConnected){this.controls.update();if(this.dirty){this.renderer.render(this.world,this.camera);this.dirty=false;}}
      this.frame=editorAnimationFrame(element,render);
    };this.frame=editorAnimationFrame(element,render);
  }
  fit(){
    if(this.bounds.isEmpty())return;
    const size=Math.max(...this.bounds.getSize(new THREE.Vector3()).toArray(),.001);
    this.camera.near=Math.max(.00001,size/10000);this.camera.far=Math.max(100,size*100);
    this.camera.updateProjectionMatrix();this.controls.setSettings({speed:Math.max(.001,size)});
    fitViewportSelection(this.camera,this.controls,this.bounds);this.dirty=true;
  }
  update(metadata,fit=false){
    this.metadata=metadata;if(!this.result||this.disposed)return;
    if(metadata?.sourceHash&&this.result.sourceHash!==metadata.sourceHash)throw Error('모델 원본이 변경됐어요. 다시 가져오기를 실행하세요.');
    this.display?.removeFromParent();const raw=this.result.object;raw.removeFromParent();
    for(const [object,flags] of this.originalFlags){Object.assign(object,flags);delete object.userData.hbModelOverrides;}
    delete raw.userData.modelImportWarnings;
    const result=metadata?applyModelImportTransform(this.result,metadata,{format:this.format}):this.result;
    if(metadata)applyModelOverrides(raw,metadata.subassets,{trustedIndices:true});
    this.display=result.object;this.world.add(this.display);this.display.updateMatrixWorld(true);
    this.bounds.setFromObject(this.display);this.dirty=true;if(fit)this.fit();
  }
  release(root){
    const resources=new Set();root.traverse(object=>{
      if(object.geometry)resources.add(object.geometry);
      for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}
      if(object.skeleton?.boneTexture)resources.add(object.skeleton.boneTexture);
    });for(const resource of resources)resource.dispose();
  }
  snapshot(){
    if(this.disposed)throw Error('닫힌 모델 미리보기예요.');
    if(this.loadError)throw Error(this.loadError);
    if(!this.result)return {ready:false};
    if(this.metadata?.sourceHash&&this.result.sourceHash!==this.metadata.sourceHash)throw Error('모델 원본이 변경됐어요. 다시 가져오기를 실행하세요.');
    let meshes=0,visible=0;this.result.object.traverse(object=>{if(object.isMesh){meshes++;if(object.visible)visible++;}});
    return {ready:true,meshes,visible,bounds:this.bounds.isEmpty()?null:{min:this.bounds.min.toArray(),max:this.bounds.max.toArray(),size:this.bounds.getSize(new THREE.Vector3()).toArray()}};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelEditorAnimationFrame(this.element,this.frame);
    this.observer.disconnect();this.controls.dispose();this.renderer.dispose();
    if(this.result)this.release(this.result.object);this.world.clear();this.originalFlags?.clear();this.canvas.remove();
  }
}
