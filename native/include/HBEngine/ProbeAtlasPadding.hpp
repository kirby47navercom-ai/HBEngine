#pragma once
#include <string>

namespace hb::gpu {
inline constexpr const char* probeAtlasCubeDirections=R"HLSL(
float3 hbAtlasFaceDirection(uint f,float2 uv){float2 p=uv*2-1;return f==0?float3(1,-p.y,-p.x):f==1?float3(-1,-p.y,p.x):f==2?float3(p.x,1,p.y):f==3?float3(p.x,-1,-p.y):f==4?float3(p.x,-p.y,1):float3(-p.x,-p.y,-1);}
void hbAtlasFaceUV(float3 d,out uint face,out float2 uv){float3 a=abs(d);if(all(a==0)){face=4;uv=.5;return;}if(a.x>=a.y&&a.x>=a.z){face=d.x>=0?0:1;uv=float2(d.x>=0?-d.z:d.z,-d.y)/a.x;}else if(a.y>=a.z){face=d.y>=0?2:3;uv=float2(d.x,d.y>=0?d.z:-d.z)/a.y;}else{face=d.z>=0?4:5;uv=float2(d.z>=0?d.x:-d.x,-d.y)/a.z;}uv=uv*.5+.5;}
)HLSL";
inline const std::string probeAtlasPaddingSource=std::string(probeAtlasCubeDirections)+R"HLSL(
cbuffer Padding:register(b0){uint4 placement,levelInfo;};
Texture2DArray<float4> sourceMip:register(t0);RWTexture2D<float4> atlasPadding:register(u0);
float3 cornerTexel(uint face,int2 pixel,uint size,uint level){return sourceMip.Load(int4(pixel,face,level)).rgb;}
float3 borderTexel(uint face,int2 pixel,uint size,uint level){bool2 outside=pixel<0||pixel>=(int)size;if(all(outside)){float3 corner=sign(hbAtlasFaceDirection(face,float2(pixel.x<0?0:1,pixel.y<0?0:1)));uint fx=corner.x>0?0:1,fy=corner.y>0?2:3,fz=corner.z>0?4:5;float2 ux=float2(corner.x>0?-corner.z:corner.z,-corner.y)*.5+.5,uy=float2(corner.x,corner.y>0?corner.z:-corner.z)*.5+.5,uz=float2(corner.z>0?corner.x:-corner.x,-corner.y)*.5+.5;return (cornerTexel(fx,clamp((int2)(ux*size),0,(int)size-1),size,level)+cornerTexel(fy,clamp((int2)(uy*size),0,(int)size-1),size,level)+cornerTexel(fz,clamp((int2)(uz*size),0,(int)size-1),size,level))/3;}float3 direction=hbAtlasFaceDirection(face,(float2(pixel)+.5)/size);float2 uv;hbAtlasFaceUV(direction,face,uv);pixel=clamp((int2)floor(uv*size),0,(int)size-1);return cornerTexel(face,pixel,size,level);}
[numthreads(64,1,1)]void Fill(uint3 id:SV_DispatchThreadID){uint size=levelInfo.y,level=levelInfo.x,span=size+2;if(id.x>=4*size+4||id.y>=6)return;int2 pixel;if(id.x<span)pixel=int2(int(id.x)-1,-1);else if(id.x<span*2)pixel=int2(int(id.x-span)-1,size);else if(id.x<span*2+size)pixel=int2(-1,id.x-span*2);else pixel=int2(size,id.x-span*2-size);uint2 origin=placement.xy+uint2(id.y*(size+2)+1,2*placement.z-2*size+2*level+1);atlasPadding[int2(origin)+pixel]=float4(borderTexel(id.y,pixel,size,level),1);}
)HLSL";
}
