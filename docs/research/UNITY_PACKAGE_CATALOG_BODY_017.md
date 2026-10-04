# Unity 6000.0 패키지 목록·호환·숨은 의존성 본문 분석 017

2026-10-04에 짚짱의 `unity_package_catalog_017` 담당자가 공식 공개 HTTP와 기존 공식 캐시를 읽었어요. 현재 단계는 `research_only`이며 엔진·런타임·SDK·테스트 실행, 구현, foreground 창 조작, 원장 승격을 하지 않았어요. **전체 Unity·Unreal 본문/API 분석 완료는 0, 이번 엄격한 원장 승격도 0이에요.** 아래에서 목록 폐쇄, 본문 읽기, package API 분석을 각각 구분해요.

## 실제 읽기와 증거

공식 6000.0 영어 매뉴얼 **27페이지의 전체 설명·표·예제 텍스트**를 직접 읽었어요. 전체 h1–h6는 83개, 표 24개·452행·975셀, pre 예제 3개예요. 표 안의 JSON 예시와 inline code도 읽었으며 pre 개수로 전체 예제 분모를 대신하지 않아요. 본문 그림은 133회 출현·16개 고유 URL이에요. 15개 고유 원문 이미지를 실제 pixels로 읽었고, `iconRel.png` 1개는 공식 HTTP 404여서 114회 출현 모두 미확인으로 남겼어요. SVG 4개는 sharp로 흰 문서 배경에 렌더한 원본 pixels를 읽었어요. 실제 Editor 조작이나 동적 선택기 검증은 하지 않았어요.

이전 `UNITY_CORPUS_RESEARCH.md`에서 읽었다고 명시한 상태·목록 설명 6페이지도 이번 27개에 포함돼요. 5개는 과거 설명·링크 부분 읽기의 전체 텍스트 재확인이고, Experimental 1개는 과거 전체 텍스트의 재읽기예요. **새로 읽은 URL 21개와 기존 재읽기 6개**를 구분해요. 159개 package wrapper를 모두 새로 확보·구조 추출했지만 의미 본문을 읽은 것은 그중 5개뿐이에요. 나머지 154개는 fetched/unread이며 전체 패키지 본문 읽기로 세지 않아요. package의 타입·멤버·overload 선언 분석은 이번에 0개예요. 별도로 Entities 1.5.0의 기존 공식 metadata 안에 있는 한 manifest record를 전체 읽었으며, metadata 전체 읽기나 API 본문 1개로 세지 않아요.

원문·body HTML·읽기용 text·구역/표/코드/이미지 locator·HTTP·hash·자동 목록은 ignored `native/build/reference-corpus/unity-package-catalog-batch-017/`에 있어요. [기계 기록](unity-package-catalog-body-017.json)은 이 Markdown과 모든 증거를 SHA-256으로 고정해요. Markdown에는 JSON 자신의 hash를 넣지 않아 순환하지 않아요.

live 원문은 Unity 6.0(6000.0), English, canonical URL을 표시하고 footer는 job `76758565`·2026-10-03이에요. 기존 ZIP의 job `76410965`·2026-09-29와 raw hash를 섞지 않아요. 동일 h1–`div#_content` 구간 비교에서 27개 중 24개는 정확히 같고 Released, Keywords, Entities wrapper 3개는 달라요. 날짜 차이만으로 나머지 24개를 stale로 단정하지 않으며, 달라진 3개의 이전 읽기를 현행 body hash에 상속하지 않아요.

## 전체 목록 입구가 의미하는 범위

