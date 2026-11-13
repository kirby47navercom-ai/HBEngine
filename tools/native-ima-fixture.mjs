// Stereo IMA ADPCM: each block starts with a different predictor per channel.
export function nativeImaFixture({blocks=20,tail=19}={}){
  const channels=2,rate=8000,stride=32,blockFrames=25;
  const frames=(blocks-1)*blockFrames+tail,bytes=Buffer.alloc(60+blocks*stride);
  bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
  bytes.writeUInt32LE(20,16);bytes.writeUInt16LE(0x11,20);bytes.writeUInt16LE(channels,22);
  bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(Math.floor(rate*stride/blockFrames),28);
  bytes.writeUInt16LE(stride,32);bytes.writeUInt16LE(4,34);bytes.writeUInt16LE(2,36);
  bytes.writeUInt16LE(blockFrames,38);
  bytes.write('fact',40);bytes.writeUInt32LE(4,44);bytes.writeUInt32LE(frames,48);
  bytes.write('data',52);bytes.writeUInt32LE(blocks*stride,56);
  for(let block=0;block<blocks;block++){
    const start=60+block*stride;
    bytes.writeInt16LE(8000+block, start);
    bytes.writeInt16LE(-10000-block, start+4);
    bytes[start+2]=bytes[start+6]=40;
    for(let group=0;group<3;group++){
      bytes.fill(0x84,start+8+group*8,start+12+group*8);
      bytes.fill(0x0c,start+12+group*8,start+16+group*8);
    }
  }
  return {bytes,frames,rate,stride,blockFrames};
}
