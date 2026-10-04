# Unity 패키지 배치017 독립 원문·표·이미지 대조

2026-10-04에 본문 작성자017과 다른 짚짱의 `unreal_root_expansion_018` 담당자가 [분석017](UNITY_PACKAGE_CATALOG_BODY_017.md)·[기계 기록017](unity-package-catalog-body-017.json)을 공식 캐시 원문과 직접 대조했어요. **확인한 이 배치의 텍스트·분석 대응과 발견 목록은 일치해요. 전체 Unity·Unreal 분석 완료=false, API 선언 분석=0, 엄격 원장 승격=0이에요.**

## 정확한 검증 범위

27개 실제 h1–`div#_content` 본문의 모든 설명·inline tooltip·표 셀·inline JSON·pre 예제·caption을 직접 읽고 83개 heading 분석과 대조했어요. 독립 tree parser로 원HTML 구간과 line range, 본문 bytes, 읽기 text의 모든 data 보존, 모든 heading/anchor, 24개 표·452행·975셀의 text/link/rowspan/colspan, pre 예제 3개와 이미지 출현 133회를 다시 계산했어요. 자동 재계산과 직접 의미 읽기는 별도 증거로 남겼어요. 본문 작성자의 extractor/checker를 실행해 검증하지 않았어요.

15개 고유 이미지의 전체 pixels를 `view_image` original로 실제 읽었어요. SVG 4개는 source를 독립 재렌더한 RGBA pixels와 읽은 PNG를 대조했고 모두 같아요. `iconRel.png`의 실제 404 기록은 114회 출현(Released 113회·Entities 1회)으로 보존해요. 이 2페이지의 그림을 포함한 전체 내용이 확인됐다고 승격하지 않아요. HTTP 200·파일 hash·그림 파일 목록만으로 읽기 완료를 판정하지 않아요.

159개 wrapper의 소스/호환표/문서 root/외부 서비스/Module API 경로는 자동 구조를 독립 재계산했어요. 실제 의미 본문을 읽은 wrapper는 27본문에 포함된 5개뿐이고 154개는 fetched/unread예요. 227 root·1,778 edition·62,873 URL·dependencies 재계산은 발견/구조 검증이며 하위 본문/API 읽기 0을 유지해요. 독립 재읽기 27개를 신규 본문 27개로 더하지 않아요. 작성자 기록의 신규 21 URL/기존 6개 재읽기(설명 부분 5·기존 Experimental 전체 1)는 이전 UNITY_CORPUS_RESEARCH의 명시 범위와 맞아요.

live HTML은 영문 Unity 6.0(6000.0), canonical과 job 76758565·2026-10-03을 표시해요. 과거 ZIP job 76410965·2026-09-29와 같은 구간을 대조해 24 body 동일/Released·Keywords·Entities 3 body 변경을 재현했어요. raw 차이와 body 차이, 이전 읽기와 현재 읽기를 혼합하지 않아요.

## 본문별 의미 대조

아래 locator의 모든 text를 읽었어요. source/body/text/hash와 정확한 line 범위는 [검증 기계 기록](unity-package-catalog-body-verification-017.json)의 pageChecks에 있어요. 하위 link 본문·동적 Editor 행동은 따로 미독이에요.

