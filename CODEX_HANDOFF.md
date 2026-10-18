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
