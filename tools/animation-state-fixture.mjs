import {createAsset} from '../prototype/asset-documents.js';
import {makeAnimationNode} from '../prototype/animation-graph-assets.js';
import {addAnimationState,addAnimationTransition} from '../prototype/animation-state-assets.js';
export function animationStatesFixture(){
  const data=createAsset('animgraph','AG_Locomotion'),machine=makeAnimationNode('stateMachine',420,140);machine.name='Locomotion';const idle=machine.properties.states[0],run=addAnimationState(machine,{name:'Run',x:450,y:140}),attack=addAnimationState(machine,{name:'Attack',x:450,y:320});idle.onEnter='IdleEnter';idle.onExit='IdleExit';run.onEnter='RunEnter';run.onFullyBlended='RunFull';attack.onEnter='AttackEnter';
  data.parameters.push({name:'Attack',type:'trigger',value:false},{name:'Mode',type:'int',value:0});
  const clips=[idle,run,attack].map((s,i)=>{const n=makeAnimationNode('clip',40,70+i*200);n.name=s.name+' Clip';n.properties.clip='Assets/AN_'+s.name+'.hbanimation.json';machine.inputs[s.input]=n.id;return n;});data.nodes=data.nodes.filter(n=>n.type==='output');data.nodes[0].inputs.pose=machine.id;data.nodes[0].x=840;data.nodes.push(...clips,machine);
  const forward=addAnimationTransition(machine,idle.id,run.id,data.parameters);forward.duration=1;forward.onStart='MoveStart';forward.onEnd='MoveEnd';const reverse=addAnimationTransition(machine,run.id,idle.id,data.parameters);reverse.conditions[0].op='false';reverse.duration=.2;const hit=addAnimationTransition(machine,'any',attack.id,data.parameters);hit.conditions=[{parameter:'Attack',op:'true',value:true}];hit.priority=-1;hit.duration=.2;
  const assets=Object.fromEntries(clips.map((node,i)=>{const a=createAsset('animation',node.name);a.timeline.length=2;a.timeline.tracks=[{id:'position',name:'Position',type:'vec3',interpolation:'linear',keys:[{time:0,value:[i*10,0,0]},{time:2,value:[i*10,0,0]}]}];return [node.properties.clip,a];}));return {data,machine,idle,run,attack,clips,forward,reverse,hit,assets};
}
