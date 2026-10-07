# GPU 버퍼 직접 렌더링과 편의 API (048)

2026-10-07. 046 실제 DirectCompute와 047 프레임 리소스에 이어, 계산한 파티클 버퍼를 CPU로 회수하지 않고 Direct3D11 렌더링에 연결했어요. 현재 메인 에디터/Player의 WebGL2 씬 렌더러 전체가 이식됐다는 뜻은 아니에요.

## 사용 API

`native/include/HBEngine/Render.hpp`의 `hb::gpu::ParticleEffect`가 Device·시뮬레이션·렌더러·프레임 상수를 소유해요. 게임 코드가 HLSL·D3D 버퍼·UAV·SRV·COM 수명을 직접 관리할 필요가 없어요.

```cpp
#include <HBEngine/Render.hpp>
hb::gpu::ParticleEffect effect({{{0,0,5},{1,0,0},5,0}},1280,720);
effect.style.viewProjection=hb::gpu::orthographic(16,9);
effect.style.size=.15f;
effect.update(deltaSeconds);   // 힘·중력·저항 인자도 선택 가능
effect.draw();                 // GPU 계산 버퍼에서 직접 그려요
auto image=effect.capture();   // 필요한 때만 명시적으로 RGBA8을 회수해요
```

- Particle은 position·velocity·lifetime·age 필드예요. 8-float 셰이더 레코드를 직접 작성하지 않아도 돼요.
- resize, setTexture(width,height,RGBA8,nearest), clearTexture, reset, count, draws를 제공해요. count는 보유 슬롯 수예요. 살아 있는 수는 GPU가 간접 그리기 명령으로 전달하며 CPU 값으로 매 프레임 회수하지 않아요.
- reset은 같은 개수의 초기 상태를 재사용해요. 잘못된 길이/값을 거부하며 리소스 소유 순서로 자동 해제해요. 다른 개수의 효과는 새 ParticleEffect로 생성해요.
- orthographic/perspective는 +Z 전방·D3D 깊이[0,1]의 투영을 만들어요. world와 viewProjection, 월드 카메라 right/up은 ParticleStyle에서 지정해요. Three의 투영 행렬을 변환 없이 넣는 API는 아니에요.
- alpha/additive/opaque, 깊이 검사·쓰기, 시작/종료 색·크기, RGBA8 스프라이트와 nearest/linear 샘플링을 지원해요. 효과를 순서대로 합칠 때는 공용 Device의 ParticleRenderer에서 clear 한 번 후 여러 Particles를 draw해요.
- HWND를 선택 인자로 빌리면 flip swapchain으로 출력해요. 엔진이 기존 창을 만들거나 닫지 않아요. draw의 반환값은 출력 대상이 가려지지 않았는지 나타내고, HWND 없는 타깃은 true예요. capture는 동기 회수이므로 프레임마다 호출하지 않는 것이 좋아요.
- `docs/examples/NativeGPUWindow.cpp`는 편의 API를 사용하는 실제 창 샘플이에요. 검사에서 HBGPUDemo.exe를 빌드하지만 사용자 창은 실행하지 않아요. Win32 메시지 루프 외 렌더링에는 DirectX 호출이 없어요.
- `GPUActor::DrawGPU`는 HB_FUNCTION으로 반영되어 사용자 C++에서 노드로 노출돼요. 기존 StepGPU/DispatchGPU/PollGPU와 동일한 GPU 버퍼를 별도 네이티브 타깃에 그리며 게임 위치 변경/결과 회수를 요구하지 않아요. 이 타깃이 현재 웹 메인 씬에 자동 합성되는 기능은 아니에요.

## 내부 연결과 비용

원래 Particles의 구조화 버퍼를 compute UAV에서 해제한 뒤 vertex SRV로 사용해요. 별도 compute가 살아 있는 인덱스를 append하며, 매 draw마다 counter를 0으로 초기화해요. CopyStructureCount가 활성 수를 간접 명령의 instance-count 필드로 복사하고 DrawInstancedIndirect가 실제 수만 그려요. 위치/활성 수의 CPU 회수·JSON 전달·재업로드가 없어요. 죽은 슬롯을 vertex로 모두 그리는 방식도 제거했어요.

64개 스레드 그룹·부분 마지막 그룹을 보호하고, 시뮬레이션/인덱스 생성은 65535그룹을 넘으면 2D Dispatch로 나눠요. 대규모 2D Dispatch 경계의 실제 최대 할당 검사는 하지 않았어요. 버퍼·텍스처 크기는 D3D11 표현 한계/드라이버 할당 실패를 따르며 임의 500/1000개 씬 제한을 추가하지 않았어요.

GPU 메모리는 기존 32바이트 파티클 슬롯 외 렌더러가 사용한 최대 현재 효과에 대한 4바이트 활성 인덱스, 16바이트 간접 명령, 3개 208바이트 상수 버퍼, 색/깊이 타깃을 사용해요. 타깃 회수 버퍼는 capture 때만 할당해요. GPU 리소스 재사용은 CPU의 모든 임시 할당이 0이라는 뜻이 아니에요. 일반 draw는 Flush/Map READ를 하지 않아요. swapchain 해제 시에만 참조 해제 후 Flush로 같은 HWND의 재생성을 보장해요.

