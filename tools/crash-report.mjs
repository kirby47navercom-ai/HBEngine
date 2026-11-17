// Script process crash reports: Node's diagnostic report (stack, heap, handles) on an uncaught exception or fatal
// error goes next to the C++ minidumps in %LOCALAPPDATA%/HBEngine/Crashes; the newest 10 reports are kept.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function installCrashReports(name){
  try{
    const dir=process.env.HB_CRASH_DIR||path.join(process.env.LOCALAPPDATA||os.tmpdir(),'HBEngine','Crashes');
    fs.mkdirSync(dir,{recursive:true});
    const old=fs.readdirSync(dir).filter(f=>f.startsWith('script-')&&f.endsWith('.json')).map(f=>({f,t:fs.statSync(path.join(dir,f)).mtimeMs})).sort((a,b)=>b.t-a.t);
    for(const {f} of old.slice(10))fs.rmSync(path.join(dir,f),{force:true});
    // Node's own report writer fails silently on non-ASCII folders (e.g. a Korean user name), so uncaught exceptions are written here;
    // the fatal-error report (out of memory) can only use Node's writer and is enabled for ASCII folders.
    const file=path.join(dir,`script-${name}-${process.pid}-${Date.now()}.json`);
    process.on('uncaughtExceptionMonitor',error=>{try{fs.writeFileSync(file,JSON.stringify(process.report.getReport(error)));}catch{}});
    if(/^[ -~]*$/.test(dir))Object.assign(process.report,{directory:dir,filename:path.basename(file),reportOnFatalError:true});
    return dir;
  }catch{return null;}
}
