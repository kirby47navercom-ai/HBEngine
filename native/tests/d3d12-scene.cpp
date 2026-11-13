// D3D12 port phases 2 and 3 (through 3-4c particles): the same scene drawn by SceneRenderer (D3D11) and SceneMeshRenderer (D3D12),
// compared pixel by pixel on the same driver. Prints one JSON line.
#include <HBEngine/SceneRenderD3D12.hpp>
#include <nlohmann/json.hpp>
#include <cmath>
#include <iostream>

using namespace hb::gpu;
#define REQUIRE(x) do{if(!(x))throw std::runtime_error("check failed: " #x);}while(0)
constexpr std::uint32_t W=96,H=96;

static Matrix multiply(const Matrix& a,const Matrix& b){Matrix o{};for(int c=0;c<4;c++)for(int r=0;r<4;r++)for(int k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
static Matrix rotation(float yaw,float pitch){const float cy=std::cos(yaw),sy=std::sin(yaw),cp=std::cos(pitch),sp=std::sin(pitch);
    Matrix y=identity,x=identity;y[0]=cy;y[2]=-sy;y[8]=sy;y[10]=cy;x[5]=cp;x[6]=sp;x[9]=-sp;x[10]=cp;return multiply(y,x);}
static Matrix translate(Matrix m,float x,float y,float z){m[12]=x;m[13]=y;m[14]=z;return m;}
static Matrix camera(){// right-handed perspective looking down -z from (0,0,4), clip z in [0,1]
    const float f=1/std::tan(.45f),n=.1f,fa=20;Matrix p{};p[0]=f;p[5]=f;p[10]=fa/(n-fa);p[11]=-1;p[14]=n*fa/(n-fa);return multiply(p,translate(identity,0,0,-4));}

struct Scene {
    std::vector<SceneVertex> cube;std::vector<std::uint32_t> cubeIndex;std::vector<SceneVertex> quad;std::vector<std::uint32_t> quadIndex{0,1,2,0,2,3};std::vector<std::array<float,2>> quadUV1{{0,0},{1,0},{1,1},{0,1}};
    std::vector<std::uint8_t> checker,rough;std::vector<SceneLight> lights;
    Scene(){
        const float s=.8f;const int axes[6][3]={{0,1,2},{0,1,2},{1,2,0},{1,2,0},{2,0,1},{2,0,1}};
        for(int face=0;face<6;face++){const float sign=face%2?-1.f:1.f;const int u=axes[face][0],v=axes[face][1],w=axes[face][2];
            const float corners[4][2]={{-1,-1},{1,-1},{1,1},{-1,1}};const auto base=std::uint32_t(cube.size());
            for(int c=0;c<4;c++){SceneVertex vx;vx.position[w]=sign*s;vx.position[u]=corners[c][0]*s*sign;vx.position[v]=corners[c][1]*s;vx.normal={0,0,0};vx.normal[w]=sign;vx.uv={corners[c][0]*.5f+.5f,corners[c][1]*.5f+.5f};vx.color={.5f+.5f*corners[c][0],.6f,.5f+.5f*corners[c][1],1};cube.push_back(vx);}
            for(std::uint32_t i:{0u,1u,2u,0u,2u,3u})cubeIndex.push_back(base+i);}
        for(auto [x,y]:{std::pair{-1.f,-1.f},{1.f,-1.f},{1.f,1.f},{-1.f,1.f}}){SceneVertex vx;vx.position={x*.6f,y*.6f,0};vx.normal={0,0,1};vx.uv={x*.5f+.5f,y*.5f+.5f};vx.color={x*.5f+.5f,.3f,y*.5f+.5f,1};quad.push_back(vx);}
        for(int y=0;y<8;y++)for(int x=0;x<8;x++){const bool on=(x+y)%2;checker.insert(checker.end(),{std::uint8_t(on?230:40),std::uint8_t(on?180:90),std::uint8_t(on?60:200),255});rough.insert(rough.end(),{std::uint8_t(x*32),std::uint8_t(y*32),std::uint8_t(255-x*32),255});}
        SceneLight sun;sun.position={0,0,0,0};sun.direction={-.4f,-.7f,-.6f,0};sun.color={1,.95f,.9f,2.5f};
        SceneLight point;point.position={1.2f,.8f,1.6f,1};point.direction={0,0,0,6};point.color={.3f,.6f,1,8};
        SceneLight spot;spot.position={-1.5f,1.5f,2,2};spot.direction={.5f,-.5f,-.7f,9};spot.color={1,.3f,.2f,10};spot.cone={.85f,.95f,2,0};
        SceneLight sky;sky.position={0,1,0,3};sky.color={.2f,.3f,.5f,1};sky.direction={.1f,.08f,.05f,0};
        lights={sun,point,spot,sky};
    }
};
struct Draws {Matrix cube,glass,mirrored;SceneMaterial lit,alpha,additive;};
static Draws draws(){
    Draws d;d.cube=rotation(.7f,.5f);d.glass=translate(rotation(.2f,0),-.3f,-.2f,1.2f);d.mirrored=translate(identity,.5f,.4f,1.6f);d.mirrored[0]=-1;// negative determinant
    d.lit.roughness=.45f;d.lit.metalness=.3f;d.lit.color={1,1,1,1};d.lit.emissive={.05f,0,.02f,1};d.lit.vertexColors=true;
    d.alpha.blend=ParticleBlend::Alpha;d.alpha.color={.2f,.9f,.4f,.5f};d.alpha.depthWrite=false;d.alpha.roughness=.2f;
    d.additive.blend=ParticleBlend::Additive;d.additive.unlit=true;d.additive.doubleSided=true;d.additive.color={.5f,.1f,.6f,1};return d;
}
static SceneFrame frame(bool cropped){
    SceneFrame f;f.viewProjection=camera();f.clear={.05f,.07f,.1f,1};f.eye={0,0,4,1};f.ambient={.15f,.12f,.1f,1};f.fog={.4f,.45f,.5f,.04f};f.exposure=1.2f;f.time=1.5f;
    if(cropped){f.viewport={8,4,80,80};f.scissor=std::array<float,4>{12,10,60,70};}return f;
}

static nlohmann::json compare(const std::vector<std::uint8_t>& a,const std::vector<std::uint8_t>& b,const std::array<float,4>& clear){
    REQUIRE(a.size()==b.size()&&a.size()==std::size_t(W)*H*4);int maxDiff=0;std::size_t over=0,covered=0;
    const std::array<int,3> background{int(std::lround(clear[0]*255)),int(std::lround(clear[1]*255)),int(std::lround(clear[2]*255))};
    for(std::size_t i=0;i<a.size();i+=4){int pixel=0;for(int c=0;c<4;c++)pixel=std::max(pixel,std::abs(int(a[i+c])-int(b[i+c])));maxDiff=std::max(maxDiff,pixel);if(pixel>2)over++;
        if(std::abs(int(a[i])-background[0])+std::abs(int(a[i+1])-background[1])+std::abs(int(a[i+2])-background[2])>12)covered++;}
    return {{"maxDiff",maxDiff},{"pixelsOver2",over},{"covered",covered}};
}

struct Window {HWND value=nullptr;
    Window(){WNDCLASSW wc{};wc.lpfnWndProc=DefWindowProcW;wc.hInstance=GetModuleHandleW(nullptr);wc.lpszClassName=L"HBEngineD3D12SceneProof";if(!RegisterClassW(&wc)&&GetLastError()!=ERROR_CLASS_ALREADY_EXISTS)throw std::runtime_error("window class");
        value=CreateWindowExW(0,wc.lpszClassName,L"Owned hidden D3D12 scene proof",WS_OVERLAPPEDWINDOW,0,0,160,96,nullptr,nullptr,wc.hInstance,nullptr);if(!value)throw std::runtime_error("window");}
    ~Window(){if(value)DestroyWindow(value);}};
static std::size_t validationErrors(d3d12::Device& gpu){
    detail::Com<ID3D12InfoQueue> info;if(FAILED(gpu.device->QueryInterface(__uuidof(ID3D12InfoQueue),reinterpret_cast<void**>(&info.p))))return 0;
    std::size_t errors=0;for(UINT64 i=0;i<info->GetNumStoredMessages();i++){SIZE_T size=0;info->GetMessage(i,nullptr,&size);std::vector<char> raw(size);auto* m=reinterpret_cast<D3D12_MESSAGE*>(raw.data());info->GetMessage(i,m,&size);
        if(m->Severity<=D3D12_MESSAGE_SEVERITY_ERROR){errors++;std::cerr<<"D3D12 validation: "<<std::string(m->pDescription,m->DescriptionByteLength)<<"\n";}}
    return errors;
}

static Matrix lookAt(std::array<float,3> eye,std::array<float,3> target){
    auto sub=[](auto a,auto b){return std::array<float,3>{a[0]-b[0],a[1]-b[1],a[2]-b[2]};};auto norm=[](auto v){const float l=std::sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);return std::array<float,3>{v[0]/l,v[1]/l,v[2]/l};};
    auto cross=[](auto a,auto b){return std::array<float,3>{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};};auto dot=[](auto a,auto b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];};
    const auto z=norm(sub(eye,target)),x=norm(cross(std::array<float,3>{0,1,.01f},z)),y=cross(z,x);
    Matrix m=identity;for(int i=0;i<3;i++){m[i*4]=x[i];m[i*4+1]=y[i];m[i*4+2]=z[i];}m[12]=-dot(x,eye);m[13]=-dot(y,eye);m[14]=-dot(z,eye);return m;
}
static Matrix inverse(const Matrix& m){// Gauss-Jordan on a column-major 4x4
    double a[4][8]{};for(int r=0;r<4;r++){for(int c=0;c<4;c++)a[r][c]=m[c*4+r];a[r][4+r]=1;}
    for(int c=0;c<4;c++){int pivot=c;for(int r=c+1;r<4;r++)if(std::abs(a[r][c])>std::abs(a[pivot][c]))pivot=r;std::swap(a[c],a[pivot]);const double d=a[c][c];for(auto& v:a[c])v/=d;for(int r=0;r<4;r++)if(r!=c){const double f=a[r][c];for(int k=0;k<8;k++)a[r][k]-=f*a[c][k];}}
    Matrix out{};for(int r=0;r<4;r++)for(int c=0;c<4;c++)out[c*4+r]=float(a[r][4+c]);return out;
}
static Matrix ortho(float size,float n,float f){Matrix p=identity;p[0]=p[5]=1/size;p[10]=1/(n-f);p[14]=n/(n-f);return p;}
static Matrix lightPerspective(float fov,float n,float f){const float s=1/std::tan(fov/2);Matrix p{};p[0]=p[5]=s;p[10]=f/(n-f);p[11]=-1;p[14]=n*f/(n-f);return p;}

