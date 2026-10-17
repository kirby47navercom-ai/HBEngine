# 244 · 현재 변형체 입자의 공용 조회

- Physics::GetClothParticle/GetRopeParticle와 동일 BP 다중 출력: 위치/속도/고정 상태·세계 XYZ/XY·미터/초
- 실제 실행 월드의 요청 입자 하나만 조회·네이티브 전체 입자 배열 snapshot 없음·Desktop WebSocket/모바일 callback 공통 등록 키·대상/인덱스/응답 차원 검증
- 실제 천/로프 고정 해제 뒤 CPP 조회 및 BP 결과를 사용자 C++ 인자로 전달·독립 D3D/WebGL 실행

검증 근거: [기계 판독 기록](research/ENGINE_WORK_244.json).

남은 범위:

- 일반 C++ Raycast/Overlap의 재구성 질의 세계에는 현재 soft surface 미포함; 새 입자 getter는 별도 live 질의
- 조회는 동기 채널 왕복·요청 시점 값, 같은 함수 안의 앞선 queued 쓰기는 아직 적용되지 않음
- Android 물리/렌더 실제 기기 검증은 아님


243–248 사용자 설치 e586f23febe4b3d5·2879명세 파일 실행후SHA동일·실제 숨김 editor4/독립D3D·GL게임6 오류0/exit0·효과/입자/부모Take/단축키 제작·CPP/BP/AI/Undo. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치212367284B 제거. USER_INSTALL_248.json.
