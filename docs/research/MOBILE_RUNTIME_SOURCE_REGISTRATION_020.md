# 모바일 실행 보조 출처 등록 — 2026-10-06

사용자의 후속 지시에 따라 모바일 출력·실제 실행·검증 후 설치본 업데이트를 먼저 진행해요. 아래 목록은 그 작업에서 사용하거나 발견한 공식 주소를 누적 연구 대상에 추가하는 수동 seed 기록이에요. 공식 페이지의 자동 링크 추출 결과나 전체 본문 읽기 증거를 대신하지 않아요.

부분 읽기 범위와 실제 결과는 [모바일 출력](../MOBILE_EXPORT.md)에 있어요. 기존 세 출처의 roots를 바꾸지 않아 이미 저장한 본문 snapshot의 기준 hash를 무효화하지 않아요. GitHub 실행 환경과 IETF HTTP 명세는 별도 출처로 등록해요. 모든 발견 범위는 열려 있고, 페이지·API·연결 문서·미디어 분모는 미확정이에요. 등록은 discovered 상태만 추가하며 captured/read/reviewed/analyzed/verified로 승격하지 않아요.

| 출처 | 공식 URL | 이 기록의 범위 |
| --- | --- | --- |
| android-platform-guides | https://developer.android.com/develop/ui/views/layout/webapps/load-local-content | 앞선 부분 본문 기록 연결 |
| android-platform-guides | https://developer.android.com/ndk/guides/other_build_systems | 앞선 부분 본문 기록 연결 |
| android-platform-guides | https://developer.android.com/tools/bundletool | 앞선 부분 본문 기록 연결 |
| android-platform-guides | https://developer.android.com/studio/run/emulator-commandline | 앞선 부분 본문 기록 연결 |
| android-platform-guides | https://developer.android.com/studio/run/emulator-acceleration | 앞선 부분 본문 기록 연결 |
| android-platform-guides | https://developer.android.com/develop/ui/views/layout/edge-to-edge | 안전 영역의 후속 본문·API 대상 |
| android-platform-guides | https://developer.android.com/studio/terms | 사용자의 실제 SDK 약관 동의 경로 |
| android-platform-api | https://developer.android.com/reference/android/webkit/WebSettings | setMediaPlaybackRequiresUserGesture 부분 읽기, 전체 API 미완료 |
| android-platform-api | https://developer.android.com/reference/android/view/WindowInsets | 안전 영역의 후속 본문·API 대상 |
| apple-platform-supplement | https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference | 앞선 자체 JSON 내용 기록 연결, 연결 man/API 미완료 |
| apple-platform-supplement | https://developer.apple.com/documentation/webkit/wkscriptmessagehandler | 앞선 개요 기록 연결, 자식 API 미완료 |
| apple-platform-supplement | https://developer.apple.com/documentation/webkit/wkscriptmessage | 앞선 개요 기록 연결, 자식 API 미완료 |
| apple-platform-supplement | https://developer.apple.com/documentation/webkit/wkwebviewconfiguration | 앞선 개요 기록 연결, 자식 API 미완료 |
| apple-platform-supplement | https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/mediatypesrequiringuseractionforplayback | 자체 abstract·선언·Discussion 기록 연결 |
| apple-platform-supplement | https://developer.apple.com/documentation/webkit/wkwebview | 이번 오디오 진단에서 검색으로 발견, 전체 내용 미독 |
| apple-platform-supplement | https://developer.apple.com/documentation/avfaudio/avaudioplayer/currenttime | 이번 오디오 진단에서 검색으로 발견, 전체 내용 미독 |
| github-actions-platform | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | 앞선 표준 Mac 실행 환경 부분 읽기 기록 연결 |
| ietf-http-specification | https://www.rfc-editor.org/rfc/rfc9110.html | 앞선 헤더·범위 구역 부분 읽기 기록 연결, 전체 RFC 미완료 |

Apple 오디오 정책 원문은 `native/build/mobile-audio-docs/apple-audio-policy.json`, SHA256 `25381b2d8361bf6105a9cf05c04d79da79f0a5d4661c6a5818b6c818c5150aeb`에 보존돼 있어요. 이 수동 주소 목록의 hash는 발견 경로를 고정하는 용도이며 위 원문 hash와 혼용하지 않아요. Android repository XML·도구 배포판, 연결된 Microsoft 가속 지침·WebKit/Chromium 구현과 새 API는 계속 조사·별도 등록할 대상이에요. 발견한 보조 출처를 이유로 Unity·Unreal 또는 기존 엔진 요구를 제외하지 않아요.

기존 원장에 import한 결과 18개 입력 주소 중 17개가 새 발견 페이지로 추가됐어요(기존 Android 주소 한 개는 발견 경로만 추가). 출처 계열은 18→20개이며 새 두 계열은 각각 discovered1/fetched0/body_reviewed0/analyzed0/verified0이에요. 기존 18계열의 id·engine·version·locale·roots·hosts·pathPrefix가 변경되지 않았음을 대조했어요. `native/build/mobile-research-status-020.json`의 전체 gate는 false이고 미확정 분모·미독·연결 출처 문제가 그대로 남아 있어요.
