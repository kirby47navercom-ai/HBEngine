# 실제 DirectCompute 실행 046 — 2026-10-07

## 확인한 기존 구조

기존 `scene-rendering.js`는 WebGL2/Three Points와 ShaderMaterial, `projectile-rendering.js`는 인스턴스 렌더링을 사용해요. 이들은 그리기 셰이더예요. ParticleSimulation/ProjectileWorld의 시뮬레이션은 CPU였고 실제 compute Dispatch는 없었어요. Win32/WebView2 셸도 네이티브 DX 씬 렌더러가 아니에요.

## 구현한 경로

`native/include/HBEngine/Compute.hpp`에 실제 Windows Direct3D11 하드웨어 장치, HLSL cs_5_0 컴파일, 구조화 버퍼/UAV/SRV, 상수 버퍼, CSSetShader/Dispatch, 명시적 readback을 추가했어요. 시스템 DLL을 필요할 때만 로드하고 COM 자원은 RAII로 해제해요. WARP/CPU로 계산한 값을 GPU 결과라고 반환하지 않아요. 미지원 플랫폼은 available=false와 명시적 오류를 제공해요.

잘못된 HLSL, 빈 버퍼, ByteWidth 오버플로, 잘못된 stride/업로드 크기/그룹 수, 중복 UAV, 같은 버퍼의 분리된 읽기·쓰기 바인딩, 다른 장치의 버퍼·커널을 거부해요. 그룹·바인딩의 제한은 D3D11 API 제한이에요. 버퍼는 임의128MiB 제한을 두지 않고 드라이버 할당 오류를 전달해요. 선언한 셰이더 리소스를 맞게 바인딩하는 것은 사용자 커널의 책임이에요. 이 SDK는 임의 소스를 격리하는 보안 샌드박스가 아니에요.

`hb::gpu::Particles`는 GPU에 위치/나이/속도/수명 상태를 유지하고 가속도·중력·감쇠·수명으로 이동시켜요. step은 readback하지 않고 버퍼·상수 메모리를 재사용해요. read/reset/count를 제공해요. 사망 레코드는 계산을 멈추고 GPU 슬롯에 남아요. 기존 ParticleSystem의 방출·압축·정렬·텍스처 렌더러를 모두 이식한 것은 아니에요.

사람/AI는 기존 C++ 소스·컴파일·리플렉션·BP 노드·실행 API를 그대로 사용해요. Compute.hpp가 네이티브 빌드 캐시 해시에 들어가며 Windows 내보내기에서 실제 컴파일된 worker를 포함해요. 관련 없는 게임은 DirectX 장치를 생성하지 않아요. 일반 C++ 함수에서 compile/dispatch를 호출하거나 HB_FUNCTION으로 감싸 BP에서 호출할 수 있어요. 새로운 중복 실행기·스키마·자동 소프트웨어 대체 계산은 추가하지 않았어요.

## 사용 예제

[GPUActor.h](../examples/GPUActor.h)와 [GPUActor.cpp](../examples/GPUActor.cpp)를 프로젝트 Source에 넣고 GPUActor를 부모로 하는 BP에서 StepGPU에 deltaSeconds를 연결해요. ReleaseGPU로 자원을 해제할 수 있어요. 최초 GPU 생성은 배치된 위치를 사용하고, 후속 호출은 동일한 장치/버퍼를 유지해요. 예제는 한 액터 위치를 반환하는 연결 예제예요. 작은 액터 이동을 GPU로 보내는 것이 CPU보다 빠르다는 권장은 아니에요.

## 실행 증거와 비용

