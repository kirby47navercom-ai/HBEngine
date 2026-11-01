import {createCanvas} from '@napi-rs/canvas';

// Only decoded static assets opt in. Mutable canvases and animated images stay live.
const staticImages=new WeakSet(),contexts=new WeakMap(),maxBytes=8*1024*1024,maxEntries=32;
export function staticWidgetImage(image){staticImages.add(image);return image;}
function release(state,ticket){const entry=ticket.ref.deref();if(entry){entry.canvas.width=entry.canvas.height=1;entry.canvas=null;entry.variants.delete(entry.key);}state.bytes-=ticket.bytes;state.entries.delete(ticket);}
export function clearWidgetImageCache(ctx){const state=contexts.get(ctx);if(state)for(const ticket of state.entries)release(state,ticket);contexts.delete(ctx);}
export function widgetImageCacheInfo(ctx){const s=contexts.get(ctx);return s?{bytes:s.bytes,entries:s.entries.size,hits:s.hits,misses:s.misses}:{bytes:0,entries:0,hits:0,misses:0};}
export function cachedWidgetImage(ctx,image,width,height,p,scale,paint){
 if(!staticImages.has(image)||ctx.globalAlpha!==1||ctx.globalCompositeOperation!=='source-over'||ctx.filter!=='none'||!['rgba(0, 0, 0, 0)','#00000000','transparent'].includes(ctx.shadowColor)||ctx.shadowBlur||ctx.shadowOffsetX||ctx.shadowOffsetY||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||image.width*image.height<width*height*4)return false;
 const matrix=ctx.getTransform();if(matrix.a!==1||matrix.b||matrix.c||matrix.d!==1||!Number.isInteger(matrix.e)||!Number.isInteger(matrix.f))return false;
 const bytes=width*height*4;if(bytes>maxBytes)return false;
 let state=contexts.get(ctx);if(!state){state={images:new WeakMap(),entries:new Set(),bytes:0,hits:0,misses:0};contexts.set(ctx,state);}
 const key=[width,height,p.imageFit,p.imageRendering,scale,ctx.imageSmoothingQuality,...(p.nineSlice||[0,0,0,0])].join(':'),variants=state.images.get(image)||new Map(),old=variants.get(key),now=performance.now();
 if(old?.canvas&&old.key===key){old.used=now;state.hits++;ctx.drawImage(old.canvas,0,0);return true;}
 state.misses++;
 // Do not churn a full cache each frame when a HUD has more images than fit.
 for(const ticket of state.entries){const entry=ticket.ref.deref();if(!entry||now-entry.used>1000)release(state,ticket);}
 if(state.bytes+bytes>maxBytes||state.entries.size>=maxEntries)return false;
 const canvas=createCanvas(width,height),target=canvas.getContext('2d');target.imageSmoothingQuality=ctx.imageSmoothingQuality;
 try{paint(target,image,width,height,p,scale);}catch(error){canvas.width=canvas.height=1;throw error;}
 const entry={canvas,key,used:now,variants},ticket={ref:new WeakRef(entry),bytes};entry.ticket=ticket;variants.set(key,entry);state.images.set(image,variants);state.entries.add(ticket);state.bytes+=bytes;
 ctx.drawImage(canvas,0,0);return true;
}
