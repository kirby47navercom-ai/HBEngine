# 208 — 저장 전 프리팹 동기화 완료 장벽

- 대기 타이머와 진행 중 읽기를 await하고 장면 저장 전에 동기화를 완료; 120ms 지연 갱신 때문에 저장 직후 dirty가 다시 켜지던 경합 해결
- editor.synchronize는 같은 완료 장벽과 문서 revision/dirty를 반환; 자동 저장·추가 Undo 없음
- 동기화 중 사람 편집은 stamp 검사 후 새 기준으로 재처리; 읽기 실패는 원본 보존과 명시 오류/재시도

남은 범위: 다른 모든 비동기 엔진 작업을 포함하는 전역 idle 장벽은 아님 / 디스크 부족·강제 종료 전체 복구 행의 미검증 조건은 그대로 유지

근거: [ENGINE_WORK_208.json](research/ENGINE_WORK_208.json). 설치 검증은 별도 영수증에 기록한다.


206–209 설치 확인: e1016dd208e2307b·명세2637파일 실행 후SHA동일·실제 설치 EXE로 중첩 Apply/구조/원자UndoRedo·gray/수정투영/표면정점스냅·저장종료·모델골격교체 Take/Seek/복원/제작창 통과, 예외/콘솔오류0·종료0. User10385파일 SHA불변·링크2/.hbproject·이전설치175243449B 정리·Versions1. USER_INSTALL_209.json.
