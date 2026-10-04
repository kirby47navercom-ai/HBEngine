# 연구 증거 연결 독립 감사 002

확인일: 2026-10-04. 확인자: `analysis_protocol`. 로컬 원문·연구 기록·도구만 읽고, 재현용 메모리 파일시스템과 도구의 격리된 임시 검사 fixture를 사용했어요. 도구·manifest·status·handoff·엔진은 수정하지 않았어요. 네트워크와 GUI를 사용하지 않았어요.

## 기존 검증 기록의 현재 연결

- [Unreal 분석 JSON](unreal-body-analysis-001.json)의 현재 실제 LF 파일 SHA-256은 `ca3d1af9b07e06f24d4dc605028b9f1c57c28b5b0b14ea1cd35f76ad7e72a724`예요. [최초 검증 기록](BODY_VERIFICATION_001.md)의 `1084159c...` hash와 실제 파일 bytes는 달랐지만, LF→CRLF로 재구성한 SHA-256이 최초 hash와 정확히 같았어요. JSON 내용이 줄바꿈 외에는 같다는 근거를 확인했고, 승인받은 명시적 재검증 문단을 최초 기록 끝에 추가했어요. 기존 hash와 제한된 범위는 보존했어요.
- Unreal 10페이지의 로컬 `sourceHash/bodyFileHash`를 다시 계산해 모두 일치했어요. 이 결과로 추가 페이지를 읽었다고 기록하거나 원문 결함을 해결한 것으로 처리하지 않았어요. 독립 의미 대조 범위는 계속 UE001-03~09의 7페이지이며 전체 `verified` 판정은 보류예요.
- [Unity 편집기 검증](verification-unity-editor.json)과 [2D/3D 검증](verification-unity-2d3d.json)을 현재 private ledger와 대조했어요. 원문·추출 본문 hash, private review/analysis 파일 bytes hash, ledger proof hash, 검증 JSON의 analysisHash, sections/API/media 목록이 모두 일치해요. 원문 분석 actor는 `root`, 독립 검증 actor는 `analysis_protocol`로 달라요. 두 페이지의 제한된 본문 대조 결과를 유지하며 하위 문서의 읽기 상태를 승격하지 않았어요.

| Unity 페이지 | private 분석 파일 SHA-256 | 확인 결과 |
| --- | --- | --- |
| unity-editor.html | `4688542b84a6c9e3dd4d0a2fed3f9a0a14cab33e8a9912aa7a3dfeaca9cb2cba` | source/body/review/analysis/verification proof·coverage 모두 일치 |
| 2DAnd3DModeSettings.html | `4ade37f6f13f570c3630e6fd3dfbe9d535398c5e691c0a3dbec5de7b6f418aa9` | source/body/review/analysis/verification proof·coverage 모두 일치 |

## 도구 검사와 실제 gate

`node --test tools/check-reference-ledger.mjs`의 7개 검사와 `python tools/check-reference-api-inventory.py`의 3개 검사, 총 10개가 통과했어요. 4개 연구 도구/검사 파일을 읽어 확인했어요. API parser 검사는 generic/default/nested markup 보존, 예제/다른 언어 탭 제외, nested div 경계를 확인해요. ledger 검사는 미독 수집의 승격 차단, 빈 ID/부분 coverage/overload 누락, 독립 검증, 원문·분석 hash 변경, 기준본 변경, 공식 발견 근거, 패키지 URL 고정과 bulk capture의 실패 보존을 확인해요.

검사 시 실제 manifest phase는 `research_only`, 13개 source의 `discoveryClosed`는 모두 false, `expectedPages`는 모두 null이고 구현 gate는 `ready=false`였어요. ledger의 analyzed는 Unity Manual 4개와 Scripting API 1개, verified는 이전 독립 대조한 Manual 2개였어요. Unreal ledger에는 analyzed/verified가 0개예요. 별도 의미 분석 JSON이 존재한다는 이유로 이 수를 늘리지 않았어요. API·패키지·서비스·Python/Blueprint/Node/Web API의 전체 분모·원문/API 계약 미확보는 계속 남아 있어요.

parser의 `extracted_unreviewed`, `analysisStatus=unread`, `fullApiUnitDenominator=null`, reviewed/analyzed/verified=0은 선언 후보 수집과 의미 분석을 올바르게 구별해요. 자동 추출된 선언 수를 전체 API 분모나 읽기 진척으로 사용할 수 없어요.

## 재현한 증거 연결 문제

다음은 검사 시점의 [reference-ledger.mjs](../../tools/reference-ledger.mjs)에서 재현한 문제예요. 주 담당자가 수정할 항목으로 전달했고 이 감사에서는 도구를 고치지 않았어요.

