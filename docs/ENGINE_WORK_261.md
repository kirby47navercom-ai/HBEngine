# 261 · 현재 천·로프 표면의 공용 C++ 물리 질의

- Raycast/RaycastAll/SphereCast/BoxCast/OverlapSphere/OverlapBox/ClosestPoint에서 현재 Rapier Cloth/Rope2D 표면과 C++ 로컬 강체 변경 결과 합성
- 시간분율로 sweep 최근접 판정·레이어/ignore/센서 필터·전체 입자 스냅샷 없는 단일 제한 live callback
- 권한 스냅샷과 현재 월드 교집합·아직 생성되지 않은 soft/ignore·로컬 collision enable·닫힌 요청/응답 형식 보호

근거: [기계 판독 기록](research/ENGINE_WORK_261.json).

검증 범위와 잔여:

- 변형체 이동·생성·외력은 큐/시뮬레이션 처리 뒤의 현재 표면만 반영
- 대상 변형체가 있는데 live channel이 없으면 명시 오류; GPU cloth/스키닝 cloth/3D rope는 별도 잔여


261–267 사용자 설치 dcab5bc06a6db1c9·2958명세파일 실행후SHA동일·숨김editor2/독립D3D·GL게임4 오류0/exit0. 변형체7질의/CPP·BP·자동수명주기/센서진입이탈/배치위치·액터별Tick·동적간격·생성선택UI 확인. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치196694054B 제거. USER_INSTALL_267.json.
