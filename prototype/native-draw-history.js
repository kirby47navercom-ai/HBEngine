// Draw records are detached JSON packets. Compare their values before allocating
// another large string for unchanged geometry/material state. A changed record
// still uses the original JSON encoding and an independent normalized snapshot.
function same(a,b,depth=0){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||depth>16||typeof b.toJSON==='function')return false;
 if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!same(a[i],b[i],depth+1))return false;return true;}
 if(Array.isArray(b)||Object.getPrototypeOf(b)!==Object.prototype)return false;
 const keys=Object.keys(a);let count=0;for(const key of Object.keys(b)){const value=b[key];if(value===undefined||typeof value==='function'||typeof value==='symbol')continue;if(keys[count++]!==key||!same(a[key],value,depth+1))return false;}return count===keys.length;
}
export class NativeDrawHistory {
 constructor(){this.records=new Map();}
 stamp(id,draw){const previous=this.records.get(id);if(previous?.value&&same(previous.value,draw))return previous.stamp;const stamp=JSON.stringify(draw);if(previous?.stamp===stamp){previous.value??=JSON.parse(stamp);}else this.records.set(id,{stamp,value:null});return stamp;}
 delete(id){this.records.delete(id);}
 clear(){this.records.clear();}
}
