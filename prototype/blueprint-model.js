const pin = (id,label,type='exec',array=false) => ({id,label,type,array});
export const variableTypes = { bool:'Boolean · 불리언', int:'Integer · 정수', float:'Float · 실수', string:'String · 문자열', vec2:'Vector2 · 벡터2', vec3:'Vector3 · 벡터3', color:'Color · 색상', transform:'Transform · 변환', object:'Object · 클래스 참조', hit:'HitResult · 구조체' };
export const typeColors = { exec:'#d1dadd', bool:'#d88380', int:'#89c8c1', float:'#9dcc7f', string:'#dba0cd', vec2:'#e2bc71', vec3:'#e2bc71', color:'#99bfea', transform:'#d99f72', object:'#88b9e0', hit:'#ae9ece', any:'#aab9be' };
export const catalog = [
  {key:'construction',title:'Construction Script',ko:'생성 시 구성',group:'이벤트',keywords:'construction constructor 컨스트럭션 컨스트럭터 생성 구성',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'beginPlay',title:'Begin Play',ko:'게임 시작',group:'이벤트',keywords:'beginplay 비긴 시작 플레이',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'tick',title:'Event Tick',ko:'매 프레임',group:'이벤트',keywords:'event tick 이벤트 틱 델타 시간',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('delta','Delta seconds','float')]},
  {key:'beginOverlap',title:'Begin Overlap',ko:'겹침 시작',group:'이벤트',keywords:'actor component overlap begin 비긴 오버랩 충돌 트리거',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object')]},
  {key:'endOverlap',title:'End Overlap',ko:'겹침 종료',group:'이벤트',keywords:'end overlap 끝 엔드 충돌',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object')]},
  {key:'input',title:'Input Action',ko:'입력 이벤트',group:'이벤트',keywords:'input key keyboard 입력 키보드 상호작용',kind:'event',inputs:[],outputs:[pin('then','Pressed')]},
  {key:'customEvent',title:'Custom Event',ko:'사용자 이벤트',group:'이벤트',keywords:'custom event 커스텀 사용자 정의',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'branch',title:'Branch',ko:'조건 분기',group:'흐름 제어',keywords:'branch if 조건 분기 참 거짓',kind:'condition',inputs:[pin('exec','실행'),pin('condition','Condition','bool')],outputs:[pin('true','True'),pin('false','False')]},
  {key:'delay',title:'Delay',ko:'기다리기',group:'흐름 제어',keywords:'delay wait 딜레이 지연 대기',inputs:[pin('exec','실행'),pin('duration','Duration','float')],outputs:[pin('then','Completed')]},
  {key:'sequence',title:'Sequence',ko:'순서대로 실행',group:'흐름 제어',keywords:'sequence 시퀀스 순서',inputs:[pin('exec','실행')],outputs:[pin('first','Then 0'),pin('second','Then 1')]},
  {key:'print',title:'Print String',ko:'문자열 출력',group:'디버그',keywords:'print string log 문자열 로그 출력',inputs:[pin('exec','실행'),pin('message','Message','string')],outputs:[pin('then','다음')]},
  {key:'location',title:'Get Position',ko:'위치 가져오기',group:'오브젝트',keywords:'get actor location position 위치 벡터 좌표',inputs:[pin('target','Target','object')],outputs:[pin('return','Return value','vec3')]},
  {key:'setPosition',title:'Set Position',ko:'위치 설정',group:'오브젝트',keywords:'set actor location position 위치 이동 설정',inputs:[pin('exec','실행'),pin('target','Target','object'),pin('position','Position','vec3')],outputs:[pin('then','다음')]},
  {key:'vec3',title:'Make Vector3',ko:'벡터3 만들기',group:'수학',keywords:'make vector vec3 vector3 xyz 벡터3',inputs:[pin('x','X','float'),pin('y','Y','float'),pin('z','Z','float')],outputs:[pin('return','Vector3','vec3')]},
  {key:'vec2',title:'Make Vector2',ko:'벡터2 만들기',group:'수학',keywords:'make vector vec2 vector2 xy 벡터2',inputs:[pin('x','X','float'),pin('y','Y','float')],outputs:[pin('return','Vector2','vec2')]},
  {key:'add',title:'Add Float',ko:'실수 더하기',group:'수학',keywords:'add float plus 덧셈 더하기 합',inputs:[pin('a','A','float'),pin('b','B','float')],outputs:[pin('return','Result','float')]},
  {key:'arrayLength',title:'Array Length',ko:'배열 길이',group:'배열',keywords:'array length size 배열 길이 크기',inputs:[pin('array','Array','any',true)],outputs:[pin('return','Length','int')]},
  {key:'trace',title:'Raycast',ko:'레이캐스트',group:'물리',keywords:'raycast line trace hit result 레이 선 충돌 검사 구조체',inputs:[pin('exec','실행'),pin('start','Start','vec3'),pin('end','End','vec3')],outputs:[pin('then','다음'),pin('return','Hit result','hit')]},
  {key:'members',title:'Get Object Members',ko:'공개 멤버 읽기',group:'오브젝트',keywords:'object class member property 클래스 객체 멤버 속성',inputs:[pin('target','Target','object')],outputs:[pin('name','Name','string'),pin('position','Position','vec3'),pin('visible','Visible','bool')]},
  {key:'door',title:'Open Door',ko:'문 열기',group:'C++ 공개 함수',keywords:'door open 문 열기 cpp c++',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]},
  {key:'sound',title:'Play Sound',ko:'효과음 재생',group:'오디오',keywords:'audio play sound 효과음 소리 재생',inputs:[pin('exec','실행'),pin('name','Sound','string')],outputs:[pin('then','다음')]},
  {key:'customFunction',title:'Custom Function',ko:'사용자 함수',group:'사용자 정의',keywords:'custom function 사용자 함수 커스텀',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]}
];
export const fieldsFor = type => ({vec2:[pin('x','X','float'),pin('y','Y','float')],vec3:[pin('x','X','float'),pin('y','Y','float'),pin('z','Z','float')],color:[pin('r','R','float'),pin('g','G','float'),pin('b','B','float'),pin('a','A','float')],transform:[pin('position','Position','vec3'),pin('rotation','Rotation','vec3'),pin('scale','Scale','vec3')],hit:[pin('hit','Blocking hit','bool'),pin('position','Impact point','vec3'),pin('normal','Normal','vec3'),pin('actor','Actor','object')]}[type]||[]);
export function defaultsFor(type){ return {bool:false,int:0,float:0,string:'',vec2:[0,0],vec3:[0,0,0],color:[1,1,1,1],transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},object:null,hit:{hit:false,position:[0,0,0],normal:[0,1,0],actor:null}}[type]; }
export function validValue(type,value){
  const vector=(size)=>Array.isArray(value)&&value.length===size&&value.every(Number.isFinite);
  if(type==='bool')return typeof value==='boolean';if(type==='int')return Number.isSafeInteger(value);if(type==='float')return Number.isFinite(value);if(type==='string')return typeof value==='string'&&value.length<=4096;
  if(type==='vec2')return vector(2);if(type==='vec3')return vector(3);if(type==='color')return vector(4)&&value.every(v=>v>=0&&v<=1);if(type==='object')return value===null||(typeof value==='string'&&value.length<=200);
  if(type==='transform')return value&&['position','rotation','scale'].every(k=>validValue('vec3',value[k]));if(type==='hit')return value&&validValue('bool',value.hit)&&validValue('vec3',value.position)&&validValue('vec3',value.normal)&&validValue('object',value.actor);return false;
}
export function basePins(node,direction,graph){
  if(['callFunction','callMacro','functionInput','functionOutput','macroInput','macroOutput'].includes(node.key)){
    const definition=[...(graph.functions||[]),...(graph.macros||[])].find(d=>d.id===node.definitionId);if(!definition)return [];
    if(node.key.endsWith('Input'))return direction==='out'?definition.inputs:[];
    if(node.key.endsWith('Output'))return direction==='in'?definition.outputs:[];
    return direction==='in'?definition.inputs:definition.outputs;
  }
  if(node.key==='getVariable'||node.key==='setVariable'){const v=graph.variables.find(v=>v.id===node.variableId);if(!v)return [];const value=pin('value',v.name,v.type,v.container==='array');return node.key==='getVariable'?(direction==='out'?[value]:[]):direction==='in'?[pin('exec','실행'),value]:[pin('then','다음')];}
  return [...(catalog.find(s=>s.key===node.key)?.[direction==='out'?'outputs':'inputs']||[]),...(direction==='out'?node.customOutputs:node.customInputs)||[]];
}
export function effectivePins(node,direction,graph){
  const expand=p=>!p.array&&(node.splitPins||[]).includes(direction+':'+p.id)&&fieldsFor(p.type).length?fieldsFor(p.type).flatMap(f=>expand({...f,id:p.id+'.'+f.id,parent:p.id})): [p];
  return basePins(node,direction,graph).flatMap(expand);
}
export function canConnect(graph,from,to){
  if(from.node===to.node)return {ok:false,reason:'같은 노드에는 연결할 수 없어요.'};
  const a=graph.nodes.find(n=>n.id===from.node),b=graph.nodes.find(n=>n.id===to.node);const out=a&&effectivePins(a,'out',graph).find(p=>p.id===from.pin),input=b&&effectivePins(b,'in',graph).find(p=>p.id===to.pin);
  if(!out||!input)return {ok:false,reason:'연결할 핀을 찾을 수 없어요.'};
  if(out.array!==input.array||(out.type!==input.type&&out.type!=='any'&&input.type!=='any'))return {ok:false,reason:`타입이 달라요: ${out.type}${out.array?'[]':''} → ${input.type}${input.array?'[]':''}`};
  const reaches=(id,seen=new Set())=>{if(id===from.node)return true;if(seen.has(id))return false;seen.add(id);return graph.edges.filter(e=>e.from.node===id).some(e=>reaches(e.to.node,seen));};
  if(reaches(to.node))return {ok:false,reason:'이 프로토타입에서는 순환 연결을 지원하지 않아요.'};return {ok:true};
}
export function connect(graph,from,to){const result=canConnect(graph,from,to);if(!result.ok)return result;graph.edges=graph.edges.filter(e=>!(e.to.node===to.node&&e.to.pin===to.pin)&&!(e.from.node===from.node&&e.from.pin===from.pin&&effectivePins(graph.nodes.find(n=>n.id===from.node),'out',graph).find(p=>p.id===from.pin).type==='exec'));graph.edges.push({from:{...from},to:{...to}});return result;}
export function splitPin(graph,nodeId,direction,pinId,recombine=false){const n=graph.nodes.find(n=>n.id===nodeId);if(!n)return false;const pins=effectivePins(n,direction,graph),p=pins.find(p=>p.id===pinId),key=direction+':'+pinId;
  if(!recombine&&(!p||p.array||!fieldsFor(p.type).length))return false;n.splitPins=n.splitPins||[];if(recombine)n.splitPins=n.splitPins.filter(k=>k!==key&&!k.startsWith(key+'.'));else if(!n.splitPins.includes(key))n.splitPins.push(key);
  graph.edges=graph.edges.filter(e=>{const end=direction==='out'?e.from:e.to;return !(end.node===nodeId&&(end.pin===pinId||end.pin.startsWith(pinId+'.')));});return true;
}
export function makeNode(key,x=40,y=40,variableId){return {id:'node_'+crypto.randomUUID().replaceAll('-',''),key,position:{x,y},splitPins:[],...(variableId?{variableId}:{})};}
export function nodeTitle(n,graph){const v=graph.variables.find(v=>v.id===n.variableId),d=[...(graph.functions||[]),...(graph.macros||[])].find(d=>d.id===n.definitionId);return n.title||(n.key.endsWith('Input')?'Entry · 입력':n.key.endsWith('Output')?'Return · 출력':d?.name||((n.key==='getVariable'?'Get ':n.key==='setVariable'?'Set ':'')+(v?.name||catalog.find(s=>s.key===n.key)?.title||'Node')));}
export const defaultBlueprint={version:1,name:'BP_Garden',components:[{id:'transform',name:'Transform',type:'Transform'},{id:'mesh',name:'Mesh renderer',type:'MeshRenderer'},{id:'collider',name:'Box collider',type:'BoxCollider'}],variables:[
  {id:'hasKey',name:'hasKey',type:'bool',container:'single',value:false},{id:'doorName',name:'doorName',type:'string',container:'single',value:'GardenDoor'},
  {id:'targetPosition',name:'targetPosition',type:'vec3',container:'single',value:[0,0,0]},{id:'speed',name:'speed',type:'float',container:'single',value:3},{id:'waypoints',name:'waypoints',type:'vec3',container:'array',value:[[0,0,0],[1,0,1]]}],
  nodes:[{id:'begin',key:'beginPlay',position:{x:28,y:30},splitPins:[]},{id:'print',key:'print',position:{x:270,y:30},splitPins:[]},{id:'overlap',key:'beginOverlap',position:{x:28,y:205},splitPins:[]},{id:'branch',key:'branch',position:{x:270,y:205},splitPins:[]},{id:'door',key:'door',position:{x:512,y:205},splitPins:[]},{id:'tick',key:'tick',position:{x:28,y:410},splitPins:[]},{id:'location',key:'location',position:{x:512,y:410},splitPins:[]},{id:'getKey',key:'getVariable',variableId:'hasKey',position:{x:270,y:395},splitPins:[]}],
  edges:[{from:{node:'begin',pin:'then'},to:{node:'print',pin:'exec'}},{from:{node:'overlap',pin:'then'},to:{node:'branch',pin:'exec'}},{from:{node:'branch',pin:'true'},to:{node:'door',pin:'exec'}},{from:{node:'getKey',pin:'value'},to:{node:'branch',pin:'condition'}}],
  functions:[],macros:[],construction:{nodes:[{id:'construction',key:'construction',position:{x:28,y:50},splitPins:[]},{id:'setup',key:'setPosition',position:{x:290,y:50},splitPins:[]}],edges:[{from:{node:'construction',pin:'then'},to:{node:'setup',pin:'exec'}}]}
};
// A view shares metadata, but writes node/link changes back to its own saved graph.
export function graphContext(root,view='event'){
  const target=view==='event'?root:view==='construction'?root.construction:[...(root.functions||[]),...(root.macros||[])].find(d=>d.id===view)?.graph;
  if(!target)return root;if(target===root)return root;
  return {variables:root.variables,components:root.components,functions:root.functions,macros:root.macros,get nodes(){return target.nodes;},set nodes(v){target.nodes=v;},get edges(){return target.edges;},set edges(v){target.edges=v;}};
}
export function allGraphContexts(root){return ['event',...(root.construction?['construction']:[]),...(root.functions||[]).map(d=>d.id),...(root.macros||[]).map(d=>d.id)].map(v=>graphContext(root,v));}
export function collapseNodes(root,graph,ids,kind,name){
  const selected=new Set(ids),nodes=graph.nodes.filter(n=>selected.has(n.id));
  if(!['function','macro'].includes(kind)||!name?.trim()||name.length>80)return {ok:false,reason:'이름을 1~80자로 입력하세요.'};
  if(!nodes.length)return {ok:false,reason:'먼저 묶을 노드를 선택하세요.'};
  if(nodes.some(n=>catalog.find(s=>s.key===n.key)?.kind==='event'||n.key.endsWith('Input')||n.key.endsWith('Output')))return {ok:false,reason:'이벤트와 Entry / Return은 묶음 밖에 두세요.'};
  if(kind==='function'&&nodes.some(n=>['delay','callMacro'].includes(n.key)))return {ok:false,reason:'Delay·매크로 호출이 있는 흐름은 매크로로 묶어주세요.'};
  if([...(root.functions||[]),...(root.macros||[])].some(d=>d.name===name.trim()))return {ok:false,reason:'이미 있는 함수·매크로 이름이에요.'};
  const incoming=graph.edges.filter(e=>!selected.has(e.from.node)&&selected.has(e.to.node)),outgoing=graph.edges.filter(e=>selected.has(e.from.node)&&!selected.has(e.to.node));
  const inputs=[],outputs=[],inputMap=new Map(),outputMap=new Map();
  for(const e of incoming){const key=e.from.node+':'+e.from.pin;if(!inputMap.has(key)){const p=effectivePins(graph.nodes.find(n=>n.id===e.to.node),'in',graph).find(p=>p.id===e.to.pin);const port={...p,id:'in'+inputs.length};delete port.parent;inputs.push(port);inputMap.set(key,port.id);}}
  for(const e of outgoing){const key=e.from.node+':'+e.from.pin;if(!outputMap.has(key)){const p=effectivePins(graph.nodes.find(n=>n.id===e.from.node),'out',graph).find(p=>p.id===e.from.pin);const port={...p,id:'out'+outputs.length};delete port.parent;outputs.push(port);outputMap.set(key,port.id);}}
  // Open ports make a newly collapsed group useful even before wiring it externally.
  for(const n of nodes)for(const direction of ['in','out'])for(const p of effectivePins(n,direction,graph)){
    const connected=graph.edges.some(e=>{const end=direction==='in'?e.to:e.from;return end.node===n.id&&end.pin===p.id;});if(connected)continue;
    const ports=direction==='in'?inputs:outputs,map=direction==='in'?inputMap:outputMap,key=n.id+':'+p.id,port={...p,id:(direction==='in'?'in':'out')+ports.length};delete port.parent;ports.push(port);map.set(key,port.id);
  }
  if(inputs.length>30||outputs.length>30)return {ok:false,reason:'묶음의 입력·출력은 각각 30개까지 지원해요.'};
  if(kind==='function'&&(inputs.filter(p=>p.type==='exec').length>1||outputs.filter(p=>p.type==='exec').length>1))return {ok:false,reason:'여러 실행 입출력이 있는 흐름은 매크로로 묶어주세요.'};
  const id='def_'+crypto.randomUUID().replaceAll('-',''),x=Math.min(...nodes.map(n=>n.position.x)),y=Math.min(...nodes.map(n=>n.position.y));
  const inside=nodes.map(n=>({...structuredClone(n),position:{x:Math.min(10000,n.position.x-x+260),y:Math.min(10000,n.position.y-y+40)}})),right=Math.max(...inside.map(n=>n.position.x))+250;
  const entry={...makeNode(kind+'Input',30,40),definitionId:id},exit={...makeNode(kind+'Output',Math.min(10000,right),40),definitionId:id};
  const edges=graph.edges.filter(e=>selected.has(e.from.node)&&selected.has(e.to.node)).map(e=>structuredClone(e));
  for(const e of incoming)edges.push({from:{node:entry.id,pin:inputMap.get(e.from.node+':'+e.from.pin)},to:{...e.to}});
  for(const e of outgoing)if(!edges.some(x=>x.to.node===exit.id&&x.to.pin===outputMap.get(e.from.node+':'+e.from.pin)))edges.push({from:{...e.from},to:{node:exit.id,pin:outputMap.get(e.from.node+':'+e.from.pin)}});
  for(const n of nodes)for(const p of effectivePins(n,'in',graph)){const port=inputMap.get(n.id+':'+p.id);if(port)edges.push({from:{node:entry.id,pin:port},to:{node:n.id,pin:p.id}});}
  for(const n of nodes)for(const p of effectivePins(n,'out',graph)){const port=outputMap.get(n.id+':'+p.id);if(port&&!edges.some(e=>e.to.node===exit.id&&e.to.pin===port))edges.push({from:{node:n.id,pin:p.id},to:{node:exit.id,pin:port}});}
  const definition={id,name:name.trim(),inputs,outputs,graph:{nodes:[entry,...inside,exit],edges}};
  const call={...makeNode(kind==='function'?'callFunction':'callMacro',x,y),definitionId:id};
  const rewired=graph.edges.filter(e=>!selected.has(e.from.node)&&!selected.has(e.to.node));
  for(const e of incoming)if(!rewired.some(x=>x.to.node===call.id&&x.to.pin===inputMap.get(e.from.node+':'+e.from.pin)))rewired.push({from:{...e.from},to:{node:call.id,pin:inputMap.get(e.from.node+':'+e.from.pin)}});
  for(const e of outgoing)rewired.push({from:{node:call.id,pin:outputMap.get(e.from.node+':'+e.from.pin)},to:{...e.to}});
  const candidate={...graph,nodes:graph.nodes.filter(n=>!selected.has(n.id)).concat(call),edges:rewired,functions:[...(root.functions||[]),...(kind==='function'?[definition]:[])],macros:[...(root.macros||[]),...(kind==='macro'?[definition]:[])]};
  if(candidate.edges.some(e=>!canConnect({...candidate,edges:candidate.edges.filter(x=>x!==e)},e.from,e.to).ok))return {ok:false,reason:'선택 사이의 외부 노드 때문에 순환 연결이 생겨요. 중간 노드도 함께 선택하세요.'};
  root[kind==='function'?'functions':'macros']??=[];root[kind==='function'?'functions':'macros'].push(definition);graph.nodes=graph.nodes.filter(n=>!selected.has(n.id)).concat(call);graph.edges=rewired;
  return {ok:true,definition,call};
}
const safeId=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
export function validBlueprint(g){
  if(!g||g.version!==1||typeof g.name!=='string'||g.name.length>200||!Array.isArray(g.nodes)||g.nodes.length>200||!Array.isArray(g.variables)||g.variables.length>100||!Array.isArray(g.components)||g.components.length>100||!Array.isArray(g.edges)||g.edges.length>1000)return false;
  if(new Set(g.nodes.map(n=>n?.id)).size!==g.nodes.length||new Set(g.variables.map(v=>v?.id)).size!==g.variables.length||new Set(g.variables.map(v=>v?.name)).size!==g.variables.length)return false;
  if(!g.variables.every(v=>v&&safeId(v.id)&&typeof v.name==='string'&&v.name.length>0&&v.name.length<=80&&Object.hasOwn(variableTypes,v.type)&&['single','array'].includes(v.container)&&(v.container==='array'?Array.isArray(v.value)&&v.value.length<=128&&v.value.every(x=>validValue(v.type,x)):validValue(v.type,v.value))))return false;
  if(!g.components.every(c=>c&&safeId(c.id)&&typeof c.name==='string'&&c.name.length<=80&&typeof c.type==='string'&&c.type.length<=80))return false;
  const definitions=[...(Array.isArray(g.functions)?g.functions:[]),...(Array.isArray(g.macros)?g.macros:[])];
  for(const key of ['functions','macros'])if(g[key]!==undefined&&(!Array.isArray(g[key])||g[key].length>50))return false;
  const validPorts=ports=>Array.isArray(ports)&&ports.length<=30&&new Set(ports.map(p=>p?.id)).size===ports.length&&ports.every(p=>p&&safeId(p.id)&&typeof p.label==='string'&&p.label.length<=80&&(p.type==='exec'||p.type==='any'||Object.hasOwn(variableTypes,p.type))&&typeof p.array==='boolean'&&!(p.type==='exec'&&p.array));
  if(new Set(definitions.map(d=>d?.id)).size!==definitions.length||new Set(definitions.map(d=>d?.name)).size!==definitions.length||!definitions.every(d=>d&&safeId(d.id)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=80&&validPorts(d.inputs)&&validPorts(d.outputs)&&d.graph))return false;
  for(const context of allGraphContexts(g)){
    if(!Array.isArray(context.nodes)||context.nodes.length>200||!Array.isArray(context.edges)||context.edges.length>1000||new Set(context.nodes.map(n=>n?.id)).size!==context.nodes.length)return false;
    if(!context.nodes.every(n=>n&&safeId(n.id)&&typeof n.key==='string'&&(catalog.some(s=>s.key===n.key)||(['getVariable','setVariable'].includes(n.key)&&g.variables.some(v=>v.id===n.variableId))||(['callFunction','callMacro','functionInput','functionOutput','macroInput','macroOutput'].includes(n.key)&&definitions.some(d=>d.id===n.definitionId)))&&n.position&&['x','y'].every(k=>Number.isFinite(n.position[k])&&n.position[k]>=0&&n.position[k]<=10000)&&Array.isArray(n.splitPins)&&n.splitPins.length<=30&&n.splitPins.every(k=>typeof k==='string'&&/^(in|out):[a-zA-Z0-9_.-]+$/.test(k))&&(n.title===undefined||(typeof n.title==='string'&&n.title.length<=80))))return false;
    for(const n of context.nodes){if(n.key==='callFunction'&&!(g.functions||[]).some(d=>d.id===n.definitionId))return false;if(n.key==='callMacro'&&!(g.macros||[]).some(d=>d.id===n.definitionId))return false;}
    for(const n of context.nodes)for(const key of ['customInputs','customOutputs'])if(n[key]!==undefined&&(!['customEvent','customFunction'].includes(n.key)||!Array.isArray(n[key])||n[key].length>20||!n[key].every(p=>p&&safeId(p.id)&&typeof p.label==='string'&&p.label.length<=80&&Object.hasOwn(variableTypes,p.type)&&typeof p.array==='boolean')))return false;
    for(const n of context.nodes)for(const direction of ['in','out']){const pins=basePins(n,direction,context);if(new Set(pins.map(p=>p.id)).size!==pins.length)return false;}
    const usedInputs=new Set(),usedExec=new Set();
    for(const e of context.edges){if(!e?.from||!e?.to)return false;const inputKey=e.to.node+':'+e.to.pin;if(usedInputs.has(inputKey))return false;usedInputs.add(inputKey);const result=canConnect({...context,edges:context.edges.filter(x=>x!==e)},e.from,e.to);if(!result.ok)return false;const p=effectivePins(context.nodes.find(n=>n.id===e.from.node),'out',context).find(p=>p.id===e.from.pin);if(p.type==='exec'){const k=e.from.node+':'+e.from.pin;if(usedExec.has(k))return false;usedExec.add(k);}}
  }
  for(const [collection,kind] of [['functions','function'],['macros','macro']])for(const d of g[collection]||[]){
    if(!['Input','Output'].every(s=>d.graph.nodes.filter(n=>n.key===kind+s&&n.definitionId===d.id).length===1))return false;
    if(d.graph.nodes.some(n=>catalog.find(s=>s.key===n.key)?.kind==='event'))return false;
    if(kind==='function'&&(d.inputs.filter(p=>p.type==='exec').length>1||d.outputs.filter(p=>p.type==='exec').length>1||d.graph.nodes.some(n=>['delay','callMacro'].includes(n.key))))return false;
  }
  return true;
}
