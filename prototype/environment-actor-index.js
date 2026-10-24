import {sceneWorldMatrix,sceneMatrixCache} from './scene-runtime.js';

export const environmentActorIndexContract={cellSize:64,planes:['XY','XZ'],order:'Original world actor order before projection/tests; exact legacy radius filtering and stable score ties.',refresh:'Sync reads current world actors on every query, including parent transforms and pooling. Mutable scene arrays still require O(N) refresh. Only changed/new entries are staged; unchanged flat actors allocate no row/position or matrix pass, and moved cells alone are rewritten. Scratch identities clear on success/failure and hierarchy resolution finishes before publication. Parent matrices share one temporary indexed iterative pass per sync, without a64-depth cap.',scope:'CPU actor-generator broad phase. No actor limit, automatic requery, GPU or whole-frame performance claim.'};
const axesFor=plane=>plane==='XY'?[0,1]:[0,1,2],key=coordinates=>coordinates.join(','),validPosition=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const emptyTags=Object.freeze([]);
export class EnvironmentActorIndex{
 constructor(){this.entries=new Map();this.planes=new Map([['XY',new Map()],['XZ',new Map()]]);this.lastSearch=null;this.syncSeen=new Set();this.lastSync=null;}
 unlink(entry){for(const [plane,cells]of this.planes){const cell=entry.cells.get(plane),bucket=cells.get(cell);bucket.entries.delete(entry);if(!bucket.entries.size)cells.delete(cell);}}
 link(entry){entry.cells=new Map();for(const [plane,cells]of this.planes){const coordinates=axesFor(plane).map(axis=>Math.floor(entry.position[axis]/64)),cell=key(coordinates);let bucket=cells.get(cell);if(!bucket)cells.set(cell,bucket={coordinates,entries:new Set()});bucket.entries.add(entry);entry.cells.set(plane,cell);}}
 sync(objects){
  const seen=this.syncSeen,pending=[],removed=[];let matrices,order=0,scanned=0,parented=0;seen.clear();
  // Stage only changed entries. A late hierarchy error must leave the entire
  // published index intact; scratch identities are released even on failure.
  try{
   for(const object of objects){scanned++;if(object.poolActive===false||['component','widget'].includes(object.kind))continue;const parent=object.parent||object.parentId;let position=object.position,offset=0;
    if(parent){parented++;matrices??=sceneMatrixCache(objects);position=sceneWorldMatrix(object,objects,matrices).elements;offset=12;}
    if(!parent&&!validPosition(position)||parent&&(!position||![0,1,2].every(i=>Number.isFinite(position[i+offset]))))continue;
    seen.add(object);const entry=this.entries.get(object),tags=object.tags||emptyTags,moved=!entry||[0,1,2].some(i=>position[i+offset]!==entry.position[i]);
    if(moved||entry.tags!==tags||entry.order!==order)pending.push({object,entry,position:moved?[position[offset],position[offset+1],position[offset+2]]:entry.position,tags,order,moved});order++;
   }
   for(const [object,entry]of this.entries)if(!seen.has(object))removed.push(entry);
   for(const row of pending){let entry=row.entry;if(!entry){entry={object:row.object,position:row.position,tags:row.tags,order:row.order};this.entries.set(row.object,entry);this.link(entry);}else{if(row.moved){this.unlink(entry);entry.position=row.position;this.link(entry);}entry.tags=row.tags;entry.order=row.order;}}
   for(const entry of removed){this.unlink(entry);this.entries.delete(entry.object);}
   this.lastSync={scanned,parented,staged:pending.length,removed:removed.length,matrixPass:!!matrices};return this;
  }finally{seen.clear();}
 }
 query(origin,radius,plane='XZ'){
  if(!validPosition(origin)||!Number.isFinite(radius)||radius<0||!this.planes.has(plane))throw Error('환경 질의 공간 범위를 확인하세요.');
  const cells=this.planes.get(plane),axes=axesFor(plane),lo=axes.map(i=>Math.floor((origin[i]-radius)/64)),hi=axes.map(i=>Math.floor((origin[i]+radius)/64)),volume=lo.reduce((n,v,i)=>n*(hi[i]-v+1),1),found=[];let visitedCells=0,examinedActors=0;
  const take=bucket=>{if(!bucket)return;visitedCells++;for(const entry of bucket.entries){examinedActors++;found.push(entry);}};
  const direct=Number.isSafeInteger(volume)&&volume<=cells.size&&lo.every(Number.isSafeInteger)&&hi.every(Number.isSafeInteger);
  if(direct){if(plane==='XY'){for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)take(cells.get(key([x,y])));}else for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)take(cells.get(key([x,y,z])));}
  else for(const bucket of cells.values()){visitedCells++;if(bucket.coordinates.every((v,i)=>v>=lo[i]&&v<=hi[i])){for(const entry of bucket.entries){examinedActors++;found.push(entry);}}}
  found.sort((a,b)=>a.order-b.order);this.lastSearch={population:this.entries.size,occupiedCells:cells.size,visitedCells,examinedActors,mode:direct?'coordinates':'occupied-cells',plane};
  return found.map(entry=>({id:entry.object.id,position:[...entry.position],tags:[...entry.tags]}));
 }
 inspect(){return{population:this.entries.size,cellsXY:this.planes.get('XY').size,cellsXYZ:this.planes.get('XZ').size,lastSearch:this.lastSearch?{...this.lastSearch}:null,lastSync:this.lastSync?{...this.lastSync}:null};}
 clear(){this.entries.clear();for(const cells of this.planes.values())cells.clear();this.lastSearch=null;this.lastSync=null;this.syncSeen.clear();}
}
