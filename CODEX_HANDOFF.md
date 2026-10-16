# HBEngine — 172 기능 커밋, 173 네트워크 수명·관심 영역 진행 — 2026-10-16

현재172 기능 e31e6c1 커밋(main, 아직 push 전). 안정 ID 에셋3방향 병합/사람 충돌 선택/검증·revision·Undo, 프로젝트 Git 상태/텍스트diff/선택 stage/unstage/commit/로컬 작성자/부모repo쓰기보호. CPU13군 engine-172-xUCQ2e; 숨긴Win32 사람/AI/Undo/Git커밋 engine-172-window-7vjGj3 PASS/errors[]/exit0. merge-ui/git-ui 시각 확인. 종료초기두실패는 Garden dirty 확인창 대기, 최종 임시 문서 discard 선택. 저장 뒤 다시 dirty되는 기존 경로 미종결, DEBUG_HANDOFF 기록. docs172.mjs 실행 완료: 재실행 금지.172 설치는173과 함께 마지막 전환하며 현재171 Versions1 유지. sourcecontrol의 Git 충돌 마커 파일은 외부 편집기; 정상JSON 세버전 병합만 내부지원, 원격/push/잠금/시각graphdiff미구현.

지금173 착수: NET01의 host 생성/삭제·허용 로컬 prefab catalog 인스턴스/late join/reconnect·관심영역/ownerOnly·범위외 spawn/despawn을 기존 Scene::Spawn/Destroy와 NetworkReplica/Session에 연결. 기존 network-runtime.js/network-state.js/multiplayer-server.mjs/engine-services.js/runtime-spawn.js/scene-components.js 읽음. 아직173제품코드 작성 전. 자동 rawcode전송 금지·클라이언트임의생성권한금지·파일비밀키공개주의·상태메모리회수/스냅샷중순서·풀재사용 처리 필요. 새의존성없이. 단계마다사용자턴끝내지말고계속. 아래171내용은완료기록이다.

사용자 최종 지시: “남은거 다 하라고”. 여러 분야의 제작/실행까지 계속 구현하고 마지막 검사·설치 갱신. 원장 전체/UE Unity 전체 분석 완료로 축소·허위 보고 금지. 주인님/짚짱·자연스러운 존댓말. AI 친화/가벼움/Versions1·사용자 창/프로필/게임 보호. 새 에이전트 요청 없음, spawn 금지. 현재 단계는 구현/검증. 최종 응답을 아직 하지 않고 이어 작업 중이다.

171 기능 커밋4d87d64(기준2e870ac). 54파일1220추가/125삭제. 새 네트워크 호스트/클라이언트·키/소유권·안정 ID 필드 복제/보간·허용 RPC·재접속·초기 스냅샷·C++BP6; 실행 중 C++ 공개 상태 유지 재적용/호환성·프레임 장벽·이전 worker 해제·레벨 캐시; TreeView/명시 가변 높이/안정 선택ID/행 재사용; 모프 이름/메시/배율/보정/클램프/그래프/베이크; 능력/효과 Cue; 추정 비용/우선순위 스트리밍; 별도 충돌LOD; UV 경계 좌표; DirectX min/mag/mip/anisotropy; 파일↔폴더 패치/저널2 복구. 새 의존성0, 자동 GPU읽기0. 노드773/코어289.

171 검증: CPU18 engine-171-PSQKwy; 실제 D3D 샘플러 장치 engine-171-native-pqXQao; Editor engine-171-window-er0TJc; D3D release engine-171-player-InOpsb; WebGPU dev engine-171-player-A4SmHN(둘 다 실제 C++→별도 클라이언트 상태/RPC); D3Ddev 기존170 engine-170-player-T31WPz. 170CPU17 o7r2tq/169CPU23 MmwOiJ/166CPU12 SdpGLn, 코어/API/native/UI오디오/리타게팅/텍스처 회귀 통과. 검사 JSON SHA는 docs/research/ENGINE_WORK_171.json. 18군 중 실제 파일 rename 오류·별도 프로세스 exit37 복구,140개 late join3스냅샷, byte budget 원자 거부 포함.

현재 설치 C:/Users/kirby/HBEngine/Versions/77c55df75ff751bc/HBEngine.exe, source4d87d64,2382파일 실행 후 SHA 검증. 설치 EXE 최종 engine-171-installed-AuIa1K PASS/errors[]/exit0. 트리 DOM12행, 공개 counter1→11/위치 보존, C++ 두 연결/RPC7. Tree/live-reload 캡처 실제 시각 확인. 프로필10385파일 전/후/실행 후 SHA 일치46024720c91a2d2eff0661b5c35304fb8acbbc646062762ae8cf492664443d26. 바로가기/.hbproject 새 EXE, 이전 설치187229328B 제거, Versions1. USER_INSTALL171/WORK171/원장 기록 작성. 영수증/인계 커밋·main푸시가 다음 즉시 단계다.

