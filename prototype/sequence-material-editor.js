import {materialVectorProperty,materialVectorValue} from './material-runtime.js';
import {valueControl} from './blueprint-details.js';
const directions=new Set(['normal','clearcoatNormal','hairTangent']);
// The picker is an SDR view; rendering this view never clamps authored HDR data.
export function materialVectorColorHex(value){return '#'+value.map(v=>{const linear=Math.max(0,Math.min(1,v)),srgb=linear<=.0031308?linear*12.92:1.055*linear**(1/2.4)-.055;return Math.round(srgb*255).toString(16).padStart(2,'0');}).join('');}
export function materialVectorColorValue(value){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error('머테리얼 색상을 확인하세요.');return materialVectorValue(value);}
export function materialVectorKeyMarkup(track,key,address){
 if(!/^\d+:\d+$/.test(address))throw Error('머테리얼 키 주소를 확인하세요.');const picker=directions.has(materialVectorProperty(track.name))?'':'<label>색상<input type="color" value="'+materialVectorColorHex(key.value)+'" data-sequence-material-color-key="'+address+'" aria-label="머테리얼 색상"></label>';
 return '<div class="sequence-material-value">'+picker+valueControl('vec3',key.value,'data-sequence-value-key="'+address+'"',track.name)+'</div>';
}
