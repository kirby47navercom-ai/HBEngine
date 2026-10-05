# 2D 렌더·단축키의 실제 창 조사 — 2026-10-05

iOS37332792293/0b81d0e: 두 Xcode 컴파일·게임 실행 통과 뒤 Swift HTTP 진단60초 시간 초과. 최초 보고의 WK WAV 요청은 GET bytes=0-1/bytes=0-176443이고 duration약1.9마이크로초/time0. Swift 시작 출력이 없어 컴파일 지연과 AVURLAsset 로딩 지연을 구분하지 못함. 검사 도구를 시작/출력 보존·진단 오류 뒤에도 실제 오디오15표본 검사 계속·실패 시 마지막 보고 복사·전체 Content-Range/바이트 대조로 수정. 실제 신호/시간 검사의 조건과 앱 구현은 유지. 최신 설치본은 아직 업데이트하지 않음.

iOS37332059720은 진단 보고의 C++ AssetServer 메서드를 Objective-C 메시지 문법으로 호출한 오류로 컴파일에서 멈췄어요. `server->inspectMedia()`로 수정하고 실제 Xcode 재검증해요. 게임/디코더 가설 검사에 도달한 결과로 세지 않아요.

iOS37330057221: Xcode 앱 WAV SHA·HTTP 전체/0–1/44–4095/접미44 바이트가 원본과 일치했고 Apple afinfo도44100Hz/mono/Int16/176400 audio bytes/2초로 읽었어요. WKWebView만6.2마이크로초/time0/RMS 거의0이었어요. OS log show는 시간 초과돼 요청 로그를 확보하지 못했어요. 다음 진단은 실제 미디어 요청의 method/path/Range/Host/User-Agent만32개 한도로 앱 보고에 보존하고 Apple AVURLAsset HTTP duration을 대조해 HTTP 네이티브 디코더와 WK 재생을 구분해요. 전체 개인 헤더/쿠키·릴리스 진단·조건 완화는 추가하지 않아요.

iOS37328442455: AudioContext clock21.696→34.133초·readyState4/networkState1/error없음이지만 WAV duration0.000004053초·voice time0·master8.4e-45였어요. Windows ffprobe는 실제 패키지 WAV를 PCM16/44100Hz/mono/176444bytes/2초로 읽었어요. 아직 iOS 파일 전달/네이티브 디코더 원인은 확정하지 않아요. 다음 실행은 Xcode 앱 바이트 SHA·afinfo·HTTP 전체/미디어 크기 부분 응답을 먼저 대조하고 개발 구성의 실제 WAV 요청 헤더를 기록해 판별해요. 기존 오디오 시스템/AVAudioSession/시간 제한을 바꾸지 않아요.

iOS37326369196: 오디오 포함 게임은1080프레임/15draw·AudioContext running이었지만 voice time0/믹서 master5.3e-44여서 실제 신호 검사를 실패했어요. 컴파일/게임 성공으로 오디오를 통과시키지 않아요. 파일 요청/디코더와 시뮬레이터 오디오 시계를 구분하기 위해 context clock·media readyState/networkState/error/duration과 WebKit 오디오/미디어 로그를 추가해 다음 실행에서 확인해요. 아직 AVAudioSession·서버·음소거·루프 경계 어느 원인도 확정하지 않아요. 임의 지연/조건 완화나 다른 오디오 시스템 교체를 하지 않아요.

Windows release3ZuMaB: 실제 스프라이트/한글/믹서/마우스 C++ 발사·터치/접근성·480탄환 전부 이동·30초 이상/96재사용 통과. i3wHLE 대비 C++480 실행26.75→23.65/s(-11.6%)·작업p95 41.5→46.9ms(+13.0%)여서 기존10%회귀 게이트는 실패했어요. CPU 상위는 Three getParameters·증분world walk·physics sync이고 여러 구간이 함께 느려졌어요. 이 단일 표본으로 모바일 변경이나 외부 부하를 원인으로 단정하지 않아요. Android에는 기존 transport 보고에 RPC/질의/검증 시간을 추가해 비용을 분리하고 공용 portable/H6PL0Q 실제 두ABI APK/AAB 컴파일을 통과했어요. 원인 확인 후 최적화와 동일 조건 회귀 검사를 이어가요.

Windows player-acceptance-fAeMrQ는 터치 버튼 정렬 검사에서 멈췄어요. 스크린샷의 실제 글자는 중앙에 있었고, 검사 firstElementChild가 SVG 버튼 지원 이후 숨겨진 img를 읽고 있었어요. 실제 label span의 텍스트·보이는 폭·중심 오차를 검사하고 두 rect를 보존하도록 수정해 release 탄막 검사를 다시 수행해요. UI 정렬을 임의로 바꾸거나 오차 한도를 느슨하게 하지 않아요. Android 오디오 포함 CuEx4o/Riasyn은 실제 믹서 신호·background suspend·resume running까지 통과했어요. 활성 구간 4.5초 표본은 48프레임/9.84fps·작업p95 134.4ms이며 software GPU/가상 기기·매 Tick 두 C++ 물리 질의 조건이에요. 실물 모바일 성능으로 표시하지 않으며 비용 원인을 후속 분리해요.

Android v6YE5E와 iOS37323624672는 실제 매 Tick C++ 물리 질의 중 배경/복귀·Begin Play Count1/10 보존을 통과했어요. 독립 iOS 기기에서는 첫 실행도 통과했으나 기존 simctl 지연의 정확한 원인은 확정하지 않아요. bqMC2Q 동시 터치 실패는 검사에서 공백 키를 k.space로 비교한 오류였어요. k[" "]로 고친 v6YE5E는 동시 이동/공격·해제와 기기 종료/임시 폴더 정리까지 통과했어요. 실패 검사 동안 누른 입력이 계속돼 플레이어가 물리 범위를 벗어난 보고를 새 엔진 질의 오류로 세지 않아요. 잘못된 Range의 TypeError는 CDP 실제 net::ERR_REQUEST_RANGE_NOT_SATISFIABLE와 함께 확인했어요. 안전 영역 수정 후 화면에서 탐색 바와 공격 버튼이 겹치지 않아요. 오디오/활성 구간 성능은 별도 검사해요.

iOS37321490368: 두 컴파일은 통과했지만 첫 simctl launch180초 제한으로 끝났어요. 실패 로그에서 CoreSimulatorBridge→FrontBoard 요청 뒤 HBGame 프로세스 로그/실행 보고는 없었고 설치 등록 이벤트가 계속됐어요. 복귀 수정 검사에 도달하지 않았으므로 JS/C++ 수명 수정을 성공/실패로 단정하지 않아요. 기존 고해상도 기본 기기/Simulator GUI와 검사 상태를 분리하기 위해 SDK18.5의 독립 iPhone SE 기기를 생성·창 없이 부팅·종료/삭제하도록 검사 환경을 바꿔 재검증해요. 앱 코드나 시간 제한을 추가로 바꾸지 않아요. 시뮬레이터 서비스 지연이라는 가설은 다음 실행으로 확인해요.

Android ScZlRB는 실제 첫 프레임/배경18초/복귀와 C++ Count 보존·메모리 수집 뒤 검사 가상 기기 종료 대기7초가 기본20초보다 짧아 최종 정리에 실패했어요. 실제 기기는 그 뒤 종료됐고 데이터는 지우지 않았어요. 종료 대기를30초로 고쳤어요. 화면에서 탐색 바가 공격 버튼을 가린 문제는 WebView 자체 padding이 HTML 콘텐츠를 줄이지 않는 원인이어서 FrameLayout 부모에 시스템/화면 잘림 inset을 적용했어요. 수정한 Java 포함 APK/AAB Y9F6Lt 전체 빌드는 통과했어요. o4hSId는 UI 안전 영역/한글/SVG·일반/동시8개/유효 Range 뒤 invalid Range의 fetch가 TypeError여서 중단됐어요. Chromium의 stream URL loader가 잘못된 Range를 net::ERR_REQUEST_RANGE_NOT_SATISFIABLE로 거절하는 경로와 대조하고 실제 CDP 오류 코드를 수집해 검사해요. 416을200으로 바꾸거나 일반 네트워크 오류를 통과시키지 않아요.

