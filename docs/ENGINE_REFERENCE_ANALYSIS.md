# HBEngine: 공식 문서 기반 제작 시스템 분석

조사 기준일: 2026-10-02. 이 문서는 기능 이름을 모으는 목록이 아니라, 제작자가 작업을 시작해서 저장·실행·디버그·배포할 때 필요한 동작 기준이다. 분야 누락을 확인하는 공식 목차와 코드 대조는 [조사 범위](REFERENCE_COVERAGE.md), 세부 조작 규칙은 [편집기 인터랙션 기준](EDITOR_INTERACTION_SPEC.md), 블루프린트별 구현 상태는 [블루프린트 기준](BLUEPRINT_SPEC.md)을 따른다.

## 조사 범위와 판단 구분

- Epic의 현재 Unreal 문서와 Unity 6 문서를 참고했다. 버전이 고정된 Unity 6000.0 페이지를 우선 사용했고, 이전 URL이 이동한 에셋·네이티브 플러그인 문서는 해당 페이지의 버전을 함께 기록한다.
- Unreal 4.27 컴파일러 자료는 그래프 → 실행 코드의 구조를 분석하는 자료다. 과거의 Blueprint Nativization이 현재 Unreal의 기본 기능이라고 전제하지 않는다.
- **문서 확인**: 아래 링크의 본문에서 확인한 동작. **HB 결정**: HBEngine에 적용할 자체 설계. **현재 상태**: 저장소에서 구현·검증한 범위. 세 가지를 섞지 않는다.
- 개요 문서만 있는 항목은 개요 조사라고 표시한다. 엔진의 모든 API·소스 코드를 전부 분석했다는 뜻이 아니다. 구현에 들어가기 전에 해당 하위 시스템의 세부 문서와 실제 실행 조건을 추가 확인한다.
- ‘무겁다·얇다·어렵다’는 사용자가 해결하려는 문제다. 두 엔진의 성능을 같은 프로젝트에서 측정하지 않았으므로 어느 쪽이 항상 빠르거나 느리다고 단정하지 않는다.

분야 조사 인덱스에는 Unity 6000.0 매뉴얼 목차 3,127항목(34분야 개요 본문 확인)과 조사 당시 Unreal 5.8 문서 홈의 21분야 개요/398개 하위 주제 항목이 있다. `indexed/overview/detail`의 근거를 구분하고, 각 분야의 제작 요구·현재 코드·미구현 항목을 [전체 분야 대조표](REFERENCE_COVERAGE.md)에 적었다. 하위 API·패키지·소스 코드의 조사 상태는 이 숫자에 포함된 것처럼 표현하지 않는다.

## 제작 흐름의 단위

| 단계 | 제작자가 하는 일 | 편집기가 반드시 연결할 것 | 완료를 입증할 작업 |
| --- | --- | --- | --- |
| 프로젝트 | 생성·열기·설정·기존 작업 복구 | 실제 디스크 경로, 버전, 최근 프로젝트, 백업 | 종료 후 다시 열어 같은 파일·장면을 복원 |
| 에셋 | 외부 파일/폴더를 드래그 | 원본 보존, 임포터, 하위 에셋, 설정, 의존성, 재가져오기 | 원본 수정 뒤 ID와 사용자 설정 유지 |
| 장면 | 배치·계층·컴포넌트·프리팹 | 선택과 Inspector, 카메라, 기즈모, 스냅, 숨김/선택 잠금 | 여러 오브젝트 수정·Undo·저장 후 복원 |
| 동작 | C++/그래프로 클래스 제작 | 동일 타입·함수·속성·이벤트 등록, 클래스와 인스턴스 구분 | 같은 함수가 코드와 그래프에서 같은 결과 |
| 표현 | 머테리얼·애니메이션·UI·오디오 | 전용 에셋 편집기, 미리보기, 실제 런타임 바인딩 | 편집 결과가 게임 실행에서 사용됨 |
| 실행 | Play·Pause·Step·Stop | 별도 실행 월드, 입력 포커스, 생명주기, 게임 카메라 | Stop 후 편집 장면이 바뀌지 않음 |
| 진단 | 오류·중단점·값·성능 확인 | 객체 인스턴스, 노드/파일 위치, 스택, 원인 | 오류 위치로 이동하고 수정 후 재검증 |
| 배포 | 타깃 설정·빌드·패킹 | 코드 빌드, 에셋 변환, 의존성, 실행 파일 | 에디터 없이 별도 폴더에서 게임 실행 |

Unreal은 패키징에서 Build/Cook/Stage/Package를 구분한다. C++ 호출용 프로그램이 컴파일됐다는 사실만으로 게임 배포가 완성된 것은 아니다. [Epic: Packaging](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project)

## 엔진 실행, 프로젝트 파일, 데스크톱 배포

