# 259 · 시간 변화의 그래프 재컴파일 제거

- 같은 머테리얼 key에서는 Time 리터럴만 immutable 갱신·함수/타입/연산 공유/레지스터 재분석 생략·이전 프레임 프로그램 배열 불변
- 실제 그래프/설정 변경은 재컴파일·잘못된 float32 시간은 캐시 변경 전 거부·forward/rewind/long-clock full compile 일치
- 54노드60회 CPU 표본 전체compile 약206.9ms→시간 패치약1.97ms·새 영속 캐시/읽기/히스토리 없음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_259.json).

검증 범위와 잔여:

- Node의 제한된 CPU 표본·전체 게임FPS/실폰/드라이버 초기 컴파일 시간 보장 아님·material key 직렬화는 기존대로 수행
