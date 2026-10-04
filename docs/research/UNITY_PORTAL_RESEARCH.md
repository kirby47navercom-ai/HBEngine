# Unity 새 공식 포털·제품·서비스 API 조사

기준일은 2026-10-04예요. [공식 포털](https://docs.unity.com/en-us)과 [서비스 입구](https://docs.unity.com/en-us/services), [6000.0 엔진 입구](https://docs.unity.com/en-us/engine/6000.0), [서비스 API 목록](https://docs.unity.com/en-us/services/reference), [Environments API](https://docs.unity.com/en-us/services/environments-api)의 웹 본문을 직접 읽고 원본 HTML을 별도로 보관했어요. 이것은 전체 포털의 본문 분석 완료가 아니에요. root와 API 페이지의 sidebar·그림·동적 내용·원문 분모 검증은 별도 대기예요.

## 공식 목록 전체를 확보한 근거

공식 robots가 [sitemap.xml](https://docs.unity.com/sitemap.xml)을 가리켜요. robots의 `/internal/` 및 언어별 internal 경로 금지 표시를 기록했어요. 내부 경로 접근이나 인증 변경은 하지 않았어요.

공식 sitemap index의 **151개 shard 전부**를 실제 HTTP 요청으로 확보하고 XML을 파싱했어요. 각 shard의 원본 파일·HTTP 응답·SHA-256·URL 목록은 `native/build/reference-cache/unity-services/sitemap-shards`에 있어요. 전체 고유 URL은 **231,873개**, 그중 `/en-us/` 주소는 **231,872개**예요. shard 성공은 그 안에 실린 페이지 본문을 읽었다는 뜻이 아니에요.

| 엔진 판본 | Manual URL | Script Reference URL | 엔진 입구 | 합계 |
| --- | ---: | ---: | ---: | ---: |
| 6000.0 | 3,123 | 31,427 | 1 | 34,551 |
| 6000.3 | 3,486 | 35,273 | 1 | 38,760 |
| 6000.5 | 3,551 | 41,830 | 1 | 45,382 |
| 6000.6 | 3,655 | 46,521 | 1 | 50,177 |
| 6000.7 | 3,745 | 50,675 | 1 | 54,421 |

위 표는 sitemap URL 분류예요. 실제 문서/API symbol 수, release 안정성, 최신 엔진의 지원 상태나 분석 완료 수를 뜻하지 않아요. 기존 기준본 Unity 6000.0/영어를 다른 버전의 동작과 섞지 않아요. 다른 판본 188,740개 주소도 원본 발견 목록에 보존하며 추가·변경·폐기 기능과 호환 조건의 대조 대상으로 남겨요. 이 발견으로 새로운 기능을 누적 요구에서 제외할 수 없어요.

6000.0 새 포털의 Manual/API URL 수는 기존 `docs.unity3d.com` TOC/search 목록과 달라요. 어느 한쪽이 정확한 전체 분모라고 가정하지 않고 경로 변환·별칭·페이지 본문·실제 선언을 대조해야 해요. 새 포털의 6000.0 두 계열은 독립 source로 등록했으며 별칭을 해소하기 전 합산값을 고유 문서 수로 표현하지 않아요.

Script Reference root는 웹 읽기 도구에서 4MB 제한에 걸렸어요. 직접 공식 HTTP 요청은 **200, 4,700,737 bytes**로 원본을 확보했어요. 도구 크기 제한을 문서 부재나 본문 분석 완료로 바꾸지 않아요. 전송된 대형 sidebar/상태 데이터와 실제 API 본문도 분리해야 해요.

## 엔진 밖으로 연결되는 제작 도구와 서비스

엔진 이외 영어 포털 주소는 **8,581개**예요. 패키지와 기존 20개 서비스 URL을 대조하면서 8,579개를 새 발견 상태로 원장에 추가했어요. 기존 주소·새 포털 별칭 중복이 있어 총합과 신규 수가 달라요.

포털 본문은 Hub, 편집 도구, 협업, 멀티플레이, 운영 서비스, 광고, 산업용 제작 계열을 연결해요. 엔진 제작에는 설치·빌드·자산 처리·협업·런타임 서비스의 경계를 검토해야 해요. 상용 서비스의 서버 운영 자체와 HBEngine의 클라이언트 통합 계약은 구분해야 하며, 목록 제목을 기능 구현으로 세지 않아요. 포털 링크는 외부 공식 지원 도메인과 Unity Learn/Discussion도 포함하므로 아직 목록 폐쇄 근거가 될 수 없어요.

서비스 개요 본문에서는 팀 작업, 게임 운영, 플레이어 연결이 별도 계열이에요. 데이터/설정/콘텐츠 전달/서버 로직의 제작·배포 단계가 연결되며, 여러 서비스를 함께 사용하는 sample과 Building Blocks도 있어요. 이는 프로젝트 설정과 runtime·server·build 문맥의 분리가 필요하다는 HB 설계 근거예요. 하위 SDK와 제한·권한·실패 계약은 아직 개요를 읽은 상태로 대체하지 않아요.

## 서비스 API는 SDK만으로 끝나지 않음

[공식 API 목록](https://docs.unity.com/en-us/services/reference)의 모든 표를 읽었어요. 같은 기능에도 Unity SDK, 관리자 REST, 플레이어/클라이언트 REST, CLI가 서로 다른 문서로 연결돼요. **`services.docs.unity.com`으로 이어지는 26개 고유 참조 입구**를 확보하고 별도 source로 등록했어요. 관리 권한과 플레이어 권한, 버전·endpoint·schema·pagination·한도·오류를 따로 분석해야 해요. SDK 함수를 안다는 이유로 REST/CLI 계약을 분석한 것으로 처리하지 않아요. `@latest` SDK와 CLI latest 링크의 호환 판본도 고정 대기예요.

## Environments API의 실제 계약과 미확정 부분

[Environments API 본문](https://docs.unity.com/en-us/services/environments-api)은 게임 서비스의 데이터 분할을 설명해요. Scene의 하늘·태양 같은 맵 환경과 다른 개념이에요. Project Settings의 Services/Environments에서 활성값을 선택하고 Dashboard에서 추가·삭제해요.

본문에는 singleton, 이름·nullable GUID·변경 알림, 목록 읽기·비동기 refresh·활성값 선택·원격 존재 검증, 툴바의 UXML 표시가 나와요. runtime/build 적용은 초기화 옵션 → 편집기 선택 → production 기본값의 우선순위예요. C++/Blueprint/AI 대응도 편집 표시와 실제 초기화 설정을 분리해야 해요.

앞의 코드 두 묶음과 관리 코드의 namespace 순서가 달라요. 문서의 차이를 임의로 수정하지 않고 정확한 Core package 버전/API에서 재확인해야 해요. 그림 2개 픽셀, 비동기 실패·스레드·권한·수명과 linked initialization 본문도 미확정이에요. 이 페이지는 텍스트 계약 분석만 보존하며 전체 verified로 승격하지 않아요.

## 판정

새 포털의 전체 sitemap 확보와 실제 본문/API 분석은 별개의 상태예요. 추가 기준본·별칭·외부 API·그림·동적 문서·권한 제한과 세부 계약이 남아 전체 gate를 열지 않아요. 원본은 무시 캐시에만 보관하고 이 보고서는 조사 사실·한계·HB 설계 판단을 기록해요. 엔진 기능 변경은 하지 않았어요.