// Phase 3-1 content: instancing, shot positions, skin+morph, shadow maps, light tiles.
struct Extra {
    std::vector<SceneInstance> instances;std::vector<std::array<float,4>> shots{{-1.2f,-.9f,.5f,0},{-.9f,-1.1f,.6f,0},{-1.4f,-1.2f,.4f,0}};
    std::vector<SceneSkin> skin;std::vector<SceneMorph> morph;std::vector<Matrix> bones;std::vector<SceneShadow> shadows;std::vector<SceneLight> shadowLights,manyLights;Matrix ground;
    Extra(const Scene& scene){
        for(int i=0;i<3;i++){SceneInstance s;s.world=translate(rotation(.3f*i,.2f),-1.3f+1.3f*i,1.1f,-.5f);for(int k=0;k<3;k++)for(int j=0;j<3;j++)s.world[k*4+j]*=.35f;if(i==2)for(int j=0;j<3;j++)s.world[j]*=-1;s.normal=s.world;s.color={.6f+.2f*i,.9f-.2f*i,.7f,1};instances.push_back(s);}
        for(std::size_t v=0;v<scene.quad.size();v++){SceneSkin k;k.joints={v<2?0u:1u,1,0,0};k.weights={.8f,.2f,0,0};skin.push_back(k);SceneMorph m;m.position={0,.2f*float(v%2),.1f,0};m.normal={0,0,0,0};m.color={.2f,-.2f,0,0};morph.push_back(m);}
        bones={identity,translate(rotation(.4f,.1f),.1f,.2f,0)};
        SceneLight sun;sun.position={0,0,0,0};sun.direction={-.3f,-1,-.4f,0};sun.color={1,.95f,.9f,3};sun.cone={1,0,2,1};
        SceneLight spot;spot.position={1.5f,2.2f,1.5f,2};spot.direction={-.5f,-.8f,-.5f,12};spot.color={1,.5f,.3f,14};spot.cone={.8f,.93f,2,2};
        shadowLights={sun,spot};
        SceneShadow a;a.viewProjection=multiply(ortho(2.6f,.1f,12),lookAt({1.8f,6,2.4f},{0,0,0}));a.parameters={-.0005f,.02f,1,1};a.size={128,128,0,0};
        SceneShadow b;b.viewProjection=multiply(lightPerspective(1.3f,.2f,15),lookAt({1.5f,2.2f,1.5f},{0,0,0}));b.parameters={-.0005f,.02f,0,.8f};b.size={96,96,0,0};shadows={a,b};
        for(int i=0;i<20;i++){SceneLight l;l.position={-1.8f+.19f*i,-.85f+.05f*(i%4),.6f-.12f*(i%5),1};l.direction={0,0,0,.9f};l.color={float(i%3==0),float(i%3==1),float(i%3==2),3};manyLights.push_back(l);}
        ground=identity;ground[0]=3;ground[5]=0;ground[6]=-3;ground[9]=3;ground[10]=0;ground[13]=-.9f;
    }
};

