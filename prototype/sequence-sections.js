const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v),finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const assetPath=v=>typeof v==='string'&&v.length<=1000&&v.endsWith('.hbsequence.json')&&!/[\\:\x00-\x1f]/.test(v)&&!v.split('/').some(p=>p==='.'||p==='..'||!p);
export function validSequenceSections(data){
 const rows=data.sections;if(rows===undefined)return true;
 return Array.isArray(rows)&&rows.length<=256&&new Set(rows.map(s=>s?.id)).size===rows.length&&rows.every(s=>s&&safeId(s.id)&&typeof s.name==='string'&&s.name.length>0&&s.name.length<=80&&Object.keys(s).every(k=>['id','name','kind','asset','start','duration','sourceStart','rate','loop','muted','row','bias'].includes(k))&&['shot','subsequence'].includes(s.kind)&&assetPath(s.asset)&&finite(s.start,0,86400)&&finite(s.duration,.001,86400)&&s.start+s.duration<=data.length+1e-8&&finite(s.sourceStart,0,86400)&&finite(s.rate,.001,100)&&typeof s.loop==='boolean'&&typeof s.muted==='boolean'&&Number.isInteger(s.row)&&s.row>=0&&s.row<=255&&Number.isInteger(s.bias)&&s.bias>=-2147483648&&s.bias<=2147483647);
}
export function editSequenceSection(data,{operation='update',id,section}={}){
 const next=structuredClone(data);next.sections??=[];let result;
 if(operation==='add'){result={id:'section_'+crypto.randomUUID().replaceAll('-',''),name:'Sub-Sequence',kind:'subsequence',asset:'',start:0,duration:Math.min(1,data.length),sourceStart:0,rate:1,loop:false,muted:false,row:0,bias:100,...section};next.sections.push(result);}
 else{const index=next.sections.findIndex(s=>s.id===id);if(index<0)throw Error('시퀀스 구간을 선택하세요.');if(operation==='remove')result=next.sections.splice(index,1)[0];else if(operation==='update'){if(section&&Object.keys(section).some(k=>!Object.hasOwn(next.sections[index],k)||k==='id'))throw Error('시퀀스 구간 속성을 확인하세요.');Object.assign(next.sections[index],section);result=next.sections[index];}else throw Error('구간 편집 명령을 확인하세요.');}
 if(!validSequenceSections(next))throw Error('하위 시퀀스 경로·구간·속도·우선순위를 확인하세요.');data.sections=next.sections;return result;
}
export async function loadSequenceTree(path,read,{isCurrent}={}){
 const cache=new Map();let count=0;
 async function visit(asset,stack=[],priority=0,section=null){
  if(isCurrent&&!isCurrent())throw Error('시퀀스 로드가 취소됐어요.');
  if(stack.includes(asset))throw Error('하위 시퀀스 순환: '+[...stack,asset].join(' → '));if(stack.length>=32||++count>1024)throw Error('하위 시퀀스 깊이/인스턴스 한도를 넘었어요.');
  let data=cache.get(asset);if(!data){data=await read(asset,'sequenceasset');cache.set(asset,data);}if(isCurrent&&!isCurrent())throw Error('시퀀스 로드가 취소됐어요.');if(!validSequenceSections(data))throw Error('하위 시퀀스 구간 형식 오류: '+asset);
  if(section&&section.sourceStart>data.length)throw Error('하위 시퀀스 시작 오프셋이 길이를 넘어요: '+asset);
  const total=priority+(data.priority??0)+(section?.bias??0);if(!Number.isInteger(total)||total<-2147483648||total>2147483647)throw Error('누적 시퀀스 우선순위가 int32 범위를 넘어요.');
  const node={asset,data,section,priority:total,children:[]};for(const child of data.sections||[])if(!child.muted)node.children.push(await visit(child.asset,[...stack,asset],total,child));return node;
 }
 return visit(path);
}
export function selectedShot(sections,time){return sections.filter(s=>!s.muted&&s.kind==='shot'&&s.start<=time&&time<s.start+s.duration).sort((a,b)=>a.row-b.row||b.start-a.start||(a.id<b.id?-1:a.id>b.id?1:0))[0]?.id;}
export function sectionActive(section,sections,time){return !section.muted&&section.start<=time&&time<section.start+section.duration&&(section.kind!=='shot'||selectedShot(sections,time)===section.id);}
export function sectionTime(section,child,time){const local=section.sourceStart+Math.max(0,time-section.start)*section.rate;return section.loop?local%child.length:Math.min(child.length,local);}
export function sectionRanges(section,sections,child,ranges){
 const result=[],speed=section.rate;
 for(const range of ranges){const start=Math.max(range.begin,section.start),end=Math.min(range.end,section.start+section.duration);if(end<start||end===start&&!(range.initial||start===section.start))continue;
  const cuts=[...new Set([start,end,...sections.filter(s=>s.kind==='shot'&&!s.muted).flatMap(s=>[s.start,s.start+s.duration]).filter(t=>t>start&&t<end)])].sort((a,b)=>a-b),parts=start===end?[[start,end]]:cuts.slice(0,-1).map((v,i)=>[v,cuts[i+1]]);
  for(const [a,b]of parts){if(section.kind==='shot'&&selectedShot(sections,a===b?a:(a+b)/2)!==section.id)continue;let x=section.sourceStart+(a-section.start)*speed,y=section.sourceStart+(b-section.start)*speed,initial=a===section.start&&range.begin<section.start||range.initial&&a===range.begin,budget=256;
   const exclusive=b===section.start+section.duration||range.endExclusive&&b===range.end||section.kind==='shot'&&selectedShot(sections,b)!==section.id;
   if(!section.loop){result.push({begin:Math.min(child.length,x),end:Math.min(child.length,y),initial,...(exclusive&&y<=child.length?{endExclusive:true}:{})});continue;}
   if(x>section.sourceStart&&x%child.length===0)initial=true;
   do{if(--budget<0)throw Error('하위 시퀀스 반복 한도 초과');const cycle=Math.floor(x/child.length),stop=Math.min(y,(cycle+1)*child.length);result.push({begin:x-cycle*child.length,end:stop-cycle*child.length,initial,...(exclusive&&stop===y?{endExclusive:true}:{})});if(stop===y)break;x=stop;initial=true;}while(x<=y);
  }
 }
 return result;
}
export const sequenceTreeNodes=root=>{const out=[],walk=n=>{out.push(n);for(const child of n.children||[])walk(child);};walk(root);return out;};
