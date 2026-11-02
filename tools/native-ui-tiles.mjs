// Exact replacement pixels, including transparent erasure. Distant moving
// widgets do not force a whole-screen transfer or a full-frame XOR buffer.
export function nativeUITilePacket(bytes,prior,width,height,scratch={},timing){
 const started=timing?performance.now():0,stride=width*4,step=64,columns=Math.ceil(width/step),rows=Math.ceil(height/step);
 const dirty=scratch.dirty?.length===columns*rows?scratch.dirty:scratch.dirty=new Uint8Array(columns*rows),counts=scratch.counts?.length===rows?scratch.counts:scratch.counts=new Uint16Array(rows);dirty.fill(0);counts.fill(0);
 for(let y=0;y<height;y++){
  const band=Math.floor(y/step);if(counts[band]===columns)continue;
  const start=y*stride;if(bytes.compare(prior,start,start+stride,start,start+stride)===0)continue;
  const row=band*columns;
  // Native byte comparisons avoid a JS pixel loop and preserve every RGBA bit.
  for(let column=0;column<columns;column++){if(dirty[row+column])continue;const left=start+column*step*4,right=start+Math.min(width,(column+1)*step)*4;if(bytes.compare(prior,left,right,left,right)!==0){dirty[row+column]=1;counts[band]++;}}
 }
 const rects=[];let size=4;
 for(let row=0;row<rows;row++)for(let x=0;x<columns;){if(!dirty[row*columns+x]){x++;continue;}const left=x++;while(x<columns&&dirty[row*columns+x])x++;const rect={x:left*step,y:row*step,width:Math.min(width,x*step)-left*step,height:Math.min(step,height-row*step)};size+=16+rect.width*rect.height*4;if(size>=bytes.length)return null;rects.push(rect);}
 if(!rects.length)return null;
 const selected=timing?performance.now():0;
 // A dedicated backing buffer can cross the raster worker boundary once.
 const packet=Buffer.allocUnsafeSlow(size);packet.writeUInt32LE(rects.length);let at=4;
 for(const rect of rects){for(const value of [rect.x,rect.y,rect.width,rect.height]){packet.writeUInt32LE(value,at);at+=4;}for(let row=0;row<rect.height;row++){const source=(rect.y+row)*stride+rect.x*4;bytes.copy(packet,at,source,source+rect.width*4);at+=rect.width*4;}}
 if(timing){timing.tileSelectMS=selected-started;timing.tileCopyMS=performance.now()-selected;timing.tileRegions=rects.length;}return packet;
}
