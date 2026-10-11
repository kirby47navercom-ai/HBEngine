#pragma once
#include <array>

namespace hb::gpu {
struct Scene2D {
    // pass: offscreen mode, inside/outside mask, lit2d, mask alpha cutoff.
    std::array<float,4> pass{},screen{1,1,0,0},origin{0,0,-1,1},modes{},channels{-1,-1,-1,-1};
    std::array<float,4> maskX{1,0,0,0},maskY{0,1,0,0},project{};
};
static_assert(sizeof(Scene2D)==128,"2D constant buffer layout");
inline constexpr const char* scene2DDeclarations=R"HLSL(
cbuffer Settings2D:register(b1){float4 pass2d,screen2d,origin2d,modes2d,channels2d,maskX2d,maskY2d,project2d;};
Texture2D spriteMask2d:register(t31),lightData2d:register(t32),lightShape2d:register(t33),shadowAtlas2d:register(t34),shadowRects2d:register(t35),shadowBounds2d:register(t36),lightMask2d:register(t38);
Texture2DArray cookies2d:register(t37);
SamplerState maskSampler2d:register(s13),linear2d:register(s14),nearest2d:register(s15);
)HLSL";
inline constexpr const char* scene2DFunctions=R"HLSL(
float4 readLight2d(int column,int row){return lightData2d.Load(int3(column,row,0));}
float fade2d(float low,float high,float v){return high-low<.00001?step(high,v):smoothstep(low,high,v);}
float polygon2d(float2 p,int count,int row,float falloff){
 count=clamp(count,0,64);if(count<3)return 0;
 bool inside=false;float distance=1e20;
 [loop]for(int j=0;j<count;j++){float2 a=lightShape2d.Load(int3(j,row,0)).xy,b=lightShape2d.Load(int3((j+1)%count,row,0)).xy,e=b-a;
  distance=min(distance,length(p-a-saturate(dot(p-a,e)/max(dot(e,e),1e-20))*e));
  if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside||distance<.00001?1:falloff<=0?0:1-smoothstep(0,falloff,distance);
}
float3 shade2d(float2 worldPoint,float2 uv,float3 normal,float3 albedo){
 float3 accum[4];[unroll]for(int j=0;j<4;j++)accum[j]=0;
 int layer=(int)screen2d.z,part=layer/8;float4 maskValue=pass2d.w>0?lightMask2d.Sample(maskSampler2d,float2(dot(maskX2d.xyz,float3(uv,1)),dot(maskY2d.xyz,float3(uv,1)))):1;
 [loop]for(int row=0;row<(int)screen2d.w;row++){
  if(origin2d.z>=0&&abs(row-origin2d.z)>.5)continue;
  float4 bits=readLight2d(part<4?5:6,row);if(((uint)bits[part%4]&(1u<<(layer%8)))==0)continue;
  float4 at=readLight2d(0,row),tint=readLight2d(1,row);float attenuation=1,response=1,coverage=1;
  int normalMode=(int)at.w%4,style=((int)at.w/4)%4;bool alphaBlend=at.w>=16;
  float4 extra=(at.z>3.5||origin2d.z>=0)?readLight2d(8,row):0;
  if(origin2d.z>=0){normalMode=0;alphaBlend=false;}
  if(at.z>.5){
   float4 range=readLight2d(2,row),settings=readLight2d(3,row),basis=readLight2d(4,row);
   float2 delta=worldPoint-at.xy,local=float2(dot(basis.xy,delta),dot(basis.zw,delta));float distance=length(local);
   if(at.z>3.5){if(extra.x<0)continue;float4 bounds=readLight2d(7,row);float2 cookieUV=(local-bounds.xy)/bounds.zw+.5;if(any(cookieUV<0)||any(cookieUV>1))continue;
    if(extra.y>.5)cookieUV=(min(floor(cookieUV*origin2d.w),origin2d.w-1)+.5)/origin2d.w;
    float4 cookie=cookies2d.Sample(linear2d,float3(cookieUV.x,1-cookieUV.y,extra.x));tint.rgb*=cookie.rgb;attenuation=cookie.a;
   }else attenuation=pow(at.z>2.5?(distance>range.z?0:polygon2d(local,(int)range.x,(int)settings.z,range.y)):1-fade2d(range.x,range.y,distance),settings.x);
   if(origin2d.z>=0){attenuation*=extra.z;settings.w=extra.w;}
   if(at.z>1.5&&at.z<2.5&&distance>.00001)attenuation*=fade2d(range.z,range.w,local.y/distance);
   if(attenuation<=0)continue;coverage=attenuation;
   if(normalMode){float2 normalDelta=at.xy-(normalMode==1?origin2d.xy:worldPoint);response=max(0,dot(normal,safeNormal(float3(normalDelta,max(.00001,settings.y)))));attenuation*=response;coverage*=response;}
   if(settings.w>0){float4 rect=shadowRects2d.Load(int3(row,layer,0));if(rect.z>0){float4 bounds=shadowBounds2d.Load(int3(row,0,0));float2 shadowUV=(worldPoint-bounds.xy)/bounds.zw+.5;
    if(all(shadowUV>=0)&&all(shadowUV<=1)){float2 sampleUV=rect.xy+shadowUV*rect.zw;sampleUV.y=1-sampleUV.y;float3 shadow=shadowAtlas2d.Sample(linear2d,sampleUV).rgb;attenuation*=1-settings.w*saturate(max(shadow.r,shadow.g*(1-saturate(shadow.b))));}
   }}
  }
  float3 contribution=tint.rgb*tint.a*attenuation;
  if(alphaBlend)accum[style]=contribution*response+accum[style]*(1-saturate(coverage));else accum[style]+=contribution;
 }
 float3 multiply=0,add=0;
 [unroll]for(int style=0;style<4;style++){float mask=1,channel=channels2d[style];if(channel>=0){mask=maskValue[(int)channel%4];if(channel>3.5)mask=1-mask;}
  float3 contribution=accum[style]*mask;if(modes2d[style]<.5)multiply+=contribution;else add+=contribution*(modes2d[style]<1.5?1:-1);
 }
 return origin2d.z>=0?accum[0]+accum[1]+accum[2]+accum[3]:max(0,albedo*multiply+add);
}
void clipMask2d(float2 pixel){if(pass2d.y>.5){float mask=spriteMask2d.Load(int3((int2)pixel,0)).r;if(pass2d.y<1.5?mask<.5:mask>=.5)discard;}}
float4 offscreen2d(float4 base,float4 coverage){
 if(pass2d.x==1){clip(base.a-pass2d.w);return float4(1,1,1,1);}
 if(pass2d.x==4||pass2d.x==5){float shade=coverage.w>.00001?1-(1-coverage.z)/coverage.w:1;return pass2d.x==4?float4(saturate(shade),0,0,0):float4(0,saturate(shade),0,0);}
 if(base.a<=pass2d.w)discard;return pass2d.x==2?float4(base.a,0,0,0):float4(0,0,base.a,0);
}
)HLSL";
}
