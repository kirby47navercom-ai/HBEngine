import {textureImportPolicy,textureImportDefaults} from './texture-mip-policy.js';
import {cookTextureMipsAsync} from './texture-mip-cook.js';
import {textureCompositePolicy,validateTextureComposite,compositeDescriptor,compositeNormalSource} from './texture-composite.js';
import {diskMipEligible,validDiskMipSettings} from './texture-disk-mips.js';

export function textureDiskMipFields(data,{field}){if(!data.mips?.length)return '';const s=data.streaming;return '<section><h3>디스크 스트리밍</h3>'+(s?.enabled?'<button data-texture-disk-disable>사용 안 함</button>'+field('시작 밉','streaming.initialMip',s.initialMip,{min:0,max:data.mips.length,step:'1'}):'<button data-texture-disk-enable '+(diskMipEligible(data)?'':'disabled')+'>디스크 밉 사용</button>')+'</section>';}
export const textureDiskPreviewKey=data=>JSON.stringify([data.images,data.mips,textureImportPolicy(data.import),data.composite]);
export function editDiskMipSettings(data,button,dimensions){if(button.hasAttribute('data-texture-disk-disable')){data.streaming={...data.streaming,enabled:false};return;}if(!dimensions||dimensions.key!==textureDiskPreviewKey(data))throw Error('현재 텍스처 미리보기를 먼저 읽어 주세요.');const streaming={enabled:true,width:dimensions.width,height:dimensions.height,initialMip:Math.min(2,data.mips?.length||0)};if(!validDiskMipSettings({...data,streaming}))throw Error('디스크 스트리밍에는 마지막 1 크기까지의 사용자 지정 밉이 필요해요.');data.streaming=streaming;}

export function textureImportFields(data,{field,options,assetField,files}){
 const p=textureImportPolicy(data.import),select=(label,key,rows)=>`<label>${label}<select data-editor-field="import.${key}">${options(rows,p[key])}</select></label>`;
 const c=textureCompositePolicy(data.composite),composite=assetField?`<section><h3>노멀·거칠기 합성</h3>${assetField('노멀 원본','composite.normalTexture',c.normalTexture,files,['texture','texture2d'])}<label>거칠기 채널<select data-editor-field="composite.channel">${options(['r','g','b','a'].map(id=>[id,id.toUpperCase()]),c.channel)}</select></label>${field('합성 강도','composite.power',c.power,{min:0,max:16})}<label>분산 방식<select data-editor-field="composite.mode">${options([['isotropic','등방성'],['directional','방향별 거칠기']],c.mode)}</select></label>${c.mode==='directional'?`<label>Y 거칠기 채널<select data-editor-field="composite.secondaryChannel">${options(['r','g','b','a'].map(id=>[id,id.toUpperCase()]),c.secondaryChannel)}</select></label>${field('최대 기울기','composite.maxSlope',c.maxSlope,{min:1,max:128})}`:''}${field('분산 임계값','composite.varianceThreshold',c.varianceThreshold,{min:0,max:10000})}${field('분산 상한','composite.varianceLimit',c.varianceLimit,{min:0,max:10000})}</section>`:'';
 return `<section><h3>가져오기</h3>${select('용도','role',[['color','색상'],['normal','노멀'],['mask','마스크'],['data','자료']])}${select('색 공간','colorSpace',[['auto','자동'],['linear','선형'],...(p.role==='normal'?[]:[['srgb','sRGB']])])}${field('밉 생성','import.mipmaps',p.mipmaps,{type:'checkbox'})}${field('상위 밉 제외','import.topMip',p.topMip,{min:0,step:'1'})}${field('최대 크기 · 0 자동','import.maxSize',p.maxSize,{min:0,step:'1'})}</section><section><h3>알파</h3>${field('커버리지 유지','import.preserveCoverage',p.preserveCoverage,{type:'checkbox'})}${field('마스크 기준','import.alphaCutoff',p.alphaCutoff,{min:0,max:1})}</section>${p.role==='normal'?`<section><h3>노멀</h3>${field('녹색 채널 반전','import.flipGreen',p.flipGreen,{type:'checkbox'})}${field('하위 밉 정규화','import.normalizeNormals',p.normalizeNormals,{type:'checkbox'})}</section>`:''}${composite}`;
}
export function normalizeTextureImportEdit(data,path){
 data.import={...textureImportDefaults,...data.import};if(path==='import.role'){
  if(data.import.role!=='normal'){data.import.flipGreen=false;data.import.normalizeNormals=false;}
  else if(data.import.colorSpace==='srgb')data.import.colorSpace='auto';
 }
 if(path==='composite.mode'&&data.composite?.mode==='directional'&&(data.composite.channel??'a')===(data.composite.secondaryChannel??'g'))data.composite.secondaryChannel=['r','g','b','a'].find(c=>c!==(data.composite.channel??'a'));
 validateTextureComposite(data.composite,data.import);
 if(data.streaming?.enabled&&(/^(images|mips)\./.test(path)||!validDiskMipSettings(data)))data.streaming.enabled=false;
}
// Editor-only, top-down display. Runtime owns and flips its separate upload data.
async function previewImage(source,fileUrl,win,signal){
 const image=new win.Image();await new Promise((resolve,reject)=>{const done=fn=>{signal.removeEventListener('abort',abort);image.onload=image.onerror=null;fn();},abort=()=>{done(()=>reject(Error('cancelled')));image.src='';};signal.addEventListener('abort',abort,{once:true});image.onload=()=>done(resolve);image.onerror=()=>done(()=>reject(Error('텍스처 원본을 읽지 못했어요.')));if(signal.aborted)abort();else image.src=fileUrl(source);});
 if(signal.aborted)throw Error('cancelled');return image;
}
function previewPixels(image,document){const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;try{const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return{width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data};}finally{canvas.width=canvas.height=0;}}
export async function textureImportPreview(source,fileUrl,policy,win,signal,{composite,readAsset,authoredSources=[]}={}){
 const c=validateTextureComposite(composite,policy),resources={};if(compositeDescriptor(c.normalTexture)){if(!readAsset)throw Error('합성 노멀 에셋을 읽지 못했어요.');resources[c.normalTexture]=await readAsset(c.normalTexture);}if(signal.aborted)throw Error('cancelled');const normalSource=compositeNormalSource({composite:c,import:policy},resources),imagePromise=previewImage(source,fileUrl,win,signal),[image,normal]=await Promise.all([imagePromise,normalSource===source?imagePromise:normalSource?previewImage(normalSource,fileUrl,win,signal):null]),document=win.document,authoredImages=[];for(const path of authoredSources)authoredImages.push(await previewImage(path,fileUrl,win,signal));let cooked;
 for(let attempt=0;attempt<2;attempt++){try{const pixels=previewPixels(image,document);cooked=await cookTextureMipsAsync(pixels,policy,{signal,transfer:true,composite:c,normalPixels:normal===image?pixels:normal?previewPixels(normal,document):undefined,authoredLevels:authoredImages.length?authoredImages.map(image=>previewPixels(image,document)):undefined});break;}catch(error){if(!error.retryTextureDecode||attempt)throw error;}}
 if(signal.aborted)throw Error('cancelled');if(cooked.report.authored)cooked.report.authoredSources=[source,...authoredSources];
 return {report:cooked.report,images:cooked.levels.map(level=>{const view=document.createElement('canvas');view.width=view.naturalWidth=level.width;view.height=view.naturalHeight=level.height;view.getContext('2d').putImageData(new win.ImageData(new Uint8ClampedArray(level.data.buffer,level.data.byteOffset,level.data.length),level.width,level.height),0,0);return view;})};
}
