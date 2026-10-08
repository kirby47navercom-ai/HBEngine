import assert from 'node:assert/strict';
import {createAsset,assetSuffix} from '../prototype/asset-documents.js';
import {materialTextureTypes} from '../prototype/texture-assets.js';
import {textureFamilyFixture} from './check-material-texture-families.mjs';
export const resourcePath=type=>'Assets/T_'+type+assetSuffix[materialTextureTypes[type].kind],materialPath=type=>'Assets/M_'+type+'.hbmaterial.json';
export async function writeTextureFamilyAssets(write){
  for(const [i,color] of ['#ff0000','#00ff00','#0000ff','#00ffff','#ff00ff','#ffff00'].entries())await write('Assets/Face'+i+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${color}"/></svg>`);
  for(const type of ['texturecube','texturearray','texture3d']){const d=createAsset(materialTextureTypes[type].kind,'T_'+type);d.images=type==='texturecube'?Array.from({length:6},(_,i)=>'Assets/Face'+i+'.svg'):['Assets/Face0.svg','Assets/Face3.svg'];await write(resourcePath(type),d);await write(materialPath(type),textureFamilyFixture(type,resourcePath(type)));}
}
export async function checkTextureFamilyEditor({call,evaluate,capturePixels,capture}){
  const steps=[],get=path=>call('document.get',{path}),patch=async(path,key,value)=>{const d=await get(path);return call('document.patch',{path,expectedRevision:d.revision,operations:[{op:'replace',path:key,value}]});};
  for(const type of ['texturecube','texturearray','texture3d']){
    const path=materialPath(type);await call('document.open',{path});const original=await get(path);await call('material.scene',{path,patch:{mesh:'plane',direction:'2d',realtime:false,environment:false,lightScale:0}});
    const base=await capturePixels('texture-family-'+type,'material');steps.push({type,pixels:base});assert.ok(type==='texture3d'?base.changed>200&&base.mean>20&&base.redDifference===0&&base.cyanDifference===0:(type==='texturecube'?base.redDifference:base.cyanDifference)>200,type+' samples expected face/layer or volume interpolation');
    const choices=type==='texturecube'?[[[1,0,0],'red'],[[-1,0,0],'green'],[[0,1,0],'blue'],[[0,-1,0],'cyan'],[[0,0,1],'magenta'],[[0,0,-1],'yellow']]:type==='texturearray'?[[0,'red'],[1,'cyan']]:[[[.25,.75,.25],'red'],[[.25,.75,.75],'cyan']];
    for(const [value,expected] of choices){await patch(path,'/graph/nodes/1/inputValues/'+(type==='texturecube'?'direction':type==='texturearray'?'index':'uv'),value);const pixels=await capturePixels('texture-'+type+'-'+expected,'material');steps.push({type,expected,value,pixels});assert.ok(pixels[expected==='magenta'?'magenta':expected+'Difference']>200,type+' '+expected+' actual pixels');}
    await patch(path,'/graph',original.data.graph);
    // Resource object preview travels through the same descriptor, typed function and render path.
    await call('material.preview',{path,node:'resource'});const object=await capturePixels('texture-object-'+type,'material');assert.ok(object.changed>200);await call('material.preview',{path,reset:true});
    const data=await get(path),before=JSON.stringify(data.data);await assert.rejects(()=>call('document.patch',{path,expectedRevision:data.revision,operations:[{op:'replace',path:'/graph/nodes/1/inputValues/textureObject',value:'https://invalid.example/texture.json'}]}));assert.equal(JSON.stringify((await get(path)).data),before);
    await capture('texture-family-'+type+'-editor');
    await call('document.open',{path:resourcePath(type)});const form='[...document.querySelectorAll(".asset-form")].find(f=>f.parentElement.hbAssetDocument?.path==='+JSON.stringify(resourcePath(type))+')';assert.equal(await evaluate(`(${form}).querySelectorAll('[data-editor-field^="images."]').length`),type==='texturecube'?6:2);
    if(type!=='texturecube'){const before=await get(resourcePath(type));await evaluate(`(${form}).querySelector('[data-texture-move="1"][data-direction="-1"]').click()`);const after=await get(resourcePath(type));assert.deepEqual(after.data.images,before.data.images.toReversed());await patch(resourcePath(type),'/images',before.data.images);}

  }
  for(const type of ['texturecube','texturearray','texture3d'])for(const path of [materialPath(type),resourcePath(type)]){await call('document.open',{path});let guard=30;while((await evaluate('window.hbEditorRendererDebug.inspect().materialPreview.history'))>0&&guard-->0){const doc=await get(path);await call('editor.undo',{path,expectedRevision:doc.revision});}assert.ok(guard>=0);assert.equal((await get(path)).dirty,false);}
  await evaluate('document.querySelector("[data-action=save-all]").click()');const end=Date.now()+5000;while(Date.now()<end&&!await evaluate('document.querySelector("#dirty-mark").hidden'))await new Promise(r=>setTimeout(r,30));assert.ok(await evaluate('document.querySelector("#dirty-mark").hidden'),'owned test edits return to original before native close');
  return {steps,resourceEditors:true,typedObjectPreview:true,invalidPatchPreserved:true,originalFilesPreserved:true,undoRestoredCleanDocuments:true};
}
