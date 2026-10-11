import assert from 'node:assert/strict';
import {createAsset} from '../prototype/asset-documents.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {writeRuntimeTextureAssets,checkRuntimeTexturePlayer} from './material-texture-parameter-window-actions.mjs';

export async function nativeTextureFixture(write,scene){
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class SceneGPU : public hb::Actor {public: HB_FUNCTION(BlueprintCallable) void SetTexture(hb::Actor* target,const std::string& parameter,const std::string& texture); };',source='void SceneGPU::SetTexture(hb::Actor* target,const std::string& parameter,const std::string& texture){hb::Materials::SetTexture(target,parameter,texture);}';
  const bp=createAsset('blueprint','BP_NativeTexture');bp.settings.parentClass='SceneGPU';bp.native={...parseNativeHeader(header),header,source,headerPath:'Source/SceneGPU.h',sourcePath:'Source/SceneGPU.cpp'};const input=makeNode('input'),set=makeNode('materialTexture');input.options={key:'T'};set.inputValues={target:'TextureCube',parameter:'Paint',texture:'Assets/Red.svg'};bp.nodes=[input,set];bp.edges=[{from:{node:input.id,pin:'then'},to:{node:set.id,pin:'exec'}}];bp.construction={nodes:[makeNode('construction')],edges:[],comments:[]};
  await write('Source/SceneGPU.h',header);await write('Source/SceneGPU.cpp',source);await writeRuntimeTextureAssets(write,scene,bp);
}
export async function runNativeTextures(options){
  const proof=await checkRuntimeTexturePlayer({...options,pixels:async name=>(await options.capture(name,[.5]))[0],shaderIdentity:async s=>({programs:[s.materials.find(m=>m.object==='TextureCube').program]})});
  for(const c of proof.cases){assert.equal(c.initial.material.backend,'D3D11');assert.ok(c.initial.material.program);}
  const state=await options.inspect(),uploads=state.renderer.uploads;await options.capture('native-texture-idle',[.5]);assert.equal((await options.inspect()).renderer.uploads,uploads);
  return {...proof,idleUploadReuse:true,nativeProgramBindingIdentity:true};
}
