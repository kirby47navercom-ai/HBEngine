# 보조 출처 등록·진행 지표의 독립 대조 019

2026-10-04, 짚짱의 `/root/research_report_audit` 담당은 작성자 `root`와 별도로 [019 작성자 기록](SUPPLEMENTAL_SOURCE_REGISTRATION_019.md), [등록 JSON](supplemental-source-registration-019.json), manifest·원장 도구의 관련 조건·검사 fixture·실제 private import/ledger와 저장 gate를 대조했어요. 주인님의 전체 Unity·Unreal 및 PC/mobile 게임·에디터·사람/AI 제작 요구를 유지해요.

**판정은 지정된 등록·hash·URL/provenance·href 구조와 보고 계약의 일치예요.** 새 기술 본문 의미 읽기 0, 새 API 구역 의미 읽기 0, 엄격한 읽기/분석/verified 승격 0이에요. 전체 공식 목록·본문/API 의미 검증이나 엔진 구현/실행 완료를 입증하지 않아요.

## 고정한 작성자 기록과 방법

최종 작성자 MD SHA-256은 `f216d4ab8cd2f2cd7f6af2d087f781b05a7e0f7c2a7d894ac3914ac07fa02638`, JSON은 `a6131862766bd8f1cc6558ccb886e725c4311cb71a18d8863c72e2ed0d215497`이에요. 실제 bytes를 다시 계산해 확인했어요. manifest·도구·import/result·분류 대기·두 gate와 기존 source proof의 hash도 [검증 JSON](supplemental-source-registration-verification-019.json)에 고정해요.

로컬 Node/Python 읽기 전용 계산으로 다음을 직접 대조했어요. 원장 도구의 `import/status/gate`나 테스트는 이 검증 담당이 실행하지 않았어요.

1. 등록 JSON의 5 source 정의와 manifest의 해당 정의, HTTPS·대상 host/path·판본, 각 원문 provenance의 등록 host와 정확한 파일 hash를 비교했어요.
2. 5 bundle의 564개 entry마다 실제 ledger의 source별 canonical URL identity와 `discoveredFrom`의 file/hash/URL/parent를 대조했어요.
3. 기존 source 파일 20개를 hash 확인하고 HTML의 `a[href]` 구조만 파싱했어요. 상대 URL은 기록된 부모 URL에 결합하고 fragment를 제거해 544개 후속 링크 출현과 대조했어요. 본문 prose·표·예제·API 의미 전체를 읽은 검사가 아니에요.
4. 017 package discovery 3,612개도 실제 ledger identity/provenance와 상태 필드를 대조했어요. package 본문·선언/API 계약을 읽었다는 주장이 아니에요.
5. 저장 gate의 hash·manifest hash·UTC·수량과 작성자 기록을 비교했어요. 저장된 판정을 새 프로세스로 다시 실행한 결과라고 표시하지 않아요.

## 실제 등록 대조

| 원천 | 입력 entry | seed 출현 | 후속 href 출현 | 실제 source별 URL identity | 근거 누락 | 상태 승격 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Android guide | 293 | 13 | 280 | 117 | 0 | 0 |
| Android API | 219 | 4 | 215 | 67 | 0 | 0 |
| Godot 4.5 모바일 에디터 보조 | 34 | 2 | 32 | 10 | 0 | 0 |
| Apple 플랫폼 보조 | 4 | 1 | 3 | 4 | 0 | 0 |
| 플랫폼 ABI 사양 | 14 | 0 | 14 | 7 | 0 | 0 |
| 합계 | 564 | 20 | 544 | 205 | 0 | 0 |

5개 import hash와 기존 source 파일 20개 hash가 일치해요. 544개 후속 URL은 실제 부모 HTML anchor href에 모두 있었어요. 20개 seed entry는 자기 발견 URL과 일치하며 재읽기/고유 본문 20개로 합산하지 않아요. 205개 실제 ledger 페이지에는 `snapshot/review/analysis/verification` 필드가 없어요. 5개 import 결과의 exit 0과 added `117/67/10/4/7` 기록도 현재 ledger와 일치해요. 검증 담당이 해당 import 프로세스를 다시 실행한 것은 아니에요.