1. **참조한 의미 분석 artifact의 변경을 추적하지 못해요.** `reviewValid/analysisValid/reportProof`는 읽기·분석 JSON 자체의 hash를 확인하지만 `readEvidence`와 section `evidence`에 참조한 `docs/research/UNITY_ROOT_BODY_ANALYSIS_001.md`의 hash를 확인하지 않아요. 2D/3D 표의 정확한 값과 HB 적용 판단이 해당 Markdown에 담겨 있어요. 메모리 파일시스템에서 그 문서의 카메라 위치 `(0, 0, -10)`을 `(9000, 9000, 9000)`으로 바꿔도 해당 page의 `status()`가 verified였고, 검사기가 그 Markdown을 읽은 횟수는 0이었어요. 실제 파일은 바꾸지 않았어요.
2. **추가 공식 발견 근거를 잘못 중복 처리해요.** import의 `discoveredFrom.some()`이 실제 `entryProof.sha256` 대신 bundle `proof.sha256`을 비교해요. 먼저 bundle 근거 A로 등록한 page를 같은 bundle과 별도 `entry.discovery` 근거 B로 다시 import하면 두 번 모두 exit 0이지만 provenance에는 A만 남고 B가 버려져요. 메모리 파일시스템 재현에서 기대 2개/실제 1개였어요. 실제 entry 근거와 URL/부모를 기준으로 중복을 판단해야 해요.

첫 문제의 최소 보완은 완결된 JSON 분석에는 추가 요구를 하지 않고, 외부 의미 근거를 사용하는 report에 선택적 `evidenceArtifacts: [{file, sha256}]`를 기록하는 방식이에요. `boundReport`에서 이 명시된 파일·hash와 JSON artifact의 명시적 증거 체인을 재검증하면 등록과 status가 같은 검사를 사용해요. `docs/research/*.md`를 의미 근거로 직접 참조한 경우에는 대응 pinned artifact가 필요해요. 일반 코드 경로 언급이나 Markdown 링크 전체를 자동으로 읽었다고 판정하면 안 돼요. 순환 증거는 거부하고, 변경된 근거로 이전 검증을 그대로 유지하지 않아요.

## 판정의 한계와 전체 범위

현재 검사 통과는 형식·파일 hash·기록된 coverage의 일관성을 입증해요. 읽기 진술이 실제 수행됐는지, 표/overload/media 목록이 완전한지, 분석이 source 의미와 맞는지는 실제 원문 대조가 필요해요. 이 감사는 기존의 제한된 의미 대조를 유지하며, hash 일치만으로 새 페이지를 승격하지 않았어요.

전체 Unity·Unreal의 매뉴얼·API·패키지/플러그인·도구/서비스와 모든 누적 기능 요구를 계속 조사해야 해요. 현재 등록 루트·수집 페이지·검사 성공 수는 기능 범위를 닫거나 엔진 구현을 시작하는 근거가 아니에요. 주 담당자의 수정과 새 분석 묶음에 대한 독립 검증은 별도로 진행해야 해요.

## 감사 이후 주 담당자의 수정 기록

2026-10-04, `root`가 위 두 문제를 수정했어요. `boundReport`에서 참조 artifact의 hash와 명시적 JSON 증거 체인을 검사하고, import 중복은 실제 entry proof·발견 URL·부모 URL로 판단해요. 직접/중첩 artifact만 변경한 재현과 새 발견 근거 보존을 추가해 원장 9개·API 추출기 3개 검사, 총 12개가 통과했어요. 공식 per-entry 근거를 쓰는 기존 수집 bundle 7개를 다시 대조 등록했으며 추가 URL identity는 0개였어요.

이 절은 원래 감사 시점 이후의 주 담당자 수정·검사 기록이며, 최초 감사자의 추가 의미 검증을 뜻하지 않아요. 위 표의 기존 Unity analysisHash는 수정 전 이력으로 남겨요. 기존 7개 root 분석에는 참조 Markdown hash를 고정해 분석 파일 hash가 바뀌었고, 두 본문의 새 독립 재검증 없이 이전 verification을 그대로 승계하지 않아요. 전체 gate는 계속 닫혀 있어요.

추가로 `root`가 실제 빈 signature 슬롯과 block 부재를 구별하는 API 검사 1개를 더해 현재 총 13개가 통과했어요. 전체 31,707 HTML을 다시 순회한 결과 선언 후보 없는 본문은 9,767개, block 자체 부재 91개/빈 block만 있는 본문 9,676개예요. 기존 추출 후보 25,778개는 같고 의미 읽기 상태는 올리지 않았어요.

2026-10-04 후속으로 별도 담당 `unity_lifecycle_body`가 Unity Editor와 2D/3D의 원본 전체 본문·모든 표·현행 private analysisHash·고정한 MD artifact를 실제 다시 읽고 대조했어요. [Editor 재검증](verification-unity-editor-artifacts-002.json)과 [2D/3D 재검증](verification-unity-2d3d-artifacts-002.json)을 원장에 등록해 현재 bounded 두 페이지의 verified를 복원했어요. 위 수정 전 hash와 당시 수량은 이력으로 보존해요. 이 결과는 연결 API/다른 본문/전체 corpus 완료나 엔진 검증을 의미하지 않아요.
