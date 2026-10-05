import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode} from '../prototype/animation-graph-assets.js';
export function animationBlendSpaceFixture(){
  const data=createAsset('animgraph','AG_BlendSpace');data.parameters.push({name:'Strafe',type:'float',value:0});const output=data.nodes.find(n=>n.type==='output'),blend=makeAnimationNode('blend2d',360,180),clips=[['Idle',[0,0,0]],['Right',[10,0,0]],['Forward',[0,10,0]]].map(([name],i)=>{const n=makeAnimationNode('clip',40,40+i*200);n.name=name;n.properties.clip='Assets/AN_'+name+'.hbanimation.json';n.properties.sync.method='group';n.properties.sync.group='Locomotion';blend.inputs['pose'+i]=n.id;return n;});output.x=710;output.y=180;output.inputs.pose=blend.id;data.nodes=[...clips,blend,output];
  const assets=Object.fromEntries(clips.map((n,i)=>{const asset=createAsset('animation',n.name),position=[[0,0,0],[10,0,0],[0,10,0]][i];asset.timeline.length=2;asset.timeline.tracks=[{id:'position',name:'Position',type:'vec3',interpolation:'linear',keys:[{time:0,value:position},{time:2,value:position}]}];return [n.properties.clip,asset];}));return {data,blend,clips,output,assets};
}
