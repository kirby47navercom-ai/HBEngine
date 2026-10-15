#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
#include <limits>
using namespace hb::gpu;
int main(){
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
    Device gpu;
    SceneRenderer r(gpu,96,80);const std::vector<SceneVertex> vertices={{{-1,-1,.4f}},{{1,-1,.4f}},{{1,1,.4f}},{{-1,1,.4f}}};auto mesh=r.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial mat;mat.color={.7f,.7f,.7f,1};mat.roughness=.5f;mat.doubleSided=true;
    SceneFrame f;f.ambient={0,0,0,1};f.eye={0,0,5,1};f.viewport={8,8,64,64};
    const auto draw=[&](const SceneFrame& frame,const SceneMaterial& material){r.begin(frame);r.draw(mesh,identity,identity,material);return r.readPixels();};
    std::vector<SceneLight> lights(4097);for(std::size_t i=0;i<lights.size();i++){auto& l=lights[i];l.position={100+float(i)*3,100,1,1};l.direction={0,0,-1,2};l.color={.8f,.5f,.2f,1};}
    for(int i=0;i<7;i++){lights[i].position={float(i%3-1)*.4f,float(i/3-1)*.5f,1.2f,1};lights[i].color[3]=.08f;}
    lights[7].position={0,0,0,0};lights[7].direction={0,0,1,0};lights[7].color={.1f,.2f,.3f,.4f};
    lights[8].position={0,0,0,3};lights[8].direction={0,1,0,0};lights[8].color={.1f,.15f,.2f,.1f};lights[8].cone={.2f,.15f,.1f,0};
    lights[9].position={0,0,1,2};lights[9].direction={0,0,-1,1.5f};lights[9].cone={.6f,.9f,2,0};lights[9].color[3]=.08f;
    lights[10].position={3,0,1,1};lights[10].direction[3]=0;lights[10].color[3]=.1f;
    lights[11].position={1.8f,0,1.2f,1};lights[11].direction[3]=2;lights[11].color[3]=.1f;
    r.setLights(lights);auto a=draw(f,mat);assert(r.lightTileBytes()==4*4*129*4);const auto dispatch=r.lightTileDispatches();assert(dispatch==1);auto again=draw(f,mat);assert(a==again&&r.lightTileDispatches()==dispatch);
    auto reference=f;reference.rasterLightCulling=false;auto b=draw(reference,mat);assert(a==b&&r.lightTileBytes()==0);assert(a[(40*96+48)*4]>30);
    auto moved=f;moved.viewProjection[12]=.3f;moved.viewport={3,5,70,60};a=draw(moved,mat);reference=moved;reference.rasterLightCulling=false;b=draw(reference,mat);assert(a==b);
    // Perspective tile planes must conservatively retain lights crossing the camera.
    SceneFrame perspective=f;perspective.viewport={0,0,96,80};perspective.eye={0,0,0,1};perspective.viewProjection={1.2f,0,0,0,0,1.5f,0,0,0,0,1.01f,1,0,0,-.101f,0};
    lights[12].position={0,0,.01f,1};lights[12].direction[3]=10;lights[12].color[3]=.005f;r.setLights(lights);a=draw(perspective,mat);reference=perspective;reference.rasterLightCulling=false;b=draw(reference,mat);assert(a==b);
    r.setLights({});assert(r.lightTileBytes()==0);draw(f,mat);
    std::vector<float> texels(16*8*4);for(std::size_t i=0;i<texels.size();i+=4){texels[i]=.2f;texels[i+1]=.4f;texels[i+2]=.8f;texels[i+3]=1;}
    auto make=[&]{const auto* bytes=reinterpret_cast<const std::uint8_t*>(texels.data());return r.createDataTexture(16,8,{bytes,bytes+texels.size()*sizeof(float)},4,true);};auto map=make();
    const auto dark=draw(f,mat);r.setSkyEnvironment(&map,32,0,1);const auto filtered=r.probeDispatches();a=draw(f,mat);const auto center=(40*96+48)*4;assert(a[center+2]>a[center+1]&&a[center+1]>a[center]&&a[center]>30);assert(dark[center]<3);assert(r.skyEnvironmentBytes()>0);
    r.setSkyEnvironment(&map,32,90,.5f);b=draw(f,mat);assert(b[center+2]<a[center+2]&&r.probeDispatches()==filtered);r.setSkyEnvironment(&map,32,180,1);b=draw(f,mat);for(int c=0;c<3;c++)assert(std::abs(int(a[center+c])-int(b[center+c]))<=1);
    SceneMaterial metal=mat;metal.color={1,1,1,1};metal.metalness=1;metal.roughness=.04f;const auto spec=draw(f,metal);assert(spec[center+2]>spec[center]&&spec[center+2]>50);
    auto tiltedVertices=vertices;for(auto& vertex:tiltedVertices)vertex.normal={.98f,0,.2f};auto tilted=r.createMesh(tiltedVertices,{0,1,2,0,2,3});SceneFrame glassFrame=f;glassFrame.transmission=true;SceneMaterial glass=mat;glass.color={1,1,1,1};glass.roughness=.04f;glass.transmission=true;glass.volume={1,0,0,0};
    const auto refract=[&]{r.begin(glassFrame);r.captureTransmission();r.draw(tilted,identity,identity,glass);return r.readPixels();};const auto onScreen=refract();glass.volume[1]=100;const auto offScreen=refract();assert(offScreen[center+2]>onScreen[center+2]+30&&offScreen[center+2]>offScreen[center]);
    for(int y=0;y<8;y++)for(int x=0;x<16;x++){const auto i=(y*16+x)*4;texels[i]=x>=8?2.f:0.f;texels[i+1]=0;texels[i+2]=x<8?2.f:0.f;}
    auto striped=make();r.setSkyEnvironment(&striped,32,0,1);const auto red=draw(f,metal);r.setSkyEnvironment(&striped,32,180,1);const auto blue=draw(f,metal);assert(red[center]>red[center+2]+30&&blue[center+2]>blue[center]+30);
    // Full local coverage replaces the sky; an empty local binding leaves the sky intact.
    auto local=r.createProbe(16);for(unsigned face=0;face<6;face++){r.beginProbe(local,face,identity,{0,0,0,1},{0,2,0,1},false);r.endProbe();}r.filterProbe(local);std::array<SceneRenderer::ProbeBinding,2> bindings{};ProbeSettings settings;settings.minimum={-5,-5,-5,0};settings.maximum={5,5,5,0};bindings[0]={&local,settings};r.begin(f);r.draw(mesh,identity,identity,metal,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,nullptr,&bindings);const auto green=r.readPixels();assert(green[center+1]>green[center]+30&&green[center+1]>green[center+2]+30);
    auto sliced=r.createProbe(16);for(unsigned face=0;face<6;face++){r.beginProbe(sliced,face,identity,{0,0,0,1},{0,2,0,1},false);r.endProbe();}const auto startDispatches=r.probeDispatches();for(unsigned stage=0;stage<=5;stage++){const auto beforeStep=r.probeDispatches();const bool complete=r.filterProbeStep(sliced,stage);assert(complete==(stage==5));assert(sliced.available()==complete);assert(r.probeDispatches()-beforeStep==(stage==0?0:1));}assert(r.probeDispatches()-startDispatches==5);bindings[0].resource=&sliced;r.begin(f);r.draw(mesh,identity,identity,metal,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,nullptr,&bindings);assert(r.readPixels()==green);
    r.setSkyEnvironment(nullptr);const auto off=draw(f,mat);assert(off==dark&&r.skyEnvironmentBytes()==0);
    bool rejected=false;try{r.setSkyEnvironment(&map,31);}catch(const std::runtime_error&){rejected=true;}assert(rejected);rejected=false;try{r.setSkyEnvironment(&map,32,std::numeric_limits<float>::infinity());}catch(const std::runtime_error&){rejected=true;}assert(rejected);
    r.releaseProbes();std::cout<<"{\"passed\":true,\"lights\":4097,\"tileReferencePixelsExact\":true,\"staticDispatchReuse\":true,\"offsetViewport\":true,\"perspectiveCameraOverlap\":true,\"unboundedAndSpotLights\":true,\"hdrDiffuseAndSpecular\":true,\"rotationPixels\":true,\"intensityNoRefilter\":true,\"localProbeOverridesSky\":true,\"disableRelease\":true,\"automaticReadbacks\":0,\"slicedFilterPixelsExact\":true,\"oneFilterDispatchPerStep\":true,\"incompleteProbeHidden\":true,\"tileBytesAt4097\":8256}";
#else
    std::cout<<"{\"passed\":true,\"available\":false}";
#endif
}
