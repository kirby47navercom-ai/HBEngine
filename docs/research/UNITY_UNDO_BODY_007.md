# Unity 저작·구조 변경 Undo 본문 분석 007

2026-10-04, 읽기/분석 담당 `root`예요. Unity 6000.0/en/job76410965/2026-09-29 기준본의 **6전체 본문·31heading·8표시 선언·7표(헤더 포함19행/38셀)·2전체 예제**를 직접 읽었어요. 원문과 추출은 `native/build/reference-corpus/unity-undo-batch`에 private로 보존하고 공개 기록에는 표시 syntax·locator·hash·본인 분석을 남겨요. 기술 그림과 다른 언어 탭은 없어요. 독립 verified와 원장 승격은 0이에요. 엔진·게임·GUI를 변경하거나 실행하지 않았어요.

기존 RecordObject/Prefab 분석과 연결하면서 전용 구조 변경·snapshot·group 계약을 구분해요. 관련 API와 전체 문서/API 분모의 확인은 남아 있고, 기능 구현을 재개하지 않아요.

## 1. Undo.SetTransformParent

[Undo.SetTransformParent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.SetTransformParent.html): 실제 heading 4개, 표시 선언 1개, 표 1개, 전체 예제 0개예요.

- `public static void SetTransformParent ( Transform transform , Transform newParent ,
string name );`

변경할 Transform·newParent·history 표시 name의 인수 3개를 받아 부모 변경과 Undo 등록을 함께 해요. 단순 RecordObject로 복구할 수 없던 부모 변경의 전용 API예요. transform.parent = newParent와 같다고 설명하지만 world/local 보존·null/root·cycle 거부·dirty/prefab 저장·실패·thread는 이 본문에 없어요.

HB 설계 후보: Outliner의 끌어서 부모 변경·노드·C++ editor API·AI hierarchy command를 전용 구조 변경 transaction에 연결하는 후보예요. 엔진의 부모 규칙과 좌표 계약을 후속 확인하기 전에 임의 기본값을 원출처 사실로 확정하지 않아요.

미해결: Transform.parent assignment contracts, root/cycle/space/worldPositionStays/default/failure/thread, prefab override/scene dirty and saving.

## 2. Undo.AddComponent

[Undo.AddComponent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.AddComponent.html): 실제 heading 9개, 표시 선언 2개, 표 2개, 전체 예제 0개예요.

- `public static Component AddComponent ( GameObject gameObject ,
Type type );`
- `public static T AddComponent ( GameObject gameObject );`

GameObject와 Type를 받는 Component 반환형, GameObject만 받는 표시 T 반환형의 두 overload예요. 추가와 Undo 등록을 함께 하고 Undo 시 새 컴포넌트를 파괴해요. 반환값은 새 컴포넌트예요. 표시된 T의 constraint와 완전한 generic 선언은 없어서 만들어 채우지 않아요. 초기화·필수 의존 컴포넌트·잘못된 타입·중복·Undo/Redo의 callback과 참조는 미확인이에요.

HB 설계 후보: 컴포넌트 추가를 일반 속성 변경과 분리해 stable component ID 생성·구조 snapshot·삭제/복구·의존성 검증의 공통 명령으로 설계하는 후보예요. 파괴 후 재생성할 때 저장된 raw pointer가 안전하다고 주장하지 않아요.

미해결: generic constraint and complete signature, component constructor/Awake/OnEnable/required component/duplicates, Undo redo lifetime/null/error/thread/serialization.

## 3. Undo.DestroyObjectImmediate

[Undo.DestroyObjectImmediate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.DestroyObjectImmediate.html): 실제 heading 4개, 표시 선언 1개, 표 1개, 전체 예제 0개예요.

- `public static void DestroyObjectImmediate ( Object objectToUndo );`

Object 인수 하나로 파괴하고 Undo buffer에 파괴된 객체를 저장해 다시 생성할 수 있어요. 설명은 DestroyImmediate(objectToUndo, true)와 같은 동작이라고 연결해요. 게임의 지연 파괴와 구분할 저작 명령이지만, 직접 binding과 연결된 DestroyImmediate를 읽기 전에 파일 삭제 권한이나 모든 외부 참조 복구를 확정하지 않아요.

HB 설계 후보: 에디터 삭제 transaction은 대상·하위 객체·참조·에셋 파일 영향·복구 데이터·stable ID를 기록하고 사람·AI·C++ editor·node 명령에서 동일한 검증을 사용해야 해요. 물리/게임의 지연 파괴와 이 명령을 구분하는 후보예요.

미해결: DestroyImmediate linked allowDestroyingAssets contract, children/dependencies/external references/file restoration, permissions/runtime applicability/thread/null/errors.

## 4. Undo.RegisterCompleteObjectUndo

[Undo.RegisterCompleteObjectUndo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RegisterCompleteObjectUndo.html): 실제 heading 7개, 표시 선언 2개, 표 2개, 전체 예제 1개예요.

