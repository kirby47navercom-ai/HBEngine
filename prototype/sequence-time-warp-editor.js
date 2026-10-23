import {prepareTimeWarp} from './sequence-warp-program.js';
export function sectionTimeWarpMarkup(section){
 const keys=section.timeWarp;let html='<details class="section-time-warp" open><summary>시간 리매핑</summary><label>사용<input type="checkbox" data-section-warp="'+section.id+'" '+(keys?'checked':'')+'></label>';
 if(keys){
  const p=prepareTimeWarp(keys),maxX=Math.max(1,keys.at(-1).time),minY=Math.min(0,p.min),maxY=Math.max(1,p.max),x=t=>5+90*t/maxX,y=v=>95-90*(v-minY)/(maxY-minY);let curve='M'+x(keys[0].time)+' '+y(keys[0].value);
  for(const s of p.segments)curve+=s.step?' H'+x(s.end)+' V'+y(s.endValue):s.cubic?' C'+x(s.time+s.span/3)+' '+y(s.value+s.m0*s.span/3)+' '+x(s.end-s.span/3)+' '+y(s.endValue-s.m1*s.span/3)+' '+x(s.end)+' '+y(s.endValue):' L'+x(s.end)+' '+y(s.endValue);
  html+='<svg preserveAspectRatio="none" viewBox="0 0 100 100" height="90" width="100%" aria-label="시간 리매핑 곡선"><path d="M5 5V95H95" fill="none" stroke="currentColor" opacity=".3"/><path data-warp-curve d="'+curve+'" fill="none" stroke="#67a8e4" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="section-warp-keys">';
  const attributes=(i,field)=>'data-warp-section="'+section.id+'" data-warp-index="'+i+'" data-warp-field="'+field+'"';
  for(const[i,key]of keys.entries()){
   html+='<div class="section-warp-key"><div class="gameplay-vector"><label>구간 시간<input type="number" step=".01" '+attributes(i,'time')+' value="'+key.time+'" '+(!i?'disabled data-warp-locked':'')+'></label><label>원본 시간<input type="number" step=".01" '+attributes(i,'value')+' value="'+key.value+'" '+(!i?'disabled data-warp-locked':'')+'></label><button data-warp-remove="'+section.id+'" data-warp-index="'+i+'" '+(!i||keys.length<=2?'disabled data-warp-locked':'')+' aria-label="시간 키 삭제">×</button></div><div class="section-warp-tangents">';
   if(i<keys.length-1)html+='<label>다음 구간<select '+attributes(i,'interpolation')+'><option value="linear" '+(!key.interpolation||key.interpolation==='linear'?'selected':'')+'>선형</option><option value="cubic" '+(key.interpolation==='cubic'?'selected':'')+'>삼차</option><option value="step" '+(key.interpolation==='step'?'selected':'')+'>계단</option></select></label>';
   for(const[field,show,label,automatic]of[['inTangent',i>0&&p.segments[i-1].cubic,'들어오는 기울기',p.segments[i-1]?.m1],['outTangent',i<keys.length-1&&p.segments[i].cubic,'나가는 기울기',p.segments[i]?.m0]])if(show)html+='<label>'+label+'<input type="number" step=".01" '+attributes(i,field)+' value="'+(key[field]??'')+'" placeholder="자동 ('+Number(automatic.toPrecision(5))+')"></label>';
   html+='</div></div>';
  }
  html+='</div><button data-warp-flip="'+section.id+'">방향 뒤집기</button><button data-warp-add="'+section.id+'" '+(keys.length>=256?'disabled data-warp-locked':'')+'>시간 키 추가</button>';
 }
 return html+'</details>';
}
