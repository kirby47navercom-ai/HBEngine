hb::Vec3 GPUActor::StepGPU(float deltaSeconds){
    if(!particles){
        device=std::make_unique<hb::gpu::Device>();
        const auto p=hb::Scene::GetPosition(this);
        particles=std::make_unique<hb::gpu::Particles>(*device,std::vector<float>{p.x,p.y,p.z,0,1,0,0,300});
        ++gpuGenerations;
        gpuActive=true;
    }
    particles->step(deltaSeconds);
    // This example returns one actor position. Large visual simulations should
    // stay GPU-resident; reading a whole field every frame can erase the gain.
    const auto result=particles->read();
    const hb::Vec3 position{result[0],result[1],result[2]};
    hb::Scene::SetPosition(this,position);
    ++gpuSteps;
    return position;
}
void GPUActor::ReleaseGPU(){
    particles.reset();
    device.reset();
    gpuActive=false;
}