| 본문 | 실제 source 범위 | 대조한 조건·분석의 범위 |
| --- | --- | --- |
| `PackagesList` | `h1; table[1] all17rows34cells; h2` | 실제16개 관리 분야와 Asset Store 연결을 읽었어요. Git tooltip의 URL source와 SemVer·품질 미보장 문장도 추출문에 포함돼요. 이 root 자체는 개별 package/API 명부가 아니에요. |
| `Packages-all` | `h1; table[1] all7rows14cells; h2` | Released/Pre-release·Core·Built-in·Experimental·Keywords·Deprecated의 모든 연결과 built-in tooltip을 대조했어요. 상태별 하위 문서를 읽어야 개별 ID 목록을 확인할 수 있어요. |
| `pack-safe` | `h1; all114package links; img` | 특정 Editor와 같은 Editor의 released packages 간 시험·문서/changelog/license 조건과114ID를 읽었어요. 원래114released ID 중113곳에 실제 iconRel img가 있고 그 bytes/pixels는 미독이에요. |
| `pack-preview` | `h1; all2package links; img` | LTS까지 검증 약속·기본 노출 숨김·Show Pre-release 설정과 Moderation/NGO 두 ID를 대조했어요. 숫자 suffix로 wrapper lifecycle을 다시 판정하지 않아요. |
| `pack-core` | `h1; all10package links` | Editor 동행 배포와 Package Manager 창/API에서 다른 version을 고를 수 없다는 제약,10ID를 대조했어요. |
| `pack-build` | `h1; all33package links` | 33개 Module API 연결과 기능 비활성의 최종 build code/resource 제외 조건을 대조했어요. 링크된 Module API 본문은 읽지 않았어요. |
| `pack-exp` | `h1; img` | 미지원·지원 dependency·registry 목록 미노출·설치 후 노출 조건을 읽었어요. Jobs 경고 screenshot의2022표시는 현행6000package support 증거로 사용하지 않아요. |
| `upm-lifecycle` | `h1–h2 all4heading sections; table[1]; img` | Unity 개발 package와 thirdparty 절차를 구분하고 experimental→pre→released, breaking major/minor/patch 회귀 및 폐기 edge를 대조했어요. 지원 경계는 실제 SVG pixels에서도 확인했어요. |
| `upm-concepts` | `h1–h2 all7heading sections; table[1]` | Registry/Built-in/Embedded/Local/localTarball/Git 여섯 source와 Local/Embedded 영구 수정 가능 조건, project/package manifest, per-project/globalcache를 구분했어요. |
| `FeatureSets` | `h1–h2; table[1] all10rows20cells` | 아홉 묶음과 AR/VR deprecated 표시를 읽었어요. 같은 feature-setversion 안의 상호 호환 약속을 모든 patch/Editor에 일반화하지 않은 분석이 원문에 맞아요. |
| `package-inspection` | `h1–h2; table[1]` | 전용 Inspector와 package manifest 접근의 두 하위 연결을 대조했어요. Inspector 동적 UI·하위 조작 본문의 계약은 미확정이에요. |
| `dependencies-lp` | `h1–h2; table[1]` | resolution/conflict/embedded/lock/localpath 다섯 분야의 연결을 읽었어요. 읽은 resolution·conflict·lock과 미독 embedded/localpath를 구분해요. |
| `upm-dependencies` | `h1; img all2` | Project direct와 Package indirect, 요청/해결 version, 한 version 선택, lock 결정성/효율을 읽었어요. 실제 SVG와 solver screenshot의 소유 경로/override cue가 분석과 일치해요. |
| `upm-conflicts` | `h1–h3 all4heading sections; img all2` | source 선택 우선과 version conflict, lock 우선 재사용, strategy에 따른 upgrade 위험을 읽었어요. 두 역사 SVG의 requested/resolved 값은 현행 compatibility와 구별돼요. |
| `pack-deprecated` | `h1–h2; table[1] all3rows9cells; img` | package lifecycle 폐기와 특정 version 폐기의 다른 행동을 읽었고 노란/빨간 실제 label을 대조했어요. 전체 폐기 ID 명부를 본문이 제공하지 않는다는 한계를 유지해요. |
| `pack-keys` | `h1; table[1] all307rows614cells` | 306data행의 키/매핑 전체를 읽었어요. TMP→Unity UI와 visualscripting→AR Foundation, 대소문자/1:many 매핑을 source와 대조했어요. 키워드를 별도 API identity로 바꾸지 않아요. |
| `upm-ui-find-ver` | `h1–h2; img all2` | 설정·context 검색 범위·검색어 복원·VersionHistory/Changelog/Install/Update/Remove를 읽었어요. My Assets와 IAP4.9.3/4.9.4 두 Update 위치를 실제 pixels에서 확인했어요. |
| `upm-semver` | `h1–h3 all12heading sections; all6tables` | 모든6표와 GUID/asset/assembly/platform/test/AutoReferenced/dependency/Editor 판본 변경 조건, minor deprecation 후 major API 제거를 읽었어요. 공개 계약을 함수 선언만으로 축소하지 않은 판단이 맞아요. |
| `upm-manifestPkg` | `h1–h2 all6heading sections; all3tables; pre[1]` | 필수name/version, 권장unity최소판본과 생략 동작, 모든optional 속성·표 안 author/samples JSON·전체pre 예제를 읽었어요. exactSemVer, unityRelease 선행조건, hideInEditor가 package assets를 숨긴다는 의미, 설치/cache fallback과 미설치 경고를 구분했어요. |
| `upm-manifestPrj` | `h1–h2 all5heading sections; all2tables; pre[1]` | 동일name embedded override·lock=true·lowest·testables/scopedregistry·전체source JSON을 읽었어요. highestMinor의0.x 특례와 stable→pre/exp 불허를 원문과 대조했어요. |
| `upm-conflicts-auto` | `h1–h2; pre[1]` | lock 파일 VCS 보관·재해결 조건·수동 편집 덮어쓰기와 enableLockFile=false JSON을 읽었어요. Git 재clone/remote변경 비결정성을 읽었고 파일 삭제나 설정 변경은 하지 않았어요. |
| `managing-packages-api` | `h1–h2; table[1]` | C# scripting과 assetpath 두 API 입구를 읽었어요. Client request signature·async/thread/exception은 이 본문이 제공하지 않으며 이번 분석에서 읽은 API 선언 수는0이에요. |
| `com.unity.entities` | `h1–h3 all6heading sections; table[1] all2rows6cells; img` | ECS 설명, 1.5.0 released for 6000.0, 문서 edition 1.5와 exact patch 1.5.0, keywords를 읽었어요. 과거 1.4.8 기술 본문 읽기를 현행 1.5.0에 상속하지 않아요. iconRel 한 곳의 bytes/pixels는 미독이에요. |
| `com.unity.modules.accessibility` | `h1–h2 all3heading sections` | built-in ID와 접근성 utilities 설명·Editor별 고정version을 읽었어요. 관련API선언/실제동작은 미독이에요. |
| `com.unity.services.moderation` | `h1–h3 all4heading sections; table[1]` | toxicity 도구 설명과 numeric1.1.0/1.0patch의pre-release표시를 모두 읽었어요. lifecycle을version문자열 suffix로 대신하지 않아요. |
| `com.unity.netcode.gameobjects` | `h1–h3 all4heading sections; table[1] all17rows51cells` | GameObject/MonoBehaviour·underlying transport 설명,16edition행의전체patch와pre/exp역사값을 읽었어요. 현행wrapper의pre-release표시는 별도 사실로 유지해요. |
| `com.unity.multiplayer.center` | `h1–h2 all3heading sections` | 추천·통합·sample/doc 입구와corefixedversion을 읽었어요. 전체networkAPI를 자체 제공한다는 것으로 확대하지 않아요. |

