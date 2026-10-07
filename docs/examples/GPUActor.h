#pragma once
#include <HBEngine/Game.hpp>
#include <HBEngine/Compute.hpp>
#include <memory>

HB_CLASS(Blueprintable)
class GPUActor : public hb::Actor {
public:
    HB_PROPERTY(BlueprintReadWrite) int gpuSteps=0;
    HB_PROPERTY(BlueprintReadWrite) int gpuGenerations=0;
    HB_PROPERTY(BlueprintReadWrite) bool gpuActive=false;
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 이동 계산", Category="GPU") hb::Vec3 StepGPU(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 자원 해제", Category="GPU") void ReleaseGPU();
private:
    std::unique_ptr<hb::gpu::Device> device;
    std::unique_ptr<hb::gpu::Particles> particles;
};