수정 후 Android android-mobile-lSxvr1 전체 검사 exit0: 실제 두 ABI JNI/C++·Java/DEX·16KB ELF·APK 서명/정렬·AAB·ZIP 에셋/한글·원본 보존. CmRimg 마지막 실패는 bundletool stdout와 JDK25 stderr 경고가 합쳐져 앱 ID 비교가 실패한 검사 오류였고 실제 manifest 마지막 줄로 비교해 해결했어요. 런타임 검사는 별도예요. JS 브리지/Player 수명과 정확한 Android production 시계/범위 메서드의 가상 시간 검사를 통과했고 iOS 실제 복귀를 재검증해요.

37317957491은 SDK18.5에 맞는 시뮬레이터로 실제 두 컴파일·첫10프레임/15 draw call·C++ 두 모듈/물리·전체/동시8개/앞·뒤 범위/외부 파일 거절을 통과했어요. Safari 시작 88초 뒤 background 보고가 `모바일 호스트 응답 시간 초과`로 바뀌었어요. bridge의 15초 타이머가 OS 비활성 시간을 포함하고 있었어요. 요청/응답을 버리거나 Begin Play를 재실행하지 않고 활성 시간만 제한하도록 수정해요. JS visibility와 네이티브 수명 이벤트를 같은 경로로 연결하고 네이티브 물리 질의의 10초 대기도 활성 시간으로 검사해요. 실제 재검증 전에는 복귀 통과로 세지 않아요.

Android PnRTQU는 APK 정렬/서명·AAB 패키지 검증을 모두 마친 뒤 에셋 경로 검사에 실패했어요. 실제 jar 목록의 APK는 `assets/Content\\Assets\\...`로 Windows 구분자를 포함했고 AAB는 `/`로 정규화됐어요. aapt2의 -A를 사용하지 않고 기존 Java jar로 assets 디렉터리를 넣어 모바일 논리 경로와 ZIP 이름을 일치시켜 다시 검사해요. 기존 리소스 압축/정렬을 유지하며 런타임 주소를 우회하지 않아요.

Android SDK/NDK 설치·공식 체크섬·수령 기록을 완료했어요. 첫 전체 검사 3o2bX2는 파일 목록의 없는 file 필드를 읽던 검사 오류였고 프로젝트 resolve(path)로 수정했어요. 동일 격리 fixture를 재사용한 다음 실제 Java/DEX·ARM64/x86_64 C++/16KB ELF는 통과했지만 aapt2 compile이 한글 절대 res 경로를 열지 못했어요. 같은 디렉터리가 존재함을 확인했고 상대 Android/res 입력으로 같은 aapt2가 366bytes 리소스 zip을 컴파일했어요. 실제 aapt2/zipalign 경로를 작업 폴더 기준으로 바꾸어 APK/AAB 전체를 재검증해요. 아직 패키지 전체 성공은 아니에요.

37316212354: 고정 읽기 작업자 변경은 실제 Xcode 두 대상 컴파일을 통과했어요. 시뮬레이터 부팅 87초/설치 약59초 뒤 첫 `simctl launch`가 180초 시간 초과됐고 실행 보고는 없어요. 외부 SVG 요청에는 도달하지 않았으므로 이전 EPIPE 가설의 통과/실패로 세지 않아요. Xcode SDK와 맞는 설치된 iOS 런타임을 우선 선택하고 명령 시작·사용한 목록/SDK·실패한 앱 로그/충돌 보고를 보존해 재검증해요. 실행 지연 원인은 아직 미확정이에요.

주인님이 Android SDK 이용약관에 명시 동의했어요. SDK/NDK 설치를 시작했으며 완료/전체 앱 빌드 결과는 후속 증거가 필요해요. Java 부분 범위/스트림 최종 o0g5RD가 통과했고 이를 실제 APK/AAB까지 연결해 검사해요.

최신 iOS 37313665459: 축소 패키지는 Xcode 두 대상 컴파일·시뮬레이터 첫 10프레임/15 draw call·C++/Rapier 질의를 통과했지만 외부 첫 SVG 요청이 약 3분 뒤 EPIPE로 실패했어요. 앱 전환/복귀와 화면 캡처 단계에는 도달하지 않았어요. 기존 단일 읽기 서버에서 빈 WebKit 연결이 뒤 요청을 막는 가설을 8개 고정 읽기 작업자로 검증해요. 요청 제한 15초·동시 SVG 8개 검사를 추가했고 아직 실제 Mac 재검증 전이에요. 종료/생성 실패 자원을 정리하며 작업자는 듣기 소켓 값을 고정해서 종료 중 변수 경합을 피하게 해요. 같은 요청이 다시 실패하면 가설을 확정하지 말고 앱 활성 상태/서버 수명 로그를 먼저 확인해요.

Windows 최신 후보는 격리 설치 q8Ag9v의 불변 버전 재사용·두 프로젝트/프로필/서버 분리·원본/종료를 통과했어요. 배포 폴더 실제 물리 검사는 기존 수 136을 확장된 144로 갱신해 통과했고 형상 67개도 통과해요. 주인님 설치본은 업데이트하지 않았어요. Android SDK 약관 답변을 기다리며 실제 APK/AAB는 미검증이에요.

모바일 에셋 주소 수정 후 37311864792가 실제 iOS 컴파일·10프레임·15 draw call·C++ 두 모듈·Rapier 질의·한글 HUD·SVG 화면을 통과했어요. 앞선 0프레임 실패는 이미지 로더의 PC용 주소였어요. 패키지 축소 첫 Windows 검사 jb0mg3은 Three package.json 누락으로 Node 서버가 종료됐고, exports 메타데이터를 포함해 dJEqQD의 실제 Player·C++·GPU 검사를 통과했어요. 후속은 iOS 백그라운드·복귀 검사예요. Android SDK 약관 답변은 대기 중이며 설치본은 보존해요. 상세: [모바일 출력](docs/MOBILE_EXPORT.md)

## 최신 우선순위: 모바일 배포·검증 후 사용자 업데이트

주인님이 Android/iOS 실제 내보내기를 먼저 만들고 검증한 다음 사용 중인 설치본 업데이트를 명시 승인했어요. Mac/Xcode는 없다고 답했어요. Android SDK/NDK/Gradle/adb는 아직 없고 JDK25가 있어요. Android 실제 APK/AAB 및 공용 C++/BP 실행 연결, iOS Xcode 프로젝트/실행 연결을 진행해요. iOS 빌드/서명·실제 휴대폰 실행은 증거가 있을 때만 통과로 세요. 이전 설치본/프로필/게임/실행 창을 보존하며 새 불변 버전을 추가하는 설치 도구를 사용해요. 전체 누적 엔진 세부·가벼움·AI 편집을 이후에도 계속해요.

Freeform 구현/검증은 docs/2D_LIGHTING.md 후속에 기록했어요. shapePath64·512bytes/광원·C++/BP3개→594/API289·공용 모양 편집/방향키·장면/BP Undo·뷰포트 진단/조명 표시·Editor bdfWUZ와 Player e7Whrs GPU93/전용44·원본/exit0/서버 정리 통과예요.

새 ShadowCaster2D/Composite 공식4개 자체 기술 본문/API 읽기는 native/build/2d-shadow-docs-jVDrut/manifest.json 원문/SHA에 있어요. 이미지/상속/연결은 미독이며 구현하거나 전체 gate를 승격하지 않았어요. Android build/NDK/Apple Xcode 새 웹 탐색은 모바일 구현을 위해 계속 읽는 중이에요. 최종 답변/goal complete 금지 지시를 유지해요.

## 전용 Light2D 실제 창 후 계속

최종 실제 Editor heP5Hg/배포 Player CfFWyo는 GPU77개(전용28)·레이어/Z/노멀/타입/3D분리·마스크/타일·C++→BP핀·원본/종료를 통과해요. 증거/재현은 [Light2D](docs/2D_LIGHTING.md)예요. Px56Mb 종료는 검사용 BP 미저장 확인창이었고 저장 검사로 통과해요. hx7NHK의 노멀 Disabled 실패는 Actor 레이어 복원 누락, g5f51U는 scene.place.result.object 응답 경로였어요. 해당 검사들을 고쳤어요. 앞선 slice 출력 okKqXQ의 한 번 실패 원인은 여전히 확정하지 않아요. 사용자 설치/게임/창은 보존해요. 전체 구현을 계속해요.

