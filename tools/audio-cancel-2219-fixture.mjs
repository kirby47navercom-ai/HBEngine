import {RuntimeGame} from '../prototype/runtime-game.js';import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';import {engineOperations} from '../prototype/engine-services.js';import {AudioRouting} from '../prototype/audio-mixer.js';
export const deferredAudio=()=>{let resolve;return{promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};};
export const audioTurn=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
export const audioUntil=async fn=>{for(let i=0;i<100;i++){if(fn())return;await audioTurn();}throw Error('Owned audio fixture did not settle');};
export const ownedPCM=()=>({duration:1,length:48000,numberOfChannels:1,sampleRate:48000});
const param=()=>({value:1,setValueAtTime(value){this.value=value;},setTargetAtTime(value){this.value=value;}});
export class OwnedAudioContext{
 constructor(){this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination={};this.decodes=[];this.gates=new Map();this.sources=0;}
 node(extra={}){return{...extra,connect(){},disconnect(){}};}
 createGain(){return this.node({gain:param()});}createAnalyser(){return this.node({getFloatTimeDomainData(values){values.fill(0);}});}createBufferSource(){this.sources++;return this.node({playbackRate:param(),start(){},stop(){}});}
 async decodeAudioData(bytes){const id=new Uint32Array(bytes)[0];this.decodes.push(id);if(this.gates.has(id))await this.gates.get(id).promise;return ownedPCM();}
 async resume(){this.state='running';}async close(){this.state='closed';}
}
export async function ownedAudioService({asset:resolveAsset}={}){
 const oldFetch=globalThis.fetch,context=new OwnedAudioContext(),ids=new Map(),fetches=[],idFor=name=>{if(!ids.has(name))ids.set(name,ids.size);return ids.get(name);};
 globalThis.fetch=async(url,{signal}={})=>{const name=new URL(url,'http://owned.invalid').searchParams.get('path')||String(url),id=idFor(name);fetches.push({name,id,signal});return{ok:true,status:200,arrayBuffer:async()=>new Uint32Array([id]).buffer};};
 const game=new RuntimeGame(),routing=new AudioRouting({context});game.audioRuntime={sessionId:game.id,audio:new Map(),pending:new Map(),errors:[],routing,epoch:0,unlocked:true,paused:false};
 const objects=['Director','Emitter'].map(id=>({id,name:id,kind:'empty',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[]})),logs=[],services=engineOperations({game,asset:resolveAsset||(async(name,kind)=>kind==='media'?name:null),readAsset:async()=>{throw Error('No project asset read expected');},update(){},remove(){},mesh:()=>null,log:message=>logs.push(message)}),vm=new BlueprintRuntime(objects,[],{...services,game,updateObject(){},log:message=>logs.push(message)});await vm.start();
 const op=(key,args={})=>services.operation(key,args,{self:'Director'},vm),hold=name=>{const id=idFor(name),gate=deferredAudio();context.gates.set(id,gate);return{id,gate};};
 return{game,routing,context,fetches,objects,vm,services,logs,op,hold,dispose:async()=>{try{await vm.stop();services.dispose('Quit');for(const gate of context.gates.values())gate.resolve();await audioTurn();}finally{globalThis.fetch=oldFetch;}}};
}
