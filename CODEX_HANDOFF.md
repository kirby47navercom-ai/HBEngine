# HBEngine 현재 인계 (2026-10-25)

최신: 끝내지 말고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), native/build/UPDATE_HOLD.json active 보류. 사용자 창/탭/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음·실패도구만 재실행, 불변 SDK/렌더러 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api generated ignored; generatedCore()만사용, CLI카탈로그생성금지.2490 fallback-all 경계위반 WORK2520 기록·focus수정; 새 broad fallback 금지. hb context는 등록된 keyword/실제symbol·focused-routes 확인.

확정 core f24c31f816cee7f8bac3ca85c453a8f62bf233a7; WORK2702/ENGINE_STATUS.78행37verified/37partial/1unimplemented/3unverified, 전체율null·전체분석/엔진/설치 완료 아님. 원장 sourceHashBase로 기록 소유자만 합성; 보호파일 새해시읽기금지·lineage60부터 기존기록Map압축 고려(최대64).

최근 실제 구현/근거:
- WORK2594(6ac70824): Cue v2 독립프리팹 rootTRS/바인딩·채널/풀lease/게임시각·취소/종료정리, binary/text journal·WriteIntent 사람/AI/CAS·linked child·외부원문보존. 신규54+회귀79. 전용문서 참고.
- WORK2608(b8841305): skeletal.retime 양수uniform·TRS/morph/curve tangent·범위/notify/sync·사람/AI Undo/CAS·실제Graph. 신규15+회귀29. 역재생/비균일/DCC별도.
- WORK2619(d3a49eef): JointRuntimeRecords 정상파손후보/owner 색인·ID쌍구분. 신규8+파손9/DOF7·SDK1명시skip, 전체sync/solver/반력/plasticity별도.
- WORK2632(863e330a): ability tick 빈map/임시배열제거·단일능력순회·시간불변 DTO공유, 일반변경invalidate·유한시간/소유수명유지. 신규11+회귀97; 10003idle소유수명20006·재공개0.
- WORK2656(3f0fa189): SkeletalSocket/Attachment 초기·풀전/최종포즈·중첩·수명·ID·오류. Cue v3 명시Undo변환·bone/socket·자식이미터경로·async lease. 신규30+회귀62. docs/SKELETAL_SOCKETS. 한actor다중ParticleSystem/전용부착track/physics/2D SpriteRig별도.
- WORK2670(449cfcbf): 소켓7 public C++/pureBP/live 권한·형·world/local/page·전단원점/TRS거절. source8+현재SDK7함수8질의, 회귀30. worker f842ea326b46d8209d8c SHA c008234a8e2dce069f4ee6003f3acdab4756290742f5f9099e74f96b88234ec3, SDKdeps영수증. 새GPU/GUI없음.
- WORK2690(94a686f2): 파일/modelsidecar rename stream SHA/inode·배타link(본문복제0), index/redirect 초기복구·pending인덱스쓰기보류. 사람/AI rename:UUID·전체CAS·명시before/after/disk·자식scope/재시도/preview·완료경로요약압축. 신규26+회귀79(group2684)·실제owned abrupt exits/경합/10kindex<4KB. docs/ASSET_RENAME_RECOVERY. 폴더/특수내부legacy·다른FS/실제전원/다중writer별도.
- WORK2702(f24c31f8): 산포grid는radius+minDistance 근처만, 소거먼점hypot skip, 선택찾으면종료·빈선택접근0·선택index변환/복제. mutable문서cache0·기존검증/복사/Undo/ID/시드 유지. foliage-local-KEsubm 신규14(독립전수oracle)+draft1074/부분갱신1059/scene1061 source3gate(group2695), syntax4/focus2696. 옛보고서덮기금지 wrapper로 .2695.json. Map10002→2, hypot10003→3, 앞2선택후무관10000접근trap. 기존gate의copy시간은 이번변경전후 성능이 아님·FPS/heap/GPU/GUI/SDK/설치0.

다음: canonical remaining의 실제 제작/실행 기능 계속. 전체 world 복사·검증/전체순회·ongoing고정점/태그증분·전용rig/DCC·반력/소성·렌더링 잔여. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 서류정리/몇수정으로 전체완료표현금지.
설치 역사 USER_INSTALL2145 Versions/73341067df5a12be SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc. 새복사/예약0. 무거운검사전activeInstalledVersions. CPPcache32정책(nativeCacheOnly는소스열거안함). 소유helpers만정리·fixture/recipe/report/SDK/사용자데이터유지. 새목표/재개질문으로중단하지않음.
