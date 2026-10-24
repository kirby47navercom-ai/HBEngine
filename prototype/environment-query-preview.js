import {engineOperations} from './engine-services.js';
import {validNavigationAsset} from './navigation-mesh.js';
import {eqsDebugPage} from './eqs-debug.js';

export const eqsPreviewCancelled=()=>Object.assign(Error('편집 월드 질의가 취소됐어요.'),{code:'EQS_PREVIEW_CANCELLED'});

// Owns query-only copies. Never starts actors, bindings, widgets, audio or simulation.
export class EditorEnvironmentQuery {
 constructor(hooks){this.hooks=hooks;this.serial=0;this.pending=null;this.record=null;}
 current(job){const world=this.hooks.world();return job.serial===this.serial&&!world.running&&world.objects===job.objects&&this.hooks.revision()===job.revision&&world.objects.find(o=>o.id===job.target)===job.source&&job.source.poolActive!==false&&world.objects.find(o=>o.id===job.context)===job.contextSource&&job.contextSource.poolActive!==false;}
 guard(job){if(!this.current(job))throw eqsPreviewCancelled();}
 cancel(){this.serial++;this.record=null;if(this.job?.vm)this.job.vm.active=false;}
 diagnostic(target){const record=this.record;if(!record||record.target!==target||!this.current(record))return null;return record.snapshot;}
 read(target,params={}){return eqsDebugPage(this.diagnostic(target),params);}
 run(params={}){
  if(params.visualize!==undefined&&typeof params.visualize!=='boolean'||params.labels!==undefined&&typeof params.labels!=='boolean')return Promise.reject(Error('EQS 시각화 옵션을 확인하세요.'));
  // Validate paging before any asset reads or physics allocation.
  try{eqsDebugPage(null,params);}catch(error){return Promise.reject(error);}
  const world=this.hooks.world(),source=world.objects.find(o=>o.id===params.target),context=params.context??params.target,contextSource=world.objects.find(o=>o.id===context);
  if(world.running||!source||!contextSource||source.poolActive===false||contextSource.poolActive===false)return Promise.reject(Error('편집 월드의 질의 대상과 기준을 선택하세요.'));
  const previous=this.pending;this.cancel();const job={serial:this.serial,objects:world.objects,revision:this.hooks.revision(),target:source.id,source,context,contextSource};this.job=job;
  // A superseded uncancellable asset/WASM read finishes before another world is allocated.
  const pending=Promise.resolve(previous).catch(()=>{}).then(async()=>{
   this.guard(job);const objects=structuredClone(job.objects),byId=new Map(objects.map(o=>[o.id,o]));
   if(byId.size!==objects.length)throw Error('편집 월드의 오브젝트 ID가 중복됐어요.');
   const vm=job.vm={active:true,objects,bindings:[],hooks:{},object:id=>byId.get(id)},read=async path=>{this.guard(job);const data=structuredClone(await this.hooks.readAsset(path));this.guard(job);return data;};
   let data;const services=engineOperations({headless:true,readAsset:path=>path===params.asset&&data!==undefined?structuredClone(data):read(path),physicsOptions:{queryOnly:true}});
   try{
    data=await read(params.asset);if(!validNavigationAsset('environmentquery',data))throw Error('환경 질의 에셋을 확인하세요.');
    await services.prepareQueryWorld(vm,{physics:data.tests.some(test=>test.type==='trace')});this.guard(job);
    await services.operation('eqsRun',{...params,context,debug:true},{self:job.target},vm);this.guard(job);
    const snapshot=structuredClone(vm.object(job.target).gameplayDebug.eqsDiagnostic),page=eqsDebugPage(snapshot,params);
    this.record={...job,vm:undefined,snapshot};return page;
   }catch(error){if(!this.current(job))throw eqsPreviewCancelled();throw error;}finally{vm.active=false;services.dispose('EditorQuery');job.vm=null;}
  });
  this.pending=pending;pending.finally(()=>{if(this.pending===pending)this.pending=null;if(this.job===job)this.job=null;}).catch(()=>{});return pending;
 }
}
