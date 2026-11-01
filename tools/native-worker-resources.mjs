import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

// Link metadata into the first complete PE image. Do not create a bare worker
// executable and wait until packaging to give it a Windows identity.
export async function nativeWorkerResource(directory,compiler,{signal}={}){
 if(process.platform!=='win32')return null;
 const file=path.join(directory,'worker-resource.o'),rc=path.join(directory,'worker.rc'),manifest=path.join(directory,'worker.manifest');
 await fs.writeFile(manifest,'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0"><assemblyIdentity type="win32" name="HBEngine.NativeModule" version="0.1.0.0" processorArchitecture="amd64"/><trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security></trustInfo></assembly>');
 await fs.writeFile(rc,'#include <windows.h>\n1 RT_MANIFEST "worker.manifest"\n1 VERSIONINFO\nFILEVERSION 0,1,0,0\nPRODUCTVERSION 0,1,0,0\nFILEOS 0x40004\nFILETYPE 1\nBEGIN\n BLOCK "StringFileInfo" BEGIN BLOCK "040904b0" BEGIN VALUE "FileDescription", "HBEngine C++ Game Module\\0" VALUE "ProductName", "HBEngine Game Runtime\\0" VALUE "OriginalFilename", "worker.exe\\0" VALUE "FileVersion", "0.1.0.0\\0" END END\n BLOCK "VarFileInfo" BEGIN VALUE "Translation", 0x409,1200 END\nEND\n');
 const windres=path.join(path.dirname(compiler),'windres.exe');await promisify(execFile)(windres,['--use-temp-file','-I','.', 'worker.rc','worker-resource.o'],{cwd:directory,windowsHide:true,signal,timeout:30000,maxBuffer:1048576,env:{...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH}});
 return file;
}
