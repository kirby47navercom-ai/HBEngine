// Synchronous operation-local helpers. No mutable document is cached between
// edits; ordinary validation, copies, final publication and Undo remain owned
// by world-assets / WorldAssetEditor.
export function foliageSelection(instances,ids){
 if(!Array.isArray(instances)||!Array.isArray(ids)&&!(ids instanceof Set))throw Error('폴리지 선택 목록을 확인하세요.');const wanted=new Set(ids),rows=new Map(),indices=[];let visited=0;
 if(wanted.size)for(let i=0;i<instances.length&&rows.size<wanted.size;i++){const row=instances[i];visited++;if(wanted.has(row.id)){rows.set(row.id,row);indices.push(i);}}
 return{rows,indices,complete:rows.size===wanted.size,visited};
}
export function foliageScatterGrid(instances,center,radius,minDistance){
 const grid=new Map(),at=p=>[Math.floor(p[0]/minDistance),Math.floor(p[2]/minDistance)],put=p=>{const key=at(p).join(':');let bucket=grid.get(key);if(!bucket)grid.set(key,bucket=[]);bucket.push(p);},margin=radius+minDistance;let included=0;
 for(const item of instances){const p=item.position;if(Math.abs(p[0]-center[0])<=margin&&Math.abs(p[2]-center[1])<=margin){put(p);included++;}}
 return{grid,at,put,included};
}
export function foliageOutsideCircle(position,center,radius){return Math.abs(position[0]-center[0])>radius||Math.abs(position[2]-center[1])>radius||Math.hypot(position[0]-center[0],position[2]-center[1])>radius;}
