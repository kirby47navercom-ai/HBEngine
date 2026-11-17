// Random Integer in Range (inclusive, swapped bounds allowed) and Random Bool: values stay in range and every outcome appears.
import assert from 'node:assert/strict';
import {blueprintPure as p} from '../prototype/core-preview.js';
import {makeNode} from '../prototype/blueprint-model.js';
const faces=new Set();for(let i=0;i<2000;i++){const v=p.randomInt({min:1,max:6}).return;assert.ok(Number.isInteger(v)&&v>=1&&v<=6,'range '+v);faces.add(v);}
assert.equal(faces.size,6,'every face');assert.equal(p.randomInt({min:3,max:3}).return,3);
for(let i=0;i<50;i++){const v=p.randomInt({min:6,max:1}).return;assert.ok(v>=1&&v<=6,'swapped bounds');}
const coin=new Set();for(let i=0;i<200;i++)coin.add(p.randomBool().return);assert.deepEqual([...coin].sort(),[false,true]);
for(const key of ['randomInt','randomBool'])assert.equal(makeNode(key).key,key);
console.log(JSON.stringify({passed:true}));
