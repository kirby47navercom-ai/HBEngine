# 260 · 시간 기반 매질 메타데이터 갱신

- Time이 closedVolume만 바꿔 GPU Time 명령이 없는 그래프도 CPU 메타데이터 평가·Time-only fast path에서 보수적으로 제외
- 실제 GeometryGI packet의 medium 플래그·메시 종속 시각·시간 필터 무효화·장면 셰이더 plan을 함께 갱신·되감기 보존
- 단순 컴파일 표본은 통과해도 실제 geometry 패킷이 옛값을 재사용하던 회귀를 재현해 소유 계층에서 수정

검증 근거: [기계 판독 기록](research/ENGINE_WORK_260.json).

검증 범위와 잔여:

- 참여 매질 산란/전역 곡면 역해·월드/시점 의존 이전 노멀·이전 mip 발자국은 별도 잔여
