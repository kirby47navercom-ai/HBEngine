# Unreal 본문·API 의미 분석 001

기준: Unreal Engine 5.8, en-us, 2026-10-04. 기존 캐시의 **10개 페이지 원문**을 다시 읽어 **54개 본문 구역과 121개 표시 API 항목**을 분석했다. URL 수집이나 카테고리 링크 수를 분석 수로 계산하지 않는다. **독립 검증 0개, 전체 코퍼스 미완료, 구현 gate 미통과**다. 엔진 구현·GUI 실행은 하지 않았다.

기계 원장은 [unreal-body-analysis-001.json](unreal-body-analysis-001.json)이다. 각 항목은 원본·본문 경로와 해시, 정확한 JSON pointer/HTML table-row-cell/definition anchor, 읽은 구역, 원문 사실, 추론, HBEngine 대응, 미해결 문제를 구분한다. C++ class 페이지에 표시된 모든 표 행을 읽었지만 링크된 개별 멤버·상속·override·overload 본문까지 읽었다고 주장하지 않는다.

## 근거와 판정 방법

- **공식 사실**은 해당 페이지의 선언·표·설명에서 직접 확인한 내용이다. 설명 없는 함수는 표시된 반환/파라미터와 qualifier까지만 사실로 남겼다.
- **미상**은 문서에 없는 기본값·NULL/오류/부작용·동기성·수명·완전한 overload 목록이다. 다른 API나 관행을 대입하지 않았다.
- **HB 현재 사실**은 프로젝트 문서와 소유 파일의 정확한 줄을 인용했다. 이번 조사에서 실행·빌드 검증한 사실은 아니다.
- **설계 추론**은 HBEngine에 어떤 계약이 필요할지 제안한 것이다. 구현됐다는 뜻도 Unreal과 동등하다는 뜻도 아니다.

`sourceHash`는 원본 HTTP HTML bytes의 SHA-256이다. `bodyFileHash`는 `bodyPath` 파일 bytes의 SHA-256이며 통합 원장의 `snapshot.body.sha256`에는 이것을 사용한다. SSR `bodyHash`는 `blocks`를 key 정렬하고 공백 없는 UTF-8 JSON으로 직렬화한 SHA-256이다. Python `bodyHash`는 `div.body[role=main]`의 텍스트를 HTMLParser로 읽고 공백을 정리한 UTF-8 SHA-256이다. 두 형식의 의미 해시를 동일 추출 방식으로 오해하지 않는다.

캐시 경로는 저장소 기준 상대 경로로 보관했고 실제 파일 10쌍의 존재와 해시를 확인했다. Python 두 sample에는 이전 HTTP retrieval UTC timestamp가 기록되지 않아 `retrievedAt=null`이다. 파일 수정 시각은 별도 `cacheLastWriteAt`이고 수집 시각으로 대신하지 않았다.

## UE001-01 — UK2Node

[공식 타입 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/BlueprintGraph/UK2Node?application_version=5.8). JSON 원장의 `UE001-01`과 대응한다.

**Navigation·Syntax·Inheritance Hierarchy.** BlueprintGraph editor 모듈의 abstract UEdGraphNode 파생 class다. UObjectBase→UObjectBaseUtility→UObject→UEdGraphNode→UK2Node 계층과 `Abstract`, `MinimalAPI`를 확인했다. 노드 편집 객체의 메서드와 실제 게임 런타임의 노드 실행 상태를 동일한 것으로 취급하지 않는다.

**Derived Classes.** 66개 derived class 링크의 이름과 관계를 모두 읽었다. 변수·함수 호출·조건·컨테이너·비동기·입력·애니메이션 등 여러 node type을 가리킨다. 각각의 subclass body는 미독이며 이름으로 pin 규칙이나 compile lowering을 확정하지 않는다.

**Constructors·Enums.** constructor 표의 한 행은 const FObjectInitializer 참조를 받는다. default 인수는 표시되지 않는다. public EBaseNodeRefreshPriority, protected ERedirectType을 확인했지만 실제 enum 값은 class 본문에 없고 링크 대상은 미독이다.

