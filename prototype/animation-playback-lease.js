import * as THREE from 'three';
import {animationPlaybackToken} from './animation-playback-state.js';

// A lease owns a detached evaluator, never a second ticking evaluator. Keeping
// the original instance preserves transition, fade and finite-loop history.
export class AnimationPlaybackLease {
  constructor(object,group,{animation,mixer,graph}={}){
    Object.assign(this,{kind:animationPlaybackToken,object,group,animation,mixer,graph,phase:'pending',type:graph?'graph':mixer?'mixer':animation?.type==='sprite'?'sprite':animation?'timeline':'none'});
  }
  matches({animation,mixer,graph}){return this.animation===animation&&this.mixer===mixer&&this.graph===graph;}
  prepare(players=[]){
    // Public PropertyBinding values are copied once. update(0) alone can skip
    // unchanged accumulator values after another mixer has changed the target.
    if(this.mixer)this.pose=this.mixer.action.getClip().tracks.map(track=>{const binding=THREE.PropertyBinding.create(this.group,track.name),value=new Array(track.getValueSize()).fill(0);binding.getValue(value,0);binding.unbind();return {path:track.name,value};});
    if(this.graph)this.presentation=this.graph.capturePresentation();
    else if(players.length)this.presentation=players.at(-1).program.capturePresentation();
  }
  suspend(montages){
    this.montages=montages;this.phase='suspended';
    if(montages?.states.length)this.type=this.graph?'graph+montage':'montage';
  }
  async present(){
    if(this.graph)await this.graph.restorePresentation(this.presentation);
    else if(this.montages?.states.length)await this.montages.states.at(-1).player.program.restorePresentation(this.presentation);
    if(this.mixer)for(const {path,value}of this.pose){const binding=THREE.PropertyBinding.create(this.group,path);binding.setValue(value,0);binding.unbind();}
  }
  release(){
    if(this.phase==='suspended'){
      this.graph?.dispose();
      for(const state of this.montages?.states||[]){state.notifyTrack?.dispose();state.player.dispose();}
      // Dropping an unregistered mixer needs no uncacheRoot: that operation
      // writes its old bind pose and would corrupt a newer owner's final pose.
    }
    this.phase='released';this.animation=this.mixer=this.graph=this.montages=this.presentation=this.pose=this.object=this.group=null;
  }
}
