# 모바일 게임 출력

Windows 플레이어의 장면·블루프린트·물리·UI·입력 실행 코드를 모바일에서도 사용해요. Android는 WebView와 JNI, iOS는 WKWebView와 Objective-C++ 호스트를 사용하며 사용자 C++을 앱에 사전 컴파일해요. 실행 중 외부 Node 서버나 편집기 파일을 요구하지 않아요.

## 출력과 검증의 구분

- Android 프로필: APK 또는 AAB, 앱 ID·버전·방향·최소 SDK·CPU·서명 프로필을 설정해요. SDK 36, Build Tools 36.0.0, NDK 28.2.13676358, JDK를 검사한 뒤 빌드해요. APK 정렬·서명과 AAB 구조 검증을 실행하며 실패를 성공으로 바꾸지 않아요.
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
