# 230 · UV·하드 노멀 정점 경계를 넘는 NavMesh 베이크

- NavMesh를 만들 때 정확히 같은 XYZ의 렌더 정점만 다시 연결해 UV/하드 노멀/xatlas 경계 때문에 끊긴 이동 인접성 복구
- 걷는 면에 쓰는 위치만 보관·완전히 같은 삼각형 중복 제거·세 면 이상 경계와 잘못된 원본을 게시 전 거부
- XY/XZ 공용·원본 렌더 위치/인덱스/UV0/UV1/노멀 불변·가까우나 떨어진 면을 임의 용접하지 않음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_230.json).

남은 범위:

- NavMesh 전용 bake 변화이며 렌더 UV seam stitch 기능을 완료한 것은 아니다
- 교차 기하의 boolean/voxel 재구성·미세 균열의 사용자 제어 용접은 별도 잔여


229–231 설치 확인: 6c37aa3d3466f4a5·명세2777파일 실행후SHA동일·사람 XY NavMesh bake/Undo·AI dryRun·P 지연 항법 표시/off해제·원자 에셋 영역색 변경/Undo 실시간 반영·XY NavMesh EQS 투영/화면표시·기존225 UV1/라이트맵/원자Undo/API가드 회귀 통과. 오류0/종료0·캡처2시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치176162580B 제거. USER_INSTALL_231.json.
