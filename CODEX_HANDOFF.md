# HBEngine 현재 인계 — 551 설치 검증, 초기 준비·누적 목표 계속

## 보호와 작업
- 주인님/짚짱/해요체. 누적 전체 엔진 목표를 계속 구현해요. 작은 checkpoint로 최종 답변을 보내지 않아요. ENGINE_STATUS78은 전체 UE/Unity 분모가 아니고 전체 본문/API gate 미승격이에요.
- background only. 사용자 창/탭/서버/원본/프로필로 검사하지 않아요. 고유 hidden editorWindowProbe/프로젝트/포트/PID만. heavy/install 전 activeInstalledVersions, 사용자 프로세스 종료 금지.
- Versions1, 실행 중 버전 보호, 수정 파일만 PreservedChanges. User는 읽기 SHA만. 소유 재생성 자료만 경로/링크 검사 뒤 정리. 한글 commit/push, author=committer kirby47navercom-ai, AI trailer 없음. agents 추가 없음.

## 설치와 소스
- 설치551: C:\Users\kirby\HBEngine\Versions\68473fd495b977a3\HBEngine.exe. USER_INSTALL551 정본:3401전체SHA/64owner/User10385/Versions1. 공용cache8995953B/lease0. 이전541 179771490B 정리. 설치캐시는 Versions 밖.
- 549 source d6c7d8ba397da9c620ad337d4dd532ec1d893fb2 및 docs92742ff8까지 push. 551 receipt 커밋/push 남아요.
- PlayerSHA052f8aa28b6057066ee7cdf3a3c044f05ff83c55b0ff24f79a728f42d74d5b09 /3049472B, Host4313f834b9b14718b42e7cf89f0ec38d24c4e6b00bfb08ed92081450c4e47a39. RayPrograms b76fbc50dba8e35c808b6e72635fefdeb933494dcf629f467f3d59f65a799ad7. 새변경은JS/데이터라 native재빌드 불필요.

## 543–549 구현과 증거
- texture-composite.js: 가져오기 노멀 moment→roughness 등방 근사. composite.normalTexture/channel/power, 엄격 경로/충돌/AI 계약. unit 원본 평균, 축소 후 재정규화 안 함, NPOT/고해상도/topMip, 다른 채널/원본 보존, flat/0power 동일. HB식은 문서화, UE 수식 복제 주장 없음.
- 기존 단일 worker에 보조픽셀/transfer중복제거/보조detach 재디코드, self-source 이미지/픽셀 재사용. GPU 기존밉 재사용으로 새 프레임 uniform/샘플러/텍스처/합성0. peakMomentLevelBytes는 가장 큰 단일moment레벨, 실측 총메모리 정점 아님.
- texture2d 상세/밉/채널/UndoRedo/저장/AI dryRun, raw 또는2Ddescriptor 참조, material 해석/의존/rename/build, normal descriptor 변경 identity와 원자 runtime교체 연결. GL/TSL/native의 materialSource 리소스 누락도 공통 binding owner로 복원.
- 543 CPU독립정답181·4채널×2색공간/flat/0/NPOT/고해상도/소스/참조/rename/AI; regression549 8gate PASS.
- 544O7sQe3 실제 editor/GL·TSL6LOD/worker4jobs/기본·보조 transfer/alias/큰normal작은base/보조detach재시도/유휴0. 캡처 view_image 확인. 최종보고필드와 self-source loader는 설치5449BcjpA에서 확인했어요.
- 545gz05oh 실제 D3D3LOD137/219/219/340B; 467znGqs6 GL·TSL와468JUSclO D3D6contexts는 roughness/color/normal의 이전 moved/mirrored 기하/time/mipwidth를 기존4e-5로 통과.
- 548i2AR00 새 C++ SDK/packager/D3D 게임 Materials::SetTexture: 합성221→일반165→합성221. source/dependency/worker포함, 유휴upload안정/자동readback0. 재생성빌드·프로필은pruner정리.
- ENGINE_WORK549/사용자·연구문서/상태원장 갱신. supplemental549 UE짧은텍스트45행/Unity기하AA본문114–135 선택읽기·SHA. 도해/연결API/전체gate 미승격. MAT03에서 구현된 normal분산만 제거, 별도 기하AA/나머지포맷 유지. latestBatch549로 최신화.

