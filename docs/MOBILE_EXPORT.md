# 모바일 게임 출력

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

## 실제 기록 — 2026-10-05

`node tools/check-mobile-player.mjs`의 `native/build/mobile-player-q6e2yh/acceptance.json`: MinGW로 실제 C++ AOT 두 모듈을 링크·실행했고, 증분 월드·배치 위치·한글·Rapier 2D 질의·저장 범위·요청 상관관계·두 사용자 C++ 모듈을 포함한 iOS 프로젝트 출력 검사를 통과했어요. 이 검사는 Android JNI/Java 또는 Apple SDK 컴파일 검사가 아니에요.

Android SDK는 사용자 이용약관 동의를 기다리고 있으며 설치·APK/AAB 빌드·기기 실행은 아직 검사하지 않았어요. 사용자는 Mac과 Xcode가 없다고 답했어요. 원격 표준 Mac 실행 환경에서 수행할 실제 컴파일·시뮬레이터 검사 도구를 추가했고 실행 결과는 후속 기록으로 남겨요. 사용자 설치본과 게임·프로필은 변경하지 않았어요.

## 확인한 공식 출처와 읽기 범위

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
