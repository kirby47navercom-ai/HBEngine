# Unreal Actor·ActorComponent 본문/API 분석 002

주인님, 짚짱은 2026-10-04에 공식 Unreal Engine **5.8 / en-us**의 짧은 API 8본문과 Components 가이드 1본문을 전체 읽고 분석했어요. **9본문·42표시 구역(41heading+introduction)·10표시 API 선언/overload**이며 전체 코퍼스/API 분모가 아니에요. 독립 verified는 0개이고 구현 gate는 닫혀 있어요. 연구 문서·private snapshot만 작성했으며 엔진·GUI·runtime·공유 원장은 변경하지 않았어요.

기계 기록은 [unreal-actor-body-002.json](unreal-actor-body-002.json)이에요. 실제 source/body 경로·SHA-256, 원본 선언, 모든 표 행/셀의 위치·개수·hash, 읽기 범위·구역과 미확보 계약을 담았어요. 새 요청 15개 중 **11개 SSR 실제 본문**, **4개 HTTP 200이지만 SSR 문서 본문 없음**을 분리했어요. 캐시의 AActor를 재사용했고 새 UActorComponent도 가져왔지만 두 class의 전체 수백 행을 읽었다고 계산하지 않아요.

## 근거·읽기 범위

모든 요청은 `dev.epicgames.com`의 문서 URL에 `application_version=5.8`을 명시했어요. API SSR의 `applications`는 실제 5.8 하나예요. Components는 5.5~5.8, Actor Lifecycle은 5.6~5.8을 명시하며 요청한 5.8이 포함돼 있어요. canonical은 `?lang=en-US`만 포함하고 version은 없어 canonical만으로 판본을 결정하지 않아요. 5.8이 현재 최신이라는 별도 주장은 하지 않아요.

9개 전체 본문은 표시 text·heading·표·snippet·예제·remarks를 모두 읽었어요. 표 **84행(헤더 포함)·180셀**이며 API getter 두 페이지에 각각 2개 overload가 있어 API 페이지 수와 선언 수를 구분해요. linked override/type/member 본문은 별도로 읽지 않은 항목으로 남겨요. 예제 코드는 전체 source implementation으로 계산하지 않아요.

Actor Lifecycle은 **31개 top-level block과 중첩 목록의 모든 text**를 읽고 분석했지만 lifecycle chart `ActorLifeCycle1.png`와 GC 설정 그림 `AdvancedGC.png`의 pixels를 확보하지 못했어요. 이 1본문은 **text 전체 읽기, whole-body 읽기는 대기**이며 9개 전체 분석 수에 포함하지 않아요. 9개의 추가 표시 구역까지 합친 text 범위는 51구역이에요. 그림이 없는 것으로 표시하거나 알맞은 설명을 추측해 채우지 않았어요.

AActor와 UActorComponent는 최초 설명 및 각각 **12개·14개 선택 표 행**만 읽었어요. 26행은 supplemental 계약 근거이고 whole-class/API 완료 분모에 더하지 않아요. API table shorthand의 생략된 `const`는 개별 함수 snippet에서 확인했어요.

sourceHash는 실제 HTTP HTML bytes, bodyFileHash는 실제 SSR JSON 파일 bytes, bodyHash는 `blocks`를 key 정렬·공백 없는 UTF-8 JSON으로 직렬화한 SHA-256이에요. 원본과 실패 응답은 `native/build/reference-corpus/unreal-actor-batch/`에 byte 그대로 보관했어요. cache/hash 존재나 분석 조립 script 실행 자체를 실제 읽기·독립 의미 검증으로 계산하지 않아요.

## 전체 읽은 API 계약

아래 선언은 표시된 qualifier·parameter·return을 그대로 보존한 읽기 결과예요. 원본 whitespace와 UFUNCTION metadata 전체는 JSON의 `declarationOriginal`에 있어요. 전체 원문 표 셀과 Components의 2개 코드 예제는 private `actor-body-source-evidence.json`에 보존하고 공개 JSON에는 locator·hash·직접 쓴 분석만 남겼어요. 표시하지 않은 default·nullptr·thread·권한을 관행으로 보충하지 않아요.

