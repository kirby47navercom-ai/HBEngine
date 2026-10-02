# HBEngine

C++ / Win32 / DirectX 11 기반 자체 2D·2.5D·3D 게임 엔진을 만드는 프로젝트다. 현재는 **Windows x64 HBEngine.exe + WebView2 편집기 창 + 실제 C++ 빌드 호스트 + 블루프린트 실행기**를 연결했다. 편집기 창은 Win32 C++ 프로그램이고 렌더링은 Three.js/WebGL이다. DirectX 렌더러·독립 게임 패키징은 아직 구현하지 않았다.

## 현재 구현

- **엔진 실행과 프로젝트**: HBEngine.exe를 실행하면 최근 프로젝트·새 프로젝트·찾아 열기가 있는 허브를 연다. 프로젝트 루트의 `.hbproject` JSON은 UUID·엔진/파일 버전·시작 레벨·시작 BP를 지정한다. 생성 후 바로 편집기에 들어가며 기존 폴더와 파일을 덮어쓰지 않는다. 프로젝트별 복구·도킹·Project 폴더·SaveGame을 `Saved/Editor/storage.json`에 보존해 실행 포트가 달라져도 이어간다. 최초 일반 실행 또는 `--register`로 현재 Windows 사용자에게 `.hbproject` 더블클릭 연결을 등록한다.
- **444개 기본 노드**: 이벤트, 흐름 제어, 수학, 정수·논리·비교, Vec2/Vec3, 회전, 좌표 변환, 색상, 문자열, 자료형별 배열, 시간·타이머·측정, 오브젝트와 게임 서비스. 사용자 함수·매크로·변수·C++ 공개 선언에서 생성되는 노드는 이 숫자에 포함하지 않는다. [전체 이름·핀·C++ 대응 목록](docs/NODE_CATALOG.md).
- **289개 코어 C++ API + 73개 실행 서비스 API**: C++17 함수와 브라우저 실행을 제공한다. 게임 프레임워크·물리·블랙보드·행동트리·FSM·몽타주·시퀀스·경로 이동·인지·파티클·태그를 같은 플레이 월드에 연결한다. 추가한 221개 함수는 모두 실제 C++/JS 결과를 비교한다. 자료형별 배열 복사 연산은 원본을 유지하며, 변수 변경은 Set/Add/Remove 실행 노드로 구분한다.
- **블루프린트 실행**: Construction → BeginPlay → Tick·입력·Overlap → EndPlay, 함수·매크로, 조건·반복·중단, Delay·재시작 지연, 타이머·Timeline, 변수·배열, 디스패처·인터페이스 호출. 중단점·Step·Continue와 실제 계산한 핀 값을 지원한다. Stop은 편집 장면을 복원한다.
- **사용자 C++ 실행**: Project에서 C++ 클래스를 만들고 설치된 Visual Studio(또는 VS Code)에서 .h/.cpp를 편집한다. C++ 클래스 기반 블루프린트에서 파일 변경을 다시 읽어 g++로 빌드한다. 공개 함수·속성·static 함수·반환·출력 참조·객체 ID를 연결하고 C++ 이벤트를 BP로 전달한다. C++ 변환 변경은 실행 월드에 반영한다. [실행 예제](prototype/examples/BP_NativeDoor.blueprint.json).
- **그래프 제작**: 한글/영어 우클릭 검색, 핀 연결·분할·합치기·변수 승격, 다중/영역 선택, 복사·복제·Undo/Redo, 함수·매크로 추출, Construction, 주석·세부 속성·모든 내부 그래프 검색. 그래프당 1,000개 노드를 저장할 수 있다.
- **실제 Project**: 디스크 폴더 트리·이름/타입/경로 목록·타일 전환·새 폴더·이름 변경·안정적인 에셋 ID, 파일명/타입/파일 내용·하위 폴더 검색, Ctrl/Shift 다중 선택과 선택 열기. 표시 방식은 프로젝트별로 저장한다. 다중 파일·폴더 선택과 편집기 어디든 외부 파일/폴더 드롭을 지원한다. 드롭은 현재 Project 폴더에 즉시 가져온다. 중복 이름은 새 이름으로 보존한다.
- **도킹**: 탭 이동, 상하좌우 분할, 경계 크기 변경, 최대화·복원·배치 초기화. 에셋마다 독립 문서 탭과 저장·Undo·복구 상태를 가진다. 활성 에셋의 그래프·컴포넌트 뷰포트·Timeline과 Project/Console을 분할해 볼 수 있다. C++ 편집은 외부 IDE로 연다. 추가 뷰포트는 독립 카메라와 Perspective/Top/Front를 제공한다. 이미지·모델·텍스트 파일은 각각 문서로 열린다.
- **에셋 생성**: 폴더 우클릭에서 Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent 부모의 BP·C++ 클래스, Input Action·Input Mapping Context·머테리얼·트랜스폼 애니메이션·커브·데이터·레벨을 실제 파일로 만든다. 입력 에셋의 자료형·키/축/배율·컨텍스트 우선순위가 실행기에 연결된다.
- **Timeline**: 별도 커브 편집기, Float/Vector/Color/Event 트랙, XYZ/RGBA, 키·시간·값·접선·보간, 스크럽·역방향·길이·Loop·Autoplay·Rate·시간 배율 무시. Play/Play from Start/Stop/Reverse/Reverse from End/Set New Time와 Update/Finished를 실행한다.
- **트랜스폼 애니메이션 실행**: 독립 Animation 에셋의 position/rotation/scale Vector 트랙을 기존 Play Animation/Stop Animation 노드로 대상 오브젝트에 적용한다. 회전은 XYZ Euler degree이고 트랙 값은 가산 이동이 아니라 대상 속성에 덮어쓴다. 반복, 재생 속도, 마지막 키 길이, 시간 배율 무시를 적용한다. 같은 이름의 모델 내장 클립이 있으면 그 클립을 우선 재생한다. 독립 Animation의 이벤트 트랙·뼈/상태 머신은 아직 실행하지 않는다.
- **AI·상태·연출 제작**: 블랙보드·행동트리·FSM·몽타주·레벨 시퀀스를 독립 파일과 전용 편집기로 만든다. 행동트리의 상태·현재 FSM 상태·블랙보드 실행 값을 플레이 중 확인한다. 몽타주 섹션/다음 섹션/Notify/슬롯과 시퀀스의 대상 바인딩·11종 트랙·키/클립·프레임 스냅·XYZ 속성·실제 장면 스크럽을 연결했다.
- **내비게이션·인지·효과**: XY/XZ 격자 A*와 에이전트/장애물, 시야/차폐/소리/기억과 블랙보드 연동, 계층 태그/Any·All·None 질의, CPU 파티클의 Main/Emission/Shape/Velocity/Force/Color/Size/Renderer, 실제 표면 데칼 투영을 제공한다. 다각형 NavMesh·군중 회피·입자 충돌/트레일·뼈별 슬롯 블렌딩은 남아 있다.
- **장면과 에셋 사용**: 도형·광원·Transform, 직교 2D와 3D 뷰, 하늘·햇빛·구름·안개·맵 템플릿. OBJ/GLTF/GLB/FBX 미리보기·배치, 모델에 포함된 애니메이션, 브라우저 지원 영상·오디오, 기본 PBR 표면·광원·위젯·게임 저장을 연결한다.

