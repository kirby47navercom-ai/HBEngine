# HBEngine

사용자의 후속 구현 지시에 따라 [누적 작업·검증·설치 순서](docs/WORK_ORDER_051.md)로 진행한다. Unity·Unreal 전체 공식 본문·API 분석 gate는 false이며 일부 구현이나 문서 읽기로 승격하지 않는다. 실제 읽은 범위·미독·전체 분모는 [현재 연구 상태](docs/research/RESEARCH_STATUS.md)에 기록한다. 최신 [머테리얼 함수](docs/MATERIAL_FUNCTIONS_075.md)·[Attributes/Layer/Blend와 인스턴스](docs/MATERIAL_LAYERS_076.md)는 공용 CPU/GLSL/TSL·C++/BP·AI/패키징의 실제 창 검증을 포함한다.

C++ / Win32 / DirectX 11 기반 자체 2D·2.5D·3D 게임 엔진을 만드는 프로젝트다. 현재는 **Windows x64 HBEngine.exe + WebView2 편집기 + 실제 C++ 빌드 호스트 + 블루프린트 실행기 + 독립 게임 Game.exe 패키지**를 연결했다. 편집기와 게임 창은 Win32 C++ 프로그램이고 렌더링은 Three.js/WebGL2 또는 선택한 WebGPU, 물리는 Rapier 2D/3D WASM이다. DirectX 11/HLSL 렌더러와 타깃별 에셋 cook·installer는 별도 제작 항목이다.

## 현재 구현

