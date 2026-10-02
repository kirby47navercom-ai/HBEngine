const text=(v,max=1000)=>typeof v==='string'&&v.length<=max;
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const number=(v,min=-100000,max=100000)=>Number.isFinite(v)&&v>=min&&v<=max;
const list=(v,max=256)=>Array.isArray(v)&&v.length<=max;
const unique=items=>new Set(items.map(v=>v.id)).size===items.length;
export const gameplayTypes={blackboard:{label:'블랙보드',prefix:'BB_',group:'AI'},behaviortree:{label:'행동트리',prefix:'BT_',group:'AI'},statemachine:{label:'상태 머신 · FSM',prefix:'FSM_',group:'게임플레이'},montage:{label:'애니메이션 몽타주',prefix:'AM_',group:'애니메이션'},sequenceasset:{label:'레벨 시퀀스',prefix:'LS_',group:'시네마틱'}};
export const gameplaySuffix={blackboard:'.hbblackboard.json',behaviortree:'.hbbehaviortree.json',statemachine:'.hbstatemachine.json',montage:'.hbmontage.json',sequenceasset:'.hbsequence.json'};
export const boardTypes={bool:false,int:0,float:0,string:'',vec3:[0,0,0],object:null};
export function validBoardValue(type,value){if(type==='vec3')return list(value,3)&&value.length===3&&value.every(v=>number(v));if(type==='object')return value===null||text(value,200);if(type==='int')return Number.isInteger(value)&&value>=-2147483648&&value<=2147483647;if(type==='float')return number(value);if(type==='bool')return typeof value==='boolean';return type==='string'&&text(value,4096);}
const keysValid=keys=>list(keys,128)&&new Set(keys.map(k=>k?.name)).size===keys.length&&keys.every(k=>/^[A-Za-z_가-힣][\w가-힣]{0,79}$/.test(k?.name)&&validBoardValue(k.type,k.value));
export const behaviorNodes={
  selector:{label:'Selector · 선택',group:'복합',children:256,fields:{}},sequence:{label:'Sequence · 순차',group:'복합',children:256,fields:{}},parallel:{label:'Simple Parallel · 병행',group:'복합',children:2,fields:{}},
  condition:{label:'Blackboard · 조건',group:'데코레이터',children:1,fields:{key:'string',operator:'operator',value:'json'}},inverter:{label:'Inverter · 결과 반전',group:'데코레이터',children:1,fields:{}},repeat:{label:'Repeat · 반복',group:'데코레이터',children:1,fields:{count:'number'}},
  wait:{label:'Wait · 대기',group:'태스크',children:0,fields:{duration:'number'}},set:{label:'Set Blackboard · 값 지정',group:'태스크',children:0,fields:{key:'string',value:'json'}},moveTo:{label:'Move To · 이동',group:'태스크',children:0,fields:{key:'string',speed:'number',tolerance:'number'}},lookAt:{label:'Look At · 바라보기',group:'태스크',children:0,fields:{key:'string'}},event:{label:'Blueprint Event · 이벤트',group:'태스크',children:0,fields:{event:'string'}},playAnimation:{label:'Play Animation · 재생',group:'태스크',children:0,fields:{clip:'animation'}},succeed:{label:'Success · 성공',group:'태스크',children:0,fields:{}},fail:{label:'Failure · 실패',group:'태스크',children:0,fields:{}}
};
export const comparisons=['equal','notEqual','greater','less','greaterEqual','lessEqual','set','notSet'];
export function makeBehaviorNode(type,x=100,y=100){if(!behaviorNodes[type])throw Error('행동트리 노드 종류 오류');return {id:crypto.randomUUID(),type,name:behaviorNodes[type].label.split(' · ')[0],x,y,children:[],services:[],properties:{duration:1,key:'Target',operator:'set',value:true,speed:3,tolerance:.5,count:1,event:'OnTask',clip:''}};}
export function makeState(name='State',x=100,y=100){return {id:crypto.randomUUID(),name,x,y,clip:'',loop:true,duration:1,onEnter:'',onExit:'',onUpdate:''};}
export function makeSequenceTrack(type='position'){return {id:crypto.randomUUID(),name:type,target:'',type,keys:['event','animation','audio'].includes(type)?[]:[{time:0,value:['position','rotation','scale'].includes(type)?(type==='scale'?[1,1,1]:[0,0,0]):type==='visible'?true:type==='camera'?'':1}],clips:[]};}
export function createGameplayAsset(kind,name){
  const base={version:1,name};
  if(kind==='blackboard')return {...base,keys:[{name:'Target',type:'object',value:null},{name:'HasTarget',type:'bool',value:false}]};
  if(kind==='behaviortree'){const root=makeBehaviorNode('selector',240,60);return {...base,blackboard:'',root:root.id,nodes:[root],interval:.1};}
  if(kind==='statemachine'){const state=makeState('Idle',120,150);return {...base,initial:state.id,parameters:[{name:'Speed',type:'float',value:0}],states:[state],transitions:[]};}
  if(kind==='montage')return {...base,length:3,rate:1,group:'DefaultGroup',loop:false,clips:[],sections:[{id:crypto.randomUUID(),name:'Default',time:0,next:''}],notifies:[]};
  if(kind==='sequenceasset')return {...base,length:5,rate:1,fps:30,loop:false,restoreState:true,tracks:[]};
  throw Error('게임플레이 에셋 종류 오류');
}
const point=n=>number(n.x,-100000,100000)&&number(n.y,-100000,100000);
const clipValid=c=>id(c.id)&&text(c.clip)&&number(c.start,0,86400)&&number(c.duration,.001,86400)&&number(c.sourceStart,0,86400)&&number(c.rate,.001,100)&&text(c.slot,80);
const keyValue=k=>number(k.time,0,86400)&&(typeof k.value==='boolean'||text(k.value,200)||number(k.value)||Array.isArray(k.value)&&k.value.length===3&&k.value.every(v=>number(v)));
export function validGameplayAsset(kind,data){try{return validateGameplayAsset(kind,data);}catch{return false;}}
function validateGameplayAsset(kind,data){
  if(data?.version!==1||!text(data.name,80)||!data.name)return false;
  if(kind==='blackboard')return keysValid(data.keys);
  if(kind==='behaviortree'){
    if(!text(data.blackboard)||!number(data.interval,.01,10)||!list(data.nodes)||!unique(data.nodes)||!data.nodes.some(n=>n.id===data.root))return false;
    const nodes=new Map(data.nodes.map(n=>[n.id,n])),parents=new Set();
    for(const n of data.nodes){const d=behaviorNodes[n.type],p=n.properties;if(!id(n.id)||!d||!text(n.name,80)||!point(n)||!list(n.children,d.children)||new Set(n.children).size!==n.children.length||!p||typeof p!=='object'||Array.isArray(p)||!list(n.services||[],16)||(n.services||[]).some(s=>!id(s.id)||!text(s.event,80)||!s.event||!number(s.interval,.01,1000)))return false;
      for(const [key,type] of Object.entries(d.fields)){const v=p[key];if(type==='number'&&!number(v,0,100000)||['string','animation'].includes(type)&&!text(v)||type==='operator'&&!comparisons.includes(v)||type==='json'&&!validBoardValue(typeof v==='boolean'?'bool':typeof v==='number'?'float':Array.isArray(v)?'vec3':v===null?'object':'string',v))return false;}
      for(const child of n.children){if(!nodes.has(child)||child===data.root||parents.has(child))return false;parents.add(child);}}
    const visiting=new Set(),done=new Set();function visit(key){if(visiting.has(key))return false;if(done.has(key))return true;visiting.add(key);for(const child of nodes.get(key).children)if(!visit(child))return false;visiting.delete(key);done.add(key);return true;}
    return data.nodes.every(n=>visit(n.id));
  }
  if(kind==='statemachine')return keysValid(data.parameters)&&list(data.states)&&data.states.length>0&&unique(data.states)&&new Set(data.states.map(s=>s.name)).size===data.states.length&&data.states.some(s=>s.id===data.initial)&&data.states.every(s=>id(s.id)&&text(s.name,80)&&point(s)&&text(s.clip)&&typeof s.loop==='boolean'&&number(s.duration,.001,86400)&&['onEnter','onExit','onUpdate'].every(k=>text(s[k],80)))&&list(data.transitions,512)&&unique(data.transitions)&&data.transitions.every(t=>id(t.id)&&(t.from==='any'||data.states.some(s=>s.id===t.from))&&data.states.some(s=>s.id===t.to)&&number(t.exitTime,0,86400)&&typeof t.hasExitTime==='boolean'&&text(t.event,80)&&list(t.conditions,32)&&t.conditions.every(c=>data.parameters.some(k=>k.name===c.key&&validBoardValue(k.type,c.value))&&comparisons.includes(c.operator)));
  if(kind==='montage')return number(data.length,.001,86400)&&number(data.rate,.001,100)&&text(data.group,80)&&typeof data.loop==='boolean'&&list(data.clips)&&unique(data.clips)&&data.clips.every(c=>clipValid(c)&&c.start+c.duration<=data.length)&&list(data.sections)&&data.sections.length>0&&unique(data.sections)&&new Set(data.sections.map(s=>s.name)).size===data.sections.length&&new Set(data.sections.map(s=>s.time)).size===data.sections.length&&data.sections.some(s=>s.time===0)&&data.sections.every(s=>id(s.id)&&text(s.name,80)&&s.name&&number(s.time,0,data.length-.000001)&&text(s.next,80)&&(!s.next||data.sections.some(other=>other.name===s.next)))&&list(data.notifies,1024)&&unique(data.notifies)&&data.notifies.every(n=>id(n.id)&&number(n.time,0,data.length)&&text(n.event,80)&&n.event);
  if(kind==='sequenceasset')return number(data.length,.001,86400)&&number(data.rate,.001,100)&&Number.isInteger(data.fps)&&number(data.fps,1,240)&&typeof data.loop==='boolean'&&typeof data.restoreState==='boolean'&&list(data.tracks)&&unique(data.tracks)&&data.tracks.every(t=>id(t.id)&&text(t.name,80)&&text(t.target,200)&&['position','rotation','scale','visible','event','camera','animation','audio','light','material','timeScale'].includes(t.type)&&list(t.keys,1024)&&t.keys.every(k=>keyValue(k)&&k.time<=data.length)&&list(t.clips)&&(!t.clips.length||['animation','audio'].includes(t.type))&&unique(t.clips)&&t.clips.every(c=>clipValid(c)&&c.start+c.duration<=data.length)&&(['position','rotation','scale'].includes(t.type)?t.keys.every(k=>Array.isArray(k.value)&&k.value.length===3&&(t.type!=='scale'||k.value.every(v=>number(v,.01,10000)))):t.type==='visible'?t.keys.every(k=>typeof k.value==='boolean'):['camera','event'].includes(t.type)?t.keys.every(k=>text(k.value,200)):['light','material','timeScale'].includes(t.type)?t.keys.every(k=>number(k.value,0)):true));
  return false;
}
