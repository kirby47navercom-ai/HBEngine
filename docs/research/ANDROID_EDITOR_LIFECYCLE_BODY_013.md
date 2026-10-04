# Android 모바일 에디터 수명주기·복구 본문 분석 013

2026-10-04, `research_only`. 모바일 에디터의 미저장 프로젝트, import, C++ worker, 로컬 Play, 사람/AI revision·job 복구를 조사했어요. [누적 요구](EXPORT_EDITOR_REQUIREMENTS.md)의 `HB-EDITOR-MOBILE`, `HB-EXPORT-MOBILE`, `HB-BUILD-COMMON`, `HB-AI-PLATFORM`을 유지해요. [012](MOBILE_EDITOR_BODY_012.md)의 파일·ABI 조사를 이어가며 Android 자료를 Unity·Unreal 전체 분석 완료로 계산하지 않아요.

## 실제 읽기와 기준본

아래 다섯 공식 article의 기술 본문을 처음부터 끝까지 직접 읽었어요. 원본 HTML·추출 본문·읽기용 변환·예제·원문 표·그림은 Git에서 제외된 `native/build/reference-corpus/android-editor-lifecycle-batch-013`에만 있어요. [기계 기록](android-editor-lifecycle-body-013.json)에 각각의 URL·확보 시각·hash·구역·읽기 범위를 고정했어요.

