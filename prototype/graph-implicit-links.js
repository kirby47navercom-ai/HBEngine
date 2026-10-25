const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// Adapters retain source records for semantic comparison only; the public
// diff still emits endpoints/state, never conditions or task bodies.
export function implicitGraphLinks(value,nodeField,nodes){
 if(nodeField==='states'){
  if(!Array.isArray(value.transitions))throw Error('상태 전이 목록을 확인하세요.');const edges=value.transitions.map(t=>{if(!plain(t)||typeof t.id!=='string'||!t.id)throw Error('상태 전이 ID를 확인하세요.');return{...t,mergePath:['transitions','@id='+t.id],id:JSON.stringify(['transition',t.id]),from:{node:t.from==='any'?'':t.from,pin:t.from==='any'?'any-state':'transition'},to:{node:t.to,pin:'state'}};});
  for(const n of nodes.values())if(n.parent)edges.push({mergePath:['states','@id='+n.id,'parent'],id:JSON.stringify(['parent',n.id]),from:{node:n.parent,pin:'children'},to:{node:n.id,pin:'parent'}});
  if(value.initial&&!nodes.has(value.initial))throw Error('시작 상태를 확인하세요.');return{edges,layout:'state-transitions',entry:value.initial||'',anyState:true,nodeKind:'state'};
 }
 if(!(value.edges?.length)&&typeof value.root==='string'&&[...nodes.values()].every(n=>typeof n.type==='string'&&Array.isArray(n.children))){
  if(!nodes.has(value.root))throw Error('행동트리 루트를 확인하세요.');const edges=[];for(const n of nodes.values())for(const [order,child]of n.children.entries())edges.push({mergePath:['nodes','@id='+n.id,'children'],id:JSON.stringify(['child',n.id,child]),from:{node:n.id,pin:'child '+order},to:{node:child,pin:'parent'},order});return{edges,layout:'behavior-children',entry:value.root};
 }
 return null;
}
