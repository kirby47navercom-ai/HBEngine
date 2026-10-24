# HBEngine 현재 인계 (2026-10-25)

최신: 끝내지 말고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), UPDATE_HOLD active 보류. 사용자 창/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음, 불변 SDK/렌더러 검사 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api generated ignored.2490 fallback-all 경계위반 WORK2520 기록·focus수정; 새 broad fallback 금지.

확정 core 6ac70824a9fe8b594cee236bbe82c778b4ebdfbd; WORK2594/ENGINE_STATUS. 이전2470c808 골격2559, 254003f9 Cue재바인딩2543, f97fd958 초기Cue2534, ddcf6f3a2520, b8ed075c/3ded8af82485.78행37verified/37partial/1unimplemented/3unverified, 전체율null·전체분석/엔진/설치 완료 아님.

2561–2594:
- Cue v2 exact프리팹·wrapper로작성rootTRS/객체참조보존·부착/분리(전단거절)/게임시각수명·effect/ability/channel stop/교체·동적cueAsset교체/소유/VM 종료. 기존SceneSpawn/Destroy·BP/native bindings/풀 재사용. managedSpawnCatalog 정확참조만준비/level일반catalog확장. private풀/템플릿분리·latebuild/init취소·rootlease로재사용보호. 공통삭제의 중첩spawn자식누락·EndPlay실패정리중단 수정. 사람v1한Undo변환/폼·AI일반문서CAS·rename/4targetcontent. cue-vfx-ApowrO/acceptance26.
- 공동v1/v2 journal 외부충돌에도 읽기열기/일반쓰기잠금. 사람32행·AI inspect/resolve/open·전체hash CAS·명시before/after/disk·dryRun. linkedchild로실제binary/text rollback/재시작/ID·외부원문보존, 비UTF8텍스트도원문backup. 중간payload교체거절·자식선택우선·독립겹침family/conflictPaths로다른결정자동덮어쓰기차단.
- 단일WriteIntent도 write:UUID로같은UI/API. 원문없는기록의가짜복원없음·disk만선택/바이트쓰기0/현재ID·외부삭제보존·다중ID충돌·수정된임시보존. 완료history원문Map누적안함. 복구메뉴파일명/해시·크기/ID·paged/no payload.
- recovery 최종 transaction-recovery-aP9YKt/acceptance28, asset-transaction-xqltmD17/model-images-lWSAoJ14(group2589). Cue기존25/spawn8/document-merge15(group2586). 신규54+회귀79=133, syntax16+변경2. SDK컴파일/GPU/GUI/OS음향/기기/설치0. 그룹초기old-init-reject 기대는읽기허용+쓰기잠금으로검사갱신; 잘못된fixture필드/stackLimit·aria와 실제자식누락은기록2594.

이전: WORK2485 신규70(PBR추출/내장이미지/기존클립구간/ongoing/TileBrush),2520 신규33(실제참여자·3방향문서merge·거리각도jointbreak/0spring),2534 신규17/2543추가8(Cue25),2559 신규20(골격TRS/모프keyPaged/한Undo/CAS/yield/실제Graph). 상세각receipt/docs. SDK타일/관절실제실행은이전기록만, 반복금지.

다음: 본/소켓VFX·여러emitter, 고급rig/DCC/렌더링·물리반력/소성 등 실제잔여 이어가기. 일반physics tick/ongoing 고정점·태그증분·binary 임의rename/index공동복구·전원내구성 별도. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 정확context keyword/symbol 사용, modes focused-routes 확인.
설치 역사 USER_INSTALL2145 Versions/73341067df5a12be SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc. 새복사/예약0. 무거운검사전activeInstalledVersions. CPPcache32정책/소유helpers만정리·fixture/recipe/report/SDK/사용자데이터유지. 새목표/재개질문으로중단하지않음.