## 2D 표면 실제 GPU 조사 — 검증 후 계속

- sBuiuu의 opaque alpha 검사는 PNG/canvas에서 알파0 픽셀 RGB가0이 되는 조건을 빨강으로 잘못 예상했어요. Epic Paper2D 본문도 투명 배경의 불투명 표면이 검정으로 채워짐을 설명해요. 초록 배경을 써서 discard/불투명 검정을 구분하도록 검사 기대값을 고쳤어요.
- jJ71fw의 방향 광원 그림자 실패는 Three WebGLShadowMap.getDepthMaterial이 customDepth/customDistance에도 color.alphaTest를 복사해 반투명 표면의0이 그림자 .5를 덮던 문제예요. onBeforeShadow에서 기준을 복원했고 Editor XORaAp/Player v29dli의 방향228/0/228·점229/0/212 픽셀이 통과해요.
- 직접 C++/BP 표면 쓰기 후 같은 호출 조회는 통과해요. asset-registry 검사의 최초 파일 rename 기대는 기존 redirect 계약을 재작성 계약으로 오해했어요. normal 참조의 redirect 해석/의존성과 프런트 재작성은 각각 확인해요.
- Editor XORaAp의 물리 키/Undo·노멀 미리보기·분할 상속/저장·GPU49개, Player v29dli의 BP→C++→BP 핀→C++·배치 위치·실제 표면·Source normal cooking·같은49개·예외0·원본/exit0/서버 정리가 통과해요. PNG를 직접 확인했어요. GPU Editor gVRxKE도 통과해요.
- okKqXQ 한 번의 두 번째 slice 출력 실패 원인은 미확정이에요. 독립 loadRequest/토스트 기록을 포함한 XORaAp에서 같은 과정은 통과해요. Player sLPgVT는 handshake 전 shell 증거 순서, xxymzZ는 검사 nativeFields/실제 nativeProperties 차이였고 수정한 v29dli가 통과해요.


## 몽타주 구간 알림·작업 범위 후속

- 최종 Editor wYidzz/Player Oa3qxq: 2D/3D typed→BP→C++·Montage Begin/Tick/End·Seek/Stop·native Timer/BP Delay 취소·원본/exit0/서버 정리가 통과해요. Editor5/5·2/2, Player3/3·1/1과 지연 호출0/work 비움을 확인해요. wYidzz montage-notify-authoring PNG에서 별도 구간 줄/손잡이를 직접 보았어요. 공용 Graph Notify 실제 Player0JF4lu도 통과해요.
- 첫 코어 Pause 검사에서 점 알림 PauseNow가 재개 후 중복됐어요. 실제 알림을 계획한 뒤 initial 플래그를 콜백 전에 소비하도록 고쳐 Pause·Begin/끝 Pause·기존 활성 범위 재개를 확인해요. 범위 계획/전달을 구분하고 취소한 Begin에 End를 보내지 않아요.
- 실제 WIb5vj의 Model 위치 [3,-2,0.10000000149]와 [3,-2,.1] deepEqual 실패는 새 typed C++ 왕복으로 드러난 Float32 관측 차이예요. 위치 검사1e-6 허용오차로 k5aheb 통과 후 Sprite typed/실제 스크롤/우클릭을 포함한 wYidzz를 다시 확인했어요. 제품의 시작 위치나 사용자 데이터를 바꾸지 않았어요.
- End 콜백 하나의 오류 뒤 다른 End/Ended 시도·작업 정리, End에서 새 몽타주 시작, 그룹별 수명/연속 섹션/반복/최소 가중치/배속을 코어로 검사해요. 사용하지 않는 큐/처리기 생략은 비용 제한이며 전체 FPS/모바일 성능의 근거가 아니에요.


## 공용 타임라인 검사 후속

- 실제 Editor xyFptU와 배포 Player cxsjYq: 프레임/키·단위·C++ 몽타주/시퀀스·별도 preview/runtime 시간·원본/복원/exit0/서버 종료가 통과해요. xyFptU timeline-live/sequence-live PNG를 직접 확인했어요. 코어 check-gameplay-timeline은 유한/범위·30/60fps·경계·256×1024키·종료/반복을 확인해요. 전체 FPS/모바일/정밀 포즈 복제의 근거가 아니에요.
- Editor8VGE8R는 검사 fixture의 새 Sequence Seek F와 기존 Root Graph Pause F 충돌이었어요. steps.log의 send F에서 실패했고 시퀀스 시작 전 Seek가 호출됐어요. fixture를 U로 분리한 뒤 다음 실제 실행이 진행됐어요.
- Editor1GboTU는 document.querySelectorAll이 Dock parking의 숨은 다른 문서 재생선까지 읽어 실패했어요. Dock-layout의 parking.hidden/DOM 이동을 확인하고 검사 선택을 .gameplay-editor.active로 한정해 xyFptU가 통과했어요. 제품의 재생 시간을 바꾸지 않았어요. timeline-live.json은 assertion 전에 보존해요.
- check-editor-api.mjs의 인자 없는 실행은 기본127.0.0.1:5181 ECONNREFUSED로 시작하지 못했어요. 사용자 서버/창을 켜지 않았어요. schema/원자적 편집은 check-engine-integration과 격리 actual Editor 명령으로 확인했어요.

## 중단 혼합 검증·관측 타이밍 후속

코어 지정 Stop 시간/일시정지/linear·smooth/재호출 단축·연장 방지/불법 입력/후속 Notify 억제/Ended·콜백 오류 정리/전체 Stop 중 새 인스턴스 보존이 통과해요. 최종 Editor HrVBQs/Player DyhJfk의 C++/BP 중간 뼈/가중치·다른 그룹·기본 포즈 복원과 Ended bool→사용자 C++·원본/exit0/서버 정리도 통과해요. HrVBQs montage-stopping.png에서46%/중단 중을 확인해요.

Player DeCJSA는 native Float32 직렬화0.10000000149를 정확0.1과 비교한 검사 실패였어요. 오차1e-6으로 검사해요. Editor uWogIX/FSM6Sx의 중간 weight timeout은 제품 실패로 단정하지 않고 investigate-first로 추적했어요. FSM6Sx montage-fade-trace.jsonl의 첫 전체 그룹 기록→2.9초 뒤 이미 Upper 없음/Ended3/기본 뼈 복원과 connectAutomation500ms 왕복을 대조했어요.1초 fade를 키 down/up+state 왕복 뒤 관측하던 검사 타이밍 문제예요. fixture를5초로 VQ5XDx와 UI 보강 후 HrVBQs에서 중간/종료를 통과했고 짧은 혼합은 코어로 별도 증명해요. polling/제품 시간은 바꾸지 않아요. StopGroup 개별 web URL 실패/직접200 HTML의 미확인 본문도 연구 미독으로 남겨요. 사용자 설치/창/게임은 보존해요.

## 몽타주 슬롯 실제 실행/회귀 후속

실제 Editor BAKSDk/Player juVNeC에서 C++ 두 그룹·그룹 BP 조회→사용자 C++·중지/Interrupted·기본 뼈/2D 프레임 복원·배치 위치·원본/exit0/소유 서버 정리가 통과했어요. Editor 슬롯 속성/Undo·AI 불법 슬롯 거절·우클릭 복제/추가/Undo·독립 미리보기 PNG를 확인했어요. 코어 비동기 교체/Stop/세계 종료·실패한 바인딩 결합 뒤 이전 재생 유지·Notify Seek/Stop 취소·Quaternion/비활성 문맥 확장·독립 혼합도 통과해요. 작은 비용 vHTl4m와 startup-IIW7qZ는 별도 근거예요.

