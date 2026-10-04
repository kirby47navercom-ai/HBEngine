# Unity Undo 전체 owner 링크와 변경 데이터 분석 010

2026-10-04, `research_only`. 기준은 Unity 6000.0 영어 공식 오프라인 배포본 `job76410965 / 2026-09-29`예요. 읽은 범위는 [Undo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.html)의 **그 snapshot에 표시된 직접 멤버 33개**와 연결 데이터 타입 3개/필드 10개예요. UnityEditor 전체, 상속·미노출 멤버나 모든 Undo 관련 API를 닫았다는 뜻은 아니에요.

47개 기술 본문을 직접 읽었어요. 이전 분석과 겹치는 7개는 재대조로 분리하며 **신규 40본문**이에요. 전체는 heading 154개·표시 선언 block 46개·표 22개(95행/190셀)·전체 `pre` 예제 block 14개예요. 신규 부분만은 119heading·37선언 block·표 14개(73행/146셀)·10예제 block이에요. 반복된 같은 예제도 각 출처의 block 수로 세며 고유 프로그램 수로 표현하지 않아요. inline code는 24개(선택 literal/호출 조각 18개와 변수명 언급 6개)이며 프로그램 수가 아니에요. 초기 추출의 18개는 varname 언급을 제외한 부분 수라 독립 대조 뒤 구분해 정정했어요. 기술 이미지/추가 언어 탭은 이 47개 본문에 없어요. 원장 승격/독립 verified는 0이에요.

원문 hash·정확한 본문 bytes·구역·전체 예제/표는 private cache `native/build/reference-corpus/unity-undo-batch-010`에 보존해요. [기계 기록](unity-undo-body-010.json)은 원문을 복제하지 않고 위치·선언·의미 판단·미해결 조건과 이 문서의 hash를 연결해요. [007](UNITY_UNDO_BODY_007.md) 및 [002](UNITY_AUTHORING_PHYSICS_BODY_002.md)의 해시는 변경하지 않아요.

## Undo owner가 정하는 기록의 경계

`UnityEditor.Undo`는 속성 delta와 객체 상태 기록을 구분해요. mouse-down 같은 편집 이벤트가 group을 나누며 자동 이름은 action 종류 우선순위를 따라요. 직접 지정한 이름은 자동 이름을 덮어써요. owner의 작은 호출 예시는 속성 변경·컴포넌트 추가·생성·파괴·부모 변경 각각 다른 API를 선택해요. 이 문서의 Scene 규모 설명은 실제 성능 측정이 아니에요.

HB 판단: 사람이 gizmo를 움직이든 노드를 연결하든 AI가 일괄 명령을 실행하든 동일 편집 모델에 변경 종류와 대상 ID를 기록해야 해요. 삭제된 객체, 부모/자식 관계, 값 변경을 같은 속성 patch로 처리하면 복원이 빠져요. 런타임 gameplay mutation과 에디터 문서 Undo, 파일 저장/이전 revision, 창별 탐색 이력도 각자 수명과 효과를 정해야 해요. 이 분석 단계에서는 해당 구현을 수정하지 않았어요.

## snapshot의 직접 멤버 33개

모든 링크의 공식 루트는 위 Undo 페이지이며 파일명은 [기계 기록](unity-undo-body-010.json)의 `canonicalUrl`로 연결돼요. 표의 ‘재대조’ 7개는 신규 수에 넣지 않아요.

