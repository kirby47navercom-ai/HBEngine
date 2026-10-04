# Unity 2D 물리 본문·API 분석 006

2026-10-04, 실제 읽기/분석 담당 `root`예요. Unity 6.0(6000.0) 영어 공식 offline 배포본 job76410965/2026-09-29의 **12본문·38heading·11표시 선언·6표(헤더 포함16행/32셀)·전체 예제3개·enum 멤버5행**을 직접 읽었어요. 자동 추출은 먼저 했지만 아래 조건/예외/예제 분석은 그 뒤 원문 전체를 읽고 작성했어요. 기술 그림/다른 언어 탭은 이12본문에 없어요.

표시 property syntax를 실제 plain field storage/getter/setter로 단정하지 않아요. namespace/module/native binding과 각 linked API, thread/실패/호환 계약은 따로 대기해요. 독립 검증/전체 API 분모가 미확정이라 **현재 원장 승격0, verified0**이에요. 전체 엔진 요구의 일부 연구이며 2D로 범위를 바꾸거나 기능 구현을 시작하지 않았어요.

## 고정한 출처와 실제 읽기

원본 HTML bytes와 첫 h1~publisher `_content` marker의 exact 추출 bytes를 private `native/build/reference-corpus/unity-2d-physics-batch`에 보존했어요. publisher feedback controls는 의미 inventory에서만 제외했고 raw/body bytes는 그대로예요. 모든 원본의 canonical/영어/6000.0 version header/job footer를 확인했고 공식 offline ZIP의 기존 acquisition/CRC 기록과 연결해요. 링크 대상 읽기는 아래 이름을 본 것과 구별해요. 원문 예제·표 설명 전체는 공개 문서에 복제하지 않아요.

## 1. Rigidbody2D-bodyType

