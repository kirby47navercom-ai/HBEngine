# Unreal Actor·Component 002: 주 담당자의 제한된 독립 대조

2026-10-04, 검증 담당 `root`예요. 분석 담당 `unreal_actor_body`와 별도로 로컬 캐시에서 **짧은 API 8본문과 Components 가이드 1본문**을 전체 읽고, [분석](UNREAL_ACTOR_BODY_002.md)과 [기계 기록](unreal-actor-body-002.json)의 해당 사실·선언·구역·미해결 항목을 대조했어요. 추가 네트워크·GUI·API 실행이나 엔진 변경은 하지 않았어요.

대조한 최종 JSON SHA-256은 `e1a783c53804d88fe7abb1b2b1e576310630def268e23bdc898d172a16cce6b6`, 분석 MD는 `a4b2911289c4b0cde26df5194f3b446d951999dac84be411e87026bfdd715b04`예요. 판정은 **`limited_independent_comparison`**, 전체 verified 승격 0개예요. 이 파일·참조 분석·원문이 바뀌면 이전 대조를 그대로 적용하지 않아요.

## 실제 원문 재계산과 읽기 범위

`native/build/reference-corpus/unreal-actor-batch`의 분석 대상 10개와 class 부분 근거 2개의 실제 HTTP HTML·SSR JSON을 읽어 **12 sourceHash/bodyFileHash/bodyHash 쌍**을 재계산했어요. raw HTML의 `serverApp-state`에서 동일 문서 ID를 찾아 `blocks` 전체를 재추출했으며 별도 body JSON과 같았어요. JSON key 정렬·공백 없는 UTF-8의 의미 hash도 모두 일치했어요. 최종 MD artifact pin도 일치해요.

의미를 직접 대조한 것은 **UEACT002-01~06, 08~10**이에요. 8 API의 모든 표시 heading·표 셀·snippet·remarks와 guide의 introduction/13 heading·등록/해제 표·두 코드 예제를 읽었어요. source DOM에서 heading **41개 + introduction 1구역**, 표시 선언 **10개**, 표 **84행·180셀(헤더 포함)**을 다시 확인했어요. 반환·인수/qualifier·metadata·default가 선언/설명 어느 쪽 근거인지도 구분해요.

Actor Lifecycle의 31 block·그림 2개와 AActor/UActorComponent의 class 전체/선택 행은 이번 **의미 대조 범위에 포함하지 않았어요.** 해당 3개 source/body의 hash·추출·version metadata를 대조한 것은 그 내용 전체를 읽거나 오류를 해결했다는 뜻이 아니에요.

## 사실·API·HB 판단 대조

| 직접 대조 대상 | 원문과 맞는 해석 | 계속 남은 조건 |
| --- | --- | --- |
| Actor Destroy | true는 파괴 표시된 경우도 포함하며 latent tick 끝 처리예요. 두 bool의 default는 설명 표 근거이고 snippet에는 default 식이 없어요. | force의 세부 효과·thread·Modify transaction·메모리 해제 시점 전체는 미확인이에요. |
| Actor AttachToComponent/K2 wrapper | root 부착·등록 조건·성공 bool, const rules/native와 개별 위치·회전·크기 rule/node 노출, weld detach 후 지속 효과를 구분했어요. | optional socket 설명을 C++ default로 바꾸지 않았고 null/socket/rule/default의 누락을 남겼어요. |
| Actor GetOwner 두 overload | replication용 owner와 templated cast 실패 nullptr, const와 첫 overload의 BlueprintCallable을 보존했어요. | raw pointer의 retention/ownership transfer·수명/thread는 보장하지 않아요. |
| Component BeginPlay/RegisterComponent | 등록·초기화·이미 begun Actor의 동적 생성과 지연 조건, render/physics state 및 outer Actor 배열 추가를 구분했어요. | derived override 이름을 해당 본문 읽기로 계산하지 않았어요. 내부 호출 순서·실패 계약은 미확인이에요. |
| Component GetOwner 두 overload | Outer chain 기반 owner, template cast 실패, const·Blueprint metadata를 Actor owner/transform parent와 분리했어요. | 실제 부착/소유/삭제 전파·retention/thread 계약은 남아 있어요. |
| Component K2_DestroyComponent | unregister·pending kill과 owning Actor 호출 제한, hidden Object/default-self pin의 의미를 구분했어요. | class flag 예외는 이번 미독 부분과 연결된 unresolved이며 permission을 임의 완화하지 않아요. |
| Components 전체 가이드 | transform 없는 behavior/Scene/Primitive 구분, 등록/해제·tick 허용/enable·render dirty/physics state·editor-only visualization·attachment cycle/root·Scene Proxy 병렬 데이터를 대조했어요. | 두 예제의 생략부와 linked native API가 구현 전체를 입증하지 않아요. arbitrary worker-thread 호출 허용으로 확대하지 않았어요. |

미래 HB의 C++·typed node·사람 component tree·AI stable-id/검증 명령을 동일한 owner/parent/phase 계약으로 정하자는 문장은 **HB 설계 제안**으로 분리돼 있어요. 현재 HB의 전체 실행·직렬화·Undo·thread·네트워크가 Unreal과 같다는 주장이나 이번 엔진 검사는 없어요.

이 대조에서 읽은 범위의 해석 오류는 찾지 않았어요. 전체 API·override/type/module·본문 그림·unresolved가 남아 있어 해당 분석 기록을 전체 verified 또는 corpus 완료로 올리지 않아요. 원장 상태도 바꾸지 않았어요.
