# 뷰포트 조작·제작 기능 조사와 입력 구현

기준일: 2026-10-03. 카메라 이동뿐 아니라 선택·변형·표시·카메라 제작·성능·창 배치까지 서로 다른 제작 책임으로 조사했다. 아래는 실제 읽은 본문과 현재 공통 입력 모듈의 대조이며, 연결된 모든 API나 Unreal의 모든 렌더링 기능을 구현했다는 뜻은 아니다. 기존 2D·2.5D·3D 및 다른 엔진 분야의 누적 요구도 유지한다.

## 실제 읽은 공식 본문

| 자료 | 확인 범위 | 제작 판단 |
| --- | --- | --- |
| [Epic: Viewport Controls, UE 5.8](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-controls-in-unreal-engine) | 선택, 원근/직교 마우스, 비행, 회전축 탐색, 변형, 표시, Preferences 전체 | 원근 비행과 직교 선택을 같은 드래그로 취급하지 않는다. RMB의 W/E/R/F는 도구 단축키보다 카메라 입력이 우선이다. |
| [Epic: Viewport Toolbar, UE 5.8](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-toolbar) | 5.6 이후 툴바, 변형/스냅, 카메라/속도, View Modes/Show Flags, 성능, 설정/배치, 에셋별 뷰포트 전체 | 메뉴는 작업 종류와 활성 뷰포트에 맞춰 구성한다. 머테리얼 미리보기에 레벨의 전체 메뉴를 그대로 붙이지 않는다. |
| [Epic: Editor Preferences, UE 4.27](https://dev.epicgames.com/documentation/unreal-engine/editor-preferences?application_version=4.27) | Controls, Viewport Look and Feel, Level Editing 및 나머지 본문 | 비행 키 접근 방식, 직교 커서 중심 확대, 직교 창 연결은 별도 설정이다. 문서 버전을 최신으로 잘못 표시하지 않는다. |
| [Epic: Viewport Controls, UE 4.27](https://dev.epicgames.com/documentation/unreal-engine/viewport-controls?application_version=4.27) | 전체 조작 표, 거리 비례 속도, 선택 중심 회전, FOV 복귀, 선택/변형 세부 | Z/C의 FOV 변화는 RMB를 놓으면 복귀한다. Ctrl 드래그와 피벗 조작은 카메라 입력과 별도로 선택/변형 담당이 처리해야 한다. |
| [Epic: ULevelEditorViewportSettings, UE 5.8](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/UnrealEd/ULevelEditorViewportSettings?lang=en-US) | Controls/LookAndFeel/GridSnapping 필드와 공개 접근 함수 | 감도·뒤집기·월드 수직 팬·선택 외곽선·그리드 간격은 제작 설정으로 분리한다. |
| [Epic: FEditorViewportCameraSpeedSettings, UE 5.8](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/UnrealEd/FEditorViewportCameraSpeedSettin-?lang=en-US) | 속도 구조체의 필드와 함수 전체 | 속도의 UI 범위와 실제 이동 가능한 범위는 구분한다. 작은 화면 슬라이더가 월드 탐색 한계를 만들면 안 된다. |

## 입력 모듈에 구현한 조작

`prototype/viewport-controls.js`는 실제 Three 카메라를 이동한다. 키·버튼은 활성 캔버스에만 적용하며 숫자/텍스트 입력칸은 제외한다.

| 뷰 | 입력 | 동작 |
| --- | --- | --- |
| 원근 | RMB 드래그 | 제자리 시선 회전 |
| 원근 | RMB + W/S, 위/아래 화살표, Num8/2 | 시선 방향 전진/후진 |
| 원근 | RMB + A/D, 좌/우 화살표, Num4/6 | 카메라 좌/우 이동 |
| 원근 | RMB + Q/E, PageDown/Up, Num7/9 | 월드 수직 이동 |
| 원근 | RMB + R/F | 카메라 로컬 수직 이동 |
| 원근 | RMB + Z/C, Num1/3 | FOV 넓히기/좁히기; RMB 해제 시 기본값 복귀 |
| 원근 | RMB + 휠 | 이동 속도 조절; 카메라 위치 유지 |
| 원근 | LMB 드래그 | 지면 방향 이동과 수평 시선 회전 |
| 원근 | LMB+RMB 또는 MMB 드래그 | 카메라 좌/우·위/아래 팬 |
| 원근 | Alt+LMB 드래그 | 선택 초점 주위 회전 |
| 원근 | Alt+RMB 드래그 | 초점과의 거리 변화 |
| 원근 | Alt+MMB 드래그 | 초점과 카메라를 함께 팬 |
| 원근 | 일반 휠 | 시선 방향 이동 |
| 직교 | RMB/MMB 드래그 | 화면 평면 팬 |
| 직교 | 일반 휠, LMB+RMB 드래그 | 확대/축소; 커서 중심 설정 제공 |
| 직교 | LMB/Shift+LMB/Ctrl+RMB 드래그 | 범위 선택 교체/추가/제거 훅 |
| 공통 | F | 외부 선택 바운딩 박스 초점 훅 |

공식 표의 Shift 카메라 가속 여부를 추정하지 않는다. HB에서는 빠른 대형 맵 이동을 위해 **Shift 4배 가속**을 별도로 제공한다. Ctrl+숫자 저장/숫자 복원은 선택적으로 활성화하는 HB 북마크 단축키이며, 0~9 슬롯 상태를 JSON으로 가져오고 내보낼 수 있다.

## 제작 책임과 전체 툴바 대조

공통 입력 모듈을 레벨·추가 창·머테리얼/애니메이션 미리보기가 재사용한다. 아래 항목은 카메라만 움직이는 것으로 구현됐다고 간주하지 않으며 해당 편집기/렌더러/플랫폼의 실제 동작과 따로 대조한다.

| 제작 책임 | 공식 본문에서 확인한 세부 항목 | HB 통합에서 확인할 동작 |
| --- | --- | --- |
| 선택/변형 | Q/W/E/R, Space 전환, 월드/로컬, 축/평면/균일 조작, 피벗, 정점 스냅, 선택 강조 | 카메라 탐색 중 도구가 바뀌지 않음, 선택 집합/잠금/그룹·부모 변형 보존 |
| 스냅 | 이동/각도/크기 간격, 표면 투영과 노멀 정렬 | 실제 오브젝트 값과 Undo 기록 변경; 표시 버튼만 바꾸지 않음 |
| 카메라 제작 | 여섯 직교 방향, FOV/near/far, 초점, 선택 액터 조종/종료, 오브젝트↔카메라 자세 복사, 새 Camera Actor, 북마크 관리 | 활성 창만 조작, 카메라 에셋/컴포넌트 값 저장, 원근/직교 상태 보존 |
| 표시/진단 | Lit/Unlit/Wireframe 및 진단 보기, Show Flags, Game View, 카메라 미리보기 | 해당 렌더링 데이터가 실제 있는 모드만 제공, 에디터 보조 표시와 게임 콘텐츠 구분 |
| 미리보기/성능 | Realtime, 플랫폼/품질·Screen Percentage·Material Quality, 카메라 흔들림·시네마틱 허용 | 멈춘 상태에서도 카메라/편집 변경은 재그리기, 품질이 실제 렌더러에 적용 |
| 창/캡처 | 다중 배치, 최대화/Immersive, 고해상도 캡처/영역, 에셋별 Preview Scene Settings | 독립 창 이동 뒤 입력 문맥/선택/카메라 유지, 도킹과 복귀 검증 |

이 표는 추가 제작 요구를 누락하지 않기 위한 대조 목록이다. 특히 정점/표면 스냅, 임시 피벗, 진단 버퍼 전체, 시네마틱 오버레이, 플랫폼별 셰이더 미리보기를 공통 카메라 입력 구현만으로 완료 처리하지 않는다.

## 카메라 수학·큰 맵·창 이동 계약

- 카메라와 초점 모두 자유 이동하며 이전 4~28 거리 제한과 지면 위쪽 반구 제한을 적용하지 않는다. orbit의 극점에는 회전 기저가 붕괴하지 않도록 수치상 아주 작은 여유만 둔다.
- 이동 속도는 월드 단위/초이다. 대각 이동 벡터를 정규화해 직선보다 빠르게 움직이지 않는다. Q/E는 HB의 월드 Y, R/F는 카메라의 로컬 Y를 사용한다.
- 팬은 현재 원근 거리·FOV 또는 직교 프러스텀·zoom으로 픽셀당 월드 이동량을 계산한다. 선택 초점은 팬/비행에서 카메라와 함께 이동한다.
- 직교 커서 확대는 확대 전/후 같은 NDC 위치를 역투영한 차이만큼 카메라와 초점을 이동한다. 정면·상단 투영 모두 커서의 월드 점을 보존한다.
- 카메라 far plane, 하늘 중심, 그리드/지형 범위, 월드 생성·스트리밍과 카메라 이동 제한은 다른 책임이다. 카메라가 멀리 이동해도 콘텐츠나 하늘이 사라지는 문제는 렌더러/월드 관리에서도 해결해야 한다.
- 캔버스를 다른 Window/Document로 옮기면 `hb:document-moved` 또는 다음 `update()`가 이전 입력 캡처를 제거하고 새 문서로 재연결한다. 이동 순간의 눌린 키/포인터 상태는 취소한다.
- blur, 숨김, Escape, pointercancel, capture 해제, controls 비활성화/폐기 시 입력을 정리한다. 우클릭 드래그는 메뉴 호출과 클릭 선택을 발생시키지 않는다.
- 좁은 뷰포트의 툴바는 줄바꿈하고 방향 위젯 위치는 실제 캔버스 상단을 따라간다. 카메라·표시·행동·북마크 메뉴는 소유 Document의 native popover top layer에 띄우며 창 경계 안으로 위치를 제한한다. 긴 메뉴는 자체 스크롤을 제공하고 닫힌 popover와 툴바 펼침 상태를 동기화한다. 독립 창에서도 숫자 입력과 마지막 옵션이 패널 overflow에 잘리지 않는 것을 실제 WebView2로 검사했다.
- FOV/near/far의 부분 변경은 대상 원근/직교 카메라의 현재 값과 함께 검사한다. 보기 모드만 변경한 요청이 카메라 클립을 초기값으로 되돌리지 않으며, 잘못된 투영·클립·입력 설정은 Camera Actor 조종을 종료하기 전에 거부한다.

## 사람·AI 공통 상태 API

```js
const controls = createViewportControls(camera, canvas, {
  onFocus: () => focusSelectedObjectBounds(),
  onContextMenu: event => openViewportMenu(event),
  onMarquee: ({stage, mode, x1, y1, x2, y2}) => updateSceneSelection({stage, mode, x1, y1, x2, y2}),
  shouldHandle: () => !transform.dragging && !transform.axis,
});
controls.setSettings({speed:60, sensitivity:.003, zoomToCursor:true});
controls.target.set(1000, 0, 1000);
controls.update();
const state = controls.getState(); // position/target/quaternion/up/direction/projection/FOV/zoom/clip/settings
controls.saveBookmark(1);
controls.getBookmarks(); // 복사된 JSON; 공유 객체를 밖에서 직접 변경하지 않음
```

`target`, `object`, `enabled`, `update`, `dispose`, `start/change/end` 이벤트는 기존 카메라 호출부와 함께 사용한다. `setState`는 잘못된 숫자·방향/up 기저·투영 불일치를 거부한다. `validViewportCameraState`는 부작용 없이 AI 요청을 사전 검사할 수 있다. `onRestoreBookmark(state, slot)`이 있으면 방향/투영이 같아도 항상 소유 편집기에 복원을 위임한다. 편집기는 먼저 Camera Actor 조종을 종료하고, 저장한 방향으로 카메라를 준비한 뒤 새 controls에 상태를 적용한다. 같은 방향 북마크도 조종 중인 Actor의 Transform을 덮어쓰지 않는다. 훅이 없는 공통 입력 모듈은 현재 카메라에 `setState`를 적용하고 투영 불일치를 거부한다. 원근/직교 카메라 생성·종횡비·창 크기 변경도 소유 편집기가 처리한다. `isFlying/isNavigating/wasDragged()`는 전역 편집 단축키와 선택 클릭이 카메라 조작과 충돌하지 않게 한다.

검증: `node tools/check-viewport-controls.mjs`는 실제 Three 원근/직교 카메라에 입력을 전달해 **185개 검사**를 수행한다. 키 변형·Shift/대각 속도·시선/팬/회전 거리·100만 좌표 이동·FOV 복귀·정면/상단 커서 고정·범위 선택/취소와 조합 버튼 전환·북마크 방향/up 기저·같은 방향 및 원근/직교 복원 위임·비활성화/blur·독립 문서 이동·리스너 정리를 포함한다. `node tools/check-viewport-presentation.mjs`는 보기 설정 격리와 원본 머테리얼 편집 반영, 렌더 실패 복구, 일곱 직교 방향, 원근/직교·좁은/넓은 종횡비 선택 프레이밍을 별도로 검증한다. 이 검사는 GPU 렌더링과 실제 네이티브 창 사용성 검증을 대신하지 않는다.
