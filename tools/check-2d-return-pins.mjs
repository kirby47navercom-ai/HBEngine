import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Group} from 'three';
import {spriteRetargetFixture} from './sprite-retarget-fixture.mjs';
import {SpriteRigPose} from '../prototype/sprite-rig-runtime.js';
import {makeRigIKSolver} from '../prototype/ik2d-assets.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeNode} from '../prototype/blueprint-model.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {engineOperations} from '../prototype/engine-services.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {serviceApi} from '../prototype/core-api.js';
const {target:data}=spriteRetargetFixture();data.solvers=[makeRigIKSolver(data,{root:'root',effector:'targetArm'})];const skin=new SpriteRigPose(data),group=new Group();group.userData.spriteSkin=skin;group.add(skin.group);const object={id:'Skin',name:'Skin',kind:'sprite',visible:true,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],components:[makeSceneComponent('SpriteSkin'),makeSceneComponent('IKManager2D')]};const services=engineOperations({headless:true,mesh:()=>group,update(){},physicsOptions:{backend:'legacy'}}),vm=new BlueprintRuntime([object],[],services);await vm.start();
const keys=['skinGetPosition','skinGetRotation','skinGetScale','ik2dGetMasterWeight','ik2dGetTarget','ik2dGetRotation','ik2dGetWeight','ik2dIsEnabled'];
try{for(const key of keys){const args={target:'Skin',bone:'targetArm',solver:data.solvers[0].id},spec=serviceApi.find(n=>n.key===key),output=await services.operation(key,args,{self:'Skin'},vm);assert.equal(spec.outputs[0].id,'return');assert.ok(Object.hasOwn(output,'return'),key+' must produce its declared BP pin');assert.deepEqual(output.return,output.result,'legacy direct service callers retained');const root=createAsset('blueprint','BP_Read'),source=makeNode(key),sink=makeNode('print');source.inputValues=args;root.nodes.push(source,sink);root.edges.push({from:{node:source.id,pin:'return'},to:{node:sink.id,pin:'message'}});const frame=vm.frame({root,self:'Skin'},root);assert.deepEqual(await vm.read(sink,{id:'message',type:spec.outputs[0].type},frame),output.return,key+' linked BP return pin');}}
finally{await vm.stop();services.dispose();skin.dispose();}
await fs.writeFile('native/build/2d-return-pins-164.json',JSON.stringify({passed:true,keys,declaredReturnPins:true,actualLinkedBlueprintReads:true,legacyDirectAliasesPreserved:true},null,2)+'\n');console.log('All 8 SpriteSkin/IK2D getters: declared and linked BP Return pins + legacy direct aliases PASS');
