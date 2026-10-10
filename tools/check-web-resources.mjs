import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './build-game.mjs';
import {packWebResources} from './pack-web-resources.mjs';
import {loadWebResources} from '../prototype/web-player.js';

const base=path.resolve('native/build');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(path.join(base,'web-resources-')),files=[];
for(const [name,text] of [['Content/Assets/이동/S_Idle.hbsprite.json','{"texture":"Assets/이동/idle.svg"}'],['Content/Assets/이동/idle.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>']]){const bytes=Buffer.from(text);await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),bytes);files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});}
await fs.writeFile(path.join(root,'unlisted.png'),'private excluded pixels');
const manifest={files};await packWebResources(root,manifest);const binary=await fs.readFile(path.join(root,'game.resources.bin'));assert.equal(binary.includes(Buffer.from('private excluded pixels')),false,'only manifest-declared cooked files can enter the pack');
let requests=0,release;const host={URL,addEventListener:(name,fn)=>{assert.equal(name,'pagehide');release=fn;}},baseURL=new URL('https://example.test/Auric_Loop/main/');
const read=async name=>{requests++;assert.equal(name,'game.resources.bin');return new Response(binary);};
const cache=await loadWebResources(manifest.webResources,read,baseURL,host);assert.equal(requests,1);assert.equal(cache.assets.size,2);assert.equal(JSON.parse(await cache.assets.get(files[0].path).text()).texture,'Assets/이동/idle.svg');
const url=cache.urls.get(new URL(files[1].path.split('/').map(encodeURIComponent).join('/'),baseURL).href);assert.match(await(await fetch(url)).text(),/<rect/);release({persisted:true});assert.equal(cache.assets.size,2);assert.match(await(await fetch(url)).text(),/<rect/,'back/forward cache retains resources');release({persisted:false});assert.equal(cache.assets.size,0);assert.equal(cache.urls.size,0);await assert.rejects(()=>fetch(url));
const created=[];const invalidHost={URL:{createObjectURL:blob=>{created.push(blob);return 'invalid';}}};
for(const changes of [{path:'../escape.bin'},{bytes:binary.length+1},{files:[{...manifest.webResources.files[0],path:'Content/../escape.svg'}]},{files:[{...manifest.webResources.files[0],offset:1}]},{files:[...manifest.webResources.files,manifest.webResources.files[0]]}])await assert.rejects(()=>loadWebResources({...manifest.webResources,...changes},read,baseURL,invalidHost),/형식|크기|범위/);
assert.equal(created.length,0,'validate the full table before creating any Blob URLs');assert.equal((await loadWebResources(undefined,()=>{throw Error('legacy must not fetch');},baseURL)).assets.size,0);
const corrupt={files:[{...files[0],sha256:'0'.repeat(64)}]};await assert.rejects(()=>packWebResources(root,corrupt),/해시/);
console.log('Web resources: one download, Korean paths, exact bytes, public exclusions, invalid table/hash rejection, legacy and Blob release passed');
