# 게임 빌드·배포와 에디터 호스트 연구 011

기준일은 2026-10-04이고 단계는 `research_only`예요. Unity 6000.0 영어 원문과 Unreal 5.8 영어 원문의 **제한된 12개 본문**을 직접 읽었어요. 기술 텍스트·모든 표/예제/OS 분기는 12개 모두 확인했고, 11개는 제공된 미디어까지 읽었어요. Unreal Packaging의 31개 이미지(애니메이션 GIF 2개 포함)·영상 1개는 미독이어서 그 페이지는 전체 본문 완료가 아닌 **텍스트 분석만** 남겼어요. 검색·landing 목차 2개는 별도 발견 자료이며 분석 본문 수에 넣지 않아요. 독립 verified와 원장 승격은 0개이고 전체 코퍼스/API/플랫폼 분모는 미확정이에요.

## 에디터·게임·모바일 보조 앱의 경계

| 축 | 직접 확인한 사실 | HBEngine에 남기는 요구 |
| --- | --- | --- |
| 에디터 실행·제작 호스트 | Unity 시스템 표는 Windows/macOS/Linux native 데스크톱·노트북을 제시해요. Unreal 최소 Editor/Engine 표도 이 3 OS 분기를 제시해요. 두 문서가 Android/iOS 독립 에디터 앱 지원을 입증하지 않아요. | 데스크톱 에디터와 모바일 에디터 앱을 각각 제품·runtime·OS·입력·저장·toolchain·배포 대상으로 유지해요. 모바일 에디터 요구를 모바일 게임 출력으로 대체하지 않아요. |
| 게임 빌드 타깃 | Unity Android는 기본 APK/선택 AAB, iOS는 Xcode project→앱이에요. Unreal은 code build→cook→stage→package에 선택 deploy/run을 연결해요. | 출력 형식/SDK/host/서명/설치/실행을 같은 성공 flag로 표현하지 않아요. PC exe와 모바일 앱은 실제 install·launch·play 증거가 각각 필요해요. |
| 모바일 보조 경로 | Unity Remote의 실제 처리는 desktop Editor이고 기기는 화면·입력 전달을 해요. Unreal VCam은 Modifiers/OutputProviders로 카메라 데이터를 조작·출력하고 Editor/PIE/Standalone과 외부 앱을 연결해요. | 원격 보기/제어와 기기에서 독립 프로젝트·자산·노드·C++을 작성하는 에디터 앱의 능력을 별도 표시해요. VCam 개요가 전체 remote editor 계약을 입증하지 않아요. |
| 호스트 toolchain | Unity iOS 로컬 최종 빌드는 macOS/Xcode이고 비Mac cloud 빌드는 연결 서비스예요. Android SDK/NDK/JDK, Unreal C++ VS/Xcode/clang 표는 별도 버전 계약이에요. | 모바일 에디터에서 작성한 프로젝트도 local/remote/cloud 빌드 위치를 명시해요. C++ 작성·저장과 기기 내 native compiler 실행 가능성을 분리해 조사해요. |

모바일 에디터의 실제 선례·Android 저장/NDK·iOS 기기 내 코드 제약은 상위 담당자의 보조 연구 범위예요. 이 011은 그 자료를 읽었다고 계산하지 않아요.

## 고정 출처와 실제 읽기

Unity의 6개 페이지는 모두 selector가 `Unity 6.0 (6000.0)`이고 publisher footer가 job `76758565`, build date `2026-10-03`인 웹 snapshot이에요. 기존 offline job76410965 판본과 같은 snapshot이라고 주장하지 않아요. Unreal은 URL의 application_version=5.8만 믿지 않고 SSR `applications`의 실제5.8와 revision/id/updated_at을 기록했어요. canonical URL은 버전 query를 제거하므로 요청 URL·SSR metadata·hash를 함께 사용해요. 상태는 이번 제한본의 분석이며 최신 전판본 확인을 뜻하지 않아요.

