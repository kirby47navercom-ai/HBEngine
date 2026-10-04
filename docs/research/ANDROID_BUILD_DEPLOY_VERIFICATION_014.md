# Android 게임 빌드·서명·설치·시작 014 독립 대조

주인님, 짚짱의 `/root/finish_009_verification` 담당은 분석 담당 `/root/android_build_deploy_014`와 별도로 2026-10-04에 공식 Android 기술 본문 6개를 끝까지 직접 읽고 [분석 MD](ANDROID_BUILD_DEPLOY_BODY_014.md)와 [분석 JSON](android-build-deploy-body-014.json)의 사실·조건·표·예제·미디어와 대조했어요. 원문 readable 텍스트 전체를 읽었고 원본 HTML에서 모든 pre가 빠짐없이 포함되며 나머지 prose도 공백 정규화 후 같음을 확인했어요. 105개 pre 전체와 pre 밖 inline code 883회를 읽었으며 원본 이미지 14종을 직접 봤어요. 자동 hash·구조 계산이나 담당자 identity만으로 의미 읽기를 대신하지 않았어요.

**한정된 원문 대 분석의 의미 대조 오류는 0이에요.** 원문 내부 링크의 frozen anchor 불일치 1개를 추가 발견해 별도 대기로 남겼어요. 엄격한 원장 verified·promotion은 0이고, 전체 Unity·Unreal/Android corpus·API·SDK 호환판본 gate는 통과하지 않았어요. 016과 연결 reference/release/sample의 본문은 이 검증 범위에 포함하지 않아요.

## 실제 읽은 범위와 고정 pin

| 항목 | 독립 확인 |
| --- | ---: |
| 전체 기술 article | 6 |
| 012 대비 신규 고유 본문 / 같은 hash 재읽기 | 5 / 1 |
| 제목 포함 heading / article body 내부 heading | 126 / 121 |
| 표 / 헤더 포함 행 / 셀 | 7 / 83 / 171 |
| 전체 pre / pre 밖 inline code 출현 | 105 / 883 |
| IMG 출현 / 고유 실제 픽셀 | 16 / 14 |
| 기타 video·iframe·SVG 등 technical media | 0 |
| formal API reference / overload 검증 | 0 / 0 |
| guide entry signature | 1 |
| 한정 의미 대조 오류 / strict verified·원장 승격 | 0 / 0 |

분석 MD SHA-256은 `72a4cf1bd9b809fd5502aae59bc68c9d35f9db3f659be1e0c6d0959f434a84d0`, 분석 JSON은 `fdca71ccd56ee0c02c7cf3536354bdd114924ad921228057a4fac693f84858ea`예요. 두 파일을 수정하지 않고 현재 bytes와 대조했어요. source/body/text와 구역·표·전체 pre·inline inventory·원본 이미지·실제 reader의 범위를 [검증 JSON](android-build-deploy-verification-014.json)에 pin했어요. 원문은 Git ignored `native/build/reference-corpus/android-build-deploy-batch-014`에만 남겨요.

각 source의 `.devsite-article-body`를 원본에서 재추출하니 body bytes와 text가 같고 canonical·영어 요청/final URL·cached HTTP 200·갱신일도 맞아요. 갱신일의 마지막 마침표만 비교 전에 정규화했고 `?hl=en`을 유지한 final URL을 상대 href의 기준으로 사용했어요. source의 collection 도구 글자는 제목에서 제외했고 GameActivity의 body 내부 h1은 중복 계산하지 않았어요. 이들은 SDK 판본 selector 없는 고정 웹 snapshot이며 현재 모든 SDK/NDK/AGP/JDK 판본의 호환성을 확인한 것은 아니에요.

ABI의 현재/012 body는 실제 bytes가 같고 SHA-256은 `7fed84eafbd81e68edd056ba954b494be97f061db751ac92ff9e8ad00848c924`예요. 012의 21은 body h2/h3, 014의 22는 외부 h1 제목까지 포함한 단위예요. 이를 신규 본문 또는 count 오류로 처리하지 않았어요.

## 원문과 의미 대조

