# 217 — EQS 단계 진단·실패 이유·뷰포트 점수 보기

- 선택 진단에서 생성/투영/최종 통과·실패 수·단계별 원시 값/정규화 점수·거부 단계·관측 wall ms를 보관; 진단을 끈 질의 결과는 기존과 동일
- 환경 질의 제작 UI의 대상/실행·단계 요약·점수/실패 후보 표시와 실제 카메라 기반 뷰포트 마커; 10Hz 위치 투영·겹침 방지 점수 라벨·2D DOM 표시·GPU 읽기 없음
- runtime.eqs.run/read/view의 공용 런타임 연산/프레임 장벽·페이지 deep-copy·보기 종료 메모리 해제/세계 Stop 정리·원본 scene/query revision 불변
- 진단표본 기본4096/명시1..100000·뷰포트512점/겹침 없는64라벨로 진단 비용 제한을 공개; 후보 계산/결과 개수에는 적용하지 않음
- 격자/링 질의에서 불필요한 전체 actor 상태/월드 위치 복사 제거; actors 생성기는 필요한 fields만 준비하고 부모행렬 캐시 공유·가상 참조 제외
- 실제 D3D 게임 C++ EnvironmentQuery::Run/Results의 필터/점수와 디버그 비활성 경로 대조

남은 범위: 정적 편집 테스트 Pawn·중간 단계 선택/자동 재질의·EQS 공간 인덱스·SmartObject/Mass·native BTTask FinishAbort는 잔여 / 뷰포트는 현재 주 뷰포트의 화면 표식이며 실제 구 메시/깊이 차폐·모든 분리창/장치 조합은 검증하지 않음 / 후보 생성/테스트는 기존 CPU 질의다. 네이티브 GPU EQS나 시간 제한 분할 스케줄러로 표현하지 않음

근거: [ENGINE_WORK_217.json](research/ENGINE_WORK_217.json). 설치 검사는 후속 영수증에 기록한다.


214–217 설치 확인: 06ccb1d58c0eca3d·명세2689파일 실행후SHA동일·설치EXE 프리팹 추가/잠금/2D3D·생성 필터/실제 C++/Take·수동 변수트랙/검색focus/배열 키/Undo/CPP getter·EQS 단계진단/실제화면/겹침라벨/API페이지/종료 통과. 예외·콘솔오류0/종료0·캡처4 시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치194264932B 제거. USER_INSTALL_217.json. 작은 작업창에서 Take 설정 팝업이 잘리는 UI 문제는218에서 후속 수정한다.
