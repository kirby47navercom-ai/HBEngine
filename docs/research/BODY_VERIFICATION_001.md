# Unreal 본문 분석 001: 제한된 독립 대조 기록

검토일: 2026-10-04. 검토자: `analysis_protocol` agent. 분석 작성 agent와 별도로 **로컬 캐시만** 읽고 [unreal-body-analysis-001.json](unreal-body-analysis-001.json)을 대조했어요. 네트워크 요청, GUI 실행, 엔진 수정, API 실행·컴파일은 하지 않았어요.

판정은 `limited_independent_comparison`, 전체 `verified` 판정은 **보류**, `gatePass=false`예요. 10페이지의 파일 증거를 검증하고, 그중 짧은 7페이지인 **UE001-03~UE001-09의 24개 구역·9개 표시 API/descriptor 항목**을 원문과 직접 대조했어요. 9개는 이 분석 JSON의 항목 수이며 API 멤버·overload 전체 분모가 아니에요. UK2Node/UInputAction의 큰 본문과 PS5 안내는 이번 의미 대조 범위에 포함하지 않았어요.

검토한 분석 JSON 파일의 SHA-256은 `1084159c2c579620d1b283bbcb55711aafc8f167b94c93b64b4def5e64b788d7`이에요. 해당 파일이나 원문이 바뀌면 이 기록을 그대로 새 버전의 검증 증거로 사용하면 안 돼요. 분석 JSON·cache·통합 ledger의 상태는 수정하거나 승격하지 않았어요.

## 검증 조건과 재현 결과

- 각 `sourcePath`와 `bodyPath`를 실제 읽어 SHA-256을 다시 계산했어요. 10페이지 모두 `sourceHash`와 `bodyFileHash`에 정확히 일치해요.
- SSR 8페이지는 원본 HTML의 `serverApp-state` JSON에서 같은 문서 ID를 찾아 `blocks`를 재귀 key 정렬해 대조했어요. 별도 body JSON의 `blocks`와 모두 같고, 정렬·공백 없는 UTF-8 JSON의 SHA-256도 기록된 `bodyHash`와 같아요. 추출 파일의 hash만 확인한 결과가 아니에요.
- Python 2페이지는 표준 `HTMLParser`로 `div.body[role=main]` 내부 data만 모아 공백을 정규화했어요. 두 `bodyHash` 모두 재현됐어요. Python에서는 원본 HTML과 body 파일이 같은 파일이며, 이것을 별도 추출 본문 파일이 있는 것으로 해석하지 않았어요.
- UE001-03~07의 모든 heading/offset, table header/data row와 cell 수, 표시 코드 선언을 원문에서 다시 확인했어요. 기록된 coverage와 일치해요. 해당 본문 `blocks`는 페이지마다 비숨김 markdown 1개이고 `content_html` 안에는 이미지가 없어요.
- UE001-08~09의 본문 DOM, 문단/definition anchor와 표시된 signature·설명을 직접 읽었어요. 소개 페이지의 로고 `alt/src/link`는 확인했고 로고 픽셀은 보지 않았어요. 링크 대상은 열지 않았어요.
- SSR UE001-01~07은 원문 metadata가 version `5.8`, locale `en-us`를 표시해요. UE001-10의 applications에는 `5.5/5.6/5.7/5.8`이 함께 있어요. Python 2페이지의 `<title>`은 `Unreal Python 5.8 (Experimental)`, HTML 언어는 `en`이에요. requested locale `en-us`와 실제 언어 `en`을 구분해요.

| 페이지 ID | 원문 SHA-256 | body 파일 SHA-256 | 의미 hash/원문 추출 대조 | 이번 직접 의미 대조 범위 |
| --- | --- | --- | --- | --- |
| UE001-01 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 없음: hash·추출·version metadata만 확인했어요. |
| UE001-02 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 없음: hash·추출·version metadata만 확인했어요. |
| UE001-03 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 4구역, 7표행/14셀, 선언 1개, 표시 override 목록 61개 |
| UE001-04 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 3구역, 10표행/20셀, 표시 enum 선언·값 표 |
| UE001-05 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 4구역, 3표행/6셀, 모듈 3개·의존 1개·피의존 13개 목록 |
| UE001-06 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 3구역, 5표행/15셀, 표시 Blueprint 입출력 전체 |
| UE001-07 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 3구역, 8표행/24셀, 표시 Blueprint 입출력 전체 |
| UE001-08 | 일치 | 일치 | HTMLParser bodyHash 일치 | 목적·guide 안내·상표 설명 3구역, 로고 속성 |
| UE001-09 | 일치 | 일치 | HTMLParser bodyHash 일치 | class/3 method의 4구역과 모든 표시 정의 |
| UE001-10 | 일치 | 일치 | SSR blocks 및 bodyHash 일치 | 없음: hash·추출·version metadata만 확인했어요. |

