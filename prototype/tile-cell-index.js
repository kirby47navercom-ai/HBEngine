import {runtimeTileStore,runtimeStoredTile,runtimeTileGroups,editStoredTiles,tileRuntimeStorageContract} from './tile-runtime-storage.js';
const indexes=new WeakMap(),groups=new WeakMap();
export const tileRuntimeIndexContract={storage:'Ordinary immutable JSON tile arrays; input cell order, snapshots and native transport remain unchanged.',edits:'Single/bulk writes deduplicate last values and drop no-ops before copying internal256-slot chunks. JSON arrays materialize once per version on explicit consumer access; bounded lookup/tombstone compaction and full validation/publication remain O(N).',runtimeStorage:tileRuntimeStorageContract,nativeWrites:'Warm native packets coalesce only adjacent distinct non-erasing tileSet writes with one self/target/layer. Reads, processing, duplicate cells, erases, invalid fields and other commands remain barriers; valid prefixes commit before the original error. Cold/stale targets keep the ordinary operation path; existing bulk budget segments, never drops, larger packets.',lookup:'Small-write get/has/size index overlays compact after at most16 generations. Only tile records/index nodes are shared; prior tile arrays/worlds are not retained.',chunks:'Weak rectangular/diagonal group indexes inherit only edited buckets. Render/collision dirty chunk candidates and auto-tile affected indices use these indexes; initial/full rebuilds retain their full behavior.',limits:'No new map/object-count limit, timer, worker, file cache or disk chunk format.'};
const cellKey=(x,y)=>x+':'+y,groupKey=(tile,mode)=>mode==='diagonal'?'d:'+Math.floor((tile.x+tile.y)/32):Math.floor(tile.x/32)+':'+Math.floor(tile.y/32);
function tileGroups(tiles,mode='rectangular'){
 let modes=groups.get(tiles);if(!modes)groups.set(tiles,modes=new Map());let grouped=modes.get(mode);if(!grouped){grouped=new Map();for(const tile of tiles){const key=groupKey(tile,mode);let list=grouped.get(key);if(!list)grouped.set(key,list=[]);list.push(tile);}modes.set(mode,grouped);}return grouped;
}
export function tileCellIndex(tiles){let index=indexes.get(tiles);if(!index){index=new Map();const grouped=new Map(),needGroups=!groups.get(tiles)?.has('rectangular');for(let i=0;i<tiles.length;i++){const tile=tiles[i];index.set(cellKey(tile.x,tile.y),{tile,index:i});if(needGroups){const key=groupKey(tile,'rectangular');let list=grouped.get(key);if(!list)grouped.set(key,list=[]);list.push(tile);}}indexes.set(tiles,index);if(needGroups){let modes=groups.get(tiles);if(!modes)groups.set(tiles,modes=new Map());modes.set('rectangular',grouped);}}return index;}
export function tileAt(layer,x,y){return runtimeTileStore(layer)?runtimeStoredTile(layer,x,y):tileCellIndex(layer.tiles).get(cellKey(x,y))?.tile;}
const removedBefore=(removed,index)=>{let low=0,high=removed.length;while(low<high){const mid=(low+high)>>>1;if(removed[mid]<index)low=mid+1;else high=mid;}return low;};
function inheritedLookup(previous,updates,removed,size){const patch=new Map(updates),removedIndices=[...removed];return{depth:(previous.depth||0)+1,size,get(key){if(patch.has(key))return patch.get(key);const row=previous.get(key);if(!row||!removedIndices.length)return row;const index=row.index-removedBefore(removedIndices,row.index);return index===row.index?row:{tile:row.tile,index};},has(key){return!!this.get(key);}};}
export function inheritTileIndexes(before,after,updates=new Map(),removed=[]){
 const previous=indexes.get(before)||(groups.has(before)&&updates.size?tileCellIndex(before):null);if(previous){if(!updates.size)indexes.set(after,previous);else if((previous.depth||0)<16&&updates.size<Math.max(8,after.length/4))indexes.set(after,inheritedLookup(previous,updates,removed,after.length));}
 const modes=groups.get(before);if(!modes)return;const inherited=new Map();
 for(const[mode,source]of modes){if(!updates.size){inherited.set(mode,source);continue;}const next=new Map(source),dirty=new Map();let reorder=false;for(const[key,row]of updates){const tile=row?.tile,old=previous?.get(key)?.tile;if(!tile&&!old)continue;const id=groupKey(tile||old,mode);let patch=dirty.get(id);if(!patch)dirty.set(id,patch=new Map());patch.set(key,tile);}
  for(const[id,patch]of dirty){const first=source.get(id)?.[0],firstKey=first&&cellKey(first.x,first.y),firstRemoved=firstKey&&patch.has(firstKey)&&patch.get(firstKey)===undefined,list=[];for(const tile of source.get(id)||[]){const key=cellKey(tile.x,tile.y);if(patch.has(key)){const value=patch.get(key);if(value)list.push(value);patch.delete(key);}else list.push(tile);}for(const tile of patch.values())if(tile)list.push(tile);if(list.length){next.set(id,list);reorder||=!!firstRemoved;}else next.delete(id);}
  const position=tile=>{const key=cellKey(tile.x,tile.y);if(updates.has(key))return updates.get(key).index;const row=previous.get(key);return row.index-removedBefore(removed,row.index);};inherited.set(mode,reorder?new Map([...next].sort((a,b)=>position(a[1][0])-position(b[1][0]))):next);
 }groups.set(after,inherited);
}
export function tileCellsForChunks(layer,keys,{layout='rectangular',individual=false}={}){
 if(!keys)return layer.tiles;if(individual==='layer')return keys.has('layer')?layer.tiles:[];
 if(individual){const cells=[];for(const key of keys){const[,x,y]=key.split(':'),tile=tileAt(layer,Number(x),Number(y));if(tile)cells.push(tile);}return cells;}
 const mode=layout==='isometric'?'diagonal':'rectangular',grouped=runtimeTileGroups(layer,mode)||tileGroups(layer.tiles,mode),cells=[];for(const key of keys)for(const tile of grouped.get(key)||[])cells.push(tile);return cells;
}
export function tileCellsInRect(layer,bounds){
 const index=runtimeTileGroups(layer)||tileGroups(layer.tiles),[left,top,right,bottom]=bounds,result=[];if(left>right||top>bottom)return result;const columns=Math.floor(right/32)-Math.floor(left/32)+1,rows=Math.floor(bottom/32)-Math.floor(top/32)+1;
 if(columns*rows>index.size*2+16){for(const group of index.values())for(const tile of group)if(tile.x>=left&&tile.x<=right&&tile.y>=top&&tile.y<=bottom)result.push(tile);return result;}
 for(let y=Math.floor(top/32);y<=Math.floor(bottom/32);y++)for(let x=Math.floor(left/32);x<=Math.floor(right/32);x++)for(const tile of index.get(x+':'+y)||[])if(tile.x>=left&&tile.x<=right&&tile.y>=top&&tile.y<=bottom)result.push(tile);return result;
}
export function setRuntimeTiles(map,layer,cells,indices){
 const requested=new Map(cells.map((cell,i)=>[cellKey(...cell),{x:cell[0],y:cell[1],index:indices[i]}]));for(const[key,value]of requested){const tile=tileAt(layer,value.x,value.y);if(value.index===(tile?.sourceIndex??tile?.index??-1))requested.delete(key);}if(!requested.size)return{data:map,changed:false};
 let next;if(!runtimeTileStore(layer)&&!Object.isFrozen(layer.tiles)){
  const source=layer.tiles,index=tileCellIndex(source),removing=[...requested].some(([key,value])=>value.index<0&&index.has(key)),tiles=removing?[]:[...source],updates=new Map(),removed=[];
  if(removing)for(let i=0;i<source.length;i++){const tile=source[i],key=cellKey(tile.x,tile.y),value=requested.get(key);if(!value)tiles.push(tile);else if(value.index>=0){updates.set(key,{tile:value,index:tiles.length});tiles.push(value);}else{updates.set(key,undefined);removed.push(i);}}
  for(const[key,value]of requested){const row=index.get(key);if(row){if(!removing){tiles[row.index]=value;updates.set(key,{tile:value,index:row.index});}}else if(value.index>=0){updates.set(key,{tile:value,index:tiles.length});tiles.push(value);}}
  inheritTileIndexes(source,tiles,updates,removed);next={...layer,tiles};
 }else next=editStoredTiles(layer,new Map([...requested].map(([key,value])=>[key,value.index<0?undefined:value])),runtimeTileStore(layer)?undefined:groups.get(layer.tiles));
 return{data:{...map,layers:map.layers.map(l=>l===layer?next:l)},changed:true,cells:[...requested.values()].map(v=>[v.x,v.y])};
}
export function setRuntimeTile(map,layer,cell,index){return setRuntimeTiles(map,layer,[cell],[index]);}
