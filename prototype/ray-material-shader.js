import {rayOperations} from './ray-materials.js';
// All numeric graph operations use the persisted material graph's order and casts.
export const rayOperationExpressions={constant:'value',uv:'vec4(uv,0,0)',time:'vec4(value.x,value.x,value.x,value.x)',worldPosition:'vec4(point,0)',worldNormal:'vec4(normal,0)',viewDirection:'vec4(view,0)',channel:'vec4(a[int(value.x)],a[int(value.x)],a[int(value.x)],a[int(value.x)])',combine:'vec4(a.x,b.x,c.x,d.x)',texture:'hbRayTexture(value.x,a.xyz,b.x,value.y,value.z,value.w)',add:'a+b',subtract:'a-b',multiply:'a*b',divide:'a/mix(vec4(.000001,.000001,.000001,.000001),b,step(vec4(.000001,.000001,.000001,.000001),abs(b)))',power:'pow(max(a,vec4(0,0,0,0)),b)',min:'min(a,b)',max:'max(a,b)',step:'step(a,b)',lerp:'mix(a,b,c.x)',clamp:'clamp(a,b,c)',saturate:'clamp(a,0.0,1.0)',oneMinus:'vec4(1,1,1,1)-a',normalize:'meta.w<1.5?vec4(sign(a.x),sign(a.x),sign(a.x),sign(a.x)):a/max(length(a),.000001)',sine:'sin(a)',absolute:'abs(a)',fraction:'fract(a)',dot:'vec4(dot(a.xyz,b.xyz),dot(a.xyz,b.xyz),dot(a.xyz,b.xyz),dot(a.xyz,b.xyz))',length:'meta.w<1.5?vec4(abs(a.x),abs(a.x),abs(a.x),abs(a.x)):vec4(length(a),length(a),length(a),length(a))',normalMap:'vec4(normalize(vec3((a.xy*2.0-1.0)*b.x,a.z*2.0-1.0)),0)',cosine:'cos(a)',floor:'floor(a)',ceil:'ceil(a)',squareRoot:'sqrt(max(a,vec4(0,0,0,0)))',sign:'sign(a)',exp2:'exp2(a)',log2:'log2(max(a,vec4(.000001,.000001,.000001,.000001)))',smoothstep:'hbRaySmooth(a,b,c)',distance:'vec4(length(a.xyz-b.xyz),length(a.xyz-b.xyz),length(a.xyz-b.xyz),length(a.xyz-b.xyz))',cross:'vec4(cross(a.xyz,b.xyz),0)',reflect:'vec4(reflect(a.xyz,normalize(b.xyz)),0)',fresnel:'vec4(c.x+(1.0-c.x)*pow(1.0-clamp(dot(normalize(a.xyz),normalize(b.xyz)),0.0,1.0),max(c.x,.0001)))',noise:'vec4(hbRayNoise(a.xy*b.x))',checker:'vec4(hbRayMod(dot(floor(a.xy*b.xy),vec2(1,1)),2.0))',radialGradient:'vec4(clamp(1.0-length(a.xy-b.xy)/max(c.x,.000001),0.0,1.0))',linearGradient:'vec4(clamp(dot(a.xy-vec2(.5,.5),vec2(cos(b.x),sin(b.x)))+.5,0.0,1.0))',tilingOffset:'a*b+c',panner:'a+b*c.x',rotateUV:'vec4(hbRayRotate(a.xy,b.x,c.xy),0,0)',cast:'a',eyeUV:'vec4(a.xy-b.xy/max(abs(b.z),.1)*max(c.x,0.0)*clamp(d.x,0.0,1.0),0,0)'};
const operations=rayOperationExpressions;operations.fresnel='vec4(d.x+(1.0-d.x)*pow(1.0-clamp(dot(normalize(a.xyz),normalize(b.xyz)),0.0,1.0),max(c.x,.0001)))';
for(const key of ['fresnel','noise','checker','radialGradient','linearGradient'])operations[key]=operations[key].replace(/^vec4\((.*)\)$/s,'hbRayScalar($1)');
export function rayProgramGLSL(programs){let code='';for(const p of programs){let body='vec2 uv=hbRayUV(id,point);vec3 normal=hbRaySmoothNormal(id,point);';const declared=new Set();p.instructions.forEach((i,index)=>{const [op,dest,size,width,...refs]=i,context=refs.slice(0,4).map(r=>r<0?'vec4(0,0,0,0)':'r'+r);body+='{vec4 value=hbGeometryLoad(pointer+'+(index*3+2)+'.0),meta=vec4('+i.slice(0,4).map(n=>n+'.0').join(',')+'),a='+context[0]+',b='+context[1]+',c='+context[2]+',d='+context[3]+';';if(op===8){for(let channel=i[8];channel<i[8]+i[9];channel++)body+='result['+channel+']=a['+(i[10]<2?0:channel-i[8])+']*value.z;';}else{body+='vec4 v='+(op===9?operations.texture.replace('value.z',i[8]+'.0').replace('value.y',i[9]+'.0').replace('value.w',i[10]+'.0'):operations[rayOperations[op]])+';';if(size===1)body+='v=vec4(v.x,v.x,v.x,v.x);';else if(size===2)body+='v.zw=vec2(0,0);';else if(size===3)body+='v.w=0.0;';body+='r'+dest+'=v;';declared.add(dest);}body+='}';});code+='vec4 hbRayProgram'+p.key+'(float pointer,float id,vec3 point,vec3 view,vec4 result){'+[...declared].map(r=>'vec4 r'+r+'=vec4(0,0,0,0);').join('')+body+'return result;}\n';}code+='vec4 hbRayExecute(float key,float pointer,float id,vec3 point,vec3 view,vec4 result){';for(const p of programs)code+='if(key=='+p.key+'.0)return hbRayProgram'+p.key+'(pointer,id,point,view,result);';return code+'return result;}';}
export const rayMaterialGLSL=`
float hbRayMod(float a,float b){return a-b*floor(a/b);}
vec4 hbRayScalar(float v){return vec4(v,v,v,v);}
vec3 hbRayBary(float id,vec3 point){float at=hbGeometryInfo.w+id*6.0;vec3 delta=point-hbGeometryLoad(at).xyz,e1=hbGeometryLoad(at+1.0).xyz,e2=hbGeometryLoad(at+2.0).xyz;float a=dot(e1,e1),b=dot(e1,e2),c=dot(e2,e2),d=dot(delta,e1),e=dot(delta,e2),den=max(a*c-b*b,.000000000000000001),u=(c*d-b*e)/den,v=(a*e-b*d)/den;return vec3(1.0-u-v,u,v);}
float hbRayAttributes(float id){return hbTransport.y>1.5?hbGeometryLoad(hbTransport.x+id*2.0+1.0).z:0.0;}
vec3 hbRayGeometric(float id){return normalize(hbGeometryLoad(hbGeometryInfo.w+id*6.0+3.0).xyz);}
vec3 hbRaySmoothNormal(float id,vec3 point){float at=hbRayAttributes(id);vec3 normal=hbRayGeometric(id);if(at>0.0){vec3 b=hbRayBary(id,point),candidate=hbGeometryLoad(at+2.0).xyz*b.x+hbGeometryLoad(at+3.0).xyz*b.y+hbGeometryLoad(at+4.0).xyz*b.z;if(dot(candidate,candidate)>.000001){candidate=normalize(candidate);normal=dot(normal,candidate)<0.0?-candidate:candidate;}}return normal;}
vec2 hbRayUV(float id,vec3 point){float at=hbRayAttributes(id);if(at<=0.0)return vec2(0,0);vec3 b=hbRayBary(id,point);vec4 first=hbGeometryLoad(at);return first.xy*b.x+first.zw*b.y+hbGeometryLoad(at+1.0).xy*b.z;}
float hbRayWrap(float v,float mode){return mode<.5?clamp(v,0.0,1.0):mode<1.5?fract(v):1.0-abs(hbRayMod(v,2.0)-1.0);}
float hbRayIndex(float v,float extent,float mode){return mode<.5?clamp(v,0.0,extent-1.0):mode<1.5?hbRayMod(v,extent):min(hbRayMod(v,extent*2.0),extent*2.0-1.0-hbRayMod(v,extent*2.0));}
vec4 hbRayTexel(vec4 descriptor,vec4 wrap,vec3 coordinate){float x=hbRayIndex(coordinate.x,descriptor.y,wrap.x),y=hbRayIndex(coordinate.y,descriptor.z,wrap.y),z=clamp(coordinate.z,0.0,descriptor.w-1.0);return hbGeometryLoad(descriptor.x+x+(y+z*descriptor.z)*descriptor.y);}
vec4 hbRayTexture(float pointer,vec3 coordinate,float index,float srgb,float kind,float nearest){vec4 descriptor=hbGeometryLoad(pointer),wrap=hbGeometryLoad(pointer+1.0),mx=hbGeometryLoad(pointer+2.0),my=hbGeometryLoad(pointer+3.0);vec2 uv=coordinate.xy;float z=0.0;
 if(kind>2.5){vec3 d=coordinate,ad=abs(d);float axis=max(max(ad.x,ad.y),ad.z);if(axis<.000001)d=vec3(0,0,1);ad=abs(d);if(ad.x>=ad.y&&ad.x>=ad.z){z=d.x>0.0?0.0:1.0;uv=vec2(d.x>0.0?-d.z:d.z,-d.y)/max(ad.x,.000001);}else if(ad.y>=ad.z){z=d.y>0.0?2.0:3.0;uv=vec2(d.x,d.y>0.0?d.z:-d.z)/max(ad.y,.000001);}else{z=d.z>0.0?4.0:5.0;uv=vec2(d.z>0.0?d.x:-d.x,-d.y)/max(ad.z,.000001);}uv=uv*.5+.5;}
 else{uv=vec2(dot(mx.xyz,vec3(uv,1)),dot(my.xyz,vec3(uv,1)));if(wrap.z>.5)uv.y=1.0-uv.y;if(kind>1.5)z=clamp(coordinate.z,0.0,1.0)*descriptor.w-.5;else if(kind>.5)z=floor(index+.5);}
 uv=vec2(hbRayWrap(uv.x,wrap.x),hbRayWrap(uv.y,wrap.y));vec3 at=vec3(uv*descriptor.yz-.5,z);vec4 result;
 if(nearest>.5)result=hbRayTexel(descriptor,wrap,floor(at+vec3(.5,.5,.5)));else{vec3 first=floor(at),weight=fract(at);vec4 lo=mix(mix(hbRayTexel(descriptor,wrap,first),hbRayTexel(descriptor,wrap,first+vec3(1,0,0)),weight.x),mix(hbRayTexel(descriptor,wrap,first+vec3(0,1,0)),hbRayTexel(descriptor,wrap,first+vec3(1,1,0)),weight.x),weight.y);if(kind>1.5&&kind<2.5){vec4 hi=mix(mix(hbRayTexel(descriptor,wrap,first+vec3(0,0,1)),hbRayTexel(descriptor,wrap,first+vec3(1,0,1)),weight.x),mix(hbRayTexel(descriptor,wrap,first+vec3(0,1,1)),hbRayTexel(descriptor,wrap,first+vec3(1,1,1)),weight.x),weight.y);result=mix(lo,hi,weight.z);}else result=lo;}
 if(srgb>.5)result.rgb=mix(result.rgb/12.92,pow(max((result.rgb+.055)/1.055,vec3(0,0,0)),vec3(2.4,2.4,2.4)),step(vec3(.04045,.04045,.04045),result.rgb));return result;
}
vec4 hbRaySmooth(vec4 a,vec4 b,vec4 c){vec4 t=clamp((c-a)/max(b-a,vec4(.000001,.000001,.000001,.000001)),0.0,1.0);return t*t*(vec4(3,3,3,3)-2.0*t);}
float hbRayHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float hbRayNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hbRayHash(i),hbRayHash(i+vec2(1,0)),f.x),mix(hbRayHash(i+vec2(0,1)),hbRayHash(i+vec2(1,1)),f.x),f.y);}
vec2 hbRayRotate(vec2 uv,float angle,vec2 center){vec2 p=uv-center;return vec2(p.x*cos(angle)-p.y*sin(angle),p.x*sin(angle)+p.y*cos(angle))+center;}
vec4 hbRayBound(vec4 v,float field){v=clamp(v,-65000.0,65000.0);if(field<.5)return vec4(clamp(v.xyz,0.0,1.0),clamp(v.w,1.0,2.5));if(field<1.5)return vec4(max(v.rgb,vec3(0,0,0)),clamp(v.w,0.0,1.0));if(field<2.5)return max(v,vec4(0,0,0,0));if(field>3.5)return vec4(clamp(v.rgb,0.0,1.0),max(v.w,0.0));return v;}
/*HB_RAY_PROGRAMS*/
vec4 hbRayRun(float id,vec3 point,vec3 view,float material,float field,vec4 result){vec4 program=hbGeometryLoad(material+field*2.0+1.0);if(program.y<.5)return result;
/*HB_RAY_PROGRAM_CALL*/
return result;}
vec4 hbRayField0(float id,vec3 point,vec3 view){float base=hbGeometryInfo.w+id*6.0,attributes=hbRayAttributes(id);vec4 result=vec4(hbGeometryLoad(base).w,hbGeometryLoad(base+1.0).w,hbGeometryLoad(base+2.0).w,hbGeometryLoad(base+3.0).w);if(attributes<=0.0)return hbRayBound(result,0.0);float material=hbGeometryLoad(attributes+1.0).z;result=hbGeometryLoad(material+0.0);
#if !defined(HB_RAY_CONSTANT_FIELDS) && defined(HB_RAY_FIELD_0)
result=hbRayRun(id,point,view,material,0.0,result);
#endif
return hbRayBound(result,0.0);}
vec4 hbRayField1(float id,vec3 point,vec3 view){float base=hbGeometryInfo.w+id*6.0,attributes=hbRayAttributes(id);vec4 result=hbGeometryLoad(base+4.0);if(attributes<=0.0)return hbRayBound(result,1.0);float material=hbGeometryLoad(attributes+1.0).z;result=hbGeometryLoad(material+2.0);
#if !defined(HB_RAY_CONSTANT_FIELDS) && defined(HB_RAY_FIELD_1)
result=hbRayRun(id,point,view,material,1.0,result);
#endif
return hbRayBound(result,1.0);}
vec4 hbRayField2(float id,vec3 point,vec3 view){float base=hbGeometryInfo.w+id*6.0,attributes=hbRayAttributes(id);vec4 result=hbGeometryLoad(base+5.0);if(attributes<=0.0)return hbRayBound(result,2.0);float material=hbGeometryLoad(attributes+1.0).z;result=hbGeometryLoad(material+4.0);
#if !defined(HB_RAY_CONSTANT_FIELDS) && defined(HB_RAY_FIELD_2)
result=hbRayRun(id,point,view,material,2.0,result);
#endif
return hbRayBound(result,2.0);}
vec4 hbRayField3(float id,vec3 point,vec3 view){float base=hbGeometryInfo.w+id*6.0,attributes=hbRayAttributes(id);vec4 result=vec4(0,0,1,0);if(attributes<=0.0)return hbRayBound(result,3.0);float material=hbGeometryLoad(attributes+1.0).z;result=hbGeometryLoad(material+6.0);
#if !defined(HB_RAY_CONSTANT_FIELDS) && defined(HB_RAY_FIELD_3)
result=hbRayRun(id,point,view,material,3.0,result);
#endif
return hbRayBound(result,3.0);}
vec4 hbRayField4(float id,vec3 point,vec3 view){float base=hbGeometryInfo.w+id*6.0,attributes=hbRayAttributes(id);vec4 result=hbGeometryLoad(hbTransport.x+id*2.0);if(attributes<=0.0)return hbRayBound(result,4.0);float material=hbGeometryLoad(attributes+1.0).z;result=hbGeometryLoad(material+8.0);
#if !defined(HB_RAY_CONSTANT_FIELDS) && defined(HB_RAY_FIELD_4)
result=hbRayRun(id,point,view,material,4.0,result);
#endif
return hbRayBound(result,4.0);}
float hbRayCutoff(float id){float at=hbRayAttributes(id);return at>0.0?hbGeometryLoad(hbGeometryLoad(at+1.0).z+6.0).w:0.0;}
vec3 hbRayNormal(float id,vec3 point,vec3 view){vec3 n=hbRaySmoothNormal(id,point);float at=hbRayAttributes(id);if(at<=0.0||hbGeometryLoad(hbGeometryLoad(at+1.0).z+7.0).z<.5)return n;vec4 uv=hbGeometryLoad(at);vec2 uv2=hbGeometryLoad(at+1.0).xy,du=uv.zw-uv.xy,dv=uv2-uv.xy;float determinant=du.x*dv.y-du.y*dv.x;if(abs(determinant)<.0000001)return n;float base=hbGeometryInfo.w+id*6.0;vec3 e1=hbGeometryLoad(base+1.0).xyz,e2=hbGeometryLoad(base+2.0).xyz,t=(e1*dv.y-e2*du.y)/determinant,b=(-e1*dv.x+e2*du.x)/determinant;t-=n*dot(n,t);if(dot(t,t)<.000001)return n;t=normalize(t);b=normalize(cross(n,t))*(dot(cross(n,t),b)<0.0?-1.0:1.0);vec3 map=hbRayField3(id,point,view).xyz,candidate=(t*map.x+b*map.y+n*map.z),gn=hbRayGeometric(id);if(dot(candidate,candidate)<.000001)return n;candidate=normalize(candidate);return dot(candidate,gn)<0.0?-candidate:candidate;}
`;
