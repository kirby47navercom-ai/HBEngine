# 266 · C++·블루프린트 액터 Tick 제어

- Scene::SetTickEnabled/IsTickEnabled/SetTickInterval/GetTickInterval 4함수·동일 BP 노드, 공용 SDK732/노드817
- 액터의 BP/자동 C++ Tick 모두 제어·다른 액터와 독립·원본 클래스/노드 설정 보존·변경 시 누적 간격 초기화·일시정지/풀 가드
- C++ float32 0.2초와 JS 0.1+0.1 경계가 한 프레임 늦던 문제를 일반/묶음 경로의 1ULP 보정으로 해결
- 액터당 작은 실행 정책 한 개·상시 타이머/매 프레임 root 복사 없음·기존50액터→1RPC 회귀 통과

근거: [기계 판독 기록](research/ENGINE_WORK_266.json).

검증 범위와 잔여:

- setter는 큐 처리·getter는 최근 처리 스냅샷·현재 native batch는 완료 후 변경 반영
- 대표 장면 PC120/모바일60 FPS 보장을 이 API 검사로 주장하지 않음