| 공식 페이지·선언 | 본문에서 확인한 계약 | 미상·제약 |
| --- | --- | --- |
| [AActor::Destroy](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/AActor/Destroy?application_version=5.8), `bool Destroy(bool bNetForce, bool bShouldModifyLevel)` | true는 파괴 또는 이미 파괴 표시, false는 indestructible이에요. latent이며 tick 끝에 처리돼요. bNetForce는 play 때만 의미·문서 default=false, bShouldModifyLevel은 제거 전 level Modify()·문서 default=true예요. | snippet에는 `=default` 식이 없어요. bNetForce의 세부 force 효과, Modify의 transaction 범위, 임의 thread 안전성은 미상이에요. true를 즉시 메모리 해제로 해석하지 않아요. |
| [AActor::AttachToComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/AActor/AttachToComponent?application_version=5.8), `bool AttachToComponent(USceneComponent* Parent, const FAttachmentTransformRules& AttachmentRules, FName SocketName)` | Actor의 RootComponent를 Parent에 연결해요. 등록되지 않은 component에 호출하면 유효하지 않으며 bool은 부착 성공이에요. const reference rules는 transform/weld 처리, SocketName은 optional parent socket이에요. | optional이라는 설명은 C++ default=NAME_None을 입증하지 않아요. pointer null·invalid socket·rules enum 값·실패 통지는 미상이에요. |
| [AActor::K2_AttachToComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/AActor/K2_AttachToComponent?application_version=5.8), `bool K2_AttachToComponent(USceneComponent* Parent, FName SocketName, EAttachmentRule LocationRule, EAttachmentRule RotationRule, EAttachmentRule ScaleRule, bool bWeldSimulatedBodies)` | RootComponent·등록 조건·성공 bool은 위와 같아요. 위치·회전·크기 규칙을 개별 입력으로 받아요. weld는 simulated parent로 shapes를 이관하며 detach 이후에도 영구 변경이 남을 수 있어요. | BlueprintCallable, DisplayName="Attach Actor To Component", ScriptName="AttachToComponent", Category="Transformation", metadata `bWeldSimulatedBodies=true`예요. 이는 표시 C++ default 식과 달라요. 나머지 pin default는 미표시예요. |
| [AActor::GetOwner](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/AActor/GetOwner?application_version=5.8), `AActor* GetOwner() const`, `template<class T> T* GetOwner() const` | network replication에 주로 쓰는 Actor owner를 읽어요. 첫 overload는 BlueprintCallable, Category=Actor예요. template cast 실패는 nullptr예요. | raw return pointer의 ownership 이전·참조 증가·retention·thread 보장은 없어요. 공간 attachment parent라는 설명이 아니에요. |
| [UActorComponent::BeginPlay](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UActorComponent/BeginPlay?application_version=5.8), `virtual void BeginPlay()` | registered·initialized component에 적용해요. owning Actor가 play를 시작하거나 이미 begun Actor에 component가 동적 생성될 때 호출돼요. Actor BeginPlay는 보통 PostInitializeComponents 직후이고 networked/child actor는 지연될 수 있어요. | 표시된 14개 derived override 이름은 읽었지만 각각의 override body는 미독이에요. superclass 호출·callback 세부 순서는 미상이에요. |
| [UActorComponent::RegisterComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UActorComponent/RegisterComponent?application_version=5.8), `void RegisterComponent()` | render/physics state를 만들며 outer Actor Components 배열에 아직 없으면 자신을 추가해요. | void를 성공 보장으로 해석하지 않아요. phase·thread·실패 통지 세부는 본문에 없어요. |
| [UActorComponent::GetOwner](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UActorComponent/GetOwner?application_version=5.8), `AActor* GetOwner() const`, `template<class T> T* GetOwner() const` | **Outer chain**을 따라 owning AActor를 찾아요. 첫 overload는 BlueprintCallable, Category="Components", Keywords="Actor Owning Parent"예요. template cast 실패는 nullptr예요. | Actor의 network-owner getter 및 SceneComponent transform parent와 분리해요. 반환 pointer lifetime·thread는 미상이에요. |
| [UActorComponent::K2_DestroyComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UActorComponent/K2_DestroyComponent?application_version=5.8), `void K2_DestroyComponent(UObject* Object)` | unregister하고 pending kill로 표시해요. Actor 소유 component는 owning Actor가 호출해야 한다고 본문이 제한해요. | BlueprintCallable, Category="Components", Keywords="Delete", HidePin="Object", DefaultToSelf="Object", DisplayName="Destroy Component", ScriptName="DestroyComponent"예요. hidden self pin은 일반 C++ default가 아니에요. bAllowAnyoneToDestroyMe 예외·default·실패 통지는 추가 확인 대기예요. |

Actor API header는 `GameFramework/Actor.h`, 구현 위치는 제공한 경우 `Private/Actor.cpp`예요. Component API header는 `Components/ActorComponent.h`, 제공한 구현 위치는 `Private/Components/ActorComponent.cpp`예요. GetOwner 페이지에는 source .cpp 위치가 없어요. Runtime/Engine 경로는 editor-only 선언이 아니지만 모든 단계·thread에서 호출 가능한 증거도 아니에요.

## Components 가이드의 모든 구역

