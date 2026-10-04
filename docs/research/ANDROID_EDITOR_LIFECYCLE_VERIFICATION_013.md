# Android 모바일 에디터 수명주기·복구 독립 대조 013

2026-10-04, `research_only`. 짚짱의 `/root/android_build_deploy_014`가 다른 담당자의 [분석 MD](ANDROID_EDITOR_LIFECYCLE_BODY_013.md)·[분석 JSON](android-editor-lifecycle-body-013.json)을 고정된 원문과 **독립적으로 직접 읽고 비교**했어요. 이 기록은 지정된 제한본의 원문·분석 일치 대조이며 전체 Android/Unity/Unreal 문서나 연결 API의 엄격한 `verified`가 아니에요. **strict verified·원장 승격은 0**이에요.

고정 분석 SHA-256은 MD `15dc15f825bb7d5a3854690a514d2611a2dd7a90954cd5afa42afb3081633853`, JSON `57cfa1db2fa4ca15b332832931a4f068f928b3897f3550be988cdba36dbf4bfd`예요. 원문은 Git ignored `native/build/reference-corpus/android-editor-lifecycle-batch-013`의 source/body/read metadata를 사용했어요. 새 HTTP 요청으로 현재 웹판본이 바뀌지 않았다고 주장하지 않아요. source·본문·읽기 자료의 hash와 원본 DOM의 실제 기술 본문을 재대조했어요.

## 이번에 실제로 읽은 전체 범위

