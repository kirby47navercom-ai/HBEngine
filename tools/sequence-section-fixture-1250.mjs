import {createAsset} from '../prototype/asset-documents.js';import {createGameplayAsset,makeSequenceTrack} from '../prototype/gameplay-assets.js';import {makeNode} from '../prototype/blueprint-model.js';import {editSequenceSection} from '../prototype/sequence-sections.js';
export const parentPath='Assets/LS_Parent.hbsequence.json',childPath='Assets/LS_Child.hbsequence.json';
export function sectionFixture(){
 const parent=createGameplayAsset('sequenceasset','Parent'),child=createGameplayAsset('sequenceasset','Child');parent.length=5;child.length=2;
 const rootTrack=makeSequenceTrack('position');rootTrack.target='Target';rootTrack.keys=[{time:0,value:[10,0,0]}];parent.tracks=[rootTrack];const track=makeSequenceTrack('position');track.target='Target';track.keys=[{time:0,value:[0,0,0]},{time:2,value:[20,0,0]}];child.tracks=[track];
 editSequenceSection(parent,{operation:'add',section:{id:'ChildSection',name:'Child',asset:childPath,start:1,duration:3,sourceStart:.5,rate:1,loop:true}});
 const bp=createAsset('blueprint','BP_SequenceSections','Actor'),node=(key,id,inputValues={})=>({...makeNode(key),id,inputValues});bp.nodes=[node('beginPlay','Begin'),node('playSequence','Play',{target:'Director',asset:parentPath}),node('sequencePause','Pause',{target:'Director',paused:true}),node('sequenceSeek','Seek',{target:'Director',time:1.25})];bp.edges=[{from:{node:'Begin',pin:'then'},to:{node:'Play',pin:'exec'}},{from:{node:'Play',pin:'then'},to:{node:'Pause',pin:'exec'}},{from:{node:'Pause',pin:'then'},to:{node:'Seek',pin:'exec'}}];bp.construction={nodes:[],edges:[],comments:[]};
 return {parent,child,bp,assets:new Map([[parentPath,parent],[childPath,child]])};
}
