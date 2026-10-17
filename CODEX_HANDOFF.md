# HBEngine 현재 인계 — 243–248 구현·설치 준비 / 누적 계속

## 규칙
사용자 최신: 남은거 다 하라고. 여러 분야 실제 제작/CPP/BP/게임까지 길게 계속, 몇 개 뒤 최종 종료 금지. 주인님/짚짱/해요체. 사용자 창/프로필/프로세스/원본 보호, 숨김 소유 EXE/고유 fixture/profile/port만. Versions1, 공식정리, 한국어 commit/push main, author=committer kirby47navercom-ai <228715038+kirby47navercom-ai@users.noreply.github.com>. 새 agent 금지. createProject가 prune하므로 창/빌드 검사는 순차. 각 명령 LASTEXITCODE 확인. 원샷 helpers 절대 재실행 금지. 현재 goal 없음.

## 설치242는 그대로
C:/Users/kirby/HBEngine/Versions/ea1799af84bb0d85/HBEngine.exe. source5ef5bcf2c6859aaad1a6241c63ea75c7abc81301, bundleea1799af84bb0d8585955257f7ce303e7b6e59c1ae3437332426918dd31aef76,2846 manifestfiles. USER_INSTALL_242.json. 실제 User10385 SHA46024720c91a2d2eff0661b5c35304fb8acbbc646062762ae8cf492664443d26. 설치clothazzOcB/ropexvsMhk각editor+2D3DGL오류0. Versions1/링크2/.hbproject. install242/finish242/docs239-242/sync242 모두 완료 재실행 금지.239–242 구현/근거는 정본과 이전기록 유지.

## 243–248 구현 소스 커밋 완료
53db2029150e6e6e0f85ef8f9d5cd05d18873b00. 현재 docs243-248 helper 완료(marker done) 재실행 금지, 문서/STATUS/hand-off 아직 후속 커밋 필요. 그 뒤 배포 동기화/새install248 helper/설치 검사/receipt 갱신할 것. 현재 242 설치본은 미수정.
243 optional modifier.scaling{curve,track}: magnitude*floatCurve[level], default1. AbilitySystem apply/relevel/periodic/stack/instant/rollback/asyncowner guards. effectDefinitionLibrary 공유 캡처64개/직렬화추정32MiB; 내용 JSON 비교는 적용 때만(in-place/fresh-clone read도 안전); 동시요청합침/퇴출·큰템플릿도게임적용허용·activecapture안변함/idle0curveI/O. sharedstack latestacceptedlevel·independent별level. effectPage bounded256/no curveclone, Inspectorlevel/AI runtime.effect/level. 전용curve/track/previewlevel view-only/Undo. ProjectService effect/curve 참조 검사·draft/삭제/SHA. 일반 effect/curve/abilityset 저장도 commitAssetBatch retainJournal:false: target CAS/종속 post-check/rollback, 성공임시journal삭제(명시 batchUndo는기존journal유지). export preflight. CPP4 ApplyEffectAtLevel/SetEffectLevel/GetEffectLevel/FindEffectHandle queuedwrites/gettersprocessed.
244 GetClothParticle/GetRopeParticle(target,index,outposition,outvelocity,outpinned), BP다중출력. 실제world singleparticle live query, native-live-query module로 기존GPU callback/channel/host/mobile 공유키/대상/인덱스/응답검증. 전체입자snapshot없음. 일반 NativePhysicsQueryWorld의 C++ Raycast/Overlap softsurface는 여전히미포함(별도잔여). 공용SDK725/노드810.
245 parent트랙/stringID/빈root·unique/discrete·UI/Undo·includeHierarchy Take(defaultfalse), 부모전환시 이전 localTRS 키step. 계층전체사전검증·changed그룹 먼저root분리 후연결. Seek/Stop·원래parent동일수명만복원·외부cycle는소유복원변만root분리. 원래parent 교체/삭제 시 playback거부, 복원시root. preview에도scene hook.
246 SequenceSampler 재생준비1번정렬+이진조회/duplicate last/첫구성키전undefined. 바인딩대상만identityMap(전체scene clone없음). 동일IDreplacement에는일반tracks/restore/골격clear/stopanimation 적용금지. 카메라참조도identity검사. 기존1024key/문서예산유지, 대형editor가상화미구현.
247 retargetrig/retarget와audiomixer 공용12 명령, 총124. assetShortcutKinds/categories/contexts kind추가·입력/IME/runtime격리·재지정/fallback/Undo·live tooltip update. retarget 실제kind는retarget(er아님). sourceUI F8/F9/이전키우회/입력중차단통과.
248 새SDK6 arm64NDK/서명APK16KiB/모듈closure 통과. Phone없음/Mac없음: 실기기/iOS실행주장금지. APK는cache마지막내용비교보강직전 생성, SDKABI/핵심모듈동일; 최신cacheCPU/최종설치창검사별도.