| 공식 원문 | 원문 갱신일 UTC | 기술/resource heading | 전체 pre | 표·행·셀 | 그림 |
| --- | --- | ---: | ---: | --- | ---: |
| [Activity lifecycle](https://developer.android.com/guide/components/activities/activity-lifecycle) | 2026-09-22 | 21 | 8 | 1·5·15 | 1 |
| [Save UI states](https://developer.android.com/topic/libraries/architecture/saving-states) | 2026-04-22 | 13 | 2 | 1·7·28 | 0 |
| [Processes and app lifecycle](https://developer.android.com/guide/components/activities/process-lifecycle) | 2025-02-10 | 0 | 0 | 0 | 0 |
| [Saved State module for ViewModel](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate) | 2026-09-22 | 13 | 9 | 1·18·36 | 0 |
| [Long-running workers](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running) | 2026-10-01 | 8 | 5 | 0 | 0 |

**5전체 기술 본문·55heading·24전체 pre·3표/30행/79셀·PNG1**을 직접 읽었어요. heading 없는 process 본문은 도입부·importance 네 계층·마지막 dependency 문단까지 읽었어요. Saving-states와 ViewModel의 추천 heading 2개·추천 제목은 별도로 확인해 raw heading은 57개예요. Kotlin/Java/XML을 포함한 모든 제공 예제의 설명·주석·placeholder·반환 흐름과 표의 모든 셀을 읽었어요. 원문 article 내부 iframe·inline SVG·video는 각각 0이에요.

Activity 그림은 실제 PNG pixels를 읽어 생성→실행·pause→resume, stop→restart, process kill→재생성, 종료 가지를 비교했어요. 단순화된 그림이 `onDestroy` 보장을 주지 않는다는 분석은 process 본문의 명시적 비보장 문장과 함께 확인했어요. 그림 미독은 0이에요. 추천·reference·sample·후속 API 본문의 읽기 상태는 상속하지 않아요.

## 의미 대조 결과

원문과 주요 분석의 불일치는 찾지 못했어요. 아래 조건을 따로 대조했고, 구역·fact ID·예제·표 hash의 세부는 [검증 JSON](android-editor-lifecycle-verification-013.json)에 있어요.

| 대조한 구분 | 확인 결과 |
| --- | --- |
| 저장본·메모리·UI saved state | ViewModel의 configuration change 유지와 process death 한계, saved state의 task stack 수명, 영속 저장의 별도 책임을 원문과 일치하게 구분했어요. durable draft·journal·dirty·receipt는 HB 설계라고 명시돼 있어요. |
| stop과 process kill | stop에서 캡처하는 값과 stop 이후 쓰기, 다음 start→stop 조건을 모두 확인했어요. process death 순간 새 값을 반드시 저장한다는 보장으로 확대하지 않았어요. |
| 사용자 종료·task 제거 | force stop·recents 제거·reboot·finish와 시스템 process death를 구분해요. editor draft 보관/폐기는 HB 정책 후보이며 Android 기본 UI dismissal을 사용자 프로젝트 폐기 승인으로 삼지 않았어요. |
| pause·stop·동시 화면 | paused라도 보이는 경우, resource acquire/release 짝, 같은 process에서 A pause→B create/start/resume→보이지 않는 A stop 순서를 확인했어요. 다음 화면 시작 전에 이전 화면 저장 완료가 보장된다는 해석은 없어요. |
| 상태 provider·예제 차이 | registry 예제의 `val` query 재대입과 serialization 예제의 process-death 설명/stop 경고 차이를 실제 코드에서 재확인했어요. type 표·lazy delegate·파일 경로 복원은 읽었지만 모든 nullable·수명·파일 접근을 확정하지 않았어요. |
| 장기 worker | Kotlin은 두 입력 누락을 failure로 처리하고 suspend foreground 호출 뒤 진행해요. Java 예제는 같은 입력 검사를 하지 않고 반환 Future를 await/get하는 코드를 보여주지 않아요. placeholder download·cancel intent가 완전한 실패/재시도/child 종료 계약은 아니라는 미해결을 유지했어요. |
| 실행 조건 | Android16 quota, target API34 service type, 29 location·30 camera/microphone 조건을 각각 대조했어요. HB import/C++/cook/AI에 location/microphone 예제를 그대로 적용하거나 native compiler 지원으로 보고하지 않았어요. |
| 사람·AI·Play | 공통 stable ID·revision·job·capability·request/receipt·cancel 단계와 Play 재연결/재시작/checkpoint는 HB 미구현 제안으로 구분돼 있어요. Windows 코드의 존재나 원문 가이드를 Android 실제 제작·플레이 증거로 세지 않아요. |

## 자료·현재 코드 대조와 남은 gate

고정 source/body/text/numbered/read·media와 참조 분석/도구/현재 코드의 **40파일 hash 대조는 오류 0**이에요. source에서 다시 추출한 body HTML bytes가 저장 body와 일치했고 heading/pre/table/media 분모도 다시 계산했어요. 연결 reference URL은 **133회·77identity**로 일치하지만 API unit·overload 분모가 아니에요. 이번 검증 JSON에는 모든 24pre와 3표에 대한 독립 hash를 남겨요.

현재 코드의 실제 읽기는 분석이 지정한 `prototype/asset-documents.js:81–88`, `tools/editor-automation.mjs:49–60`, `tools/build-jobs.mjs:1–21`, `tools/native-host.mjs:47–99`, `native/desktop/HBEngine.cpp:296–301`에 한정했어요. 메모리 Map·조건부 save·request dedup·AbortController·compiler staging·session/RPC·Windows job 소유 설명은 이 범위와 일치해요. 프로젝트/파일 전체를 다시 검증하거나 Android에서 실행한 것이 아니에요.

기존 미해결 **12문제군을 모두 유지**해요. formal API·판본/폐기·overload·thread·ownership·nullable/exception, 원문 예제 차이, service 권한/quota 적용성, native toolchain, IME/surface·Play, 저장 provider·durable protocol·실기기 복구는 대기예요. 연결 본문 전체분모와 discovery closure가 없는 상태여서 엄격한 승격을 하지 않아요. 전체 구현 gate도 열지 않아요.

이 담당자는 검증 MD·JSON만 작성했어요. 분석 파일·원문·엔진·공유 status/ledger·SDK·foreground 창을 변경하지 않았고 GUI·engine/runtime·compiler·worker·기기·테스트를 실행하지 않았어요. 자료 구조·해시 재계산과 실제 의미 대조를 구분해 기록했어요.
