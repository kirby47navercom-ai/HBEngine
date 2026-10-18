#include <HBEngine/Compute.hpp>
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){try{
 if(argc!=2)throw std::runtime_error("Shader source required");
 std::ifstream input(argv[1]);if(!input)throw std::runtime_error("Shader source missing");
 const std::string source{std::istreambuf_iterator<char>(input),{}};
 hb::gpu::detail::Com<ID3DBlob> output,error;
 auto preprocess=hb::gpu::detail::libraries().symbol<decltype(&D3DPreprocess)>(hb::gpu::detail::libraries().compiler,"D3DPreprocess");
 const auto result=preprocess(source.data(),source.size(),"RayHelpers436",nullptr,nullptr,&output.p,&error.p);
 if(FAILED(result))throw std::runtime_error(error.p?std::string(static_cast<const char*>(error->GetBufferPointer()),error->GetBufferSize()):"Preprocess failed");
 std::cout.write(static_cast<const char*>(output->GetBufferPointer()),output->GetBufferSize());
}catch(const std::exception& error){std::cerr<<error.what()<<'\n';return 1;}}
