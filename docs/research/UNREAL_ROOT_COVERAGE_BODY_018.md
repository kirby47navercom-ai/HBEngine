# Unreal 5.8 전체 분야 루트 본문·하위 목록 대조 018

기준일: 2026-10-04. `research_only`. **전체 매뉴얼/API 분석은 완료되지 않았어요.** 분모는 `unknown`, 수집 폐쇄는 `false`, 원장 `body_reviewed/analyzed/verified` 승격은 각각 0이에요. 엔진·GUI·SDK·runtime·tests를 수정/실행하지 않았고 foreground 창·브라우저도 조작하지 않았어요.

공식 홈의 21개 분야를 임의로 선택/제외하지 않고 전부 다뤘어요. 홈을 포함한 캐시 22개에서 같은 hash의 실제 SSR 텍스트·목록 설명·중첩 표·include를 직접 읽었어요. 신규 Unreal 매뉴얼 HTTP 본문 확보는 0, 이전 구조 검사에서 처음 전체 텍스트 범위를 기록한 분야 루트는 21개, 홈은 원래 SSR JSON을 직접 읽은 뒤 추출본을 재확인했어요. 이 수는 하위 문서/API를 새로 읽은 수가 아니에요. 본문 이미지10개·외부영상1개와 banner/thumbnail 픽셀, 자식 본문/API 선언은 읽지 않았으며 strict 본문 완료로 올리지 않았어요.

기존 `combined-manifest.json`의 요청59/실제본문54/열린후보16,216을 연결했지만 수정하지 않았어요. 기존 분야 목차398개 관계를 모두 보존했어요. 본문 paragraph href를 추가로 찾으면 gameplay22개·animation3개, 합25개의 관계가 늘어나요. C++ 루트의 기존1개는 실제 `/documentation/404`이므로 정상 매뉴얼 URL로 세지 않아요. 따라서 분야별 고유 정상 매뉴얼 URL 합은 **422 = 398 - 1 + 25**, 중복을 합친 하위 URL은 **412개**예요. 25개 모두 기존16,216 후보에 이미 있고, 새 엔진 매뉴얼 URL 후보는 0이에요. 하위 본문 읽기0/API unit·overload 읽기0을 유지해요.

기계 증거는 [unreal-root-coverage-body-018.json](unreal-root-coverage-body-018.json)에 있어요. JSON의 source/body/text/childInventory 파일과 hash를 재계산할 수 있고 원문/fulltables/media/helpers는 Git 제외 캐시 `native/build/reference-corpus/unreal-root-coverage-batch-018`에만 보존했어요. JSON과 이 문서 사이 hash cycle은 만들지 않았어요.

## 전 분야 대조

