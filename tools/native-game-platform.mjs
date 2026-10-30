import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage,ImageData,GlobalFonts} from '@napi-rs/canvas';
import * as THREE from 'three';
import {resolveBuildPath} from '../prototype/build-profile.js';
import {nativeModuleKey} from '../prototype/native-entry.js';
import {NativeHost} from './native-host.mjs';
import {AudioRouting} from '../prototype/audio-mixer.js';

// The package is the only file authority. No local HTTP server, DOM or browser.
export async function openNativePackage(directory){
 const root=await fs.realpath(directory),manifest=JSON.parse(await fs.readFile(path.join(root,'game.hbpack.json'),'utf8'));
 if(manifest.version!==1||manifest.windowsRuntime!=='native'||!Array.isArray(manifest.entries))throw Error('네이티브 게임 패키지 형식을 확인하세요.');
 const entries=new Map(manifest.entries.map(row=>[row.path,row]));
 const confined=async(relative,base=root)=>{const file=await fs.realpath(path.resolve(base,relative)),rel=path.relative(base,file);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('패키지 밖의 파일은 읽을 수 없어요.');return file;};
 const contentRoot=await confined('Content');
 const resolve=async name=>{name=resolveBuildPath(name,manifest.redirects);if(!entries.has(name))throw Object.assign(Error('패키지 에셋이 없어요: '+name),{code:'ENOENT'});return confined(name,contentRoot);};
 const project={resolve,read:async name=>{const file=await resolve(name),stat=await fs.stat(file);if(!stat.isFile())throw Error('게임 에셋은 일반 파일이어야 해요.');return {file,size:stat.size};},files:async()=>[...entries.values()]};
 const host=new NativeHost(),aot=new Map();
 for(const row of manifest.nativeModules||[])aot.set(row.signature,host.registerBinary(await confined(row.binary),row.metadata));
 host.build=async(header,source,entry={})=>{const key=createHash('sha256').update(nativeModuleKey(header,source,entry)).digest('hex'),built=aot.get(key);if(!built)throw Error('미리 컴파일한 C++ 모듈이 없어요. 게임을 다시 빌드하세요.');return built;};
 return {root,project,manifest,host,url:name=>'hbasset:'+encodeURIComponent(name),resolve};
}

export function installNativeAssets(pack){
 const originalFetch=globalThis.fetch,originalLoad=THREE.TextureLoader.prototype.load;
 globalThis.hbMobileFileUrl=pack.url;globalThis.window={URL,performance:globalThis.performance,crypto:globalThis.crypto,innerWidth:pack.manifest.width,innerHeight:pack.manifest.height};
 globalThis.fetch=async(resource,options={})=>{const url=typeof resource==='string'?resource:resource?.url||String(resource);if(url.startsWith('blob:')||url.startsWith('data:'))return originalFetch(resource,options);if(!url.startsWith('hbasset:'))throw Error('네이티브 패키지의 에셋 주소가 아니에요: '+url);options.signal?.throwIfAborted();let file;try{file=await pack.resolve(decodeURIComponent(url.slice(8)));}catch(error){if(error.code==='ENOENT')return new Response(JSON.stringify({error:error.message}),{status:404});throw error;}const bytes=await fs.readFile(file,{signal:options.signal});return new Response(bytes,{status:200,headers:{'Content-Length':String(bytes.length)}});};
 const pixels=async(source)=>{const bytes=typeof source==='string'?/^(blob:|data:)/.test(source)?Buffer.from(await(await originalFetch(source)).arrayBuffer()):await fs.readFile(await pack.resolve(source)):Buffer.from(source),image=await loadImage(bytes);if(image.width<1||image.height<1||image.width>16384||image.height>16384)throw Error('이미지 크기 한도16384를 확인하세요.');const surface=createCanvas(image.width,image.height),context=surface.getContext('2d');context.drawImage(image,0,0);return {data:new Uint8Array(context.getImageData(0,0,image.width,image.height).data),width:image.width,height:image.height};};
 const texture=async source=>{const p=await pixels(source),out=new THREE.DataTexture(p.data,p.width,p.height);out.flipY=true;out.generateMipmaps=true;out.needsUpdate=true;return out;};
 THREE.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){const output=new THREE.Texture();this.manager.itemStart(url);pixels(url.startsWith('hbasset:')?decodeURIComponent(url.slice(8)):url).then(image=>{output.image=image;output.needsUpdate=true;onLoad?.(output);this.manager.itemEnd(url);},error=>{onError?.(error);this.manager.itemError(url);this.manager.itemEnd(url);});return output;};
 globalThis.hbNativeCanvas=()=>createCanvas(1,1);globalThis.ImageData=ImageData;globalThis.OffscreenCanvas=class {constructor(w,h){return createCanvas(w,h);}};
 globalThis.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));
 globalThis.hbNativeLoadImage=async(url,signal)=>{signal?.throwIfAborted();const file=await pack.resolve(decodeURIComponent(url.slice(8)));return loadImage(await fs.readFile(file,{signal}));};
 globalThis.hbNativeImagePixels=(image,flip)=>{const surface=createCanvas(image.width,image.height),context=surface.getContext('2d');if(flip){context.translate(0,image.height);context.scale(1,-1);}context.drawImage(image,0,0);return {width:image.width,height:image.height,data:context.getImageData(0,0,image.width,image.height).data};};
 return {pixels,texture,restore(){THREE.TextureLoader.prototype.load=originalLoad;globalThis.fetch=originalFetch;delete globalThis.hbMobileFileUrl;delete globalThis.window;delete globalThis.createImageBitmap;delete globalThis.OffscreenCanvas;delete globalThis.ImageData;delete globalThis.hbNativeCanvas;delete globalThis.hbNativeLoadImage;delete globalThis.hbNativeImagePixels;}};
}

export function nativeAudioRouting({readAsset},createContext){
 const routing=new AudioRouting({readAsset});routing.ensure=async()=>{if(routing.disposed)throw Error('오디오 실행이 종료됐어요.');if(!routing.context){routing.context=createContext();routing.destination=routing.context.destination;}return routing.context;};
 // Native audio uses the same PCM player, voice selection and mixer graph.
 // Explicit media-element streaming cannot be emulated by a browserless host.
 const player=routing.player.bind(routing);routing.player=(url,settings={})=>{if(settings.streaming===true)throw Error('네이티브 오디오 스트리밍 디코더가 필요해요. 클립의 스트리밍을 꺼주세요.');return player(url,{...settings,sequencePCM:true});};
 return routing;
}
export {createCanvas,loadImage,GlobalFonts};
