# 219 — 실행 능력 Inspector와 AI 페이지 조회·작은 창 메뉴

- 기존 선택 Inspector4Hz에 속성 기본/현재/min/max·능력 상태/재사용·효과 중첩/남은 시간 표시; 값은 leaf만 갱신하고 키 구성이 달라질 때만 해당 읽기전용 표 교체
- runtime.abilities의 attributes/abilities/effects 명시 페이지·deep-copy·인자 검증·현재 C++/BP와 같은 gameplayDebug 상태, 새 매 프레임 전체 복사나 GPU 읽기 없음
- 능력 세트가 실제로 적용된 현재값·실행 중 C++가 추가한 Shield/효과와 구조 갱신·원본 scene revision 불변·UI 읽기전용
- Take 설정 팝업을 실제 작업창 높이 안에서 세로 스크롤하도록 제한하여 마지막 필터도 접근; 선택 변수 검색 입력 focus와 작은 창 배열/설정 캡처 경로 검증 보완

남은 범위: 선택 장면 오브젝트의 진단 표 범위. 모든 전용 디버거/필드 편집·스크린리더/DPI/분리창 조합 검증은 잔여 / 초기화 set 값과 활성 효과가 반영된 current 값의 차이를 표시하며 실행 중 Inspector에서 이를 직접 수정하는 기능을 허용하지 않음

근거: [ENGINE_WORK_219.json](research/ENGINE_WORK_219.json). 설치는 후속 영수증에 기록한다.


218–220 설치 확인: 5c0ee1f531a80284·명세2707파일 실행후SHA동일·설치 EXE 속성/능력 세트 표/Undo·실제 CPP/BP 비용/효과·동적 Shield/수명 Inspector/AI 페이지·작은pane Take 마지막필터/가로바없음·구형 XY선택/Undo/실제2D벽·수동변수/검색focus/배열/CPP 복원 회귀 통과. 오류0/종료0·캡처3 시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치195784617B 제거. USER_INSTALL_220.json.
