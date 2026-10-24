import {sceneWorldMatrix} from './scene-runtime.js';

export const environmentActorIndexContract={cellSize:64,planes:['XY','XZ'],order:'Original world actor order before projection/tests; exact legacy radius filtering and stable score ties.',refresh:'Sync reads current world actors on every query, including parent transforms and pooling. Mutable scene arrays still require O(N) refresh; only moved cells are rewritten.',scope:'CPU actor-generator broad phase. No actor limit, automatic requery, GPU or whole-frame performance claim.'};
const axesFor=plane=>plane==='XY'?[0,1]:[0,1,2],key=coordinates=>coordinates.join(','),validPosition=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export class EnvironmentActorIndex{
 constructor(){this.entries=new Map();this.planes=new Map([['XY',new Map()],['XZ',new Map()]]);this.lastSearch=null;}
 unlink(entry){for(const [plane,cells]of this.planes){const cell=entry.cells.get(plane),bucket=cells.get(cell);bucket.entries.delete(entry);if(!bucket.entries.size)cells.delete(cell);}}
 link(entry){entry.cells=new Map();for(const [plane,cells]of this.planes){const coordinates=axesFor(plane).map(axis=>Math.floor(entry.position[axis]/64)),cell=key(coordinates);let bucket=cells.get(cell);if(!bucket)cells.set(cell,bucket={coordinates,entries:new Set()});bucket.entries.add(entry);entry.cells.set(plane,cell);}}
 sync(objects){
  const matrices=new Map(),rows=[];let order=0;
  // Finish transform resolution before publishing any index mutations.
  for(const object of objects){if(object.poolActive===false||['component','widget'].includes(object.kind))continue;const position=object.parent||object.parentId?sceneWorldMatrix(object,objects,matrices).elements.slice(12,15):object.position;if(validPosition(position))rows.push({object,position,tags:object.tags||[],order:order++});}
  const seen=new Set();for(const row of rows){seen.add(row.object);let entry=this.entries.get(row.object);if(!entry){entry={...row,position:[...row.position]};this.entries.set(row.object,entry);this.link(entry);}else{if(row.position.some((v,i)=>v!==entry.position[i])){this.unlink(entry);entry.position=[...row.position];this.link(entry);}entry.tags=row.tags;entry.order=row.order;}}
  for(const [object,entry]of this.entries)if(!seen.has(object)){this.unlink(entry);this.entries.delete(object);}return this;
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
 inspect(){return{population:this.entries.size,cellsXY:this.planes.get('XY').size,cellsXYZ:this.planes.get('XZ').size,lastSearch:this.lastSearch?{...this.lastSearch}:null};}
 clear(){this.entries.clear();for(const cells of this.planes.values())cells.clear();this.lastSearch=null;}
}
