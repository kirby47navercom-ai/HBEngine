import * as THREE from 'three';
import {TwoDRendering} from '../two-d-rendering.js';
import {sceneRendering} from '../scene-rendering.js';
import {scenePrimitives} from '../scene-primitives.js';
import {defaultSurface} from '../model.js';
import {makeSceneComponent} from '../scene-components.js';
import {create2DAsset} from '../two-d-assets.js';
import {runTwoDSurfaceCase} from './2d-surface-case.js';
import {runTwoDLightingCase} from './2d-lighting-case.js';
import {runParticleColorCase} from './particle-color-case.js';

export async function runTwoDRenderingCase({beforePrimitiveSource}={}){
  let checks=0;const evidence=[],expect=(test,label)=>{checks++;if(!test)throw Error(label);};
  const canvas=document.createElement('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(64,64);renderer.setClearColor(0,1);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);const groups=[],draw=new TwoDRendering(),resources=new Set();
  const own=r=>{resources.add(r);return r;},group=(id,parent=scene)=>{const g=new THREE.Group();g.userData.objectId=id;parent.add(g);groups.push(g);return g;};
  const mesh=(g,color,p={})=>{const m=new THREE.Mesh(own(new THREE.PlaneGeometry(2,2)),own(new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide})));m.userData.objectId=g.userData.objectId;m.userData.draw2d={sortingLayer:'default',sortingOrder:0,maskInteraction:'none',...p};g.add(m);return m;};
  const layers=[{id:'default',name:'Default'},{id:'front',name:'Front'}];
  const pixel=(x=32,y=32)=>{const result=new Uint8Array(4),gl=renderer.getContext();gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,result);return [...result];};
  const frame=()=>{const state=draw.prepare(renderer,scene,camera,groups,layers);renderer.render(scene,camera);return state;},red=p=>p[0]>200&&p[1]<30&&p[2]<30,blue=p=>p[2]>200&&p[0]<30,black=p=>p.slice(0,3).every(v=>v<5);
  try{
    const a=group('a'),b=group('b'),am=mesh(a,0xff0000,{sortingOrder:100});mesh(b,0x0000ff,{sortingOrder:-100});frame();expect(red(pixel()),'ungrouped sorting order');
    a.userData.sortingGroup={sortingLayer:'default',sortingOrder:0};b.userData.sortingGroup={sortingLayer:'default',sortingOrder:1};frame();expect(blue(pixel()),'sorting groups must keep the whole branch together');
    a.userData.sortingGroup.sortingLayer='front';frame();expect(red(pixel()),'sorting layer wins before order');
    a.userData.sortingGroup.sortingLayer='default';a.userData.sortingGroup.sortMode='y';b.userData.sortingGroup.sortMode='y';b.userData.sortingGroup.sortingOrder=0;a.position.y=.2;b.position.y=-.2;frame();expect(blue(pixel()),'y sort uses group positions');a.position.y=0;b.position.y=0;
    const nested=group('nested',a);nested.userData.sortingGroup={sortingLayer:'default',sortingOrder:2};mesh(nested,0x00ff00);b.userData.sortingGroup.sortingOrder=1;frame();expect(blue(pixel()),'nested groups remain inside their parent');nested.userData.sortingGroup.sortAtRoot=true;frame();expect(pixel()[1]>200,'sortAtRoot');nested.visible=false;
    b.visible=false;delete a.userData.sortingGroup;am.userData.draw2d.sortingOrder=0;am.userData.draw2d.maskInteraction='inside';
    const maskGroup=group('mask'),mask=mesh(maskGroup,0xffffff);delete mask.userData.draw2d;mask.userData.spriteMask=true;mask.visible=false;maskGroup.userData.maskMesh=mask;
    const texture=own(new THREE.DataTexture(new Uint8Array([255,255,255,255,255,255,255,0]),2,1,THREE.RGBAFormat));texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.needsUpdate=true;mask.material.map=texture;mask.userData.maskProperties={alphaCutoff:.5,customRange:false};mask.userData.maskMaterial=own(new THREE.MeshBasicMaterial({color:0xffffff,map:texture,alphaTest:.5,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
    let state=frame();expect(red(pixel(24,32))&&black(pixel(40,32)),'inside mask follows texture alpha');expect(state.maskTargets===1,'one mask target');
    am.userData.draw2d.maskInteraction='outside';frame();expect(black(pixel(24,32))&&red(pixel(40,32)),'outside mask');
    am.userData.draw2d.maskInteraction='inside';maskGroup.position.x=1;frame();expect(black(pixel(24,32))&&red(pixel(40,32)),'moving mask updates without rebuilding geometry');maskGroup.position.x=0;
    mask.userData.maskProperties={alphaCutoff:.5,customRange:true,backSortingLayer:'front',frontSortingLayer:'front',backSortingOrder:0,frontSortingOrder:10};state=frame();expect(black(pixel(24,32))&&state.maskTargets===0&&state.maskPasses===0,'custom range excludes another layer without a full-size empty mask target');
    mask.userData.maskProperties.customRange=false;a.userData.sortingGroup={sortingLayer:'default',sortingOrder:0};frame();expect(black(pixel(24,32)),'global mask does not leak into a group');a.add(maskGroup);frame();expect(red(pixel(24,32)),'mask in the same group');
    am.userData.draw2d.maskInteraction='none';state=frame();expect(state.maskTargets===0&&state.maskPasses===0&&red(pixel(40,32))&&am.material.userData.hbSpriteMask.hbSpriteMask.value===null,'disabling masks releases GPU targets and unbinds the disposed sampler');
    am.userData.draw2d.maskInteraction='inside';renderer.setSize(96,96);frame();expect([...draw.targets.values()].every(t=>t.width===96&&t.height===96),'viewport resize');renderer.setSize(64,64);
    const viewport=renderer.getViewport(new THREE.Vector4()),clear=renderer.getClearColor(new THREE.Color()).clone(),clearAlpha=renderer.getClearAlpha();renderer.setScissorTest(true);frame();expect(renderer.getScissorTest()&&renderer.getViewport(new THREE.Vector4()).equals(viewport)&&renderer.getClearColor(new THREE.Color()).equals(clear)&&renderer.getClearAlpha()===clearAlpha,'mask pass restores renderer state');renderer.setScissorTest(false);
    evidence.push({kind:'mask-sort',checks,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)});
    for(const g of groups)g.removeFromParent();groups.length=0;draw.dispose();
    const objects=[{id:'lit',kind:'sprite',components:[makeSceneComponent('SpriteRenderer',{color:[1,0,0,1],width:2,height:2,shading:'lit'})]}],visuals=sceneRendering({read:async()=>{throw Error('unexpected asset read');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected model read');},current:id=>groups.find(g=>g.userData.objectId===id),all:()=>groups,error:e=>{throw Error(e);}}),litGroup=group('lit');await visuals.build(objects[0],litGroup);
    visuals.prepare2D(renderer,scene,camera,layers);renderer.render(scene,camera);expect(black(pixel()),'lit sprite without lights');
    const light=new THREE.PointLight(0xffffff,100,20);light.position.set(0,0,3);scene.add(light);renderer.render(scene,camera);const litPixel=pixel();evidence.push({kind:'point-light',pixel:litPixel,material:litGroup.userData.spriteMesh.material.type,visible:litGroup.visible});expect(litPixel[0]>200&&litPixel[0]-Math.max(litPixel[1],litPixel[2])>150,'lit sprite responds to a point light '+JSON.stringify(evidence.at(-1)));scene.remove(light);
    visuals.dispose(litGroup);visuals.dispose2D();litGroup.removeFromParent();objects[0].components[0].properties.shading='unlit';const unlitGroup=group('unlit');objects[0].id='unlit';await visuals.build(objects[0],unlitGroup);renderer.render(scene,camera);expect(red(pixel()),'unlit sprite preserves color');visuals.dispose(unlitGroup);visuals.dispose2D();
    unlitGroup.removeFromParent();groups.length=0;
    const atlas=document.createElement('canvas');atlas.width=64;atlas.height=32;const ctx=atlas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,32,32);ctx.fillStyle='#0000ff';ctx.fillRect(32,0,32,32);
    const map=create2DAsset('tilemap','MaskLayers');map.tileset='atlas.png';map.layers[0].tiles=[{x:0,y:0,index:0}];map.layers.push({id:'upper',name:'Upper',visible:true,collision:false,tiles:[{x:0,y:0,index:1}]});
    const maskedTiles=sceneRendering({read:async()=>map,fileUrl:()=>atlas.toDataURL(),loadModel:async()=>{throw Error('unexpected model');},current:id=>groups.find(g=>g.userData.objectId===id),all:()=>groups,error:e=>{throw Error(e);}}),tileGroup=group('tiles'),rangeMask=group('range-mask');
    await maskedTiles.build({id:'tiles',kind:'tilemap',components:[makeSceneComponent('TilemapRenderer',{tilemap:'map.json',maskInteraction:'inside'})]},tileGroup);
    await maskedTiles.build({id:'range-mask',kind:'empty',components:[makeSceneComponent('SpriteMask',{width:4,height:4,customRange:true,backSortingOrder:0,frontSortingOrder:0})]},rangeMask);
    const tileState=maskedTiles.prepare2D(renderer,scene,camera,layers);renderer.render(scene,camera);expect(red(pixel(40,24))&&tileState.maskTargets===1&&tileState.maskPasses===1,'tile layers keep independent custom-range mask uniforms with no empty-mask pass');
    for(const g of [tileGroup,rangeMask])maskedTiles.dispose(g);maskedTiles.dispose2D();
    for(const g of groups)g.removeFromParent();groups.length=0;
    const particleOwner=sceneRendering({read:async()=>{throw Error('unexpected particle asset');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected particle model');},current:id=>groups.find(g=>g.userData.objectId===id),all:()=>groups}),particles=group('particles'),particleMask=group('particle-mask');
    const particleObject={id:'particles',kind:'empty',components:[makeSceneComponent('ParticleSystem',{shape:'circle',radius:0,rate:0,playOnStart:false,maxParticles:3,size:2,speed:0,color:[1,0,0,1],endColor:[1,0,0,1],endSize:1,blend:'alpha',maskInteraction:'inside'})]};
    await particleOwner.build(particleObject,particles);await particleOwner.build({id:'particle-mask',kind:'empty',components:[makeSceneComponent('SpriteMask',{width:1,height:2})]},particleMask);particleMask.position.x=-.5;
    particles.userData.particleState.simulation.emit(1,new THREE.Matrix4());particleOwner.tickParticles([particleObject],0,true);const particleMesh=particles.children.find(n=>n.isPoints),particleFrame=()=>{const s=particleOwner.prepare2D(renderer,scene,camera,layers);renderer.render(scene,camera);return s;};
    expect(particleFrame().maskPasses===1&&red(pixel(24,32))&&black(pixel(40,32)),'particle ShaderMaterial clips inside the shared Sprite Mask');
    particleMesh.userData.draw2d.maskInteraction='outside';particleFrame();expect(black(pixel(24,32))&&red(pixel(40,32)),'particles clip outside the shared Sprite Mask');
    particleMesh.userData.draw2d.maskInteraction='none';expect(particleFrame().maskTargets===0&&red(pixel(24,32))&&red(pixel(40,32)),'particle No Mask releases unused targets');
    const perspective=new THREE.PerspectiveCamera(23,1,.1,100);perspective.position.set(0,0,10);perspective.lookAt(0,0,0);const ordinaryCover=group('ordinary-cover'),ordinaryMesh=mesh(ordinaryCover,0x0000ff);delete ordinaryMesh.userData.draw2d;ordinaryMesh.position.z=1;ordinaryMesh.material.opacity=.5;particleOwner.prepare2D(renderer,scene,perspective,layers);renderer.render(scene,perspective);expect(pixel()[0]>80&&pixel()[2]>80&&particleMesh.renderOrder===0,'default 3D particles preserve camera depth order under transparent geometry');ordinaryCover.removeFromParent();groups.splice(groups.indexOf(ordinaryCover),1);
    const particleCover=group('particle-cover'),coverMesh=mesh(particleCover,0x0000ff,{sortingLayer:'front',sortingOrder:-100000});particleFrame();expect(blue(pixel()),'particle sorting respects a foreground sprite layer');coverMesh.userData.draw2d.sortingLayer='default';coverMesh.userData.draw2d.sortingOrder=-1;particleFrame();expect(red(pixel()),'particle order within the layer');particleCover.removeFromParent();groups.splice(groups.indexOf(particleCover),1);
    particleMesh.userData.draw2d.maskInteraction='inside';particles.userData.sortingGroup={sortingLayer:'default',sortingOrder:0};particleFrame();expect(black(pixel(24,32)),'external masks do not leak into a particle sorting group');particles.add(particleMask);particleFrame();expect(red(pixel(24,32)),'a mask in the particle sorting group clips particles');
    expect(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'particle mask shader links');evidence.push({kind:'particle-mask-sort',checks,particles:particles.userData.particleState.simulation.particles.length});
    particleMesh.userData.draw2d.maskInteraction='none';delete particles.userData.sortingGroup;particleMask.visible=false;
    const particleState=particles.userData.particleState,particleSettings=particleState.properties;particleState.simulation.emit(2,new THREE.Matrix4());
    Object.assign(particleSettings,{color:[1,0,0,1],endColor:[0,0,1,1]});for(const [i,z,age] of [[0,8,.1],[1,2,.9],[2,5,.5]])Object.assign(particleState.simulation.particles[i],{position:[0,0,z],age,lifetime:1});
    for(const [mode,channel] of [['depth',0],['depthReverse',2],['oldest',2],['youngest',0]]){particleSettings.sortMode=mode;particleFrame();expect(pixel()[channel]>210,'particle GPU individual order '+mode);}
    particleSettings.sortMode='depth';camera.position.z=-10;camera.lookAt(0,0,0);particleFrame();expect(pixel()[2]>210,'second camera upload uses current particle order without one-frame lag');camera.position.z=10;camera.lookAt(0,0,0);particleFrame();expect(pixel()[0]>210,'first camera restores its own particle order in the same frame');
    particleSettings.sortMode='none';particleOwner.tickParticles([particleObject],0,true);particleFrame();const mixed=Math.round(new THREE.Color(.5,0,.5).convertLinearToSRGB().r*255),restored=pixel();expect(Math.abs(restored[0]-mixed)<=1&&Math.abs(restored[2]-mixed)<=1,'none restores simulation order with linear RGB output conversion');
    particleState.simulation.particles.length=1;Object.assign(particleState.simulation.particles[0],{position:[0,0,0],age:0,size:2});particleSettings.maxParticleSize=.125;particleOwner.tickParticles([particleObject],0,true);particleFrame();expect(red(pixel(33,32))&&black(pixel(40,32)),'maximum particle size limits screen overdraw');
    particleSettings.maxParticleSize=1;particleSettings.minParticleSize=.5;particleState.simulation.particles[0].size=.001;particleOwner.tickParticles([particleObject],0,true);particleFrame();expect(red(pixel(40,32)),'minimum particle size is viewport relative');
    particleSettings.minParticleSize=particleSettings.maxParticleSize=0;particleFrame();expect(black(pixel()),'zero maximum hides the particle instead of leaving a hardware one-pixel dot');
    expect(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'particle size and sorting GPU shader links');evidence.push({kind:'particle-individual-sort-size',checks});
    for(const g of [particles,particleMask])particleOwner.dispose(g);particleOwner.dispose2D();for(const g of groups)g.removeFromParent();groups.length=0;
    const surface=await runTwoDSurfaceCase({renderer,scene,camera,groups,group,layers,pixel,expect});
    const lighting=await runTwoDLightingCase({renderer,scene,camera,groups,group,layers,pixel,expect});
    const resourceScene=new THREE.Scene(),resourceCamera=new THREE.OrthographicCamera(-6,6,6,-6,.1,100);resourceCamera.position.set(0,4,8);resourceCamera.lookAt(0,0,0);resourceScene.add(new THREE.HemisphereLight());
    const counters=()=>({programs:renderer.info.programs.length,references:renderer.info.programs.reduce((n,p)=>n+p.usedTimes,0),...renderer.info.memory});
    const cycles=async(factory)=>{const baseline=counters(),samples=[],active=[];const owner=sceneRendering({read:async()=>{throw Error('unexpected resource asset');},fileUrl:p=>p,loadModel:async()=>{throw Error('unexpected resource model');},current:id=>active.find(g=>g.userData.objectId===id),all:()=>active});
      for(let i=0;i<20;i++){const primitives=factory(defaultSurface);for(const kind of ['arch','crystal','ground','path','grass','rocks','water','cube']){const object={id:kind,kind,components:[],...kind==='cube'?{materialSurface:{...defaultSurface,color:'#ffee88'}}:{}};const g=primitives.build(object);resourceScene.add(g);active.push(g);await owner.build(object,g);}renderer.render(resourceScene,resourceCamera);
        for(const g of active){owner.dispose(g);g.removeFromParent();if(!primitives.dispose)g.traverse(c=>c.geometry?.dispose());}active.length=0;primitives.dispose?.();samples.push(counters());}
      owner.dispose2D();return {baseline,samples};};
    const ownership=await cycles(scenePrimitives);expect(ownership.samples.every(s=>Object.keys(s).every(k=>s[k]===ownership.baseline[k])),'20 complete primitive scenes release all GPU material references, geometry, and textures');
    if(beforePrimitiveSource){const source=beforePrimitiveSource.replaceAll("'./","'"+new URL('/prototype/',document.baseURI).href),url='data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(source))),old=(await import(url)).scenePrimitives;ownership.before=await cycles(old);expect(ownership.before.samples.at(-1).references>ownership.before.baseline.references+100,'unmodified baseline reproduces retained material program references');}
    evidence.push({kind:'resource-ownership',...ownership});
    expect(renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),'GPU shader compilation');const particleColor=await runParticleColorCase();return {ok:true,checks,evidence,surface,lighting,particleColor};
  }finally{draw.dispose();for(const r of resources)r.dispose();renderer.dispose();}
}
