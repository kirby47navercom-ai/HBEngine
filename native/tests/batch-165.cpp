#include <HBEngine/SceneRender.hpp>
#include <cassert>
#include <iostream>
int main(){
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
    hb::gpu::Device device;hb::gpu::SceneRenderer renderer(device,64,64);hb::gpu::Particles particles(device,1);particles.emit({0,0,.5f,0,0,0,0,1});
    auto texture=renderer.createTexture(2,1,{255,0,0,255,0,0,255,255},false,false);hb::gpu::ParticleStyle style;style.color=style.endColor={1,1,1,1};style.size=1;style.sheet={2,1,0,0};
    renderer.begin({});renderer.drawParticles(particles,style,&texture,17);auto image=renderer.readPixels();const auto center=(32*64+32)*4;assert(image[center]>250&&image[center+2]<3);
    style.sheet[3]=1;renderer.begin({});renderer.drawParticles(particles,style,&texture,17);image=renderer.readPixels();assert(image[center]<3&&image[center+2]>250);assert(renderer.particleCountReadbacks()==0);
    std::cout<<"D3D11 sheet atlas actual red/blue pixels; no particle position/count readback PASS\n";
#endif
}
