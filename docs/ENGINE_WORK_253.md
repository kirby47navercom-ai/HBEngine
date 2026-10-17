# 253 · 광선 그래프 공통 계산 공유

- pure SSA 연산/암시 UV/상수/텍스처 계산 공유·store 순서/부호 있는0 보존·64 레지스터 초과 시 기존 재계산으로 fallback·4096 명령 예산 유지
- 중복 노멀 표본 명령20→12·GLSL8773→5837B·atlas1888→1504B·레지스터3→2. 실제 D3D11/WebGL/WebGPU 현재/이전 노멀 float 픽셀 전후동일
- 실제 GL 표본 한 쌍 준비3369→2618.8ms·추가 의존성/상시계측/캐시/히스토리/읽기 없음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_253.json).

검증 범위와 잔여:

- 이 수치는 중복 표현식 표본의 단일 순서 비교·전체 게임FPS/과거 Complex141 초기7.9초 해결 근거 아님·고유 계산 그래프의 드라이버 컴파일 비용 잔여


253–260 사용자 설치 7da0d214773220b7·2927명세 파일 실행후SHA동일·숨김editor4/독립D3D·GL게임2 오류0/exit0. source/target·인자CPP/BP/수동/AI·열린상세외부값갱신·CPP/BP 슬롯·Source streaming 해제/복구·커서/스크롤/release/애니메이션·GL/GPU픽셀/준비 통과. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치195144609B 제거. USER_INSTALL_260.json.
