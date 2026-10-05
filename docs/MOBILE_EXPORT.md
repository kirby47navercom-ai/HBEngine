# 모바일 게임 출력

최신 검사: SDK 약관 동의·공식 체크섬 설치 후 `android-mobile-Y9F6Lt`의 ARM64/x86_64 APK/AAB 전체 빌드와 `android-runtime-v6YE5E`의 Android 36 독립 가상 기기 설치·실제 게임 실행을 통과했어요. 한글 HUD·SVG·DPR 1.5·동시 이동/공격·터치 해제·매 Tick C++ 물리 질의·18초 백그라운드 뒤 월드 보존·검사 기기 종료/정리를 확인했어요. 아래 동의 대기 기록은 이전 단계의 기록이에요.

[iOS 실제 검사 37323624672](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37323624672)는 Xcode 두 SDK 컴파일·독립 iPhone SE 시뮬레이터 설치/실행·C++ 두 모듈·매 Tick 물리 질의·동시 8개/범위 에셋·앱 전환/복귀·Count 1/10 보존을 통과했어요. 한글 HUD·SVG·조이스틱·공격 버튼 화면도 확인했어요. JS 15초와 네이티브 10초 제한은 활성 시간에 적용하고 비활성 대기와 월드를 보존해요. 실물 휴대폰·Apple 배포 서명·스피커 청취·발열/배터리와 모바일 편집기는 별도 검증/작업 대상이에요.

