# Unity 공식 문서 코퍼스 조사와 실제 본문 계약 분석

조사일은 2026-10-04 KST예요. 기본 엔진 판본은 기존 인덱스와 같은 **Unity 6.0 / 6000.0, 영어**예요. 아래 숫자는 발견·수집·읽기·분석을 구별해요. 엔진 기능 구현, HBEngine 실행, 전면 창 조작은 하지 않았어요. 문서 원문과 배포 ZIP은 Git에서 이미 제외된 `native/build/reference-cache/unity-discovery/`에만 보관해요.

**전체 Unity 분석은 아직 완료되지 않았어요.** 이 작업은 기본 코퍼스 확보, 패키지 문서 범위 확장, 실제 기술 본문 20개 URL의 텍스트 계약 분석을 했어요. 범위·패키지 상태 설명 2개 URL과 Entities 1.3 보조 본문 2개 URL도 읽었어요. 다운로드된 수만 개 문서를 분석 완료로 올리지 않았어요. 실행 순서·ECS 도표의 선 연결 등 시각적 세부, 링크된 하위 계약, 대부분의 API와 모든 모듈별·전체 overload 분모는 미확정이에요. Unity 6.2 기존 연구는 이 기본 판본과 합치지 않아요.

## 1. 공식 배포물과 동일 판본 확인

