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
    HB_PROPERTY(BlueprintReadWrite) int gpuFramesReady=0;
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 이동 계산", Category="GPU") hb::Vec3 StepGPU(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 자원 해제", Category="GPU") void ReleaseGPU();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 프레임 제출", Category="GPU") bool DispatchGPU(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="완료 GPU 프레임 적용", Category="GPU") bool PollGPU();
private:
    std::unique_ptr<hb::gpu::Device> device;
    std::unique_ptr<hb::gpu::Particles> particles;
    void PrepareGPU();
};
