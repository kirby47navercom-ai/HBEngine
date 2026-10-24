// Select from the completed bounded diagnostic snapshot. Never rerun tests,
// projection or traces, and never change the game's final query result.
function checkStage(snapshot,stage){
 if(stage!=='final'&&stage!=='projection'&&(!Number.isInteger(stage)||stage<0))throw Error('EQS 표시 단계를 확인하세요.');
 if(snapshot&&Number.isInteger(stage)&&stage>=snapshot.tests.length)throw Error('실행된 EQS 검사 단계를 선택하세요.');
}
export function eqsStageSummary(snapshot,stage='final'){
 checkStage(snapshot,stage);if(!snapshot)return null;
 const matched=stage==='final'?snapshot.matched:stage==='projection'?snapshot.projected:snapshot.tests[stage].passed;
 return {stage,generated:snapshot.generated,projected:snapshot.projected,matched,failed:snapshot.generated-matched,rankBasis:stage==='final'||!snapshot.truncated?'all':'retained'};
}
export function eqsStageSnapshot(snapshot,stage='final'){
 const summary=eqsStageSummary(snapshot,stage);if(!snapshot)return null;
 const finalCounts={matched:snapshot.matched,failed:snapshot.failed};if(stage==='final')return {...snapshot,...summary,finalCounts};
 const count=stage==='projection'?0:stage+1,items=snapshot.items.map(item=>{
  const {rank,...copy}=item,steps=item.steps.slice(0,count),projection=item.failedTest==='projection',failed=steps.find(step=>!step.passed),matched=!projection&&steps.length===count&&!failed;
  return {...copy,steps,matched,failedTest:projection?'projection':failed?.test??null,score:steps.reduce((sum,step)=>sum+step.score,0)};
 });
 const ordered=items.filter(item=>item.matched).sort((a,b)=>b.score-a.score||String(a.actor).localeCompare(String(b.actor))||a.id-b.id);ordered.forEach((item,rank)=>{item.rank=rank;});
 return {...snapshot,...summary,finalCounts,tests:snapshot.tests.slice(0,count),items};
}
