import {PerformanceObserver,monitorEventLoopDelay,performance} from 'node:perf_hooks';

// Report-only observers. Ordinary games do not create timers or request GC.
export class NativeRuntimeTelemetry {
 constructor({enabled=false,label='runtime',eventLimit=128}={}){
  if(!Number.isInteger(eventLimit)||eventLimit<1||eventLimit>4096)throw Error('GC 보고 표본 한도를 확인하세요.');
  this.enabled=enabled;this.label=label;this.limit=eventLimit;this.count=0;this.totalMS=0;this.maxMS=0;this.kinds={};this.bounds=[.25,.5,1,2,4,8,16,32,64,Infinity];this.histogram=new Array(this.bounds.length).fill(0);this.events=[];this.cursor=0;
  if(!enabled)return;
  this.delay=monitorEventLoopDelay({resolution:20});this.delay.enable();
  this.observer=new PerformanceObserver(list=>this.record(list.getEntries()));this.observer.observe({entryTypes:['gc']});this.sample(0);
 }
 record(entries){for(const entry of entries){const duration=entry.duration;this.count++;this.totalMS+=duration;this.maxMS=Math.max(this.maxMS,duration);const kind=String(entry.detail?.kind??0);this.kinds[kind]=(this.kinds[kind]||0)+1;this.histogram[this.bounds.findIndex(bound=>duration<=bound)]++;const event={startUTCMS:performance.timeOrigin+entry.startTime,durationMS:duration,kind:entry.detail?.kind??0,flags:entry.detail?.flags??0};if(this.events.length<this.limit)this.events.push(event);else this.events[this.cursor++%this.limit]=event;}}
 sample(frame){if(!this.enabled)return;this.lastSample={frame,timeUTCMS:performance.timeOrigin+performance.now(),memory:process.memoryUsage(),processCPU:process.cpuUsage(),...typeof process.threadCpuUsage==='function'?{threadCPU:process.threadCpuUsage()}:{}};}
 snapshot(){if(!this.enabled)return {enabled:false};this.record(this.observer.takeRecords());return {enabled:true,label:this.label,memoryScope:'rss/processCPU cover this process; heap/external/arrayBuffers/threadCPU belong to this isolate/thread; arrayBuffers are included in external',sample:this.lastSample,gc:{count:this.count,totalMS:this.totalMS,maxMS:this.maxMS,kinds:{...this.kinds},histogramUpperMS:this.bounds.map(n=>Number.isFinite(n)?n:null),histogramCounts:[...this.histogram],retainedEvents:this.events.length,eventsTruncated:this.count>this.events.length,events:[...this.events].sort((a,b)=>a.startUTCMS-b.startUTCMS)},eventLoopDelay:{resolutionMS:20,samples:this.delay.count,minMS:this.delay.count?this.delay.min/1e6:null,meanMS:this.delay.count?this.delay.mean/1e6:null,maxMS:this.delay.count?this.delay.max/1e6:null,p95MS:this.delay.count?this.delay.percentile(95)/1e6:null}};}
 close(){if(!this.enabled||this.closed)return;this.record(this.observer.takeRecords());this.observer.disconnect();this.delay.disable();this.closed=true;}
}
