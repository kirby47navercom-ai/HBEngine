# 285 · CPU 매질의 시간 의존성 분리

- closedVolume 출력의 실제 선행 노드만 따라 CPU 시간 의존성을 계산해요. 무관한 Time은 매질 전체 재컴파일을 유발하지 않아요.
- 실제 geometry packet의 매질 전환과 시간 필터 무효화를 유지해요. 80회 CPU 표본의 전체 계산8.1648ms와 clock patch0.9986ms를 비교했어요.

범위와 한계:

- Node의 제한된 CPU 표본이에요. 게임 FPS·GPU 셰이더 컴파일 시간이나 모든 그래프 성능의 보장이 아니에요.

근거: [기계 판독 기록](research/ENGINE_WORK_285.json).
