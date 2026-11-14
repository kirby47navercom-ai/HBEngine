// Component index: after every scripted change (announced component edits, list push/splice/sort, object replacement)
// of(type) must equal a brute-force scan in list order; an unannounced component edit is caught by the sampled rebuild,
// reported, and switches the index to rebuilding every sync (still correct).
// node tools/check-component-index.mjs
import assert from 'node:assert/strict';
import {createComponentIndex,componentIndexConfig} from '../prototype/component-index.js';
import {touchComponents,revisionConfig,revisionMismatches} from '../prototype/object-revision.js';

revisionConfig.verify=false;
const types=['A','B','C','D'],objects=[],index=createComponentIndex();
for(let i=0;i<300;i++)objects.push({id:'o'+i,components:types.filter((_,k)=>(i>>k)%3===0).map(type=>({id:type,type}))});
const brute=type=>objects.filter(o=>o.components.some(c=>c.type===type));
const check=step=>{index.sync(objects);for(const type of types)assert.deepEqual(index.of(type).map(o=>o.id),brute(type).map(o=>o.id),type+' at step '+step);};
let seed=7;const random=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
for(let step=0;step<400;step++){
 const kind=random(6),o=objects[random(objects.length)];
 if(kind===0){o.components.push({id:'x'+step,type:types[random(4)]});touchComponents(o);}
 else if(kind===1&&o.components.length){o.components.splice(random(o.components.length),1);touchComponents(o);}
 else if(kind===2)objects.push({id:'n'+step,components:[{id:'a',type:types[random(4)]}]});
 else if(kind===3)objects.splice(random(objects.length),1);
 else if(kind===4&&step%50===0)objects.sort((a,b)=>a.id<b.id?-1:1);
 else touchComponents(o);
 check(step);
}
assert(componentIndexConfig.trusted,'announced changes keep the index trusted');
// Unannounced edit: of() may be stale until the sampled rebuild, which reports it and turns the index off.
const before=revisionMismatches.length,target=objects.find(o=>!o.components.some(c=>c.type==='D'));target.components.push({id:'silent',type:'D'});
for(let i=0;i<componentIndexConfig.sampleEvery;i++)index.sync(objects);
assert.equal(componentIndexConfig.trusted,false,'sampled rebuild switches the index off');assert.equal(revisionMismatches.at(-1).kind,'componentIndex');assert(revisionMismatches.length>before);
check('after fallback');index.dispose();componentIndexConfig.trusted=true;
console.log(JSON.stringify({passed:true,steps:400,objects:objects.length,scope:'Component index equals brute-force scans after announced edits and list changes; unannounced edit caught by sampling.'}));