**Functions의 모든 구역.** Public 13개, Public Virtual 43개, UEdGraphNode override 16개, UObject override 4개, Protected 10개, Protected Virtual 5개, 총 **91개 표시 함수 행**을 읽었다. machine 원장은 각 행의 반환 타입, 파라미터 이름·표시 타입, const/virtual, 원문 위치와 의미 설명 유무를 보관한다. 설명 없는 API는 행동을 추정해 채우지 않았다.

| 기능 계약 | 읽은 함수와 의미 | 기본값·제약·미상 |
|---|---|---|
| entry/exit·split pin | CreatePinsForFunctionEntryExit는 Function과 entry 여부로 방향을 정한다. ExpandSplitPin/ExpandSplitPins는 compiler context·graph·pin을 받는다. | ExpandSplitPin과 wildcard 허용 함수는 자세한 동작 설명이 없다. |
| 소유 객체 조회 | GetBlueprint/GetBlueprintChecked/GetBlueprintClassFromNode/HasValidBlueprint, GetExecPin/GetThenPin | checked 조회는 valid outer가 없으면 assert한다. exec/then pin은 존재하는 경우만 나온다고 명시한다. |
| 편집 연결·rename | InsertNewNode, RenameUserDefinedPin, OnUserDefinedPinRenamed, BroadcastUserDefinedPinRenamed, RenameUserDefinedPinImpl | 성공하고 bTest=false일 때 외부 rename 통지가 발생한다. 내부 Impl은 통지를 하지 않는다. bTest의 초기 default는 미표시다. |
| 메뉴·식별 | GetMenuActions/GetMenuCategory/IsActionFilteredOut/GetSignature/GetNodeAttributes/GetReferencedLevelActor | 타입 식별, 검색 필터와 spawner 등록은 서로 다른 계약이다. menu lifetime·중복 등록 정책은 없다. |
| compiler | EarlyValidation/ExpandNode/CreateNodeHandler/IsNodePure/IsLatentForMacros/IsNodeRootSet/IsNodeSafeToIgnore | validation은 expansion 전, ExpandNode는 추가·삭제 가능, root/pure/latent/pruning 판정이 분리돼 있다. 특정 class의 lowering은 미독이다. |
| 구조 변경 | NodeCausesStructuralBlueprintChange/ClearCachedBlueprintData/PreloadRequiredAssets/PreloadObject | 구조 변경 시 재생성 캐시와 preload 책임이 있다. PreloadObject는 NULL 허용을 명시한다. 나머지 NULL/실패 세부는 미표시다. |
| 재구성 | ReallocatePinsDuringReconstruction/PostReconstructNode/RestoreSplitPins/ReconstructSinglePin/RewireOldPinsToNewPins/DoPinsMatchForReconstruction | 기본 Reallocate는 old pins를 무시하고 AllocateDefaultPins를 호출한다. override의 split pin 복구 책임이 명시돼 있다. |
| 이전 데이터·참조 | ConvertDeprecatedNode/FixupPinDefaultValues/FixupPinStringDataReferences/GetRedirectPinNames/ShouldRedirectParam/ReferencesFunction/ReferencesVariable/ReplaceReferences | deprecation이 노드 삭제·교체를 일으킬 수 있다. 저장 데이터 호환과 현재 graph edit를 구별해야 한다. |
| 표시·디버그 | compact/entry/exit/variable/title/icon/property 함수, CanPlaceBreakpoints, Message_Note/Error/Warn | breakpoint 지원과 runtime stepping 구현은 동일하지 않다. Note는 owning Blueprint log가 있는 경우를 설명한다. Error/Warn 행은 자세한 설명이 없다. |
| UEdGraphNode overrides | AutowireNewNode, CanCreateUnderSpecifiedSchema, CanSplitPin, connection change, ReconstructNode, hover/metadata, definition jump, compilation validation 등 16행 | schema 생성 허용 외 다수 행은 signature만 제공한다. 실제 autowire·reconstruction policy를 미확인으로 남겼다. |
| UObject overrides | HasNonEditorOnlyReferences/PostLoad/PreEditChange/Serialize 4행 | hook signature만 있으며 serialization format·thread·호출 순서는 미설명이다. |

