# GPU 파티클 방출·수명·슬롯 재사용 (049)

2026-10-07. 048의 직접 GPU 렌더 경로에 새 파티클 방출, 죽은 슬롯 재사용, 초당 방출, 일시정지·재개·정지·제거를 연결했어요. 게임 코드는 C++ 편의 API를 사용하며 사용자 C++의 HB_FUNCTION은 블루프린트 노드로 노출돼요.

## 게임 코드

```cpp
#include <HBEngine/Render.hpp>
hb::gpu::ParticleEffect effect(65537,1280,720); // 비어 있는 GPU 슬롯
effect.style.viewProjection=hb::gpu::orthographic(16,9);
effect.emitter.rate=500;
effect.emitter.birth={{0,0,5},{0,1,0},3,0};
effect.emit(100,effect.emitter.birth); // 즉시 방출
effect.update(deltaSeconds);         // GPU 이동/수명, 방출 누적
effect.draw();                       // GPU 활성 개수로 간접 그리기
effect.pause();                      // 이동/수명/초당 방출을 함께 동결
effect.play();                       // 일시정지 전 누적 시간으로 재개
effect.stop();                       // 초당 방출 중지, 기존 입자는 계속 이동/소멸
effect.stop(true);                   // 방출 중지와 즉시 제거
effect.clear();                      // 입자와 방출 소수 잔여량 제거
```

- 수용량은 효과별 GPU 메모리 예산이에요. 엔진 전체 오브젝트를 500/1000개로 제한하지 않아요. 실제 한계는 D3D11 ByteWidth 표현과 하드웨어 할당이에요. count()는 슬롯 수이며 살아 있는 개수의 CPU 질의가 아니에요.
- emit(vector<Particle>)은 서로 다른 초기 위치·속도·수명·나이를 받으며 emit(count,birth)은 동일한 초기 속성으로 방출해요. 살아 있는 슬롯이 가득 찼으면 초과 요청을 버리고 기존 입자를 보존해요. 새 방출에 사용할 슬롯 순서는 GPU append 순서로, 고정된 슬롯 번호를 보장하지 않아요.
- 방출할 입자는 양수 수명, 유한 위치/속도/나이, 0≤나이<수명이 필요해요. 초당 방출의 잘못된 초기 값은 이동을 실행하기 전에 거부해 기존 GPU 상태를 보존해요. 음수 rate/잘못된 delta도 거부해요.
- rate는 소수 잔여량을 다음 update에 보존해요. pause에서 이동·수명·누적량이 모두 멈추며 play로 재개해요. stop 후 play는 stop에서 비운 잔여량부터 시작해요. 재생 중 play 반복은 누적량을 리셋하지 않아요.
- 수동 emit은 pause/stop 상태에서도 가능해요. pause 상태에서는 추가한 입자도 update로 이동하지 않아요. stop(false) 상태의 update는 기존 입자를 계속 움직여요. clear는 재생 상태 자체를 바꾸지 않아요.
- reset은 같은 슬롯 수의 초기 기록으로 덮어쓰고 이전 비동기 회수와 방출 잔여량을 버려요. clear/stop(true)도 예전 결과 슬롯을 버려 제거 전 위치를 나중에 되살리지 않아요.
- Particles/ParticleEffect의 여러 단계 호출은 소유 스레드 한 곳에서 실행해요. Device의 개별 호출 직렬화가 같은 효과의 동시 emit/update 전체를 원자적으로 만드는 계약은 아니에요.
- GPUActor의 EmitGPUEmitter/UpdateGPUEmitter/PlayGPUEmitter/PauseGPUEmitter/StopGPUEmitter/DrawGPUEmitter는 실제 사용자 C++→블루프린트 연결 샘플이에요. emitterCapacity는 수정 가능한 예산이며 4096은 샘플 기본값이에요. CaptureGPUEmitter는 명시적인 동기 이미지 검사 함수로, 정상 update/draw에 넣지 않아요. 시각 효과가 액터의 배치 위치를 덮어쓰지 않아요.

## 내부 연결과 가벼움

빈 슬롯을 GPU compute가 append 목록으로 만들고, counter를 0으로 리셋한 뒤 CopyStructureCount로 GPU 카운터 버퍼에 복사해요. 방출 compute가 요청 수와 빈 개수를 비교해 유일한 빈 인덱스에만 새 속성을 기록해요. 기존 입자의 위치/활성 수/빈 슬롯을 CPU로 회수하지 않아요. 기존 간접 draw는 살아 있는 입자만 그려요.