## 근거/실패를 반복하지 말것
243 CPU cvqEoC7group/cache0SfpPe5/saveHcr3Lk6. 233 dKPuO8/234XXWiSm/221udMmki(51000→0steady aggregation)/222F5Mg2W/219qm0gnK/233savebkV4XK/232transactionsfcnbrS. effectsourceE4Wgay fullD3D+GL+editor PASS; 최초capture는feature아래라스크롤안보임→test수정해서최종설치capture에서확인.
244 CPUliveXD7ZgV, source22B2rb editor+독립D3DGL/CPP/BP/pass.245finalCPUf3G2dB5/128x1024keys15360samples1.804ms(샘플러만FPS아님), sourcewindow최신njq2ci fullPASS. 첫Wmu0Iuplayer즉시Read2!=4는Seek프레임처리전검사실수→stateparentB barrier 후Read(시간늘림없음). 이후parentrestore/identity세부보강은CPU PASS, 설치window최종검사예정.
247source mjy1Wr editorPASS/captures봐둠.248mobileORNn3v APK7218381 SHAe198965416bc129f3211c92334fafbb043a80b6bb801f5fd4add907219f8a061. mobile-player-of28Dj 공용플랫폼실제C++AOT2module/입력/한글/상태/물리/저장/iOS소스출력 PASS. 실행세션12786/65633/49571/19865/82960/53056/75977/93377/73680모두완료.
check.mjs810·api--check·gameplayworkflow/CPP·runtime/CPP·project·shortcuts124·sequence212/216·spawn211 PASS. check-editor-api.mjs는고정사용자5181서버ECONNREFUSED:창/서버변경금지,격리실제창에서API경로검증으로대체.221oldbaseline정확비교는신규level=1만분리;다른내용정확비교유지.

## 다음
1 docs/STATUS/hand-off 한국어 커밋·push. 배포dist/HBEngine source dirs hash-copy/exact-sync, source생성include/SDK/deps보존, nativehostEXE는240부터변경없으므로불필요재빌드금지.2새install248 helper(markerwx) User읽기전용inventory전후/manifestSHA/Versions1/링크/association검증.3설치실제 effect243 full, deformable244 full, sequence245 full, shortcut247 editor를순차실행·capturefeature스크롤확인.4finish248 새원샷receipt/docs SHA/Versions1/cleanup/commitpush. 필요시가벼운CPU 회귀 한 번.5이어서 남은렌더/엔진 구현 계속; 여섯 기록으로 최종종료하지 말것.
정본ENGINE_STATUS.json latest243–248,78행39verified/35partial/1unimplemented/3unverified. UE/Unity전체분모미확정/분석완료허위주장금지. Docs기존잔여에서levels·일반동적재부모화미구현표현정정; PHYsoftsurface일반query/GAMcaptures/custom/ANMadvancedAttachments대형UI·기존target생성삭제재현/EDTremainingpointer등은여전히구체잔여.
