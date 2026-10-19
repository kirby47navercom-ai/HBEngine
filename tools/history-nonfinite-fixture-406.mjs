import {sameHistoryValue,sameHistorySurface,sameHistoryCoat,sameHistoryLobes,surfaceHistoryGLSL} from '../prototype/path-surface-history.js';
export function historyCases406(){
 const rows=[],base=[.8,.02,0,1.5],add=(now,old,label)=>rows.push({now,old,label,expected:[sameHistoryValue(now,old),sameHistorySurface(now,old),sameHistoryCoat(now,old),sameHistoryLobes(now,old)].map(Number)});
 add(base,base,'equal');add(base,[.8,.02,.2,1.5],'anisotropy changed');add(base,[.8,.02,0,1.7],'anisotropy rotation changed');add(base,[.8,.02,.0001,1.5001],'lobe channels within tolerance');add([.5001,.02,0,1],[.4999,.02,0,1],'coat amount branch');add([1,.0499,0,1],[1,.0501,0,1],'coat roughness branch');add(base,[.8001,.0201,0,1.5],'within tolerance');add(base,[.8,.04,0,1.5],'roughness changed');add(base,[.8,.02,0,1.50001],'IOR exact');
 for(const bad of [NaN,Infinity,-Infinity])for(let channel=0;channel<4;channel++)for(let side=0;side<2;side++){const pair=[base.slice(),base.slice()];pair[side][channel]=bad;add(...pair,(Number.isNaN(bad)?'NaN':String(bad))+':'+channel+':'+side);}
 return rows;
}
export const historyFunctions406=()=>['Value','Surface','Coat','Lobes'].map(name=>surfaceHistoryGLSL.match(new RegExp('bool hbPathSame'+name+'\\([^]*?}'))[0]).join('\n');
export const encodeHistory406=rows=>rows.map(row=>({...row,now:row.now.map(v=>Number.isFinite(v)?v:String(v)),old:row.old.map(v=>Number.isFinite(v)?v:String(v))}));