## 공식 본문 근거

읽은 범위·미독 범위·원본 SHA는 `native/build/gpu-render-docs-048/manifest.json`에 있어요. HTML 다운로드는 본문 분석 완료로 계산하지 않았어요. 새 본문은 아래 9개 API의 자체 설명이고, DXGI overview는 31-142 구간만 읽었어요. 링크된 자식 API·전체 Unity/Unreal 문서를 모두 읽은 것으로 세지 않아요.

- [VSSetShaderResources](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-vssetshaderresources): 자체32-74, 출력 자원과 중복되면 null·명시적 바인딩 해제.
- [DrawInstanced](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-drawinstanced): 자체32-77, SV_InstanceID 데이터로 vertex buffer 없는 인스턴스 생성.
- [CreateSwapChainForHwnd](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_2/nf-dxgi1_2-idxgifactory2-createswapchainforhwnd): 자체32-87, 빌린 HWND·장치·flip 체인 수명.
- [ResizeBuffers](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiswapchain-resizebuffers): 자체32-88, back buffer 참조 해제·resize·재획득.
- [Present](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/nf-dxgi-idxgiswapchain-present): 자체32-90, 동기 간격·occlusion·장치 오류. 전체 FPS 검증을 대신하지 않아요.
- [Flush](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-flush): 자체32-53, 매 draw 호출 비용과 flip swapchain 재생성 전 deferred destruction 해제.
- [DrawInstancedIndirect](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-drawinstancedindirect): 자체32-60, DRAWINDIRECT_ARGS 자원에 GPU가 생성한 명령 사용.
- [CopyStructureCount](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-copystructurecount): 자체32-59, append UAV의 hidden counter를 args offset4에 GPU 복사.
- [CSSetUnorderedAccessViews](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-cssetunorderedaccessviews): 자체32-73, append counter 초기화/보존 규칙.
- [DXGI overview](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/d3d10-graphics-programming-guide-dxgi): 31-142만 읽었어요. D3D11 back-buffer identity 자동 교체/resize 규칙. 나머지는 미독이에요.

## 검증과 제한

- `npm run test:gpu-render`: 실제 하드웨어 컴퓨트→활성 인덱스→간접 draw→RGBA/깊이→숨긴 자체 HWND flip 출력. 실제 픽셀 이동/수명 종료/깊이/혼합/텍스처 방향·필터/투영·크기·resize/같은 HWND 재생성/잘못된 인자·다른 장치 거부/편의 API 실행 PASS.
- 최신 증거 `native/build/gpu-render-UIDtfw/acceptance.json`. 65,537개,20frame,한 번 최종 이미지 회수를 포함한 3회 배치 1.5927/2.0115/1.6714ms. 위치 회수0,활성 수 CPU 회수0. 초기 생성/컴파일·창 출력 대기·IPC·다른 씬 시스템은 제외해요. 기존 매 step readback·CPU와 작업 범위가 달라 직접 전체 게임 속도 배수로 계산할 수 없어요.
- `npm run test:compute`: 새 시뮬레이션 셰이더/3개 결과 슬롯/상수 재사용/전체 524,296 float 대조/BP→실제 C++→GPU/2개 Android ABI 헤더 PASS. 최신 `native/build/gpu-compute-3tRrRV/acceptance.json`.
- 실제 배포 Player의 C++/BP 직접 draw 검증은 아래 최종 기록에 연결해요. 사용자 원본/프로필/창/기존 프로세스를 사용하지 않았어요.
- 초기 실패 `gpu-render-IKakyR`: 테스트 변수 near/far가 Windows 매크로와 충돌했어요. 검사 변수명을 바꾸고 재검증했어요. TKZq27/66Uzak은 후속 간접 draw·편의 API 변경 전 증거라 최신 통과로 재사용하지 않아요.
- 메인 WebGL2 씬·기본 ParticleSystem의 CPU 방출·정렬·마스크·2D 조명·탄막 충돌은 유지돼요. 새 경로는 opt-in 네이티브 GPU 파티클 렌더 API예요. 깊이 정렬,방출/죽은 슬롯 재사용,씬 카메라·머테리얼/조명 통합,플랫폼별 GPU backend와 전체 게임 PC120/모바일60 검증은 추가 작업이에요. append 활성 인덱스는 정렬을 보장하지 않아요.

- 최종 release Player 증거 `native/build/gpu-compute-window-j7k2Gr/acceptance.json`: BP G입력→사용자C++ DrawGPU 2회/actor→실제GPU direct render/회수0/게임위치 보존,기존비동기FIFO/해제/2D·3D·오류0/정상종료·자체서버정리/원본보존 PASS. 주 씬은 WebGL2이고 별도GPU타깃의 웹합성은 미연결이에요.
- `node tools/check-library.mjs`: 공통 Extended 편의함수221개를 실제C++ 실행 결과와BP evaluator로 대조하고 배열·산술 오류와저장타입을 검증했어요. `native/build/gpu-render-helper-library-048.json`에 SHA/관찰출력을 기록해요. 모든엔진서브시스템을검증했다는뜻은아니에요.
