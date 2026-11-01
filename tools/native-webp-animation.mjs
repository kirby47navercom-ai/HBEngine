import {createCanvas,loadImage} from '@napi-rs/canvas';

const u24=(b,i)=>b[i]|b[i+1]<<8|b[i+2]<<16;
const write24=(b,i,n)=>{b[i]=n&255;b[i+1]=(n>>>8)&255;b[i+2]=(n>>>16)&255;};
function chunk(tag,data){const out=Buffer.alloc(8+data.length+(data.length&1));out.write(tag);out.writeUInt32LE(data.length,4);data.copy(out,8);return out;}
function riff(parts){const payload=Buffer.concat(parts),out=Buffer.alloc(12+payload.length);out.write('RIFF');out.writeUInt32LE(payload.length+4,4);out.write('WEBP',8);payload.copy(out,12);return out;}
function chunks(bytes,start,end){const list=[];for(let at=start;at<end;){if(end-at<8)throw Error('WebP 청크 헤더가 잘렸어요.');const size=bytes.readUInt32LE(at+4),next=at+8+size+(size&1);if(next>end)throw Error('WebP 청크 범위를 확인하세요.');list.push({tag:bytes.toString('ascii',at,at+4),data:bytes.subarray(at+8,at+8+size),raw:bytes.subarray(at,next)});at=next;}return list;}

// Frames remain compressed. Only one compositing canvas and the current decoded
// frame are retained; a title animation never expands into hundreds of textures.
export class NativeWebPAnimation {
 static async load(bytes,now=performance.now()){
  if(bytes.length<12||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')return null;
  const end=bytes.readUInt32LE(4)+8;if(end>bytes.length)throw Error('WebP 파일이 잘렸어요.');const list=chunks(bytes,12,end),header=list.find(c=>c.tag==='VP8X');if(!header||header.data.length<10||!(header.data[0]&2))return null;
  const width=u24(header.data,4)+1,height=u24(header.data,7)+1,control=list.find(c=>c.tag==='ANIM');if(width>16384||height>16384||!control||control.data.length!==6)throw Error('WebP 애니메이션 크기·제어 정보를 확인하세요.');
  const frames=[];let total=0;const icc=list.find(c=>c.tag==='ICCP');
  for(const item of list.filter(c=>c.tag==='ANMF')){
   const b=item.data;if(b.length<16)throw Error('WebP 프레임 정보가 잘렸어요.');const x=u24(b,0)*2,y=u24(b,3)*2,w=u24(b,6)+1,h=u24(b,9)+1,duration=u24(b,12)<=10?100:u24(b,12),flags=b[15];if(x+w>width||y+h>height)throw Error('WebP 프레임이 캔버스를 벗어나요.');
   const parts=chunks(b,16,b.length);if(parts.filter(c=>['VP8 ','VP8L'].includes(c.tag)).length!==1)throw Error('WebP 프레임 압축 자료를 확인하세요.');const ext=Buffer.alloc(10);ext[0]=(header.data[0]&16)|(icc?32:0);write24(ext,4,w-1);write24(ext,7,h-1);
   frames.push({x,y,w,h,duration,start:total,end:total+duration,dispose:!!(flags&1),replace:!!(flags&2),bytes:riff([chunk('VP8X',ext),...(icc?[icc.raw]:[]),...parts.map(c=>c.raw)])});total+=duration;
  }
  if(!frames.length)throw Error('WebP 애니메이션 프레임이 없어요.');const value=new NativeWebPAnimation(width,height,frames,total,control.data.readUInt16LE(4),now);await value.advance(now);return value;
 }
 constructor(width,height,frames,duration,loops,epoch){Object.assign(this,{width,height,frames,duration,loops,epoch,index:-1,loop:-1,disposed:false});this.canvas=createCanvas(width,height);}
 async advance(now){
  if(this.disposed)return false;const elapsed=Math.max(0,now-this.epoch),ended=this.loops&&elapsed>=this.duration*this.loops,loop=ended?this.loops-1:Math.floor(elapsed/this.duration),time=ended?this.duration-1:elapsed%this.duration,target=this.frames.findIndex(frame=>time<frame.end);
  if(this.loop===loop&&this.index===target)return false;const ctx=this.canvas.getContext('2d');if(loop!==this.loop||target<this.index){ctx.clearRect(0,0,this.width,this.height);this.index=-1;this.loop=loop;}
  for(let i=this.index+1;i<=target;i++){const previous=this.frames[i-1],frame=this.frames[i];if(previous?.dispose)ctx.clearRect(previous.x,previous.y,previous.w,previous.h);if(frame.replace)ctx.clearRect(frame.x,frame.y,frame.w,frame.h);const image=await loadImage(frame.bytes);ctx.drawImage(image,frame.x,frame.y);this.index=i;}
  return true;
 }
 dispose(){this.disposed=true;this.frames=[];this.canvas.width=this.canvas.height=1;}
}
export class NativeSVGImage {
 constructor(bytes,image){Object.assign(this,{bytes,image,width:image.width,height:image.height});}
 async prepare(width,height){
  const factor=Math.max(width/this.width,height/this.height);if(factor<=1||this.image.width>=width&&this.image.height>=height)return;
  const w=Math.min(16384,Math.ceil(this.width*factor)),h=Math.min(16384,Math.ceil(this.height*factor));if(w===this.image.width&&h===this.image.height)return;
  // Image(width,height) changes its display attributes, not Skia's source bitmap.
  const source=this.bytes.toString('utf8').replace(/<svg\b[^>]*>/i,tag=>{let root=tag.replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');if(!/\sviewBox\s*=/i.test(root))root=root.replace(/>$/,' viewBox="0 0 '+this.width+' '+this.height+'">');return root.replace(/>$/,' width="'+w+'" height="'+h+'">');});
  const image=await loadImage(Buffer.from(source));image.hbSourceWidth=this.width;image.hbSourceHeight=this.height;this.image=image;
 }
 dispose(){this.bytes=null;this.image=null;}
}
export async function nativeWidgetImage(bytes){
 const animation=await NativeWebPAnimation.load(bytes);if(animation)return animation;const image=await loadImage(bytes);return /<svg(?:\s|>)/i.test(bytes.toString('utf8',0,Math.min(bytes.length,4096)))?new NativeSVGImage(bytes,image):image;
}
