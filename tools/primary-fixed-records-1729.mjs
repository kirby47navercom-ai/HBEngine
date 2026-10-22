// Private diagnostic candidate until timing and observable parity establish a
// useful gain. It substitutes only fixed virtual slots in named camera calls.
export function primaryFixedRecords1729(source){
 for(const[name,id,base,slots]of [['hbPathAbsorption','triangle','at',[3]],['hbPathEmissionPDF','triangle','at',[1,2,3]],['hbPathEmissiveDirect','emitter','base',[0,1,2]],['hbPathTangent','id','base',[1,2]]]){
  const start=source.indexOf(' '+name+'(');if(start<0)throw Error('fixed-record function missing '+name);const open=source.indexOf('{',start);let depth=1,end=open+1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}if(depth)throw Error('fixed-record block missing '+name);let body=source.slice(open,end);
  for(const slot of slots){const from='hbGeometryVertexLoad('+base+(slot?'+'+slot+'.0':'')+')';if(!body.includes(from))throw Error('fixed-record call missing '+name+'/'+slot);body=body.replaceAll(from,'hbGeometryRecord'+slot+'('+id+')');}source=source.slice(0,open)+body+source.slice(end);
 }return source;
}