출처: [Rigidbody2D-bodyType](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D-bodyType.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public RigidbodyType2D bodyType ;`

bodyType의 표시 타입은 RigidbodyType2D이고 물리 행동 종류를 선택한다. 이 짧은 본문은 Dynamic/Kinematic/Static 전환의 속도·contact 재생성·비용·허용 호출 단계를 설명하지 않는다. 후속 enum 전체를 읽어 세 이름만 확인했다.

HB 설계 후보: 2D body 종류를 렌더 차원/컴포넌트 enable과 독립 필드로 보존하고 변경 명령의 old/new value를 Undo 및 AI revision과 연결하는 후보다. 전환의 실행 계약은 미확정.

미해결: property accessor/default/storage, body-type transition/callback/contact/lifetime/thread.

## 2. Rigidbody2D.MovePosition

출처: [Rigidbody2D.MovePosition](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D.MovePosition.html). 표시 heading 4개, 선언 1개, 표 1개, 예제 1개예요.

표시 syntax:

- `public void MovePosition ( Vector2 position );`

Vector2 목표를 다음 physics update의 선형 속도로 이행한다. 이 이동 중 gravity와 linearDamping이 영향을 주지 않는다. collider의 충돌/trigger가 발생하며 응답이 목표 도달을 막을 수 있다. kinematic 본체는 충돌에 영향받지 않고 다른 dynamic collider에 영향 준다. 큰 이동은 고정 속도 제한 때문에 도달 실패할 수 있고 작은 이동을 권한다. 같은 step 이전 반복 요청은 마지막 것을 쓰며 FixedUpdate와 kinematic 용도를 권한다. 전체 예제는 Awake의 renderer/body 추가, Start의 texture→sprite/색/위치, FixedUpdate의 position+velocity*fixedDeltaTime을 보여주지만 bodyType을 Kinematic으로 설정하지 않는다.

HB 설계 후보: Transform teleport와 deferred 2D move-target을 별도 C++/node/AI action으로 설계한다. step 전 요청 교체, 도달 여부/충돌 진단과 좌표 단위를 명시하며 예제의 bodyType 미설정을 권장 설정을 실제 적용한 증거로 사용하지 않는다.

미해결: position local/world space not explicit here, numeric speed limit/default/body type relation, invalid target/component/thread/failure.

## 3. Rigidbody2D.AddForce

출처: [Rigidbody2D.AddForce](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D.AddForce.html). 표시 heading 4개, 선언 1개, 표 1개, 예제 1개예요.

표시 syntax:

- `public void AddForce ( Vector2 force , ForceMode2D mode = ForceMode2D.Force);`

표시 선언은 Vector2 force와 optional ForceMode2D.Force다. X/Y만 있고 질량에 따른 가속과 지속 Force를 설명한다. 두 인수 표 전체와 Sprite/Rigidbody2D 조건, 전체 Awake/Start/FixedUpdate 예제를 읽었다. 예제의 Force와 Impulse 두 호출은 모두 활성 코드이며 alternatively라는 주석만으로 둘 중 하나만 실행된다고 해석하지 않는다.

HB 설계 후보: Force와 Impulse를 3D 모드들과 분리한 2D enum/pin으로 노출한다. mass/time/벡터 차원과 step 시점을 node/C++/AI에 동일하게 정의하고 예제를 자동 구현 템플릿으로 그대로 복사하지 않는다.

미해결: force coordinate frame/range/thread/invalid body, call accumulation/disabled/sleeping/static/kinematic effect, 2D enum numeric IDs not shown.

## 4. Rigidbody2D-simulated

출처: [Rigidbody2D-simulated](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D-simulated.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public bool simulated ;`

bool이 본체의 physics simulation 참여를 나타내며 false일 때 부착 Collider2D와 Joint2D도 참여하지 않는다. 시각 표시/GameObject 활성/컴포넌트 lifetime과 같다고 하지 않는다. query에서 보이는지/다시 true로 할 때 state 보존·callback은 이 본문에 없다.

HB 설계 후보: simulation participation을 visibility/enabled/destroy와 독립 직렬화하고 inspector/C++/node/AI가 같은 action을 사용한다. 연결 collider/joint 영향은 진단에 표시할 후보다.

미해결: default/accessor, query visibility/re-enable contacts/sleep/velocity/callback/thread.

## 5. Rigidbody2D-useFullKinematicContacts

출처: [Rigidbody2D-useFullKinematicContacts](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody2D-useFullKinematicContacts.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public bool useFullKinematicContacts ;`

false 기본에서 kinematic-kinematic/kinematic-static은 충돌하지 않고 kinematic-dynamic은 가능하다. true면 앞 두 pair의 contact callback이 생기지만 자동 collision response는 없어 overlap을 허용한다. contact point/normal을 반응 없이 받을 수 있으며 Kinematic bodyType일 때만 사용한다. 본문 내부 [[...]] markup 잔재도 보존했다.

HB 설계 후보: contact generation/notification/solver response/trigger를 하나의 collision checkbox로 합치지 않는다. component와 collision filter view/C++/node/AI에서 각각 구분한다.

미해결: runtime change/contact transition/trigger combinations, callback ordering/data lifetime/thread.

## 6. Physics2D-autoSyncTransforms

출처: [Physics2D-autoSyncTransforms](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D-autoSyncTransforms.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public static bool autoSyncTransforms ;`

Transform과 자식의 body/collider position/rotation/scale 동기화를 제어한다. false면 Fixed Update simulation 직전에 sync하며 명시 SyncTransforms도 가능하다고 설명한다. true로 Transform 변경 후 query를 반복하면 성능 손실이고 Unity2017.2 이전 호환 외에는 off를 권한다. manual simulation/다른 mode의 모든 world에 이 문장을 확장할 근거는 없다.

HB 설계 후보: 여러 사람/AI Transform 편집을 하나의 dirty batch로 모아 query/step 경계에서 flush하는 후보다. physics sim advance와 sync를 분리하고 frame/fixed/manual mode별 계약을 후속 조사한다.

미해결: actual current default, manual/Update simulation mode/independent Scene sync applicability, query freshness/order/thread.

## 7. Physics2D-reuseCollisionCallbacks

출처: [Physics2D-reuseCollisionCallbacks](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D-reuseCollisionCallbacks.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public static bool reuseCollisionCallbacks ;`

Enter2D/Stay2D/Exit2D에 넘기는 Collision2D는 true일 때 하나의 instance를 callback마다 재사용해 GC 부담을 줄인다. callback 밖의 지연 처리에서 참조를 유지하려면 false로 하라고 설명한다. 한 번 저장한 참조가 영구 event snapshot이라는 보장은 없다.

HB 설계 후보: C++/node/AI event record는 명시적 borrowed callback data 또는 복사 snapshot으로 구분해야 한다. stable object ID와 epoch를 포함하는 HB 후보이며 원엔진 AI 계약은 아니다.

미해결: default/thread/reentrant scope/per-world identity, exact invalidation timing/retention allocation cost.

## 8. Collision2D.GetContacts

출처: [Collision2D.GetContacts](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Collision2D.GetContacts.html). 표시 heading 9개, 선언 2개, 표 2개, 예제 0개예요.

표시 syntax:

- `public int GetContacts (ContactPoint2D[] contacts );`
- `public int GetContacts (List<ContactPoint2D> contacts );`

array와 List<ContactPoint2D> 두 표시 overload는 결과 container에 쓴 contact 수를 int로 반환한다. array는 충분히 크게 재사용하고 할당하지 않는다고 설명하며 contactCount로 필요 수를 볼 수 있다. list는 부족하면 자동 증가하므로 capacity 충분할 때만 무할당이다. collider/otherCollider 사이 contact이며 두 인수/반환/Description 전체를 읽었다.

HB 설계 후보: C++ span/동적 배열, node typed-array, AI snapshot API의 결과 count/capacity/overflow 비용을 분리한다. 배열에서 전체 contact 수를 무조건 반환한다고 추정하지 않는다.

미해결: ordering/truncation choice/null/empty container/exception/thread, ContactPoint2D space/lifetime and stale Collision2D.

## 9. ForceMode2D

출처: [ForceMode2D](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ForceMode2D.html). 표시 heading 3개, 선언 0개, 표 1개, 예제 1개예요.

enum 이름/Properties 표가 있지만 formal enum declaration이나 numeric 값은 없어요.

enum marker와 Force/Impulse 두 Properties 행을 읽었다. 둘 다 mass 사용이며 Force는 지속, Impulse는 즉시 충격이다. 3D ForceMode는 다른 링크다. 전체 예제는 Update mode switch와 OnGUI reset/impulse/force 버튼을 사용하고 예전 Rigidbody2D.velocity 이름을 쓴다. 현재 archive에 그 이름 파일이 없지만 실제 compile/폐기 binding을 조사하지 않아 compile 실패로 확정하지 않는다. Impulse 모드는 버튼1회마다1번이 아니라 Update마다 호출되는 예제다.

HB 설계 후보: 3D의 네 mode를 2D로 임의 복제하지 않고 UI에 force 단위/step과 impulse 단위를 구분한다. numeric enum 값을 외부 문서 없이 고정하지 않는다.

미해결: numeric IDs/flags/native mapping, velocity compatibility/actual sample compilation, Update example and fixed-step accumulation relation.

## 10. Physics2D.SyncTransforms

출처: [Physics2D.SyncTransforms](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D.SyncTransforms.html). 표시 heading 3개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public static void SyncTransforms ();`

public static void 무인수 선언이며 변경 Transform과 자식의 Rigidbody2D/Collider2D 위치·회전·크기를 동기화한다고 설명한다. 시간 advance/contact callback/solver run/세계 선택은 이 본문에 없다.

HB 설계 후보: sync command를 physics simulate와 독립하고 해당 시점/dirty Transform batch를 명시하는 후보다. GUI 편집과 AI/C++ 호출이 같은 flush 경로를 사용할 조건을 후속 API와 대조한다.

미해결: world/scene scope/callback/query guarantee, allowed phase/thread/failure/order.

## 11. RigidbodyType2D

출처: [RigidbodyType2D](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/RigidbodyType2D.html). 표시 heading 3개, 선언 0개, 표 1개, 예제 0개예요.

enum 이름/Properties 표가 있지만 formal enum declaration이나 numeric 값은 없어요.

enum marker와 Dynamic/Kinematic/Static 세 Properties 행을 전체 읽었다. 이동·힘·나머지 simulation 상호작용의 행동 종류라고만 설명하며 각 상세 동작과 numeric ID는 없다.

HB 설계 후보: 차원/body kind를 안정 semantic enum으로 표현하되 Unity native 숫자나 HB 현재 물리와의 동등성을 주장하지 않는다. 세 member 후속 본문을 별도 대기열로 남긴다.

미해결: numeric IDs/default/bit flags, each kind detailed collision/mass/simulation/transition.

## 12. Physics2D-maxTranslationSpeed

출처: [Physics2D-maxTranslationSpeed](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D-maxTranslationSpeed.html). 표시 heading 2개, 선언 1개, 표 0개, 예제 0개예요.

표시 syntax:

- `public static float maxTranslationSpeed ;`

public static float 표시 속성은 body의 physics update당 최대 linear speed이며 증가시 numerical problem 가능성을 경고한다. 실제 단위/범위/default/검증·clamp와 MovePosition 한계의 정확 적용 식은 제공하지 않는다.

HB 설계 후보: 큰 월드/fast body 설정과 diagnostic을 시뮬레이션 안정성 연구에 연결한다. map 크기 제한을 이 값과 동일시하거나 임의수치로 원엔진 값인 것처럼 제공하지 않는다.

미해결: units/default/range/getter setter/clamp, MovePosition coupling/solver body modes/independent Scene/thread.

## API·C++·노드·사람과 AI의 공통 적용 후보

입력 차원과 mode, simulation 참여와 visibility, contact callback와 collision response, Transform 쓰기와 physics sync/step, borrowed collision data와 복사 event snapshot을 구분해야 해요. 원문에 없는 policy는 HB 설계 후보로 남겨요. 사람의 Inspector와 node pin·사용자 C++·AI structured command가 같은 검증/직렬화/revision/Undo 규약을 사용할 연구 조건이며 지금 구현했다고 주장하지 않아요.

예제의 현재 호환성·2D body 타입 전환·query/Scene 범위·numeric enum·native module·thread·오류·반환·비동기 lifetime은 후속 실제 본문 및 API 연구 대기예요. linked member 제목만 보고 그 내용을 완료하지 않아요. 전체 요구의 animation/material/AI behavior/network/build/import/editor와 API 전체 목록을 계속 유지해요.

## 동시점 live 본문 비교와 미해결

2026-10-04에 MovePosition/simulated/reuseCollisionCallbacks의 공식 URL을 실제 요청해 HTTP200·Unity6000.0/job76758565/2026-10-03을 확인했어요. pinned archive와 technical text가 세 페이지 모두 같았어요. raw HTML hash는 새 footer/웹사이트 코드 때문에 다르며 별도 private live-comparison.json에 기록했어요. 이3개 비교로 다른9본문/전체 corpus/문서 모든 판본의 동등성을 주장하지 않아요.

ForceMode2D 예제의 `Rigidbody2D.velocity`에 대응하는 기존 archive 파일이 없어요. 이를 링크/호환 조사 문제로 남기고 actual compile/deprecation/native binding을 확인하기 전 정상/실패 어느 쪽으로도 판정하지 않아요. 전체 예제 실행·게임 실행·GUI·엔진 변경은 하지 않았어요.