누적 원장 docs/research/ENGINE_STATUS.json 최신171:78행 verified39/partial34/unimplemented2/unverified3. NET-01은 실제 경로가 생겨partial로 변경, 다른 상위 행 전체완료 승격0. 전체 corpus gate false. docs171.mjs는 이미 원장/API/BP/연구 append했으므로 재실행 금지. proof171/finish171도 완료, 재설치 불필요. 추가 product code를 만들 때만 새 버전으로 검사/전환한다.

발견 수정: 패치 rollback에서 실제/후속 hash 모두없는 항목을 출력으로 판단한 오류; RPC C++ 존재하지 않는 JSON helper; 트리 검사에서 스크롤 뒤 재사용된 DOM 속성을 읽는 오류(제품 문제아님); UI 선택 값>1의 기존 검증/SetValue 문제; 소켓 없는 모드의 권한 복원·연결 시작 권한; 공개 속성 상속형 검증; 재적용 뒤 레벨 준비에 폐기 token을 쓰는 캐시와 world 참조 수명. 기존 Native 간헐 NavigationCompleted 시작 실패 원인은 미확정,171 표본 통과를 전체 해결이라고 말하지 않는다.

주요 경계: 네트워크는 양쪽에 있는 오브젝트 필드 복제이며 전용 권위 서버 규칙/액터 생성삭제 수명/관심영역/입력 예측재시뮬레이션/호스트 이전 미완료. 접속 키를 배포된 공개 에셋에 넣는 보안 경로는 후속 검토 필요. C++ 비공개/정적 메모리와 native타이머는 재생성, debugger 미구현. Tree 가변 높이는 item.height 명시값이며 자동 콘텐츠 측정은 아님. 스트리밍MB는 추정 예약이며 실제RAM 예산 아님. UV경계는 좌표맞춤이며 토폴로지/섬 선택 병합 아님. 충돌LOD는 정적 선택, 애니/카메라 동적 LOD 아님. Cue는 태그/이벤트 전달, 자동FX자산·능력네트워크예측 미완료. 더 많은 모든 잔여는 ENGINE_STATUS 기준.

사용자에게 최근 “설치 최종 검사 동안 에셋 변경 비교·병합과 소스 관리 화면의 기존 코드를 확인한다”고 알림. 다음172 진행 제안: BLD-06의 에셋 3방향 병합(안정 ID 배열/삭제 수정 충돌/결정적 결과/인간 해결/AI revision·dryRun·Undo) 및 프로젝트 Git 상태/선택 diff/stage/commit 전용 창. 새 모듈/테스트 아직 작성 전이므로 구현한 것으로 보고하지 말 것. 부모 repo에 프로젝트가 있을 때 외부 staged 파일을 commit하지 않도록 프로젝트 범위와 index revision을 보호하고, shell 없이 execFile argument로 처리. 사용자 프로젝트 대신 새 임시 Git repo로 검사. 자동 push/외부 원격변경은 만들지 않는다.

장기 미구현 큰 영역: RND08 거리장AO/라이트맵베이크/HWRT, BLD05 실제 모바일 에디터. native/mobile/android/HBActivity.java·Bridge.cpp, tools/mobile-android.mjs/build-mobile.mjs, docs/research/MOBILE_EDITOR_BODY_012.md 읽기 시작. Android SDK·NDK 약관/설치/빌드 사용자 허가 있음, 실물기기없음. Mac없지만기존원격iOS simulator근거있음. 모바일게임빌드와 모바일에디터를 혼동하지 않는다.

실행은 exec_command session ID에 write_stdin, functions cell_id에만 wait. 새 임시 스크립트 native/build/wire/fix/docs는 부분 재실행 시 중복/실패하므로 재실행 말고 현재 소스 검토. 테스트 끝 tools/test-artifacts.mjs로 report/capture/source 보존, Builds/WebView2/plugincache만 정리. 데이터 폴더 대량 삭제 금지. 테스트/배포 복사/사용자 전환은 순차, runtime/node.exe 잠금 방지. 소스 한글 커밋(author/committer kirby47navercom-ai 동일)·pushmain. 한 줄 잠깐 보고 후 일을 끝내지 말고 실제 다음 구현을 이어간다.
