import {defaultBlueprint,makeNode,componentDefaults,validBlueprint,defaultTimeline,validTimeline} from './blueprint-model.js';
import {defaultSurface,validSurface,validScene,defaultEnvironment} from './model.js';
import {blueprintClasses} from './class-types.js';
const copy=v=>structuredClone(v);
export const assetSuffix={blueprint:'.hbblueprint.json',material:'.hbmaterial.json',animation:'.hbanimation.json',scene:'.hbscene.json',inputaction:'.hbinputaction.json',inputmapping:'.hbinputmapping.json',curve:'.hbcurve.json',data:'.hbdata.json'};
export const assetTypes={blueprint:{label:'블루프린트 클래스',prefix:'BP_',group:'게임플레이'},code:{label:'C++ 클래스',prefix:'',group:'게임플레이'},inputaction:{label:'Input Action',prefix:'IA_',group:'입력'},inputmapping:{label:'Input Mapping Context',prefix:'IMC_',group:'입력'},material:{label:'머테리얼',prefix:'M_',group:'렌더링'},animation:{label:'트랜스폼 애니메이션',prefix:'AN_',group:'애니메이션'},curve:{label:'커브',prefix:'Curve_',group:'애니메이션'},data:{label:'데이터 에셋',prefix:'DA_',group:'데이터'},scene:{label:'레벨',prefix:'L_',group:'월드'}};
export const assetTitle=path=>path.split('/').pop().replace(/\.hb[a-z]+\.json$/i,'');
export async function loadSceneBindings(objects,read){
  const loaded=new Map(),contexts=new Map(),actions=new Map(),bindings=[];
  const load=async(path,kind)=>{if(!loaded.has(path)){const data=await read(path);if(!validAsset(kind,data))throw Error('에셋 검증 실패: '+path);loaded.set(path,data);}return loaded.get(path);};
  for(const object of objects){if(!object.blueprintAsset)continue;const root=await load(object.blueprintAsset,'blueprint');bindings.push({root,self:object.id,path:object.blueprintAsset});
    if(root.settings?.inputMapping){const path=root.settings.inputMapping,context=await load(path,'inputmapping');contexts.set(path,context);for(const m of context.mappings){if(!m.action)throw Error('Input Action을 선택하세요: '+path);actions.set(m.action,await load(m.action,'inputaction'));}}
  }
  return {bindings,inputAssets:{contexts,actions}};
}
export const materialGraph=()=>({nodes:[{id:'color',title:'Base Color',kind:'value',x:.06,y:45,body:'color',output:'RGB'},{id:'rough',title:'Roughness',kind:'value',x:.06,y:195,body:'rough',output:'Float'},{id:'surface',title:'Surface',kind:'output',x:.64,y:70,inputs:['Base color','Roughness','Metallic']}],edges:[['color','surface',0],['rough','surface',1]]});
export function evaluateMaterial(data){
  const result=copy(data.surface),g=data.graph;if(!g)return result;const output=g.nodes.find(n=>n.kind==='output');if(!output)return result;
  for(const [from,to,index] of g.edges.filter(e=>e[1]===output.id)){const n=g.nodes.find(n=>n.id===from);if(!n)continue;const value=n.body==='color'?data.surface.color:n.body==='rough'?data.surface.roughness:n.value??Number(n.caption??.5);if(index===0)result.color=typeof value==='string'?value:'#'+Array(3).fill(Math.round(Math.max(0,Math.min(1,value))*255).toString(16).padStart(2,'0')).join('');else if(typeof value==='number'&&Number.isFinite(value))result[index===1?'roughness':'metalness']=Math.max(0,Math.min(1,value));}
  return result;
}
export function createAsset(kind,name,parent='Actor'){
  if(!name||name.length>80||/[<>:"/\\|?*\x00-\x1f]/.test(name))throw Error('에셋 이름을 확인하세요.');
  if(kind==='blueprint'){
    const type=blueprintClasses[parent];if(!type)throw Error('지원하지 않는 부모 클래스예요.');
    const root=copy(defaultBlueprint);root.name=name;root.nodes=['beginPlay','tick','endPlay'].map((key,i)=>({...makeNode(key,70,55+i*165),id:key}));root.edges=[];root.variables=[];root.functions=[];root.macros=[];root.comments=[];root.dispatchers=[];root.interfaces=[];delete root.native;
    root.components=type.components.map((type,i)=>({id:'component_'+i,name:type,type,properties:componentDefaults(type)}));root.settings={parentClass:parent,tickEnabled:true,tickInterval:0,overlapEnabled:true};return root;
  }
  if(kind==='scene')return {version:1,sceneName:name,objects:[],surface:copy(defaultSurface),environment:copy(defaultEnvironment)};
  if(kind==='material')return {version:1,name,surface:copy(defaultSurface),graph:materialGraph()};
  if(kind==='inputaction')return {version:1,name,valueType:'bool',consumeInput:true,trigger:'pressed',deadZone:0};
  if(kind==='inputmapping')return {version:1,name,priority:0,mappings:[]};
  if(kind==='data')return {version:1,name,fields:[]};
  if(kind==='curve')return {version:1,name,timeline:copy(defaultTimeline)};
  if(kind==='animation')return {version:1,name,model:'',timeline:{...copy(defaultTimeline),length:3,tracks:[{id:'position',name:'Position',type:'vec3',interpolation:'auto',keys:[{time:0,value:[0,0,0]},{time:1.5,value:[0,1,0]},{time:3,value:[0,0,0]}]},{id:'rotation',name:'Rotation',type:'vec3',interpolation:'linear',keys:[{time:0,value:[0,0,0]},{time:3,value:[0,180,0]}]}]}};
  throw Error('에셋 종류를 확인하세요.');
}
export function validAsset(kind,data){
  if(kind==='text')return typeof data==='string'&&data.length<=1048576;
  if(kind==='blueprint')return validBlueprint(data);
  if(kind==='scene')return validScene(data);
  if(['inputaction','inputmapping','data','curve'].includes(kind)&&!(data?.version===1&&typeof data.name==='string'&&data.name.length>0&&data.name.length<=80))return false;
  if(kind==='inputaction')return ['bool','float','vec2','vec3'].includes(data.valueType)&&typeof data.consumeInput==='boolean'&&['pressed','held','released'].includes(data.trigger)&&Number.isFinite(data.deadZone)&&data.deadZone>=0&&data.deadZone<=1;
  if(kind==='inputmapping')return Number.isInteger(data.priority)&&Math.abs(data.priority)<=10000&&Array.isArray(data.mappings)&&data.mappings.length<=128&&data.mappings.every(m=>typeof m.action==='string'&&m.action.length<=1000&&typeof m.key==='string'&&m.key.length>0&&m.key.length<=40&&[0,1,2].includes(m.axis)&&Number.isFinite(m.scale)&&Math.abs(m.scale)<=100);
  if(kind==='data')return Array.isArray(data.fields)&&data.fields.length<=128&&new Set(data.fields.map(f=>f?.name)).size===data.fields.length&&data.fields.every(f=>f&&/^[A-Za-z_가-힣][\w가-힣]{0,79}$/.test(f.name)&&['string','float','bool'].includes(f.type)&&typeof f.value===({string:'string',float:'number',bool:'boolean'}[f.type])&&(f.type!=='float'||Number.isFinite(f.value)));
  if(kind==='curve')return validTimeline(data.timeline);
  if(kind==='animation')return data?.version===1&&typeof data.name==='string'&&data.name.length<=80&&typeof data.model==='string'&&data.model.length<=1000&&validTimeline(data.timeline);
  if(kind==='material')return data?.version===1&&validSurface(data.surface)&&(!data.graph||(Array.isArray(data.graph.nodes)&&data.graph.nodes.length<=1000&&Array.isArray(data.graph.edges)&&data.graph.edges.length<=5000&&new Set(data.graph.nodes.map(n=>n?.id)).size===data.graph.nodes.length&&data.graph.nodes.every(n=>n&&typeof n.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(n.id)&&typeof n.title==='string'&&n.title.length<=100&&(!n.inputs||Array.isArray(n.inputs)&&n.inputs.length<=3&&n.inputs.every(v=>typeof v==='string'&&v.length<=80))&&(!n.output||typeof n.output==='string'&&n.output.length<=80)&&(!n.body||['color','rough','constant'].includes(n.body))&&(n.value===undefined||Number.isFinite(n.value)&&Math.abs(n.value)<=10000)&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&(n.px===undefined||Number.isFinite(n.px))&&['value','output'].includes(n.kind))&&data.graph.edges.every(e=>Array.isArray(e)&&e.length===3&&data.graph.nodes.some(n=>n.id===e[0])&&data.graph.nodes.some(n=>n.id===e[1])&&Number.isInteger(e[2])&&e[2]>=0&&e[2]<=2)));
  return true;
}
// One data record per path. Switching a view must never replace another asset's edits.
export class AssetDocuments {
  constructor(){this.items=new Map();this.active=null;}
  open(path,kind,data){if(!this.items.has(path)){if(!validAsset(kind,data))throw Error('에셋 데이터 검증 실패: '+path);this.items.set(path,{path,kind,data:copy(data),saved:JSON.stringify(data),history:[],future:[],view:{},dirty:false});}return this.items.get(path);}
  select(path){if(!this.items.has(path))throw Error('열린 문서가 없어요.');this.active=path;return this.current;}
  get current(){return this.items.get(this.active);}
  async save(doc,write){if(!validAsset(doc.kind,doc.data))throw Error('저장 데이터 검증 실패: '+doc.path);const text=doc.kind==='text'?doc.data:JSON.stringify(doc.data,null,2);await write(doc.path,text);doc.saved=JSON.stringify(doc.kind==='text'?text:JSON.parse(text));doc.dirty=JSON.stringify(doc.data)!==doc.saved;}
  close(path,discard=false){const doc=this.items.get(path);if(doc?.dirty&&!discard)return false;this.items.delete(path);if(this.active===path)this.active=[...this.items.keys()].at(-1)||null;return true;}
  rename(from,to){for(const [path,doc] of [...this.items])if(path===from||path.startsWith(from+'/')){const next=to+path.slice(from.length);this.items.delete(path);doc.path=next;this.items.set(next,doc);if(this.active===path)this.active=next;}}
}
