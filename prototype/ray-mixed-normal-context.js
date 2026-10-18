// Experimental generated-source transformation. Authored shader text is never
// accepted here; promotion requires current/committed pixel and preparation gates.
const signature='float pointer,float id,vec3 point,vec3 view,vec4 result,float width,vec2 timeContext';
const argumentsList='pointer,id,point,view,result,width,timeContext';
function functions(source){
 const out=new Map(),pattern=/\b(vec[234]|void) (hb\w+)\(([^)]*)\)\{/g;let m;
 while((m=pattern.exec(source))){let end=pattern.lastIndex,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}if(depth)throw Error('생성 함수의 끝을 확인하세요.');out.set(m[2],{name:m[2],type:m[1],signature:m[3],body:source.slice(pattern.lastIndex,end-1),start:m.index,end});pattern.lastIndex=end;}
 return out;
}
function splitComma(text){let depth=0,start=0,out=[];for(let i=0;i<text.length;i++){if(text[i]==='('||text[i]==='[')depth++;if(text[i]===')'||text[i]===']')depth--;if(text[i]===','&&!depth){out.push(text.slice(start,i));start=i+1;}}out.push(text.slice(start));return out;}
export function shareRayFramePrograms(source){
 const rows=functions(source),edits=[],keys=new Set();
 for(const now of rows.values()){
  if(!/^hbRayProgram\d+$/.test(now.name)||now.signature!==signature)continue;
  const old=rows.get(now.name.replace('hbRayProgram','hbRayPreviousProgram'));if(!old)continue;
  const split=row=>{const at=row.body.indexOf('{vec4 value=hbGeometryLoad(');if(at<0)throw Error('생성 그래프 구역을 확인하세요.');return[row.body.slice(0,at),row.body.slice(at)];},[prefix,graph]=split(now),[oldPrefix,oldGraph]=split(old);
  if(graph!==oldGraph||now.signature!==old.signature)throw Error('현재·이전 그래프 몸체가 달라요.');
  const registers=/vec4 r[XY]?\d+=vec4\(0,0,0,0\);/g,temps=new Map();
  const context=p=>p.replace(registers,'').replace(/\b(vec[23]) ([^;]+);/g,(_,type,declarations)=>splitComma(declarations).map(item=>{const name=item.split('=')[0].trim();if(!/^\w+$/.test(name))throw Error('생성 문맥 선언을 확인하세요.');if(temps.has(name)&&temps.get(name)!==type)throw Error('생성 문맥 자료형이 달라요.');temps.set(name,type);return item.includes('=')?item+';':'';}).join(''));
  const a=context(prefix),b=context(oldPrefix),name=now.name.replace('hbRayProgram','hbRayMixedProgram'),header='vec4 '+name+'('+signature+',bool previous)';
  const shared=header+'{'+[...temps].map(([n,t])=>t+' '+n+';').join('')+'if(previous){'+b+'}else{'+a+'}'+(prefix.match(registers)||[]).join('')+graph+'}';
  edits.push({start:now.start,end:now.end,text:header+';\nvec4 '+now.name+'('+signature+'){return '+name+'('+argumentsList+',false);}'});
  edits.push({start:old.start,end:old.end,text:shared+'\nvec4 '+old.name+'('+signature+'){return '+name+'('+argumentsList+',true);}'});keys.add(now.name.slice(12));
 }
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 return {source,keys,programs:keys.size};
}
export function mixRayGuideNormals(source,size){
 const shared=shareRayFramePrograms(source);source=shared.source;const rows=functions(source),get=name=>{const r=rows.get(name);if(!r)throw Error('생성 노멀 함수가 없어요: '+name);return r;};
 const runs=[3,9].map(field=>{const row=get('hbRayRunField'+field);return 'vec4 hbRayMixedRunField'+field+'('+row.signature+',bool previous){'+row.body.replace(/\bhbRayProgram(\d+)\(([^;]+)\)/g,(all,key,args)=>shared.keys.has(key)?'hbRayMixedProgram'+key+'('+args+',previous)':all)+'}';}).join('\n');
 const fields=[3,9].map(field=>{const row=get('hbRayPreviousField'+field+'TimeLod');return 'vec4 hbRayMixedField'+field+'('+row.signature+',bool previous){'+row.body.replaceAll('hbRayPreviousRunField'+field+'(','hbRayMixedRunField'+field+'(').replaceAll('width,timeContext)','width,timeContext,previous)')+'}';}).join('\n');
 const committed=get('hbPathCommittedNormal').body,gate=committed.slice(0,committed.indexOf('return hbRayPreviousNormalContextLod('));if(!gate)throw Error('이전 노멀 거부 조건을 확인하세요.');
 let normal=get('hbRayNormalContextLod').body;
 const replace=(a,b)=>{if(!normal.includes(a))throw Error('생성 노멀 문맥이 달라요: '+a);normal=normal.replace(a,b);};
 replace('hbRaySmoothNormal(id,point)','(previous?hbRayPreviousSmoothNormal(id,point):hbRaySmoothNormal(id,point))');
 replace('at<=0.0||hbGeometryLoad(hbGeometryLoad(at+1.0).z+7.0).z<.5','at<=0.0||(coat?(hbGeometryLoad(at+1.0).w<9.5||hbGeometryLoad(hbGeometryLoad(at+1.0).z+19.0).z<.5):hbGeometryLoad(hbGeometryLoad(at+1.0).z+7.0).z<.5)');
 replace('hbGeometryFrame(id,origin,e1,e2);','if(previous)hbRayPreviousFrame(id,origin,e1,e2);else hbGeometryFrame(id,origin,e1,e2);');
 replace('hbRayField3TimeLod(id,point,view,width,timeContext)','(coat?hbRayMixedField9(id,point,view,width,timeContext,previous):hbRayMixedField3(id,point,view,width,timeContext,previous))');
 replace('hbRayGeometric(id)','(previous?hbRayPreviousGeometric(id):hbRayGeometric(id))');
 const mixed=runs+'\n'+fields+'\nvec3 hbPathMixedNormal(float id,vec3 point,vec3 view,float width,bool coat,bool previous){\n#ifndef HB_PATH_ADVANCED\ncoat=false;\n#endif\nif(previous){'+gate+'}\nvec2 timeContext=previous?vec2(hbForward.w,1):vec2(0,0);'+normal+'}\n';
 const at=source.indexOf('vec4 hbPathGuideTrace(');if(at<0)throw Error('생성 가이드 시작을 확인하세요.');source=source.slice(0,at)+mixed+source.slice(at);
 const before=`vec3 differentialNormals[${size}];for(int sampleIndex=0;sampleIndex<1+((glass||mirror)&&differentials?differentialCount:0);sampleIndex++){bool primary=sampleIndex==0;int j=max(0,sampleIndex-1);vec3 value=hbPathSurfaceNormal(primary?hit.y:differentialIDs[j],primary?p:dp[j],primary?-direction:-rd[j],width,coatOnly);if(primary)normal=value;else differentialNormals[j]=value;}n=front?normal:-normal;if(curved){oldN=coatOnly?hbPathCommittedCoatNormal(hit.y,oldP,oldView,oldWidth):hbPathCommittedNormal(hit.y,oldP,oldView,oldWidth);if(dot(oldN,oldN)<.5)previousValid=false;}`;
 const after=`vec3 differentialNormals[${size}];int currentSamples=1+((glass||mirror)&&differentials?differentialCount:0);for(int sampleIndex=0;sampleIndex<currentSamples+(curved?1:0);sampleIndex++){bool prior=sampleIndex==currentSamples,primary=sampleIndex==0;int j=clamp(sampleIndex-1,0,${size-1});vec3 value=hbPathMixedNormal(prior?hit.y:(primary?hit.y:differentialIDs[j]),prior?oldP:(primary?p:dp[j]),prior?oldView:(primary?-direction:-rd[j]),prior?oldWidth:width,coatOnly,prior);if(prior){oldN=value;if(dot(oldN,oldN)<.5)previousValid=false;}else if(primary)normal=value;else differentialNormals[j]=value;}n=front?normal:-normal;`;
 if(!source.includes(before))throw Error('생성 가이드 노멀 반복을 확인하세요.');source=source.replace(before,after);
 return {source,programs:shared.programs};
}
