# 전체 문서·API 연구 상태

2026-10-04 기준, 현재 단계는 **`research_only`**예요. 주인님의 지시에 따라 전체 본문/API 분석을 먼저 진행해요. 엔진 기능 변경과 foreground UI 조작은 하지 않았어요. 전체 구현 시작 조건은 충족하지 않았고, 수집량을 읽기·분석 완료로 계산하지 않아요.

## 현재 실제 기록

원장의 **165,123개 source별 URL identity**는 발견한 주소예요. 서로 다른 공식 host의 별칭·동일 본문을 대조하기 전이라 전체 고유 문서 분모가 아니에요. 별도 발견한 다른 Unity 판본 188,740개 주소도 캐시에 남겨 추가/변경/폐기 계약을 조사해야 해요. 현재 API/overload·모듈·package/plugin·media 전체 분모는 미확정이며 완료율은 계산하지 않아요.

| source | 발견 목록 주소 | 실제 body snapshot | 원장 의미 분석 이상 | 독립 verified |
| --- | ---: | ---: | ---: | ---: |
| Unity 6000.0 기존 Manual | 3,122 | 3,119 | 6 | 2 |
| Unity 6000.0 기존 Scripting API | 31,710 | 31,706 | 9 | 0 |
| Unity Packages | 59,261 | 0 | 0 | 0 |
| Unity 제품·서비스 포털 | 8,599 | 0 | 0 | 0 |
| Unity 서비스 REST/CLI 입구 | 26 | 0 | 0 | 0 |
| Unity 6000.0 새 Manual 포털 | 3,123 | 0 | 0 | 0 |
| Unity 6000.0 새 API 포털 | 31,427 | 0 | 0 | 0 |
| Unreal 5.8 매뉴얼 후보 | 418 | 25 | 0 | 0 |
| Unreal 5.8 C++ API 후보 | 14,549 | 17 | 0 | 0 |
| Unreal 5.8 Blueprint API 후보 | 1,210 | 8 | 0 | 0 |
| Unreal 5.8 Python API | 11,678 | 2 | 0 | 0 |
| Unreal Node Reference | 미확정 | 0 | 0 | 0 |
| Unreal WebAPI | 미확정 | 0 | 0 | 0 |

body snapshot 열은 `fetched/body_reviewed/analyzed/verified` 합계예요. 단지 ZIP/HTML이 존재하는 수와 달라요. 분석 이상 열에는 verified도 포함해요. package index의 검색용 텍스트는 해당 본문 가져오기로 계산하지 않아요. 서비스 포털·추가 개별 기술 본문의 실제 수집·부분 읽기는 아래 별도 연구 기록에 보존하며, version/구역/API/media inventory가 미완료면 원장의 전체 읽기 상태로 승격하지 않아요.

