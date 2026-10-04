# Unreal 홈·21분야 루트 018의 독립 본문 대조

2026-10-04에 짚짱의 `unity_package_catalog_017` 담당자가 다른 담당자의 [018 분석](UNREAL_ROOT_COVERAGE_BODY_018.md)과 [기계 기록](unreal-root-coverage-body-018.json)을 같은 공식 캐시 원문에서 독립 대조했어요. **지정된 22루트의 전체 기술 텍스트·표·include·목록과 분석 의미의 대조는 통과했지만, 전체 Unreal·Unity 본문/API 분석은 미완료예요. 엄격한 원장 승격/verified는 0, `overallComplete=false`, `discoveryClosed=false`를 유지해요.**

저자 원본은 수정하지 않았어요. 저자 MD SHA256은 `bba052e14d3c441fabd17514e2dbd42617bb738029a2699fbb20b9b78b04ff22`, JSON은 `e8be82bd3bb8c81d31f0c8c474332932d3a97647cebce4cbf16836da41bdf92d`이에요. 현행 manifest SHA256 `61b9bd1c2ec18e4c9228293af0f598adc614a0a1e6f4c69745aaa5e020b3e888`의 발견 상태와 본문/API 미확정 분모를 함께 확인했어요. 검증 JSON은 이 문서와 원문·추출물·독립 계산물을 hash로 연결하고, 이 문서는 JSON hash를 포함하지 않아 순환 hash가 없어요.

## 실제 읽기와 재계산 범위

홈 1개와 분야 루트 21개의 `UR018-00`–`UR018-21.read.txt` 86,264자를 모두 읽고, SSR 본문의 paragraph/header/markdown/directory 설명, 중첩 table/list/include와 저자의 22개 의미 분석을 대조했어요. 018과 같은 22범위 재읽기이며 새 고유 본문 확보·하위 본문 읽기·API 선언/overload 읽기는 각각 0개예요. 원문 전체 HTML/클라이언트 전체/영상 전체를 읽었다는 뜻이 아니에요. 클라이언트는 지정 3구간, watch HTML은 `ytInitialPlayerResponse`의 videoDetails/caption track metadata만 부분 읽었어요.

독립 HTMLParser로 raw HTML의 `serverApp-state`에서 document.json payload를 다시 추출해 저장 SSR JSON과 22개 모두 구조적으로 같음을 확인했어요. 각 source/SSR/text/discovery 88개 hash와 저자의 evidence artifact 10개 hash가 모두 맞아요. source 텍스트의 paragraph/heading/list와 custom directory attribute를 나눈 1,063구간은 읽은 텍스트에서 빠짐없이 확인됐어요. 이 자동 일치 검사는 직접 의미 읽기의 보조 증거이며 읽기를 대신하지 않아요.

SSR의 재귀 block은 300개예요: document_list126, paragraph88, header57, enhanced_table1, enhanced_table_header4, enhanced_list5, markdown6, image10, external_video1, include1, callout1이에요. markdown 내부 heading/directory와 중첩 block은 각각 다시 확인했으며 block300을 heading300이나 API300으로 바꾸지 않아요. Content 표 `UR018-03 blocks[1].rows[0:3]`는 3행/6셀 container, header4(빈 header1 포함), 내부 목록8/외부7을 실제 읽었어요. Audio include `UR018-16 blocks[0].blocks[0:2]`의 두 paragraph를 빠뜨리지 않았어요. 이 root에 formal API 선언/overload의 전체 목록을 확인한 사례는 없어요.

## 전체 루트 목록과 하위 발견 관계

공식 홈의 21개 URL과 검증된 21개 분야 루트 집합이 같고, 기존21분야와도 같아요. 기존398관계는 유지돼요. 그중 C++의 실제 publisher4041을 정상 매뉴얼 후보에서 빼고 Gameplay22/Animation3 관계를 더해 분야별 정상 매뉴얼 후보 합은 **422=398−1+25**, 분야 간 중복 제거한 하위 URL은 **412**예요. 추가25관계는 모두 이전16,216발견 후보 안에 있어 새 고유 매뉴얼 URL0이며, 부모 관계의 확장과 새 본문 읽기를 구분해요. 각 root의 manual 후보는 아래에 적고 홈21은 하위412집계에서 제외해요.

