# 275 · 광선 필드별 고정 호출

- GLSL/생성 HLSL의 고정 표면 필드는 해당 프로그램만 호출하고, 기존 generic/legacy dispatch와 키를 유지해요. WebGPU의 기존 필드 구분과 맞춰요.
- 실제 GL 중복 노멀 표본의 한 순서 준비2853→2761.5ms. GL/GPU 현재·이전 노멀과 실제 HLSL golden을 확인했어요.

검증 근거: [기계 판독 기록](research/ENGINE_WORK_275.json).

검증 범위와 잔여:

- 캐시 상태를 통제한 냉간 벤치나 기존 Complex141 장면이 아니에요. 7.9초/7.4초 잔여를 이 수치로 교체하지 않아요.
