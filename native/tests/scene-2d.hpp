#pragma once
inline nlohmann::json scene2DProof(hb::gpu::Device& gpu){
    using namespace hb::gpu;SceneRenderer r(gpu,64,64);SceneFrame f;f.viewProjection=identity;
    const std::vector<std::uint32_t> indices{0,1,2,0,2,3};
    auto quad=r.createMesh({{{-.9f,-.9f,.5f},{0,0,1},{0,0}},{{.9f,-.9f,.5f},{0,0,1},{1,0}},{{.9f,.9f,.5f},{0,0,1},{1,1}},{{-.9f,.9f,.5f},{0,0,1},{0,1}}},indices);
    auto left=r.createMesh({{{-.9f,-.9f,.5f}},{{0,-.9f,.5f}},{{0,.9f,.5f}},{{-.9f,.9f,.5f}}},indices);
    auto target=r.createRenderTarget(64,64,true);assert(target.storageBytes()==64*64*8);SceneRenderer::Bindings2D b;
    SceneMaterial m;m.unlit=true;m.toneMapped=false;m.depthTest=m.depthWrite=false;m.doubleSided=true;
    const auto pixel=[&](int x,int y,int channel){const auto bytes=r.readPixels();return int(bytes[(y*64+x)*4+channel]);};
    const auto maskPass=[&](int mode,const SceneRenderer::Mesh& geometry,bool clear){SceneFrame p;p.viewport={0,0,64,64};r.begin2D(target,p,clear);b.settings.pass={float(mode),0,0,.5};r.draw(geometry,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);r.end2D();};
    r.begin(f);maskPass(1,left,true);b.settings.pass={0,1,0,0};b.maps[0]=&target;m.color={1,0,0,1};r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(16,32,0)>200&&pixel(48,32,0)==0);
    r.begin(f);b.settings.pass[1]=2;r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(16,32,0)==0&&pixel(48,32,0)>200);
    std::vector<float> data(36*2);data[0]=0;data[1]=0;data[2]=0;data[4]=0;data[5]=.25;data[6]=0;data[7]=1;data[20]=1;
    const int a=36;data[a+2]=1;data[a+4]=.5;data[a+7]=1;data[a+8]=4;data[a+9]=4;data[a+12]=1;data[a+13]=1;data[a+16]=data[a+19]=1;data[a+20]=1;
    const auto floats=[&](const std::vector<float>& values,int w,int h,int channels=4){std::vector<std::uint8_t> bytes(values.size()*4);std::memcpy(bytes.data(),values.data(),bytes.size());return r.createDataTexture(w,h,bytes,channels,true);};
    auto lights=floats(data,9,2);b={};b.settings.pass={0,0,1,0};b.settings.screen={64,64,0,2};b.maps[1]=&lights;m.unlit=false;m.color={1,1,1,1};r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,0)>170&&pixel(32,32,1)>120&&pixel(32,32,2)==0);
    b.settings.screen[2]=1;r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,0)==0&&pixel(32,32,1)==0);
    b.settings.screen[2]=0;b.settings.channels[0]=4;b.settings.pass[3]=1;auto lightMask=r.createTexture(1,1,{255,0,0,255},false,false);b.maps[7]=&lightMask;r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,0)==0);
    b.settings.channels[0]=-1;b.settings.pass[3]=0;b.settings.modes[0]=1;m.color={0,0,1,1};r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,0)>170&&pixel(32,32,2)==0);
    data.assign(36,0);data[2]=4;data[4]=data[5]=data[6]=data[7]=1;data[16]=data[19]=1;data[20]=1;data[30]=data[31]=4;data[32]=0;
    auto cookieLight=floats(data,9,1);auto cookie=r.createDataTexture(1,1,{0,0,255,255},4,false,1,true,true);b={};b.settings.pass[2]=1;b.settings.screen={64,64,0,1};b.maps[1]=&cookieLight;b.maps[6]=&cookie;m.color={1,1,1,1};r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,2)>200&&pixel(32,32,0)==0);
    data[2]=3;data[8]=4;data[9]=0;data[10]=2;data[12]=1;auto freeLight=floats(data,9,1);std::vector<float> points(128);std::copy_n(std::array<float,8>{-1,-1,1,-1,1,1,-1,1}.begin(),8,points.begin());auto shape=floats(points,64,1,2);b.maps[1]=&freeLight;b.maps[2]=&shape;r.begin(f);r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(32,32,0)>200);
    // The shared composite uses RGB coverage and stencil; reset must not erase earlier color.
    m.unlit=true;m.color={1,1,1,1};r.begin(f);maskPass(2,left,true);maskPass(6,quad,false);b={};b.settings.pass={0,1,0,0};b.maps[0]=&target;m.color={1,0,0,1};r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);assert(pixel(16,32,0)>200&&pixel(48,32,0)==0);
    rejects([&]{r.createDataTexture(1,1,{1},4,true);});rejects([&]{r.createRenderTarget(0,1);});rejects([&]{auto p=f;p.viewport={0,0,65,64};r.begin2D(target,p);});r.end2D();b={};b.settings.screen[3]=.5;rejects([&]{r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);});b.settings.screen[3]=0;b.settings.channels[0]=8;rejects([&]{r.draw(quad,identity,identity,m,{}, {},0,0,nullptr,{}, {},nullptr,nullptr,&b);});
    return {{"passed",true},{"insideOutsidePixels",true},{"sortingLayerLights",true},{"blendAndMaskPixels",true},{"oneLayerCookieArrayPixel",true},{"freeformRGFloatPixel",true},{"stencilResetKeepsColor",true},{"targetBytes",target.storageBytes()},{"passes",r.passes2D()},{"draws",r.draws2D()},{"validation",true}};
}
