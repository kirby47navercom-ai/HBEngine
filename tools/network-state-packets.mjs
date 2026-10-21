// One broadcast only. Identical immutable row references may share a packet;
// each recipient must still receive strictly increasing sequence numbers.
export class SharedStatePackets {
 constructor(nextSequence,maxBytes=1048576){if(typeof nextSequence!=='function'||!Number.isSafeInteger(maxBytes)||maxBytes<0)throw Error('invalid packet sharing budget');this.nextSequence=nextSequence;this.maxBytes=maxBytes;this.entries=new Map();this.bytes=0;this.created=0;this.hits=0;this.peakBytes=0;}
 packet(index,rows,minimumSequence=0){
  const prior=this.entries.get(index);if(prior&&prior.sequence>minimumSequence&&rows.length===prior.rows.length&&rows.every((row,i)=>row===prior.rows[i])){this.hits++;return prior;}
  const sequence=this.nextSequence();if(!Number.isSafeInteger(sequence)||sequence<=minimumSequence)throw Error('non-monotonic state sequence');const wire=JSON.stringify({type:'state',sequence,states:rows}),bytes=Buffer.byteLength(wire),packet={sequence,wire,rows,bytes};this.created++;
  if(prior){this.entries.delete(index);this.bytes-=prior.bytes;}if(bytes<=this.maxBytes-this.bytes){this.entries.set(index,packet);this.bytes+=bytes;this.peakBytes=Math.max(this.peakBytes,this.bytes);}return packet;
 }
}