| ID | 공식 분야 루트 | 기존 관계 | 현재 고유 매뉴얼 URL | 추가 관계 | SSR revision |
|---|---|---:|---:|---:|---|
| UR018-01 | [What's New](https://dev.epicgames.com/documentation/en-us/unreal-engine/whats-new?application_version=5.8) | 4 | 4 | 0 | a7evb8 |
| UR018-02 | [Understanding the Basics](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-basics-of-unreal-engine?application_version=5.8) | 52 | 52 | 0 | 9Ape8L |
| UR018-03 | [Working with Content](https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-content-in-unreal-engine?application_version=5.8) | 17 | 17 | 0 | GEndBA |
| UR018-04 | [Building Virtual Worlds](https://dev.epicgames.com/documentation/en-us/unreal-engine/building-virtual-worlds-in-unreal-engine?application_version=5.8) | 13 | 13 | 0 | k5kk1 |
| UR018-05 | [Designing Visuals, Rendering, and Graphics](https://dev.epicgames.com/documentation/en-us/unreal-engine/designing-visuals-rendering-and-graphics-with-unreal-engine?application_version=5.8) | 60 | 60 | 0 | 53K8V9 |
| UR018-06 | [AI Features, Tools, and Plugins](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-features-tools-and-plugins-in-unreal-engine?application_version=5.8) | 3 | 3 | 0 | ANKPDv |
| UR018-07 | [Creating Visual Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine?application_version=5.8) | 8 | 8 | 0 | 4dgmb |
| UR018-08 | [Gameplay Tutorials](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-tutorials-for-unreal-engine?application_version=5.8) | 8 | 8 | 0 | Ok57X |
| UR018-09 | [Blueprints Visual Scripting](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine?application_version=5.8) | 11 | 11 | 0 | aL9Pn |
| UR018-10 | [Programming with C++](https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine?application_version=5.8) | 9 | 8 | 0 | m19xB |
| UR018-11 | [Gameplay Systems](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-systems-in-unreal-engine?application_version=5.8) | 14 | 36 | 22 | Vzpb0P |
| UR018-12 | [Mobile Development](https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-with-mobile-development-in-unreal-engine?application_version=5.8) | 70 | 70 | 0 | GEe5pz |
| UR018-13 | [Animating Characters and Objects](https://dev.epicgames.com/documentation/en-us/unreal-engine/animating-characters-and-objects-in-unreal-engine?application_version=5.8) | 4 | 7 | 3 | VzvA4P |
| UR018-14 | [Motion Design](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-design-in-unreal-engine?application_version=5.8) | 6 | 6 | 0 | q0EGvn |
| UR018-15 | [Creating User Interfaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-user-interfaces-with-umg-and-slate-in-unreal-engine?application_version=5.8) | 12 | 12 | 0 | KXVEn |
| UR018-16 | [Working with Audio](https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-audio-in-unreal-engine?application_version=5.8) | 15 | 15 | 0 | kbnbkA |
| UR018-17 | [Working with Media](https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-media-in-unreal-engine?application_version=5.8) | 20 | 20 | 0 | NpVO2p |
| UR018-18 | [Setting Up Your Production Pipeline](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-your-production-pipeline-in-unreal-engine?application_version=5.8) | 17 | 17 | 0 | DeBQn3 |
| UR018-19 | [Testing and Optimizing Your Content](https://dev.epicgames.com/documentation/en-us/unreal-engine/testing-and-optimizing-your-content?application_version=5.8) | 16 | 16 | 0 | n0o913 |
| UR018-20 | [Sharing and Releasing Projects](https://dev.epicgames.com/documentation/en-us/unreal-engine/sharing-and-releasing-projects-for-unreal-engine?application_version=5.8) | 34 | 34 | 0 | n0eN3M |
| UR018-21 | [Samples and Tutorials](https://dev.epicgames.com/documentation/en-us/unreal-engine/samples-and-tutorials-for-unreal-engine?application_version=5.8) | 5 | 5 | 0 | xaraD7 |

`현재 고유 매뉴얼 URL`은 분야마다 중복 제거한 발견 수예요. 페이지 전체 분모·읽기 수·API 수가 아니에요. C++ 분야의 9→8은 404 링크 분류 차이이고 항목을 삭제한 게 아니에요. 모든 실제 URL과 발생 위치, structured document_list/general href/custom block-dir-item href 분류는 각 root의 `childInventoryArtifact`에 있어요.

## 공개 구조·누락 판정

22개 원본 HTML의 SSR `document.json` payload와 기존 JSON이 의미적으로 같고 raw hash도 기존 manifest와 일치했어요. 본문 metadata의 locale=en-us와 applications version=5.8을 보존했어요. 실제 HTML canonical은 `?lang=en-US`로 버전 query가 없으므로, corpus identity에 고정 버전 query와 SSR 버전 증거를 따로 유지했어요. 일부 과거 기록은 request_url 필드가 없으며 seed URL은 요청 provenance 추정으로 구분했어요.

검사한 root snapshot에는 hidden=true block, draft document_list item, pagination/next-page/cursor 필드가 없어요. Audio의 include는 실제 중첩 본문 두 개가 있고 Content의 enhanced table은 두 제작 위치 열과 각각의 항목을 포함해 모두 읽었어요. 선택한 client document_list 함수는 주어진 items를 반복하고 non-live 항목의 역할별 가시성을 처리하며 해당 함수에 추가 fetch/pagination이 없어요. 별도 sidebar는 sub_entries를 펼치고 TOC GET은 path/lang/application_version을 사용해요. 22개 SSR transfer state에는 TOC 응답이 없어요. 이 관측으로 전체 사이트의 숨은/고아/다음 페이지가 없다고 선언하지 않아요.

실제 미해결은 Niagara Getting Started 토큰1, Blueprint GettingStarted/Overview·GettingStarted/Scripting·BP_HowTo 토큰3, UI Accessibility 토큰1, rendering lighting 상대경로1, gameplay Mass/Nav/Perception 역슬래시 상대경로3, Visual Studio의 publisher404 링크1이에요. 토큰/상대경로를 예상 slug로 바꿔 확보된 문서로 만들지 않았어요. Fab 구매/다운로드 공식 제품 문서와 catalog 연결은 새 외부 공식 root 후보로 보존하고 본문은 미독이에요. 모바일 외부 영상 URL2개는 한 영상의 embed/watch 주소이고 읽은 영상2개가 아니에요.

기존 공개 TOC/document/sitemap 첫 shard의 403은 앞선 조사 기록이에요. 이번에 다시 요청하지 않았으므로 신규403이라고 보고하지 않아요. 이전59개 요청의5개 HTTP200+SSR본문없음은 shell 실패로 따로 유지해요. 잘못 만든 AActor/GameFramework/console probe와 실제 WebAPI 미해결 입구를 같은 정상 문서 분모에 넣지 않아요. `http://documentation-app`는 SSR 서버 내부 transport metadata일 뿐 외부 요청 주소로 쓰지 않았어요. 제한 문서·권한 변경·차단 우회는 시도하지 않았어요.

정적 이미지10개는 각 source HTML이 직접 제공한 원이미지 href를 한 번씩 요청했지만 모두 HTTP403/textHTML이었어요. 이미지로 가져오거나 pixels를 읽은 수는0이며 query/header/권한을 바꾸는 우회는 하지 않았어요. 각 image의 source DOM URL속성4~5개도 모두 동일 API route의 크기 변형이며 별도 CDN/다른 image endpoint가 없고 SSR image object에는 직접 HTTP주소가 없었어요. URL을 storage key로 조합하지 않고 제공된 크기 변형을 추가 요청하지 않았어요. 실패 응답·URL·시각·MIME·hash는 `media-fetch.json`, 제공 주소의 locator 대조는 `media-provided-urls.json`에 있어요. 모바일 root `blocks[44]`는 제목·embed/watch URL·autoplay=false를 제공해요. 링크한 YouTube watch HTML을 metadata 확인 과정에서 두 번 요청하고 최종snapshot 하나를 보존했어요. 실제 player response에는 author=Unreal Engine, duration=2584초, 영어 자동생성 ASR caption track이 있었어요. 이는 제작자가 작성·검증한 기술 대본이 아니며 영상재생/전체영상/자막본문/대본 읽기 모두0이에요. 첫 요청은 tool metadata만 남아 원문 검증 근거로 사용하지 않고 최종 원문/hash에 모든 reported video metadata를 연결했어요.

## 실제 루트 텍스트 분석과 HB 연결

아래 문장은 루트가 실제로 설명한 제한된 사실과 HB 설계 판단을 구분해요. 후속 문서 제목/설명은 그 기능이 다음 분석 범위라는 근거예요. 후속 본문·API·실제 실행이 확인됐다는 뜻이 아니에요.

### UR018-01 What's New

근거: `blocks[0:2]`, bodyHash `04041a6333e0e68c30d2af7f28721fbf190ae028519216968d5e9d20c122c258`.

Beta 목록 설명은 개발 중이지만 안정 상태인 기능, Experimental 설명은 변화 중이며 배포 프로젝트에 준비되지 않은 기능으로 구분해요. 이행 가이드의 대상은 UE4 프로젝트를 UE5로 옮기는 과정이라고 명시돼요.

HB 설계 판단: 사람 UI와 AI 명령 모두 기능 성숙도·버전·이행 대상을 노출해야 해요. C++와 노드는 같은 적용성 표를 공유해야 하며 5.8 SSR 태그만으로 오래된 이행 문장을 현행 계약으로 확정하지 않아요.

미독·미해결: 5.8 release note 전체 변경점 / Beta/Experimental 실제 기능 목록과 API / migration 세부·복구·호환성.

### UR018-02 Understanding the Basics

근거: `blocks[2:45]`, bodyHash `1f392a3962f953b98c99e8ce3ab45d3b403091d7a3193199775c75dd564c648f`.

기초 흐름은 설치→용어/도구/설정→Content Browser→프로젝트/템플릿→Level→Asset→Actor/Component→Editor 내 Play/Simulate→Packaging으로 연결돼요. Asset은 프로젝트의 모든 콘텐츠를 지칭하고 모든 프로젝트에는 최소 한 Level이 있다는 설명을 확인했어요. Actor에 하나 이상의 Component를 붙일 수 있어요.

HB 설계 판단: 사람 제작 흐름에 탐색·다중 속성 편집·Reference Viewer·중복 통합·복구·자동 재임포트를 함께 남겨요. C++ 객체/컴포넌트 데이터와 노드 및 AI 편집 명령이 동일한 프로젝트/Level/Asset 참조 모델을 사용하도록 계약을 조사해야 해요.

미독·미해결: 각 작업의 실제 메뉴·단축키·Undo/저장/실패 / Recovery Hub·migration·reimport 계약 / Actor/Component 선언과 수명.

### UR018-03 Working with Content

근거: `blocks[0:6]; table blocks[1].rows[0:3]`, bodyHash `485728e20921f6daf50f97655b9976f0368f5acf2f266a18eef2e12080042ce7`.

표는 Editor 내부 제작물(Level, Material, Particle, Sequence, Blueprint, Navmesh, 사전계산 light map, light)과 외부 제작물(mesh, animation, texture, WAV, IES, APEX)을 나눠요. 후속 목록에는 Interchange/glTF/USD/MaterialX, Datasmith, LiDAR, in-engine modeling, scene variants, localization이 있고 Mutable 설명은 런타임에 skeletal mesh/material/texture를 생성한다고 해요.

HB 설계 판단: 자동 가져오기를 단순 파일 복사로 축소하지 않아요. 사람 Import UI·C++ importer·노드/AI 가져오기에는 형식/변환/참조/재임포트·런타임 생성 여부를 같은 데이터 계약으로 연결해야 해요. 표의 APEX 항목은 현행 지원을 입증하지 않으므로 버전별 대체 확인을 남겨요.

미독·미해결: 각 포맷·옵션·지원타깃·재임포트/실패 / APEX의 현행 호환/폐기 여부 / Mutable 및 import/export API.

### UR018-04 Building Virtual Worlds

근거: `blocks[0].content_html/html:h2[1:2]; directory items`, bodyHash `5f67d1e565b7c8e292e61202bfa84e7a2b20d2faa782b17f7098748c3ae42441`.

본문은 작은 시각화 환경과 큰 open world 모두를 대상으로 해요. 디렉터리 설명에서 Level Streaming을 플레이 중 비동기 Level 로딩/언로딩으로 설명하며 메모리 사용 절감과 끊김 없는 월드를 연결해요. One File Per Actor·Actor Editor Context·PCG·georeferencing·HLOD·water·splines도 독립 후속 문서예요.

HB 설계 판단: 사람 Level 편집·조직화와 C++/노드/AI 월드 명령에는 비동기 로딩의 수명·실패·취소·참조 보존 계약이 필요해요. 2D/2.5D/3D에도 Level과 actor organization을 공용 기반으로 검토하되 실제 동작은 하위문서에서 확인해야 해요.

미독·미해결: streaming/PCG/terrain/water·대규모 월드 세부 / actor 분리 저장과 동시편집 / georeferencing·precision API.

### UR018-05 Designing Visuals, Rendering, and Graphics

근거: `blocks[2:70]`, bodyHash `cbf6fdefd6e6940029763171432c88343a3aa4689bfcb0409bacc5270ff6708d`.

본문 목록은 real-time rendering뿐 아니라 Path Tracer의 최종 shot/비교 기준, Movie Render Queue, GPU dump의 RDG 중간 texture/buffer 디스크 기록, Render Resource Viewer의 GPU 자원/asset 추적을 함께 소개해요. Orthographic Camera와 mobile rendering, shader/plugin/threaded rendering, Large World Coordinates rendering, Neural Network Engine도 연결돼요.

HB 설계 판단: 2D/2.5D 카메라·3D 재질/조명과 사람이 쓰는 렌더 디버깅을 함께 요구에 남겨요. C++ 렌더 graph/리소스 계약·머테리얼 노드·AI 설정/진단은 플랫폼/성능 차이를 공유해야 해요. 이 목록만으로 DX11에서 특정 Unreal 렌더 기능의 동등 구현 가능성을 확정하지 않아요.

미독·미해결: Lumen/Nanite/Substrate·platform 제약 / RDG/thread/GPU ownership·API / 비정규 lighting 상대링크 / NNEngine 추론·runtime 계약.

### UR018-06 AI Features, Tools, and Plugins

근거: `blocks[0:5]`, bodyHash `b1a904e42af3b107a71baf3a8008a6f7783a704aed8dddfd7498cb6490e30de3`.

이 루트의 세 항목은 Unreal MCP(editor 기능을 구동하는 MCP 호환 workflow), PCG와 LLM의 MCP workflow, Content Browser에 AI search mode를 추가하는 Semantic Search예요. NPC용 runtime AI의 목록과 목적이 달라요.

HB 설계 판단: 사람 편집과 AI 요청이 같은 검증 가능한 편집 명령으로 합쳐지는 방향을 연구할 근거예요. C++/노드 노출, 쓰기 권한, 반환/오류, 트랜잭션·취소·재현은 이 루트가 제공하지 않으므로 별도 확인해야 해요.

미독·미해결: MCP 실제 도구/스키마·권한·오류 / PCG LLM workflow 세부 / Semantic Search 지원/제약·데이터.

### UR018-07 Creating Visual Effects

근거: `blocks[0].content_html`, bodyHash `b6f22bba70ddedb03687d7ed2ab562e0b42bb0e595a636a1195945c5c0d1ee64`.

본문은 Niagara를 UE5의 주요 VFX 도구로 설명하며 초보에게 editor overview/quick start/key concepts를 권해요. Script Editor로 기존 module을 수정하거나 새 module을 만들 수 있고 GPU raytracing collision은 experimental이라고 해요. Debug Drawing과 실시간 분석 Niagara Debugger도 소개해요.

HB 설계 판단: 사람 system/emitter/module 편집, C++·노드 module 계약, AI 생성/수정/검증을 연결해야 해요. data channel/lightweight emitter/fluids와 성능 분석을 누락하지 않으며 Getting Started 토큰을 URL로 추정하지 않아요.

미독·미해결: Getting Started 토큰의 실제 목적지 / module/node 전체 reference / GPU collision 적용성·thread·성능.

### UR018-08 Gameplay Tutorials

근거: `blocks[0].content_html`, bodyHash `20b85f9ff7d7e3100a91ceb60dfe8d405b752c414a08c3282830ccbb541ce84e`.

8개 링크는 actor component 추가, character movement, actor 찾기, respawn, save/load, pawn possession, game mode, OnHit를 재현하는 튜토리얼이에요. actor 찾기 설명은 Blueprint/C++ 두 경로를 명시해요.

HB 설계 판단: 사람의 제작 결과와 C++/노드/AI의 동일 실행 효과를 비교할 재현 후보로 유지해요. 저장·respawn·possession·충돌은 각각 파일/객체 수명/권한/이벤트 계약을 세부 출처로 조사해야 해요.

미독·미해결: 8개 튜토리얼 전체 본문·코드 / save/load schema·compatibility / possession/OnHit·lifetime API.

### UR018-09 Blueprints Visual Scripting

근거: `blocks[0].content_html`, bodyHash `a31c7839d88bb5f126fb1bbc5ebf82c3ae6c40423127698091bb4366a3e4be0b`.

본문은 node 기반 gameplay scripting으로 OO class/object를 정의하고 C++의 Blueprint 전용 markup으로 디자이너가 확장 가능한 기반 시스템을 제공한다고 설명해요. debugger 항목 설명은 breakpoint로 실행을 멈추고 graph와 변수 값을 확인한다고 해요. Communication/Dispatcher/Interface/Namespace도 후속 목록에 있어요.

HB 설계 판단: 노드 그림 외에 타입·클래스·통신·디버그·C++ 확장·사람 UI·AI graph 편집을 유지해야 해요. root의 미해결 GettingStarted/BP_HowTo 토큰 및 실제 node/member 목록을 해결하기 전에는 전체 Blueprint를 읽은 것으로 세지 않아요.

미독·미해결: 미해결 topic 토큰 3개 / node/schema/compiler·lifetime·pin/API / 통신/namespace/breakpoint·편집 UX 세부.

### UR018-10 Programming with C++

근거: `blocks[0].content_html/html:ul; Section Directory`, bodyHash `40f83fb7e8b2cb449b8022ba6d3ad5d5edb8bf94774e9bf8c74889afa94ed23d`.

본문은 C++ 경험을 전제해요. compile 뒤 class 변경이 editor에 반영된다고 설명하고 reflection/metadata macro로 Editor 기능을 제공해요. delegate는 임의 객체의 member를 type-safe하게 동적 바인딩하고 나중에 호출할 수 있다고 소개해요. Visual Studio 링크의 실제 href는 /documentation/404예요.

HB 설계 판단: C++ 타입/메타데이터→사람 속성 편집→노드 노출→AI 스키마 대응을 같은 자료형 계약으로 조사해야 해요. root 설명만으로 hot reload·compile 실패/복구·delegate 수명·thread를 정하지 않아요.

미독·미해결: publisher 404 link의 공식 대체 / reflection/specifier/containers/delegates 전체 선언 / compile/load/runtime 및 node exposure.

### UR018-11 Gameplay Systems

근거: `blocks[1].items[0:9]; blocks[3].items[0:14]`, bodyHash `67bc0667c50ff160478e4975d77f477cc1423f139aa16d2d8387af17acf91f80`.

본문은 Actor/Camera/Component/Controller/rules/input/timer/UI, Behavior Tree/Mass/State Tree/Nav/SmartObject/EQS/perception/debug, collision/raycast/destruction/cloth/hair physics를 설명해요. LWC의 double precision, 외부 data 기반 gameplay, ability의 cost/cooldown/level/effects, 많은 client의 동기화 및 Mover rollback networking도 소개해요.

HB 설계 판단: runtime AI는 제작용 MCP와 별도 계약이에요. 사람 설정·C++ gameplay 시스템·노드·AI authoring 명령이 상태/수명/권한/rollback 및 정밀도 계약을 공유해야 해요. paragraph href 22개 관계를 기존분야목차에 추가로 보존하고 비정규 AI 상대링크 3개는 미해결로 남겨요.

미독·미해결: AI/physics/ability/network 전체 API / Mass/Nav/Perception 비정규 링크의 공식 목적지 / mover rollback·data/precision 계약.

### UR018-12 Mobile Development

근거: `blocks[0:45]`, bodyHash `aa62ef19e6977d553180316b0c03ae9b8d6919e3fb4af8c85a6d0a6109fa1c4b`.

본문은 Android/iOS/iPadOS/tvOS의 환경 설정부터 device testing·서명/스토어·debug/profile까지 이어져요. preview rendering와 LAN을 통한 real-device input testing을 구별해요. Turnkey, AGDE, GooglePAD, Android File Server, PSO, animation budget, platform services와 automotive HMI의 ASIS/Multi-View도 후속 목록에 있어요.

HB 설계 판단: 사람 project/device UI와 C++/노드/AI build 명령에 platform capability·SDK·서명·device profile·서비스 계약이 필요해요. mobile에서 일부 렌더 기능을 무조건 지원한다고 추론하지 않아요. 외부 영상은 제목만 읽고 내용을 읽은 것으로 세지 않아요.

미독·미해결: 8개 본문 image 픽셀/의미 / external video 전체 내용 / 70개 child 및 mobile API·platform 지원표.

### UR018-13 Animating Characters and Objects

근거: `blocks[0:17]`, bodyHash `3f2ff2fcde8ec2b250102b71a97bc075c487d412f28983786f5992a4b0bdb834`.

skinned mesh를 skeletal mesh asset으로 import한 뒤 Animation Blueprint로 runtime animation logic을 구성하는 흐름이에요. Control Rig graph의 bone transform은 Sequencer에서 재생하거나 standalone asset으로 bake해 runtime animation에 사용할 수 있다고 해요. Paper2D는 sprite 기반 2D와 2D/3D hybrid를 modern light/world/physics와 연결해요.

HB 설계 판단: 2D·2.5D·3D를 삭제하지 않고 공용 scene/render/physics와 연결해요. 사람 rig/timeline editor·C++ animation runtime·animation node·AI rig/bake 명령에 데이터/수명/정밀도 계약이 필요해요. 본문 내부의 추가3개 링크도 탐색 관계에 보존해요.

미독·미해결: animation blueprint/control rig/editor/skeletal mesh 자식 본문 / bake/runtime·2D collision·sprite API / Sequencer 및 reference 전체.

### UR018-14 Motion Design

근거: `blocks[0:5]`, bodyHash `412bec83b1ac804cb50bcae184a896a9406293991ca0c16fc3a2ad8dbb6d2a0b`.

본문은 outliner/UI/rigging/cloner와 2D/3D shape, layered Material Designer를 하나의 제작 도구군으로 소개해요. Rundown과 Transition Logic을 함께 써서 live-updated broadcast graphics를 다루며 product/advertising visuals도 대상이에요.

HB 설계 판단: 사람 outliner/operator stack·C++/노드 logic·AI authoring을 비교할 별도 계약으로 유지해요. layered material 편집을 일반 Material node 편집과 동일 기능이라고 가정하지 않아요. 실시간 broadcast state/version/transition 계약은 하위문서로 남겨요.

미독·미해결: Rundown server/SceneState/transition·operator 계약 / 2D/3D shape/cloner/material API / 변경·취소·저장·live update 의미.

### UR018-15 Creating User Interfaces

근거: `blocks[0].content_html`, bodyHash `fdd0f8eb116042d020434e48c9f8e3265fe711396a22da9bf6193f19289ad1a2`.

본문 디렉터리는 UI build/display, UMG editor/widget, Slate, text/font/localization, optimization/debugging/plugin/examples를 구분해요. Accessibility 구역은 %creating-user-interfaces/accessibility:topic% 토큰이고 실제 하위 URL을 제공하지 않아요.

HB 설계 판단: 사람 UI 제작 도구, C++ Slate/widget 계약, UI 노드, AI 편집 스키마와 접근성은 모두 누적 요구예요. 링크 미해결을 접근성 기능 부재나 분석 면제로 처리하지 않아요.

미독·미해결: Accessibility 실제 전체 목록 / widget/text/font/Slate·editor API / focus/input/localization/performance UX.

### UR018-16 Working with Audio

근거: `blocks[0].blocks[0:2]; blocks[2].items[0:15]`, bodyHash `810c034a6a45bd42c8d6c8b1c69220e8bb3111f578f88c8fc9e36ec15fb997b2`.

include 블록에 실제 두 paragraph가 중첩돼 있어요. 외부 앱에서 clean sound를 한번 제작·import하고 engine 내부 도구로 목표 결과를 만들 수 있다고 설명해요. 목록은 analysis/visualization/debug/memory/mixing/AudioLink/external control/music/source/Soundscape/spatial/submix/volume/reverb를 보존해요.

HB 설계 판단: 사람 오디오 import/mix·C++ runtime resource·audio node·AI sound 명령을 import부터 메모리/공간화까지 연결해야 해요. include를 링크나 빈 블록으로 버리지 않아요. 실제 pin/API/thread 계약은 이 루트에서 확인되지 않았어요.

미독·미해결: audio memory/thread/streaming·실제 API / AudioLink/external control/music 전체 / mixer/spatial/volume/reverb UI/runtime.

### UR018-17 Working with Media

근거: `blocks[0:10]`, bodyHash `3521c2d61f2522438eb7a8348e7b0796d672556eb9c27f02f095d996ce981365`.

본문은 prerecorded media와 live/recorded rendered frame을 설명하며 여러 media source 동기화와 end-to-end color management를 연결해요. 목록에는 professional IO/calibration/in-camera VFX/nDisplay/Composure, GPU data를 CPU 우회 공유하는 TextureShare, DMX/Switchboard/monitor/OpenColorIO/capture가 있어요.

HB 설계 판단: 게임 영상 재생 외의 virtual production 기능도 누적 요구에 남겨요. 사람 timing/color/remote machine 도구·C++ media resource·노드·AI command에 synchronization/GPU ownership/error 계약이 필요해요.

미독·미해결: video IO·clock/sync·color 정확한 계약 / TextureShare GPU lifetime·API / remote/control/capture·plugin 세부.

### UR018-18 Setting Up Your Production Pipeline

근거: `blocks[0:3]`, bodyHash `55ab04f2f447a7c6c0c2bdc55ca4799b5229f7e6f23e27464191559e7b0ebbc0`.

목록은 asset load/unload, DDC, SDK 관리를 자동화하는 Turnkey, Ushell/Zen/build pipeline, deployment/version control/multi-user, virtual assets/redirectors, Blueprint/Python editor automation, ShotGrid/Horde/Remote Iteration을 연결해요.

HB 설계 판단: 사람 협업·설치·캐시 UI와 C++ asset/build API·노드·AI editor automation의 공용 작업 모델이 필요해요. Python editor automation을 gameplay runtime 언어로 확대하지 않아요. 서비스/도구도 별도 corpus root 후보예요.

미독·미해결: DDC/Zen/Horde/Ushell·공식 도구 전체 문서/API / asset loading/reference/redirector serialization / multi-user conflict·automation transaction 계약.

### UR018-19 Testing and Optimizing Your Content

근거: `blocks[0:4]`, bodyHash `a518b9ac8fafe382b50263d139f1fb43f50f7b1d75c0f3f2a3f5ec7677ab1196`.

목록은 preset으로 console variable 공유, crash report, runtime gameplay debugger/VisualLogger, Insights/stats, Zen runtime loader, significance, PSO/Oodle, module 중심 low-level tests, automation unit/feature/stress tests, Android/Linux Clang sanitizer를 구분해요.

HB 설계 판단: 사람 진단 UI와 C++ instrumentation·노드 debug·AI 실행/판독 명령이 같은 실행 기록을 연결해야 해요. 엔진 GUI·SDK/runtime/test는 이번 연구에서 실행하지 않았고 목록의 존재를 HB 검사 통과로 계산하지 않아요.

미독·미해결: 각 tool의 recorder/상태/오류·API / profiling/timing·low-level/automation tests 조건 / platform-specific sanitizer 지원.

### UR018-20 Sharing and Releasing Projects

근거: `blocks[0:17]`, bodyHash `750acb51fd12afbb73f153731568d1c4f51cd846e9cc4fe5b03315c4db4d915d`.

본문은 공통 packaging 절차와 platform별 setup/publishing/debug/optimization 차이를 명시해요. cook/chunk/multiprocess/versioned release/cooked editor와 AutoSDK/device/profile/latency/TVsafezone/ARM64, mobile, OpenXR/handheldAR/input/UI/multi-user/XR devices 및 WebRTC Pixel Streaming도 후속 목록이에요.

HB 설계 판단: 사람 deploy/device UI와 C++ cook/dependency·노드·AI build 명령에는 version/platform/supported target·cancel/error/recovery 계약이 필요해요. XR·cloud streaming과 플랫폼 제한은 별도 전체 목록으로 유지해요.

미독·미해결: platform/cook/ARM64·XR/PixelStreaming 세부 API / restricted consoles 목록·권한 있는 공식 자료 / 각 build operation·취소/복구·지원타깃.

### UR018-21 Samples and Tutorials

근거: `blocks[0:18]`, bodyHash `8c656758ade7b36ab13b53b7b299cf81cc478f34a815d5166c5f2164b7cf1edc`.

본문은 template에 추가 구성 없이 동작하는 character controller/Blueprint 등의 기능이 포함된다고 해요. sample은 호환 engine version이 설치돼야 Fab Library에 나타나요. Fab integration은 5.3 이상, 기존5.3/5.4에는 별도 plugin download, 새 install/update에는 포함된다는 조건을 보존했어요. 진입은 Window > Fab 또는 Content Drawer toolbar의 Fab이며 새 창을 열고 Discover의 UE Samples/search를 사용해요.

HB 설계 판단: 사람 template/import UI와 C++/노드/AI 예제 복제 명령에 version/호환/의존 계약이 필요해요. 실제 예제를 내려받거나 실행하지 않았어요. Fab 제품 문서와 catalog는 Unreal 매뉴얼 외부의 공식 연결 후보로 남겨요.

미독·미해결: 본문 이미지2개의 실제 픽셀/UI / Fab 제품 문서/catalog 및 sample full inventory / template/sample runtime·dependency·compatibility.

## 다음 검증과 열린 범위

독립 검증자는 JSON의 22개 raw/body/text/discovery hash 및 SSR equality를 다시 확인하고 같은 텍스트 전체·중첩 표/include·링크 위치를 직접 대조해야 해요. 398관계 유지/추가25/매뉴얼합422/고유412, 토큰5/상대4/4041, Fab 외부 root와 미독 이미지10·영상1을 각각 확인해야 해요. 같은 담당자의 재계산은 independent verified가 아니에요.

이번 batch에서 읽지 않은 범위는 412개 하위 후보의 본문(읽기0), 그 다음 모든 후속 목록·본문, C++ 타입/멤버/overload, Blueprint action/pin/node reference, Python 선언/상속, Editor/PluginIndex/공식 플러그인·도구·서비스 API 전체 대기열이에요. 일부 하위문서가 다른 batch에서 읽혔어도 이 batch 수로 중복 계산하지 않아요. 공식 sitemap/TOC·동적 토큰·고아/권한/언어/버전·media 대조가 해결되지 않아 전체 manual/API 분모와 closure는 계속 unknown/false예요. 2D·2.5D·3D, 사람 UX, C++/노드, AI 공용 편집 및 새로 발견한 HMI/virtual production/Fab/협업·파이프라인 능력을 누적 범위에서 제거하지 않았어요.
