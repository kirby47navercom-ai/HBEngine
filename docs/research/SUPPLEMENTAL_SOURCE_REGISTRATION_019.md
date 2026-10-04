# 보조 플랫폼 연구 범위 등록과 전체 완료 오판 방지 019

2026-10-04, `research_only`예요. 이 기록은 기존 연구에서 발견한 보조 공식 출처를 검사 목록에 등록하고 보고·원장 도구의 누락을 고친 기록이에요. 새 기술 본문 읽기 0, 새 API 구역 읽기 0, 엄격한 읽기 상태 승격 0이며 전체 분석 완료가 아니에요. Unity·Unreal의 모든 분야와 세부 내용에 추가하는 범위이고 기존 엔진 범위를 줄이지 않아요.

## 확인한 문제와 반영

012–015의 모바일 에디터·ABI·수명주기·빌드/배포·저장 API 연구는 별도 기록에 있었지만, 전체 분석 조건을 검사하는 manifest에는 원래 Unity·Unreal 계열 13개만 등록돼 있었어요. 과거 자료를 읽었다는 기록과 현재 엄격한 원장의 전체 읽기 증거는 같지 않아요. 기존 13개를 검사했다고 보조 플랫폼까지 모두 확인한 것으로 판정할 수 없게 다섯 원천 계열을 추가했어요.

[manifest](CORPUS_MANIFEST.json)는 이제 18개 원천 계열을 검사하며 모든 `discoveryClosed=false`, 모든 전체 페이지 분모는 미확정이에요. Android SDK/NDK·Java/Kotlin/AndroidX/native API와 Apple/ABI의 실제 판본·후속 링크·원문·예제·media 분석은 계속 열린 범위예요. `unversioned-public-web-snapshot-2026-10-04`는 수집 기준일이며 Android API level·SDK release·Apple OS 판본을 뜻하지 않아요. Godot 보조 문서는 실제 4.5 URL만 해당 계열에 넣고 stable/latest는 임의로 바꿔 넣지 않았어요.

| 추가 원천 | seed 출현 | 후속 링크 출현 | 원장에 새로 등록한 URL identity |
| --- | ---: | ---: | ---: |
| Android 플랫폼 guide | 13 | 280 | 117 |
| Android 플랫폼 API | 4 | 215 | 67 |
| Godot 4.5 모바일 에디터 보조 | 2 | 32 | 10 |
| Apple 플랫폼 보조 | 1 | 3 | 4 |
| 공식 플랫폼 ABI 사양 | 0 | 14 | 7 |
| 합계 | 20 | 544 | 205 |

다섯 실제 `import` 명령 모두 exit 0이에요. 중복 provenance를 보존한 입력은 564개, 새 per-source URL identity는 205개예요. query/anchor·별칭/동일 문서 정규화가 끝나지 않아 전체 고유 문서 수라고 하지 않아요. 자동 후속 링크 추출·등록은 본문 의미 읽기가 아니에요. 기존 source 파일 20개의 정확한 bytes/hash를 검사한 것도 기술 본문 20개를 새로 읽거나 독립 verified로 승격한 일이 아니에요. 012–015의 실제 읽기 범위는 해당 당시 분석·독립 대조 문서에 유지해요.

분류 대기인 링크 출현 130개는 private `unclassified-outgoing.json`에 보존했어요. Godot stable/latest·별도 제품/도구·compiler·store·권한/정책·다른 등록 계열과 예전 HTTP 사양 등을 더 분류해야 해요. Intel HTTP 링크를 임의로 HTTPS로 만들어 가져온 것으로 기록하거나 기능 범위에서 삭제하지 않았어요. 연결된 ARM 문서는 본문이 직접 제공한 주소만 등록했어요. 남은 출처 등록·판본 및 전체 목록 확장·사용자 누적 요구 대응의 세 가지 `scopeExpansionPending`도 전체 gate를 차단해요.

Unity package의 017에서 알려진 목록도 manifest에 연결했어요. 기존 223 root/1,558 edition/59,261 index URL은 역사값으로 유지하고 새 합집합 227 root/135 package 이름/1,778 영어 edition/62,873 index URL을 발견 기록으로 구분해요. 이 값은 전체 API/overload·본문 분모나 읽기 수가 아니며 017의 새 네 root에서 발견한 3,612개 index URL을 별도 discovery bundle로 실제 원장에 등록했어요(exit 0, added/input 각각 3,612). 따라서 패키지의 현행 원장 발견 수는 62,873이며 API 3,344/Manual 252/support 16개의 새 URL도 모두 미독이에요. 다섯 보조 원천의 205개와 이 3,612개를 따로 기록하며 API/본문 읽기 승격은 둘 다 0이에요.

## 원장·보고 도구 변경과 실제 검사

