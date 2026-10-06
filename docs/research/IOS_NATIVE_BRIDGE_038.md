# 038 iOS C++·물리 질의의 직접 비동기 응답

2026-10-06. source6537f3b의 실제 iOS15.4191fps/work p95 73ms, simulation p95 72ms에 대한 후속 작업이다. 렌더 제출 p95 2ms와 구분하고 통제하지 않은 과거 CI와 수치만 비교해 원인을 확정하지 않는다. 다음 공식 API의 자체 본문을 읽었으며 연결된 WebKit 전체 API나 Unreal/Unity 전체 문서를 완료로 계산하지 않는다.

| 공식 원문 | 원시 Markdown SHA256 | 읽은 범위 |
|---|---|---|
| [reply](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply) | `80782290ccdd9e6447f7729c6b7463a059a9d34f17abc2b82ba25882bb028972` | 자체 선언·설명·매개변수·discussion·예제, 연결 API 제외 |
| [async](https://developer.apple.com/documentation/webkit/wkwebview/callasyncjavascript:arguments:inframe:incontentworld:completionhandler:) | `6b535d790c88a2e6eaa3a1f9e7a902a0dec181d110be49f137a78ca45122f7e3` | 자체 선언·설명·매개변수·discussion·예제, 연결 API 제외 |
| [reply-method](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply/usercontentcontroller(_:didreceive:replyhandler:)) | `6ecc843a5b9a18363776b332565fe8fae88ff3d28d3788426028f93395bcf2a9` | 자체 선언·설명·매개변수·discussion·예제, 연결 API 제외 |

| [registration-objc](https://developer.apple.com/documentation/webkit/wkusercontentcontroller/addscriptmessagehandler(_:contentworld:name:)?language=objc) | `c58b6f1aff4d07a2ba283bc1a53eff8b6f82ed6901e823b426da2de62f241f01` | own Objective-C registration declaration and body |
| [WebKit ObjC registration header](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebKit/UIProcess/API/Cocoa/WKUserContentController.h) | `71134c48de456ccbd52902477a34f73c17c79f8af52031507149cee11dbe6a55` | WithReply registration own discussion and exact Objective-C declaration only |

원문/manifest는 native/build/ios-bridge-source-038에 보존한다. API는 iOS14부터 제공되고 엔진 배포 최소값16.4 안에서 사용할 수 있다. Objective-C 메서드 서명·replyHandler 단회 호출 계약은 공식 WebKit 헤더와도 대조했다.

- 기존 네이티브 응답은 결과를 JS 문자열 코드로 만들어 evaluateJavaScript했고, 물리 질의 결과는 별도 JS→native queryReply 메시지를 기다렸다. WKScriptMessageHandlerWithReply가 반환한 Promise로 최초 요청에 직접 응답하고 callAsyncJavaScript가 실제 Rapier 질의 Promise를 기다린다. NativePhysicsQueries의 스냅샷·spawn 검증·순서·C++ 의미는 바꾸지 않는다.
- 기존 Android raw JSON 전송을 같은 플랫폼 브리지에서 재사용해 iOS도 C++ 요청/응답을 Foundation 전체 객체로 다시 파싱·재인코딩하지 않는다. Android 메시지 포트와 기존 응답/오류 처리·배경 활성시간 타임아웃을 유지한다. 알 수 없는/끝난 요청의 질의는 거절하고 실패한 네이티브 호출을 재전송하지 않는다.
- iOS의 글로벌 AOT routing은 mutable 공유 상태여서 네이티브 worker 직렬 실행을 유지한다. 임의 병렬화·물리 결과 캐싱으로 실행 의미를 바꾸지 않는다. 저장은 별도 직렬 queue·원자적 파일 쓰기를 유지하며 사용자 프로필에는 접근하지 않는다. origin/메인프레임/8MiB envelope, 모듈의 정수·범위, JSON 문자열 형식과 UTF8 byte 크기를 검증한다. NativeRouting/C++ worker/API 본문은 이전 실제 Mac 성공과 같다.
- 런타임 development report에 실제 bridge·query 방식/직렬 queue/누적 질의 수·활성시간 대기 ms를 넣는다. 진단용이며 GPU 시간·실물 휴대폰 성능·항상60fps를 뜻하지 않는다.

## 검증

- tools/check-mobile-bridge.mjs 통과: 직접 Promise 결과/오류, raw 한글·인용/배열·null, 실제 async 질의/실패·알 수 없는 ID, 질의의 추가 메시지0, 배경90초 타임아웃 중단/복귀, 늦은 응답 무시·네이티브 재전송0, 기존 Android channel 확인값/origin/port/오류 정리. 공유 플랫폼 브리지의 실행 검증이며 iOS SDK 컴파일 완료로 대체하지 않는다.
- tools/check-ios-mobile.mjs 실제 앱 검증에8개 잘못된 호스트 메시지·알 수 없는 질의 owner 거절, 실제 C++2모듈/동기 Rapier/배치 위치·오디오/파일/배경 복귀, 새 bridge 진단을 연결한다. probe는 출력한 검사 프로젝트만 수정하며 배포 원본 Main.mm은 보존한다.
- CI는 실제 통과6537f3b C++/기반에 대한 이름별 source diff gate를 통과할 때만 공용검사를 재사용한다. 새 mobile-player·Main.mm·검사기 허용과 bridge 검사를 명시했으며 다른 공용 소스 변경은 전체 검사를 요구한다. Xcode 두 SDK·실제 시뮬레이터와 공용 모바일 출력은 이번 source로 다시 실행한다. 결과는 후속 기록한다. 새 장시간/에뮬레이터/원문 게임 반복검사를 추가하지 않는다.
- 사용자 설치는 검증 후 별도 불변 버전으로 갱신한다. 현재 c611c381db853f76과 열린 앱·이전 버전·게임 원본은 유지한다. 아직 이 수정으로60fps 목표를 달성했다고 기록하지 않는다.

- 첫 원격 run37481223712는 이전 기준 뒤 Windows 전용 파일 연결2개를 재사용 source gate에 넣지 않아 검사가 시작되기 전 중단됐다. Xcode/앱을 실행한 실패와 구분하고 로그를 보존한다. Mac 검사/모바일 컴파일 입력에서 사용하지 않는 native/desktop/HBEngine.cpp·tools/install-editor.mjs만 정확한 이름으로 허용한다. 공용 C++/worker/routing 변화에는 계속 전체 검사를 요구한다.

- 두 번째 run37481522265는 변경영역·공용모바일/C++출력을 통과했으나 simulator Main.mm 등록 호출이 reply 없는 addScriptMessageHandler로 되어 Xcode 컴파일에서 실패했다. Swift의 겹친 함수명에서 Objective-C selector를 잘못 옮긴 구현 오류이며 등록 API의 실제 Objective-C addScriptMessageHandlerWithReply로 수정한다. 실패는 SDK/앱 성공으로 계산하지 않는다. 원시 로그를 보존하고 위등록API 본문·SHA를 추가 보존한다.
- 재검사 비용 보완: 실제 통과6537과 byte diff gate에서 C++/프레임/채널/캐시/AI 입력은 불변이어야 하므로 그 검사를 다시 반복하지 않는다. 허용된 Renderer/metadata/시뮬레이션·픽셀검사 파일이 바뀔 때만 runtime-features/scene-systems/particle-renderers를 실행한다. 브리지/수명·실제 모바일출력/C++·두 Xcode SDK/앱 검사는 계속 요구한다. 기본 전체검사 경로는 그대로다.

- 세 번째 run37483164853은 두 Xcode SDK 컴파일·실제 앱 렌더/C++/물리 질의가 진행됐지만 게임 소리 검사를 실패했다. 10/120/240/360프레임 전부 audio idle/queued1/voice0였고 마지막480프레임도 같았다. 별도 WKWebView AudioContext decode2초/RMS·믹서 재사용은 정상이다. 반복 길이를 손상시킨 HTMLAudioElement 실험 결과와 실제 게임의 BufferedAudioPlayer 큐 상태를 혼동하지 않는다. 실패 결과는 성공으로 계산하지 않고 native/build/ios-bridge-37483164853-* 원본에 보존한다.
- 원인 경로: 공용 audioMusic은 unlocked 또는 navigator.userActivation.hasBeenActive일 때만 큐를 시작한다. 기존 native evaluateJavaScript 응답에 우연히 의존했던 활성화를 새 Promise 응답 계약으로 보장할 수 없다. 네이티브 모바일 호스트는 WKWebView mediaTypesRequiringUserActionForPlayback=None/Android 동등 설정으로 재생을 허용하므로 Player가 명시적으로 unlockAudio를 호출한다. resume Promise는 기다리지 않아 OS 잠금 시 BeginPlay/첫 프레임을 막지 않으며 실제 입력 해제·배경 suspend/resume는 기존 공용 서비스를 유지한다. PC·브라우저의 입력 잠금 정책은 바꾸지 않는다.
- WebKit 실제 구현의 evaluateJavaScript/callAsyncJavaScript 모두 forceUserGesture:YES이며 API 사이의 차이만으로 사용자 활성화를 영구 보장했다고 단정하지 않는다. [공식 구현](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm) 자체 1171–1185 및 mediaTypes 설정 적용 범위를 확인했다. 자료 자체의 전체 파일/관련 링크를 완료한 것으로 계산하지 않는다.
- check-player-lifecycle의 실제 Player 시작 줄을 실행해 mobile만 명시 호출·대기 중 resume가 시작을 막지 않음·PC 호출0을 확인한다. iOS 앱의 기존 2초 길이/최소4초 신호·반복·복귀 합격 조건은 낮추지 않는다. source gate에 실제 검사되는 player.js만 추가한다.

- 재사용 source gate는 Player 파일명만 허용하는 데서 끝내지 않는다. check-player-lifecycle이 검증한 기준의 Player 본문과 비교해 모바일 오디오 시작 두 줄 추가만 허용하며 다른 공용 Player 변경은 전체 검사를 요구한다.

### 2026-10-07 — iOS 직접 응답·게임 오디오 시작과 Android 새 패키지

- 실행 source bb36739, iOS run37485278400은 Xcode 기기·시뮬레이터 SDK/독립 iPhone SE3 앱480프레임·오류0을 통과했어요. WebKit Promise 직접 응답·callAsyncJavaScript 동기 Rapier 질의·C++2모듈/배치 위치 보존·잘못된 호스트 메시지8종/알 수 없는 질의 거절, Sprite Light cookie/볼륨·셰이더·한글/SVG·WAV2초 길이/최소4초 믹서 신호·배경 정지/복귀·BeginPlay 재실행0을 실제 앱에서 확인했어요. 실제 휴대폰/서명/가청 검증과는 구분해요. https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37485278400
- 이전 새 브리지 앱의 audio idle/queued1 실패를 보존하고, native 모바일 Player가 명시적으로 unlockAudio를 시작하도록 고쳤어요. 응답 스크립트의 우연한 사용자 활성화에 의존하지 않으며 OS resume Promise를 기다려 게임 시작을 막지 않아요. PC/브라우저 입력 방식은 그대로예요. check-player-lifecycle·check-mobile-bridge 및 실제 앱의 기존 오디오 합격 조건을 통과했어요. 실패3회는 성공으로 바꾸지 않았어요.
- iOS479측정 프레임 work 평균46.8977/중앙41/p95 77ms, simulation 평균45.7850/p95 75ms, 렌더 제출 평균.9791/p95 2ms이며60목표미달이에요. 보고 FPS14.3572는 배경 복귀가 포함된 이 검사 구간 값이며 전/후 CI의 실행부하가 통제되지 않아 브리지 개선률이나 회귀로 단정하지 않아요. 실제폰60을 확인한 결과도 아니에요.
- Android android-mobile-bQ34Wa에서 새 Player/bridge 소스 SHA가 APK·AAB에 실제 포함됨을 확인했어요. 두 CPU Java/DEX/JNI/C++·16KB ELF·정렬/서명·AAB/게임 원본 보존 통과, 기기설치/실행 없음이에요. APK SHAeb3bd0786171163111c957ce8bcec2f23a460d67503637492578717251b3ef07, AAB SHA6c6f401f1b8f8e29225385b11b5073a086bf37172d8bf5c26dadf0f4086caded예요. 기존 검증의 격리 게임을 재사용해 공용 C++ 검사를 반복하지 않았어요.
- 증거 native/build/ios-bridge-result-038.json·ios-bridge-37485278400-ios-acceptance.json·ios-bridge-android-038.json. 사용자 창/원본 게임·에셋·C++·검사기·프로필·기존 장시간 검사는 건드리지 않았어요. 전체 엔진/전체 문서 완료로 바꾸지 않아요.

- 2026-10-07 사용자 설치 완료: source ad5ca6f(실행 bb36739)/bundle5946523bdd1003b6, C:/Users/kirby/HBEngine/Versions/5946523bdd1003b6/HBEngine.exe. 1783파일/변경 실행·검사·문서15개 SHA 일치, 기존 c611 설치 manifest/프로필과 당시 adb14204 보존, 바탕화면 사용자용 바로가기 및 HKCU .hbproject 실행 경로 일치예요. 설치기에서 사용 중인 앱을 열거나 닫지 않았어요. 설치 전 기존 HBEngine 프로세스는 없었으며 다음 실행부터 새 버전이에요. 증거 native/build/ios-bridge-user-install-038.json. 이 뒤의 기록 커밋을 설치 실행 소스로 혼동하지 않아요.
