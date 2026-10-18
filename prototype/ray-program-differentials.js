// Store offsets, not shifted absolute values. Affine graph operations can then
// preserve a sub-ULP footprint even when their base coordinate is very large.
const zero='vec4(0,0,0,0)';
export const rayDifferentialExpressions=Object.freeze({
 constant:zero,time:zero,viewDirection:zero,texture:zero,store:zero,
 uv:'vec4(uvDelta,0,0)',worldPosition:'vec4(pointDelta,0)',worldNormal:'vec4(normalDelta,0)',
 channel:'vec4(aDelta[int(value.x)],aDelta[int(value.x)],aDelta[int(value.x)],aDelta[int(value.x)])',
 combine:'vec4(aDelta.x,bDelta.x,cDelta.x,dDelta.x)',cast:'aDelta',
 add:'aDelta+bDelta',subtract:'aDelta-bDelta',oneMinus:'-aDelta',
 multiply:'a*bDelta+b*aDelta+aDelta*bDelta',
 tilingOffset:'a*bDelta+b*aDelta+aDelta*bDelta+cDelta',
 panner:'aDelta+b*cDelta.x+bDelta*c.x+bDelta*cDelta.x',
 lerp:'aDelta+(bDelta-aDelta)*c.x+(b-a)*cDelta.x+(bDelta-aDelta)*cDelta.x',
 dot:'hbRayScalar(dot(a.xyz,bDelta.xyz)+dot(aDelta.xyz,b.xyz)+dot(aDelta.xyz,bDelta.xyz))',
 cross:'vec4(cross(a.xyz,bDelta.xyz)+cross(aDelta.xyz,b.xyz)+cross(aDelta.xyz,bDelta.xyz),0)'
});
export function rayDifferentialExpression(operation,expression){
 return rayDifferentialExpressions[operation]??'('+expression.replace(/\b([abcd])\b/g,k=>'('+k+'+'+k+'Delta)')+')-v';
}
export const rayDifferentialAxis=(expression,axis)=>expression.replace(/\b([abcd]|uv|point|normal)Delta\b/g,(_,name)=>name+axis);
export function rayDifferentialNode(T,operation,base,delta,context,fallback){
 const[a,b,c]=base,[da,db,dc,dd]=delta;
 switch(operation){
  case'constant':case'time':case'viewDirection':case'texture':return T.vec4(0);
  case'uv':return T.vec4(context[0],0,0);
  case'worldPosition':return T.vec4(context[1],0);
  case'worldNormal':return T.vec4(context[2],0);
  case'channel':return T.vec4(da.element(T.int(context[3].x)));
  case'combine':return T.vec4(da.x,db.x,dc.x,dd.x);
  case'cast':return da;
  case'add':return da.add(db);
  case'subtract':return da.sub(db);
  case'oneMinus':return da.negate();
  case'multiply':return a.mul(db).add(b.mul(da)).add(da.mul(db));
  case'tilingOffset':return a.mul(db).add(b.mul(da)).add(da.mul(db)).add(dc);
  case'panner':return da.add(b.mul(dc.x)).add(db.mul(c.x)).add(db.mul(dc.x));
  case'lerp':return da.add(db.sub(da).mul(c.x)).add(b.sub(a).mul(dc.x)).add(db.sub(da).mul(dc.x));
  case'dot':return T.vec4(a.xyz.dot(db.xyz).add(da.xyz.dot(b.xyz)).add(da.xyz.dot(db.xyz)));
  case'cross':return T.vec4(a.xyz.cross(db.xyz).add(da.xyz.cross(b.xyz)).add(da.xyz.cross(db.xyz)),0);
  default:return fallback();
 }
}