| ID | 공식 원문 | 실제 범위·조건 |
| --- | --- | --- |
| BP011-01 | [Introduction to build profiles](https://docs.unity3d.com/6000.0/Documentation/Manual/build-profiles.html) | 전체5heading·에셋 그림1: 플랫폼 공유 설정/장면과 독립 프로필 에셋을 구분해요. |
| BP011-02 | [BuildPipeline .BuildPlayer](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/BuildPipeline.BuildPlayer.html) | 전체14기술heading·3표·4표시overload·2전체예제: BuildReport 반환, GameObject 참조 무효화, domain reload/symbol 주의, 구overload의 빈 장면 fallback·대체 권고예요. feedback heading2개는 제품 본문에서 제외해요. |
| BP011-03 | [System requirements for Unity 6.0](https://docs.unity3d.com/6000.0/Documentation/Manual/system-requirements.html) | 전체23heading·12표: Editor native 호스트/8GB권장, Arm64·Linux·lightmap 제한, Player/console/server/web/XR/embedded 모든 행을 읽었어요. Android API23와 개발SDK35, iOS13/A8와 스토어 기준을 구분해요. |
| BP011-04 | [Build your application for Android](https://docs.unity3d.com/6000.0/Documentation/Manual/android-BuildProcess.html) | 전체6heading: APK기본/AAB선택·Gradle export, Run Device 설치·실행, OBB/Profiler/CheckJNI 조건, Ctrl+B/Cmd+B, debug/custom서명과 재시작 후 비밀번호 누락 실패를 읽었어요. |
| BP011-05 | [Build an iOS application](https://docs.unity3d.com/6000.0/Documentation/Manual/iphone-BuildProcess.html) | 전체6heading·5행10셀·CLI예제1: BundleID/device-simulator, Xcode project→macOS최종앱·설치, Replace/Append 삭제범위·동일판본·classes보존, APP/FRAMEWORK설정suffix를 읽었어요. 인증서/서명 전체는 미독이에요. |
| BP011-06 | [Unity Remote](https://docs.unity3d.com/6000.0/Documentation/Manual/UnityRemote5.html) | 전체10heading: desktop처리·USB입력스트림·다중Android미지원·JPEG기본/PNG·축소해상도/Normal·실기기성능검사 필요를 읽었어요. |
| BP011-07 | [Packaging Unreal Engine Projects](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project?application_version=5.8) | 26heading·4표의 텍스트 전체. Build/Cook/Stage/Package/Deploy/Run, by-the-book기본·on-the-fly, Development기본·DebugGame제외·Shipping종료UI, default-map검은화면, package취소/로그, UAT/Launcher/스토어 차이를 읽었어요. 이미지31·영상1 미독으로 전체완료 상태는 보류해요. |
| BP011-08 | [Automation Tool Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-automation-tool-overview-for-unreal-engine?application_version=5.8) | 전체7heading·2표·CLI구문예제1·그림1: C# Automation.csproj/BuildCommand reflection, OS별RunUAT, 순차command/global옵션·Perforce환경변수. 그림의UE4표시는5.8현행UI증거가 아니에요. |
| BP011-09 | [Hardware and Software Specifications](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.8) | 실제7sourceheading·13표·5switch의14OS분기 전체: 권장과최소·VS2026/Xcode26.0+/clang20.1.8·Redist·32bit제거·feature별SM6/GPU차이를 읽었어요. synthetic tab heading14개는sourceheading분모에 넣지 않아요. |
| BP011-10 | [Android Development Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/android-development-requirements-for-unreal-engine?application_version=5.8) | 전체3heading·8행40셀: UE5.8 SDK35권장/compile34최소/install26최소, Koala/NDKr27c/JDK21/build-tools/AGDE와64bitArm/그래픽API·판본이력을 읽었어요. Google정책은해당원문대기예요. |
| BP011-11 | [iOS, iPadOS, and tvOS Development Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/ios-ipados-and-tvos-development-requirements-for-unreal-engine?application_version=5.8) | 전체3heading·9행27셀: target17+·권장Sequoia15.x/Xcode26.1.1/base26·A8제외·SDK15/16shader-stripping예외·판본이력을 읽었어요. OS명/번호·5.5호환문단충돌은미해결이에요. |
| BP011-12 | [Virtual Cameras](https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-cameras-in-unreal-engine?application_version=5.8) | heading없는 기술 도입 전체와 뒤7개문서링크목록. VCam카메라·UMG·LiveLink·외부기기출력 범위를 읽었고 링크본문/독립모바일에디터 상태는올리지 않아요. |

구역별 조건·판단은 [기계 기록](build-editor-platform-research-011.json)의 `sections.finding`에 개별로 남겼어요. 원문 표/예제 전체는 공개하지 않고 각 표의 행/셀 수·hash와 예제 hash, source/body/text/SSR 경로·hash를 남겼어요. 원문 cache는 Git ignored `native/build/reference-corpus/build-editor-platform-batch-011`에 있어요. 자동 추출은 읽기의 증거로 사용하지 않았고 실제 확보된 각 본문과 표/예제를 직접 읽은 후 상태를 기록했어요.

## API·흐름과 남은 계약

BuildPlayer는 C# `UnityEditor.BuildPipeline`의 static 호출이며 옵션형2개와 scene-array형2개, 총4표시overload예요. API type/field/member의 전체분모는아니에요. BuildReport의 summary 결과 예제를 실행하지 않았고 thread·예외·cancel·ownership·타깃path·callback전체계약은연결본문대기예요. 구overload 빈levels의 열린장면fallback을 새옵션형기본값으로 확장하지 않아요.

Unreal Packaging의 Blueprint native-code 문장은 현재 C++ nativization/노드→C++ 변환 계약을 증명하지 않아요. 후속판본고정API/공식소스 대조까지 미해결이에요. 같은본문의 Windows/macOS 추가software없음도 Programmer VS/Xcode 요구를 삭제하는 뜻으로 사용하지 않아요. Pak기본 문구와 UTOC/UCAS/Zen/chunk 전체현재설정은별도본문을 읽어야 해요.

Unreal iOS본문은 권장Sequoia15.x와 history의Sonoma15, Xcode26.1.1과26을 동시에 표시해요. UE5.5/iOS15/A8설명과5.8A8/A8X배제도혼재해요. hardware문서의Sequoia14도이름/번호불일치로남겼어요. 임의정정값을공식지원표로확정하지않아요. AppStore/GooglePlay정책은엔진본문의주장까지만읽었고Apple/Google정책원문확인은대기예요.

## HB 대응은 미구현 설계 요구예요

| 누적 요구 ID | C++·노드·사람UI·AI·파일을 연결하는 설계 | 향후 증거 |
| --- | --- | --- |
| HB-BUILD-011-A | 공통 BuildProfile 데이터에 host/targetOS·architecture·packageFormat·entryScene·configuration·toolchain판본·runtime설정·서명참조를분리해요. 사람UI는설치가능/설치됨/지원안됨/원격호스트필요를표시하고AI도같은schema를사용하는후보예요. | 저장·재열기·판본이전·revision충돌·누락SDK·금지조합 검사를확인해요. |
| HB-BUILD-011-B | C++서비스/노드/AI가같은validate→compile→cook→stage→package→sign→install→launch작업모델에연결돼요. 로그·취소요청·취소완료·실패artifact를분리하고target-nativeasset변환/선택content를보존해요. | 코드와에셋분리·중단/재시작·서명/파일목록·packageinstall·기기launch를각층에서입증해요. |
| HB-BUILD-011-C | PC exe게임은installer/portable·prerequisite·입력·종료·사용자저장·업데이트를포함하고모바일앱은APK/AAB/iOSexport·deviceABI/SDK·provisioning·touch/lifecycle를별도설계해요. 서명비밀은프로젝트데이터에값으로저장하지않아요. | 새설치/업데이트/오프라인/저장호환/실제플레이·디버그/릴리스구성을확인해요. |
| HB-EDITOR-011-D | **데스크톱에디터와Android/iOS에디터앱자체**를별도목표로유지해요. 프로젝트생성/열기·자동assetimport·scene/node/material/animation/C++편집·저장/복구·play/debug·원격build수신을같은공통모델/파일계약으로연결하는후보예요. | 기기에서실제authoring→disk재열기→공통runtime효과→AI동등편집을확인해요. localnativecompile지원은모바일OS/toolchain조사가필요해요. |
| HB-REMOTE-011-E | 스트림보기·카메라/입력remotecontrol·모바일기기nativegameplay·모바일독립editor를제품능력표에서구분해요. 세션/권한/연결실패·지연·끊김/재접속·다중기기충돌을기록해요. | remote화면/입력을실기기성능·독립editor·설치게임성공으로세지않아요. |

읽기전용현재대조는 `prototype/build-profile.js:1`의windows-x64/WebView2-WebGL2, `tools/build-game.mjs:66`의win32/x64호스트제한, `:83`의Game.exe/Node/Loader동봉·`:84-86`의package/report/failure기록이에요. source의존재를실행증거로세지않아요. 기존[빌드연구](../BUILD_PLAYER_RESEARCH.md)의과거GUI/플레이주장도이번에재검증하지않았어요. 이011은엔진·편집기·플랫폼지원·테스트를수정하거나실행하지않았어요.

## 대기와 검증

12개가져오기최종성공과해당hash를현재파일에서재계산했어요. 첫SSR/HTML추출형식·slug오류는공식본문형식에맞춰회복했고본문없는200응답을완료로세지않았어요. 목차2개는별도navigation-cache예요. 33개이미지raw를확보했지만pixels읽기는BuildProfiles1개/UAT1개만이에요. Packaging31개·GIFanimation전체·video1개는미독이에요. 네트워크/도구usage-limit로실제읽기를못한것처럼보고하지않고최종확보와미독을구분해요.

각페이지의후속링크는JSON에개별등록했지만이것은전체API/SDK/스토어문서폐쇄가아니에요. AndroidGradle/keystore/device/AAB배포, iOS인증서/provisioning/cloud·remoteMac, ContentCooking/BuildCookRun/Launcher/config/chunk/installer·update, 모바일editorOS계약과전체관련API·표·media분모가남아있어요. 독립검증자는원문·본문hash·각구역/표/선언/예제와분석을다시대조해야해요. 전체분석gate와engine구현재개조건은열지않아요.
