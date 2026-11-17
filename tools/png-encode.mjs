// Minimal RGBA PNG writer (Node zlib) for editor viewport and in-game screenshots.
import zlib from 'node:zlib';

const table=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=bytes=>{let c=-1;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(type,data)=>{const head=Buffer.alloc(8);head.writeUInt32BE(data.length,0);head.write(type,4,'latin1');const tail=Buffer.alloc(4);tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4),data])),0);return Buffer.concat([head,data,tail]);};

export function encodePng(width,height,rgba){
  if(!(width>0&&height>0)||rgba.length!==width*height*4)throw Error('PNG 이미지 크기를 확인하세요.');
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(rows,y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}

// "Screenshot_YYYYMMDD_HHMMSS.png" in folder, with _2, _3 when the second is taken.
export async function screenshotFile(fs,path,folder){
  await fs.mkdir(folder,{recursive:true});
  const d=new Date(),two=n=>String(n).padStart(2,'0'),name='Screenshot_'+d.getFullYear()+two(d.getMonth()+1)+two(d.getDate())+'_'+two(d.getHours())+two(d.getMinutes())+two(d.getSeconds());
  let file=path.join(folder,name+'.png');for(let i=2;await fs.access(file).then(()=>true,()=>false);i++)file=path.join(folder,name+'_'+i+'.png');
  return file;
}