표행 수는 header 행을 포함해요. 링크 이름·개수를 확인한 것은 링크 대상 본문을 읽거나 전체 API 분모를 확정한 것과 달라요.

## 페이지 ID별 원문 사실·signature 대조 결과

### UE001-03 — UK2Node::GetMenuActions

`/blocks/0/content_html`의 Navigation·Description·Derived Overrides·Parameters와 두 표를 모두 대조했어요. Editor/BlueprintGraph/UK2Node 관계, `K2Node.h` 경로와 include, 기존 GetMenuEntries를 대체하는 spawner 등록 확장점이라는 section 사실이 원문과 맞아요. 표시 override 링크는 61개예요.

표시 선언은 `virtual void GetMenuActions(FBlueprintActionDatabaseRegistrar& ActionRegistrar) const`예요. JSON의 반환 `void`, reference 인수, `virtual`, `constMember` 기록과 일치해요. 기본 인수는 표시되지 않아요.

**공식 원문 불일치를 재확인했어요.** `pre/code[0]`은 `ActionRegistrar`를 쓰지만 `table[1]/tr[1]/td[0]`는 `ActionListOut`을 표시해요. `UE001-GETMENU-PARAM`은 해결되지 않았어요. registrar 원본·5.8 구현·61개 override 본문·필터·중복/등록 순서·수명은 미확인이에요. 문서 표와 signature를 임의로 일치시킬 수 없어서 전체 API 계약 검증은 보류해요.

### UE001-04 — EInputActionValueType

Navigation·Syntax·Values, 두 표의 모든 행/셀과 enum 선언을 대조했어요. EnhancedInput 모듈, `InputActionValue.h`, 네 display label과 첫 값 설명의 크기 순서/type promotion 언급이 JSON의 section 사실과 맞아요.

**공식 원문 출력 결함을 재확인했어요.** 표시 선언의 네 이름과 `table[1]`의 네 데이터 행 이름 모두 `UMETA`예요. 실제 enumerator 명칭·numeric value·default·승격 알고리즘은 이 페이지에서 검증할 수 없어요. `UE001-ENUM-UMETA`를 그대로 유지해요. Digital/Axis1D/Axis2D/Axis3D의 display label을 실제 enum identifier 또는 숫자 값으로 승격하지 않았어요.

### UE001-05 — Enhanced Input plugin descriptor

Navigation·Modules·Plugin Dependencies·Plugin Dependents의 표시 본문과 descriptor 표를 모두 대조했어요. `.uplugin` 경로, Input category, 문맥별/동적 mapping 설명, EnhancedInput/InputBlueprintNodes/InputEditor 세 모듈, Data Validation 의존, 13개 피의존 링크가 section 사실과 일치해요.

이 페이지는 descriptor 요약이며 함수 signature를 제공하지 않아요. JSON의 표시 API 항목 1개는 descriptor 항목이지 함수/overload 1개가 아니에요. `UE001-PLUGIN-GRAPH`의 실제 `.uplugin` 내용, 모듈/피의존 본문, optional·enabledByDefault·load phase·platform/target·의존 버전은 여전히 미확인이에요.

### UE001-06 — Destroy Actor

Navigation·Inputs·Outputs와 모든 표 셀을 대조했어요. Actor target, `exec In`·`object Target` 입력, `exec Out` 출력이 JSON과 맞아요. 표시된 다른 성공 bool/error 출력은 없어요.

Target default/self/null 허용, 실제 C++ signature/return, 파괴 성공 여부·지연/수명·반복 호출·authority/replication·component/timer/event 정리는 원문에 설명되지 않아요. `UE001-DESTROY-LIFETIME`을 유지해요. 표시 Out을 성공적 파괴나 즉시 정리 완료의 증거로 판정하지 않았어요.

### UE001-07 — Add Mapping Context

Navigation·Inputs·Outputs와 모든 표 셀을 대조했어요. Enhanced Input Subsystem Interface target에 control mapping context를 추가한다는 설명, player에 적용할 key→action 집합, 높은 Priority를 먼저 적용하고 consume하면 낮은 mapping을 차단한다는 사실이 JSON과 맞아요.

표시 입력은 `exec In`, `interface Target`, `object Mapping Context`, `integer Priority`, `struct Options`, 출력은 `exec Out`이에요. default와 Options 실제 타입/필드·동일 priority 순서·중복 context·rebuild/완료 시점·player 수명·C++ 선언은 제공하지 않아요. `UE001-MAPPING-LIFETIME`을 유지해요.

### UE001-08 — Unreal Python API Introduction

