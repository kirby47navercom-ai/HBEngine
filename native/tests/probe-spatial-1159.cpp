#include <HBEngine/ProbeSpatialIndex.hpp>
#include <cassert>
#include <fstream>
#include <iostream>

using Record=std::array<float,36>;
static std::uint32_t word(float low,float high){return std::uint32_t(low)+std::uint32_t(high)*65536u;}
static bool covers(const Record& r,const std::array<float,3>& p){float distance=INFINITY;for(unsigned k=0;k<3;k++){const unsigned at=12+k*4;float q=r[at]*p[0];q+=r[at+1]*p[1];q+=r[at+2]*p[2];q+=r[at+3];distance=std::min(distance,std::min(q-r[4+k],r[8+k]-q)*r[24+k]);}return r[7]>0?distance>0:distance>=0;}
int main(int argc,char** argv){
    assert(word(3,256)==16777219u&&word(5,256)==16777221u);assert(argc==2);std::ifstream input(argv[1]);assert(input.good());unsigned cases=0;input>>cases;std::uint64_t queries=0,visited=0,leaves=0,capacity=0;
    for(unsigned test=0;test<cases;test++){
        std::size_t count=0,points=0;input>>count>>points;std::vector<Record> records(count);std::vector<hb::gpu::ProbeSpatialShape> shapes(count);for(std::size_t i=0;i<count;i++){for(auto& v:records[i])input>>v;const std::array<unsigned,18> fields{4,5,6,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23};for(unsigned k=0;k<18;k++)shapes[i][k]=records[i][fields[k]];}hb::gpu::ProbeSpatialIndex tree;assert(tree.update(shapes));assert(!tree.update(shapes));assert(tree.nodes()==count*2-1);const auto& data=tree.data();
        for(std::size_t q=0;q<points;q++){
            std::array<float,3> point{};for(auto& v:point)input>>v;std::array<int,2> expected{-1,-1},actual{-1,-1};for(std::size_t i=0;i<count;i++)if(covers(records[i],point)){if(expected[0]<0)expected[0]=int(i);else{expected[1]=int(i);break;}}
            for(std::uint32_t cursor=0;cursor<tree.nodes();){visited++;const auto& lo=data[cursor*3];const auto& hi=data[cursor*3+1];const auto& meta=data[cursor*3+2];bool outside=false;for(unsigned k=0;k<3;k++)outside|=point[k]<lo[k]||point[k]>hi[k];if(outside||(actual[1]>=0&&word(meta[2],meta[3])>=std::uint32_t(actual[1]))){cursor=word(lo[3],hi[3]);continue;}const auto leaf=word(meta[0],meta[1]);if(leaf){leaves++;const int rank=int(leaf-1);if(covers(records[leaf-1],point)){if(actual[0]<0||rank<actual[0]){actual[1]=actual[0];actual[0]=rank;}else if(actual[1]<0||rank<actual[1])actual[1]=rank;}}cursor++;}assert(actual==expected);queries++;
        }
        capacity+=tree.cpuBytes();tree.clear();assert(tree.nodes()==0&&tree.cpuBytes()==0&&tree.builds()==0);
    }
    assert(!input.fail());std::cout<<"{\"passed\":true,\"cases\":"<<cases<<",\"queries\":"<<queries<<",\"visitedNodes\":"<<visited<<",\"testedLeaves\":"<<leaves<<",\"retainedCPUPayloadBytes\":"<<capacity<<",\"released\":true}";
}
