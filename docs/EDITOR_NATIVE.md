# 편집기 네이티브 전환

## Windows Direct3D12 전환 상태

- 메인 장면, 추가 뷰포트, 머테리얼, 블루프린트 컴포넌트, 애니메이션 미리보기는 직접 D3D12를 요청해요. 각 화면은 독립 Win32 표면을 사용하고, 창을 분리하거나 합치면 기존 표면을 이동해요. 실시간 프레임은 표면별로 한 번에 하나만 제출해요.
- 머테리얼 미리보기의 환경광은 엔진의 HDRI 프로브 경로에서 계산해요. D3D12 노드 머테리얼과 프로브의 바이트코드는 기존 제한 큐에서 백그라운드로 준비하고, 렌더러가 소유 스레드에서 채택해요.
- 콘텐츠 브라우저는 추가 창도 창별 Win32 목록, 폴더 트리, 검색·보기 도구를 사용해요. 목록 그리기와 포인터 선택은 표시 범위를 사용해요. 아이콘 버튼과 툴팁, 계층·속성 머리줄, 주 메뉴와 출력 로그도 Win32 쪽에 연결돼요.
- Windows 네이티브 게임 빌드에서 API를 지정하지 않으면 D3D12를 사용해요. 저장된 명시적 호환 프로필은 해당 API를 사용해요. D3D12에서는 HUD 변경 타일을 GPU 텍스처로 보내고 장면 후처리 뒤 같은 프레임에 합성해요. HUD의 글자·SVG·위젯 래스터와 입력은 기존 공용 모델을 사용해요.
- Windows 데스크톱의 `HBEngine.exe --native-editor [프로젝트.hbproject]`로 WebView2 없이 편집기를 열 수 있어요. 프로젝트 열기·생성·최근 목록과 콘텐츠 검색, 에셋 생성, 문서 탭·저장·Undo/Redo, 문서 창 분리·합치기가 Win32에서 실행돼요. 에셋 속성의 숫자·문자열·체크 및 중첩 항목은 속성 창에서 수정할 수 있어요.
- 네이티브 블루프린트·머테리얼 그래프에서 노드 추가·이동·삭제, 핀 연결·해제, 연결되지 않은 핀의 기본값 편집을 지원해요. 그래프와 속성의 글자·도형은 DirectWrite·Direct2D로 래스터화해 직접 D3D12 스왑 체인으로 표시해요. 두 패널은 D3D12 장치와 업로드 버퍼를 공유해요.
- 네이티브 장면 문서는 엔진의 D3D12 렌더러로 그려요. 뷰포트에서 선택·회전·이동·확대·초점을 제어하고, 카메라 콤보에서 장면 카메라로 전환해요. 계층에서 접기·잠금·표시·부모 변경과 오브젝트 추가·복제·삭제, 컴포넌트 추가 및 속성 수정을 할 수 있어요.
- 네이티브 애니메이션·커브 편집기는 트랙의 키를 표시하고 클릭으로 샘플링해요. 더블클릭으로 키를 추가하고, 드래그와 Delete로 옮기거나 지워요. 위젯 캔버스는 공용 게임 위젯 래스터를 사용하며 요소 추가·선택·이동·삭제와 속성 편집을 지원해요.
- 네이티브 파일 메뉴에서 에셋 가져오기와 저장 충돌 복구를 열어요. 보기 메뉴에서 콘텐츠 브라우저·속성 너비를 변경할 수 있고, 편집기 창 위치와 패널 너비를 다음 실행에 복원해요.
- 네이티브 빌드 메뉴는 저장된 빌드 프로필로 검사·패키징을 요청하고, 마지막 Windows 결과물을 실행할 수 있어요.
- 보기 메뉴의 에셋 3D 미리보기는 머테리얼과 블루프린트 컴포넌트를 독립 D3D12 표면에서 그려요. 비동기 머테리얼 셰이더가 준비되면 해당 오브젝트를 그려요. 준비 중에도 다른 오브젝트는 계속 표시돼요.
- 기본 실행은 기존 편집기를 사용해요. 네이티브 전환의 남은 범위에는 전체 도킹 트리·다중 독립 문서, 세부 에셋 편집기, 편집기 안의 게임 실행과 빌드 프로필 관리 UI가 있어요.

관련 검사 `check-editor-native-viewport.mjs`, `check-editor-native-assets.mjs`, `check-editor-native-hierarchy.mjs`, `check-editor-native-inspector.mjs`, `check-build-profiles.mjs`, `check-native-game.mjs`.

