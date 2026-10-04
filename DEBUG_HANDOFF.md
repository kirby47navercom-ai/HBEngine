# 2D 렌더·단축키의 실제 창 조사 — 2026-10-05

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