초기 코어 해제 후 poseBuffers Set3개가 남는 실패는 dispose에서 비웠어요. 뒤따른 libuv UV_HANDLE_CLOSING abort는 원인 미확정이며 엔진 원인으로 단정하지 않아요. Editor Y3ioe0은 dryRun 오류를 valid:false로 기대한 검사 오류로 실제 rejection 기대를 고쳤어요. iNDAIx는 화면 밖 밴드의 우클릭 검사 좌표를 scrollIntoView로 고쳤고 UV2ZK3 context 증거를 남겼어요. UV2ZK3/N15DER의 Idle 누락은 실제 공통 클래스 MeshRenderer 기본값이 장면의 모델을 덮은 문제였어요. installBlueprintComponents의 이전 기본 스냅샷/개별 속성 대조로 수정하고 상속 변경·명시적 모델/머테리얼 유지·startup·scene을 검사했어요.

Player jV4KRW의 Unexpected '<'는 검사 SpriteRenderer에 Sprite JSON 대신 SVG 텍스처를 지정한 오류예요. 정식 Sprite 에셋을 만든48wKLs/juVNeC가 통과해요. scene-runtime의 hooks.mesh 없는 headless Tick 실패는 공통 null mesh 훅으로 수정하고 컴포넌트57종/2D·3D 물리/프레임워크/스프라이트 회귀를 통과했어요. 초기 TNA1Ne PNG의 높은 preview/잘린 timeline은 선택 Actor preview와 flex/scroll 배치로 수정한 BAKSDk PNG에서 확인했어요. 최신 작은 바인딩/수명 보강은 코어/최종 Player로 보강했고 Editor의 활성 VM 의미 경로를 유지해요. 사용자 설치/게임/창은 변경하지 않았어요.

## 혼합 샘플 알림 정책 검증 후속

1D/2D3모드·동률/최소 가중치·중첩/공유 경로·포즈/리더/시계 유지·구간 filtered End/새 Begin·legacy/불법 필드·all 추가 Map 생략 코어가 통과했어요. 실제 Editor R6GRXh/Player IZGIm1은 인자 알림→사용자 C++, 중지 뒤 Begin/End7/7·3/3 및 원본/exit0/소유 서버 정리 후 acceptance를 남겨요. 마지막 null 검증/all 불필요한 승자 계산 제거는 코어로 확인했고 실제 highest 경로는 유지해요. runtime·첫HUD/배치 위치 l3JCs9·작은CPU QiFMpW는 별도 근거예요. 사용자 설치/창/게임은 보존해요.

## 두 축 Blend Space 검증 후속

초기 코어의 [.5,.2,.3] deepEqual은 실제 [.5,.19999999999999996,.30000000000000004]를 오류로 센 시험 문제였어요. 허용오차 비교로 수정했고 삼각/64샘플·방향/반지름·보정/순환·독립 상태·동기화/알림·2D/뼈 검사가 통과했어요. zlWrBz/xQGZET 실제 Editor와 XaWTs8/최종ZBmccm release Player가 원본·exit0/소유 서버 정리 뒤 acceptance를 남겨요. xQGZET는 차트 변하지 않으면 DOM 변경0을 검사해요. 마지막 공용 누적기 임시 객체 제거는 코어/Player에서 확인했고 기존 Direct 회귀도 통과했어요. 작은CPU xGaboc·시작 위치/첫HUD DAf2Xd는 별도 근거이며 전체 모바일/FPS로 확대하지 않아요. 실패/사용자 설치/게임/열린 창은 보존해요.

## 구간 알림·자료형 인자 검증 후속

hwMQC9는0길이 패치를 엔진이 거절했으나 시험 정규식에 실제 '에셋 규칙' 문구가 없던 실패예요. 초기 코어의 Run 알림 시각/.variables 호출도 시험 오류였어요. Editor eVqdu5는 실제 C++/BP/범위/Stop/정상 종료가 통과했지만 PNG의 두 범위 이름이 겹쳤어요. 별도 줄/스크롤로 고쳐 최종 toxXVX의 실제 드래그/손잡이/자료형/Undo/AI·가독성·C++/BP·원본/exit0/서버 정리가 통과했어요. Player xp4juH도 성공 근거예요.

check-runtime64줄의 직접 모델 재생은 비활성 VM에서도 기존에 지원하던 경로인데 새 current()의 vm.active 조건이 재생을 취소해 위치0/기대1로 실패했어요. 요청 ID·VM generation·Actor 동일성·정리 상태 검사로 바꿔 해당 경로와 실제 C++→BP 회귀를 통과했어요. 뒤에 나온 Windows libuv UV_HANDLE_CLOSING abort의 별도 원인은 특정하지 않았고 단언 실패와 구분해요. 마지막 호환 수정은 코어로 확인했으며 실제 EXE의 활성 VM 경로는 그대로예요. y2IMwg 첫 프레임 HUD/위치, dCTpO4 소규모 CPU 비용도 별도 근거예요. 설치본/게임/사용자 창과 실패 근거를 보존해요.

## 동기화·마커·알림 검증 후속

03R2Wq는 fixture에서 BP 노드의 key 대신 type을 조회한 시험 오류였어요. yT66QH/LzRgFC는 타임라인 SVG가 전역 .gameplay-properties svg의14px 규칙에 눌린 실제 UI 오류예요. 전용 selector로110px 타임라인/100px1D 차트를 복원했고 키 글자 stroke도 해제했어요. 0jrO4q는 정수 마우스 픽셀로 놓은 실제0.4041s와 이상적0.4s를 섞은 시험 오류로, 실제 dispatch 픽셀의 변환 시각을 단언하도록 고쳤어요.

최종 Editor I2DJmg에서 실제 키 드래그·ArrowLeft/Delete(노드 보존)/Undo·우클릭·스크롤220 보존·AI/미리보기/C++/BP/notify→C++·뼈/GPU·pause·원본·exit0/서버 정리가 통과했어요. Player wkAJuF도 exit0/서버 정리 후 acceptance.json을 확인했어요. 역할이 완전 가중치가 된 뒤 blend-out 중 그룹 참여를 유지하는 경로는 마지막 코어 보강으로 검사했어요. 작은 CPU OP3EhY·실제 startup-state-TaqWsk도 별도 양의 근거예요. 실패/사용자 창/원본/설치본은 보존해요.

## 포즈 상태·전이 검증 후속

코어에서 중단 직전 output 버퍼가 다음 evaluate의 기준 포즈 초기화로 덮여 포즈가 튀는 오류를 발견했어요. 직전 결과의 별도 재사용 버퍼로 고쳤어요. 자기 재진입은 초기화 전 포즈를 보존하고 상태 총 가중치1을 유지해요. 명령 CrossFade의 시간을 현재 상태 일반 전이가 덮는 경로는 Any State만 명령 중단 후보로 검사하도록 고쳤어요. 공유 DAG 관련성은 memo를 사용하고 확장 문맥2048에서 멈춰요.

yvF6O9는 상태 그래프가 이미 열린 후 top 포즈 그래프의 data-as-open을 찾은 시험 오류였고 Runtime 오류는0이에요. 존재할 때만 여는 검사로 고쳤어요. 첫 실제 FhGHFR/ATRGWQ는 callback fixture 보강 전이에요. ZAPOEh/Y1zo4q에서 AttackEnter→사용자 C++ StateEntered까지 검증했어요. w0buaQ는 stdout/stack/failure.json 없이 exit1인 실행이며 원인을 특정하지 않아요. 단계/프로세스 exit/uncaught 기록을 보강했고 새 Y1zo4q의 exit0/서버 정리 후 acceptance.json을 따로 확인했어요.

상태 삭제의 소유 노드가 외부 상태/출력에서도 쓰이면 보존하고 잘못된 scope만 해제하도록 고쳤어요. core 공유/비공유 삭제·원본 검증·Undo용 데이터 검사가 통과했어요. 최종 실제 Editor veTo8X에서 사람 상태 생성→삭제→Undo 두 번, C++/BP/미리보기·원본·exit0·서버 정리까지 통과했어요. 사용자 설치본/창/게임 원본과 실패 폴더는 보존해요.


## 2D IK 실제 창 검증 후속

sprite-ik-editor-X8VtdL는 Limb의 중간 뼈 분할로 체인이4개가 되는데 성공을 기대한 시험 오류예요. 코드는 명시적으로 거절하고 원본을 보존해요. 테스트를 거절/보존 단언으로 고쳤어요. 솔버 종류를 자동 변경하지 않아요.