**공식 자료 오류/누락.** DrawNodeAsExit의 remarks가 entry 설명을 반복한다. ReferencesFunction의 설명에는 name/guid pair가 등장하지만 표시 signature는 name/scope다. 이 두 불일치를 고치거나 의미를 결정하지 않았다. 표시 class 표를 읽었다고 모든 상속/overload API를 읽은 것으로 승격하지 않는다.

**HB 대응.** 사람에게는 menu·schema 연결·pin 복구·validation·디버깅을 나눠 비교해야 한다. HB의 C++ reflection→pin 생성은 제한된 선언 분석 경로이며 UK2Node compiler 확장 전체와 동등하지 않다. Blueprint authoring과 AI는 [공통 연결/변수 드롭 명령](../AI_ENGINE_API.md:137), revision 보호 patch/Undo를 사용한다. 같은 node schema에서 인간 메뉴와 AI의 생성 가능한 node inventory를 내보내는 것은 설계 후보이며 새 compiler/plugin 기능을 구현하지 않았다.

## UE001-02 — UInputAction

[공식 타입 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UInputAction?application_version=5.8).

**Navigation·Syntax·Inheritance.** UDataAsset 파생 BlueprintType class의 논리 행동 정의다. 설명에 player별 FInputActionInstance가 있으며 일반적인 구독 event로 Triggered를 안내한다. 에셋 정의와 player별 평가 상태를 분리해서 읽는다.

**Typedefs·Constants.** parameter 없는 multicast void delegate인 FModifiersChanged/FTriggersChanged 2종과 변경된 action을 가리키는 const UInputAction* set 2종을 확인했다. 발행 타이밍·listener lifetime·set 초기 내용·thread-safety는 설명하지 않는다.

**Variables/Public.** 아래 12행의 타입과 편집/Blueprint 노출 metadata까지 읽었다. **실제 초기값은 모든 행에서 미표시**다. HB 기본값을 UE 기본값으로 옮기지 않는다.

| 속성 | 공식 의미 | 편집·실행 제약 |
|---|---|---|
| AccumulationBehavior | 여러 mapping이 같은 action에 기여할 때 값 누적 계산 | enum 값은 별도 미독. EditAnywhere/BlueprintReadOnly/AdvancedDisplay |
| ActionDescription | localized FText 설명 | EditAnywhere/BlueprintReadOnly |
| bConsumeInput | 낮은 priority Enhanced Input mapping으로 넘길지 소비할지 | EditAnywhere/BlueprintReadWrite |
| bConsumesActionAndAxisMappings | legacy Action/Axis delegate 경로도 소비 | true의 효과를 설명하며 trigger bitmask와 관계가 있다. |
| bReserveAllMappings | 상위 context가 자동 override하지 않도록 예약 | mapping code 작성자가 enforce할 책임이라고 명시한다. |
| bTriggerWhenPaused | pause 상태 trigger 허용 | 이전 bExecuteWhenPaused를 대체. default는 미상 |
| Modifiers | 최종 action value의 modifier 배열 | instanced UInputModifier 객체 배열. 순서/오류/소유수명 상세는 미상 |
| OnModifiersChanged | modifier 변경 delegate | 구체 발행 시점은 미설명 |
| OnTriggersChanged | trigger 변경 delegate | 구체 발행 시점은 미설명 |
| TriggerEventsThatConsumeLegacyKeys | legacy key 소비 trigger event bitmask | bConsumesActionAndAxisMappings의 편집 조건과 ETriggerEvent bitmask metadata |
| Triggers | trigger qualifier 배열 | instanced UInputTrigger 객체 배열. 하나의 pressed 선택값과 같은 자료구조가 아님 |
| ValueType | action query/event 반환 값 타입 | BlueprintReadOnly/AssetRegistrySearchable. enum 페이지 오류 미해결 |

**Functions/Public·Public Virtual.** GetPlayerMappableKeySettings는 const TObjectPtr reference를 반환하고, GetSupportedTriggerEvents는 action의 trigger들이 지원하는 event bitmask를 반환한다. IsDataValid는 Context 참조를 받는 const virtual validation 함수지만 실패 조건은 설명하지 않는다. PostEditChangeProperty는 ValueType 변경에 따른 참조 Blueprint 갱신을 설명한다. nullptr·enum 정의·trigger class·validation Context 본문은 미독이다.

