# 226 · DirectX Half float 라이트맵 전송·수신

- 기존 48B 정점/stride12를 유지하며 UV1 선택 스트림과 t49 Half float 라이트맵 수신
- Half payload를 Float32로 재포장하지 않고 R16G16B16A16_FLOAT로 전송·유한성 검사·저장 바이트 피치 보정
- 추가 샘플러 없이 UV1 수동 bilinear Load·강도/AO/금속/투과율 반영·UV1 없는 바인딩 거부
- 실제 C++ 픽셀 4회 readback과 사용자 게임의 DirectX 독립 실행 검증

검증 근거: [기계 판독 기록](research/ENGINE_WORK_226.json).

남은 범위:

- 2×2 예제32B 대64B는 텍스처 입력 비용 비교이며 전체 FPS 향상 수치가 아니다
- 라이트맵 mip/비등방 필터·DX12/HWRT는 이 구현에 포함되지 않는다
