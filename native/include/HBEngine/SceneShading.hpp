#pragma once

namespace hb::gpu {
inline constexpr const char* sceneShadingFunctions=R"HLSL(
float3 thinFilmFresnel(float cosine,float3 baseF0,float filmIOR,float thickness){
 if(thickness<=0)return baseF0+(1-baseF0)*pow(1-saturate(cosine),5);
 float eta=max(filmIOR,1.0001),cosFilm=sqrt(max(0,1-(1-cosine*cosine)/(eta*eta)));
 float r12=pow((eta-1)/(eta+1),2);r12=r12+(1-r12)*pow(1-saturate(cosine),5);
 float3 root=sqrt(clamp(baseF0,0,.9999)),substrate=(1+root)/max(1-root,.0001),r23=pow((substrate-eta)/(substrate+eta),2);r23=r23+(1-r23)*pow(1-cosFilm,5);
 float3 phase=12.566370614*eta*thickness*cosFilm/float3(650,510,475),interference=2*sqrt(max(r12*r23,0))*cos(phase),numerator=r12+r23+interference;
 return saturate(numerator/max(1+r12*r23+interference,1e-5));
}
void anisotropicFrame(float3 at,float2 uv,float3 n,float angle,out float3 t,out float3 b){
 float3 p=ddx(at),q=ddy(at);float2 s=ddx(uv),u=ddy(uv);t=p*u.y-q*s.y;
 if(dot(t,t)<1e-10)t=cross(abs(n.z)<.999?float3(0,0,1):float3(0,1,0),n);
 t=normalize(t-n*dot(n,t));b=normalize(cross(n,t));float3 a=t*cos(angle)+b*sin(angle);b=b*cos(angle)-t*sin(angle);t=a;
}
float anisotropicSpecular(float3 n,float3 v,float3 l,float3 h,float3 t,float3 b,float rough,float strength){
 float alphaB=rough*rough,alphaT=lerp(alphaB,1,strength*strength),nh=saturate(dot(n,h)),nv=saturate(dot(n,v)),nl=saturate(dot(n,l));
 float denominator=pow(dot(t,h)/alphaT,2)+pow(dot(b,h)/alphaB,2)+nh*nh;
 float d=1/max(3.141592654*alphaT*alphaB*denominator*denominator,1e-8);
 float gv=nl*length(float3(alphaT*dot(t,v),alphaB*dot(b,v),nv)),gl=nv*length(float3(alphaT*dot(t,l),alphaB*dot(b,l),nl));return d*.5/max(gv+gl,1e-6);
}
float sheenBRDF(float nh,float nv,float nl,float rough){float inv=1/(rough*rough),d=(2+inv)*pow(max(1-nh*nh,.0078125),inv*.5)/6.283185307;return d/max(4*(nl+nv-nl*nv),1e-6);}

float3 hbScatterDiffuse(float nl,float3 view,float3 light,float3 tint,float skin,float foliage,float thickness){float wrap=max(0.0,(nl+.5)/1.5),back=pow(max(0.0,dot(-light,view)),4.0)*exp(-max(0.0,thickness));return tint*(skin*(wrap+back)+foliage*max(0.0,-nl))*.318309886;}
float3 hbHairSpecular(float3 normal,float3 view,float3 light,float3 tangent,float3 tint,float rough,float shift){float3 h=safeNormal(view+light);if(dot(tangent,tangent)<.000001)tangent=cross(normal,abs(normal.z)<.9?float3(0,0,1):float3(0,1,0));float3 t1=safeNormal(tangent+normal*shift),t2=safeNormal(tangent-normal*(shift+.3));float exponent=clamp(2.0/max(rough*rough,.001)-2.0,1.0,2048.0),a=sqrt(max(0.0,1.0-pow(dot(t1,h),2.0))),b=sqrt(max(0.0,1.0-pow(dot(t2,h),2.0))),direction=max(0.0,dot(normal,light))+.25*max(0.0,-dot(normal,light));return (float3(.04,.04,.04)*pow(a,exponent)+tint*.12*pow(b,exponent*.5))*(exponent+2.0)*.159154943*direction;}
float2 hbEyeUV(float2 uv,float3 view,float depth,float iris){return uv-view.xy/max(abs(view.z),.1)*max(depth,0.0)*clamp(iris,0.0,1.0);}

)HLSL";
}