| root | root내 고유 Manual 후보 | 의미 대조의 핵심 |
| --- | ---: | --- |
| UR018-00 Unreal Engine 5.8 Documentation | 21 | 홈의 21분야와 실제 21개 분야 루트가 같아요. 각 소개·목적·하위 URL은 입구 범위이며 하위 본문 상태를 상속하지 않아요. |
| UR018-01 What's New | 4 | Beta와 Experimental의 배포/안정성 차이를 유지하고 UE4→UE5 migration을 별도 후속 계약으로 남겼어요. |
| UR018-02 Understanding the Basics | 52 | 설치→Editor/Content Browser→project/template→Level/Asset→Actor/Component→Play/Simulate→Packaging의 연결, 최소 한 Level, Actor의 여러 Component 가능성을 대조했어요. |
| UR018-03 Working with Content | 17 | 표의 Editor 내부 8종/외부 7종과 Mutable의 runtime 생성 설명을 확인했어요. APEX가 표에 남아 있다는 사실만으로 현행 지원을 확정하지 않아요. |
| UR018-04 Building Virtual Worlds | 13 | 작은 시각화 환경/큰 open world와 Level Streaming의 플레이 중 비동기 로드·언로드/메모리 절감 설명을 확인했어요. 설명 속 UE4 georeferencing은 버전 대조 대기예요. |
| UR018-05 Designing Visuals, Rendering, and Graphics | 60 | Path Tracer의 최종 shot/기준, RDG 중간 리소스 dump, GPU 자원 추적과 orthographic/mobile/NNEngine을 모두 후속 목록에 보존해요. 상대 lighting href를 slug로 추정하지 않아요. |
| UR018-06 AI Features, Tools, and Plugins | 3 | 세 항목은 Editor MCP, PCG/LLM workflow, Content Browser Semantic Search예요. runtime NPC AI와 역할을 구분한 저자 해석이 본문과 같아요. |
| UR018-07 Creating Visual Effects | 8 | Niagara Script Editor의 module 수정/생성, experimental GPU raytracing collision과 Debugger를 대조했고 Getting Started 토큰 1개를 보존했어요. |
| UR018-08 Gameplay Tutorials | 8 | 튜토리얼 8개와 actor 찾기의 Blueprint/C++ 두 경로를 확인했어요. save/load·respawn·possession·OnHit의 세부 계약은 이 입구에 없어요. |
| UR018-09 Blueprints Visual Scripting | 11 | OO class/object, C++ Blueprint markup, breakpoint와 변수 확인을 확인하고 미해결 topic 3개를 유지해요. |
| UR018-10 Programming with C++ | 8 | C++ 경험 전제, reflection/metadata macro, compile 뒤 class 반영, type-safe delegate 소개를 확인했어요. Visual Studio href 자체가 /documentation/404예요. |
| UR018-11 Gameplay Systems | 36 | Runtime AI/physics·LWC double·data-driven gameplay·GAS cost/cooldown/level·network·Mover rollback과 본문 추가22관계를 확인했어요. |
| UR018-12 Mobile Development | 70 | mobile platform의 setup→device/debug/profile→서명/store, preview와 LAN device input의 차이, ASIS/Multi-View HMI를 확인해요. 영상 내용과 이미지 UI는 읽은 것으로 세지 않아요. |
| UR018-13 Animating Characters and Objects | 7 | skeletal import→Animation Blueprint, Control Rig의 Sequencer/standalone bake runtime 흐름과 Paper2D의 2D/3D hybrid 설명 및 추가3관계를 대조했어요. |
| UR018-14 Motion Design | 6 | 2D/3D shapes, outliner/cloner/rig, layered Material Designer, Rundown/Transition Logic의 live broadcast 용도를 확인했어요. |
| UR018-15 Creating User Interfaces | 12 | UMG/Slate·text/font/localization·optimization/debug의 목록을 확인했어요. Accessibility는 unresolved topic 1개예요. |
| UR018-16 Working with Audio | 15 | include 안 두 paragraph를 실제 대조하고 외부 clean sound를 한 번 제작한 뒤 import→engine 내부 가공하는 흐름 및 audio15topic을 확인했어요. |
| UR018-17 Working with Media | 20 | prerecorded/live rendered frame·sync/color와 TextureShare의 GPU 공유/CPU 우회, nDisplay/DMX/Switchboard 등 virtual production을 보존했어요. |
| UR018-18 Setting Up Your Production Pipeline | 17 | asset load/DDC/Turnkey/Zen/ushell/build, 협업/virtual assets/redirectors, BP/Python Editor automation과 Horde/ShotGrid 목록을 확인해요. |
| UR018-19 Testing and Optimizing Your Content | 16 | console preset/crash/debug/Insights/Zen runtime loader/PSO/Oodle와 low-level·automation tests, Android/Linux sanitizer를 구분했어요. |
| UR018-20 Sharing and Releasing Projects | 34 | platform별 publishing/debug/optimization 차이와 cook/chunk/multiprocess/versioned release, AutoSDK/ARM64/XR/PixelStreaming 전체 목록을 보존해요. |
| UR018-21 Samples and Tutorials | 5 | template의 이미 구성된 controller/BP, 설치된 호환 engine 조건과 Fab 5.3+, 기존5.3/5.4의 별도 plugin 조건, Window>Fab/Content Drawer 흐름을 대조했어요. |