| 멤버 | 실제 본문의 계약과 예제 해석 | 범위 |
| --- | --- | --- |
| isProcessing | 현재 Undo/Redo 처리 중인지 표시해요. true일 때 생성 등록을 금지한다는 별도 생성 API의 조건과 연결해요. 다른 모든 mutation 금지를 추정하지 않아요. | 신규 |
| postprocessModifications | 새 속성 modification 집합 callback이에요. 예제는 등록·해제를 하고 입력 배열을 그대로 반환해요. 교체 배열의 길이/null 계약은 미기재예요. | 신규 |
| undoRedoEvent | Undo/Redo 후 callback이에요. 예제는 `in UndoRedoInfo`를 받고 등록·해제해요. 아래 delegate 선언 오류를 별도로 남겨요. | 신규 |
| undoRedoPerformed | Undo/Redo 실행 뒤 통지해요. 방향을 구분하려면 undoRedoEvent를 사용하라고 안내해요. 예제에는 등록 뒤 해제가 없어 reload/구독 소유권 검토가 필요해요. | 신규 |
| willFlushUndoRecord | RecordObject 기록을 flush하기 전에 호출해요. 디스크 저장 callback이라는 근거는 없어요. | 신규 |
| AddComponent | 타입 인수와 generic 두 표시 선언이에요. 추가된 컴포넌트를 반환하고 Undo는 해당 컴포넌트를 파괴해요. generic 제약/실패는 미기재예요. | 재대조 |
| ClearAll | Undo와 Redo 기록 양쪽을 지워요. 객체 하나나 현재 탭의 기록만 지우는 API로 해석하지 않아요. | 신규 |
| ClearUndo | 특정 객체의 CompleteObjectUndo 기록을 제거해요. 해당 객체의 모든 구조 작업을 제거한다고 확대하지 않아요. | 신규 |
| CollapseUndoOperations | 주어진 group까지 위쪽 기록을 한 단계로 합쳐요. color picker는 열린 동안 별도 operation을 유지하고 닫을 때 합쳐요. Cancel 계약은 별도예요. | 재대조 |
| DestroyObjectImmediate | 즉시 파괴를 기록해 복원 가능하게 해요. 본문은 DestroyImmediate의 asset 허용 동작과 연결해요. 게임의 지연 파괴와 구분해요. | 재대조 |
| FlushUndoRecordObjects | RecordObject/RecordObjects가 등록한 변경을 기록해요. mouse-up/관례적 action 끝에서 자동 flush하므로 보통 수동 호출은 필요 없어요. | 신규 |
| GetCurrentGroup | 현재 group 인덱스를 반환해요. 다중 선택 예제는 이름→인덱스→RecordObjects→이동→Collapse 순서이며 별도 Increment 호출은 없어요. | 신규 |
| GetCurrentGroupName | action 기반 이름 또는 수동 이름을 반환하고 빈 group은 빈 문자열이에요. 영속 ID로 사용하지 않아요. | 신규 |
| IncrementCurrentGroup | 자동 event group 외에 명시적으로 group을 증가시켜요. 이것만으로 작업을 적용하거나 원자 rollback을 보장하지 않아요. | 재대조 |
| MoveGameObjectToScene | Scene 이동과 Undo를 함께 기록해요. 대상 GameObject는 현재 Scene의 root여야 해요. 자식 이동·대상 Scene 로딩·실패 결과는 추가 확인 대상이에요. | 신규 |
| PerformRedo | Edit→Redo와 같은 동작이에요. 빈 stack 결과/반환 오류는 본문에 없어요. | 신규 |
| PerformUndo | Edit→Undo와 같은 동작이에요. 어느 창이 단축키를 소유하는지는 이 API가 정하지 않아요. | 신규 |
| PostprocessModifications | modification 배열을 입력받고 배열을 반환하는 delegate예요. 거절·필터링·예외 전파의 구체 계약은 없어요. | 신규 |
| RecordObject | 호출 뒤 값 변경을 frame 끝에서 binary diff해요. 변화가 없으면 stack 기록이 없어요. 부모/추가/파괴는 전용 API가 필요하고 Prefab override 기록도 별도로 이어져요. | 재대조 |
| RecordObjects | RecordObject를 각 객체에 호출하는 것과 같아요. 배열 인수가 있다고 CompleteObjectUndo 배열 overload의 한 operation 보장을 상속하지 않아요. | 신규 |
| RegisterChildrenOrderUndo | 자식 순서를 저장해요. 예제의 생성은 Undo로 등록하지 않았고 첫 자식을 끝으로 옮기는 순서만 복원해요. | 신규 |
| RegisterCompleteObjectUndo | 단일/배열 두 선언이에요. 상태 snapshot을 즉시 기록하며 Scene 소속이면 무변경이어도 dirty예요. 배열 overload는 한 operation, 부모/추가/파괴는 제외해요. | 재대조 |
| RegisterCreatedObjectUndo | 생성 등록을 Undo하면 파괴돼요. GameObject의 자식도 포함하고 부모·형제는 포함하지 않아요. 생성 등록이 진행 중인 RecordObject를 flush하고 기록을 중지시키는 부작용이 있어요. | 신규 |
| RegisterFullObjectHierarchyUndo | GameObject는 자식/컴포넌트까지, Component는 자신의 GameObject와 컴포넌트만 포함해 자식을 제외해요. 다른 객체는 자신만 기록해요. 이름 없는 obsolete 선언도 inventory에 남겨요. | 신규 |
| RegisterImporterUndo | importer 상태를 기록하며 예제는 ImporterOverride 전에 호출해요. 원본 모델 bytes까지 되돌린다는 근거는 없어요. | 신규 |
| RevertAllDownToGroup | 지정 group까지 되돌리며 Redo를 만들지 않아요. 음수/빈 stack/정확한 index 경계 오류 처리는 미기재예요. | 신규 |
| RevertAllInCurrentGroup | 본문은 마지막 Undo operation을 Redo 없이 되돌린다고 설명해요. 이름만 보고 현재 group의 모든 operation 복원을 보장하지 않아요. Escape는 사용 예이지 전역 키 처리 계약이 아니에요. | 신규 |
| SetCurrentGroupName | 현재 group의 표시 이름을 수동으로 지정해요. 다중 선택 reset 예제는 상태 기록과 collapse를 별도로 수행해요. | 신규 |
| SetSiblingIndex | Transform의 sibling index 변경과 Undo를 함께 기록해요. 허용 범위/clamp는 미기재예요. | 신규 |
| SetTransformParent | 부모 변경과 Undo를 함께 기록해요. world pose·cycle/null 등 상세 처리는 별도 Transform API가 필요해요. | 재대조 |
| UndoRedoCallback | 인수 없는 void callback이에요. Undo인지 Redo인지 직접 전달하지 않아요. | 신규 |
| UndoRedoEventCallback | 표시 선언 자체가 불완전해요. 속성 예제의 `in UndoRedoInfo`와 같은 정상 선언이라고 자동 정정하지 않아요. | 신규 |
| WillFlushUndoRecord | 인수 없는 void delegate예요. 시점은 willFlushUndoRecord/FlushUndoRecordObjects 본문과 함께 해석해요. | 신규 |

