import {basePins,defaultInputValue,fieldsFor} from './blueprint-model.js';
import {nativeMember,nativeTargetPin} from './native-model.js';

const plans=new WeakMap(),clone=value=>value&&typeof value==='object'?structuredClone(value):value;
// ponytail: terminal native events can batch without graph continuations. Branches,
// world reads and used return pins keep their existing ordered execution boundary.
export function nativeTickPlan(root,key='tick'){
  if(!plans.has(root))plans.set(root,new Map());const cache=plans.get(root);if(cache.has(key))return cache.get(key);
  const nodes=root.nodes.filter(n=>n.key===key),result=[];let calls=0,valid=true;
  const safe=(node,pin,seen=new Set())=>{const id=node.id+':'+pin;if(seen.has(id))return false;seen=new Set(seen).add(id);const edge=root.edges.find(e=>e.to.node===node.id&&e.to.pin===pin);if(!edge)return true;const source=root.nodes.find(n=>n.id===edge.from.node);return source?.key===key&&nodes.includes(source)||['getVariable','self'].includes(source?.key)||source?.key==='reroute'&&safe(source,'value',seen);};
  for(const tick of nodes){const edges=root.edges.filter(e=>e.from.node===tick.id&&e.from.pin==='then');if(!edges.length){result.push({tick});continue;}const node=edges.length===1&&root.nodes.find(n=>n.id===edges[0].to.node),{f}=node?nativeMember(root,node):{};if(!node||node.key!=='nativeCall'||!f||f.pure||f.event!=='none'||root.edges.some(e=>e.from.node===node.id)||basePins(node,'in',root).some(p=>p.type!=='exec'&&(!safe(node,p.id)||node.splitPins?.includes('in:'+p.id)))){valid=false;break;}result.push({tick,node,fn:f,inputs:basePins(node,'in',root).filter(p=>p.type!=='exec')});if(++calls>1){valid=false;break;}}
  const plan=valid?result:null;cache.set(key,plan);return plan;
}
export function nativeTickBlock(binding,plan,delta,eventArgs){
  const root=binding.root,jobs=[];let request;
  for(const item of plan){const {tick,node,fn}=item,elapsed=(binding.ticks.get(tick.id)||0)+delta,interval=tick.options?.tickInterval??root.settings?.tickInterval??0,due=eventArgs!==undefined||elapsed+1e-9>=interval&&delta>0,reads=new Map();const job={...item,elapsed,due,reads,readCount:0};jobs.push(job);if(!due||!node||node.enabled===false)continue;if(node.breakpoint)return null;
    const read=(n,p)=>{const edge=root.edges.find(e=>e.to.node===n.id&&e.to.pin===p.id);if(!edge)return clone(defaultInputValue(n,p));const source=root.nodes.find(n=>n.id===edge.from.node),[id,...path]=edge.from.pin.split('.');let output;
      if(source===tick)output=eventArgs??{delta:elapsed};else if(source.key==='getVariable')output={value:binding.variables.get(source.variableId)};else if(source.key==='self')output={return:binding.self};else if(source.key==='reroute')output={value:read(source,basePins(source,'in',root).find(p=>p.id==='value'))};else throw Error('C++ 묶음 데이터 의존성');
      if(source!==tick)job.readCount++;reads.set(source.id,clone(output));let value=output[id],type=basePins(source,'out',root).find(p=>p.id===id)?.type;for(const field of path){const fields=fieldsFor(type),i=fields.findIndex(p=>p.id===field);value=Array.isArray(value)?value[i]:value?.[field];type=fields[i]?.type;}if(value===undefined)throw Error('출력 값이 없어요: '+edge.from.pin);return clone(value);};
    const args=Object.fromEntries(item.inputs.map(p=>[p.id,read(node,p)])),receiver=nativeTargetPin(fn);if(!fn.static)args[receiver]=args[receiver]==='self'||args[receiver]===null?binding.self:args[receiver];request={key:'nativeCall',nativeId:node.nativeId,args,self:binding.self,scope:'',overrides:root.nodes.filter(n=>n.key==='nativeEvent').map(n=>n.nativeId)};job.request=request;
  }
  return {binding,jobs,request};
}
