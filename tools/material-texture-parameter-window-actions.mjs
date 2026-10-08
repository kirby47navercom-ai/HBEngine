import assert from 'node:assert/strict';
import {createAsset,assetSuffix} from '../prototype/asset-documents.js';
import {materialTextureTypes} from '../prototype/texture-assets.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {runtimeTextureFixture} from './check-material-texture-parameters.mjs';
export const runtimeTexturePath=(type,cyan=false)=>'Assets/'+(cyan?'Cyan':'Red')+(type==='texture2d'?'.svg':assetSuffix[materialTextureTypes[type].kind]);
export async function writeRuntimeTextureAssets(write,scene,bp){
  for(const [name,color] of [['Red','#ff0000'],['Cyan','#00ffff']])await write('Assets/'+name+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${color}"/></svg>`);
  for(const type of Object.keys(materialTextureTypes)){
    if(type!=='texture2d')for(const cyan of [false,true]){const d=createAsset(materialTextureTypes[type].kind,(cyan?'Cyan':'Red'));d.images=Array(type==='texturecube'?6:2).fill(runtimeTexturePath('texture2d',cyan));await write(runtimeTexturePath(type,cyan),d);}
    const material='Assets/M_Runtime_'+type+'.hbmaterial.json';await write(material,runtimeTextureFixture(type,runtimeTexturePath(type)));
    const blueprint=structuredClone(bp);blueprint.name='BP_Runtime_'+type;blueprint.nodes.find(n=>n.key==='materialTexture').inputValues.texture=runtimeTexturePath(type);const blueprintPath='Assets/BP_Runtime_'+type+'.hbblueprint.json';await write(blueprintPath,blueprint);
    const level=structuredClone(scene);level.objects=level.objects.filter(o=>['Camera','Driver'].includes(o.id));level.objects.find(o=>o.id==='Driver').blueprintAsset=blueprintPath;level.objects.push({...createPlacedObject('cube',{id:'TextureCube'}),materialAsset:material,position:[0,-2,0],scale:[4,4,4]});await write('Assets/Scenes/Texture_'+type+'.hbscene.json',level);
  }
}
export async function checkRuntimeTexturePlayer({evaluate,inspect,pixels,ready,cdp,until}){
  const cases=[],state=async()=>{const s=await inspect();return {material:s.materials.find(m=>m.object==='TextureCube'),memory:s.renderer.memory,programs:s.renderer.programs,shaderIdentity:await evaluate('window.hbPlayerDebug.shaderIdentity()')};};
  for(const type of Object.keys(materialTextureTypes)){
    await evaluate('window.hbPlayerDebug.open('+JSON.stringify('Assets/Scenes/Texture_'+type+'.hbscene.json')+')');await ready();const red=await pixels('runtime-'+type+'-red'),initial=await state();assert.ok(red[0]>red[1]+50&&red[0]>red[2]+50,JSON.stringify(red));
    await evaluate('window.hbPlayerDebug.call("Driver","SceneGPU.SetTexture",'+JSON.stringify({target:'TextureCube',parameter:'Paint',texture:runtimeTexturePath(type,true)})+')');const cyan=await pixels('runtime-'+type+'-cpp-cyan');assert.ok(cyan[1]>cyan[0]+50&&cyan[2]>cyan[0]+50,JSON.stringify(cyan));
    const afterSwap=await state();for(let i=0;i<10;i++)await evaluate('window.hbPlayerDebug.call("Driver","SceneGPU.SetTexture",'+JSON.stringify({target:'TextureCube',parameter:'Paint',texture:runtimeTexturePath(type,true)})+')');const repeated=await state();assert.equal(repeated.material.textures.loads,afterSwap.material.textures.loads,'same asset avoids decode/upload');assert.deepEqual(repeated.shaderIdentity,initial.shaderIdentity);
    // A real keyboard event executes the persisted Blueprint node, using asset-name lookup.
    for(const keyType of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type:keyType,key:'T',code:'KeyT',windowsVirtualKeyCode:84});await until(async()=> (await state()).material.parameters.Paint===runtimeTexturePath(type),'BP 텍스처 변경');
    const blueprint=await pixels('runtime-'+type+'-bp');assert.ok(blueprint[0]>blueprint[1]+50,'BP restores the same typed texture parameter');
    const final=await state();assert.equal(final.material.id,initial.material.id);assert.equal(final.material.version,initial.material.version);assert.equal(final.material.textures.owned,1);assert.deepEqual(final.memory,initial.memory);assert.deepEqual(final.programs,initial.programs);assert.deepEqual(final.shaderIdentity,initial.shaderIdentity);assert.ok((final.shaderIdentity.pipelines||final.shaderIdentity.programs).length>0);cases.push({type,red,cyan,initial,afterSwap,repeated,blueprint,final});
  }
  return {cases,easyCppAndBlueprint:true};
}
