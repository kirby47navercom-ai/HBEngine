import {createResidentMipView,residentMipBase,residentMipSource,hasResidentMipView,residentMipInfo} from './texture-resident-view.js';
import {prepareGPUAuthoredMips} from './gpu-authored-mips.js';
import {textureImportColorSpace} from './texture-mip-policy.js';
import {loadMaterialTexture,texturePlaceholder,textureAssetReferenceKind,validateTextureImages} from './texture-assets.js';
import {textureResourceIdentity,textureResourceClosure} from './texture-composite.js';

const residencyStamp=map=>[map.version,map.source,map.source?.version,map.image,map.mipmaps,map.wrapS,map.wrapT,map.wrapR,map.minFilter,map.magFilter,map.anisotropy,map.format,map.internalFormat,map.type,map.colorSpace,map.flipY,map.premultiplyAlpha,map.unpackAlignment,map.generateMipmaps,map.matrixAutoUpdate,...map.matrixAutoUpdate?[map.offset.x,map.offset.y,map.repeat.x,map.repeat.y,map.center.x,map.center.y,map.rotation]:map.matrix.elements];
const sameStamp=(map,stamp)=>residencyStamp(map).every((v,i)=>Object.is(v,stamp[i]));
// Keep only installed textures. Stage every sampler before publishing a parameter.
export function materialTextureBindings(THREE,{resources,fileUrl,renderer,onError=()=>{}}){
  const slots=[],owned=new Set(),generations=new Map();let disposed=false,loads=0;
  const release=map=>{if(owned.delete(map))map.dispose();};
  const load=(b,r=resources)=>{loads++;return loadMaterialTexture(THREE,b,r,fileUrl,renderer);};
  function add(binding,write){
    const {placeholder,...properties}=binding,slot={...properties,colorSpace:binding.colorSpace||'srgb',write,loaded:false,map:placeholder||texturePlaceholder(THREE,binding.type)};slots.push(slot);owned.add(slot.map);write(slot.map);
    if(!binding.path)return Promise.resolve();
    return slot.ready=load(slot).then(map=>{if(disposed){map.dispose();return;}const old=slot.map;owned.add(map);slot.map=map;if(map.userData.hbTextureImportReport)slot.sourceColorSpace=map.userData.hbTextureImportReport.colorSpace;slot.loaded=true;write(map);release(old);},error=>{onError('텍스처를 읽을 수 없어요: '+binding.path+' · '+error.message);if(binding.type!=='texture2d')throw error;});
  }
  async function prepare(parameter,path,nextResources){
    if(disposed)throw Error('해제된 머테리얼이에요.');const selected=slots.filter(s=>s.parameter===parameter);if(!selected.length)throw Error('사용 중인 텍스처 파라미터가 없어요: '+parameter);
    const generation=(generations.get(parameter)||0)+1;generations.set(parameter,generation);await Promise.all(selected.map(s=>s.ready));if(disposed)throw Error('해제된 머테리얼이에요.');
    for(const slot of selected)if(textureAssetReferenceKind(slot.type,path)==='texture2d'&&slot.colorSpace!=='linear'&&textureImportColorSpace(validateTextureImages('texture2d',nextResources?.[path]).import)==='linear')throw Error('텍스처 파라미터의 색 공간과 새 리소스가 달라요.');
    const unchanged=selected.every(s=>s.loaded&&s.path===path&&textureResourceIdentity(path,nextResources)===textureResourceIdentity(path,resources));
    const results=await Promise.allSettled(unchanged?[]:selected.map(s=>load({...s,path},nextResources))),maps=results.filter(r=>r.status==='fulfilled').map(r=>r.value);let finished=false;
    const cancel=()=>{if(finished)return;finished=true;for(const map of maps)map.dispose();};
    const failure=results.find(r=>r.status==='rejected');if(failure){cancel();throw failure.reason;}
    const valid=()=>!finished&&!disposed&&generations.get(parameter)===generation;
    return {valid,cancel,commit:()=>{if(!valid()){cancel();return false;}finished=true;const old=[];if(!unchanged)selected.forEach((s,i)=>{old.push(s.map);s.map=maps[i];if(s.map.userData.hbTextureImportReport)s.sourceColorSpace=s.map.userData.hbTextureImportReport.colorSpace;s.loaded=true;s.path=path;owned.add(maps[i]);s.write(maps[i]);});for(const map of old)release(map);resources=textureResourceClosure(slots.map(s=>s.path),{...resources,...nextResources});return true;}};
  }
  async function prepareResidency(parameter,base){
    if(disposed)throw Error('해제된 머테리얼이에요.');if(!Number.isInteger(base)||base<0)throw Error('상주 시작 밉을 확인하세요.');const selected=slots.filter(s=>s.parameter===parameter);if(!selected.length)throw Error('사용 중인 텍스처 파라미터가 없어요: '+parameter);const generation=(generations.get(parameter)||0)+1;generations.set(parameter,generation);await Promise.all(selected.map(s=>s.ready));if(disposed)throw Error('해제된 머테리얼이에요.');const original=selected.map(s=>s.map),stamps=original.map(residencyStamp),sourceStamps=original.map(map=>residencyStamp(residentMipSource(map))),maps=[];let finished=false;
    const cancel=()=>{if(finished)return;finished=true;for(let i=0;i<maps.length;i++)if(maps[i]!==original[i])maps[i].dispose();};
    try{for(const map of original)maps.push(residentMipBase(map)===base?map:createResidentMipView(THREE,map,base));for(let i=0;i<maps.length;i++)if(maps[i]!==original[i])prepareGPUAuthoredMips(renderer,maps[i]);}catch(error){cancel();throw error;}
    const valid=()=>!finished&&!disposed&&generations.get(parameter)===generation&&selected.every((s,i)=>s.map===original[i]&&sameStamp(s.map,stamps[i])&&sameStamp(residentMipSource(s.map),sourceStamps[i]));
    return {valid,cancel,commit:()=>{if(!valid()){cancel();return false;}finished=true;selected.forEach((s,i)=>{if(maps[i]!==original[i]){owned.add(maps[i]);s.map=maps[i];s.write(maps[i]);}});for(let i=0;i<maps.length;i++)if(maps[i]!==original[i])release(original[i]);return true;}};
  }
  return {add,prepare,prepareResidency,textures:()=>slots,resources:()=>textureResourceClosure(slots.map(s=>s.path),resources),state:()=>({disposed,loads,owned:owned.size,bindings:slots.map(({parameter,type,path,colorSpace,sourceColorSpace,map})=>({parameter,type,path,colorSpace,sourceColorSpace,...(map.userData?.hbTextureImportReport?{importReport:map.userData.hbTextureImportReport}:{}),...(hasResidentMipView(map)?{residency:residentMipInfo(map)}:{})}))}),dispose:()=>{if(disposed)return;disposed=true;for(const map of [...owned])release(map);}};
}
