# 222 — 주기 효과의 종료 경계와 큰 시각 정밀도

- 기존 duration0.3/period0.1의 마지막 주기 누락 재현 후 시작 epoch+정수 periodTicks 기반 집계·반복 next 덧셈 제거; 정확 종료 경계를 포함한 catch-up
- 시각 크기 기준4ULP·최대주기1/4 허용 오차·Kahan 능력 시계·delta0/잘못된delta/비유한시각/안전 정수 tick해상도 검증; 효과 적용 전에 과도한 count 거부
- 0/1008/1e9초의3틱·조기 실행 없음·1e9초에서1000회0.007=7초70틱·긴프레임/비정수종료·onApply·즉시/주기 효과 구분 검사
- 실제 C++ ApplyEffect/Getter·마지막Health147·태그 제거·passive Stat108·현재Inspector/AI·별도D3D 게임과 원본 장면 불변

범위: 능력 시스템의 게임 시계 범위다. 전체 C++/BP timer·UTC/PCM/영상/외부 시간코드 동기화나 네트워크 재시뮬레이션의 정밀도를 함께 구현한 것은 아님 / 매우 작은 주기와 큰 시각/프레임에서 안전 정수 해상도를 벗어나면 명시 오류로 거부한다. 무한 이벤트 생성으로 우회하지 않음

근거: [ENGINE_WORK_222.json](research/ENGINE_WORK_222.json). 설치는 별도 영수증에 기록한다.
