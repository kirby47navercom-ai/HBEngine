import {deflateSync} from 'node:zlib';

function normalPNG(){
 const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,255,128,255,255]))),chunk('IEND',Buffer.alloc(0))]);
}
export function builtinNormalModel1169(){
 const chunks=[],bufferViews=[],accessors=[];let offset=0;
 const add=(array,type,count)=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;accessors.push({bufferView:bufferViews.length-1,componentType:array instanceof Uint16Array?5123:5126,count,type});return accessors.length-1;};
 const position=add(new Float32Array([-2,-2,0,2,-2,0,2,2,0,-2,2,0]),'VEC3',4);accessors[position].min=[-2,-2,0];accessors[position].max=[2,2,0];
 const normal=add(new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),'VEC3',4),uv=add(new Float32Array([0,0,1,0,1,1,0,1]),'VEC2',4),indices=add(new Uint16Array([0,1,2,0,2,3]),'SCALAR',6),bytes=Buffer.concat(chunks);
 return{asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},indices,material:0}]}],materials:[{name:'RawNormal',pbrMetallicRoughness:{baseColorFactor:[.5,.5,.5,1],metallicFactor:0,roughnessFactor:1},normalTexture:{index:0,scale:1},doubleSided:true}],textures:[{source:0,sampler:0}],samplers:[{magFilter:9728,minFilter:9728,wrapS:10497,wrapT:10497}],images:[{uri:'data:image/png;base64,'+normalPNG().toString('base64')}],buffers:[{uri:'data:application/octet-stream;base64,'+bytes.toString('base64'),byteLength:bytes.length}],bufferViews,accessors};
}
