# 070 루트 모션 공용 함수

SDK SetRootMotionMode/GetRootMotionPosition/GetRootMotionRotation과 BP3개가 같은 Actor/그래프 실행기와 물리를 사용한다. 최종 실제 Editor/Player·코어·물리 검증과 읽기 경계는 [070 기록](ANIMATION_ROOT_MOTION_070.md)에 보존한다.

# 069 애니메이션 Enum 실행

animGraphSetEnum/GetEnum 공용 서비스와 C++ SetEnum/GetEnum/GetEnumValue<E> 연결·실제 실행 통과. BP wire는 Integer, 실행 graph enum domain 검증이며 일반 BP Enum 자료형/자동 C++ Enum 리플렉션 완료로 세지 않는다. [상세](ANIMATION_ENUM_SELECTION_069.md).

2026-10-08 후속: [068 애니메이션 정수 포즈 선택](ANIMATION_INTEGER_SELECTION_068.md)은 기존 BP Integer Set/Get과 C++ SetInteger/GetInteger를 공용 실행으로 연결한다. BP Get 결과가 실제 C++ 인자로 전달되는 Editor/Player를 확인했다. BP 함수 수 증가나 전체 Blueprint/엔진 완료로 계산하지 않는다.

# HBEngine 블루프린트와 C++ 구현 기준

2026-10-06: [2D Sprite 광원·볼륨 빛](research/2D_COOKIE_VOLUME_035.md). Light2D 공용 C++/BP7개로 스프라이트·텍스처 cookie 지정/조회/크기, 볼륨 활성/강도/독립 그림자를 연결해요. 사람의 Scene/BP 속성과 AI component schema가 같은 필드를 편집하고 프로젝트 내부 외부 폴더 에셋 참조도 출력에 포함해요. 기존 노드·클래스·핀 구조는 유지해요.

2026-10-06: [실행 중 생성·찾기 계약](AURIC_RUNTIME_SPAWN.md). C++/BP의 BP·Prefab·클래스 Spawn/Destroy, 실제 C++ 객체·기본값·수명, 자동 풀 용량·재사용·취소, 클래스/태그/ID 검색과 없는 Actor 참조의 null 처리를 연결해요. 전체 노드601개/공용 선언289개예요. 모듈 간 생성 후 호출과 모바일 AOT도 같은 명령 순서를 검증해요.

2026-10-06: [BP 상속·인스턴스 계약](BLUEPRINT_INHERITANCE.md). BP 부모의 컴포넌트·변수·그래프·C++를 해석하고 얇은 자식 파일을 저장해요. 이벤트/함수/Construction 부모 호출과 명시적 클래스/인스턴스 기본값, 순환/redirect/cook, revision을 공유해요. 실제 Editor·Game.exe의 C++ 값과 호출 순서를 검사해요.

2026-10-06: [Auric C++ 묶음 계약](AURIC_NATIVE_BATCH.md). 함수·매크로·여러 Tick·C++ Timer·Input Action의 직선 native 호출을 같은 빌드에서 묶고, 콜백/자료 의존성/실패/작업 취소 경계를 유지해요. Action은 owner별 샘플 시점과 다른 모듈 조회 상태를 PC worker·모바일 AOT에서 대조해요. 전체 BP 상속·전체 함수 실행 최적화의 완료로 계산하지 않아요.

2026-10-05 추가: [전용 Light2D](2D_LIGHTING.md)의 공용 C++/BP16개와 Sprites 조명 모드2개를 연결해 기본 노드594개예요. 반경·각도·노멀의 여러 반환 핀/같은 C++ 호출의 읽기·쓰기·실제 배포 Player를 검증했어요. 이전 숫자는 당시 스냅샷이에요.

2026-10-05 추가: [구간 알림·이벤트 인자](ANIMATION_NOTIFIES.md). 단일/구간 알림은 사용자 Custom Event의 같은 이름/자료형 데이터 출력으로 int/float/bool/string/vec2/vec3/color/object를 전달해요. 범위 Begin/Tick/End→nativeCall 사용자 C++와 Stop의 정리를 실제 Editor/Player에서 확인했어요. 독립 알림 클래스 ABI로 표현하지 않아요.

2026-10-05 추가: AnimationGraph::GetSyncLeader/GetSyncPhase/GetSyncMode3개를 공용 C++/BP·실제 Editor/Player에 연결했어요(전체560개). 단일 애니메이션 알림은 Actor의 Custom Event를 통해 사용자 C++도 호출해요. ID/처리 시점·마커/시계·검증은 [동기화 계약](ANIMATION_SYNC.md)에 기록해요.

2026-10-05 추가: AnimationGraph의 정수/트리거와 상태 전환·현재/다음/시간/정규화 시간/가중치/진행률12개를 공용 선언·실행에 연결했어요(전체557개). [포즈 상태 계약](ANIMATION_STATES.md)에 C++ 명령 처리 시점·단위·실제 Editor/Player BP Trigger→State Custom Event→사용자 C++ callback 근거를 기록해요.


2026-10-05 추가: `hb::IK2D`의 목표/회전 Set/Get·Actor 목표 연결/해제·솔버 가중치 Set/Get·활성 Set/Get·전체 가중치 Set/Get12개가 같은 2D IK 실행기를 사용해요. C++ setter 직후 조회는 같은 요청 값이고 뼈 계산은 IK 갱신 단계예요. [2D IK 계약·실제 Editor/Player 근거](2D_IK.md)에 제작/수명·가중치/순서·headless/AI·한계를 기록해요. 전체 카탈로그545개예요.


2026-10-05 추가: SpriteSkin::Set/GetBonePosition, Set/GetBoneRotation, Set/GetBoneScale, Reset 7개를 공용 C++/BP로 연결했어요(전체533개). [2D 리그](2D_SPRITE_RIG.md)·[시작 위치/HUD 계약](STARTUP_STATE.md) 참고. 새 Construction 기본 그래프는 이벤트만 있고, 변경 없는 예전 원점 초기화 예제는 실행 복사본에서 제외해요. 실제 Editor/Player C++ Construction에서 첫 Tick 전 HUD 수정/조회·배치 위치 보존이 통과했어요.


2026-10-05 추가: `hb::States::IsInState/GetPath/GetElapsed`의 BP 노드 세 개와 계층 FSM을 연결했어요. 카탈로그는 517개예요. 기존 평면 FSM 파일과 GetState는 유지하며 C++ 변경 명령은 함수 반환 후 처리해요. [FSM 제작·실행·실제 창 검증](HIERARCHICAL_FSM.md)에 세부 계약을 기록해요.

2026-10-05 추가: `hb::Sprites`의 색상/크기/정렬/마스크/조명 설정과 읽기 10개를 공용 선언에서 생성했어요. 사용자 C++ 함수 안의 변경 후 읽기와 BP의 같은 서비스 검증을 확인했어요. 전체 카탈로그는 514개이며, 등각 Tilemaps 좌표/즉시 충돌 질의도 공용 격자 기준을 사용해요. 세부 동작·검증 범위는 [2D·단축키 계약](2D_RENDERING_SHORTCUTS.md)에 있어요. 노드 수를 전체 누적 엔진 완성으로 해석하지 않아요.

조사 갱신: 2026-10-03. 전체 공식 근거와 엔진 범위는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 분야별 조사 상태와 코드 대조는 [조사 범위](REFERENCE_COVERAGE.md), 조작 계약은 [인터랙션 기준](EDITOR_INTERACTION_SPEC.md), 노드별 핀·C++ 대응은 [노드 카탈로그](NODE_CATALOG.md)에 있다.

**실행됨**은 공용 BlueprintRuntime/게임 서비스에 연결됐다는 뜻이고 **공통 C++**은 실제 C++ 함수도 존재한다는 뜻이다. 편집기 Play, 화면 없는 로직 검사, 독립 Windows Player의 검사 범위를 각각 구분한다. 현재 Game.exe의 렌더러는 WebView2/WebGL2이며 네이티브 DX11 렌더러와 동일하지 않다.

## 2026-10-04 입력·모바일·풀 연동

- Input Event의 Pressed/Released와 hb::Input의 키/축/마우스 CSS 좌표/델타/월드 ray/조준 평면을 에디터 Play·Player·headless·실제 C++에 연결했다. 핀의 자료형과 out 매개변수는 공통 헤더에서 생성한다.
- hb::ActorPool Acquire/Release/IsActive는 PooledActor의 미리 배치한 탄환·적을 재사용한다. 반환 시 물리/충돌·Tick·소유 Delay/Timer/Timeline·AI/FSM·UI/오디오를 정리하며 OnPoolAcquire/OnPoolRelease 사용자 이벤트를 지원한다.
- hb::Sprites SetFlip/GetFlip/SetSprite/GetSprite와 스프라이트 애니메이션이 같은 렌더 경로를 사용한다. 반전은 렌더 메시만 바꾸고 Actor 변환이나 콜라이더를 바꾸지 않는다.
- TopDownMovement2D를 BP에서 추가한 경우에도 플레이어 자동 제어권/Gameplay.GetPlayerPawn을 연결한다. 새 프로젝트의 탑다운 슈터는 일반 BP 그래프·변수·사용자 C++ 파일이다.
- 기존 위젯 편집기의 모바일 프리셋과 AI widget.mobileControls는 같은 스키마·문서 revision·Undo를 사용한다. 가상 입력은 키/축 소스 합성 뒤 동일 Input Event/Input Action으로 전달한다.

