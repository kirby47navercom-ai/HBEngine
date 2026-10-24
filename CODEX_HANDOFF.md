# HBEngine 현재 인계 (2026-10-25)

최신: 끝내지 말고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), UPDATE_HOLD active 보류. 사용자 창/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음, 불변 SDK/렌더러 검사 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api generated ignored.2490 fallback-all 경계위반 WORK2520 기록·focus수정; 새 broad fallback 금지.

확정 core 863e330ad6307e3d47700aa9eb6de67933f0774b; WORK2632/ENGINE_STATUS. 이전2470c808 골격2559, 254003f9 Cue재바인딩2543, f97fd958 초기Cue2534, ddcf6f3a2520, b8ed075c/3ded8af82485.78행37verified/37partial/1unimplemented/3unverified, 전체율null·전체분석/엔진/설치 완료 아님.

2561–2594: Cue v2 독립프리팹·rootTRS/바인딩/부착·분리·채널/게임시각/풀rootlease/지연취소·삭제실패정리. 공통journal 외부충돌 읽기허용/쓰기잠금·전체CAS·linkedchild·명시disk/before/after·writeIntent disk-only/원문보존. WORK2594/관련전용문서, 신규54+회귀79. 새SDK/GPU/GUI/기기/설치0.

이전 상세: WORK2485(PBR/이미지/클립/ongoing/tile),2520(참여자/문서merge/jointbreak),2534/2543(Cue25),2559(TRS키20),2594(CueVFX26/복구28),2608(retime15). 각receipt/docs로연결. SDK실행은이전근거만·반복금지.

다음: 본/소켓VFX·여러emitter, 고급rig/DCC/렌더링·물리반력/소성 등 실제잔여 이어가기. 일반physics tick/ongoing 고정점·태그증분·binary 임의rename/index공동복구·전원내구성 별도. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 정확context keyword/symbol 사용, modes focused-routes 확인.
설치 역사 USER_INSTALL2145 Versions/73341067df5a12be SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc. 새복사/예약0. 무거운검사전activeInstalledVersions. CPPcache32정책/소유helpers만정리·fixture/recipe/report/SDK/사용자데이터유지. 새목표/재개질문으로중단하지않음.

2595–2608: skeletal.retime/prepareSkeletalRetime·사람 길이재조정. v1 TRS/index/morph 값·보간 유지/시간uniform양수배율, 가중fraction/Ycontrol 유지·초당tangent 나눔·infinityDomain/ranges/notifies/states/sync마커 함께변환. flat시간/curve키만준비4096yield·Float32충돌/표현범위거절·한Undo/기존preview정리·동일phase시간. AI strict bool/compact·분리full초안/최종CAS·rename/교체취소. skeletal-retime-xgRTXg15 +구간LHoEL79/키hvYv8820(group2600), 실제savedGraph 위치/quat/indexscale/fullmorph. 신규SDK/GUI/GPU/기기/설치0. docs/SKELETAL_CLIP_RETIME. 전체검증/Undo 비용·역재생/비균일워프/DCC잔여 별도.

2609–2619: JointRuntimeRecords 참조소유/정상파손후보 색인·Map/owner순서·replace/delete/clear/repair/disable/세대갱신. break pre/post는후보만, targetpage/manual은owner목록. JSON owner/component쌍 key로colon충돌수정. inspect breakCandidates계수. joint-index-vjXM0D 신규8(10001중무관10000속성/전체iterator trap), joint-break-N3RGkA source9/SDK1명시skip, DOF237-1bZSNv7(group2614). SDK프로토콜수정/실행/재사용주장0. 전체sync/solver여전·O(J)추가참조·FPS/heap검증아님. force/torque/plasticity별도. owned2615+인계 delta/base2608.

2620–2632: abilityTickWork 빈맵 iterator/임시배열0·능력한순회 기한/쿨다운/활성 판정, dirty 뒤 cooldown재판정. 시간만바뀔때 무한effect/쿨다운0 DTO행공유·일반변경invalidate, 유한remaining/cooldown/root시각계속갱신. ability-tick-work-FYatXQ11+관련97(group2624); 신규fixture중복변수만고쳐실패도구만재실행. 10003idle×2 소유수명20006확인·재공개0. 전체owner수명/ongoing고정점유지·FPS/heap/CPP/GPU/GUI/설치주장0. base2619·소스6개.
