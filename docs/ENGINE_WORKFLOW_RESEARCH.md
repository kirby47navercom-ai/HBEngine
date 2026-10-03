# 엔진 제작 흐름 조사와 구현 대조

기록 갱신: 2026-10-03. 목표는 Unreal/Unity의 외형을 흉내 내는 창 목록이 아니라, 사람이 반복해서 게임을 제작할 수 있는 내부 계약이다. 사용자가 든 사례를 범위의 상한으로 삼지 않는다. 2D, 2.5D, 3D와 AI 자동화는 모든 계층에서 함께 다룬다.

기존 `ENGINE_REFERENCE_ANALYSIS.md`, `REFERENCE_COVERAGE.md`, `reference-index/`와 이어지는 기록이다. 문서 목록 수집, 본문 확인, 구현, 실제 실행 검증은 서로 다른 상태다. Unreal/Unity의 문서 전체를 읽었다거나 상용 엔진 수준으로 완성했다고 표시하지 않는다.

## 자료에서 확인한 구조와 HB 결정

| 흐름 | 본문에서 확인한 원칙 | 구현 결정과 증거 |
|---|---|---|
| 에셋 생명주기 | Unity는 원본의 ID와 import 설정을 메타데이터에 보존하고 Library의 처리 결과와 구분한다. UE는 감시 디렉터리와 안정화 대기 후 원본 변경을 재가져온다. | 기존 `.hbassets.json`을 유지하며 UUID, 원본 해시, 의존성과 역참조, 누락 진단, 영향 전파를 추가. 원본 덮어쓰기 전 대조·백업. UI 우클릭 재가져오기/참조 보기. 자동 포맷 변환이나 폴더 감시까지 구현했다고 표시하지 않음. |
| 에디터 문맥 | UE의 Content Browser·Outliner·Details와 Unity의 Project·Hierarchy·Inspector는 선택 대상과 작업 문맥을 유지한다. | 문서별 에디터/Undo, 여러 콘텐츠 브라우저 각각의 폴더·검색·필터·선택·탐색 기록. 탭줄에 놓기는 병합, 본문 가장자리는 분할. 머테리얼 전용 미리보기와 그래프. |
| 오브젝트 구성 | Unity의 GameObject는 컴포넌트 구성으로 동작하고, UE는 Actor/Component와 Controller/Pawn의 역할을 구분한다. | `scene-components.js`의 39개 정의를 UI·검증·기본 오브젝트·실행이 공유. Controller 공통 부모, Player/AI Controller, GameMode/State/PlayerState/Pawn 연결. 컴포넌트 체크가 실제 렌더/물리 활성 상태에 반영됨. |
| 실행 순서 | 생성/초기화/BeginPlay, 프레임 갱신과 고정 물리 갱신은 구분해야 한다. | 모든 Construction 이후 서비스 초기화, 이후 BeginPlay. 고정 스텝마다 FixedUpdate와 접촉 이벤트. 편집 원본을 복제한 플레이 월드, 종료/실패 복구. |
| 물리와 제어 | 충돌 반응, trigger, 레이어, 물리 재질, 동적/키네마틱 바디, 입력과 접지 판단은 연동되어야 한다. | 2D/3D 바디·중력·힘·충격량·마찰·반발·질량·축 고정·mask, Overlap/Hit. 부모 아래 바디의 월드 이동. [Unity 물리 재질 혼합 순서](https://docs.unity3d.com/6000.0/Documentation/Manual/collider-surfaces-combine.html)에 따라 양쪽 순서와 무관한 average/min/multiply/max 적용. 캡슐은 현재 경계 상자로 근사하며 CCD/회전 동역학/정밀 경사 처리는 남음. |
| 2D 제작 | Paper2D는 Sprite/Flipbook/TileSet/TileMap을, Unity는 팔레트와 Brush/Erase/Fill 도구로 이미지→레벨 제작을 이어준다. | 스프라이트 crop·pivot·PPU·grid slicing, 프레임 애니메이션, 타일 팔레트·레이어·브러시/지우기/사각형/채우기, 레이어 충돌. 배치→실제 sprite/tile 렌더→고정 스텝 충돌. 2D 시작 템플릿과 추적 카메라. |
| 머테리얼 | 그래프는 핀의 타입과 연결로 실행 가능한 셰이더를 만들고 인스턴스는 부모의 파라미터를 재사용한다. | 33개 노드, GLSL 생성, 실제 MeshPhysicalMaterial에 연결. UV/texture/math/normal/emissive/opacity/AO/coat/transmission/IOR. 인스턴스 상속·override 검증. HLSL/DX11 backend는 남음. |
| C++와 BP | C++ 공개 클래스·속성·함수와 Blueprint는 같은 게임 객체를 제어해야 한다. | 기존 289개 코어 API에 73개 EngineService API를 연결. C++의 게임 역할 조회·Possess·힘·속도·월드/로컬 위치를 실제 플레이 VM에 적용. 정적 카탈로그 444개와 C++ 생성 서명 대조. |
| 장면 전환 | UE Open Level과 Unity SceneManager는 다음 장면 로드와 기존 월드의 종료를 연결한다. | Open Scene 노드와 `hb::Scene::Open`은 같은 검증/전환 요청을 사용. 프레임 경계에서 EndPlay(LevelTransition)·타이머/입력/물리/오디오/위젯 정리 후 새 월드 Construction→BeginPlay. 종료 시 편집 원본의 장면·환경·2D/3D 설정 복구. |
| 사람과 AI | 사람이 보는 라벨과 머신 식별자를 분리하고 저장되지 않은 상태도 관찰할 수 있어야 한다. | `/api/schema`가 실제 정의에서 생성됨. 현재 편집 데이터 revision 기반 patch·Undo·save·play·state API와 CLI. JSON 전체 치환에만 의존하지 않고 조건부 부분 변경 가능. `AI_ENGINE_API.md` 참조. |

자료: [Unity Asset metadata](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetMetadata.html), [UE Auto Reimport](https://dev.epicgames.com/documentation/en-us/unreal-engine/reimporting-assets-automatically-in-unreal-engine), [UE Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine), [Unity Components](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingComponents.html), [Unity execution order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html), [UE Collision Response](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine).

2D 자료: [Paper2D Sprite Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-sprite-editor-in-unreal-engine), [Paper2D TileSets/TileMaps](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-tile-sets-and-tile-maps-in-unreal-engine), [Unity Tile Palette assets](https://docs.unity.com/en-us/engine/6000.3/manual/unity2d/tilemaps/create-tile-palette/assets), [Andy Touch의 이미지→레벨 제작 설명](https://unity.com/blog/games/2d-tilemap-asset-workflow-from-image-to-level), [Unity Learn 제작 도구 실습](https://learn.unity.com/tutorial/create-a-world-to-explore).

원저자 해설도 검토했다: [Tom Looman의 Gameplay Framework](https://tomlooman.com/unreal-engine-gameplay-framework/), [Catlike Coding의 Physics 이동](https://catlikecoding.com/unity/tutorials/movement/physics/), [Unity의 ScriptableObject 구조 설명](https://unity.com/how-to/architect-game-code-scriptable-objects), [Unity의 프로젝트 확장 구조 설명](https://unity.com/how-to/how-architect-code-your-project-scales). 기술 계약의 기준은 공식 API/매뉴얼이며 해설은 제작 의도와 실패 사례를 이해하는 자료로 사용한다.

## 실행 증거

- `test:windows`: 탭 병합/분할, 기존 비율 보존, 독립 브라우저 상태와 폴더 이력.
- `test:scene`: 계층 복사와 부모 없는 자식 복사의 월드 자세 보존, 다중 변환의 중복 이동 방지, 39종 컴포넌트와 2D/3D 접촉·제어·FixedUpdate.
- `test:2d`: atlas 분할, 도구/레이어/충돌, 프레임 시간, 한 stroke의 Undo, 실제 디스크 저장/재열기.
- `test:material`: 타입·순환 검증, 33개 노드와 GLSL 생성, 인스턴스·프리팹 참조. 별도 WebGL 검사는 32 expression 셰이더의 실제 컴파일과 픽셀 차이를 확인했다.
- `test:host`: 실제 사용자 C++ 빌드, 클래스/이벤트/반환/배열, 프레임워크와 물리 명령, 회전·스케일 부모 아래 월드 위치의 C++/JS 일치.
- `test:headless`: 2D 이동·점프·착지·원본 보존, 사용자 C++ 실제 컴파일/공통 서비스 호출, BP/C++ 다음 장면·EndPlay·이전 타이머/입력 정리·비동기 읽기 종료 보호. GPU/음향 검사와 분리된 실행 결과.
- `test:integration`, `test:editor-api`: AI/에셋 API와 GPU 자원 수명, 실제 편집기의 수정·Undo·2D 플레이·원본 복구.
- 실제 화면 조작: Sprite atlas/crop/PPU/pivot과 TileMap 팔레트·레이어·도구를 확인하고 타일 칠하기→Ctrl+Z→저장을 실행했다. 2D 문서는 중복된 전역 패널 없이 전용 캔버스와 속성을 사용한다. 머테리얼 100% 복원은 그래프를 중앙에 배치하며 프리셋 색상/거칠기가 노드와 Inspector에 함께 반영된다. 기본 도킹의 콘텐츠 브라우저는 여러 행이 보이도록 높이를 확보한다. 기존 사용자 배치는 유지한다.
- `test:editor-api` 추가 확인: 잘못된 Play의 편집 원본 복구, 실제 사용자 C++ 빌드, 입력/일시 정지/재개, 2D→3D 전환과 Stop 시 원래 환경·차원·장면 복구, 다른 프로젝트의 이전 창 연결 거부.
- `desktop:build`, `test:desktop`: 최신 Windows EXE와 동봉 런타임을 다시 빌드하고 실제 WebView2의 허브/편집기 준비·닫기·서버 종료를 확인했다. 빌드 출력과 화면 증거는 native/build 및 dist에 두고 Git에서 제외한다.

## 전체 엔진의 남은 작업 지도

다음 항목은 앞선 대화에서 명시한 사례 외에도 엔진 완성도를 위해 계속 조사·구현·실행 검증해야 한다. 아래 항목을 단순 메뉴나 이름만 만들어 완료 처리하지 않는다.

| 영역 | 현재 가장 중요한 빈틈 | 완료 판단에 필요한 제작/실행 증거 |
|---|---|---|
| 네이티브 코어/렌더링 | Win32/WebView2 편집기와 C++ 호출 호스트가 현재 구조. 실제 DX11 world renderer/RHI와 HLSL backend 부재 | 같은 저장 장면·카메라·재질이 native GPU renderer에서 실행되고 셰이더 오류·device loss·리소스 수명이 검증됨 |
| 프로젝트/배포 | editor EXE와 `.hbproject`는 있음. 독립 게임 빌드, cooking, build profiles, 버전 업그레이드는 부족 | 편집기가 없는 컴퓨터에서 패키지 실행, 입력·장면 전환·세이브·오류 로그 확인 |
| 에셋 파이프라인 | ID/참조/수동 재가져오기까지 연결. importer 설정·캐시·외부 디렉터리 감시·자동 변환 부족 | JPEG/AVI/모델 등 포맷별 실제 변환 결과와 실패 복구, 변경 dependency만 다시 처리 |
| 월드/레벨 | 단일 월드 교체와 BP/C++ 장면 전환 연결. Additive/streaming·persistent manager·전환 중 로드 취소 UI 부족 | 레벨 열기/언로드·게임 상태 생명주기·persistent manager·참조 정리·로딩 중 취소 |
| 물리/게임플레이 | 소규모 pair scan, 캡슐 AABB 근사, 정밀 controller·다각형 NavMesh/군중 회피 부족 | 경사/계단·빠른 물체·트리거 경계·복수 캐릭터·NavMesh 경로·AI 제어 시나리오 |
| 2D | 기초 Sprite/Tile/Flipbook 실제 흐름 있음. 9-slice·자동 타일·polygon collider·2D 전용 AnimationBP/블렌드 트리 부족 | 다중 atlas와 실제 게임맵, 스프라이트 정렬/투명도·애니메이션 전이·타일 충돌 편집 |
| 애니메이션 | transform curves, sprite clips, 가져온 모델 clip 재생. skeletal authoring·blend tree·retarget·IK 부족 | skeleton/clip/state machine 각각 독립 에디터, 전이·이벤트·root motion·리타깃 시각 검증 |
| 렌더/제작 도구 | PBR 기초, 환경광/하늘, 원시 도형. terrain·foliage·LOD·occlusion·고급 파티클/VFX 그래프·postprocessing 부족 | 실제 레벨 저작, 표현 차이와 GPU 비용, drawcall/메모리 측정 |
| 게임 UI/오디오 | 간단 위젯·AudioSource 실행. 레이아웃 authoring, 접근성·로컬라이즈, mixer·3D 음향 부족 | UI prefab·앵커·포커스/게임패드·음량 bus·공간 attenuation/occlusion 실제 게임에서 확인 |
| 디버깅/자동화 | BP breakpoint·로그·AI 상태 API. 같은 VM/C++의 headless 로직 검사 연결. profiler·call stack 확장 부족 | CPU/GPU/메모리 원인 추적, C++ 디버거 연결, 재현 가능한 게임 시나리오 자동 실행 |
| 확장/협업 | 데이터 버전 1과 로컬 파일. 플러그인/module ABI, 네트워크 replication, 협업 충돌 해결 부족 | 플러그인 로드/해제·버전 호환, host/client 일관성, 프로젝트 복제/병합/복구 |

이 지도를 유지하면서 새로 조사한 기능의 사용자 흐름, 데이터 소유자, 실행 서비스, 실패/Undo/재열기, AI 계약을 함께 적는다. 기능 개수는 완성도의 대용 지표가 아니다.

장면 전환 근거: [UE 레벨 전환 제작 실습](https://dev.epicgames.com/documentation/en-us/unreal-engine/designer-10-complete-the-level-in-unreal-engine), [Unity SceneManager.LoadSceneAsync](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html). HB는 현재 단일 월드 교체를 제공하며 Unity Additive나 UE level streaming과 같은 기능으로 표시하지 않는다.


## 2026-10-03 추가 본문 분석과 구현

사용자가 직접 열거한 목록 밖의 인지·계층 태그·경로·파티클 모듈도 조사하고 실행 서비스로 추가했다. 아래는 실제 본문 확인 범위이며 링크 인덱스 전체를 읽었다는 표시가 아니다.

| 자료 | 확인한 제작/실행 계약과 HB 적용 |
|---|---|
| [UE Behavior Tree Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview) | Blackboard, composite/task/decorator/service와 우선순위/중단을 분리한다. HB는 독립 BB/BT와 실행 상태·조건 abort·간격 service를 연결했다. 현재 주기적 재평가이며 UE의 전체 event-driven observer 구조와 동일하지 않다. |
| [UE StateTree Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine), [Unity State Machine](https://docs.unity3d.com/6000.0/Documentation/Manual/StateMachineBasics.html), [Unity Transition](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transition.html) | 상태·조건·전이와 종료 시간, Any State를 분리한다. HB는 평면 FSM·이벤트·조건·클립을 제공하고 계층 StateTree/포즈 전이 블렌딩은 남은 범위로 유지한다. |
| [UE Animation Montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine) | 섹션/다음 섹션/슬롯/Notify가 단순 커브 시간과 구분된다. HB는 전용 타임라인과 실제 클립 샘플링·Jump/Next/Pause/Seek를 제공하며 슬롯별 bone blend와 root motion은 미지원이다. |
| [UE Sequencer Track List](https://dev.epicgames.com/documentation/unreal-engine/sequencer-track-list-in-unreal-engine) | 연출은 객체 바인딩 아래 속성/클립/이벤트 트랙으로 제작한다. HB는 11종 트랙, 실제 객체 선택·XYZ 키·FPS 스냅·실행 서비스 미리보기·종료 복원을 제공한다. 중첩 subsequence·camera blend·전체 property reflection은 남아 있다. |
| [UE Decal Materials](https://dev.epicgames.com/documentation/unreal-engine/decal-materials-in-unreal-engine) | 데칼은 표면 투영과 수신/재질 계약이 있다. HB는 실제 메시 투영·텍스처/색/불투명도·정렬·GPU 해제를 연결했다. UE의 DBuffer/GBuffer blend 구현은 아니다. |
| [UE AI Perception](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine) | 감각 설정·인지 대상·자극/기억과 이벤트가 행동 선택에 쓰인다. HB는 시야/차폐/청각/기억·source·대상 조회/Forget/Noise, Blackboard Target/HasTarget을 연결했다. 팀 affiliation·damage/prediction 센서는 남아 있다. |
| [UE Gameplay Tags](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-tags-in-unreal-engine) | 계층 이름과 컨테이너, Any/All/None 질의를 게임 조건에 사용한다. HB는 객체 tag 목록과 BP/C++ 질의를 제공한다. 중앙 tag dictionary·redirect editor·네트워크 복제는 남아 있다. |
| [Unity Navigation Overview](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavigationOverview.html), [Navigation Inner Workings](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavInnerWorkings.html) | 길 찾기와 실제 agent 이동, 장애물/우회와 local avoidance는 별도 책임이다. HB는 에이전트 크기를 고려한 XY/XZ 격자 A*·동적 재탐색·실제 이동을 구현했다. 다각형 bake/corridor/RVO/carving과 같다고 표시하지 않는다. |
| [Unity Particle Main](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysMainModule.html), [Modules](https://docs.unity3d.com/6000.0/Documentation/Manual/ParticleSystemModules.html), [Emission](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysEmissionModule.html), [Shape](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysShapeModule.html) | 파티클 설정은 모듈과 시간/거리 방출·버스트·shape·local/world simulation으로 나뉜다. HB Inspector도 모듈별로 묶고 seed·Main/Emission/Shape/Velocity/Force/Color/Size/Renderer와 CPU/GPU 표시를 연결했다. Shape 문서는 일부 본문만 확인했으며 Unity의 전체 모듈·모든 shape를 구현한 것은 아니다. |

실행 근거: `test:gameplay`는 BB/BT/FSM·몽타주 Notify/섹션/실제 skeletal 샘플·11종 시퀀스·데칼·C++ 서명/실행을 검사한다. `test:systems`는 시야 가림/소리/기억·BB 반영, 태그 질의, 장애물을 관통하지 않는 2D/3D 경로, 부모 아래 에이전트 크기, 파티클 seed/pause/burst/렌더 버퍼와 실제 C++ 명령의 VM 적용/Actor 배열 반환을 검사한다. 두 새 프로젝트를 각각 600프레임 실행해 AI 도착·상태 전이·입자 방출·2D 탑다운 입력과 원본 파일 보존을 확인한다.

실제 편집기에서는 두 장면의 Play, BT/FSM 실행 강조와 실행 대상/BB 값, 몽타주 실제 대상 미리보기, 시퀀스 정·역 스크럽, XYZ 키 편집→Undo, 진단 에셋이 열린 상태의 재실행 후 원래 작업 장면 복원을 확인했다. 진단 중 데이터 입력은 잠그고 View 조작은 유지한다. 화면 증거는 `native/build/ui-montage-integrated.png`, `ui-behavior-integrated.png`, `ui-sequence-integrated.png`에 보관한다.

다음 확장 지도에는 위 구현 뒤에도 animation blend/IK/리타깃, AI EQS/계층 상태/다각형 navigation, VFX graph/입자 충돌, terrain/foliage/LOD, 게임 UI 저작/오디오 mixer, import/cooking/build profile, native RHI/physics, profiler/플러그인/네트워크가 포함된다. 사용자 예시만 채우거나 메뉴 수를 늘리는 것으로 이 영역을 완료 처리하지 않는다.

## 2026-10-03 제작 조작·실행 구조 대조 추가

튜토리얼만 조사 범위로 취급하지 않는다. 매뉴얼의 조작 표, 에디터 문서, 런타임 생명주기, API, 셰이더 구현 설명을 실제 본문에서 확인하고 아래와 같이 코드와 대조했다. 이 표는 이번에 읽고 적용한 범위이며 전체 공식 문서 열람 완료를 뜻하지 않는다.

| 실제 확인 자료 | HB에 반영한 동작 / 구조와 남은 차이 |
|---|---|
| [UE Blueprint Editor Cheat Sheet](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine), [Blueprint Variables](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-variables-in-unreal-engine) | 핀에 변수 드롭하여 Get/Set 결정, 빈 곳 선택 메뉴, Ctrl Get/Alt Set, 기존 실행선 보존. 이벤트 제목의 실제 실행 핀, 접이식 멤버 검색, 입력 기본값 직접 편집. 우클릭·휠·주석·F7/F9 등 기존 조작 유지. 변수 카테고리 재정렬과 Ctrl 핀 연결 묶음 이동은 추가 범위다. |
| [UE Nodes](https://dev.epicgames.com/documentation/en-us/unreal-engine/nodes-in-unreal-engine) | 호환되는 수치/문자열/벡터 연결에 명시적 변환 노드 삽입. 실패·순환·참조·배열 변환은 원본 보존. 핀 드래그로 검색 후 자동 연결, 입력에서 거꾸로 연결, 데이터선 재배선 노드, 선택 정렬. 새 보조 노드는 기존 노드를 가리지 않는 가까운 공간에 배치한다. |
| [UE Placing Actors](https://dev.epicgames.com/documentation/unreal-engine/placing-actors-in-unreal-engine?lang=en-US), [Viewport Controls](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-controls-in-unreal-engine), [Unity Grid Snapping](https://docs.unity.com/en-us/engine/6000.0/manual/working-with-scenes/scenes-manage-gameobjects/grid-snapping/grid-snap) | 검색/분류가 있는 도킹 배치 창과 38개 실제 컴포넌트 조합을 연결했다. 2D XY·3D XZ 평면 드롭, 이동/회전/크기 스냅 간격·월드/로컬 좌표계, Q/W/E/R와 Space 도구 전환, Ctrl+Space 작업창 최대화. 표면 법선 스냅·최근 배치 기록·전체 Class Viewer는 남아 있다. |
| [UE Using Fresnel](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-fresnel-in-your-unreal-engine-materials) | 월드 법선·시선·반사 지수/기본 반사율을 그래프로 계산하고 색상 파라미터와 곱해 발광으로 연결한다. Fresnel/소멸/체크/흐르는 텍스처 템플릿은 실제 저장 가능한 그래프다. 머테리얼 함수·레이어·전체 좌표 변환·HLSL backend는 추가 범위다. |
| [UE Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle), [Actor Ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine), [Unity Event Function Execution Order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html) | HB의 Construction → 서비스 시작 → BeginPlay, timer/latent/timeline → Tick → 물리/충돌 흐름을 실제 VM 코드와 대조했다. HB는 FixedTick과 Tick 간격을 제공하지만 UE TickGroup/Prerequisite, Unity의 전체 PlayerLoop·OnEnable/Awake/Start 순서와 동일하지 않다. 단계별 스케줄러·컴포넌트 활성/파괴 생명주기가 별도 구현 과제다. |
| [UE Collision Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview) | 충돌 응답과 Hit/Overlap 통지를 별도 계약으로 확인했다. HB는 layer/mask/trigger와 Begin/EndOverlap/Hit를 유지하고 실제 solver 범위 미리보기를 추가했다. 현재 캡슐 AABB 근사, UE의 채널별 Block/Overlap/Ignore·독립 Hit 이벤트 설정·CCD와는 차이가 있다. |

사람의 핀 드래그와 AI의 `blueprint.connect` / `blueprint.variable.drop`은 같은 모듈을 쓴다. 배치 UI와 `scene.place`도 같은 카탈로그·컴포넌트 기본값을 쓴다. JSON revision 검사, dry-run, Undo/Redo, 실패 원본 보존, 디스크 저장까지 실제 편집기에서 확인했다.

검증: `test:authoring`, `check-authoring-editor.mjs`(격리된 authoring-qa 프로젝트), runtime/scene/2d/material/integration/windows, 공통 C++ 함수 221종. 머테리얼은 21종 추가하여 54종이며 출력 노드를 제외한 53종이 실제 WebGL에서 컴파일됐다. 실제 편집기에서 이벤트 제목 연결, 변수 Get/Set 드롭, int→string 변환, 입력값 저장, 컴포넌트 2D 강체 검색·추가, 2D 스냅 드롭, 창 최대화, 머테리얼 템플릿 적용→Undo를 확인했다. 스크린샷은 `native/build/ui-authoring-blueprint.png`, `ui-authoring-material.png`에 저장한다.

앞의 전체 확장 지도는 유지한다. 특히 네이티브 렌더러·셰이더, 정밀 물리, bone animation/IK/리타깃, UI 저작, terrain/foliage, VFX, import/cooking/패키징, profiler, 네트워크·플러그인은 이번 조작 개선으로 완료 처리하지 않는다.

## 2026-10-03 위젯·믹서·참조·계측·2D 저작 확장

큰 분야 이름만 구현하는 것으로 요구를 충족하지 않는다. 전체 분야 표를 현재 코드에 맞게 갱신하고, 실제 본문 확인과 기능별 조작/데이터/실행/미구현 차이를 [위젯·오디오 세부 대조](AUTHORING_UI_AUDIO_RESEARCH.md)와 `reference-index/detail-audit.json`에 추가했다. 목차 수집 상태는 본문 확인 상태로 올리지 않았다.

- 위젯: 14종 palette/tree/canvas/properties·해상도/anchors·계층/drag/resize·subtree clipboard/복제/삭제·Undo/저장, 변수/이벤트 연결과 실제 DOM/소유 BP 실행. C++ UI 9종·AI 계층 명령·공통 검증을 연결했다.
- 오디오: 독립 bus graph/속성/exposed/snapshot·실제 preview와 RMS·gain/filter/compressor와 실제 효과 우회·HRTF/거리·source 수명·C++ 4종/공통 BP 실행. 명시적 override와 snapshot, 동일 clip의 여러 컴포넌트, 늦은 play 정리를 검사했다.
- 자산 참조: registry→양방향 그래프, 방향별 depth/breadth·누락/순환·filter·창 자체 history·pan/zoom/키·경로 복사/CSV. Profiler는 실측 frame 구간과 draw/resource 개수·검색/집계/기록/JSON·AI 명령이다. native exclusive/GPU 시간을 구현한 것으로 표시하지 않는다.
- 2D: border 편집/가이드, SpriteRenderer Simple/Sliced/Tiled를 공통 asset/render 경로에 연결했다. 실제 WebGL에서 모서리 크기/중앙 색 픽셀과 Tiled geometry를 확인했다. Adaptive/SpriteMask/2D 조명/정밀 다각형 물리는 남아 있다.
- 합계: 정적 BP 457종, 공통 C++ 289코어+86실행 서비스, 컴포넌트 39종. 모든 엔진 API의 구현 완료 수가 아니다.

검사: 기본/API·ui-audio(실제 C++/VM/수명)·scene/2d/integration/assets/windows/server·headless·desktop 빌드/검사와 격리 편집기 명령 검사. 브라우저 fixture는 DOM 이벤트·실제 PannerNode·PCM −6dB/Mute/Solo/filter/Bypass·실제 2D GPU를 확인한다. 전체 시스템의 세부 기능과 미조사 매뉴얼/API/패키지는 계속 남아 있다.
