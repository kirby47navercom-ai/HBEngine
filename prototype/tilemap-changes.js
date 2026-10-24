// Append dirty coordinates in O(changed cells), snapshot only for a render pass.
export class TilemapChanges{
  constructor(){this.layers=new Map();}
  add(layer,cells){
    if(!cells){this.layers.set(layer,null);return;}
    let pending=this.layers.get(layer);if(pending===null)return;if(!pending)this.layers.set(layer,pending=new Map());
    for(const [x,y]of cells)pending.set(x+':'+y,[x,y]);
  }
  snapshot(){return new Map([...this.layers].map(([id,cells])=>[id,cells===null?null:[...cells.values()].map(cell=>[...cell])]));}
}
export const tilemapChangesContract={pending:'Per-layer keyed dirty cells, last coordinate wins; full-layer invalidation dominates until processing finishes.',cost:'Append in O(changed cells), materialize detached arrays once per render/process. No growing dirty-list copy on each write.',concurrency:'Renderer receives an isolated snapshot; edits during an awaited render retain their revision and pending cells. Stored coordinates cannot alias caller arrays.',remaining:'Actual occupied tile arrays still copy on real edits; disk chunks and full-map JSON validation/freezing are separate costs.'};