- [Unity 코퍼스 조사](UNITY_CORPUS_RESEARCH.md): ZIP 전체 CRC·HTML 34,834파일, Manual/API index, 223 package roots와 1,558 영어 editions, 기술 본문 20개 텍스트 계약. 대부분 미독이며 일부 그림과 하위 API/overload·호환 버전은 미확정이에요.
- [Unity 본문 분석 001](UNITY_ROOT_BODY_ANALYSIS_001.md), [기계 기록](unity-root-body-analysis-001.json): 실제 매뉴얼 6개/API 1개, 58구역·6표시 overload. 편집기 입구와 2D/3D 설정의 원본 전체 본문·표·현행 analysisHash·Markdown 증거를 별도 담당자가 다시 대조해 [Editor](verification-unity-editor-artifacts-002.json)와 [2D/3D](verification-unity-2d3d-artifacts-002.json) 2본문을 현재 원장에서 verified로 확인했어요. 연결 문서/API나 전체 corpus 검증을 상속하지 않아요.
- [Unity 본문 분석 002](UNITY_AUTHORING_PHYSICS_BODY_002.md), [기계 기록](unity-authoring-physics-body-002.json): 실제 API 8본문·32구역·8표시 선언·7표·8예제예요. import/refresh/native 에셋 생성·Undo·프리팹 override·3D/2D 수동 simulation과 Transform sync의 순서·실패·저장·C++/노드/사람·AI 계약을 분석했어요. 의미 분석 8개를 원장에 등록했고 [독립 본문 대조](UNITY_AUTHORING_PHYSICS_VERIFICATION_002.md)에서 전체 표·선언·예제와 분석의 일치를 확인했어요. 미확인 하위 계약 때문에 엄격한 독립 verified는 0이에요.
- [Unity 연결 분석 003](UNITY_DEPENDENCY_BODY_003.md), [기계 기록](unity-dependency-body-003.json): 추가 4본문·12구역·3표시 선언·enum 값 6행을 실제 읽고 [독립 대조](UNITY_DEPENDENCY_VERIFICATION_003.md)에서 표 2개·10행·20셀과 전체 예제까지 확인했어요. 2D Scene API 예제가 3D `PhysicsScene`을 사용하는 공식 불일치와 mode/옵션의 미기재 계약을 남겼고, 아직 원장 상태를 승격하지 않았어요.
- [Unity 포털 본문 대조 004](UNITY_PORTAL_ALIAS_BODY_004.md), [기계 기록](unity-portal-alias-body-004.json): 새 host의 실제 2본문·7overload/예제를 읽어 기존 본문과 대조했어요. 기존 32집계는 h1–h3 부분 수이며, [후속 판본 연구 005](UNITY_PORTAL_VERSION_RESEARCH_005.md)에서 전체 h1–h6 52개·추가 h4 20개·Returns 표 1개/4셀로 정정했어요. 32를 전체 coverage 분모로 사용하지 않아요. module/namespace·default 표시와 묶음 구조가 다르고 2D 예제 오류는 남아 있어요. 실제 본문 version 표시를 확인하지 못해 엄격한 원장 승격은 0이에요.
- [Unity 포털 판본 연구 005](UNITY_PORTAL_VERSION_RESEARCH_005.md), [기계 기록](unity-portal-version-research-005.json): 두 API의 실제 selector·publisher environment 값과 추가 Documentation versions 1본문·3heading, JS bootstrap 1개 전체를 읽었어요. 선택 환경 6000.0·웹 배포 ID·본문 게시판본을 분리하며 supported/archived 중복·두 host release 결합·선택 구현은 미해결이에요. img 0개와 별도로 inline SVG 85개는 DOM 분류만 했고 시각 미독이라 전체 media 확인으로 승격하지 않아요.
- [Unity 생명주기 분석 002](UNITY_LIFECYCLE_BODY_002.md), [기계 기록](unity-lifecycle-body-002.json): 실제 9본문·42의미 구역·11예제와 SVG 2개를 읽었어요. 활성화·생성·fixed/update·비활성화·파괴·에디터 재로드·PlayerLoop 순서를 구분했으며 빈 선언 8개를 formal API로 세지 않아요. 미확인 13문제군과 독립 검증 대기 때문에 원장 승격은 0이에요.
- [Unity 2D 물리 분석 006](UNITY_2D_PHYSICS_BODY_006.md), [기계 기록](unity-2d-physics-body-006.json): 실제 12본문·38heading·11표시 선언·6표(16행/32셀)·3전체 예제·enum 값5행을 읽었어요. body 종류/참여·이동 요청의 다음 step 적용·힘/충격·kinematic contact 통지/반응·sync·콜백 데이터 재사용·array/list 용량 계약을 구분했어요. [독립 대조](UNITY_2D_PHYSICS_VERIFICATION_006.md)에서 원문 전체와 분석의 일치를 확인했어요. 수명·호환·thread 등의 미해결 계약 때문에 원장 승격은 0이에요.
- [Unity 구조 변경·Undo 분석 007](UNITY_UNDO_BODY_007.md), [기계 기록](unity-undo-body-007.json): 실제 6본문·31heading·8표시 선언·7표(19행/38셀)·2전체 예제를 읽었어요. 부모/컴포넌트/파괴의 전용 Undo와 전체 상태 기록·즉시 dirty·group/collapse·color picker 및 다중 선택 흐름을 구분했어요. [독립 대조](UNITY_UNDO_VERIFICATION_007.md)에서 원문·표·전체 예제와 분석의 일치를 확인했어요. 관련 계약은 미해결이며 원장 승격은 0이에요.
- [Unity 새 포털 조사](UNITY_PORTAL_RESEARCH.md): 공식 sitemap 151shard 전부, 새 엔진 포털·제품·서비스·별도 REST/CLI 문서 입구, 실제 개요/API 텍스트 계약과 unresolved namespace/그림/버전 사항이에요.
- [Unreal 코퍼스 조사](UNREAL_CORPUS_RESEARCH.md): 공식 sitemap 424 Unreal shard 주소, SSR 후보, C++ Plugins/PluginIndex, Blueprint, Python 11,678 docnames/66,849 inventory symbols와 NodeReference/WebAPI/접근 제한을 구분했어요.
- [Unreal 본문 분석 001](UNREAL_BODY_ANALYSIS_001.md), [기계 기록](unreal-body-analysis-001.json): 실제 10본문·54구역·121표시 API/descriptor 항목이에요. 표시 행 수는 전체 API/overload 수가 아니에요. [독립 대조](BODY_VERIFICATION_001.md)에서 짧은 7본문의 24구역·9표시 항목을 직접 비교했지만 문서 오류·누락 때문에 전체 verified로 승격하지 않았어요.

