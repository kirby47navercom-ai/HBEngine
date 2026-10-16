# 206 — 중첩 프리팹 적용 원본·구조·원자 저장

- 변형·기본·안쪽 원본의 안정 대상 key 조회와 사람 적용 메뉴; 상위 광역 오버라이드를 필요한 잎 속성으로 분리해 선택 속성만 하위 원본으로 이동
- 자식 추가·삭제의 안쪽 적용, 월드 ID 유지·로컬 namespace 이동·반복 배치/다른 변형의 고아 오버라이드 정리; 컴포넌트/배열 전체 적용 범위 표시와 명시 opt-in
- 같은 파일 묶음 Undo/Redo와 sourceRevisions/CAS; 수정하지 않는 참조 원본도 commit 전후 검사하고 경합 시 전체 롤백; 외부 원본 참조는 보존
- 실제 편집기 메뉴·dry-run·원본/장면 UndoRedo·조회 후 원본 편집 거부·안쪽 자식 추가와 Play

남은 범위: 안쪽 nativeProperties/변수 override는 자료형 메타데이터가 연결되지 않아 안전 거부; 알려진 컴포넌트의 오브젝트 참조만 재매핑/검사 / All은 바깥 원본. 놓인 루트 Transform 기본 보호 유지; Unity 개별 default override Apply와 같은 기능이라고 주장하지 않음 / 복잡한 모든 중첩/변형과 대규모 인스턴스 비용 검증은 잔여

근거: [ENGINE_WORK_206.json](research/ENGINE_WORK_206.json). 설치 검증은 별도 영수증에 기록한다.


206–209 설치 확인: e1016dd208e2307b·명세2637파일 실행 후SHA동일·실제 설치 EXE로 중첩 Apply/구조/원자UndoRedo·gray/수정투영/표면정점스냅·저장종료·모델골격교체 Take/Seek/복원/제작창 통과, 예외/콘솔오류0·종료0. User10385파일 SHA불변·링크2/.hbproject·이전설치175243449B 정리·Versions1. USER_INSTALL_209.json.
