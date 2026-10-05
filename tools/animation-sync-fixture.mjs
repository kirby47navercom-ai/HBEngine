import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {makeAnimationNotify,makeAnimationNotifyState} from '../prototype/animation-sync.js';
export function animationSyncFixture({notifyStates=false}={}){
  const data=createAsset('animgraph','AG_Sync'),a=makeAnimationNode('clip',40,80),b=makeAnimationNode('clip',40,280),blend=makeAnimationNode('blend',360,160),sync=makeAnimationNode('sync',660,160);a.name='Walk';b.name='Run';a.properties.clip='Assets/AN_Walk.hbanimation.json';b.properties.clip='Assets/AN_Run.hbanimation.json';
  for(const n of [a,b]){n.properties.sync.method='graph';n.properties.sync.markers=[{id:crypto.randomUUID(),name:'Left',time:0},{id:crypto.randomUUID(),name:'Right',time:n===a?1:3}];n.properties.notifies=[makeAnimationNotify('Footstep',n===a?.5:1.5)];}
  if(notifyStates){for(const n of [a,b])n.properties.notifies[0].parameters=[{name:'Damage',type:'int',value:12},{name:'Label',type:'string',value:'한글'},{name:'Direction',type:'vec2',value:[1,2]}];const state=makeAnimationNotifyState('HitWindow',.1,1.7);state.parameters=[{name:'Strength',type:'float',value:.75}];a.properties.notifyStates=[state];}
  blend.properties.parameter='Speed';data.parameters[0].value=.25;blend.inputs={a:a.id,b:b.id};sync.inputs.pose=blend.id;const output=data.nodes.find(n=>n.type==='output');output.x=960;output.inputs.pose=sync.id;data.nodes=[a,b,blend,sync,output];
  const assets=Object.fromEntries([a,b].map((n,i)=>{const asset=createAsset('animation',n.name),length=i?4:2;asset.timeline.length=length;asset.timeline.tracks=[{id:'position',name:'Position',type:'vec3',interpolation:'linear',keys:[{time:0,value:[0,0,0]},{time:length,value:[1,0,0]}]}];return [n.properties.clip,asset];}));return {data,a,b,blend,sync,output,assets};
}
