# HBEngine

C++ / Win32 / DirectX 11 기반 자체 2D·2.5D·3D 게임 엔진을 만드는 프로젝트다. 현재는 **브라우저 편집기 + 실제 C++ 빌드 호스트 + 블루프린트 실행기**를 연결했다. 렌더링은 Three.js/WebGL이며 DirectX 엔진·게임 패키징은 아직 구현하지 않았다.

## 현재 구현

- **373개 기본 노드**: 이벤트, 흐름 제어, 수학, 정수·논리·비교, Vec2/Vec3, 회전, 좌표 변환, 색상, 문자열, 자료형별 배열, 시간·타이머·측정, 오브젝트와 게임 서비스. 사용자 함수·매크로·변수·C++ 공개 선언에서 생성되는 노드는 이 숫자에 포함하지 않는다. [전체 이름·핀·C++ 대응 목록](docs/NODE_CATALOG.md).
- **289개 공통 C++ API**: 실제 C++17 함수와 브라우저 실행을 제공한다. 추가한 221개 함수는 모두 실제 C++/JS 결과를 비교한다. 자료형별 배열 복사 연산은 원본을 유지하며, 변수 변경은 Set/Add/Remove 실행 노드로 구분한다.
- **블루프린트 실행**: Construction → BeginPlay → Tick·입력·Overlap → EndPlay, 함수·매크로, 조건·반복·중단, Delay·재시작 지연, 타이머·Timeline, 변수·배열, 디스패처·인터페이스 호출. 중단점·Step·Continue와 실제 계산한 핀 값을 지원한다. Stop은 편집 장면을 복원한다.
- **사용자 C++ 실행**: Project에서 C++ 클래스를 만들고 설치된 Visual Studio(또는 VS Code)에서 .h/.cpp를 편집한다. C++ 클래스 기반 블루프린트에서 파일 변경을 다시 읽어 g++로 빌드한다. 공개 함수·속성·static 함수·반환·출력 참조·객체 ID를 연결하고 C++ 이벤트를 BP로 전달한다. C++ 변환 변경은 실행 월드에 반영한다. [실행 예제](prototype/examples/BP_NativeDoor.blueprint.json).
- **그래프 제작**: 한글/영어 우클릭 검색, 핀 연결·분할·합치기·변수 승격, 다중/영역 선택, 복사·복제·Undo/Redo, 함수·매크로 추출, Construction, 주석·세부 속성·모든 내부 그래프 검색. 그래프당 1,000개 노드를 저장할 수 있다.
- **실제 Project**: 디스크 폴더 트리·새 폴더·이름 변경·안정적인 에셋 ID, 파일명/타입/파일 내용·하위 폴더 검색, Ctrl/Shift 다중 선택과 선택 열기. 다중 파일·폴더 선택과 편집기 어디든 외부 파일/폴더 드롭을 지원한다. 드롭은 현재 Project 폴더에 즉시 가져온다. 중복 이름은 새 이름으로 보존한다.
- **도킹**: 탭 이동, 상하좌우 분할, 경계 크기 변경, 최대화·복원·배치 초기화. 에셋마다 독립 문서 탭과 저장·Undo·복구 상태를 가진다. 활성 에셋의 그래프·컴포넌트 뷰포트·Timeline과 Project/Console을 분할해 볼 수 있다. C++ 편집은 외부 IDE로 연다. 추가 뷰포트는 독립 카메라와 Perspective/Top/Front를 제공한다. 이미지·모델·텍스트 파일은 각각 문서로 열린다.
- **에셋 생성**: 폴더 우클릭에서 Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent 부모의 BP·C++ 클래스, Input Action·Input Mapping Context·머테리얼·트랜스폼 애니메이션·커브·데이터·레벨을 실제 파일로 만든다. 입력 에셋의 자료형·키/축/배율·컨텍스트 우선순위가 실행기에 연결된다.
- **Timeline**: 별도 커브 편집기, Float/Vector/Color/Event 트랙, XYZ/RGBA, 키·시간·값·접선·보간, 스크럽·역방향·길이·Loop·Autoplay·Rate·시간 배율 무시. Play/Play from Start/Stop/Reverse/Reverse from End/Set New Time와 Update/Finished를 실행한다.
- **트랜스폼 애니메이션 실행**: 독립 Animation 에셋의 position/rotation/scale Vector 트랙을 기존 Play Animation/Stop Animation 노드로 대상 오브젝트에 적용한다. 회전은 XYZ Euler degree이고 트랙 값은 가산 이동이 아니라 대상 속성에 덮어쓴다. 반복, 재생 속도, 마지막 키 길이, 시간 배율 무시를 적용한다. 같은 이름의 모델 내장 클립이 있으면 그 클립을 우선 재생한다. 독립 Animation의 이벤트 트랙·뼈/상태 머신은 아직 실행하지 않는다.
- **장면과 에셋 사용**: 도형·광원·Transform, 직교 2D와 3D 뷰, 하늘·햇빛·구름·안개·맵 템플릿. OBJ/GLTF/GLB/FBX 미리보기·배치, 모델에 포함된 애니메이션, 브라우저 지원 영상·오디오, 기본 PBR 표면·광원·위젯·게임 저장을 연결한다.

