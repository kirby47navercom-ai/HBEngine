// Services execute with their owning BT node; they are a scoped attachment
// list, not a fabricated sequential execution-flow graph.
export function appendBehaviorServiceGraphs(values,add){
 const arrays=values.map(v=>typeof v?.root==='string'&&Array.isArray(v.nodes)?v.nodes.filter(n=>typeof n?.type==='string'&&Array.isArray(n.children)):[]);
 if(arrays.some(a=>a.some(n=>typeof n.id!=='string'||!n.id)||new Set(a.map(n=>n.id)).size!==a.length))return;
 const maps=arrays.map(a=>new Map(a.map(n=>[n.id,n]))),ids=new Set(arrays.flatMap(a=>a.map(n=>n.id)));
 for(const id of ids){const entries=maps.map(m=>m.get(id));if(!entries.some(n=>n?.services?.length))continue;const example=entries.find(Boolean);add(JSON.stringify(['services','id',id]),'서비스 · '+String(example.name||example.type||id).slice(0,160),['nodes','@id='+id],entries.map(n=>n?{services:n.services||[]}:null),'services');}
}