[공식 Components 본문](https://dev.epicgames.com/documentation/en-us/unreal-engine/components-in-unreal-engine?application_version=5.8)의 introduction과 13 heading 구역, 등록/해제 표, 2개 코드 예제를 읽었어요. source별 정확한 heading ordinal과 표 위치는 JSON의 UEACT002-08에 있어요.

ActorComponent는 transform 없는 behavior이고 SceneComponent는 transform, PrimitiveComponent는 geometry를 추가해요. spawn subobject의 등록은 자동이며 runtime 생성은 Actor와 연관된 상태에서 수동 등록할 수 있어요. 등록 시 scene/update 및 OnRegister·CreateRenderState·OnCreatePhysicsState 역할을 설명해요. 해제는 update/simulation/render 과정에서 제외하고 OnUnregister·DestroyRenderState·OnDestroyPhysicsState를 다루며 메모리 파괴와 같지 않아요.

tick은 component 기본 꺼짐이며 `PrimaryComponentTick.bCanEverTick=false`가 기본이에요. update를 원하면 constructor에서 허용하고 `SetTickFunctionEnable(true)`로 켜요. render dirty는 frame 끝에 갱신하지만 physics state 변화는 즉시 반영해요. ActorComponent·SceneComponent·PrimitiveComponent의 기본 render/physics state가 같지 않으며 physics destruction 조건을 고려해야 해요.

Visualization Component 예제는 owner 확인, NewObject의 transactional/transient flag, SetupAttachment, SetIsVisualizationComponent, Super::OnRegister를 보여줘요. `WITH_EDITORONLY_DATA`/`WITH_EDITOR`로 보호해 PIE·packaged 실행에 editor visualization 참조를 남기지 않는 원칙이에요. 생략부 `...`가 있는 예제를 완전한 함수·직렬화 규약으로 확대하지 않아요.

SceneComponent는 부모 한 개·자식 여러 개·cycle 금지이며 Actor의 root가 Actor transform을 제공해요. SetupAttachment는 constructor/미등록 component, AttachToComponent는 즉시 부착/play 문맥에 연결돼요. PrimitiveComponent는 렌더/충돌 geometry, Scene Proxy는 game thread와 병렬 렌더에 쓰는 data예요. 이 병렬 설명은 arbitrary worker-thread component 호출 허용이 아니에요. 오래된 `api.unrealengine.com/.../FTransform/index.htm` 링크 및 Rendering System Overview 대상은 이번 batch 미독이에요.

## Actor Lifecycle text 전체, 그림 대기

[공식 lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle?application_version=5.8)의 source JSON `/blocks/0..30` 전체 text를 읽었어요. disk load는 PostLoad version fixup, PIE는 새 World 복제/PostDuplicate, spawn은 PostActorCreated·construction·component 초기화·OnActorSpawned broadcast·BeginPlay를 구분해요. PostLoad와 PostActorCreated는 배타적이며 deferred spawn은 PostActorCreated 이후 불완전한 instance를 설정하고 FinishSpawning에서 construction을 재개해요.

EndPlay 원인은 Destroy·PIE 종료·level transition·streaming unload·lifetime·shutdown이에요. OnDestroyed의 좁은 cleanup을 EndPlay로 옮기도록 권해요. `s.ForceGCAfterLevelStreamedOut=false`와 빠른 reload에서는 같은 Actor와 local 변수 상태가 재사용될 수 있어요. EndPlay를 항상 메모리 파괴·default 재초기화라고 가정하지 않아요. 문서의 일반 RF_PendingKill 문장과 이 예외의 정확한 flag/상태 관계는 후속 source 확인 대기예요.

GC는 BeginDestroy 자원 정리→IsReadyForFinishDestroy false면 연기→FinishDestroy 최종 해제를 구분해요. cluster는 object/subobject의 함께 해제를 설명하며 Project Settings→Garbage Collection→Create Garbage Collector UObject Clusters를 false로 바꾸는 것은 profiling 이득이 확인된 경우에 권해요. **lifecycle diagram·settings screenshot pixels는 미확보**이므로 whole body_reviewed/analyzed로 승격하지 않아요.

## 선택 class 행의 event·소유·파괴 계약

[AActor](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/AActor?application_version=5.8)의 initial ordered lifecycle 문단과 선택 12행을 읽었어요. registration은 여러 frame에 나뉠 수 있고 editor/runtime에 모두 적용돼요. Blueprint construction은 editor에서 다시 실행될 수 있으며 Activate·InitializeComponent는 해당 flag 조건이 있고 BeginPlay는 actual gameplay 단계예요. 초기 문단에는 `bWantsInitializeComponentSet`이라는 표현이 있어 정확한 실제 property 명칭을 추가 대조해야 해요.

Actor의 Owner는 replication/visibility에 쓰이며 `ReplicatedUsing=OnRep_Owner`예요. OnDestroyed·OnEndPlay는 BlueprintAssignable event 속성이지만 delegate parameter/lifetime/invocation order는 class 행에 없어요. `virtual void SetOwner(AActor* NewOwner)`는 BlueprintCallable, Category=Actor예요. `void ReceiveBeginPlay()`와 `void ReceiveEndPlay(EEndPlayReason::Type EndPlayReason)`는 BlueprintImplementableEvent예요. `virtual void Destroyed()`는 명시적 gameplay/editor 파괴이고 streaming/gameplay ending에서는 호출하지 않는다고 해요. RouteEndPlay·DispatchBeginPlay는 routing 역할까지 기록하고 내부 세부 순서를 추측하지 않아요.

[UActorComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UActorComponent?application_version=5.8)의 initial description과 선택 14행을 읽었어요. Component `ReceiveBeginPlay()`는 owning Actor의 BeginPlay **전에** 또는 이미 begun Actor에서 동적 생성될 때 호출된다고 해요. `ReceiveEndPlay(EEndPlayReason::Type)`는 일반적으로 파괴/Actor EndPlay에 연결돼요. `virtual void EndPlay(const EEndPlayReason::Type EndPlayReason)`는 bHasBegunPlay=true일 때만 Actor EndPlay에서 호출돼요.

`virtual void DestroyComponent(bool bPromoteChildren)`는 unregister→outer Actor Components 배열 제거→pending kill이며 bPromoteChildren 의미/default는 표시되지 않아요. OnComponentCreated는 loaded object를 제외하고 editor/gameplay 생성에 적용하며 OnComponentDestroyed의 bDestroyingHierarchy 의미는 미상이에요. `bAllowAnyoneToDestroyMe`는 K2_DestroyComponent에 any-parent permission을 설명하지만 기본값과 K2 본문 owning-Actor 제한의 예외 관계가 없어서 unresolved예요. 이 행만으로 임의 호출을 허용하지 않아요.

## 실패·미해결 계약

잘못 추정했던 `actor-lifecycle-in-unreal-engine` 요청은 실제 SSR body가 없었고 검색에서 발견한 `unreal-engine-actor-lifecycle`을 별도로 요청해 확보했어요. URL alias가 같은 본문이라는 판정을 하지 않았어요. AActor/SetOwner, UActorComponent/EndPlay, UActorComponent/DestroyComponent도 HTTP 200·SSR 본문 없음이에요. class에 존재하는 계약은 선택 행 근거로 남기고 개별 API 본문 확보와 defaults/errors/thread/lifetime 확인은 대기해요.

FAttachmentTransformRules·EAttachmentRule·EEndPlayReason·delegate type·inherited/derived API 전체, API 호출 thread·null/default/error, event listener 수명·세부 호출 순서·serialized format·version migration·부착/소유/삭제 전파가 미완료예요. JSON의 `sourceConflictsAndGaps`와 `unreadLinkedTargets`에 유지했어요. 같은 담당자의 hash 재확인은 독립 의미 검증이 아니에요.

## HB 대응 — 원출처 사실과 분리한 설계 제안

현재 HB 자료는 읽기 전용으로 [document.patch](../AI_ENGINE_API.md:13), [C++ queued command/snapshot](../AI_ENGINE_API.md:131), [prototype lifecycle 설명](../BLUEPRINT_SPEC.md:82)을 확인했어요. 이번에 실제 source runtime·빌드·GUI를 실행해 동등성을 입증하지 않았어요.

HB에서는 C++의 Actor network owner, Component owner/outer, SceneComponent parent/root를 별도 관계로 정의하는 것이 연구 결과에 맞는 설계 후보예요. node의 typed pin, 사람의 component tree, AI stable-id/schema 수정은 동일 관계·cycle/type/registration 검증을 사용해야 해요. hidden self pin을 임의 caller 권한으로 해석하지 않는 조건과 saved relationship을 다시 여는 조건도 따로 필요해요.

constructed/registered/initialized/begun/ended/pending-destroy/resource-freed를 분리하고 load·spawn·PIE·deferred·streaming 재진입을 C++/node 공통 phase 계약으로 다뤄야 해요. 사람의 Play 관측과 AI runtime.state는 저작 default를 덮어쓰지 않고, destroy 요청과 실제 적용/해제 완료를 구분하는 것이 후보예요. welding/attachment는 structural·physics side effect를 가진 작업이므로 node rule/default와 사람/AI의 성공·오류·Undo·dryRun을 같은 검증 경로에 연결해야 해요.

이는 **미래 HB 설계·검증 조건**이고 Unreal의 공식 AI 기능·HB 구현 완료 주장이 아니에요. 전체 공식 본문/API gate 통과 뒤 동일 lifecycle을 C++·node·사람 Play·AI 명령으로 재현하고 save/reload·streaming·dynamic component·실패 원자성·weld detach를 검사해야 해요.
