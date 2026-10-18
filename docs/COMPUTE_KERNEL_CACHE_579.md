# 일반 Compute 커널 재사용

`hb::gpu::Device::compile`도 기존 DirectX 셰이더의 공용 바이트코드 캐시를 사용해요. 사용자 Compute 커널과 `hb::gpu::Particles`의 시뮬레이션·방출·빈 슬롯 수집·Clear가 같은 저장소를 재사용해요. 별도 캐시나 워커를 만들지 않고 기존8MiB 저장소·키 검증·파일 손상/장치 거부 복구를 유지해요.

SDK에서는 `Device::configureShaderCache(directory)` 또는 기존 `SceneRenderer::configureShaderCache(directory)`로 명시적으로 켜요. 빈 경로는 비활성화해요. 캐시를 설정하지 않은 SDK는 파일에 접근하지 않고 기존처럼 컴파일해요. 데스크톱 실행기는 기존 초기 설정으로 자동 연결돼요. `Device::shaderDiskCacheInfo()`는 해당 장치만의 수치가 아니라 기존 공용 저장소의10개 진단 값을 반환해요. 비지원 플랫폼의 설정 호출은 명시적으로 거부하고 진단은 빈 값이에요.

전체 HLSL·소스 이름·진입점·대상 프로필·옵션·컴파일러 DLL 식별을 기존 키에 사용해요. 같은 바이트코드를 읽더라도 GPU 커널은 호출한 소유 장치에서 새로 생성해요. 파일/FXC 작업 중에는 장치 mutex를 잡지 않고 `CreateComputeShader` 구역만 잠가요. 소스/진입점 검증·상수 버퍼·세 프레임 자원·owner 검사·명시적 readback 계약을 유지해요. `compile`은 동기 함수이며 최초 미적중의 FXC 비용을 없애는 기능은 아니에요.

기존 순환 include 때문에 공통 Windows/COM/DLL 선언만 `ComputePlatform.hpp`로 옮겼어요. 장치와 파티클 구현을 그대로 유지한 구조 변경 단계에서 전후65,537개 파티클·방출·세 프레임 스냅샷·입력/owner 검사가 같은 결과였어요. 컴파일러 helper만 include해 `Device`를 사용하던 경로도 보존해요. Windows와 비지원 헤더 순서를 확인했어요.

577 검사에서는 별도 프로세스로 동일한 사용자 커널3개와 파티클 풀3개를 실행했어요. 첫 캐시는7개 저장·8개 적중, 재실행은15개 적중·새 저장0개였고 결과가 같았어요. 서로 다른 진입점/소스,65개 방출/257슬롯/Clear, 캐시 미설정 시 파일 미생성, 잘못된 셰이더 단계가 캐시에 들어갔을 때 실제 장치 거부→컴파일→다음 적중도 확인했어요. 반복 dispatch8회의 캐시 진단 값은 변하지 않았어요.45.3ms와14.6ms는 검사 커널 컴파일/실행/명시적 읽기를 포함한 한 번씩의 관찰이며 게임 FPS 보장이 아니에요.

기존 GPU 검사에서는 BP→사용자 C++→실제 DirectCompute, 배치된 위치 보존,65,537레코드/20step의 모든 값·부분 workgroup·방출/프레임 자원과 두 Android 대상의 헤더 구문을 확인했어요. Android에서 이 Windows `Device` 백엔드를 실행했다는 뜻이 아니에요. 모바일의 다른 그래픽 백엔드와 실기기 성능은 별도 목표예요. 검사 원본과 지문은 `ENGINE_WORK_579.json`에 연결해요.

AI는 기존 C++/BP 제작·호출 경로를 그대로 사용하고 `engine.schema.nativeShaderCache.compute`에서 캐시/잠금/dispatch 계약을 읽을 수 있어요. 전체 초기 래스터·GL/FXC 지연과 나머지 누적 엔진 작업은 별도로 계속 진행해요.
