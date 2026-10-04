# Unreal 공식 문서 전체 코퍼스 조사

조사 기준일: 2026-10-04. 고정 버전: Unreal Engine **5.8**, 본문 기준 언어: **en-us**. 이 문서는 전체 문서 분석의 시작 증거와 미해결 범위를 기록한다. **전체 매뉴얼·전체 API 분석 완료 문서가 아니다.** 엔진 기능 구현, 편집기 실행, GUI 조작은 하지 않았다.

## 범위와 현재 증거

기존 `docs/reference-index/unreal-sections.json`의 21개 상위 영역과 398개 topic은 전체 문서 수가 아니다. 공식 문서 루트의 21개 영역은 입구이며, 매뉴얼의 하위 문서·C++ 모듈/플러그인/타입/멤버·Blueprint 범주/액션·Python API를 별도로 추적해야 한다. 현재 클라이언트 코드에는 WebAPI 입구도 있다. sitemap에는 `ue_noderef_api_external` 소스도 존재하지만 실제 페이지 목록을 확보하지 못했다.

| 확인 단위 | 실제 확보 내용 | 의미와 한계 |
|---|---:|---|
| 전체 documentation sitemap index | 578개 shard 주소 | 여러 Epic 제품을 포함한다. 문서 URL 수가 아니다. |
| Unreal 전용 sitemap shard 주소 | 424개 | 소스별 아래 표 참조. shard 내부 URL은 미확보다. |
| C++ API 루트 본문 href | 2,719개 | Developer 110, Editor 140, Runtime 247, Plugins 1,376, PluginIndex 843, 일반 매뉴얼 3개. 타입/멤버 전체 수가 아니다. |
| Blueprint API 루트 본문 href | 889개 | Actions and Categories의 범주 입구. 전체 노드 수가 아니다. |
| SSR 조사 URL | 59개 고유 URL | 그중 54개 실제 본문+5.8 metadata 확보, 5개 본문 없는 HTTP 200 응답. |
| SSR 현재 발견 후보 | 16,216개 | C++ 14,554, Blueprint 1,210, 기타 452. 수동 probe를 포함한 열린 후보집합으로 완료 분모에 사용할 수 없다. |
| SSR 아직 요청하지 않은 후보 | 16,157개 | 신규 링크가 계속 늘 수 있다. 현재 후보를 모두 요청해도 sitemap 대조 없이 완전성을 입증할 수 없다. |
| Python Sphinx 검색 index | 11,678개 docname/filename | 버전 5.8에서 실제 제공되는 별도 정적 Python 문서 목록. 본문 읽은 수가 아니다. |
| Python Sphinx object inventory | 66,849개 symbol record, 11,681개 URI path | anchor를 제거한 경로 수와 search index docname 수는 다르다. 역할/중복/특수 index 경로를 대조해야 한다. |
| 개별 본문 초기 검토 기록 | 10개 | 아래의 실제 읽고 기록한 본문이다. 전체 API의 정확성 검증 통과 건수로 자동 전환하지 않는다. |

Python object inventory의 역할별 record는 method 17,896, property 17,099, class 11,675, attribute 8,441, function 50, `std:doc` 11,678, `std:label` 10이다. 이 수치는 상속과 같은 의미 관계를 정리한 API 수가 아니라 Sphinx inventory record 수다.

## 공식 열거 입구와 실패 기록

