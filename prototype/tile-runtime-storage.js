import {immutableNativeLazyRecord,immutableNativeSnapshot} from './native-transport.js';

// Internal slots retain authored order through erases. Only materialization
// compacts them into the existing JSON array; no previous world/layer is held.
const stores=new WeakMap(),chunkSize=256,keyOf=t=>t.x+':'+t.y;
const groupOf=(tile,mode)=>mode==='diagonal'?'d:'+Math.floor((tile.x+tile.y)/32):Math.floor(tile.x/32)+':'+Math.floor(tile.y/32);
function indexed(chunks){const index=new Map();for(let c=0;c<chunks.length;c++)for(let i=0;i<chunks[c].length;i++){const tile=chunks[c][i];if(tile)index.set(keyOf(tile),{tile,slot:c*chunkSize+i});}return index;}
function store(layer,seedGroups){let s=stores.get(layer);if(!s){const tiles=layer.tiles,chunks=[];for(let i=0;i<tiles.length;i+=chunkSize)chunks.push(tiles.slice(i,i+chunkSize));s={chunks,length:tiles.length,size:tiles.length,index:indexed(chunks),depth:0,spatial:new Map(seedGroups||[]),array:tiles,materializations:0,copiedChunks:0};stores.set(layer,s);}return s;}
export function runtimeTileStore(layer){return stores.get(layer);}
export function runtimeStoredTile(layer,x,y){return stores.get(layer)?.index.get(x+':'+y)?.tile;}
export function runtimeTileCount(layer){return stores.get(layer)?.size??layer.tiles.length;}
export function runtimeTileGroups(layer,mode='rectangular'){
 const s=stores.get(layer);if(!s)return null;let grouped=s.spatial.get(mode);if(!grouped){grouped=new Map();for(const chunk of s.chunks)for(const tile of chunk)if(tile){const key=groupOf(tile,mode);let list=grouped.get(key);if(!list)grouped.set(key,list=[]);list.push(tile);}s.spatial.set(mode,grouped);}return grouped;
}
function inheritSpatial(before,next,updates){
 const result=new Map();for(const [mode,source]of before.spatial){const groups=new Map(source),dirty=new Map();let reorder=false;
  for(const [key,row]of updates){const tile=row?.tile||before.index.get(key)?.tile;if(!tile)continue;const id=groupOf(tile,mode);let patch=dirty.get(id);if(!patch)dirty.set(id,patch=new Map());patch.set(key,row?.tile);}
  for(const [id,patch]of dirty){const old=source.get(id)||[],first=old[0]&&keyOf(old[0]);if(first&&patch.has(first)&&!patch.get(first))reorder=true;const list=[];for(const tile of old){const key=keyOf(tile);if(patch.has(key)){const value=patch.get(key);if(value)list.push(value);patch.delete(key);}else list.push(tile);}for(const tile of patch.values())if(tile)list.push(tile);if(list.length)groups.set(id,list);else groups.delete(id);}
  result.set(mode,reorder?new Map([...groups].sort((a,b)=>next.index.get(keyOf(a[1][0])).slot-next.index.get(keyOf(b[1][0])).slot)):groups);
 }return result;
}
function publish(layer,s,overrides={}){
 const fields=Object.fromEntries(Object.keys(layer).filter(key=>key!=='tiles').map(key=>[key,layer[key]]));Object.assign(fields,overrides);
 const next=immutableNativeLazyRecord(fields,'tiles',()=>{if(!s.array){s.materializations++;const tiles=[];for(const chunk of s.chunks)for(const tile of chunk)if(tile)tiles.push(tile);s.array=tiles;}return s.array;});stores.set(next,s);return next;
}
export function runtimeLayerVisible(layer,visible){const s=stores.get(layer);return s?publish(layer,s,{visible}):{...layer,visible};}
export function clearRuntimeTileLayer(layer){return publish(layer,{chunks:[],length:0,size:0,index:new Map(),depth:0,spatial:new Map(),materializations:0,copiedChunks:0});}
export function editStoredTiles(layer,records,seedGroups){
 const before=store(layer,seedGroups),chunks=before.chunks.slice(),dirty=new Map(),patch=new Map();let length=before.length,size=before.size;
 const write=(slot,tile)=>{const c=Math.floor(slot/chunkSize);let chunk=dirty.get(c);if(!chunk){chunk=(chunks[c]||[]).slice();dirty.set(c,chunk);chunks[c]=chunk;}chunk[slot%chunkSize]=tile;};
 for(const [key,value]of records){const previous=patch.has(key)?patch.get(key):before.index.get(key);if(value){const tile=immutableNativeSnapshot({...value},{clone:false}),slot=previous?.slot??length++;write(slot,tile);patch.set(key,{tile,slot});if(!previous)size++;}else if(previous){write(previous.slot,null);patch.set(key,undefined);size--;}}
 // Bound tombstones and lookup ancestry. Rebuild slots only when erases leave
 // substantial holes, rather than shifting every later tile on each erase.
 let depth=before.depth+1,index;
 if(length>size*2+chunkSize){const compact=[];for(const chunk of chunks)for(const tile of chunk)if(tile)compact.push(tile);chunks.length=0;for(let i=0;i<compact.length;i+=chunkSize)chunks.push(compact.slice(i,i+chunkSize));length=size;depth=0;index=indexed(chunks);}
 else if(depth>=16){index=indexed(chunks);depth=0;}
 else {const previous=before.index;index={get(key){return patch.has(key)?patch.get(key):previous.get(key);}};}
 const next={chunks,length,size,index,depth,materializations:0,copiedChunks:dirty.size};next.spatial=inheritSpatial(before,next,patch);return publish(layer,next);
}
export const tileRuntimeStorageContract=Object.freeze({storage:'Immutable runtime layers use internal256-slot chunks and bounded16-level lookup overlays; erases use ordered tombstones and compact when holes exceed half plus one chunk. No prior world/layer retained.',publication:'The tiles property materializes one cached ordinary frozen JSON array per version only when a consumer requests it. JSON/native transport, structuredClone, render/collision and disk schema retain existing arrays.',cost:'Small writes copy the chunk directory and touched chunks, not every occupied tile. Lookup compaction every16 versions and tombstone compaction remain O(N); full publication, validation/render and large operations remain separate costs.'});
