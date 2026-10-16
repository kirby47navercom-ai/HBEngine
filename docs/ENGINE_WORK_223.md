# 223 · 독립 UV 채널·자동 차트/패킹·저작 검사

- UV 0/1 분리·복사/삭제·섬 선택/드래그/이동·회전·크기와 기존 UV0 보존; 분할/압출/복제/인셋/용접/영역 보간/LOD 생성의 추가 채널 길이·좌표·seam 보존
- xatlas-wasm0.1.3 고정·288718B ESM(내장WASM)·편집 작업 때만 분리 Worker 로드/종료·취소·닫힘/실행 전환/수정 충돌 가드·불변 입력·미사용 정점 정리·xref 기반 기존 색/노멀/UV 보존
- 큐브6면/닫힌 곡면 토러스 자동 chart/회전 패킹·0..1 정규화·픽셀 여백; 독립 겹침/퇴화/범위 검사·공유 간선은 겹침에서 제외·비교 예산 초과는 complete:false
- 전용 편집기 실제 사람 버튼/검사·AI view/inspect/generate·dryRun/재현 동일/오래된 revision 거부·공유 Undo/저장과 3D 면 복제 확인

검증 근거: [기계 판독 기록](research/ENGINE_WORK_223.json).

남은 범위:

- UV 기반과 차트 생성이며 실제 광선 베이크/라이트맵 조명은 아직 별도 작업이다. RND-08 상태를 UV-only로 완료 승격하지 않음
- 자동 차트 표본은 큐브/토러스; 임의 대형/퇴화/비다양체의 품질 전체 보증 아님. topology 변경 뒤 UV 겹침 재검사/펼치기 필요
- 고급 normal-split seam stitch·곡면 영역 편집·bevel/loop와 사용자 고정 chart 재패킹/다중 아틀라스는 잔여


223–228 설치 확인: b632ce56672d0c14·명세2764파일 실행후SHA동일·설치본 자체 빌더의 D3D/WebGL/WebGPU 세 게임·UV1 저작/베이크/선형 Half 미리보기·원자 Undo/Redo·AI dryRun/원본SHA가드 통과. 오류0/종료0·캡처3시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치192727227B 제거. USER_INSTALL_228.json.