## 바로 다음
1. finish551 완료. USER_INSTALL551/원장/소유정리 검증 후 receipt 커밋/push. sync/install/finish551 one-shot 재실행 금지.
2. 설치5449BcjpA 최종self-source/worker/GL/TSL/UI와548clLP7D 설치SDK/packager/player의 C++왕복, User전후읽기SHA/links2/.hbproject/Versions1/공용cachelease0/Versions-native-build없음 모두 통과.
3. 최종 checkpoint로 끝내지 말고 RND06 초기 GL/FXC 자원준비, MAT03 HDR·압축·custom array/volume mips·raw자동정책, RND05 곡면역해/거친로브/참여매질과 누적2D/애니/월드/game/editor/deploy 계속. 초기전체지연은 여전히 초단위, FPS/상용전체완료 주장 금지.

## 도구와 실패 구분
- exec session만 write_stdin, yieldedcell만wait. rg는 directory + -g, wildcard 경로 금지. JS replace callback, 복잡한 코드는 ignored mjs. g++ output repo상대, diff--check.
- 544 첫 selector 문자열/원본 pick R을 A로 착각/sRGB 인자 잘못 넘긴 것은 검사 오류. 엔진 출력에 맞춰 기준을 완화하지 않았어요. 없는 typed파일명은 기존check-material-typed로 수정.
- Mac/Xcode/Android폰 없음. 실기기 열/FPS/전체분석 완료 주장 없음. 541, record549, refs549, setup551, commit549-source는 완료one-shot 재실행 금지.

## 553–558 현재 진행 — 여기서 계속
- 551 설치 receipt까지 460fca67a5c7386e7c24991b4dfa9b5ee2661231로 push 완료. 설치 Versions/68473fd495b977a3/HBEngine.exe,3401전체/64owner/User10385/Versions1. 공용cache8995953B/lease0. 이전541179771490B·probe2663984B 정리. sync/install/finish551와commit552 모두완료, 재실행금지.
- 새553–554 ordinary raster async 작업은 uncommitted. SceneProgramPreparation.hpp:기존ScreenEffects공용큐 한개 재사용, worker는bytecode만/장치채택은main, PS+ShadowPS함께ready, 소스/작업완료뒤해제/파기취소/한번freshretry. SceneRender sourcehelper추출·synccompile gpumutex밖·새asyncSDK/poll/ready·pendingdrawskip. SDK동기기본유지.
- SceneRenderBridge:asyncShaderPreparation 기존opt-in으로 programasync, pendingID만poll/집계, 초기frame준비판단고정, pending화면효과/그림자/probe/sky캡처보류. JSnative-scene 마지막rasterpending후 shadow/probecache갱신강제. NativePathPreparation합계/labels/AI, capturePreparedFrame시작pending보존해microtask완료경합복구.
- 실제5531CL2Re PASS:큐대기중빨강255유지/pendingdraw0/ready녹색243/sync완전동일/parameter-before-ready/move/취소2/오류/강제retry/idlebytes0. 옛보고singleWorker:2는동시수가아니라workerStarts이름오류라소스에서정정(재실행불필요한메타변경);최종기록에서구분.
- 555/기존490 PASS. 556MuRvpX 실제productionbridge hidden소유Win32창 upload0tick·presents1→2·status폴링은Present안함·reset해제PASS. 첫5561Se0Zo auto혼합선언,2jJOjK HWND없는headlessPresent는검사오류로고침. nativeSDK syntax-Werror 통과. bridge기존warnings만test에서suppress.
- build557 native Player/host 재빌드완료 native/build/build557-result.json. source/dist 갱신, 설치551는아직미수정. 자료sync는최종커밋후새one-shot으로해야함.
- ACTIVE exec session67673: native/build/run558-games.mjs. 순차로 full check-native-scene-window(현재work native-scene-window-neQy1U),496 --mip-controls 원본VsRtt0복사,548compositeCPP를진행. 결과 game-regression558.json. 현재추가GPU/컴파일검사병행금지. write_stdin으로결과받고실패시재현/수정,이유없이전부반복금지.
- 557빌드중네이티브파일후속수정없음. docs/NATIVE_MATERIAL_PREPARATION_560.md와research초안작성. MS496동일2페이지31–50/32–131 재독, 기존snapshot재사용해supplemental560로등록예정. 전체gate미승격.
- 다음558통합결과/캐시347(실제파일명rg로확인)/일반준비관측을완성하고 sourcecommit→ENGINE_WORK560/원장/설치→receipt/push. 이후또작업계속. 초기9초전체해결주장금지. 전체엔진목표미완료를checkpoint최종답변으로내세우며멈추지않음.

