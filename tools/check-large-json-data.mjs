// Data assets and save slots have no count/size caps; ordinary game JSON keeps its bounds.
import assert from 'node:assert/strict';
import {createPersistentQueries} from '../prototype/runtime-storage.js';
import {validDataAsset} from '../prototype/data-assets.js';
import {validGameJson} from '../prototype/game-json.js';

const rows={};for(let i=0;i<50000;i++)rows['Row'+i]={name:'항목'+i,value:i,tags:{a:i}};
const table={version:1,name:'Big',columns:[{name:'name',type:'string'},{name:'value',type:'float'},{name:'tags',type:'json'}],rows};
assert(validDataAsset(table),'50000-row table is a valid data asset');
assert(validDataAsset({version:1,name:'Wide',fields:Array.from({length:300},(_,i)=>({name:'F'+i,type:'string',value:'x'.repeat(100000)}))}),'300 fields with 100KB strings');

let reads=0,saved=null;
const query=createPersistentQueries({readAsset:async()=>{reads++;return table;},readSave:async()=>saved,writeSave:async(_s,text)=>{saved=text;},deleteSave:async()=>{saved=null;}});
assert.equal(JSON.parse(await query('dataTableRead',{path:'Assets/Data/Big.json',rowId:'Row49999'})).value,49999);
const text=await query('dataJsonRead',{path:'Assets/Data/Big.json'});
assert.equal(Object.keys(JSON.parse(text)).length,50000);
assert.equal(await query('dataJsonRead',{path:'Assets/Data/Big.json'}),text,'hot read reuses serialized text');
assert.equal(reads,1);

const save=JSON.stringify({items:Array.from({length:20000},(_,i)=>({id:i,label:'아이템'+i}))});
assert(save.length>262144);
await query('saveJsonWrite',{slot:'big',json:save});
assert.equal(JSON.parse(await query('saveJsonRead',{slot:'big'})).items.length,20000);

let deep={};for(let i=0;i<100;i++)deep={d:deep};
assert(validGameJson(deep,{bounded:false}));
assert(!validGameJson(JSON.parse('{"__proto__":1}'),{bounded:false}),'prototype keys still rejected');
assert(!validGameJson({n:Infinity},{bounded:false}),'non-finite numbers still rejected');
assert(!validGameJson({a:Array(4097).fill(0)}),'ordinary game JSON keeps array bound');
assert(!validGameJson(deep),'ordinary game JSON keeps depth bound');
console.log('large JSON data checks passed');
