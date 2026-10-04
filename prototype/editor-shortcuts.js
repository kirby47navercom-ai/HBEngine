const command=(id,label,scope,keys,action=id,editing=false)=>({id,label,scope,keys,action,editing});
export const shortcutCommands=[
  command('save','저장','global',['Primary+KeyS'],'save',true),command('saveAll','모두 저장','global',['Primary+Shift+KeyS'],'save-all',true),
  command('undo','실행 취소','global',['Primary+KeyZ']),command('redo','다시 실행','global',['Primary+Shift+KeyZ','Primary+KeyY']),
  command('command','명령 검색','global',['Primary+KeyK'],'command',true),command('shortcuts','단축키 설정','global',[]),command('help','도움말','global',['F1']),
  command('browse','콘텐츠에서 찾기','global',['Primary+KeyB'],'browse-document'),command('build','빌드 프로필','global',['Primary+Shift+KeyB']),
  command('close','작업 문서 닫기','global',['Primary+KeyW'],'close',true),command('maximize','작업창 최대화','global',['Primary+Space']),
  command('play','게임 실행','global',['F5']),command('pause','게임 일시 정지','global',['F6']),command('stop','게임 종료','global',['Shift+F5']),
  command('selectTool','선택 도구','viewport',['KeyQ']),command('moveTool','이동 도구','viewport',['KeyW']),command('rotateTool','회전 도구','viewport',['KeyE']),command('scaleTool','크기 도구','viewport',['KeyR']),
  command('focusScene','선택 프레이밍','viewport',['KeyF']),command('focusGraph','그래프 프레이밍','blueprint',['KeyF']),
  ...['copy','cut','paste','duplicate','selectAll'].map((id,i)=>command(id,{copy:'복사',cut:'잘라내기',paste:'붙여넣기',duplicate:'복제',selectAll:'모두 선택'}[id],'authoring',['Primary+Key'+['C','X','V','D','A'][i]])),
  command('group','그룹 만들기','viewport',['Primary+KeyG']),command('ungroup','그룹 해제','viewport',['Primary+Shift+KeyG']),
  command('rename','이름 변경','viewport',['F2']),command('delete','선택 삭제','authoring',['Delete']),
  command('comment','노드 주석','blueprint',['KeyC'],'add-comment'),command('validate','블루프린트 검증','blueprint',['F7']),command('breakpoint','중단점 전환','blueprint',['F9']),command('findNodes','노드 찾기','blueprint',['Primary+KeyF']),
];
const byId=new Map(shortcutCommands.map(c=>[c.id,c]));
const scopes={global:['viewport','blueprint','other'],authoring:['viewport','blueprint'],viewport:['viewport'],blueprint:['blueprint']};
const overlap=(a,b)=>scopes[a].some(s=>scopes[b].includes(s));
export const defaultShortcutData=()=>({version:1,active:'default',profiles:[{id:'default',name:'Default',bindings:{}}]});
export function validChord(value){return typeof value==='string'&&/^(Primary\+)?(Shift\+)?(Alt\+)?(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2])|Space|Delete|Backspace|Tab|BracketLeft|BracketRight|Minus|Equal|Comma|Period|Slash|Semicolon|Quote|Backquote)$/.test(value);}
export function eventChord(event){if(event.isComposing||!event.code)return null;const chord=(event.ctrlKey||event.metaKey?'Primary+':'')+(event.shiftKey?'Shift+':'')+(event.altKey?'Alt+':'')+event.code;return validChord(chord)?chord:null;}
export function shortcutLabel(chord){return chord?.replace('Primary+','Ctrl+').replace(/Key([A-Z])/,'$1').replace(/Digit(\d)/,'$1').replace('Space','Space')||'—';}
const bindings=(profile,id)=>profile.bindings[id]??byId.get(id).keys;
export function shortcutConflicts(profile){const conflicts=[];for(let i=0;i<shortcutCommands.length;i++)for(let j=i+1;j<shortcutCommands.length;j++){const a=shortcutCommands[i],b=shortcutCommands[j];if(!overlap(a.scope,b.scope))continue;for(const chord of bindings(profile,a.id))if(bindings(profile,b.id).includes(chord))conflicts.push({chord,commands:[a.id,b.id]});}return conflicts;}
export function validShortcutData(data){return !!data&&data.version===1&&Array.isArray(data.profiles)&&data.profiles.length>0&&data.profiles.length<=16&&data.profiles.some(p=>p.id==='default'&&p.name==='Default'&&p.bindings&&Object.keys(p.bindings).length===0)&&data.profiles.some(p=>p.id===data.active)&&new Set(data.profiles.map(p=>p?.id)).size===data.profiles.length&&data.profiles.every(p=>p&&typeof p.id==='string'&&/^[\w-]{1,80}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=80&&p.bindings&&typeof p.bindings==='object'&&!Array.isArray(p.bindings)&&Object.entries(p.bindings).every(([id,keys])=>byId.has(id)&&Array.isArray(keys)&&keys.length<=2&&new Set(keys).size===keys.length&&keys.every(validChord))&&!shortcutConflicts(p).length);}
export class EditorShortcuts{
  constructor(data,onChange=()=>{}){this.data=structuredClone(validShortcutData(data)?data:defaultShortcutData());this.onChange=onChange;}
  snapshot(){return structuredClone(this.data);}
  profile(){return this.data.profiles.find(p=>p.id===this.data.active);}
  keys(id){if(!byId.has(id))throw Error('단축키 명령을 확인하세요.');return [...bindings(this.profile(),id)];}
  replace(data){if(!validShortcutData(data))throw Error('단축키 프로필·키 조합·충돌을 확인하세요.');const previous=this.data;this.data=structuredClone(data);try{this.onChange(this.snapshot());}catch(error){this.data=previous;throw error;}return this.snapshot();}
  assign(id,keys,{override=false}={}){
    if(!byId.has(id)||!Array.isArray(keys)||keys.length>2||keys.some(k=>!validChord(k))||new Set(keys).size!==keys.length)throw Error('단축키 명령·조합을 확인하세요.');
    const next=this.snapshot();let p=next.profiles.find(p=>p.id===next.active);if(p.id==='default'){p={id:crypto.randomUUID(),name:'User',bindings:{}};next.profiles.push(p);next.active=p.id;}
    p.bindings[id]=[...keys];const conflicts=shortcutConflicts(p);if(conflicts.length&&!override){const error=Error('단축키 충돌: '+conflicts.map(c=>c.commands.map(id=>byId.get(id).label).join(' / ')).join(', '));error.conflicts=conflicts;throw error;}
    for(const conflict of conflicts){const other=conflict.commands.find(other=>other!==id);if(!other)throw Error('기존 프로필에 충돌이 있어요.');p.bindings[other]=bindings(p,other).filter(chord=>!keys.includes(chord));}
    return this.replace(next);
  }
  reset(id){if(!byId.has(id))throw Error('단축키 명령을 확인하세요.');const next=this.snapshot(),p=next.profiles.find(p=>p.id===next.active);delete p.bindings[id];return this.replace(next);}
  cloneProfile(name){if(typeof name!=='string'||!name.trim()||name.length>80)throw Error('프로필 이름을 확인하세요.');const next=this.snapshot(),profile={...structuredClone(this.profile()),id:crypto.randomUUID(),name:name.trim()};next.profiles.push(profile);next.active=profile.id;return this.replace(next);}
  activate(id){return this.replace({...this.snapshot(),active:id});}
  deleteProfile(){if(this.data.active==='default')throw Error('Default 프로필은 유지해야 해요.');return this.replace({...this.snapshot(),active:'default',profiles:this.data.profiles.filter(p=>p.id!==this.data.active)});}
  resolve(event,{scope='other',editing=false,dialog=false,navigating=false,running=false}={}){
    if(dialog)return {};const chord=eventChord(event);if(!chord)return {};const eligible=c=>scopes[c.scope].includes(scope)&&(!editing||c.editing)&&(!navigating||c.scope==='global')&&(!running||['play','pause','stop','help','command','shortcuts'].includes(c.id));
    const match=shortcutCommands.find(c=>eligible(c)&&this.keys(c.id).includes(chord));if(match)return {command:match,consume:true};
    const legacy=event.shiftKey?chord.replace('Shift+',''):chord;
    return {consume:shortcutCommands.some(c=>eligible(c)&&(c.keys.includes(chord)||legacy!==chord&&c.keys.includes(legacy)))};
  }
}
