void GPUActor::PrepareGPU(){
    if(!particles){
        device=std::make_unique<hb::gpu::Device>();
        const auto p=hb::Scene::GetPosition(this);
        particles=std::make_unique<hb::gpu::Particles>(*device,std::vector<float>{p.x,p.y,p.z,0,1,0,0,300});
        ++gpuGenerations;
        gpuActive=true;
    }
}
hb::Vec3 GPUActor::StepGPU(float deltaSeconds){
    PrepareGPU();
    particles->step(deltaSeconds);
    // This example returns one actor position. Large visual simulations should
    // stay GPU-resident; reading a whole field every frame can erase the gain.
    const auto result=particles->read();
    const hb::Vec3 position{result[0],result[1],result[2]};
    hb::Scene::SetPosition(this,position);
    ++gpuSteps;
    return position;
}
bool GPUActor::DispatchGPU(float deltaSeconds){
    PrepareGPU();
    particles->step(deltaSeconds);
    ++gpuSteps;
    return particles->enqueueReadback();
}
bool GPUActor::PollGPU(){
    if(!particles)return false;
    bool applied=false;
    // At most three completed snapshots; no GPU wait or busy polling loop.
    while(auto result=particles->pollReadback()){
        hb::Scene::SetPosition(this,{result->values[0],result->values[1],result->values[2]});
        ++gpuFramesReady;
        applied=true;
    }
    return applied;
}
int GPUActor::DrawGPU(){
    PrepareGPU();
    if(!renderer)renderer=std::make_unique<hb::gpu::ParticleRenderer>(*device,128,128);
    const auto position=hb::Scene::GetPosition(this);
    hb::gpu::ParticleStyle style;
    style.world[12]=-position.x;
    style.world[13]=-position.y;
    style.world[14]=.5f-position.z;
    renderer->clear();
    renderer->draw(*particles,style);
    ++gpuDraws;
    return gpuDraws;
}
void GPUActor::ReleaseGPU(){
    renderer.reset();
    particles.reset();
    device.reset();
    gpuActive=false;
}
