import {nativeUITilePacket} from './native-ui-tiles.mjs';
// Native Skia data is premultiplied RGBA8. Retain those exact bytes across
// the process boundary; the older PNG path remains a bounded fallback.
import * as zlib from 'node:zlib';
import {promisify} from 'node:util';
const compress=typeof zlib.zstdCompress==='function'?promisify(zlib.zstdCompress):null;
const frames=new WeakMap(),pending=new WeakMap();
export function resetNativeUIFrame(canvas){frames.delete(canvas);pending.delete(canvas);}
export function acknowledgeNativeUIFrame(canvas,frame){const next=pending.get(canvas);if(!next||next.frame!==frame)throw Error("Native UI acknowledgment mismatch");frames.set(canvas,next.state);pending.delete(canvas);}
export function nativeUIFrameMemory(canvas){const a=frames.get(canvas),b=pending.get(canvas)?.state;return {acknowledgedBytes:a?.bytes.length||0,scratchBytes:a?.buffer?.length||0,pendingBytes:b?.bytes.length||0};}
export async function encodeNativeUIFrame(canvas,{raw=false}={}){
 pending.delete(canvas);
 const width=canvas.width,height=canvas.height;
 if(width>7680||height>4320||width<1||height<1)throw Error('Native UI dimensions invalid');
 if(!raw&&!compress){resetNativeUIFrame(canvas);return {png:(await canvas.encode('png')).toString('base64')};}const bytes=canvas.data();
 if(bytes.length!==width*height*4){resetNativeUIFrame(canvas);return {png:(await canvas.encode('png')).toString('base64')};}
 const prior=frames.get(canvas),sequence=prior&&prior.sequence<Number.MAX_SAFE_INTEGER?prior.sequence+1:1;
 if(raw){if(prior&&prior.width===width&&prior.height===height&&bytes.equals(prior.bytes))return null;const tiles=prior&&sequence>1&&prior.width===width&&prior.height===height?nativeUITilePacket(bytes,prior.bytes,width,height):null;const frame={encoding:tiles?'pipe-rgba8-premultiplied-tiles':'pipe-rgba8-premultiplied',width,height,sequence,pixels:tiles||bytes};pending.set(canvas,{frame,state:{width,height,bytes,sequence}});return frame;}
 let input=bytes,delta=false,buffer,rect;
 if(prior&&sequence>1&&prior.width===width&&prior.height===height&&prior.bytes.length===bytes.length){
  if(bytes.equals(prior.bytes))return null;
  // Bound exact changed pixels before compression. Native Buffer comparisons
  // skip unchanged rows; transparent erasure remains part of the rectangle.
  const stride=width*4,equalRow=y=>bytes.subarray(y*stride,(y+1)*stride).equals(prior.bytes.subarray(y*stride,(y+1)*stride));
  let top=0,bottom=height-1,left=width,right=-1;while(top<height&&equalRow(top))top++;while(bottom>top&&equalRow(bottom))bottom--;
  const words=bytes.byteOffset%4===0&&prior.bytes.byteOffset%4===0?[new Uint32Array(bytes.buffer,bytes.byteOffset,bytes.length/4),new Uint32Array(prior.bytes.buffer,prior.bytes.byteOffset,prior.bytes.length/4)]:null;
  const different=(x,y)=>words?words[0][y*width+x]!==words[1][y*width+x]:bytes.readUInt32LE(y*stride+x*4)!==prior.bytes.readUInt32LE(y*stride+x*4);
  for(let y=top;y<=bottom&&(left!==0||right!==width-1);y++){if(equalRow(y))continue;for(let x=0;x<left;x++)if(different(x,y)){left=x;break;}for(let x=width-1;x>right;x--)if(different(x,y)){right=x;break;}}
  const w=right-left+1,h=bottom-top+1;
  if(w*h<=width*height/2){rect=[left,top,w,h];buffer=prior.buffer?.length===w*h*4?prior.buffer:Buffer.allocUnsafe(w*h*4);for(let y=0;y<h;y++)bytes.copy(buffer,y*w*4,(top+y)*stride+left*4,(top+y)*stride+(left+w)*4);input=buffer;delta=true;}
  // Scene changes use a full frame. Sparse moving text/reticles keep exact
  // pixels but send only their XOR against the acknowledged previous frame.
  let changes=0,samples=0;for(let i=0;i<bytes.length;i+=4096){samples++;if(bytes.readUInt32LE(i)!==prior.bytes.readUInt32LE(i))changes++;}
  if(!rect&&changes/samples<.25){buffer=prior.buffer?.length===bytes.length?prior.buffer:Buffer.allocUnsafe(bytes.length);if(bytes.byteOffset%4===0&&prior.bytes.byteOffset%4===0&&buffer.byteOffset%4===0){const a=new Uint32Array(bytes.buffer,bytes.byteOffset,bytes.length/4),b=new Uint32Array(prior.bytes.buffer,prior.bytes.byteOffset,bytes.length/4),out=new Uint32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);for(let i=0;i<out.length;i++)out[i]=a[i]^b[i];}else for(let i=0;i<bytes.length;i++)buffer[i]=bytes[i]^prior.bytes[i];input=buffer;delta=true;}
 }
 const options={params:{[zlib.constants.ZSTD_c_compressionLevel]:1}};
 const packed=input.length<=4*1024*1024&&typeof zlib.zstdCompressSync==='function'?zlib.zstdCompressSync(input,options):await compress(input,options);
 // History advances only after the native decoder and presenter acknowledge it.
 const frame={encoding:rect?'zstd-rgba8-premultiplied-rect':delta?'zstd-rgba8-premultiplied-xor':'zstd-rgba8-premultiplied',width,height,sequence,...rect?{rect}:{},...delta?{baseSequence:prior.sequence}:{},pixels:packed.toString('base64')};
 pending.set(canvas,{frame,state:{width,height,bytes,sequence,buffer:buffer||(prior?.width===width&&prior?.height===height?prior.buffer:undefined)}});
 return frame;
}
