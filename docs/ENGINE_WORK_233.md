# 233 · 종속 속성·공유 실수 커브

- 순환을 거부하는 속성 DAG·current/base/bonus·계수/전후 덧셈·범위·기존 실수 Timeline 키/접선/보간 커브 재사용
- 편집 계산 폼/커브 선택과 트랙·커브/부모 변경 시 자식 재검증·원자 참조 변경/Undo·커브 SHA 충돌 롤백
- 원본 변경/효과 제거 시 재집계·유휴 집계 재사용·초기화/수치 overflow 원자 거부·CPP GetAttribute와 같은 BP 실행

검증 근거: [기계 판독 기록](research/ENGINE_WORK_233.json).

남은 범위:

- 같은 소유자의 속성 계산이며 GameplayEffect source/target capture·레벨별 magnitude/실행 계산 전체 구현은 아니다
- 종속 기본값 직접 쓰기/비용/순간·주기 효과 대상은 거부하고 지속 집계 효과를 사용한다