초기 위치/속도/수명을 준비하는 일과 rate 누적은 CPU에서 하고, 방출 요청만 업로드해요. 전체 파티클 버퍼를 매 emit 덮어쓰지 않아요. 요청 GPU 버퍼는 필요할 때만 늘리고 재사용하며, 편의 함수의 CPU 방출 배열도 재사용해요. 처음 emit할 때만 방출/빈 슬롯 셰이더와 추가 버퍼를 생성해요. 추가 GPU 저장 공간은 슬롯당 4바이트 빈 인덱스, 4바이트 카운터, 커진 요청 용량당 32바이트예요. 기본 경로가 각 프레임 대기·readback·이미지 복사를 요구하지 않아요.

현재 구현은 burst마다 수용량 전체를 한 번 검사해요. 소스의 ponytail 주석에 비용과 persistent free-list 개선 조건을 기록했어요. 적은 생존 수라도 이 스캔 비용은 수용량에 비례해요. 각 ParticleEffect는 편리한 독립 Device를 소유해요. 여러 효과의 장치/타깃 공유는 기존 Device/Particles/ParticleRenderer를 사용하는 별도 통합 작업이에요.

## 실제 읽은 근거

원본 SHA/다운로드 상태/읽은 구간은 `native/build/gpu-emission-research-049/manifest.json`에 있어요. Unity 6000.0 API는 다운로드한 자체 선언·인자·설명·예제를 읽었고, Microsoft/Epic은 아래 웹 본문을 읽었어요. 별도로 보관한 원본 HTML 전체를 분석했다는 뜻은 아니에요. 연결 API·이미지·전체 엔진 문서는 이 기록의 읽기 범위에 포함하지 않아요.

