import {enabledComponent} from './scene-components.js';

// Uses the editor's existing frame pump, never an interval or game simulation.
export class EditorQueryTester{
  constructor(hooks){this.hooks=hooks;this.state=null;this.ticket=null;this.plan=null;this.owns=false;this.paused=false;this.due=Infinity;this.result=null;this.error='';}
  same(w){const s=this.state;return s&&s.objects===w.objects&&s.revision===w.revision&&s.selected===w.selected&&s.running===w.running&&s.visible===w.visible;}
  retire(){const owned=this.owns;this.ticket=null;this.owns=false;this.result=null;this.error='';if(owned)this.hooks.cancel?.();}
  pause(){this.retire();const world=this.hooks.world();if(!this.same(world))this.plan=null;this.state={...world};this.paused=true;this.due=Infinity;}
  current(ticket){const w=this.hooks.world();return this.ticket===ticket&&this.same(w)&&!w.running&&w.visible&&ticket.owner.poolActive!==false&&w.objects.find(o=>o.id===ticket.owner.id)===ticket.owner;}
  tick(now){
    const w=this.hooks.world();if(!this.same(w)){this.retire();this.state={...w};this.paused=false;this.plan=null;this.due=Infinity;
      if(w.visible&&!w.running){const owner=w.objects.find(o=>o.id===w.selected),p=owner&&enabledComponent(owner,'EnvironmentQueryTester');if(p?.autoUpdate&&p.query&&owner.poolActive!==false){this.plan={owner,params:{target:owner.id,context:p.context||owner.id,asset:p.query,visualize:false,labels:p.labels!==false,failed:p.failed!==false}};this.due=now+(p.delay??.2)*1000;}}
    }
    if(!this.plan||this.paused||this.ticket||now<this.due)return;const ticket=this.ticket=this.plan;this.due=Infinity;this.owns=true;
    this.pending=Promise.resolve().then(()=>{if(this.current(ticket))return this.hooks.run(ticket.params);}).then(result=>{if(!this.current(ticket))return;this.result=result;this.hooks.complete?.(ticket.owner.id,ticket.params);}).catch(error=>{if(!this.current(ticket)||error?.code==='EQS_PREVIEW_CANCELLED')return;this.error=error?.message??String(error);this.hooks.error?.(this.error);}).finally(()=>{if(this.ticket===ticket)this.ticket=null;});
  }
  inspect(){return {target:this.state?.selected??null,configured:!!this.plan,paused:this.paused,pending:!!this.ticket,queued:!!this.plan&&!this.paused&&Number.isFinite(this.due),ready:!!this.result,error:this.error};}
  dispose(){this.retire();this.plan=null;this.state=null;this.due=Infinity;}
}
export const editorQueryTesterContract={component:'EnvironmentQueryTester',placement:'eqsTester',trigger:'Selected enabled tester, autoUpdate and query; visible stopped scene only. Debounce authored world/asset revisions; one evaluation per accepted revision, no unchanged polling or game simulation.',lifetime:'Retire late results on selection/world/revision/visibility/play changes. Manual query or Hide pauses the tester until the next authored revision/selection change.',inspection:'editor.eqs.tester.read plus existing editor.eqs.read/view pages and stage visualization',cost:'Uses the existing editor frame pump; unchanged keys do not rescan objects, allocate worlds, read assets or create timers.',cook:'Remove tester components from copied scene/prefab data before dependency discovery on every build target. Ordinary actors and original source files remain. Blueprint tester definitions are editor-only and rejected for game builds.'};