별도의 package discovery는 API index URL 3,344개·Manual 252개·support 16개, 합계 3,612개예요. 각각의 identity와 provenance가 ledger에 있고 본문/읽기/분석/검증 필드는 없어요. 이들은 선언·overload·본문 분석 수가 아니에요. 205개 보조 source 추가와 3,612개 package 추가는 서로 다른 등록 집계예요.

분류 대기 130회는 고정한 `unclassified-outgoing.json`에 그대로 있어요. 새로운 공식 출처·별칭·stable/latest·판본·compiler/SDK/ABI 및 정책 계약을 전체 분석 대상에서 없앤 기록은 아니에요. 모든 18 source의 발견 폐쇄는 false이고 페이지 분모는 미확정이며, 세 개 `scopeExpansionPending`도 남아 있어요.

## 도구 조건과 한계

`reference-ledger.mjs`의 관련 조건을 직접 읽어 target의 HTTPS/host/path/version 검사를 유지하면서 발견 provenance는 등록된 공식 host의 HTTPS URL로 허용함을 확인했어요. status에서도 provenance 파일 hash와 host 등록을 다시 검사해요. 해당 host를 승인하는 source가 모두 사라지면 stale이며 같은 host의 다른 source가 남으면 특정 parent source 삭제만으로 stale이 되지는 않아요. 정확한 origin source/path 또는 실제 href 존재는 이 host guard 자체가 입증하지 않아요. 이번 544회 href 구조 대조는 별도 확인이에요.

진행 지표는 `registered_manifest_sources` 범위와 판정 UTC·manifest SHA-256·미확정 분모·열린 source·남은 범위를 표시해요. `scopeExpansionPending`은 실제 실패 이유에 추가되고 gate 미통과 때 percentage는 null이에요. gate 통과가 엔진 제작 완료라는 의미는 없어요.

작성자는 원장 도구 10개 검사 통과를 기록했어요. 이 검증 담당은 새 교차 host fixture와 전체 gate에 unknown source/미등록 범위를 추가하는 fixture, 실제 guard 코드를 읽어 계약을 대조했지만 테스트를 재실행하지 않았어요. 작성자의 10개 실행 기록을 이 담당의 추가 테스트 통과로 바꾸지 않아요. 과거 원장 9개+API Python 4개 검사와 이번 실행도 구분해요.

## 저장 gate와 남은 일

최종 gate는 UTC `2026-10-04T07:20:56.435Z`, manifest SHA-256 `61b9bd1c2ec18e4c9228293af0f598adc614a0a1e6f4c69745aaa5e020b3e888`, gate SHA-256 `4c5b2ddc4324f7894e6935d2718f0c6673b5789f4a0ca28d852e41a106ae0469`의 snapshot이에요. 저장 내용은 18 source·168,940 source별 URL identity·package 62,873개·body snapshot 34,877개·기존 지정 본문 verified 2개·stale 0·ready=false·percentage=null이에요. exit 2는 작성자의 실제 실행 기록과 연결하며 검증 담당이 새로 실행한 종료값이 아니에요.

package import 전 UTC `07:16:54.237Z`·165,328 identity의 snapshot은 다른 private 파일에 보존돼요. 이전 snapshot을 현행 수치로 대체하지 않았어요. 이후 원장이나 기준본이 바뀌면 이 기록은 해당 고정 시점의 대조 이력이며 새 상태를 다시 확인해야 해요.

정확한 SDK/OS/API/package 판본, 전체 공식 목록과 별칭 대조, 미독 본문·API 타입/멤버/overload·표/예제/탭/media, 실제 사람/AI·C++/노드 대응은 계속 남아요. 접근 실패와 미독은 완료 집계에 넣지 않고 전체 분석 대상과 대기열에 유지해요. 이번 담당은 검증 MD/JSON 두 개만 작성했고 엔진·GUI·foreground·SDK·기기·실제 build/play·커밋은 실행하거나 변경하지 않았어요.
