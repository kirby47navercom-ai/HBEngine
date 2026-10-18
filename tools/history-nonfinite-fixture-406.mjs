import {sameHistoryValue,sameHistorySurface,sameHistoryCoat,surfaceHistoryGLSL} from '../prototype/path-surface-history.js';
export function historyCases406(){
 const rows=[],base=[.8,.02,0,1.5],add=(now,old,label)=>rows.push({now,old,label,expected:[sameHistoryValue(now,old),sameHistorySurface(now,old),sameHistoryCoat(now,old)].map(Number)});
 add(base,base,'equal');add(base,[.8001,.0201,0,1.5],'within tolerance');add(base,[.8,.04,0,1.5],'roughness changed');add(base,[.8,.02,0,1.50001],'IOR exact');
 for(const bad of [NaN,Infinity,-Infinity])for(let channel=0;channel<4;channel++)for(let side=0;side<2;side++){const pair=[base.slice(),base.slice()];pair[side][channel]=bad;add(...pair,(Number.isNaN(bad)?'NaN':String(bad))+':'+channel+':'+side);}
 return rows;
}
export const historyFunctions406=()=>['Value','Surface','Coat'].map(name=>surfaceHistoryGLSL.match(new RegExp('bool hbPathSame'+name+'\\([^]*?}'))[0]).join('\n');
export const encodeHistory406=rows=>rows.map(row=>({...row,now:row.now.map(v=>Number.isFinite(v)?v:String(v)),old:row.old.map(v=>Number.isFinite(v)?v:String(v))}));
