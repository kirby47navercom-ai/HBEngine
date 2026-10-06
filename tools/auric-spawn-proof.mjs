import assert from 'node:assert/strict';
export async function auricSpawnProof({probe,call,inspect,sleep}){
 await call(probe.owner,probe.class+'.Burst',{count:probe.count});await sleep(150);
 await call(probe.owner,probe.class+'.Verify');const state=await inspect(),owner=state.objects.find(o=>o.id===probe.owner),cells=state.objects.filter(o=>o.nativeClass==='AuricSpawnCell');
 assert.equal(owner.nativeProperties.Created,probe.count);assert.equal(cells.length,probe.count);assert.equal(owner.nativeProperties.TypeOk,true);assert.equal(owner.nativeProperties.LastHp,7.25+probe.count-1);assert.equal(owner.nativeProperties.Constructed,probe.count);assert.ok(cells.every(o=>o.nativeProperties.BootCalls===1));
 const proof={count:cells.length,constructed:owner.nativeProperties.Constructed,lastHp:owner.nativeProperties.LastHp,typeOk:owner.nativeProperties.TypeOk};await call(probe.owner,probe.class+'.Clear');const cleared=await inspect();assert.equal(cleared.objects.filter(o=>o.nativeClass==='AuricSpawnCell').length,0);return proof;
}
