import assert from 'node:assert/strict';import * as G from 'three';import {makeMaterialNode,materialDefaults,validMaterialGraph} from '../prototype/material-runtime.js';
export function materialClockFixture940(mode='automatic'){
 const pan=makeMaterialNode('panner'),gradient=makeMaterialNode('linearGradient'),surface=makeMaterialNode('surface'),nodes=[pan,gradient,surface],edges=[],wire=(from,pin,to,input)=>edges.push({from:{node:from.id,pin},to:{node:to.id,pin:input}});
 pan.inputValues={uv:[0,0],speed:[1,0]};wire(pan,'value',gradient,'uv');wire(gradient,'value',surface,mode==='shadingOnly'?'roughness':'closedVolume');
 if(mode==='literal')pan.inputValues.time=0;
 if(mode==='wiredLiteral'||mode==='explicit'){const value=makeMaterialNode(mode==='explicit'?'time':'scalar');value.value=0;nodes.push(value);wire(value,'value',pan,'time');}
 if(mode==='unrelated'){edges.pop();nodes.push(makeMaterialNode('time'));}
 const data={surface:{...materialDefaults,transmission:1,attenuationDistance:1,closedVolume:0},graph:{nodes,edges}};assert(validMaterialGraph(data.graph));const material=new G.MeshPhysicalMaterial({transmission:1});material.userData.materialSource=data;return {material,data};
}