[Offline documentation](https://docs.unity3d.com/6000.0/Documentation/Manual/OfflineDocumentation.html)의 실제 설명은 오프라인 ZIP에 Manual과 Scripting API가 들어간다는 사실을 확인해 줘요. 페이지의 약 300MB 표기는 근사치이고, 실제 응답은 **392,108,580 bytes**예요.

- 공식 ZIP: [UnityDocumentation.zip](https://cloudmedia-docs.unity3d.com/docscloudstorage/en/6000.0/UnityDocumentation.zip)
- ZIP SHA-256: `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`
- 응답 Last-Modified: `2026-10-02 00:05:08 UTC`
- GCS generation: `1790899507994661`; ETag: `0ba59399fd1029028093f39c25463c79`
- 문서 footer: build job `76410965`, built `2026-09-29`. 배포 파일 수정일과 문서 내용 빌드일은 달라요.
- ZIP 전체 37,452 entries; `ZipFile.testzip()` 전체 CRC 검증 통과.
- 모든 HTML 34,834개와 4개 TOC/search JS를 추출했어요. 추출한 총 34,838 파일은 590,522,692 uncompressed bytes예요. 기타 이미지·스타일·스크립트는 ZIP에 보존되고, 연구에 필요한 그림 4개만 추가 추출했어요.
- 오프라인 경로: `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/`.

| 기본 코퍼스 | HTML 파일 | 검색 index 고유 URL | 검색 본문 중 ZIP에 존재 | 추가 사항 |
|---|---:|---:|---:|---|
| Manual | 3,124 | 3,122 | 3,122 | HTML 추가 2개는 `index.html`, `30_search.html` |
| Scripting API | 31,710 | 31,709 | 31,707 | 검색 없는 HTML 3개는 `index.html`, `30_search.html`, `LeaveFeedback.html`; 검색에 있으나 파일 없는 API 2개 |

온라인·ZIP의 Manual 및 API TOC/search JS SHA-256은 각각 일치해요. 웹 HTML에는 `<base href=...>`가 추가되므로 **웹 raw HTML hash와 ZIP raw HTML hash를 동일하다고 취급하지 않아요**. 실제 읽은 기본 본문 14개는 이 web base element 하나만 제거하면 ZIP 본문과 모두 정확히 일치했어요. 검증 목록은 `reviewed-core-body-equivalence.json`에 있어요.

## 2. 정확한 발견용 엔드포인트

| 공식 엔드포인트 | 확인 결과 | 용도와 한계 |
|---|---|---|
| [Manual TOC](https://docs.unity3d.com/6000.0/Documentation/Manual/docdata/toc.js) | 200, 295,812 bytes; 3,127행, 3,122 고유 URL | 5개 중복 링크가 있어요. 제목 수를 본문 분석 수로 바꾸면 안 돼요. |
| [Manual search index](https://docs.unity3d.com/6000.0/Documentation/Manual/docdata/index.js) | 200, 14,249,846 bytes; 3,122 고유 URL | 이 판본은 TOC URL 집합과 일치해요. |
| [Scripting API TOC](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/docdata/toc.js) | 200, 414,891 bytes; 4,037 고유 URL | namespace/class 중심이라 메서드·속성을 거의 포함하지 않아요. |
| [Scripting API search index](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/docdata/index.js) | 200, 8,243,017 bytes; 31,713행, 31,709 고유 URL | TOC에 없는 27,673 URL을 추가 발견했어요. 중복 URL 3종, 중복 행 4개가 있어요. |
| `Manual/docdata/global_toc.js` | 404 | 페이지 template의 script 참조가 존재해도 파일 존재를 보장하지 않아요. |
| `ScriptReference/docdata/global_toc.js`, `global_index.js` | 404 | 이 파일들을 완전성의 근거로 쓰지 않아요. |

Manual/search index SHA-256은 `91fb9f259e1949ab1c71905af30d63eeb2dea3347d87f3c0bae3659b9741865f`, API/search index는 `6ab0bc0e394b240e748089b42ad9f8355016f27d994f420b6dae67f8c4ef9c0b`예요. Manual/TOC는 `833c0328442b8fc3f1729a9b263fcbc1d884a75dd62b3eaaef6192b8b580c4e8`, API/TOC는 `df402ee6f7bb5920c2b2186a78d1222500070f31087e2a3d1aed6308e3927e24`예요.

TOC의 top-level API 항목은 UnityEngine 2,301, UnityEditor 1,336, Unity 400개예요. **이는 API 전체의 모듈별 분모가 아니에요.** search의 메서드·속성 페이지를 namespace/module과 매핑하고 overload·enum value·조건부 platform 계약까지 구별하는 작업은 남아 있어요.

검색·TOC 합집합 기본 문서 URL은 Manual 3,122 + API 31,710 = **34,832개**예요. 이 중 실제 기술 HTML은 34,829개 수집됐고 3개는 아래처럼 공식 온라인·ZIP에서 빠져 있어요.

| 미수집 API URL | 실제 확인 |
|---|---|
| [GraphicsFormat.D32_SFloat_S8_UInt](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Experimental.Rendering.GraphicsFormat.D32_SFloat_S8_UInt.html) | search index 존재, ZIP 파일 없음, 직접 공식 URL 404 |
| [GraphicsFormat.S8_UInt](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Experimental.Rendering.GraphicsFormat.S8_UInt.html) | search index 존재, ZIP 파일 없음, 직접 공식 URL 404 |
| [Android.UserBuildSettings](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Android.UserBuildSettings.html) | TOC만 존재, search index·ZIP 파일 없음, 직접 공식 URL 404 |

이 3개는 정확한 indexed URL 기준 `unreachable_404`로 남겨요. 두 GraphicsFormat은 별도로 indexed된 [D32_SFloat_S8_Uint](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Experimental.Rendering.GraphicsFormat.D32_SFloat_S8_Uint.html), [S8_Uint](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Experimental.Rendering.GraphicsFormat.S8_Uint.html) URL이 ZIP에 있고 직접 요청도 200이에요. 그 본문 heading은 `_UInt` 계약을 표시해요. 따라서 두 경우는 계약 자체가 사라졌다는 증거가 아니라 **대소문자 다른 URL alias/index 불일치**예요. Windows의 case-insensitive `Path.is_file()`만 사용하면 잘못된 `_UInt` URL까지 수집 완료로 표시하는 오류가 발생해요. 통합 manifest는 ZIP entry의 정확한 case를 기준으로 3개 404를 유지하고 대체 URL을 따로 기록했어요. Android.UserBuildSettings의 대체 본문은 아직 못 찾았어요.

## 3. 전체 Manual 분야별 발견 범위

아래 숫자는 각 top-level section 내부 고유 URL 수예요. section 간 5개 중복이 있으므로 합산값 3,127은 전역 고유 3,122와 달라요. **이 표 전체의 상태는 발견·수집 완료, 본문 분석은 대부분 unread**예요.

| 분야 | 고유 URL | 분야 | 고유 URL |
|---|---:|---|---:|
| Unity 6.0 User Manual | 4 | What's new in Unity | 5 |
| Get started | 45 | Upgrade Unity | 8 |
| Unity Building Blocks | 14 | Unity Editor interface | 114 |
| Packages and package management | 261 | Assets and media | 110 |
| 2D game development | 156 | XR | 35 |
| Multiplayer | 1 | Platform development | 361 |
| GameObjects | 56 | Scenes | 42 |
| Cameras | 82 | World building | 49 |
| Physics | 97 | Input | 8 |
| UI systems | 292 | Animation | 65 |
| Audio | 62 | Video and cutscenes | 29 |
| Lighting | 166 | Materials and shaders | 430 |
| Visual effects | 101 | Render pipelines | 132 |
| Post-processing | 38 | Programming in Unity | 153 |
| Optimization | 167 | Building and publishing | 24 |
| Unity Services | 1 | Best practice guides | 15 |
| Troubleshooting | 1 | Glossary | 1 |

이러한 분포는 UI·물리 같은 선호 분야만 분석해도 전체 엔진 분석을 충족하지 못한다는 근거예요. render pipelines·platform·shaders·services 등을 그대로 후속 읽기 목록에 보존해요.

## 4. 공식 패키지 문서 범위

[Packages](https://docs.unity3d.com/6000.0/Documentation/Manual/Packages-all.html), [Released packages](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-safe.html), [Pre-release packages](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-preview.html), [Core packages](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-core.html), [Built-in packages](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-build.html)의 설명과 링크를 확인했어요. 설명 부분을 읽고 링크를 추출한 것이며, 나열된 모든 패키지 본문을 분석했다는 뜻은 아니에요.

- released/prerelease/core의 직접 DocFX 링크에서 111개 `package@major.minor` root를 발견했어요.
- 6000.0 Manual의 `com.unity.*`, `com.havok.*` 요약 페이지 159개를 모두 수집하고 링크를 확장해 222 roots로 늘렸어요. 이 단계는 요약 본문 분석이 아니라 링크 탐색이에요.
- URP 17.0 Manual은 엔진 Manual 안에 통합돼 있지만 [URP API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/index.html)는 별도 package root에서 실제 200이에요. 이를 추가해 **223 roots / 112 package names**가 됐어요. URP의 같은 package root `/manual/index.html`은 실제 404예요.
- 223개 root의 `index.json`을 모두 200으로 수집·JSON 파싱했어요. 고유 href 총 **59,261개**: `api/` 48,656, `manual/` 9,606, 나머지 999개는 changelog/license/landing 등이에요. 이 숫자는 서로 다른 package edition을 합산한 발견 분모예요.
- 초기 111-root 발견 분모는 27,331개(API 22,487 / Manual 4,349)였어요. 223-root로 확장한 이력을 보존해요. 작은 이전 분모로 전체 완료율을 계산하지 않아요.
- DocFX `index.json`의 `keywords`에는 검색용으로 정규화된 본문 텍스트가 들어 있어요. 원문 HTML·그림·정확한 section/anchor와 동일하다고 검증하지 않았어요. 따라서 검색 text 확보를 HTML 페이지 전체 분석으로 승격하지 않아요.
- 각 package의 공식 `/Packages/metadata/{name}/versions.json`과 `metadata.json`도 112 names 모두 수집했어요. 영어 문서 edition은 합계 **1,558개** 발견됐어요. 이번 223 roots 밖의 edition은 대부분 미수집·미분석이고, 알려진 package names 자체가 전 세계 모든 공식 package names의 완전한 목록인지도 미확정이에요.
- 버전 별칭은 변할 수 있어요. 실제 root 본문은 Entities `@1.4` → **1.4.8**, Addressables `@4.1` → **4.1.0**, Input System `@1.20` → **1.20.0**으로 표시돼요. `@latest` 또는 metadata의 `dist-tags.latest`를 엔진 판본으로 자동 대체하지 않아요. Entities metadata의 dist-tag가 오래된 preview를 가리키는 실제 사례가 있어요.

Entities 1.3에서 아래 구조도 실제 응답을 확인했어요. [root TOC](https://docs.unity3d.com/Packages/com.unity.entities@1.3/toc.html)는 Manual/API/changelog/license 분기만 제공해요. [Manual TOC](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/toc.html), [API TOC](https://docs.unity3d.com/Packages/com.unity.entities@1.3/api/toc.html), [xrefmap](https://docs.unity3d.com/Packages/com.unity.entities@1.3/xrefmap.yml), [search index](https://docs.unity3d.com/Packages/com.unity.entities@1.3/index.json)를 실제 수집했어요. API TOC만 해도 1,031,271 bytes이고 xrefmap은 3,336,337 bytes예요. xref의 UID는 page URL·overload·anchor와 같지 않으므로 UID 수를 API 페이지 분석 수로 세면 안 돼요. **223 roots 전체의 TOC/xrefmap 수집은 아직 하지 않았어요.**

[Experimental packages](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-exp.html)의 본문 계약은 hidden package가 official registry에 있어도 일반 Package Manager 목록에 안 보일 수 있다는 점이에요. 일부는 다른 package의 지원 dependency이고, 설치돼 있으면 나타날 수 있어요. 이 때문에 released 표만으로 실험 패키지가 없다고 판단할 수 없어요. 이 페이지는 전체 설명 텍스트를 읽었고 경고 그림의 시각 검토는 남아 있어요.

공식 registry에서 개별 `/com.unity.entities` metadata는 200이지만 `/-/all`, `/-/v1/search?text=&size=250`은 404였어요. `/Packages/manifest.json`도 404예요. 실패한 경로를 전체 패키지 목록으로 간주하지 않아요.

## 5. 실제로 읽고 분석한 기술 본문 20개 URL

아래 분석은 실제 본문 설명·signature·parameter·return·예제 코드를 읽은 결과예요. 각 원문의 링크를 붙이고, HBEngine에 관한 판단은 **후속 설계 시의 추론**으로 구별해요. 코드 구현이나 Unity runtime 검증을 했다는 주장이 아니에요. `.meta.json`에 raw hash·응답 header·최종 URL이 있고 `.html.txt`에 읽기에 사용한 private 추출 텍스트가 있어요.

### 5.1 Runtime 실행·객체 수명

1. [Event function execution order](https://docs.unity3d.com/6000.0/Documentation/Manual/execution-order.html), 6000.0: lifecycle 도식은 전체 PlayerLoop의 일부만 보여줘요. `sceneLoaded`는 해당 scene의 OnEnable 뒤·Start 앞이에요. Editor static 초기화와 runtime 초기화는 다른 진입점이고, runtime에는 load type별 제어가 있어요. Built-in pipeline의 camera callbacks를 SRP에 그대로 적용할 수 없어요. `.NET Task`는 Update phase에 재개하지만 coroutine·Awaitable은 대기 종류에 따라 달라지고 서로의 정확한 순서는 보장되지 않아요. 동일 MonoBehaviour의 여러 instance 사이 순서도 설정할 수 없어요. **추론:** 이벤트 종류·phase·instance ordering·pipeline 조건을 각각 표현해야 해요. 본문 전체 텍스트와 SVG 내부 문구를 읽었지만 도표 edge 연결은 시각 검증하지 않았어요. 요청한 옛 `ExecutionOrder.html`은 canonical `execution-order.html`로 redirect됐어요.
2. [MonoBehaviour.Awake](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Awake.html), 6000.0: active hierarchy의 초기화·활성화·Instantiate가 호출 조건이고 `Behaviour.enabled`와 별개예요. script instance당 1회이며 additive scene 재생성은 별도 instance예요. GameObject간 Awake 순서는 비결정적이에요. Awake exception은 component를 disable해요. coroutine은 될 수 없고 constructor 시 serialized state는 정의되지 않아요. **추론:** component enabled와 hierarchy active를 하나의 flag로 합치면 초기화 계약이 깨져요.
3. [Object.Destroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Destroy.html), 6000.0: 실제 제거는 현재 Update가 끝난 뒤 rendering 전에 지연돼요. GameObject 제거는 components와 transform children까지 포함하지만 component 제거는 그 component만 포함해요. delay는 호출 시점부터 시작해 timeScale 영향을 받아요. 호출자의 disable/destroy로 예정 제거가 취소되지 않고 null/already destroyed는 안전하게 처리돼요. **추론:** 즉시 container erase만으로는 수명 계약을 재현하지 못해요.
4. [Object.Instantiate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Instantiate.html), 6000.0: 본문에 있는 13 overload의 scene·parent·world/local pose·InstantiateParameters·generic 반환을 확인했어요. component를 복제하면 소유 GameObject와 children도 복제해요. original active state를 보존하고 active hierarchy의 clone만 Awake/OnEnable을 호출해요. parent만 주는 overload는 원본 pose를 새 parent 기준 local 값으로 해석해요. prefab 연결을 만들지 않으며 과도한 재귀 복제는 stack 제한 예외가 있어요. **추론:** duplicate·prefab instantiation·scene 이동을 같은 조작으로 취급할 수 없어요.
5. [PlayerLoop.SetPlayerLoop](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoop.SetPlayerLoop.html), 6000.0: 새 loop에 포함된 system만 실행해요. GetCurrentPlayerLoop에는 변경이 즉시 보이지만 실행 순서 적용은 다음 전체 iteration이에요. 예제는 기존 system의 관련 값과 subsystem을 유지하면서 custom delegate를 삽입해요. **추론:** loop 교체의 관측 시점과 적용 시점은 별도 계약이에요.

### 5.2 직렬화·asset pipeline·physics

6. [Serialization rules](https://docs.unity3d.com/6000.0/Documentation/Manual/script-serialization-rules.html), 6000.0: Unity는 property 중심 일반 serializer가 아니라 field 조건을 적용해요. public/SerializeField이면서 static·const·readonly가 아니고 지원 type이어야 해요. dictionary·nested container 등은 기본 지원하지 않아요. UnityEngine.Object reference와 일반 custom class inline 값은 달라요. SerializeReference는 null·공유 identity·cycle·polymorphism을 지원하되 registry 비용이 있어요. NonSerialized와 HideInInspector도 다른 계약이에요. 자동 property backing field는 hot reload 때만 특별 취급돼요. **추론:** scene 저장·Inspector 노출·hot reload 상태를 하나의 동일 serializer로 가정하면 안 돼요.
7. [Introduction to assets](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetWorkflow.html), 6000.0: source asset과 runtime용 imported representation을 Asset Database가 관리해요. Assets 추가·script import·Accelerator·AssetBundle·asset package는 다른 작업 목적이에요. runtime loading에는 Addressables를 권장하며 Resources에는 성능 비용 설명이 있어요. cloud storage를 project 저장 방식으로 사용하는 것은 본문에서 unsupported workflow로 설명돼요. **추론:** 원본 파일을 runtime cache와 동일한 영구 데이터로 취급하지 않아야 해요. 현재 프로젝트 저장 위치를 이 연구만으로 변경하지 않았어요.
8. [Refreshing the Asset Database](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetDatabaseRefreshing.html), 6000.0: scan → code import/compile → 조건부 domain reload → code postprocess → non-code import/postprocess → hot reload 순서예요. native importer는 scripted importer보다 먼저 처리돼요. import 도중 file 생성·timestamp 변경·queued refresh·assembly reload 등은 루프 재시작 조건이에요. static dependency는 importer/version/build target 같은 미리 알려진 값이고 dynamic dependency는 import 내용과 조건부 global state에서 발견돼요. hot reload는 serializable field를 복원하지만 비직렬화 상태를 잃고 private field에 특별 규칙이 있어요. **추론:** 단순 file watcher callback만으로 import cache·dependency invalidation·refresh restart를 대신할 수 없어요.
9. [Physics.Simulate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.Simulate.html), 6000.0: Script simulation mode에서 collision·rigidbody/joint integration·callbacks를 진행하지만 FixedUpdate를 호출하지 않아요. FixedUpdate는 별도 fixedDeltaTime cadence로 계속 호출돼요. variable framerate step은 결과 안정성을 해치며 큰 step은 정확도 문제를 낳아요. 예제 accumulator는 maximumDeltaTime 처리를 제외했다고 명시돼요. **추론:** physics tick과 script callback cadence를 분리해야 하고, 이 한 페이지를 cross-platform 완전 결정성의 증거로 쓰면 안 돼요.

### 5.3 Editor·prefab·build·scene·UI 계약

10. [Undo.RecordObject](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RecordObject.html), 6000.0: 변경 전에 복사하고 frame 끝에서 binary diff로 바뀐 property만 기록해요. no-op은 undo 항목을 만들지 않아요. parent 변경·AddComponent·destruction에는 전용 API가 필요해요. prefab instance는 추가 override 기록을 요구해요. **추론:** undo가 모든 command를 자동 포착한다고 가정할 수 없어요.
11. [RecordPrefabInstancePropertyModifications](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PrefabUtility.RecordPrefabInstancePropertyModifications.html), 6000.0: 직접 변경 뒤 prefab override를 기록해야 저장·재열기 때 변화가 남아요. 권장 SerializedObject/SerializedProperty 경로는 override와 Undo 통합을 제공해요. 예제는 변경 전 Undo → 값 변경 → override 기록 순서이며 선택 검증을 따로 해요. **추론:** Inspector 값 표시 성공과 scene persistence 성공은 다른 검증이에요.
12. [BuildPipeline.BuildPlayer](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/BuildPipeline.BuildPlayer.html), 6000.0: 4 overload를 읽었고 BuildPlayerOptions, BuildPlayerWithProfileOptions가 현대 경로예요. 반환 BuildReport의 성공·실패가 결과 판단 근거이고 Editor GameObject reference가 무효화돼 재획득해야 해요. define symbol 변경과 active platform symbol은 domain reload 전에는 갱신되지 않아 잘못된 target code가 빌드될 수 있어요. scenes가 비어 있는 legacy overload는 현재 열린 scene을 사용해요. **추론:** 산출물 파일 존재만으로 build target·compile configuration이 맞았다고 선언하면 안 돼요.
13. [SceneManager.LoadSceneAsync](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html), 6000.0: 4 overload는 name/index와 mode/parameters를 구분해요. Single은 기존 scenes를 unload하고 UnloadUnusedAssets를 자동 호출해요. 이름만 주면 첫 일치 scene을 선택하며 중복은 full path로 구별해야 해요. 이름 대소문자는 비구분이고 invalid scene은 exception이에요. AsyncOperation 완료는 요청 반환과 달라요. **추론:** scene request·identity resolution·activation 완료를 하나의 순간으로 합치면 안 돼요. activation 세부 API는 아직 읽지 않았어요.
14. [Introduction to visual elements and the visual tree](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-VisualTree.html), 6000.0: VisualElement는 layout/style/events를 가진 공통 tree node예요. EditorWindow와 runtime UIDocument의 root가 달라요. built-in control은 여러 node와 상태 logic을 조합할 수 있고 Toggle은 label/box/checkmark로 설명돼요. 두 PNG도 실제 확인했어요. sound/input 두 Box subtree가 렌더 결과 두 panel에 대응하고 체크 상태는 내부 checkmark 표현을 바꿔요. **추론:** 보이는 panel만 복제해서는 control state와 event 계약을 재현할 수 없어요.

### 5.4 기본 판본에서 참조한 package 본문

15. [Entities World concepts](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/concepts-worlds.html), **1.4.8**: entity ID는 world 안에서만 고유하며 World가 EntityManager와 systems를 소유해요. 같은 component set의 entity는 archetype에 모여 memory organization을 결정해요. 기본 world 자동 구성은 ICustomBootstrap 또는 disable defines로 바꿀 수 있지만 수동 모드에서는 world/system 생성과 PlayerLoop 삽입을 직접 책임져야 해요. **추론:** entity ID만으로 여러 world의 객체를 구별할 수 없어요.
16. [Entities System groups](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/systems-update-order.html), **1.4.8**: creation order와 update order를 별도 attribute로 제어해요. UpdateBefore/After는 같은 group의 direct siblings 사이에서만 적용되고 OrderFirst/Last가 우선해요. destruction은 실제 creation의 역순이에요. default groups는 Initialization 끝, Update 끝, PreLateUpdate 끝에 들어가요. manual creation은 create constraint 보장을 자동으로 받지 않아요. Editor Systems window는 full PlayerLoop 표시 옵션을 제공해요. **추론:** dependency graph 하나를 생성·update·파괴에 공유하면 다른 계약을 잃어요. 전체 텍스트는 읽었지만 두 diagram의 edge는 아직 시각 검증하지 않았어요.
17. [EntityCommandBuffer.Playback](https://docs.unity3d.com/Packages/com.unity.entities@1.4/api/Unity.Entities.EntityCommandBuffer.Playback.html), **1.4.8**: 기록한 operations를 EntityManager로 재생하는 overload와 ExclusiveEntityTransaction으로 재생하는 overload 두 개예요. **추론:** 기록 대상과 적용 시점/manager가 분리돼요. 이 짧은 페이지는 disposal·thread safety·playback policy의 전체 계약을 설명하지 않으므로 그 부분을 분석 완료로 처리하지 않아요.
18. [Input System Update Mode](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/manual/update-mode.html), **1.20.0**: dynamic·fixed·manual processing을 구별하고 XR BeforeRender/Editor updates는 별도예요. **추론:** engine tick 설정 하나로 입력·Editor·XR tracking 모두를 묶을 수 없어요. 잘못 추측한 `manual/UpdateMode.html`은 404였고 공식 index의 `manual/update-mode.html`로 수정해 실제 읽었어요.
19. [InputSettings.UpdateMode API](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/api/UnityEngine.InputSystem.InputSettings.UpdateMode.html), **1.20.0**: default는 Update 직전 dynamic processing이에요. dynamic 모드에서 FixedUpdate 조회, fixed 모드에서 Update 조회는 Editor/development에서 오류를 남기고 release에서는 해당 모드 상태를 반환해요. manual Update를 호출하지 않으면 event accumulation 또는 입력 손실이 가능해요. BeforeRender는 추가 state를 소비하지 않아요. **추론:** Manual의 세 mode 이름만 읽으면 build configuration에 따른 오류·fallback 차이를 놓쳐요.
20. [Addressables asynchronous handles](https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/AddressableAssetsAsyncOperationHandle.html), **4.1.0**: handle은 즉시 반환되지만 결과는 나중에 준비돼요. handle의 유지 기간은 결과 사용 기간과 연결되고 Release는 asset refcount를 내리면서 handle을 invalid하게 만들어요. 실패 operation도 handle instance를 release해야 해요. multi-asset load는 부분 성공 보존·전체 실패 정책이 따로 있어요. typed/typeless 변환에서 잘못된 type은 runtime exception이에요. **추론:** async 완료와 resource ownership을 분리하고 성공 경로와 실패 경로 모두 release를 다뤄야 해요. 각 coroutine/event/task 세부 하위 페이지는 아직 unread예요.

### 5.5 따로 보존한 보조 판본

[Entities 1.3 World concepts](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/concepts-worlds.html), [Entities 1.3 System groups](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/systems-update-order.html)의 전체 텍스트도 읽었어요. 실제 source version은 **1.3.15**예요. World identity와 group-local ordering의 기본 계약은 읽은 1.4.8과 같지만, 1.4.8 본문에는 full PlayerLoop 표시·MonoBehaviour 상대 실행 설명이 추가돼 있어요. 보조 판본 읽기 2개를 1.4.8 기본 coverage로 대체하지 않아요. 1.3 EntityCommandBuffer class 페이지는 수집했지만 그 큰 class/member listing 전체를 읽지는 않았으므로 `unread`로 남겨요.

## 6. 남은 범위와 알려진 한계

- 기본 Manual 3,122개·API 합집합 31,710개 대부분은 raw body를 확보했지만 unread예요. 표본 기술 분석 20 URL과 2개 범위 설명으로 전체 엔진 분석 완료를 주장할 수 없어요.
- 페이지 전체를 읽어도 링크된 하위 API, enum 각 값, 모든 overload parameter·exception·platform 차이, 그림 edge, example의 제약을 확인해야 세부 완료 판정이 가능해요. 모듈별 API·overload 전체 분모는 아직 미확정이에요.
- 실제 404인 기본 API 3개를 exception debt로 보존해요. 원문이 없는데 제목이나 다른 판본 지식으로 분석 내용을 채우지 않아요.
- package 223 editions의 검색 corpus만 확보했어요. 대다수 raw HTML은 미수집이고 all TOC/xrefmap 검증·API parameter별 분석도 남아 있어요. 검색 keywords를 문서 body의 완전한 대체물로 쓰지 않아요.
- 112 package names에서 발견한 1,558 영어 edition 중 223 roots 밖의 문서가 남아 있어요. hidden experimental/deprecated/support-only packages의 완전한 name inventory도 아직 증명하지 못했어요.
- 공식 package 요약에서 **20개의 외부 공식 documentation links**를 발견했어요. IAP, LevelPlay, Analytics, Authentication, CCD, Cloud Diagnostics, Cloud Code/Save, Economy, Friends, Leaderboards, Lobby, Matchmaker, Push Notifications, Relay, Transport 등이에요. 일부 링크는 같은 서비스의 alias일 수 있어요. `docs.unity.com`와 `docs-multiplayer.unity3d.com`의 전체 navigation·REST/client SDK API corpus·snapshot version은 아직 확보하지 않았어요.
- 플랫폼 비공개 문서, console vendor의 별도 문서·권한 영역, official package repository의 Documentation~ 및 samples, language별 번역 차이, 다른 Unity engine 버전 전체는 이 스냅샷으로 complete하다고 선언하지 않아요.
- 원문은 private ignored cache에 두고 공개 가능한 연구 문서에는 출처 링크·자체 분석만 기록해요. 외부 본문 전체나 거대한 검색 body를 commit하지 않아요.

## 7. 인계 파일과 검증

모든 경로는 repository 기준이에요. 집계·원문 cache는 이미 Git에서 제외돼 있어요.

| 파일/경로 | 내용 |
|---|---|
| `docs/research/UNITY_CORPUS_RESEARCH.md` | 이번 자체 분석·출처·미완료 범위. 이 문서만 신규 연구 결과로 작성했어요. |
| `native/build/reference-cache/unity-discovery/unity-corpus-manifest.json` | 고유 URL·family·version·snapshot·원문 파일·hash·retrieval status 통합 목록. root ledger import용이며 초기 분석 상태는 모두 unread예요. |
| `offline-6000.0-manifest.json` | ZIP entries·HTML 분류·추출 목록·CRC 확인 |
| `online-offline-comparison.json` | 검색 index/TOC hash 일치·검색대비 파일 누락·온라인/ZIP URL 차이 |
| `manual-{toc,search}-entries.json`, `scriptreference-{toc,search}-entries.json` | 온라인 공식 발견 목록; analyzed라고 표기하지 않았어요. |
| `package-catalog-snapshot.json` | 초기 111 roots, HTTP response·hash·정확한 title/version |
| `package-summary-expansion.json` | 159개 wrapper의 출처 provenance, 222 package roots, 외부 공식 links |
| `package-expanded-catalog-snapshot.json` | 223 roots 최종 확장 목록, DocFX href/API/Manual 수량 |
| `package-edition-discovery.json` | 112 package names의 metadata/versions, 1,558 영어 editions |
| `reviewed-core-body-equivalence.json` | 실제 읽은 core 14개에서 web base element 제외 후 ZIP 본문과 정확히 같다는 검증 |
| `unity-reviewed-source-evidence.json` | 기술 본문 20 URL의 실제 source body 경로·hash·version·읽기 범위·이 문서의 자체 계약 분석. 발견 manifest와 별도 보존해요. |
| 각 `.html.meta.json`, `.html.txt` | 실제 web response provenance 및 분석에 읽은 private text |
| `native/build/unity_corpus_probe.py` | standard library만 쓰는 read-only 공식 URL fetch 도구. 새 dependency·engine code 변경 없음. |

검증은 ZIP 전체 CRC, index JSON 파싱, TOC/search 고유 URL 비교, 실제 누락 URL 404 재확인, package roots 전부 index 응답 확인, probe `--self-check` 통과예요. self-check는 script/style 제외·HTML entity decoding·cache directory 경계만 확인하는 작은 체크예요. engine runtime나 UI를 실행해 검증한 결과는 없어요.

통합 manifest의 고유 URL은 **94,113개**예요. family별로 Manual 3,122, Scripting API 31,710, package API 48,656, package Manual 9,606, package support 999, 외부 공식 서비스/멀티플레이 20개예요. raw HTML 기준 fetched 35,058, 정확한 indexed URL의 404 3, 검색 text만 수집한 package URL 59,032, discovered/unfetched 외부 URL 20개로 구별했어요. 모든 발견 row는 의도적으로 `analysis_status: unread`로 시작해요. 이 문서의 실제 읽기 근거를 root가 별도로 검토·병합해야 하며, 이 수집 수량이 분석 완료율이 되지는 않아요.
