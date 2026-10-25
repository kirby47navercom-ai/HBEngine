import {mergeAsset} from './asset-merge.js';
const maxBytes=8388608,checkText=(text,label)=>{if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>maxBytes||text.includes('\0'))throw Error(label+' UTF-8 JSON은8MB까지 지원해요.');return text;},parse=(text,label)=>{try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error(label+' 버전을 JSON으로 읽을 수 없어요. 충돌 구간의 쉼표·괄호를 확인하세요.');}};
export function readGitMarkerVersions(text,{baseText}={}){
 checkText(text,'충돌');if(baseText!==undefined)checkText(baseText,'기준');const parts={base:[],ours:[],theirs:[]},hunks=[];let state='common',current;const lines=text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g).filter(Boolean);
 const invalid=(line,reason)=>{throw Error('Git 충돌 마커 '+(line+1)+'행: '+reason);};
 for(let line=0;line<lines.length;line++){
  const raw=lines[line],body=raw.replace(/[\r\n]+$/,'').replace(line===0?/^\uFEFF/:/^$/,''),marker=/^([<|=>])\1{6,63}(?:[ \t].*)?$/.exec(body);
  if(marker){const symbol=marker[1],width=/^[<|=>]+/.exec(body)[0].length;
   if(symbol==='<'){if(state!=='common')invalid(line,'중첩된 시작이에요.');if(hunks.length>=4096)invalid(line,'충돌 구간 수가 너무 많아요.');current={line:line+1,width,ancestor:false};hunks.push(current);state='ours';continue;}
   if(state==='common'||width!==current.width)invalid(line,'시작과 맞지 않는 마커예요.');
   if(symbol==='|'){if(state!=='ours'||current.ancestor)invalid(line,'기준 구간 위치가 맞지 않아요.');current.ancestor=true;state='base';continue;}
   if(symbol==='='){if(!['ours','base'].includes(state))invalid(line,'구분선 위치가 맞지 않아요.');state='theirs';continue;}
   if(symbol==='>'){if(state!=='theirs')invalid(line,'끝 구간 위치가 맞지 않아요.');current.endLine=line+1;state='common';continue;}
  }
  if(state==='common')for(const list of Object.values(parts))list.push(raw);else parts[state].push(raw);
 }
 if(state!=='common')throw Error('Git 충돌 마커의 끝이 없어요.');if(!hunks.length)throw Error('Git 충돌 마커가 없어요. 이미 해결한 파일은 검토 후 스테이징하세요.');if(baseText===undefined&&hunks.some(h=>!h.ancestor))throw Error('기준 없는 Git 충돌에는 기준 JSON이 필요해요. Git index stage1 또는 기준 파일을 지정하세요.');
 return{base:parse(baseText??parts.base.join(''),'기준'),ours:parse(parts.ours.join(''),'현재'),theirs:parse(parts.theirs.join(''),'다른'),hunks:hunks.map(h=>({...h})),baseSource:baseText===undefined?'marker-ancestor-with-merged-common-context':'explicit-base',markers:hunks.length};
}
export function planGitMarkerMerge(text,{baseText,resolutions={}}={}){const versions=readGitMarkerVersions(text,{baseText});return{...mergeAsset(versions.base,versions.ours,versions.theirs,{resolutions}),markers:versions.markers,baseSource:versions.baseSource};}
export const gitConflictMarkersContract={read:'source-control/conflict',resolve:'source-control/resolve',cli:['source.conflict.read','source.conflict.resolve'],readDefault:'HTTP/CLI compact IDs/counts/working SHA/index revision; includeData:true only for raw marker/base text, stage2/3 omitted unless includeStages:true. UI explicitly opts into needed sources.',formats:'Git classic plus explicit stage1/base JSON; diff3/zdiff3 ancestor hunks; CRLF/LF/BOM/custom7..64 marker width. All complete reconstructed JSON versions must parse; malformed/nested/missing markers reject.',merge:'Existing stable-ID mergeAsset object/graph/array rules, explicit resolutions; common already-merged text is retained. No guessed ancestor for classic markers, no arbitrary source-code line merge.',publication:'Validated existing ProjectService checkedBatch with opt-in raw expectedFingerprint, raw-before journal/CAS and read dependency validation; index revision + exact working-file SHA + reviewed candidate SHA required (candidate may be obtained from dryRun). Writes working JSON only, no auto-stage/commit/push; user reviews in AssetMergePanel first.',lifetime:'Project/source/index/working SHA rechecked; unresolved, invalid asset or changed source writes nothing. Open dirty document remains protected; ordinary source-control stage/commit remains separate.',limits:'JSON assets only; delete/add roots without a JSON base, arbitrary text/binary conflict handling and remote VCS remain separate. Marker chunks must reconstruct valid complete JSON. No power-loss hardware proof.'};
