# Android 메시지 채널 — 2026-10-06

실제 가상 기기 `android-runtime-ddTswv`에서 C++ 질의가 없는80호출의 RPC 평균은3.12ms, 질의1개인40호출은14.7ms였어요. 물리 질의 자체는1.33ms였으며 worker 시간에는 질의 대기가 포함돼 있어 단순 합산하지 않아요. 두 모듈의 매 Tick 왕복 대기를 줄일 후보로 기본 플랫폼 채널을 조사해요. 이 수치를 실제 휴대폰 성능이나 채널 개선 결과로 표현하지 않아요.

[WebMessagePort](https://developer.android.com/reference/android/webkit/WebMessagePort)의 자체 소개·상태 제약과4개 자체 메서드, [WebView](https://developer.android.com/reference/android/webkit/WebView)의 createWebMessageChannel·postWebMessage 구역을 읽었어요. API23에서 채널을 만들 수 있고 두 포트는 시작된 상태예요. 수신 콜백 설치 전에 도착한 메시지는 대기해요. 포트의 콜백 설정·전송 뒤에는 그 포트를 넘길 수 없고, 넘긴 포트에는 Java 측 전송·수신·닫기를 적용할 수 없어요. 남긴 포트는 사용 종료 시 닫아요. 채널 생성과 게시에는 UI 스레드가 필요하며, WebView는 주 프레임의 지정된 출처로 포트를 넘겨요. 모든 출처를 허용하는 게시를 사용하지 않아요.

[WebMessageCallback](https://developer.android.com/reference/android/webkit/WebMessagePort.WebMessageCallback)의 자체 선언·소개·생성자·onMessage의 선언/인자, [WebMessage](https://developer.android.com/reference/android/webkit/WebMessage)의 자체 선언·소개·두 생성자와getData/getPorts의 선언/인자/반환을 새로 읽었어요. 콜백은 기본적으로 주 스레드에 도착하고, 다른 Handler를 지정해도 포트 API는 주 스레드에서 다뤄야 해요. 문자열과 전달 포트를 분리하고 포트가 없는 메시지를 처리해야 해요. 상속 Object와 Handler·연결 WHATWG MessageEvent 본문을 읽었다는 뜻은 아니에요.

원문4개와 응답URL/hash는 `native/build/android-channel-docs/manifest-022.json`에 있어요. 각 원문을hash파일명으로 고정하고 Android API 출처에 발견 증거로 등록했어요. 4입력 중3새 주소이고 기존 WebView 주소에는 발견 경로를 추가했어요. 기존 출처 기준 필드는 유지하고 전체 읽기·독립 검증·API 분모를 승격하지 않았어요. WHATWG·Java·Handler의 연결 내용은 추가 대기 대상으로 남겨요.

HB 적용 판단: C++ 실행은 기존 단일 worker에 남기고, JS 물리 질의 응답은 worker를 기다리지 않는 수신 경로를 유지해야 해요. 동기 JavascriptInterface 한 호출로 묶으면 서로 기다리는 구조를 만들 수 있어요. 새 기본 포트가 실제 앱에서 양방향 질의·배경/복귀·출처와 종료를 보존하는지 검사하고, 같은 조건의 RPC 시간을 비교한 뒤 적용을 판단해요. 웹/Windows/iOS의 기존 전송 경로를 이 Android 후보로 대체하지 않아요.

실제 후보 `android-mobile-xw7jwk/acceptance.json`의 APK·AAB·두 JNI ABI·16KB ELF 검사를 통과했어요. `android-runtime-9czDGl`에서 C++ 두 모듈·동기 물리 질의·한글 HUD/SVG·1.5 DPR·안전 영역·동시 두 터치·해제·믹서 신호·18초 배경과 복귀·자체 가상 기기 정리를 확인했어요. 주 프레임 포트 전달의 실제 MessageEvent는 빈 origin과 null source여서, 임의 외부 출처 허용 없이 요청의 임의 확인 값과 단일 포트를 대조해요. 잘못된 값·출처·source·포트 수·요청 실패 정리는 `node tools/check-mobile-bridge.mjs`에서 검사해요.

같은 시기의 기존 APK `android-runtime-WpZcj1`도 전체 동작 검사를 통과했어요. 두 방식 모두 약3.7회/초로, 앞선 조용한 환경의11.87회/초와 차이가 났어요. 당시 Adobe Premiere가 CPU1056%를 사용한 표본이므로 속도 개선이나 회귀로 단정하지 않아요. 기본 플랫폼 채널의 기능 연결은 확인했지만 안정된 성능 대조는 대기 중이에요. 주인님 설치본은 아직 업데이트하지 않았어요.


2026-10-06 추가 재읽기: WebMessagePort의 자체 4메서드와 [AOSP 설명](https://android.googlesource.com/platform/frameworks/base/+/37bd890/core/java/android/webkit/WebMessagePort.java)의 주 스레드 제약을 다시 확인했어요. 과거 API 명칭의 AOSP 본문은 스레드 설명의 보조 근거이며 현행 메서드 명칭은 Android 공식 API를 따라요. 포트 게시를 임의의 C++ worker에서 직접 호출하지 않아요. Android native 응답에 Java 해석·worker 대기·JNI 호출·UI 게시 대기를 각각 계측하고, C++ workerMs와 별도 값으로 보고해요. 이 재읽기를 전체 연결 API나 두 엔진 문서 분석 완료로 세지 않아요.

Auric 격리 검사: 2코어·2GB·호스트 GPU에서 50개 인스턴스는 28.52/31.35fps로 두 표본 중 하나가30fps를 넘지 못했어요(`android-window-a052tk`). 같은2GB·해상도·50개 인스턴스 조건의4코어 검사에서는45.46/43.84fps를 확인했어요(`android-window-GmYOUG`). 실제 WebGL renderer는 NVIDIA RTX4070 SUPER를 사용하는 Android Emulator translator이고 guest CPU online0-3을 읽었어요. 실기기 성능·음향 청취·열/배터리 검증으로 계산하지 않아요. SwiftShader·2코어 실패 증거도 계속 보존해요.

추가 AOSP 발견 출처는 `android-aosp-webkit`으로 전체 corpus 대상에 등록했어요. 고정37bd890 응답 31,922바이트의 SHA-256은 `11db5f3c24acd77ee4ee5c37d05c85839430ed080cd3646f1035aa2b83d5f7aa`이고 private 원문은 `native/build/android-channel-docs/aosp-import-022.json`에 연결돼 있어요. 발견 등록이며 본문/API 전체·독립 분석 승격은 하지 않아요. 최신 코드로 APK를 새 빌드한 ZpjEFz의4코어 측정은41.23/41.50fps였고, 검사 기기와 데이터도 정리했어요.
