// Player options: key rebinding through Input Actions and graphics settings, both saved and restored on the next run.
import assert from 'node:assert/strict';
import {InputActions,playerKeyBindings} from '../prototype/input-actions.js';
import {engineOperations} from '../prototype/engine-services.js';

const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const applied=[],hooks={storage,storageKey:k=>'test:'+k,display:s=>applied.push(s),readAsset:async()=>null,update(){},build(){},remove(){},physicsOptions:{backend:'legacy'}};
const services=engineOperations(hooks);
const action={valueType:'bool',trigger:'down',modifiers:[]},input=()=>new InputActions([{priority:0,mappings:[{action:'Jump',key:'Space',axis:0,scale:1}]}],new Map([['Jump',action]]));
const pressed=(actions,key)=>{actions.set(key,1);return actions.sample(true,1/60).length>=0&&actions.snapshot()[0].value;};

assert.equal(pressed(input(),'Space'),true,'default key works');
await services.operation('inputRebindKey',{action:'Jump',oldKey:'Space',newKey:'KeyJ'},null,{});
assert.equal(pressed(input(),'Space'),false,'old key no longer fires');
assert.equal(pressed(input(),'KeyJ'),true,'new key fires');
await assert.rejects(services.operation('inputRebindKey',{action:'Jump',oldKey:'',newKey:'KeyJ'},null,{}),/다시 지정할/);

await services.operation('displaySetSettings',{quality:'low',screenPercentage:75,gamma:1.2,brightness:1.1,hdr:false},null,{});
assert.deepEqual(applied.at(-1),{quality:'low',screenPercentage:75,gamma:1.2,brightness:1.1,hdr:false});
await assert.rejects(services.operation('displaySetSettings',{quality:'ultra',screenPercentage:75,gamma:1,brightness:1,hdr:false},null,{}),/화면 설정/);
await assert.rejects(services.operation('displaySetSettings',{quality:'low',screenPercentage:300,gamma:1,brightness:1,hdr:false},null,{}),/화면 설정/);

// Next run: a fresh service restores both from storage.
playerKeyBindings.clear();applied.length=0;
engineOperations(hooks);
assert.equal(pressed(input(),'KeyJ'),true,'rebinding restored');
assert.equal(applied[0]?.quality,'low','display settings restored');
await services.operation('inputResetBindings',{},null,{});
assert.equal(pressed(input(),'Space'),true,'reset restores the default key');
playerKeyBindings.clear();
console.log(JSON.stringify({passed:true,rebinding:true,display:true,restored:true}));