미해결 토큰5는 VFX1, Blueprint3, UI Accessibility1이에요. 상대참조4는 Rendering lighting1과 Gameplay Mass/Nav/Perception3이고 역슬래시를 포함한 값을 정상 slug로 추정하지 않았어요. C++ Visual Studio의 `https://dev.epicgames.com/documentation/404`는 href 자체의 publisher404이며 검증자가 새 HTTP404 요청을 한 것이 아니에요. Fab catalog와 Fab 구매/다운로드 제품 문서는 실제 외부 기능 연결로 보존했지만 그 하위 본문은 이번에 읽지 않았어요.

## 이미지·영상과 동적 구조의 한계

본문 image10은 Mobile8/Samples2이고 모두 서로 다른 storage key예요. 각 SSR 이미지 metadata, 원래 DOM href와 연결된 href/src/srcset 46속성을 재추출해 저자 기록과 모두 맞음을 확인했어요. 원문이 제공한 모든 관련 URL은 같은 공식 image API이고 그 이미지 block/DOM에는 별도 CDN endpoint가 없어요. directory thumbnail/banner metadata에는 다른 이미지가 있을 수 있어 이를 본문10이미지의 대체 픽셀로 간주하지 않았어요.

저자의 10개 원래 href 요청 기록은 HTTP403/textHTML이고, 각 보존 오류 bytes의 hash·길이·HTML 여부를 대조했어요. 검증자의 새 HTTP 재요청0/픽셀읽기0이며 source가 제공한 다른 크기 URL도 새로 요청하지 않았어요. 403을 전체 공식 media 접근불가나 다른 URL의 실패로 확대하지 않아요. 이미지의 실제 UI/그림 의미는 미독이에요.

Mobile `blocks[44]`의 external_video1은 embed/watch 두 URL의 동일 영상이에요. 공식 SSR의 caption/embed/watch/autoplay와 보존 watch HTML SHA256 `64cb02b5a5b68b880f2eb01b8e3f2b9563322432b5531478c1bc68bd79740f05`에서 videoDetails/caption track metadata를 다시 확인했어요. 제작자 Unreal Engine·길이2584초·en/asr 한 track은 저자 기록과 같아요. 이 ASR track은 플랫폼 자동 생성이며 검증된 저자 기술 transcript로 사용하지 않아요. 영상 재생·전체 시청·자막/전체 transcript 본문 읽기0이에요. 첫 watch HTTP attempt는 raw가 보존되지 않아 그 응답 자체는 독립 검증할 수 없고, 현재 보존된 snapshot1만 근거로 사용했어요.

22 SSR의 locale=en-us/Unreal version5.8 metadata가 저자 기록과 맞아요. canonical의 lang query에는 application_version이 없으므로 URL만으로 버전을 고정하지 않아요. cached transport에 TOC response 없음, 이 22body에 paging/hidden=true/draft item 없음은 해당 snapshot에서의 관찰이에요. 지정 client 3구간의 실제 offset/내용을 재대조했어요. document_list는 data.items와 draft role filter를 사용하고, TOC GET은 path/lang/application_version을 보내며 sidebar는 별도 unpublished/확장 상태가 있어요. 전체 클라이언트, 실제 동적 GUI, 권한 있는 목록, 자손의 switch/link_group/rich_text/comparison/sequence slider 및 전체 TOC의 폐쇄는 확인하지 못했어요.

## 판정과 계속 읽을 범위

저자의 root 사실·불확실성과 HB 판단이 구분되어 있어요. C++/노드/사람 UI/AI의 공용 데이터·명령·실행·오류/복구 대응은 설계 과제이며 root의 제한된 소개를 실제 API·지원·구현 계약으로 확대하지 않았어요. 2D·2.5D·3D, HMI, virtual production, Fab, 협업/production 및 플랫폼/SDK도 누적 범위에 남겨요. 엔진·SDK·runtime·tests 실행/구현, foreground UI 변경, 원장 승격은 하지 않았어요.

412하위 후보의 전체 본문과 그 후속 링크, C++ 타입/멤버/overload, Blueprint node/pin/action reference, Python 선언/상속, Editor/PluginIndex/공식 플러그인·도구·서비스, Fab제품/catalog, topic5/상대4/404대체, 본문 image10/video1 및 전체 media inventory, TOC/sitemap/권한/판본/언어/고아 문서가 열린 대기열이에요. 이전 manifest의 상태 목록에서 59요청/54본문/16,216후보와 shell5를 독립 재계산했어요. 이전54본문 전부를 이번에 읽었다는 뜻이 아니며 이전 수집·부분 연구 수를 이번 새 읽기로 합산하지 않아요. 현재 지정 텍스트의 대조 통과는 전체 corpus/API verified나 완료율이 아니에요.

기계별 source/body/구역 locator·hash, 의미 대조, 발견 관계와 미독 판정은 [독립 검증 JSON](unreal-root-coverage-body-verification-018.json)에 있어요. private 원문과 계산물은 Git ignored `native/build/reference-corpus/unity-package-catalog-batch-017/verify-018` 및 저자의 `unreal-root-coverage-batch-018`에 보존해요.