검증 범위·실제 프레임 측정·재현 명령은 [입력·모바일·풀](INPUT_MOBILE_POOL.md)에 기록한다.

## 공식 근거

[Epic C++/Blueprint 혼합](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus?lang=en-US), [공개 메타데이터](https://dev.epicgames.com/documentation/en-us/unreal-engine/exposing-gameplay-elements-to-blueprints-visual-scripting-in-unreal-engine), [UFUNCTION](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine), [변수](https://dev.epicgames.com/documentation/unreal-engine/blueprint-variables-in-unreal-engine?lang=en-US), [흐름 제어](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine?lang=en-US), [함수](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine), [매크로](https://dev.epicgames.com/documentation/en-us/unreal-engine/macros-in-unreal-engine), [그래프 추출](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine)를 참고했다. HB는 자체 코드·저장 형식·실행기를 사용한다.

## 노드 라이브러리

기본 노드 **486개**, 공통 C++ 코어 API **289개**와 실행 서비스 API **115개**를 제공한다. 라이브러리에는 수학/삼각/지수/보간, 정수/비트/비교, Vec2/Vec3, 회전·방향·Transform, 색상, 문자열, 자료형 변환, 8종 배열 × 11연산의 **221개 공통 함수**와 **8개 흐름 제어**가 추가되어 있다. 새 `inputAction`은 독립 IA 에셋의 값 타입과 Started/Triggered/Completed 실행 출력을 갖는 이벤트다. 노드마다 실제 계산/제어 코드와 서명 검사를 두었다. C++/JS 동등성 검사는 공통 함수의 실제 C++ 호출 결과를 비교한다. 모든 수치·경계 조합을 증명하는 검사는 아니다.

- bool/int/float/string/vec2/vec3/color/transform/object/hit, 단일·배열 변수와 내장 구조체 분할/합치기.
- Branch, Sequence, ForLoop, ForEach, While, Break가 있는 반복, DoOnce/DoN, Gate/MultiGate, FlipFlop, Delay/재시작 지연, 정수/문자열 Switch.
- Delay는 대기 중 같은 노드의 재호출을 무시하고, 재시작 지연은 완료 시간을 다시 설정한다.
- 배열의 Length/Get/Find/Contains/Reverse/Append/Slice/Unique는 자료형별 함수다. 복사 연산은 원본을 바꾸지 않고 새 배열을 반환한다. 배열 변수 변경은 Set/Add/Remove 실행 노드로 한다.
- Sequence는 2출력, MultiGate와 Switch는 3출력을 제공한다. 임의 개수의 동적 실행 핀은 아직 미지원이다.
- int는 C++에 맞는 32비트 정수다. 문자열 인덱스는 새 Text 함수에서 Unicode scalar 단위이고 대소문자 변환은 ASCII다. Color는 0~1 RGBA다. 회전은 XYZ Euler degree, Forward +Z, Up +Y다. Unreal의 좌표계와 동일하다고 가정하지 않는다.
- 편집 배열·새 공통 배열 계산은 128원소, 그래프는 1,000노드/5,000연결, 반복/한 이벤트 계산은 10,000단계와 재귀 64단계로 제한한다.

## 제작 기능 상태

| 기능 | 현재 동작 | 남은 범위 |
| --- | --- | --- |
| My Blueprint / Inspector | 이벤트·함수·매크로·변수·통신·컴포넌트·클래스 상세 편집, JSON 저장; 클래스 전용 컴포넌트 뷰포트 | 전체 컴포넌트 계층·Skeletal/카메라 등 시각화 |
| 함수·매크로 | 시그니처·내부 그래프·순수 함수·선택 추출·실제 호출, 매크로 지연 후 재개 | 로컬 변수·참조 매개변수 의미·독립 라이브러리 에셋 |
| Construction | 별도 그래프, 실행 시작 때 BeginPlay 전에 실행 | 편집 중 속성 변경마다 재구성하는 native 생명주기 |
| 이벤트 | Begin/End/Tick·키/축·typed IA 입력, 실제 2D/3D 콜라이더의 Overlap/Hit, 사용자 이벤트 | 전체 입력 Trigger/Modifier·장치/플레이어별 문맥·정밀 물리 이벤트 |
| 핀/변수 | 단일/배열 검사·기본값·Get/Set·중첩 분할·관찰·변수 승격 | 사용자 Struct/Enum/Set/Map·soft/interface 참조·자동 변환 삽입 |
| 클래스/상속 | Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent 템플릿·C++ 부모·공개 기본값·void 이벤트 재정의·BP→BP 상속·부모 호출·클래스/인스턴스 override | 정밀 Character 이동 solver·추가 C++ 수명 주기/리플렉션 계약 |
| 편집 | RMB/MMB 이동·휠/Ctrl 확대·사각/다중 선택·복사/복제·주석·Undo/Redo·검색 | 북마크·정렬/분배·자동 배선·Diff |
| 도킹/Project | 실제 폴더·다중 선택/가져오기·파일 내부 검색·창 분할; BP/Material/Animation/Curve/IA/IMC/Data/Scene 파일별 문서·Undo·저장/닫기 보호 | OS 부동창·명명 레이아웃·전용 에셋 종류 확대·전체 Project 키/필터 |
| 타이머·지연 | 게임 시간 배율·정지, Delay·재시작 지연·타이머 완료 이벤트 | native/VM 공통 핸들 풀·비동기 서비스 전반 |
| Timeline/Animation | 4종 트랙·커브/접선/키 편집·재생/역방향/스크럽·BP 실행 이벤트; 독립 Curve/Transform Animation 파일·미리보기·Play/Stop Animation 대상 실행 | Curve 에셋의 BP 참조·임의 속성/Animation 이벤트 트랙·뼈 저작·계층 FSM·포즈 블렌딩 |
| 디스패처·인터페이스 | 시그니처, 구독·해제·이벤트·메시지 실제 실행; 장면의 서로 다른 BP 파일을 객체별 실행 | 독립 계약 에셋·다중 BP 클래스 간 정적 계약 검사 |
| 디버거 | 실제 노드 중단점·Step/Continue·호출 스택 표기·계산 핀 값 | 실행 객체 선택, 프레임/Step Into/Out 구분·native 코드 디버거 |
| 오브젝트/서비스 | 생성/제거/부모·기본 컴포넌트, Mesh Raycast, 표면/광원, 오디오·모델 클립/Transform Animation·기본 위젯·SaveGame | 정밀 강체 solver·3D 음향·장면 스트리밍·AnimationBP·UI 바인딩 |
| 빌드/배포 | 사용자 .h/.cpp 실제 g++ 빌드/RPC·프로필·사전 컴파일 worker 동봉·독립 Windows Game.exe의 공용 BP 실행 | DX11/HLSL 런타임·DLL 교체/다중 번역 단위·타깃 cook/압축/chunk·installer·다른 플랫폼 |
| 네트워크/확장 | 미구현 | 복제/RPC·권한·플러그인·에디터 도구 |

## 에셋과 입력 제작 흐름

- 콘텐츠 폴더에서 우클릭해 BP 클래스·C++ 클래스·IA·IMC·Material·Transform Animation·Curve·Data·레벨을 실제 파일로 만든다. 추가한 독립 에셋은 Sprite/TileMap/Flipbook, MaterialInstance/PhysicalMaterial, Prefab/GameConfig/AudioAsset와 Blackboard/BehaviorTree/FSM/Montage/Sequence까지 공통 생성·검증·문서 경로를 사용한다. C++는 `.h/.cpp` 한 쌍이다. 사용자 Struct/Enum/Interface/UI/VFX graph 에셋은 추가 대상이다.
- BP 생성 시 부모 7종을 선택하고 클래스에 맞는 기본 컴포넌트를 만든다. Character의 Capsule/CharacterMovement 설정과 뷰포트 미리보기, 실제 보행·점프·Possess와 고정 스텝 물리 연결을 제공한다. Capsule 충돌은 AABB 근사이고 정밀 경사/계단 controller는 남아 있다.
- IA는 bool/float/vec2/vec3, dead zone, pressed/held/released, 입력 소비를 편집한다. IMC는 액션·키·축·배율·우선순위를 편집한다. 클래스에 IMC를 지정한 뒤 우클릭 검색에서 IA 파일 이름으로 typed 이벤트를 놓는다.
- 입력 실행기는 우선순위/소비를 적용하고 Started/Triggered/Completed를 내보낸다. held는 키 반복 메시지가 아니라 게임 프레임에서 실행한다. Ongoing/Canceled·Hold/Tap/Chord·실행 중 Context 교체·플레이어별 문맥·C++ 직접 액션 구독은 남아 있다.
- 장면 오브젝트는 BP 이름만이 아니라 `blueprintAsset` 파일 경로를 참조한다. Play는 해당 파일과 IA/IMC를 검증해 인스턴스별 실행에 연결한다. 에셋 이름 변경 후 구 경로는 영속 redirect로 해석한다.

## 독립 Animation의 런타임 의미

`Play Animation`은 대상 모델에 같은 이름의 내장 클립이 있으면 기존 Three AnimationMixer 경로를 우선 사용한다. 없으면 Animation 에셋을 읽어 검증한 뒤 `position/rotation/scale` ID의 키가 있는 vec3 트랙을 적용한다. 각 값은 대상 Transform 속성의 절대값으로 덮어쓰며 회전은 XYZ Euler degree다. 임의 컴포넌트 속성·Skeletal 포즈·상태 머신·Animation 이벤트 트랙은 이 경로의 지원 범위가 아니다.

에셋 재생은 0초에서 시작한다. 반복은 노드의 `Loop` 입력을 사용하고, 에셋의 `playRate`, `lastKeyframe`, `ignoreTimeDilation`을 적용한다. 마지막 키 길이는 같은 `timelineLength` 규칙을 사용한다. 반복 시 남은 프레임 시간을 보존하고 비반복 완료 뒤 마지막 값을 유지하며 업데이트를 종료한다. `Stop Animation`은 현 값을 유지하고 해당 대상의 재생을 해제한다. 게임 전체 Stop은 별도로 편집 월드를 복원한다.

`engineOperations`의 선택적인 `readAsset` hook으로 열린 편집본을 공급할 수 있다. 기본 경로는 Project API의 실제 파일 읽기다. 재생 시 데이터를 복제하므로 이후 에셋 편집으로 재생 중 데이터가 바뀌지 않는다. 에셋 검증 실패는 대상 Transform을 변경하지 않으며, 대상 파괴와 서비스 종료는 재생 상태를 정리한다. `test:runtime`은 세 속성·정지/완료·반복·재생 속도/시간 배율·검증 실패·파괴/정리·파일 읽기·기존 모델 클립 우선을 검사한다.

## C++ 연결의 실제 동작

1. HB_CLASS/HB_PROPERTY/HB_FUNCTION 공개 선언을 제한된 분석기로 읽는다. 미지원 공개 자료형·선언은 오류다. 함수 본문은 g++이 컴파일한다.
2. Callable/Pure/static/Get/Set/읽기 전용·반환·출력 참조·Native/Implementable void 이벤트로 노드 핀을 생성한다.
3. 헤더/구현/생성 wrapper/공통 헤더의 해시로 빌드하고 별도 C++ 실행 프로세스를 호출한다. JSON에는 주소 대신 등록된 객체 ID를 전달한다.
4. 객체 Transform·공개 기본값·함수 입력을 전달하고 C++ 출력·속성·객체·이벤트를 **전체 검증한 뒤** 적용한다. 잘못된 타입·범위·반환·컴파일 오류는 실패로 표시한다.
5. C++ 이벤트 override는 호출 종료 후 해당 BP 인스턴스로 전달한다. 이벤트 그래프에서 다시 C++ 함수를 호출할 수 있다. 임의 반환값을 C++ 호출 내부에서 동기적으로 받는 override는 아직 없다.
6. 게임 프레임은 native Clock/Timer를 진행하고 VM을 실행한다. native와 VM 타이머 핸들 풀은 별개다. 공통 API 수학/시간/변환은 C++에서 직접 호출할 수 있지만 브라우저 렌더/오디오/UI 서비스를 전부 C++로 옮긴 것은 아니다.

지원 입력은 헤더+구현 한 쌍이다. Actor 계열·Component 계열·Library 공개 선언과 static 호출을 지원하고, 현재 편집기 실행 월드의 주 바인딩은 Actor다. 콘텐츠의 C++ 파일은 외부 Visual Studio를 우선 탐색해 열고, 없으면 Visual Studio Code를 찾는다. C++ 생성/외부 편집/BP로 감싸기를 연결했지만 `.sln/.vcxproj` 생성과 IntelliSense 설정은 아직 없다. 추가 사용자 헤더·라이브러리·다중 번역 단위·DLL 핫 리로드·임의 구조체는 지원하지 않는다. [문 예제 헤더](../prototype/examples/DoorController.h), [구현](../prototype/examples/DoorController.cpp), [BP 실행 예제](../prototype/examples/BP_NativeDoor.blueprint.json)를 참조한다.

여러 BP/C++ 파일을 쓰는 장면에서는 파일별 빌드 결과와 소유 인스턴스를 연결한다. `nativeWorld`는 다른 빌드의 객체를 일반 Actor로 전달하고 해당 빌드가 소유한 native 클래스/속성만 보낸다. 한 worker가 다른 모듈의 공개 상태를 잘못 생성·덮어쓰지 않도록 한다. 디스크 C++ 원문과 등록 원문이 달라지면 재빌드를 요구한다.

## 저장·AI·검증

블루프린트 편집 UI는 노드 제목 14px/핀 이름 12px, 종류별 문서 탭, 현재 선택의 속성창을 사용한다. C++ 편집/빌드는 연결된 native BP에서만 노출하고 일반 BP에서 다른 클래스의 헤더를 열지 않는다. 게임 실행은 공통 툴바, 그래프의 한 단계는 중단점에 멈춘 실행에서만 활성화한다. 화면 변경은 `EDITOR_INTERACTION_SPEC.md`의 화면 정리와 별도 시각 검증으로 확인한다.

Project 파일과 브라우저 복구 저장은 장면·환경·BP/함수/매크로/Construction·C++ 원문·기본값·통신·Timeline과 독립 머테리얼/애니메이션/커브/입력/데이터 문서를 유지한다. 각 파일은 선택/배치·Undo·dirty 상태를 따로 가지며 전환으로 다른 파일의 편집을 덮지 않는다. 저장 실패나 저장 중 추가 편집은 dirty를 유지하고, 닫기는 저장/저장 안 함/취소를 제공한다. BP 내보내기 파일은 안정적인 ID와 명시적 타입/핀/연결을 포함한다. 잘못된 JSON/타입/연결은 기존 편집값을 바꾸기 전에 거부한다.

검사는 npm test, api:check, test:library, test:native, test:runtime, test:host, test:project, test:assets로 재현한다. `test:assets`는 문서 격리/저장 실패·초기 에셋 8종·부모 7종·입력 우선순위·다중 BP 실행·rename 재열기·native 모듈 소유 상태를 확인한다. 화면 검증은 별도로 수행하고 커밋 본문에 결과를 적는다. 기존 화면 검증은 실제 C++ 빌드→함수 호출→C++ 이벤트→BP 이동과 Stop 복원, 파일 내부 검색, 다중 가져오기/선택/문서, 창 분할/최대화, OBJ 미리보기와 Timeline 키 편집을 포함한다. 완성된 Unreal/Unity 대체 엔진이라고 부르지 않는다.

## 2026-10-02 실행·제작·AI 연계

공통 `scene-components.js` 27종은 장면 Inspector와 Blueprint 컴포넌트 편집·기본값·검증·런타임을 공유한다. 클래스에는 Controller/PlayerController/AIController, GameMode/GameState/PlayerState/Pawn을 구분한다. Blueprint 컴포넌트를 설치한 뒤 렌더·타일 충돌을 준비하고 모든 Construction 이후 서비스 초기화, BeginPlay를 실행한다. Fixed Update는 누적된 고정 스텝마다 물리 적분 전에 실행하며 컴포넌트별 Begin/EndOverlap과 Hit를 구분한다. 2D는 XY 물리와 표시 깊이를 분리한다.

기존 289개 코어 C++ API에 EngineService 19개(역할 조회/소유/이동/충격/힘/속도·월드/로컬 위치·장면 전환)를 실제 플레이 서비스로 연결했다. 정적 BP 카탈로그는 390개이며 사용자 C++ 노드는 등록된 함수에 따라 늘어난다. 노드 수만으로 기능 완료를 판단하지 않는다. C++ 변환·반환을 검증한 뒤 소유 실행 월드에 적용한다.

Sprite/TileMap/SpriteAnimation, 물리/머테리얼 인스턴스, 게임 설정, 프리팹, 오디오 에셋도 독립 파일이다. 스프라이트 프레임 애니메이션은 기존 PlayAnimation 서비스로 실행된다. 머테리얼 54종 노드는 별도 타입 그래프와 GLSL 생성·실제 Three GPU 재질을 사용하며 BP 이벤트 그래프와 섞지 않는다. DX11/HLSL은 미구현 상태다.

AI는 `/api/schema`의 공통 정의와 `document.get/patch/save`, Undo/Redo, native.build, Play/Stop/State를 사용한다. 사람의 저장 전 편집을 revision으로 보호하고 디스크 변경 시 저장을 거부·백업한다. `tools/run-project.mjs`는 같은 VM/물리/C++를 화면 없이 시나리오로 실행한다. 인터페이스와 한계는 [AI_ENGINE_API.md](AI_ENGINE_API.md), 실행 증거와 누적 미완료 분야는 [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md)에 이어 기록한다.

Open Scene과 C++ `hb::Scene::Open`은 대상 장면 검증 후 프레임 경계에서 월드를 교체한다. 이전 인스턴스 EndPlay(reason=LevelTransition), 지연·타이머·입력·서비스 정리 이후 새 월드 Construction/BeginPlay를 실행한다. EndPlay 오류가 있어도 모든 인스턴스 종료와 정리를 수행한다. Stop은 편집 원본과 뷰/환경 설정을 복원한다. 중복 이름은 전체 경로를 요구하며 읽는 중 종료된 VM에는 새 전환 요청을 남기지 않는다.


## 2026-10-03 AI·상태·연출·효과 확장

컴포넌트는 **39종**, 정적 BP 카탈로그는 **444개**, 공통 실행 서비스는 **73개**다. 앞 절의 27종/390개/19개는 2026-10-02 당시 수치다. 서비스 선언은 `native/include/HBEngine/Game.hpp`에서 BP 핀을 생성하고 `Bridge.hpp` 명령을 같은 `engineOperations`로 실행한다. 실제 C++ 빌드·명령 재생·반환값 검사를 거친다.

| 독립 에셋 | 제작과 실제 실행 |
|---|---|
| Blackboard | bool/int32/float/string/vec3/object 키, 자료형 기본값·객체 선택·XYZ 입력. 소유자별 실행 값은 기본값과 분리한다. |
| BehaviorTree | Selector/Sequence/SimpleParallel/Condition/Inverter/Repeat/Wait/Set/MoveTo/LookAt/Event/PlayAnimation/Succeed/Fail 14종. 우선순위 재평가, 실행 중 대기 기억, 조건 탈락 시 중단, 서브트리 서비스 간격, 블랙보드와 실제 경로 이동. |
| FSM | 상태·시작 상태·Enter/Update/Exit·클립, 파라미터·AND 조건·이벤트·정규화 종료 시간·Any State 전이. 평면 상태 머신이며 UE StateTree의 계층 상태/병렬 선택을 구현한 것은 아니다. |
| Montage | 섹션과 Next/Jump, Notify, 슬롯의 클립 구간, 재생/정지/일시정지/Seek. Transform/Flipbook/가져온 skeletal 클립을 실제 시간으로 샘플링한다. 한 대상의 겹치는 full-body 슬롯은 오류로 거부한다. 뼈별 마스크·root motion·네트워크 동기화는 남아 있다. |
| Sequence | position/rotation/scale/visible/event/camera/animation/audio/light/material/timeScale 11종. 객체 ID 바인딩·키·animation/audio 클립, FPS 스냅(Shift 자유 이동), 재생/일시정지/Seek·종료 시 복원. 독립 복제 장면 미리보기는 같은 실행 서비스와 파티클을 사용하며 편집 원본은 변경하지 않는다. |

각 에셋은 폴더 우클릭으로 생성하고 파일마다 전용 문서·저장·Undo·복구를 사용한다. BT/FSM 그래프는 RMB/MMB 이동·휠 확대·입출력 연결·Alt 연결 해제·Delete·전체 맞춤을 제공한다. BT 우클릭은 한영 검색이다. 플레이 중 진단 에셋/현재 장면을 열 수 있으며 문서 수정은 거부한다. 여러 소유자가 같은 에셋을 쓰면 실행 대상을 선택한다. 다른 에셋 창이 활성인 상태에서도 마지막 작업 장면을 복구한다.

NavigationGrid/Agent/Obstacle은 2D XY 또는 3D XZ의 장애물과 에이전트 콜라이더 크기를 고려하는 격자 A*다. 다각형 NavMesh·경사·off-mesh link·RVO는 미지원이다. AIPerception/PerceptionSource는 시야/시야 이탈·각도·차폐·소리·기억과 `OnTargetPerceptionUpdated`, Target/HasTarget 블랙보드 동기화를 제공한다. 계층 태그와 Any/All/None 재귀 질의를 BP/C++에서 사용한다.

ParticleSystem은 seed 기반 CPU 시뮬레이션과 Three Points 셰이더를 공유한다. 시간/거리 방출·버스트 확률/반복, cone/sphere/box/circle2D, local/world, force/drag/gravity·색/크기 변화·텍스처/혼합/정렬을 편집한다. 대상별 Play/Stop/Pause/Emit/Count가 BP/C++로 연결된다. 파티클 충돌·trails·mesh renderer·sub-emitter·GPU simulation은 남아 있다. Decal은 수신 메시 표면으로 실제 기하 투영을 수행하고 GPU 자원을 정리한다.

새 `2D · AI와 효과`, `3D · AI와 효과` 프로젝트는 위 흐름을 실제 에셋과 장면으로 생성한다. 2D에는 중력 없는 탑다운 입력을 별도 컴포넌트로 제공하고 기존 플랫폼 이동을 보존한다. `test:gameplay`, `test:systems`는 실행/실패 보존/실제 C++ 호출과 두 프로젝트의 600프레임 이동·상태·효과·원본 보존을 검사한다. UI 화면 검증에는 런타임 상태 선택, XYZ 편집→Undo, 시퀀스 정·역방향 스크럽과 재실행 후 장면 복원을 포함한다.

C++ 변경 명령은 호출 종료 후 소유 플레이 월드에서 검증·적용한다. 상태 조회는 호출에 전달된 런타임 snapshot을 읽으며 모든 쓰기 직후 동기 조회를 보장하지 않는다. 일부 setter의 로컬 snapshot 반영과 실제 비동기 서비스 완료를 혼동하지 않는다. 몽타주/시퀀스 미리보기는 이벤트/음향을 실행하지 않고, 긴 스크럽은 최대 4,096 스텝 이후 큰 간격을 사용한다. 전체 프레임의 결정론적 bake는 추가 범위다.

## 제작 UI와 공통 편집 명령 — 2026-10-03

- 이벤트 제목 오른쪽 삼각형은 실제 실행 출력 핀이다. 중복 본문 실행 출력은 제거했다. Get 변수는 제목 옆 데이터 핀을 가진 작은 노드로 표시한다.
- 변수 드래그: 실행 입력/출력은 Set 삽입과 이전 실행선 보존, 데이터 입력은 Get 연결. 빈 그래프는 Get/Set 메뉴, Ctrl Get, Alt Set이다. 배열·참조를 임의 스칼라로 변환하지 않는다.
- 자동 변환은 공통 노드 `intToFloat/floatToInt/intToString/toString/boolToString/boolToInt/intToBool/vector2ToVector3/vector3ToVector2`를 사용한다. 실패와 순환 연결은 원자적으로 거절한다. 추가 노드는 기존 노드와 겹치지 않는 가까운 공간을 찾는다.
- 입력→출력 역방향 드래그, 핀에서 검색 후 자동 연결, 방향키/Enter 검색, 선 더블클릭 데이터 재배선, 좌/상/간격 정렬, 노드 내부 숫자·bool·문자열 기본값 편집을 제공한다.
- My Blueprint는 검색/접기/추가와 상세 Inspector를 함께 사용한다. 컴포넌트 추가는 2D/3D 공통 검색 창이며 사용자 C++ 컴포넌트 항목을 포함한다.
- 오브젝트 배치는 38개 실제 조합·검색·분류·도킹·드래그를 제공한다. 위치/회전/크기 스냅과 월드/로컬 변환, 선택 Q·이동 W·회전 E·크기 R·Space 순환·Ctrl+Space 창 최대화를 제공한다. 선택/전체 충돌 미리보기는 현 solver의 경계를 보여준다.
- 머테리얼 54종 노드(21종 추가): 월드 위치/법선·시선·Fresnel, 채널 분해/조합, 외적/반사/거리, 절차적 패턴과 그라데이션, 추가 수학. CPU 평가와 GPU GLSL 실행을 연결했다. 네 가지 템플릿은 노드·핀·파라미터를 일반 머테리얼 에셋으로 저장한다.
- `test:authoring`은 실제 VM 출력, 연결 보존, 실패 무변경, 배치 컴포넌트, 2D 부모 아래 충돌 경계, Fresnel 각도와 템플릿을 검증한다. 실제 UI/API 저장·Undo·파일 검증은 `node tools/check-authoring-editor.mjs URL`이며 전용 `authoring-qa` 프로젝트에서만 실행한다.

## 위젯·믹서 실행 서비스 — 2026-10-03

정적 카탈로그는 457종(289 코어+86 C++ 실행 서비스+기타 이벤트/제어 노드)이다. 이번 UI 9개와 Mixer 4개는 `Game.hpp` 선언에서 BP 핀을 생성하고 `Bridge.hpp`로 같은 실행 서비스에 연결한다. 생성 서비스 노드의 dispatch도 전체 공통 경로로 수정했다. 노드 수는 Unreal/Unity 전체 API 구현 완료 수가 아니다.

- `hb::UI::Show/Remove/SetText/GetText/SetValue/GetValue/SetVisible/SetEnabled/Focus`: 소유 Actor와 위젯 instance, 요소 이름/ID로 조작한다. 위젯 파일의 click/changed/submit/focus/blur는 소유 BP의 custom event로 전달되며 widget/element/type/text/value를 제공한다. 변수 ID 또는 이름으로 text/value/visible/enabled/checked를 바인딩한다.
- UI setter/getter는 실제 DOM과 런타임 상태에 연결된다. Checkbox value는 0/1이고 Slider/ProgressBar는 min/max로 제한한다. 부모 disabled는 자식 입력에도 적용한다. 현재 입력값으로 TextInput submit과 Checkbox click을 전달한다.
- `hb::AudioMixer::SetFloat/GetFloat/ClearFloat/TransitionTo`: asset 경로와 노출 이름, snapshot/전환 시간으로 제어한다. SetFloat override는 ClearFloat까지 snapshot에 우선한다. 범위 밖·없는 이름·잘못된 bus/snapshot/계층은 실패한다. 실제 WebAudio 버스/필터/압축기/신호로 실행한다.
- C++ 읽기는 호출에 전달된 snapshot이다. Show 이후 생성/삭제, snapshot 전환을 같은 호출에서 동기 완료로 취급하지 않는다. 다음 상태와 실행 이벤트로 확인한다.
- `test:ui-audio`는 실제 BP/C++ 실행·공용 snapshot·값 범위·수명을 검사한다. `prototype/tests/ui-audio.html`은 실제 DOM 이벤트와 PCM 감쇠/필터/Mute/Solo/공간 노드를 검사한다. 별도 위젯 클래스/애니메이션/지역화, mixer send/reverb/voice priority/native backend 등은 남아 있다.

## 강체 서비스와 C++ 동기 질의

16개 물리 서비스 선언에서 BP 핀을 생성해 공용 실행기로 연결했다. 각속도/질량/sleep, 네 힘 모드·작용점·토크·각 충격량, Raycast/All·Sphere/BoxCast·OverlapSphere/Box·ClosestPoint를 제공한다. 기본값 dimension=3·mask=-1·includeTriggers=false·ignore=null은 C++ 선언에서 가져오며 2D는 dimension=2를 지정한다. `hb::HitResult`와 BP hit/split pin·HitResult[]·Actor[]를 같은 JSON으로 연결한다.

C++의 공간 검색 7종은 읽기 전용 Rapier 질의 월드에서 동기 결과를 반환한다. 같은 함수의 Transform/collisionEnabled 수정은 질의에 보이고, 대기 중인 힘 적용의 solver 결과는 함수 반환 뒤 확인한다. receiver 핀과 인수 target을 구분하고 알려진 객체/파생 Actor 배열을 검증한다. 실제 강체·모터·CCD·단위·제한과 남은 물리 범위는 [물리 연구](PHYSICS_RUNTIME_RESEARCH.md)에 연결했다. 앞의 추가 당시 수치와 현재 수치를 구별한다.

### 컴포넌트의 메시·2D 다각형·선분

컴포넌트 목록은 46종이다. MeshCollider·PolygonCollider2D·EdgeCollider2D의 중첩 배열은 별도 형상 창에서 편집하고 BP 컴포넌트 상세에 수량과 편집/생성 버튼을 표시한다. 원본 모델에서 생성하는 경로는 Scene과 BP, AI collision.bake가 공유한다. BP 컴포넌트 뷰포트에도 실제 기본/메시/2D 경계를 렌더한다. Apply 한 작업을 문서 Undo/Redo로 복원한다. 몸체 형식/키네마틱 체크를 함께 갱신하고 Hinge/Slider에서 다른 관절로 바꿀 때 해당 모터/한계를 해제한 뒤 검증한다.

기존 물리 질의 노드와 사용자 C++ Physics 호출은 같은 저장 형상을 검색한다. 오목한 polygon의 빈 영역, 삼각형 표면, open edge, convex hull을 구분한다. 실제 컴파일된 사용자 함수와 GUI/VM 검증은 [충돌 형상 연구](COLLISION_GEOMETRY_RESEARCH.md)에 기록했다. 기존 BP 473개·코어 289/서비스 102개 수치는 이번 형상 확장에서 바뀌지 않는다.

## 독립 Windows 게임의 BP·C++ 실행 — 2026-10-03

프로젝트의 빌드 프로필은 Scene 포함/제외·순서·첫 활성 시작 Scene, 게임 이름·창 크기·개발/배포 구성을 저장한다. 파일 → 빌드 프로필(`Ctrl+Shift+B`)의 검사/빌드/실행과 AI API/CLI가 같은 디스크 검증·빌드 함수를 사용한다. 현재 473개 기본 BP 노드·289개 코어/102개 서비스의 수치는 이 패키지 추가로 변하지 않는다.

독립 Player는 `preparePlayWorld` → `BlueprintRuntime` → `engineOperations`와 `Game.hpp/Bridge.hpp`의 기존 C++ 서비스 경로를 사용한다. BP/C++의 별도 함수 목록이나 다른 수학/물리 규칙을 만들지 않는다. 도형·환경·머테리얼/스프라이트/모델 렌더링도 편집기와 공유한다. 실제 화면은 Three/WebGL2, 실제 2D/3D 물리는 Rapier WASM이다.

1. 활성 Scene과 비장면 Assets를 검증한다. BP의 native metadata에 저장한 header/source와 디스크 Source가 같아야 한다. 다르면 편집기에서 다시 빌드하고 BP를 저장한다. 등록된 소스 서명별 worker를 제작 단계에서 개발/배포 구성으로 사전 컴파일한다.
2. 패키지의 `/api/native/build`는 서명에 해당하는 worker/token/metadata를 조회한다. Player에서 새 소스를 컴파일하지 않으며 알려지지 않은 서명은 실패한다. C++17 컴파일러는 제작 환경에 필요하고 게임 실행에는 동봉 Node/worker를 사용한다.
3. Scene의 BP/컴포넌트·입력·프레임워크를 준비해 Construction/서비스 초기화/BeginPlay를 실행하고 매 프레임 native clock/timer와 VM을 진행한다. 배포용 복사본의 breakpoint를 제거하므로 에디터 Step 대기로 정지하지 않는다. BP 그래프 원본 파일의 중단점을 삭제하는 작업과 다르다.
4. `Open Scene`/`hb::Scene::Open`은 같은 검증/전환 요청을 사용한다. 포함되지 않은 Scene은 런타임에서 로드할 수 없다. 이전 월드의 EndPlay·타이머·입력·서비스/GPU 자원을 정리한 후 새 월드를 준비한다.
5. 게임 종료는 진행 중 프레임을 기다린 후 EndPlay·서비스 정리·SaveGame 디스크 flush·Win32 창/소유 서버 종료로 이어진다. `Esc` 메뉴에 계속·전체 화면·종료가 있고 게임 입력칸/포커스 해제를 구분한다. 저장은 `%LOCALAPPDATA%/HBEngine/Games/<project UUID>`에 보존하며 에디터 복구 상태를 게임에 가져오지 않는다.

실제 `test:package`는 2D 개발/3D 배포 Game.exe에서 GPU draw·BP BeginPlay→사용자 C++ 이동·AudioContext running/음원 voice playing·EndPlay SaveGame/재열기·컴파일러 없는 환경·서버 종료를 확인했다. Scene 참조·프로필 revision·취소·파일 손상·편집 API 차단도 검사한다. 음원 voice 상태는 모든 출력 장치/공간 음향/코덱의 품질을 증명하는 검사는 아니다.

구체적인 프로필/수명/AI 계약은 [빌드 Player 연구](BUILD_PLAYER_RESEARCH.md), [AI API](AI_ENGINE_API.md)에 있다. Game.exe는 Win32/WebView2·Node·WebGL2를 묶은 독립 실행 파일이며 DirectX 11/HLSL·전체 에셋 cook/압축·installer·모든 타깃 SDK 구현과 구분한다. 기존 모든 엔진 분야와 BP/C++의 세부 확장 요구는 계속 유지한다.


## 행동트리 태스크와 C++ 작업 수명 — 2026-10-05

2026-10-06 Auric P0-1·P0-2 실행 경로: 동일한 헤더·구현의 BP는 편집기와 화면 없는 실행에서도 하나의 worker를 공유해요. 독립 terminal C++ Tick은 같은 빌드별 묶음으로 보내며, 이벤트·엔진 작업·시간 변경 경계에서 후속 인자를 다시 읽어요. 실패한 호출의 변경은 적용하지 않고 앞선 성공 결과를 보존하며 다음 호출은 전체 상태로 재동기화해요. 일반 BP 연결·데이터 의존성·중단점은 기존 순서대로 실행해요. 모든 이벤트/함수 경로의 묶음 처리, 다른 빌드 접근 API, Auric 변경 엔진·실제 창·Android 성능 완료 기준은 검증 전이에요.

다른 빌드 접근 후보는 `<HBEngine/Native.hpp>`의 `hb::Native::GetFloat(actor, "MaxHp")`, `SetFloat(actor, "MaxHp", value)`, `Call(actor, "TakeDamage", {{"amount", value}})`이에요. `Call`은 반환 핀·출력 인자를 이름별 JSON으로 돌려줘요(`result` 등 등록된 출력 핀 이름). 같은 빌드는 실제 객체에 직접 접근하며 다른 빌드는 대상 모듈의 자료형·읽기 전용·참조·이벤트를 검증한 뒤 동기 호출해요. PC worker와 모바일 AOT의 순환 호출은 거절하며 깊이8·호출128로 제한해요. 대상의 값·이벤트·엔진 작업은 그 객체의 실행 수명에 반영해요. JS 검증과 실제 C++/모바일 AOT 검증을 분리하며 실제 검증 전에는 제공 완료로 처리하지 않아요.

현재 카탈로그519개에 공용 AI 태스크 핸들 조회·완료 서비스를 연결했어요. 태스크 시작/갱신/완료/중단 이벤트와 시간 제한·쿨다운·키 대기·서비스 활성화/비활성화를 실제 게임 실행에 연결해요. 작업 scope는 BP 함수/매크로/인터페이스와 C++ 호출을 거쳐 Delay/Timer/Timeline/구독을 정리하고, C++ 타이머는 소유 Actor와 종료 수명을 확인해요. 같은 C++ 클래스의 다른 Actor로 방송하지 않아요. 상세 제작·AI·큐 처리·실제 Editor/release Player 증거와 아직 제공하지 않은 범위는 [행동트리 계약](BEHAVIOR_TASK_LIFECYCLE.md)이에요. 이 기능 수는 Unreal/Unity 전체 API 완료율이 아니에요.


## 조건 감시·정적 하위 행동트리 — 2026-10-05

조건 중단 네 모드·결과/값 감시, memory Selector/legacy reactive, 병렬 즉시/대기·키 비교·정적 하위 트리 실행을 공용 제작/검증/실행 경로에 연결했어요. 루트 조건의 감시·자식 독립 시간·경로 핸들·내부 그래프 진단을 제공하며 사용자 C++와 headless도 같은 서비스를 사용해요. 세부 한계와 실제 Editor/release Player/AI 증거는 [조건/하위 트리 계약](BEHAVIOR_OBSERVERS_SUBTREES.md)이에요. BP 기본 카탈로그는519개로 유지하며 행동트리 전용 노드 정의와 구분해요.

### 포즈 애니메이션 그래프 추가(2026-10-05)

[애니메이션 그래프 계약](ANIMATION_GRAPH.md)의 독립 animgraph 포즈 에셋/제작기·공용 실행기를 추가했어요. BP/C++ Play/Stop/Pause/SetFloat/SetBool/GetFloat/GetBool7개가 생성되어 전체 BP 노드는526개예요. 별도의9개 포즈 노드 카탈로그는 BP 수에 합치지 않아요. 실제 Editor/Player 키→BP→C++→포즈/파라미터/조회/뼈 레이어를 확인했고2D rig·AnimGraph 상태·IK·root motion·다중 슬롯·전체 잔여는 그대로 이어 구현해요.
# 2026-10-05 몽타주 슬롯 후속

[몽타주 슬롯 계약](ANIMATION_MONTAGE_SLOTS.md)의6개 그룹 제어/조회 BP와 C++ 실행 연결을 추가했어요. BP566개/API289개이며 기존 본문의 수량은 당시 기록이에요. 사람/AI·실제 Editor/Player·2D/가져온 모델·배치 위치/HUD 검증과 남은 세부를 해당 계약에 기록해요.

2026-10-05 공용 [타임라인 조작·추적](ANIMATION_TIMELINE_CONTROLS.md)은 기존 C++/BP 몽타주·시퀀스 실행을 같은 창에서 식별해요. 새 노드 수를 늘리지 않고 에셋/Actor/그룹·실행 시간과 미리보기 시간을 분리하며 원본/revision/Undo를 보존해요. 전체 누적 세부를 계속 구현해요.

## 몽타주 구간 알림 후속 · 2026-10-05

[구간 알림 계약](ANIMATION_MONTAGE_NOTIFIES.md)에 사람/AI·typed Custom Event→C++·Begin/Tick 작업 범위/End 취소·조작/호환·실제 Editor/Player 근거를 기록해요. BP566/API289개를 유지하며 다른 전체 기능 후속도 계속해요.

## 2D 표면 후속 · 2026-10-05

[2D 표면 계약](2D_SURFACE_NORMAL_SHADOWS.md)의 blend/cutoff·normal texture/strength/Y·cast/receive 설정/조회7개를 같은 C++/BP 서비스로 추가했어요. BP573/API289개예요. 실제 배포 Player의 BP→C++ 즉시 조회/쓰기→BP 다중 반환 핀→C++ 인자, 제작기/AI·GPU49개를 확인해요. 다른 전체 세부도 계속해요.


2026-10-06 C++ 묶음 후속: Tick/Begin Play/Fixed Tick의 직선 C++ 연결도 같은 빌드와 인스턴스 사이에서 묶어요. 50개 인스턴스·각 2함수는 100→1 RPC를 실제 사용자 C++로 검사해요. 입력·Overlap/Hit·피해·사용자/네이티브 이벤트·Construction·BP 함수 내부의 연속 C++ 호출도 묶어요. 앞 호출의 출력·월드 조회·분기·중단점·BP 콜백/엔진 작업은 순서 보존 경계예요. 중간 반환 뒤 아직 실행하지 않은 연결과 다른 Tick 이벤트를 이어가며 실패한 호출을 재시도하지 않아요. 모든 이벤트 종류의 여러 인스턴스에 걸친 묶음, 순서에 영향을 주지 않는 일반 BP 연산의 통합은 계속 남아 있어요.

2026-10-06 P0 이벤트 묶음 후속: 여러 오브젝트의 Construction·키 Pressed/Released/Axis·Begin/EndOverlap·Hit·EndPlay도 terminal 직선 C++ 호출은 같은 build별 요청으로 모아요. 실제 C++50인스턴스100/150호출→1, 원래 native input·값·trace·순서 일치를 검사해요. BP callback/engine 작업 이후에는 미래 인자를 다시 읽고, 입력 키 맵·충돌 기록은 성공 prefix의 원래 시점에서 갱신해요. InputContext/Action 또는 기존 Action state가 있는 입력 경로, BP 함수/매크로로 감싼 인스턴스 간 호출과 native Timer callback 묶음 등은 추가 구현 대상이에요. 한 owner의 EndPlay가 실패하면 그 호출을 재실행하지 않고 나머지 owner를 종료하며, 응답을 잃어 완료 cursor를 모르는 요청은 재전송하지 않아요. 이 상세 진단은 제작 화면의 안내문으로 노출하지 않아요.

2026-10-06 terminal BP 함수 묶음: primitive 함수 인자, functionInput→C++ 직선 호출→functionOutput 및 사용하지 않는 exec-only 반환을 여러 인스턴스 이벤트/Construction/EndPlay/Tick/Begin/Fixed에서 함께 전송해요. 실제 C++100/200→1과 출력·변수·trace·stack 일치, 콜백 뒤 현재 인자 유지/미래 인자 재평가, 함수·return 중단점 및 Tick interval을 검사했어요. 배열·구조체 입력은 alias를 유지하는 기존 경로로 처리하고 배열 callback 회귀를 대조해요. 여러 Tick의 BP wrapper·매크로·InputAction·Timer 경로 전체가 완료됐다는 뜻은 아니에요.


### 2026-10-07 — 물리 개수 제한·전체 질의 결과 누락 제거(043)

- 042 후속으로 공유 물리 월드의 차원별 충돌체8,000/관절512, C++ snapshot 전체·타일 충돌체8,000 검사를 제거했어요. RaycastAll/Overlap의1,000개 절단도 제거해요. 단일 Raycast는 첫 결과만 변환하고 C++ snapshot 복사는 인자 펼치기 없이 반복해요. ID/형상/좌표/필터/통신 크기 검증을 유지해요.
- 수정 전 실제 1,201개 교차가1,000개로 줄어드는 실패를 재현했어요. 최종 tools/check-physics-capacity.mjs 10검사(physics-capacity-BRW5lX): 2D/3D 각각10,001충돌체/solver1프레임/전체겹침, 각각600관절, 한 오브젝트8,001타일충돌체, 실제 C++ RaycastAll/OverlapBox 각1,201결과·잘못된 값 거절. 기존 check-physics.mjs 156WASM검사와 C++/BP 연결도 통과해요. 검사 개수를 새 상한/FPS 성능 판정으로 쓰지 않아요.
- Unity6000.0 RaycastAll/OverlapBoxAll 자체 본문과 반환·정렬·메모리 의미를 읽었어요. docs/research/PHYSICS_COUNT_LIMITS_043.md에 근거/범위/최종2파일SHA를 기록해요. C++ 호출당128질의/4MB패킷·형상 크기 등 자원/입력 검증은 남아 있어요. 원본게임/사용자창·프로필/장기 검사를 건드리지 않았어요. 041/042 결과를 유지하며 이번 기록은 전체 엔진/조사 완료를 뜻하지 않아요.


### 2026-10-07 — 큰 월드의 C++ 질의 준비 비용 제거(044)

- 공유 engineQuery가 각 snapshot행마다 전체 월드를 찾는 중첩 검색을 하던 원인이에요. 기존 bridgeStateIndices로 바로 찾고 범위/ID가 맞지 않으면 안전하게 기존 검색을 해요. 현재 actor transform/nativeProperties, 월드 순서와 추가 속성·검증을 유지해요. 새 캐시/의존성이나 개수 상한을 만들지 않았어요.
- 같은5,000행 실제 컴파일 C++ 입력의 snapshot/merge/패킷 구성 단계만 순차 비교했어요. 이전1,949.3/2,001.2/2,021.3ms → 이후31.2/33.4/34.6ms. IPC·물리·렌더링·전체FPS를 포함하지 않으며 장면 전체120fps 합격으로 쓰지 않아요. 원본게임/사용자창·프로필·장기 검사 불변이에요.
- query-world-ZgeKee에서 현재 transform/추가 값/행 순서와 잘못되거나 없는 인덱스 fallback을 실제 C++로 통과했어요. 새 SDK로 물리 capacity10검사(12CXiy), 기존156물리검사와 C++/BP연결, 실제 별도 C++ worker/Windows에서 만든 모바일 AOT 모듈 호출(RzTUIe), Spawn/Destroy/Construction/실패회복9검사(MXspEq)도 통과했어요. Android/iOS 실기기·새 패키지 검사가 아니에요. docs/research/CPP_QUERY_WORLD_LOOKUP_044.md·native/build/query-world-result-044.json에 근거를 기록해요. 041/042/043을 유지해요.

### 2026-10-07 — 몽타주 교체 혼합(045)

- 기존 Play Montage/C++ Montage::Play의 동일 그룹 교체가 이전 포즈를 BlendOut으로 줄이며 새 BlendIn과 혼합해요. Quaternion/여러 슬롯·그룹/빠른 연속 교체와 2D 프레임에 공용 경로를 사용해요. Notify 범위는 교체 시작에 정리하고 Interrupted/Ended는 기여 종료 때 전달해요.
- AI runtime/schema와 몽타주 창에서 montageTransitions/instance/retiring을 관찰해요. 추가 바인딩 때문에 오래된 외부 포즈 연결표를 쓰던 문제도 고쳤어요. 기존 API/노드 수·임의 개수 제한 제거를 유지해요. 근거/검증은 research/MONTAGE_REPLACEMENT_BLEND_045.md에 기록해요.


## 046 실제 컴퓨트 셰이더 — 2026-10-07

기존 compute 부재를 코드로 확인하고 Direct3D11/HLSL cs_5_0/구조화 버퍼/상수/실제Dispatch·명시적readback과 GPU상태 유지 파티클을 SDK에 추가했어요. BP→C++→실GPU, 실제 release Player의2D·3D 이동·버퍼 유지/해제·원본/종료 PASS.65,537레코드20step 중앙값 CPU 4.0771ms, GPU한번readback 1.2039ms, 매stepreadback 10.8629ms. 전체FPS로 세지 않아요. Android2ABI 헤더 컴파일 PASS이며 모바일 GPU는 미구현이에요. 기본CPU파티클/탄막과 WebGL2렌더러의 직접GPU버퍼 공유가 후속이에요. research/GPU_COMPUTE_046.md에 실제 본문5개 읽기 범위/코드/검증·실패보존을 연결했어요. 사용자 창/원본게임/프로필은 사용하지 않았어요. 설치는 검증 source의 production commit 뒤 진행해요.


## 046 사용자 설치 기록 — 2026-10-07

production c775bb5를 C:/Users/kirby/HBEngine/Versions/b82a5239ad35ec47에 갱신했어요.1806파일·변경15SHA·바로가기/.hbproject 연결·이전f906 버전/프로필/프로세스 보존 PASS. 실제사용자 창을 시작/종료하지 않았어요. native/build/gpu-compute-user-install-046.json.


## 047 프레임 리소스 추가 — 2026-10-07

컴퓨트 경로에3개 순환 상수 버퍼·동적WRITE_DISCARD 업로드,3개 결과 슬롯·완료query·대기 없는 비동기회수·가득 찬 슬롯 보존·reset/해제를 구현했어요. C++/BP 제출·회수 함수와 실제 release Player의2D/3D 경로 PASS. 공용 파티클 렌더러는 동적 버퍼의 활성 범위만 재업로드하고 배열을 재사용해요. GPU코어90zRwE·실제Player0EJH77·공용Renderer검사 PASS/currentSHA일치. 프레임FPS/전체렉/모바일GPU/네이티브씬렌더 이식 완료라고 세지 않아요. 자세한근거/검증은 research/FRAME_RESOURCES_047.md에 있어요. 설치는 검증source를 커밋한 뒤 불변 버전으로 갱신해요.


## 048 GPU 버퍼 직접 렌더·편의 API — 2026-10-07

실제 DirectCompute 파티클 버퍼→GPU 활성 인덱스/개수→간접 draw→텍스처/깊이 타깃→선택 HWND flip 출력 경로를 추가했어요. 위치/활성 개수 CPU 회수0,3개 상수 재사용,수명 제외/resize/해제·같은 창 재생성을 연결했어요. 게임 코드는 ParticleEffect의 update/draw/resize/texture와 카메라 함수를 호출하며 HLSL·D3D 버퍼를 직접 작성하지 않아도 돼요. DrawGPU는 사용자 C++에서 블루프린트로 노출되며 실제 release Player에서도 실행돼요. 공통 편의 함수221개도 실제C++/BP 결과·타입·오류 비교 PASS예요. GPU render UIDtfw/core3tRrRV/Playerj7k2Gr가 최신SHA증거예요.65,537개20frame간접계산·draw·최종image회수 배치1.5927/2.0115/1.6714ms이며 전체게임FPS로 계산하지 않아요. 메인WebGL2씬/기본CPU방출·탄막충돌·모바일GPU를 새경로로 모두이식한 상태는 아니에요. 근거·계약·미독범위/다음작업은 research/GPU_RESIDENT_RENDER_048.md에 있어요. 기존게임/창/프로필을 건드리지 않았고 두원본MD에는 덧붙이기만 했어요.


## 048 사용자 설치 갱신 완료 — 2026-10-07

검증 production 3316dc90a1e8b1c3d52513bdc1b00951ef178d89를 C:/Users/kirby/HBEngine/Versions/944ae8b62a7b3bc8에 불변 설치했어요.1812파일·변경17개SHA·바로가기/.hbproject 연결 검증 PASS. 이전88db 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자창을 시작/종료하지 않았어요. GPU직접렌더/활성목록·간접draw/ParticleEffect편의API/사용자C++ 노드를 포함해요. 공통편의함수221개·실제GPU·releasePlayer의최신SHA증거를사용했고 불필요한전체/8시간검사는 하지 않았어요. 기존메인씬과기본CPU효과를자동GPU로바꾼설치는아니며,전체게임FPS/모바일GPU성공으로세지않아요. 증거 native/build/gpu-render-user-install-048.json. 다음실행부터새버전이열려요.


## 049 GPU 파티클 방출·수명·간편 함수 — 2026-10-07

GPU에서 빈 슬롯을 찾아 새 입자를 넣고, 수명이 끝난 슬롯을 재사용하도록 연결했어요. C++ ParticleEffect는 emit/rate/play/pause/stop/clear를 제공하며 사용자 C++ HB_FUNCTION은 블루프린트로 노출돼요. 가득 찬 경우 살아 있는 입자를 보존하고 요청 버퍼를 재사용해요. 실제 하드웨어·픽셀·release Player의 2D/3D BP/C++ 방출/수명/일시정지/재개/제거·배치 위치 보존이 통과했어요. 최신 core eZAFNC/render mEgSrZ/Player azWd4k/debug 오류0은 현재 SHA예요. 기존 편의 함수221개의7파일은 변경이 없어 실제 C++/BP 비교 증거를 재사용했어요. 방출1024개/frame·65,537슬롯·20frame의 계산/방출/그리기/최종이미지 회수는1.3395/1.1724/1.2401ms이고 전체 게임 FPS가 아니에요. Unity의4개 자체 API 본문·예제, Epic GPU 두 가이드의 자체 텍스트, Microsoft 세 API 읽기/재읽기 범위를 research/GPU_EMISSION_049.md에 기록했어요. 연결문서/이미지/전체문서 분석 완료로 세지 않아요. 메인 WebGL2 씬의 GPU 타깃 합성·모바일GPU·누적 엔진 기능은 이어갈 작업이에요. 원본 게임/창/프로필과 기존 장기 검사는 사용하지 않았어요. 설치는 검증 소스 커밋 뒤 새 불변 버전으로 갱신해요.


## 049 사용자 설치 갱신 완료 — 2026-10-07

검증 production 022b7decbfa4ebb450936edfa9f598f46846588b를 C:\Users\kirby\HBEngine\Versions\7a1921f1526ee62d에 불변 설치했어요.1813파일·변경15개 SHA·바로가기/.hbproject 연결 검증 PASS. 이전944ae8 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자 창을 시작/종료하지 않았어요. GPU 방출/수명/빈 슬롯 재사용과 ParticleEffect의 emit/rate/play/pause/stop/clear, 사용자C++→BP 노드를 포함해요. 실제 GPU·픽셀·배포 Player·debug 오류0·현재 소스 SHA 검증을 사용했고 변경 없는 편의 함수221개 검사는 재사용했어요. 기존메인씬/CPU 탄막을 자동 GPU로 이식한 설치나 전체게임 FPS/모바일GPU 검증으로 세지 않아요. 증거 native/build/gpu-emission-user-install-049.json. 다음 실행부터 새 버전이 열려요.


## 050 메인 씬 GPU 렌더·기존 함수 연결 — 2026-10-07

실행 렌더러 선택(runtime.renderBackend/WebGL2 기본·WebGPU 선택), 실제 메인 카메라/깊이 버퍼의 GPU ParticleSystem, 기존 Play/Stop/Pause/Emit/GetCount BP·C++ 함수 연결을 구현했어요. C++ 함수 안의 정지→방출→명시적 개수 조회도 실제 컴파일한 release Player에서 확인했어요. 위치/나이 계산·슬롯 재사용·생존 인덱스/간접 draw는 GPU에 남아요. 공용 장치와 버퍼 재사용, 새 출생이 없을 때 재업로드 방지, PMREM 배경/compute 전용 버퍼 소유권 해제로 장면 전환 뒤 자원 증가를 막았어요. 65,537 경계·2D/3D·깊이 가림·월드/로컬 이동·정지/수명/전환·GPU 오류0·종료0 PASS. GPU24G6Ni/기존WebGLXFO4wW 및 CPU32경우2560스텝/채널/CPU파티클 검사 증거를 research/GPU_SCENE_050.md에 연결했어요. 원본 게임의 렌더러를 바꾸거나 FPS/모바일/모든 셰이더 완료로 세지 않아요. 편집기 미리보기와 미이식 머테리얼·조명·마스크·후처리는 기존 경로를 유지해요. 누적 엔진 요구와 후속 이식은 계속해요.


### 050 사용자 설치 갱신 확인 — 2026-10-07

검증한 production `8dabf2d180bb42c640139dde9de2969bdb09ea80`를 `C:/Users/kirby/HBEngine/Versions/7df780dd9a47cf5b`에 불변 설치했어요. 1,817파일·변경27파일 SHA·바로가기·.hbproject 연결을 확인했고, 이전7a192 버전/실행 파일/기존 GPU SDK/프로필/사용자 프로세스를 보존했어요. 창을 열거나 닫거나 새로고침하지 않았으며 다음 실행부터 새 버전이에요. 설치 증거는 `native/build/gpu-scene-user-install-050.json`이에요. 기존 게임 원본/Source/에셋/tools와 모바일 산출물은 변경하지 않았어요. 이 기록은 기존 게임의 FPS 목표 달성으로 세지 않아요.


051 GPU 머테리얼/환경: 기존 Set Material/Set Material Float 노드와 새 hb::Materials::Set/SetFloat가 같은 검증/서비스를 호출해요. 인스턴스 재정의를 포함한 GPU 숫자 파라미터는 uniform 재사용; actual releasePlayer GPU sH8prw/defaultGL pzP5Za에서 C++와 실제 키 입력 BP·픽셀·해제 PASS. [세부 근거](research/GPU_MATERIAL_ENVIRONMENT_051.md). 전체 BP/엔진/조사 완료로 세지 않으며 선행 목표 묶음 완료 뒤 설치해요.


## 052 GPU 2D 스프라이트·마스크·픽셀 정렬 — 2026-10-07

기존 Sprite/Tilemap/Particle 마스크·SortingGroup/범위·발광·C++ Flash·카메라 픽셀 정렬을 GPU 실행에 연결했어요. 실제 release Player GPU BkkAjH / GL HBMYkk 픽셀·자원 반환·분리 원본 보존 PASS. 상세와 본문/API 읽기 범위는 docs/research/GPU_2D_052.md예요. 전체 선행 목표 완료 뒤 설치, 이후 추가 연구 목표 순서를 유지해요.


## 053 GPU 2D 조명·그림자 — 2026-10-07

기존 광원/노멀/쿠키/블렌드 스타일/마스크/ShadowCaster/Composite/볼륨을 메인 GPU에 연결했어요. 실제 release Player GPU7WAkd3/GL10vKc6에서 C++·실제 BP·광원·픽셀·3셀 아틀라스·정렬/마스크·변경 없는 프레임 캐시·자원 반환·종료 PASS. 공용 스프라이트 영향 xlTL92 PASS. 상세와 읽기 범위/미완료 대조: research/GPU_2D_LIGHTING_053.md. 설치는 누적 선행 목표 완료 뒤, 추가 연구 목표는 그다음 순서예요.


### 054 GPU 입자/투사체 실행

ParticleSystem의 기존 여섯 sortMode와 C++/BP Projectiles는 GPU draw 경로를 공유해요. 입자 정렬은 GPU 인덱스만 정렬하며 위치 readback은 개인 acceptance 진단에서만 허용해요. Projectiles 이동·swept 충돌은 기존 CPU 서비스예요. 세부 증거 GPU_EFFECTS_054.md.


055: 에디터 GPU 실행에도 공용 C++ 입자 질의를 연결하고 작성 씬의 실행 debug 오염을 방지. AI window.open/close/viewport.get은 실제 공유 렌더러 상태를 제공. 상세 research/GPU_EDITOR_055.md.


056/057: 기존 Particle SDK/BP 함수를 모바일 renderer 질의에 연결하고 대상/입력/응답 검증을 PC와 공유. GPU 입자의 유휴 제출을 생략하며 기존 방출/정지 의미 유지. 실제 모바일 GPU device는 미검증. research/GPU_MOBILE_056.md와 GPU_IDLE_057.md 참고.


2026-10-08 접촉 수명/Stay 후속: Overlap Stay·Collision Stay·Collision Exit는 같은 카탈로그/AI schema와 Collider 상세에서 생성하고 대상 컴포넌트를 선택한다. 고정 물리 dt를 실제 사용자 C++ float에 전달하며 화면 fallback 중복·수면 solid Stay를 막는다. 삭제/풀 반환 owner를 호출하지 않고 제거된 상대는 null, 재사용 바인딩은 새 수명으로 처리한다. 마지막 HitResult/수신자 법선을 보존하는 solid Exit와 실제 Rapier2D/3D 및 비배치=배치 검증은 [064](research/CONTACT_LIFETIME_064.md)에 있다. 기존 Event Hit의 첫 접촉 계약과 자료형 검증을 유지하며 UE 전체 Hit/Unity Collision 동등성은 주장하지 않는다.