- [Unreal 액터·컴포넌트 분석 002](UNREAL_ACTOR_BODY_002.md), [기계 기록](unreal-actor-body-002.json): 전체 9본문·42구역·10표시 선언을 분석하고 [독립 본문 대조](UNREAL_ACTOR_VERIFICATION_002.md)에서 해당 전체 9본문·84표 행·180셀과 의미를 확인했어요. Actor Lifecycle 텍스트의 그림 2개 미독, class 2개 부분 읽기, 실제 본문 없는 요청 4개를 구분했어요. owner/Outer/attachment·등록·시작·지연 파괴·컴포넌트 권한·thread 등의 미해결 조건이 있어 원장 승격/verified는 0이에요.

## API 전체 분석을 위한 구조 확인

`tools/reference-api-inventory.py`는 실제 Unity 6000.0 API HTML **31,707개**를 모두 순회해 **25,778개 선언 후보**를 추출했어요. generic 타입·기본값·중첩 markup을 보존하고 코드 예제/다른 언어/탐색 내용을 선언으로 세지 않아요. **9,767개는 선언 후보가 없는 본문**이며, 그중 `signature-CS` block 자체가 없는 것은 **91개**, block이 있으나 전부 빈 것은 **9,676개**예요. 이전의 ‘9,767개 block 없음’ 표시는 잘못된 구분이라 실제 HTML 전체를 다시 순회해 바로잡았어요. class/enum/멤버 표, 상속과 overload, actual owner/module, 입력·반환·수명·실패·thread 계약까지 별도로 확인해야 해요.

후보 원장은 `native/build/reference-corpus/unity-api-declarations.json`에 있으며 `reviewed/analyzed/verified=0`, `fullApiUnitDenominator=null`이에요. 구조 추출 자체를 API 분석 완료라고 표시하지 않아요. 후보 hash·원문 위치는 후속 실제 읽기에 연결할 근거예요.

## 구현을 재개하기 전에 남은 조건

모든 source의 `discoveryClosed=false`예요. 새/기존 포털 별칭과 내용 대조, 모든 package/plugin/서비스 edition 고정, C++·Blueprint·Python·NodeReference·WebAPI·SDK·REST·CLI 계열의 전체 목록 확장, 본문·표·예제·그림·동적 탭, 타입/멤버/overload/오류·기본값·수명과 미해결 링크를 확인해야 해요. 공식 문서의 불완전한 enum·충돌하는 파라미터 설명도 unresolved로 남겼어요. 제한된 플랫폼 자료를 임의로 완료나 범위 밖으로 바꾸지 않아요.

현재 `node tools/reference-ledger.mjs gate`는 **exit 2, ready=false**예요. 부분 분석, ZIP 확보, 전체 선언 후보 추출이나 HBEngine의 과거 테스트가 이 조건을 대신하지 않아요. 분석 뒤에는 전체 누적 요구의 C++/노드·사람 UI·AI 명령·데이터/실행 대응으로 엔진 작업을 이어가요.

## 재현과 도구 검증

기준본은 [CORPUS_MANIFEST.json](CORPUS_MANIFEST.json), 증거 규칙은 [ANALYSIS_PROTOCOL.md](ANALYSIS_PROTOCOL.md)예요. 원문·large index·ZIP·생성 ledger는 Git에서 제외한 `native/build`에 보존해요. 새 환경에서는 동일한 공식 배포본/목록을 다시 수집하고 snapshot hash를 대조해야 하며 캐시가 없으면 verified라고 주장하지 않아요.

```text
node tools/reference-ledger.mjs status
node tools/reference-ledger.mjs gate
node --test tools/check-reference-ledger.mjs
python -X utf8 tools/check-reference-api-inventory.py
python -X utf8 tools/reference-api-inventory.py
```

원장 검사는 **9개**, API 후보 추출 검사는 **4개**, 총 **13개** 통과했어요. 다른 버전/host·latest 별칭, source/body/analysis hash, 독립 검증, 구역/API/media coverage, source roots/locale 변경, 본문 변경, 빈 ID, 일부 실패한 대량 등록, 참조 Markdown·중첩 JSON 증거 변경, 추가 공식 발견 근거 보존과 빈 선언 슬롯/실제 block 부재를 검사했어요. [독립 감사와 수정 기록](RESEARCH_AUDIT_002.md)을 보존하며 수집 bundle 7개도 재대조했어요. **검사기는 증거 형식을 확인하며, 실제 의미·읽기 여부·목록 완전성은 별도 검증자가 원문과 대조해야 해요.** 엔진 런타임/GUI 검사는 이번 연구 단계에서 실행하지 않았어요.
