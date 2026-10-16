# 231 · 지연 생성 항법 뷰포트·P 단축키·AI 진단

- 표시→항법 및 재지정 가능한 viewport P 단축키·MeshRenderer와 독립적인 NavigationMesh 영역색/삼각 경계/활성 링크 표시
- 한 뷰포트라도 요청할 때만 원본 읽기와 GPU용 버퍼 생성·모든 요청을 끄면 소유 자원 해제·출시 게임에서는 생성하지 않음
- 인덱스 공유/16·32bit 선택·최대32 영역별 재료로 정점별 색 배열 제거·표시 전환마다 소스 재요청 없음
- 뷰포트별 표시와 game view 격리/복원·기존 표시 설정 보존·에셋 무효화 재로딩·세대 토큰으로 오래된 비동기 결과 폐기
- viewport.navigation의 페이지별 plane/영역/삼각형/링크/바이트/로드 상태 진단·조회 시 전체 NavMesh 목록 복제 없음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_231.json).

남은 범위:

- 색은 정적 bake 영역이다. 현재 장애물 carving이나 실시간 부분 삼각 비용의 완전 시각화는 별도 잔여
- 표시 버퍼 바이트는 해당 진단 기하 비용이며 프로세스 전체 RAM/VRAM 또는 게임 FPS 측정이 아니다


229–231 설치 확인: 6c37aa3d3466f4a5·명세2777파일 실행후SHA동일·사람 XY NavMesh bake/Undo·AI dryRun·P 지연 항법 표시/off해제·원자 에셋 영역색 변경/Undo 실시간 반영·XY NavMesh EQS 투영/화면표시·기존225 UV1/라이트맵/원자Undo/API가드 회귀 통과. 오류0/종료0·캡처2시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치176162580B 제거. USER_INSTALL_231.json.
