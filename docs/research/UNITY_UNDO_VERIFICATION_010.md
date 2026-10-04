# Unity Undo owner·변경 데이터 분석 010 독립 대조

주인님, 짚짱의 `/root/undo_mobile_evidence_audit` 담당은 분석 담당 `root`와 별도로 2026-10-04에 공식 오프라인 원문의 **47개 기술 본문 전체**와 [최종 분석 문서](UNITY_UNDO_BODY_010.md), [기계 분석](unity-undo-body-010.json)을 직접 읽고 대조했어요. Undo owner 1개·그 snapshot의 직접 멤버 33개·연결 타입 3개·필드 10개를 확인했어요. **154heading·46표시 선언 block·22표(헤더 포함 95행/190셀)·전체 pre 예제 14block**이 일치해요. 신규 40본문과 기존 7본문 재대조도 구분했어요.

독립 대조에서 전체 inline code 집계의 누락 6개를 찾아 분석 담당이 수정했어요. 최종값은 **inline `<code>` 24개 = literal/호출 조각 18개 + 변수명 언급 6개**예요. 최종 수정 후 이 숫자와 MD/JSON pin을 다시 확인했어요. 의미 판단의 오류나 최종 기록의 남은 집계 실패는 발견하지 않았어요. 이번 판정은 **한정된 원문 대 분석의 독립 대조 통과**이며, 미확정 계약이 남아 **엄격한 원장 promotion·verified 승격은 0**이에요.

## 대상 고정과 읽기 증거

- `docs/research/UNITY_UNDO_BODY_010.md` SHA-256: `0f76125216a2bea7409f25ab564fcf11f44c6747a53bd1aa6ed4f3137e7f6f1d`
- `docs/research/unity-undo-body-010.json` SHA-256: `138f8179f6da58090b396347d48004619d0aded03a80bda11d4539fd36e0e357`
- private `root-extraction.json`: `eb7ff83427bb4e7d75da572e352c1d18f5c2a941fa95230400fc188055cf5907`
- private `extraction.json`: `d2b28f060492ef45a8b601b6003090193317ba968be2a65e48543d93d65ab24e`
- private `ancillary-extraction.json`: `11c14c158b47ba94259126f6a2a7c37ebb1798264fe54aac895e98b0ff17725e`

