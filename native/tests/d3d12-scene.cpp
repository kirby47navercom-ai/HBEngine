// D3D12 port phases 2 and 3: the same scene drawn by SceneRenderer (D3D11) and SceneMeshRenderer (D3D12),
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
template<class R,class MakeTexture> static std::array<std::vector<std::uint8_t>,23> render(R& r,MakeTexture texture){
    const Scene scene;const Extra extra(scene);const auto d=draws();std::array<std::vector<std::uint8_t>,23> images;
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
    return images;
}

static nlohmann::json proof(DeviceDriver driver){
    nlohmann::json out;std::array<std::vector<std::uint8_t>,23> reference;std::vector<std::uint8_t> unshadowed;
    {Device gpu11(driver);SceneRenderer r(gpu11,W,H);out["software11"]=gpu11.software();
        reference=render(r,[](SceneRenderer& s,std::uint32_t w,std::uint32_t h,const std::vector<std::uint8_t>& rgba,bool srgb){return s.createTexture(w,h,rgba,srgb,false);});
        // Proof the shadow pass matters: same frame with receiveShadow off must differ.
        const Scene scene;const Extra extra(scene);const auto d=draws();auto cube=r.createMesh(scene.cube,scene.cubeIndex);auto plain=r.createMesh(scene.quad,scene.quadIndex);
        r.setShadows(extra.shadows);r.setLights(extra.shadowLights);r.begin(frame(false));SceneMaterial m=d.lit;m.receiveShadow=false;m.color={.9f,.8f,.6f,1};
        r.draw(plain,extra.ground,extra.ground,m);auto lit=d.lit;lit.receiveShadow=false;r.draw(cube,d.cube,d.cube,lit);unshadowed=r.readPixels();}
    d3d12::Device gpu(driver,true);out["software"]=gpu.software;out["debugLayer"]=gpu.debug;
    {d3d12::SceneMeshRenderer r(gpu,W,H);gpu.begin();
        const auto images=render(r,[](d3d12::SceneMeshRenderer& s,std::uint32_t w,std::uint32_t h,const std::vector<std::uint8_t>& rgba,bool srgb){return s.createTexture(w,h,rgba,srgb,false);});
        const char* names[]={"full","cropped","shadowed","manyLights","probe","sky","noProbe","noSky","atlas","noAtlas","lightmap","base","bloom","post","transmission","mipmaps","screen","ssr","ssgi","ao","geometryGI","taa","motionBlur"};const std::array<float,4> clear=frame(false).clear;
        for(std::size_t i=0;i<23;i++)out[names[i]]=compare(images[i],reference[i],clear);
        for(std::size_t i:{17,18,19,20,21,22})out[std::string(names[i])+"ChangedPixels"]=compare(reference[i],reference[16],clear)["pixelsOver2"];
        out["bloomChangedPixels"]=compare(reference[12],reference[11],clear)["pixelsOver2"];out["postChangedPixels"]=compare(reference[13],reference[11],clear)["pixelsOver2"];out["transmissionChangedPixels"]=compare(reference[14],reference[11],clear)["pixelsOver2"];
        out["atlasChangedPixels"]=compare(reference[8],reference[9],clear)["pixelsOver2"];out["lightmapChangedPixels"]=compare(reference[10],reference[8],clear)["pixelsOver2"];
        out["probeChangedPixels"]=compare(reference[4],reference[6],clear)["pixelsOver2"];out["skyChangedPixels"]=compare(reference[5],reference[7],clear)["pixelsOver2"];
        out["shadowChangedPixels"]=compare(reference[2],unshadowed,clear)["pixelsOver2"];
        gpu.end();gpu.waitIdle();}
    out["validationErrors"]=validationErrors(gpu);
    for(const char* pass:{"full","cropped","shadowed","manyLights","probe","sky","noProbe","noSky","atlas","noAtlas","lightmap","base","bloom","post","transmission","mipmaps","screen","ssr","ssgi","ao","geometryGI","taa","motionBlur"}){if(out[pass]["covered"].get<std::size_t>()<=(std::string(pass)=="mipmaps"?150u:400u)||out[pass]["maxDiff"].get<int>()>2)throw std::runtime_error(std::string("scene mismatch ")+pass+" "+out[pass].dump());}
    REQUIRE(out["shadowChangedPixels"].get<std::size_t>()>50);REQUIRE(out["probeChangedPixels"].get<std::size_t>()>50);REQUIRE(out["skyChangedPixels"].get<std::size_t>()>50);REQUIRE(out["atlasChangedPixels"].get<std::size_t>()>50);REQUIRE(out["lightmapChangedPixels"].get<std::size_t>()>50);REQUIRE(out["bloomChangedPixels"].get<std::size_t>()>50);REQUIRE(out["postChangedPixels"].get<std::size_t>()>50);REQUIRE(out["transmissionChangedPixels"].get<std::size_t>()>50);// TAA on a static view converges to the plain image, so it is parity-checked only.
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