| 공식 본문 | 실제 판본 근거 | 직접 확인한 범위 |
| --- | --- | --- |
| [Activity lifecycle](https://developer.android.com/guide/components/activities/activity-lifecycle) | publisher 2026-09-22 UTC | 기술/resource heading 21개, 예제 8개, 표 1개/5행/15셀, PNG 1개 |
| [Save UI states](https://developer.android.com/topic/libraries/architecture/saving-states) | publisher 2026-04-22 UTC | 기술/resource heading 13개, 예제 2개, 표 1개/7행/28셀 |
| [Processes and app lifecycle](https://developer.android.com/guide/components/activities/process-lifecycle) | publisher 2025-02-10 UTC | heading 없는 article 전체·importance 계층과 마지막 dependency 문단까지 |
| [Saved State module for ViewModel](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate) | publisher 2026-09-22 UTC | 본문 title/resource 포함 heading 13개, 예제 9개, 타입 표 1개/18행/36셀 |
| [Long-running workers](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running) | publisher 2026-10-01 UTC | heading 8개, Kotlin·Java·manifest 예제 5개 모두 |

HTTP 200·영어 canonical article을 확보했고 redirect는 없었어요. 총 **5본문·55기술/resource heading·24전체 예제·3표/30행/79셀·그림 1개**를 읽었어요. HTML에 있는 publisher 추천 heading 2개는 별도 2개로 기록하며 기술 heading에 합치지 않아요. 추천 링크의 제목도 확인했지만 연결 본문을 읽은 것으로 세지 않아요. 원본 article 내부 iframe/video/inline SVG는 없었어요. Kotlin·Java가 함께 있는 장기 worker의 모든 탭을 source DOM에서 읽었고 다른 네 본문의 실제 예제도 모두 읽었어요. GUI에서 탭을 조작한 검사는 아니에요.

이 자료는 버전 고정 Android SDK/API reference가 아닌 계속 갱신되는 guide예요. publisher 날짜와 조회 hash를 기준으로 고정하며, 본문에 나타난 Android 13/14/16·API 21/29/30/34·Lifecycle 2.9.0 등의 조건을 해당 문장에만 적용해요. **전체 텍스트/그림 확인 5, text-only 0, 부분 본문 0, 미독 본문 그림 0**이에요. 연결 API의 전체 unit/overload 분모는 `unknown`, formal API 전체 읽기·독립 `verified`·원장 승격은 모두 **0**이에요. 확보나 추출만으로 읽기·분석 상태를 올리지 않았어요.

## 원출처의 조건과 HB 판단

### 화면 상태와 프로젝트 데이터의 보존 책임

[Activity의 `onPause/onStop`, `instance-state`, `save-simple`](https://developer.android.com/guide/components/activities/activity-lifecycle#onpause)은 짧은 pause에서 무거운 저장을 수행하지 않도록 하고, foreground에서의 적절한 저장 기회와 stop의 보완 역할을 구분해요. 그림의 process kill 경로도 직접 확인했어요. [process article](https://developer.android.com/guide/components/activities/process-lifecycle)은 process kill 때 `onDestroy` 호출을 보장하지 않아요. [상태 보존 guide의 `options/local/manage`](https://developer.android.com/topic/libraries/architecture/saving-states#options)은 메모리 상태·시스템 saved state·영속 저장의 수명이 다르며 큰 데이터를 로컬 저장에 두도록 설명해요.

HB 설계 판단: 사용자 저장 전인 새 프로젝트도 durable draft ID를 먼저 받아야 해요. 마지막 사용자 저장본, 복구용 draft checkpoint, 현재 메모리 문서를 따로 식별하며 자동 복구가 문서를 사용자가 저장한 상태로 바꾸면 안 돼요. 장면·그래프·머테리얼·애니메이션·UI·C++ source의 승인된 변경을 공통 모델에서 순서 있는 journal/checkpoint로 기록하고, 종료 콜백 하나에 프로젝트 전체 저장을 맡기지 않아요. 실제 durable write를 완료한 sequence/hash만 복구 가능으로 표시하는 계약이 필요해요. app data 삭제·제거까지 보존된다는 보장은 하지 않아요.

[저장 registry의 `savedstateregistry`](https://developer.android.com/topic/libraries/architecture/saving-states#savedstateregistry)와 [handle의 `savedstatehandle`](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate#savedstatehandle)은 stop 이후 변경이 다음 start→stop 없이 다시 저장되지 않는 조건을 명시해요. [handle 도입부](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate)는 task stack이 없어지는 force stop·recents 제거·reboot에서 saved state도 소실된다고 설명해요.

HB 판단: background에서 끝난 import·원격 빌드·AI edit의 결과를 UI saved state에만 넣으면 안 돼요. 결과와 revision·receipt를 별도 영속 job store에 commit하고, 재개 시 그 기록에서 UI를 다시 구성해요. 시스템 UI state에는 project/draft ID, document stable ID, 작은 선택·viewport·편집 패널 값과 checkpoint locator만 두는 후보가 적절해요. 사용자 닫기에서 복구 draft를 보관/폐기할 정책도 공통 명령으로 명시해야 해요. Android의 기본 UI dismissal 기대를 에디터의 미저장 작업 폐기 승인으로 해석하지 않아요.

### 재생성·동시 화면·Play의 경계

[`onResume/onPause/onStop`](https://developer.android.com/guide/components/activities/activity-lifecycle#onresume)은 paused라도 multi-window에서 보일 수 있는 경우와 resource 획득/해제 event의 짝을 설명해요. [동일 process의 Activity 전환](https://developer.android.com/guide/components/activities/activity-lifecycle#coordinating-activities)은 A의 pause 다음에 B가 생성·시작·재개되고, 이후 A가 보이지 않으면 stop하는 순서예요. 한 화면의 stop 저장 완료를 다음 화면의 시작 조건으로 가정할 수 없어요. [복잡한 상태 재구성](https://developer.android.com/topic/libraries/architecture/saving-states#restore)은 configuration change의 메모리 유지와 process death 뒤 저장 데이터 재구성을 구분해요.

HB 판단: editor shell 재생성이 project/model revision을 새로 만들거나 import를 두 번 enqueue하는 이유가 되면 안 돼요. Editor→Play 또는 외부 파일 picker 전환은 고정된 source revision을 전달하고, runtime이 준비됐다고 문서 저장·작업 commit이 끝났다고 보고하지 않아요. visible·interactive/focus·simulation·audio·render surface의 상태를 분리하고 터치/키 입력의 release·취소를 처리해야 해요. GPU surface/handle, native heap pointer, process token은 저장된 프로젝트 데이터가 아니에요. 재개 시 새 resource를 생성하고 stable asset/object ID로 바인딩해야 해요. 이 자료만으로 native GPU 복원이나 게임 전체 상태 직렬화가 검증되지는 않아요.

Play 복구는 별도의 정책이 필요해요. 화면 재생성 중 살아 있는 runtime에 다시 연결하는 경로, runtime process가 사라져 동일 source revision에서 재시작하는 경로, 명시적인 게임 checkpoint를 불러오는 경로를 구별해요. project draft를 게임 진행 저장으로 사용하지 않아요. foreground 복귀만으로 input/audio/simulation을 임의 재개하기보다 마지막 사용자 Play/pause 선택과 실제 host capability를 대조해야 해요.

### import·C++·AI job의 실행과 취소

[process article](https://developer.android.com/guide/components/activities/process-lifecycle)은 receiver가 시작한 thread만으로 process 중요도가 유지되지 않는 사례와 Android 13 이후 cached process에 실행 시간이 거의 없을 수 있는 조건을 설명해요. [long-running worker 도입/foreground-service-type](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running#foreground-service-type)은 foreground service와 알림을 통한 장기 실행, Android 16 job quota, target API 34 이상 service type과 prerequisite를 다뤄요. 예제의 취소 PendingIntent도 확인했어요. 이 mechanism은 native compiler/toolchain을 제공한다는 의미가 아니에요.

HB 판단: local import/C++ compile/cook/AI 작업은 durable job ID, 입력 project/source revision, capability, phase·attempt, staging output hash, cancel intent와 마지막 확정 receipt를 가져야 해요. 사용자가 시작한 장기 작업의 Android 실행 방식과 알림·service type은 실제 작업 목적에 맞는 공식 계약을 추가로 대조해야 해요. location/microphone 예제의 manifest를 C++ 빌드에 복제하지 않아요. quota 부족·권한 불충족·오프라인·worker/process 종료는 `done`으로 바꾸지 않고 resume/retry/host-required 중 근거 있는 상태로 복구해야 해요.

취소 요청의 접수와 실제 compiler/import/native child 종료·staging 정리는 다르게 기록해야 해요. restart 후 이미 commit된 결과는 같은 request를 중복 적용하지 않고 receipt를 반환하며, 효과가 있었는지 알 수 없는 attempt는 무조건 재실행하지 않고 revision/output을 대조해요. 사람이 수정한 새 revision에 오래된 worker 결과가 도착하면 별도 후보로 남기고 자동 덮어쓰지 않아요. remote build도 remote receipt 확인과 local artifact hash 대조를 거쳐야 해요.

### guide에서 실제 설명한 API와 미완료 계약

[handle의 `setup/savedstatehandle/savedstate-stateflow/kotlinx-serialization/savedstate-compose-state/direct/non-parcelable/testing`](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate#savedstatehandle)을 모두 읽었어요. constructor/factory 연결, key 조회/삭제, read-only/mutable flow, lazy serialization delegate, Saver 연동, Bundle 타입 표, custom provider의 파일 경로 복원, 테스트 입력 주입을 대조했어요. [registry](https://developer.android.com/topic/libraries/architecture/saving-states#savedstateregistry)는 key별 provider 등록/consume과 Bundle 반환을 설명해요. [worker](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running#long-running-java)는 Java Future 반환과 Kotlin suspend 호출을 구별해요.

여기서 확인한 것은 guide에 표시된 호출/동작이에요. 연결 reference의 모든 declaration·generic/nullable·overload·thread·ownership·예외·폐기 조건을 읽은 것이 아니어서 API 완료 수에 넣지 않아요. C++/node/AI 대응에서는 Android object 자체를 serialize하지 않고 공통 typed value와 stable ID를 사용한다는 설계 후보만 도출했어요. URI grant·파일 존재·외부 provider revision·native ABI의 유효성은 locator 복원 뒤 다시 검사해야 해요.

## HB 공용 명령 계약 제안

아래는 공식 Android 코드가 아닌 HB용 독창적 설계이며 **현재 호출 가능한 API가 아니에요**. 사람의 조작·C++/node 모델·AI가 같은 검사와 receipt를 공유해야 해요.

| 제안 이름 | 입력·전제 | 반환/실패·보존 의미 |
| --- | --- | --- |
| `checkpointDraft` | project/draft/document stable ID, expected model revision, base saved hash, command sequence, request ID | durable checkpoint ID/hash와 확정 sequence. 저장소 commit 전에는 복구 완료를 반환하지 않고 충돌·권한·공간 오류를 구별해요. 사용자의 저장본/dirty 상태는 별도예요. |
| `reattachEditor` | 복구 checkpoint locator, 마지막 UI locator, 새 host capability/session epoch | hash·schema·provider 접근을 검증해 모델을 복원하고 작은 UI 값을 적용해요. 오래된 client/process token을 되살리지 않아요. |
| `reconcileJob` | durable job ID, input revision/hash, attempt·host epoch, 마지막 receipt | 확정 result 재사용, 실행 중 확인, 중단/retry/충돌을 구별해요. 의미가 같은 request ID에 다른 payload를 허용하지 않아요. |
| `cancelJob` | job ID·expected attempt·request ID | 먼저 취소 요청 receipt, 이후 실제 child 종료·staging 정리 receipt를 기록해요. 늦게 도착한 결과는 attempt/revision 대조를 통과해야 해요. |
| `restorePlay` | source revision, session/checkpoint ID, 사용자의 Play/pause 정책, 새 device capability | 살아 있는 session 재연결·동일 revision 재시작·게임 checkpoint 복원을 구별해요. native pointer·실행 handle은 영속 입력이 아니에요. |

## 현재 코드의 읽기 전용 대조

`prototype/asset-documents.js:81–88`의 문서·history·dirty 상태는 메모리 Map을 사용하고 save는 별도 write 완료 뒤 저장본을 갱신해요. `tools/editor-automation.mjs:49–60`은 메모리 command Map에서 request ID 중복을 찾고 timeout/정리해요. `tools/build-jobs.mjs:6–20`은 job Map·AbortController를 사용하며 종료 때 running job을 취소해요. `tools/native-host.mjs:47–99`는 session Map·compiler spawn·완성 binary cache commit·worker RPC·종료 처리를 다뤄요. `native/desktop/HBEngine.cpp:296–301`의 Windows job/process 소유 경로도 확인했어요. 파일별 hash와 정확한 읽기 locator는 JSON에 있어요.

이 코드 구역은 Android process death 후 durable command/job receipt 복구를 입증하지 않아요. 현재 Windows worker와 prototype의 기능을 Android 앱 제작/백그라운드 실행 지원으로 표현하지 않아요. 어떤 코드도 변경·컴파일·실행하지 않았어요.

## 미해결과 다음 검증

기계 기록에는 아래 **12문제군**을 열어 두었어요. 연결 API 단위 전체분모는 별도로 `unknown`이며 이 12개를 전체 문서/API의 남은 수로 사용하지 않아요.

1. 연결 Android/AndroidX reference의 전체 선언·overload·thread·nullable/exception·version/폐기 계약이 미독이에요. guide의 호출명과 reference URL을 private 목록에 보존했어요.
2. Activity guide의 Compose 권고와 annotation observer 예제에 연결된 API의 현행/폐기 상태를 reference에서 대조해야 해요.
3. Save UI states registry 예제는 `val`로 선언한 query를 observer에서 다시 대입해요. 동일 source hash에서 확인한 문서 내부 문제이며 실제 Kotlin compile 검사는 하지 않았어요.
4. SavedStateHandle serialization 예제의 process-death 시점 설명과 본문의 stop 캡처 경고를 대조해야 해요. 죽는 순간 항상 새 값을 저장한다는 보장으로 읽지 않아요.
5. SavedStateHandle 타입 표의 Bundle 대응 완전성·nullable file 복원·lazy/provider 수명·파일 존재/접근 grant를 formal API와 대조해야 해요.
6. 장기 worker의 Kotlin/Java 입력검사와 Java Future 대기 차이, 실제 취소·failure·retry·progress 계약은 reference/sample 검증 대기예요. 예제의 placeholder가 완전한 downloader는 아니에요.
7. Android 16 quota와 HB import/C++/cook/AI에 맞는 service type·permission·background-start·user-initiated transfer 적용성은 후속 공식 문서 대기예요.
8. Android local/remote compiler·native child/ABI·worker process 종료·toolchain capability는 012와 실제 Android build 계약의 추가 대조가 필요해요.
9. fold/rotation·resize·multi-window/multi-resume·focus·IME와 surface 재생성의 정확한 API 계약·기기별 동작은 미검증이에요.
10. durable draft/journal의 transaction·provider 비원자성·storage-full·권한 상실·clear-data·이동/삭제 복구는 저장 backend/API와 대조해야 해요.
11. local Play의 input/audio/GPU·time·game checkpoint·session 소유권과 실제 suspend/resume는 native runtime 검증 대기예요.
12. AI request ID의 영속 dedup·revision 충돌·불명확한 commit·remote receipt·offline 재접속은 별도 공용 프로토콜 검증 대기예요.

구현 gate 이후에는 미저장 새 프로젝트/각 문서 편집→rotation/fold/resize→외부 picker→background completion→system process kill→cold reopen, 사용자 종료/reboot, import/C++/AI 중 취소/오프라인/기기 제약, Play 중 화면·입력·audio/surface 변경을 구별해 검사해야 해요. 저장된 draft와 사용자 저장본의 차이, 중복 없는 job receipt, stale revision 거부, incomplete output 미노출도 확인해요. **이번에는 기기 연결·SDK 설치·앱/engine/runtime 실행·foreground GUI 조작을 하지 않았고 독립 검증도 아직 없어요.**
