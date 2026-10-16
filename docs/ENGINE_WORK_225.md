# 225 · 간접광 라이트맵 제작·공유 페이지·실행 연결

- 실제 장면 삼각형 BVH·그림자 광선·발광/확산 색 전달·마스크 컷아웃·노멀맵을 사용하는 Worker 베이크와 취소
- 독립 UV 1 검사·메시별 해상도·공유 아틀라스 페이지·little-endian Half/gzip 에셋·부분 재베이크 시 고아 페이지 정리
- 사람의 Inspector/우클릭→설정→베이크 저장·Half 미리보기/선형 픽셀값·장면/라이트맵 원자 저장과 Undo/Redo
- lighting.bake/read의 CAS·dryRun·페이지별 메타데이터·재질/메시 참조 가드·WebGL/WebGPU/DirectX 독립 게임 수신
- 페이지 공유 수명·UV1만 추가 복사·정적 기하/행렬 변경 무효화·원위치 복원·동적 GI와 경로추적 활성 시 베이크 간접광 중복 방지

검증 근거: [기계 판독 기록](research/ENGINE_WORK_225.json).

남은 범위:

- 비방향성 indirect-only 베이크이며 primary direct/sky는 실시간 경로가 담당한다
- 방향성 라이트맵·shadow mask·볼륨/동적 오브젝트 light probe·mip/차트별 dilate 확장·고급 투명 매질 베이크는 별도 잔여
- 최대 64파일/8MB 기존 원자 저장 예산은 유지한다. 큰 베이크의 바이너리 분할 저장/종속 캐시가 필요하다
- 수신체는 정적 메시/UV1이다. Skin/Instance/Morph 수신은 명시 거부하며 재질·빛 수정 뒤에는 재베이크한다
- 실제 모바일 기기·장시간 월드 메모리·전체 프레임 목표를 이 표본으로 완료 판정하지 않는다
