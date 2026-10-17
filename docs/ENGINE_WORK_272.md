# 272 · 편집·C++·BP 시퀀스 우선순위

- optional int32 에셋 priority 기본0·제작 입력/Undo/저장·LevelSequence::SetPriority/GetPriority와 같은 BP 노드
- 높은 우선순위·동률은 고정된 실제 재생 시작 순서·Seek는 순서 변경 없음; 실행 override는 에셋을 바꾸지 않음
- 변경 시 그 소유자의 활성 필드만 재평가해 가려진 최신 값으로 인계·중첩 호출의 옛 대기 쓰기 보호·SDK734/노드819

근거: [기계 판독 기록](research/ENGINE_WORK_272.json).

범위와 잔여:

- HB는 평면 우선순위이며 UE 하위 시퀀스 누적 bias·동률 가중 혼합/Unity Playable weight는 별도 잔여
