#pragma once
// Block compression for colour textures: sRGB-correct box-filtered mip chain, then BC1 (opaque) or BC3 (with alpha).
// Endpoints follow the block's principal colour axis; indices pick the nearest decoded palette entry.
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <vector>

namespace hb::gpu {
struct CompressedLevel {std::uint32_t width=0,height=0;std::vector<std::uint8_t> bytes;};

class TextureCompression {
    static float toLinear(std::uint8_t v){static const auto table=[]{std::array<float,256> t{};for(int i=0;i<256;i++){const float c=i/255.f;t[i]=c<=.04045f?c/12.92f:std::pow((c+.055f)/1.055f,2.4f);}return t;}();return table[v];}
    static std::uint8_t toSrgb(float v){v=std::clamp(v,0.f,1.f);const float c=v<=.0031308f?v*12.92f:1.055f*std::pow(v,1/2.4f)-.055f;return std::uint8_t(std::lround(c*255));}
    static std::uint16_t pack565(const float c[3]){const int r=std::clamp(int(std::lround(c[0]*31/255.f)),0,31),g=std::clamp(int(std::lround(c[1]*63/255.f)),0,63),b=std::clamp(int(std::lround(c[2]*31/255.f)),0,31);return std::uint16_t(r<<11|g<<5|b);}
    static void unpack565(std::uint16_t v,float c[3]){c[0]=float((v>>11)&31)*255/31.f;c[1]=float((v>>5)&63)*255/63.f;c[2]=float(v&31)*255/31.f;}
    // 8 bytes: two RGB565 endpoints (c0 > c1 selects 4-colour mode) and 2-bit indices.
    static void colorBlock(const std::uint8_t px[16][4],std::uint8_t* out){
        float mean[3]{};for(int i=0;i<16;i++)for(int k=0;k<3;k++)mean[k]+=px[i][k]/16.f;
        float cov[6]{};for(int i=0;i<16;i++){const float d[3]={px[i][0]-mean[0],px[i][1]-mean[1],px[i][2]-mean[2]};cov[0]+=d[0]*d[0];cov[1]+=d[0]*d[1];cov[2]+=d[0]*d[2];cov[3]+=d[1]*d[1];cov[4]+=d[1]*d[2];cov[5]+=d[2]*d[2];}
        float axis[3]={1,1,1};for(int step=0;step<8;step++){const float n[3]={cov[0]*axis[0]+cov[1]*axis[1]+cov[2]*axis[2],cov[1]*axis[0]+cov[3]*axis[1]+cov[4]*axis[2],cov[2]*axis[0]+cov[4]*axis[1]+cov[5]*axis[2]};const float len=std::sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);if(len<1e-6f)break;for(int k=0;k<3;k++)axis[k]=n[k]/len;}
        float lo=1e9f,hi=-1e9f;for(int i=0;i<16;i++){const float t=(px[i][0]-mean[0])*axis[0]+(px[i][1]-mean[1])*axis[1]+(px[i][2]-mean[2])*axis[2];lo=std::min(lo,t);hi=std::max(hi,t);}
        float a[3],b[3];for(int k=0;k<3;k++){a[k]=mean[k]+axis[k]*hi;b[k]=mean[k]+axis[k]*lo;}
        std::uint16_t c0=pack565(a),c1=pack565(b);if(c0<c1)std::swap(c0,c1);
        std::uint32_t indices=0;
        if(c0!=c1){
            float palette[4][3];unpack565(c0,palette[0]);unpack565(c1,palette[1]);for(int k=0;k<3;k++){palette[2][k]=(2*palette[0][k]+palette[1][k])/3;palette[3][k]=(palette[0][k]+2*palette[1][k])/3;}
            for(int i=0;i<16;i++){int best=0;float bestError=1e30f;for(int p=0;p<4;p++){float e=0;for(int k=0;k<3;k++){const float d=px[i][k]-palette[p][k];e+=d*d;}if(e<bestError){bestError=e;best=p;}}indices|=std::uint32_t(best)<<(2*i);}
        }
        out[0]=std::uint8_t(c0);out[1]=std::uint8_t(c0>>8);out[2]=std::uint8_t(c1);out[3]=std::uint8_t(c1>>8);for(int i=0;i<4;i++)out[4+i]=std::uint8_t(indices>>(8*i));
    }
    // 8 bytes: alpha endpoints a0 > a1 (8-value mode) and 3-bit indices.
    static void alphaBlock(const std::uint8_t px[16][4],std::uint8_t* out){
        int lo=255,hi=0;for(int i=0;i<16;i++){lo=std::min<int>(lo,px[i][3]);hi=std::max<int>(hi,px[i][3]);}
        out[0]=std::uint8_t(hi);out[1]=std::uint8_t(lo);std::uint64_t bits=0;
        if(hi!=lo){float palette[8];palette[0]=float(hi);palette[1]=float(lo);for(int p=1;p<7;p++)palette[p+1]=((7-p)*float(hi)+p*float(lo))/7;
            for(int i=0;i<16;i++){int best=0;float bestError=1e30f;for(int p=0;p<8;p++){const float e=std::abs(px[i][3]-palette[p]);if(e<bestError){bestError=e;best=p;}}bits|=std::uint64_t(best)<<(3*i);}}
        for(int i=0;i<6;i++)out[2+i]=std::uint8_t(bits>>(8*i));
    }
public:
    static bool hasAlpha(const std::vector<std::uint8_t>& rgba){for(std::size_t i=3;i<rgba.size();i+=4)if(rgba[i]!=255)return true;return false;}
    // Level 0 must be a multiple of 4 in both directions; smaller levels pad their last block by repeating edge pixels.
    static std::vector<CompressedLevel> compress(std::uint32_t width,std::uint32_t height,const std::vector<std::uint8_t>& rgba,std::uint32_t mips,bool alpha){
        std::vector<CompressedLevel> levels;std::vector<std::uint8_t> level=rgba;std::uint32_t w=width,h=height;
        const std::size_t blockBytes=alpha?16:8;
        for(std::uint32_t m=0;m<mips;m++){
            CompressedLevel out;out.width=w;out.height=h;const std::uint32_t bw=std::max(1u,(w+3)/4),bh=std::max(1u,(h+3)/4);out.bytes.resize(std::size_t(bw)*bh*blockBytes);
            for(std::uint32_t by=0;by<bh;by++)for(std::uint32_t bx=0;bx<bw;bx++){
                std::uint8_t px[16][4];for(int i=0;i<16;i++){const std::uint32_t x=std::min(w-1,bx*4+std::uint32_t(i%4)),y=std::min(h-1,by*4+std::uint32_t(i/4));std::copy_n(&level[(std::size_t(y)*w+x)*4],4,px[i]);}
                auto* block=&out.bytes[(std::size_t(by)*bw+bx)*blockBytes];if(alpha){alphaBlock(px,block);colorBlock(px,block+8);}else colorBlock(px,block);
            }
            levels.push_back(std::move(out));
            if(m+1==mips)break;
            const std::uint32_t nw=std::max(1u,w/2),nh=std::max(1u,h/2);std::vector<std::uint8_t> next(std::size_t(nw)*nh*4);
            for(std::uint32_t y=0;y<nh;y++)for(std::uint32_t x=0;x<nw;x++){float sum[4]{};
                for(std::uint32_t dy=0;dy<2;dy++)for(std::uint32_t dx=0;dx<2;dx++){const std::uint32_t sx=std::min(w-1,x*2+dx),sy=std::min(h-1,y*2+dy);const auto* p=&level[(std::size_t(sy)*w+sx)*4];for(int k=0;k<3;k++)sum[k]+=toLinear(p[k]);sum[3]+=p[3];}
                auto* q=&next[(std::size_t(y)*nw+x)*4];for(int k=0;k<3;k++)q[k]=toSrgb(sum[k]/4);q[3]=std::uint8_t(std::lround(sum[3]/4));}
            level=std::move(next);w=nw;h=nh;
        }
        return levels;
    }
};
}