## 네이티브 문서 명령

`tools/native-editor-session.mjs`는 줄마다 `{"method":"document.open","params":{"path":"Assets/…"}}`를 표준 입력에서 받아 `{"ok":true,"value":…}` 또는 오류를 표준 출력으로 돌려줘요. 프로젝트가 열리면 `content.list`, `document.read`, `document.patch`, `document.save`, `graph.read`, `graph.edit`, `editor.undo`, `editor.redo`를 사용할 수 있어요. 수정과 저장은 읽을 때 받은 `revision`을 `expectedRevision`으로 전달해요. `document.patch`의 `dryRun`으로 먼저 변경을 검증할 수 있어요. 네이티브 UI와 이 명령은 같은 프로젝트 서비스와 에셋 검증기를 써요.

`node tools/check-native-authoring.mjs [HBEngine.exe]`는 격리된 프로젝트와 화면 밖 Win32 창에서 D3D12 장면 픽셀, 오브젝트 위치·컴포넌트 저장, 애니메이션 키 추가, 위젯 이동, 그래프 입력과 분리·복귀, 외부 수정 충돌을 확인해요.

아래는 초기 이전 단계의 기록이에요.

1. 장면 뷰포트를 엔진 렌더러로 (완료, 아래)
2. 편집기 패널을 네이티브 위젯(게임 UI의 Skia 위젯 시스템)으로 하나씩 이전: 계층·속성·에셋 목록부터, 노드 그래프는 나중에
3. WebView2 제거, 예전 WebView 게임 실행 옵션(`windowsRuntime: 'webview'`) 삭제

## 1단계 장면 뷰포트

- 편집기 EXE(`HBEngine.exe`)에 `SceneRenderBridge`를 넣었어요. 전에는 WebView 게임 플레이어 빌드에만 있어서 편집기는 three.js/WebGL로만 그렸어요.
- 데스크톱 호스트에서는 `#scene-canvas`를 `createGameRenderer(...,'d3d11',...,{embedded:true})`로 열어요. 브리지에 `auto`를 요청하므로 하드웨어 직접 Direct3D12 우선, 실패하면 Direct3D11이에요. 네이티브가 안 열리면 오류를 로그에 남기고 WebGL2로 그려요.
- 그리는 방식: 호스트 창 전체 크기의 스왑체인이 투명한 WebView 뒤에 있고, 캔버스 사각형을 뷰포트·가위 영역으로 써요. 캔버스 밖은 편집기 배경색(`--bg`)으로 지우고, 캔버스의 조상 요소 배경은 투명하게 바꿔요(`native-scene-renderer.js`의 `embed`).
- 편집기도 셰이더 디스크 캐시를 쓰고, 처음 실행할 때 번들 `Shaders`(`dist/HBEngine/Shaders`)로 채워요. 전에는 편집기 빌드에 캐시 설정이 없어 DX12 초기화가 매번 약 30초 걸렸어요.
- 프레임은 한 번에 하나만 보내요. 제출 뒤 `hbFinishFrame`으로 완료를 기다리고, 앞 프레임이 끝나기 전 프레임은 건너뛰어요.
- 남은 WebGL: 머테리얼 미리보기(호스트에 네이티브 렌더러가 하나라서), 렌더러를 공유하는 추가 도킹 뷰포트(네이티브에서는 비어 있음; 카메라 뷰 `selectCameraView`로 옮길 예정), RoomEnvironment 기본 환경맵(네이티브는 자체 하늘 캡처·프로브 사용).

검증: `node tools/check-editor-native-viewport.mjs` — 숨긴 실제 편집기와 임시 3D 프로젝트에서 뷰포트 백엔드 `D3D12`(`requestedBackend:auto`), 그리기 33개, 네이티브 표면 캡처에서 캔버스 안은 음영 있는 장면(서로 다른 색 14개), 캔버스 밖은 편집기 배경 `32,34,38`. 기존 `check-distance-field-822-editor`, `check-mesh-renderer-1620-editor` 통과. 보이는 창 사람 확인은 하지 않았어요.

## 2단계 진행: 계층(아웃라이너) 패널

