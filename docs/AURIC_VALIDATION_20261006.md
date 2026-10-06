### 2026-10-06 — P1-6~P2-16·A1~A13 일괄 구현 뒤 통합 검사

P0-5 설치본은 `09e4470b1e254ac3`이다. 나머지 요청을 함께 구현한 뒤 통합 검사와 실패 수리를 진행한다. 원본 게임은 공동 작업 중이므로 고정 사본 `native/build/auric-spawn-LruQRE`와 최신 게임의 별도 사본을 사용한다. 원본 에셋·C++·검사기 원문을 변경하지 않는다.

- C++ 오디오 16종·배경음 4곡, 입력 전 비차단, 헤드리스 소리 기록, 첫 프레임 위젯, UI 변경·5방향 채움·9-slice·애니메이션, 등록 컴포넌트의 자료형/범위 검사와 C++ 읽기/쓰기, 데이터 3개/76개 밸런스 필드·한글 표/Undo·중괄호 배열, 장치 구분·누름 유지, 문서별 카메라·외부 변경·Source 단일 원문·BOM/줄바꿈 정규화, 정수 배율·타일 반복·Y 정렬, 투사체 배열/인스턴싱을 공용 실행 경로로 연결했다.
- A4/A5: 첫 Spawn의 C++ Construction 시 후속 객체가 아직 VM에 없어 worker에서 제거되던 문제를 공용 연산 적용에서 전체 생성 객체를 먼저 등록하는 방식으로 수정했다. 실제 C++ 헤드리스·편집기·Game.exe·Android에서 생성93개/Construction93회/다음 프레임 포인터/HP99.25 확인. `native-spawn-UgDO4M` 실패 재현과 `native-spawn-yiRsAZ` 성공을 보존했다.
- A2/A3: JSON/이미지 원본 캐시·템플릿 준비·단순 풀 객체의 불필요한 컴포넌트 재시작 제거. 실제 Game.exe `features-window-Xsn7PR`의 준비된 PF_Slash 최초 생성0.20ms, 40회 생성p95 0.10ms, 풀 획득p95 0.10ms. 엔진 연산 내부 CPU 시간이며 C++ 왕복·명령 대기·GPU 컴파일을 포함하지 않는다. 0ms 표본은 시계 해상도 아래의 값이다.
- A6: 실제 C++ FSM·행동트리 5개×3프레임의15→3왕복. 블랙보드 변경·전환·FinishTask·실패·서비스·병렬·재평가 경계는 실행 순서를 보존한다. `state-native-batch-0dNLM4`, `behavior-native-batch-ZRRnTx` 성공.
- A1: 직렬화/patch/Ack, worker parse/sync/checkpoint/invoke/snapshot, 프런트 상태/연산 적용/전체 시간을 구분한다. `editor-window-TQFwe6/native-profiler.json` 실제 기록. 제출된70~90ms와 고정 사본은 게임 버전이 달라 통제된 전후 비교로 표시하지 않는다. 보스방/빈 방 새 측정은 통합 검사에서 수집한다.
- A7: 실제 편집기에서 활성 BP 문서를 보면서 Play 시간 진행, pauseReason/진행 상태 확인. A8 경로만 nondirty 빌드, A9 공개 속성512개/원인별 오류, A10 중복 이름/ID의 구체 오류를 연결했다.
- A11~A13: PostProcessVolume의 전역 블룸(임계값/세기/반경/해상도), Sprite/Tilemap 발광 강도, 가산 혼합, Sprites::Flash/PlayAnimation. 간접조명/GI 지원을 뜻하지 않는다. `2d-effects-window-jQIv7R` 실제 C++ 재생/반복/정지·흰 번쩍임·경계 밖 블룸·높은 임계값·검은 여백·GPU 끄기/켜기5회 성공(텍스처2개 유지). 블룸 비활성 상태에서는 후처리 버퍼를 만들지 않는다.
- Android `android-window-DGHFci`: Spawn93/Construction93/HP99.25, 오디오20개·터치·백그라운드/재개,1000발/적30개600프레임 평균39.7923fps/VM작업p95 30.3ms. 마지막Back 실패로 전체 성공은 아니다. Android16/target36은 onBackPressed를 호출하지 않아 API33+ OnBackInvokedDispatcher로 수정 후 재검사한다. x86_64/4코어/호스트RTX4070SUPER 에뮬레이터이며 중급 실기기 결과가 아니다.
- `kiosk-watchdog-7pB3zg`: 검증 전용 Game.exe의 경로/PID/인자를 확인하고 실제 강제 종료→1초 후 새PID→실행 준비→정상 종료 시 재실행 없음 성공. 사용자 앱/기본ADB 미변경.
- 실제8시간 `kiosk-soak-zEjNdw`: 시작UTC05:45:40.467, 목표UTC13:45:40.467. 가속 실행으로 대체하지 않는다. 워밍업 중 누적 프레임에 의한 준비 판정 오류는 측정 게이트만 보정하고 `sampling-readiness.json`에 시각/이유를 기록했다. 게임 코드/렌더러/프로세스/8시간 시계는 유지했다. 종료 전 통과 표시 금지.
- 최신 원본 검사기SHA256 `976c8f545aaf58cfac8b2dc5a06857202bf2c073548bef757e65338a2794d891`는 공동 작업에서 변경됐다. 예전 고정 검사기 `55e77b195642b74fc61d1646be3caff641309f87d7332e1f7a1f0063a2958de3` 원문을 보존하고9개 성공(`checker-tdWbin`). 최신 게임/검사기는 별도 사본으로 검사한다. 검사기의 옛 키 해제 전제는 골든 결과 비교에만 `preserveInputOnTravel:false` 호환 옵션을 적용한다. 누름 유지 자체는 별도 편집기/배포/헤드리스 검사로 검증한다. 검사기 원문을 수정하지 않는다. 헤드리스 호환 어댑터는 `AURIC_MUTE` 환경변수를 제거하고 소리 기록도 남긴다.
- 감속3→2.4m는 계수0.8일 때다. 원본0.75는2.25m를 보존하고 데이터만0.8로 바꾸면 재컴파일 없이2.4m가 되는 것을 확인했다. 검사를 맞추려고 원본 밸런스를 변경하지 않았다.

