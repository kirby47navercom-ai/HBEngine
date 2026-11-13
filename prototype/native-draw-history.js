// Draw records are detached JSON packets. Compare their values before allocating
// another large string for unchanged geometry/material state. A changed record
// still uses the original JSON encoding and an independent normalized snapshot.
// Stored values are JSON.parse results we own, so their key lists are cached once under a symbol
// (not enumerable by JSON or Object.keys) instead of allocated on every comparison.
import {runtimeDataMatcher} from './runtime-data-equal.js';
const KEYS=Symbol('keys'),matchers=new Map();
function same(a,b,depth=0){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||depth>16||typeof b.toJSON==='function')return false;
 if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++){const x=a[i],y=b[i];if(x===y)continue;if(typeof x!=='object'||typeof y!=='object'||!same(x,y,depth+1))return false;}return true;}
 if(Array.isArray(b)||Object.getPrototypeOf(b)!==Object.prototype)return false;
 const keys=a[KEYS]||(a[KEYS]=Object.keys(a));let count=0;for(const key in b){if(!Object.prototype.hasOwnProperty.call(b,key))continue;const value=b[key];if(value===undefined||typeof value==='function'||typeof value==='symbol')continue;if(keys[count++]!==key||!same(a[key],value,depth+1))return false;}return count===keys.length;
}
export class NativeDrawHistory {
 // retained: renderer-owned draw records for its in-place fast path (one per draw id, same lifetime as records).
 constructor(){this.records=new Map();this.retained=new Map();}
 // A warmed record compares through a compiled field-by-field matcher (shared per draw shape); the generic
 // comparison stays as the fallback for shapes the matcher cannot express or values it rejects (undefined keys).
 stamp(id,draw){const previous=this.records.get(id);if(previous?.value&&(previous.match?.test(previous.value,draw)||same(previous.value,draw)))return previous.stamp;const stamp=JSON.stringify(draw);if(previous?.stamp===stamp){if(!previous.value){previous.value=JSON.parse(stamp);previous.match=runtimeDataMatcher(previous.value,matchers);}}else this.records.set(id,{stamp,value:null,match:null});return stamp;}
 delete(id){this.records.delete(id);this.retained.delete(id);}
 clear(){this.records.clear();this.retained.clear();}
}
