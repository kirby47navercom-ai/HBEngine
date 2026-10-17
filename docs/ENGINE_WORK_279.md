# 279 · 2D 스프라이트와 타일 원본 색상 선택

- SpriteRenderer/TilemapRenderer의 색상 처리(scene/display)를 제작 상세 속성과 공용 component schema에 추가했어요. 필드 누락/scene은 기존 노출을 보존해요.
- display는 머테리얼 톤 매핑을 끄고, GPU 생성·재사용·복제·진단 뷰에서도 선택을 유지해요. 선택이 바뀔 때만 shader 갱신 표시를 해요.
- 실제 D3D/GL 게임의 원본 SVG색이 모두 RGB(79,186,117)로 나왔어요.

검증 근거: [기계 판독 기록](research/ENGINE_WORK_279.json).

검증 범위와 잔여:

- 전역 후처리/블룸/안개 전체를 우회하는 overlay 기능은 아니에요. WebGPU 재질/복제는 CPU 확인, 실제 WebGPU 색상은 설치 후 별도 확인해요.
