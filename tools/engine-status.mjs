import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const engineStatusContract={endpoint:'/api/engine/status',file:'docs/research/ENGINE_STATUS.json',readOnly:true,filters:['id','area','status','search'],statuses:['verified','partial','unimplemented','unverified'],denominator:'registered HB work items only; not the complete Unreal/Unity API surface',completionPercent:null};

export function validateEngineStatus(data){
 if(data?.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt)||data.exhaustiveUEUnity!==false||data.completionPercent!==null||!Array.isArray(data.items)||!data.items.length)throw Error('엔진 상태 원장 형식을 확인하세요.');
 const ids=new Set();for(const item of data.items){if(!/^[A-Z0-9]+-\d{2,}$/.test(item.id)||ids.has(item.id)||!engineStatusContract.statuses.includes(item.status)||!item.area||!item.title||typeof item.implemented!=='string'||!Array.isArray(item.remaining)||item.remaining.some(s=>typeof s!=='string'||!s)||!Array.isArray(item.sources)||!item.sources.length||!Array.isArray(item.evidence)||[...item.sources,...item.evidence].some(s=>typeof s!=='string'||s.startsWith('/')||s.includes('..')||s.includes('\\'))||item.status==='verified'&&(!item.implemented||item.remaining.length||!item.evidence.length)||item.status!=='verified'&&!item.remaining.length)throw Error('엔진 상태 항목을 확인하세요: '+item.id);ids.add(item.id);}
 return data;
}
export async function readEngineStatus(filters={}){
 if(!filters||typeof filters!=='object'||Array.isArray(filters)||Object.entries(filters).some(([k,v])=>!engineStatusContract.filters.includes(k)||typeof v!=='string'||v.length>300))throw Error('엔진 상태 필터를 확인하세요.');
 if(filters.status&&!engineStatusContract.statuses.includes(filters.status))throw Error('알 수 없는 엔진 작업 상태예요.');
 const data=validateEngineStatus(JSON.parse(await fs.readFile(new URL('../'+engineStatusContract.file,import.meta.url),'utf8'))),counts=Object.fromEntries(engineStatusContract.statuses.map(s=>[s,data.items.filter(i=>i.status===s).length])),search=filters.search?.trim().toLowerCase();
 const items=data.items.filter(i=>(!filters.id||i.id===filters.id)&&(!filters.area||i.area===filters.area)&&(!filters.status||i.status===filters.status)&&(!search||[i.id,i.title,i.implemented,...i.remaining].join(' ').toLowerCase().includes(search)));
 return {...data,totalItems:data.items.length,counts,matchedItems:items.length,filters:{...filters},items};
}

export function engineStatusMarkdown(data){
 const areas={project:'프로젝트',assets:'에셋',editor:'편집기','2d':'2D·2.5D',world:'월드 제작',rendering:'렌더링',materials:'머테리얼',animation:'애니메이션',physics:'물리',gameplay:'게임 시스템',network:'네트워크',effects:'이펙트',ui:'게임 UI',audio:'오디오','cpp-blueprint':'C++·블루프린트',automation:'AI·자동화',debugging:'디버깅',platform:'배포·플랫폼',performance:'성능·용량',research:'연구 대조'};
 let result='# 엔진 현재 상태와 추가 구현 원장\n\n갱신일: '+data.updatedAt+' · 대조 기준 커밋: `'+data.basisRevision.slice(0,8)+'`\n\n기준 데이터는 [ENGINE_STATUS.json](research/ENGINE_STATUS.json) 하나다. 과거 문서의 “아직 없음”보다 각 행의 구체적인 구현/잔여 범위를 우선한다. verified는 해당 행의 구현 범위만 검증했다는 뜻이다. 등록 항목 수는 Unreal/Unity 전체 API 분모가 아니므로 전체 완료율은 계산하지 않는다.\n\n현재 등록 '+data.items.length+'항목: '+Object.entries(data.statuses).map(([s,label])=>label+' '+data.items.filter(i=>i.status===s).length+'개').join(' / ')+'\n\n`node tools/hb.mjs status --local`은 창/서버 없이 읽는다. 실행 서버에서는 `GET /api/engine/status`를 사용한다. id·area·status·search 필터와 전체/일치 항목 수를 제공한다. 원장 갱신 후 `node tools/engine-status.mjs --write`로 이 문서를 동기화한다. 조회는 프로젝트 파일·실행 상태를 변경하지 않는다.\n\n';
 for(const [area,label]of Object.entries(areas)){result+='## '+label+'\n\n| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |\n|---|---|---|---|---|\n';for(const i of data.items.filter(i=>i.area===area)){const links=(i.evidence.length?i.evidence:i.sources).map(f=>'['+f.split('/').pop()+']('+(f.startsWith('docs/')?f.slice(5):'../'+f)+')').join(' · ');result+='| '+i.id+' '+i.title+' | '+i.status+' | '+(i.implemented||'—')+' | '+(i.remaining.join(' · ')||'이 행의 범위는 검증됨')+' | '+links+' |\n';}result+='\n';}return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv[2]!=='--write')throw Error('사용법: node tools/engine-status.mjs --write');await fs.writeFile(new URL('../docs/ENGINE_STATUS.md',import.meta.url),engineStatusMarkdown(await readEngineStatus()));}
