import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AbilitySystem} from '../prototype/ability-runtime.js';
import {createAbilityAsset} from '../prototype/ability-assets.js';
import {componentDefaults} from '../prototype/scene-components.js';
import {ongoingTagsChanged,ongoingParticipants} from '../prototype/effect-ongoing.js';
import {retainTestEvidence} from './test-artifacts.mjs';
const work=await fs.mkdtemp(path.resolve('native/build/ongoing-participants-'));retainTestEvidence(work);
const checks=[];let structural;
async function fixture(){
 const objects=new Map(),files={},vm={active:true,object:id=>objects.get(id),bindings:[],custom:async()=>{}},system=new AbilitySystem(async name=>structuredClone(files[name]));
 const add=async id=>{const o={id,tags:[]};objects.set(id,o);await system.initialize(o,{...componentDefaults('AbilitySystem'),health:1000,mana:100},vm);return o;};
 await add('Target');await add('Source');
 const state=id=>system.owners.get(id),op=(key,args={})=>system.operation(key,{target:'Target',...args},{self:'Target'},vm),value=id=>system.value(state(id),'Health');
 const put=(name,extra={})=>{const asset='Assets/'+name+'.hbeffect.json';files[asset]={...createAbilityAsset('effect',name),version:4,duration:10,executeOnApply:false,modifiers:[{attribute:'Health',operation:'add',magnitude:-10}],ongoingRequirements:{source:{all:['Ready']}},...extra};return asset;};
 const apply=async(asset,extra={})=>(await op('effectApplySpec',{asset,source:'Source',level:1,parameters:'{}',...extra})).return;
 const tag=(id,name,add=true)=>system.tagChange(objects.get(id),name,add);
 return{objects,files,vm,system,add,state,op,put,apply,tag,value};
}
async function check(name,fn){const f=await fixture();try{await fn(f);checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.stack});process.exitCode=1;}finally{f.system.dispose();}}

