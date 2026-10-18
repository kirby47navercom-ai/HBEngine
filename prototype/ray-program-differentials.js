// Store offsets, not shifted absolute values. Affine graph operations can then
// preserve a sub-ULP footprint even when their base coordinate is very large.
const zero='vec4(0,0,0,0)';
export const rayDifferentialGLSL=`
vec4 hbRayDeltaMin(vec4 a,vec4 b,vec4 da,vec4 db){vec4 result;for(int k=0;k<4;k++)result[k]=a[k]<=b[k]?min(da[k],b[k]-a[k]+db[k]):min(a[k]-b[k]+da[k],db[k]);return result;}
vec4 hbRayDeltaMax(vec4 a,vec4 b,vec4 da,vec4 db){vec4 result;for(int k=0;k<4;k++)result[k]=a[k]<=b[k]?max(a[k]-b[k]+da[k],db[k]):max(da[k],b[k]-a[k]+db[k]);return result;}
vec4 hbRayDeltaAbs(vec4 a,vec4 da){vec4 result;for(int k=0;k<4;k++)result[k]=a[k]>=0.0?(da[k]>=-a[k]?da[k]:-2.0*a[k]-da[k]):(da[k]>=-a[k]?2.0*a[k]+da[k]:-da[k]);return result;}
float hbRayDeltaLength(vec4 a,vec4 da){float old=length(a),next=length(a+da);return (2.0*dot(a,da)+dot(da,da))/max(old+next,1e-30);}
vec4 hbRayDeltaSqrt(vec4 a,vec4 da){vec4 z=vec4(0,0,0,0),d=hbRayDeltaMax(a,z,da,z),old=sqrt(max(a,z)),next=sqrt(max(a+da,z));return d/max(old+next,vec4(1e-30,1e-30,1e-30,1e-30));}
vec4 hbRayDeltaNormalize(vec4 a,vec4 da){float old=length(a),d=hbRayDeltaLength(a,da);float delta=old>=.000001?max(d,.000001-old):max(old-.000001+d,0.0),den=max(length(a+da),.000001);return da/den-(a/max(old,.000001))*(delta/den);}
`;
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
 cross:'vec4(cross(a.xyz,bDelta.xyz)+cross(aDelta.xyz,b.xyz)+cross(aDelta.xyz,bDelta.xyz),0)',
 absolute:'hbRayDeltaAbs(a,aDelta)',
 min:'hbRayDeltaMin(a,b,aDelta,bDelta)',max:'hbRayDeltaMax(a,b,aDelta,bDelta)',
 clamp:'hbRayDeltaMin(max(a,b),c,hbRayDeltaMax(a,b,aDelta,bDelta),cDelta)',
 saturate:'hbRayDeltaMin(max(a,vec4(0,0,0,0)),vec4(1,1,1,1),hbRayDeltaMax(a,vec4(0,0,0,0),aDelta,vec4(0,0,0,0)),vec4(0,0,0,0))',
 floor:'floor(fract(a)+aDelta)',ceil:'ceil(fract(a)+aDelta)-ceil(fract(a))',
 fraction:'aDelta-floor(fract(a)+aDelta)',
 step:'step(vec4(0,0,0,0),(b-a)+(bDelta-aDelta))-step(a,b)',
 sign:'step(-a,aDelta)-step(aDelta,-a)-sign(a)',
 sine:'cos(a)*sin(aDelta)-2.0*sin(a)*sin(aDelta*.5)*sin(aDelta*.5)',
 cosine:'-sin(a)*sin(aDelta)-2.0*cos(a)*sin(aDelta*.5)*sin(aDelta*.5)',
 squareRoot:'hbRayDeltaSqrt(a,aDelta)',
 length:'meta.w<1.5?hbRayScalar(hbRayDeltaAbs(a,aDelta).x):hbRayScalar(hbRayDeltaLength(a,aDelta))',
 normalize:'meta.w<1.5?hbRayScalar(step(-a.x,aDelta.x)-step(aDelta.x,-a.x)-sign(a.x)):hbRayDeltaNormalize(a,aDelta)'
});
export function rayDifferentialExpression(operation,expression){
 return rayDifferentialExpressions[operation]??'('+expression.replace(/\b([abcd])\b/g,k=>'('+k+'+'+k+'Delta)')+')-v';
}
export const rayDifferentialAxis=(expression,axis)=>expression.replace(/\b([abcd]|uv|point|normal)Delta\b/g,(_,name)=>name+axis);
export function rayDifferentialNode(T,operation,base,delta,context,fallback){
 const[a,b,c]=base,[da,db,dc,dd]=delta;
 // ConditionalNode needs scalar conditions; vector conditions can select a
 // whole branch and lose per-channel comparisons on the generated backend.
 const lanes=callback=>T.vec4(...['x','y','z','w'].map(callback));
 const minDelta=(a,b,da,db)=>lanes(k=>a[k].lessThanEqual(b[k]).select(T.min(da[k],b[k].sub(a[k]).add(db[k])),T.min(a[k].sub(b[k]).add(da[k]),db[k])));
 const maxDelta=(a,b,da,db)=>lanes(k=>a[k].lessThanEqual(b[k]).select(T.max(a[k].sub(b[k]).add(da[k]),db[k]),T.max(da[k],b[k].sub(a[k]).add(db[k]))));
 const absDelta=(a,da)=>lanes(k=>{const positive=da[k].greaterThanEqual(a[k].negate());return a[k].greaterThanEqual(0).select(positive.select(da[k],a[k].mul(-2).sub(da[k])),positive.select(a[k].mul(2).add(da[k]),da[k].negate()));});
 const lengthDelta=(a,da)=>a.dot(da).mul(2).add(da.dot(da)).div(a.length().add(a.add(da).length()).max(1e-30));
 const signDelta=(a,da)=>T.step(a.negate(),da).sub(T.step(da,a.negate())).sub(a.sign());
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
  case'absolute':return absDelta(a,da);
  case'min':return minDelta(a,b,da,db);
  case'max':return maxDelta(a,b,da,db);
  case'clamp':return minDelta(T.max(a,b),c,maxDelta(a,b,da,db),dc);
  case'saturate':return minDelta(a.max(0),T.vec4(1),maxDelta(a,T.vec4(0),da,T.vec4(0)),T.vec4(0));
  case'floor':return a.fract().add(da).floor();
  case'ceil':return a.fract().add(da).ceil().sub(a.fract().ceil());
  case'fraction':return da.sub(a.fract().add(da).floor());
  case'step':return T.step(T.vec4(0),b.sub(a).add(db.sub(da))).sub(T.step(a,b));
  case'sign':return signDelta(a,da);
  case'sine':return a.cos().mul(da.sin()).sub(a.sin().mul(2).mul(da.mul(.5).sin()).mul(da.mul(.5).sin()));
  case'cosine':return a.sin().negate().mul(da.sin()).sub(a.cos().mul(2).mul(da.mul(.5).sin()).mul(da.mul(.5).sin()));
  case'squareRoot':return maxDelta(a,T.vec4(0),da,T.vec4(0)).div(a.max(0).sqrt().add(a.add(da).max(0).sqrt()).max(1e-30));
  case'length':return (context[4]?.w??T.float(4)).lessThan(1.5).select(T.vec4(absDelta(a,da).x),T.vec4(lengthDelta(a,da)));
  case'normalize':{const old=a.length(),d=lengthDelta(a,da),change=old.greaterThanEqual(.000001).select(d.max(T.float(.000001).sub(old)),old.sub(.000001).add(d).max(0)),den=a.add(da).length().max(.000001),result=da.div(den).sub(a.div(old.max(.000001)).mul(change.div(den)));return (context[4]?.w??T.float(4)).lessThan(1.5).select(T.vec4(signDelta(a,da).x),result);}
  default:return fallback();
 }
}
