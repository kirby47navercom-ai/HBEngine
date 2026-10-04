# Unity 6000.0 생명주기 본문 분석 002

2026-10-04 한국 시간 기준, 짚짱의 담당 agent `unity_lifecycle_body`가 공식 영어 배포본의 **8개 MonoBehaviour 메시지와 실행 순서 Manual 1개**를 직접 읽었어요. 이 기록은 주인님이 요구하신 전체 공식 문서/API 분석의 작은 부분이에요. 전체 분석 완료나 구현 착수 근거가 아니며, 이번 9개는 **독립 verified 0개**예요. 엔진 코드 변경·GUI 실행·브라우저 조작은 하지 않았어요.

## 기준과 실제 확인한 수량

공식 [Unity 6000.0 영어 ZIP](https://cloudmedia-docs.unity3d.com/docscloudstorage/en/6000.0/UnityDocumentation.zip)의 기존 캐시를 사용했어요. ZIP 메타데이터는 HTTP 200, 392,108,580 bytes, Last-Modified `2026-10-02 00:05:08 GMT`이며, 이번에 다시 계산한 ZIP SHA-256은 `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`로 일치해요. 9 HTML과 2 SVG는 ZIP entry와 추출본 bytes를 직접 비교해요. HTML version 표시는 모두 `Unity 6.0 (6000.0)`이고 footer는 job `76410965`, build `2026-09-29`예요. 이 판본을 최신이라고 주장하지 않아요.

본문 위치는 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en`이에요. 증거는 `native/build/reference-corpus/unity-lifecycle-batch`의 원문 snapshot·`*.body.txt`·`*.body.html`·`extraction-evidence.json`·SVG/PNG·`media-render-evidence.json`에 있어요. sourceHash/bodyHash/구역 hash는 [기계 기록](unity-lifecycle-body-002.json)에 있어요. 본문 추출은 BeautifulSoup 4.15.0으로 사이트 탐색·피드백 UI·footer·주석·glossary tooltip 확장을 제거하고 본문·예제·링크·이미지를 남겼어요. API의 빈 declaration 슬롯은 숨기지 않았어요.

| 항목 | 이번 담당 범위 |
| --- | ---: |
| 실제 읽은 본문 페이지 | 9 |
| 본문 의미 분석 구역 | 42 |
| HTML 슬롯 | 50: 위 42구역과 비어 있는 declaration 8슬롯 |
| 원문 heading 요소 | 26: API의 제목/Description 16, Manual 제목/하위 heading 10 |
| 읽은 C# 코드 예제 | 11 |
| 본문 HTML table | 0 |
| 확보·텍스트/시각 확인한 SVG | 2 |
| 이번 메시지별 계약 분석 | 8 |
| 비어 있지 않은 formal `signature-CS` 선언 | 0 |
| 예제에서 관찰한 담당 callback 형태 | 9: 메시지 8종과 `Start`의 void/IEnumerator 두 형태 |
| 공식 전체 API/overload 분모 | unknown |
| 독립 검증 | 0 |

API 페이지 제목과 예제 메서드 정의를 formal 선언/overload로 세지 않아요. `void Awake()` 등을 Unity native C++ declaration으로 옮기거나 `override/public/virtual`을 덧붙이지 않아요. parameter가 없는 예제와 void 또는 IEnumerator 반환 형태만 관찰했어요. 정확한 assembly/module·thread·다른 callback의 예외 정책은 이번 페이지에 없어 미해결이에요. JSON의 `analyzed`는 읽은 해당 본문을 의미 분석했다는 뜻이며 API 계약이 완결되었다는 뜻이 아니에요.

## 메시지별 본문과 예제

| 공식 페이지 | 실제 구역 위치 | 구체적 사실·예제·제약 |
| --- | --- | --- |
| [Awake](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Awake.html) | `subsection:2..8` | 활성 계층의 장면 초기화, 비활성→활성 전환, Instantiate한 parent 초기화 뒤에 호출해요. 조건을 만족하면 component.enabled가 false여도 호출하며 instance당 한 번이에요. 다른 GameObject의 Awake 순서는 비결정적이라 다른 Awake가 만든 상태에 의존하지 않아요. 생성자 시점 serialized state는 undefined이며 Awake 예외는 component를 disable해요. coroutine 불가예요. 첫 예제는 Player tag 참조를 얻고, 나머지 두 예제는 Cube1을 Inspector 좌상단 체크로 비활성화한 뒤 Cube2의 GO로 연결하여 Play 중 Space로 활성화해요. Cube1의 Awake/Start와 B키 Update 로그를 보지만 이것을 실측하지는 않았어요. |
| [OnEnable](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnEnable.html) | `subsection:2..4` | Play 진입 때 activeInHierarchy와 enabled가 모두 true인 경우, 활성 객체의 component를 code/Inspector로 enable한 경우, enabled component의 객체 또는 비활성 ancestor를 활성화한 경우에 호출해요. Play 진입에서 Awake 뒤·Start 전이며 coroutine 불가예요. ExecuteInEditMode 예제는 OnEnable/OnDisable을 로그로 보여 주고 editor에서 위치가 바뀔 때의 Update를 예시로 들어요. 이 속성 전체 동작이나 모든 edit-mode 프레임을 보장하는 자료는 아니에요. |
| [Start](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Start.html) | `subsection:2..4` | enabled되는 frame의 첫 Update 전, lifetime당 정확히 한 번이며 Awake 뒤에 호출해요. 초기 disabled라면 Awake와 같은 frame이 아닐 수 있어요. 장면 객체의 Awake 완료를 초기 의존성 분리에 활용해요. Update 중 Instantiate한 객체의 Awake/Start는 현재 frame 끝 전 호출된다고 적혀 있어요. IEnumerator Start 예제는 Start1을 기록하고 WaitForSeconds(2.5f) 후 Start2를 기록하며 Update는 deltaTime 누적으로 별도 로그를 내요. Start의 coroutine 완료가 Update 전체를 막는다고 본문을 확대하지 않아요. |
| [Update](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Update.html) | `subsection:2..5` | enabled Behaviour에서 frame마다 호출해요. 모든 script가 Update를 가질 필요는 없어요. 마지막 호출 후 경과 시간은 Time.deltaTime을 사용해요. 예제는 Awake에서 누적값을 0으로 만들고 IEnumerator Start와 별도로 Update가 deltaTime을 더하다 1초보다 커지면 0으로 되돌리고 로그를 내요. 정확히 1초 경계의 timer나 catch-up 보장은 예제가 입증하지 않아요. |
| [FixedUpdate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.FixedUpdate.html) | `subsection:2..4` | physics update loop의 고정 간격이며 Time.fixedDeltaTime/Time 설정의 Fixed Timestep으로 정해요. 기본 0.02초, 50회/초예요. Rigidbody force처럼 물리 계산에 사용하고 render frame당 0·1·복수 회가 가능해요. 예제는 Awake에서 Loop coroutine을 시작하고 Update/FixedUpdate 횟수를 각각 증가시키며 WaitForSeconds(1)마다 표본을 갱신하여 OnGUI에 표시해요. targetFrameRate=10은 주석 처리된 비교 옵션이에요. 본문의 deterministic 표현을 모든 플랫폼·physics backend의 동일 결과 보장으로 확대하지 않아요. |
| [LateUpdate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.LateUpdate.html) | `subsection:2..5` | enabled Behaviour에서 모든 Update 이후 frame마다 호출해요. Update에서 이동한 대상을 follow camera가 추적하는 단계로 설명해요. 예제는 transform.Translate(0, Time.deltaTime, 0)이며 실제 camera를 만들지는 않아요. elapsed time 안내와 enabled 제한이 마지막 구역에서 재확인돼요. 같은 script의 여러 instance 순서를 정하는 계약은 아니에요. |
| [OnDisable](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnDisable.html) | `subsection:2..4` | 활성 객체의 component disable, enabled component의 parent GameObject deactivate, component/parent Destroy, scene unload, domain reload 중 script reload에서 호출해요. coroutine 불가예요. ExecuteInEditMode 예제는 OnDisable/OnEnable 로그와 editor Update를 포함해요. disable과 destroy를 동일 사건으로 합치면 재활성화와 reload 경계를 잃어요. |
| [OnDestroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnDestroy.html) | `subsection:2..6` | Object.Destroy, DontDestroyOnLoad로 보존되지 않은 scene 종료/unload, runtime quit/Play 종료에서 호출해요. 이전에 active였던 GameObject에만 호출하고 coroutine 불가예요. 모바일 OS가 suspended app을 종료하면 호출되지 않을 수 있어 저장 보장으로 사용하지 않으며 source는 OnApplicationFocus를 연결해요. 예제1은 GUI.Button으로 SceneManager.LoadScene(1)을 호출하고 예제2는 새 장면의 Start/OnEnable/OnDestroy 로그를 보여 줘요. 예제의 scene index 설정을 본문이 완전히 제공하지 않아 실행 재현 증거는 아니에요. |

Awake의 “항상 어떤 Start보다 먼저”라는 일반 문장과 비활성 Cube1을 나중에 활성화하는 같은 페이지의 예제, Start 페이지의 runtime Instantiate 설명은 범위를 명확히 대조해야 해요. 이번에는 이를 모든 객체·모든 frame에 걸친 barrier로 결론 내리지 않고 `UL-002-ORDER-SCOPE`로 남겼어요. Awake의 scene unload 중심 lifetime 설명도 Destroy/DontDestroyOnLoad를 포함한 모든 instance 수명 계약으로 사용하지 않아요.

## 실행 순서 Manual의 모든 heading

공식 [Event function execution order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html)는 기존 `ExecutionOrder.html` 요청이 소문자 경로로 이동한 별칭이에요. 기존 response 메타데이터의 requested/final URL만 있어 개별 redirect hop 전체가 확보되었다고 표현하지 않아요. 이번 읽은 원문은 ZIP의 `Manual/execution-order.html`이에요.

| 정확한 heading / 증거 구역 | 해당 구역의 의미 분석 |
| --- | --- |
| Event function execution order / `heading:1` | 그림은 핵심 단계만 보여 줘요. 전체 Player loop는 더 크며 PlayerLoop API로 조회·추가·삭제·순서를 바꿀 수 있어요. 그림을 전체 system 분모로 세지 않아요. |
| Before scene load and unload / `heading:2` | sceneLoaded는 장면 객체의 OnEnable 뒤·Start 전이에요. sceneLoaded/sceneUnloaded 자체 API와 reload 설정 그림은 후속 읽기 대상이에요. |
| Run code on Editor launch / `heading:3` | class static constructor의 InitializeOnLoad, method의 InitializeOnLoadMethod를 구분해요. MonoBehaviour 인스턴스가 필요 없는 editor 시작 경로예요. |
| Run code on runtime intialization / `heading:4` | 원문의 `intialization` 철자를 보존해요. RuntimeInitializeOnLoadMethodAttribute와 RuntimeInitializeLoadType 선택을 소개하며 구체 순서는 API로 보내요. 표기 `RunTimeInitializeLoadType`의 link는 실제 `RuntimeInitializeLoadType.html`이에요. |
| Internal animation update / `heading:5` | MonoBehaviour의 OnAnimatorMove/IK와 StateMachineBehaviour의 7가지 callback을 분리해요. 내부 animation 단계의 Profiler marker를 callback처럼 사용자 노드로 제공한다고 가정하지 않아요. |
| Rendering / `heading:6` | 설명한 순서는 Built-in pipeline에 한정해요. camera cull 전 OnPreCull, camera별 visible object OnWillRenderObject, render 전/후 callback과 image post-process를 구분해요. OnGUI는 GUI 사건에 따라 frame 중 여러 번이에요. OnPreCull/PreRender/PostRender/RenderImage는 enabled Camera와 같은 object의 script 조건이 있고 다른 object는 Camera delegate를 사용해요. URP/HDRP는 각각 다른 자료를 읽어야 해요. |
| Resumption of coroutines and asynchronous tasks / `heading:7` | EndOfFrame/FixedUpdate yield가 서로 다른 단계에 재개해요. .NET Task는 Update phase, Awaitable은 사용 method에 따라 달라져요. coroutine과 task의 상대 순서는 보장하지 않으며 Awaitable은 awaited 순서로 묶여 실행돼요. |
| Combining MonoBehaviours with Entities / `heading:8` | ECS group을 Player loop에 병합해요. Entities Systems window에서 순서를 확인하도록 안내하지만 `latest`와 Entities1.4 링크의 compatibility를 이 페이지가 확정하지 않아요. |
| Limitations / `heading:9` | 같은 script의 다른 instance는 parent/child여도 callback 순서를 지정할 수 없어요. 서로 다른 script의 순서 설정은 별도 Script execution order 자료예요. |
| Additional resources / `heading:10` | Event functions·MonoBehaviour·PlayerLoop·Script execution order를 후속 링크로 남겨요. 링크의 존재를 하위 본문 분석 완료로 세지 않아요. |

2 SVG는 원본 text 요소만 추출한 뒤 끝내지 않았어요. bundled `sharp 0.35.4 / librsvg 2.62.91`로 원본을 배경화한 2000px PNG를 만들고 **총 5개의 연속 crop**을 `view_image`로 모두 확인했어요. `monobehaviour_flowchart.svg`는 Awake→OnEnable→Start, 고정 physics 반복→Update→재개 구역→animation→LateUpdate, render→gizmo→end-of-frame, pause/quit/disable/destroy를 보여 줘요. Reset은 editor attach 조건을 별도 주석으로 제한하고, animation 위치는 Animator.animatePhysics 값으로 나눠요. callback/내부 함수/내부 multithreaded 함수 범례도 읽었어요. white callback 도형을 근거로 callback의 정확한 thread를 임의 확정하지 않아요.

`animation-update-sequence.svg`의 시각 흐름은 state machine update→OnStateMachineEnter/Exit→ProcessGraph→animation event→StateMachineBehaviour callback→OnAnimatorMove→ProcessAnimation→OnAnimatorIK→WriteTransform→WriteProperties예요. IK/WriteTransform 구역의 돌아가는 화살표도 확인했지만 반복 조건은 그림에 설명되지 않아 미해결로 남겼어요. XML text 저장 순서가 그림의 실행 순서와 달라 시각 대조가 필요했어요. 주 그림의 coroutine/task 세로 배치도 본문의 명시적 상대 순서 비보장을 대체하지 않아요. destroy 후 OnEnable 쪽으로 향하는 회색 경로를 같은 파괴된 instance의 부활로 해석하지 않아요.

## HB 대응은 설계 후보예요

아래는 Unity의 공식 기능이나 이번에 구현한 기능이 아닌 **HB 연구 판단**이에요. 누적 요구 ID `HB-LIFE-002-*`는 이 문서의 지역 연구 ID이며 전역 기능 분모를 새로 확정하지 않아요.

| 누적 연구 요구 | C++ / Blueprint / runtime | 사람 편집 UI / AI / 저장 데이터 | 향후 확인 조건 |
| --- | --- | --- | --- |
| `HB-LIFE-002-INIT` 초기화·시작 구분 | deserialize/참조 복원 뒤 instance 초기화 1회, 첫 유효 실행 전에 Start성 단계 1회; 두 backend가 같은 stage scheduler를 사용해요. 현재 Construction/BeginPlay를 Awake/Start와 동등하다고 선언하지 않아요. | Inspector의 component enabled와 object/ancestor active를 분리하고 AI가 같은 검증 모델로 상태를 바꾸게 해요. scene/blueprint에 편집 기본값을 저장하며 awakened/started는 instance runtime 상태로 구분해요. | 초기 disabled, inactive ancestor, 늦은 활성화, scene 재로드·additive·runtime spawn을 단계별 검증해요. |
| `HB-LIFE-002-ACTIVE` 활성·비활성·해제 | disable/re-enable을 destruction과 분리해요. C++ callback과 노드의 반복 enable/disable 횟수·순서, 구독/정리를 공통화해요. | 사람과 AI의 enable/active 변경·Undo/Redo는 같은 변경 경로를 써요. runtime 변경이 편집 기본값을 자동 덮는 정책은 별도 결정이에요. | 반복 enable에서 initialize/start를 다시 실행하지 않는지, 파괴가 re-enable로 오인되지 않는지 검사해요. |
| `HB-LIFE-002-PHASE` frame·fixed·late 단계 | 고정-step과 frame/late, physics/animation/async 재개 경계를 분리하고 C++/노드에 같은 delta/phase를 전달해요. Unity0.02초와 HB 현재1/60 차이를 데이터로 명시해요. | 프로젝트 시간 설정과 script 종류 간 실행 순서 UI/AI schema를 후보로 두고 instance별 순서는 별도 지원 여부를 표시해요. 저장된 시간·순서 설정과 일시정지 실행 상태를 분리해요. | frame당0/1/복수 fixed, pause, 지연 frame, camera follow, coroutine/task 비보장 경계를 확인해요. |
| `HB-LIFE-002-STOP` 종료·정리·저장 | 정상 종료 cleanup과 저장 flush를 분리하고 C++ RAII를 Unity OnDestroy로 번역하지 않아요. suspend/강제 종료에도 OnDestroy 성공을 저장 보장으로 삼지 않아요. | UI 중지/scene 전환과 AI 중지 명령이 같은 cleanup 서비스를 쓰고 실패 원인을 반환해요. durable checkpoint 정책은 별도 데이터 계약이에요. | never-active destroy, scene 전환, cleanup callback 실패, 모바일 focus/강제 종료 타깃을 각각 검사해요. |
| `HB-LIFE-002-LOOP` 전체 실행 흐름·확장 | 사용자 callback과 내부 physics/animation/render/ECS phase를 다른 개념으로 기록해요. custom loop·렌더 pipeline·editor launch initializer는 별도 분석 후 대응해요. | 사람의 frame trace/Profiler와 AI 조회가 같은 실제 순서·instance/phase 정보에 접근하는 후보예요. persisted extension descriptor와 런타임 trace를 구분해요. | 해당 API/package 전체 계약·thread·지원 타깃이 조사되기 전 정확한 구현 계약을 닫지 않아요. |

읽기 전용 대조에서 `prototype/blueprint-runtime.js:22`는 모든 Construction 뒤 hook.start, 이후 BeginPlay를 실행하고 `:23..28` stop은 EndPlay 후 jobs/timer/subscription/input을 정리해요. `:34..41` fixedTick과 tick이 있고 tick 후 physics hook이 호출돼요. 따라서 현재 frame tick→physics hook을 Unity 그림의 fixed→Update 순서와 그대로 같다고 말할 수 없어요. `prototype/scene-runtime.js:27..33`의 기본 fixedStep은1/60, maxSubsteps8이며 accumulator를 제한해요. Unity FixedUpdate의 기본0.02초와 이 catch-up 정책은 달라요. `native/include/HBEngine/Game.hpp:22..24`의 Actor/Component는 destructor만 있어 8종 managed 메시지 수명을 증명하지 않아요. `docs/BLUEPRINT_SPEC.md:29..31`도 Construction의 native edit-time lifetime을 남은 범위로 표시해요. 이번 코드 읽기는 해당 위치 대조이며 전체 저장소 구현 감사가 아니에요.

## 미해결·독립 검증 인계

9본문에서 기술 링크 **고유94개**를 기록했어요. 이 가운데 고정6000.0 경로90개는 offline 파일 존재를 확인했지만 해당 링크 전체를 읽지는 않았어요. 나머지4개는 Entities1.4, Entities latest, HDRP latest, Microsoft static-constructor 자료예요. 이 bounded batch의 링크 확장은 closed가 아니에요. 이번 확인에서 고정경로의 파일 누락은0개이며 HTTP/anchor/본문/API 계약 정상이라는 뜻은 아니에요.

JSON의 unresolved는 빈 formal 선언8개, thread/module/native boundary, Awake/Start 범위와 수명 서술, 다른 callback의 예외, FixedUpdate enabled/coroutine/정확한 determinism 범위, coroutine 완료/취소, reload 설정, SVG 상대 순서·회색 loop·IK 반복 해석, render callback autolink owner와 pipeline, unpinned package 호환성, target version aliases, save/serialization/editor Undo 전체 계약이에요. 해결 여부를 가정으로 채우지 않았어요. sourceHash/bodyHash/42구역·11예제·2미디어·8메시지 계약과 이 문서 SHA pin을 별도 검증자가 대조해야 해요. 이 담당자가 자기 분석을 verified로 올리지는 않았어요.
