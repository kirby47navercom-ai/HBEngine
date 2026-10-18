import {textureImportPolicy,textureImportDefaults} from './texture-mip-policy.js';
import {cookTextureMipsAsync} from './texture-mip-cook.js';

export function textureImportFields(data,{field,options}){
 const p=textureImportPolicy(data.import),select=(label,key,rows)=>`<label>${label}<select data-editor-field="import.${key}">${options(rows,p[key])}</select></label>`;
 return `<section><h3>가져오기</h3>${select('용도','role',[['color','색상'],['normal','노멀'],['mask','마스크'],['data','자료']])}${select('색 공간','colorSpace',[['auto','자동'],['linear','선형'],...(p.role==='normal'?[]:[['srgb','sRGB']])])}${field('밉 생성','import.mipmaps',p.mipmaps,{type:'checkbox'})}${field('상위 밉 제외','import.topMip',p.topMip,{min:0,step:'1'})}${field('최대 크기 · 0 자동','import.maxSize',p.maxSize,{min:0,step:'1'})}</section><section><h3>알파</h3>${field('커버리지 유지','import.preserveCoverage',p.preserveCoverage,{type:'checkbox'})}${field('마스크 기준','import.alphaCutoff',p.alphaCutoff,{min:0,max:1})}</section>${p.role==='normal'?`<section><h3>노멀</h3>${field('녹색 채널 반전','import.flipGreen',p.flipGreen,{type:'checkbox'})}${field('하위 밉 정규화','import.normalizeNormals',p.normalizeNormals,{type:'checkbox'})}</section>`:''}`;
}
export function normalizeTextureImportEdit(data,path){
 data.import={...textureImportDefaults,...data.import};if(path==='import.role'){
  if(data.import.role!=='normal'){data.import.flipGreen=false;data.import.normalizeNormals=false;}
  else if(data.import.colorSpace==='srgb')data.import.colorSpace='auto';
 }
}
// Editor-only, top-down display. Runtime owns and flips its separate upload data.
export async function textureImportPreview(source,fileUrl,policy,win,signal){
 const image=new win.Image();await new Promise((resolve,reject)=>{const abort=()=>{image.src='';reject(Error('cancelled'));};signal.addEventListener('abort',abort,{once:true});const done=fn=>{signal.removeEventListener('abort',abort);image.onload=image.onerror=null;fn();};image.onload=()=>done(resolve);image.onerror=()=>done(()=>reject(Error('텍스처 원본을 읽지 못했어요.')));if(signal.aborted)abort();else image.src=fileUrl(source);});
 if(signal.aborted)throw Error('cancelled');const document=win.document,canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;let pixels;
 try{const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);pixels={width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data};}finally{canvas.width=canvas.height=0;}
 const cooked=await cookTextureMipsAsync(pixels,policy,{transfer:true});if(signal.aborted)throw Error('cancelled');
 return {report:cooked.report,images:cooked.levels.map(level=>{const view=document.createElement('canvas');view.width=view.naturalWidth=level.width;view.height=view.naturalHeight=level.height;view.getContext('2d').putImageData(new win.ImageData(new Uint8ClampedArray(level.data.buffer,level.data.byteOffset,level.data.length),level.width,level.height),0,0);return view;})};
}