원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/ScriptReference/{파일명}`, body는 `native/build/reference-corpus/unity-undo-batch-010/{파일명}.body.html`이에요. 위 private extraction 경로도 같은 batch 폴더 아래예요. [검증 기계 기록](unity-undo-verification-010.json)에 47개 source/body hash와 구역·선언·표·전체 예제·inline locator/hash, 실제 읽기 담당과 날짜를 남겼어요.

모든 source/body hash를 실제 파일 bytes에서 다시 계산했으며 **47/47 일치**했어요. 모든 body가 원문 첫 `<h1`부터 `<div id="_content">` 직전까지의 exact bytes와 같았어요. 각 원문의 canonical URL, `Unity 6.0 (6000.0)` header, footer의 job ID `76410965`와 build date `2026-09-29`도 47개 모두 확인했어요. ZIP 취득이나 전체 배포본 CRC를 이번에 새로 검증한 것은 아니에요.

원문에서 기술 본문의 모든 heading·본문·경고·표 셀·선언·전체 코드 예제·inline code를 직접 읽었어요. 의미 inventory는 publisher `.suggest`/`.scrollToFeedback` controls만 제외하고 raw/body bytes는 바꾸지 않았어요. 47개 기술 DOM의 이미지·SVG·영상·추가 언어 선언 탭은 없었어요. 외부 script와 링크 대상의 내용은 상속해서 읽은 것으로 세지 않았어요. 자동 hash/추출 대조는 실제 본문 읽기와 의미 판단을 보조하는 별도의 구조 검증이에요.

## 독립 재계산과 owner 연결

| 범위 | 본문 | heading | 표시 선언 block | 표 / 행 / 셀 | 전체 pre block | inline code / varname | 빈 선언 슬롯 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 전체 재읽기 | 47 | 154 | 46 | 22 / 95 / 190 | 14 | 24 / 6 | 4 |
| 신규 | 40 | 119 | 37 | 14 / 73 / 146 | 10 | 24 / 6 | 4 |
| 기존 분석 재대조 | 7 | 35 | 9 | 8 / 22 / 44 | 4 | 0 / 0 | 0 |

원본 Undo의 Static Properties·Static Methods·Delegates 표에서 직접 링크를 다시 추출하니 **고유 33개**였고, `root-extraction.json`의 목록과 실제 읽은 멤버 33본문에 정확히 대응했어요. 본문 중간의 관련 링크를 추가 직접 멤버로 중복 계산하지 않았어요. `UndoRedoInfo`·`UndoPropertyModification`·`PropertyModification`의 직접 필드 표는 각각 3·3·4링크였고 그 10개 필드 본문을 모두 읽었어요. 이를 UnityEditor namespace 전체·상속·native 구현·다른 Undo API의 목록 폐쇄로 해석하지 않았어요.

기존 7개는 007의 SetTransformParent·AddComponent·DestroyObjectImmediate·RegisterCompleteObjectUndo·IncrementCurrentGroup·CollapseUndoOperations 6개와 002의 RecordObject예요. 기존 source hash와 같아요. RecordObject의 002 body는 website control을 제외한 이전 추출이며, 이번 exact source slice와 bodyHash가 달라요. 같은 원문 재읽기로 구분하되 이전 bodyHash를 이번 bodyHash로 대체하거나 이전 기록을 변경하지 않았어요.

선언 46개는 **표시 block 수**예요. AddComponent 2개·CompleteObjectUndo 2개·FullObjectHierarchyUndo 2개를 각각 보존했어요. FullObjectHierarchyUndo의 이름 없는 overload는 obsolete 경고와 대체 안내가 붙어 있으며, 해당 block text에 남은 `Obsolete`·`Declaration` label을 C# signature의 일부나 정상 구현 코드로 해석하지 않았어요. Undo 및 연결 타입 3개의 빈 signature slot 4개는 완전한 타입 선언으로 세지 않았어요.

22개 표의 190셀을 원문과 private extraction 전체로 비교했어요. 표 fingerprint는 원래 행·셀 순서를 유지하고 `get_text(' ', strip=True)`를 compact JSON UTF-8으로 직렬화한 SHA-256이에요. 14개 pre 예제는 `get_text('\n', strip=False)` 전체 문자와 CRLF를 보존해서 private text와 비교했어요. 같은 reset-position 예제가 여러 페이지에서 반복되는 것을 각 source block으로 셌으며 고유 프로그램 수라고 표시하지 않았어요. 원문 표·전체 예제·본문은 공개 문서에 복제하지 않았어요.

## 의미·순서·예외 대조

**owner와 group.** 속성별 delta와 객체 상태 기록, event 기반 grouping과 종류별 자동 이름 우선순위, 수동 이름 덮어쓰기, 변경 종류별 전용 API 호출이 분석과 같아요. group/index/이름을 파일 revision·persistent ID·원자 rollback으로 확대하지 않았어요. GetCurrentGroup·CollapseUndoOperations·SetCurrentGroupName에 반복된 전체 예제의 이름 설정→group 조회→RecordObjects→선택 Transform 위치 변경→collapse 순서를 확인했고, 이 예제에 IncrementCurrentGroup 호출이 있다고 만들지 않았어요. color picker는 열린 동안 별도 operation을 유지하고 닫을 때 한 단계로 묶는 설명이며 cancel 보장은 추가 계약으로 남아요.

**callback과 flush.** isProcessing이 true인 동안 RegisterCreatedObjectUndo 호출 금지를 양쪽 본문에서 확인했어요. 모든 mutation의 금지로 확대하지 않았어요. postprocessModifications는 modification 배열을 받아 입력 배열을 반환하는 예제이고 Start 등록·OnDestroy 해제가 있어요. undoRedoEvent 예제도 등록·해제를 하며 `in UndoRedoInfo`를 받아요. undoRedoPerformed 예제에는 해제가 없고 방향 정보는 undoRedoEvent로 안내해요. willFlushUndoRecord/WillFlushUndoRecord는 flush 이전 시점과 무인수 void delegate를 나타내며 디스크 저장 통지로 확정하지 않았어요. FlushUndoRecordObjects는 RecordObject/RecordObjects 기록을 보장하며 mouse-up·일부 action 종료 event에서 자동 flush한다고 설명해요. 반환 배열 교체·null·예외·구독 수명·재진입은 미확정으로 남긴 판단이 맞아요.

**diff·snapshot·구조.** RecordObject의 temporary copy→frame 끝 binary diff→무변경이면 stack 기록 없음과 부모 변경·컴포넌트 추가·파괴 제외, Prefab 후속 기록 요구를 확인했어요. 두 전체 EffectRadius 예제의 change check와 기록 전후 write를 읽었어요. RecordObjects는 여러 RecordObject 호출과 같은 설명이며 CompleteObjectUndo 배열 overload의 한 operation 보장을 상속하지 않았어요. CompleteObjectUndo의 단일/배열 상태 복원, 배열의 한 operation, Scene 즉시 dirty·무변경 조건과 구조 변경 제외도 같아요. AddComponent는 새 component 반환·Undo 파괴를 확인했고, SetTransformParent·SetSiblingIndex의 전용 구조 기록을 일반 property patch와 합치지 않았어요. DestroyObjectImmediate의 즉시 파괴·buffer 복원 및 DestroyImmediate(objectToUndo, true) 연결은 정확하며 파일·외부 참조의 상세 복구 계약은 여전히 미확정이에요.

**생성·자식·hierarchy.** RegisterChildrenOrderUndo 예제는 등록되지 않은 객체 생성 뒤 첫 자식을 마지막으로 이동하고 순서를 복원해요. 생성 Undo 보장을 추가하지 않았어요. RegisterCreatedObjectUndo의 자식 포함·부모/형제 제외, 무지연 파괴, 생성→등록→complete/hierarchy 기록→mutation 순서, 기존 RecordObject 기록 flush·중지 부작용을 확인했어요. 전체 예제에는 group 증가·root/child 등록·부모 변경·hierarchy 기록·이동·이름 지정이 있으며 원문은 한 Undo step 사례로 소개해요. 분석의 원자 transaction·중간 실패 복구는 별도 HB 검증 조건이라 이 한-step 설명과 충돌하지 않아요. FullObjectHierarchyUndo 두 예제에서 GameObject 입력은 자식/컴포넌트를 포함하고 Component 입력은 자신의 GameObject/컴포넌트만 포함해 자식을 제외해요. 다른 객체 입력, 즉시 dirty, 구조 변경 제외와 obsolete overload도 빠짐없이 확인했어요.

**scene·importer·stack.** MoveGameObjectToScene은 현재 Scene의 root GameObject만 허용해요. destination 로딩·자식 이동·실패는 본문에서 확정되지 않았어요. RegisterImporterUndo 예제는 importer snapshot을 먼저 기록한 뒤 SetImporterOverride를 호출하며 원본 모델 bytes 복구를 약속하지 않아요. ClearAll은 Undo/Redo 양쪽 stack, ClearUndo는 CompleteObjectUndo로 등록된 특정 identifier의 Undo 작업을 제거해요. PerformUndo/Redo는 Edit 메뉴 대응이며 focus/shortcut·빈 stack·실패는 미기재예요.

**RevertAllInCurrentGroup.** 이름과 달리 이 snapshot의 본문은 **마지막 Undo operation을 Redo 기록 없이 되돌린다**고 설명해요. RevertAllDownToGroup은 지정 group index까지의 여러 Undo operation을 Redo 기록 없이 되돌려요. 두 설명을 같은 ‘현재 group 전체 rollback’으로 합치지 않은 최종 분석이 맞아요. Escape는 원문에 제시된 사용 사례이며 전역 key 처리·정확한 boundary/error 계약은 미확정이에요.

**데이터 타입과 필드.** UndoRedoInfo의 bool isRedo·int undoGroup·string undoName이 event 방향·발생 group·수행한 이름에 대응해요. UndoPropertyModification의 currentValue/previousValue는 PropertyModification이고 keepPrefabOverride는 Prefab instance modification 유지 여부예요. PropertyModification은 class로 표시되며 target과 적용 값의 objectReference, propertyPath와 value를 구분해요. object reference를 string에 숨기지 않았고 propertyPath의 SerializedProperty 대응도 정확해요. 기본값·null·callback 이후 수명·깊은 복사·encoding은 본문에서 보완되지 않아 미확정이에요.

## 원본 선언 오류와 남은 gate

[Undo.UndoRedoEventCallback](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.UndoRedoEventCallback.html)의 원본 signature markup은 `public delegate void UndoRedoEventCallback(InAttribute) undo );`예요. 실제 HTML에도 `InAttribute)` 뒤 `undo`가 이어져 있으며 정상 인수 타입을 파서가 누락한 사례가 아니에요. undoRedoEvent 예제의 `in UndoRedoInfo`를 이 malformed block의 정상 전체 선언/ABI로 자동 정정하지 않았어요.

[Undo.AddComponent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.AddComponent.html)의 두 번째 표시 선언은 `public static T AddComponent(GameObject gameObject);` 형태이며 `<T>`와 constraint가 표시되지 않아요. 본문은 generic version이라고 부르지만 완전한 generic 선언으로 채워 넣지 않았어요. 잘못된 delegate 표시·불완전한 generic/type 선언은 해당 버전에 대응하는 공식 추가 근거가 필요해요.

UnityEditor module/native bridge·thread/허용 editor phase·callback 순서/재진입/소유권·postprocess 교체 배열·stack buffer·index/parent 제약·Prefab/SerializedProperty·ImporterOverride·Undo와 Scene/file 저장 경계·다른 기록 API와 생성 등록의 상호작용이 남아요. 현재 한정된 본문 분석의 일치가 이 계약의 해결이나 전체 corpus/API 분모 확정을 대신하지 않아요. HB의 stable ID·공용 editor transaction·AI revision/dry-run·C++/node/사람 UI 설계는 원출처 사실과 분리된 적용 후보이며 실제 구현 동등성으로 검증하지 않았어요.

이 담당은 검증 MD/JSON 두 개만 작성했어요. root 분석의 inline 정정은 분석 담당이 수행했고 그 최종 bytes를 독립적으로 재확인했어요. ledger/status·연구 도구·엔진·GUI·원문 캐시·커밋은 이 담당이 변경하지 않았어요. 네트워크·foreground 조작·runtime/빌드/GUI 실행은 없었어요. 위 분석·source/body·private evidence의 bytes가 바뀌면 이 검증도 stale예요. **제한된 독립 대조 통과, 전체 원장 승격 0·전체 gate 미통과**로 남겨요.
