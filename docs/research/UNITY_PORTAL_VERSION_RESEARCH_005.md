# Unity 새 포털 판본 근거 연구 005

2026-10-04, 담당 `unity_lifecycle_body`, `research_only`예요. 기존 [004 분석](UNITY_PORTAL_ALIAS_BODY_004.md)과 두 API 원문을 그대로 보존하고, 같은 HTTP 응답 안의 선택 표시·publisher 데이터·실제 본문을 새로 대조했어요. **선택된 환경 6000.0은 확인했지만 API 본문의 release 결합과 두 host의 동일 판본은 아직 입증하지 못했어요.** 이번 기록은 새 의미 연구이며 독립 검증·원장 승격·전체 판본 교차검증은 각각 0이에요. 근거 위치와 재계산한 hash는 [기계 기록](unity-portal-version-research-005.json)에 있어요.

## 실제 읽기와 수량 정정

004의 [Translate](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/transform/translate)와 [Simulate](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/physicsscene2d/simulate) `#page-content-container` 전체 텍스트·선언·parameter·예제·표를 읽었어요. 추가로 이미 확보된 [Documentation versions](https://docs.unity.com/en-us/engine/6000.0/manual/manual-versions) 본문 전체를 읽었어요. 세 원문에서 다시 추출한 container bytes가 저장된 body bytes와 각각 일치해요. HTTP HTML 3개가 있다는 사실과 읽기 3본문을 별도로 기록해요. 전체 HTML의 탐색·수천 sidebar 항목·모든 script를 읽었다는 뜻은 아니에요.

| 단위 | Translate | Simulate | 두 API 합계 | Documentation versions |
| --- | ---: | ---: | ---: | ---: |
| h1–h3 heading | 26 | 6 | 32 | 3 |
| 추가 h4 heading | 16 | 4 | 20 | 0 |
| h1–h6 전체 heading | 42 | 10 | **52** | 3 |
| 표시 signature | 6 | 1 | 7 | 0 |
| parameter 타입 pre | 16 | 2 | 18 | 0 |
| 예제 | 6 | 1 | 7 | 0 |
| 전체 pre 요소 | 28 | 4 | **32** | 0 |
| HTML 표 / 전체 cell | 0 / 0 | 1 / 4 | 1 / 4 | 0 / 0 |
| img 요소 | 0 | 0 | 0 | 0 |

004의 32 heading은 **h1–h3 부분 수**예요. 전체 heading 또는 전체 구역 coverage 분모로 사용하지 않아요. 추가 h4는 Translate parameter 16개, Simulate parameter 2개와 Returns 표의 Type/Description heading 2개예요. 예제 7개와 pre 요소 32개도 서로 다른 단위예요. Simulate의 Returns 표는 header 2cell·data 2cell, 총 2행/4cell이며 반환형 bool과 simulation 실행 여부, physics callback 안의 실행 실패 설명을 실제 대조했어요. 원문 별도 inventory는 private `final-source-evidence.json`에 있어요. 004 파일은 역사 근거로 보존했어요.

본문의 inline SVG는 68/14/3개, 합계 85개예요. 부모 DOM을 확인하면 anchor 50개·code 복사/전체화면 버튼 28개·breadcrumb separator 7개로 구분돼요. img가 없다는 수치로 SVG가 없다고 표현하지 않아요. SVG와 UI의 시각 렌더는 확인하지 않았고, selector 메뉴도 열지 않았어요. 읽기 범위는 본문 텍스트·HTML 구조이며 전체 UI/media 시각 검증은 아니에요.

## 6000.0 근거의 서로 다른 의미

| 근거 층 | 두 API에서 실제 확인한 위치 | 입증하는 범위와 한계 |
| --- | --- | --- |
| 요청/응답 주소 | 004 retrieval의 요청 URL·final URL | 주소가 6000.0이라는 사실이에요. 본문의 release provenance는 아니에요. |
| SSR 현재 선택 | `div[data-sentry-component="VersionPicker"]` 각 2개 | 각 combobox는 6000.0와 LTS를 표시하고 `input.MuiSelect-nativeInput` 값은 6000.0이에요. 저장된 응답의 현재 선택 상태예요. |
| 일반 metadata | HTML title·description·OG·Twitter meta, canonical link 0개 | API명/설명/제품명이 있지만 API release 값은 확인하지 못했어요. OG image URL은 version 결합 근거가 아니에요. |
| publisher hydration | script ordinal 49의 RSC `12/1/3` | EnvironmentTracker가 engine/6000.0/en-US/fallback false를 전달해요. publisher가 선택된 문서 환경을 명시한 근거예요. API content 자체의 release ID는 아니에요. |
| 실제 API 본문 | container의 Definition·signature·Remarks·Examples | namespace와 module 및 API 계약은 있어도 별도 version 표시가 없어요. relative update 문구는 immutable release 식별자가 아니에요. |

004에서 찾지 못한 현재 selector를 이번에 찾았어요. 실제 control은 HTML `select`가 아니라 `role="combobox"`와 숨은 native input이어서 `select` 탐색만으로 충분하지 않았어요. `aria-expanded=false`인 저장 상태만 확인했어요. 클릭 이후 경로 변화·메뉴 option 전체·runtime hydration 동작은 미확인이에요. selector 두 개를 서로 독립된 두 release 증명으로 계산하지 않아요.

RSC record 0의 router segment는 요청 route의 추가 표현이에요. 이와 구분되는 record `12/1/3`의 EnvironmentTracker publisher 값은 `environment_version=6000.0`, `environment_content_locale=en-US`, `environment_locale_is_fallback=false`예요. `12/2/3` ProductHeader는 User Manual/Script Reference 링크와 versions 10항목을 전달해요. 두 API에 동일한 목록이 있으며 **6000.0이 supported/LTS와 archived로 중복돼요.** 또한 그 목록의 Current 표시는 6000.6이에요. 이 값은 해당 응답의 publisher 목록에 대한 관찰이며 전 세계 최신 버전 판정이나 6000.0 지원 상태 확정이 아니에요. 동일 versionNumber의 상태 충돌은 공식 설명 확인 대기로 남겨요.

## publisher JS와 HTTP 증거

확보된 [layout chunk](https://cdn.docs.unity.com/_next/static/chunks/app/%5Blocale%5D/%5Bnamespace%5D/%5B%5B...slugs%5D%5D/layout-85a1c850e814ba87.js) 11,928bytes 전체를 읽었어요. webpack entry/import bootstrap이며 78696·3591·75795 module을 가져와요. API RSC import records 24/25/27은 이 ID를 EnvironmentTracker/ProductHeader/Sidebar로 연결해요. 이 chunk에는 VersionPicker의 선택 계산이나 content loader 구현이 없어요. 외부 chunk 전체를 확보/읽은 것은 아니며, 실제 구현과 서버 문서 선택 계약은 pending이에요.

Documentation versions HTTP의 middleware rewrite도 6000.0 path를 가리켜요. 해당 응답의 cache-tag `release:c4bde61`과 JS header의 `x-amz-meta-commit-sha=c4bde6175915f371d780be8a35721e0cdc47091a`는 웹 배포 식별 근거예요. Unity Engine 6000.0 patch/build 또는 API 내용 release ID로 바꾸어 쓰지 않아요. HTTP 날짜·cache policy·JS 수정일도 엔진 판본 자체를 증명하지 않아요.

## 공식 Documentation versions 본문의 계약

도입부는 엔진 release에서 기능 추가·개선·제거가 생기고 문서도 이를 반영한다고 설명해요. 같은 version의 온라인 문서도 내용 개선·사용자 피드백 수정으로 재발행될 수 있어요. 따라서 version route가 같아도 내용 hash가 바뀔 수 있으며, 연구 snapshot에는 읽은 날짜와 source/body hash가 필요해요. 설치한 Unity와 User Manual/Scripting API의 문서 version을 맞춰 선택하라는 지침도 확인했어요. [공식 본문](https://docs.unity.com/en-us/engine/6000.0/manual/manual-versions)

그 본문은 오래된 Unity를 유지하는 경우 installer의 offline 문서가 해당 version에 대응한다고 설명해요. 온라인에서는 과거 version의 최신 게시 문서를 볼 수 있지만 offline installer 문서와 지원 종료 version의 보관 문서는 재발행하지 않는다고 구분해요. 이 일반 계약만으로 현재 6000.0이 보관 상태인지, 확보한 ZIP과 새 포털 API가 정확히 같은 게시판본인지는 결정할 수 없어요. publisher 목록의 supported/archived 중복도 이 본문이 해결해 주지 않아요. [동일 공식 도입부](https://docs.unity.com/en-us/engine/6000.0/manual/manual-versions)

`#install-offline-documentation`은 Download Assistant/Hub 설치와 installer 밖의 Offline Documentation 링크를 설명해요. `#additional-resources`는 새 기능·업그레이드·시스템 요구·설치 문서로 연결해요. 링크 대상 본문과 설치 UI는 이번에 읽거나 실행하지 않았어요. 실제 breadcrumb에는 Unity 6.0 User Manual이 있지만 API 두 페이지에는 해당 본문 version label이 없어요. manual breadcrumb를 API release 결합 근거로 상속하지 않아요.

새 host의 이 본문은 지원 full release 문서 안내에서 여전히 `https://docs.unity3d.com/`을 연결해요. 두 공식 host의 관계를 보여 주는 직접 링크지만 **6000.0 API의 byte 동일성·canonical alias·migration mapping을 보장하는 문장은 아니에요.** 새 포털 전체의 version 선택 계약이나 API content의 source edition 식별자는 이번 자료로 확정하지 못했어요.

## 두 API 본문과 판본 대조의 남은 조건

Translate의 Definition은 UnityEngine.CoreModule을 표시해요. 실제 여섯 shape의 Space/생략 overload는 local·world 기준을 설명하고 Transform overload는 reference local 기준과 null일 때 world 기준을 설명해요. parameter 타입과 예제까지 읽었지만 본문에는 engine release 표시가 없어요. Space를 받는 표시 signature에 default 문법이 없다는 사실과 생략/Self 동작 설명을 구분해요. 004에 고정된 기존 host 분석의 default 표시와 정확히 결합하려면 공식 binding/게시판본 근거가 추가로 필요해요.

Simulate는 UnityEngine.Physics2DModule과 bool/기본 layer mask -1을 표시해요. Returns 표의 callback 실행 실패, layer별 body/contact/joint/effector 처리, edit mode의 contact callback 억제, 별도 FixedUpdate와 고정 step 지침을 확인했어요. 예제는 2D 페이지인데 PhysicsScene 타입을 사용해요. 실제 공식 원문의 불일치예요. 004가 기록한 기존 host의 Physics2D.AllLayers 표시와 새 숫자 표시를 공식 constant/binding 확인 없이 같은 선언으로 합치지 않아요. 두 API의 thread·native ownership·오류/수명 계약도 이번 version 연구가 해결하지 않아요.

기존 두 API의 비교 사실은 hash에 고정한 004의 연구를 참조했어요. 이번에 기존 host 두 본문 전체를 새로 재검증하지 않았고, 004의 독립 검증으로 보고하지 않아요. 두 API 본문도 서로 다른 content를 가진 source identity로 계속 남겨요.

**HB 연구 판단:** 선택된 환경 값, content release provenance, web deployment ID, snapshot hash를 별도 필드로 유지해야 해요. C++/노드의 default·모듈 계약과 사람/AI의 API 선택은 같은 고정 근거를 참조하되 host별 불일치를 보존해야 해요. 이 판단은 HB 설계 요구이며 Unity 공식 기능이나 현재 HB 구현 결과가 아니에요.

후속 확인은 VersionPicker와 서버 content loader의 실제 구현/계약, page별 source edition, supported/archived 중복 설명, 두 host의 고정 판본 대조, default/예제 모순의 공식 후속 근거와 별도 독립 검증이에요. 추가 연구 턴에서 클라이언트의 `network permission revoked` 오류가 있었다는 root 전달은 있지만 실제 실패 HTTP URL/status는 확보되지 않았어요. 이를 HTTP 응답 실패나 전체 네트워크 차단으로 확대하지 않으며, source acquisition 근거는 private fetch 기록으로만 인정해요. 이번 마무리의 오프라인 작업과 root의 별도 HTTP 후속 작업도 구분해요. 이번 마무리에서는 추가 네트워크·GUI·공유 원장·엔진·commit을 변경하지 않았어요. 확보되지 않은 chunk와 미독 링크는 pending이며, 전체 corpus/판본 교차검증 완료 주장을 하지 않아요.
