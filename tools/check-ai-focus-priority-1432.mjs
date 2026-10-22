import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {engineContext} from './ai-context.mjs';
const checks=[];
for(const[task,symbol,owner,max]of [
 ['면별 반사','SetFaceFade','native/include/HBEngine/Game.hpp',3],
 ['면별 반사','probeInfluenceWeight','prototype/reflection-probe-influence.js',2],
 ['셰이더 준비 시간','preparationMS','prototype/native-path-preparation.js',2]
]){
 const r=await engineContext({task,symbol,limit:3}),s=r.symbolSearch;
 assert.equal(s.mode,'focused-routes');assert(s.matches.some(m=>m.path===owner));assert(s.filesRead<=max);
 if(symbol==='SetFaceFade')assert(!s.routeFiles.some(p=>p.includes('reflection-probe-influence')),'exact C++ symbol must take priority over the broader task route');
 checks.push({task,symbol,mode:s.mode,filesRead:s.filesRead,bytesRead:s.bytesRead,elapsedMs:r.elapsedMs});
}
const expanded=await engineContext({task:'면별 반사',symbol:'SetFaceFade',limit:3,all:true});assert.equal(expanded.symbolSearch.mode,'all');assert(expanded.symbolSearch.matches.length);
await fs.writeFile('native/build/ai-focus-priority-1432.json',JSON.stringify({passed:true,checks,allStillAvailable:true,scope:'Exact registered symbol owners take priority over broader task words; explicit all-source expansion preserved. Offline local reads only, not model comprehension latency.'},null,2));
console.log(JSON.stringify({passed:true,checks}));
