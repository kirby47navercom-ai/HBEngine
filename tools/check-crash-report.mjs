// Script crash reports: an uncaught exception in a process that installed crash reports leaves a Node diagnostic
// report with the error in the crash folder, and only the newest 10 script reports are kept.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(root,'native/build/crash-report-'));
try{
  for(let i=0;i<11;i++)await fs.writeFile(path.join(dir,`script-old-${i}.json`),'{}');
  const module=pathToFileURL(path.join(root,'tools/crash-report.mjs')).href;
  await new Promise(resolve=>execFile(process.execPath,['-e',`import(${JSON.stringify(module)}).then(m=>{m.installCrashReports('check');setTimeout(()=>{throw new Error('crash-report-check')})})`],{env:{...process.env,HB_CRASH_DIR:dir}},resolve));
  const files=(await fs.readdir(dir)).filter(f=>f.startsWith('script-'));
  const report=files.find(f=>f.startsWith('script-check-'));assert.ok(report,'report written');
  assert.match(await fs.readFile(path.join(dir,report),'utf8'),/crash-report-check/);
  assert.equal(files.length,11,'10 kept plus the new report');
  console.log(JSON.stringify({passed:true,report}));
}finally{await fs.rm(dir,{recursive:true,force:true});}
