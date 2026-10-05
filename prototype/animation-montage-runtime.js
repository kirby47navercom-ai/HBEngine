import {AnimationGraphPlayer} from './animation-graph-runtime.js';
import {createAnimationGraph,makeAnimationNode} from './animation-graph-assets.js';

// Montage clocks belong to gameplaySystems. Clip sampling uses the same compiled
// bindings/pose buffers as graph clips, without writing an intermediate scene pose.
export class AnimationMontagePlayer {
  static async load(data,options){
    const graph=createAnimationGraph(data.name),direct=makeAnimationNode('direct');graph.nodes=[graph.nodes[1],direct];graph.nodes[0].inputs.pose=direct.id;direct.properties.samples=[];const sources=new Map();
    for(const segment of data.clips)if(!sources.has(segment.clip)){const node=makeAnimationNode('clip');node.properties.clip=segment.clip;node.properties.loop=false;graph.nodes.push(node);sources.set(segment.clip,node.id);const input='pose'+sources.size;direct.inputs[input]=node.id;direct.properties.samples.push({input,weight:0,parameter:''});}
    const program=await AnimationGraphPlayer.load(graph,options);try{return new AnimationMontagePlayer(data,program,sources);}catch(error){program.dispose();throw error;}
  }
  constructor(data,program,sources){this.data=data;this.program=program;this.sources=sources;this.slots=new Map();for(const segment of data.clips){const name=segment.slot||'DefaultSlot';if(!this.slots.has(name))this.slots.set(name,{player:program,pose:program.allocatePose(),sprites:program.referenceSprites,weight:0,active:false});}this.output=program.allocatePose();}
  validateGraph(graph){for(const name of this.slots.keys())if(!graph.data.nodes.some(n=>graph.reachable.has(n.id)&&n.type==='slot'&&n.properties.group===(this.data.group||'DefaultGroup')&&n.properties.slot===name))throw Error('그래프에 몽타주 슬롯을 연결하세요: '+(this.data.group||'DefaultGroup')+'.'+name);}
  sample(time,weight){this.time=time;this.weight=weight;for(const value of this.slots.values())value.active=false;for(const segment of this.data.clips){if(segment.start>time||segment.start+segment.duration<time||segment.start+segment.duration===time&&time!==this.data.length)continue;const value=this.slots.get(segment.slot||'DefaultSlot');if(value.active)throw Error('같은 슬롯의 클립은 겹칠 수 없어요.');Object.assign(value,this.program.sampleClip(this.sources.get(segment.clip),segment.sourceStart+(time-segment.start)*segment.rate,value.pose));value.weight=weight;value.active=true;}}
  slot(name){const value=this.slots.get(name);return value?.active?value:null;}
  async apply(){const value=[...this.slots.values()].find(s=>s.active);if(value){this.program.mix(this.output,this.program.rest,value.pose,value.weight);await this.program.applyPose({pose:this.output,sprites:this.program.mergeSprites(this.program.referenceSprites,value.sprites,value.weight)});}}
  dispose(){this.program.dispose();this.slots.clear();this.sources.clear();}
}