- `npm run test:compute`: 실제 하드웨어 HLSL 결과와 CPU float 계산의 모든524,296값 비교,65,537레코드의 마지막 부분 작업 그룹,20회 연속 상태 유지,업로드/상수/SRV 및 오류 검증. 최대 오차 `2.9802322387695312e-8`. 실제 BP→사용자 C++→하드웨어 compute·반환값과 배치 위치 보존 PASS. 미지원 분기는 별도 실행 검증. Android NDK28.2 ARM64/x86_64가 자연 비Windows 분기를 컴파일 PASS; Android GPU/앱 실기기 검증은 아니에요. `native/build/gpu-compute-iwABfm/acceptance.json`.
- 같은65,537레코드/20step,3회 중앙값: CPU `4.0771ms`, GPU에서20회 진행 후 한 번 readback `1.2039ms`(최초 업로드·dispatch·readback 포함), 매 step readback은 `10.8629ms`. 초기 장치/컴파일은 제외해요. 짧은 순차 비교이고 게임 IPC·렌더·프레임 안정/발열·FPS 측정이 아니에요. GPU 선택 자체를 전체 FPS 향상으로 계산하지 않아요.
- `npm run test:compute-window`: private 프로젝트를 실제 release로 빌드→숨긴 별도 Player HWND에서 E입력→BP→C++→DirectCompute→2D SVG 스프라이트와3D 메시 위치 반영.3회 호출에서 각 액터 장치/버퍼1세대, R해제→E재생성2세대, 시작 위치·원본·셰이더 runnable·오류0·종료0·서버 종료 PASS. `native/build/gpu-compute-window-aa6Y3B/acceptance.json`과 `gpu-2d-3d.png`. 현재 그리기는 WebGL2이며 예제의 한 레코드를 명시적으로 readback해요.
- 실패한 iU6rVy(컴파일 경고),dHkb0o(Unicode 절대 출력 경로),5D86YA(Windows GetObject 매크로 충돌),cOgdPC/zmXWGy(직접 검사 호출의 target 누락)를 보존했어요. 실제 원인을 수정하고 성공 증거의 소스 SHA를 대조했어요.

## 다음 구현에 필요한 경계

현재 기본 파티클·탄막 전체가 compute로 전환됐거나 씬 렌더러가 GPU 버퍼를 직접 소비한다고 주장하지 않아요. 매 프레임 전체 버퍼→CPU/JSON→WebGL 복사를 기본으로 넣으면 위 측정에서도 손해예요. 대량 효과는 시뮬레이션과 그리기가 GPU 자원을 공유하도록 렌더 경로를 연결해야 해요. 기존 GLSL 재질·2D 조명·마스크·정렬·3D 깊이/그림자를 유지해야 하므로 단순 renderer 클래스 치환과 화면 위 합성은 완료 조건이 아니에요. 모바일 Vulkan/Metal 또는 WebGPU backend도 아직 이 Windows SDK에 구현되지 않았어요. 기존 APK/AAB/iOS 산출물은 이번에 재빌드하지 않아요.

## 공식 본문 근거와 실제 읽은 범위

- [microsoft-compute](https://learn.microsoft.com/en-us/windows/win32/direct3d11/direct3d-11-advanced-stages-compute-shader): own technical body: compute/Dispatch definitions and DirectCompute4.x/5.0 hardware restrictions (web lines31–63); linked pages excluded.
- [microsoft-dispatch](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-dispatch): own syntax, parameters and remarks (web lines32–70); diagram pixels and child pages excluded.
- [unity-introduction](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ComputeShader-introduction.html): own introduction/platform list/HLSL translation (web lines127–142); linked pages excluded.
- [unity-run](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ComputeShader-run.html): own script/Dispatch/structured buffer/render texture body (web lines127–130); linked API bodies excluded.
- [unity-crossplatform](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ComputeShader-crossplatform.html): best practices and platform differences (web lines127–145); texture-format table and remainder not claimed fully read.

원문 HTTP200·크기·SHA·읽기 범위는 `native/build/gpu-compute-docs-046/manifest.json`이에요. 다운로드·상위 포털·검색 결과·링크 목록을 전체 본문/API 분석 완료로 세지 않아요. GPU는 병렬 계산의 한 경로이며 C++/물리/IPC/UI 병목까지 자동으로 해소한다고 판단하지 않아요.
