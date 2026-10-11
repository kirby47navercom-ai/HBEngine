#pragma once
#include <HBEngine/SceneRender.hpp>
#include <nlohmann/json.hpp>
#include <unordered_map>
class SceneRenderBridge {
    using Json=nlohmann::json;using Renderer=hb::gpu::SceneRenderer;
    std::unique_ptr<hb::gpu::Device> device;
    std::unique_ptr<Renderer> renderer;
    std::unordered_map<std::string,Renderer::Mesh> meshes;
    std::unordered_map<std::string,Renderer::Texture> textures;
    std::unordered_map<std::string,Renderer::Program> programs;
    struct Draw {std::string mesh,program;hb::gpu::Matrix world=hb::gpu::identity,normal=hb::gpu::identity;hb::gpu::SceneMaterial material;std::array<std::string,6> maps{};std::array<std::uint32_t,6> sampling{};std::vector<std::string> programMaps;std::vector<std::uint32_t> programSampling;std::uint32_t first=0,count=0;float shadowAlphaCutoff=0;};
    std::unordered_map<std::string,Draw> draws;
    std::vector<std::string> order;
    std::vector<std::vector<std::string>> shadowCasters;
    template<std::size_t N> static std::array<float,N> floats(const Json& value){if(!value.is_array()||value.size()!=N)throw std::runtime_error("Render vector size invalid");std::array<float,N> result;for(std::size_t i=0;i<N;i++){if(!value[i].is_number())throw std::runtime_error("Render value must be numeric");result[i]=value[i].get<float>();if(!std::isfinite(result[i]))throw std::runtime_error("Render value must be finite");}return result;}
    static std::string id(const Json& value){auto text=value.get<std::string>();if(text.empty()||text.size()>200||text.find('\0')!=std::string::npos)throw std::runtime_error("Render resource ID invalid");return text;}
    static std::vector<std::uint8_t> rgbaBytes(const std::string& text){
        if(text.empty()||text.size()%4)throw std::runtime_error("Render RGBA base64 size invalid");
        const auto digit=[](char c){if(c>='A'&&c<='Z')return c-'A';if(c>='a'&&c<='z')return c-'a'+26;if(c>='0'&&c<='9')return c-'0'+52;if(c=='+')return 62;if(c=='/')return 63;return -1;};
        std::vector<std::uint8_t> bytes;bytes.reserve(text.size()/4*3);
        for(std::size_t i=0;i<text.size();i+=4){const int a=digit(text[i]),b=digit(text[i+1]),c=digit(text[i+2]),d=digit(text[i+3]);const bool padC=text[i+2]=='=',padD=text[i+3]=='=';
            if(a<0||b<0||(!padC&&c<0)||(!padD&&d<0)||(padC&&!padD)||((padC||padD)&&i+4!=text.size())||(padC&&(b&15))||(padD&&!padC&&(c&3)))throw std::runtime_error("Render RGBA base64 encoding invalid");
            bytes.push_back(static_cast<std::uint8_t>((a<<2)|(b>>4)));if(!padC)bytes.push_back(static_cast<std::uint8_t>((b<<4)|(c>>2)));if(!padD)bytes.push_back(static_cast<std::uint8_t>((c<<6)|d));
        }return bytes;
    }
    void ready() const{if(!renderer)throw std::runtime_error("Render initialization required");}
public:
    void shutdown(){draws.clear();order.clear();shadowCasters.clear();meshes.clear();textures.clear();programs.clear();renderer.reset();device.reset();}
    Json command(const Json& packet,HWND window,bool development){
        const auto operation=packet.at("op").get<std::string>();const auto& data=packet.at("data");
        if(operation=="init"){
            if(renderer)throw std::runtime_error("Render already initialized");auto nextDevice=std::make_unique<hb::gpu::Device>();auto nextRenderer=std::make_unique<Renderer>(*nextDevice,data.at("width").get<std::uint32_t>(),data.at("height").get<std::uint32_t>(),window);device=std::move(nextDevice);renderer=std::move(nextRenderer);return {{"backend","D3D11"},{"constantBuffers",3}};
        }
        ready();
        if(operation=="upload"){
            for(const auto& resource:data){const auto key=id(resource.at("id")),kind=resource.at("kind").get<std::string>();
                if(kind=="mesh"){const auto& packed=resource.at("vertices");if(!packed.is_array()||packed.empty()||packed.size()%12)throw std::runtime_error("Render vertex stride invalid");std::vector<hb::gpu::SceneVertex> vertices;vertices.reserve(packed.size()/12);for(std::size_t i=0;i<packed.size();i+=12){hb::gpu::SceneVertex v;const auto values=floats<12>(Json(packed.begin()+i,packed.begin()+i+12));std::copy_n(values.begin(),3,v.position.begin());std::copy_n(values.begin()+3,3,v.normal.begin());std::copy_n(values.begin()+6,2,v.uv.begin());std::copy_n(values.begin()+8,4,v.color.begin());vertices.push_back(v);}const auto& packedIndices=resource.at("indices");if(!packedIndices.is_array())throw std::runtime_error("Render indices invalid");std::vector<std::uint32_t> indices;indices.reserve(packedIndices.size());for(const auto& index:packedIndices){if(!index.is_number_unsigned()&&!index.is_number_integer()||index.get<std::int64_t>()<0||index.get<std::uint64_t>()>UINT_MAX)throw std::runtime_error("Render index invalid");indices.push_back(index.get<std::uint32_t>());}meshes.insert_or_assign(key,renderer->createMesh(vertices,indices));}
                else if(kind=="texture")textures.insert_or_assign(key,renderer->createTexture(resource.at("width").get<std::uint32_t>(),resource.at("height").get<std::uint32_t>(),rgbaBytes(resource.at("rgbaBase64").get<std::string>()),resource.value("srgb",true),resource.value("mipmaps",true)));
                else if(kind=="program")programs.insert_or_assign(key,renderer->createProgram(resource.at("declarations").get<std::string>(),resource.at("evaluation").get<std::string>(),resource.at("uniforms").get<std::vector<float>>()));
                else throw std::runtime_error("Render resource kind invalid");
            }return {{"meshes",meshes.size()},{"textures",textures.size()},{"uploads",renderer->uploads()}};
        }
        if(operation=="reset"){renderer->finish();draws.clear();order.clear();shadowCasters.clear();meshes.clear();textures.clear();programs.clear();renderer->setLights({});renderer->setShadows({});return {{"ok",true}};}
        if(operation=="dispose"){shutdown();return {{"ok",true}};}
        if(operation=="capture"){if(!development)throw std::runtime_error("Render capture disabled in release");return {{"width",renderer->width()},{"height",renderer->height()},{"rgba",renderer->readPixels()}};}
        if(operation!="frame")throw std::runtime_error("Render operation invalid");
        renderer->resize(data.at("width").get<std::uint32_t>(),data.at("height").get<std::uint32_t>());for(const auto& parameter:data.value("parameters",Json::array()))renderer->setProgramParameters(programs.at(id(parameter.at("id"))),parameter.at("values").get<std::vector<float>>());
        if(data.contains("lights")){std::vector<hb::gpu::SceneLight> lights;for(const auto& packed:data.at("lights")){auto f=floats<16>(packed);hb::gpu::SceneLight light;std::copy_n(f.begin(),4,light.position.begin());std::copy_n(f.begin()+4,4,light.direction.begin());std::copy_n(f.begin()+8,4,light.color.begin());std::copy_n(f.begin()+12,4,light.cone.begin());lights.push_back(light);}renderer->setLights(lights);}
        for(const auto& key:data.value("remove",std::vector<std::string>{}))draws.erase(key);
        for(const auto& value:data.at("updates")){
            const auto key=id(value.at("id"));Draw draw;draw.mesh=id(value.at("mesh"));draw.world=floats<16>(value.at("world"));draw.normal=floats<16>(value.at("normal"));draw.maps=value.at("maps").get<std::array<std::string,6>>();draw.sampling=value.at("sampling").get<std::array<std::uint32_t,6>>();draw.program=value.value("program",std::string{});draw.programMaps=value.value("programMaps",std::vector<std::string>{});draw.programSampling=value.value("programSampling",std::vector<std::uint32_t>{});draw.first=value.at("first").get<std::uint32_t>();draw.count=value.at("count").get<std::uint32_t>();const auto& p=value.at("material");auto& m=draw.material;m.color=floats<4>(p.at("color"));m.emissive=floats<4>(p.at("emissive"));if(p.at("uvX").size()!=6||p.at("uvY").size()!=6)throw std::runtime_error("Render texture transforms invalid");for(std::size_t i=0;i<6;i++){m.uvX[i]=floats<4>(p.at("uvX")[i]);m.uvY[i]=floats<4>(p.at("uvY")[i]);}m.normalScale=floats<2>(p.at("normalScale"));m.roughness=p.at("roughness").get<float>();m.metalness=p.at("metalness").get<float>();m.alphaCutoff=p.at("alphaCutoff").get<float>();m.receiveShadow=p.value("receiveShadow",true);draw.shadowAlphaCutoff=value.value("shadowAlphaCutoff",m.alphaCutoff);if(!std::isfinite(draw.shadowAlphaCutoff))throw std::runtime_error("Shadow alpha invalid");m.unlit=p.at("unlit").get<bool>();m.toneMapped=p.at("toneMapped").get<bool>();m.depthTest=p.at("depthTest").get<bool>();m.depthWrite=p.at("depthWrite").get<bool>();m.doubleSided=p.at("doubleSided").get<bool>();m.backSide=p.at("backSide").get<bool>();m.vertexColors=p.at("vertexColors").get<bool>();m.blend=static_cast<hb::gpu::ParticleBlend>(p.at("blend").get<std::uint32_t>());if(p.value("sky",false)){m.sky=true;m.skyTop=floats<4>(p.at("skyTop"));m.skyHorizon=floats<4>(p.at("skyHorizon"));m.sunDirection=floats<4>(p.at("sunDirection"));m.sunColor=floats<4>(p.at("sunColor"));}draws.insert_or_assign(key,std::move(draw));
        }
        if(data.contains("shadows")){std::vector<hb::gpu::SceneShadow> values;for(const auto& packed:data.at("shadows")){const auto f=floats<24>(packed);hb::gpu::SceneShadow shadow;std::copy_n(f.begin(),16,shadow.viewProjection.begin());std::copy_n(f.begin()+16,4,shadow.parameters.begin());std::copy_n(f.begin()+20,4,shadow.size.begin());values.push_back(shadow);}renderer->setShadows(values);}if(data.contains("shadowCasters"))shadowCasters=data.at("shadowCasters").get<std::vector<std::vector<std::string>>>();if(shadowCasters.size()!=renderer->shadowLayers())throw std::runtime_error("Shadow caster layers invalid");
        if(data.contains("order"))order=data.at("order").get<std::vector<std::string>>();
        if(data.contains("release")){const auto& release=data.at("release");for(const auto& key:release.at("meshes"))meshes.erase(id(key));for(const auto& key:release.at("textures"))textures.erase(id(key));for(const auto& key:release.at("programs"))programs.erase(id(key));}
        hb::gpu::SceneFrame frame;frame.viewProjection=floats<16>(data.at("viewProjection"));frame.clear=floats<4>(data.at("clear"));frame.eye=floats<4>(data.at("eye"));frame.ambient=floats<4>(data.at("ambient"));frame.fog=floats<4>(data.at("fog"));frame.fogRange=floats<4>(data.at("fogRange"));frame.viewport=floats<4>(data.at("viewport"));frame.heightFog=floats<4>(data.value("heightFog",Json::array({0,0,0,1})));if(data.contains("viewportClear"))frame.viewportClear=floats<4>(data.at("viewportClear"));if(data.contains("scissor"))frame.scissor=floats<4>(data.at("scissor"));frame.exposure=data.at("exposure").get<float>();frame.time=data.value("time",0.f);renderer->begin(frame);
        const auto drawOne=[&](const std::string& key,bool shadow){const auto& draw=draws.at(key);const auto& mesh=meshes.at(draw.mesh);std::array<const Renderer::Texture*,6> maps{};for(std::size_t i=0;i<maps.size();i++)if(!draw.maps[i].empty())maps[i]=&textures.at(draw.maps[i]);std::vector<const Renderer::Texture*> programMaps;for(const auto& texture:draw.programMaps)programMaps.push_back(&textures.at(texture));const auto* program=draw.program.empty()?nullptr:&programs.at(draw.program);auto material=draw.material;if(shadow)material.alphaCutoff=draw.shadowAlphaCutoff;renderer->draw(mesh,draw.world,draw.normal,material,maps,draw.sampling,draw.first,draw.count,program,programMaps,draw.programSampling);};
        if(data.value("shadowRefresh",true)){try{for(std::size_t index=0;index<shadowCasters.size();index++){renderer->beginShadow(index);for(const auto& key:shadowCasters[index])drawOne(key,true);renderer->endShadow();}}catch(...){renderer->endShadow();throw;}}
        for(const auto& key:order)drawOne(key,false);
        renderer->present(0);return {{"calls",renderer->draws()},{"presents",renderer->presents()},{"uploads",renderer->uploads()},{"captures",renderer->captures()},{"programs",programs.size()},{"shadowLayers",renderer->shadowLayers()},{"shadowTextureBytes",renderer->shadowTextureBytes()},{"shadowDraws",renderer->shadowDraws()},{"shadowPasses",renderer->shadowPasses()},{"gpuTimeMs",renderer->gpuTimeMs()?Json(*renderer->gpuTimeMs()):Json(nullptr)},{"gpuTimingFrame",renderer->gpuTimingFrame()},{"meshes",meshes.size()},{"textures",textures.size()}};
    }
};