sprite-ik-editor-viukij는 리그 body를 display:contents로 바꾸면서 전역 .workspace-view.active의 display:flex가 전용 grid를 덮어쓴 실제 UI 회귀예요. stage가 작아져 휠 단언도 실패했어요. active/detached 리그 전용 selector를 강화하고 최종 wbOkUc에서 패널 높이·물리 이동/확대·IK 목표 드래그·읽기 전용 실제 뼈/목표 값을 검증했어요.

최종 Editor wbOkUc와 release Player jYGbhc의 acceptance.json은 기능 단언·원본 보존·exit0·서버 정리 이후 작성돼요. 오류 배열0·첫 Tick 전 한글 HUD·초기 위치·C++12개·BP 변경·headless 실제 솔버 포즈 대조가 통과했고 Player GPU 마젠타 픽셀4704개와 PNG를 확인했어요. 7CELia/jgZhGD는 추가 목표 회전 함수2개 전의 근거로 구분해요. 모든 실패 폴더를 남기고 사용자 설치/창/원본은 건드리지 않았어요.


## 시작 위치·HUD·2D 리그 검증 후속

원래 게임을 읽기 전용으로 확인했어요. BP_TopDownShooter의 변경 없는 예전 Construction setPosition이 원점을 덮는 경로와 C++의 frame<2 HUD 우회를 확인했어요. 원본/사용자 설치본은 수정하지 않았어요. 새/예전/명시적 Construction 및 C++ 첫 Tick 전 UI를 따로 검사해요.

startup-state-TnhpL3는 .1과 C++ float32 .10000000149의 엄격 동등 검사 실패였어요. 허용 오차와 원점/명시 이동 단언으로 고쳐 최신 r7TDDl가 통과했어요.

sprite-rig-editor-O7QsiA PNG에서 큰 SVG 툴바를 발견해 16px로 고쳤어요. 9A0bkm는 CDP test selector 문자열 따옴표 실패이며 JSON.stringify로 고쳤어요. 717d3E는 기능 단언은 통과했으나 종료가 지연됐어요. scene 배치 Undo 후 dirty가 남아 저장 확인을 기다리는 경로였고 restoreEdit에서 저장 기준과 대조하도록 고쳤어요. 이 폴더 acceptance.json의 ok는 종료 전 작성된 잠정 값이라 전체 성공으로 계산하지 않아요. 새 검사 도구는 종료/서버 정리 후에만 ok를 쓰고 실패를 failure.json에 기록해요.

최종 Editor4pSQeG에서 물리 뼈 생성·포즈 키·휠/이동·AI dryRun·Undo/Redo·배치 Undo 데이터/dirty·실제 C++ 첫 프레임 HUD/시작 위치·실행 중 실제 뼈 값·BP Reset·원본/정상 종료/서버 정리가 통과했어요. 최종 PNG를 확인했어요. release PlayerkFFO2l의 실제 GPU 변형 정점/4704 마젠타 픽셀·한글 HUD·정상 종료는 별도 양의 근거예요. 코어XvfOcd에서 SpriteSkin.rig 폴더 rename도 검증했어요.


## headless 모델 포즈 후속과 CUBICSPLINE 수정

첫 임시 probe의 상대 .hbproject 경로는 기존 absolute 계약을 위반해 실패했고 probe를 path.resolve로 고쳤어요. 첫 apply_patch의 같은 파일 Delete/Add 중복은 검증 단계에서 거절돼 변경되지 않았어요.

headless-model-FXKdYD에서 CUBICSPLINE Bone.position 바인딩이 실패했어요. glTF track의 getValueSize는 탄젠트 포함9, interpolant 실제 출력은3이므로 공용 AnimationGraphPlayer가 interpolant.resultBuffer.length를 쓰도록 수정했어요. 단위 PLJm3l/CwArCG, 이전 Player 대조 nPuaWe 및 새 CUBIC Player 대조 VKait2가 통과했어요.

첫 CUBIC Player oKnHjs 실행은 명령 exit1만 남고 진단/acceptance가 없어 통과로 세지 않아요. 재실행 FSFCTK와 실제 Editor f5atg7는 모든 assertion/원본/정상 종료/서버 정리가 통과하고 PNG를 확인했어요. oKnHjs의 정확한 실패 원인은 확정하지 않았어요. 실패 폴더를 보존해요.

전역 ProgressEvent shim/전체 buffer의 data URI 변환 시도는 실제 경로에 남기지 않았어요. 포즈 bufferView lazy 플러그인으로 읽고 정점/텍스처를 생략해요. 전체 파일 형식/확장/시각·음향/모바일 성능을 검증했다고 표현하지 않아요.


## 애니메이션 그래프의 검사·미리보기 보강 근거

2026-10-05. test fixture 첫 assembler의 문자열 줄바꿈/출력 변수 이름 충돌은 실제 EXE 실행 전에 수정했어요. fEL3Se의 AI patch를 잘못된 op=set/dotted path로 작성해 실패한 부분은 기존 replace/JSON pointer 규약으로 수정했어요. yM3zev의 가중치 차트 클릭0은 속성 스크롤 밖 좌표여서 실제 scrollIntoView와 chart-hit 증거를 추가했고 이후 물리 차트 .5가 통과했어요.

단위 의존성 검사에서 기존 model 참조 누락을 발견해 ProjectService referenceKeys에 model을 연결했어요. 사전 취소된 그래프는 아직 debug publication이 없는 상태로 dispose될 수 있어 guard를 보강했어요. 순환뿐 아니라 공유 DAG의 긴 경로도 height memo로 거절해요. 테스트 안의 미완료 pending clip lookup은 제거하고 실제 await되는 Reference 그래프 취소 검사를 사용해요.

B6eEdQ PNG의 중복 바깥 패널/작은 그래프와 이동 후 화면 밖 큐브·부분 모델은 기능 assertion 통과와 별개인 UI 결함이에요. 전용 전체 폭·왼쪽 미리보기·적용 포즈 후 bounds·루트 카메라 추적으로 고쳤고 fAgxU4 PNG에서 읽을 수 있는 노드/큐브/두 삼각형을 확인했어요. 초기 glTF inverse bind 행렬 순서도[-2,-3,0]으로 보강했어요. 실제 Editor fAgxU4/Player72pITM은 양의 근거예요. headless의 imported skeletal pose·실제 bind pose/normalized sync·IK/retarget/root motion/다중 슬롯과 전체 잔여는 미검증/미구현으로 유지해요.


## 조건 감시·하위 트리 후속

- 여러 AND 조건의 첫 감시 검사에서 아직 실행하지 않은 두 번째 조건의 변경을 놓쳤어요. 진입용 데코레이터 연결의 조건도 등록하고, 모두 유효할 때만 낮은 분기를 중단하게 고쳤어요. Observer 네 모드·결과/값·무관한 키·Abort→Start·병렬 정책 검사를 통과했어요.
- 정적 subtree root 조건은 실패한 자식 인스턴스가 없어도 부모 감시에 남아야 해요. private root guard 관측을 부모에 연결하고 active Self 중단은 자식이 맡아 중복 Abort를 막았어요. 첫 보강 검사에서는 관측/교체 후 새 자식의 최초 interval을 기다려 핸들이 비어 있었어요. 최초 검색을 첫 Tick에 즉시 수행하도록 바꾸고 regression/실제 키로 확인했어요.
- Editor TlzUUV는 명령 클라이언트 연결 전 API 호출한 fixture 실패예요. 소유한 서버의 automation 클라이언트1개를 기다려 시작하고 J7JXNQ에서 통과했어요. 루트 조건까지 보강한 최종 frpx7w/xXOLLQ는 E만으로 Idle 유지, R로 교체, 내부 C++ 완료·지연/native Timer 취소·원본/종료를 확인했어요. 원래 실패를 성공으로 세지 않아요.
- 화면 없는 실행 경로에도 scope 전달과 native callback의 owner/scope 처리가 필요했어요. runProject를 공용 nativeTimers로 바꾸고 같은 실제 Player 시나리오200프레임과 기존 headless 회귀로 확인했어요. headless를 화면/음향 검증이라고 표시하지 않아요.

