export function selectStreamingCells(cells,{budgetMB=Infinity,maxCells=Infinity}={}){
 if(!(budgetMB>0)||!(maxCells>0))throw Error('스트리밍 예산을 확인하세요.');
 const rows=[...cells].sort((a,b)=>b.priority-a.priority||a.distance-b.distance||Number(b.loaded)-Number(a.loaded)||a.instance.localeCompare(b.instance)),selected=new Set();let costMB=0,trackedBytes=0,allocations;
 for(const row of rows){
  if(!Number.isFinite(row.costMB)||row.costMB<=0||!Number.isFinite(row.distance)||!Number.isFinite(row.priority))throw Error('셀 추정 비용·거리를 확인하세요.');
  const resources=row.resources;if(resources!==undefined&&!Array.isArray(resources))throw Error('셀 지오메트리 비용을 확인하세요.');let marginal=0;
  if(resources?.length){allocations??=new Set();const local=new Set();for(const r of resources){if(!r||!r.allocation||typeof r.allocation!=='object'||!Number.isSafeInteger(r.bytes)||r.bytes<0)throw Error('셀 지오메트리 할당량을 확인하세요.');if(!allocations.has(r.allocation)&&!local.has(r.allocation)){marginal+=r.bytes;local.add(r.allocation);}}}
  const cost=Math.max(row.costMB,marginal/1048576);if(selected.size>=maxCells||costMB+cost>budgetMB)continue;selected.add(row.instance);costMB+=cost;
  if(resources?.length)for(const r of resources)if(!allocations.has(r.allocation)){allocations.add(r.allocation);trackedBytes+=r.bytes;}
 }
 return {selected,costMB,trackedBytes};
}