**HB 대응.** [실제 IA 기본값과 검증](../../prototype/asset-documents.js:45)은 bool/float/vec2/vec3, consumeInput, 단일 pressed/held/released, deadZone 구조다. IA/IMC를 사람이 편집하고 AI가 schema/document.patch로 쓰는 현재 경로를 확인했다. [입력 spec](../BLUEPRINT_SPEC.md:48)은 Ongoing/Canceled, Hold/Tap/Chord, runtime Context 교체, player별 문맥, C++ 직접 action 구독을 미완료로 남긴다. 그러므로 현재 Started/Triggered/Completed가 UE 전체 trigger evaluation과 동등하다고 보고하지 않는다. per-player action state, trigger/modifier 배열, pause·reservation·legacy 소비 규칙은 분석·검증할 후보이며 구현하지 않았다.

## UE001-03 — UK2Node::GetMenuActions

[공식 함수 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/BlueprintGraph/UK2Node/GetMenuActions?application_version=5.8).

**Navigation·Description.** const virtual void 함수이고 node subclass 및 game module node가 자신의 spawner를 메뉴 action registry에 등록하는 확장점이다. GetMenuEntries를 대체한다고 설명한다.

**Derived Overrides.** 61개의 표시 override 링크를 읽었다. override 함수의 개별 본문이나 필터·등록 순서·중복 처리 규칙을 확인한 것은 아니다.

**표시 선언·Parameters.** 선언은 FBlueprintActionDatabaseRegistrar reference인 ActionRegistrar를 받는다. default 인수는 없다기보다 **이 문서에 표시되지 않는다**. Parameters 표는 ActionListOut이라는 다른 이름을 제시한다. API 설명을 동일 파라미터로 임의 치환하지 않고 `UE001-GETMENU-PARAM`으로 미해결 보관한다. K2Node.h 원본·현행 구현과 독립 대조가 필요하다.

**HB 대응.** 사람 메뉴의 node 등록과 C++ reflection 결과 목록, AI schema의 node key는 한 registry를 사용하도록 비교할 수 있다. 이것은 설계 추론이며 실제 Unreal spawner/registrar의 lifetime·filter·plugin loading 정책과 동등성을 확인하지 않았다.

## UE001-04 — EInputActionValueType

[공식 enum 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/EInputActionValueType?application_version=5.8).

**Navigation.** InputActionValue.h의 enum 페이지이며 EnhancedInput 모듈에 속한다.

**Syntax·Values.** 표시 syntax와 4행 값 표 모두 enum name 대신 `UMETA`를 반복한다. Digital(bool)/Axis1D(float)/Axis2D(Vector2D)/Axis3D(Vector)의 display label과 타입 크기 순서/승격을 언급하는 설명은 읽었다. **실제 enumerator 명칭·numeric value·promotion algorithm·초기값은 검증할 수 없다.** 이름/값을 기억이나 다른 버전에서 채우지 않았다.

**HB 대응.** 사람이 쓰는 HB bool/float/vec2/vec3 선택값과 UE display labels의 모양은 비교할 수 있지만 실제 C++ enum adapter나 Blueprint 승격 규칙을 확정할 수 없다. AI는 HB schema의 stable type key를 사용해야 하며 `UMETA`를 값으로 채택하면 안 된다. label과 type ID 분리는 설계 제안이고 Epic 오류의 복구 사실은 아니다.

## UE001-05 — Enhanced Input plugin descriptor

[공식 plugin descriptor 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/EnhancedInput?application_version=5.8).

**Navigation 및 descriptor 표.** EnhancedInput.uplugin 경로, Input category와 문맥별/동적 mapping 설명을 읽었다. API/Plugins 모듈 페이지와 API/PluginIndex의 패키지 descriptor는 서로 다른 조사 단위다.

**Modules.** EnhancedInput, InputBlueprintNodes, InputEditor 세 모듈을 확인했다. 모듈명만으로 각 build target이나 runtime/editor load phase를 결정하지 않는다.

