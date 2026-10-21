import {TimelineEditor} from './timeline-editor.js';
import {validRetargetAsset} from './animation-retarget-assets.js';
import {configureSequenceCurve} from './sequence-curves.js';
import {editCurveKeys} from './curve-tools.js';
export function configureSkeletalCurve(data,params){
 const curve=data.curves?.find(c=>c.name===params.curve);if(!curve)throw Error('골격 클립 곡선을 선택하세요.');
 const track={...structuredClone(curve),type:'light',id:'curve'},holder={tracks:[track]};
 if(params.operation)Object.assign(track,editCurveKeys(track,params));else configureSequenceCurve(holder,{...params,track:'curve'});
 const next=structuredClone(data),destination=next.curves.find(c=>c.name===params.curve);destination.keys=track.keys;for(const p of ['preInfinity','postInfinity'])if(track[p]===undefined)delete destination[p];else destination[p]=track[p];
 if(!validRetargetAsset('skeletalclip',next))throw Error('골격 곡선의 시간·값·키 간격을 확인하세요.');Object.assign(curve,destination);return curve;
}
export function skeletalCurveEditor(element,controller,index){
 let source=controller.doc.data.curves[index];const node={id:'skeletal_curve',timeline:{length:controller.doc.data.duration,playRate:1,loop:true,autoplay:false,lastKeyframe:false,ignoreTimeDilation:false,tracks:[{...structuredClone(source),id:'curve',type:'float',interpolation:'linear'}]}};
 element.dataset.sequenceCurve='true';element.dataset.skeletalCurve='true';
 const apply=(data,candidate)=>{const curve=data.curves[index];curve.keys=structuredClone(candidate.tracks[0].keys);for(const p of ['preInfinity','postInfinity'])if(candidate.tracks[0][p]===undefined)delete curve[p];else curve[p]=candidate.tracks[0][p];};
 const editor=new TimelineEditor(element,()=>node,{
  maxKeys:65536,enabled:()=>!controller.hooks.running?.(),
  rendered:editor=>{editor.el.querySelector('.curve-keybar').append(editor.el.querySelector('[data-fit]'));},
  before:()=>controller.hooks.before(),error:message=>controller.hooks.error(message),
  validate:candidate=>{if(controller.hooks.running?.()||controller.doc.data.curves[index]!==source||candidate.tracks.length!==1||candidate.tracks[0].id!=='curve')return false;const next=structuredClone(controller.doc.data);apply(next,candidate);return validRetargetAsset('skeletalclip',next);},
  change:()=>{apply(controller.doc.data,node.timeline);source=controller.doc.data.curves[index];controller.hooks.change();},
  sample:time=>{controller.time=time;}
 });editor.time=controller.time;editor.draw();editor.scrub();return editor;
}