## 행동트리 태스크 수명 실제 창 후속

- Editor uWmdbi의 1초 Delay 이후 위치99는 완료 전 이미 Delay 시간이 지났을 가능성을 구분하지 않은 검사였어요. HfOa2i에서 3초로 늘려도 before 시간2.19/after6.21 사이 예약 시간이 지나며, 진단 필드를 editor.state에만 넣고 runtime.state에서 찾는 fixture 실패도 있었어요. 실패를 엔진 취소 오류의 증거나 성공으로 세지 않아요.
- runtime.state에 읽기 전용 work 관측을 연결하고 Editor30초 pending Delay의 owner/scope/at를 먼저 확인한 뒤 완료 후 목록 제거를 검사했어요. UTy7TI에서 scopes/delays0·재실행을 통과했어요. release hX5zX9는 3초 Delay를 실제 키로 완료하고 예약 시간 이후에도 위치0을 확인했어요.
- C++ Timer를 추가한 fixture의 첫 두 실패는 같은 실행 출력에서 두 개 연결을 만든 그래프 검증 거절, 다음은 CDP seq와 노드 seq의 변수명 충돌이에요. 제품 검증기를 완화하지 않고 BP Sequence first/second와 별도 fanout 이름으로 수정했어요. 최종 wJK2Gz/2wt1oc는 BP Delay와 C++ Timer를 모두 포함해 통과했어요.
- 초기 Behavior lifecycle 검사 변수의 array:false는 현행 container:single 형식을 사용하지 않은 fixture 실패였어요. 수정 후 실제 VM 두 수명의 같은 Delay 독립성·취소·Timer/Timeline, 실제 C++ 완료/소유자/scope 타이머·stale 콜백을 검사해요. 제품 C++ 타이머의 소유자 방송 문제는 owner/scope 콜백과 worker prune·VM 검증으로 고쳤어요.
- 전체 Unreal/Unity 문서/API gate·모바일 물리 기기·전체 엔진 완료로 확대하지 않아요. 원자료는 삭제하지 않고 주인님의 설치본/프로필/게임 원본/창은 건드리지 않았어요.

## UI SVG·배율 후속 — 2026-10-05

계층 FSM의 JVfjVp/PAXEDY 더블클릭 실패는 stable ID 연속 포인터 판정으로 수정했고 최종 w2eNXC 실제 창에서 통과했어요. 작은 이동을 Undo로 만들지 않고, 중간/우클릭은 헤더에서도 이동하며 pointercancel은 두 번째 클릭으로 세지 않아요. nKNFO8의 상태 서비스 실패는 `target:'self'`를 문자열 그대로 lookup하던 공용 서비스가 원인이에요. 바인딩 소유자로 해석하고 null/누락/self 회귀와 실제 키 BP→FSM을 검사했어요. JVE8LS 성공의 숨겨진 실행 그래프 한계는 탭을 열어 표시/스크린샷까지 확인하는 0SLZmg/w2eNXC로 보강했어요. 최종 release WeiLVw는 실제 사용자 C++ 조회·이벤트/Jump도 통과했어요. 실패 원자료는 삭제하지 않아요.

계층 FSM 후속의 실제 JVfjVp/PAXEDY에서는 더블클릭 하위 진입이 실패했어요. PAXEDY/pointer.json에 HEADER pointerdown 두 번과 캡처한 graph DIV의 pointerup 두 번만 있고 click/dblclick이 없는 것을 확인했어요. graph pointer capture·pointerup의 DOM 교체 때문에 native dblclick을 받지 못해요. 같은 안정적 state ID·500ms·5픽셀 이내의 연속 좌클릭을 직접 처리하고 drag/cancel·scope 변경과 구분하도록 수정 중이에요. 아직 이 수정의 실제 성공을 해당 실패의 성공으로 세지 않아요. 새 window fixture의 첫 syntax 실패와 기본5181 editor-api 접속 거절도 별도이며 기존 창을 고치거나 연결하지 않았어요.

- 실제 전달 MIME는 이미 SVG였으나 fileKind 텍스처 목록에 SVG가 빠져 선택할 수 없었어요. 프로젝트 textExtensions에도 빠져 소스 쓰기가 거절됐어요. 둘을 연결하고 styled SVG를 양쪽 서버 CSP로 렌더했어요. 최종 Player hUn4pE/Editor f9MmIh가 실제 표시/저장/종료 근거예요.
- ui-render-window-boAbFB는 TouchButton의 입력키를 LeftMouseButton 그대로 찾던 fixture 실패예요. 실제 RuntimeInput의 정규화된 leftmousebutton 값을 읽도록 테스트만 수정했어요. 최초 k4pLQ0의 source write 실패도 성공으로 세지 않아요.
- 초기 ui-editor-window의 selector 문자열에서 따옴표가 소실돼 CDP SyntaxError였어요. 안전한 문자열 selector로 수정했어요. b8WOvr 성공은 disabled 메뉴를 synthetic change하던 한계가 있어 해상도 맞춤/안전 영역을 실제 클릭하고 활성 메뉴를 검사하는 f9MmIh로 보강했어요.
- assets 회귀의 TypeError는 현행 worker의 변경된 객체만 반환하는 응답에 foreign 행이 없을 수 있다는 계약을 옛 테스트가 놓친 원인이에요. check-host와 같이 원래 세계에 변경 객체를 합쳐 own/foreign 속성과 원본을 검사하며 제품 worker는 바꾸지 않았어요. 수정 뒤 전체 assets 검사를 통과했어요.
- check-project --server 기본5173 접속은 ECONNREFUSED였어요. 해당 검사를 서버 성공으로 보고하지 않아요. 소유한 별도 Editor/Player 서버에서 SVG MIME/CSP·렌더·종료를 검사했어요. 원본 사용자 창/서버/프로필은 건드리지 않았어요.

- 마스크를 none으로 바꿀 때 이전 uniform의 모드를 유지하던 오류를 실제4ccClL 픽셀 검사로 재현했어요. 모드0으로 끄고 타깃 해제 전에 sampler 참조도 null로 제거해요. 폐기된 렌더 타깃 텍스처를 다음 렌더에서 다시 바인딩하지 않게 해요. GPU 검사에 실제 가림 해제/0 타깃/0 패스/null sampler를 포함해요.
- 타일은 원래 레이어가 같은 재질 객체를 썼어요. 마스크 범위가 다르면 마지막 레이어 uniform이 다른 레이어도 덮으므로 마스크를 쓰는 레이어만 재질 객체를 분리했어요. 실제 두 겹 타일에서 아래 범위만 표시되는 GPU 검사를 추가했어요. 빈 집합은 별도 전체 화면 타깃 대신 1×1 텍스처를 쓰고 패스/타깃0을 검사해요.
- lit 점광원 결과는 [255,53,53,255]였어요. 테스트의 순수 빨강 기준(<30)이 PBR 흰 반사광을 잘못 거절한 xtD3qm/0Qya8i는 원자료로 유지해요. 광원/재질을 고치지 않고 실제 빛 반응/색 우세를 판정하는 oracle로 바꿨어요. point-light/재질 타입/픽셀은 성공 보고서에도 있어요.
- 실제 N3NIud의 “다른 프로젝트 저장 키” 실패는 새 shortcuts 키가 양쪽 저장소 허용 목록에 빠져 있던 원인이에요. 양쪽에 같은 프로젝트 한정 키를 등록했어요. 거절 시 모델 복원, 다른 UUID 거절, 새 origin 복원, 실제 UI 키 기록→재지정→새키 저장/옛키 차단→Saved JSON/서버 재조회로 확인해요. 원본 실패를 성공으로 세지 않아요.
- uLloIb/BH5KaF는 평가 함수/선택자 fixture 오류였고, 초기 Node 확장 검사에서는 기존 물리/VM fixture API와 -0 oracle을 바로잡았어요. 제품 기능이 통과했다고 이 실패를 세지 않아요. 직접 default5173 server 검사는 접속 거절이었고, 성공 근거는 소유한 실제 격리 EXE/API와 프로젝트 디스크 검사예요.
- 실제 성공 이력 Z0ZItj/11LIDW/vcGvIx/VLbkOf와 스크린샷을 보존해요. 줌/DPI의 선명한 격자와 논리 pointer/DPI/2048 한도를 회귀에 추가했어요. 전체 엔진/문서/모바일 검증 완료로 확대하지 않아요.