await check('10,000 unrelated initialized owners never enter tag snapshots, fixed point, live index rebuild or publication',async f=>{
 for(let i=0;i<10000;i++)await f.add('Idle'+i);
 await f.add('Follower');await f.op('attributeSet',{value:500,attribute:'Health'});await f.op('attributeSet',{target:'Follower',value:300,attribute:'Health'});
 const live=f.put('Follower',{version:1,ongoingRequirements:undefined,modifiers:[{attribute:'Health',operation:'add',magnitude:.1,magnitudeSource:{type:'attribute',owner:'source',attribute:'Health',basis:'current',snapshot:false}}]});
 await f.apply(live,{target:'Follower',source:'Target'});await f.apply(f.put('Gate'));
 const originals=[],synced=[];for(let i=0;i<10000;i++){const s=f.state('Idle'+i);originals.push([s,s.object.tags,s.object.gameplayDebug]);s.effects.values=()=>{throw Error('Unrelated effect scan: '+s.object.id);};s.abilities.values=()=>{throw Error('Unrelated ability scan: '+s.object.id);};}
 const sync=f.system.sync;f.system.sync=function(s,options){synced.push(s.object.id);return sync.call(this,s,options);};
 try{f.tag('Source','Ready');assert.equal(f.value('Target'),490);assert.equal(f.value('Follower'),349);assert.deepEqual(new Set(synced),new Set(['Target','Source','Follower']));assert.equal(synced.length,3);assert.equal(ongoingTagsChanged(f.system),false);for(const[s,tags,debug]of originals){assert.equal(s.object.tags,tags);assert.equal(s.object.gameplayDebug,debug);}structural={owners:f.system.owners.size,conditionalOwners:f.system.ongoingOwners.size,transactionPublications:synced.length,unrelatedOwnersUntouched:10000};}
 finally{for(const[s]of originals){delete s.effects.values;delete s.abilities.values;}}
});
await check('unused roles do not trigger signature scans; configured external roles still detect tags and retirement',async f=>{
 f.objects.set('Raw',{id:'Raw',tags:['Raw.Ready']});const handle=await f.apply(f.put('OnlyRaw',{ongoingRequirements:{causer:{all:['Raw.Ready']}}}),{causer:'Raw'});assert.equal(f.value('Target'),990);
 const source=f.objects.get('Source'),old=source.tags;Object.defineProperty(source,'tags',{configurable:true,get(){throw Error('unused role tag read');}});
 try{assert(!ongoingTagsChanged(f.system));f.objects.get('Raw').tags=[];assert(ongoingTagsChanged(f.system));await f.system.tick(0,f.vm);assert(f.state('Target').effects.get(handle).inhibited);assert.equal(f.value('Target'),1000);}
 finally{Object.defineProperty(source,'tags',{configurable:true,writable:true,value:old});}
});
await check('first role participation reconciles pre-existing direct external additions and removals without promoting transient grants',async f=>{
 await f.add('Later');const later=f.objects.get('Later');f.tag('Later','Remove.Me');const ordinary=f.put('Ordinary',{version:1,ongoingRequirements:undefined,modifiers:[],grantedTags:['Temporary']});const ordinaryHandle=await f.apply(ordinary,{target:'Later',source:'Later'});
 // No ongoing effect existed when this owner last published its tags.
 later.tags=later.tags.filter(t=>t!=='Remove.Me');later.tags.push('Ready');
 const h=await f.apply(f.put('LaterGate'),{source:'Later'});assert(!f.state('Target').effects.get(h).inhibited);assert(f.state('Later').baseTags.has('Ready'));assert(!f.state('Later').baseTags.has('Remove.Me'));assert(!f.state('Later').baseTags.has('Temporary'));
 await f.op('effectRemove',{target:'Later',handle:ordinaryHandle});assert(!later.tags.includes('Temporary'));f.tag('Later','New.Manual');assert(later.tags.includes('New.Manual'));
});
await check('a newly captured role and its live descendants roll back if the first conditional apply oscillates',async f=>{
 await f.add('Role');await f.add('Dependent');await f.op('attributeSet',{target:'Dependent',attribute:'Health',value:200});
 await f.apply(f.put('LiveRole',{version:1,ongoingRequirements:undefined,modifiers:[{attribute:'Health',operation:'add',magnitude:.1,magnitudeSource:{type:'attribute',owner:'source',attribute:'Health',basis:'current',snapshot:false}}]}),{target:'Dependent',source:'Role'});
 f.objects.get('Role').tags.push('Ready');const before=[...f.system.owners.values()].map(s=>[s,s.object.tags,s.object.gameplayDebug,s.ongoingPublishedTags]);
 await assert.rejects(f.apply(f.put('Bad',{ongoingRequirements:{source:{all:['Ready']},target:{none:['Cycle']}},grantedTags:['Cycle']}),{source:'Role'}),e=>e.code==='ONGOING_EFFECT_CYCLE');
 for(const[s,tags,debug,published]of before){assert.equal(s.object.tags,tags);assert.equal(s.object.gameplayDebug,debug);assert.equal(s.ongoingPublishedTags,published);}assert.equal(f.system.ongoingOwners.size,0);assert.equal(f.system.ongoingCount,0);assert.equal(f.value('Dependent'),300);
});
await check('partial live index rebuild preserves multi-effect counts and unrelated source edges across repeated inhibition',async f=>{
 for(const id of ['Follower','Other','OtherFollower'])await f.add(id);for(const id of ['Target','Follower','OtherFollower'])await f.op('attributeSet',{target:id,attribute:'Health',value:300});
 const def=name=>f.put(name,{version:1,ongoingRequirements:undefined,modifiers:[{attribute:'Health',operation:'add',magnitude:.1,magnitudeSource:{type:'attribute',owner:'source',attribute:'Health',basis:'current',snapshot:false}}]});
 await f.apply(def('LiveA'),{target:'Follower',source:'Target'});await f.apply(def('LiveB'),{target:'Follower',source:'Target'});await f.apply(def('Unrelated'),{target:'OtherFollower',source:'Other'});
 const untouched=f.system.liveDependents.get(f.state('Other').generation),generation=f.state('Target').generation;await f.apply(f.put('Gate'));
 for(let i=0;i<20;i++){f.tag('Source','Ready',i%2===0);assert.equal(f.system.liveDependents.get(generation).get(f.state('Follower')),2);assert.equal(f.system.liveDependents.get(f.state('Other').generation),untouched);assert.equal(f.value('Follower'),i%2===0?358:360);}
});
await check('replacing the refreshed role drops old participation without retaining old owners in the participant set',async f=>{
 await f.add('Other');f.tag('Other','Ready');const asset=f.put('Refresh',{stackLimit:3}),h=await f.apply(asset);assert(f.state('Target').effects.get(h).inhibited);assert.equal(await f.apply(asset,{source:'Other'}),h);assert.equal(f.system.ongoingCount,1);
 const participants=ongoingParticipants(f.system);assert(participants.has(f.state('Other')));assert(!participants.has(f.state('Source')));f.tag('Source','Ready');assert.equal(f.value('Target'),980);f.tag('Other','Ready',false);assert.equal(f.value('Target'),1000);
});
await check('last remove, expiry, set reset, owner retirement and dispose leave no conditional owner retention',async f=>{
 const asset=f.put('Life',{duration:1});let h=await f.apply(asset);await f.op('effectRemove',{handle:h});assert.equal(f.system.ongoingOwners.size,0);await f.apply(asset);await f.system.tick(1,f.vm);assert.equal(f.system.ongoingOwners.size,0);
 await f.apply(asset);const set='Assets/Reset.hbabilityset.json';f.files[set]=createAbilityAsset('abilityset','Reset');await f.op('abilitySetApply',{asset:set,retainEffects:false});assert.equal(f.system.ongoingOwners.size,0);assert.equal(f.system.ongoingCount,0);
 await f.apply(asset);f.system.remove('Target');assert.equal(f.system.ongoingOwners.size,0);assert.equal(f.system.ongoingCount,0);f.system.dispose();assert.equal(f.system.ongoingOwners.size,0);
});
await check('failed reactivation restores all conditional targets, transitive numeric followers and edge counts',async f=>{
 await f.add('Follower');await f.op('attributeSet',{target:'Follower',attribute:'Health',value:100});await f.apply(f.put('Follower',{version:1,ongoingRequirements:undefined,modifiers:[{attribute:'Health',operation:'add',magnitude:.1,magnitudeSource:{type:'attribute',owner:'source',attribute:'Health',basis:'current',snapshot:false}}]}),{target:'Follower',source:'Target'});
 const h=await f.apply(f.put('SelfCycle',{modifiers:[{attribute:'Health',operation:'add',magnitude:.1,magnitudeSource:{type:'attribute',owner:'target',attribute:'Health',basis:'current',snapshot:false}}]})),before=f.objects.get('Follower').gameplayDebug;
 assert.throws(()=>f.tag('Source','Ready'),e=>e.code==='LIVE_EFFECT_CYCLE');assert(f.state('Target').effects.get(h).inhibited);assert.equal(f.objects.get('Follower').gameplayDebug,before);assert.equal(f.value('Follower'),200);assert.equal(f.system.liveDependents.get(f.state('Target').generation).get(f.state('Follower')),1);assert.equal(f.system.ongoingOwners.size,1);assert(!f.objects.get('Source').tags.includes('Ready'));
});
const sourceHashes={};for(const file of ['prototype/effect-ongoing.js','prototype/live-effect-captures.js','prototype/ability-runtime.js','prototype/ability-set-reapply.js'])sourceHashes[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={passed:checks.every(c=>c.passed),cases:checks.length,structural,sourceHashes,checks,scope:'Actual AbilitySystem transactions and live/conditional indices. Structural access/publication assertions, not FPS, heap, full tick scaling, C++ binary, GPU, GUI, device or installation evidence.'};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(report,null,2));for(const c of checks.filter(c=>!c.passed))console.error(c.name+'\n'+c.error);console.log(JSON.stringify({passed:report.passed,cases:checks.length,structural,report:path.relative(process.cwd(),path.join(work,'acceptance.json'))}));