## 559–562 후속 상태
- run558 full native는 neQy1U에서 Probes 진입까지 앞선2D/3D/그림자/물성/텍스처 assert를통과한후 Probe draw binding invalid로실패했어요. full pass로세지않아요. 원인은 materialpending중새probe미필터상태를nonprogram객체가참조한것. Bridge drawOne에서Probe.available일때만pb를제공하도록고쳤어요.
- player559 전용재빌드완료(Host는HB_GAME_PLAYER조건밖이라변경없음). 559v2klCs는probe및2D전체를진행한후테스트profile에Three리소스해제scene누락으로실패. Three추가후559pifU9U PASS: 실제staticprobe재사용/CPP-BP intensity/refresh,2D마스크/조명/쿠키/볼륨/파티클/resize/해제,source원본neQy1U재사용·C++cache재사용. 원본사용자프로젝트아님. Build/프로필은종료뒤prune.
- frame초기pending판단후마지막program이같은frame release되면 enabled=false로이력승인될수있어서shaderPreparation.enabled에framePending포함. 556Cpp에deterministic last-pending-program-release회귀추가.
- regression561 PASS5: 새5568sSaqI(위이력조건포함),3474cqN70 cold21save→warm21hit/0compile·byte오차0·device거부fallback/nextHit,555/490/348. nativePixel색/Shader기본문자열준비보존. workerStarts메타이름외553코드동일이라553을반복하지않았어요.
- profiler각material단계에완료수/전체수표시. capturePreparedFrame은capture시작pending이면완료후재draw; microtask경합555및기존490 PASS.
- 완료 exec session97998: player562(위마지막pending조건포함)전용재빌드완료, run562-games가496 --fixture VsRtt0 --mip-controls와548compositeCPP를순차실행중. game-regression-562.json으로결과기록, write_stdin으로받아요. heavy동시실행금지.
- 551사용자설치는그대로. 553+헤더/JS/도구/문서는미커밋. 최종562성공후sourcecommit→Work560/원장·refs(496재독재사용)→datasync/새설치/2설치gate→최종receipt/push,그뒤또누적작업계속. Versions1/프로필보존/소유probeexe정리필수.
- 후속조사후보: native-sdk-fingerprint.mjs는SDK전체 헤더를해싱하여관련없는렌더헤더수정도모든사용자C++모듈key를바꿔재컴파일해요. 이번fullfixture의6GCC모듈에약3분이들었고같은ownedproject재사용은즉시cachehit했어요. 이후빌드비용을줄이려면실제compiler include-deps와보수적fallback/캐시이행/293호환을설계해야해요. 아직구현·검증없고현재작업의완료로세지않아요.


## 560 원장과 설치 준비
- 최종 source e6125aa3bf6471ce215be5c15c1a817544342460 커밋. Work56075owners/10검사 등록; 최신Player abed101f7c65a81448e49ab3ad6e18f47479597f9a5990fec499bda488b7256e. 5624967Qin7n 23pendingframe/CPP4.11ms/중지93.79ms/idle0,548M3Uli5 합성221→165→221 PASS. refs560는496선택구역재독/snapshot재사용,fullgate미승격.
- setup564 완료, sync564/install564 미실행. 설치gate는source-owned dynamic import로559(fixture neQy1U/private project)와496(VsRtt0,--mip-controls).559는--executable로설치packager/SDK사용;installedDirectory를반환.75owners/전체manifest/User읽기SHA/links/Versions1 확인.
- 현재active tool/session없음. docscommit563→datasync564→install564→새finish564/receipt/push. 그뒤SDK불필요build비용과누적목표계속. 기존run558실패·559v2klCs테스트실패는보존;전체558pass로승격하지않음.


## 최신564 설치 완료 — 이 구역이 정본
- 현재 C:\Users\kirby\HBEngine\Versions\20b2e3b17134968f\HBEngine.exe /3410전체SHA/75owner/User10385/links2/.hbproject/Versions1. Player abed101f7c65a81448e49ab3ad6e18f47479597f9a5990fec499bda488b7256e. Host494a71dbbf315998f4bb247fcc027fd1f8013d1192123e35c869e1ea04564ae2. 설치559ilsjsc probe/2D/CPP/BP/해제와496ruSdLX 22frame/CPP3.66ms/중지93.23ms/캡처/idle0.
- commonCache196654644B/lease0, 이전551 179843197B와소유probe8835848B정리. finish564/sync564/install564 모두완료one-shot 재실행금지.
- sourcee6125와docs223bdaa1 push완료; 지금564receipt커밋/push후최종checkpoint로멈추지말고누적목표 계속. 현재active session 없음(19948는완료).
- 다음SDK캐시: NativeHost.build는nativeSDKFingerprint 전체SDK26파일+json으로v3key를만들어render헤더변경도Game/Bridge/Session만쓰는게임C++를무효화해요. 전체fingerprint API/293기본계약은보존하고실제GCC include 의존성·보수적fallback·버전키이행·이전캐시/참조보호를검토해요. 아직새SDK캐시코드수정없음.
