# 245 · 시퀀스 부모 연결 제작·녹화·재생

- parent 트랙·부모/루트 선택·단계 키·문서 Undo·선택적인 includeHierarchy Take·기존 녹화 기본값 유지
- 부모 변경 경계의 이전 local TRS 키는 step·모든 부모 계획의 순환/누락을 변경 전 검증·단계적 실제 그룹 분리/재연결
- Seek/되감기/Stop 복원·동일 수명의 원래 부모만 복구·외부 그래프 순환이면 복구 소유 변만 루트 분리·미리보기와 실제 CPP/독립 게임 공용

검증 근거: [기계 판독 기록](research/ENGINE_WORK_245.json).

남은 범위:

- 로컬 TRS 부모 트랙이며 socket/constraint/월드 보존 Attach section 규칙 전체 구현이 아님
- 부모 키 대상이 교체/삭제되면 거부·기존 객체 파괴 자체를 재생 중 부활시키지 않음