Unreal/Unity의 외형뿐 아니라 제작 흐름·실행 의미·키보드/포인터·창 배치의 공식 근거와 남은 범위는 [전체 분야 조사와 구현 대조](docs/REFERENCE_COVERAGE.md), [전체 엔진 분석](docs/ENGINE_REFERENCE_ANALYSIS.md), [인터랙션 계약과 검증 상태](docs/EDITOR_INTERACTION_SPEC.md), [BP/C++ 구현 기준](docs/BLUEPRINT_SPEC.md), [장기 엔진 기획](docs/ENGINE_PLAN.md)에 있다.

## 실행과 검사

Node.js 22 이상:

```powershell
npm install
npm run dev
```

주소는 http://127.0.0.1:5173 이다. 첫 실행은 Projects/QuietGarden에 예제 에셋과 소스를 만든다. 기존 파일은 덮어쓰지 않는다. HB_PROJECT_DIR로 다른 프로젝트 폴더를 지정할 수 있다. 프로젝트와 빌드 산출물은 Git에서 제외한다.

C++17 g++이 필요하다. Windows에서는 설치된 MSYS2 UCRT64 컴파일러를 찾고 다른 경로는 CXX로 지정한다. 최초 빌드 시 공식 nlohmann/json 3.12.0 단일 헤더를 내려받아 빌드 폴더에 둔다.

| 명령 | 검사 |
| --- | --- |
| npm test | 전체 노드·타입·JSON·분할 핀·함수/매크로 추출·공통 API·373종 한 그래프 저장 |
| npm run api:check | 공통 선언·생성 헤더·노드 메타데이터 일치 |
| npm run test:library | 새 221개 함수의 실제 C++/JS 결과 비교·배열/정수 오류 |
| npm run test:native | 기존 공통 C++ 코어 실제 컴파일·호출 |
| npm run test:runtime | 이벤트·반복·지연·Timeline·트랜스폼 애니메이션 재생/정지/반복/시간 배율·중단점 이어가기·실제 C++→BP |
| npm run test:host | 사용자 C++ 빌드·함수/속성/객체/이벤트·잘못된 반환/컴파일 진단 |
| npm run test:project | 실제 파일·다중 가져오기·폴더 드롭 열거·내용 검색·재열기·원본 보존 |
| npm run test:assets | 에셋 8종·부모 7종 실제 C++ 빌드·독립 문서 저장·참조 재열기·입력·다중 BP 실행 |
| npm run test:server | 기본 Project의 dev 서버 실행 중 HTTP 범위 응답·Origin/헤더·에셋 실행 차단 |

npm run api:generate는 공통 라이브러리 헤더와 노드 메타데이터를 재생성한다. Library.hpp는 추적하고 core-api.js는 설치 시 생성한다.

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

Ctrl S는 현재 에셋 문서를 **Project 파일**에 저장하고 Ctrl Shift S는 수정된 열린 문서를 모두 저장한다. 문서별 브라우저 복구 데이터도 유지한다. C++ 원문은 외부 IDE에서 저장하고 BP의 C++ 빌드로 다시 읽는다. 열린 일반 텍스트 문서는 현재 문서 저장이나 자체 저장 버튼을 사용한다. BP는 JSON 내보내기·검증 후 불러오기가 가능하고 AI도 안정적인 ID·타입·연결을 편집할 수 있다. 코드/검색 입력에서는 문자 선택을 허용하고 그래프·도킹 조작에서는 브라우저 글자 선택을 차단한다.

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

## 현재 한계

DirectX 11·HLSL/머테리얼 그래프 컴파일·native 물리/3D 음향·임의 형식의 엔진 변환·게임 배포는 미구현이다. 미지원 모델/영상도 원본을 보존하지만 미리보기에는 해당 임포터/브라우저 코덱이 필요하다.

BP/Scene/Material/Animation/Curve/IA/IMC/Data는 파일마다 독립 문서 모델을 가지며 여러 이미지/모델/텍스트 문서와 뷰포트도 열 수 있다. BP→BP 상속, 사용자 Struct/Enum/Set/Map, 로컬 변수, 네트워크, Animation 상태 머신, Prefab은 계속 구현할 범위다. 트랜스폼 애니메이션은 position/rotation/scale만 적용하며 독립 Animation의 이벤트 트랙·임의 컴포넌트 속성·Skeletal/리타깃·블렌딩은 미지원이다. 추가 C++ 종속 파일·멀티 파일 프로젝트·DLL 핫 리로드는 미지원이다. C++→BP 이벤트는 C++ 호출 종료 후 전달하며 임의 반환값을 동기적으로 BP에서 C++에 돌려주는 override는 미지원이다.

## Git

공개 저장소 계정은 kirby47navercom-ai이다. author와 committer를 같은 계정으로 유지하고 한글 제목·본문에 변경과 검증을 기록한다.