[robots.txt](https://dev.epicgames.com/robots.txt)는 [documentation sitemap](https://dev.epicgames.com/documentation/sitemap.xml)을 공개한다. 이 index는 직접 HTTP 요청으로 200, 82,049 bytes였고 SHA-256은 `5bbfee45efd3350b260595508dd48560a5e3c8a0b06a019665e6e1f9a97e6418`이다. 원본 XML과 모든 shard 주소를 로컬 무시 캐시에 보관했다.

| Unreal sitemap source | shard 수 | 첫 shard 직접 요청 |
|---|---:|---|
| `external` | 19 | HTTP 403 |
| `epic_developer_community` | 8 | HTTP 403 |
| `ue_cpp_api_external` | 279 | HTTP 403 |
| `ue_blueprint_api_external` | 114 | HTTP 403 |
| `ue_python_api_external` | 1 | HTTP 403 |
| `ue_noderef_api_external` | 3 | HTTP 403 |

예를 들어 공개 index가 가리키는 [C++ 첫 shard](https://dev.epicgames.com/community/api/documentation/sitemaps/unreal_engine/ue_cpp_api_external/sitemap_1.xml)와 [매뉴얼 첫 shard](https://dev.epicgames.com/community/api/documentation/sitemaps/unreal_engine/external/sitemap_1.xml)는 로컬 요청에서 403, 웹 도구에서 timeout이었다. 424개 전체 shard를 실패했다고 기록하지 않는다. 각 소스의 첫 shard 6개만 직접 시험했다. index가 존재한다는 사실을 내부 URL 확보나 본문 분석으로 계산하지 않는다.

공식 documentation 클라이언트 `main.66569042725b2354.js`의 공개 GET 호출을 확인했다.

- `/community/api/documentation/table_of_content.json`: `path=/documentation/unreal-engine/SLUG`, `lang=en-US`, `application_version=5.8`.
- `/community/api/documentation/document.json`: 같은 값에 선택적으로 `revision_hash_id`를 받는다.
- `/community/api/documentation/document/redirect_url.json`: path/lang/version을 사용한다. 호출 구조만 확인했고 응답을 확보하지 않았다.

매뉴얼 루트와 API 루트에 대한 TOC GET, API 루트에 대한 document GET은 직접 요청에서 모두 403이었다. 로그인·권한 변경·차단 우회는 하지 않았다. `http://documentation-app/...`는 HTML에 나타나는 SSR 서버 내부 호스트명이므로 외부 접근 입구로 사용하지 않는다.

현재 작동한 대체 경로는 **공식 문서 HTML의 SSR JSON**이다. JSON `<script>`에서 `{b:{blocks:[...], applications:[...]}, u:...document.json}` 구조를 찾는다. `b` 안의 `blocks`가 실제 본문이며, `id`, `hash_id`, `revision_hash_id`, `updated_at`, `source`, `locale`, `entitlement`, `applications`가 함께 제공된다. 단순 `<title>`이나 HTTP 200만으로 본문 확보를 인정하지 않는다.

열거기는 markdown `content_html`의 일반 `<a href>`뿐 아니라 `<block-dir-item-md href>`도 읽고, 구조화 본문의 `document_list.items[].document_url`, paragraph/enhanced_list/enhanced_table/include 내부 href를 재귀적으로 추출한다. 콘텐츠 전체를 문자열로 평탄화하는 대신 중첩 블록을 그대로 보관한다. `include` 블록은 이번 Audio 루트에서 실제 하위 `blocks`를 가지고 있었다.

관측된 C++ 계층은 `API/Developer`, `API/Editor`, `API/Runtime`, `API/Plugins`와 **`API/PluginIndex`**다. Plugins 아래는 모듈 API이고 PluginIndex 아래는 `.uplugin` 수준의 구성·의존/피의존 플러그인·여러 소속 모듈이다. 둘을 하나로 합쳐 플러그인을 빠뜨리지 않아야 한다. 모듈 다음에는 class/struct/enum/typedef/function/constant 등의 표가 오고, 타입 본문에는 상속·생성자·변수·함수·override 및 별도 멤버 링크가 나온다. 모든 표 항목이 독립 href를 가지는 것은 아니므로 href 개수만 API 수로 주장하지 않는다.

## Python 별도 코퍼스

[PythonAPI bridge](https://dev.epicgames.com/documentation/en-us/unreal-engine/PythonAPI?application_version=5.8)는 [Unreal Python 5.8 Sphinx root](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/?application_version=5.8)로 연결한다. 이 정적 사이트는 Epic SSR 블록 페이지와 다른 파서가 필요하다.

| 공식 리소스 | bytes | SHA-256 | 실제 확인 |
|---|---:|---|---|
| `python-api/` | 2,517,027 | `118ae0be6227ef59550023cabca16b379bd0c577fd9ee382db303e93aeffdaba` | title이 Unreal Python 5.8 (Experimental) |
| `python-api/objects.inv` | 611,991 | `ca851fdb73f0fbe3f2b5a6fe79068fe1d6ff053c3742a96d2110771b7c25ae17` | Sphinx inventory v2, Project Unreal Python, Version 5.8, zlib body 실제 해제 |
| `python-api/searchindex.js` | 17,037,036 | `97cd6ec6c10744cca14e64fc5d6c41049131a0a92bae856abee493a75fd465f7` | `Search.setIndex` JSON 파싱, 11,678 docnames와 filenames |

`.html` 요청은 최종 응답에서 확장자 없는 URL로 이동했다. introduction, ScopedEditorTransaction, Actor의 최종 title에 5.8이 확인되었다. `genindex.html`도 `/genindex`로 이동하며 **유효한 짧은 Sphinx index**였다. 6,344 bytes인 작은 응답이라고 빈 shell로 분류하면 안 된다. 글자별 index와 full-index 링크를 제공한다.

`objects.inv` symbol URI의 `$`는 해당 symbol name 치환 규칙으로 처리하고, fragment는 페이지와 symbol을 구분하는 데 보존해야 한다. docname 목록 확보는 열거 증거이며 11,678개 본문 분석 완료를 뜻하지 않는다. 이번에 Actor Python 페이지는 339,812 bytes를 확보했지만 본문 전체를 읽지 않았으므로 분석 완료로 세지 않았다.

## 버전·언어·리다이렉트

[매뉴얼 루트](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-documentation?application_version=5.8), [C++ 루트](https://dev.epicgames.com/documentation/en-us/unreal-engine/API?application_version=5.8), [Blueprint 루트](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI?application_version=5.8)의 title 및 SSR `applications`는 실제 5.8이었다. 최신 루트의 텍스트만 보고 전부 같은 버전이라 가정하지 않는다.

원본 href에는 locale와 version query가 없는 경우가 많다. 후보 identity는 `/documentation/unreal-engine/SLUG?application_version=5.8`로 정리하고 실제 요청에는 `en-us`를 붙였다. locale 없는 API/Runtime/Engine 및 BlueprintAPI 요청은 한번 HTTP 200이면서 document block이 없었고, 명시적 en-us 요청은 실제 본문을 반환했다. 이는 이번 요청의 관측 결과이며 언어 생략이 모든 빈 응답의 원인이라는 일반화는 하지 않는다. Canonical URL, 요청 URL, 최종 URL과 반환 locale/version을 따로 보관한다.

`API/Runtime/Engine/GameFramework/AActor`는 수동으로 시도한 잘못된 probe였다. 실제 작동한 타입 URL은 `API/Runtime/Engine/AActor`였다. `AActor/BeginPlay` 별도 URL도 수동 probe에서 본문 없는 HTTP 200이었다. 이름으로 멤버 URL을 만들어 전체 API로 추가하면 안 된다. `development-for-consoles-in-unreal-engine`도 수동 실패 probe이며, 검색으로 확인한 실제 입구는 `consoles-development-in-unreal-engine`다. 이 probe 실패를 공식 코퍼스 문서의 미해결 개수로 자동 합산하지 않는다.

`unreal-engine-5-migration-guide`는 5.8 주소에서도 초기 UE4→UE5 이행 규칙과 예전 도구/기능 deprecation 설명을 포함했다. 문서 버전 태그만으로 모든 문장에 최신 5.8 적용성을 부여하지 않고, 해당 문장의 원래 이행 대상·현행 기능별 자료를 함께 확인해야 한다. 이 페이지는 부분 검토였으므로 전체 검증 완료로 분류하지 않았다.

## 실제 읽은 개별 본문과 분석

아래 10개는 본문을 실제 읽고 직접 요약한 초기 검토 기록이다. 범주 선택으로 전체 기능 분석을 대체하지 않는다. `UK2Node`와 `UInputAction`은 독립 API 타입 페이지이며 단순 링크 목록을 읽은 것과 구분했다.

1. [UInputAction](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/UInputAction?application_version=5.8): UDataAsset 파생의 논리적 입력 행동이고 per-player `FInputActionInstance`를 갖는다. Triggered 통지, modifier/trigger 배열, 소비 우선순위, 일시정지 실행, 값 타입과 editor property 변경 갱신 계약을 확인했다. HBEngine 연구에는 물리키→논리행동→플레이어별 상태 및 재매핑의 분리가 필요하다는 근거가 된다. 아직 구현하지 않았다.
2. [UK2Node](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/BlueprintGraph/UK2Node?application_version=5.8): BlueprintGraph editor 모듈의 abstract node다. 메뉴 등록·연결 허용·컴파일 확장·검증·pure/latent·breakpoint·구조 변경·pin 재구성과 이전 연결 복구 API를 확인했다. 노드 UI를 그리는 것만으로 Blueprint 체계를 구현했다고 주장할 수 없고, compiler와 schema·재구성·디버깅 계약을 별도로 분석해야 한다.
3. [UK2Node::GetMenuActions](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/BlueprintGraph/UK2Node/GetMenuActions?application_version=5.8): node subclass가 action registrar에 spawner를 등록하는 확장점이다. 파생 override 목록과 K2Node.h 경로를 확인했다. **공식 페이지의 시그니처 파라미터는 `ActionRegistrar`인데 Parameters 표에는 `ActionListOut`이 남아 있어 일치하지 않는다.** 생성 API의 표현을 그대로 검증된 계약으로 수입하면 안 된다.
4. [EInputActionValueType](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/EInputActionValueType?application_version=5.8): InputActionValue.h와 bool/float/Vector2D/Vector display labels가 나온다. **Syntax 및 Values 표가 실제 enumerator names 대신 `UMETA`를 네 번 반복한다.** 공식 페이지 내부의 생성/표현 결함이고, 실제 enum 이름·값은 이 페이지만으로 검증되지 않았다. 추정으로 보완하지 않았다.
5. [Enhanced Input plugin descriptor](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/EnhancedInput?application_version=5.8): EnhancedInput.uplugin, Input category, EnhancedInput/InputBlueprintNodes/InputEditor 세 모듈, Data Validation 의존과 피의존 플러그인 목록을 확인했다. 런타임 입력과 editor node/설정 도구를 한 모듈로 오해하지 않아야 한다.
6. [Destroy Actor Blueprint action](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Actor/DestroyActor?application_version=5.8): Actor target과 exec In/Out pin contract를 확인했다. 객체 수명 관련 상세 runtime 규칙은 짧은 이 노드 페이지에 설명되지 않으므로 C++ Destroy/lifetime 매뉴얼과 교차 확인할 과제로 남겼다.
7. [Add Mapping Context Blueprint action](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Input/AddMappingContext?application_version=5.8): Enhanced Input Subsystem Interface target, Mapping Context object, integer Priority, Options struct, exec 흐름을 확인했다. 높은 priority와 input consume의 조합이 낮은 우선순위 mapping을 차단한다. 노드 pin 표를 읽은 증거이며 해당 struct와 subsystem 전체 분석을 대신하지 않는다.
8. [Python introduction](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/introduction.html?application_version=5.8): PythonScript Plugin을 통해 Unreal Editor를 자동화하는 API라는 설명을 확인했다. runtime gameplay 언어 지원으로 확대 해석하지 않는다. Sphinx 전체 API에 editor automation의 목적을 별도로 기록한다.
9. [ScopedEditorTransaction Python API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/ScopedEditorTransaction.html?application_version=5.8): constructor의 Text/str 설명과 context manager `__enter__`, `__exit__`, `cancel()` API를 확인했다. authoring command의 undo transaction scope를 연구하는 실제 API 근거다. exception 처리·nested transaction 의미는 이 짧은 페이지에서 검증하지 못했다.
10. [PlayStation 5 공개 안내](https://dev.epicgames.com/documentation/en-us/unreal-engine/development-for-playstation-5-in-unreal-engine?application_version=5.8): 공개 landing 자체는 `entitlement=none`이다. 실제 console 문서는 NDA·승인 권한을 필요로 하며 private development forum의 다운로드 형태라고 안내한다. 공개 landing을 읽었다고 제한된 console 본문을 읽은 것으로 계산하지 않는다.

별도로 루트/카테고리/21개 매뉴얼 상위 문서를 확보하고 구조를 검사했으며, Modules 매뉴얼에서는 Build.cs dependency graph·Public/Private 노출·Runtime/Editor target·loading phase·platform 조건을, Plugins에서는 source/content·descriptor·계층별 의존을 부분 검토했다. 모든 코드·이미지·표·하위 링크에 대한 분석과 독립 검증은 완료하지 않아 10개 본문 초기 검토 수에 추가하지 않았다.

## 공개성 및 정확성의 미해결 범위

- [Blueprint API root](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI?application_version=5.8)는 publisher가 reference의 불완전성과 최신성이 보장되지 않는다는 한계를 직접 밝힌다. 공개 자료 전부를 분석하는 완료와 실제 엔진 전체 노드/API 완전성을 검증하는 완료는 구분해야 한다.
- sitemap 첫 shard 6개와 public TOC/document JSON이 미확보다. SSR 순회가 닫혀도 orphan/unlinked/restricted/version mismatch를 sitemap과 대조하지 못하면 전체 공개 코퍼스의 닫힌 manifest를 증명할 수 없다.
- `ue_noderef_api_external`은 공개 index에서 확인한 소스 이름만 알고 있다. 해당 페이지가 Niagara/EQS 등의 어느 체계인지 확정하지 않았다.
- 클라이언트가 광고하는 [WebAPI](https://dev.epicgames.com/documentation/en-us/unreal-engine/WebAPI?application_version=5.8)는 이번에 HTTP 200이나 본문 없는 shell이었다. 현재 지원/다른 버전/이동 여부를 확인해야 한다.
- EInputActionValueType의 UMETA 반복과 GetMenuActions의 parameter 이름 불일치는 독립 확인 전까지 unresolved source issue다. metadata/본문의 확보와 API 계약 검증은 다르다.
- private platform 자료의 실제 목록·본문·API는 확보하지 않았다. 권한이 없다는 이유로 자동 면제한 완료 판정을 하지 않는다.

## 캐시와 재현

원본/full text는 `.gitignore`의 `native/build/` 아래 **`native/build/reference-cache/unreal/`**에만 저장했다. Git에 본문을 복제하지 않는다. 이 조사 문서에는 metadata, 링크와 직접 쓴 분석만 남겼다.

- `sitemap.raw`, `sitemap-shards.json`: 공개 sitemap index 원본과 전체/Unreal shard 주소.
- `root.raw`, `api.raw`, `blueprint.raw`, 각각의 `*-state.json`: 공식 SSR 원본과 payload.
- `app.raw.js`: 공개 documentation client의 API 호출 구조 증거.
- `inspect_epic.py`: standard library 기반 백그라운드 SSR 수집기. 실제 body 없는 shell/권한/버전 mismatch는 구별한다. 자동 분석 완료를 찍지 않는다.
- `ssr-manifest.json`, `inspection-manifest.json`, `scope-manifest.json`, `combined-manifest.json`: 요청/final URL, UTC 시각, HTTP status, raw SHA-256, byte count, metadata, child links, unread 상태. `combined-manifest`는 후보집합이며 closure `open`이다.
- `pages/<URL-SHA256>.html`, `.json`: 각 응답과 추출된 본문/metadata.
- `python-pages.json`: 5.8 Sphinx docnames/filenames/titles. `python-symbol-inventory.json`: zlib inventory 실제 해제 결과.
- `python-*.raw`, `python-sample-metadata.json`: Python root/index/inventory/sample 원본 및 검증 metadata.

완료 조건은 별도 통합 조사 원장의 **공식 범위가 닫힌 manifest, 모든 해당 본문/표/코드/API의 분석, 독립 검증, 미해결 버전/권한/소스 오류 0건**이다. 이 문서와 raw 캐시의 존재는 그 조건을 충족하지 않는다.

## 요청별 metadata 증거

아래 표는 실제 요청별 metadata다. 본문 검토/검증 완료 표시가 아니다. 링크는 canonical 후보 주소이며 요청에 `en-us`를 붙인 이력과 최종 URL은 캐시에 남아 있다.

| 제목 / canonical URL | HTTP / body | source | id / revision_hash_id | updated_at | child href |
|---|---|---|---|---|---:|
| [AssetTools](https://dev.epicgames.com/documentation/unreal-engine/API/Developer/AssetTools?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4845334 / BewWqK | 2026-06-16T20:02:13.185Z | 73 |
| [Developer](https://dev.epicgames.com/documentation/unreal-engine/API/Developer?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4845205 / 9ABdVY | 2026-06-16T20:02:10.180Z | 109 |
| [UK2Node::GetMenuActions](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/BlueprintGraph/UK2Node/GetMenuActions?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4850283 / Qnd37L | 2026-06-16T20:04:06.867Z | 65 |
| [UK2Node](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/BlueprintGraph/UK2Node?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4850280 / 83ok0M | 2026-06-16T20:04:06.685Z | 109 |
| [BlueprintGraph](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/BlueprintGraph?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4850054 / MzVYa6 | 2026-06-16T20:04:01.250Z | 216 |
| [Editor](https://dev.epicgames.com/documentation/unreal-engine/API/Editor?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4849378 / bzXLlX | 2026-06-16T20:03:45.306Z | 139 |
| [Enhanced Input](https://dev.epicgames.com/documentation/unreal-engine/API/PluginIndex/EnhancedInput?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4859035 / BewpJq | 2026-06-16T20:07:26.893Z | 19 |
| [EInputActionValueType](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/EnhancedInput/EInputActionValueType?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4875580 / Qnd9PL | 2026-06-16T20:13:38.423Z | 3 |
| [UInputAction](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/EnhancedInput/UInputAction?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4875755 / q0Lnvz | 2026-06-16T20:13:42.557Z | 16 |
| [EnhancedInput](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/EnhancedInput?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4875578 / d7AzDQ | 2026-06-16T20:13:38.215Z | 96 |
| [Plugins](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4859625 / 83ol7r | 2026-06-16T20:07:40.438Z | 1375 |
| [Core](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Core?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4931421 / 7A0z2B | 2026-06-16T20:34:24.984Z | 2915 |
| [UObject](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/CoreUObject/UObject?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4943955 / 0PmEML | 2026-06-16T20:38:59.406Z | 2140 |
| [API/Runtime/Engine/AActor/BeginPlay](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor/BeginPlay?application_version=5.8) | 200 / failed | - | - / - | - | 0 |
| [AActor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AActor?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4945127 / O96YLV | 2026-06-16T20:39:25.767Z | 493 |
| [API/Runtime/Engine/GameFramework/AActor/BeginPlay](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/GameFramework/AActor/BeginPlay?application_version=5.8) | 200 / failed | - | - / - | - | 0 |
| [API/Runtime/Engine/GameFramework/AActor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/GameFramework/AActor?application_version=5.8) | 200 / failed | - | - / - | - | 0 |
| [Engine](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4945128 / n0oWp9 | 2026-06-16T20:39:25.794Z | 6420 |
| [Runtime](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4922570 / DevVQe | 2026-06-16T20:31:06.870Z | 246 |
| [Unreal Engine C++ API Reference](https://dev.epicgames.com/documentation/unreal-engine/API?application_version=5.8) | 200 / fetched | ue_cpp_api_external | 4845203 / YYOleb | 2026-06-16T20:02:10.181Z | 2719 |
| [Destroy Actor](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Actor/DestroyActor?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4788562 / 3Ov90K | 2026-06-16T18:29:50.053Z | 2 |
| [Actor](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Actor?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4788561 / ANnG4v | 2026-06-16T18:29:50.059Z | 32 |
| [Editor Scripting](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/EditorScripting?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4795755 / q0MlE1 | 2026-06-16T18:34:12.818Z | 43 |
| [Add Mapping Context](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Input/AddMappingContext?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4798947 / r2Mb14 | 2026-06-16T18:35:55.747Z | 2 |
| [Input](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Input?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4798946 / XYnxmD | 2026-06-16T18:35:55.752Z | 108 |
| [Math](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Math?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4803284 / QnvVK5 | 2026-06-16T18:37:33.656Z | 31 |
| [Utilities](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Utilities?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4813823 / 83JgBl | 2026-06-16T18:41:30.504Z | 106 |
| [Unreal Engine Blueprint API Reference](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI?application_version=5.8) | 200 / fetched | ue_blueprint_api_external | 4788315 / 41NX6D | 2026-06-16T18:29:40.447Z | 889 |
| [Unreal Engine Python API Documentation](https://dev.epicgames.com/documentation/unreal-engine/PythonAPI?application_version=5.8) | 200 / fetched | ue_python_api_external | 4788307 / a7MApP | 2026-06-16T18:13:39.630Z | 1 |
| [WebAPI](https://dev.epicgames.com/documentation/unreal-engine/WebAPI?application_version=5.8) | 200 / failed | - | - / - | - | 0 |
| [AI Features, Tools, and Plugins](https://dev.epicgames.com/documentation/unreal-engine/ai-features-tools-and-plugins-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 4787921 / ANKPDv | 2026-08-04T19:08:33.613Z | 3 |
| [Animating Characters and Objects](https://dev.epicgames.com/documentation/unreal-engine/animating-characters-and-objects-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3230659 / VzvA4P | 2025-08-18T08:00:07.463Z | 7 |
| [Blueprints Visual Scripting](https://dev.epicgames.com/documentation/unreal-engine/blueprints-visual-scripting-in-unreal-engine?application_version=5.8) | 200 / fetched | external | 3227503 / aL9Pn | 2025-03-24T03:18:16.922Z | 11 |
| [Building Virtual Worlds](https://dev.epicgames.com/documentation/unreal-engine/building-virtual-worlds-in-unreal-engine?application_version=5.8) | 200 / fetched | external | 3224463 / k5kk1 | 2025-03-22T19:32:44.829Z | 13 |
| [Consoles](https://dev.epicgames.com/documentation/unreal-engine/consoles-development-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3236270 / xaB5r3 | 2025-08-08T18:30:03.262Z | 5 |
| [Creating User Interfaces](https://dev.epicgames.com/documentation/unreal-engine/creating-user-interfaces-with-umg-and-slate-in-unreal-engine?application_version=5.8) | 200 / fetched | external | 3232310 / KXVEn | 2025-03-25T09:36:24.693Z | 12 |
| [Creating Visual Effects](https://dev.epicgames.com/documentation/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine?application_version=5.8) | 200 / fetched | external | 3226869 / 4dgmb | 2025-03-23T21:31:49.588Z | 8 |
| [Designing Visuals, Rendering, and Graphics](https://dev.epicgames.com/documentation/unreal-engine/designing-visuals-rendering-and-graphics-with-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3225669 / 53K8V9 | 2025-05-06T07:00:06.319Z | 60 |
| [development-for-consoles-in-unreal-engine](https://dev.epicgames.com/documentation/unreal-engine/development-for-consoles-in-unreal-engine?application_version=5.8) | 200 / failed | - | - / - | - | 0 |
| [PlayStation 5](https://dev.epicgames.com/documentation/unreal-engine/development-for-playstation-5-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3236550 / 2L7WkN | 2025-11-07T16:40:09.350Z | 0 |
| [Downloading Unreal Engine Source Code from GitHub](https://dev.epicgames.com/documentation/unreal-engine/downloading-source-code-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3228589 / WNnlYM | 2026-01-14T20:00:04.203Z | 5 |
| [Gameplay Systems](https://dev.epicgames.com/documentation/unreal-engine/gameplay-systems-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3228778 / Vzpb0P | 2025-06-03T13:00:06.304Z | 36 |
| [Gameplay Tutorials](https://dev.epicgames.com/documentation/unreal-engine/gameplay-tutorials-for-unreal-engine?application_version=5.8) | 200 / fetched | external | 3230199 / Ok57X | 2025-03-24T20:09:06.213Z | 8 |
| [Mobile Development](https://dev.epicgames.com/documentation/unreal-engine/getting-started-with-mobile-development-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 4788193 / GEe5pz | 2026-06-17T21:00:09.048Z | 70 |
| [Motion Design](https://dev.epicgames.com/documentation/unreal-engine/motion-design-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3232789 / q0EGvn | 2025-11-12T17:00:14.286Z | 6 |
| [Plugins](https://dev.epicgames.com/documentation/unreal-engine/plugins-in-unreal-engine?application_version=5.8) | 200 / fetched | external | 3234479 / GpvOA | 2025-03-25T18:42:25.584Z | 1 |
| [Programming with C++](https://dev.epicgames.com/documentation/unreal-engine/programming-with-cplusplus-in-unreal-engine?application_version=5.8) | 200 / fetched | external | 3227217 / m19xB | 2025-03-24T02:00:11.002Z | 8 |
| [Samples and Tutorials](https://dev.epicgames.com/documentation/unreal-engine/samples-and-tutorials-for-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3236691 / xaraD7 | 2025-09-15T10:00:04.951Z | 5 |
| [Setting Up Your Production Pipeline](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-production-pipeline-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3234026 / DeBQn3 | 2026-09-29T21:00:04.241Z | 17 |
| [Sharing and Releasing Projects](https://dev.epicgames.com/documentation/unreal-engine/sharing-and-releasing-projects-for-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 4787866 / n0eN3M | 2026-08-26T14:42:12.962Z | 34 |
| [Testing and Optimizing Your Content](https://dev.epicgames.com/documentation/unreal-engine/testing-and-optimizing-your-content?application_version=5.8) | 200 / fetched | epic_developer_community | 3234759 / n0o913 | 2026-09-25T21:00:11.810Z | 16 |
| [Understanding the Basics](https://dev.epicgames.com/documentation/unreal-engine/understanding-the-basics-of-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3222141 / 9Ape8L | 2026-06-12T21:00:06.262Z | 52 |
| [Unreal Engine 5.8 Documentation](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-documentation?application_version=5.8) | 200 / fetched | epic_developer_community | 4787790 / 6pz82G | 2026-05-12T21:00:05.005Z | 21 |
| [Unreal Engine 5 Migration Guide](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-migration-guide?application_version=5.8) | 200 / fetched | external | 3222114 / 4dBQ7 | 2025-03-22T04:10:31.491Z | 1 |
| [Unreal Engine Modules](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-modules?application_version=5.8) | 200 / fetched | epic_developer_community | 3228447 / 0PNrAd | 2026-02-19T22:00:18.081Z | 4 |
| [What's New](https://dev.epicgames.com/documentation/unreal-engine/whats-new?application_version=5.8) | 200 / fetched | epic_developer_community | 3222043 / a7evb8 | 2026-06-12T21:00:06.241Z | 4 |
| [Working with Audio](https://dev.epicgames.com/documentation/unreal-engine/working-with-audio-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3232788 / kbnbkA | 2026-08-26T13:46:26.166Z | 15 |
| [Working with Content](https://dev.epicgames.com/documentation/unreal-engine/working-with-content-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3223199 / GEndBA | 2026-05-19T17:30:07.339Z | 17 |
| [Working with Media](https://dev.epicgames.com/documentation/unreal-engine/working-with-media-in-unreal-engine?application_version=5.8) | 200 / fetched | epic_developer_community | 3233207 / NpVO2p | 2026-09-30T21:00:05.026Z | 20 |