- `native/desktop/EditorTreePanel.hpp`: 편집기 창의 Win32 자식 창(WebView 위)으로 Direct2D·DirectWrite로 그려요. 한글은 DirectWrite 글꼴 대체로, 아이콘·접기·잠금·표시는 Segoe MDL2 Assets 글리프예요.
- 패널이 직접 처리: 행 배치·스크롤(휠), 호버, 클릭 선택(Ctrl·Shift), 접기, 잠금·표시 전환, 드래그 재배치(행 위·빈 곳=루트), 더블클릭 초점, 키 입력.
- 우클릭 메뉴는 Win32 `TrackPopupMenu`예요. 항목은 편집기 스크립트의 `sceneMenuItems()`(HTML 메뉴와 같은 목록)에서 받아요.
- 스크립트 쪽(`app.js`): 장면 모델과 명령 실행은 그대로 두고, `sceneRows()` 결과·테마 색·`#hierarchy-list` 위치를 `hb.panel` 메시지로 보내고, 패널이 보낸 의도(select·fold·lock·visible·reparent·activate·contextmenu·command·key)를 기존 함수로 처리해요. 키는 `#hierarchy-list`에서 `keydown`으로 다시 보내 기존 단축키 처리를 써요.
- 겹침(airspace): HTML 떠 있는 메뉴나 열린 `dialog`가 있으면 패널을 잠깐 숨겨요. 패널을 다른 창으로 분리하면 숨겨요(분리 창 지원은 아직).
- 남은 HTML: 패널 제목·검색칸·빠른 추가 버튼(다음 이전 대상), 아래 속성 패널 외 다른 패널.

검증: `node tools/check-editor-native-hierarchy.mjs` — 숨긴 실제 편집기에서 패널 창이 WebView 위에 있고 HTML 행은 0개, 실제 WM_ 마우스·키 메시지로 선택, Ctrl 다중 선택, 숨기기, 잠금, 접기/펼치기, 그룹으로 드래그, 루트로 드래그, 네이티브 메뉴의 7번째 항목(`scene:duplicate`) 실행, Delete 키 삭제까지 11단계 통과. 같은 그리기 코드의 PNG 스냅샷으로 한글 이름·아이콘·들여쓰기를 눈으로 확인했어요. `check-editor-distance-1780-window`(네이티브 메뉴로 거리장 준비), `check-editor-native-viewport` 통과. `check-sequence-values-212-window`는 계층 확인을 지난 뒤 시퀀스 트랙 선택 `[data-select-track]`이 없어 실패해요(트랙 목록 가상화 쪽 문제로 보이며 이번 변경과 무관해 보이나 확인하지 않았어요). 보이는 창에서 사람이 직접 조작해 보지는 않았어요.

## 2단계 진행: 속성(인스펙터) 패널

- 공통 기반 `native/desktop/EditorPanelBase.hpp`(자식 창, Direct2D·DirectWrite, 테마·배율·위치, PNG 스냅샷, 키 전달)를 만들고 계층 패널도 그 위로 옮겼어요.
- `native/desktop/EditorFormPanel.hpp`: 섹션 제목(접는 섹션 포함), 안내 문구, 라벨+컨트롤 행을 그려요. 컨트롤은 글자·숫자·여러 줄 글자(Win32 EDIT로 편집해 한글 입력기·복사·붙여넣기 그대로), 선택(네이티브 팝업 메뉴), 체크, 범위(드래그 중 input·놓으면 change), 색(Windows 색 대화상자), 버튼이에요. 휠 스크롤과 스크롤 막대를 직접 그려요.
- 원본은 기존 HTML 폼이에요. `app.js`가 `#inspector-content`의 제목·컨트롤을 행으로 읽어 보내고(바뀐 경우에만, 매 프레임 확인), 네이티브 편집은 같은 HTML 컨트롤에 값을 넣고 `input`/`change`를 보내 기존 처리 코드를 그대로 써요. 버튼은 `click()`, 섹션 접기는 `details.open`. 모델 번호(`revision`)가 다르면 늦게 온 편집은 버려요.
- HTML 폼은 네이티브 패널 아래에 그대로 그려져요(텍스트 조회·대체 표시용). `.inspector`의 HTML 스크롤만 끄고 스크롤은 네이티브가 해요.

