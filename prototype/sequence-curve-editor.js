import {TimelineEditor} from './timeline-editor.js';
import {sequenceCurveType} from './sequence-curves.js';
import {validGameplayAsset} from './gameplay-assets.js';
// Adapt the existing key/handle editor; sequence bindings and playback settings
// never become editable Timeline tracks or a second persisted asset.
export function sequenceCurveEditor(element,controller,track){
 const data=controller.doc.data,type=sequenceCurveType(track),node={id:'sequence_'+track.id,timeline:{length:data.length,playRate:data.rate,loop:data.loop,autoplay:false,lastKeyframe:false,ignoreTimeDilation:false,tracks:[{id:track.id,name:track.name,type,interpolation:'linear',preInfinity:track.preInfinity,postInfinity:track.postInfinity,keys:structuredClone(track.keys)}]}};
 element.dataset.sequenceCurve='true';
 const editor=new TimelineEditor(element,()=>node,{
  maxKeys:1024,
  rangeEditable:!track.quaternionInterpolation,
  rendered:editor=>{const fit=editor.el.querySelector("[data-fit]");editor.el.querySelector(".curve-keybar").append(fit);},
  before:()=>controller.hooks.before(),error:message=>controller.hooks.error(message),
  validate:candidate=>{if(controller.hooks.running?.())return false;const next=structuredClone(controller.doc.data),destination=next.tracks.find(t=>t.id===track.id);if(!destination||candidate.tracks.length!==1||candidate.tracks[0].id!==track.id)return false;destination.keys=structuredClone(candidate.tracks[0].keys);for(const p of ['preInfinity','postInfinity'])if(candidate.tracks[0][p]===undefined)delete destination[p];else destination[p]=candidate.tracks[0][p];return validGameplayAsset('sequenceasset',next);},
  change:()=>{const destination=controller.doc.data.tracks.find(t=>t.id===track.id);destination.keys=structuredClone(node.timeline.tracks[0].keys);for(const p of ['preInfinity','postInfinity'])if(node.timeline.tracks[0][p]===undefined)delete destination[p];else destination[p]=node.timeline.tracks[0][p];controller.hooks.change();controller.visualPreview?.sample(controller.time);},
  sample:time=>{controller.time=time;controller.visualPreview?.sample(time);}
 });
 editor.time=controller.time;editor.draw();editor.scrub();return editor;
}
