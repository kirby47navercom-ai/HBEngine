// Three r180's generic attribute readback creates a new staging buffer per call.
// A particle effect owns one reusable map buffer and releases it after an in-flight map.
export class ParticleEventReadback {
  constructor(renderer,attribute){this.renderer=renderer;this.attribute=attribute;this.buffer=null;this.pending=false;this.disposed=false;}
  async read(){
    if(this.disposed||this.pending)throw Error('입자 이벤트 읽기가 종료됐거나 진행 중이에요.');this.pending=true;let mapped=false;
    try{const {backend}=this.renderer,device=backend.device,source=backend.get(this.attribute).buffer;if(!source)throw Error('입자 이벤트 GPU 버퍼를 준비하세요.');
      if(!this.buffer)this.buffer=device.createBuffer({label:'HB.ParticleEvents.readback',size:source.size,usage:9});
      if(this.buffer.size!==source.size)throw Error('입자 이벤트 읽기 버퍼 크기가 달라요.');
      const encoder=device.createCommandEncoder();encoder.copyBufferToBuffer(source,0,this.buffer,0,source.size);device.queue.submit([encoder.finish()]);await this.buffer.mapAsync(1);mapped=true;
      return this.buffer.getMappedRange().slice(0);
    }finally{if(mapped)this.buffer.unmap();this.pending=false;if(this.disposed){this.buffer?.destroy();this.buffer=null;}}
  }
  dispose(){this.disposed=true;if(!this.pending){this.buffer?.destroy();this.buffer=null;}}
}
