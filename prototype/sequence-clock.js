import {timelineFrameAt,timelineFrameTime} from './timeline-rate.js';

export const sequenceClockSources=['game','unscaled','manual','playEveryFrame'];
export function validSequenceClock(value){return value===undefined||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['source','secondsPerFrame'].includes(k))&&(value.source===undefined||sequenceClockSources.includes(value.source))&&(value.secondsPerFrame===undefined||Number.isFinite(value.secondsPerFrame)&&value.secondsPerFrame>=.001&&value.secondsPerFrame<=60);}
export function sequenceClockSettings(data){if(!validSequenceClock(data.playbackClock))throw Error('시퀀스 재생 시계 설정을 확인하세요.');return {source:data.playbackClock?.source??'game',secondsPerFrame:data.playbackClock?.secondsPerFrame??timelineFrameTime(data,1)};}
export function sequenceClockDelta(state,delta,unscaledDelta=delta){
  const clock=state.clock;if(state.paused||state.seek){clock.held=0;return 0;}
  if(clock.source==='manual')return 0;
  if(clock.source==='game'||clock.source==='unscaled')return (clock.source==='game'?delta:unscaledDelta)*state.data.rate;
  clock.held+=unscaledDelta*state.data.rate;
  if(clock.held+Number.EPSILON*8<clock.secondsPerFrame)return 0;
  // A slow update holds the next frame; it never skips or catches up in a burst.
  clock.held=0;return Math.max(0,Math.min(state.data.length,timelineFrameTime(state.data,timelineFrameAt(state.data,state.time,'floor')+1))-state.time);
}
export const sequenceClockContract={field:'playbackClock',optional:true,sources:sequenceClockSources,defaultSource:'game',secondsPerFrame:{minimum:.001,maximum:60,default:'one display frame in seconds'},runtime:'SetClockSource/GetClockSource/SetSecondsPerFrame/GetSecondsPerFrame; Advance evaluates a nonnegative manual delta with playback rate and crossed events; Evaluate samples current time without events. Pause blocks Advance.',playEveryFrame:'One next display frame at most per active VM update after unscaled elapsed hold; slow updates discard excess elapsed time. Child sections inherit root time. No global VM pause bypass.',storage:'Settings never retime stored seconds or change display/capture/engine cadence.',remaining:['External audio/timecode/RTC/genlock provider','Independent child/channel time inheritance']};