Unreal/Unity의 외형뿐 아니라 제작 흐름·실행 의미·키보드/포인터·창 배치의 공식 근거와 남은 범위는 [전체 분야 조사와 구현 대조](docs/REFERENCE_COVERAGE.md), [전체 엔진 분석](docs/ENGINE_REFERENCE_ANALYSIS.md), [인터랙션 계약과 검증 상태](docs/EDITOR_INTERACTION_SPEC.md), [BP/C++ 구현 기준](docs/BLUEPRINT_SPEC.md), [장기 엔진 기획](docs/ENGINE_PLAN.md)에 있다.

## 실행과 검사

Windows에서 **HBEngine.exe를 더블클릭**하면 프로젝트 허브가 열린다. `.hbproject`는 더블클릭하거나 EXE 위로 끌어 열 수 있고, 명령줄에서도 프로젝트 파일의 절대경로를 넘길 수 있다. 배포 폴더 `dist/HBEngine`에는 Node.js와 WebView2Loader.dll, 편집기 파일, 예제 프로젝트, 라이선스를 동봉한다. 이 폴더 전체를 함께 옮겨야 한다. 저장소 루트의 `HBEngine.exe`는 저장소의 편집기 파일과 `dist/HBEngine`의 동봉 런타임·loader를 사용한다.