Android의 WebView 부모에 시스템 바/화면 잘림 안전 영역을 적용해서 탐색 바가 공격 버튼을 가리지 않게 했어요. [Android edge-to-edge 문서](https://developer.android.com/develop/ui/views/layout/edge-to-edge)의 시스템 바·cutout·inset 본문을 참고했어요. `node tools/check-android-runtime.mjs native/build/android-mobile-Y9F6Lt/acceptance.json`으로 재현해요. 8개 동시 에셋·앞/뒤 범위·외부 파일 거절도 통과했고 잘못된 Range는 실제 WebView의 `net::ERR_REQUEST_RANGE_NOT_SATISFIABLE`로 거절됐어요. 단순 TypeError를 정상 응답으로 세지 않아요.

실행 검사는 성능 합격 판정과 구분해요. Android 앱 PID의 PSS 105,263KB/RSS 270,452KB는 한 번의 표본이며 WebView 전체 프로세스 메모리나 최고값이 아니에요. 복귀 보고의 FPS에는 비활성 간격과 검사 작업이 포함돼 있어 게임의 목표 FPS로 해석하지 않아요. 별도 활성 구간의 작업 시간·탄막·오디오 검사를 이어가요. 사용자 설치본은 아직 변경하지 않았어요.

Windows 플레이어의 장면·블루프린트·물리·UI·입력 실행 코드를 모바일에서도 사용해요. Android는 WebView와 JNI, iOS는 WKWebView와 Objective-C++ 호스트를 사용하며 사용자 C++을 앱에 사전 컴파일해요. 실행 중 외부 Node 서버나 편집기 파일을 요구하지 않아요.

## 출력과 검증의 구분

- Android 프로필: APK 또는 AAB, 앱 ID·버전·방향·최소 SDK·CPU·서명 프로필을 설정해요. SDK 36, Build Tools 36.0.0, NDK 28.2.13676358, JDK를 검사한 뒤 빌드해요. APK 정렬·서명과 AAB 구조 검증을 실행하며 실패를 성공으로 바꾸지 않아요.
- Android 도구 준비: 빌드 화면에서 SDK 약관을 직접 읽고 체크한 뒤 설치해요. 다운로드 체크섬·진행·취소는 기존 빌드 작업 경로를 사용해요. 누락된 SDK 검사는 `환경 준비 필요`로 표시해요. AI 요청도 명시적인 사람의 약관 동의가 있어야 `POST /api/build/tools/android {acceptLicense:true}`를 실행할 수 있어요.
- iOS 프로필: 원본 게임 콘텐츠와 사용자 C++을 포함한 `HBGame.xcodeproj`를 출력해요. 프로젝트 출력만으로 컴파일·서명·설치 성공을 표시하지 않아요. 실제 Xcode 검사는 `.github/workflows/mobile-ios.yml`을 수동 실행해요.
- Android 설치: 연결된 기기를 사용자가 선택해요. APK 해시·CPU·최소 SDK를 확인하고 기존 앱 데이터가 보존되는 업데이트 설치를 수행해요. Activity 시작과 게임 첫 프레임 완료를 별도로 보고해요.
- 배포 서명: 개인 키와 암호를 프로젝트·Git·출력 보고에 넣지 않아요. Windows 사용자 도구 폴더의 서명 참조와 `HB_SIGN_*` 환경 변수를 사용해요. iOS 실제 기기 배포에는 Apple 팀과 유효한 서명이 필요해요.

## 공용 실행 계약

공용 C++ 요청·응답 검증과 증분 월드 전송을 재사용해요. AOT 모듈마다 사용자 클래스와 `hb` 상태를 분리해 동일 클래스 이름의 서로 다른 코드가 충돌하지 않게 해요. C++의 동기 물리 질의는 실행 중 JS의 실제 Rapier 월드로 전달하고 응답을 기다려요.

패키지 내부 에셋만 읽고 외부 페이지 이동을 차단해요. 저장은 프로젝트별 게임 저장 키로 제한하고 원자적으로 교체해요. 앱 비활성화 시 입력을 초기화하고 시뮬레이션·오디오를 멈춰요. 복귀 시 멈춘 시간 전체를 한 프레임에 처리하지 않아요.

JS 호스트 요청은 활성 시간 15초, C++ 동기 질의는 활성 시간 10초를 제한해요. 비활성 시간은 대기에서 제외하며 진행 중 요청·응답과 월드를 보존해요. 활성 상태에서 실제로 응답이 없는 오류는 계속 보고해요.

개발용 가상 기기는 `node tools/prepare-android.mjs --accept-license --emulator`로 안정판 에뮬레이터와 Android 36 x86_64 시스템 이미지를 선택 설치해요. 기본 게임 출력에는 가상 기기를 포함하지 않아요. 같은 Android SDK 약관과 공식 목록의 크기·체크섬을 확인해요. [명령행 문서](https://developer.android.com/studio/run/emulator-commandline)의 설치·독립 데이터·메모리·창 없는 실행 부분과 [가속 문서](https://developer.android.com/studio/run/emulator-acceleration)의 가속 검사·WHPX 본문을 읽었어요. 연결된 모든 API/새 Android CLI 문서를 읽었다는 뜻은 아니에요.

## 최신 실제 결과 — 2026-10-06

Android `android-mobile-H6PL0Q`는 실제 ARM64/x86_64 C++·Java/DEX·APK/AAB·서명·16KB 정렬을 통과했고, `android-runtime-ddTswv`는 독립 창 없는 Android36에서 C++ 두 모듈·2D 물리·한글/SVG/DPR1.5 안전 영역·동시 이동/공격·실제 믹서 신호·배경 정지/복귀·검사 자원 정리를 통과했어요. 소리를 사람이 들었거나 실물 휴대폰에서 검증한 결과는 아니에요.

활성 4.5초 표본은 59프레임/11.87회 실행/s·작업 평균72.49ms/p95 123.4ms였어요. software GPU와 매 Tick C++ 질의가 있는 가상 기기 조건이에요. 최근 120개 호출 중 물리 질의 없는 80개 RPC 평균3.12ms, 질의 한 개가 있는 40개 RPC 평균14.7ms·질의 평균1.33ms였어요. RPC·worker·질의 시간은 서로 포함하므로 더하지 않아요. 물리 질의 자체보다 호출 왕복이 큰 표본이며 실물 휴대폰의 FPS·발열·배터리 결과로 사용하지 않아요.

iOS [37343333585/8e2cbd5](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37343333585)는 실제 Xcode 기기·시뮬레이터 컴파일과 독립 iPhone SE3/iOS18.5의 C++/BP·물리·에셋·반복 오디오·배경/복귀를 통과했어요. HTMLAudio의 첫 반복 뒤 길이 손상을 경로별로 대조한 뒤 iOS target에서 PCM BufferSource를 공용 믹서에 연결했어요. 최초 세 보고의12.904초와 복귀 네 보고의14.069초 동안 duration2/진행/믹서 신호를 확인했어요. 재생 캐시는32MiB이며 활성 음성과 디코딩 중 메모리는 별도예요. 실물 휴대폰·스피커 청취·배포 서명은 미검증이에요. 사용자 지시대로 Auric Loop P0-1부터 단계별 데모 검증 뒤 설치본을 업데이트하며 게임·프로필을 보존해요. [오디오 대조 기록](research/MOBILE_AUDIO_DIAGNOSTICS_021.md)

공식 보조 출처의 누적 연구 등록과 미독 범위는 [020 등록 기록](research/MOBILE_RUNTIME_SOURCE_REGISTRATION_020.md)에 있어요. 이 실행 검사는 전체 Unity·Unreal 분석이나 전체 엔진 완성을 뜻하지 않아요.

## 초기 실제 기록 — 2026-10-05

`node tools/check-mobile-player.mjs`의 `native/build/mobile-player-q6e2yh/acceptance.json`: MinGW로 실제 C++ AOT 두 모듈을 링크·실행했고, 증분 월드·배치 위치·한글·Rapier 2D 질의·저장 범위·요청 상관관계·두 사용자 C++ 모듈을 포함한 iOS 프로젝트 출력 검사를 통과했어요. 이 검사는 Android JNI/Java 또는 Apple SDK 컴파일 검사가 아니에요.

Android SDK는 사용자 이용약관 동의를 기다리고 있으며 설치·APK/AAB 빌드·기기 실행은 아직 검사하지 않았어요. 사용자는 Mac과 Xcode가 없다고 답했어요. 원격 표준 Mac 실행 환경에서 수행할 실제 컴파일·시뮬레이터 검사 도구를 추가했고 실행 결과는 후속 기록으로 남겨요. 사용자 설치본과 게임·프로필은 변경하지 않았어요.

## 확인한 공식 출처와 읽기 범위

- [Android 재생 터치 조건](https://developer.android.com/reference/android/webkit/WebSettings#setMediaPlaybackRequiresUserGesture(boolean)): 해당 메서드의 기본값·인자 본문을 읽었어요. [Apple 재생 터치 조건](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/mediatypesrequiringuseractionforplayback): 공식 JSON의 abstract·선언·Discussion 전체를 읽었어요. 원문 `native/build/mobile-audio-docs/apple-audio-policy.json`, SHA256 `25381b2d8361bf6105a9cf05c04d79da79f0a5d4661c6a5818b6c818c5150aeb`예요. WebSettings/WKWebView 전체 연결 API 읽기로 세지 않아요. 로컬 게임 앱의 시작 사운드는 별도 터치 없이 재생하게 설정하고 실제 믹서 신호·정지/복귀를 후속 검사해요.

- [Android 로컬 콘텐츠](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content): 로컬 콘텐츠 출처·보안·파일 URL 제한·코드 예제 본문을 읽었어요. 이 페이지의 링크 대상 전체 API를 읽었다는 뜻은 아니에요.
- [Android NDK 다른 빌드 시스템](https://developer.android.com/ndk/guides/other_build_systems): clang 대상·호스트·명령행 본문을 읽었어요.
- [Android bundletool](https://developer.android.com/tools/bundletool): 번들·APK 세트 생성·설치·서명 본문을 읽었어요.
- [Apple Xcode 명령행 도구](https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference): 공식 JSON의 자체 abstract/primaryContentSections 전체를 읽었어요. 연결된 도구의 전체 man/API는 별도 대상이에요.
- Apple WKScriptMessageHandler/WKScriptMessage/WKWebViewConfiguration 공식 JSON의 자체 개요를 읽었어요. 구성 API의 연결된 자식 항목은 미독이에요.
- [GitHub 표준 실행 환경](https://docs.github.com/en/actions/reference/runners/github-hosted-runners): 공개 저장소 표준 실행 환경과 macOS 목록을 확인했어요. 워크플로는 수동 실행이고 저장소 읽기 권한만 사용해요.

이 플랫폼별 보조 읽기와 실행 검사는 Unreal·Unity 전체 본문·API 분석 완료나 누적 엔진 요구 전체 완료로 계산하지 않아요. 모바일 에디터·실제 휴대폰 열/배터리·전체 배포 및 기존 엔진 세부 기능 요구는 계속 유지해요.

추가 실제 검사: `authoring-window-N50gvI`에서 Android 필드·CPU/방향/앱 ID 저장·누락 SDK 안내·iOS 출력·Windows 복귀를 실제 편집기 창에서 통과했어요. 원격 Mac `37308145242`에서는 Xcode 두 대상 빌드 이후 시뮬레이터 목록 JSON을 검사 도구가 50KB로 잘라 읽어 실패했어요. 목록 출력 한도를 늘려 후속 실행을 검증해요. Android 보고는 긴 오브젝트 로그가 잘리지 않도록 짧은 준비 로그와 앱 내부 전체 보고를 구분하며 실제 JNI/Java·기기 검사는 동의 후 진행해요.

원격 Mac `37308675945`: 실제 Xcode 시뮬레이터·기기 대상 컴파일, 시뮬레이터 설치·시작 후 2400프레임/12 draw call 실행 보고를 보존했어요. 두 C++ 모듈의 Count 1/10과 배치 위치 보존을 확인했지만 화면 캡처 시간 초과로 워크플로 전체는 실패했어요. 물리 질의·HUD·SVG가 추가된 후속 두 실행은 `[object Event]`, 0프레임으로 실패했어요. 공용 파일 주소가 이미지 로더에서는 fetch 어댑터를 거치지 않고 PC용 `/api/file`로 요청되는 원인을 고쳤어요. 패키지 등록 에셋·리다이렉트·한글 경로만 `/Content` 주소로 변환하며 실제 iOS 화면을 다시 검사해요. 후속 실패를 최초 실행 성공으로 덮지 않아요.

`authoring-window-zzwAQZ`: 실제 편집기에서 도구 준비 모달·기본 미동의·버튼 잠금·체크 후 활성화·취소·문자열 동의 요청 서버 거절을 확인했어요. SDK 설치를 실행하지 않았어요. 프로필 저장·누락 환경 상태·iOS 출력·Windows 복귀도 통과했어요. 최초 검사 83TIeJ는 브라우저 close 이벤트가 실행되기 전에 삭제 여부를 단정한 검사 오류였고, 실제 close 이벤트 완료를 기다리도록 고쳤어요. `check-build-profiles.mjs`는 잘못된 동의 값 6종을 작업 생성·설치 전에 차단하는 검사도 통과해요.

[원격 실제 실행 37311864792](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37311864792): Xcode 기기·시뮬레이터 대상 컴파일, iPhone 17 Pro 시뮬레이터 설치·실행을 통과했어요. 첫 10프레임/15 draw call, C++ 두 모듈 Count 1/10·배치 위치, 실제 Rapier 2D 동기 질의, 패키지 SVG의 전체·부분·접미 범위 읽기와 외부 파일 거절을 확인했어요. `ios-simulator.png`에서 C++ Begin Play의 한글 HUD 변경, SVG UI, 스프라이트, 조이스틱·공격 버튼을 직접 확인했어요. 실제 휴대폰·배포 서명·음향 청취의 증거로 계산하지 않아요.

공용 실행 의존성은 실제 literal import와 Player의 Three import map을 따라 수집해요. 사용하지 않는 예제·빌드·소스맵 전체를 복사하지 않으며 2D/3D Rapier, 모델 로더, Three 핵심과 라이선스는 유지해요. 같은 모바일 검사 프로젝트는 1302파일/59,130,284bytes에서 92파일/11,381,133bytes로 줄었어요 (`mobile-player-uAZEDc`). 이는 콘텐츠 용량 측정이며 네이티브 바이너리·설치 용량·실행 FPS 측정과 달라요. Windows 첫 축소 검사 jb0mg3에서는 Three exports 메타데이터가 없어 Node 서버가 종료됐어요. package.json을 포함해 dJEqQD의 실제 배포 Player·C++·2D 표면·조명 GPU 검사와 원본 보존·예외0·종료/서버 정리를 통과했어요. 축소 패키지와 앱 백그라운드/복귀는 원격 iOS에서 후속 검증해요.

`ui-render-window-0ndfVk`: 축소 패키지의 실제 Windows Player에서 1280×720·1920×1080·1600×900·2560×1080·1080×1920·소수 DPI 여섯 조건을 통과했어요. 높이 배율·모서리/안전 영역·클릭→블루프린트·터치 버튼 입력을 확인했어요. 1.5배 SVG는 실제 화면 픽셀을 직접 크기로 표시한 SVG와 비교했어요. 사용자 원본과 설치본은 보존했어요.

전체 화면은 실행 환경의 실제 지원 여부를 검사해요. 지원하지 않는 버튼을 숨기고, 요청 거절은 메뉴 안에서 처리해 게임 실패 정리로 보내지 않아요. [WebKit 16.4 공식 본문](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)의 229–244행에서 전체 화면 지원 플랫폼·화면 방향·사용자 활성화 설명을 다시 읽었어요. `check-player-lifecycle.mjs`는 실제 Player 함수 원문으로 전체 화면 지원/미지원/거절·모바일 입력 초기화·저장·오디오 정지·복귀 중복 프레임 방지·시간 누적 초기화를 검사해요. 실제 앱 전환은 별도의 시뮬레이터 검사예요.

[후속 실행 37313665459](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37313665459)는 축소 패키지의 두 Xcode 컴파일·10프레임/15 draw call·C++/Rapier까지 통과했어요. 외부 첫 SVG 요청은 EPIPE로 실패해 앱 전환/복귀 검사에 도달하지 못했어요. 단일 읽기 서버의 연결 대기 지연 가설을 8개 고정 읽기 작업자로 검증해요. 모든 검사 요청은 15초로 제한하고 동시 8개 읽기·범위·등록되지 않은 파일 거절을 재검사해요. 이 변경의 실제 Mac 결과는 후속 기록으로 남겨요.

Windows 새 배포 후보는 `user-install-q8Ag9v`의 임시 설치에서 불변 버전 재사용·두 프로젝트/프로필/서버 분리·원본 보존·종료 검사를 통과했어요. 배포 폴더의 실제 Rapier 물리 144개와 충돌 형상 67개도 통과했어요. 이 검사는 주인님의 설치본 업데이트가 아니에요.

Android 에셋 호스트는 요청 헤더의 대소문자를 구분하지 않고 단일 시작·열린 끝·접미 바이트 범위를 읽어요. 파일보다 큰 끝/접미 길이는 파일 안으로 제한하고, 잘못된 범위는 416과 전체 크기로 답해요. 부분 스트림은 읽기·건너뛰기 모두 해당 범위 안으로 제한해요. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.1.2)의 5.1 헤더 이름·14.1 범위 단위·14.1.1/14.1.2/14.2 표시된 본문·14.4 일부 응답 설명을 읽어 대조했어요. RFC 전체·연결된 문서 전체 읽기로 세지 않아요. 모르는 범위 단위와 미지원 multipart 요청은 범위를 무시하고 전체 파일로 답해요.

`npm run test:android-assets`의 `android-assets-o0g5RD`: 앱에 들어가는 실제 Java 범위 함수와 스트림을 추출해 설치된 JDK로 Java 8 대상 컴파일·실행했어요. 접미/경계/64비트를 넘는 요청 수·파일 끝·건너뛰기·빈 읽기·되감기 거절 검사를 통과했어요. Android SDK를 설치하지 않았으며 Activity 전체/DEX/JNI/APK 검사와 구별해요.

주인님이 Android SDK 약관에 동의해 도구 설치를 시작했어요. 실제 SDK/NDK 빌드·설치 결과는 후속 증거에 기록해요. iOS 37316212354는 두 대상 컴파일 뒤 첫 앱 시작 명령이 180초 시간 초과됐고 실행 보고를 남기지 못했어요. 에셋 서버 가설의 검증에 도달하지 않았으며 SDK와 맞는 설치된 런타임 우선 선택·단계/실패 앱 로그 보존으로 다시 검사해요.
