import {registerDeferredTexture} from '../prototype/deferred-texture-source.js';
import {openNativeContent} from './native-package-content.mjs';
import {packagedModuleError} from './packaged-module-error.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage,ImageData,GlobalFonts} from '@napi-rs/canvas';
import * as THREE from 'three';
import {nativeModuleKey} from '../prototype/native-entry.js';
import {NativeHost} from './native-host.mjs';
import {AudioRouting} from '../prototype/audio-mixer.js';

// The package is the only file authority. No local HTTP server, DOM or browser.
export async function openNativePackage(directory){
 const content=await openNativeContent(directory),{root,project,manifest,url,resolve,readBytes,modulePath:confined}=content;
 const host=new NativeHost(),aot=new Map();
 for(const row of manifest.nativeModules||[]){try{aot.set(row.signature,host.registerBinary(await confined(row.binary),row.metadata));}catch(error){await host.close();await content.close();throw packagedModuleError(path.join(root,row.binary),error);}}
 host.build=async(header,source,entry={})=>{const key=createHash('sha256').update(nativeModuleKey(header,source,entry)).digest('hex'),built=aot.get(key);if(!built)throw Error('미리 컴파일한 C++ 모듈이 없어요. 게임을 다시 빌드하세요.');return built;};
 return {root,project,manifest,host,url,resolve,readBytes,close:async()=>{await host.close();await content.close();}};
}

export function installNativeAssets(pack){
 const originalFetch=globalThis.fetch,originalLoad=THREE.TextureLoader.prototype.load;
 globalThis.hbMobileFileUrl=pack.url;globalThis.window={URL,performance:globalThis.performance,crypto:globalThis.crypto,innerWidth:pack.manifest.width,innerHeight:pack.manifest.height};
 globalThis.fetch=async(resource,options={})=>{const url=typeof resource==='string'?resource:resource?.url||String(resource);if(url.startsWith('blob:')||url.startsWith('data:'))return originalFetch(resource,options);if(!url.startsWith('hbasset:'))throw Error('네이티브 패키지의 에셋 주소가 아니에요: '+url);options.signal?.throwIfAborted();let bytes;try{bytes=await pack.readBytes(decodeURIComponent(url.slice(8)),{signal:options.signal});}catch(error){if(error.code==='ENOENT')return new Response(JSON.stringify({error:error.message}),{status:404});throw error;}return new Response(bytes,{status:200,headers:{'Content-Length':String(bytes.length)}});};
 const pixels=async(source)=>{const bytes=typeof source==='string'?/^(blob:|data:)/.test(source)?Buffer.from(await(await originalFetch(source)).arrayBuffer()):await pack.readBytes(source):Buffer.from(source),image=await loadImage(bytes);if(image.width<1||image.height<1||image.width>16384||image.height>16384)throw Error('이미지 크기 한도16384를 확인하세요.');const surface=createCanvas(image.width,image.height),context=surface.getContext('2d');context.drawImage(image,0,0);return {data:new Uint8Array(context.getImageData(0,0,image.width,image.height).data),width:image.width,height:image.height};};
 const texture=async source=>{const p=await pixels(source),out=new THREE.DataTexture(p.data,p.width,p.height);out.flipY=true;out.generateMipmaps=true;out.needsUpdate=true;return out;};
 THREE.TextureLoader.prototype.load=function(url,onLoad,onProgress,onError){const output=new THREE.Texture();this.manager.itemStart(url);pixels(url.startsWith('hbasset:')?decodeURIComponent(url.slice(8)):url).then(image=>{output.image=image;output.needsUpdate=true;onLoad?.(output);this.manager.itemEnd(url);},error=>{onError?.(error);this.manager.itemError(url);this.manager.itemEnd(url);});return output;};
 globalThis.hbNativeCanvas=()=>createCanvas(1,1);globalThis.ImageData=ImageData;globalThis.OffscreenCanvas=class {constructor(w,h){return createCanvas(w,h);}};
 globalThis.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));
 globalThis.hbNativeLoadImage=async(url,signal)=>{signal?.throwIfAborted();return loadImage(await pack.readBytes(decodeURIComponent(url.slice(8)),{signal}));};
 globalThis.hbNativeImagePixels=(image,flip)=>{const surface=createCanvas(image.width,image.height),context=surface.getContext('2d');if(flip){context.translate(0,image.height);context.scale(1,-1);}context.drawImage(image,0,0);return {width:image.width,height:image.height,data:context.getImageData(0,0,image.width,image.height).data};};
 const modelTexture=async source=>{const out=new THREE.DataTexture(null,1,1);out.flipY=true;out.generateMipmaps=true;return registerDeferredTexture(out,()=>pixels(source));};
 return {pixels,texture,modelTexture,restore(){THREE.TextureLoader.prototype.load=originalLoad;globalThis.fetch=originalFetch;delete globalThis.hbMobileFileUrl;delete globalThis.window;delete globalThis.createImageBitmap;delete globalThis.OffscreenCanvas;delete globalThis.ImageData;delete globalThis.hbNativeCanvas;delete globalThis.hbNativeLoadImage;delete globalThis.hbNativeImagePixels;}};
}

export function createNativeAudioContext(Context,{silent=false,onFallback=()=>{}}={}){
 const settings={sampleRate:48000,latencyHint:'interactive'};if(silent)return new Context({...settings,sinkId:{type:'none'}});
 try{return new Context(settings);}catch(deviceError){let context;try{context=new Context({...settings,sinkId:{type:'none'}});}catch(silentError){throw new AggregateError([deviceError,silentError],'네이티브 오디오 장치와 무음 실행을 모두 시작하지 못했어요.');}onFallback({audible:false,reason:deviceError.message});return context;}
}

export function nativeAudioRouting({readAsset},createContext){
 const routing=new AudioRouting({readAsset});routing.ensure=async()=>{if(routing.disposed)throw Error('오디오 실행이 종료됐어요.');if(!routing.context){routing.context=createContext();routing.destination=routing.context.destination;}return routing.context;};
 // Native audio uses the same PCM player, voice selection and mixer graph.
 // Explicit media-element streaming cannot be emulated by a browserless host.
 const player=routing.player.bind(routing);routing.player=(url,settings={})=>{if(settings.streaming===true)throw Error('네이티브 오디오 스트리밍 디코더가 필요해요. 클립의 스트리밍을 꺼주세요.');return player(url,{...settings,sequencePCM:true});};
 return routing;
}
export {createCanvas,loadImage,GlobalFonts};
