# C++ Compute 비동기 준비

`Device::compileAsync`는 준비 요청을 반환하고 `Device::pollKernel`은 완료한 바이트코드를 소유 장치에 채택해요. 완료 후 `KernelPreparation::take()`로 기존 `Kernel`을 받아 같은 `dispatch`와 프레임 자원 API를 사용해요. 기존 `Device::compile`은 동기로 유지해요.

```cpp
auto request = gpu.compileAsync(hlsl, "Main");

// 다음 Tick에서 확인해요. 반복 대기로 게임 스레드를 막지 않아요.
if (gpu.pollKernel(request)) {
    auto kernel = request.take();
    gpu.dispatch(kernel, {&buffer}, groups);
}
```

요청은 복사하지 않고 이동해요. 다른 장치, 이동된 요청, 이미 가져온 요청과 취소된 요청의 완료 확인은 거절해요. `cancel()`과 소멸은 대기 작업의 참조를 놓고, 이미 시작한 컴파일은 GPU 객체에 접근하지 않은 채 끝나요. `info()`의 `pending`, `ready`, `state`, `error`로 상태를 읽어요. 바이트코드만 끝난 `awaiting-adoption`은 GPU 커널 준비 완료와 달라요. 잘못된 소스나 장치 오류는 완료 확인 시 예외로 전달해요.

화면 효과·머테리얼·기본 래스터·프로브와 같은 단일 지연 워커, 8MiB 작업 큐, 1초 유휴 종료를 사용해요. 큐에 여유가 없으면 요청을 유지하고 다음 `pollKernel`에서 제출을 재시도해요. 컴파일러 상태·디스크 저장소·DLL을 워커보다 먼저 초기화해서 정상 프로세스 종료 시 워커를 먼저 기다려요. 요청은 장치를 보유하지만 워커의 콜백은 소스·진입점만 보유해요.

캐시는 기존 `Device::configureShaderCache`로 명시적으로 설정해요. 미설정 SDK는 캐시 파일을 만들지 않아요. 소스·진입점·컴파일 옵션의 기존 바이트코드 키를 유지하고, 준비 큐의 진입점에는 길이 경계를 넣어 잘못된 진입점이 정상 소스와 충돌하지 않게 해요. 장치가 캐시 코드를 거부하면 한 번 새로 컴파일해요. 반복 dispatch와 준비 완료 후 조회는 캐시 파일을 읽지 않아요.

블루프린트에서는 사용자 C++의 `HB_FUNCTION`을 호출하는 기존 경로를 사용해요. 실제 검사609는 액터별 C++ 상태를 두고 BeginPlay에서 준비, Tick에서 완료·프레임 결과 확인, EndPlay에서 해제를 수행했어요. 배치 위치를 보존했고 GPU 결과9를 받았어요. 준비를 관찰하기 위한 100ms 워커 게이트는 검사 코드에만 있어요. 자동 readback 대신 기존 세 프레임 자원을 명시적으로 사용해요.

AI는 `engine.schema.nativeShaderCache.compute.asyncAPI`와 기존 C++·블루프린트 제작/호출을 사용해요. Win32 DirectCompute 백엔드용 API예요. Android 두 대상의 헤더 구문·비지원 처리를 확인했으며 실제 모바일 GPU 백엔드나 실기기 실행을 의미하지 않아요.

## 프로브 준비

데스크톱의 `asyncShaderPreparation`은 프로브의 정반사·BRDF·확산·HDRI 변환 네 단계를 같은 큐에 연결해요. 필요한 장면에서만 요청하고 준비 전 캡처·필터·의존 이력 승인을 보류해요. 기본 래스터는 계속 그려요. `shaderPreparation.raster.probeFiltering`과 프로파일러가 같은 상태를 보여 줘요.

기존 SDK 호출은 동기예요. 비동기를 선택한 SDK 호출자는 `renderer.pollProbePreparation(true)`로 준비를 요청하거나 먼저 `createProbe`를 호출한 뒤 완료를 확인해요. 준비가 끝난 뒤 필터링해요. 필터 단계 번호를 완료 전에 증가시키지 않아요. 준비되지 않은 직접 필터 호출은 예외로 거절해요. 셰이더 컴파일을 옮긴 것이며 큰 HDRI 변환·프로브 캡처·GPU 필터링 비용이 사라지는 것은 아니에요.

실행 근거와 한계는 `docs/research/ENGINE_WORK_610.json`, 누적 잔여 정본은 `docs/research/ENGINE_STATUS.json`에 있어요.