## 생성·구조·연속 조작의 순서

[RegisterCreatedObjectUndo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RegisterCreatedObjectUndo.html)는 생성→생성 등록→상태 snapshot→추가 mutation 순서를 설명해요. 기존 RecordObject 대상에 이후 변경이 필요하면 새 생성 등록이 recording을 멈추는 점을 반영해야 해요. 예제는 group 증가→root/child 생성 등록→전용 부모 변경→root 전체 hierarchy 기록→위치 변경→group 이름 지정이에요. Collapse를 호출하지 않으므로 예제의 group 명명만으로 단일 원자 transaction을 증명하지 않아요.

[RegisterFullObjectHierarchyUndo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RegisterFullObjectHierarchyUndo.html)의 두 전체 예제는 root GameObject 기록과 root의 컴포넌트 기록을 비교해요. 후자는 child의 이름·컴포넌트 변경을 되돌리지 않아요. snapshot은 Scene을 즉시 dirty로 만들며 구조 변경을 대신하지 않아요.

HB 판단: 생성/배치/import/노드 추출·함수화 같은 여러 변경은 대상과 순서를 명시한 editor transaction으로 설계해야 해요. AI dry-run이 성공해도 실제 대상 revision을 확인하고, 중간 실패 시 생성·참조·parent·속성·파일 변경을 모두 복구해야 해요. 이 복구와 group API의 보장은 서로 대조할 검증 조건이에요. 드래그 중 미리보기/확정/취소도 값의 최종 저장과 구분해야 해요.

