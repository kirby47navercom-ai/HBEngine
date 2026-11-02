import {validInputPacket} from '../prototype/runtime-input.js';
export class NativeInputQueue {
 constructor(){this.events=[];this.coalesced=0;this.applied=0;this.releases=0;}
 push(event){
  if(event.event==='input'){if(!validInputPacket(event.packet))throw Error('네이티브 입력 패킷 오류');}
  else if(event.event==='text'){if(typeof event.text!=='string'||event.text.length>4096)throw Error('네이티브 문자 입력 오류');}
  else if(event.event!=='releaseInput')throw Error('네이티브 입력 이벤트 오류');
  const motion=e=>e?.event==='input'&&e.packet.pointer&&!e.packet.key,previous=this.events.at(-1);
  if(motion(event)&&motion(previous)&&event.packet.device===previous.packet.device&&event.packet.source===previous.packet.source){this.events[this.events.length-1]=event;this.coalesced++;return;}
  if(this.events.length>=4096)throw Error('네이티브 순서 입력 큐 예산 초과');this.events.push(event);
 }
 async apply(vm,ui){const batch=this.events.splice(0);for(const event of batch){if(event.event==='releaseInput'){await vm.releaseInput();this.releases++;ui.releaseInput?ui.releaseInput():ui.release();}else if(event.event==='text')ui.text(event.text);else if(!ui.input(event.packet)){await vm.dispatchInput(event.packet);this.applied++;}}return batch.length;}
}
