# 프레임 순서·Tick·타이머 부분 분석 024

2026-10-06. Auric 요청의 C++ 호출 경계·장면 수명·장시간 실행과 누적 내부 구조 연구를 연결한 기록이에요. 전체 Unreal·Unity 본문/API 분석 완료나 독립 검증 완료 기록은 아니에요.

## 읽은 자료와 경계

- Unity6000.0 [PlayerLoop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoop.html), [GetCurrentPlayerLoop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoop.GetCurrentPlayerLoop.html), [GetDefaultPlayerLoop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoop.GetDefaultPlayerLoop.html), [SetPlayerLoop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoop.SetPlayerLoop.html)의 자체 설명·선언·예제 전체를 새로 읽었어요. raw/추출본문/SHA는 `native/build/frame-order-docs-20261006/manifest.json`에 있어요. 연결된 타입/속성·미디어를 읽은 것으로 승격하지 않아요.
- [PlayerLoopSystem](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem.html)의 자체 Description·전체 재귀 예제·5개 속성 요약을 읽었어요. 개별 속성 본문은 후속 대상이에요. raw SHA `33a8bc7e4a9c9d43063a26c15ec84dc85b325d10931a63ccc1432a9394106e56`이에요.
- Unity [ExecutionOrder](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html)의 캐시 기술본문 179줄 전체를 재읽었어요. 시작/장면/애니메이션/렌더/코루틴·비동기/ECS 설명을 대조했지만 순서도 이미지·연결 API는 미독이에요.
- Epic5.8 [Actor Ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine)·[Gameplay Timers](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-timers-in-unreal-engine)의 기술본문과 [FTickFunction](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/FTickFunction)·[FTimerManager](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/FTimerManager)의 전체 자체 선언/멤버 요약을 읽었어요. 개별 멤버·상속·그림은 별도 미독이에요.
- [SetTimerForNextTick](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FTimerManager/SetTimerForNextTick)의 5개 overload 설명/선언과 [FTimerManagerTimerParameters](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FTimerManagerTimerParameters)의 3개 필드 요약을 읽었어요. 아래 API와 가이드의 모순을 미해결로 보존해요.

## Unity 계약

PlayerLoop는 입력·오디오를 포함한 전체 업데이트 트리예요. GetCurrent는 기존 사용자 변경을 보존할 출발점이고, GetDefault는 기본 순서를 얻는 출발점이에요. SetPlayerLoop는 전체 트리를 교체하므로 빠뜨린 시스템은 실행되지 않아요. 조회에는 변경이 즉시 보이지만 실행 순서는 다음 전체 반복부터 적용돼요. 예제의 PreLateUpdate 뒤 삽입은 루트 하위 배열을 복사하며 루트의 조건/함수/타입을 유지해요. 이를 모든 깊이에 삽입하는 일반 알고리즘으로 읽으면 안 돼요.

PlayerLoopSystem은 중첩 배열로 시스템을 나타내요. type은 식별과 프로파일러 라벨, updateDelegate는 사용자 관리 콜백이에요. 네이티브 함수·반복 조건은 기본 트리의 유효값을 보존해야 해요. Unity의 C# 관리 delegate를 HB의 C++ 스레드 실행 권한으로 해석하지 않아요.

ExecutionOrder의 서로 다른 객체 순서는 자동 보장되지 않아요. 장면의 OnEnable 뒤/Start 전 통지, 코루틴·비동기의 서로 다른 재개 지점, 렌더 파이프라인별 콜백 구분을 제작 계약에 포함해야 해요. 순서도 이미지와 관련 API를 확인하기 전에는 모든 단계의 정확한 위치를 확정하지 않아요.

## Unreal 계약과 모순

Tick 그룹은 물리 계산 전/중/후의 관측 시점을 구분해요. 의존성을 한 객체·컴포넌트에 지정하면 필요 작업이 끝난 뒤 실행할 수 있어요. 가이드의 world timer 처리 위치는 PostPhysics와 PostUpdateWork 사이예요. HB의 기존 타이머-before-Tick 순서와 같다고 설명하지 않아요.

FTickFunction에는 시작/끝 그룹·간격·pause 실행·명시적 다른 스레드 허용·배치 허용이 따로 있어요. 등록한 raw 포인터를 프레임 중 파괴하면 위험하며 대부분 함수는 thread-safe가 아니에요. 실행 우선순위는 의존성 대체가 아니에요. RemovePrerequisite는 현재 프레임에 영향을 주지 않고 복사는 안전하지 않다는 제한도 보존해요.

FTimerManager는 활성 heap·paused/pending 집합·소유 객체 색인을 갖고 내부 double 시계를 써요. owner에 묶인 타이머 해제와 새로 추가한 pending 타이머의 경계가 있어요. rate≤0 해제와 pause/elapsed/remaining은 서로 다른 계약이에요. TimerParameters의 bMaxOncePerFrame은 요약에 설명이 없으므로 이름만으로 hitch 보상 정책을 확정하지 않아요.

Gameplay Timers 가이드는 NextTick이 handle을 채우지 않는다고 설명하지만 현재5.8 개별 API의 5개 overload는 모두 FTimerHandle을 반환해요. 따라서 가이드 문장을 그대로 옮겨 반환 타입을 제거하면 안 돼요. 버전이 고정된 공개 소스/구현과 실제 실행으로 해소할 후속 이슈이며 이 페이지 계열을 verified로 표시하지 않아요.

## HB 대응과 후속 제작 조건

현재 `prototype/player.js`·`prototype/app.js`·`tools/run-project.mjs`는 공용 C++ 프레임 진행 뒤 VM Tick을 실행해요. `prototype/native-transport.js`의448a9b5 변경은 증명된 타이머 없는 모듈의 응답 대기만 겹쳐요. 임의 게임 함수/Tick을 병렬로 실행하는 기능이 아니에요. 진행 중 요청·미처리 프레임·외부 타이머 변경·float32 범위·Stop 경계를 검사하며 기존 사용자 관측 순서를 보존해요.

누적 요구의 프레임 단계/의존성/고정시간·late update/디버깅은 별도 남은 제작 범위예요. 노드·C++·UI·AI 파일에 동일한 단계 식별자, 소유 객체 수명, 다음 프레임에 적용할 변경을 표현해야 해요. 의존성 순환/사망 객체/일시정지/시간 배율/장면 전환을 정의하지 않은 채 메뉴만 추가하지 않아요. 현재엔진의 실제 순서·타이머 구현을 먼저 추적하고 두 원엔진과의 차이를 저장 계약과 함께 명시해야 해요.

사람에게는 객체별 실행 그룹·간격·활성/정지·의존성 선택과 프레임 타임라인이 필요해요. AI에는 같은 속성의 schema·안정된 ID·낡은 revision 거절·실행 순서 조회가 필요해요. 이는 HB 설계 요구이며 원엔진의 API가 이미 HB에서 구현됐다는 뜻이 아니에요.

본문의 읽기 범위와 설치/실행 증거는 별개예요. 원장 전체 gate·독립 검증·전체 분모는 승격하지 않아요. 다음 대상은 PlayerLoopSystem 개별5속성, Unreal SetTimer overload·해제/조회 API와 Tick prerequisite 개별 API·관련 타입/그림이에요.
