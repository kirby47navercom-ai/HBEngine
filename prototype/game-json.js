// bounded:false is for project data assets and save slots: no count/size caps, only shape safety and a stack-safe depth.
export function validGameJson(value,{object=true,bounded=true}={}){
  let count=0;const maxDepth=bounded?32:512;
  const visit=(item,depth=0)=>{
    if(depth>maxDepth||bounded&&++count>10000)return false;
    if(item===null||typeof item==='boolean')return true;
    if(typeof item==='number')return Number.isFinite(item);
    if(typeof item==='string')return !bounded||item.length<=65536;
    if(Array.isArray(item))return (!bounded||item.length<=4096)&&item.every(v=>visit(v,depth+1));
    if(!item||Object.getPrototypeOf(item)!==Object.prototype)return false;
    const keys=Object.keys(item);
    return (!bounded||keys.length<=1024)&&keys.every(key=>(!bounded||key.length<=200)&&!['__proto__','constructor','prototype'].includes(key)&&visit(item[key],depth+1));
  };
  return (!object||value&&typeof value==='object'&&!Array.isArray(value))&&visit(value)&&(!bounded||JSON.stringify(value).length<=262144);
}
export function parseGameJson(text,options){if(typeof text!=='string'||options?.bounded!==false&&text.length>262144)throw Error('게임 JSON 크기를 확인하세요.');const value=JSON.parse(text);if(!validGameJson(value,options))throw Error('게임 JSON 형식·깊이·크기를 확인하세요.');return value;}
