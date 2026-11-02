// Exact replacement pixels, including transparent erasure. Distant moving
// widgets do not force a whole-screen transfer or a full-frame XOR buffer.
export function nativeUITilePacket(bytes,prior,width,height){
 const stride=width*4,step=64,columns=Math.ceil(width/step),rows=Math.ceil(height/step),dirty=new Uint8Array(columns*rows);
 const aligned=bytes.byteOffset%4===0&&prior.byteOffset%4===0,a=aligned?new Uint32Array(bytes.buffer,bytes.byteOffset,bytes.length/4):null,b=aligned?new Uint32Array(prior.buffer,prior.byteOffset,prior.length/4):null;
 for(let y=0;y<height;y++){
  const start=y*stride;if(bytes.compare(prior,start,start+stride,start,start+stride)===0)continue;
  const row=Math.floor(y/step)*columns;
  for(let column=0;column<columns;column++){if(dirty[row+column])continue;const left=column*step,right=Math.min(width,left+step);for(let x=left;x<right;x++)if(a?a[y*width+x]!==b[y*width+x]:bytes.readUInt32LE(start+x*4)!==prior.readUInt32LE(start+x*4)){dirty[row+column]=1;break;}}
 }
 const rects=[];let size=4;
 for(let row=0;row<rows;row++)for(let x=0;x<columns;){if(!dirty[row*columns+x]){x++;continue;}const left=x++;while(x<columns&&dirty[row*columns+x])x++;const rect={x:left*step,y:row*step,width:Math.min(width,x*step)-left*step,height:Math.min(step,height-row*step)};size+=16+rect.width*rect.height*4;if(size>=bytes.length)return null;rects.push(rect);}
 if(!rects.length)return null;
 const packet=Buffer.allocUnsafe(size);packet.writeUInt32LE(rects.length);let at=4;
 for(const rect of rects){for(const value of [rect.x,rect.y,rect.width,rect.height]){packet.writeUInt32LE(value,at);at+=4;}for(let row=0;row<rect.height;row++){const source=(rect.y+row)*stride+rect.x*4;bytes.copy(packet,at,source,source+rect.width*4);at+=rect.width*4;}}
 return packet;
}