## 정적 이미지의 실제 읽기

- `iconDeprecated-red.png` (1회): Deprecated outline/text의 붉은/주황색 label을 실제 읽었어요. 다른version lifecycle판정을 이 색만으로 만들지 않아요.
- `iconDeprecated-yellow.png` (1회): Deprecated outline/text의 노란색 label을 실제 읽었어요. lifecycle/table의 문장과 함께 대조했어요.
- `iconExp.png` (1회): 작은 Exp label의 노란 outline/text를 읽었어요.
- `iconExperimental.png` (1회): 전체 Experimental label을 읽었어요.
- `iconPre.png` (5회): 작은 Pre label을 읽었어요.
- `iconPrerelease.png` (1회): 전체 Pre-release label을 읽었어요.
- `iconRel.png` (114회): iconRel.png의실제404기록만대조했으며114회출현모두미독이에요.
- `iconSettings.png` (1회): 톱니모양 설정 아이콘을 실제 pixels로 확인했어요.
- `upm-conflicts.svg` (1회): Project의 Alembic/Barracuda/StreamingImageSequence/VFXGraph 네 직접 dependency, Timeline1.0.0/1.2.14 충돌과 UnityUI→built-inUI 중복 경로를 읽었어요.
- `upm-dependencies.svg` (1회): Project manifest의 Cinemachine2.6.0/Alembic1.0.7 직접참조와 Alembic package manifest의 Timeline1.0.0 간접참조, lock=true/highestMinor를 읽었어요.
- `upm-lifecycle.png` (1회): Mac PackageManager의 Experimental Packages In Use 경고, Jobs0.70.0-preview.7,2022-08-02, 노란Exp/Experimental과 Installed as dependency를 읽었어요.
- `upm-lifecycle_v2.svg` (1회): Unsupported Experimental/Deprecated와 Supported Pre-release/Released 경계, 진입/회귀/patch/폐기 edge A–E를 읽었어요.
- `upm-resolution.svg` (1회): preview역사예제에서 Physics→Burst 요청1.2.2와resolved1.3.0-preview.3, Collections/Jobs requested/resolved 비교 및 중복경로를 읽었어요.
- `upm-settings.png` (1회): My Assets context,3DGameKit1.9.4·April18,2021, Update1.9.5, 점메뉴의 Project Settings/Preferences/Manual resolve를 읽었어요.
- `upm-solver-visual-cues.png` (1회): XRPluginManagement4.0.6의Release/R, 버전 옆 override exclamation(A)와 다른package가이version에의존한다는tooltip(B)을 읽었어요.
- `upm-ui-update.png` (1회): IAP4.9.3 installed·June14,2023,4.9.4 recommended, Version History와 상단/행 두 Update버튼, 왼쪽 Package목록의Experimental label을 읽었어요.

그림의 과거 날짜/patch/OS 외형을 현재 6000.0 Editor 실행이나 현행 package 지원성으로 바꾸지 않아요. 실제 UI 실행·메뉴 작동·설치/업데이트·영상 재생 검증은 0이에요. 실패 그림을 비슷한 아이콘으로 대체하지 않아요.

## 발견 목록·의존성·오류의 독립 대조