검증: `node tools/check-editor-native-inspector.mjs` — 숨긴 실제 편집기에서 실제 WM_ 메시지로 이름(EDIT로 "빨간 공"), 위치 X(3.5), 부모 선택(네이티브 팝업), 체크박스, 범위 드래그, 색(#ff0000), Mesh Renderer 섹션 접기(행 44→30)까지 통과하고 편집기 모델이 따라왔어요. 스냅샷으로 한글 라벨·벡터·선택·색 견본·슬라이더·체크박스를 눈으로 확인했어요. `check-editor-native-hierarchy`, `check-editor-native-viewport`, `check-editor-distance-1780-window`, `check-distance-field-822-editor` 통과.
- 알려진 기존 문제: `check-mesh-renderer-1620-editor`는 편집기 종료가 약 13~14초 걸려 10초 제한에 걸려요. 네이티브 패널을 C++·JS 모두 끈 빌드에서도 같아서 이번 변경 때문이 아니고, 종료 중 JS 닫기 처리(복구 저장·저장소 비우기) 구간이 느린 걸로 보여요(렌더러 종료는 47ms).

## 2단계 진행: 콘텐츠 브라우저 에셋 목록

- `native/desktop/EditorListPanel.hpp`: 목록·타일 보기, 호버, 클릭 선택(Ctrl·Shift), 더블클릭 열기, 휠 스크롤, 키 입력, 바깥으로 끌어 놓기. 우클릭 메뉴 팝업은 공통 기반(`EditorPanelBase::showMenu`)으로 옮겨 세 패널이 같이 써요.
- `app.js`: 기본 콘텐츠 브라우저(`projectBrowsers.get('project')`)의 항목·선택·보기를 보내요. 목록(경로·순서·보기)이 바뀔 때만 모델 번호를 올려 늦은 클릭을 버려요.
- 우클릭: 기존 `ProjectBrowser.menu`가 만든 HTML 메뉴를 숨긴 채 버튼 목록을 네이티브 팝업으로 띄우고, 고른 버튼을 눌러 원래 동작을 실행해요(`nativeMenuFromHtml`, 다른 HTML 메뉴에도 쓸 수 있어요).
- 끌어 놓기: 패널 밖에서 놓으면 그 위치의 HTML 요소에 `application/x-hb-assets` 데이터로 `dragenter/dragover/drop`을 보내요. 장면 뷰포트의 기존 `placeAsset`이 그대로 동작해요.
- 네이티브 뷰포트가 OBJ·FBX 가져오기의 Phong/Lambert/Toon 재질도 그려요(Phong 광택→거칠기, 금속 0). 전에는 모델을 놓으면 "DirectX 셰이더 변환이 필요해요" 오류였어요.
- 남은 HTML: 추가 콘텐츠 브라우저 창. 타일은 썸네일 대신 종류 아이콘이에요.

검증: `node tools/check-editor-native-assets.mjs` — 숨긴 실제 편집기에서 Models 폴더 더블클릭 열기, 선택, Ctrl 선택, 네이티브 메뉴 65항목 중 "에셋 정보" 실행(대화상자 열림), 모델을 뷰포트 가운데로 끌어 놓아 오브젝트 +1, Backspace로 뒤로 가기 통과. 스냅샷 확인. 계층·속성·뷰포트·1780·822 편집기 검사 재통과.

## 2단계 진행: 콘텐츠 브라우저 폴더 트리·도구줄

- 폼 패널을 이름별로 여러 개 만들 수 있게 했어요(호스트 `app.form(name)`, 메시지 `op:"form", panel:이름`). 속성 패널도 그중 하나(`inspector`)예요.
- `app.js`의 `registerNativeForm(name,{root,rect,single,label,focus})`: 등록한 HTML 영역의 컨트롤을 행으로 보내고 편집을 되돌려요. `single`이면 한 줄 도구줄로 그려요. 콘텐츠 브라우저의 이동 버튼(`.project-navigation`), 검색·종류·체크·새로고침·보기 버튼(`.project-tools`), 상태 줄(`.project-status`, 결과 글자를 라벨로)을 등록했어요.
- 폴더 트리: 두 번째 `EditorListPanel`(`folders`)에 깊이별 들여쓰기를 넣었어요. 클릭·더블클릭은 폴더 이동, 우클릭은 그 폴더 기준 브라우저 메뉴를 네이티브 팝업으로 띄워요.
- 수정: 폼 모델 번호를 컨트롤 구성(종류·개수)이 바뀔 때만 올려요. 전에는 값만 바뀌어도(입력, 기즈모 드래그) 번호가 올라 바로 이어진 편집이 버려질 수 있었어요.

검증: `check-editor-native-assets` 확장 — 폴더 트리 클릭 이동(7개 폴더), 도구줄 타일 보기 버튼(네이티브 목록도 타일로), 검색칸 EDIT로 "Cube2" 검색(1개)·지우기, 뒤로 버튼, 상태 줄의 새 폴더 버튼(대화상자) 통과. 도구줄·폴더 트리 스냅샷 확인. 계층·속성·뷰포트·1780·822 재통과.