## 앞선 물리·C++ 경량화와 복구 경계 — 2026-10-04

최종 보강: HhTQiN/dCKrDp의 실제 마우스 칠하기 timeout은 DOM의 첫 canvas가 팔레트 썸네일이었던 fixture 선택 문제였어요. dCKrDp/pointer.json에서 클릭25.7,786.1이 Materials 폴더로 전달됐고 지도 canvas는244,259에 있음을 확인했어요. data-preview canvas로 고른 z8UKVX에서는374.5,302.5가 지도에 도달해 등각0,0에 타일0을 저장했어요. 제품 포인터 로직을 원인 근거 없이 바꾸지 않았어요. z8UKVX의 GPU21개·새키/디스크/정상 종료와 sampler null도 최종 통과했고 앞선1lUAkm의 sampler 검사를 보존해요.

- 실제 CPU profile의 같은 고정 스텝 중복 물리 sync와 worldPatch의 미변경 필드 경로 생성을 줄였어요. 동적 강체 속도 변경은 추가 sync가 필요 없고, 강체 없는 부모/자식 pose와 update callback 변경은 필요해요. 2D·3D 같은 프레임 이동/속도 미러/자식 trigger 접촉을 추가해144개 WASM assertion을 통과했어요.
- BFsbYx의 worker 평균14.11ms 중 bridgeSync12.05ms였어요. canonical/작업용 세계를 함께 patch하고 사용자 C++가 바꾼 객체만 먼저 복구해 전체 복사를 줄였어요. FLIPNx는 patch8.99+sync0.50ms, 전체 worker10.85ms예요. 복구 비용을 patch로 옮긴 만큼 sync만 비교하지 않아요. RPC/루프와 worker 내부 시간도 구분해요.
- 처음 복구에 JSON `==`를 사용하면 중첩 unsigned 정수1과 double1.0이 같게 비교돼요. 실제 사용자 C++ Retype→Unsigned 검사에서 false≠true 실패를 재현한 뒤 타입/값 재귀 대조로 수정했어요. 이 실패가 있는 f265kk는 최종 성공 근거가 아니에요.
- patch 중 새 클래스의 생성자가 bridgeWorld를 비우면 함수가 빈 세계를 읽는 out_of_range.401 실패도 재현했어요. ensure로 새 인스턴스를 만들었을 때만 기존처럼 입력 세계 전체를 다시 동기화해요. 재호출의 정상 delta 경로에는 복사를 넣지 않아요. 생성자→Nested 입력 읽기로 검사했어요.
- reset이 inputObjects/cells만 비우고 bridgeWorld를 남기던 별도 수명 결함을 확인했어요. reset→재생성의 첫 생성자가480개를 보던 검사 실패를 작업용 세계 해제로 고쳤고0개로 통과했어요. 사용자 C++ EndPlay는 reset 전에 실행해요. headless의 장면 전환/EndPlay/재실행으로 확인해요.
- 전체 최초 기준 pVE0Gf 대비 FLIPNx의480+C++ 루프11.2→17.6/p9592.5→67.6ms/지속9.5→14.7은 개선이지만 직전WCjb5G의 지속15.1보다 낮았어요. 전체 메모리도584/657/672MiB private 표본이며 감소를 단정하지 않아요. 새 의존성0, 전체 표본/중간 실패/원자료를 docs/INPUT_MOBILE_POOL.md에 보존해요.
- 생성자/reset 수정 뒤 마지막 ir3BYV는480+C++21.8/p9549.8ms/35.4초96회재사용19.3, private587/625/663MiB 표본이에요. 최초/직전 commit 두 자동 비교가 통과했지만 앞선17.6/지속14.7 편차를 지우지 않아요. 최종 에디터4vNL2a와2D·3D package cYhBqS의 실제 실행·C++ 재실행·원본 복구·정상 종료도 통과했고 HBEngine.exe/dist를 다시 만들었어요. 사용자 창은 조작하지 않았어요.

# C++ 경량화 검증 — 2026-10-04

- 기준 pVE0Gf: 480개 이동/매프레임 사용자 C++ Update에서11.2루프/초·work p9592.5ms. 전체 browser→HTTP 요청/host JSON 복사와 비교/worker patch 전체 복사/미변경480개 Transform 반환이 반복됐다.
- protocol3의 양쪽 delta·불변 경로 복사·patch_inplace·changed snapshot으로 비용을 줄였다. 단위 native-world가 통과해도 Player 연결 오타는 잡지 못했다. 첫 실제9Sv81F runtime-report의 `awaitnativeWorldClient is not defined`를 확인해 정확한 호출 이름으로 고쳤다. 실제 EXE 재검사만 성공으로 계산한다.
- 하나의 패키지 native token이 여러 BP path의 다른 build 객체에 반환될 수 있다. build 객체별 client는 서로 기준을 어긋나게 하므로 VM/token 기준으로 공유한다. 새 worldId와 host sequence 확인으로 다른 VM의 같은 번호를 조용히 적용하지 않는다. 공유/owner 교체/clock/reset/유실 응답/오류/worker 종료·재시작을 실제 C++ wire에서 검사했다.
- 최종WCjb5G는480+C++16.7루프/초·p9581ms·35.6초 지속15.1. 앞선19.9/20.9와 CPU/RPC/렌더 편차를 원자료에 유지하며 좋았던 실행만 선택하지 않는다. 대형C++60루프 목표는 남아 있다. 입력/물리/스프라이트/타일·원본 보존은 회귀 검사로 확인했다.
- 실제 Windows 전체 프로세스 트리 표본은 준비/스트레스/끝 private584/662/666MiB. WebView2/Node 기본 비용을 숨기지 않는다. 이전 OS 표본이 없어 전후 전체 메모리 감소·30초 표본만의 무누수 증명은 없다. `docs/PERFORMANCE_BUDGETS.md`의 루프/표시FPS·private/working set/heap/GPU 구분을 따른다.
- editor-api-window-wLg3Xr는 C++ 재실행/원본 복구 후 종료만 대기했다. Undo 후 원본 데이터는 같지만 dirty 문서를 fixture가 저장하지 않아 closeChoice가 뜨는 경로였다. 본체의 저장 확인을 우회하지 않고 fixture 원본 저장을 추가했다. Ywixc6 재검사에서 입력으로 두 번째 C++ 호출·Stop→Play 두 번·정상 종료까지 통과했다. 기존5181 ECONNREFUSED는 고립된 에디터를 띄운 테스트로 대체하며 사용자 창을 조작하지 않는다.

# 해결됨: 독립 Player 준비·오디오·종료 (2026-10-03)

- 숨긴 WebView2에서 RAF와 최초 Web Audio resume이 대기했다. 공식 AUTOPLAY 권한만 주거나 진단용 autoplay-policy를 적용해도 숨긴 오디오 대기는 같았다. 같은 가설을 반복하지 않고 Chromium의 MediaLoadDeferrer/AudioContext visibility 경로와 실제 visible 창을 대조했다.
- Player smoke만 -20000,-20000의 보이는 비활성 창/검사 전용 16ms clock을 사용한다. 일반 게임은 실제 visible 창과 RAF다. 공식 origin AUTOPLAY 허용을 Navigate 전 완료하고, 브라우저 입력이 필요한 경우 게임 시작 버튼으로 resume한다. 진단용 flags는 배포에 넣지 않는다.
- test:package 실제 2D 개발/3D 배포 Game.exe에서 GPU draw·BP→precompiled C++ 이동·AudioContext running/voice playing·준비 10프레임·컴파일러 없는 PATH·EndPlay SaveGame flush/재실행 보존·자식 서버 종료를 통과했다. 무음 WAV로 재생 상태를 확인했으며 가청 음질 검사가 아니다.
- player.js의 실패 정리 Promise를 close가 기다리도록 연결했다. 실패 report 대기 중 X를 누르더라도 EndPlay/flush 뒤 close를 보낸다. closed 상태의 중복 종료 요청은 억제하고 저장 실패 시 다시 종료해 재시도한다.
- 컴파일 취소는 부분 출력이 완성 worker cache로 남을 수 있었다. 시도별 소스/임시 EXE를 쓰고 compiler close/성공/취소 확인 뒤 rename한다. 실제 g++ 취소 대역→같은 해시 재시도 반환42, 같은 해시 동시 실제 빌드 두 개 반환[42,42]·임시 EXE0으로 검사했다.
- Assets 접두어로만 참조를 골라 루트 Textures/External 파일이 빠지던 문제는 안전한 ProjectService 경로의 재귀 의존 수집으로 고쳤다. native.header/source 코드 문자열은 별도로 제외한다. 실제 패키지 HTTP 읽기/EXE 검사를 통과했다.
- build 프로필 저장 중 후속 편집은 snapshot/revision queue로 보존하고 owner 변경 때 임시 파일을 지운다. 외부 Builds junction은 게임 실행 전에 거부한다. 검증 fixture는 native/build 아래이며 사용자 5181/QuietGarden은 수정하지 않는다.

