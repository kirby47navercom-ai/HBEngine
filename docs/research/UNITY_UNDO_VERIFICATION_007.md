# Unity 구조 변경 Undo 분석 007 독립 대조

주인님, 짚짱의 `/root/unreal_actor_body` 담당은 분석 담당 `root`와 별도로 2026-10-04에 [분석 문서](UNITY_UNDO_BODY_007.md), [기계 기록](unity-undo-body-007.json), 공식 Unity6000.0 영어 offline 원문과 추출 **6본문 전체**를 읽고 비교했어요. **31heading·8표시 syntax·7표(헤더 포함19행/38셀)·전체 코드 예제2개**가 일치해요. 표시된 사실과 누락 해석에 수정할 오류는 발견하지 않았고, 관련 계약의 미확정 상태를 유지해요. **전체 원장 승격0, 전체 verified 단정 없음**이에요.

## 고정한 대상과 실제 읽기 범위

- `docs/research/UNITY_UNDO_BODY_007.md` SHA-256: `3d7ab938c99deabdce8448aa01c326155723412ee7b29a023d9a54bc93d50d61`
- `docs/research/unity-undo-body-007.json` SHA-256: `502f6acaa08b2d2b9c76a33784c731a0534b536cda7817a55777a73dec22d869`
- private `native/build/reference-corpus/unity-undo-batch/extraction.json` SHA-256: `616f7acde1debacc57566588b460459d2fdc086f28b80b631ef357a72826d9e4`

