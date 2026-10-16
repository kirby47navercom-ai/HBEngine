# HBEngine — 167 — 2026-10-16

현재 사용자 지시: 지금까지 조사/계획한 전체 기능을 구현하는 것이다. 작업 번호/일부 묶음 목표의 완료로 답변 범위를 좁히지 않는다. 직전 전체완료 오해를 인정하고 실제 누적 원장 기준으로 구현을 이어왔다. 주인님/짚짱·한국어 존댓말. 사용자 창·프로필·게임 보호, 마지막 묶음 검사·설치 갱신·한글 커밋/푸시·Versions1. 새 에이전트 요청 없음.

167 구현: additive 다중 레벨 인스턴스/변환·LevelStreaming manual/always/distance·ID/타입 참조 재배치·물리/입력/스크립트/생성액터 수명·실패/취소/재진입·C++6/BP6/AI4/아웃라이너; 2D 계층/좌우 이름 대응·외부 actor IK 목표/키·월드 변환 베이크(limb/CCD/FABRIK); 평면 포털 funnel/오프메시 보존; Take 바인딩 설명 재사용·일정구간 온라인 축약.

코드 소유자: prototype/level-streaming.js, actor-references.js, play-world.js, engine-services.js, app.js/player.js/tools/run-project.mjs, navigation-funnel.js/navigation-mesh.js, retarget-scene-targets.js/sprite-rig-retarget[-editor].js, sequence-properties/take-recorder. native Levels SDK·자동생성API 노드753. 새 종속성/상시poll/자동GPU readback 없음.

검사: CPU11군·실제 C++/BP 반복Load/Unload·숨김 Win32 Editor/2D폼/AI dryRun/Undo/레벨명령/원본보존·dev/release D3D11 패키지. 165 17군/166 12군 및 core/native/UIaudio/gameplay/retarget/API/status 통과. ENGINE_WORK_167.md/JSON에 경로/SHA/실패수정. 설치는 USER_INSTALL_167.json 후속 기록. dist빌드/실제EXE 실행은 순차로 한다(동시복사시 runtime/node.exe 잠김).

전체 원장 docs/research/ENGINE_STATUS.json → docs/ENGINE_STATUS.md + hb status --local/API. 78등록행 verified39/partial32/unimplemented4/unverified3. WLD05를 partial로 옮겼으나 상위전체완료0. 전체UE/Unity 본문/API 분석 gate false/분모·완료율 미확정. supplementary167 지정 API/문서 구역만 읽고 연결/다른버전 미독 유지.

남은 전체 목표는 원장의 remaining을 유지한다: 자동공간분할/HLOD/셀예산, 동적Nav/정밀반경/군중, import/cook/prefab 세부, 2D 임의제약/정지발, 애니/녹화·렌더·물리·게임플레이/네트워크·위젯/오디오·CPP도구/AI/디버그·모바일/배포/성능 등. 원장 일부를 전체요구의 상한으로 삼지 않는다. Mac/Xcode와 Android기기는 없다.

설치 완료: C:/Users/kirby/HBEngine/Versions/27ca4525cebc9468 (2332명세파일), 실제 설치 EXE C++/AI/2D 폼/dryRun/Undo/원본 복원 PASS, 사용자 프로필10385파일 SHA 보존, 바로가기2개/.hbproject 일치, Versions1. 이전8f19/중간fe903 사본 정리. 구현 d1cf994·추가레벨/생성카탈로그 배포중단점 제거 d2bd3c1. 설치 영수증 USER_INSTALL_167.json. 최종 root test-artifacts 추가삭제0(각 검사 종료시 이미 정리됨). 설치 검사용 빌드와 사용자 프로필은 분리했음.
