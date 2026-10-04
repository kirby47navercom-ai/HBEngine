# Unity 가져오기·Undo·Prefab·물리 분석 002 독립 대조

주인님, 짚짱의 `/root/unreal_actor_body` 담당은 분석 담당 `root`와 별도로 2026-10-04에 [분석 문서](UNITY_AUTHORING_PHYSICS_BODY_002.md)와 [기계 기록](unity-authoring-physics-body-002.json)을 실제 Unity 6000.0 영어 offline 원문과 대조했어요. **8본문·32heading 구역·8표시 선언·7표·8전체 코드 예제**를 직접 읽고 비교했어요. 대조 결과는 **표시 본문 해석·추출·hash 일치, 미해결 계약 유지**예요. 전체 API/코퍼스 `verified` 승격은 0개예요.

대조 대상 JSON SHA-256은 `fb5457bda9384e9a520848387bd8b67f032626ea8aca0c1f8037165d31e3494a`, MD는 `2e082de7b8249a8ae4ea3a2ec3dd20cb1a269b84cffebb6c033b146c12df1fc9`예요. 이후 대상 bytes가 바뀌면 이 대조도 stale예요. 원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/ScriptReference/{API}.html`, 추출은 `native/build/reference-corpus/unity-authoring-physics-batch/{API}.body.html`이에요. 대조한 모든 파일의 실제 hash·표 셀·예제 hash는 private `native/build/reference-corpus/unreal-actor-batch/unity-authoring-physics-verification-002.json`에 보존했어요. 원문 코드·전체 prose는 공개 Git에 복사하지 않았어요.

원문 첫 technical `div.section`에서 웹사이트 `.suggest`/`.scrollToFeedback` UI만 제외한 뒤 body와 전체 정규화 text가 같은지 확인했어요. heading·signature·표 셀·코드 예제를 원문에서 따로 추출해 다시 비교했으며 단순히 root가 기록한 파일 hash를 신뢰한 것이 아니에요. 8개 원문 header의 Unity 6.0 (6000.0), footer job76410965/2026-09-29를 확인했어요. ZIP 전체 CRC/분모와 다운로드 authenticity를 이번에 다시 검사한 것은 아니에요.

| 실제 대조 본문 | 읽고 비교한 구역/표/예제 | 의미 대조 결과 |
| --- | --- | --- |
| AssetDatabase.Refresh | 4heading·선언1·표1·예제1 | 변경/추가/삭제·dependency 갱신, asset import 동기와 script compilation 비동기, unused asset GC, 자동 감지 조건을 구분한 분석이 맞아요. 예제는 disk 세 폴더 생성→DB 조회→Refresh→재조회예요. options·GC 수명·thread 후속 계약은 열려 있어요. |
| AssetDatabase.ImportAsset | 4heading·선언1·표1·예제1 | 프로젝트 상대 path와 signature의 options default를 확인했어요. **표에는 path만 있고 options가 빠져요.** 두 callback 이름을 원문에서 비교했고 본문만으로 callback 실행 순서/동기성을 확정하지 않았어요. 예제의 Artifacts 디렉터리 생성 누락·두 번째 파일의 refresh 대기 해석이 맞아요. |
| AssetDatabase.CreateAsset | 4heading·선언1·표1·예제1 | native format·GameObject prefab/비native 제외·기존 경로 overwrite·확장자/StreamingAssets 콘솔 오류·import 중 생성 경고가 맞아요. 여러 subasset 추가 순서와 root 없음 설명을 비교했어요. 예제 shader를 모든 pipeline에 보장하지 않았어요. |
| Undo.RecordObject | 4heading·선언1·표1·예제2 | 호출 후 변경, frame 끝 binary diff, 무변경 Undo 없음, parent/AddComponent/destruction의 전용 API 필요가 맞아요. Editor radius handle의 RecordObject **후 실제 property write**와 별도 MonoBehaviour 예제를 전체 읽었어요. GUI change check가 필수라는 잘못된 조건은 없어요. |
| PrefabUtility.RecordPrefabInstancePropertyModifications | 4heading·선언1·표1·예제1 | 수정 뒤 override 기록, 누락 시 저장/재열기 손실, SerializedObject/Property 권장, Undo→scale write→override 순서가 맞아요. SaveScene이 **주석**이고 null/persistent selection 메뉴 비활성화도 비교했어요. 이 함수만으로 일반 Undo/실제 디스크 저장을 보장하지 않았어요. |
| Physics.Simulate | 4heading·선언1·표1·예제1 | static void/float step, Script mode·collision/integration/callback, FixedUpdate 별도, fixed small positive step·0.03 초과 경고가 맞아요. while accumulator 코드와 maximumDeltaTime 제외를 전체 비교했어요. cross-platform bit-identical 보장으로 확대하지 않았어요. |
| Physics.SyncTransforms | 3heading·선언1·표0·예제0 | static void/인수 없음과 Transform/자식 Rigidbody·Collider의 위치/회전/크기 flush를 비교했어요. 물리 time advance·FixedUpdate 호출이라는 근거 없는 의미가 없어요. |
| Physics2D.Simulate | 5heading·선언1·표1·예제1 | bool/float deltaTime/int simulationLayers default=Physics2D.AllLayers, callback 중 실행 실패를 비교했어요. body/contact/joint/effector 레이어 범위, 편집기 Play 밖 movement/contact와 script callback 억제, FixedUpdate 별도, 예제의 bool 미소비가 맞아요. |

signature 비교 때 Declaration heading과 실제 선언을 분리했으며 root의 최종 기록 8개와 모두 같았어요. default option 표현·return·static·인수 이름/타입이 보존됐고 Unity C#를 Unreal/C++ 선언으로 변환하지 않았어요. 표 7개는 **17행·34셀(헤더 포함)**을 원문과 대조했어요. body에 image가 없는 것도 확인했어요. 코드 예제 8개는 CRLF/LF만 통일한 text SHA-256과 전체 문자 내용이 원문/추출 사이 같았어요.

이 대조는 **읽은 8개 표시 본문의 제한된 독립 의미 확인**이에요. 관련 ImportAssetOptions/refresh loop/native importer/전용 Undo/Prefab override/apply/revert/serialization/simulationMode/nondefault Physics Scene/autoSync의 전체 API와 thread·ownership·lifetime·invalid input·실패·세부 callback 순서는 아직 열려 있어요. source snapshot의 `inventory.complete=true`는 해당 페이지의 표시 구역·선언·media 구조 coverage이지 이 후속 계약의 완료가 아니며, root의 `openIssues`, `verificationStatus=pending_independent_comparison`, `gatePass=false`를 변경하지 않았어요.

HB 대응 문장은 설계 판단으로 분리된 것을 확인했어요. C++/typed node·사람 UI·AI가 같은 검증·저장·Undo·작업 상태를 제공해야 한다는 제안이며 Unity 공식 AI 기능이나 HB 구현 동등성의 증거가 아니에요. 이번 대조에서 엔진 수정·runtime/GUI 실행·root ledger 상태 승격은 하지 않았어요.
