# HBEngine 계속 작업

- 주인님은 누적 엔진 목표 전체를 계속 구현하길 원해요. 설치/소규모 묶음 완료를 최종 응답으로 삼지 말고 계속 진행해요. 전체 분석/상용엔진 완료를 허위 주장하지 않아요. 한국어·주인님·짚짱·~해요.
- 저장소 main, kirby47navercom-ai 한글 commit/push. source1b64a228+docsdce2f0f1. 현재574 설치검증 완료, 이 기록을 커밋/푸시한 뒤 다음 작업으로 이어가요.
- 정본: docs/research/ENGINE_STATUS.json, docs/WORK_ORDER_051.md. 전체UE/Unity 분모/완료율 미확정; 다른 누적 분야 삭제 금지. docs/research/ENGINE_WORK_572.json에 현재 근거가 있어요.
- 현재 설치 C:\Users\kirby\HBEngine\Versions\dfc9728395d44a2e\HBEngine.exe, manifest3418/owner83/User10385전후읽기SHA/links2/.hbproject/Versions1. Player7aaa40da62c6ee770b8f26ff5e268ea5f412185e0364f4e6a4c00f4305c240a0, Hostcf85eff27b9f00f600a64a7b4769043489adc42255c7433304018742f5aedc76. USER_INSTALL_574.json. 이전설치179925470B 정리, 공용nativecache15315803B/lease0, 의존계획1096B.
- 사용자창/탭/서버/프로필/게임 사용금지, 백그라운드 전용 고유 editorWindowProbe/PID만 종료. heavy/install 앞 activeInstalledVersions 확인. User는 읽기SHA만. Versions1, 전체백업 금지, 원본/증거는보존하고 소유재생성artifact만 정리해요.
- 543–549: normal variance→roughness cooked composite, worker/self-source, CPU/GL/TSL/D3D/previous history/CPP SetTexture. 553–562: ordinarymaterial PS/ShadowPS shared single async compiler worker, owneradoption, dependentprobe/shadow/history/capture보호. 이전 WORK549/560 및 설치564 근거보존.
- 567–572: nativeSDKFingerprint기본API보존, v4 C++cache. 실제 최적화별-E -P -MD include+전처리결정지문, unusedSDK재사용/동일mtime+__has_include존재전용분기감지. bounded32/2MiB plan, custom/failure fullSDKfallback, debugflags/source보존. literalMakeparser. supported compiler executable hash 포함이나 전체툴체인 감시를 주장하지 않아요.
- 최종567zl8noG(정확 경로 ENGINE_WORK572), 293zxBNCv 실제17→31/unusedSDK reuse 변경10499ms→604.9ms·warm43.8ms 단일관찰. 569PjUFsG actualD3D513lights heldqueue camera/light changes exactfull-lightpixels; sameworker idle0. 설치5719QWvRJ actualCPP/planhit,573CrBojY HDRI/96lights/CPPprops/material/shadow runtime.
- sourcebuild570/sync574/install574/finish574 완료 one-shot 재실행금지. 정상 종료된session10737 재사용금지. 소유569exe는삭제하고 JSON/source보존. symbol566 최초Unicode경로실패;566b PEdebug압축미지원. 원본불변/임시EXE제거.
- 다음: native/include/HBEngine/Compute.hpp Device::compile은 여전히 직접D3DCompile+gpu.mutex로 기존 공유8MiB bytecode캐시를 우회해요. Particles/사용자Compute에도 연결할 계획. 아직 이다음코드수정은 없어요.
- ShaderBytecodeCompiler.hpp가 Compute.hpp를 포함하므로 그대로 역include하면 순환해요. Compute.hpp의 공통플랫폼/include/detail(libraries,Com,check)을 별도헤더로 추출하면 Compute.hpp가 compiler를 사용할 수 있어요. 기존 public SDK/default noimplicitdisk/HB_COMPUTE_UNAVAILABLE/flags/source name HBCompute/entry/target cs_5_0/owner 검증 보존. 실제 FXC/cache작업은gpu.mutex밖, CreateComputeShader만소유잠금. 전체툴체인·초기기본래스터·GL9sec·혼합노멀 등 다른RND잔여도 계속.
- No goals/subagents/automations. Skills 이미 적용: gamestudio/game-dev-studio/ponytail/lean-build/investigate-first/safe-refactor/migration/caveman-commit. 새 승인 필요없어요. 커밋author=committer kirby47navercom-ai <228715038+kirby47navercom-ai@users.noreply.github.com>. NoAItrailer.
- Native compile -o는 상대경로(Unicode absolute fails), shell변수HOME재사용금지. rg는 directory+-g, 거대 한줄은 -o짧은패턴. 새코드 수정/검사/원장/검증후설치 반복을 묶고 불필요재검사하지 않아요.

## 579 구현 완료·582 설치 준비
- 새source refactor7c0126, compute e76c103c, testsf35b5529/3255ddf6 push완료. ENGINE_WORK_579.json/COMPUTE_KERNEL_CACHE_579.md. 현재설치는574(dfc9728395d44a2e)로검증완료상태.
- ComputePlatform.hpp추출: Device/Particles구현보존지문, baseline576nRf10t→refactor576WR4q9r 동일65,537/2.98e-8. compilerhelper끝에서Computeinclude해기존단독include고객도보존, syntax576 Windows/Unavailable 통과.
- Device.compile은공용ShaderBytecodeCompiler를사용, FXC/디스크작업장치mutex밖, CreateComputeShader만lock. 신규공유서비스0, 캐시8MiB기존것; Device.configureShaderCache/staticshaderDiskCacheInfo, 비지원설정throw/stats0, 미설정SDK noI/O.
- 577USrhyl independent unconfigured/cold/warm/poison/unavailable: cold7write8hit→warm15hit0write, 값동일·파티클3pool65birth/257slot/Clear·GPUstage오염복구·dispatch8회cache변화0. 578UJQRO9 기존65537/프레임회귀, gpu-compute-qbUrQ7 actualBP→CPP→GPU/placedTRS/Android2target헤더.
- build578, 최종player579 완료. playerSHA는WORK579. 현재서버/ownedGUI/session없음. 91968/9059/95309/76810/6200 모두끝남.
- 최소2D게임tool580(source유일15파일closure) 첫 zBuy61은빌드후Node1/무기록 원인미확정, pass아님. 동일소유빌드재사용ignoredrecover580.mjs로 bwmdxx 전체2D/CPP/BP/resize/release + pool재생성3hit/0write통과. 새tool580에phase/exit/first-error기록추가. 설치에서원본tool실행해관찰. 단순캐시/헤더변경을engine회귀라고단정하지말아요.
- 다음: docs579 커밋/push, sync582(dist현player579도포함), install582는574template에서WORK579/installed577 --sdk-root와580 --fixture neQy1U/--executable로교체. User읽기SHA/전체manifest/소유지문/Versions1/audit/기존설치정리. pending면queue기존권한. do not rerun one-shots.
- 이후 RND-06의 최초기본래스터/다른셰이더·장치 준비, 전체GL/FXC, 설치간 C++모듈재사용/디버그소스경로와누적엔진원장 계속. NativeModuleCache owner=digest(versionRoot)라서 SDK가안변해도설치버전마다C++모듈다시컴파일; 선택v4최종key는같을수있어도owner가다르고현재oldowner정리하므로crossversionreuse를구현완료로말하면안돼요. 중립owner/디버깅경로/oldv1lease/prune호환을설계해검증할과제. 아직추가코드없어요.