**Plugin Dependencies·Dependents.** Data Validation 의존과 13개 피의존 plugin 링크를 모두 읽었다. optional 여부, enabledByDefault, 정확한 dependency versions·platform filter·load order는 이 본문에 없다. 링크 대상과 실제 .uplugin은 미독이다.

**HB 대응.** C++ header+implementation worker 연결은 Epic의 multi-module plugin architecture와 동등한 증거가 아니다. runtime 입력/editor 설정/editor Blueprint node 책임을 분리해서 연구할 근거다. 이 페이지를 읽었다는 이유로 HB plugin 설치·활성화 AI 명령이나 platform ABI를 새로 가정하지 않았다.

## UE001-06 — Destroy Actor Blueprint action

[공식 action 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Actor/DestroyActor?application_version=5.8).

**Navigation·설명.** Actor를 target으로 하는 파괴 action이다.

**Inputs.** exec In과 object Target 두 행만 표시된다. Target의 default, self 자동 지정, NULL 허용은 이 페이지에 없다.

**Outputs.** exec Out만 표시되고 성공 bool/error 출력은 없다. Out execution이 파괴 성공, 즉시 메모리 해제나 모든 cleanup 완료를 보장한다는 설명도 없다. C++ Destroy return, pending kill, 반복 호출, frame boundary, replication/authority, component/timer/event cleanup은 `UE001-DESTROY-LIFETIME`의 미해결 교차 조사다.

**HB 대응.** [HB catalog의 destroy](../NODE_CATALOG.md:363)는 exec/target→then이며 C++ 대응이 대시다. 동일 pin 모양을 비교할 수 있지만 C++ Destroy 서비스가 있다고 가정하지 않는다. 인간/AI의 편집 Scene 삭제는 revision·Undo를 갖는 authoring 변경이며 Play object 파괴와 다른 계약이다. runtime.destroy 같은 새 AI 명령을 만들거나 있다고 보고하지 않았다.

## UE001-07 — Add Mapping Context Blueprint action

[공식 action 페이지](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Input/AddMappingContext?application_version=5.8).

**Navigation·설명.** Enhanced Input Subsystem Interface에 control mapping context를 추가한다.

**Inputs.** exec In, interface Target, object Mapping Context, integer Priority, struct Options의 5행을 읽었다. context는 이 player에 적용할 key→action mapping 집합이다. 높은 Priority를 먼저 적용하고 input을 consume하면 낮은 mapping을 차단한다고 명시한다. **모든 default는 미표시**이며 Options 실제 타입/필드, 동일 priority tie-break, 중복 context, rebuild timing, player lifetime은 미상이다.

**Outputs.** exec Out만 제공한다. 별도 성공 결과나 완료 시점은 없다. Blueprint 표시 함수에서 C++ 실제 선언을 추정하지 않았다.

**HB 대응.** 현재 IMC priority를 편집할 수 있는 것과 Play 중 context stack에 추가하는 것은 다른 완료 조건이다. player별 문맥·runtime Context 교체는 현재 spec의 미완료다. AI의 document.patch와 runtime.input/state는 기존 기능이고 동적 context 추가 명령이 확인된 것은 아니다. future context stack의 priority·consume·Options·state rebuild 계약을 공통으로 설계할 연구 과제로 남겼다.

## UE001-08 — Unreal Python API Introduction

[공식 Sphinx 소개](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/introduction.html?application_version=5.8). 최종 URL은 `.html` 없는 introduction이었다.

**목적 문단.** PythonScript Plugin과 PythonAPI는 Unreal Editor scripting/automation에 사용한다고 설명한다. gameplay runtime Python 지원으로 확대해석할 근거가 없다.

**guide 문단.** 활성화·시작·사용법은 별도 Scripting the Editor using Python 링크로 안내한다. 링크가 오래된 docs.unrealengine.com 경로지만 그 최종 문서·버전을 이번 batch에서 요청하지 않았다.

**trademark sidebar·logo.** Python 상표 설명과 logo의 alt/link를 읽었다. logo 픽셀은 보지 않았고 기술 기능의 분석 증거가 아니다.

**HB 대응.** HB는 현재 local HTTP schema/document 명령으로 editor 자동화를 제공한다. 이를 Python plugin이나 runtime 언어 지원으로 보고하지 않는다. AI 작성 명령과 인간 authoring의 같은 validation/revision/Undo 경로를 비교하는 근거이며 별도 interpreter를 구현하지 않았다.

