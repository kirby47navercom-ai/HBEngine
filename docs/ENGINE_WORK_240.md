# 240 · 동적 메시 정점 스트림·프레임 버퍼

- 위치/법선만 변경할 때 6float/vertex 전송·JS 포장 배열 재사용·UV/index/색상은 초기 자료 유지
- DirectX 동적 정점 버퍼3개 순환/WRITE_DISCARD·GPU 리소스 재생성 없음·정적 메시 기존 immutable 경로·구형 호스트 capability fallback
- 형상 교체/UV/index 수정은 전체 업로드·변형 그림자 cache 의존성 무효화·업데이트 횟수/바이트·GPU buffer payload/CPU cache 진단

검증 근거: [기계 판독 기록](research/ENGINE_WORK_240.json).

남은 범위:

- D3D 업로드는 보존한 12float interleaved 정점 전체를 ring buffer에 씀; 임의 GPU 부분 범위 쓰기라고 주장하지 않음
- 추가 정점 버퍼/CPU 사본은 dynamic 메시만; 모든 정적 메시의 3중화 아님
- 천/로프 GPU 시뮬레이션·입자 이전 위치 모션벡터·전체 장면 FPS/VRAM 측정은 별도 잔여
