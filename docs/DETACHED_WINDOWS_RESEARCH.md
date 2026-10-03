# 독립 작업창의 문서·입력·렌더 수명

2026-10-03. 실제 OS 창과 편집기 내부 탭은 서로 다른 기능으로 구현하고 검사한다.

## 실제 확인한 공식 본문

| 자료 | 확인한 조작과 구조 | HBEngine 적용 |
| --- | --- | --- |
| [Unreal Layout Customization, 4.27](https://dev.epicgames.com/documentation/en-us/unreal-engine/layout-customization?application_version=4.27) | 에셋 편집기와 내부 패널의 역할·도킹 영역을 구분한다. 창 메뉴·탭 이동·닫기·분리와 배치 저장/복원을 설명한다. | 에셋 문서는 한 번만 열고 원본 패널을 이동한다. 다른 창에서 편집해도 같은 문서·선택·Undo·저장 상태를 사용한다. |
| [Unity Customize your workspace layout, 6.2](https://docs.unity3d.com/6000.2/Documentation/Manual/CustomizingYourWorkspace.html) | 탭 우클릭·최대화·닫기·추가, 드래그 도킹 미리보기와 floating window, 사용자 배치 저장/파일 내보내기를 설명한다. | 탭 우클릭과 창 메뉴의 분리, 창 안의 합치기, 닫을 때 원래 자리 복귀, 프로젝트별 도킹과 창 크기 저장을 연결한다. |

두 본문을 읽은 범위는 위에 표시한 버전이다. Unity의 여러 탭을 가진 단일 floating window와 Unreal의 전체 사용자 레이아웃 관리가 모두 동일하게 구현됐다고 기록하지 않는다. 현재 독립 창은 패널 하나를 담고, 닫기/합치기로 원래 편집기 도킹 위치에 복귀한다. 이름 붙인 배치의 import/export·분리 창 간 직접 도킹·재실행 시 분리 창 일괄 재생성은 별도 항목이다.

## 플랫폼과 편집기 계약

- `HBEngine.cpp`가 WebView2 `NewWindowRequested`를 처리해 별도 Win32 HWND/Controller를 만든다. 원본과 같은 WebView2 environment/profile을 사용하고 deferral은 성공/실패 모두 끝낸다. 게임 Player는 편집기 창 요청을 받지 않는다.
- 허용된 원본 편집기와 같은 origin의 `detached-window.html`만 이 경로를 사용한다. 부모 편집기 종료 시 자식 Controller/HWND를 닫고 소유 서버를 정리한다.
- `DetachedWindows`가 원본 DOM을 새 Document로 옮긴다. 편집기 앱·문서 모델·WebGL context를 복제하지 않는다. `hb:document-moved`로 카메라 입력 캡처를 새 Document/Window에 재연결하고 눌린 키/포인터를 취소한다.
- 자식 Document의 이벤트는 원본 target과 취소 상태를 유지해 소유 편집기에 전달한다. 브라우저 새로고침을 막기 위한 Ctrl+R 취소와 실제 편집기 핸들러가 소비한 이벤트를 구분한다. Ctrl+R은 활성 뷰포트의 실시간 표시를 바꾼다.
- Outliner/Inspector의 포커스 변화만으로 입력 DOM을 다시 만들지 않는다. 다른 창에서 오브젝트를 선택하면 속성이 갱신되고, 속성 변경은 공통 장면과 아웃라이너에 반영된다.
- 부모와 살아 있는 모든 자식 창의 animation frame을 함께 예약한다. 먼저 실행한 예약만 공통 렌더/재생을 실행하고 나머지는 취소한다. 부모의 `performance.now()`를 사용해 창별 시간 기준 차이가 재생 시간을 바꾸지 않도록 한다. 부모와 첫 창을 최소화해도 둘째 창의 frame이 진행을 이어간다.
- 취소·창 이동·편집기 종료에서 모든 예약과 리스너를 해제한다. 2D 미리보기·Timeline·게임플레이 편집기도 같은 예약 계약을 사용한다.
- 추가 뷰포트의 별도 WebGL renderer는 자기 GPU sky capture를 소유한다. DOM만 이동한 기존 뷰포트는 renderer/context를 유지한다. Scene 논리 데이터와 GPU 자원의 소유 범위를 구분한다.

## 재현 검사

`npm run test:detached`는 일회용 프로젝트에서 실제 EXE를 실행한다. 독립 뷰포트·콘텐츠 브라우저·아웃라이너·속성의 원본 DOM과 GPU context, 방향 위젯, 카메라 메뉴의 top layer·입력칸 경계·끝 항목 스크롤, Ctrl+R, Ctrl+L 태양 회전/저장/Ctrl+Z 복원, 실제 파일 검색 결과, 창 간 선택/속성 편집, Ctrl+S, 크기 변경, 닫기 복귀·재분리, 부모 종료 뒤 서버 정리를 검사한다. `proof.json.nativeWindows`는 성공 시점에 아직 열린 창 수이며 테스트 중 만든 총 창 수가 아니다.

`tools/check-detached-window-frames.mjs`는 실제 클래스 메서드에 서로 다른 시계와 예약 큐를 제공해 둘째 창 진행·중복 방지·취소·단일/다중 창 종료를 검사한다. 이 예약 수학 검사는 OS 최소화 영상 검증과 구분한다. 사용자 프로젝트와 다른 열려 있는 편집기는 검사 대상으로 쓰지 않는다.
