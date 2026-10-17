# 271 · 트랙별 종료 후 유지·복원 제작 흐름

- 지원 필드 completionMode default/restore/keep와 시퀀스 forceRestore 선택·예전 JSON/restoreState 기본 동작 보존
- 제작 화면의 종료 후 선택/기본 복원/전체 복원·revision 기반 저장·Undo·다른 활성 소유자 우선권 유지
- 자연 종료와 명시 Stop·같은 필드의 마지막 트랙 모드·C++/BP에서 유지한 위치/공개 값과 복원한 배열/카메라를 실제 확인

근거: [기계 판독 기록](research/ENGINE_WORK_271.json).

범위와 잔여:

- 상위 소유자가 남으면 그 값이 우선; 마지막 소유자의 종료 정책을 적용
- Unreal4.27 When Finished 예시와 대조했으나 HB의 restoreState=기본, forceRestore=강제 구분이며 UE 전체 section/shot 의미와 동일하지 않음
