import assert from 'node:assert/strict';
import {engineOperations} from '../prototype/engine-services.js';
import {BlueprintRuntime} from '../prototype/blueprint-runtime.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
// Lifecycle tests use controllable platform doubles. PCM signal verification is in prototype/tests/ui-audio.html.
const players=[],contexts=[];let delayedPlay;
class AudioNode{constructor(){this.gain={value:1};this.disconnected=false;}connect(){}disconnect(){this.disconnected=true;}}
class AudioContextDouble{constructor(){this.state='running';this.destination={};this.listener={setPosition(){}};this.currentTime=0;this.nodes=[];contexts.push(this);}createGain(){const node=new AudioNode();this.nodes.push(node);return node;}createMediaElementSource(){return this.createGain();}async close(){this.state='closed';}}
class AudioDouble{constructor(){players.push(this);this.paused=true;this.currentTime=0;}async play(){this.paused=false;await delayedPlay;}pause(){this.paused=true;}addEventListener(){}}
const oldAudio=globalThis.Audio,oldContext=globalThis.AudioContext;
globalThis.Audio=AudioDouble;globalThis.AudioContext=AudioContextDouble;
try{
  const objects=['left','right'].map((id,i)=>({id,name:id,kind:'empty',position:[i,0,0],rotation:[0,0,0],scale:[1,1,1],visible:true,components:[makeSceneComponent('AudioSource',{clip:'Assets/Shared.wav',volume:i?.8:.5,playOnStart:true,spatial:false})]}));
  const services=engineOperations({asset:async()=> 'Assets/Shared.wav',readAsset:async()=>null,update:()=>{}}),vm=new BlueprintRuntime(objects,[],services);await vm.start();
  assert.equal(players.length,2);assert.ok(players.every(p=>!p.paused),'같은 클립의 여러 컴포넌트는 서로 재생을 끊지 않는다');
  objects[0].components[0].properties.volume=.25;await vm.tick(1/60);assert.equal(contexts[0].nodes[1].gain.value,.25,'실행 중 소스 볼륨 변경');assert.equal(contexts[0].nodes[3].gain.value,.8);
  objects[0].components[0].properties.enabled=false;await vm.tick(1/60);assert.ok(players[0].paused);assert.ok(contexts[0].nodes[0].disconnected);assert.ok(!players[1].paused);
  await services.operation('stopSound',{name:'Assets/Shared.wav'},null,vm);assert.ok(players.every(p=>p.paused));await vm.stop();services.dispose();assert.equal(contexts[0].state,'closed');
  let complete;delayedPlay=new Promise(resolve=>complete=resolve);const pendingServices=engineOperations({asset:async()=> 'Assets/Shared.wav',readAsset:async()=>null,update:()=>{}});
  const pending=pendingServices.operation('sound',{name:'clip'},null,vm);for(let i=0;i<20&&players.length<3;i++)await new Promise(resolve=>setTimeout(resolve,0));assert.equal(players.length,3);pendingServices.dispose();complete();await assert.rejects(pending,/종료/);assert.ok(players[2].paused,'Stop 뒤 완료된 play도 정리한다');assert.equal(contexts[1].state,'closed');assert.ok(contexts[1].nodes.every(n=>n.disconnected));
}finally{globalThis.Audio=oldAudio;globalThis.AudioContext=oldContext;}
console.log('오디오 소스 중복 클립·실행 중 볼륨·비활성화·Stop 이후 비동기 재생 정리 검사 통과');
