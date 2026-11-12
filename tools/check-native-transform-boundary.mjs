import assert from 'node:assert/strict';
import {validNativeTransform as valid} from './run-project.mjs';
const good={position:[0,0,0],rotation:[0,0,0],scale:[Math.fround(.01),1,1]};
assert(valid(good),'Native .01f must survive float32 serialization');
for(const value of [0,-1,Math.fround(.01)-2**-30,Infinity,NaN,10001])assert(!valid({...good,scale:[value,1,1]}));
assert(!valid({...good,position:[10001,0,0]}));
assert(!valid({...good,rotation:[Infinity,0,0]}));
assert(!valid({position:[0,0,0]}));
console.log(JSON.stringify({ok:true,cases:10,scope:'Actual native transform validator: float32 minimum, lower bound, nonfinite, shape and range.'}));
