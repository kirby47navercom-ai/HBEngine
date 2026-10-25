# HBEngine 현재 인계 (2026-10-25)

최신: 끝내지 말고 계속 구현. 예약 재생성 금지(hbengine 삭제2160), native/build/UPDATE_HOLD.json active 보류. 사용자 창/탭/프로필/게임 원본/Versions 변경 금지. 새 에이전트 금지. Mac/Xcode/Android폰 없음. 여러 구현 뒤 영향 검사 묶음·실패도구만 재실행, 불변 SDK/렌더러 반복금지. 한글 동일 kirby47navercom-ai author/committer·AI trailer 없이 commit/push.
보호: prototype/player.js, tools/check-player-keyboard-release.mjs 읽기/편집/실행/stage 금지. docs/NODE_CATALOG.md 기존dirty 미stage. core-api generated ignored; generatedCore()만사용, CLI카탈로그생성금지.2490 fallback-all 경계위반 WORK2520 기록·focus수정; 새 broad fallback 금지. hb context는 등록된 keyword/실제symbol·focused-routes 확인.

확정 core de1dd0c061e753cbd625fdb84f079b93b9a5fa7d; WORK2762/ENGINE_STATUS.78행37verified/37partial/1unimplemented/3unverified·전체율null. 해시2720 Map압축·60전기록Map재압축/보호해시새읽기금지. 전체/설치완료 아님.

최근 실제 구현/근거:
- 이전 WORK2594(Cue/stream저널54+79),2608(균일리타임15+29),2619(관절색인8+회귀): 각영수증/전용문서 참조·전체완료아님.
- WORK2632(863e330a): ability tick 빈map/임시배열제거·단일능력순회·시간불변 DTO공유, 일반변경invalidate·유한시간/소유수명유지. 신규11+회귀97; 10003idle소유수명20006·재공개0.
- WORK2656(3f0fa189): SkeletalSocket/Attachment·Cue v3 상대child이미터·초기/풀/최종포즈·수명. 신규30+회귀62. docs/SKELETAL_SOCKETS; 다중ParticleSystem/전용track/physics/2D별도.
- WORK2670(449cfcbf): 소켓7 BP/CPP/world-local·source8/실제8질의. 당시SDK역사영수증이며 현재SDK는2734에서변경. 해시불일치재사용금지.
- WORK2690(94a686f2): 파일/modelsidecar rename stream SHA/inode·배타link(본문복제0), index/redirect 초기복구·pending인덱스쓰기보류. 사람/AI rename:UUID·전체CAS·명시before/after/disk·자식scope/재시도/preview·완료경로요약압축. 신규26+회귀79(group2684)·실제owned abrupt exits/경합/10kindex<4KB. docs/ASSET_RENAME_RECOVERY. 폴더/특수내부legacy·다른FS/실제전원/다중writer별도.
- WORK2702(f24c31f8): foliage local grid/선택/소거·기존seed/ID/Undo유지. 신규14+기존3gate. docs/FOLIAGE_LOCAL_WORK. 전체복사/검증·FPS/heap별도.

- WORK2720(15eb35c0): 바인딩준비f32ba715 신규11+회귀53+조회/해시일치CPP8호출. docs/RUNTIME_BINDING_PREPARATION. context 자동fallback차단 신규가드6.2710오등록fallback2회 보호player도구읽기위반(편집/실행/stage0)·원장명시/경로수정/재발차단.

- WORK2734(e0888417): 선택형 휠관성·접촉충격량/동적지면반작용·차동슬립제한·ABS(주차우회), 속성/휠표시/진단·공용BP/CPP3조회. 신규15+구동계5/초기화11·현재SDK C++3정상/2오류. 실제headless 공중/21.18m/s주행/제동/후진/차동·Three표시. docs/VEHICLE_WHEEL_DYNAMICS. GUI/device/FPS/고급타이어별도.

- WORK2744(f5fa6d61): 진행태그 exact/계층 개수·의존 색인(한동기transaction), 역할수명/서명공유(한호출). 최소고정점/태그순서/외부편집/교체/원자순환유지. 신규13(독립220그래프)+회귀46·group2740. 평가218960→1519·501효과2역할 ID조회1. docs/EFFECT_ONGOING. 전체snapshots/색인/벡터·tick수명순회/FPS별도.

- WORK2754(a4554678): 2D chains 기준뼈사이 단일체인 rest월드길이·최대1:1/순서/최소오차 대응. 분기추론않음·Unicode보존. 사람검토표/AI rig.clip.retarget(mapMode:chains,positionMode:pose)·실제bake/Three. 신규13(독립전수60조합)+기존2sourcegate. docs/SPRITE_RIG_CHAIN_MAPPING. 원문/CAS/dryRun/Undo hook·키예산 유지; 임의접촉/전체체형/GUI별도.

- WORK2762(de1dd0c0): JSON cook v3(target+sourceSHA) 경로중복disk0·독립반환Buffer·손상검증/LRU. temp PID/host/나이/identity·실행/타host/unknown보존. Windows동시rename충돌은검증동일winner만재사용. 신규13:100경로1bin·8동시·실제child종료/취소. docs/COOK_CACHE_OWNERSHIP. GPU압축/RDO/전체export/보호player미검사.

다음: canonical remaining의 실제 제작/실행 기능 계속. 전체 world 복사·검증/전체순회·ongoing고정점/태그증분·전용rig/DCC·반력/소성·렌더링 잔여. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지. 서류정리/몇수정으로 전체완료표현금지.
설치 역사 USER_INSTALL2145 Versions/73341067df5a12be SHA73341067df5a12be1fb1758e510ffa8c0ee7ca6b285a1bc5164afc33df4571bc. 새복사/예약0. 무거운검사전activeInstalledVersions. CPPcache32정책(nativeCacheOnly는소스열거안함). 소유helpers만정리·fixture/recipe/report/SDK/사용자데이터유지. 새목표/재개질문으로중단하지않음.