// One scene script for both backends. Returns full, cropped, shadowed and many-light images.
template<class R,class MakeTexture,class MakeParticles,class StepParticles> static std::array<std::vector<std::uint8_t>,41> render(R& r,MakeTexture texture,MakeParticles makeParticles,StepParticles stepParticles){
    const Scene scene;const Extra extra(scene);const auto d=draws();std::array<std::vector<std::uint8_t>,41> images;
    auto cube=r.createMesh(scene.cube,scene.cubeIndex);auto quad=r.createMesh(scene.quad,scene.quadIndex,scene.quadUV1);auto plain=r.createMesh(scene.quad,scene.quadIndex);
    auto checker=texture(r,8,8,scene.checker,true);auto rough=texture(r,8,8,scene.rough,false);
    auto instances=r.createInstances(4);r.setInstances(instances,extra.instances);auto shots=r.createInstances(4,true);r.setShotPositions(shots,extra.shots);
    auto deformation=r.createDeformation(UINT(scene.quad.size()),2,1,extra.skin,extra.morph);r.setPose(deformation,extra.bones,{.6f});
    SceneMaterial shot=d.lit;shot.vertexColors=false;shot.shotShape={.15f,.15f,0,0};SceneMaterial skinned=d.lit;skinned.color={.9f,.8f,.6f,1};
    r.setLights(scene.lights);
    for(int pass=0;pass<2;pass++){r.begin(frame(pass==1));
        r.draw(cube,d.cube,d.cube,d.lit,{&checker,nullptr,&rough,nullptr,nullptr,nullptr},{0,0,1,0,0,0});
        r.draw(quad,d.glass,d.glass,d.alpha,{&checker,nullptr,nullptr,nullptr,nullptr,nullptr},{4,0,0,0,0,0});
        r.draw(quad,d.mirrored,d.mirrored,d.additive);
        r.draw(cube,identity,identity,d.lit,{},{},0,0,nullptr,{},{},&instances);
        r.draw(plain,identity,identity,shot,{},{},0,0,nullptr,{},{},&shots);
        r.draw(plain,translate(identity,1.1f,-.9f,.8f),identity,skinned,{},{},0,0,nullptr,{},{},nullptr,&deformation);
        images[pass]=r.readPixels();}
    // Shadows: directional (layer 0) and spot (layer 1) cast by the cube and instances onto a ground plane.
    r.setShadows(extra.shadows);r.setLights(extra.shadowLights);r.begin(frame(false));
    for(std::size_t layer=0;layer<2;layer++){r.beginShadow(layer);r.draw(cube,d.cube,d.cube,d.lit);r.draw(cube,identity,identity,d.lit,{},{},0,0,nullptr,{},{},&instances);r.endShadow();}
    r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,d.lit);images[2]=r.readPixels();
    // 20 point lights: light tiles active (>=16 lights).
    r.setShadows({});r.setLights(extra.manyLights);r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,d.lit);images[3]=r.readPixels();
    // Reflection probe: capture 6 faces around (0,1.5,1.5), filter, reflect on a chrome cube. Index 6 = same without the probe.
    SceneMaterial chrome=d.lit;chrome.metalness=1;chrome.roughness=.2f;chrome.vertexColors=false;
    auto probe=r.createProbe(32);r.setLights(scene.lights);r.begin(frame(false));
    const std::array<std::array<float,3>,6> directions{{{1,0,0},{-1,0,0},{0,1,0},{0,-1,0},{0,0,1},{0,0,-1}}};
    for(UINT f=0;f<6;f++){const std::array<float,3> eye{0,1.5f,1.5f},at{eye[0]+directions[f][0],eye[1]+directions[f][1],eye[2]+directions[f][2]};
        r.beginProbe(probe,f,multiply(lightPerspective(1.5707963f,.1f,20),lookAt(eye,at)),{0,1.5f,1.5f,1},{.2f,.3f,.5f,1});r.draw(cube,d.cube,d.cube,d.lit);r.draw(plain,extra.ground,extra.ground,skinned);r.endProbe();}
    r.filterProbe(probe);std::array<typename R::ProbeBinding,2> bindings{};bindings[0].resource=&probe;
    for(int with=1;with>=0;with--){r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,chrome,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,with?&bindings:nullptr);images[with?4:6]=r.readPixels();}
    // Sky HDRI from a 32x16 panorama, rotated 30 degrees. Index 7 = same without the sky.
    std::vector<std::uint8_t> panorama;for(int y=0;y<16;y++)for(int x=0;x<32;x++)panorama.insert(panorama.end(),{std::uint8_t(x*8),std::uint8_t(255-y*16),std::uint8_t(120+(x%4)*30),255});
    auto pano=texture(r,32,16,panorama,false);
    for(int with=1;with>=0;with--){r.setSkyEnvironment(with?&pano:nullptr,32,30,1.5f);r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,chrome);images[with?5:7]=r.readPixels();}
    // Global probe atlas: the captured probe plus a 16px probe, two overlapping boxes (one with blend influence). Index 9 = without atlas.
    auto small=r.createProbe(16);r.begin(frame(false));
    for(UINT f=0;f<6;f++){const std::array<float,3> eye{-1.5f,.5f,1},at{eye[0]+directions[f][0],eye[1]+directions[f][1],eye[2]+directions[f][2]};r.beginProbe(small,f,multiply(lightPerspective(1.5707963f,.1f,20),lookAt(eye,at)),{-1.5f,.5f,1,1},{.6f,.2f,.1f,1});r.draw(cube,d.cube,d.cube,d.lit);r.endProbe();}
    r.filterProbe(small);std::vector<typename R::ProbeBinding> global(2);global[0].resource=&probe;global[1].resource=&small;global[1].settings.center={-1.5f,.5f,1,1};
    global[1].settings.minimum={-3,-2,-2,1};global[1].settings.maximum={0,2,3,0};setProbeInfluence(global[1].settings,{.5f,.5f,.5f},{.5f,.5f,.5f});r.setGlobalProbes(global);
    for(int with=1;with>=0;with--){r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,chrome,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,nullptr,nullptr,0,nullptr,with==1);images[with?8:9]=r.readPixels();}
    // Baked lightmap through UV1 with reflection mixing.
    std::vector<std::uint8_t> baked;for(int y=0;y<4;y++)for(int x=0;x<4;x++)baked.insert(baked.end(),{std::uint8_t(60+x*50),std::uint8_t(200-y*40),std::uint8_t(90),255});
    auto lightmap=texture(r,4,4,baked,false);SceneMaterial bakedMaterial=skinned;bakedMaterial.lightmapIntensity=1.5f;bakedMaterial.lightmapReflectionMix=true;
    r.begin(frame(false));r.draw(quad,extra.ground,extra.ground,bakedMaterial,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,nullptr,nullptr,0,&lightmap,true);r.draw(cube,d.cube,d.cube,chrome,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,nullptr,nullptr,0,nullptr,true);images[10]=r.readPixels();
    r.setGlobalProbes({});
    // 3-3a: base frame, bloom, full post chain (grade, vignette, chroma, grain, depth of field, occlusion, auto exposure, LUT, FXAA),
    // transmission through a captured opaque pass, and GPU-generated mips on a minified texture.
    r.setLights(scene.lights);SceneMaterial matte=skinned;
    const auto base=[&](SceneFrame f){r.begin(f);r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,d.lit);};
    base(frame(false));images[11]=r.readPixels();
    SceneFrame bloomFrame=frame(false);SceneMaterial hot=d.lit;hot.emissive={4,2,.5f,1};bloomFrame.bloom=SceneBloom{.8f,.9f,.5f,.5f};r.begin(bloomFrame);r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,hot);images[12]=r.readPixels();
    std::vector<std::uint8_t> lut;
    for(int y=0;y<4;y++)for(int x=0;x<16;x++){const int b=x/4,rr=x%4;lut.insert(lut.end(),{std::uint8_t(std::min(255,rr*85+20)),std::uint8_t(y*85),std::uint8_t(255-b*70),255});}
    auto lutTexture=r.createTexture(16,4,lut,false,false);r.setPostLookup(&lutTexture);
    SceneFrame postFrame=frame(false);ScenePostProcess post;post.grade={.2f,1.1f,1.2f,.1f};post.effects={.4f,.3f,.5f,.1f};post.vignette={.5f,.5f,1,.25f};post.vignetteColor={.1f,0,.05f,1};post.balance={.1f,-.05f,0,0};post.lift={.02f,0,.01f,0};post.gamma={1.1f,1,.9f,0};post.gain={1,1.05f,1,0};
    post.focus={4,2,3,.7f};post.occlusion={.3f,.02f,1,1};post.camera={.1f,20,0,1};post.exposure={1,-4,4,.18f};post.adapt={3,1,0,0};post.lookup={.6f,4,0,0};postFrame.postProcess=post;
    for(int pass=0;pass<2;pass++){base(postFrame);}
    images[13]=r.readPixels();// second pass adapts exposure from the first
    SceneFrame glassFrame=frame(false);glassFrame.transmission=true;r.begin(glassFrame);r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,d.lit);r.captureTransmission();
    SceneMaterial glass=d.alpha;glass.transmission=true;glass.volume={.8f,.4f,0,0};glass.physical={0,.1f,1.45f,.3f};glass.absorption={.8f,.9f,1,2};glass.roughness=.3f;glass.color={1,1,1,1};
    r.draw(quad,d.glass,d.glass,glass);images[14]=r.readPixels();
    auto mipped=r.createTexture(8,8,scene.checker,true,true);Matrix distant=translate(identity,.6f,.5f,-6);for(int i=0;i<3;i++)distant[i*5]=.25f;
    r.begin(frame(false));r.draw(plain,distant,identity,matte,{&mipped,nullptr,nullptr,nullptr,nullptr,nullptr},{0,0,0,0,0,0});r.draw(quad,translate(identity,-.6f,-.3f,-3),identity,matte,{&mipped,nullptr,nullptr,nullptr,nullptr,nullptr},{0,0,0,0,0,0});images[15]=r.readPixels();
    r.setPostLookup(nullptr);
    // 3-3b screen effects: neutral resolve, SSR, SSGI with Hi-Z, AO, geometry GI, TAA (2 jittered frames), motion blur with
    // previous world / pose / instance histories.
    const auto screenFrame=[&](auto edit){SceneFrame f=frame(false);SceneScreenEffects e;e.eye={0,0,4,1};e.forward={0,0,-1,0};e.camera={.1f,20,0,1};e.currentVP=e.previousVP=camera();e.inverseVP=inverse(camera());edit(e);f.screenEffects=e;return f;};
    SceneMaterial glossy=matte;glossy.roughness=.1f;glossy.metalness=.7f;
    const auto screenScene=[&](const SceneFrame& f){r.begin(f);r.draw(plain,extra.ground,extra.ground,glossy);r.draw(cube,d.cube,d.cube,d.lit);r.draw(cube,identity,identity,d.lit,{},{},0,0,nullptr,{},{},&instances);return r.readPixels();};
    images[16]=screenScene(screenFrame([](SceneScreenEffects&){}));
    images[17]=screenScene(screenFrame([](SceneScreenEffects& e){e.reflection={1,.8f,20,.2f};}));
    images[18]=screenScene(screenFrame([](SceneScreenEffects& e){e.indirect={1.5f,24,4,.08f};e.hierarchy[3]=1;}));
    images[19]=screenScene(screenFrame([](SceneScreenEffects& e){e.ambientAO={.6f,.02f,3,0};}));
    // Geometry GI: two emissive triangles behind the camera plane (rendering-104 layout).
    std::vector<float> world{-100,-100,-2,1,100,100,-2,0,2,0,0,0};const auto triangle=[&](std::array<float,3> a,std::array<float,3> b,std::array<float,3> c,std::array<float,3> emit){for(auto v:a)world.push_back(v);world.push_back(0);for(int i=0;i<3;i++)world.push_back(b[i]-a[i]);world.push_back(0);for(int i=0;i<3;i++)world.push_back(c[i]-a[i]);world.push_back(0);world.insert(world.end(),{0,0,1,0,1,1,1,0});for(auto v:emit)world.push_back(v);world.push_back(0);};
    triangle({-100,-100,-2},{100,-100,-2},{100,100,-2},{.4f,1.5f,.3f});triangle({-100,-100,-2},{100,100,-2},{-100,100,-2},{.4f,1.5f,.3f});
    std::vector<std::uint8_t> worldBytes(world.size()*4);std::memcpy(worldBytes.data(),world.data(),worldBytes.size());auto geometry=r.createDataTexture(UINT(world.size()/4),1,worldBytes,4,true);r.setGeometryScene(&geometry);
    images[20]=screenScene(screenFrame([](SceneScreenEffects& e){e.geometry={1,20,2,4};e.geometryInfo={15,1,1,3};e.geometryLimits={256,.01f,15,0};}));r.setGeometryScene(nullptr);
    screenScene(screenFrame([](SceneScreenEffects& e){e.temporal={1,.85f,.02f,0};e.jitter={.3f,-.2f,0,0};}));
    images[21]=screenScene(screenFrame([](SceneScreenEffects& e){e.temporal={1,.85f,.02f,1};e.jitter={-.3f,.2f,.3f,-.2f};}));
    // Motion blur: moving cube (previous world), previous pose and previous instances.
    auto movedInstances=extra.instances;std::vector<Matrix> previousInstances;for(auto& i:movedInstances)previousInstances.push_back(translate(i.world,i.world[12]-.2f,i.world[13],i.world[14]));r.setPreviousInstances(instances,previousInstances);
    auto oldBones=extra.bones;oldBones[1]=translate(rotation(.1f,0),0,0,0);r.setPose(deformation,oldBones,{.1f},{},true);
    {const auto f=screenFrame([](SceneScreenEffects& e){e.motion={1,.05f,8,0};Matrix shifted=camera();shifted[12]+=.05f;e.previousVP=shifted;});const Matrix before=rotation(.5f,.4f);
        r.begin(f);r.draw(plain,extra.ground,extra.ground,glossy,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,nullptr,nullptr,1);r.draw(cube,d.cube,d.cube,d.lit,{},{},0,0,nullptr,{},{},nullptr,nullptr,nullptr,nullptr,&before,1);
        r.draw(cube,identity,identity,d.lit,{},{},0,0,nullptr,{},{},&instances,nullptr,nullptr,nullptr,nullptr,1);r.draw(plain,translate(identity,1.1f,-.9f,.8f),identity,skinned,{},{},0,0,nullptr,{},{},nullptr,&deformation,nullptr,nullptr,nullptr,1);images[22]=r.readPixels();}
    r.releaseMotion(instances);r.releaseMotion(deformation);
    // 3-4a: node material program (t7 values, t8 map, s0 key), surface program in the screen-effect MRT pass, program shadow
    // casters, dynamic mesh stream update and viewport clear.
    auto graph=r.createProgram("StructuredBuffer<float> graphValues:register(t7);Texture2D graphMap:register(t8);SamplerState graphSampler:register(s6);","base.rgb*=graphMap.Sample(graphSampler,i.uv*3).rgb*graphValues[0];rough=graphValues[1];",{1.4f,.35f});
    auto surfaceGraph=r.createSurfaceProgram("Texture2D surfaceA:register(t8);SamplerState surfaceS:register(s1);","base=float4(surfaceA.Sample(surfaceS,i.uv*2).rgb,1);rough=.3;metal=.2;",{});
    const std::vector<const typename R::Texture*> graphMaps{&checker};
    r.setLights(scene.lights);r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,d.lit,{},{},0,0,&graph,graphMaps,{6});r.setProgramParameters(graph,{.8f,.6f});r.draw(cube,identity,identity,d.lit,{},{},0,0,&graph,graphMaps,{1},&instances);images[23]=r.readPixels();
    {const auto f=screenFrame([](SceneScreenEffects& e){e.reflection={1,.8f,20,.2f};});r.begin(f);r.draw(plain,extra.ground,extra.ground,glossy);r.draw(cube,d.cube,d.cube,d.lit,{},{},0,0,&surfaceGraph,graphMaps,{4});images[24]=r.readPixels();}
    r.setShadows(extra.shadows);r.setLights(extra.shadowLights);r.begin(frame(false));for(std::size_t layer=0;layer<2;layer++){r.beginShadow(layer);r.draw(cube,d.cube,d.cube,d.lit,{},{},0,0,&graph,graphMaps,{0});r.endShadow();}
    r.draw(plain,extra.ground,extra.ground,skinned);r.draw(cube,d.cube,d.cube,d.lit,{},{},0,0,&graph,graphMaps,{0});images[25]=r.readPixels();r.setShadows({});r.setLights(scene.lights);
    auto stream=r.createMesh(scene.quad,scene.quadIndex,{},true);std::vector<std::array<float,6>> moved;for(const auto& v:scene.quad)moved.push_back({v.position[0]*1.3f,v.position[1]*.8f+.2f,v.position[2]+.3f,.2f,0,.98f});r.updateMeshVertices(stream,moved);
    SceneFrame cleared=frame(false);cleared.viewport={10,6,70,80};cleared.viewportClear=std::array<float,4>{.3f,.1f,.25f,1};r.begin(cleared);r.draw(stream,identity,identity,d.lit);r.draw(cube,d.cube,d.cube,d.lit);images[26]=r.readPixels();
    // 3-4b 2D (scene-2d.hpp scenarios): offscreen mask passes, inside/outside masking, lit 2D with light data, light-mask channel,
    // blend style, cookie array texture, and stencil/additive offscreen modes 3..6 composited back.
    {const std::vector<std::uint32_t> idx{0,1,2,0,2,3};SceneFrame f;f.viewProjection=identity;f.clear={.05f,.07f,.1f,1};
        auto full=r.createMesh({{{-.9f,-.9f,.5f},{0,0,1},{0,0}},{{.9f,-.9f,.5f},{0,0,1},{1,0}},{{.9f,.9f,.5f},{0,0,1},{1,1}},{{-.9f,.9f,.5f},{0,0,1},{0,1}}},idx);
        auto left=r.createMesh({{{-.9f,-.9f,.5f}},{{0,-.9f,.5f}},{{0,.9f,.5f}},{{-.9f,.9f,.5f}}},idx);auto top=r.createMesh({{{-.9f,0,.5f}},{{.9f,0,.5f}},{{.9f,.9f,.5f}},{{-.9f,.9f,.5f}}},idx);
        auto target=r.createRenderTarget(96,96,true);typename R::Bindings2D b;SceneMaterial m;m.unlit=true;m.toneMapped=false;m.depthTest=m.depthWrite=false;m.doubleSided=true;
        const auto offscreen=[&](int mode,const typename R::Mesh& geometry,bool clear,std::array<float,4> color){SceneFrame p;p.viewport={0,0,96,96};p.clear={0,0,0,0};r.begin2D(target,p,clear);b.settings.pass={float(mode),0,0,.5f};m.color=color;r.draw(geometry,identity,identity,m,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);r.end2D();};
        r.begin(f);offscreen(1,left,true,{1,1,1,1});b.settings.pass={0,1,0,0};b.maps[0]=&target;m.color={1,0,0,1};r.draw(full,identity,identity,m,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[27]=r.readPixels();
        r.begin(f);b.settings.pass[1]=2;r.draw(full,identity,identity,m,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[28]=r.readPixels();
        std::vector<float> data(36*2);data[0]=0;data[1]=0;data[2]=0;data[4]=0;data[5]=.25f;data[6]=0;data[7]=1;data[20]=1;const int a=36;data[a+2]=1;data[a+4]=.5f;data[a+7]=1;data[a+8]=4;data[a+9]=4;data[a+12]=1;data[a+13]=1;data[a+16]=data[a+19]=1;data[a+20]=1;
        const auto floats=[&](const std::vector<float>& values,std::uint32_t w,std::uint32_t h){std::vector<std::uint8_t> bytes(values.size()*4);std::memcpy(bytes.data(),values.data(),bytes.size());return r.createDataTexture(w,h,bytes,4,true);};
        auto lights2D=floats(data,9,2);b={};b.settings.pass={0,0,1,0};b.settings.screen={96,96,0,2};b.maps[1]=&lights2D;SceneMaterial lit=m;lit.unlit=false;lit.color={1,1,1,1};r.begin(f);r.draw(full,identity,identity,lit,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[29]=r.readPixels();
        b.settings.channels[0]=4;b.settings.pass[3]=1;auto lightMask=r.createTexture(1,1,{255,0,0,255},false,false);b.maps[7]=&lightMask;r.begin(f);r.draw(full,identity,identity,lit,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[30]=r.readPixels();
        b.settings.channels[0]=-1;b.settings.pass[3]=0;b.settings.modes[0]=1;lit.color={0,0,1,1};r.begin(f);r.draw(full,identity,identity,lit,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[31]=r.readPixels();
        data.assign(36,0);data[2]=4;data[4]=data[5]=data[6]=data[7]=1;data[16]=data[19]=1;data[20]=1;data[30]=data[31]=4;data[32]=0;
        auto cookieLight=floats(data,9,1);auto cookie=r.createDataTexture(1,1,{0,0,255,255},4,false,1,true,true);b={};b.settings.pass[2]=1;b.settings.screen={96,96,0,1};b.maps[1]=&cookieLight;b.maps[6]=&cookie;lit.color={1,1,1,1};r.begin(f);r.draw(full,identity,identity,lit,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);images[32]=r.readPixels();
        // Stencil modes: 6 writes stencil without color, 4/5 test not-equal/equal, 3 adds.
        b={};r.begin(f);offscreen(2,full,true,{.2f,.2f,.6f,1});offscreen(6,top,false,{1,1,1,1});offscreen(4,full,false,{.8f,.1f,.1f,1});offscreen(5,left,false,{.1f,.8f,.1f,1});offscreen(3,left,false,{.3f,.3f,.3f,1});
        b={};SceneMaterial show=m;show.color={1,1,1,1};r.draw(full,identity,identity,show,{&target,nullptr,nullptr,nullptr,nullptr,nullptr},{4,0,0,0,0,0});images[33]=r.readPixels();
        // 2D draws inside an offscreen pass sampling another render target.
        auto second=r.createRenderTarget(96,96,false);b={};b.maps[0]=&target;b.settings.pass={1,1,0,.5f};{SceneFrame p;p.viewport={0,0,96,96};p.clear={0,0,0,0};r.begin2D(second,p,true);m.color={0,1,1,1};r.draw(full,identity,identity,m,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);r.end2D();}
        b={};r.begin(f);r.draw(full,identity,identity,show,{&second,nullptr,nullptr,nullptr,nullptr,nullptr},{4,0,0,0,0,0});images[34]=r.readPixels();
    // 3-4c particles: 48 records (every 7th already expired) stepped under gravity, then additive, sorted alpha with a sprite
    // sheet, HDR bloom, and a 2D-masked draw.
    std::vector<float> records;for(int i=0;i<48;i++){const float x=-1.4f+float(i%8)*.4f,y=-.9f+float(i/8)*.35f;records.insert(records.end(),{x,y,.3f+.05f*float(i%5),i%7==0?2.f:.1f*float(i%4),.05f*float(i%3)-.05f,.4f,.1f,1.5f});}
    auto particles=makeParticles(records);stepParticles(particles,.25f,{.2f,0,0},.3f,.1f);
    ParticleStyle spray;spray.blend=ParticleBlend::Additive;spray.size=.25f;spray.color={1,.6f,.2f,1};spray.endColor={.2f,.1f,1,.2f};spray.view=translate(identity,0,0,-4);spray.right={1,0,0};spray.up={0,1,0};spray.eye={0,0,4};spray.projectionY=1/std::tan(.45f);spray.perspective=true;
    r.setLights(scene.lights);r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,d.lit);r.drawParticles(*particles,spray);images[35]=r.readPixels();
    auto sheet=r.createTexture(8,8,scene.checker,true,false);ParticleStyle smoke=spray;smoke.blend=ParticleBlend::Alpha;smoke.sort=ParticleSort::Distance;smoke.sheet={2,2,1,1};smoke.depthWrite=false;smoke.color={1,1,1,.8f};smoke.endColor={.5f,.5f,.5f,.3f};
    r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,matte);r.draw(cube,d.cube,d.cube,d.lit);r.drawParticles(*particles,smoke,&sheet,1);images[36]=r.readPixels();
    SceneFrame glow=frame(false);glow.bloom=SceneBloom{.8f,.9f,.5f,.5f};ParticleStyle embers=spray;embers.color={6,3,1,1};r.begin(glow);r.draw(plain,extra.ground,extra.ground,matte);r.drawParticles(*particles,embers);images[37]=r.readPixels();
    {SceneFrame p;p.viewport={0,0,96,96};p.clear={0,0,0,0};r.begin(f);r.begin2D(target,p,true);b={};b.settings.pass={1,0,0,.5f};SceneMaterial mm=m;mm.color={1,1,1,1};r.draw(left,identity,identity,mm,{},{},0,0,nullptr,{},{},nullptr,nullptr,&b);r.end2D();}
    b={};b.maps[0]=&target;b.settings.pass={0,1,0,0};r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,matte);r.drawParticles(*particles,spray,nullptr,0,&b);images[38]=r.readPixels();}
    // Phase 4 prep: texture region patches on an explicit mip chain, and ray-scene row updates driving geometry GI.
    {std::vector<typename R::TextureMipLevel> levels{{4,4,std::vector<std::uint8_t>(64,200),1},{2,2,std::vector<std::uint8_t>(16,90),1},{1,1,{255,0,0,255},1}};
        auto chained=r.createTexture(8,8,scene.checker,true,levels);std::vector<std::uint8_t> patch(4*3*4);for(std::size_t i=0;i<patch.size();i+=4){patch[i]=255;patch[i+1]=40;patch[i+2]=200;patch[i+3]=255;}
        r.updateTextureRegions(chained,{{0,2,1,0,4,3,1,patch},{1,1,1,0,1,1,1,{0,255,0,255}}});
        r.begin(frame(false));r.draw(plain,extra.ground,extra.ground,matte,{&chained,nullptr,nullptr,nullptr,nullptr,nullptr},{1,0,0,0,0,0});r.draw(cube,d.cube,d.cube,d.lit,{&chained,nullptr,nullptr,nullptr,nullptr,nullptr},{0,0,0,0,0,0});images[39]=r.readPixels();
        auto changed=world;for(int t=0;t<2;t++){changed[12+t*24+20]=2;changed[12+t*24+21]=.2f;changed[12+t*24+22]=1.2f;}std::vector<std::uint8_t> row(changed.size()*4);std::memcpy(row.data(),changed.data(),row.size());
        r.updateRayScenes(geometry,UINT(world.size()/4),1,{{0,1,row}});r.setGeometryScene(&geometry);
        images[40]=screenScene(screenFrame([](SceneScreenEffects& e){e.geometry={1,20,2,4};e.geometryInfo={15,1,1,3};e.geometryLimits={256,.01f,15,0};}));r.setGeometryScene(nullptr);}
    return images;
}

// Statistics both renderers must report identically after the same script (per-frame or cache-dependent counters excluded).
template<class R> static nlohmann::json stats(R& r){
    return {{"draws2D",r.draws2D()},{"passes2D",r.passes2D()},{"shadowPasses",r.shadowPasses()},{"shadowDraws",r.shadowDraws()},{"meshUpdates",r.meshUpdates()},{"meshUpdateBytes",r.meshUpdateBytes()},
        {"textureRegionUpdates",r.textureRegionUpdates()},{"textureRegionUpdateBytes",r.textureRegionUpdateBytes()},{"raySceneUpdates",r.raySceneUpdates()},{"raySceneUpdateBytes",r.raySceneUpdateBytes()},
        {"probeCaptures",r.probeCaptures()},{"transmissionCopies",r.transmissionCopies()},{"probeAtlasCount",r.probeAtlasCount()},{"bloomLevels",r.bloomLevels()},{"shadowTextureBytes",r.shadowTextureBytes()},{"captures",r.captures()}};
}
// Data texture layouts the engine bridge uploads (explicit mips, arrays, cubes, volumes, half and two-channel floats).
template<class R> static std::vector<std::uint64_t> dataTextureLayouts(R& r){
    using Level=typename R::TextureMipLevel;const auto rgba=[](std::size_t n){std::vector<std::uint8_t> v(n*4);for(std::size_t i=0;i<v.size();i++)v[i]=std::uint8_t(i*37);return v;};
    const auto halves=[](std::size_t n){std::vector<std::uint8_t> v(n*2);for(std::size_t i=0;i<n;i++){const std::uint16_t h=std::uint16_t(0x3800+(i%64)*16);std::memcpy(v.data()+i*2,&h,2);}return v;};
    const auto floats=[](std::size_t n){std::vector<std::uint8_t> v(n*4);for(std::size_t i=0;i<n;i++){const float f=float(i)*.25f-1;std::memcpy(v.data()+i*4,&f,4);}return v;};
    std::vector<std::uint64_t> bytes;
    bytes.push_back(r.createDataTexture(4,4,rgba(16),4,false,1,true,false,"2d",false,false,{Level{2,2,rgba(4),1},Level{1,1,rgba(1),1}}).storageBytes());
    bytes.push_back(r.createDataTexture(4,4,rgba(48),4,false,3,false,true,"2d",false,false,{Level{2,2,rgba(12),3}}).storageBytes());
    bytes.push_back(r.createDataTexture(4,4,halves(4*4*6*4),4,true,6,false,false,"cube",false,true).storageBytes());
    bytes.push_back(r.createDataTexture(4,4,rgba(64),4,false,4,false,false,"volume",false,false,{Level{2,2,rgba(8),2},Level{1,1,rgba(1),1}}).storageBytes());
    bytes.push_back(r.createDataTexture(3,2,floats(12),2,true).storageBytes());
    bytes.push_back(r.createDataTexture(3,2,halves(12),2,true,1,false,false,"2d",false,true).storageBytes());
    return bytes;
}

static nlohmann::json proof(DeviceDriver driver){
    nlohmann::json out,referenceStats;std::array<std::vector<std::uint8_t>,41> reference;std::vector<std::uint8_t> unshadowed;std::vector<std::uint64_t> referenceLayouts;
    {Device gpu11(driver);SceneRenderer r(gpu11,W,H);out["software11"]=gpu11.software();
        reference=render(r,[](SceneRenderer& s,std::uint32_t w,std::uint32_t h,const std::vector<std::uint8_t>& rgba,bool srgb){return s.createTexture(w,h,rgba,srgb,false);},[&](const std::vector<float>& v){return std::make_unique<hb::gpu::Particles>(gpu11,v);},[](auto& p,float dt,std::array<float,3> force,float gravity,float drag){p->step(dt,force,gravity,drag);});referenceStats=stats(r);
        // Proof the shadow pass matters: same frame with receiveShadow off must differ.
        const Scene scene;const Extra extra(scene);const auto d=draws();auto cube=r.createMesh(scene.cube,scene.cubeIndex);auto plain=r.createMesh(scene.quad,scene.quadIndex);
        r.setShadows(extra.shadows);r.setLights(extra.shadowLights);r.begin(frame(false));SceneMaterial m=d.lit;m.receiveShadow=false;m.color={.9f,.8f,.6f,1};
        r.draw(plain,extra.ground,extra.ground,m);auto lit=d.lit;lit.receiveShadow=false;r.draw(cube,d.cube,d.cube,lit);unshadowed=r.readPixels();referenceLayouts=dataTextureLayouts(r);}
    d3d12::Device gpu(driver,true,8u<<20,64);out["software"]=gpu.software;out["debugLayer"]=gpu.debug;
    // Debug-layer messages explain a device removal, so print them before the failure propagates.
    try{d3d12::SceneMeshRenderer r(gpu,W,H);gpu.begin();
        const auto images=render(r,[](d3d12::SceneMeshRenderer& s,std::uint32_t w,std::uint32_t h,const std::vector<std::uint8_t>& rgba,bool srgb){return s.createTexture(w,h,rgba,srgb,false);},[&](const std::vector<float>& v){return std::make_unique<d3d12::Particles>(gpu,v);},[](auto& p,float dt,std::array<float,3> force,float gravity,float drag){p->step(dt,force,gravity,drag);});
        const auto portedStats=stats(r);out["stats"]=portedStats;for(const auto& [key,value]:referenceStats.items())if(portedStats.at(key)!=value)throw std::runtime_error("statistic differs from D3D11: "+key+" "+value.dump()+" vs "+portedStats.at(key).dump());
        const char* names[]={"full","cropped","shadowed","manyLights","probe","sky","noProbe","noSky","atlas","noAtlas","lightmap","base","bloom","post","transmission","mipmaps","screen","ssr","ssgi","ao","geometryGI","taa","motionBlur","program","surfaceProgram","programShadow","streamClear","mask2D","maskOutside2D","lit2D","lightMask2D","blend2D","cookie2D","stencil2D","nested2D","particles","sortedParticles","hdrParticles","maskedParticles","textureRegions","rayRows"};const std::array<float,4> clear=frame(false).clear;
        for(std::size_t i=0;i<41;i++)out[names[i]]=compare(images[i],reference[i],clear);
        out["rayRowsChangedPixels"]=compare(reference[40],reference[20],clear)["pixelsOver2"];
        out["particleChangedPixels"]=compare(reference[35],reference[11],clear)["pixelsOver2"];
        for(std::size_t i:{17,18,19,20,21,22})out[std::string(names[i])+"ChangedPixels"]=compare(reference[i],reference[16],clear)["pixelsOver2"];
        out["bloomChangedPixels"]=compare(reference[12],reference[11],clear)["pixelsOver2"];out["postChangedPixels"]=compare(reference[13],reference[11],clear)["pixelsOver2"];out["transmissionChangedPixels"]=compare(reference[14],reference[11],clear)["pixelsOver2"];
        out["atlasChangedPixels"]=compare(reference[8],reference[9],clear)["pixelsOver2"];out["lightmapChangedPixels"]=compare(reference[10],reference[8],clear)["pixelsOver2"];
        out["probeChangedPixels"]=compare(reference[4],reference[6],clear)["pixelsOver2"];out["skyChangedPixels"]=compare(reference[5],reference[7],clear)["pixelsOver2"];
        out["shadowChangedPixels"]=compare(reference[2],unshadowed,clear)["pixelsOver2"];
        const auto layouts=dataTextureLayouts(r);out["dataTextureLayoutBytes"]=layouts;if(layouts!=referenceLayouts)throw std::runtime_error("data texture storage differs from D3D11");
        gpu.end();gpu.waitIdle();}catch(...){validationErrors(gpu);throw;}
    // Self-managed frames on a hidden window: begin/draw/present six times with a resize, GPU timestamps resolved.
    {Window window;d3d12::SceneMeshRenderer shown(gpu,64,48,window.value);const Scene scene;const auto d=draws();auto cube=shown.createMesh(scene.cube,scene.cubeIndex);shown.setLights(scene.lights);
        for(int i=0;i<6;i++){if(i==3)shown.resize(80,60);shown.begin(frame(false));shown.draw(cube,d.cube,d.cube,d.lit);REQUIRE(shown.present(0));}
        out["presents"]=shown.presents();out["drawsPresented"]=shown.draws();out["gpuTimeMs"]=shown.gpuTimeMs().value_or(-1.0);out["presentedSize"]={shown.width(),shown.height()};
        REQUIRE(shown.presents()==6&&shown.draws()==1&&shown.gpuTimeMs().has_value()&&shown.width()==80);}
    out["descriptorOverflowPages"]=gpu.descriptorOverflowPages();
    REQUIRE(gpu.descriptorOverflowPages()>0);
    out["validationErrors"]=validationErrors(gpu);
    for(const char* pass:{"full","cropped","shadowed","manyLights","probe","sky","noProbe","noSky","atlas","noAtlas","lightmap","base","bloom","post","transmission","mipmaps","screen","ssr","ssgi","ao","geometryGI","taa","motionBlur","program","surfaceProgram","programShadow","streamClear","mask2D","maskOutside2D","lit2D","lightMask2D","blend2D","cookie2D","stencil2D","nested2D","particles","sortedParticles","hdrParticles","maskedParticles","textureRegions","rayRows"}){if(out[pass]["covered"].get<std::size_t>()<=(std::string(pass)=="mipmaps"?150u:400u)||out[pass]["maxDiff"].get<int>()>2)throw std::runtime_error(std::string("scene mismatch ")+pass+" "+out[pass].dump());}
    REQUIRE(out["shadowChangedPixels"].get<std::size_t>()>50);REQUIRE(out["probeChangedPixels"].get<std::size_t>()>50);REQUIRE(out["skyChangedPixels"].get<std::size_t>()>50);REQUIRE(out["atlasChangedPixels"].get<std::size_t>()>50);REQUIRE(out["lightmapChangedPixels"].get<std::size_t>()>50);REQUIRE(out["bloomChangedPixels"].get<std::size_t>()>50);REQUIRE(out["postChangedPixels"].get<std::size_t>()>50);REQUIRE(out["transmissionChangedPixels"].get<std::size_t>()>50);REQUIRE(out["particleChangedPixels"].get<std::size_t>()>50);REQUIRE(out["rayRowsChangedPixels"].get<std::size_t>()>50);// TAA on a static view converges to the plain image, so it is parity-checked only.
    for(const char* effect:{"ssr","ssgi","ao","geometryGI","motionBlur"}){if(out[std::string(effect)+"ChangedPixels"].get<std::size_t>()<=50){throw std::runtime_error(std::string("screen effect had no effect: ")+effect);}}
    REQUIRE(out["validationErrors"]==0);return out;
}

int main(){
    try{SetErrorMode(SEM_FAILCRITICALERRORS|SEM_NOGPFAULTERRORBOX);nlohmann::json result;
        try{result["hardware"]=proof(DeviceDriver::Hardware);}catch(const std::exception& e){result["hardware"]["error"]=e.what();}
        try{result["software"]=proof(DeviceDriver::Software);}catch(const std::exception& e){result["software"]["error"]=e.what();}
        result["passed"]=!result["hardware"].contains("error")&&!result["software"].contains("error");std::cout<<result.dump()<<std::endl;return result["passed"]?0:1;
    }catch(const std::exception& e){nlohmann::json failed;failed["passed"]=false;failed["error"]=e.what();std::cout<<failed.dump()<<std::endl;return 1;}
}