원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/ScriptReference/{파일명}`, body는 `native/build/reference-corpus/unity-undo-batch/{파일명}.body.html`이에요. 아래 파일명은 `.html`을 포함해요. source/body hash는 실제 파일 bytes에서 다시 계산했어요. 모든 body는 원본 첫 `<h1`부터 `<div id="_content">` 직전까지 **exact bytes**가 같았으며 기존 CRLF·markup을 고치지 않았어요. 분석 JSON·private extraction·MD pin도 실제 hash와 같았어요.

각 technical 본문의 모든 heading·선언·parameter/return·표 셀·description·예제 코드를 읽었어요. publisher `.suggest`/`.scrollToFeedback` UI만 의미 inventory에서 제외했고 raw/body bytes는 제외하지 않았어요. 원본에서 heading·syntax·표·예제를 다시 추출해 public 기록과 private evidence를 각각 비교했어요. canonical·Unity6.0(6000.0) header·job76410965/2026-09-29 footer를 6개 모두 확인했어요. technical image는 0개예요. 링크 이름과 링크 대상의 실제 읽기는 구분하며, full owner/inherited API 분모·ZIP 취득/전체 CRC를 이번에 다시 검증한 것은 아니에요.

| 파일명 / 실제 sourceHash | 실제 bodyHash | 대조한 heading / syntax |
| --- | --- | --- |
| Undo.SetTransformParent.html / `e11a0586849f368d54bb82ecdda257c9b3a1b9be087abd828ae9e94ff82953ef` | `2aa53000a9ae3c27d80ef870dd1da2202d3c10bd882be0bb9b523f48a9edb6ae` | 4 / 1 |
| Undo.AddComponent.html / `36f948c6318d5ece5d2e6101e2ba10b875bb6ab3d3daeff95b19c0d49e92c3e1` | `c4c59b1d35bec87c79744973eb78260840341cef41837d52b06b561122432a6c` | 9 / 2 |
| Undo.DestroyObjectImmediate.html / `c3e84e43d3368fc9373d79ea7a0323e3f2ed793f8032d3e9e459a3ab98f849b0` | `e5bb4a61d93a0bafeaf73d72cc09a5ab6cfdc598a4892fd78ed668e28d02a146` | 4 / 1 |
| Undo.RegisterCompleteObjectUndo.html / `0790cd09799f0521c33ded64618fd0731ca0b191a9e0e512b8c98b8299af6984` | `46b8207316c00a87b8e6405fd79d7847395218b0cc32264ff244fa32cb88222f` | 7 / 2 |
| Undo.IncrementCurrentGroup.html / `2f2fa598627e3cec71dd7fb9c7505080d54c88247ffe2eba474defec6e903b17` | `a9b607d4ccde8080381d9fe0f00a2754522ba09bcff201d8faa75d1f73d5aaf8` | 3 / 1 |
| Undo.CollapseUndoOperations.html / `cd0b8f4466606b514875719c552e7b69d48a3968da36b427642fc7e69ada6a1b` | `5c35286fffa2c6135222a49033c65c0ee12f6a342734290511228065baeb288a` | 4 / 1 |

8개 표시 syntax의 static·void/Component/T 반환·인수 이름/타입이 같았어요. AddComponent의 Type overload와 표시 T overload, RegisterCompleteObjectUndo의 단일 Object와 Object[] overload를 구분했어요. T의 generic parameter/constraint가 표시되지 않은 것을 임의로 채우지 않았어요. None/null/default 등 표시되지 않은 계약도 만들어 넣지 않았어요.

## 표와 전체 예제 대조

locator는 각 body의 technical DOM, 번호는 1부터예요. 표 hash는 원래 행/셀 순서를 보존하고 각 cell을 `BeautifulSoup get_text(' ', strip=True)`로 읽은 뒤 `ensure_ascii=False` compact JSON으로 직렬화한 UTF-8 SHA-256이에요. 이 7개 표의 38셀을 직접 읽고 원문·private extraction·public hash를 비교했어요. 원문 표 설명 전체는 공개로 복제하지 않았어요.

| body / locator | 헤더 포함 행 / 셀 | 실제 표 hash |
| --- | --- | --- |
| Undo.SetTransformParent / table[1] | 4 / 8 | `85a9d7508b9cd3c13f5ba86165cf9d1ee5e3d4834d8fc3011099e2811e20fe68` |
| Undo.AddComponent / table[1] | 3 / 6 | `74715cf639234ddd819ce70b7d66996765406330a462ffbe6dce15e78a46bc8e` |
| Undo.AddComponent / table[2] | 2 / 4 | `6a0765370f1cd10ea34f180d297306df62b2766bc2ed39d57baebaae6ce4d298` |
| Undo.DestroyObjectImmediate / table[1] | 2 / 4 | `0bae57aef690ef64cd3855459f915c5307452e9bb79df51a053d55db103908ee` |
| Undo.RegisterCompleteObjectUndo / table[1] | 3 / 6 | `2b3ce19262230c34536ac774c590e55f3b02c42991e6084daf5348844f3df739` |
| Undo.RegisterCompleteObjectUndo / table[2] | 3 / 6 | `7ee16c983536a1ef32f6139a0a621490074b7d647885a85d89d72ca03c66d61d` |
| Undo.CollapseUndoOperations / table[1] | 2 / 4 | `3ee91ef97f2f585c341e9e1490115ff63eead4c4e5503c873919e9098270d2bc` |

전체 예제는 원문 `pre.get_text('\n', strip=False)`와 private text를 문자 전체로 비교했어요. CRLF를 유지한 UTF-8 text hash는 RegisterCompleteObjectUndo `pre[1]` 536문자/`3e894258bb00a3fc85e65c4e27631120194d86394a6a6785c66342a8e54e653b`, CollapseUndoOperations `pre[1]` 640문자/`1cbcef8a766205899d270975b59d5a40995bf6d10014cf2fa191b443eee13bf8`이에요. 두 public 예제 hash와 같고, 코드 전체를 공개 문서에 복제하지 않았어요.

## 의미·제약 독립 비교

**SetTransformParent.** Transform/newParent/history name 인수와 부모 지정+Undo 등록은 정확해요. `transform.parent = newParent`와 같다는 설명이 있고 root는 그것으로 worldPositionStays·local/world 보존·null/root·cycle rejection·Prefab 저장·dirty·실패/thread까지 추정하지 않았어요. 부모 변경을 일반 property snapshot으로 복구한다고 말하지 않은 판단이 맞아요.

**AddComponent.** GameObject+Type→Component와 GameObject→T 두 표시 overload를 전체 읽었어요. 새 component 추가·Undo 등록, Undo 실행 때 component 파괴, 반환이 새 component라는 내용이 root 기록과 같아요. 두 번째 설명이 Generic version이라고만 표기하고 완전한 `<T>`/constraint syntax는 없어요. constructor/Awake/OnEnable·필수 의존 component·duplicate/invalid type·Undo/Redo 참조 수명은 본문에 없어 미상 유지가 타당해요.

**DestroyObjectImmediate.** 파괴된 객체를 undo buffer에 저장해 recreate할 수 있고, DestroyImmediate(objectToUndo, true)와 같은 동작이라고 원문이 연결해요. 객체 재생성 설명을 모든 external reference·디스크 에셋 파일·권한·lifetime 복구의 상세 보장으로 확대하지 않은 root 판단이 맞아요. 이 본문의 문맥은 저작 Undo이며 runtime delayed destroy와 동일 계약으로 취급하지 않았어요. linked DestroyImmediate의 두 번째 인수 의미와 실제 적용 조건은 추가 본문 대기예요.

**RegisterCompleteObjectUndo의 범위·시점.** 호출 때 객체 상태를 복사하고 호출 이후 변경을 기록 상태로 복구한다는 내용이 있어요. 부모 변경·AddComponent·객체 파괴는 복구하지 못하며 세 전용 API를 직접 링크해요. Scene의 GameObject/component라면 **실제 후속 state 변경이 없어도 호출 즉시 Scene modified**가 돼요. Object[] overload는 여러 단일 호출에 대응하되 하나의 Undo operation을 만든다고 설명해요. 따라서 frame 끝 diff/no-change 처리와 같은 계약으로 합치지 않은 분석이 맞아요. deep/shallow copy·serialized/native state·참조 retention은 설명하지 않아요.

**RegisterCompleteObjectUndo의 생성 예제.** 코드의 새 Player 생성→snapshot→이름 변경과 주석의 Edit Undo→Player 이름 복구를 전체 읽었어요. 생성 자체의 Undo 등록 호출은 없어요. 이름 복구 예제로부터 새 객체 생성의 삭제/재생성 Undo도 등록됐다고 결론내리지 않은 root 판단이 맞아요. undo creation API와 complete snapshot은 별도 계약이에요. 예제의 표시 메뉴 이름은 읽었지만 실제 editor에서 실행하거나 keyboard shortcut을 조사한 것은 아니에요.

**IncrementCurrentGroup.** current group index가 자동 Undo grouping에 쓰이고 mouse down/menu 실행 등에서 증가한다고 원문이 말해요. 수동 그룹 필요 상황과 무인수 static void syntax를 확인했어요. 정확한 증가 phase·index 범위·nesting·rollback·scope/thread는 본문에 없으므로 일반 transaction/창 탐색 이력으로 대체하지 않은 판단이 맞아요.

**CollapseUndoOperations와 color picker.** 지정 index보다 높은 group의 Undo operations를 그 index까지 한 단계로 묶는 설명이 정확해요. color picker는 열린 동안 **별도 Undo operations**, 닫힌 뒤 한 단계로 합치는 사례예요. 감사 중 짚짱이 별도 Undo와 cancel/rollback 보장의 차이를 전달했고, root는 최종 MD/JSON을 ‘별개의 Undo operation’과 ‘별도의 cancel/rollback API 보장을 뜻하지 않음’으로 명확하게 수정했어요. 그 최종 문장과 JSON facts를 직접 다시 읽었고 원문과 같아요. cancel/failure gap을 계속 유지해요. 색 preview/apply의 직렬화·dirty·외부 창의 interleaving도 본문에서 확인하지 않았어요.

Collapse 코드 전체의 이름 설정→현재 group index 조회→Selection.transforms RecordObjects→각 position zero write→collapse 순서가 root 기록과 같아요. explicit IncrementCurrentGroup 호출이 예제에 있다는 추정은 하지 않아요. selection이 비었거나 일부 대상 write가 실패할 때 복구, 다른 창 작업이 끼어들 때 범위, negative/unknown index와 Redo/thread는 설명하지 않아요.

## 남긴 불확정 계약과 판정

root JSON의 `analysis.gaps`를 모두 유지해요. Transform.parent/root/cycle/space·Prefab override/dirty/저장, AddComponent generic binding·의존성·callback·참조 수명, DestroyImmediate의 asset 영향·하위 객체/외부 참조/파일 복구·허용 문맥, complete snapshot의 복사 범위·serialized/native state·null/duplicates/Redo/thread, group index/nesting/interleaving·cancel/rollback/failure, GetCurrentGroup/SetCurrentGroupName/RecordObjects/Selection 후속 본문이 미완료예요. 6개 표시 본문을 읽었다는 사실은 namespace/module/owner 전체 목록·linked API 계약의 폐쇄가 아니에요.

HB 전용 구조 변경 transaction·stable ID·revision·사람 Outliner/Inspector·C++/node·AI 공통 검증/Undo/저장 제안은 설계 후보로 분리돼 있어요. Unity C#를 HB C++ 선언으로 바꾸거나 원엔진의 공식 AI 계약이라고 주장하지 않았어요. 이번 대조는 표시된 근거에 대한 제한된 독립 의미 비교이며 HB 실제 구현·runtime/GUI·다중 문서 원자성 검증이 아니에요.

이 신규 감사 MD만 작성했어요. 감사 담당은 원본 MD/JSON·private source/body/extraction·ledger/status·engine/GUI·network·커밋을 변경하지 않았어요. root의 위 표현 수정 후 최종 MD/JSON pin을 다시 확인했으며 source/body6쌍과 extraction은 처음 대조와 동일해요. 대상 bytes가 달라지면 이 감사도 stale이며 전체 원장 승격은 추가 증거를 가진 root의 판단에 맡겨요. **원장 promotion0·미해결 계약 유지** 상태로 이 묶음 감사를 마쳐요.
