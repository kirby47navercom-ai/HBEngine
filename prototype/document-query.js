function summary(value){
  const type=value===null?'null':Array.isArray(value)?'array':typeof value,result={type};
  if(type==='array'||type==='string')result.size=value.length;
  if(type==='object'){result.size=Object.keys(value).length;for(const key of ['id','name'])if(Object.hasOwn(value,key)&&typeof value[key]==='string'&&value[key].length<=200)result[key]=value[key];}
  return result;
}
// JSON Pointer addresses only own members. Read-only queries may inspect an
// explicitly authored '__proto__' key without traversing its prototype.
export function readDocumentPage(data,{pointer='',offset=0,limit=100,values=false}={}){
  if(typeof pointer!=='string'||pointer.length>2000||pointer!==''&&!pointer.startsWith('/')||/~(?![01])/u.test(pointer)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>1000||typeof values!=='boolean')throw Error('문서 pointer·offset0이상·limit1~1000·values boolean을 확인하세요.');
  let target=data;
  for(const encoded of pointer===''?[]:pointer.slice(1).split('/')){
    const key=encoded.replaceAll('~1','/').replaceAll('~0','~');
    if(target===null||typeof target!=='object'||Array.isArray(target)&&!/^(0|[1-9]\d*)$/.test(key)||!Object.hasOwn(target,key))throw Error('문서 조회 경로가 없어요: '+pointer);
    target=target[key];
  }
  const meta=summary(target),array=Array.isArray(target),object=meta.type==='object',keys=object?Object.keys(target):null,total=array?target.length:object?keys.length:1,end=Math.min(total,offset+limit),items=[];
  for(let i=offset;i<end;i++){
    const key=array?String(i):object?keys[i]:null,value=key===null?target:target[key];
    items.push({key,...summary(value),...(values?{value:structuredClone(value)}:{})});
  }
  return {pointer,...meta,total,offset,limit,values,items,nextOffset:end<total?end:null,readOnly:true};
}
