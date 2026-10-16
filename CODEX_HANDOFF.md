# HBEngine — 170 설치 전환 직전 — 2026-10-16

사용자: 누적 전체 잔여 세부를 여러 분야 묶어 길게 구현·마지막 검사·설치 업데이트. AI친화/가벼움/Versions1. 주인님/짚짱·존댓말. 사용자 창/프로필/게임 원본 보호. 새에이전트 요청 없음. 전체 corpus gate false.

기준 b5d240f,170 미커밋. 구현: Prefab 직접 자식 포함/추가삭제 Apply/Revert·ApplyAll 원자 Undo·변형 컴포넌트 안정 ID 속성/추가/삭제·상속 부모 자식, UV 전용 캔버스/폼·섬 선택/드래그/팬/휠/프레이밍·분리/평면unwrap/shelfpack·view API, FullBodyIK 루트 fixed/pin/prePull/free·거리 제한/목표 회전·뼈 강성/선호 초기각·상세폼/AI·C++BP3, PCM 가상음성 시계/소스해제/승격·실제32/추적1024 설정·우선순위/거리/볼륨·Listener/Source·C++BP4, 타일 WeakMap 셀 조회/단일Set 전체검증 생략. Native 시작 실패 WebErrorStatus 로그 추가. 노드767/코어289. 추가 의존성/idle폴링/자동GPU읽기0.

검사: 170CPU17 engine-170-yQjKIN,169CPU23 J30YQx,168CPU12 hi4oxi(실제 폴더명 hi4oxi 여부는 ENGINE_WORK170 JSON 참조),166CPU12 WNFDby,코어767/API/native/오디오/XYZ 제한 통과. Editor170 vruk2r 사람 Prefab/UV/AI/Undo·C++·Take/실제 WebAudio source2/virtual6·우선순위 변경 phaseError0 PASS. D3Ddev b9Gjgv/release v4hvu0/WebGPU I1QfVt PASS. 이후 UV전용폼/프레이밍/view API·IK뼈폼/API를 추가했으므로 최종 설치EXE170 검사에서 새분기도 확인해야 함. check-desktop 최종 실제166물리/67형상·허브/한글프로젝트/잘못된파일/서버해제 PASS.

발견수정: UV 버튼 핸들러/첫 클릭 크기 준비 누락, 대기 오디오 우선순위 비동기 유실, 가상 PCM이 resume기다리는 문제, 자체검사의 selector escape·AudioListener 수치메타 type/골격fixture API, check-desktop 오래된 계수/증거삭제/종료캐시실패. Native 간헐 NavigationCompleted실패는 초기2회 있었음. 상태로그를 추가했고 이후 샘플은통과했으나 원인은 확정하지 않았음. 전체해결이라고 보고하지 말 것.

한계: UV indexed 공유간선 섬/평면투영이며 seam stitch/곡면unwrap/최적회전패킹 아님. FullBodyIK 다중CCD는 UE PBIK아님; positionStiffness는루트만허용, 늘이기/일반위치제약/rigstage 미구현. PC music/virtualizefalse streaming은선호배정하되디코더완전가상화아님. 모바일기존PCM유지. PCM 캐시32MiB+활성참조; 전체메모리무상한증명아님. 타일쓰기는배열복사비용과큰맵256제한여전히있음.

다음: 기능한국어커밋 → 최종prototype/tools/docs/SDK/native desktop dist동기화(바이너리이미build-desktop컴파일) → 프로필10385파일SHA·installEditor로사용자설치/이전정리 → 새 설치EXE check-engine-170-window --executable (AI bone.add/Undo·UV view API 추가됨)·캡처시각확인 → profile/manifest/shortcuts/association/Versions1·tools/test-artifacts정리 → USER_INSTALL170·최종증거/인계·한국어영수증커밋/main푸시. 현재설치5e97fbc46c607b17 미변경. 현재테스트PID없음. 테스트/복사/실행순차로node.exe lock피함.

재현 도구 tools/check-engine-170.mjs,check-engine-170-window.mjs,check-engine-170-player.mjs,engine-170-fixture.mjs. 임시native/build의 edit/wire/tests/docs170 스크립트는 일부 재실행시 중복변경하므로 재실행금지. docs170 이미 원장/분야문서/API/BP/연구170 작성. ENGINE_WORK170 JSON CPU17로수정됨, player cppInitial은초기값이고 마지막2/6 getter assert는스크립트와 Editor cpp에증거있음. 현재원장78행39/33/3/3,상위완료0. 전체엔진완료로축소하지 않음.
