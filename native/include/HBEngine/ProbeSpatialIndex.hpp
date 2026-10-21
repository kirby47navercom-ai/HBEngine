#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <functional>
#include <limits>
#include <stdexcept>
#include <vector>

namespace hb::gpu {
using ProbeSpatialShape=std::array<float,18>;
struct ProbeSpatialBounds{std::array<float,3> minimum,maximum;};
inline ProbeSpatialBounds probeSpatialBounds(const ProbeSpatialShape& s){
    constexpr double epsilon=1.0/16777216.0,gamma=64*epsilon/(1-64*epsilon);const auto limit=std::numeric_limits<float>::max();const ProbeSpatialBounds fallback{{-limit,-limit,-limit},{limit,limit,limit}};
    const double a=s[6],b=s[7],c=s[8],d=s[10],e=s[11],f=s[12],g=s[14],h=s[15],i=s[16],det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(!std::isfinite(det)||det==0)return fallback;
    std::array<std::array<double,3>,3> inverse{{{e*i-f*h,c*h-b*i,b*f-c*e},{f*g-d*i,a*i-c*g,c*d-a*f},{d*h-e*g,b*g-a*h,a*e-b*d}}};for(auto& row:inverse)for(auto& v:row)v/=det;
    const double normA=std::max({std::abs(a)+std::abs(b)+std::abs(c),std::abs(d)+std::abs(e)+std::abs(f),std::abs(g)+std::abs(h)+std::abs(i)}),normInverse=std::max({std::abs(inverse[0][0])+std::abs(inverse[0][1])+std::abs(inverse[0][2]),std::abs(inverse[1][0])+std::abs(inverse[1][1])+std::abs(inverse[1][2]),std::abs(inverse[2][0])+std::abs(inverse[2][1])+std::abs(inverse[2][2])}),normT=std::max({std::abs(double(s[9])),std::abs(double(s[13])),std::abs(double(s[17]))}),condition=normA*normInverse*gamma;
    if(!std::isfinite(condition)||condition>=.25){return fallback;}double local=0;for(unsigned k=0;k<6;k++)local=std::max(local,std::abs(double(s[k])));const double magnitude=normInverse*(local+normT)*(1+gamma)/(1-condition),padding=2*normInverse*gamma*(normA*magnitude+normT+1);if(!std::isfinite(magnitude)||!std::isfinite(padding))return fallback;
    std::array<double,3> lo{INFINITY,INFINITY,INFINITY},hi{-INFINITY,-INFINITY,-INFINITY};for(unsigned corner=0;corner<8;corner++){std::array<double,3> q{};for(unsigned k=0;k<3;k++)q[k]=double(s[(corner&(1u<<k)?3:0)+k])-s[9+k*4];for(unsigned k=0;k<3;k++){const double v=inverse[k][0]*q[0]+inverse[k][1]*q[1]+inverse[k][2]*q[2];lo[k]=std::min(lo[k],v);hi[k]=std::max(hi[k],v);}}
    const auto outward=[&](double v,bool lower){if(!std::isfinite(v)||std::abs(v)>=limit)return lower?-limit:limit;return std::clamp(std::nextafter(float(v),lower?-INFINITY:INFINITY),-limit,limit);};ProbeSpatialBounds result{};for(unsigned k=0;k<3;k++){result.minimum[k]=outward(lo[k]-padding,true);result.maximum[k]=outward(hi[k]+padding,false);}return result;
}
class ProbeSpatialIndex{
    std::vector<ProbeSpatialShape> shapes;
    std::vector<std::array<float,4>> packed;
    std::uint64_t builds_=0;
public:
    bool update(const std::vector<ProbeSpatialShape>& next){
        if(next==shapes){return false;}if(next.size()>(std::numeric_limits<std::uint32_t>::max()-1u)/2u)throw std::runtime_error("Probe spatial addressing exceeds hardware integer range");
        struct Node{ProbeSpatialBounds bounds;std::uint32_t skip=0,leaf=0,rank=0;};std::vector<Node> nodes;std::vector<ProbeSpatialBounds> bounds;std::vector<std::uint32_t> order;nodes.reserve(next.empty()?0:next.size()*2-1);for(std::size_t n=0;n<next.size();n++){bounds.push_back(probeSpatialBounds(next[n]));order.push_back(std::uint32_t(n));}
        std::function<void(std::size_t,std::size_t)> build=[&](std::size_t begin,std::size_t end){const auto index=nodes.size();const auto limit=std::numeric_limits<float>::max();Node node{{{limit,limit,limit},{-limit,-limit,-limit}},0,0,std::numeric_limits<std::uint32_t>::max()};for(auto at=begin;at<end;at++){const auto rank=order[at];node.rank=std::min(node.rank,rank);for(unsigned k=0;k<3;k++){node.bounds.minimum[k]=std::min(node.bounds.minimum[k],bounds[rank].minimum[k]);node.bounds.maximum[k]=std::max(node.bounds.maximum[k],bounds[rank].maximum[k]);}}nodes.push_back(node);
            if(end-begin==1)nodes[index].leaf=order[begin]+1;else{unsigned axis=0;for(unsigned k=1;k<3;k++)if(double(node.bounds.maximum[k])-node.bounds.minimum[k]>double(node.bounds.maximum[axis])-node.bounds.minimum[axis])axis=k;std::stable_sort(order.begin()+begin,order.begin()+end,[&](auto x,auto y){return double(bounds[x].minimum[axis])*.5+double(bounds[x].maximum[axis])*.5<double(bounds[y].minimum[axis])*.5+double(bounds[y].maximum[axis])*.5;});const auto mid=begin+(end-begin)/2;build(begin,mid);build(mid,end);}nodes[index].skip=std::uint32_t(nodes.size());};
        if(!next.empty()){build(0,next.size());}std::vector<std::array<float,4>> data;data.reserve(nodes.size()*3);for(const auto& n:nodes){data.push_back({n.bounds.minimum[0],n.bounds.minimum[1],n.bounds.minimum[2],float(n.skip%65536)});data.push_back({n.bounds.maximum[0],n.bounds.maximum[1],n.bounds.maximum[2],float(n.skip/65536)});data.push_back({float(n.leaf%65536),float(n.leaf/65536),float(n.rank%65536),float(n.rank/65536)});}shapes=next;packed=std::move(data);++builds_;return true;
    }
    void clear(){std::vector<ProbeSpatialShape>().swap(shapes);std::vector<std::array<float,4>>().swap(packed);builds_=0;}
    const std::vector<std::array<float,4>>& data()const{return packed;}
    std::size_t nodes()const{return packed.size()/3;}std::uint64_t builds()const{return builds_;}
    std::size_t cpuBytes()const{return packed.capacity()*16+shapes.capacity()*sizeof(ProbeSpatialShape);}
};
}