# 현재 실행 결함 조사

## 충돌 형상 제작에서 확인한 세부 동작 — 2026-10-03

- Geometry 배열을 generic BP valueControl의 vec3로 렌더하면 nested path/mesh JSON이 깨진다. json 속성은 일반 행에서 제외하고 공통 전용 형상 모달로 편집한다. Scene과 BP Apply/Undo/save를 실제 API로 확인했다.
- 오목한 polygon을 convex hull 하나로 대체하면 빈 영역이 채워진다. 단순 경로를 정확히 삼각화한 하나의 compound collider로 만들고 실제 ray/overlap/closest point·면적/관성으로 검사했다. 중첩 경로는 구멍으로 해석하지 않고 거부한다.
- render bake에서 actor world matrix를 저장하면 scale/pose가 실행 시 다시 적용된다. owner inverse world matrix로 자식 geometry를 변환한 로컬 정점을 저장한다. translate/rotate/비균일 scale를 가진 owner와 다른 actor 제외·실제 OBJ를 검사했다.
- JS double에서 유효한 삼각형이 float32의 큰 좌표에서 붕괴할 수 있다. solver 정점으로 변환한 뒤 퇴화 검사를 추가해 WASM 생성 전에 설명 가능한 오류로 거부했다.
- Hinge/Slider 설정 상태로 다른 jointType을 검증하면 기존 motor/limit 때문에 전환이 막힌다. 공통 editComponentProperty에서 관련 설정을 해제한 다음 검증한다. isKinematic을 해제해도 bodyType=kinematic이 남는 경우도 함께 동기화한다. 다중 선택은 모든 대상 검증 후 적용해 일부만 잘못된 조합으로 변하는 일을 막는다.
- cube 렌더 mesh는 로컬 y=0~1이며 기본 collider centered box와 다르다. bake된 mesh의 실제 최상단으로 Play 착지 기대값을 계산해 테스트하며 기본 box로 대신한 것으로 오판하지 않는다.
- 본문/검증 근거: docs/COLLISION_GEOMETRY_RESEARCH.md. 형상 67개 WASM·actual C++ mirror·브라우저·편집기 저장/실행과 배포 EXE 검사를 구분해서 기록했다.

2026-10-02: 화면 없는 2D 입력 검사에서 캐릭터 X가 -2.6에 멈췄다. 입력 전달 실패로 보였지만 프레임 60에서 속도 [2.5, 5.8365, 0]이므로 입력·점프는 전달됐다. 프레임 80부터 측면 충돌의 마찰이 수직 속도를 0으로 만들어 플랫폼 벽에 붙는 현상을 확인했다.

- 최초 검사는 오른쪽 이동만, 다음 검사는 이동과 점프를 동시에 입력했다. 둘 다 벽 통과에 실패했다. 입력 지연이나 테스트 시간을 계속 바꾸는 방식은 반복하지 않는다.
- 원인 가설: 일반 Rigidbody의 마찰 .5를 캐릭터 캡슐에도 적용해, 벽으로 누르는 이동력이 수직 마찰로 변환된다.
- 수정 대상: 공통 캐릭터 기본 콜라이더의 마찰을 0으로 두고 기존 물리 재질/사용자 마찰 설정은 존중한다.
- 확인: `node tools/check-headless.mjs`의 이동+점프 시나리오와 `test:scene`의 일반 바디 마찰·충돌 검사를 함께 통과해야 한다.

## 수정·검증

캐릭터 기본 콜라이더는 friction=0 / frictionCombine=min으로 생성한다. 물리 재질 조합 순서는 Unity 공식 규칙 average < min < multiply < max를 양쪽 순서와 무관하게 적용한다. 사용자 지정 마찰은 보존한다. 2026-10-02 `test:headless`의 이동·점프·착지와 실제 사용자 C++ 실행, `test:scene`의 일반 바디 마찰·반발·접촉·축 고정·계층 이동 회귀 검사 모두 통과했다.

## Rapier 전환에서 확인하고 수정한 실행 결함 — 2026-10-03

- Rapier 0.21.0의 `world.step(undefined,hooks)`는 설치 PhysicsPipeline 구현의 분기 때문에 hooks를 실행하지 않는다. EventQueue와 함께 전달해 solver/intersection filter를 적용했다. layer31/마스크0 통과·변경 뒤 착지를 실제 WASM 양 차원으로 재현/검증했다. EventQueue도 Dispose에서 해제한다.
- 수동 setLinvel/setAngvel은 축 잠금과 별개로 입력 속도를 유지할 수 있다. 공용 속도 경로에서 잠긴 축을 0으로 투영한 뒤 solver에 전달한다. 위치/회전 불변 조건으로 검사했다.
- Fixed/fixed는 Rapier contact graph에서 기존 HB 이벤트를 생성하지 않는다. 캐시한 보수적 bounding-sphere 후보 sweep 뒤 exact contactCollider를 사용해 정적 이벤트 의미를 유지했다. 동적 solver를 AABB로 교체하지 않았다.
- 크기 변경 뒤 manual mass가 예전 density를 다시 곱하는 문제를 unit-density 정규화→질량 비율 적용으로 막았다. sensor 형상도 질량/관성에 기여한다. autoMass인데 collider가 없으면 설정 mass로 돌아가며 추가/마지막 제거 뒤 전환을 실제 검사했다.
- 2D debug vertices는 XY stride다. XYZ로 확장해 Three vertex count/NaN 문제를 해결했다. shape cast의 witness/normal은 상대 collider 로컬 값이어서 회전/이동으로 월드 좌표에 변환했다.
- Rapier 모터·한계는 body2-relative-body1이다. HB는 body1 소유자의 양의 축이므로 한계 [-upper,-lower]와 음의 목표 위치/속도를 사용한다. 2D/3D Hinge +90도/s와 Slider +1m가 실제 양의 방향으로 움직이는 조건을 통과했다. 각속도 API rad/s와 Hinge UI degree/s를 구분한다.
- Scene 컴포넌트 change 뒤 Inspector 재구성이 details를 접어 버렸다. 객체/컴포넌트 ID로 열린 그룹·스크롤·현재 field 포커스를 복원한다. enableLimit 뒤에도 입력 그룹이 열린 실제 GUI로 확인했다.
- BP Inspector도 문서/그래프/선택 ID를 기준으로 열린 그룹·속성 검색·스크롤·입력 포커스를 복원한다. 컴포넌트 그룹을 접고 운동 형식을 바꾸거나 검색 상태에서 재구성해도 유지되는 실제 GUI를 확인했다. 기존 authoring 검사의 `line.scale.z=.01`은 과거 AABB 표시 구현을 고정한 조건이었다. 새 실제 형상의 XY 평면 깊이/월드 위치/트리거 재질을 검사하도록 바꿨고 통과했다.
- 브라우저 플러그인의 locator.fill은 일부 숫자/name 입력에서 native change를 확정하지 않았다. 이를 제품 실행 오류로 간주하지 않고 ControlOrMeta+A→pressSequentially→Tab으로 실제 타이핑을 검사했다. 사용자 5181 미저장 탭은 검증용으로 쓰지 않는다.
