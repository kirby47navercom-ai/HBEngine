import assert from 'node:assert/strict';
import {materialSceneDefaults,materialSceneSettings} from '../prototype/material-preview-scene.js';
import {editorMethods,engineSchema} from './editor-automation.mjs';
assert.deepEqual(materialSceneSettings(),materialSceneDefaults);assert.ok(editorMethods['material.scene']);assert.ok(engineSchema().material.functions.previewScene);
for(const mesh of ['sphere','cube','cylinder','plane'])for(const direction of ['3d','2d','top','bottom','front','back','left','right'])assert.equal(materialSceneSettings({}, {mesh,direction,realtime:false}).direction,direction);
assert.equal(materialSceneSettings({}, {mesh:'custom',model:'Assets/Models/한글 model.obj'}).mesh,'custom');
for(const patch of [{mesh:'bad'},{mesh:'custom'},{model:'../x.obj'},{model:'Assets/../x.obj'},{model:'https://x/x.glb'},{model:'Assets/x.txt'},{direction:'bad'},{mode:'unlit'},{realtime:1},{autoRotate:'true'},{backgroundColor:'red'},{lightScale:-1},{exposure:0},{exposure:Infinity},{unknown:true}])assert.throws(()=>materialSceneSettings({},patch));
const original=materialSceneSettings(),before=JSON.stringify(original);materialSceneSettings(original,{mesh:'plane',direction:'2d'});assert.equal(JSON.stringify(original),before);assert.throws(()=>materialSceneSettings(original,{mesh:'custom'}));assert.equal(JSON.stringify(original),before);
console.log('Material preview scene settings: 32 mesh/direction combinations, custom local model, bounds/types/unknown fields, immutable failure PASS');
