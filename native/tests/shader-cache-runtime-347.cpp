#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <cassert>
#include <chrono>
#include <iostream>
int main(int argc,char** argv){try{
    using namespace hb::gpu;using Json=nlohmann::json;
    if(argc<3)throw std::runtime_error("private cache and mode required");
    const auto directory=std::filesystem::absolute(argv[1]);const std::string mode=argv[2];
    SceneRenderer::configureShaderCache(directory);Device gpu;
    if(mode=="poison"){
        const std::string source="RWStructuredBuffer<float> result:register(u0);[numthreads(1,1,1)] void Main(uint3 id:SV_DispatchThreadID){result[0]=7;}";
        const auto key=detail::ShaderBytecodeCompiler::key(source,"CachePoison","Main","cs_5_0");assert(!key.empty());
        assert(key!=detail::ShaderBytecodeCompiler::key(source+" ","CachePoison","Main","cs_5_0"));assert(key!=detail::ShaderBytecodeCompiler::key(source,"CachePoison","Other","cs_5_0"));assert(key!=detail::ShaderBytecodeCompiler::key(source,"CachePoison","Main","ps_5_0"));
        const std::string vs="float4 Main(float4 p:POSITION):SV_Position{return p;}";detail::Com<ID3DBlob> vertex,error;
        const auto compile=detail::libraries().symbol<decltype(&D3DCompile)>(detail::libraries().compiler,"D3DCompile");detail::check(compile(vs.data(),vs.size(),"PoisonVS",nullptr,nullptr,"Main","vs_5_0",detail::ShaderBytecodeCompiler::flags,0,&vertex.p,&error.p),"poison fixture vertex");
        const auto* bytes=static_cast<const unsigned char*>(vertex->GetBufferPointer());ShaderBytecodeDiskCache disk(directory);assert(disk.put(key,std::vector<unsigned char>(bytes,bytes+vertex->GetBufferSize())));
        detail::Com<ID3D11Device> device;detail::Com<ID3D11DeviceContext> context;D3D_FEATURE_LEVEL level;
        const auto create=detail::libraries().symbol<decltype(&D3D11CreateDevice)>(detail::libraries().d3d,"D3D11CreateDevice");detail::check(create(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,0,nullptr,0,D3D11_SDK_VERSION,&device.p,&level,&context.p),"poison hardware device");
        detail::Com<ID3D11ComputeShader> kernel;const auto make=[&](const void* data,std::size_t size){return device->CreateComputeShader(data,size,nullptr,&kernel.p);};
        const auto first=detail::ShaderBytecodeCompiler::create(source,"CachePoison","Main","cs_5_0",make);assert(first.compiled&&kernel.p);kernel={};const auto second=detail::ShaderBytecodeCompiler::create(source,"CachePoison","Main","cs_5_0",make);assert(!second.compiled&&kernel.p&&first.code==second.code);
        const auto info=detail::ShaderBytecodeCompiler::info();assert(info[6]==1);std::cout<<Json({{"passed",true},{"validContainerWrongShaderStageRejected",true},{"compilerFallback",true},{"nextHit",true},{"fullSourceAndEntryTargetKeys",true},{"disk",info}});return 0;
    }
    const auto start=std::chrono::steady_clock::now();SceneRenderer renderer(gpu,32,32);
    auto probe=renderer.createProbe(16);for(unsigned face=0;face<6;++face){renderer.beginProbe(probe,face,identity,{0,0,0,1},{.1f,.2f,.3f,1});renderer.endProbe();}renderer.filterProbe(probe);
    renderer.setLights(std::vector<SceneLight>(16));
    auto materialProgram=renderer.createProgram("","base.rgb=float3(.2,.65,.3);",{});
    const std::vector<SceneVertex> vertices={{{-.8f,-.8f,.5f}},{{.8f,-.8f,.5f}},{{.8f,.8f,.5f}},{{-.8f,.8f,.5f}}};auto mesh=renderer.createMesh(vertices,{0,1,2,0,2,3});SceneMaterial material;material.unlit=true;material.toneMapped=false;
    SceneFrame frame;frame.screenEffects.emplace();frame.screenEffects->reflection[0]=.1f;frame.screenEffects->hierarchy[3]=1;frame.bloom.emplace();frame.bloom->strength=.15f;
    renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,&materialProgram);const auto pixels=renderer.readPixels();const auto center=(16*32+16)*4;assert(pixels[center+1]>pixels[center]&&pixels[center+1]>pixels[center+2]);
    const auto disk=renderer.shaderDiskCacheInfo();const auto screen=renderer.shaderCompilationInfo();
    for(int n=0;n<6;++n){renderer.begin(frame);renderer.draw(mesh,identity,identity,material,{}, {},0,0,&materialProgram);assert(renderer.readPixels()==pixels);}
    assert(renderer.shaderDiskCacheInfo()==disk);assert(renderer.shaderCompilationInfo()[0]==screen[0]&&renderer.shaderCompilationInfo()[8]==screen[8]);
    const auto ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
    if(mode=="cold")assert(disk[2]>=21&&screen[0]>0);else if(mode=="warm")assert(disk[0]>=21&&disk[2]==0&&screen[0]==0);else throw std::runtime_error("unknown mode");
    std::cout<<Json({{"passed",true},{"mode",mode},{"hardware",true},{"firstRenderMS",ms},{"screen",screen},{"disk",disk},{"rgba",pixels},{"stableFrames",6},{"cacheIOInStableFrames",0}});
}catch(const std::exception& error){std::cerr<<error.what()<<'\n';return 1;}}