- **독립 게임 빌드**: 파일 → 빌드 프로필(`Ctrl+Shift+B`)에서 프로필별 개발/배포 구성·게임 이름·창 크기·장면 목록을 저장한다. 열린 장면/콘텐츠 브라우저 드롭으로 추가하고 포함·제외·순서·시작 장면을 설정한다. 검사·모두 저장하고 빌드·취소·빌드 후 실행·출력 폴더를 제공한다. 게임 전용 파일과 사전 컴파일 C++ worker를 `Builds/<프로필>/<고유 빌드>`에 구성하며 Game.exe가 같은 BP/컴포넌트/게임 서비스를 실행한다. [설정·실행 계약과 조사 근거](docs/BUILD_PLAYER_RESEARCH.md).
- **엔진 실행과 프로젝트**: HBEngine.exe를 실행하면 최근 프로젝트·새 프로젝트·찾아 열기가 있는 허브를 연다. 프로젝트 루트의 `.hbproject` JSON은 UUID·엔진/파일 버전·시작 레벨·시작 BP를 지정한다. 생성 후 바로 편집기에 들어가며 기존 폴더와 파일을 덮어쓰지 않는다. 프로젝트별 복구·도킹·Project 폴더·SaveGame을 `Saved/Editor/storage.json`에 보존해 실행 포트가 달라져도 이어간다. 최초 일반 실행 또는 `--register`로 현재 Windows 사용자에게 `.hbproject` 더블클릭 연결을 등록한다.
- **714개 기본 노드**: 이벤트, 흐름 제어, 수학, 정수·논리·비교, Vec2/Vec3, 회전, 좌표 변환, 색상, 문자열, 자료형별 배열, 시간·타이머·측정, 오브젝트와 게임 서비스. 사용자 함수·매크로·변수·C++ 공개 선언에서 생성되는 노드는 이 숫자에 포함하지 않는다. [전체 이름·핀·C++ 대응 목록](docs/NODE_CATALOG.md).
- **289개 코어 C++ API + 340개 실행 서비스 API**: C++17 함수와 브라우저 실행을 제공한다. 게임 프레임워크·물리·블랙보드·행동트리·FSM·몽타주·시퀀스·경로 이동·인지·파티클·태그를 같은 플레이 월드에 연결한다. 추가한 221개 함수는 모두 실제 C++/JS 결과를 비교한다. 자료형별 배열 복사 연산은 원본을 유지하며, 변수 변경은 Set/Add/Remove 실행 노드로 구분한다.
- **블루프린트 실행**: Construction → BeginPlay → Tick·입력·Overlap → EndPlay, 함수·매크로, 조건·반복·중단, Delay·재시작 지연, 타이머·Timeline, 변수·배열, 디스패처·인터페이스 호출. 중단점·Step·Continue와 실제 계산한 핀 값을 지원한다. Stop은 편집 장면을 복원한다.
- **사용자 C++ 실행**: Project에서 C++ 클래스를 만들고 설치된 Visual Studio(또는 VS Code)에서 .h/.cpp를 편집한다. C++ 클래스 기반 블루프린트에서 파일 변경을 다시 읽어 g++로 빌드한다. 공개 함수·속성·static 함수·반환·출력 참조·객체 ID를 연결하고 C++ 이벤트를 BP로 전달한다. C++ 변환 변경은 실행 월드에 반영한다. [실행 예제](prototype/examples/BP_NativeDoor.blueprint.json).
- **그래프 제작**: 한글/영어 우클릭 검색, 핀 연결·분할·합치기·변수 승격, 다중/영역 선택, 복사·복제·Undo/Redo, 함수·매크로 추출, Construction, 주석·세부 속성·모든 내부 그래프 검색. 그래프당 1,000개 노드를 저장할 수 있다.
- **충돌 형상 제작**: 50종 컴포넌트에 메시 충돌·2D 오목 다각형·열린 선분을 포함한다. 점/선분 드래그·좌표·다중 경로·스냅·형상 Undo/Redo, 실제 렌더/원본 모델에서 생성, 볼록/삼각형 미리보기와 BP 컴포넌트 뷰포트를 제공한다. 사람/AI는 같은 JSON과 revision/저장 경로를, 게임/BP/C++는 같은 정확 형상 질의를 사용한다. [실행·조작·제약 계약](docs/COLLISION_GEOMETRY_RESEARCH.md), `npm run test:collision-geometry`.
- **실제 Project**: 디스크 폴더 트리·이름/타입/경로 목록·타일 전환·새 폴더·이름 변경·안정적인 에셋 ID, 파일명/타입/파일 내용·하위 폴더 검색, Ctrl/Shift 다중 선택과 선택 열기. 표시 방식은 프로젝트별로 저장한다. 다중 파일·폴더 선택과 편집기 어디든 외부 파일/폴더 드롭을 지원한다. 드롭은 현재 Project 폴더에 즉시 가져온다. 중복 이름은 새 이름으로 보존한다.
- **도킹과 독립 창**: 탭 이동·상하좌우 분할·경계 크기 변경·최대화·복원·배치 초기화. 탭 우클릭/창 메뉴로 뷰포트·콘텐츠 브라우저·아웃라이너·속성·에셋 작업창을 실제 별도 Windows 창으로 분리하고 닫기/합치기로 복귀한다. 같은 문서·선택·Undo·원본 DOM/WebGL context를 유지한다. 에셋마다 독립 문서 탭과 저장·복구 상태를 가지며 C++ 편집은 외부 IDE로 연다. [창·입력·렌더 수명](docs/DETACHED_WINDOWS_RESEARCH.md).
- **뷰포트 제작**: Unreal 방식 RMB 비행·LMB 지면 이동·MMB 팬·Alt orbit/dolly, 속도/감도/FOV/clip 설정, 2D와 여섯 직교 방향·방향 축 위젯·0~9 북마크를 제공한다. 이전 4~28 카메라 거리 제한을 제거하고 그리드/하늘을 카메라에 맞춰 갱신한다. Lit/Unlit/Wireframe/조명/상세 조명/월드 노멀, 개별 Show Flags, Game View·Realtime·Immersive·PNG 캡처, 카메라 생성/조종/정렬·피벗·표면/정점 스냅을 연결한다. 모델 미리보기도 같은 입력 모듈을 사용한다. [조작·제작 대조](docs/VIEWPORT_CONTROLS_RESEARCH.md).
- **환경 Actor**: SkyAtmosphere·SkyLight·VolumetricCloud·ExponentialHeightFog와 태양광을 별도 오브젝트/컴포넌트로 편집·저장한다. Ctrl+L로 태양 방향을, Shift로 두 번째 대기 광원을 조절하고 Undo한다. SkyLight는 Renderer별 실제 PMREM 캡처를 소유하며 높이 안개는 월드 높이/거리 shader에 적용된다. 구름은 mesh 기반 미리보기다. [저장·렌더·AI 계약과 적용 범위](docs/ENVIRONMENT_ACTORS_RESEARCH.md).
- **에셋 생성**: 폴더 우클릭에서 Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent 부모의 BP·C++ 클래스, Input Action·Input Mapping Context·머테리얼·트랜스폼 애니메이션·커브·데이터·레벨을 실제 파일로 만든다. 입력 에셋의 자료형·키/축/배율·컨텍스트 우선순위가 실행기에 연결된다.
- **Timeline**: 별도 커브 편집기, Float/Vector/Color/Event 트랙, XYZ/RGBA, 키·시간·값·접선·보간, 스크럽·역방향·길이·Loop·Autoplay·Rate·시간 배율 무시. Play/Play from Start/Stop/Reverse/Reverse from End/Set New Time와 Update/Finished를 실행한다.
- **트랜스폼 애니메이션 실행**: 독립 Animation 에셋의 position/rotation/scale Vector 트랙을 기존 Play Animation/Stop Animation 노드로 대상 오브젝트에 적용한다. 회전은 XYZ Euler degree이고 트랙 값은 가산 이동이 아니라 대상 속성에 덮어쓴다. 반복, 재생 속도, 마지막 키 길이, 시간 배율 무시를 적용한다. 같은 이름의 모델 내장 클립이 있으면 그 클립을 우선 재생한다. 독립 Animation의 이벤트 트랙·뼈/상태 머신은 아직 실행하지 않는다.
- **AI·상태·연출 제작**: 블랙보드·행동트리·FSM·몽타주·레벨 시퀀스를 독립 파일과 전용 편집기로 만든다. 행동트리의 상태·현재 FSM 상태·블랙보드 실행 값을 플레이 중 확인한다. 몽타주 섹션/다음 섹션/Notify/슬롯과 시퀀스의 대상 바인딩·11종 트랙·키/클립·프레임 스냅·XYZ 속성·실제 장면 스크럽을 연결했다.
- **내비게이션·인지·효과**: XY/XZ 격자 A*와 에이전트/장애물, 시야/차폐/소리/기억과 블랙보드 연동, 계층 태그/Any·All·None 질의, CPU 파티클의 Main/Emission/Shape/Velocity/Force/Color/Size/Renderer, 실제 표면 데칼 투영을 제공한다. 다각형 NavMesh·군중 회피·입자 충돌/트레일·뼈별 슬롯 블렌딩은 남아 있다.
- **장면과 에셋 사용**: 도형·광원·Transform, 직교 2D와 3D 뷰, 하늘·햇빛·구름·안개·맵 템플릿. OBJ/GLTF/GLB/FBX 미리보기·배치, 모델에 포함된 애니메이션, 브라우저 지원 영상·오디오, 기본 PBR 표면·광원·위젯·게임 저장을 연결한다.

