import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {textureHistoryFixture467} from './texture-history-fixture-467.mjs';
import {createProject} from './project-manifest.mjs';
import {editorWindowProbe} from './editor-window-probe.mjs';
import {activeInstalledVersions} from './install-editor.mjs';
import {retainTestEvidence,pruneTestArtifacts} from './test-artifacts.mjs';

assert.deepEqual(await activeInstalledVersions('C:/Users/kirby/HBEngine'),[]);
const work=await fs.mkdtemp(path.resolve('native/build/normal-scale-645-'));retainTestEvidence(work);
let probe;const baseline=process.argv.includes('--baseline'),executableAt=process.argv.indexOf('--executable'),executable=executableAt<0?undefined:path.resolve(process.argv[executableAt+1]);
try{
 const project=await createProject('NormalScale645',work,'2d');probe=await editorWindowProbe({work,project:project.file,executable});const rows=[];
 for(const worldScale of [1,.000001,1000000]){
  const f=textureHistoryFixture467('normal',{lobes:true,worldScale});
  const result=await probe.evaluate(`(async()=>{
   const f=${JSON.stringify(f)},G=await import('three'),W=await import('three/webgpu'),T=await import('three/tsl'),{ScreenEffectsPass}=await import('/prototype/screen-effects-gl.js'),{rayMaterialNode}=await import('/prototype/ray-material-gpu.js'),{previousRayGPU}=await import('/prototype/ray-previous-gpu.js'),{previousNormalGPU}=await import('/prototype/path-previous-normal-gpu.js'),{curvedGuideGLSL}=await import('/prototype/path-curved-guide.js'),{surfaceHistoryGLSL}=await import('/prototype/path-surface-history.js'),results={};
   for(const backend of ['webgl','webgpu']){
    const C=backend==='webgl'?G:W,renderer=backend==='webgl'?new G.WebGLRenderer():new W.WebGPURenderer();if(backend==='webgpu')await renderer.init();renderer.setSize(6,1);const p=f.current,atlas=new C.DataTexture(new Float32Array(p.data),p.width,p.height,C.RGBAFormat,C.FloatType),target=backend==='webgl'?new G.WebGLRenderTarget(6,1,{type:G.FloatType,depthBuffer:false}):new W.RenderTarget(6,1,{type:W.FloatType,depthBuffer:false}),geometry=new C.PlaneGeometry(2,2),scene=new C.Scene(),camera=new C.OrthographicCamera(-1,1,1,-1,0,2);atlas.minFilter=atlas.magFilter=C.NearestFilter;atlas.needsUpdate=true;let pass,material;
    try{
     if(backend==='webgl'){
      pass=new ScreenEffectsPass();pass.configurePrograms(p.rayInfo,true,false,false,false,false,false);material=pass.material;material.uniforms.hbGeometryScene.value=atlas;for(const key of ['geometryInfo','geometryRecords','transport','pathFilter','forward'])material.uniforms['hb'+key[0].toUpperCase()+key.slice(1)].value.fromArray(p[key]);
      const cut=material.fragmentShader.lastIndexOf('void main(');let source=material.fragmentShader.slice(0,cut);
      for(const [code,name]of [[curvedGuideGLSL,'hbPathCommittedNormal'],[surfaceHistoryGLSL,'hbPathCommittedCoatNormal']])if(!source.includes('vec3 '+name+'('))source+=code.split('\\n').find(line=>line.startsWith('vec3 '+name+'('));
      const args=f.id+'.0,p,v,float('+f.width+')',calls=['hbRayPreviousGeometric('+f.id+'.0)','hbRayPreviousSmoothNormal('+f.id+'.0,p)','hbRayPreviousNormalContextLod('+args+',vec2(hbForward.w,1))','hbRayPreviousCoatNormalContextLod('+args+',vec2(hbForward.w,1))','hbPathCommittedNormal('+args+')','hbPathCommittedCoatNormal('+args+')'];
      material.fragmentShader=source+'void main(){vec3 p=vec3('+f.point.join(',')+'),v=vec3('+f.view.join(',')+');int i=int(floor(vUv.x*6.0));'+calls.map((call,i)=>(i?'else ':'')+'if(i=='+i+')gl_FragColor=vec4('+call+',1);').join('')+'}';
     }else{
      const sample=T.texture(atlas),load=index=>T.textureLoad(sample,T.ivec2(index.mod(p.width),index.div(p.width).floor())),u={};for(const key of ['geometryInfo','geometryRecords','transport','pathFilter','forward'])u[key]=T.uniform(new W.Vector4(...p[key]));const ray=rayMaterialNode(load,u,p.rayInfo.programs,[0,1,2,3,4,5,6,7,8,9]),prior=previousRayGPU({load,ray},u,{fields:[0,1,2,3,4,5,6,7,8,9]}),committed=previousNormalGPU({load,ray},u,prior,true),id=T.float(f.id),point=T.vec3(...f.point),view=T.vec3(...f.view),width=T.float(f.width);material=new W.MeshBasicNodeMaterial();material.fragmentNode=T.Fn(()=>{const i=T.uv().x.mul(6).floor().toInt(),out=T.vec3(0).toVar();T.If(i.equal(0),()=>out.assign(prior.geometric(id)));T.If(i.equal(1),()=>out.assign(prior.smoothNormal(id,point)));T.If(i.equal(2),()=>out.assign(prior.normalTime(id,point,view,width,u.forward.w)));T.If(i.equal(3),()=>out.assign(prior.coatNormalTime(id,point,view,width,u.forward.w)));for(const coat of [false,true])T.If(i.equal(coat?5:4),()=>out.assign(committed(id,point,T.vec3(0,0,1),view,width,point,view,width,T.bool(coat))));return T.vec4(out,1);})();
     }
     scene.add(new C.Mesh(geometry,material));renderer.setRenderTarget(target);if(backend==='webgl'){renderer.render(scene,camera);const pixels=new Float32Array(24);renderer.readRenderTargetPixels(target,0,0,6,1,pixels);if(renderer.getContext().getError())throw Error('GL normal probe');results[backend]=[...pixels];}else{await renderer.renderAsync(scene,camera);results[backend]=[...await renderer.readRenderTargetPixelsAsync(target,0,0,6,1)];}
    }finally{geometry.dispose();pass?.dispose();if(!pass)material?.dispose();atlas.dispose();target.dispose();renderer.dispose();if(backend==='webgl')renderer.forceContextLoss();}
   }return results;
  })()`);
  rows.push({worldScale,result});await fs.writeFile(path.join(work,'observed.json'),JSON.stringify(rows,null,2));
 }
 const errors=rows.flatMap(row=>Object.entries(row.result).map(([api,value])=>({worldScale:row.worldScale,api,finite:value.every(Number.isFinite),error:Math.max(...value.map((v,i)=>Math.abs(v-rows[0].result[api][i]))),geometricError:Math.max(...value.slice(0,4).map((v,i)=>Math.abs(v-[0,0,1,1][i])))})));
 const exit=await probe.finish();probe=null;const proof={baseline,executable:executable||null,passed:baseline?null:errors.every(e=>e.finite&&e.error<4e-5&&e.geometricError<4e-5),rows,errors,exit,scope:'Actual GL/WebGPU committed geometric/smooth/base/coat normals and both temporal-guide validity gates at scales1e-6/1/1e6; existing4e-5 tolerance.'};await fs.writeFile(path.join(work,baseline?'baseline.json':'acceptance.json'),JSON.stringify(proof,null,2));if(!baseline)assert(proof.passed,JSON.stringify(errors));console.log(JSON.stringify({work,...proof,rows:undefined}));
}catch(error){await fs.writeFile(path.join(work,'failure.json'),JSON.stringify({error:error.stack,diagnostics:await probe?.diagnostics()},null,2));throw error;}finally{await probe?.stop();await pruneTestArtifacts(work);}
