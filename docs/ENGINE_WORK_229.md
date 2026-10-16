# 229 · XY NavMesh와 2D 제작·경로·EQS의 공용 연결

- NavMesh의 선택 plane XY/XZ·누락한 구버전은 XZ·2D 양쪽 winding 베이크·평면별 포털 방향/funnel·3D 최근접 BVH 재사용
- XY 장애물 SAT/Z층·2D와3D collider 차원 격리·영역 비용/마스크·링크·공용 MoveTo 평면 선택
- XY 단순 회피의 공간 해시/접선/Z층·기존 ORCA와 C++/BP 고수준 API 재사용·런타임 진단 plane
- NavMesh 폼에서 평면/원본 선택→굽기/Undo/Redo·AI navigation.bake dryRun·실행 중 EQS 신규 열기/현재 XY 메시로 투영

검증 근거: [기계 판독 기록](research/ENGINE_WORK_229.json).

남은 범위:

- 임의 표면 방향과 움직이는 NavMesh 소유자의 질의/회피 좌표계 통합은 별도 잔여
- funnel은 선택된 삼각 corridor를 다듬는다. 비평면 정밀 funnel·경계 침식/반경 보장·재분할 carving은 추가 작업
- 2D D3D와 3D WebGPU 네 에이전트 표본은 전체 군중/모바일 FPS 또는 모든 충돌 보장을 뜻하지 않는다
