import {validInputPacket} from '../prototype/runtime-input.js';
export class NativeInputQueue {
 constructor(){this.events=[];this.coalesced=0;this.applied=0;this.releases=0;this.mouseLocked=false;}
 push(event){
  if(event.event==='input'){if(!validInputPacket(event.packet))throw Error('네이티브 입력 패킷 오류');}
  else if(event.event==='text'){if(typeof event.text!=='string'||event.text.length>4096)throw Error('네이티브 문자 입력 오류');}
  else if(event.event!=='releaseInput')throw Error('네이티브 입력 이벤트 오류');
  const motion=e=>e?.event==='input'&&e.packet.pointer&&!Object.hasOwn(e.packet.pointer,'locked')&&!e.packet.key,previous=this.events.at(-1);
  if(motion(event)&&motion(previous)&&event.packet.device===previous.packet.device&&event.packet.source===previous.packet.source){this.events[this.events.length-1]=event;this.coalesced++;return;}
  if(this.events.length>=4096)throw Error('네이티브 순서 입력 큐 예산 초과');this.events.push(event);
 }
 async apply(vm,ui){
  const batch=this.events.splice(0),releaseUI=()=>ui.releaseInput?ui.releaseInput():ui.release?.();
  for(const event of batch){
   if(event.event==='releaseInput'){
    this.mouseLocked=false;await vm.releaseInput();this.releases++;releaseUI();
   }else if(event.event==='text')ui.text(event.text);
   else{
    const {packet}=event,transition=packet.pointer&&Object.hasOwn(packet.pointer,'locked');
    if(transition){
     const locked=packet.pointer.locked===true;
     if(locked&&!this.mouseLocked)releaseUI();
     this.mouseLocked=locked;
    }
    if(transition||this.mouseLocked&&packet.device==='mouse'||!ui.input(packet)){
     await vm.dispatchInput(packet);this.applied++;
    }
   }
  }
  return batch.length;
 }
}