실물 Android의10분 발열/터치 지연, 실제 iPhone/TestFlight 서명, 실제8시간 완료는 미검증이다. Mac/Xcode·Apple 서명 자료·연결된 테스트 휴대폰이 없는 현재 환경에서 에뮬레이터나 짧은 실행으로 해당 항목을 완료 처리하지 않는다. 나머지 통합 결과 확인 후 한국어 커밋/푸시·불변 사용자 설치본 갱신을 진행한다.

근거: [Three.js UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html), [Unreal Emissive 입력](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-the-emissive-material-input-in-unreal-engine), [Unity 2D 제작 흐름](https://docs.unity3d.com/6000.1/Documentation/Manual/2d-game-creation-wokflow.html), [Android16 Back 변경](https://developer.android.com/about/versions/16/behavior-changes-16#predictive-back).

### 통합 검사 후속 수리

- `auric-features-batch-WVwsTK`에서 headless/원본9개/공용 회귀/2D 실제 창/편집기/Android가 통과했다. PC 성능이58.9281fps로59fps 게이트를 통과하지 못해 전체 batch는false다. 이 실패를 다른 성공으로 덮지 않는다.
- `editor-window-qSHOOF` 실제6초/300프레임 측정: Dungeon_2 프런트 호출p95 2.5ms/왕복p95 1.2062ms, Dungeon_4 프런트p95 2.7ms/왕복p95 1.3707ms, 사용자 invoke p95 .2423ms. 콜백·직렬화·적용의 구간별 수치를 boss-cost.json에 보존했다. 초기 보고에 빠져 있던 편집기 frontendMs를 실제 측정으로 채웠다. 다른 버전의70–90ms와 통제된 전후 비교가 아니다.
- `android-window-GWQQIo`는 Back 두 번의 일시정지/재개까지 통과했다. 1000발·적30개600프레임 평균40.9054fps/작업p95 32.8ms다. 이후 오디오 정리 수정과 Android HUD 세 해상도의 최신 APK 재검사는 별도 기록한다.
- `kiosk-soak-zEjNdw`는 UTC06:13:27.472에 취소했다(마지막1636.159초/28세션). 자연 메모리 증가가 확인되어8시간 통과로 세지 않는다. Heap에서 HTMLAudio 반복 재생의 pending activity→ended 콜백→이전VM 경로와 이전 BlueprintRuntime/AudioContext26개를 확인했다. 공용 disconnect에서 pause/src 해제/load를 수행하고 시작 요청의VM 참조를 성공 직후 해제했다. 이전 실패·heap 증거는 유지했다.
- 실제 Game.exe `features-window-lAHd9Z/audio-lifetime.json`: 음악이 재생되는20회의 실제F12 초기화 뒤 살아 있는 BlueprintRuntime1→1, AudioContext1→1이다. queryObjects의GC를 사용한 수명 회귀 증거이며 자연8시간 메모리 검사와 구분한다. 해당 창은 기능·수명을 통과했지만 PC58.9177fps여서 전체 성공은false다. 앞의`oCueHa`는 검사에서 prototype 조회 대상이 잘못되어0개가 반환된 실패이며 성공으로 쓰지 않는다.
- 투사체에서 요청 대상이 아닌 Collider의 변환 계산과 broad-phase 전에 만들던 매발 이전 위치 배열을 제거했다. 충돌 자료형·swept 판정·hit 순서는 유지하고 공용 런타임 검사가 통과했다. 최신 실제 PC 성능과 자연8시간 검사는 수정 패키지를 따로 측정한다.

- 실제 CPU sampling `features-window-Shu686/cpu-profile.json`에서 HUD updateLayout/clientWidth/matchMedia 비용을 확인했다. 위젯 노드·이미지의 속성/slot·부모 활성·장치 표시·배율이 같으면 DOM 쓰기를 생략하고, 포인터 표시를 한 MediaQueryList로 조회한다. 임의 정지나 성능 임계값 변경을 사용하지 않았다.
- `features-window-D3vnwR` 실제 PC600프레임 평균59.5085fps로 같은59fps/작업p95≤16.667ms 게이트를 통과했다. `ui-render-window-S84vhZ` 실제 정적HUD400ms DOM변경0,6개해상도/DPI/1920×1080 SVG1.5배 직접 SVG와 픽셀 비교/한글/버튼/BP를 통과했다. 수정된 같은 UI 경로를 모바일도 사용한다.
- 새 자연8시간 `kiosk-soak-zjUtGE` 시작UTC06:25:27.387/목표UTC14:25:27.387. 수정된 불변D3vnwR 패키지, 컴파일러 없는PATH, 전용UserData/TEMP/LOCALAPPDATA,60초 무입력 세션 초기화,1000발/적30개 조건이다. 초기 장면의5초 후에만 샘플하며 자연GC를 강제하지 않는다. 이전 두 취소 검사는8시간 성공에서 제외한다.

- 최신 원본게임537파일의 사본/원문검사기9개는 `checker-ADsL1K`에서 통과했다. 현재 checker976c8f...·원본게임·격리엔진 사본SHA를 보존했고 AURIC_MUTE 환경변수는 사용하지 않았다. 옛 검사기의 장면 전환 key-release 전제에는 검사 어댑터의 명시적호환옵션만 적용했으며, 실제 누름 유지 증거와 분리했다.
- 최신 Android APK `android-window-zoYaCZ`는 설치/Activity시작 뒤 전용ADB장치 연결이 사라져 실패했다. 게임성능/새HUD해상도 통과 증거로 계산하지 않는다. 같은APK를 새 전용기기에서 재검사하며 사용자ADB5037/프로필을 변경하지 않는다. 실물 USB 기기조회 결과는0대였다.


### 2026-10-06 — 사용자 설치본 반영 및 모바일 통합 후속

- 한국어 커밋 2dfdb89를 공개 HBEngine/main에 푸시했고, 사용자 설치본을 **C:/Users/kirby/HBEngine/Versions/fddd827f41717173/HBEngine.exe**로 갱신했다. 1,721파일과 주요 런타임/API/Android 소스 SHA를 설치 후 대조했다. 기존09e4470b1e254ac3·사용자 프로필·실행 중인 앱·기본ADB5037을 보존했다. 새 실행부터 적용된다. 설치 증거: engineCreate/native/build/auric-user-install-20261006.json.
- P1-7의 두 완료 기준을 체크했다. 실제 편집기 p6kXQ2·Game.exe Xsn7PR 및 최신 Android jbIuSt/ufqJHJ의1280×720/1920×1080/2340×1080 HUD에서 중복 요소 없는 피로도1·선택테두리1·공격버튼1·한글을 확인했다. Android는 실제 WebView를 CDP로 리사이즈했으며, 실제 휴대폰 화면 검사가 아니다. Actor BeginPlay 전 준비된 WidgetReady와 즉시 HUD 호출이 성공했다. 별도 모바일 성능 실패를 이 기능 성공으로 덮지 않는다.
- 최신 APK jbIuSt/ufqJHJ의1,000발/적30개 성능은 각각28.3683/29.1622fps, 작업p95 48.4/46.8ms로 실패했다. ufqJHJ에서 원래806×456/DPR1.5 복원 뒤 측정해 단순 미복원 화면 크기 가설을 제외했다. 이전GWQQIo의40.9054fps 결과와 분리하며 C++ 처리/응답 대기 및 PC8시간 동시 실행 조건을 분석한다. 게이트30fps/p95≤33.333ms는 유지한다. 오디오20·생성93·세HUD해상도·터치·HOME복귀·Back 두번은 동작했다.
- 새 iOS 원격 검사37424160740은 Xcode 앞의 공용 검사에서 실패했다. P2-11의 Source 단일 원문 계약으로 외부 변경을 읽도록 고쳤는데 옛 검사가 외부 변경을 거절하라고 검증한 문제다. 새 검사는 컴파일러 인자의 수정된 Source·BOM/줄바꿈 정규화·공유1회 컴파일·이전 실행/저장BP의 불변성을 검증한다. 로컬 통과 후 다시 원격 빌드한다. 이 실패는 새 iOS 통과로 계산하지 않는다.
- 자연8시간 zjUtGE는 계속 실행 중이다. 검사 전용 프로세스 트리만 BelowNormal 우선순위로 바꿨고 background-priority.json에 PID/생성시각/이유를 보존했다. 사용자 앱을 건드리지 않았고 실행 코드·8시간 시계·메모리 게이트는 변경하지 않았다. 워밍업30분과 실제8시간 완료 전에 완료 체크하지 않는다.

- iOS 사전 공용 검사의 headless 단계에서 종료된 Actor의 InputActions 키가 남는 문제를 발견했다. LevelTransition은 공유 장치 상태와 지속 GameInstance 입력을 유지하고, 떠나는 Actor의 키/이전 액션 상태는 해제하도록 공용 stop을 수정했다. 실제 C++ 장면 전환 뒤 새 월드 d=1 유지·옛 Actor 키0·GameInstance 입력1, 기존 타이머/지연 취소·원본 장면 보존 검사가 통과했다. 사전 그룹 gfZK8B의 앞7개와 수정 headless, tail77GWUM의9개가 통과했다. 새 iOS SDK 결과는 별도 수집한다.
- Android aY0HKH는 HUD 리사이즈를 생략하고 CPU sampling을 켠 진단이며17.9840fps/p95 72.9ms로 실패했다. C++ 사전 컴파일과 PC8시간 실행이 겹쳤고 sampling 비용도 들어 있어 일반 성능 결과로 확대하지 않는다. 33.883초 프로필 중 idle18.141초·program3.259초, 네이티브 왕복 평균6.958ms/worker2.876ms를 기록했다. 다음 측정은 대량 컴파일과 sampling 없이 진행한다.

- Android 진단 aY0HKH/dU0emM은 실행 환경 지정이 빠져 실제2코어0–1/SwiftShader로 실행됐다. 4코어0–3/RTX4070SUPER인 GWQQIo·jbIuSt·ufqJHJ와 통제된 비교가 아니다. dU0emM20.1321fps/작업p9563.4ms도 일반4코어 성능 회귀로 계산하지 않는다. 원래4코어 호스트 GPU의 최신 실패2개는 유지한다. 실행 조건을 다시 명시한 최신417f384 APK/전체 모바일 검사를 진행하며 진단 환경 기록을 바로잡는다.


### 2026-10-06 — iOS 원격 통과와 프레임 대기 후속

- 공개 main의417f384 iOS 원격37425093439가 성공했다. 실제 두 Xcode SDK 컴파일·독립 iPhone SE3 시뮬레이터 설치/실행·C++ 두 모듈·물리·에셋 범위·반복 오디오 신호·배경 음소거와 복귀 후 재생/월드 보존을 통과했다. 원격 ios-mobile-proof를 다운로드해 native/build/ios-proof-37425093439에 보존했다. 실제 청취·실물 기기·서명 검증은 false다. TestFlight 절차와 원격 Mac/Apple 서명 자료의 경계는 docs/IOS_REMOTE_DISTRIBUTION.md에 정리했다.
- 타이머 없는 독립 C++ 모듈의 frame 응답 대기를 함께 수행하는 공용 경로를 추가했다. 외부 모듈 호출·진행 중 요청·밀린 frame·float32 오버플로·타이머 콜백이 있으면 순차 경계를 유지한다. 실제 C++ 두 모듈의 float32 시계, 콜백의 배율 변경/Spawn/Stop 순서, 기존 frame/transport/headless/runtime/GameInstance 검사가 통과했다.
- 실제 PC features-window-k9VzZd의전체기능/600프레임59.31198fps가 통과했다. 새 Android5XetDR는 실제4코어0–3/호스트GPU에서 생성93·오디오20·세HUD해상도·터치·HOME·Back이 동작했으나32.2485fps/작업p9542.9ms로 전체성능 게이트에 실패했다. 기준을 낮추지 않았다. 최근120호출의worker평균.8435ms/왕복5.2ms를 근거로, Android 공식Handler callback에서메시지를받게수정하고새APK로검사한다.


### 2026-10-06 — 프레임 안전 경계와 배포 준비

- 별도 Android 메시지 스레드 실험 d9CjKs는 실제 background callback·기능을 확인했으나30.6455fps/작업p9545.6ms로 실패했다. 개선 근거가 없어 해당 Java 변경과 전용 검사 변경을 제외했다. 기존 기본ADB와 사용자 창은 보존했다.
- q82C5Z는 기본 메시지 경로와 반환된 외부 모듈의 시계·타이머 증명을 사용한 APK다. 전체기능은 동작했으나31.5224fps/작업p9544.4ms로 예산 실패다. 게이트를 변경하지 않았고 성능 개선 완료로 계산하지 않는다. 후속 원격 호출이 타이머 상태를 바꿨을 때 오래된 진행 중 응답이 증명을 복원하지 못하도록 revision 경계를 추가했고, 실제 C++·통신·장면 전환·GameInstance 회귀가 통과했다.
- 프레임 그룹의 parallel/sequential 횟수를 기존 runtime.state·Player 검사·headless 결과에 별도 기록한다. 마지막 C++ 호출의nativeTiming이 덮어써지는 것과 분리했다. 앞 APK에는 이 최종 진단 필드/늦은 응답 보호가 모두 들어 있다고 주장하지 않는다. 새 설치본·iOS 원격 검사는 고정한 최종 소스로 만든다.
- 최신 원문 검사 checker-UFabo8은9개 통과/code0,537파일·검사기976c8f…·격리게임·격리엔진SHA를 보존했다. 실제 Editor 검사에서 남아 있던 AURIC_MUTE=1도 제거해 직접 오디오 경로를 검사한다. 자연8시간 zjUtGE의 코드·시계·게이트는 변경하지 않고 계속 기록한다.


### 2026-10-06 — 448a9b5 사용자 설치본 갱신

- 공개main에 한국어 커밋448a9b5를 푸시하고, 최종 Windows 배포본을 C:/Users/kirby/HBEngine/Versions/42bcd763ffa422e3/HBEngine.exe로 옮겼다. 바탕화면 HBEngine 사용자용.lnk는 새 버전을 가리킨다.1,723파일의 설치 SHA와 주요 실행/API11파일을 현재 소스와 대조했다. 이전fddd827f41717173과09e4470b1e254ac3·사용자 프로필·열린 앱을 보존했다. 새 실행부터 적용된다. 증거native/build/auric-user-install-448a9b5.json.
- editor-window-Zg11qp는 AURIC_MUTE 없는 실제편집기에서 통과했다. Source 단일 원문·93생성·20소리·데이터/Undo·문서 외 실행·누름 유지 등의 공용 실행을 확인했다. 최종늦은응답 보호와횟수진단은448a9b5의 별도 C++회귀/새iOS원격 검사에 연결했다.
- 설치 완료는 Android 성능·실물기기·자연8시간 완료를 대신하지 않는다. Android의최종448a9b5 APK와같은소스iOS원격 검사를 진행하고, 자연8시간zjUtGE는 기존불변패키지로 계속측정한다. MD와누적엔진 작업의미검증 항목은성공으로표시하지않는다.


### 2026-10-06 — 최종 Android 실행·성능 통과

- 설치본과 같은448a9b5의 새 APK android-window-xDeGsX가 전체 검사를 통과했다. 실제4코어0–3·x86_64·호스트RTX4070SUPER 에뮬레이터,1,000발/적30개600프레임 평균43.26351fps·작업p9530.1ms·렌더p951.0ms다.30fps/작업p95≤33.333ms 기준을 유지했다. 프레임 그룹parallel888/sequential0을 기록하여 최종 공용 경로가 실제 앱에서 사용됨을 확인했다.
- 생성93·Construction93·다음프레임HP99.25, 소리20개,1280×720/1920×1080/2340×1080 HUD, 원래806×456/DPR1.5 복원, 터치,HOME정지/복귀,Back2회 일시정지/재개를 함께 통과했다. 앞의 모든 실패는 유지했다. 이 결과는중급실물기기·발열10분·스피커청취 증거가아니다. P2-16의실기기 기준은미체크를유지한다.
- 별도 메시지 스레드는제외된최종기본메시지 경로다. 독립모듈 프레임대기·외부시계증명·늦은응답보호의최종코드를검사했고, Windows 설치본42bcd763ffa422e3의런타임과일치한다. 같은최종소스iOS37427806194와실제PC최종검사가계속된다.

### 최종 설치 소스의 PC·현재 게임·iOS 결과

- `448a9b5`의 실제 Game.exe `features-window-Av9j2H`가 전체 기능을 통과했다. 1,000발·적30개·600프레임 평균59.500788fps, 작업p95 10.5ms, 렌더 제출p95 .6ms이며 기존59fps/작업p95≤16.667ms 기준을 유지했다. 생성93/Construction93/HP99.25,20개오디오,3개HUD해상도,6장면,장면전환W누름2.125m,F12/60초리셋을 함께 확인했다. 준비된최초생성 .20ms/반복p95 .20ms/풀획득p95 .10ms는 연산 내부 CPU 구간이다.
- `checker-qfTJah`는 최신게임537파일 사본과 원문 `check_demo.mjs`9개를 통과했다(code0). 원본게임·검사기·격리게임·엔진사본SHA 보존을 확인했다. 검사기SHA976c8f…이며 키해제 전제의호환옵션만사용했고 AURIC_MUTE는없다.
- 같은소스 [iOS37427806194](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37427806194)도 성공했다. 아티팩트11396326248을 `native/build/ios-proof-37427806194`로 내려받아 결과본문을 확인했다. 공용C++검사,두Xcode대상컴파일,iPhoneSE3시뮬레이터 설치·실행,두C++모듈,물리질의,미디어범위요청,반복오디오신호,배경정지·음소거/복귀월드·재생이통과했다. `audioHeard/physicalDeviceVerified/signingVerified`는false다. 실제Auric iOS배포본·TestFlight·실물청취 증거로 확대하지않는다.
- 설치본42bcd763ffa422e3는 위최종런타임을포함한다. 이후검사기록만추가하는문서커밋때문에 사용자설치본을다시변경하지않는다.
- 자연8시간zjUtGE의약52분 표본에서JS살아있는heap은약28~52MiB로순환하지만전체private메모리는워밍업후1146→1375MiB로증가했다.8시간완료/메모리안정통과로표시하지않는다. 불변검사는유지하고 별도 `memory-controlled-GG4TUO`에서활성실행/Runtime진단활성여부/일시정지를비교한다. 강제GC없고 사용자프로필·창은사용하지않는다.

### 노치 안전 영역

`ui-render-window-J43YYZ`는 기존6화면/DPI/SVG1.5배/한글/클릭·BP·터치 검사에 실제 CSS 환경 변수의노치3조건을추가해통과했다.2340×1080에서좌우84/72·하단24px,상단32·하단24px,0으로복원했으며safe-area컨테이너·HP·공격버튼좌표가예상값과 .1px이내로일치했다. 원본위젯불변·정상종료0·서버종료도확인한뒤acceptance를저장한다. 사용법은 `node tools/check-ui-render-window.mjs --cutouts`다. [공식CDP프로토콜](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json)의experimental `Emulation.setSafeAreaInsetsOverride`를사용했고실물노치를검증한것은아니다.

Auric최종APK의landscape·Back/HOME실행과최종iOS의배경정지·오디오재개및landscape출력계약에함께근거하여 MD의해당기능기준을체크했다. 실제휴대폰·서명/청취·8시간·실물중급탄막성능은계속미검증이다.


### 2026-10-06 — 반복 효과음 측정 버퍼와 장시간 진단

- 공용 AudioRouting의 Analyser를 유휴 최대16개로 재사용하고, 이전 파형을 오디오 시계 기준으로 비운 뒤 새 재생에 연결한다. 종료 시 유휴 연결도 정리한다. 최초 단순 disconnect 구현의 실제 강한/약한 소리 혼입 실패(features-window-iXrtCr)는 보존했다.
- 실제 Windows features-window-cSnRHl은 .8/.02 진폭의40ms PCM12회에서 새 Analyser1개·peak오차.005이내를 통과했다. 기존93생성/20소리/3HUD해상도/6장면/W누름/F12/60초 초기화와1,000발·적30개600프레임도통과했다(59.596531fps/작업p959.5ms).
- 자연GC·같은GameInstance의 별도 memory-controlled-egPsS8 약6분대조에서 크기524,284바이트의 샘플 할당은123초/248초 뒤1개/1개다. 기존 bOMG23은53개/105개, PCM JhXfdi는54개/106개였다. 샘플 바이트를 전체메모리나누수량으로세지않고 초기사용량이서로다른프로세스를단순차감하지않는다. Analyser제거대조 mbH9a3은0개였지만 측정을뺀진단이며제품합격증거가아니다.
- Android hQrbsx의첫40ms진단은새오디오장치시작전벽시계60ms로읽어0을반환했다. 기존20게임소리는정상이며실패를보존했다. 검사시간을실제AudioContext시계로측정한pEDhFS에서는12개신호/새노드1개와93생성·20소리·HUD·터치·HOME·Back이동작했다. 그러나600프레임33.556484fps/작업p9541.6ms로기존p95≤33.333ms게이트에실패했다. 전체성능합격으로계산하지않는다. 같은APK에서지연원인을분리하고있다.
- iOS도같은12개신호검사를실제WKWebView진단에연결했다. 새원격SDK/시뮬레이터결과는아직수집전이다. 실물·서명·스피커청취는기존처럼미검증이다.
- 불변자연8시간zjUtGE는코드·시계·게이트를유지하고계속실행한다. 마지막5,829초/97세션의전체private1,926.21MiB/JSheap37.07MiB로전체증가가남아있다. 이번버퍼변경이들어간패키지가아니며8시간안정통과체크를하지않는다.
- 공식Chromium의고정커밋에서Analyser관련8파일을전부읽고본문SHA·범위·설치버전미대조를docs/research/AUDIO_ANALYSER_LIFETIME_028.md에구분했다. 전체Unreal/Unity분석완료로승격하지않는다. 원본게임/검사기는수정하지않고열린사용자엔진·프로필·기본ADB를유지한다.

### 2026-10-06 — 오디오 유휴 비용 보강·플랫폼 결과 구분

- 공용 오디오 측정 노드는 이전 신호를 비운 뒤 처리를 멈추고, 활성 소리/정리 중인 노드가 없으면 타이머도 종료해요. 공간 좌표는 바뀐 축만 예약해요. 재사용·정리·움직임·원본 배열 변경·믹서/소리 회귀가 통과했어요.
- 실제 Windows `features-window-PVSo1Z`: 전체 기능/1,000발·적30/C++600프레임 59.404176fps, 작업p95 11ms, 12개 강/약 신호와 생성1개·유휴 연결 해제·타이머 종료 통과예요.
- 직전 a3ad7ec iOS run37433705272: 두 SDK 컴파일/별도 시뮬레이터/12개 신호·생성1개·배경 정지·복귀 통과예요. 실제 기기·청취·서명은 미검증이며 후속 유휴/좌표 변경과 같은 소스는 다시 원격 확인해요.
- 최신 APK `android-window-lcqWUQ`는 빌드·설치·Activity 시작 뒤 ADB runtime probe와 WebView 연결에서 시간 초과예요. 성능이나 기능 통과로 계산하지 않고 실패 증거를 보존해요. 동일 APK로 연결 경로를 진단하며 기존 성공/예산 실패 수치는 지우지 않아요.
- 자연 GC 대조 XAZtAi는 청취 좌표 예약 포함/생략 구간 123.716/124.056초, private588.75→663.20/666.20→662.50MiB예요. 자연 GC·구간 초기값 차이가 있어 단독 원인이나 장기 안정성 판정이 아니에요. 기존 D3의 실제8시간 검사·원래 기준은 유지하며 메모리 증가를 계속 추적해요.
- 상세 원문 범위/hash·한계는 `docs/research/AUDIO_IDLE_COST_029.md`예요. 분석 전체 완료/실기기/8시간 체크박스는 올리지 않아요. 기존 사용자 설치/프로필/열린 창과 원본 게임을 보존해요.


### 2026-10-06 — 오디오 보강 522dba1 설치·동일 소스 플랫폼 확인

- 공개 main의 한국어 커밋522dba1을 Windows 사용자 설치 C:/Users/kirby/HBEngine/Versions/d9f5d903ff35b9d6/HBEngine.exe로 갱신했어요. 바탕화면 HBEngine 사용자용.lnk도 새 버전을 가리켜요.1,730파일 설치와 실행/API/오디오13파일의 소스 SHA를 대조했고 이전42bcd763ffa422e3·프로필·기본ADB14204를 보존했어요. 새 실행부터 적용돼요. 증거 native/build/auric-user-install-522dba1.json. 설치 후 증거 수집의 PowerShell 단일 객체/배열 처리 오류는 바로잡고 같은 불변 버전 재검증으로 기록했어요.
- 현재 원문 게임 검사 checker-lAcd9y는9개/code0 통과, 원본537파일·검사기 SHA976c8f545aaf58cfac8b2dc5a06857202bf2c073548bef757e65338a2794d891·격리게임·엔진 SHA를 보존했어요. 원본 게임과 에셋은 공동 작업 중이므로 덮어쓰지 않아요.
- 같은522dba1 iOS 원격37435591708의 실제 아티팩트를 열어 두SDK컴파일·별도 iPhoneSE3 시뮬레이터 설치/실행·C++/물리·에셋 범위·12개 강/약 신호/생성1개·유휴 연결 해제/타이머 종료·배경 정지/복귀를 확인했어요. 실제 기기·서명·스피커 청취는 false예요. 전체 Auric 원본 게임의 iOS 검사를 대신하지 않아요.
- 같은 APK의 bounded Android 재연결 kJxme8은 생성93·오디오20·12개 신호/유휴 종료·터치·3HUD해상도·HOME/Back을 통과했어요.1,000발/적30개600프레임31.782354fps·작업p9543.1ms로 p95≤33.333ms 예산에 실패했어요. 연결 실패lcqWUQ와 이전 성능 실패를 보존하고 기준을 낮추지 않아요. 탐색 과정을 최대24개 기록하는 진단만 검사기에 추가했어요.
- 최신 고정 Windows 패키지 PVSo1Z의 실제8시간 HjSnC6은 UTC08:25:57→16:25:57(한국 시간10월7일01:25:57)로 새로 측정해요. 이전D3의 zjUtGE는 UTC06:25:27→14:25:27로 그대로 계속해요. 두 검사 모두 강제GC·시계 가속·기준 변경 없이 자연 실행이며 사용자 창/프로젝트를 변경하지 않아요. 기존 검사에서 메모리 증가가 남아 있어 안정성 체크를 올리지 않아요.
- MD의 미체크3개(실물Android 발열/터치/30fps,실제8시간 메모리,PC60fps/중급Android1,000발)를 유지해요. 설치 갱신 후 누적2D전용 그림자의 공식 Unity6000.0/URP17.0.4 API와 동일 버전 공식 렌더 소스 분석을 이어가요. 전체 엔진/전체 문서 분석 완료로 계산하지 않아요.


### 2026-10-06 — 2D 전용 그림자·C++/블루프린트 연결 및 사용자 설치 갱신

- 공식 Unity6000.0/URP17.0.4 Graphics 고정 커밋의22개 렌더/형상/그룹 소스를 본문 SHA와 읽은 범위로 기록했어요. 전체27개 문서 계열의 조사 완료로 올리지 않았어요.
- 알파·SpriteSkin 변형·충돌/타일 충돌·편집 모양·None, Cast/Self/Both/None, 최상위 부모 그룹·정렬 레이어를 전용2D 그림자와 연결했어요. 씬/BP 형상 초안·Undo/Redo·저장, C++15개 함수와 같은 선언의 BP 노드, AI 스키마/배치 목록을 추가했어요. 정지한 그림자 맵은 다시 그리지 않고 미사용 자원을 해제해요.
- 실제 전체 에디터0wPgCZ의 편집/원본 보존 검사, 최종 에디터hfoGkE·배포Player oAxqTM 각각116개/조명·그림자67개 GPU 검사와 실제C++/BP 출력 핀을 통과했어요. 마지막 보강에는 픽셀 가로/세로 크기가 다른 거리 수축과 중복 메시 면 처리가 포함돼요.
- 공개 한국어 커밋c0ed468ee0b716bec000e6bcc9364dbb5b4df5ad를 사용자 C:/Users/kirby/HBEngine/Versions/6a8cfef398a04ea4/HBEngine.exe로 갱신했어요.1,733파일/14개 실행·API파일 SHA 일치, 이전d9f 버전·프로필·열린사용자창46816·기본ADB14204 보존을 확인했어요. 바탕화면 바로가기는 새 버전이며 다음 실행부터 적용돼요. 증거 native/build/shadow-user-install-c0ed468.json / docs/TWO_D_SHADOWS.md.
- 기존522의 Windows/Android/iOS/8시간 증거를 새 그림자의 모바일 검증으로 바꾸지 않아요.8시간 검사는 고정된두 패키지에서 강제GC 없이 계속되며 최신HjSnC6 종료는 한국시간10월7일01:25:57이에요. 마지막2,309초/39세션 private1,249.68MiB,오류0이지만 메모리 증가가 남아요. MD의 실물 모바일/8시간/최종성능3개 체크는 유지하고 전체엔진 기능 작업도 이어가요.


### 2026-10-06 — 렌더 자원 소유권 수정과 동일 게임 사본 대조

- 도형의 고유 자원은 오브젝트, 공유 머테리얼은 제작기, 외부 전달 머테리얼은 호출자가 소유하도록 에디터/Player 수명 관리를 연결했어요. 자식 Actor를 보존하고 광원 그림자 맵도 해제해요.
- 실제 에디터118개/Player117개 GPU 검사 오류0. 동일 GPU에서 수정 전20장면 머테리얼 참조9→369, 수정 후9→9이며 지오메트리/텍스처도 유지돼요. 실제 Auric 기능 통합 Py2rT4는1,000발·적30/600프레임59.509fps/작업p9512ms,93생성/20소리/3HUD해상도/6장면/입력/F12/60초 초기화 통과예요.
- 현재 원문 검사기 SHA c2609e75…의 격리 사본 pMImZr는 웨이브2 해골6마리 처치 실패예요. 같은 사본/생성API로 수정 전4e3ea51을 실행해 같은 실패를 확인했어요. 원본 게임/검사기는 수정하지 않았고 전체 검사 통과로 표시하지 않아요.
- 8시간 검사는 기존 두 고정 패키지에서 계속돼요. 이번 수정의8시간/전체메모리/실물Android 성능 통과로 바꾸지 않으며 미체크3개를 유지해요. 별도 최신자원 수명 진단 VzfhAY는 자연GC/native샘플로 시작했어요. HeapProfiler 샘플 조회 자체가 고정 V8 소스에서 강제GC를 호출하므로 장시간 검사에 추가하지 않았어요.

- 설치 후속: 공개 커밋 c984007을 C:\Users\kirby\HBEngine\Versions\246f76451dd330eb/HBEngine.exe로 갱신했어요. 1737파일과16개 실행/API/문서 해시를 확인했고, 기존6a버전·프로필·사용자창37444·기본ADB14204를 보존했어요. 바탕화면 바로가기는 다음 실행부터 새 버전이에요. 증거 native/build/render-resource-user-install-c984007.json.


### 2026-10-06 — 반복 스트리밍 오디오 수명과 믹서 예약

- PC 공용 재생은 HTMLMediaElement/source를 재사용하고 재생별 핸들·종료 이벤트를 격리해요. 긴 음악의 스트리밍과 모바일의 기존 PCM/32MiB 보유 캐시를 유지해요. 믹서9개 값도 변경될 때만 예약해요.
- 수정 전200회/source200개 실패를 재현했고, 수정 후source1개·동시 재생·옛 핸들/이벤트·늦은play·미연결 종료와 기존UI/C++/믹서/버퍼 검사가 통과했어요. 실제Windows fPV6Zw도 스트리밍12회/source1·옛ended0·강/약 신호와20개 소리/3HUD/93생성/6장면/입력/F12/60초를 통과했어요.1,000발/적30개600프레임은59.404764fps예요.
- 자연GC 대조와 현재수정 메모리 측정은 별도로 기록해요. 기존두8시간 검사는 기존 고정 패키지에서 계속되며 이번 수정의 장기 통과로 바꾸지 않아요. 실물Android·8시간·최종PC/실물30fps 미체크3개를 유지해요. 원본게임/검사기는 수정하지 않았어요.
- 고정Chromium6원문 전체 읽기/SHA/실제 범위를032에 기록하고6주소를 발견 대기열에 추가했어요. 설치Edge revision 일치와 전체corpus 완료로 승격하지 않아요.
