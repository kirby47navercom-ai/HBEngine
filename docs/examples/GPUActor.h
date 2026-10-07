#pragma once
#include <HBEngine/Game.hpp>
#include <HBEngine/Compute.hpp>
#include <HBEngine/Render.hpp>
#include <memory>

HB_CLASS(Blueprintable)
class GPUActor : public hb::Actor {
public:
    HB_PROPERTY(BlueprintReadWrite) int gpuSteps=0;
    HB_PROPERTY(BlueprintReadWrite) int gpuGenerations=0;
    HB_PROPERTY(BlueprintReadWrite) bool gpuActive=false;
    HB_PROPERTY(BlueprintReadWrite) int gpuFramesReady=0;
    HB_PROPERTY(BlueprintReadWrite) int gpuDraws=0;
    HB_PROPERTY(BlueprintReadWrite) int emitterCapacity=4096;
    HB_PROPERTY(BlueprintReadWrite) int emitterDraws=0;
    HB_PROPERTY(BlueprintReadWrite) int emitterPixels=0;
    HB_PROPERTY(BlueprintReadWrite) bool emitterActive=false;
    HB_PROPERTY(BlueprintReadWrite) bool emitterPaused=false;
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 이동 계산", Category="GPU") hb::Vec3 StepGPU(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 자원 해제", Category="GPU") void ReleaseGPU();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 프레임 제출", Category="GPU") bool DispatchGPU(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="완료 GPU 프레임 적용", Category="GPU") bool PollGPU();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 버퍼 직접 그리기", Category="GPU") int DrawGPU();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 방출", Category="GPU|파티클") void EmitGPUEmitter(int count, float lifetime);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 업데이트", Category="GPU|파티클") void UpdateGPUEmitter(float deltaSeconds);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 재생", Category="GPU|파티클") void PlayGPUEmitter();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 일시정지", Category="GPU|파티클") void PauseGPUEmitter();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 정지", Category="GPU|파티클") void StopGPUEmitter(bool clearParticles);
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 파티클 그리기", Category="GPU|파티클") int DrawGPUEmitter();
    HB_FUNCTION(BlueprintCallable, KoreanName="GPU 이미지 명시적 검사", Category="GPU|디버그") int CaptureGPUEmitter();
private:
    std::unique_ptr<hb::gpu::Device> device;
    std::unique_ptr<hb::gpu::Particles> particles;
    std::unique_ptr<hb::gpu::ParticleRenderer> renderer;
    std::unique_ptr<hb::gpu::ParticleEffect> emitter;
    void PrepareGPU();
    void PrepareEmitter();
};