`reference-ledger.mjs`의 상태 출력에 판정 UTC·정확한 manifest SHA-256·`registered_manifest_sources` 범위·미확정 분모·열린 목록·미등록 기능 범위 대기를 넣었어요. 전체 증거 gate가 통과하지 않으면 `percentage=null`이며 부분 읽기나 확보량으로 완료율을 만들지 않아요. gate 통과도 엔진 구현 완료 판정은 아니에요.

실제 공식 본문은 Godot→Android, Android→ARM처럼 서로 다른 등록 출처를 연결해요. 기존 target-host 전용 provenance 검사는 이런 관계를 거부했어요. 이제 발견 URL은 등록 목록에 있는 공식 host의 HTTPS 주소여야 하고 target의 공식 host/path/version 검사는 계속 유지해요. status에서도 발견 URL의 host가 등록 목록에 남아 있는지와 고정 원문 hash를 다시 검사해요. 해당 host를 승인하는 source가 모두 제거되면 stale로 표시돼요. 같은 host의 다른 source가 남아 있으면 특정 parent source 삭제만으로 stale이 되는 것은 아니에요. 발견 URL의 정확한 source/path와 본문에 해당 href가 실제 존재하는지는 이 host guard가 자동 입증하지 않으므로 별도 원문 대조가 필요해요. 019의 544개 후속 href는 별도 담당자가 실제 부모 원문의 anchor와 일치하는지 독립 구조 대조했으며, 이것도 본문 의미 전체 분석은 아니에요. 승인되지 않은 host나 다른 target을 조용히 받아들이지 않아요.

`node --test tools/check-reference-ledger.mjs`의 실제 10개 검사를 통과했어요. 기존 완료 fixture에 새 unknown 원천·미등록 범위 대기를 추가하면 gate가 다시 차단되는 경우, 교차 host의 미등록 parent 거부/등록 뒤 발견 허용/잘못된 target 거부/해당 parent host를 승인하는 유일 source 삭제 뒤 stale을 확인해요. API 후보 추출 Python 4검사는 이번에 재실행하지 않았어요. 이전 9+4=13 기록을 이번 실행 결과로 바꾸지 않아요. 엔진·GUI·SDK·기기 실행 검사는 하지 않았어요.

실제 gate snapshot은 `native/build/reference-corpus/gate-2026-10-04-019.json`에 고정해요. UTC `2026-10-04T07:20:56.435Z`, manifest SHA-256 `61b9bd1c2ec18e4c9228293af0f598adc614a0a1e6f4c69745aaa5e020b3e888` 기준으로 exit 2/ready=false, 전체 완료율 null이에요. source 18개·원장 168,940 per-source URL identity·body snapshot 34,877개이며 source/body 획득 수를 읽기 완료 수로 바꾸지 않아요. 엄격한 verified는 기존 지정 Unity Manual 본문 2개이고 이번 추가 승격은 0이에요. 017의 네 root index URL 등록 뒤 실제 현행 수이며, 227 root의 모든 후속 edition/TOC/xref·관련 API 분모를 폐쇄한 값은 아니에요. 패키지 등록 전 165,328개/UTC07:16:54.237Z snapshot도 private `gate-2026-10-04-019-pre-package-import.json`에 보존해요. 이는 이 시점의 증거 상태이며 후속 원장 변경 뒤에는 새로운 snapshot과 비교해야 해요.

AGENTS·README·인계·이전 조사 개요에도 부분 읽기/대조·역사적 구현 내역과 전체 분석 완료를 구분하는 보고 규칙을 넣었어요. 현행 전체 조건이 충족되기 전에는 “전체 분석이 끝났다”는 표현을 쓰지 않아요. 실제 읽은 범위·재읽기·미독·다음 대상으로 보고하며 분모를 모르면 완료율을 제시하지 않아요.

## 다음 실제 읽기와 미독

등록 자체로 끝내지 않아요. 017의 패키지 관리 하위 본문·호환 patch/의존성·DocFX Manual/API/xref와 018의 모든 분야 하위 본문·멤버/overload·node/pin·UI 조작·media를 각각 이어 읽어야 해요. 추가 플랫폼 guide/API 전체 owner와 Kotlin 대응, SDK/ABI/policy 판본, 실제 모바일 제작·PC/mobile 게임 출력 경로를 분석해야 해요. 입력/반환·오류·취소·순서·소유/수명·thread·호환·저장/복구 계약을 사람 UI·C++·노드·AI 공용 편집 명령과 연결해요. 미독 자료와 접근 실패는 완료 집계에 넣지 않고 전체 분석 대상과 대기열에 남겨요.

원문·전체 코드/표·media·생성 대기열/원장은 ignored `native/build`에만 있어요. [기계 기록](supplemental-source-registration-019.json)에 정확한 hash·등록 source·import 결과·gate를 연결하고, 별도 담당자의 [독립 등록 대조](SUPPLEMENTAL_SOURCE_REGISTRATION_VERIFICATION_019.md)는 이 제한된 등록·도구 계약을 확인해요. 본문/API 전체 의미 분석이나 엔진 제작/실행을 검증한 것으로 확대하지 않아요.
