# 엔진 제작 흐름 조사와 구현 대조

기록일: 2026-10-02. 목표는 Unreal/Unity의 외형을 흉내 내는 창 목록이 아니라, 사람이 반복해서 게임을 제작할 수 있는 내부 계약이다. 사용자가 든 사례를 범위의 상한으로 삼지 않는다. 2D, 2.5D, 3D와 AI 자동화는 모든 계층에서 함께 다룬다.

기존 `ENGINE_REFERENCE_ANALYSIS.md`, `REFERENCE_COVERAGE.md`, `reference-index/`와 이어지는 기록이다. 문서 목록 수집, 본문 확인, 구현, 실제 실행 검증은 서로 다른 상태다. Unreal/Unity의 문서 전체를 읽었다거나 상용 엔진 수준으로 완성했다고 표시하지 않는다.

## 자료에서 확인한 구조와 HB 결정

| 흐름 | 본문에서 확인한 원칙 | 구현 결정과 증거 |
|---|---|---|
| 에셋 생명주기 | Unity는 원본의 ID와 import 설정을 메타데이터에 보존하고 Library의 처리 결과와 구분한다. UE는 감시 디렉터리와 안정화 대기 후 원본 변경을 재가져온다. | 기존 `.hbassets.json`을 유지하며 UUID, 원본 해시, 의존성과 역참조, 누락 진단, 영향 전파를 추가. 원본 덮어쓰기 전 대조·백업. UI 우클릭 재가져오기/참조 보기. 자동 포맷 변환이나 폴더 감시까지 구현했다고 표시하지 않음. |
| 에디터 문맥 | UE의 Content Browser·Outliner·Details와 Unity의 Project·Hierarchy·Inspector는 선택 대상과 작업 문맥을 유지한다. | 문서별 에디터/Undo, 여러 콘텐츠 브라우저 각각의 폴더·검색·필터·선택·탐색 기록. 탭줄에 놓기는 병합, 본문 가장자리는 분할. 머테리얼 전용 미리보기와 그래프. |
| 오브젝트 구성 | Unity의 GameObject는 컴포넌트 구성으로 동작하고, UE는 Actor/Component와 Controller/Pawn의 역할을 구분한다. | `scene-components.js`의 27개 정의를 UI·검증·기본 오브젝트·실행이 공유. Controller 공통 부모, Player/AI Controller, GameMode/State/PlayerState/Pawn 연결. 컴포넌트 체크가 실제 렌더/물리 활성 상태에 반영됨. |
| 실행 순서 | 생성/초기화/BeginPlay, 프레임 갱신과 고정 물리 갱신은 구분해야 한다. | 모든 Construction 이후 서비스 초기화, 이후 BeginPlay. 고정 스텝마다 FixedUpdate와 접촉 이벤트. 편집 원본을 복제한 플레이 월드, 종료/실패 복구. |
| 물리와 제어 | 충돌 반응, trigger, 레이어, 물리 재질, 동적/키네마틱 바디, 입력과 접지 판단은 연동되어야 한다. | 2D/3D 바디·중력·힘·충격량·마찰·반발·질량·축 고정·mask, Overlap/Hit. 부모 아래 바디의 월드 이동. [Unity 물리 재질 혼합 순서](https://docs.unity3d.com/6000.0/Documentation/Manual/collider-surfaces-combine.html)에 따라 양쪽 순서와 무관한 average/min/multiply/max 적용. 캡슐은 현재 경계 상자로 근사하며 CCD/회전 동역학/정밀 경사 처리는 남음. |
| 2D 제작 | Paper2D는 Sprite/Flipbook/TileSet/TileMap을, Unity는 팔레트와 Brush/Erase/Fill 도구로 이미지→레벨 제작을 이어준다. | 스프라이트 crop·pivot·PPU·grid slicing, 프레임 애니메이션, 타일 팔레트·레이어·브러시/지우기/사각형/채우기, 레이어 충돌. 배치→실제 sprite/tile 렌더→고정 스텝 충돌. 2D 시작 템플릿과 추적 카메라. |
| 머테리얼 | 그래프는 핀의 타입과 연결로 실행 가능한 셰이더를 만들고 인스턴스는 부모의 파라미터를 재사용한다. | 33개 노드, GLSL 생성, 실제 MeshPhysicalMaterial에 연결. UV/texture/math/normal/emissive/opacity/AO/coat/transmission/IOR. 인스턴스 상속·override 검증. HLSL/DX11 backend는 남음. |
| C++와 BP | C++ 공개 클래스·속성·함수와 Blueprint는 같은 게임 객체를 제어해야 한다. | 기존 289개 공통 API에 19개 EngineService API를 연결. C++의 게임 역할 조회·Possess·힘·속도·월드/로컬 위치를 실제 플레이 VM에 적용. 정적 카탈로그 390개와 C++ 생성 서명 대조. |
| 장면 전환 | UE Open Level과 Unity SceneManager는 다음 장면 로드와 기존 월드의 종료를 연결한다. | Open Scene 노드와 `hb::Scene::Open`은 같은 검증/전환 요청을 사용. 프레임 경계에서 EndPlay(LevelTransition)·타이머/입력/물리/오디오/위젯 정리 후 새 월드 Construction→BeginPlay. 종료 시 편집 원본의 장면·환경·2D/3D 설정 복구. |
| 사람과 AI | 사람이 보는 라벨과 머신 식별자를 분리하고 저장되지 않은 상태도 관찰할 수 있어야 한다. | `/api/schema`가 실제 정의에서 생성됨. 현재 편집 데이터 revision 기반 patch·Undo·save·play·state API와 CLI. JSON 전체 치환에만 의존하지 않고 조건부 부분 변경 가능. `AI_ENGINE_API.md` 참조. |

자료: [Unity Asset metadata](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetMetadata.html), [UE Auto Reimport](https://dev.epicgames.com/documentation/en-us/unreal-engine/reimporting-assets-automatically-in-unreal-engine), [UE Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine), [Unity Components](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingComponents.html), [Unity execution order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html), [UE Collision Response](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine).

2D 자료: [Paper2D Sprite Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-sprite-editor-in-unreal-engine), [Paper2D TileSets/TileMaps](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-tile-sets-and-tile-maps-in-unreal-engine), [Unity Tile Palette assets](https://docs.unity.com/en-us/engine/6000.3/manual/unity2d/tilemaps/create-tile-palette/assets), [Andy Touch의 이미지→레벨 제작 설명](https://unity.com/blog/games/2d-tilemap-asset-workflow-from-image-to-level), [Unity Learn 제작 도구 실습](https://learn.unity.com/tutorial/create-a-world-to-explore).

원저자 해설도 검토했다: [Tom Looman의 Gameplay Framework](https://tomlooman.com/unreal-engine-gameplay-framework/), [Catlike Coding의 Physics 이동](https://catlikecoding.com/unity/tutorials/movement/physics/), [Unity의 ScriptableObject 구조 설명](https://unity.com/how-to/architect-game-code-scriptable-objects), [Unity의 프로젝트 확장 구조 설명](https://unity.com/how-to/how-architect-code-your-project-scales). 기술 계약의 기준은 공식 API/매뉴얼이며 해설은 제작 의도와 실패 사례를 이해하는 자료로 사용한다.

## 실행 증거

- `test:windows`: 탭 병합/분할, 기존 비율 보존, 독립 브라우저 상태와 폴더 이력.
- `test:scene`: 계층 복사와 부모 없는 자식 복사의 월드 자세 보존, 다중 변환의 중복 이동 방지, 27종 컴포넌트와 2D/3D 접촉·제어·FixedUpdate.
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
| 물리/게임플레이 | 소규모 pair scan, 캡슐 AABB 근사, 정밀 controller·navigation 부족 | 경사/계단·빠른 물체·트리거 경계·복수 캐릭터·NavMesh 경로·AI 제어 시나리오 |
| 2D | 기초 Sprite/Tile/Flipbook 실제 흐름 있음. 9-slice·자동 타일·polygon collider·2D 상태 머신 부족 | 다중 atlas와 실제 게임맵, 스프라이트 정렬/투명도·애니메이션 전이·타일 충돌 편집 |
| 애니메이션 | transform curves, sprite clips, 가져온 모델 clip 재생. skeletal authoring·blend tree·retarget·IK 부족 | skeleton/clip/state machine 각각 독립 에디터, 전이·이벤트·root motion·리타깃 시각 검증 |
| 렌더/제작 도구 | PBR 기초, 환경광/하늘, 원시 도형. terrain·foliage·LOD·occlusion·particles·postprocessing 부족 | 실제 레벨 저작, 표현 차이와 GPU 비용, drawcall/메모리 측정 |
| 게임 UI/오디오 | 간단 위젯·AudioSource 실행. 레이아웃 authoring, 접근성·로컬라이즈, mixer·3D 음향 부족 | UI prefab·앵커·포커스/게임패드·음량 bus·공간 attenuation/occlusion 실제 게임에서 확인 |
| 디버깅/자동화 | BP breakpoint·로그·AI 상태 API. 같은 VM/C++의 headless 로직 검사 연결. profiler·call stack 확장 부족 | CPU/GPU/메모리 원인 추적, C++ 디버거 연결, 재현 가능한 게임 시나리오 자동 실행 |
| 확장/협업 | 데이터 버전 1과 로컬 파일. 플러그인/module ABI, 네트워크 replication, 협업 충돌 해결 부족 | 플러그인 로드/해제·버전 호환, host/client 일관성, 프로젝트 복제/병합/복구 |

이 지도를 유지하면서 새로 조사한 기능의 사용자 흐름, 데이터 소유자, 실행 서비스, 실패/Undo/재열기, AI 계약을 함께 적는다. 기능 개수는 완성도의 대용 지표가 아니다.

장면 전환 근거: [UE 레벨 전환 제작 실습](https://dev.epicgames.com/documentation/en-us/unreal-engine/designer-10-complete-the-level-in-unreal-engine), [Unity SceneManager.LoadSceneAsync](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html). HB는 현재 단일 월드 교체를 제공하며 Unity Additive나 UE level streaming과 같은 기능으로 표시하지 않는다.