## 변경 데이터 타입 3개와 필드 10개

실제 owner 본문은 `UndoRedoInfo`, `UndoPropertyModification`을 struct, `PropertyModification`을 class로 표시해요. formal 타입 선언은 비어 있어 class/struct 표시를 완전한 선언으로 세지 않아요. 각 필드의 연결 API도 직접 읽었어요.

| owner | 실제 표시된 필드 | 값의 역할과 남은 계약 |
| --- | --- | --- |
| [UndoRedoInfo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/UndoRedoInfo.html) | bool isRedo; int undoGroup; string undoName | 방향·발생 group·수행한 이름이에요. 기본값과 실패/null, callback 동안/이후 수명은 미기재예요. |
| [UndoPropertyModification](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/UndoPropertyModification.html) | PropertyModification currentValue/previousValue; bool keepPrefabOverride | 이전/현재 값과 Prefab instance override 유지 여부예요. 모든 변경에 자동 Prefab 동기화가 된다는 뜻은 아니에요. |
| [PropertyModification](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PropertyModification.html) | Object target/objectReference; string propertyPath/value | target과 적용 값을 분리하고 object reference는 string으로 표현하지 않아요. propertyPath는 SerializedProperty 경로와 대응해요. 필드 값의 encoding/null/깊은 복사 계약은 미기재예요. |

HB 판단: AI·C++·노드의 변경 값은 타입과 stable reference를 보존하고 이전/새 값·target ID·property path·Prefab 정책을 별도로 직렬화해야 해요. 이름 문자열에 객체 참조를 감추거나 플랫폼별 C++ struct bytes를 그대로 저장하는 방식은 별도 호환 검증이 필요해요. 변경 callback 구독은 객체/문서 종료와 editor reload 때 해제할 소유자가 필요해요.

## 공식 선언 불일치와 남은 대기열

[UndoRedoEventCallback](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.UndoRedoEventCallback.html)의 **원본 HTML signature**는 `public delegate void UndoRedoEventCallback(InAttribute) undo );`예요. 파서가 인수 타입을 떨어뜨린 것이 아니라 실제 markup 자체가 이 형태예요. [undoRedoEvent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo-undoRedoEvent.html) 예제는 `in UndoRedoInfo`지만 두 근거만으로 올바른 전체 선언/ABI를 확정하지 않아요. 해당 기준본에 대응하는 공식 소스 선언 대조가 남았어요.

추가 미해결: UnityEditor 모듈·native bridge/thread/허용 editor 단계·구독 호출 순서·예외/재진입·postprocess 배열 교체/항목 수명·Redo buffer 보존 경계·Undo.Scene 복구와 파일 저장·ImporterOverride/Prefab/SerializedProperty 세부 계약·Transform index와 parent 제약·생성 등록과 모든 기록 API의 상호작용이에요. owner의 링크 33개를 읽었어도 이러한 연결 API 전체가 분석된 것은 아니에요. 특히 ClearAll을 AI rollback 용도로 쓰거나 import 파일 저장까지 Undo로 복원된다고 가정하지 않아요.

독립 본문 대조는 별도 담당자에게 남기며 같은 reader의 재검사와 hash 검사는 독립 verified를 대신하지 않아요. 이번 분석은 누적 editor 조작/자료형/자동화 요구를 확장하는 근거이며 엔진 구현·PC/모바일 빌드 실행은 하지 않았어요.