공식 상태 본문의 114 Released/2 Pre-release/10 Core/33 Built-in은 고유 159 ID예요. 159 wrapper 원문에서 220 DocFX root·20 외부 서비스 URL·33 Module API 연결을 재현했어요. 직접 상태 목록만은 111 root이며 이 단위를 동일 분모로 바꾸지 않아요.

기존 223 root와 새 220 root의 합집합은 227이에요. 추가 Collections 2.7/Entities 1.5/Entities Graphics 1.5/Physics 1.5와 현 목록에서 보이지 않는 이전 7 root를 그대로 재현했어요. 이 7개를 삭제·폐기·비호환으로 판정하지 않아요. 원 227 index의 정확한 URL identity는 62,873(API 52,000/Manual 9,858/support 1,015)이고 읽은 API 수가 아니에요. 기존 112 이름의 raw versions와 추가 24개 성공 versions 응답을 재파싱하면 기존 1,558+신규 220=1,778 영어 edition·135 이름으로 일치해요.

새 discovery bundle의 3,612개 모든 title/url/parentRoot/kind/sourceURL/hash도 원 4 index와 일치해요(API 3,344/Manual 252/support 16). index의 title을 API 타입/멤버/overload 뜻 읽기로 세지 않아요. 이 검증은 import나 원장 승격을 실행하지 않았어요.

112 metadata의 모든 owner-version dependency 16,338 edge를 원 JSON에서 재계산해 125 ID를 확인했어요. 새 wrapper 호환 patch에 정확히 대응하는 owner-version만 고르면 85 dependency ID, 그중 159 목록 밖 26 ID가 원 기록과 같아요. 이는 역사 판본을 포함한 구조 추출이며 전체 manifest의 의미 읽기나 재귀 closure가 아니에요. 추가 metadata에서 발견한 더 깊은 ID 대기열도 미완료예요.

Entities metadata `/versions/1.5.0` 한 record의 전체 changelog/description/keywords/14 dependency/dist를 직접 읽었어요. 최소 Editor 6000.0, Collections 2.7.1/Burst 1.8.29/Serialization 3.1.3/MonoCecil 1.11.6/performance 3.0.3 등 14쌍과 기록이 일치해요. 동일 metadata의 dist-tags.latest=0.17.0-preview.41은 현행 호환 patch와 다른 값이에요. tarball을 다운로드하거나 14 dependency 본문/API를 읽지 않았어요.

26 metadata/versions 쌍 52 요청 기록 중 48 성공·내장 Subsystems/Unity Analytics 4 URL 404를 캐시 HTTP 기록과 대조했어요. 새 HTTP 재요청은 없어요. 원 실패 body bytes가 보존되지 않은 경우 HTTP 기록 대조로만 기재해요. versions root의 `{langs:[...]}`를 list로 가정한 24개 parser 오류는 확보된 같은 HTTP 200 bytes의 재파싱으로 고쳐진 기록이며 네트워크 실패로 세지 않아요. 추측한 URP wrapper의 404 실패 기록과 URP 기존 root 보존도 구분해요.

## HB 설계 판단과 열린 범위

`docs/AI_ENGINE_API.md`의 현재 schema/asset UUID/revision 설명과 `prototype/project-browser.js` 108–131행의 파일 목록·asset-info 직접/역참조 UI를 읽기 전용으로 대조했어요. 이 파일 비교는 package 설치·ABI·resolver 구현이나 동작 검증을 입증하지 않아요. 017의 C++/노드/사람 UI/AI 표는 안정 ID·exact patch·requested/resolved·source·lock·삭제/migration·공용 validation/revision에 관한 향후 요구로 분리되어 있어요. 2D·2.5D·3D/사람 UX/AI 친화 전체 누적 요구를 패키지 선택 몇 개로 축소하지 않아요.

154개 미독 wrapper, 227 root의 정확 patch와 모든 TOC/xref/하위 link, 1,778 edition 본문·적용성, 62,873 URL 본문/API, 33 Module API, 9 feature-set 하위, 16 관리 분야 후속 문서, 20 외부 서비스, 추가 metadata의 재귀 dependency, 미독 404 이미지 114회, 전체 폐기/숨은 ID와 실제 Editor 동적 UI가 남아 있어요. 전체 package/member/overload/폐기 분모는 unknown이고 `discoveryClosed=false`예요. 이 독립 대조로 strict body_reviewed/analyzed/verified를 원장에 부여하지 않았어요.

검증 대상 017 Markdown/JSON과 최종 CORPUS_MANIFEST pin, 1,158개 실제 evidence hash, 직접 읽기/미독/픽셀 대조와 독립 helpers는 기계 기록에 고정했어요. 검증 JSON이 이 Markdown hash를 기록하고 Markdown은 JSON hash를 기록하지 않아 hash 순환이 없어요. 엔진/SDK/runtime/tests/foreground/browser를 실행·조작하거나 작성자 017 파일을 수정하지 않았어요.
