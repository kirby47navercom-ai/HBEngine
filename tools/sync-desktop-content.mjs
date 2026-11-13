import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {portableWindowsRuntime} from './windows-portable-runtime.mjs';
const root=path.resolve(import.meta.dirname,'..');
// Never package another editor's in-progress player/catalog/test edits.
export const desktopSourceExclusions=new Set(['prototype/player.js','tools/check-player-keyboard-release.mjs','docs/NODE_CATALOG.md']);
export async function syncDesktopContent(output=path.join(root,'dist/HBEngineNative'),{portableFrom=output}={}){
 const dirs=['prototype','tools','docs','native/include','native/desktop','native/mobile','node_modules/ws','node_modules/three','node_modules/xatlas-wasm','node_modules/@dimforge/rapier2d-compat','node_modules/@dimforge/rapier3d-compat','node_modules/node-web-audio-api','node_modules/@napi-rs/canvas','node_modules/@napi-rs/canvas-win32-x64-msvc','node_modules/caller','node_modules/node-fetch','node_modules/data-uri-to-buffer','node_modules/fetch-blob','node_modules/formdata-polyfill','node_modules/node-domexception','node_modules/web-streams-polyfill','node_modules/webidl-conversions'];
 for(const name of dirs)await fs.cp(path.join(root,name),path.join(output,name),{recursive:true,filter:file=>!file.includes(path.sep+'screenshots'+path.sep)&&!desktopSourceExclusions.has(path.relative(root,file).split(path.sep).join('/'))&&(!file.endsWith('.node')||file.includes('win32-x64-msvc'))});
 for(const name of ['package.json','AGENTS.md','CLAUDE.md','CODEX_HANDOFF.md','DEBUG_HANDOFF.md'])await fs.copyFile(path.join(root,name),path.join(output,name));
 const vc=await portableWindowsRuntime(portableFrom);for(const target of vc.targets){await fs.mkdir(path.dirname(path.join(output,target)),{recursive:true});if(path.resolve(vc.file)!==path.resolve(output,target))await fs.copyFile(vc.file,path.join(output,target));}
 await fs.mkdir(path.join(output,'licenses'),{recursive:true});await fs.writeFile(path.join(output,'licenses/Microsoft-VC-Runtime.txt'),'Microsoft Visual C++ v14 x64 Runtime\nRedistributable component: VCRUNTIME140.dll\nPublisher: Microsoft Corporation\nhttps://learn.microsoft.com/cpp/windows/redistributing-visual-cpp-files\nhttps://aka.ms/vs/17/redist.txt\n');
 return {output,excluded:[...desktopSourceExclusions],directories:dirs.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await syncDesktopContent(process.argv[2])));