Microsoft WebView2 Runtime이 필요하다. 없으면 [공식 Runtime 다운로드](https://developer.microsoft.com/microsoft-edge/webview2/)에서 설치한다. 배포 폴더를 실행할 때 Node.js/npm을 따로 설치할 필요는 없다. 사용자 C++ 코드를 빌드하려면 C++17 컴파일러가 별도로 필요하다.

소스에서 Windows x64 EXE를 만들려면 Node.js 22 이상과 g++/windres를 준비한다.

```powershell
npm install
npm run desktop:build
.\HBEngine.exe
```

빌드는 `HBEngine.exe`와 `dist/HBEngine/HBEngine.exe`를 만든다. 빌드에 사용하는 Node 실행 파일을 동봉하고 공식 WebView2 SDK 1.0.4258.31의 x64 loader를 사용한다. Node·WebView2 SDK·Three 고지는 `dist/HBEngine/licenses`에 포함한다. 실행 로그·최근 프로젝트·WebView2 데이터는 기본적으로 `%LOCALAPPDATA%/HBEngine`에 둔다. 파일 연결만 다시 등록하려면 `.\HBEngine.exe --register`를 실행한다.

브라우저 개발 미리보기는 다음 명령으로 실행한다.

```powershell
npm install
npm run dev
```

주소는 http://127.0.0.1:5173 이다. 첫 dev 실행은 Projects/QuietGarden에 예제 에셋·소스와 `.hbproject`를 만든다. 기존 파일은 덮어쓰지 않는다. `HB_PROJECT_DIR`로 다른 프로젝트 폴더를 지정할 수 있다. 데스크톱 실행은 충돌하지 않는 로컬 포트를 선택한다. 프로젝트와 실행 파일·배포 폴더·빌드 캐시는 Git에서 제외한다.

C++17 g++이 필요하다. Windows에서는 설치된 MSYS2 UCRT64 컴파일러를 찾고 다른 경로는 CXX로 지정한다. 최초 빌드 시 공식 nlohmann/json 3.12.0 단일 헤더를 내려받아 빌드 폴더에 둔다.

| 명령 | 검사 |
| --- | --- |
| npm test | 전체 노드·타입·JSON·분할 핀·함수/매크로 추출·공통 API·444종 한 그래프 저장 |
| npm run api:check | 공통 선언·생성 헤더·노드 메타데이터 일치 |
| npm run test:library | 새 221개 함수의 실제 C++/JS 결과 비교·배열/정수 오류 |
| npm run test:native | 기존 공통 C++ 코어 실제 컴파일·호출 |
| npm run test:runtime | 이벤트·반복·지연·Timeline·트랜스폼 애니메이션 재생/정지/반복/시간 배율·중단점 이어가기·실제 C++→BP |
| npm run test:host | 사용자 C++ 빌드·함수/속성/객체/이벤트·잘못된 반환/컴파일 진단 |
| npm run test:project | 실제 파일·다중 가져오기·폴더 드롭 열거·내용 검색·재열기·원본 보존 |
| npm run test:gameplay | 행동트리·블랙보드·FSM·몽타주·11종 시퀀스·데칼 투영·C++ 서명/실행·실패 보존 |
| npm run test:systems | 2D/3D A*·장애물/에이전트 크기·시야/소리·태그·파티클·C++ 명령/객체 배열·두 예제의 600프레임 실행 |
| npm run test:assets | 확장 에셋·부모 클래스 실제 C++ 빌드·독립 문서 저장·참조 재열기·입력·다중 BP 실행 |
| npm run test:server | 기본 Project의 dev 서버 실행 중 HTTP 범위 응답·Origin/헤더·에셋 실행 차단 |
| npm run test:hub-ui | 실제 허브 핸들러의 검색·선택·열기·모달·키보드·오류/입력 보존 |
| npm run desktop:build | Windows x64 EXE·아이콘·Node/loader 동봉·라이선스·외부 MSYS2 런타임 DLL 의존성 검사 |
| npm run test:launcher | 프로젝트 JSON/UUID·한글/공백 경로·원본 보호·허브/API·두 프로젝트 전환·동적 포트·프로젝트별 C++ 소유 상태 |
| npm run test:session | 프로젝트 ID별 복구/도킹/폴더/SaveGame 분리·기존 기본 프로젝트의 1회 이관·원본 보존·디스크 복구 연결 |
| npm run test:desktop | 실제 배포/루트 EXE의 WebView2 내 편집기/허브 JS 초기화·실제 닫기 흐름·다른 작업 폴더/프로젝트 경로·비정상 descriptor 거부·소유 서버 정리 |

npm run api:generate는 공통 라이브러리 헤더와 노드 메타데이터를 재생성한다. Library.hpp는 추적하고 core-api.js는 설치 시 생성한다.

데스크톱 smoke는 내장 WebView2 탐색 이후 허브/편집기 JS의 준비 메시지와 실제 닫기 핸들러·종료 뒤 서버 정리를 확인한다. 모든 편집 조작은 별도의 화면 검증이 필요하다. 공식 실행/프로젝트 근거와 SDK 배포 범위는 [엔진 분석](docs/ENGINE_REFERENCE_ANALYSIS.md)에 적었다.

## 조작과 저장

| 작업 | 조작 |
| --- | --- |
| 저장 / Undo / Redo | Ctrl S / Ctrl Z / Ctrl Y 또는 Ctrl Shift Z |
| 모두 저장 / 파일 탭 전환·닫기 | Ctrl Shift S / Ctrl Tab·Ctrl Shift Tab / Ctrl W·중간 클릭 |
| 그래프 이동 / 확대 | RMB·MMB 드래그 / 휠, Ctrl+휠로 100% 초과 |
| 노드 생성 / 빠른 생성 | 빈 곳 RMB / B·D·S·G·F·M·N·O·P를 누른 채 빈 곳 클릭 |
| 다중 선택 / 복사·붙여넣기·복제 | Ctrl·Shift 클릭, 사각 선택, Ctrl A / Ctrl C·V·D |
| 주석 / 이름 / 중단점 | C / F2 / F9 |
| 검색 / 검증 / 내부 그래프 | Ctrl F / F7 / 호출 노드 두 번 클릭 |
| 창 배치 | 탭 드래그·RMB 메뉴·경계 드래그·창 메뉴 |
| 에셋 작업 | 외부 다중 드롭·선택 열기·Ctrl F·F2·Backspace |

Ctrl S는 현재 에셋 문서를 **Project 파일**에 저장하고 Ctrl Shift S는 수정된 열린 문서를 모두 저장한다. 문서 복구·배치·Project 폴더·SaveGame은 프로젝트 UUID별로 `Saved/Editor/storage.json`에 저장한다. 프로젝트 전환/종료는 디스크 반영을 기다리며 localStorage는 기존 백업·복원 경로로 유지한다. C++ 원문은 외부 IDE에서 저장하고 BP의 C++ 빌드로 다시 읽는다. 열린 일반 텍스트 문서는 현재 문서 저장이나 자체 저장 버튼을 사용한다. BP는 JSON 내보내기·검증 후 불러오기가 가능하고 AI도 안정적인 ID·타입·연결을 편집할 수 있다. 코드/검색 입력에서는 문자 선택을 허용하고 그래프·도킹 조작에서는 브라우저 글자 선택을 차단한다.

## 공통 C++ 사용

```cpp
#include <HBEngine/Game.hpp>
hb::Actor actor;
auto direction = hb::VectorMath::NormalizeVector({3, 4, 0});
hb::Scene::AddOffset(&actor, direction);
auto rotation = hb::Extended::LookAtRotation({0, 0, 0}, {1, 0, 1});
auto timer = hb::Timers::SetTimer(1.0f, false, "OnTimer");
hb::AdvanceFrame(0.25f);
auto remaining = hb::Timers::GetTimerRemaining(timer);
```

공통 API 289개는 C++에서 직접 사용할 수 있다. BP 이벤트/반복/변수 조작은 VM 실행 구조이며, 나머지 브라우저 게임 서비스 모두에 같은 native API가 존재하는 것은 아니다. 노드별 대응은 카탈로그에 적었다.

## 확장된 제작 흐름과 AI

2D Sprite crop/pivot/PPU·그리드 분할, Flipbook 프레임, Tilemap 브러시/지우기/사각형/채우기·레이어·충돌 편집을 독립 에디터로 연다. 2D 문서는 전용 캔버스·팔레트·속성을 사용하고 중복 전역 패널을 숨긴다. 장면의 39종 컴포넌트, Controller/Pawn/GameMode/State, 2D/3D 고정 물리·접촉·중력·입력·점프를 실제 플레이로 연결한다. 머테리얼 그래프 33종은 타입 검증과 GLSL 생성 후 GPU 재질에 적용한다.

BP Open Scene과 C++ `hb::Scene::Open`은 다음 장면을 검증하고 프레임 경계에서 이전 월드의 EndPlay·타이머·입력 정리 후 새 월드를 시작한다. Stop하면 전환 전의 편집 장면과 환경을 복원한다. 화면 없는 실행기도 같은 준비/전환 경로를 사용하며 `sceneHistory`에 전환 장면과 프레임을 남긴다.

AI도 현재 미저장 문서를 읽고 revision 조건부 부분 변경·Undo·저장·C++ 빌드·실행 상태 조회를 사용할 수 있다. `npm run engine -- clients`로 편집기를 찾고 `npm run engine -- schema`로 실제 에셋/컴포넌트/노드 정의를 읽는다. `npm run run:project -- <project.hbproject> [scenario.json]`은 같은 BP/물리/C++를 화면 없이 실행해 JSON 결과를 반환한다. 상세 명령은 [AI API](docs/AI_ENGINE_API.md), 공식 문서 대조와 남은 전체 작업은 [제작 흐름 분석](docs/ENGINE_WORKFLOW_RESEARCH.md)에 있다.

추가 검사: `test:windows`, `test:scene`, `test:2d`, `test:material`, `test:integration`, `test:headless`, `test:editor-api`. 마지막 검사는 별도의 `integration-qa-*` 프로젝트를 연 편집기에서만 실행한다.

## 현재 한계

Windows 엔진 실행 파일과 편집기 배포 폴더는 구현했다. 현재 WebView2가 HTML/JS 편집기를 표시하고 Node가 로컬 서버와 C++ 빌드 호스트를 제공한다. DirectX 11·HLSL backend·native 물리/3D 음향·임의 형식의 엔진 변환·독립 게임 배포는 미구현이다. 미지원 모델/영상도 원본을 보존하지만 미리보기에는 해당 임포터/브라우저 코덱이 필요하다. 프로젝트 생성은 기본 예제·빈 3D·2D 플랫폼·3D 플레이어·2D/3D AI와 효과 템플릿을 제공한다. 전체 프로젝트 버전 업그레이드·여러 엔진 버전 선택은 미구현이다.

문서 저장은 디스크의 이전 내용과 대조해 외부 변경을 거부하고 Saved/Backups에 원본을 보관한다. 자동 충돌 병합·다중 파일 트랜잭션은 지원하지 않는다.

BP/Scene/Material/Animation/Curve/IA/IMC/Data/Blackboard/BehaviorTree/FSM/Montage/Sequence 등은 파일마다 독립 문서 모델을 가지며 여러 이미지/모델/텍스트 문서와 뷰포트도 열 수 있다. BP→BP 상속, 사용자 Struct/Enum/Set/Map, 로컬 변수, 네트워크, 계층형 상태 머신·애니메이션 블렌드 트리, 프리팹 중첩·override는 계속 구현할 범위다. 트랜스폼 애니메이션은 position/rotation/scale만 적용하며 독립 Transform Animation의 이벤트 트랙·임의 컴포넌트 속성·뼈 저작/리타깃·포즈 블렌딩은 미지원이다. 가져온 모델의 내장 skeletal 클립은 재생하며 몽타주 시간으로 샘플링할 수 있다. 추가 C++ 종속 파일·멀티 파일 프로젝트·DLL 핫 리로드는 미지원이다. C++→BP 이벤트는 C++ 호출 종료 후 전달하며 임의 반환값을 동기적으로 BP에서 C++에 돌려주는 override는 미지원이다.

## Git

공개 저장소 계정은 kirby47navercom-ai이다. author와 committer를 같은 계정으로 유지하고 한글 제목·본문에 변경과 검증을 기록한다.
