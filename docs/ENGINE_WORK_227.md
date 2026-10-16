# 227 · 바이너리 원본의 스트리밍 SHA 읽기 가드

- files.fingerprint와 GET /api/asset/fingerprint로 원본 바이트를 스트리밍 SHA-256·크기 메타데이터만 반환
- files.apply binary 읽기 가드가 기존 원자 트랜잭션의 저장 전/후 재검사에 참여·출력 전체 롤백·외부 원본 보존
- 같은 크기/타임스탬프 내용 변경·없는 원본의 생성·경로/별칭/모호한 가드 검증
- 베이크의 모델/재질 JSON과 이미지/GLB/HDRI·gltf 상대 buffer/image 원본을 참조 가드에 포함

검증 근거: [기계 판독 기록](research/ENGINE_WORK_227.json).

남은 범위:

- SHA 검사와 원자 출력 커밋은 기존 외부 파일 편집의 OS 배타 잠금까지 제공하지 않는다
- 큰 바이너리는 응답/저널에 복제하지 않는다. 프로젝트 원본 쓰기 API를 추가한 것은 아니다
- 모든 third-party importer의 숨은 sidecar를 자동 추적하는 전체 cook DAG는 별도 잔여


223–228 설치 확인: b632ce56672d0c14·명세2764파일 실행후SHA동일·설치본 자체 빌더의 D3D/WebGL/WebGPU 세 게임·UV1 저작/베이크/선형 Half 미리보기·원자 Undo/Redo·AI dryRun/원본SHA가드 통과. 오류0/종료0·캡처3시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치192727227B 제거. USER_INSTALL_228.json.