- [Unity Emit](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.Emit.html): 즉시 방출과 초기 속성 지정. HB는 입자 기록을 명시적으로 받으며 Inspector 속성의 부분 override 전체를 복제하지 않아요.
- [Unity Pause](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.Pause.html), [Play](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.Play.html), [Stop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.Stop.html): 동결/재개와 방출 중지만 하는 경우·즉시 제거하는 경우를 나눴어요. 자식 시스템 전파·시작 지연·prewarm은 GPU API에 아직 연결하지 않았어요.
- [Epic GPUSprites, UE4.27](https://dev.epicgames.com/documentation/en-us/unreal-engine/gpusprites-type-data?application_version=4.27): 자체 본문0–63. CPU 초기 속성 준비/GPU 적분, 개수·정렬·fill-rate 비용을 구분해요. 과거 Cascade 문서의 모바일 표를 HB 모바일 지원 근거로 사용하지 않아요.
- [Epic Niagara GPU Sprite, UE5.8 표시](https://dev.epicgames.com/documentation/unreal-engine/how-to-create-a-gpu-sprite-effect-in-niagara-for-unreal-engine?lang=en-US): 자체 본문0–193. 시스템/이미터, GPUComputeSim/FixedBounds, burst/rate, spawn/update, 크기 곡선·노이즈·인력·색/불투명도 곡선까지 읽었어요. 이번 GPU 구현은 방출/수명/재생 제어에 해당하며 이 모든 모듈 구현을 완료한 것으로 세지 않아요.
- [UpdateSubresource](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-updatesubresource): 자체34–198. 바이트 단위 영역·유효 목적지·복사 수명·경합 시 복사 비용. HB는 immediate context이며 deferred workaround를 사용하지 않아요. 요청 업로드를 CPU 복사0으로 표현하지 않아요.
- [CopyStructureCount](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-copystructurecount), [CSSetUnorderedAccessViews](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-cssetunorderedaccessviews): 자체32–59/32–73 재읽기. hidden counter·바이트 정렬·초기화/보존. 구조화 목적지 거부는 본문에서 찾은 사항이 아니라 실제 D3D11 debug layer로 추가 확인했어요.

## 검증

- `node tools/check-gpu-compute.mjs`: `gpu-compute-eZAFNC/acceptance.json`. 실제 하드웨어에서 부분 업로드/범위·stride 거부, append counter 초기화·보존, 빈 슬롯/초과 요청/살아 있는 상태 보존, 수명 후 재사용, clear 후 비동기 결과 제거, 65개 부분 그룹·66개 요청의 clipping, 요청 버퍼 재사용 PASS. 기존 전체 float 대조·3개 프레임 슬롯·C++/BP와 Android 두 ABI 헤더 검사도 통과했어요.
- `node tools/check-gpu-render.mjs`: `gpu-render-mEgSrZ/acceptance.json`. 실제 픽셀로 비어 있는 효과·rate 소수 잔여량·pause/resume·stop 후 이동/소멸·즉시 clear·여러 초기 속성·잘못된 update의 상태 보존을 확인했어요. 기존 깊이·혼합·텍스처·투영·숨긴 자체 HWND 출력도 PASS예요.
- 방출 배치도 측정했어요. 65,537 슬롯, frame마다1024개 방출·수명0.04초,20frame의 step/emit/draw·한 번 최종 이미지 회수: 1.3395/1.1724/1.2401ms. 요청 버퍼 할당1, 위치/개수 CPU 회수0이에요. 전부 살아 있는65,537개 기존 배치1.4587/1.5133/1.468ms와 작업량/생존 수가 다르므로 속도 배수나 전체 FPS 비교로 사용하지 않아요. 생성/컴파일·Present·IPC·게임 로직 비용도 제외해요.
- `node tools/check-gpu-compute-window.mjs`: `gpu-compute-window-azWd4k/acceptance.json`. 실제 release Player의 BP 입력→사용자C++→GPU 방출/이미지 검사, pause 동안 수명 보존, resume/stop 후 소멸, stop(true) 제거, 재방출·해제와 2D/3D 배치 위치 보존 PASS. 진단 이미지만 명시적으로 회수했어요. 원본 복사본/Sources 불변·오류0·정상 종료/자체 서버 정리도 확인했어요.
- 실제 debug layer 보조 검사 `gpu-emission-debug-049/acceptance.json`: 새 emit/step/clear/re-emit 오류0. 처음 실패 `gpu-compute-K0m9wR`은 카운터 복사 목적지를 구조화 버퍼로 만들었기 때문이에요. 전용 typed Buffer<uint> 저장소와 사전 거부로 고쳤어요. `gpu-render-ZkN49v`는 방출 비용 측정 추가 전 기록이며 최신 render 증거는 mEgSrZ예요.
- 변경 없는 공통 편의함수221개는 048의 실제 C++/BP 결과 비교 증거와 현재7파일 SHA가 같아 재실행하지 않았어요. 세 검사와 debug proof도 현재 소스 SHA를 확인했어요. 사용자 창/프로필/원본 게임, 기존 장시간 검사는 사용하지 않았어요.

## 이어갈 연결

메인 씬은 아직 WebGL2이며 기본 CPU ParticleSystem/탄막 충돌과 새 네이티브 타깃이 자동 합쳐지지 않아요. GPU depth 정렬, 씬 카메라·재질/2D 마스크·조명·충돌·emitter shape/곡선/자식 시스템·고정 bounds/거리별 예산과 공유 장치, 모바일 GPU backend는 다음 통합 대상이에요. CPU 기능을 제거하거나 전체 게임 PC120/모바일60 성공으로 세지 않아요. 누적 요구와 전체 문서 분석 gate도 유지해요.


## 049 사용자 설치 갱신 완료 — 2026-10-07

검증 production 022b7decbfa4ebb450936edfa9f598f46846588b를 C:\Users\kirby\HBEngine\Versions\7a1921f1526ee62d에 불변 설치했어요.1813파일·변경15개 SHA·바로가기/.hbproject 연결 검증 PASS. 이전944ae8 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자 창을 시작/종료하지 않았어요. GPU 방출/수명/빈 슬롯 재사용과 ParticleEffect의 emit/rate/play/pause/stop/clear, 사용자C++→BP 노드를 포함해요. 실제 GPU·픽셀·배포 Player·debug 오류0·현재 소스 SHA 검증을 사용했고 변경 없는 편의 함수221개 검사는 재사용했어요. 기존메인씬/CPU 탄막을 자동 GPU로 이식한 설치나 전체게임 FPS/모바일GPU 검증으로 세지 않아요. 증거 native/build/gpu-emission-user-install-049.json. 다음 실행부터 새 버전이 열려요.
