# 239 · 천 제작·시뮬레이션·공용 제어

- Cloth 컴포넌트/배치·격자·핀 프리셋/입자 재정의·마우스/방향키/Space/Enter·Scene/BP Undo·실행 Inspector 고정/해제/초기화
- 실제 Rapier 천·인장/굽힘/질량/감쇠/중력/외력·바닥/레이어/자체충돌 설정·움직이는 부모 핀/강체 양방향 연결·풀/삭제/재시작
- MeshRenderer 머테리얼·고정 UV/index·실제 정점/법선 변형·CPP/BP 공용5함수·AI runtime.cloth 최대256 요청 구간·요약에 전체 입자 복제 없음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_239.json).

남은 범위:

- 현재 사각 천 2..256 입자/축이며 임의 DCC 메시/스키닝·거리 tether/연속 가중치 paint·GPU solver·파괴는 잔여
- 구조/물성/scale 수정은 rest를 재구성; 외력과 오브젝트 충돌 토글은 상태 보존
- 읽기 전용 C++ 질의 스냅샷은 현재 변형 입자를 포함하지 않음; 공용 천 제어 함수와 live VM 질의는 실제 월드 사용


239–242 사용자 설치 ea1799af84bb0d85 갱신·2846파일 실행후SHA동일. 천/2D로프 Scene/BP/keyboard/Undo/라이브 제어·CPP/BP/AI·독립 D3D/WebGL 4게임 오류0/exit0. 동적 정점 ring3와 SDK10·Android arm64 서명 APK 검증. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치204201887B 제거·배포 폐기 cloth-physics.js 제거. USER_INSTALL_242.json.