`div.body[role=main]`의 목적 문단, 별도 guide 안내, 상표 sidebar와 로고 속성을 직접 대조했어요. PythonScript Plugin/Python API가 Unreal Editor scripting/automation에 쓰인다는 section 사실이 원문과 맞아요. 로고와 상표 문단도 기록에 포함되어 있어요.

이 본문에는 API signature나 runtime Python 지원 계약이 없어요. guide는 구 `docs.unrealengine.com` URL을 가리키며 그 최종 페이지·version은 확인하지 않았어요. 로고 픽셀·guide 본문과 `retrievedAt=null` 문제는 유지해요. cache 수정 시각을 실제 HTTP 확보 시각으로 바꾸지 않았어요.

### UE001-09 — unreal.ScopedEditorTransaction

본문의 class와 `__enter__`·`__exit__`·`cancel` definition anchor를 모두 대조했어요. 표시되는 선언/설명은 JSON과 일치해요.

- class의 인수는 `desc: Text | str`, base는 `object`예요. constructor 기본 인수와 명시적 반환 annotation은 없어요. JSON의 `returnType: instance`는 Python class 생성 결과 분류이며 원문에 표시된 반환 annotation으로 취급하지 않아요.
- `__enter__(self)`는 `ScopedEditorTransaction`을 반환하며 transaction을 시작한다고 표시해요.
- `__exit__(self, type: Type[BaseException] | None, value: BaseException | None, traceback: TracebackType | None)`는 `bool`을 반환하며 transaction을 끝낸다고 표시해요. `None` union은 기본값 표시가 아니에요.
- `cancel(self)`는 `None`을 반환하며 transaction을 취소한다고 표시해요.

exit bool의 예외 억제 의미, cancel rollback 범위, nested/부분 실패·Undo stack·dirty state는 설명되지 않아요. type hyperlink들이 Python 2.7 문서를 가리키는 원문도 확인했어요. 이를 실제 Unreal 5.8 interpreter version으로 해석하지 않았어요. `UE001-TXN-SEMANTICS`, `UE001-TXN-PY2LINKS`, `retrievedAt=null` 문제를 유지해요.

## 누락·오류와 완료 판정

대조한 7페이지의 **표시 본문 사실·선언·입출력 전사에서는 새 불일치를 발견하지 않았어요.** 원문 자체의 GetMenuActions 파라미터 충돌과 enum `UMETA` 결함, Python 구버전 type 링크는 실제 확인했고 기존 미해결 기록이 타당해요. 이 기록은 원문 결함을 해결했다는 판정이 아니에요.

UE001-01~02의 의미·표시 멤버/모든 overload는 이번에 독립 검증하지 않았어요. UE001-10의 PS5 안내 문단과 제한 platform corpus도 의미 검증하지 않았어요. 관련 멤버·derived override·모듈·plugin descriptor 원본·Options·trigger/modifier·underlying C++ 구현·guide·예외/수명 후속 문서, HB 코드 대응의 실제 동작은 모두 이 기록의 검증 범위 밖이에요. 분석 JSON의 `mapping.projectEvidence` 줄과 실행 의미도 이번에 재검증하지 않았어요.

따라서 **본문 표시 내용의 제한된 독립 대조만 완료했고, 7페이지 모두를 전체 계약 `verified`로 승격하지 않아요.** 모든 미해결 API·본문·media/외부 문서 문제와 전체 분모/발견 폐쇄를 해결하기 전에는 전체 batch 또는 전체 corpus의 구현 gate를 통과시키면 안 돼요. ledger 검사기의 형식/hash/coverage 통과는 실제 읽기와 의미 분석의 검증을 대신하지 않아요.

**2026-10-04 줄바꿈 정규화 재검증:** 현재 `unreal-body-analysis-001.json`의 실제 LF 파일 bytes SHA-256은 `ca3d1af9b07e06f24d4dc605028b9f1c57c28b5b0b14ea1cd35f76ad7e72a724`이에요. 현재 파일의 LF를 CRLF로 재구성한 bytes의 SHA-256이 위 최초 검토 hash `1084159c2c579620d1b283bbcb55711aafc8f167b94c93b64b4def5e64b788d7`와 정확히 같아서, 줄바꿈 외 분석 JSON 내용이 동일함을 재현했어요. 10페이지의 원문 `sourceHash`와 `bodyFileHash`도 로컬 파일을 다시 계산해 전부 일치했어요. 따라서 최초 직접 대조한 UE001-03~09의 7페이지·24구역·9표시 항목에 대한 **제한된 의미 대조 결과를 현재 LF hash에 명시적으로 다시 연결**해요. 최초 hash는 이력으로 보존해요. 새로 읽은 페이지나 해결된 API/문서 불일치는 없으며, 본문 밖 미확인 계약과 전체 `verified` 보류·`gatePass=false` 판정을 그대로 유지해요.