- `public static void RegisterCompleteObjectUndo ( Object objectToUndo ,
string name );`
- `public static void RegisterCompleteObjectUndo (Object[] objectsToUndo ,
string name );`

호출 시 객체 상태를 복사해 후속 변경을 기록한 상태로 되돌려요. 부모 변경·컴포넌트 추가·객체 파괴는 복구 범위가 아니며 전용 API 3개를 쓰도록 해요. Scene 객체라면 실제 후속 값 변경이 없어도 호출 즉시 Scene을 modified로 표시해요. Object[] overload는 하나의 Undo operation을 만들어요. 전체 예제는 새 Player 생성→snapshot→이름 변경→Edit의 Undo로 이름 복구 순서예요. 새 객체 생성 자체를 Undo로 등록한 증거는 아니에요.

HB 설계 후보: 전체 snapshot·delta·구조 변경을 분리하고 다중 선택에서 하나의 Undo를 제공하는 후보예요. AI 명령의 no-op가 모든 경로에서 dirty를 만들지 않는다고 전제하지 않고, 저장/revision 정책을 선택한 Undo 계약에 연결해야 해요.

미해결: deep versus shallow state/serialized fields and reference retention, prefab/saving/native state and version, null/array duplicates/exception/thread/redo.

## 5. Undo.IncrementCurrentGroup

[Undo.IncrementCurrentGroup](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.IncrementCurrentGroup.html): 실제 heading 3개, 표시 선언 1개, 표 0개, 전체 예제 0개예요.

- `public static void IncrementCurrentGroup ();`

Undo는 current group index로 자동 묶이며 mouse down·menu 실행 같은 이벤트에서 index가 증가해요. 필요하면 수동으로 그룹을 나눠요. 표시 선언은 static void이며 무인수예요. group index를 현재 작업창의 탐색 이력이나 게임 상태와 동일시하지 않아요.

HB 설계 후보: 끌기·slider·복합 AI 편집의 시작과 완료를 명시적인 그룹 transaction으로 정하고 pane focus·Undo owner와 에셋 탐색 이력을 분리하는 후보예요. 엔진 규칙은 관련 CurrentGroup API의 근거를 확인한 뒤 정해요.

미해결: group increment exact phase/index range/nesting/rollback, GetCurrentGroup/SetCurrentGroupName/Undo callbacks, thread/runtime/automatic save.

## 6. Undo.CollapseUndoOperations

[Undo.CollapseUndoOperations](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.CollapseUndoOperations.html): 실제 heading 4개, 표시 선언 1개, 표 1개, 전체 예제 1개예요.

- `public static void CollapseUndoOperations (int groupIndex );`

지정 groupIndex보다 높은 operation을 해당 그룹까지 묶어 한 단계로 만들어요. color picker는 열린 동안 변경을 별개의 Undo operation으로 두고 닫히면 한 단계로 묶는 예예요. 별도의 cancel/rollback API 보장을 뜻하지 않아요. 전체 코드 예제는 이름 설정→현재 그룹 확보→Selection.transforms의 RecordObjects→각 position을 zero로 변경→collapse 순서예요. 빈 선택·실패 중 부분 Undo·다른 창에서 끼어든 그룹은 설명하지 않아요.

HB 설계 후보: gesture 끝에 collapse를 연결하고 중간 Undo/취소·다중 선택/창·AI 명령의 원자성을 별개로 검증하는 후보예요. 그룹 label은 사용자가 이해할 한국어 작업명을 제공해야 해요.

미해결: negative/unknown groupIndex/range/error/nesting, RecordObjects/GetCurrentGroup/SetCurrentGroupName/Selection linked APIs, cross-window interleaving/cancel/failure/redo/thread.

## 제작 흐름·실행·C++/노드·사람/AI 대응

Undo.RecordObject의 frame 끝 delta/no-op 처리와 CompleteObjectUndo의 즉시 Scene dirty는 같지 않아요. 구조 변경은 부모·컴포넌트 추가·객체 파괴를 각각 전용 동작으로 다뤄야 해요. snapshot 하나가 모든 복구를 처리한다고 가정하지 않아요. group은 사용자 gesture와 복합 편집의 원자성을 구성할 후보지만, 문서가 여러 창의 작업 순서·실패 rollback·외부 참조 수명까지 입증하지는 않아요.

HB editor C++·노드·사람 Outliner/component inspector·AI operation은 전용 transaction·stable ID·revision과 같은 검증/Undo/파일 저장 경로를 공유할 설계 후보예요. Unity C# API를 HB C++ native 선언인 것처럼 표시하지 않고, runtime Actor/physics 파괴와 저작 단계 복구를 구분해요. 전체 메뉴 경로·단축키 변경·Undo owner·에셋 탐색 Back/Forward의 관련 본문은 별도 대기해요. 해당 출처를 읽기 전에 단축키를 확정하지 않아요.
