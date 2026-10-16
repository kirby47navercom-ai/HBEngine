import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {NativePhysicsQueries,NativePhysicsQueryPool} from '../prototype/native-physics-query.js';
import {makeSceneComponent as c} from '../prototype/scene-components.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/engine-180-'));retainTestEvidence(work);const checks=[],samples=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.stack});process.exitCode=1;}}
const actor=(id='Cube',x=0,dimension=3)=>({id,name:id,kind:'empty',position:[x,0,0],rotation:[0,0,0],scale:[1,1,1],components:[c(dimension===2?'BoxCollider2D':'BoxCollider')]}),args={start:[0,5,0],end:[0,-5,0],dimension:3,mask:-1,includeTriggers:false,ignore:null};
const request=objects=>({key:'physicsRaycast',args:{...args},objects}),context=(pool,scope,objects)=>new NativePhysicsQueries(objects,{lease:pool.acquire(scope)});
await check('independent C++ calls reuse one read-only world in a game session',async()=>{
 const pool=new NativePhysicsQueryPool(),rows=[actor()];try{const a=context(pool,'game',rows);assert.equal((await a.query(request(rows))).actor,'Cube');const world=a.world;a.close();const b=context(pool,'game',rows);assert.equal(b.stats().cacheReused,true);assert.equal((await b.query(request(rows))).actor,'Cube');assert.equal(b.world,world);assert.equal(pool.inspect().worldBuilds,1);b.close();assert.equal(pool.inspect().activeContexts,0);}finally{pool.dispose();}
});
await check('same-game concurrent classes install snapshots atomically and retain input ownership',async()=>{
 const pool=new NativePhysicsQueryPool(),near=[actor('Cube',0)],far=[actor('Cube',20)],a=context(pool,'game',near),b=context(pool,'game',far);try{const pending=[];for(let i=0;i<20;i++)pending.push((i%2?b:a).query(request(i%2?far:near)));const results=await Promise.all(pending);results.forEach((hit,i)=>assert.equal(hit.hit,i%2===0));const mutable=[actor()],job=a.query(request(mutable));mutable[0].position[0]=20;assert.equal((await job).hit,true);assert.equal(pool.inspect().worldBuilds,1);}finally{a.close();b.close();pool.dispose();}
});
await check('different authorized actor sets never leave stale collider candidates',async()=>{
 const pool=new NativePhysicsQueryPool(),one=[actor('One')],two=[actor('Two')],a=context(pool,'game',one),b=context(pool,'game',two);try{assert.equal((await a.query(request(one))).actor,'One');assert.equal((await b.query(request(two))).actor,'Two');assert.equal((await a.query(request(one))).actor,'One');assert.equal(pool.inspect().worldBuilds,1);}finally{a.close();b.close();pool.dispose();}
});
await check('authorization failure and each-call query budget do not poison shared state',async()=>{
 const pool=new NativePhysicsQueryPool(),rows=[actor()],a=context(pool,'game',rows);try{await assert.rejects(a.query(request([actor('Intruder')])),/월드 범위/);assert.equal((await a.query(request(rows))).actor,'Cube');for(let i=a.count;i<128;i++)await a.query(request(rows));await assert.rejects(a.query(request(rows)),/개수/);a.close();const b=context(pool,'game',rows);try{assert.equal((await b.query(request(rows))).actor,'Cube');assert.equal(b.count,1);}finally{b.close();}}finally{a.close();pool.dispose();}
});
await check('source transforms, collider geometry, removal and dimension changes are visible immediately',async()=>{
 const pool=new NativePhysicsQueryPool(),rows=[actor()],a=context(pool,'game',rows);try{assert.equal((await a.query(request(rows))).hit,true);const moved=[actor('Cube',20)];assert.equal((await a.query(request(moved))).hit,false);const reshaped=[actor('Cube',2)];reshaped[0].components[0].properties.extent=[3,1,1];assert.equal((await a.query(request(reshaped))).hit,true);const disabled=[actor()];disabled[0].collisionEnabled=false;assert.equal((await a.query(request(disabled))).hit,false);const twoD=[actor('Cube',0,2)];assert.equal((await a.query({...request(twoD),args:{...args,dimension:2}})).hit,true);assert.equal((await a.query(request(twoD))).hit,false);}finally{a.close();pool.dispose();}
});
await check('idle retention is bounded without limiting active game contexts',async()=>{
 const pool=new NativePhysicsQueryPool({maxIdleWorlds:1}),rows=[actor()],a=context(pool,'A',rows),b=context(pool,'B',rows),d=context(pool,'D',rows);try{await Promise.all([a.query(request(rows)),b.query(request(rows)),d.query(request(rows))]);assert.equal(pool.inspect().activeContexts,3);a.close();b.close();d.close();assert.equal(pool.inspect().idleWorlds,1);assert.equal(pool.inspect().worlds,1);}finally{a.close();b.close();d.close();pool.dispose();}
});
await check('invalidating a scope waits for all old owners and keeps the next generation separate',async()=>{
 const pool=new NativePhysicsQueryPool(),rows=[actor()],a=context(pool,'game',rows),b=context(pool,'game',rows);try{await a.query(request(rows));const old=a.cache;pool.invalidate('game');a.close();assert.equal(old.closed,false);assert.equal((await b.query(request(rows))).hit,true);const next=context(pool,'game',rows);try{assert.notEqual(next.cache,old);assert.equal((await next.query(request(rows))).hit,true);}finally{next.close();}b.close();assert.equal(old.closed,true);}finally{a.close();b.close();pool.dispose();}
});
await check('close/disposal cancels outstanding work and legacy contexts still release their world',async()=>{
 const pool=new NativePhysicsQueryPool(),rows=[actor()],a=context(pool,'game',rows),pending=a.query(request(rows));a.close();await assert.rejects(pending,/종료/);pool.dispose();assert.equal(pool.inspect().worlds,0);assert.throws(()=>pool.acquire('other'),/종료/);const legacy=new NativePhysicsQueries(rows);await legacy.query(request(rows));legacy.close();assert.equal(legacy.cache.closed,true);await assert.rejects(legacy.query(request(rows)),/종료/);
});
await check('paired per-call reuse measurements record CPU costs and world-build counts',async()=>{
 const rows=Array.from({length:512},(_,i)=>actor('Cube'+i,i)),pool=new NativePhysicsQueryPool(),fresh=[],shared=[];
 try{let warm=context(pool,'benchmark',rows);await warm.query(request(rows));warm.close();for(let i=0;i<5;i++){const a=new NativePhysicsQueries(rows),t=performance.now();try{await a.query(request(rows));fresh.push(performance.now()-t);}finally{a.close();}const b=context(pool,'benchmark',rows),at=performance.now();try{await b.query(request(rows));shared.push(performance.now()-at);}finally{b.close();}}assert.equal(pool.inspect().worldBuilds,1);samples.push({objects:rows.length,freshContextMs:fresh,sharedAcrossCallsMs:shared,cache:pool.inspect(),scope:'CPU process only; not game FPS'});}finally{pool.dispose();}
});
const result={passed:checks.filter(c=>c.passed).length,total:checks.length,checks,samples};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
