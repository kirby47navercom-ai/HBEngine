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
