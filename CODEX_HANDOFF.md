# HBEngine 현재 인계 (2026-10-25)

최신: 사용자 '끝내지말고 계속' / 예약 재생성 금지(hbengine 삭제2160) / UPDATE_HOLD active 계속 보류. 창·사용자프로필·게임원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음; 변경없는 SDK/렌더 검사 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/검사/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api 생성ignored. 이번 초기 복구 symbol2490 fallback-all이1106소스까지 읽힌 탐색 경계 위반은 WORK2520에 기록; 새 recovery focus route 추가/실제 focused 확인. 더 넓은 fallback 금지.

확정 core f97fd9583c7ba64d3888c3542e017bb2a07abc0b; WORK2534/ENGINE_STATUS(이전2520 core ddcf6f3a).78행37verified/37partial/1unimplemented/3unverified, 전체율null. 설치·전체분석/전체엔진 완료 아님.
2485의70source(재질/클립구간/ongoing/내장이미지공동복구/타일획)와 기존C++타일gate는 WORK2485·기능docs 참조. 재실행하지 않음.

2486–2520 새 구현:
- ongoingParticipants/ongoingOwners: 조건부대상+설정role owner+origin/newrole+live transitive 종속자만 rollback snapshot·태그 고정점/수치부분색인/공개. 첫참여 외부태그 reconcile·스택새ref·마지막제거/만료/세트reset/퇴역/dispose index회수, 순환rollback 유지. 전체조건고정점·일반tick모든owner순회는남음. docs/EFFECT_ONGOING.
- DocumentMergeSession/planDocumentMerge: 저장base/현재·복구mine/최신disk 3방향, 독립객체필드 병합·겹친배열/텍스트/삭제수정 명시JSON Pointer선택. 원래base없으면 전체선택. 사람외부충돌창·AI document.conflict.merge CAS/compact dryRun/한Undo 초안, 저장은별도일반CAS. IO중문서교체/이름변경/추가편집거절, 디스크변경선택reset, 원래복구base유지/transient dialogOpen저장제외. AI같은문서모달만해결/닫기; 다른모달잠금유지. docs/DOCUMENT_CONFLICT_MERGE.
- 관절 breakDistance(m)/breakAngle(최단상대도,0off), substep전후 실제앵커/회전측정·실제joint제거·동일component/body nonce동안sticky, 재연결현재기준. BP/C++ Physics::SetJointBroken→physicsJointBreak 실제공용solver, 기존 AI관절page broken/breakState복사·debug 마지막1상태/퇴역정리. 2D는화면Z제외. 반력 force/torque는현재Rapier JS조회없어별도잔여. 0강성/0감쇠 spring motor가속도0만들던실제퇴화는motor impulse cap0으로수정. docs/JOINT_BREAKAGE.

증거: native/build/group2496.json(초기새8+merge13와ongoing22/live13/immunity16/reapply6/clock5). 최신new8: ongoing-participants-AeLZ7Y/acceptance.json; merge15: document-merge-A4ugN5/acceptance.json; joint10: joint-break-xT8iZu/acceptance.json(현재SDK 실제C++ worker binaryhash/명령solver재생), 기존6축7: joint-dofs-237-QAuvaQ/acceptance.json; physics-syntax2512.json 실제Rapier166assertion+소유syntax13. 최종merge/관절 수정 때문에 필요한해당검사만재실행, 불변renderer/GUI/기기/SDK전체 없음. 테스트실패는2520에기록(실패/수정 상세는2520).
owned2519.json의21소스+인계 해시delta, sourceHashBase2485. native/build 헬퍼/query만 exact경로검증후정리하고 보고/원본fixture/recipe보존. 공유CPPcache32정책유지. 생성core는generatedCore()만쓰기, NODE_CATALOG 재생성안함.
설치: 역사 USER_INSTALL2145 Versions/73341067df5a12be(SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc)만 확정, 새복사0. 무거운검사 전active조회. 현재작업은업데이트보류·예약0 유지.
다음: 누적원장 actual remaining을 이어서 구현. GAM04 독립VFX/동적Cue재바인딩/고급타깃, PRJ 바이너리복구충돌 UI, 물리반력/소성, 애니메이션리그/런타임 등 남음. GL 초기준비1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 완료/목표재개/예약질문으로중단하지않음.
소유 helper/query38개109222B 정리: native/build/temp-clean2521.json. 보고/fixture/recipe·SDK/프로필/Versions 보존.

2523–2534: gameplaycue v1 + AbilitySystem.cueAsset 시작바인딩, 태그/phase별 공유컴파일·음향채널/stop·소유emitter burst. 커밋 후 media·기존사용자Cue이벤트, 실패시수치/이벤트유지/마지막요약. lateaudio/factory owner세대검사/임시state폐기, 일반저장/rename/reference/4targetcontent. 신규17: native/build/gameplay-cues-h2XolL/acceptance.json; 영향40: group2529.json. docs/GAMEPLAY_CUE_ASSETS. 실제OS음향/GUI/새CPP/GPU/기기/설치0. 동적재바인딩/독립VFX템플릿·지속핸들남음. owned2533.json13소스+인계delta, base2520.