**문서 확인:** Unreal 실행은 Project Browser에서 최근 프로젝트·새 프로젝트·찾아 열기를 제공한다. 새 프로젝트는 이름·위치·템플릿·설정으로 생성한 뒤 편집기를 연다. 기존 프로젝트는 Browse로 `.uproject`를 선택하거나 프로젝트 루트의 파일을 더블클릭해 연다. `FProjectDescriptor`는 JSON의 파일 버전·엔진 연결·Modules·Plugins 등의 정보를 읽고 저장한다. 프로젝트 버전 변경에는 별도 호환성/변환 판단이 필요하다. [Epic: Creating a project](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-a-new-project-in-unreal-engine), [Epic: Opening a project](https://dev.epicgames.com/documentation/en-us/unreal-engine/opening-an-existing-unreal-engine-project), [Epic: Project descriptor](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Projects/FProjectDescriptor)

**HB 결정/현재 상태:** `native/desktop/HBEngine.cpp`를 C++17/Win32 Windows x64 프로그램으로 빌드한다. 무인자 `HBEngine.exe`는 프로젝트 허브를 열고 `.hbproject` 인자는 해당 프로젝트를 연다. `tools/project-manifest.mjs`는 파일 버전 1·engine HBEngine·engineVersion 0.1.0·UUID·이름·상대경로 startupScene/startupBlueprint를 검증한다. 생성은 새 폴더를 먼저 확보한 뒤 기본 예제 에셋과 소스·descriptor를 저장하고 편집기에 들어간다. 이미 있는 프로젝트를 덮어쓰지 않는다. 최근 목록은 사용자 LocalAppData의 JSON에 최대 20개를 유지하고 존재/호환성을 다시 확인한다. 첫 dev 실행에서 기존 QuietGarden에도 descriptor를 생성한다. 최초 일반 EXE 실행 또는 `--register`는 HKCU에 `.hbproject`의 열기 명령·아이콘을 등록한다.

`prototype/project-session.js`가 `/api/session`을 먼저 읽고 UUID로 문서 복구·장면·도킹·Project 폴더·SaveGame 키를 분리한다. `tools/project-storage.mjs`와 `/api/storage`는 이 상태의 변경 키를 프로젝트 루트의 `Saved/Editor/storage.json`에 반영한다. 허브로 열거나 EXE로 직접 열어 로컬 포트/origin이 달라져도 디스크 상태를 복원한다. 프로젝트 전환/종료는 pending 상태의 디스크 저장을 기다린다. localStorage 백업·복원과 기본 QuietGarden의 과거 데이터 1회 이관은 원본을 지우지 않고 유지한다. 세션이 유효하지 않으면 복구를 시작하지 않고 허브로 돌아간다. `serve.mjs`는 프로젝트 전환 시 native host를 교체하고 대기 중 파일 쓰기/빌드의 소유 세션을 확인한다. 잘못된 descriptor를 열어도 현재 프로젝트를 유지한다.

**문서 확인:** WebView2 Win32는 STA UI 스레드와 메시지 펌프에서 환경 생성 → controller 생성 → CoreWebView2 획득 → bounds/탐색 순서로 초기화한다. 앱 아키텍처에 맞는 WebView2Loader를 배포하고 WebView2 Runtime 설치를 확인해야 한다. 일반 Microsoft Edge Stable을 제품 Runtime으로 사용하지 않는다. [Microsoft: Win32 시작](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/win32), [Microsoft: 스레드 모델](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model), [Microsoft: 배포](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)

**HB 현재 상태:** Win32 창 안에 기존 HTML/JS 편집기를 WebView2로 표시한다. `tools/build-desktop.mjs`는 공식 안정 SDK 1.0.4258.31의 `build/native/include/WebView2.h`와 x64 `WebView2Loader.dll`을 사용하고 동봉한다. 배포 폴더에는 빌드에 사용한 Node 실행 파일·편집기/서버·Three·예제 프로젝트도 포함한다. MSYS2의 외부 C++ 런타임 DLL 의존성은 빌드 결과에서 검사한다. 렌더러는 Three/WebGL이며 DX11 구현은 남아 있다. [공식 SDK 버전](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31), [Node 공식 Windows 배포](https://nodejs.org/en/download/archive/v24.15.0)

SDK의 `LICENSE.txt`는 바이너리 배포 시 저작권·조건·면책 고지 보존을 요구한다. 빌드는 SDK·동봉한 버전의 Node 전체 LICENSE·Three LICENSE를 `dist/HBEngine/licenses`에 복사한다. SDK/Loader와 WebView2 Runtime의 배포 조건은 각각 확인한다. [공식 SDK 라이선스](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31/License), [Node 24.15.0 LICENSE](https://raw.githubusercontent.com/nodejs/node/v24.15.0/LICENSE)

**종료/검증:** WebView2 `controller.Close`는 `beforeunload`를 발생시키지 않는다. HB의 `WM_CLOSE`는 먼저 웹 편집기의 `hbEngineRequestClose`로 수정 문서 확인·복구/디스크 저장을 요청하고 닫기 메시지 후 창을 닫는다. COM 참조·WebView·본인 Job의 서버 프로세스를 정리한다. `test:desktop`은 배포 EXE 허브·루트 EXE의 한글/공백 프로젝트·다른 작업 폴더·비정상 descriptor 원본 보존·내장 WebView2 탐색 뒤 JS의 `hbengine.ready` 메시지·실제 닫기 핸들러/`hbengine.close`·종료 뒤 소유 서버 제거를 검사한다. `test:launcher`는 프로젝트/API/전환·동적 포트·C++ 소유 상태, `test:session`은 프로젝트별 복구 이관/격리·디스크 연결을 검사한다. JS 초기화/닫기 smoke가 모든 편집 조작의 검증을 대신하지 않는다. [Microsoft: Close](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2controller#close)

**남은 범위:** 템플릿 선택·프로젝트 업그레이드/백업·여러 엔진 버전 연결·설치/업데이트 프로그램·OS 부동 패널·DX11 렌더러·독립 게임 cook/package. 같은 프로젝트를 허브 창과 직접 열기 창에서 동시에 열 수 있으나 에셋 파일의 동시 편집 충돌 감지·병합은 미지원이다. 동봉 편집기 EXE 실행과 게임 배포는 별도 완료 조건이다. 사용자 C++ 빌드에는 컴파일러가 별도로 필요하다.

## 편집기의 배치와 조작

### 작업 공간과 포커스

**문서 확인:** Unity의 창은 탭으로 묶거나 제목을 드래그해 분할·도킹할 수 있고 레이아웃을 저장·복구한다. Unreal의 기본 편집기는 뷰포트, Outliner, 선택 대상의 Details, Content Browser, 로그를 연결한다. 블루프린트 편집기는 Components/My Blueprint/Graph/Details와 디버그·컴파일 결과 창을 갖는다. [Unity: Workspace](https://docs.unity3d.com/6000.0/Documentation/Manual/CustomizingYourWorkspace.html), [Epic: Editor interface](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface), [Epic: Blueprint UI](https://dev.epicgames.com/documentation/unreal-engine/blueprints-visual-scripting-user-interface-for-blueprint-classes-in-unreal-engine)

**HB 결정:** 기본 배치는 왼쪽 계층·제작 목록 / 가운데 문서 탭 / 오른쪽 Inspector / 아래 Project·Console이다. 문서 창은 상하좌우로 분할하고 동시에 열 수 있다. ‘Scene/Blueprint/Material’ 전환으로 전체 화면을 숨기던 구조를 문서 탭으로 바꾼다. Timeline을 더블클릭하면 충분한 높이의 문서 탭으로 열고 사용자가 아래쪽으로 도킹할 수 있게 한다. 작업 창별 포커스와 선택을 분리하며 Inspector는 활성 편집기의 선택 대상을 따른다.

**현재 상태:** 파일별 BP/Material/Transform Animation/Curve/IA/IMC/Data/Scene 문서를 각각 열고 모델·Undo·dirty·배치를 보존한다. 위쪽 파일 탭과 내부 도킹 패널을 구분한다. 탭 재정렬·문서 전환/닫기·저장 보호와 클래스 컴포넌트 뷰포트를 연결했다. C++는 실제 파일을 외부 Visual Studio/VSCode에서 열며, 다른 에셋 화면에 내장 코드 편집기를 섞지 않는다. 도킹/여러 뷰포트는 WebView2 안의 HTML/JS 편집기에서 동작한다. 별도 OS 창으로 떼는 부동 패널은 남아 있다.

**놓치기 쉬운 요구:** 탭 재정렬, 드롭 위치 미리보기, 닫은 창 다시 열기, 분할 경계 키보드 조절, 최대화/복원, 레이아웃 저장/초기화, 같은 종류의 여러 창, 닫힌 창의 업데이트 중지. OS의 별도 창은 브라우저 도킹과 별도 기능이며 네이티브 에디터에서 구현한다.

### 단축키는 문맥을 가진 명령

**문서 확인:** Unreal 그래프는 RMB 이동·메뉴, 휠 확대, Home 선택 초점, Ctrl+C/V/X/D, Undo/Redo, C 주석, F7 컴파일, F9 중단점, 변수 Ctrl/Alt 드래그 Get/Set, 핀 Alt 클릭 연결 해제를 제공한다. Unity는 전역 명령과 문맥 명령을 구분하고 Shortcuts Manager에서 검색·변경·충돌 확인·프로필을 제공한다. [Epic: Blueprint shortcuts](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine), [Unity: Shortcuts Manager](https://docs.unity3d.com/6000.0/Documentation/Manual/ShortcutsManager.html)

**HB 결정:** 명령 ID 하나에 메뉴·툴바·단축키·AI 명령을 연결한다. 입력칸에서 C/Delete/Ctrl+A는 글자 편집으로 동작한다. 그래프 창의 선택을 Project의 Delete가 지우면 안 된다. 포커스·문맥·키 조합을 검사한 후 한 명령만 실행한다. 기본 키는 Unreal 그래프와 익숙한 문서 편집 조작을 우선하며, Unity와 의미가 충돌하는 키는 뒤 문서에서 HB 규칙을 명시한다. 한글 IME 조합 중에는 문자 단축키를 실행하지 않는다.

### 선택, Inspector, 검색

**문서 확인:** Unity Inspector는 GameObject·컴포넌트·에셋·다중 선택의 속성을 표시한다. Unreal Details는 변수·컴포넌트·함수·선택 노드 등 문맥별 속성을 표시하고 검색·접기·고급 필터를 제공한다. [Unity: Inspector](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingTheInspector.html), [Epic: Details](https://dev.epicgames.com/documentation/unreal-engine/details-panel-in-the-blueprints-visual-scriting-editor-for-unreal-engine)

**HB 결정:** 선택된 항목에 편집 가능한 값이 있다면 반드시 입력을 제공한다. 여러 항목의 공통 속성은 함께 편집하며 값이 다르면 혼합값으로 표시한다. 기본값·인스턴스 오버라이드·런타임 값의 출처를 구분한다. 검색은 숨겨진 그룹까지 찾되 선택과 편집 값을 잃지 않는다. 장면 검색, Project 파일 검색, 그래프 검색, 명령 검색은 검색 범위가 서로 다르다.

## 장면, 객체, 컴포넌트, 뷰포트

**문서 확인:** Unity GameObject는 기능을 가진 컴포넌트의 컨테이너이며 비활성 부모는 자식의 유효 활성 상태에 영향을 준다. Hierarchy는 부모 관계, 다중 선택, 씬 가시성·선택 가능 상태를 다룬다. Prefab은 재사용 가능한 구성이고 인스턴스 오버라이드·중첩·Variant를 갖는다. Unreal 액터의 생성 경로는 로드·Spawn·PIE에서 차이가 있으며 Construction, 컴포넌트 초기화, BeginPlay, EndPlay를 구분한다. [Unity: GameObject](https://docs.unity3d.com/6000.0/Documentation/Manual/class-GameObject.html), [Unity: Hierarchy](https://docs.unity3d.com/6000.0/Documentation/Manual/Hierarchy.html), [Unity: Prefabs](https://docs.unity3d.com/6000.0/Documentation/Manual/Prefabs.html), [Epic: Actor lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)

**HB 결정:** 엔티티에는 안정적인 ID, 부모, 활성 상태, 이름, 태그/레이어, 컴포넌트가 있다. Transform은 로컬/월드를 구분하고 부모 이동·회전·스케일을 계산한다. 렌더러·충돌체·카메라·스크립트는 타입별 컴포넌트다. 편집기에서만 숨기기와 게임 비활성화는 별개의 값이다. 계층 재배치에서는 순환을 거부하고 월드 위치 유지 옵션을 준다. 프리팹 편집과 인스턴스 변경은 Apply/Revert와 변경 표시가 필요하다.

**문서 확인:** Unity Scene은 MMB Pan, Alt+LMB Orbit, 휠 Zoom, RMB Fly, F 초점과 방향 기즈모를 제공하며 2D 모드는 XY 평면이다. Unreal 뷰포트는 선택·Transform·스냅·로컬/월드·표시 모드·카메라 설정을 제공한다. [Unity: Scene navigation](https://docs.unity3d.com/6000.0/Documentation/Manual/SceneViewNavigation.html), [Epic: Viewport controls](https://dev.epicgames.com/documentation/unreal-engine/viewport-controls-in-unreal-engine), [Epic: Viewport toolbar](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-toolbar)

**HB 결정:** 3D Perspective와 Top/Front/Side Orthographic을 구분한다. 2D는 XY 직교 카메라이고 단순히 3D 카메라를 위로 옮긴 기능에 2D라는 이름을 붙이지 않는다. 여러 뷰포트는 장면을 공유하고 카메라·표시 모드·도구는 각각 갖는다. 게임 카메라의 종횡비와 편집 카메라를 구분한다. 이동/회전/크기 기즈모, 축 제한, 스냅, 원점·피벗, 가시성 필터, 도형 생성과 메시 편집은 별도 완료 항목이다.

## Project와 임포트

**문서 확인:** Unity Project는 실제 폴더 트리, 현재 폴더의 파일, 검색 범위, 타입/라벨 필터, 즐겨찾기, 이름 변경·다중 선택·위치 찾기를 제공한다. Unity의 에셋 파이프라인은 Assets 원본과 Library 변환 결과를 구분하며 소스·임포터·타깃과 의존성의 변경에 따라 갱신한다. [Unity: Project window](https://docs.unity3d.com/6000.0/Documentation/Manual/ProjectView.html), [Unity 6000.6: Importing assets](https://docs.unity.com/en-us/engine/6000.6/manual/assets-and-media/import-assets/importing-assets), [Unity 6000.0: Asset refresh](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-database/refreshing)

**HB 결정:** 아무 작업 창에 외부 파일을 놓아도 임포트를 시작할 수 있다. 현재 Project 폴더를 목적지로 사용하되 내부 에셋 드래그와 구분한다. 여러 파일·하위 폴더를 한 번에 처리하고 원본 경로·엔진 ID·해시·임포터 버전·설정·의존성·결과·오류를 저장한다. 같은 이름을 덮어쓰지 않고 충돌을 해결한다. 파일 원본을 디스크에 보존하는 것, 미리보기를 표시하는 것, 엔진 형식으로 변환하는 것은 서로 다른 상태다.

**현재 상태:** 실제 폴더 우클릭에서 BP/C++ 클래스·IA·IMC·머테리얼·Transform Animation·Curve·Data·레벨을 만든다. BP/C++는 부모 7종을 선택한다. rename은 열린 문서/참조와 배치를 갱신하고 영속 redirect로 구 디스크 참조를 해석한다. 에셋 의존성 viewer·redirect Fixup·임포터별 재가져오기/변환은 남아 있다. [Epic: Redirectors](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-redirectors-in-unreal-engine)

| 에셋 | 필수 편집·변환 | 실패 시 동작 |
| --- | --- | --- |
| 이미지 | sRGB/Linear, 알파, Mipmap, 압축, 크기, Sprite 분할/Pivot | 원본 유지, 지원 디코더·원인 표시 |
| 모델 | 단위·축·Normal/Tangent, Mesh/Material/Skeleton/Clip 하위 에셋 | 참조 텍스처 누락과 변환 실패를 구분 |
| 오디오 | 채널, 샘플률, 루프, 압축, 스트리밍 | 코덱/플랫폼 지원 여부 표시 |
| 영상 | Media Source, 디코더, 영상/소리 동기화, Seek, 스트리밍 | 확장자로 재생 가능하다고 단정하지 않음 |
| 코드·그래프 | 텍스트 검색, 타입 검사, 컴파일 오류, 의존성 | 이전 유효 결과 유지, 실패 위치 이동 |

Unreal Media Framework도 Source/Player/Texture/Sound와 플랫폼별 플레이어 지원을 나눈다. AVI 파일 복사와 AVI 디코딩·변환 완료는 다르다. [Epic: Media Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/media-framework-overview-for-unreal-engine)

## 블루프린트 제작과 실제 실행

### 클래스와 그래프

**문서 확인:** Unreal의 Blueprint는 C++ 공개 클래스·속성·함수로 확장하는 게임플레이 클래스다. Components는 Construction에 앞서 구성된다. My Blueprint는 이벤트·함수·매크로·변수·디스패처의 제작 목록이다. 함수는 입력·출력·접근 범위·Pure 여부를 가지며 매크로는 여러 실행 입출력을 가진다. 인터페이스는 구현 본문이 없는 계약이고 디스패처는 여러 구독자를 호출한다. [Epic: Foundations](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-foundations), [Epic: My Blueprint](https://dev.epicgames.com/documentation/unreal-engine/my-blueprint-panel-in-the-blueprints-visual-scripting-editor-for-unreal-engine), [Epic: Functions](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine), [Epic: Macros](https://dev.epicgames.com/documentation/en-us/unreal-engine/macros-in-unreal-engine), [Epic: Interfaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-interface-in-unreal-engine), [Epic: Dispatchers](https://dev.epicgames.com/documentation/en-us/unreal-engine/event-dispatchers-in-unreal-engine)

**HB 결정:** Event Graph、Construction、Function、Macro는 그래프의 이름만 다른 것이 아니라 허용 노드와 실행 규칙이 다르다. 함수에는 지연 실행을 넣지 않는다. 매크로는 호출별 실행 상태와 경계 핀을 보존한다. 클래스 기본값은 인스턴스 초기값이고 실행 중 값은 별도 상태다. BP → BP 상속, 부모 호출, 로컬 변수, Struct/Enum/Set/Map/참조 종류, 라이브러리 에셋, 컴포넌트 클래스 뷰포트도 목표에 포함한다.

**현재 상태:** Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent는 생성 템플릿·부모 관계·기본 컴포넌트와 C++ 기반형을 제공한다. 캐릭터 Capsule 미리보기와 이동 속성 입력은 실제 보행·점프·Possession 구현과 구분한다. 장면은 서로 다른 BP 파일을 오브젝트마다 참조하고 실행 인스턴스를 나눈다. BP→BP 상속·로컬 변수·전체 Gameplay Framework는 추가 대상이다. [Epic: Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine), [Epic: Blueprint Best Practices](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-best-practices-in-unreal-engine)

### 핀과 데이터

**문서 확인:** Blueprint는 변수 타입·배열·인스턴스 공개·생성 시 노출·카테고리를 제공한다. Pure 함수는 실행 핀이 없고 소비자가 값을 요구할 때 계산되며 자동 캐시를 전제하지 않는다. UFUNCTION의 매개변수·반환·참조·메타데이터는 노드 인터페이스에 영향을 준다. [Epic: Variables](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-variables-in-unreal-engine), [Epic: UFUNCTION](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine)

**HB 결정:** 실행 핀은 순서를, 데이터 핀은 값 의존성을 나타낸다. 단일/배열·구조체·객체 타입을 검사한다. Vec2/Vec3/Color/Transform/Hit의 분할은 표시뿐 아니라 저장과 런타임 값 추출·재구성이 일치해야 한다. 함수의 출력값은 호출 프레임에 속한다. 연결 없는 입력은 기본값을 사용하며 오류가 있는 핀은 위치와 타입을 알려준다. 자동 변환은 허용 목록만 사용하고 그래프에 변환 노드를 남긴다.

### 실행·지연·디버그

**문서 확인:** Unreal은 그래프를 컴파일해 실행 가능한 코드로 만든다. 디버거는 실행 객체, 중단점, Step/Continue, 호출 스택, 실제 계산된 핀 값을 보여준다. 계산되지 않은 값은 현재 값인 것처럼 표시하지 않는다. [Epic 4.27: Compiler overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-compiler-overview?application_version=4.27), [Epic: Blueprint debugger](https://dev.epicgames.com/documentation/unreal-engine/blueprint-debugging-example-in-unreal-engine)

**HB 결정:** 그래프 검증 → 실행 계획 → 인스턴스 생성 → 이벤트 스케줄 → 노드 실행의 흐름을 둔다. BeginPlay/EndPlay, 객체별 Tick 간격, Branch/Sequence/Loop, 호출 프레임, 순수 함수, 변수/배열, Delay/Timer, Timeline, 입력, 구독 이벤트를 실제 실행한다. 중단점에서 호출 프레임과 남은 순서를 보존하고 Continue 이후 누락 없이 이어간다. 실행량·재귀 깊이 제한으로 무한 루프를 진단한다. 지원되지 않는 엔진 서비스는 성공한 척 값을 반환하지 않는다.

## C++ 연동과 생명주기

**문서 확인:** Unreal은 Blueprintable/BlueprintType, ReadOnly/ReadWrite, Callable/Pure, Native/Implementable Event를 구분한다. Native Event에는 C++ 기본 구현과 BP override가 있다. Unity의 일반 스크립트 흐름은 C#이며 C++는 네이티브 플러그인 경계로 호출한다. IL2CPP는 C#의 변환·빌드 방식이며 사용자가 C++로 게임플레이를 쓰는 API와 동일하지 않다. [Epic: Exposing gameplay](https://dev.epicgames.com/documentation/en-us/unreal-engine/exposing-gameplay-elements-to-blueprints-visual-scripting-in-unreal-engine), [Unity 6000.5: Native plugins](https://docs.unity.com/en-us/engine/6000.5/manual/scripting/compilation-and-code-reload/plug-ins/native), [Unity 6000.6: Scripting backends](https://docs.unity.com/en-us/engine/6000.6/manual/scripting/compilation-and-code-reload/script-compilation/backends/intro)

**HB 결정:** 사용자 언어는 C++다. 공통 API 헤더를 C++가 직접 include하고, 같은 메타데이터로 BP 노드·Inspector·호출 wrapper를 생성한다. 공개 선언 등록, 사용자 .cpp 컴파일, 실행 중 네이티브 함수 호출은 각각 검증한다. 객체는 ID로 전달하며 임의 포인터를 JSON으로 넘기지 않는다. 함수 결과·참조 출력·속성·Transform·C++ 이벤트가 BP 실행 월드와 동기화되어야 한다. 코드 빌드 실패는 이전 유효 결과를 제거하지 않는다.

Unity의 Awake/Start/FixedUpdate/Update/LateUpdate와 Unreal의 Construction/BeginPlay/Tick을 이름만 바꿔 혼합하면 안 된다. HB의 생명주기는 문서로 고정한다. 컴포넌트 생성 → 초기값/오버라이드 적용 → 생성 구성 → BeginPlay → 게임 Tick/고정 물리 단계 → EndPlay → 지연 작업/구독 해제 → 객체 제거 순서다. 편집 중 Construction은 별도 미리보기 월드에서 실행한다. 실제 Unreal의 로드/PIE 경로와 완전히 동일하다고 표현하지 않는다. [Unity: Execution order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html), [Unity: FixedUpdate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.FixedUpdate.html), [Epic: Actor lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)

## Timeline, Animation, 상태 머신의 구분

| 도구 | 맡는 동작 | 필요한 편집 방식 |
| --- | --- | --- |
| BP Timeline | 시간에 따라 값·이벤트를 출력해 로직을 제어 | Float/Vector/Color/Event 트랙, 키 Time/Value, 보간/접선, 재생 제어 핀 |
| Animation Clip | 객체/뼈/컴포넌트 속성을 시간에 따라 변경 | Dopesheet·Curve, 속성 추가, 키 선택/이동, Record/Preview, 이벤트 |
| Animation Controller | 상태·조건·블렌딩으로 클립/포즈 선택 | 상태/전이 그래프, 파라미터, 레이어, 블렌드, 실제 대상 바인딩 |
| Sequencer | 여러 객체와 카메라의 장면 연출 | 객체/샷/클립 트랙, 구간·중첩, 바인딩, 이벤트, 렌더링 |

**문서 확인:** Unreal Timeline은 더블클릭으로 전용 편집 탭을 열며 값 트랙과 Event 트랙, 길이·Loop·Autoplay·마지막 키 사용을 다룬다. Play는 현재 위치에서, Play from Start는 0에서, Reverse는 현재 위치에서, Reverse from End는 끝에서 시작한다. Set New Time은 시간을 변경하는 실행 입력이고 New Time은 숫자 입력이다. 보간은 다음 키까지의 구간에 적용된다. [Epic: Timeline editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/editing-timelines-in-unreal-engine), [Epic: Timeline controls](https://dev.epicgames.com/documentation/en-us/unreal-engine/timelines-nodes-in-unreal-engine), [Epic: Keys and curves](https://dev.epicgames.com/documentation/unreal-engine/keys-and-curves-in-unreal-engine)

Unity Animation은 Dopesheet/Curve, 선택 키 F·전체 A 초점, 프레임·키 이동, Preview/Record, 잠금 등을 제공한다. 커브는 키와 좌우 접선, 다중 선택·영역 선택·이동·삭제·확대를 함께 다룬다. Unreal Animation Blueprint는 Skeletal Mesh에 할당되어 Event Graph와 Anim Graph에서 실제 포즈를 계산하며 State Machine은 상태와 전이를 분리한다. [Unity: Animation window](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-UsingAnimationEditor.html), [Unity: Curves](https://docs.unity3d.com/6000.0/Documentation/Manual/EditingCurves.html), [Epic: Animation Blueprint](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine), [Epic: State machines](https://dev.epicgames.com/documentation/unreal-engine/state-machines-in-unreal-engine)

**HB 결정:** Timeline 노드에는 제어 핀·출력만 두고 커브는 전용 문서에서 편집한다. 키 JSON 입력을 주요 편집 수단으로 쓰지 않는다. XYZ/RGBA는 채널별 색과 표시 토글을 갖는다. Event 트랙은 실행 출력으로 연결한다. 일반 Animation 창과 BP Timeline 창은 같은 커브 데이터 규칙을 재사용하되 서로 다른 대상과 실행 의미를 유지한다. 단일 도형 회전 미리보기를 스켈레탈 애니메이션 구현으로 표시하지 않는다.

**현재 상태:** 독립 Animation 파일을 `Play Animation`/`Stop Animation`으로 실제 대상 오브젝트에 적용한다. 키가 있는 position/rotation/scale vec3 트랙만 지원하고 값은 대상 속성에 덮어쓴다. 회전은 XYZ Euler degree다. 노드 Loop와 에셋 `playRate/lastKeyframe/ignoreTimeDilation`을 적용하며 정지/완료는 마지막 값을 유지한다. 같은 이름의 모델 내장 클립을 우선한다. 선택적인 `readAsset` hook은 열린 편집본 공급을 지원하고 기본 경로는 Project 파일을 읽는다. 대상 파괴/서비스 종료는 재생 상태를 해제한다. 독립 Animation 이벤트 트랙·임의 속성·Skeleton/리타깃/상태 머신/블렌딩은 남아 있다.

Unity의 속성 커브 문서는 시간별 키와 속성별 표시, Euler/Quaternion 회전 보간의 차이를 구분한다. HB의 세 Transform 트랙과 Euler 값 평가는 이 중 일부를 구현한 자체 규칙이다. Quaternion 최단 회전이나 Animator의 포즈/블렌딩 동작까지 구현한 것으로 해석하지 않는다. [Unity: Animation curves](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-AnimationCurves.html)

## 머테리얼, 조명, 렌더링

**문서 확인:** Unreal Material Editor는 미리보기 메시·그래프·선택 Details·Palette·컴파일 통계·플랫폼 오류·생성 HLSL 보기를 연결한다. PBR의 Base Color/Roughness/Metallic/Specular는 광원과 표면 반응을 설명하는 입력이다. Unity는 서로 다른 렌더 파이프라인을 제공하며 대상·품질에 따른 선택이 필요하다. [Epic: Material Editor UI](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-editor-ui), [Epic: PBR](https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine), [Unity: Render pipelines](https://docs.unity3d.com/6000.0/Documentation/Manual/render-pipelines-overview.html)

**HB 결정:** 머테리얼 노드는 타입 검사 후 HLSL과 Shader 파이프라인에 연결해야 완성이다. 상수·Texture Sample·UV·연산·Normal·표면 출력, 함수·인스턴스 파라미터, Blend/Culling/Depth, 컴파일 위치·시간·비용이 필요하다. 태양·하늘·구름·안개·환경광·그림자·후처리·노출은 장면 설정과 실제 렌더러 입력을 공유한다. 기본 프리셋과 품질 단계는 준비하되 DX11에서 구현할 실제 지원 범위를 표시한다. PBR이라는 이름이 자동으로 현실과 같은 결과를 보장하지 않는다.

**현재 상태:** 독립 머테리얼 파일은 그래프와 표면을 저장한다. 현재 색/스칼라 노드의 연결 결과를 제한된 표면 값으로 계산해 preview·장면 할당·`setMaterial`에 사용한다. HLSL/Texture/UV/Normal/Shader 컴파일은 아직 없다. Transform Animation과 Curve의 편집·저장은 별도 문서이며 Transform Animation의 대상 실행 범위는 앞 절에 적었다. 도형 preview와 Transform 실행을 Skeleton/AnimBP/상태 머신의 구현으로 표시하지 않는다.

## 입력, 충돌, 2D, 오디오, UI와 확장 영역

**입력 — 본문 확인:** Enhanced Input은 Action/Context/Modifier/Trigger를 구분하고 문맥의 우선순위·실행 중 교체·Started/Triggered/Completed 같은 상태를 제공한다. HB도 물리 키와 ‘이동/상호작용’ 동작을 분리하고 BP/C++가 같은 입력 액션을 받게 한다. 게임 키와 편집기 단축키가 동시에 실행되지 않아야 한다. [Epic: Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)

**입력 — 현재 상태:** IA의 bool/float/vec2/vec3·dead zone·pressed/held/released·소비와 IMC의 액션/키/축/배율/우선순위를 독립 에셋에서 편집한다. 클래스에 IMC를 지정하고 우클릭 검색에 IA 파일명 이벤트를 제공한다. 게임 VM은 Started/Triggered/Completed와 프레임 기반 held를 실행한다. Ongoing/Canceled·Hold/Tap/Chord·런타임 문맥 교체·게임패드/마우스 축·플레이어별 입력·C++ 직접 구독은 미구현이다.

**충돌 — 본문 확인:** Unreal은 Object/Trace 반응과 Block/Overlap/Ignore, Hit/Overlap 이벤트 생성 조건을 구분한다. HB는 충돌 채널/마스크·트리거·리지드바디·고정 시간 단계·Ray/Shape Query·HitResult·힘/속도·마찰·반발·CCD·디버그 표시를 포함한다. 단순 박스 겹침만으로 물리 엔진 전체를 구현했다고 표시하지 않는다. [Epic: Collision overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview)

**2D — 개요/스프라이트 본문 확인:** Paper2D는 Sprite/Flipbook/TileSet/TileMap과 2D/3D 혼합을 제공한다. HB는 텍스처 Sprite 분할·Pivot·Sorting·9-slice, 타일 팔레트·레이어·페인트/지우기/채우기·자동 타일·충돌 편집, Flipbook/2D 상태 머신, 2.5D 카메라·빌보드를 포함한다. 하위 타일 편집/물리 구현은 추가 세부 조사와 실제 게임 검증이 필요하다. [Epic: Paper2D](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-overview-in-unreal-engine), [Epic: Sprites](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-to-import-and-use-paper-2d-sprites-in-unreal-engine)

**오디오 — 편집기 본문 확인:** Sound Cue는 노드 신호 경로·Palette·선택 Details·미리보기를 연결한다. HB는 Audio Source/Listener, 재생·정지·페이드, 2D/3D 감쇠·거리·루프·믹서·동시 재생 제한·버스를 포함한다. DSP·플랫폼 백엔드는 아직 개별 분석/실행이 필요하다. [Epic: Sound Cue Editor](https://dev.epicgames.com/documentation/unreal-engine/sound-cue-editor-ui-in-unreal-engine?lang=en-US)

**게임 UI — 개요/바인딩 본문 확인:** UMG 계열은 화면 제작과 동작 연결을 구분하며 Viewmodel은 변경된 값에 연결된 위젯을 갱신하는 방식을 설명한다. HB는 Widget 트리·Canvas·Anchor/Pivot·정렬/크기 규칙·해상도/안전 영역·입력/포커스·이벤트·상태·애니메이션·데이터 바인딩·폰트·접근성을 목표로 둔다. UI Designer 세부 레이아웃 알고리즘과 런타임은 아직 추가 조사/구현 대상이다. [Epic: UI overview](https://dev.epicgames.com/documentation/unreal-engine/creating-user-interfaces-with-umg-and-slate-in-unreal-engine), [Epic: Viewmodel](https://dev.epicgames.com/documentation/unreal-engine/umg-viewmodel-for-unreal-engine)

**저장 — 본문 확인:** Unity 직렬화는 필드·참조·인라인 값·지원 컨테이너의 규칙이 다르고 공유/순환 참조는 명시적으로 다룬다. HB는 버전 있는 텍스트 에셋과 ID 참조를 사용하고 편집기 설정, 프로젝트 데이터, 런타임 SaveGame을 분리한다. 잘못된 입력은 적용 전 검증해 기존 작업을 보존한다. [Unity: Serialization rules](https://docs.unity3d.com/6000.0/Documentation/Manual/script-serialization-rules.html)

**전체 범위에 포함하지만 개별 세부 분석이 남은 항목:** AI/Navigation/Behavior Tree, 네트워크 복제·RPC·권한, 파티클/VFX, Terrain/LOD/Streaming, 큰 월드, Profiler/Memory/GPU 진단, Localization, 플러그인/에디터 확장, 자동화/Headless 빌드, 에셋 Diff·버전 관리·복구. 이 항목을 숨기거나 완료로 처리하지 않는다. 각 구현 전에 공식 하위 문서·데이터 계약·실행 조건·실제 사용 검증을 추가한다.

## 복잡함과 비용을 줄이는 HB 설계 판단

아래는 성능 벤치마크 결과가 아니라 위 구조를 HB에 적용할 때의 결정이다.

| 문제 | 원인을 확인할 구조 | HB에서 적용할 선택 | 줄이면 안 되는 기능 |
| --- | --- | --- | --- |
| 너무 많은 버튼·용어 | 문맥별 도구·패널·메타데이터가 여러 곳에 분산 | 선택 대상의 Inspector, 기본/고급 그룹, 검색 가능한 명령·도움말 | 세부 속성·오류·실행 의미 |
| 무거운 편집 | 상시 미리보기, 여러 카메라, 임포트/Shader/빌드 작업 | 숨겨진 창 업데이트 중지, 품질 단계, 변경 대상만 갱신, 작업 취소 | 올바른 의존성·재가져오기 |
| 코드/노드 기능 불일치 | 수동 노드와 별개 API, 타입 중복 | 공통 C++ 선언에서 등록·핀·wrapper 생성 | 타입·참조·이벤트·진단 |
| 처음부터 복잡한 제작 | 세부 설정을 먼저 요구 | 장면/2D 템플릿·기본 컴포넌트·동작 프리셋 | 사용자가 수정·확장할 경로 |
| 가벼우나 기능이 얕음 | 클릭 가능한 UI만 있고 실행기·파일이 없음 | 편집→저장→실행→디버그→재열기까지 한 흐름으로 검증 | 네이티브 런타임·배포 |
| AI가 편집하기 어려움 | 화면 좌표·임시 이름에 의존 | 안정적인 ID·명시적 타입·버전·참조·진단 위치·공통 명령 | 사람이 UI로 확인·수정하는 경로 |

## 현재 코드 점검: 완료 판정은 다섯 단계

기능마다 **UI 입력 → 모델/타입 검증 → 디스크 저장/복원 → 런타임 효과 → 재현 가능한 검사**를 확인한다. 노드 숫자와 화면만으로 완료 판정하지 않는다.

| 코드에서 확인한 문제 | 적용 결과 | 검증/남은 범위 |
| --- | --- | --- |
| Timeline 글자 잘림 | Animation CSS 범위 제한·제목/핀/노드 폭 수정 | 화면에서 읽힘 확인 |
| 좁은 아래 Timeline | 주 문서 탭에 열고 사용자가 도킹 | 키 선택·보간/시간 편집 확인 |
| 독립 Animation이 미리보기만 제공 | Play/Stop Animation에 저장 에셋의 position/rotation/scale·Loop/Rate/시간 배율 연결 | `test:runtime`: 실제 대상 값·정지/완료·반복·검증 실패/정리·모델 클립 우선 검사; Skeletal/상태 머신/Animation 이벤트는 남음 |
| 창 하나만 전환 | 독립 에셋 문서·분할·탭·최대화/복원·추가 직교 카메라·클래스 컴포넌트 뷰포트 | 문서별 데이터/Undo/저장/닫기 보호; OS 부동창·전체 컴포넌트 preview는 남음 |
| 가짜 에셋 카드·메모리 가져오기 | 실제 디스크 Project·파일 가져오기·내용 검색 | 다중 선택/가져오기/문서 화면 및 서버 재열기 검사 |
| Play는 선 강조 | 전체 그래프 VM·실행 월드·Step/Continue | 중단점 뒤 Sequence·매크로 지연·반복·Timeline 재개 검사 |
| C++는 헤더만 등록 | 실제 g++ 빌드·RPC wrapper·상태/이벤트 연결 | C++→BP 위치/회전 변경, Stop 원복 화면 확인 |
| 기본 함수 부족 | 373개 등록, 공통 C++ 289개, 추가 함수 221개·typed IA 이벤트 | 공통 함수 C++/JS 결과·서명·JSON·입력 실행 검사 |
| 노드 200개 제한 | 그래프당 1,000노드·5,000연결 | 등록된 전체 노드가 한 그래프에 저장되는 검사 |
| 잘못된 C++/SaveGame 출력 | 전체 타입/상태 검증 후 적용 | 비정상 반환/Transform 거부·원본 보존 검사 |
| 포커스별 키 | 문서 포커스·텍스트·IME 가드 | 전 조작 프로필·설정 가능한 Shortcut Manager는 남음 |
| 서비스별 실제 지원 | Mesh Raycast·기본 오디오/클립/표면/위젯/SaveGame | openScene은 명시적 오류, 강체·3D음향·native 서비스는 남음 |
| 파일 제작 메뉴 없음 | 폴더 우클릭 JSON 에셋 8종·C++ 한 쌍·부모 7종 생성 | 생성/중복 거부·자료형/부모·실제 빌드 검사; 별도 Struct/Enum/Interface/UI/VFX/Audio 에셋은 남음 |
| 여러 BP가 같은 실행 그래프를 사용 | 장면 `blueprintAsset`별 검증/인스턴스·입력 에셋 로드·native 빌드 소유 상태 격리 | 다중 BP 이벤트/입력 실행·다른 모듈의 공개 상태 보존 검사 |
| 이름 변경 뒤 참조 손상 | 열린 문서/참조/배치 갱신·영속 redirect·실패 rollback | 서버 재시작 뒤 구 경로 해석 검사; 전체 디스크 참조 Fixup/의존성 UI는 남음 |
| 엔진 실행 파일·프로젝트 시작 흐름 없음 | Win32/WebView2 HBEngine.exe·Node 동봉·프로젝트 허브/descriptor·최근·생성/열기·프로젝트별 복구 | `test:desktop` 실제 EXE/내장 탐색/종료 정리, `test:launcher/test:session` 재현 검사; 설치/업데이트·템플릿 선택/업그레이드는 남음 |
| native 렌더러·게임 배포 | Win32 편집기 호스트와 C++ worker까지 구현 | DX11·셰이더 그래프·cooking·독립 게임 배포가 장기 범위 |

노드별 전체 서명과 실행 범위는 [노드 카탈로그](NODE_CATALOG.md)에 있다. 이 문서의 전체 범위는 장기 엔진 목표이며, 현재 작업을 완성된 Unreal/Unity 대체 엔진으로 부르지 않는다.

## 구현 작업의 우선순위와 사용 검증

1. **기초 조작**: 읽히는 노드/속성, 포커스별 키, 선택·우클릭·이동·확대·Undo, 도킹·레이아웃 복구. 사용자가 별도 지시하지 않아도 전 편집기에서 점검한다.
2. **실제 제작 연결**: 디스크 Project, 다중 임포트/선택/검색, 그래프 실행, 사용자 C++ 빌드/호출/이벤트/객체 상태 연결. 저장 후 서버/편집기 재시작까지 확인한다.
3. **네이티브 기반**: 구현한 Win32 편집기 호스트에서 DX11 렌더러, 장면/컴포넌트·입력·고정 물리·수명·시간 공통 API로 이어간다. WebView2/WebGL·C++ worker와 완성된 게임 런타임을 구분한다.
4. **전용 제작 도구**: Sprite/Tilemap, Mesh, Shader/Material, Clip/State Machine, UI/Audio, Prefab, 임포트 변환·재가져오기. 각 에셋은 만들기→편집→배치→게임 사용이 연결되어야 한다.
5. **안정화/배포/확장**: 복구·성능·빌드·게임 패킹·AI/네트워크/대규모 프로젝트 도구. 작은 2D 게임과 2.5D/3D 장면을 외부 엔진 없이 제작·배포해 확인한다.

각 작업은 사용자에게 또 ‘어떤 기본 기능이 빠졌는지’ 찾아달라고 요구하지 않는다. 이 목록과 인터랙션 기준에서 빠진 항목을 개발자가 먼저 점검하고, 실제 동작/저장/진단과 함께 추가한다.