## UE001-09 — unreal.ScopedEditorTransaction

[공식 Sphinx 타입/API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/ScopedEditorTransaction.html?application_version=5.8).

**class definition.** object 파생의 scoped editor transaction이고 desc는 Text 또는 str이다. default description 값은 표시되지 않는다.

**모든 method definition.** `__enter__(self)`는 transaction을 시작하고 ScopedEditorTransaction을 반환한다. `__exit__`는 self와 exception type/value/traceback을 받아 끝내며 bool을 반환한다. type은 Type[BaseException] 또는 None, value는 BaseException 또는 None, traceback은 TracebackType 또는 None로 표시된다. **type union에 None이 있다고 default=None인 것은 아니다.** `cancel(self)`은 transaction을 취소하고 None을 반환한다.

**미해결 의미.** exit bool의 예외 억제 정책, cancel의 rollback 범위, nested transaction, 부분 실패·undo stack·dirty state의 효과는 이 본문에서 설명하지 않는다. type 링크 일부가 Python2.7 docs를 가리키지만 그것으로 UE5.8 실제 interpreter version을 결정하지 않았다.

**HB 대응.** [현재 document.patch](../AI_ENGINE_API.md:12)는 복사본 적용→최종 검증→한 Undo 항목이며 expectedRevision/test/dryRun을 쓴다. 이 계약과 Python transaction의 scope를 비교할 수 있다. 그러나 cancel을 HB 원자적 rollback, exit를 다중 문서 원자 transaction과 동등하다고 주장하지 않는다. 기존 문서 자체도 다중 문서 transaction은 미완료라고 명시한다. 사람이 graph를 바꾸거나 AI가 patch를 쓸 때 같은 보호 경로를 사용하자는 비교이며 새 transaction API를 추가하지 않았다.

## UE001-10 — PlayStation 5 공개 접근 안내

