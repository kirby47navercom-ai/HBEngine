# 모바일 GPU 질의·패키지 렌더러 — 056

2026-10-07. 기존 모바일 C++ AOT/플랫폼 메시지 채널과 공용 Player의 renderer query를 연결했어요. Particles Play/Stop/Pause/Emit/GetCount를 그대로 사용해요. 대상·방출 수·bool·개수 응답 검증은 PC와 모바일이 NativeProtocol의 같은 함수에서 처리해요. 기존 권한/요청 수/월드 범위와 유실 호출 재시도 방지를 유지해요. 빌드 report 및 모바일 manifest에는 시작 씬에서 선택한 렌더러를 기록하고 GPU 선택을 GL로 잘못 표시하지 않아요.

`node tools/check-mobile-player.mjs`: 실제 C++ AOT 두 모듈의 GPU 명령 7회·개수65·잘못된 입력/대상/응답·없는 채널 거절과 플랫폼 연결, 기존 물리·위치·한글·저장·모바일 출력 통과(SC3vb8). 이 GPU 질의의 수신기는 검사 상태를 사용하는 mock이에요. 실제 GPU 계산 통과와 구분해요. 패키지의 GPU opt-in 의존성과 현재 렌더러 metadata도 확인했어요. PC 실제 GPU ighUFn에서 같은 공용 검증 함수를 사용한 기존 C++/BP 호출은 통과했어요.

실제 Java/DEX/JNI x86_64 APK를 빌드했고, 네 가지 모바일 연결 파일은 검사한 APK에 현재 소스 bytes와 같아요. 독립 headless Android16/WebView133 host GPU 검사6SBQJw에서 secure context와 navigator.gpu는 true이나 requestAdapter가 null이에요. 앱의 GL 첫 프레임·C++ 시작 상태/물리·메시지 포트와 독립 종료는 확인했지만, Android GPU 실행은 확인하지 못했어요. unsafe GPU/차단 우회 플래그를 사용하지 않았어요. 후속057 입자 유휴 최적화는 이 APK 이후이며 Android에서 실행 검증되지 않았어요. 실제 휴대폰·모바일60·발열·배터리·iOS 새 GPU 실행을 완료로 표시하지 않아요.

실패 기록: vHSbOG의 SwiftShader 가상 기기는 호스트 프로세스 접근 위반으로 종료됐어요. host GPU로 앱 시작을 확인한 HyxIho는 검사가 최신 Image wrapper를 img로 잘못 읽어 실패했어요. 실제 자식 img로 수정하고 새 GPU 검증은 기존 전체 검사를 반복하지 않는 gpu-probe-only 경로로 좁혔어요. 마지막 검사는 GPU adapter가 없다는 결과를 보존하며 앱 종료만 성공으로 표시해요. 검사 뒤 stdout 문구만 이 범위에 맞춰 수정했어요.

읽기/원문 SHA와 증거: `native/build/gpu-mobile-research-056/manifest.json`.

- [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview): browser/library support 구간만 읽었어요. Chrome 지원표만으로 특정 WebView/기기의 지원을 판정하지 않아요.
- [WebView overview](https://developer.chrome.com/docs/webview): 자체 개요·갱신·Chrome 기능 대조·가속 설명을 읽었어요. 연결 API 본문은 미독이에요.
- [WebKit Safari26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/): WebGPU 구간만 읽었어요. 자체 전체/연결 API·WWDC 본문은 미독이에요.
- Chromium HEAD AwContentBrowserClient의 WebGPU 이름 검색·OverrideWebPreferences 위임 구간만 확인했어요. 검색 결과 없음은 지원 증거가 아니에요. 연결 aw_settings의 WebGL 구간도 전체 소스/API 분석으로 계산하지 않아요.

Android 실제 GPU·iOS GPU/서명·전체 프레임/메모리와 누적 선행 목표는 계속해요. 사용자 설치7df780dd9a47cf5b는 유지해요.
