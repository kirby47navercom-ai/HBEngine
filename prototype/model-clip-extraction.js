import {clipRange,clipMetadataRange} from './animation-clip-range.js';
import {KeyframeTrack,PropertyBinding,InterpolateLinear} from 'three';
import {validRetargetAsset} from './animation-retarget-assets.js';

export function modelAnimationSubasset(result,metadata,id){
  const row=metadata.subassets.find(r=>r.id===id&&r.kind==='animation');if(!row)throw Error('가져온 애니메이션 하위 에셋을 선택하세요.');const clips=result.animations||result.object?.animations||[];
  if(/\.(gltf|glb)$/i.test(metadata.source)&&Number.isInteger(row.sourceIndex)){if(!clips[row.sourceIndex])throw Error('원본 애니메이션 인덱스가 달라요. 다시 가져오세요.');return clips[row.sourceIndex];}
  const matches=clips.filter(c=>c.name===row.name);if(matches.length!==1)throw Error('애니메이션 이름이 없거나 중복돼요. 원본 클립 이름을 고유하게 지정하세요.');return matches[0];
}
function stableTrackName(root,track,names){
  const p=PropertyBinding.parseTrackName(track.name),node=PropertyBinding.findNode(root,p.nodeName);if(!node)throw Error('클립 대상 노드가 없어요: '+track.name);
  if(p.objectName!==undefined&&p.objectName!=='bones')throw Error('독립 클립이 지원하지 않는 대상이에요: '+track.name);
  let target=node;if(p.objectName==='bones'){const bones=node.skeleton?.bones||[],matches=bones.filter((bone,index)=>bone.name===p.objectIndex||String(index)===p.objectIndex);if(matches.length!==1)throw Error('클립의 골격 뼈 연결이 없거나 중복돼요: '+track.name);target=matches[0];}
  if(target[p.propertyName]===undefined)throw Error('클립 대상 속성이 없어요: '+track.name);
  if(p.propertyName==='morphTargetInfluences'&&p.propertyIndex!==undefined){const index=/^\d+$/.test(p.propertyIndex)?Number(p.propertyIndex):target.morphTargetDictionary?.[p.propertyIndex];if(!Number.isInteger(index)||index<0||index>=target.morphTargetInfluences.length)throw Error('클립의 모프 연결을 확인하세요: '+track.name);}
  const relative=node===root&&(!p.nodeName||p.nodeName==='.'||p.nodeName===root.uuid),name=relative?'':node.name;
  if(!relative&&(!name||names.get(name)!==1||PropertyBinding.sanitizeNodeName(name)!==name))throw Error('독립 클립 대상에는 고유하고 바인딩 가능한 노드 이름이 필요해요: '+track.name);
  return name+(p.objectName?'.'+p.objectName+'['+p.objectIndex+']':'')+'.'+p.propertyName+(p.propertyIndex!==undefined?'['+p.propertyIndex+']':'');
}
function* modelClipExtraction(root,clip,options={}){
  if(!root?.isObject3D||!clip||!Array.isArray(clip.tracks)||!clip.tracks.length||clip.tracks.length>1024||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>86400||!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['name','custom','fps','start','end'].includes(k)))throw Error('모델 클립·추출 옵션을 확인하세요.');
  const {name=clip.name||'Clip',custom='reject',fps=30}=options,range=clipRange(clip.duration,options.start,options.end);if(!['reject','bake'].includes(custom)||!Number.isFinite(fps)||fps<1||fps>240)throw Error('사용자 보간 처리·FPS를 확인하세요.');
  const metadata={};for(const key of ['notifies','notifyStates','curves'])if(clip.userData?.[key]!==undefined)metadata[key]=clip.userData[key];if(!validRetargetAsset('skeletalclip',{version:1,name,duration:clip.duration,tracks:[],...metadata}))throw Error('원본 클립 메타데이터를 확인하세요.');
  const names=new Map();root.traverse(node=>{if(node.name)names.set(node.name,(names.get(node.name)||0)+1);});const plans=[],sampledTracks=[];let values=0;
  for(const track of clip.tracks){
    const path=stableTrackName(root,track,names),standard=[track.InterpolantFactoryMethodDiscrete,track.InterpolantFactoryMethodLinear,track.InterpolantFactoryMethodSmooth].includes(track.createInterpolant)&&(!range.sliced||track.createInterpolant!==track.InterpolantFactoryMethodSmooth),cubic=!!track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline,size=track.getValueSize()/(cubic?3:1),count=standard?(range.sliced?2+track.times.filter(t=>t>range.start&&t<range.end).length:track.times.length):Math.ceil(range.duration*fps-1e-9)+1;
    if(!standard&&custom!=='bake')throw Error('사용자/CUBICSPLINE 또는 구간 Smooth 보간은 FPS를 선택하고 명시적으로 베이크하세요: '+track.name);
    if(!Number.isInteger(size)||size<1||size>256||!['number','vector','quaternion'].includes(track.ValueTypeName))throw Error('독립 클립 트랙의 자료형을 확인하세요: '+track.name);
    values+=count*size;if(!Number.isSafeInteger(values)||values>8000000)throw Error('추출 값 예산을 넘어요. FPS 또는 원본 클립 길이를 줄이세요.');plans.push({track,path,standard,size,count});
  }
  const tracks=[];for(const {track,path,standard,size,count}of plans){
    if(standard&&!range.sliced){tracks.push({...KeyframeTrack.toJSON(track),name:path});continue;}
    if(standard){const interpolant=track.createInterpolant(),times=[range.start,...track.times.filter(t=>t>range.start&&t<range.end),range.end],values=[];for(const time of times)values.push(...interpolant.evaluate(time));tracks.push({name:path,type:track.ValueTypeName,times:times.map(t=>t-range.start),values,interpolation:track.getInterpolation()});continue;}
    const interpolant=track.createInterpolant(),times=[],values=[];for(let i=0;i<count;i++){const time=i===count-1?range.end:Math.min(range.end,range.start+i/fps),sample=interpolant.evaluate(time);if(sample.length!==size)throw Error('사용자 보간 표본 크기를 확인하세요.');times.push(time-range.start);for(const value of sample)values.push(value);if(i%4096===4095)yield;}sampledTracks.push(path);tracks.push({name:path,type:track.ValueTypeName,times,values,interpolation:InterpolateLinear});
  }
  for(const track of tracks){let previous=-Infinity;for(const time of track.times){const stored=Math.fround(time);if(stored<=previous)throw Error('구간 경계와 키의 시간 해상도가 겹쳐요. 시작·끝 또는 FPS를 조정하세요.');previous=stored;}}
  const extracted=yield* clipMetadataRange(metadata,range,{custom,fps}),data={version:1,name,duration:range.duration,tracks,...extracted.metadata};
  if(!validRetargetAsset('skeletalclip',data))throw Error('독립 골격 클립의 경로·값·자료형·이벤트 검증에 실패했어요.');return {data,summary:{duration:data.duration,tracks:tracks.length,values,sampledTracks,sampledCurves:extracted.sampledCurves,sourceRange:{start:range.start,end:range.end},fps:sampledTracks.length||extracted.sampledCurves.length?fps:null}};
}
export function extractModelClip(root,clip,options){const job=modelClipExtraction(root,clip,options);for(;;){const next=job.next();if(next.done)return next.value;}}
export async function extractModelClipAsync(root,clip,options,pause=()=>new Promise(resolve=>setTimeout(resolve,0))){const job=modelClipExtraction(root,clip,options);try{for(;;){const next=job.next();if(next.done)return next.value;await pause();}}finally{job.return();}}
export async function extractModelClipDocument(params,hooks){
  for(const key of ['dryRun','includeData'])if(params[key]!==undefined&&typeof params[key]!=='boolean')throw Error(key+'는 bool로 지정하세요.');
  const {doc,revision}=await hooks.document(params);if(doc.kind!=='modelimport')throw Error('모델 가져오기 문서를 여세요.');const preview=hooks.preview(doc);if(!preview)throw Error('모델 미리보기를 여세요.');const current=async()=>{const latest=await hooks.document(params);if(latest.doc!==doc||hooks.preview(doc)!==preview||preview.disposed)throw Object.assign(Error('추출 중 모델 문서·미리보기가 바뀌었어요.'),{code:'REVISION_CONFLICT'});preview.snapshot();};await preview.ready;await current();
  const data=doc.data,clip=modelAnimationSubasset(preview.result,data,params.subasset),result=await extractModelClipAsync(preview.result.object,clip,{name:params.name,custom:params.custom,fps:params.fps,start:params.start,end:params.end},async()=>{await new Promise(resolve=>setTimeout(resolve,0));if(doc.data!==data||hooks.preview(doc)!==preview||preview.disposed)throw Object.assign(Error('베이크 중 모델 문서·미리보기가 바뀌었어요.'),{code:'REVISION_CONFLICT'});}),source={model:data.source,subasset:params.subasset,revision,hash:data.sourceHash??null};
  await current();if(params.dryRun)return {valid:true,result:result.summary,source,...(params.includeData===true?{data:result.data}:{dataOmitted:true})};
  const created=await hooks.create(doc,result.data);return {...created,result:result.summary,source};
}
export const modelClipExtractionContract={output:'Independent existing v1 .hbskeletalclip.json for graph/montage/sequence playback; no embedded model or new runtime format.',fidelity:'Standard discrete/linear/smooth tracks preserve original keys and interpolation. Optional start/end rebases a finite interval to zero; linear/step/quaternion boundaries are exact, range Smooth and custom/glTF CUBICSPLINE require explicit custom=bake at chosen1..240FPS and report sampled tracks. Weighted/auto metadata curves retain exact controls; periodic outside-domain metadata requires explicit baking with sampledCurves report.',identity:'Resolve actual source targets and replace transient UUID bindings with unique stable node names. Ambiguous/unnamed non-root targets fail before publication.',ownership:'No source pose, keys, geometry or metadata mutation. Same parsed clip/validator for human model import and AI; new asset publishes atomically with no overwrite or empty placeholder.',limits:'Named/bindable TRS and morph paths in the existing skeletal-clip schema; no implicit sampled cubic conversion, material/skin extraction or arbitrary source-format parity claim.'};
