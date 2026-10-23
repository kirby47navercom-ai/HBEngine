import {sectionWeightCurveMarkup} from './sequence-weight-curve-editor.js';
import {editSectionWeightCurve} from './sequence-weight-curve.js';
import {validSequenceKeyBudget} from './sequence-key-storage.js';
export function sequenceAudioGainMarkup(clip,path,offset=0){return sectionWeightCurveMarkup({id:path,start:clip.start,duration:clip.duration,weightCurve:clip.volumeCurve},offset).replaceAll('data-section-weight','data-audio-gain').replaceAll('data-weight-','data-audio-gain-').replaceAll('가중치','음량').replaceAll('구간 시간','클립 시간');}
export function editSequenceAudioGain(data,path,action){
 const match=/^tracks\.(\d+)\.clips\.(\d+)$/.exec(path);if(!match)throw Error('오디오 클립 경로를 확인하세요.');const ti=Number(match[1]),ci=Number(match[2]),track=data.tracks[ti],clip=track?.clips?.[ci];if(track?.type!=='audio'||!clip)throw Error('오디오 클립을 선택하세요.');const view={duration:clip.duration,start:clip.start,weightCurve:clip.volumeCurve};editSectionWeightCurve(view,action);const next={...clip};if(view.weightCurve)next.volumeCurve=view.weightCurve;else delete next.volumeCurve;
 const candidate={...data,tracks:data.tracks.map((t,i)=>i===ti?{...t,clips:t.clips.map((c,j)=>j===ci?next:c)}:t)};if(!validSequenceKeyBudget(candidate))throw Error('시퀀스 음량 키 예산을 넘었어요.');if(next.volumeCurve)clip.volumeCurve=next.volumeCurve;else delete clip.volumeCurve;
}