[공식 public landing](https://dev.epicgames.com/documentation/en-us/unreal-engine/development-for-playstation-5-in-unreal-engine?application_version=5.8).

**paragraph 0~2.** PS5 개발 입구와 NDA/permission이 필요한 실제 platform documentation을 설명한다. SSR landing의 entitlement는 none이고 applications에는 5.5~5.8이 함께 있다. 공개 안내와 제한 문서의 entitlement를 혼동하지 않는다.

**enhanced_list 3.** 기존 회사 승인은 관리자에게 portal access를 요청하고, 신규 승인은 console access request와 개발자 승인 확인/필요한 NDA 절차를 따른다고 안내한다. 두 분기 모두 읽었지만 계정·권한 변경이나 요청 발송은 하지 않았다.

**callout 4와 nested paragraph.** 실제 console docs는 현재 public UE documentation site에 없고 private PS5 Development forum thread의 다운로드라고 안내한다. 공개 landing을 다 읽은 사실은 private 자료의 목록/본문/API를 읽었다는 증거가 아니다.

**HB 대응.** 인간 C++/Blueprint/AI에 어떤 console API/ABI/SDK/packaging 기능을 제공해야 하는지는 제한 자료를 확보하지 못해 미상이다. 지원 완료로 표시하지 않고 조사 원장에 외부 코퍼스 미확보로 남긴다.

## 읽지 않은 부분과 다음 독립 검증

이 batch의 **10개 표시 본문 텍스트**는 모두 읽었다. 모든 section/header, table header/data cell, 표시 declaration, Python definition, PS5 nested callout을 coverage로 남겼다. 본문의 link name을 읽은 것과 그 대상 body를 읽은 것은 구분했다. 이미지 pixels·metadata의 banner artwork는 읽지 않았다. 코드를 컴파일하거나 API를 실행하지 않았다.

**unreal.Actor Python API 339,812 bytes, AActor/UObject C++의 긴 페이지, Modules/Plugins/Migration 매뉴얼, linked derived/override/type/member/Options/trigger/modifier/platform 문서는 이 10개 전체 분석에 포함하지 않는다.** 이전 캐시 확보량으로 분석 진척을 늘리지 않는다.

독립 검증에서는 해시와 정확한 원문 위치를 재현하고, 91 UK2Node 함수·20 UInputAction 항목·4 Python transaction 정의의 서명/파라미터를 다시 대조해야 한다. enum UMETA, GetMenuActions parameter, DrawNodeAsExit, ReferencesFunction 설명 불일치를 해결하거나 미해결로 확정한다. 실제 기본값·overload·inherited API·수명/오류·Options·console corpus의 미확보는 별도 참조를 읽기 전까지 유지한다. 검증 완료나 gate 통과를 스스로 표시하지 않았다.

## 페이지별 원본·본문 증거

| 분석 ID | 원본 cache | body cache | 표시 구역 | 표 행/셀 | API 항목 |
|---|---|---|---:|---:|---:|
| UE001-01 | `native/build/reference-cache/unreal/pages/5f6292978c5619cf61ecef1b5d9c08023f25c5055388f0600f240483685bbf67.html` | `native/build/reference-cache/unreal/pages/5f6292978c5619cf61ecef1b5d9c08023f25c5055388f0600f240483685bbf67.json` | 15 | 108/414 | 92 |
| UE001-02 | `native/build/reference-cache/unreal/pages/3f57f04afc24039d7a4d8c32fa3e1e9d196d7accafc0875942767fbd304ad399.html` | `native/build/reference-cache/unreal/pages/3f57f04afc24039d7a4d8c32fa3e1e9d196d7accafc0875942767fbd304ad399.json` | 10 | 30/123 | 20 |
| UE001-03 | `native/build/reference-cache/unreal/pages/3996adcd4f3a782b675761c60158d50721a33b29527b24dec147e58ae03bf03f.html` | `native/build/reference-cache/unreal/pages/3996adcd4f3a782b675761c60158d50721a33b29527b24dec147e58ae03bf03f.json` | 4 | 7/14 | 1 |
| UE001-04 | `native/build/reference-cache/unreal/pages/22e7813df9fc180add36955210bbd2b08a5a44dcf2801f71707be2b7af5fad5b.html` | `native/build/reference-cache/unreal/pages/22e7813df9fc180add36955210bbd2b08a5a44dcf2801f71707be2b7af5fad5b.json` | 3 | 10/20 | 1 |
| UE001-05 | `native/build/reference-cache/unreal/pages/5e9777c2e5729affb0f3c4609dfb8d016f4fb008b42dae61ce5d48ce8228e606.html` | `native/build/reference-cache/unreal/pages/5e9777c2e5729affb0f3c4609dfb8d016f4fb008b42dae61ce5d48ce8228e606.json` | 4 | 3/6 | 1 |
| UE001-06 | `native/build/reference-cache/unreal/pages/64bca0db48895b7f86391b60323483e83d87c368b200a6da4ecafef833bd28f1.html` | `native/build/reference-cache/unreal/pages/64bca0db48895b7f86391b60323483e83d87c368b200a6da4ecafef833bd28f1.json` | 3 | 5/15 | 1 |
| UE001-07 | `native/build/reference-cache/unreal/pages/57195cb84b88b5d56423398a4370c1ff07320b3ef3d0049e62f2a505d6579de9.html` | `native/build/reference-cache/unreal/pages/57195cb84b88b5d56423398a4370c1ff07320b3ef3d0049e62f2a505d6579de9.json` | 3 | 8/24 | 1 |
| UE001-08 | `native/build/reference-cache/unreal/python-introduction.raw` | `native/build/reference-cache/unreal/python-introduction.raw` | 3 | 0/0 | 0 |
| UE001-09 | `native/build/reference-cache/unreal/python-transaction.raw` | `native/build/reference-cache/unreal/python-transaction.raw` | 4 | 0/0 | 4 |
| UE001-10 | `native/build/reference-cache/unreal/pages/2daa7a14d080e14f0300915bea465ef91280dc8645cf377e051c0a5b0c3acc39.html` | `native/build/reference-cache/unreal/pages/2daa7a14d080e14f0300915bea465ef91280dc8645cf377e051c0a5b0c3acc39.json` | 5 | 0/0 | 0 |

### UE001-01 해시

- sourceHash: `3b1681968b8db47f3ff5d32a29f1707cbcb466da3e3fc66a2c96a3fa77306240`
- bodyFileHash: `a88f4762cd92149d1d4409f8190438dc76f8e206d9802d145389d96f36b95d7a`
- bodyHash: `6c8169804df8229491d83742e45843f0679e59284c11e26cb8dc14cc952af78b`

### UE001-02 해시

- sourceHash: `bc6bb43772f60b78d832a5186440a3cb7e73a6c272d43494c7b6ae0afba9ca11`
- bodyFileHash: `ea856678803da2f575be6f64a884cde488cfb068de5e51d58ce7986f58214341`
- bodyHash: `5fc59cbfbda1f69a4c896d66023fa7e1ab0e1cf65888cd1a99c6ac8c7157c4e3`

### UE001-03 해시

- sourceHash: `8f02f189acf1249ca827b349876cf5629cfd8fc71e3593f0bf33cb4cdb19c62c`
- bodyFileHash: `e6e1d2649adb79017c389bd9403a2424257c2c792e8c3e47ff7694e1c67cadd9`
- bodyHash: `2e35aca4f471dd46289cc543347c17a4c3e6ebaecb215b27fef40a2c51f6e771`

### UE001-04 해시

- sourceHash: `a22065f46f4339e72f8e261588895d736ba5ff73dcbab78580390eb2564a2e34`
- bodyFileHash: `fd219a7f36cfba9ba52c75fdc65e8e9de12c96d4c2685a69abe3de849b0a9968`
- bodyHash: `3b74f9462f5546561018ce8ebcf4f3f93f1d456134aba7590d52aa8edcdb7d5c`

### UE001-05 해시

- sourceHash: `ccae60cc6b5e9239366f5eb898fdc7a445913ec4873e320af6cbf16c8c8b6fcb`
- bodyFileHash: `3fbee6ace9937187feb0d509207f8a83b88c4e19fbcd7df248abe755b2da0f48`
- bodyHash: `1dc155198231f459f412fb20c9d7f5b604d506e0ba142256fc629190887bfaee`

### UE001-06 해시

- sourceHash: `2513395928661b2fc310eaa695c8ee0c7999d8ae003c09664338d1de33cd2963`
- bodyFileHash: `f2ff28191f004a9911e0144181c2b6edc7702b9a22d668ef112fb75ba54a5376`
- bodyHash: `9e2c7bd194799ecaf8a575a585f42b2ae6f15e6b8722474800d3d13063478e67`

### UE001-07 해시

- sourceHash: `65a4b7b616a361ef36db1aff79614e79c8bb05501580127aa7b136985bc77fea`
- bodyFileHash: `5a48a4ba22b6d7aaea02f3a6e3f8f618b2bfae696398cfb176bcc45ceed311c6`
- bodyHash: `1e1d370eab771f416661fe7ae88a1b909c78f78d49f3fa42da86f7dba40e3046`

### UE001-08 해시

- sourceHash: `d58047856768927a05d82db33b17b308dc166c27b22c87c21809e6252b71e231`
- bodyFileHash: `d58047856768927a05d82db33b17b308dc166c27b22c87c21809e6252b71e231`
- bodyHash: `7c4f651b34a821b2222ec2534598a58c3d1cfdfc6c00cb37b79835406fa30fcf`

### UE001-09 해시

- sourceHash: `be9a6f62118cd5bd547d5ffca79fabe4b73aa1d9e88d7d064220ff35db90428b`
- bodyFileHash: `be9a6f62118cd5bd547d5ffca79fabe4b73aa1d9e88d7d064220ff35db90428b`
- bodyHash: `6e26b58dad8c2eb9deb5e2f5385082d47c55f22f59f368e154f286ba5f4d398c`

### UE001-10 해시

- sourceHash: `69b8776a2ac1ff58d3c9ceff46b6c9be1a71b4057af6c1c86d93c6ebdeb0dc1d`
- bodyFileHash: `85ac422423fe6425d897e9f2c8afc9390312fd5b84e6bc66f8dddf6efdbd48a2`
- bodyHash: `78d6e3894543e4cf34bca61699d5cfd32775cc32c64268da5555483f212be94a`