[PackagesList](https://docs.unity3d.com/6000.0/Documentation/Manual/PackagesList.html)의 본문은 개별 패키지 명부가 아니라 **16개 관리 분야**로 향하는 표예요. 설치 입구, dependency/conflict, UI, C# 관리 API, 프로젝트 JSON, Inspector, 실제 package 목록, feature sets, Git, cache, scoped registry, 설정·인증, custom package, troubleshooting, network diagnostics와 Asset Store까지 포함해요. 따라서 이 root를 읽었다고 패키지 목록이나 API 전체를 읽었다고 할 수 없어요. Git tooltip은 URL 기반 가져오기와 SemVer·품질 보장의 부재까지 실제 설명해요.

[Packages](https://docs.unity3d.com/6000.0/Documentation/Manual/Packages-all.html)는 Released/Pre-release, Core, Built-in, Experimental, Keywords, Deprecated를 모두 연결해요. 현재 전체 공개 상태 목록에서 ID는 **Released 114 / Pre-release 2 / Core 10 / Built-in 33 = 고유 159개**예요. 같은 종류 수량과 패키지의 실제 문서 root 수량은 달라요.

- [Released](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-safe.html)는 특정 Editor와 그 판본의 다른 released packages에 대한 시험·문서·변경 이력·license 기준을 설명해요. 지원의 조건은 Editor 판본이며 “숫자 버전이면 모든 Editor에서 검증됐다”는 뜻이 아니에요.
- [Pre-release](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-preview.html)는 초기 시험·문서와 LTS까지의 검증 약속을 설명해요. 기본 설치 목록에서는 숨겨지고 `Show Pre-release Package Versions` 설정으로 표시해요. Moderation과 Netcode for GameObjects 전체 ID를 보존했어요.
- [Core](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-core.html)는 Editor와 같이 배포되고 창이나 API로 다른 버전을 고를 수 없어요. 10개 모두 optional 설치 가능한 registry package와 구별해요.
- [Built-in](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-build.html)은 기능 활성/비활성과 최종 build의 코드·resource 포함에 연결돼요. 33개 실제 목록 링크는 각각 core Scripting API의 Module 페이지로 연결되므로 DocFX 패키지 112이름만으로 전체를 닫을 수 없어요. registry에 문서가 없다는 이유로 Accessibility·AMD/NVIDIA·Terrain Physics·Web Request 변형 등을 버리지 않아요.
- [Experimental](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-exp.html)은 공식 registry에 있어도 Unity Registry 목록에 노출되지 않는 지원용 패키지를 명시해요. 직접 또는 dependency로 설치되면 표시될 수 있어요. 실제 경고 그림은 설치된 experimental Jobs와 노란 Exp/Experimental, toolbar 경고를 보여 주지만 그림의 2022-08-02/preview 표기를 현행 6000 package 판본으로 바꾸지 않아요.
- [Deprecated](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-deprecated.html)는 package lifecycle 폐기와 특정 version 폐기를 구분해요. 전자는 다른 patch로 바꿔도 해당 Editor에서 lifecycle 폐기 상태가 남고, 후자는 동일 package의 지원되는 다른 version을 찾는 흐름이에요. 그림의 노란/빨간 label을 실제 확인했어요. 이 페이지는 전체 폐기 ID 명부를 제공하지 않으므로 폐기 항목 전체 분모는 미확정이에요.
- [Keywords](https://docs.unity3d.com/6000.0/Documentation/Manual/pack-keys.html)의 306개 data 행을 모두 읽었어요. 대소문자가 다른 키와 여러 패키지 매핑이 있고 기능 전체 목록과 같지 않아요. `TextMesh Pro/TMP`가 Unity UI로 연결되고 `visualscripting`은 AR Foundation으로 연결되는 실제 목록도 보존해요. 키워드만으로 별도 package 존재·제거·API 통합을 확정하지 않아요.

[Feature sets](https://docs.unity3d.com/6000.0/Documentation/Manual/FeatureSets.html)의 9개 묶음도 모두 읽었어요. 2D, Characters/Animation, World Building, AR, Cinematic studio, Engineering, Gameplay/Storytelling, Mobile, VR이며 AR/VR 묶음은 deprecated로 표시돼요. 같은 feature-set 버전 안의 상호 호환 약속은 서로 다른 feature set·Editor·개별 package patch까지 일반화하지 않아요. 9개 하위 본문과 설치·Details 계약은 미독 대기열에 남겼어요.

## 223 root·1,558 edition·59,261 URL과 새 발견

기존 private 목록을 다시 파싱하고 hash를 계산해 **223 DocFX root, 112 package 이름, 영어 1,558 edition, index href 59,261(API 48,656 / Manual 9,606 / support 999)**을 확인했어요. 이들은 여전히 발견·검색용 목록이며 본문/API 분석 수가 아니에요.

새로 확보한 전체 159 wrapper와 상태 목록의 DocFX root 합집합은 **220개**이고, 직접 상태 목록만의 root는 111개예요. 기존 223개와 합하면 **227개**예요. 새 목록에 더해진 것은 Collections 2.7, Entities 1.5, Entities Graphics 1.5, Physics 1.5예요. 이전 root 중 새 wrapper 목록에 없는 7개는 Collections 2.6, 위 세 패키지의 1.4, URP 17.0, Splines 2.8, XR Management 4.5예요. 목록에서 빠졌다는 관측을 삭제·비호환·폐기의 공식 판정으로 바꾸지 않아요. 특히 URP는 기존에 engine Manual 통합과 별도 API root를 확인한 사례이므로 보존해요. 추측한 `Manual/com.unity.render-pipelines.universal.html`은 실제 404였으며 다른 root의 존재를 취소하지 않아요.

[Entities wrapper](https://docs.unity3d.com/6000.0/Documentation/Manual/com.unity.entities.html)는 1.5.0 released와 6000.0 적용을 명시해요. 기존 1.4.8 본문 분석을 현행 1.5.0 분석으로 대체하지 않아요. [Moderation wrapper](https://docs.unity3d.com/6000.0/Documentation/Manual/com.unity.services.moderation.html)의 1.1.0과 일부 numeric 1.0 patch들도 pre-release 행에 들어 있어 숫자 suffix와 lifecycle 상태를 별도 필드로 유지해요. [NGO wrapper](https://docs.unity3d.com/6000.0/Documentation/Manual/com.unity.netcode.gameobjects.html)의 16개 edition 행·모든 표시 patch를 읽었으며 pre-release 행의 역사적인 exp/pre patch도 보존했어요. Accessibility는 built-in 고정, Multiplayer Center는 core 고정이라는 실제 wrapper 설명을 각각 읽었어요.

새 4개 root에서 root/manual/API TOC, xrefmap, index를 실제 확보했어요. root TOC는 각각 Manual/API/Changelog/License를 연결하며 API TOC와 xref UID는 URL·member·overload와 별도 단위예요. 새 index href는 **3,612(API 3,344 / Manual 252 / support 16)**로, 기존 정확한 URL identity와 합하면 **62,873(API 52,000 / Manual 9,858 / support 1,015)**예요. 이것도 body 읽기 0개인 추가 발견 목록이에요. 전체 227 root의 모든 TOC/xref·하위 link closure는 아직 끝나지 않았어요.

전체 112 metadata의 모든 package-version `dependencies`를 자동 구조 추출하면 16,338개 edge·125개 ID가 나와요. 이는 역사적/미호환 판본도 포함하므로 현행 설치 목록으로 사용하지 않아요. 새 6000.0 wrapper가 명시한 호환 patch와 정확히 일치하는 owner-version만 별도로 고르면 dependency ID 85개, 그중 159개 상태 목록 밖의 ID가 **26개**예요. 현재 wrapper의 모든 표시 patch는 기존 metadata snapshot에서 찾았지만, 전체 dependency의 Editor·platform·상호 계약을 확인한 뜻은 아니에요.

이 26개에는 Autodesk FBX, 2D Common, Barracuda/Sentis, OpenImageIO binding, App UI, NUnit, GDK Discovery, Subsystems/Unity Analytics modules, MonoCecil/Newtonsoft, PolySpatial/XR, Remote Config Runtime, URP, Serialization, Services Core/Deployment API/QoS/Wire, Settings Manager, XR Composition Layers/Core Utils/Interaction Subsystems/Legacy Input Helpers가 있어요. 목록 미노출을 모두 experimental이라고 단정하지 않으며 metadata `hideInEditor`·실제 state·지원성·대체 관계는 별도 조사해요.

26개 공식 metadata/versions 쌍 52요청은 48개 성공이고, 내장 `modules.subsystems`와 `modules.unityanalytics`의 각 2URL만 실제 404였어요. `versions.json`의 실제 root가 `{langs:[...]}`인데 초기 extractor가 list로 가정한 오류는 네트워크 실패와 구분하고 확보된 동일 bytes를 재파싱했어요. 기존 112 이름 밖 **23개 이름·220개 영어 edition**을 새로 발견해 알려진 합집합은 **135개 이름·1,778 edition**이에요. 이 추가 220개 edition의 본문/API와 재귀 dependency 폐쇄는 미완료예요. 담당자는 기존 manifest를 수정하지 않고 추가 대기열을 작성했으며, 후속 통합에서 root 담당자가 현행 `CORPUS_MANIFEST.json`의 `unity-packages.knownInventory`에 227 root·135이름·1,778 edition·62,873 URL을 발견 값으로 등록했어요. 과거 223/1,558/59,261 값은 역사 snapshot으로 보존하며 `discoveryClosed=false`, 페이지/API 분모 미확정, 전체 완료 0을 유지해요.

Entities 1.5.0 manifest record는 최소 Editor `6000.0`, Collections `2.7.1`, Burst `1.8.29`, Serialization `3.1.3`, MonoCecil `1.11.6`, performance test `3.0.3` 등을 포함한 14개 직접 dependency를 명시해요. 공식 metadata `dist-tags.latest`는 동시에 오래된 `0.17.0-preview.41`이므로 latest를 현행 호환 판본·문서 판본으로 대체하지 않아요. 이 한 record를 읽은 것으로 14개 dependency의 본문/API 분석을 인정하지 않아요.

## 실제 호환·해결·데이터 계약

[Introduction](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-concepts.html)의 registry/local/embedded/Git/tarball/built-in을 모두 읽었어요. registry·Git·tarball·built-in은 수정 불가, local/embedded는 수정 가능한 source이고 cache와 프로젝트 설치 scope가 달라요. [Dependency resolution](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-dependencies.html)은 요청한 버전과 실제 설치 버전을 구분하고 한 package version만 선택해요. 실제 SVG는 Project→Cinemachine/Alembic, Alembic→Timeline의 직접/간접 소유 관계를 보여 줘요.

[Conflict](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-conflicts.html)의 그림에서 Project의 네 직접 dependency와 Timeline 두 버전의 충돌, UI built-in까지의 중복 경로를 실제 읽었어요. version 기반 dependency와 다른 source의 우선 순위, lock 재사용, 최소 위험 upgrade를 구분해요. 해결 그림의 오래된 preview 예제는 구조 설명의 예시이며 현행 package support의 근거가 아니에요. [Lock files](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-conflicts-auto.html)는 `Packages/packages-lock.json`, 가변 manifest 변경에 따른 재해결, VCS 보관, 직접 수동 수정의 덮어쓰기, lock 비활성 시 Git 재clone·remote commit에 따른 비결정성까지 명시해요. 연구하면서 파일을 삭제하거나 설정을 바꾸지 않았어요.

[Package manifest](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-manifestPkg.html)의 required name/version, recommended description/displayName/unity, 모든 optional 속성과 JSON 예제를 읽었어요. `unity`는 최소 Editor이고 생략 시 모든 Editor 호환으로 취급해요. `unityRelease`는 unity 없이는 무효, dependencies는 구체 SemVer만 허용하며 range syntax를 받지 않아요. `hideInEditor`의 기본 숨김, Samples~, 라이선스, documentation/changelog/license URL 실패 시 **설치됨=cache의 offline 파일/folder, 미설치=offline 없음 경고**도 분리해요. 문서 edition metadata는 실제 package manifest와 다른 자료예요.

[Project manifest](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-manifestPrj.html)는 직접 dependency와 source URL/path, embedded 자동발견·동명이름 override, 기본 lock=true, 기본 strategy=lowest를 명시해요. highestPatch/highestMinor/highest의 범위·0.x의 highestMinor 특별 처리·stable에서 pre/exp로 넘어가지 않는 제약을 모두 읽었어요. `testables`와 scoped registry도 공식 본문 범위에 남겨요.

[Package versioning](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-semver.html)의 12구역·6표 전체를 읽었어요. ABI/API 선언만이 공개 계약은 아니에요. GUID 변경·asset 삭제, assembly 이름/조건/platform/test-assembly 변경이 기존 참조나 빌드를 깨뜨릴 수 있어요. Auto Referenced가 켜져 있으면 일반적으로 minor에 해당하는 assembly 추가도 major 위험이 돼요. 이름 변경은 업데이트로 처리할 수 없고 새 package identity가 필요해요. dependency 변경은 행동·노출 type·auto-reference 조건에 따라 patch/minor/major가 달라요. Editor 최소 버전 변화는 minor/major이고, API 제거는 먼저 minor의 deprecation 후 major 제거 순서예요.

[Find version](https://docs.unity3d.com/6000.0/Documentation/Manual/upm-ui-find-ver.html)의 pre-release 설정과 context별 검색 범위·검색어 복원, Version History의 Changelog/Install/Update/Remove 흐름을 읽었어요. 그림은 My Assets context의 Project Settings 메뉴, IAP 4.9.3 설치/4.9.4 권장과 두 Update 위치를 실제 보여 줘요. 그림에 찍힌 2021/2023 값이나 OS 모양을 현행 Editor 실행 확인으로 표현하지 않아요. [Inspection](https://docs.unity3d.com/6000.0/Documentation/Manual/package-inspection.html)과 [C# 관리 API 입구](https://docs.unity3d.com/6000.0/Documentation/Manual/managing-packages-api.html)는 하위 계약을 연결할 뿐이므로 실제 API의 비동기 상태·실패·thread·signature는 미확정이에요.

## HBEngine 대응은 후속 설계 판단이에요

읽기 전용으로 확인한 [AI_ENGINE_API](../AI_ENGINE_API.md)의 schema/asset UUID·직접/역참조·revision 보호와 `prototype/project-browser.js`의 asset-info UI는 **파일 에셋 참조**의 기존 비교 지점이에요. package version graph, ABI, 설치 source, core/built-in 상태, package dependency resolver를 구현했다는 증거로 사용하지 않아요. 해당 파일들의 hash도 기계 기록에 고정했어요.

| 축 | 원출처를 바탕으로 남기는 HB 요구·향후 검증 |
| --- | --- |
| C++·데이터 | 안정적인 package ID, 실제 patch, Editor 최소판본·platform, required dependency, compiled module/asset UUID와 ABI 변경을 함께 보관해야 해요. requested/resolved를 별도 저장하고 동일 입력+lock의 동일 해석, core 버전 교체 차단, built-in 제거의 build 포함 변화를 gate 이후 검증해요. |
| 노드 | package 제공 타입/함수/노드와 package version의 소유 관계가 필요해요. 제거·upgrade 시 끊긴 노드/asset/형식과 대체 후보를 보여 주고 기존 그래프 migration·실패를 숨기지 않아야 해요. 이 조사로 C# PackageManager API를 C++ 선언으로 만들거나 노드 signature를 추정하지 않아요. |
| 사람 UI | 전체 ID 목록과 설치된/지원/숨은/폐기/version 폐기를 각각 탐색할 수 있어야 해요. source·요청/해결 버전·왜 override됐는지·dependency 경로·core 고정·offline 문서·feature set 구성의 구체 계약을 남겨요. 간단한 기본 UI를 전체 기능 삭제의 근거로 사용하지 않아요. |
| AI schema·명령 | 사람 UI와 같은 catalog ID·version·source·lock·validation 결과를 읽고, revision을 대조한 변경 계획·변경될 dependency와 노드/asset 목록·명시 실패 결과를 사용하는 방향이에요. 현재 프로젝트의 revision 명령이 package 설치를 지원한다고 말하지 않으며 실제 package 관리 API 및 실행/rollback 계약은 후속 미확정 요구예요. |

## 남은 일·독립 검증 대상

모든 미독 wrapper 154개, 227 package root의 정확 patch·호환·changelog/license, 1,778 edition의 적용성, 발견 URL 62,873개, 추가 metadata dependency 재귀 확대, 33 built-in Module API, 9 feature-set 하위 본문, 관리 root의 모든 16분야 하위 본문/API, 공식 외부 서비스 20링크와 wrapper의 versionless core Manual 참조를 private 대기열에 남겼어요. 미독 media·깨진 링크와 자료가 부족한 폐기/숨김 package는 분모에서 삭제하지 않아요. package member/overload 전체 분모, 폐기 ID 전체 목록, platform/비공개 배포 원문과 실제 UI 상태는 `unknown`이에요.

독립 담당자는 source/body/text/analysis artifact hash, h1–h6 83개와 모든 표·rowspan·예제·media, 159 ID 분류, 223→227 root 합집합, 1,558→1,778 edition 합집합, 59,261→62,873 정확 URL, metadata의 14 dependency record, API 미확인 보존, 요청 실패와 extractor 오류 분리를 실제 원문으로 대조해야 해요. 이 문서는 분석 담당자의 증거이며 독립 verified를 부여하지 않아요. 전체 scope를 다시 발견했지만 **catalog closure와 전체 엔진 분석은 아직 완료되지 않았어요.**