Unreal/Unity의 외형뿐 아니라 제작 흐름·실행 의미·키보드/포인터·창 배치의 과거 조사 근거와 남은 범위는 [과거 분야 조사와 구현 대조](docs/REFERENCE_COVERAGE.md), [과거 부분 조사·설계 대조](docs/ENGINE_REFERENCE_ANALYSIS.md), [인터랙션 계약과 검증 상태](docs/EDITOR_INTERACTION_SPEC.md), [BP/C++ 구현 기준](docs/BLUEPRINT_SPEC.md), [장기 엔진 기획](docs/ENGINE_PLAN.md)에 있다. 이 자료를 새 전체 본문/API 분석의 완료 증거로 자동 승격하지 않는다.

## 실행과 검사

Windows에서 **HBEngine.exe를 더블클릭**하면 프로젝트 허브가 열린다. `.hbproject`는 더블클릭하거나 EXE 위로 끌어 열 수 있고, 명령줄에서도 프로젝트 파일의 절대경로를 넘길 수 있다. 배포 폴더 `dist/HBEngine`에는 Node.js와 WebView2Loader.dll, 편집기 파일, 예제 프로젝트, 라이선스를 동봉한다. 이 폴더 전체를 함께 옮겨야 한다. 저장소 루트의 `HBEngine.exe`는 저장소의 편집기 파일과 `dist/HBEngine`의 동봉 런타임·loader를 사용한다.

