import * as THREE from 'three';
import {sceneRendering} from '../scene-rendering.js';
import {makeSceneComponent} from '../scene-components.js';

// Compare the production particle shader with Three's stock PointsMaterial.
export async function runParticleColorCase(){
  let checks=0;const evidence=[],expect=(ok,label)=>{checks++;if(!ok)throw Error(label);};
  const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(64,64);renderer.setClearColor(0,1);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100),group=new THREE.Group();camera.position.z=10;camera.lookAt(0,0,0);group.userData.objectId='color-probe';scene.add(group);
  const owner=sceneRendering({read:async()=>{throw Error('unexpected particle asset');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected model');},current:()=>group,all:()=>[group]});
  const object={id:'color-probe',kind:'empty',components:[makeSceneComponent('ParticleSystem',{rate:0,playOnStart:false,maxParticles:1,size:2,endSize:1,speed:0,radius:0,color:[1,1,1,1],endColor:[1,1,1,1],blend:'alpha'})]};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const context=canvas.getContext('2d');context.fillStyle='rgb(128,64,192)';context.fillRect(0,0,2,2);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;
  const stock=new THREE.PointsMaterial({size:64,sizeAttenuation:false,transparent:true,depthWrite:false,map:texture}),targets=[];let points,material;
  try{
    await owner.build(object,group);const state=group.userData.particleState;state.simulation.emit(1,new THREE.Matrix4());owner.tickParticles([object],0,true);points=group.children.find(n=>n.isPoints);material=points.material;material.uniforms.map.value=texture;material.uniforms.hasMap.value=true;
    const pixel=(target,x=32,y=32)=>{const b=new Uint8Array(4);if(target)renderer.readRenderTargetPixels(target,x,y,1,1,b);else{const gl=renderer.getContext();gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);}return [...b];};
    const draw=(m,target=null,x=32,y=32)=>{points.material=m;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);return pixel(target,x,y);};
    const equal=(a,b)=>a.every((value,i)=>Math.abs(value-b[i])<=1);
    for(const tint of [[1,1,1,1],[.5,.25,.75,.5]]){
      state.properties.color=state.properties.endColor=tint;owner.tickParticles([object],0,true);stock.color.setRGB(...tint.slice(0,3),THREE.LinearSRGBColorSpace);stock.opacity=tint[3];
      for(const toneMapping of [THREE.NoToneMapping,THREE.ACESFilmicToneMapping]){
        renderer.toneMapping=toneMapping;
        for(const colorSpace of [null,THREE.LinearSRGBColorSpace,THREE.SRGBColorSpace]){
          const target=colorSpace?new THREE.WebGLRenderTarget(64,64):null;if(target){target.texture.colorSpace=colorSpace;targets.push(target);}
          const reference=draw(stock,target),actual=draw(material,target);evidence.push({tint,toneMapping,target:colorSpace||'canvas',reference,actual});expect(equal(reference,actual),'particle texture/tint/alpha matches stock output: '+JSON.stringify(evidence.at(-1)));
        }
      }
    }
    state.properties.color=state.properties.endColor=[1,1,1,1];owner.tickParticles([object],0,true);stock.color.setRGB(1,1,1);stock.opacity=1;renderer.toneMapping=THREE.NoToneMapping;
    context.fillStyle='red';context.fillRect(0,0,2,1);context.fillStyle='blue';context.fillRect(0,1,2,1);texture.needsUpdate=true;
    for(const y of [48,16]){const reference=draw(stock,null,32,y),actual=draw(material,null,32,y);evidence.push({y,reference,actual});expect(equal(reference,actual),'particle texture vertical orientation matches stock at '+y);}
    expect(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'particle color programs compile');return {ok:true,checks,evidence};
  }finally{if(points)points.material=material;owner.dispose(group);owner.dispose2D();stock.dispose();texture.dispose();for(const target of targets)target.dispose();renderer.dispose();}
}
