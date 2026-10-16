# 218 — 속성·시작 능력 세트의 제작과 실행

- 속성·능력 세트 에셋(.hbabilityset.json)의 콘텐츠 생성/파일 분류/검증·이름변경/빌드 참조 연결; 속성 이름/base/min/max 표·시작 능력 목록/열기·태그 제작 UI와 공용 Undo
- AbilitySystem.abilitySet을 장면/BP 컴포넌트에 연결; 모든 세트/시작 능력을 읽고 검증한 뒤 소유 상태를 한 번에 설치·비동기 Stop/다른 인스턴스 경합 가드·기존 Health/Mana/단일 능력 기본값 호환
- 세트의 같은 이름 속성은 기존 기본값에 우선·고유 이름/범위/목록 중복 검사·그 외 legacy 속성 유지·새 네이티브 ABI 없이 기존 C++/BP 속성/활성화 함수 사용
- C++ 호출을 연결한 BP BeginPlay에서 준비된 초기값 읽기·사람 편집한 Stamina/Armor와 실제 C++/BP 비용 차감/효과·별도 D3D 게임/의존 에셋 포함 검증
- 풀 제거 시 임시 능력/효과 태그 복원·재등록·로딩 실패/Stop 시 반쪽 상태를 남기지 않음·effects/abilities 배열과 AbilitySet 컴포넌트 참조 이름변경

남은 범위: 수치 속성과 시작 능력/태그 세트에 한정. 다중 세트 상속·속성간 의존식/커브/레벨 스케일·라이브 세트 재적용·네트워크 예측/복제·자동 Cue 자산은 잔여 / 현 SDK Actor에 virtual BeginPlay가 있는 것으로 표현하지 않는다. 검사에서는 BP BeginPlay→등록 C++ Initialize 호출 경로를 사용한다. 일반 네이티브 가상 생명주기 계약 확장은 별도 잔여 / UI 최종 가로 스크롤/시간 서식·아이콘 변경과 작은 작업창 최종 검증은 설치220에서 추가 확인

근거: [ENGINE_WORK_218.json](research/ENGINE_WORK_218.json). 설치는 후속 영수증에 기록한다.


218–220 설치 확인: 5c0ee1f531a80284·명세2707파일 실행후SHA동일·설치 EXE 속성/능력 세트 표/Undo·실제 CPP/BP 비용/효과·동적 Shield/수명 Inspector/AI 페이지·작은pane Take 마지막필터/가로바없음·구형 XY선택/Undo/실제2D벽·수동변수/검색focus/배열/CPP 복원 회귀 통과. 오류0/종료0·캡처3 시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치195784617B 제거. USER_INSTALL_220.json.