Microsoft WebView2 Runtime이 필요하다. 없으면 [공식 Runtime 다운로드](https://developer.microsoft.com/microsoft-edge/webview2/)에서 설치한다. 배포 폴더를 실행할 때 Node.js/npm을 따로 설치할 필요는 없다. 사용자 C++ 코드를 빌드하려면 C++17 컴파일러가 별도로 필요하다.

엔진 개발과 동시에 사용할 때는 `npm run desktop:install`로 저장소 밖의 사용자용 설치본을 만든다. 바탕 화면의 **HBEngine 사용자용** 바로가기는 고정된 배포본을 열고, 개발 빌드와 WebView 프로필·C++ 캐시·포트를 분리한다. 개발 중 사용자용 설치본과 게임 원본을 변경하지 않는다. 업데이트는 새 버전 폴더로 설치하고 사용자 요청에 따라 전환한다. [동시 사용·저장·검증 방식](docs/USER_DEVELOPMENT_SEPARATION.md).

소스에서 Windows x64 EXE를 만들려면 Node.js 22 이상과 g++/windres를 준비한다.

```powershell
npm install
npm run desktop:build
.\HBEngine.exe
```

빌드는 `HBEngine.exe`, `dist/HBEngine/HBEngine.exe`와 게임 패키지에 쓰는 `dist/HBEngine/HBPlayer.exe`를 만든다. 빌드에 사용하는 Node 실행 파일을 동봉하고 공식 WebView2 SDK 1.0.4258.31의 x64 loader를 사용한다. Node·WebView2 SDK·Three·Rapier·nlohmann/json·사용한 MinGW 런타임 고지는 `dist/HBEngine/licenses`에 포함하고 게임 패키지에도 동봉한다. 실행 로그·최근 프로젝트·WebView2 데이터는 기본적으로 `%LOCALAPPDATA%/HBEngine`에 둔다. 파일 연결만 다시 등록하려면 `.\HBEngine.exe --register`를 실행한다.

브라우저 개발 미리보기는 다음 명령으로 실행한다.

```powershell
npm install
npm run dev
```

주소는 http://127.0.0.1:5173 이다. 첫 dev 실행은 Projects/QuietGarden에 예제 에셋·소스와 `.hbproject`를 만든다. 기존 파일은 덮어쓰지 않는다. `HB_PROJECT_DIR`로 다른 프로젝트 폴더를 지정할 수 있다. 데스크톱 실행은 충돌하지 않는 로컬 포트를 선택한다. 프로젝트와 실행 파일·배포 폴더·빌드 캐시는 Git에서 제외한다.

C++17 g++이 필요하다. Windows에서는 설치된 MSYS2 UCRT64 컴파일러를 찾고 다른 경로는 CXX로 지정한다. 최초 빌드 시 공식 nlohmann/json 3.12.0 단일 헤더를 내려받아 빌드 폴더에 둔다.

| 명령 | 검사 |
| --- | --- |
| npm run test:collision-geometry | 실제 WASM 67개 형상 조건·실제 사용자 C++ 네 형상 질의·JSON/참조/컴포넌트 조합 |
| npm run test:collision-editor | 5182 authoring-qa 전용 편집기 bake/revision/dryRun/Undo/Redo/저장·2D/3D 착지·BP source OBJ |
| npm test | 전체 노드·타입·JSON·분할 핀·함수/매크로 추출·공통 API·473종 한 그래프 저장 |
| npm run api:check | 공통 선언·생성 헤더·노드 메타데이터 일치 |
| npm run test:library | 새 221개 함수의 실제 C++/JS 결과 비교·배열/정수 오류 |
| npm run test:physics | 실제 2D/3D WASM 강체·회전·6종 관절/모터·CCD·형상 질의·실제 C++ 동기 검색·BP split pin |
| npm run test:native | 기존 공통 C++ 코어 실제 컴파일·호출 |
| npm run test:runtime | 이벤트·반복·지연·Timeline·트랜스폼 애니메이션 재생/정지/반복/시간 배율·중단점 이어가기·실제 C++→BP |
| npm run test:host | 사용자 C++ 빌드·함수/속성/객체/이벤트·잘못된 반환/컴파일 진단 |
| npm run test:project | 실제 파일·다중 가져오기·폴더 드롭 열거·내용 검색·재열기·원본 보존 |
| npm run test:gameplay | 행동트리·블랙보드·FSM·몽타주·11종 시퀀스·데칼 투영·C++ 서명/실행·실패 보존 |
| npm run test:systems | 2D/3D A*·장애물/에이전트 크기·시야/소리·태그·파티클·C++ 명령/객체 배열·두 예제의 600프레임 실행 |
| npm run test:assets | 확장 에셋·부모 클래스 실제 C++ 빌드·독립 문서 저장·참조 재열기·입력·다중 BP 실행 |
| npm run test:server | 기본 Project의 dev 서버 실행 중 HTTP 범위 응답·Origin/헤더·에셋 실행 차단 |
| npm run test:hub-ui | 실제 허브 핸들러의 검색·선택·열기·모달·키보드·오류/입력 보존 |
| npm run desktop:build | Windows x64 편집기/Player EXE·아이콘·Node/loader 동봉·라이선스·외부 MSYS2 런타임 DLL 의존성 검사 |
| npm run test:package | 실제 2D 개발/3D 배포 Game.exe·GPU·BP→사전 컴파일 C++·AudioContext/음원 재생·EndPlay 저장/재열기·취소/충돌/손상 거부·소유 서버 종료 |
| npm run test:launcher | 프로젝트 JSON/UUID·한글/공백 경로·원본 보호·허브/API·두 프로젝트 전환·동적 포트·프로젝트별 C++ 소유 상태 |
| npm run test:session | 프로젝트 ID별 복구/도킹/폴더/SaveGame 분리·기존 기본 프로젝트의 1회 이관·원본 보존·디스크 복구 연결 |
| npm run test:desktop | 실제 배포/루트 EXE의 WebView2 내 편집기/허브 JS 초기화·실제 닫기 흐름·다른 작업 폴더/프로젝트 경로·비정상 descriptor 거부·소유 서버 정리 |
| npm run test:viewport | 카메라 입력 185·보기/프레이밍/축 위젯/재질 수명 228·환경 Actor 33·분리 창 frame 예약 검사 |
| npm run test:detached | 실제 별도 HWND·원본 문서/DOM/GPU 유지·창 간 속성·태양광·검색/저장·닫기 복귀·부모 종료 |
| node tools/check-viewport-workflow.mjs URL | viewport-qa 전용 공용 AI 명령·큰 좌표·북마크/조종·보기와 에셋 격리·실제 Play/Stop·저장 |

npm run api:generate는 공통 라이브러리 헤더와 노드 메타데이터를 재생성한다. Library.hpp는 추적하고 core-api.js는 설치 시 생성한다.

데스크톱 smoke는 내장 WebView2 탐색 이후 허브/편집기 JS의 준비 메시지와 실제 닫기 핸들러·종료 뒤 서버 정리를 확인한다. 모든 편집 조작은 별도의 화면 검증이 필요하다. 공식 실행/프로젝트 근거와 SDK 배포 범위는 [엔진 분석](docs/ENGINE_REFERENCE_ANALYSIS.md)에 적었다.

## 만든 게임 빌드와 실행

편집기에서 **파일 → 빌드 프로필**을 열고 실행할 장면을 포함한다. 첫 활성 장면이 시작 장면이며 목록 순서는 드래그나 위/아래 버튼으로 바꾼다. 프로필은 `Settings/BuildProfiles.json`에 저장한다. **모두 저장하고 빌드**는 열린 에셋을 저장한 뒤 실행하고, **검사**는 저장된 디스크 콘텐츠만 확인한다. 프로필 창에 포커스가 있으면 `Ctrl+S`는 프로필을 저장한다.

완료한 `Builds/<profile id>/<build id>` **폴더 전체**를 옮겨 `Game.exe`를 실행한다. Node와 사전 빌드 C++ worker를 동봉하므로 게임 실행에는 별도 Node/npm/C++ 컴파일러가 필요하지 않다. Microsoft WebView2 Runtime은 필요하다. `Esc`로 계속·전체 화면·종료 메뉴를 열며 게임 저장은 패키지를 수정하지 않고 `%LOCALAPPDATA%/HBEngine/Games/<project UUID>`에 보관한다.

디스크 프로젝트를 CLI로 검사/빌드할 수도 있다. C++가 연결된 프로젝트는 제작 단계에 C++17 컴파일러가 필요하다.

```powershell
npm run desktop:build
npm run build:game -- C:/Games/MyGame/MyGame.hbproject windows --dry-run
npm run build:game -- C:/Games/MyGame/MyGame.hbproject windows
```

패키지는 활성 Scene과 모든 비장면 Assets를 포함하고 원본 미디어 형식을 유지한다. 없는 참조, 제외된 Scene 참조, 디스크와 BP 등록 C++ 소스의 불일치를 사전 검사한다. 플랫폼 변환·텍스처/음향 압축·미사용 에셋 제거·chunk/patch·installer는 추가 제작 대상이다. 개발 구성은 사용자 worker의 디버그 정보와 실행 보고를, 배포 구성은 worker 최적화/기호 제거를 적용한다. 두 구성 모두 현재 WebView2/WebGL2 실행 경로다.

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
| 뷰포트 이동 / 속도 | RMB+WASD/QE·Shift / RMB+휠 |
| 뷰포트 초점 / 표시 | F / G·Ctrl R·F11 |
| 뷰포트 북마크 / 태양광 | Ctrl+0~9 저장·0~9 복원 / Ctrl L·Shift로 두 번째 광원 |
| 에셋 작업 | 외부 다중 드롭·선택 열기·Ctrl F·F2·Backspace |
| 빌드 프로필 / 프로필 저장 | Ctrl Shift B / 빌드 프로필 포커스에서 Ctrl S |

에셋 창에서 Ctrl S는 현재 문서를 **Project 파일**에 저장하고 Ctrl Shift S는 수정된 열린 문서를 모두 저장한다. 빌드 프로필 창의 저장 단축키는 해당 프로필 설정에 적용한다. 문서 복구·배치·Project 폴더·SaveGame은 프로젝트 UUID별로 `Saved/Editor/storage.json`에 저장한다. 프로젝트 전환/종료는 디스크 반영을 기다리며 localStorage는 기존 백업·복원 경로로 유지한다. C++ 원문은 외부 IDE에서 저장하고 BP의 C++ 빌드로 다시 읽는다. 열린 일반 텍스트 문서는 현재 문서 저장이나 자체 저장 버튼을 사용한다. BP는 JSON 내보내기·검증 후 불러오기가 가능하고 AI도 안정적인 ID·타입·연결을 편집할 수 있다. 코드/검색 입력에서는 문자 선택을 허용하고 그래프·도킹 조작에서는 브라우저 글자 선택을 차단한다.

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

2D Sprite crop/pivot/PPU·그리드 분할, Flipbook 프레임, Tilemap 브러시/지우기/사각형/채우기·레이어·충돌 편집을 독립 에디터로 연다. 2D 문서는 전용 캔버스·팔레트·속성을 사용하고 중복 전역 패널을 숨긴다. 장면의 50종 컴포넌트, Controller/Pawn/GameMode/State, 2D/3D 고정 물리·접촉·중력·입력·점프를 실제 플레이로 연결한다. 머테리얼 그래프 54종은 타입 검증과 GLSL 생성 후 GPU 재질에 적용한다.

BP Open Scene과 C++ `hb::Scene::Open`은 다음 장면을 검증하고 프레임 경계에서 이전 월드의 EndPlay·타이머·입력 정리 후 새 월드를 시작한다. Stop하면 전환 전의 편집 장면과 환경을 복원한다. 화면 없는 실행기도 같은 준비/전환 경로를 사용하며 `sceneHistory`에 전환 장면과 프레임을 남긴다.

AI도 현재 미저장 문서를 읽고 revision 조건부 부분 변경·Undo·저장·C++ 빌드·실행 상태 조회를 사용할 수 있다. 뷰포트 get/configure/action/bookmark와 window.detach/redock도 인간 툴바·독립 창 경로를 공유한다. `npm run engine -- clients`로 편집기를 찾고 `npm run engine -- schema`로 실제 에셋/컴포넌트/노드/42종 배치 조합·뷰포트 정의를 읽는다. `npm run run:project -- <project.hbproject> [scenario.json]`은 같은 BP/물리/C++를 화면 없이 실행해 JSON 결과를 반환한다. 상세 명령은 [AI API](docs/AI_ENGINE_API.md), 공식 문서 대조와 남은 전체 작업은 [제작 흐름 분석](docs/ENGINE_WORKFLOW_RESEARCH.md)에 있다.

추가 검사: `test:windows`, `test:scene`, `test:2d`, `test:material`, `test:integration`, `test:headless`, `test:editor-api`. 마지막 검사는 별도의 `integration-qa-*` 프로젝트를 연 편집기에서만 실행한다.

## 현재 한계

Windows 편집기 실행 파일/배포 폴더와 독립 게임 Game.exe 패키지를 구현했다. 현재 WebView2가 편집기/게임을 표시하고 Node가 로컬 서버 및 제작 단계의 C++ 빌드 호스트를 제공한다. 독립 Player는 패키지에 등록된 C++ worker를 실행하며 새 사용자 소스를 컴파일하지 않는다. DirectX 11·HLSL backend·native 물리/음향·임의 형식의 엔진 변환·타깃 cook/압축/chunk·installer·다른 플랫폼 배포는 추가 구현 범위다. 미지원 모델/영상도 원본을 보존하지만 미리보기에는 해당 임포터/브라우저 코덱이 필요하다. 프로젝트 생성은 기본 예제·빈 3D·2D 플랫폼·3D 플레이어·2D/3D AI와 효과 템플릿을 제공한다. 전체 프로젝트 버전 업그레이드·여러 엔진 버전 선택은 미구현이다.

문서 저장은 디스크의 이전 내용과 대조해 외부 변경을 거부하고 Saved/Backups에 원본을 보관한다. 자동 충돌 병합·다중 파일 트랜잭션은 지원하지 않는다.

BP/Scene/Material/Animation/Curve/IA/IMC/Data/Blackboard/BehaviorTree/FSM/Montage/Sequence 등은 파일마다 독립 문서 모델을 가지며 여러 이미지/모델/텍스트 문서와 뷰포트도 열 수 있다. BP→BP 상속, 사용자 Struct/Enum/Set/Map, 로컬 변수, 네트워크, 계층형 상태 머신·애니메이션 블렌드 트리, 프리팹 중첩·override는 계속 구현할 범위다. 트랜스폼 애니메이션은 position/rotation/scale만 적용하며 독립 Transform Animation의 이벤트 트랙·임의 컴포넌트 속성·뼈 저작/리타깃·포즈 블렌딩은 미지원이다. 가져온 모델의 내장 skeletal 클립은 재생하며 몽타주 시간으로 샘플링할 수 있다. 추가 C++ 종속 파일·멀티 파일 프로젝트·DLL 핫 리로드는 미지원이다. C++→BP 이벤트는 C++ 호출 종료 후 전달하며 임의 반환값을 동기적으로 BP에서 C++에 돌려주는 override는 미지원이다.

## Git

공개 저장소 계정은 kirby47navercom-ai이다. author와 committer를 같은 계정으로 유지하고 한글 제목·본문에 변경과 검증을 기록한다.

## 강체와 공간 검색

2D와 3D는 별도 Rapier 0.21.0 WASM 월드로 실행한다. 정확한 Box/Sphere/Capsule, 회전·복합 질량/관성, CCD, 32비트 충돌 필터, 여섯 관절 형식과 한계/모터, 지속 힘을 편집하고 실행한다. 회전 축 고정은 체크박스로 설정한다. C++/BP에서 Raycast/All·Sphere/BoxCast·Overlap·ClosestPoint·힘·토크·각속도·질량·sleep을 사용한다.

C++ 공간 검색은 읽기 전용 실제 질의 월드에서 동기 응답을 받고, 나머지 변경 서비스는 함수 반환 후 VM에서 적용한다. AI 스키마에 단위·기본값·제한을 제공하고 runtime.state로 실제 물리 상태를 관찰한다. 전체 분석·API 단위·구현 한계·재현 검사는 [물리 제작/실행 연구](docs/PHYSICS_RUNTIME_RESEARCH.md)에 있다. `node tools/check-physics-editor.mjs http://127.0.0.1:5182`는 authoring-qa 전용 검증이다.


## 뷰포트와 별도 창

RMB+WASD/QE로 이동하고 RMB+휠로 속도를 바꾼다. Alt+좌/중/우 드래그는 회전/팬/거리 조절이며 F는 선택에 초점을 맞춘다. 직교 뷰는 2D XY와 여섯 방향을 제공하고 휠은 커서 중심으로 확대한다. 툴바의 방향/보기/표시/카메라 메뉴와 축 위젯, G·Ctrl R·F11, Ctrl+숫자/숫자 북마크를 사용한다. 카메라 생성·조종은 Camera의 fieldOfView/near/far와 연결한다.

탭 우클릭 → 새 창으로 분리 또는 상단 창 메뉴에서 실제 Windows 창을 연다. 아웃라이너·속성도 별도 창으로 열 수 있고, 닫기/모든 창 합치기로 복귀한다. 환경 메뉴는 하늘·태양광·하늘광·구름·높이 안개를 실제 Scene Actor로 추가하고 기존 맵은 명시적으로 환경 Actor로 변환한다. Ctrl+L로 태양을 돌리며 Shift를 함께 누르면 두 번째 대기광원을 조절한다.

입력과 표시의 검증은 `test:viewport`, 실제 OS 창은 `test:detached`다. 근거와 구현 범위는 [뷰포트](docs/VIEWPORT_CONTROLS_RESEARCH.md)·[환경](docs/ENVIRONMENT_ACTORS_RESEARCH.md)·[독립 창](docs/DETACHED_WINDOWS_RESEARCH.md)에 기록했다.
