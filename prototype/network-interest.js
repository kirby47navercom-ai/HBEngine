import {validInterest} from './network-state.js';
// One center bucket per actor. The power-of-two cell is at least its radius,
// so a point query needs only the 27 neighboring cells at each occupied level.
export class ReplicaInterestIndex {
 constructor(){this.entries=new Map();this.levels=new Map();this.global=new Set();this.owners=new Map();this.queries=0;this.lastCandidates=0;this.unchangedUpdates=0;}
 remove(id){const row=this.entries.get(id);if(!row)return false;this.entries.delete(id);const owned=this.owners.get(row.owner);owned.delete(id);if(!owned.size)this.owners.delete(row.owner);if(row.group==='global')this.global.delete(id);else if(row.group==='spatial'){const cells=this.levels.get(row.level),ids=cells.get(row.cell);ids.delete(id);if(!ids.size)cells.delete(row.cell);if(!cells.size)this.levels.delete(row.level);}return true;}
 set(id,influence){
  const owner=influence.owner,radius=influence.relevancy?.radius||0;let group='spatial',level,cell;
  if(influence.deleted||!influence.relevancy?.ownerOnly&&(!radius||!influence.position))group='global';else if(influence.relevancy?.ownerOnly)group='owner';
  else{level=Math.max(0,Math.ceil(Math.log2(radius)));const size=2**level;cell=influence.position.map(v=>Math.floor(v/size)).join(',');}
  const old=this.entries.get(id);if(old&&old.owner===owner&&old.group===group&&old.level===level&&old.cell===cell){this.unchangedUpdates++;return false;}this.remove(id);const row={owner,group,level,cell};this.entries.set(id,row);if(!this.owners.has(owner))this.owners.set(owner,new Set());this.owners.get(owner).add(id);
  if(group==='global')this.global.add(id);else if(group==='spatial'){if(!this.levels.has(level))this.levels.set(level,new Map());const cells=this.levels.get(level);if(!cells.has(cell))cells.set(cell,new Set());cells.get(cell).add(id);}return true;
 }
 candidates(peer){
  this.queries++;if(peer.authority){const ids=new Set(this.entries.keys());this.lastCandidates=ids.size;return ids;}const position=peer.interest||[0,0,0];if(!validInterest(position))throw Error('관심 위치의 범위를 확인하세요.');const result=new Set(this.global);for(const id of this.owners.get(peer.id)||[])result.add(id);
  for(const [level,cells]of this.levels){const size=2**level,[x,y,z]=position.map(v=>Math.floor(v/size));for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)for(const id of cells.get([x+i,y+j,z+k].join(','))||[])result.add(id);}
  this.lastCandidates=result.size;return result;
 }
 inspect(){return {entries:this.entries.size,global:this.global.size,ownerGroups:this.owners.size,levels:this.levels.size,cells:[...this.levels.values()].reduce((n,cells)=>n+cells.size,0),queries:this.queries,lastCandidates:this.lastCandidates,unchangedUpdates:this.unchangedUpdates};}
 clear(){this.entries.clear();this.levels.clear();this.global.clear();this.owners.clear();this.lastCandidates=0;}
}
