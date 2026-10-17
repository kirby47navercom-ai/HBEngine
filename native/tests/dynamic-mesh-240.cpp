#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
#include <limits>
using namespace hb::gpu;
int main(){
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
 Device gpu;SceneRenderer r(gpu,64,64);const std::vector<SceneVertex> initial={{{-.8f,-.8f,.5f}},{{.8f,-.8f,.5f}},{{.8f,.8f,.5f}},{{-.8f,.8f,.5f}}};const std::vector<std::uint32_t> indices={0,1,2,0,2,3};auto mesh=r.createMesh(initial,indices,{},true),fixed=r.createMesh(initial,indices);SceneFrame frame;frame.clear={0,0,0,1};SceneMaterial mat;mat.color={1,0,0,1};mat.unlit=true;mat.toneMapped=false;mat.doubleSided=true;const auto draw=[&](){r.begin(frame);r.draw(mesh,identity,identity,mat);return r.readPixels();};const auto before=draw();const auto uploads=r.uploads();std::vector<std::array<float,6>> values;for(const auto& v:initial)values.push_back({v.position[0]-.7f,v.position[1],v.position[2],0,0,1});r.updateMeshVertices(mesh,values);const auto moved=draw();assert(before!=moved);assert(r.uploads()==uploads);assert(r.meshUpdates()==1);assert(r.meshUpdateBytes()==initial.size()*sizeof(SceneVertex));assert(mesh.bufferBytes()==initial.size()*sizeof(SceneVertex)*3+indices.size()*4);assert(mesh.cpuBytes()>=initial.size()*sizeof(SceneVertex));assert(fixed.cpuBytes()==0);for(int k=0;k<6;k++){for(std::size_t i=0;i<values.size();i++)values[i][0]=initial[i].position[0];r.updateMeshVertices(mesh,values);assert(draw()==before);}const auto count=r.meshUpdates();bool invalid=false;try{r.updateMeshVertices(fixed,values);}catch(const std::runtime_error&){invalid=true;}assert(invalid);invalid=false;auto bad=values;bad[0][0]=std::numeric_limits<float>::quiet_NaN();try{r.updateMeshVertices(mesh,bad);}catch(const std::runtime_error&){invalid=true;}assert(invalid);assert(r.meshUpdates()==count);assert(draw()==before);invalid=false;try{r.updateMeshVertices(mesh,{});}catch(const std::runtime_error&){invalid=true;}assert(invalid);std::cout<<"{\"passed\":true,\"pixelsChanged\":true,\"ringCyclesExact\":true,\"uploadsStayed\":"<<uploads<<",\"vertexUpdates\":"<<r.meshUpdates()<<",\"gpuBytes\":"<<mesh.bufferBytes()<<",\"cpuBytes\":"<<mesh.cpuBytes()<<"}";
#else
 std::cout<<"{\"passed\":true,\"available\":false}";
#endif
}
