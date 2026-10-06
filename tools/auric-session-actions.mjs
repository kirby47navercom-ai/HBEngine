import assert from 'node:assert/strict';

// The same acceptance actions exercise packaged Windows and Android WebViews.
export async function auricSessionActions({evaluate,until,background,restart,release}){
  const game=()=>evaluate('window.hbPlayerDebug.game()');
  const report=()=>evaluate('window.hbPlayerDebug.report()');
  const operation=(key,args)=>evaluate('window.hbPlayerDebug.operation('+JSON.stringify(key)+','+JSON.stringify(args)+')');
  const readyScene=scene=>until(async()=>{const r=await report();assert.ok(r.ok,r.error);const stats=r.objects.find(o=>o.id==='Director')?.nativeProperties;return r.scene===scene&&stats?.Debt===progress.debt&&stats;},scene);
  const first=await game();assert.equal(first.state.sessionInitCount,1);
  const progress={debt:123456,sofa:2,home:1};
  await operation('saveJsonWrite',{slot:'Auric.progress',json:JSON.stringify(progress)});
  await operation('gameStateWrite',{json:JSON.stringify({...first.state,marker:'한글 상태 유지'})});
  for(const scene of ['Assets/Scenes/Dungeon_0.hbscene.json','Assets/Scenes/Hub.hbscene.json']){
    await operation('openScene',{scene});const stats=await readyScene(scene),current=await game();
    assert.equal(current.id,first.id);assert.equal(current.actor,first.actor);assert.equal(current.state.sessionInitCount,1);assert.equal(current.state.marker,'한글 상태 유지');
    assert.equal(stats.Debt,progress.debt);assert.equal(stats.SofaLevel,progress.sofa);assert.equal(stats.HomeLevel,progress.home);
  }
  assert.deepEqual(JSON.parse((await operation('saveJsonRead',{slot:'Auric.progress'})).return),progress);
  if(background){await background();const restored=await game();assert.equal(restored.id,first.id);assert.equal(restored.actor,first.actor);assert.equal(restored.state.marker,'한글 상태 유지');}
  await evaluate('window.hbPlayerDebug.input({key:"F12",value:1})');
  const reset=await until(async()=>{const value=await game();return value.id!==first.id&&value.state.sessionInitCount===1&&value;},'F12 새 GameInstance');
  await evaluate('window.hbPlayerDebug.input({key:"F12",value:0})');await readyScene('Assets/Scenes/Hub.hbscene.json');assert.equal(reset.state.marker,undefined);
  const beforeRestart=await report();assert.equal(beforeRestart.objects.find(o=>o.id==='Director').nativeProperties.Debt,progress.debt);
  await release();await restart();const after=await report(),stats=after.objects.find(o=>o.id==='Director').nativeProperties;
  assert.ok(after.ok,after.error);assert.equal(stats.Debt,progress.debt);assert.equal(stats.SofaLevel,progress.sofa);assert.equal(stats.HomeLevel,progress.home);assert.notEqual((await game()).id,reset.id);
  return {passed:true,gameInstanceInitCount:1,scenes:2,unicodeState:true,f12:true,progress,restarted:true,background:!!background};
}
