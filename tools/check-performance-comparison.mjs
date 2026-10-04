import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const regression=process.argv.includes('--no-regression'),[beforePath,afterPath,outputPath]=process.argv.slice(2).filter(arg=>arg!=='--no-regression');
if(!beforePath||!afterPath)throw Error('node tools/check-performance-comparison.mjs baseline/acceptance.json current/acceptance.json [comparison.json] [--no-regression]');
const [before,after]=await Promise.all([beforePath,afterPath].map(file=>fs.readFile(file,'utf8').then(JSON.parse)));
for(const key of ['configuration','platform','cpus','memoryGB'])assert.equal(after[key],before[key],'same benchmark condition: '+key);
assert.equal(after.configuration,'release');
const measure=(report,group,count)=>{const value=report[group].find(r=>r.bullets===count);assert.ok(value&&value.fps>0&&Number.isFinite(value.workMs.p95));assert.equal(value.moving,count,'no disabled or stationary bullets');return value;};
const change=(a,b)=>({before:a,after:b,percent:(b/a-1)*100});
const rows=before.cppResults.map(a=>{const b=measure(after,'cppResults',a.bullets);assert.deepEqual(b.size,a.size);return {bullets:a.bullets,loopRate:change(a.fps,b.fps),workP95Ms:change(a.workMs.p95,b.workMs.p95),target60Hz:b.fps>=59&&b.workMs.p95<=1000/60};});
const high=rows.find(r=>r.bullets===480);assert.ok(high.loopRate.after>=high.loopRate.before*(regression ? 0.9 : 1.1),regression?'no >10% C++ high-load throughput regression':'C++ high-load completed-loop rate must improve');assert.ok(high.workP95Ms.after<=high.workP95Ms.before*(regression?1.1:.9),regression?'no >10% C++ high-load p95 work regression':'C++ high-load p95 work must decrease');
for(const count of before.results.map(r=>r.bullets)){const a=measure(before,'results',count),b=measure(after,'results',count);assert.deepEqual(a.size,b.size);assert.ok(b.fps>=a.fps*.9,'no >10% non-native throughput regression');}
for(const r of [before,after]){assert.ok(r.functional.multiTouch);assert.ok(r.functional.audio.state==='running');assert.ok(r.soak.seconds>=30);assert.equal(r.soak.reacquisitions,96);assert.ok(r.soak.movingPerCycle.every(n=>n===480));assert.equal(r.events.length,0);}
assert.ok(after.soak.performance.fps>=before.soak.performance.fps*(regression ? 0.9 : 1.1),regression?'no >10% sustained reuse throughput regression':'sustained reuse throughput must improve');
const nativeCalls=after.nativeTransport.filter(r=>r.mode==='patch');assert.ok(nativeCalls.length);assert.ok(nativeCalls.every(r=>r.upstreamMode==='patch'&&r.returnedObjects===0),'unchanged C++ transforms must not return to the renderer');
const result={before:path.resolve(beforePath),after:path.resolve(afterPath),date:new Date().toISOString(),gate:regression?'no-regression-10-percent':'improvement-10-percent',configuration:after.configuration,cpus:after.cpus,rows,soakLoopRate:change(before.soak.performance.fps,after.soak.performance.fps),limitations:after.limitations};
if(outputPath)await fs.writeFile(outputPath,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
