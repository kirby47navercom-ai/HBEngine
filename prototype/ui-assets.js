import {validAssetPath} from './material-runtime.js';

export const widgetTypes={Canvas:'캔버스',Panel:'패널',HorizontalBox:'가로 상자',VerticalBox:'세로 상자',Grid:'그리드',ScrollBox:'스크롤 상자',Text:'텍스트',Image:'이미지',Button:'버튼',ProgressBar:'진행 막대',Slider:'슬라이더',CheckBox:'체크 상자',TextInput:'입력 상자',Spacer:'여백'};
export const widgetContainers=new Set(['Canvas','Panel','HorizontalBox','VerticalBox','Grid','ScrollBox']);
export const widgetEvents=['click','changed','submit','focus','blur'];
export const widgetDefaults={text:'',texture:'',fontSize:24,color:'#e4e9ef',background:'#263443',accent:'#589ad6',hover:'#365778',pressed:'#1e4061',borderColor:'#4a5f73',borderWidth:0,radius:4,opacity:1,visible:true,enabled:true,focusable:true,tooltip:'',align:'left',value:0,min:0,max:1,step:.01,padding:8,gap:8,columns:2,checked:false,placeholder:'',maxLength:256,wrap:true};
export function createWidgetNode(type='Text',id=crypto.randomUUID(),parent='root'){
  if(!Object.hasOwn(widgetTypes,type))throw Error('위젯 종류를 확인하세요.');
  const properties={...widgetDefaults,text:{Text:'텍스트',Button:'버튼',CheckBox:'선택'}[type]||''};
  if(['Text','Image','Spacer','Canvas','HorizontalBox','VerticalBox','Grid'].includes(type))properties.background='#00000000';
  return {id,name:type,parent,type,slot:{anchors:[0,0,0,0],offset:[32,32,type==='ProgressBar'?280:200,type==='Text'?40:48],alignment:[0,0],zIndex:0,fill:0},properties,events:{},bindings:{}};
}
export function createWidgetAsset(name){const root=createWidgetNode('Canvas','root','');root.name='Root';root.slot.anchors=[0,0,1,1];root.slot.offset=[0,0,0,0];return {version:1,name,referenceSize:[1280,720],scaleMode:'constant',nodes:[root]};}
const text=(s,max=80)=>typeof s==='string'&&s.length<=max;
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const vector=(v,size,min,max)=>Array.isArray(v)&&v.length===size&&v.every(n=>finite(n,min,max));
const color=v=>typeof v==='string'&&/^#[\da-f]{6}([\da-f]{2})?$/i.test(v);
export function validWidgetAsset(data){
  if(data?.version!==1||!text(data.name)||!data.name||!vector(data.referenceSize,2,64,16384)||!['constant','scale'].includes(data.scaleMode)||!Array.isArray(data.nodes)||data.nodes.length<1||data.nodes.length>256)return false;
  const nodes=new Map(data.nodes.map(n=>[n?.id,n]));if(nodes.size!==data.nodes.length||new Set(data.nodes.map(n=>n?.name)).size!==nodes.size)return false;
  const roots=data.nodes.filter(n=>n?.parent==='');if(roots.length!==1||roots[0].type!=='Canvas')return false;
  return data.nodes.every(n=>{
    if(!text(n?.id)||!n.id||!text(n.name)||!n.name||!Object.hasOwn(widgetTypes,n.type)||!text(n.parent))return false;
    let at=n;const seen=new Set();while(at.parent){if(seen.has(at.id)||seen.size>32)return false;seen.add(at.id);at=nodes.get(at.parent);if(!at||!widgetContainers.has(at.type))return false;}
    const s=n.slot,p=n.properties;
    if(!s||!vector(s.anchors,4,0,1)||s.anchors[0]>s.anchors[2]||s.anchors[1]>s.anchors[3]||!vector(s.offset,4,-16384,16384)||!vector(s.alignment,2,0,1)||!Number.isInteger(s.zIndex)||!finite(s.zIndex,-1000,1000)||!finite(s.fill,0,100))return false;
    if(!p||!text(p.text,10000)||!text(p.tooltip,1000)||!text(p.placeholder,1000)||!validAssetPath(p.texture)||!['left','center','right'].includes(p.align))return false;
    if(!['color','background','accent','hover','pressed','borderColor'].every(k=>color(p[k]))||!['visible','enabled','focusable','checked','wrap'].every(k=>typeof p[k]==='boolean'))return false;
    if(!finite(p.fontSize,6,256)||!finite(p.borderWidth,0,32)||!finite(p.radius,0,512)||!finite(p.opacity,0,1)||!finite(p.padding,0,512)||!finite(p.gap,0,512)||!Number.isInteger(p.columns)||!finite(p.columns,1,32)||!Number.isInteger(p.maxLength)||!finite(p.maxLength,1,10000))return false;
    if(!finite(p.min,-1e6,1e6)||!finite(p.max,-1e6,1e6)||p.min>=p.max||!finite(p.value,p.min,p.max)||!finite(p.step,.000001,1e6))return false;
    return n.events&&typeof n.events==='object'&&!Array.isArray(n.events)&&Object.entries(n.events).every(([k,v])=>widgetEvents.includes(k)&&text(v,80))&&n.bindings&&typeof n.bindings==='object'&&!Array.isArray(n.bindings)&&Object.entries(n.bindings).every(([k,v])=>['text','value','visible','enabled','checked'].includes(k)&&text(v,80));
  });
}
export function widgetDescendants(data,id){const result=new Set([id]);let size;do{size=result.size;for(const n of data.nodes)if(result.has(n.parent))result.add(n.id);}while(size!==result.size);return result;}
export function reparentWidget(data,id,parent){const n=data.nodes.find(n=>n.id===id),p=data.nodes.find(n=>n.id===parent);if(!n?.parent||!p||!widgetContainers.has(p.type)||widgetDescendants(data,id).has(parent))throw Error('위젯 계층을 순환시키거나 루트를 이동할 수 없어요.');n.parent=parent;}
export function addWidget(data,type,{parent=data.nodes.find(n=>!n.parent).id,name,id=crypto.randomUUID()}={}){const owner=data.nodes.find(n=>n.id===parent);if(!widgetContainers.has(owner?.type))throw Error('위젯 부모는 컨테이너여야 해요.');const node=createWidgetNode(type,id,parent);if(name!==undefined)node.name=name;else{let i=1;while(data.nodes.some(n=>n.name===node.name))node.name=type+'_'+i++;}if(data.nodes.some(n=>n.id===id||n.name===node.name))throw Error('위젯 ID·이름이 중복돼요.');data.nodes.push(node);return node.id;}
export function removeWidget(data,id){const node=data.nodes.find(n=>n.id===id);if(!node?.parent)throw Error('루트 위젯은 삭제할 수 없어요.');const ids=widgetDescendants(data,id);data.nodes=data.nodes.filter(n=>!ids.has(n.id));return [...ids];}
export function duplicateWidget(data,id,{parent,offset=[16,16]}={}){const source=data.nodes.find(n=>n.id===id);if(!source?.parent)throw Error('루트 위젯은 복제할 수 없어요.');parent??=source.parent;if(!widgetContainers.has(data.nodes.find(n=>n.id===parent)?.type)||!vector(offset,2,-16384,16384))throw Error('복제 부모·위치를 확인하세요.');const ids=widgetDescendants(data,id),copies=structuredClone(data.nodes.filter(n=>ids.has(n.id))),map=new Map(copies.map(n=>[n.id,crypto.randomUUID()])),names=new Set(data.nodes.map(n=>n.name));for(const n of copies){const old=n.id;n.id=map.get(old);n.parent=old===id?parent:map.get(n.parent);let i=1,name=n.name+'_Copy';while(names.has(name))name=n.name+'_Copy'+i++;n.name=name;names.add(name);}const root=copies.find(n=>n.id===map.get(id));root.slot.offset[0]+=offset[0];root.slot.offset[1]+=offset[1];data.nodes.push(...copies);return root.id;}
// Canvas offsets: fixed anchors use x/y/width/height; stretched anchors use left/top/right/bottom margins.
export function widgetRect(slot,width,height){const a=slot.anchors,o=slot.offset,x=a[0]*width+o[0],y=a[1]*height+o[1],w=a[0]===a[2]?o[2]:(a[2]-a[0])*width-o[0]-o[2],h=a[1]===a[3]?o[3]:(a[3]-a[1])*height-o[1]-o[3];return {x:x-w*slot.alignment[0],y:y-h*slot.alignment[1],width:Math.max(0,w),height:Math.max(0,h)};}
