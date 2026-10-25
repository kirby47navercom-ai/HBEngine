# HBEngine 현재 인계 (2026-10-25)

최신: 끝내지 말고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), UPDATE_HOLD active 보류. 사용자 창/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음, 불변 SDK/렌더러 검사 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api generated ignored.2490 fallback-all 경계위반 WORK2520 기록·focus수정; 새 broad fallback 금지.

확정 core 94a686f277713bf85f6cb378fd1aa8f749f752c7; WORK2690/ENGINE_STATUS. 이전2470c808 골격2559, 254003f9 Cue재바인딩2543, f97fd958 초기Cue2534, ddcf6f3a2520, b8ed075c/3ded8af82485.78행37verified/37partial/1unimplemented/3unverified, 전체율null·전체분석/엔진/설치 완료 아님.

2561–2594: Cue v2 독립프리팹·rootTRS/바인딩/부착·분리·채널/게임시각/풀rootlease/지연취소·삭제실패정리. 공통journal 외부충돌 읽기허용/쓰기잠금·전체CAS·linkedchild·명시disk/before/after·writeIntent disk-only/원문보존. WORK2594/관련전용문서, 신규54+회귀79. 새SDK/GPU/GUI/기기/설치0.

이전 상세: WORK2485(PBR/이미지/클립/ongoing/tile),2520(참여자/문서merge/jointbreak),2534/2543(Cue25),2559(TRS키20),2594(CueVFX26/복구28),2608(retime15). 각receipt/docs로연결. SDK실행은이전근거만·반복금지.

다음: 본/소켓VFX·여러emitter, 고급rig/DCC/렌더링·물리반력/소성 등 실제잔여 이어가기. 일반physics tick/ongoing 고정점·태그증분·binary 임의rename/index공동복구·전원내구성 별도. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 정확context keyword/symbol 사용, modes focused-routes 확인.
설치 역사 USER_INSTALL2145 Versions/73341067df5a12be SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc. 새복사/예약0. 무거운검사전activeInstalledVersions. CPPcache32정책/소유helpers만정리·fixture/recipe/report/SDK/사용자데이터유지. 새목표/재개질문으로중단하지않음.

2595–2608: skeletal.retime 양수uniform 시간/키/curve tangent·범위/notifies/sync 변환·사람/AI oneUndo/CAS·실제Graph. WORK2608/전용문서·신규15+회귀29, 역재생/비균일워프/DCC별도.
2609–2619: JointRuntimeRecords 정상파손후보/owner 참조색인·ID구분자충돌수정. WORK2619 신규8+실제파손9/DOF7·SDK1명시skip. 전체sync/solver/반력/plasticity별도.

2620–2632: abilityTickWork 빈맵 iterator/임시배열0·능력한순회 기한/쿨다운/활성 판정, dirty 뒤 cooldown재판정. 시간만바뀔때 무한effect/쿨다운0 DTO행공유·일반변경invalidate, 유한remaining/cooldown/root시각계속갱신. ability-tick-work-FYatXQ11+관련97(group2624); 신규fixture중복변수만고쳐실패도구만재실행. 10003idle×2 소유수명20006확인·재공개0. 전체owner수명/ongoing고정점유지·FPS/heap/CPP/GPU/GUI/설치주장0. base2619·소스6개.

2633–2656: SkeletalSocket/일반SkeletalAttachment·초기/풀획득전·최종포즈/중첩부모우선·등록대상만·ID/퇴역/오류. Cue v3 명시Undo변환·뼈/소켓 VFX·자식이미터경로·async/pool lease·v1v2TRS보존. WORK2656 신규30+회귀62/구문9(group2651). docs/SKELETAL_SOCKETS. 전용시퀀스track/같은프레임충돌/동적강체·2D SpriteRig/한actor다중ParticleSystem/네트워크별도.

2657–2670: 소켓7 C++/pureBP/live query(world기본/local/page/권한/형·전단원점/TRS거절). WORK2670 source8+실제현재SDK 7함수8질의/회귀30·worker SHA/SDKdeps 기록. generatedCore만생성·카탈로그보호.

2671–2690: 일반파일/모델sidecar 이름변경을 inode/stream hash·배타hardlink로journal화(본문복제0). .hbassets/redirects 공동복구·index읽기전 복구, pending동안list/registry 인덱스저장/다른복구보류. 사람기존창/AI rename:UUID·양쪽SHA·전체CAS·명시before(검증원본전체)/after(현재내용남은sidecar완료)/disk(삭제/외부메타보존/ID정리). scope유지자식재시작·외부충돌·callback실패후동일프로젝트재시도·preview실행가능검사. 완료는경로/ID/hash요약·압축실패는commit안되돌림/다음열기재시도. docs/ASSET_RENAME_RECOVERY. final group2684: rename-journal-Ns96t9 신규26+복구28/transaction17/image14/Cue20=105·syntax5/focus2685. 실제owned Node abrupt exit6위치·주입경합/중복ID/10kindex<4KB 확인. DOM fixture querySelectorAll/변수shadow 오류수정, child scope/재시도/preview/CAS 보강. 코드94a686f2. 같은볼륨하드링크필요, 폴더/특수내부는legacy·다른FS/실제전원/다중writer내구성별도. 새SDK/GPU/GUI/기기/설치0·예약0. base2670.
