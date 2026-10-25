// CPU allocation accounting only. Keep buffer identities while a level is loaded;
// retained observations after unloading contain numbers, never released buffers.
export function measureStreamingGeometry(groups){
 const allocations=new Map(),geometries=new Set(),nodes=new Set();let attributeViews=0;
 const array=value=>{if(!ArrayBuffer.isView(value)||!value.buffer.byteLength)return;attributeViews++;allocations.set(value.buffer,value.buffer.byteLength);};
 const attribute=value=>array(value?.isInterleavedBufferAttribute?value.data?.array:value?.array);
 const visit=node=>{if(nodes.has(node))return;nodes.add(node);const g=node.geometry;if(g&&!geometries.has(g)){geometries.add(g);attribute(g.index);for(const value of Object.values(g.attributes||{}))attribute(value);for(const list of Object.values(g.morphAttributes||{}))for(const value of list)attribute(value);}attribute(node.instanceMatrix);attribute(node.instanceColor);};
 for(const group of groups){if(group?.traverse)group.traverse(visit);else if(group)visit(group);}
 const resources=[...allocations].map(([allocation,bytes])=>({allocation,bytes}));return{resources,bytes:resources.reduce((sum,r)=>sum+r.bytes,0),geometries:geometries.size,attributeViews};
}
export const streamingGeometryContract=Object.freeze({mode:'WorldStreamingBudget.memoryMode=geometry (authored default)',measurement:'Load-time CPU ArrayBuffer allocations retained by geometry/index/morph/instance attributes; whole shared backing allocation once. Not total RAM, texture, driver or VRAM bytes.',scheduling:'max(authored MB floor, marginal tracked geometry allocation MB); shared loaded allocations charged once. Unloaded cell remembers numeric measured total until scene/estimate changes or world ends, so oversized cells do not load/unload repeatedly.',lifetime:'No released buffer retained by observations; current loaded measurement can be explicitly refreshed through runtime.streaming refresh=true.',limits:['initial load and explicit refresh, not automatic tracking of arbitrary geometry replacements','unseen cells use authored estimate; first-load overshoot is possible','manual/always-loaded levels keep their explicit loading policy']});
