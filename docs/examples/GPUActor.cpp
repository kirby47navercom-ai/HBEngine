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
    emitter.reset();
    emitterActive=emitterPaused=false;
    renderer.reset();
    particles.reset();
    device.reset();
    gpuActive=false;
}
void GPUActor::PrepareEmitter(){
    if(!emitter){
        if(emitterCapacity<=0)throw std::runtime_error("GPU emitter capacity must be positive");
        emitter=std::make_unique<hb::gpu::ParticleEffect>(std::size_t(emitterCapacity),128,128);
        emitter->style.viewProjection=hb::gpu::orthographic(2,2,0,1);
        emitter->style.color=emitter->style.endColor={1,1,1,1};
        emitter->style.size=.25f;
        emitterActive=true;
    }
}
void GPUActor::EmitGPUEmitter(int count,float lifetime){
    if(count<0||!std::isfinite(lifetime)||lifetime<=0)throw std::runtime_error("GPU emitter count/lifetime invalid");
    if(!count)return;
    PrepareEmitter();emitter->emit(std::size_t(count),{{-.5f,0,.5f},{1,0,0},lifetime,0});
}
void GPUActor::UpdateGPUEmitter(float deltaSeconds){PrepareEmitter();emitter->update(deltaSeconds);}
void GPUActor::PlayGPUEmitter(){PrepareEmitter();emitter->play();emitterPaused=false;}
void GPUActor::PauseGPUEmitter(){PrepareEmitter();emitter->pause();emitterPaused=true;}
void GPUActor::StopGPUEmitter(bool clearParticles){if(emitter)emitter->stop(clearParticles);emitterPaused=false;}
int GPUActor::DrawGPUEmitter(){PrepareEmitter();emitter->draw();return ++emitterDraws;}
int GPUActor::CaptureGPUEmitter(){
    if(!emitter)return emitterPixels=0;
    // Explicit diagnostic image transfer, never part of update/draw or game FPS.
    const auto image=emitter->capture();emitterPixels=0;
    for(std::size_t i=0;i<image.size();i+=4)if(image[i]>16)++emitterPixels;
    return emitterPixels;
}
