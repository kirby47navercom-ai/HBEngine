import assert from 'node:assert/strict';
import {AudioRouting,AudioMixerGraph,createAudioMixer} from '../prototype/audio-mixer.js';
const previousAudio=globalThis.Audio,previousTarget=globalThis.hbMobileTarget;
const elements=[],sources=[],events=[],linked=new WeakSet();let delayedPlay;
class Media extends EventTarget {
  constructor(){super();elements.push(this);this.paused=true;this.currentTime=0;this.duration=3600;this.readyState=4;this.networkState=1;this.playbackRate=1;this.loop=false;this.volume=1;}
  async play(){this.paused=false;await delayedPlay;}
  pause(){this.paused=true;}
  removeAttribute(name){assert.equal(name,'src');delete this.src;}
  load(){assert.ok(this.paused);assert.equal(this.src,undefined);this.unloaded=(this.unloaded||0)+1;}
}
const parameter=()=>({setValueAtTime(value,time){events.push([value,time]);}}),node=()=>({connect(){},disconnect(){this.disconnected=true;},gain:parameter(),frequency:parameter(),threshold:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),getFloatTimeDomainData(values){values.fill(.125);}});
const context={state:'running',currentTime:0,sampleRate:48000,destination:{},createGain:node,createAnalyser:node,createBiquadFilter:node,createDynamicsCompressor:node,createMediaElementSource(media){assert.ok(!linked.has(media),'a media element is associated with one source');linked.add(media);const source=node();sources.push(source);return source;},async close(){this.state='closed';}};
globalThis.Audio=Media;delete globalThis.hbMobileTarget;
const route=new AudioRouting({context});
try{
  let staleEnded=0;
  for(let i=0;i<200;i++){const voice=await route.player('/clip'+i+'.ogg');await route.connect(voice);voice.addEventListener('ended',()=>staleEnded++);voice.loop=i%2===0;voice.playbackRate=1.5;voice.currentTime=2;await voice.play();assert.equal(voice.duration,3600);assert.equal(route.peak(voice),.125);route.disconnect(voice);context.currentTime+=.1;}
  assert.equal(sources.length,1,'repeated streaming playback must not create retained media sources');assert.equal(elements.length,1);assert.equal(staleEnded,0);
  const a=await route.player('/first.ogg'),b=await route.player('/second.ogg');assert.notEqual(a,b);assert.equal(sources.length,2);await route.connect(a);await route.connect(b);await a.play();await b.play();assert.equal(a.loop,false);assert.equal(a.playbackRate,1);route.disconnect(a);
  const c=await route.player('/third.ogg');await route.connect(c);await c.play();a.pause();a.dispose();assert.equal(c.paused,false,'a released handle cannot stop the next lease');await assert.rejects(a.play(),/종료/);assert.throws(()=>{a.currentTime=9;},/종료/);assert.equal(a.paused,true);assert.equal(b.paused,false);
  let ended=0;c.addEventListener('ended',()=>ended++,{once:true});elements[0].dispatchEvent(new Event('ended'));assert.equal(ended,1);assert.equal(staleEnded,0,'old voice callbacks must not observe another clip');route.disconnect(b);route.disconnect(c);
  let complete;delayedPlay=new Promise(resolve=>complete=resolve);const late=await route.player('/late.ogg');const playing=late.play();route.disconnect(late);complete();await assert.rejects(playing,/종료/);delayedPlay=null;
  const unconnected=await route.player('/pending.ogg');route.dispose();assert.ok(unconnected.disposed);assert.ok(elements.every(media=>media.paused&&media.src===undefined));assert.ok(sources.every(source=>source.disconnected));assert.equal(route.streams.size,0);assert.equal(route.idleStreams.length,0);
  const graph=new AudioMixerGraph(context,createAudioMixer('test'));const initial=events.length;for(let i=0;i<200;i++){context.currentTime+=.01;graph.update(.01);}assert.equal(events.length,initial,'unchanged mixer settings must not append automation events');graph.state.data.buses[0].volumeDb=-6;graph.state.base[0].volumeDb=-6;graph.update(0);assert.equal(events.length,initial+1);graph.dispose();
}finally{route.dispose();globalThis.Audio=previousAudio;if(previousTarget===undefined)delete globalThis.hbMobileTarget;else globalThis.hbMobileTarget=previousTarget;}
console.log('스트리밍 소스 재사용·동시 재생·옛 핸들/이벤트 격리·늦은 play·미연결 정리·믹서 변경분 예약 통과');