**ABD014-01 — [명령줄 빌드](https://developer.android.com/build/building-cmdline).** wrapper의 shell별 구문, assemble와 install의 차이, debug의 서명·정렬, release 서명, emulator/USB 조건과 test APK의 `-t`를 전체 읽었어요. AAB는 직접 기기 설치하지 못하며 bundletool의 APK 생성·배포가 별도예요. module ZIP 표·build-bundle 옵션 표, protobuf/AAPT2 compile/link, 언어 split·압축 구성과 Kotlin/Groovy signing 예제를 대조했어요. APK의 정렬→서명→검사와 AAB의 jarsigner 역할을 구분하고 105개 pre를 API 선언·실행 횟수로 세지 않은 분석이 맞아요. 본문에 있는 오래된 예시 판본·도구 경로를 현 SDK 권장값으로 승격하지 않아요.

**ABD014-02 — [앱 서명](https://developer.android.com/studio/publish/app-signing).** 설치 APK의 인증서, upload/app signing 키, 공개 인증서·fingerprint와 사설값, debug expiry와 재생성, 신규·기존앱의 Play App Signing 등록, PEPK·upload 인증서 등록, release/flavor signingReport와 외부 properties 예제를 모두 읽었어요. upload reset은 배포 APK signing 키를 바꾸지 않아요. ‘키 불변’ 문장을 절대규칙으로 확대하지 않고 Android 13 이상 새 키·그 이전 업데이트 구 키의 upgrade 분기를 보존했어요. 다른 인증서/package 이름이면 별도 앱인 설명과 기존 데이터 유지/업데이트 성공을 분리한 판단이 맞아요. 전체 scheme·lineage·version/applicationId·namespace는 미확정이에요.

**ABD014-03 — [adb](https://developer.android.com/tools/adb).** client/server/adbd, USB RSA 승인, Android11+ 무선 pairing과 Android17/adb37 Wi-Fi2.0 조건·mDNS, USB→TCP 경로, emulator port/server 순서 예외와 serial 선택을 끝까지 읽었어요. 연결 `device`는 완전 부팅을 보장하지 않아요. APK/test-only/split install, push/pull과 install의 차이, local/remote shell 인용, am/intent/pm/dpm 표 전체를 대조했어요. `am start -W`는 launch 대기이며 native runtime/game ready 보장이 아니고 `pm -r` 데이터 보존·`-d` downgrade·incremental/v4/지원기기 조건이 서로 달라요. clear/testharness·policy owner·profiling/root·screen capture/recording·USB/mDNS/burst 설정을 일반 설치 복구로 실행하지 않은 분석이 맞아요. screenrecord의 오디오 미포함과 rotation 제한을 실제 플레이 증거로 혼동하지 않았어요. 전체 설치 error registry·숫자·기기 재현은 미확정이에요.

**ABD014-04 — [logcat](https://developer.android.com/tools/logcat).** liblog/logd, compile/property/application/display 네 필터층, OS/root 조건, tag priority·shell 인용·host 환경변수의 경계, 출력 format/modifier와 main/system/crash·radio/events buffers를 읽었어요. Kotlin/Java와 실제 예시 출력까지 16개 pre 전체가 분석 목적과 맞아요. 로그가 없으면 build-time 제거·필터 영향일 수 있으므로 설치·시작·게임 성공을 추론하지 않은 판단이 맞아요. 가이드의 호출명을 formal liblog API 계약으로 세지 않았어요.

**ABD014-05 — [Android ABI](https://developer.android.com/ndk/guides/abis).** 4ABI의 표 전체, calling convention·little-endian/ELF·C++ mangling, v7a softfp·arm64 x18·x86 stack/명령 확장·long double, Gradle/ndk-build/CMake의 타깃 차이를 다시 읽었어요. fat APK/split, native lib 경로·primary/secondary 선택·libraryDir Kotlin/Java 예제와 native `.so` 누락 시 설치 후 runtime crash를 구분했어요. ARMv9/64bit PAC/BTI, arm64 compile flag·혼합 BTI·구 OpenSSL/DRM 예외도 읽었어요. Windows worker를 Android ABI/runtime 성공으로 세지 않았어요. 16KB/STL/JNI/GPU/lifecycle는 후속 원문 대기예요.

**ABD014-06 — [GameActivity 시작](https://developer.android.com/games/agdk/game-activity/get-started).** API19, AAR·Prefab·AGP4.1+와 1.2.2+ static library 조건, source 3개·libandroid 연결, Activity/manifest/native load 이름, guide의 C linkage android_main entry, new→GameLoop→delete 예제를 직접 읽었어요. GameActivity glue는 NDK glue와 별도이며 event thread·ALooper polling·destroyRequested·DoFrame과 motion filter/swap/pointer 처리/clear 흐름을 대조했어요. guide entry signature 1개는 full formal API·overload·pointer ownership/lifetime·error 보장이 아니에요.

이 원문 code10은 motion clear에 `inputBuffer`, code11은 `mApp`을 전달하며 handler prose의 `_hand_cmd_proxy`와 code9의 `_handle_cmd_proxy`도 달라요. 분석이 두 차이를 source inconsistency로 남긴 점이 맞아요. 정상 overload 둘이나 확정된 callback 규칙으로 만들지 않았고 공식 header/판본 source 대조는 미독 대기예요.

## 그림·HB·링크의 범위

서명 12회·wireless 4회의 media inventory를 원본 tag/src와 재대조했고, 중복 이미지 2회를 별도로 보존하면서 원본 PNG 14종을 직접 봤어요. 개발 upload 키→Google signing 키→사용자 도해와 자체 서명 도해, Gradle signingReport, JKS/alias/password/25년/인증서 입력, release/flavor config·locate/analyze 알림을 확인했어요. export encrypted key 옵션은 그림에 있지만 본문 deprecated 문장을 함께 적용했어요. 그림의 예시 필드·UI를 현재 SDK 기본값이나 실제 GUI 조작으로 승격하지 않아요. wireless network trust·QR/code/endpoint·pairing 성공 출력·quick tile의 설명도 맞아요.

현재 `prototype/build-profile.js`와 `tools/build-game.mjs`는 전체를 읽기 전용으로 읽고, `docs/AI_ENGINE_API.md` 181–228행의 build 계약과 관련 revision 문맥을 대조했어요. Windows x64/WebView2-WebGL2, 디스크 에셋·profile revision·dry-run·worker/package manifest·report/failure는 현재 코드 근거이고 Android `.so`/기기 install/launch/play의 증거가 아니에요. artifact 형식/ABI/application identity/signing reference, host/device capability, 단계별 job/retry/cancel과 editor/game app 구분은 HB 미구현 설계 후보로 명확히 남았어요. 요구/011 기록은 문맥으로 읽었지만 그 원문을 이번에 다시 검증한 본문 수에 더하지 않아요.

모든 href 300회를 source와 다시 맞췄으며 연결 본문 읽기를 상속하지 않았어요. frozen 6개 대상의 fragment 61회도 별도로 확인했어요. **ABD014-02의 `https://developer.android.com/studio/publish/app-signing#google-play-app-signing` 1회는 해당 frozen source에 anchor가 없어요.** 해당 문서의 실제 section은 `app-signing-google-play`지만 공식 redirect/대체 확인으로 해결했다고 표시하지 않아요. 이는 local snapshot anchor 불일치이며 fresh HTTP404나 분석 사실 오류와 달라요. root에 통지하고 supplementary unresolved로 기록했어요.

author의 9문제군은 계속 남겨요. 독립 대조 대기의 한정된 의미 비교는 이번 기록으로 보완했지만 strict verification·reference/SDK 호환·분모·scheme/lineage·identity/version/storage·native lifetime/thread/ABI·error/device·mobile editor 계약은 닫지 않았어요. source 링크 대기 1개도 추가됐어요.

이번 담당은 검증 MD/JSON 두 개만 작성했어요. author 파일·private 원문·공유 status/manifest/ledger·엔진은 수정하지 않았고 네트워크·SDK 설치·build/adb/logcat/emulator·GUI·engine tests·기기 설치/시작·커밋도 실행하지 않았어요. pin이 바뀌면 이 검증은 stale이며 전체 corpus/API gate는 계속 미통과예요.
