import {catalog, effectivePins, canConnect, connect, makeNode} from './blueprint-model.js';

// Explicit shared C++ operations only. Arrays, references and execution never coerce.
const conversions=new Map([
  ['int:float','intToFloat'],['float:int','floatToInt'],
  ['int:string','intToString'],['float:string','toString'],['bool:string','boolToString'],
  ['bool:int','boolToInt'],['int:bool','intToBool'],
  ['vec2:vec3','vector2ToVector3'],['vec3:vec2','vector3ToVector2'],
]);
// New helper nodes use nearby free space; existing user-arranged nodes stay put.
export function nodeBounds(node,graph){
  const inputs=effectivePins(node,'in',graph),outputs=effectivePins(node,'out',graph),event=catalog.find(s=>s.key===node.key)?.kind==='event';
  return {...node.position,width:node.key==='getVariable'?180:Math.max(node.key==='timeline'?350:230,Math.max(0,...inputs.map(p=>p.label.length))*6+Math.max(0,...outputs.map(p=>p.label.length))*6+75),height:node.key==='getVariable'?45:72+Math.max(inputs.length,outputs.length-(event?1:0))*36};
}
export function placeHelperNode(graph,node){
  const shape=nodeBounds(node,graph),others=graph.nodes.map(n=>nodeBounds(n,graph)),gap=24;
  const candidates=[{x:shape.x,y:shape.y},...others.flatMap(r=>[{x:r.x-shape.width-gap,y:shape.y},{x:r.x+r.width+gap,y:shape.y},{x:shape.x,y:r.y-shape.height-gap},{x:shape.x,y:r.y+r.height+gap}])].filter(p=>Math.abs(p.x)<=10000&&Math.abs(p.y)<=10000).sort((a,b)=>Math.hypot(a.x-shape.x,a.y-shape.y)-Math.hypot(b.x-shape.x,b.y-shape.y));
  const free=candidates.find(p=>others.every(r=>p.x+shape.width+gap<=r.x||p.x>=r.x+r.width+gap||p.y+shape.height+gap<=r.y||p.y>=r.y+r.height+gap));
  if(free)node.position=free;return node;
}
export function conversionFor(output,input){
  if(!output||!input||Boolean(output.array)!==Boolean(input.array))return null;
  if(output.type===input.type||output.type==='any'||input.type==='any')return {key:null};
  const key=!output.array&&conversions.get(output.type+':'+input.type);
  return key&&catalog.some(spec=>spec.key===key)?{key}:null;
}
export function planConnection(graph,from,to){
  if(!from||!to||!['node','pin'].every(key=>typeof from[key]==='string'&&typeof to[key]==='string'))return {ok:false,reason:'연결할 핀을 확인하세요.'};
  const direct=canConnect(graph,from,to);if(direct.ok)return {...direct,from,to};
  if(from.node===to.node)return direct;
  const source=graph.nodes.find(n=>n.id===from.node),target=graph.nodes.find(n=>n.id===to.node);
  const output=source&&effectivePins(source,'out',graph).find(p=>p.id===from.pin),input=target&&effectivePins(target,'in',graph).find(p=>p.id===to.pin);
  const conversion=conversionFor(output,input);if(!conversion?.key)return direct;
  if(graph.nodes.length>=1000)return {ok:false,reason:'그래프의 노드 제한에 도달했어요.'};
  const node=makeNode(conversion.key,(source.position.x+target.position.x)/2,(source.position.y+target.position.y)/2+70);
  node.position.x=Math.max(-10000,Math.min(10000,node.position.x));node.position.y=Math.max(-10000,Math.min(10000,node.position.y));
  placeHelperNode(graph,node);
  const candidate={...graph,nodes:[...graph.nodes,node],edges:structuredClone(graph.edges)};
  const first={node:node.id,pin:'value'},last={node:node.id,pin:'return'};
  const a=connect(candidate,from,first);if(!a.ok)return a;
  const b=connect(candidate,last,to);return b.ok?{ok:true,node,edges:candidate.edges,from,to}:b;
}
export function connectAutomatic(graph,from,to){
  const plan=planConnection(graph,from,to);if(!plan.ok)return plan;
  if(!plan.node)return connect(graph,from,to);
  graph.nodes.push(plan.node);graph.edges=plan.edges;return {ok:true,node:plan.node};
}

// A variable dropped on an execution input is inserted before it; on an
// execution output it is inserted after it, preserving the existing chain.
export function dropVariable(graph,variableId,target,position,mode){
  const variable=graph.variables.find(v=>v.id===variableId);if(!variable)return {ok:false,reason:'변수를 찾을 수 없어요.'};
  const owner=target&&graph.nodes.find(n=>n.id===target.node),pin=owner&&effectivePins(owner,target.direction,graph).find(p=>p.id===target.pin);
  if(target&&!pin)return {ok:false,reason:'연결할 핀을 찾을 수 없어요.'};
  if(pin&&pin.type!=='exec'&&target.direction==='out')return {ok:false,reason:'변수 읽기는 값을 받는 입력 핀에 연결하세요.'};
  const key=pin?(pin.type==='exec'?'setVariable':'getVariable'):mode==='set'?'setVariable':'getVariable';
  const node=placeHelperNode(graph,makeNode(key,position.x,position.y,variableId)),candidate={...graph,nodes:[...graph.nodes,node],edges:structuredClone(graph.edges)};
  if(candidate.nodes.length>1000)return {ok:false,reason:'그래프의 노드 제한에 도달했어요.'};
  if(pin){
    const endpoint={node:target.node,pin:target.pin};let result;
    if(pin.type!=='exec')result=connectAutomatic(candidate,{node:node.id,pin:'value'},endpoint);
    else if(target.direction==='out'){
      const previous=candidate.edges.find(e=>e.from.node===target.node&&e.from.pin===target.pin);
      result=connect(candidate,endpoint,{node:node.id,pin:'exec'});
      if(result.ok&&previous)result=connect(candidate,{node:node.id,pin:'then'},previous.to);
    }else{
      const previous=candidate.edges.find(e=>e.to.node===target.node&&e.to.pin===target.pin);
      result=connect(candidate,{node:node.id,pin:'then'},endpoint);
      if(result.ok&&previous)result=connect(candidate,previous.from,{node:node.id,pin:'exec'});
    }
    if(!result.ok)return result;
  }
  graph.nodes=candidate.nodes;graph.edges=candidate.edges;return {ok:true,node};
}
