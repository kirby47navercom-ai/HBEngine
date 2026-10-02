# HBEngine 공식 문서 조사와 구현 대조

기준일: 2026-10-02. 조사 단위는 기능 이름이 아니라 **만들기 → 편집 → 저장 → 배치/참조 → 실행 → 진단 → 재열기** 흐름이다. 전체 설계는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 조작 계약은 [편집기 기준](EDITOR_INTERACTION_SPEC.md), 그래프와 C++ 상태는 [블루프린트 기준](BLUEPRINT_SPEC.md)에 연결한다.

## 조사 상태의 의미

| 상태 | 실제로 확인한 것 | 포함하지 않는 것 |
| --- | --- | --- |
| `indexed` | 공식 목차의 제목·분야·URL을 수집했다. | 해당 본문·하위 링크를 읽었다는 주장 |
| `overview` | 분야 개요 본문과 하위 주제 구성을 읽고 제작 요구를 대조했다. | 그 분야의 모든 하위 매뉴얼·API 분석 |
| `detail` | 아래 세부 조사 표에 적은 본문·조작·실행 의미를 확인했다. | 연결된 모든 페이지나 엔진 소스 전체 분석 |

[Unity 인덱스](reference-index/unity-manual.json)는 공식 Unity 6000.0 매뉴얼 목차 **3,127항목**을 포함한다. 인덱스 상태는 `overview` 34항목, `indexed` 3,093항목이다. 세부 본문 확인은 아래 표를 추가 근거로 사용하며, 목차 수집 수를 본문 분석 완료 수로 쓰지 않는다. Unity Scripting API 전체와 개별 패키지 매뉴얼 전체는 이 3,127항목의 분모가 아니다. 원본은 [공식 매뉴얼 목차](https://docs.unity3d.com/6000.0/Documentation/Manual/docdata/toc.js)다.

[Unreal 인덱스](reference-index/unreal-sections.json)는 조사 당시 공식 문서 홈이 표시한 **Unreal 5.8**의 최상위 **21분야**와 그 개요에서 식별한 **398개 하위 주제 항목**을 담는다. 21분야는 `overview`, 하위 항목은 `indexed`다. 같은 URL이 여러 분야에 나타날 수 있으며 398은 전체 Unreal 문서·API 개수도, 고유 본문 분석 개수도 아니다. 원본은 [Epic 공식 문서 홈](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-documentation)이다.

`native/build/reference-cache`의 개요 본문을 읽어 아래 분야 대조를 작성했다. 원문 캐시는 Git에 넣지 않는다. 공식 본문을 대량 복제하는 대신 URL·판단·코드 근거를 저장한다. 인덱스에 이름이 있다는 이유로 기능을 완료 처리하지 않는다.

## Unity 34분야: 개요 본문과 HB 제작 요구

아래 공식 링크는 모두 개요 본문 확인 범위다. 코드 경로는 현재 구현의 근거이고, ‘남은 구현’은 이 분야에서 다음 작업을 판정할 구체적인 요구다.

| 공식 분야 | 제작 흐름에서 확인할 요구 | 현재 코드 근거 | 남은 구현 |
| --- | --- | --- | --- |
| [Manual](https://docs.unity3d.com/6000.0/Documentation/Manual/UnityManual.html) | 분야별 도구·런타임·플랫폼을 한 프로젝트 흐름에 연결 | 이 문서·`ENGINE_PLAN.md` | 분야 간 완료 조건을 실제 게임 제작으로 검증 |
| [What's new](https://docs.unity3d.com/6000.0/Documentation/Manual/WhatsNew.html) | 버전별 기능·변경 구분 | 버전 있는 JSON 검증 | 엔진 버전별 변경 기록·호환성 표 |
| [Get started](https://docs.unity3d.com/6000.0/Documentation/Manual/get-started.html) | 설치·프로젝트 생성·설정·첫 실행 | `tools/project-service.mjs`의 실제 프로젝트 폴더 | 네이티브 설치·최근 프로젝트·프로젝트 선택기 |
| [Upgrade](https://docs.unity3d.com/6000.0/Documentation/Manual/UpgradeGuides.html) | 순차 버전 변경·코드/에셋 호환성 | `validAsset`/`validBlueprint`의 버전 검사 | 백업·데이터 마이그레이션·실패 복원 |
| [Building Blocks](https://docs.unity3d.com/6000.0/Documentation/Manual/building-blocks.html) | 반복 제작을 동작하는 구성으로 제공 | 클래스별 기본 컴포넌트 템플릿 | 조작 가능한 2D·3D 캐릭터/상호작용 템플릿; 서비스 구성은 별도 |
| [Editor interface](https://docs.unity3d.com/6000.0/Documentation/Manual/unity-editor.html) | 창·포커스·검색·설정·자동화 | `app.js`·`dock-layout.js`·`editor-shell.css` | 단축키 재설정·명령 충돌 검사·설정 프로필 |
| [Packages](https://docs.unity3d.com/6000.0/Documentation/Manual/PackagesList.html) | 기능 묶음·의존성·버전·진단 | npm 개발 의존성만 사용 | 사용자 플러그인 등록·버전 잠금·의존성 충돌 UI |
| [Assets and media](https://docs.unity3d.com/6000.0/Documentation/Manual/assets-and-media.html) | 원본·변환 결과·임포트 설정·런타임 로딩 분리 | `project-service.mjs`·`project-browser.js`·`asset-documents.js` | 임포터별 변환·재가져오기·하위 에셋·의존성 갱신 |
| [2D](https://docs.unity3d.com/6000.0/Documentation/Manual/Unity2D.html) | Sprite·Tilemap·2D 물리·2D 조명 | XY 직교 뷰·이미지 미리보기 | Sprite 분할/Pivot/Sorting·타일 팔레트·2D 충돌 solver |
| [XR](https://docs.unity3d.com/6000.0/Documentation/Manual/XR.html) | 장치·추적·양안 화면·입력·실행 | 미구현 | XR 장치 계층·스테레오 렌더·상호작용·빌드 |
| [Multiplayer](https://docs.unity3d.com/6000.0/Documentation/Manual/multiplayer.html) | 접속·세션·상태 동기화·검증 | 미구현 | 권한·복제·RPC·지연/끊김 검사 |
| [Platforms](https://docs.unity3d.com/6000.0/Documentation/Manual/PlatformSpecific.html) | 플랫폼별 기능·SDK·출력·오류 | Windows g++ 작업 프로세스 | Win32/DX11 게임 실행 파일·타깃 빌드 프로필 |
| [GameObjects](https://docs.unity3d.com/6000.0/Documentation/Manual/working-with-gameobjects.html) | 컴포넌트·Transform·활성·태그·레이어·Prefab | `model.js`·`blueprint-model.js`·`engine-services.js` | 프리팹/Variant·인스턴스 오버라이드·컴포넌트 전체 생명주기 |
| [Scenes](https://docs.unity3d.com/6000.0/Documentation/Manual/working-with-scenes.html) | 생성·저장·다중 장면·템플릿·텍스트 데이터 | 독립 Scene 문서·환경 프리셋 | 다중 장면 동시 월드·런타임 장면 전환·스트리밍 |
| [Cameras](https://docs.unity3d.com/6000.0/Documentation/Manual/Cameras.html) | 직교/원근·여러 카메라·출력·종횡비 | 독립 카메라 뷰포트·`OrbitControls` | Game View 카메라 지정·물리 카메라·culling·출력 텍스처 |
| [World building](https://docs.unity3d.com/6000.0/Documentation/Manual/CreatingEnvironments.html) | 하늘·Terrain·환경 편집과 런타임 최적화 | 도형·태양/하늘/구름/안개 미리보기 | Terrain 페인트·식생·LOD·큰 월드 로딩 |
| [Physics](https://docs.unity3d.com/6000.0/Documentation/Manual/PhysicsSection.html) | 2D/3D 물리의 다른 구현과 힘·충돌·시간 단계 | AABB 겹침/Hit·메시 Raycast·속도 갱신 | 강체 solver·고정 시간 단계·joint·CCD·2D 전용 물리 |
| [Input](https://docs.unity3d.com/6000.0/Documentation/Manual/Input.html) | 장치 입력과 게임 동작·UI/IME 문맥 분리 | `input-actions.js`·IA/IMC 전용 문서 | 게임패드/마우스 축·리바인딩·플레이어별 문맥·C++ 액션 구독 |
| [UI systems](https://docs.unity3d.com/6000.0/Documentation/Manual/UIToolkits.html) | 편집기 UI와 게임 UI 제작/런타임 구분 | 편집기 DOM·기본 게임 위젯 서비스 | 게임 Widget Designer·Anchor/레이아웃·상태/데이터 바인딩 |
| [Animation](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationSection.html) | 속성 커브·클립·Animator·상태/블렌드·리타깃 구분 | Timeline·Transform Animation/Curve 파일·미리보기·대상 Transform 재생/정지 | 임의 속성/Animation 이벤트 트랙·Skeleton·Anim Graph·상태 머신·블렌드/리타깃 |
| [Audio](https://docs.unity3d.com/6000.0/Documentation/Manual/Audio.html) | Clip/Source/Listener·공간음향·Mixer·효과·진단 | 브라우저 오디오 재생/정지/음량 | 3D 감쇠·버스/믹서·DSP·네이티브 오디오 백엔드 |
| [Video](https://docs.unity3d.com/6000.0/Documentation/Manual/Video.html) | 소스·디코더·플레이어·오디오·스트리밍·연출 | 파일 보존·브라우저 media 미리보기 | AVI 등 코덱별 변환·Seek/동기화·시퀀스 연출 |
| [Lighting](https://docs.unity3d.com/6000.0/Documentation/Manual/LightingOverview.html) | 직접/간접광·그림자·반사·환경·품질 | Three 광원·환경·그림자 설정 | DX11 조명·GI/Lightmap·반사 probe·측정 가능한 품질 단계 |
| [Materials and shaders](https://docs.unity3d.com/6000.0/Documentation/Manual/materials-and-shaders.html) | 텍스처·표면·Shader·색 공간·HDR·진단 | 머테리얼 독립 그래프·색/스칼라 계산·장면 할당 | Texture/UV/Normal/연산 노드·HLSL 생성·GPU 컴파일·인스턴스 |
| [VFX](https://docs.unity3d.com/6000.0/Documentation/Manual/visual-effects.html) | 파티클·Decal·Trail·효과 그래프와 실행 | 미구현 | emitter/system·모듈/노드 편집·CPU/GPU 시뮬레이션·진단 |
| [Render pipelines](https://docs.unity3d.com/6000.0/Documentation/Manual/render-pipelines.html) | 대상별 렌더 경로·재질/광원 호환성 | Three/WebGL 프로토타입 | Win32/DX11 패스·자원 수명·상태·품질/기능 계약 |
| [Post-processing](https://docs.unity3d.com/6000.0/Documentation/Manual/post-processing-and-full-screen-effects.html) | 화면 효과의 렌더 경로·지원 차이 | 기본 노출/tone mapping | 볼륨·Bloom/AO/DOF·효과 순서·GPU 비용 |
| [Programming](https://docs.unity3d.com/6000.0/Documentation/Manual/scripting.html) | 코드 작성·컴파일·재로딩·진단과 편집기 연결 | 공통 C++ API·native host·외부 IDE 열기 | 다중 번역 단위·IDE 프로젝트 생성·native 디버거·DLL 교체 |
| [Optimization](https://docs.unity3d.com/6000.0/Documentation/Manual/analysis.html) | CPU/GPU/메모리 측정과 타깃 실험 | 로그·그래프 실행량 제한·숨긴 창 업데이트 가드 | Profiler·메모리/자원 추적·GPU 타이밍·캡처 |
| [Build/publish](https://docs.unity3d.com/6000.0/Documentation/Manual/building-and-publishing.html) | Player·내용 출력·설정·캐시·재현 빌드 | 사용자 C++ 호출 worker 빌드 | 게임 build/cook/package·독립 폴더 실행·설치/출시 |
| [Services](https://docs.unity3d.com/6000.0/Documentation/Manual/UnityServices.html) | 계정·세션·분석·배포 서비스와 게임 분리 | 미구현 | 엔진 확장 경계·서비스 오류/인증·사용자 선택 |
| [Best practices](https://docs.unity3d.com/6000.0/Documentation/Manual/best-practice-guides.html) | 분야별 제작·운영·최적화 검증 기준 | 공통 API·저장 검증·재현 스크립트 | 예제 게임·실측·팀 제작/버전 관리 시나리오 |
| [Troubleshooting](https://docs.unity3d.com/6000.0/Documentation/Manual/TroubleShooting.html) | 가져오기/코드/렌더/플랫폼 오류 원인과 복구 | 파일 검증·컴파일 오류·실행 오류 로그 | 분야별 진단 위치·실패 결과 복구·크래시 보고 |
| [Glossary](https://docs.unity3d.com/6000.0/Documentation/Manual/Glossary.html) | 동명 용어의 역할·단위 구분 | 에셋 타입·BP/Clip/Timeline 구분 | 도움말의 한국어/영어 용어 사전·동작 단위 명시 |

## Unreal 21분야: 개요 본문과 HB 제작 요구

| 공식 분야 | 제작 흐름에서 확인할 요구 | 현재 코드 근거 | 남은 구현 |
| --- | --- | --- | --- |
| [What's New](https://dev.epicgames.com/documentation/unreal-engine/whats-new) | 릴리스·migration·실험/안정 기능 구분 | 버전 있는 에셋 형식 | 기능별 안정성/호환성·migration 기록 |
| [Basics](https://dev.epicgames.com/documentation/unreal-engine/understanding-the-basics-of-unreal-engine) | 창·키·프로젝트·콘텐츠·Actor·실행·패키징 연결 | 독립 문서·Project·클래스 생성·Play | 설정 가능한 키·프로젝트 선택·Prefab·패키징 |
| [Content](https://dev.epicgames.com/documentation/unreal-engine/working-with-content-in-unreal-engine) | 외부 Mesh/Skeleton/Texture와 내부 에셋의 임포트 경계 | 원본 디스크 보존·OBJ/GLTF 미리보기 | FBX/Interchange 수준 변환·하위 에셋·축/단위·재가져오기 |
| [Virtual Worlds](https://dev.epicgames.com/documentation/unreal-engine/building-virtual-worlds-in-unreal-engine) | 레벨·환경·조명·배치·큰 월드 제작 | 레벨 파일·기본 도형·환경 프리셋 | Landscape/Foliage·메시 편집·월드 분할/스트리밍 |
| [Rendering/Graphics](https://dev.epicgames.com/documentation/unreal-engine/designing-visuals-rendering-and-graphics-with-unreal-engine) | 표면·빛·그림자·품질·렌더 자원·진단 | Three 표면/광원·머테리얼 문서 | DX11/HLSL·LOD/culling·GPU 측정·GI/반사 |
| [AI Tools/Plugins](https://dev.epicgames.com/documentation/unreal-engine/ai-features-tools-and-plugins-in-unreal-engine) | 제작 자동화·검색·도구 연결과 게임 AI 구분 | 안정적인 텍스트 에셋/ID·검증 | 편집 명령 API·변경 검토·도구 프로토콜·semantic 검색 |
| [VFX](https://dev.epicgames.com/documentation/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine) | System/Emitter/Module·시뮬레이션·편집기·진단 | 미구현 | 효과 에셋·모듈 그래프·preview·CPU/GPU 실행 |
| [Gameplay Tutorials](https://dev.epicgames.com/documentation/unreal-engine/gameplay-tutorials-for-unreal-engine) | 실제 게임 메커니즘을 코드/노드로 재현 | 문 C++/BP 실행 예제 | 캐릭터·카메라·아이템·상호작용·2D 예제 게임 |
| [Blueprint](https://dev.epicgames.com/documentation/unreal-engine/blueprints-visual-scripting-in-unreal-engine) | 객체 클래스·그래프·통신·디버그·C++ 확장 | 373종 내장 노드·VM·문서별 BP | BP 상속/부모 호출·로컬 변수·Struct/Enum/Map/Set·라이브러리 |
| [C++](https://dev.epicgames.com/documentation/unreal-engine/programming-with-cplusplus-in-unreal-engine) | Reflection·클래스·컨테이너·Delegate·IDE/컴파일 | HB 메타데이터·289 공통 API·host | 추가 타입·다중 소스/라이브러리·IDE 프로젝트·DLL·동기 override |
| [Gameplay Systems](https://dev.epicgames.com/documentation/unreal-engine/gameplay-systems-in-unreal-engine) | Framework·Input·Physics·AI/Nav·Ability·네트워크 | 부모 7종·입력 에셋·시간/기본 충돌 | Possession·게임 규칙·Character solver·Navigation/Behavior·Ability·복제 |
| [Mobile](https://dev.epicgames.com/documentation/unreal-engine/getting-started-with-mobile-development-in-unreal-engine) | SDK·장치·성능·플랫폼 서비스·출시 | 미구현 | 모바일 렌더/입력·SDK 빌드·실장치 검증 |
| [Animation](https://dev.epicgames.com/documentation/unreal-engine/animating-characters-and-objects-in-unreal-engine) | Skeletal/AnimBP·Sequencer·Control Rig·Paper2D 구분 | Timeline·Transform Animation/Curve 문서·대상 Transform 실행 | Animation 이벤트 트랙·Skeleton/포즈·상태/블렌드·Rig·다중 대상 Sequencer·Flipbook |
| [Motion Design](https://dev.epicgames.com/documentation/unreal-engine/motion-design-in-unreal-engine) | 도형·cloner·리깅·재질·전환/연출 구성 | 기본 도형 배치 | 절차적 도형/복제·레이어 재질·연출 제어 |
| [UI](https://dev.epicgames.com/documentation/unreal-engine/creating-user-interfaces-with-umg-and-slate-in-unreal-engine) | Designer/Widget·텍스트/폰트·접근성·최적화 | 기본 Widget 서비스·편집기 DOM | 게임 UI 에셋·Designer·바인딩·폰트/지역화·포커스 |
| [Audio](https://dev.epicgames.com/documentation/unreal-engine/working-with-audio-in-unreal-engine) | 소스·감쇠·버스·mix·메모리·진단 | 브라우저 음원 재생 | Sound graph·3D audio·Mixer/Submix·native backend |
| [Media](https://dev.epicgames.com/documentation/unreal-engine/working-with-media-in-unreal-engine) | Source/Player·색 관리·동기·캡처/출력 | 파일 보존·지원 코덱 preview | 디코더/변환·영상 동기·캡처·영상 텍스처 |
| [Production Pipeline](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-production-pipeline-in-unreal-engine) | 에셋 관리·캐시·버전 관리·redirect·자동화 | `.hbredirects.json`·파일 ID·Git | 의존성 viewer·redirect 정리·DDC·source control UI·자동화 |
| [Testing/Optimization](https://dev.epicgames.com/documentation/unreal-engine/testing-and-optimizing-your-content) | 성능 계측·로그·크래시·자동 검사 | `tools/check-*.mjs`·실행 제한·로그 | native/GPU Profiler·추적 캡처·크래시/메모리 진단 |
| [Release](https://dev.epicgames.com/documentation/unreal-engine/sharing-and-releasing-projects-for-unreal-engine) | Build/Cook/Package/Deploy와 타깃 차이 | 사용자 함수 worker 빌드 | DX11 Player·cook/chunk·배포·기기/타깃 프로필 |
| [Samples](https://dev.epicgames.com/documentation/unreal-engine/samples-and-tutorials-for-unreal-engine) | 동작하는 템플릿을 열고 분해·확장 | `prototype/examples` | 2D/2.5D/3D 제작→배포 전체 샘플 |

## 세부 본문 확인과 이번 변경의 대응

아래 `detail`은 적힌 주제의 본문을 확인한 상태다. 전체 분야 개요와 별도로 관리한다.

| 공식 본문 | 확인한 동작 | HB 대응·코드 | 차이/미구현 |
| --- | --- | --- | --- |
| [Epic Blueprint UI](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-user-interface-for-blueprint-classes-in-unreal-engine) | Components/My Blueprint/Graph/Details; 추가 Debug/Compiler/Find/Viewport | 독립 BP 문서와 클래스 컴포넌트 viewport, `app.js:openComponentViewport` | Skeletal/카메라 등 전체 컴포넌트 시각화와 계층 구성 |
| [Epic Cheat Sheet](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine) | PageDown 자식/PageUp 부모; Ctrl+B 위치 찾기; 문맥 키/핀/변수 조작 | `app.js`의 그래프 이동/검색·키 처리, `EDITOR_INTERACTION_SPEC.md` | 전체 키 프로필·변수 드래그·Ctrl 배선 이동·정렬·북마크 |
| [Epic Best Practices](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-best-practices-in-unreal-engine) | 재사용 클래스·로컬 변수; 함수/매크로 실행·지연 차이; 문맥 검색 | 파일별 BP·함수/매크로 VM·지연 함수 거부 | 로컬 변수·BP 상속; HB 매크로 VM은 UE의 컴파일 시 확장 방식과 다름 |
| [Epic Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) | Actor/Pawn/Character/Controller/GameMode의 관계와 수명 | `class-types.js`의 부모 7종·기본 컴포넌트, `Game.hpp` 기반형 | Possess/Unpossess·플레이어 생성·GameState/Instance·Character 이동/점프는 미구현 |
| [Epic Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) | typed IA·Context 우선순위·소비·Started/Triggered/Completed·Modifier/Trigger | `input-actions.js`, `asset-editor-ui.js`, `loadSceneBindings`; 에셋 이름으로 이벤트 검색 | Ongoing/Canceled·Hold/Tap/Chord·런타임 Context 교체·플레이어별/C++ 직접 리스너 |
| [Epic Material Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-editor-ui) | preview/graph/details/palette·저장/적용·HLSL/통계 역할 | 파일별 머테리얼 그래프·색/스칼라/표면 계산·장면 할당 | 현재는 제한된 표면 계산이다. HLSL 생성·Shader 컴파일·재질 함수/인스턴스·전체 편집 조작은 미구현 |
| [Epic Redirectors](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-redirectors-in-unreal-engine) | 이동/이름 변경 뒤 구 참조 유지·Fixup·이름 재사용 주의 | `project-service.mjs`의 영속 경로 redirect·재시작 뒤 해석·롤백 | 참조 파일 자체 갱신/Fixup·의존성/삭제 진단 UI |
| [Epic Visual Studio](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine) | 소스 IDE 환경과 C++ 프로젝트/도구 연결 | `external-editor.mjs`: VS 우선·VSCode 대체, 실제 `.h/.cpp` 생성 | `.sln/.vcxproj`·빌드 설정/IntelliSense 생성·IDE 디버거 연결 |
| [Unity Workspace](https://docs.unity3d.com/6000.0/Documentation/Manual/CustomizingYourWorkspace.html) | 탭 이동/분할 미리보기·최대화·여러 창·레이아웃 저장/복구 | `dock-layout.js`·독립 파일 탭·문서별 배치 | OS 부동창·레이아웃 파일/명명 프로필 |
| [Unity Project](https://docs.unity3d.com/6000.0/Documentation/Manual/ProjectView.html) | 실제 폴더/파일·생성 메뉴·검색 범위·타입/라벨 OR/AND·포커스 키 | `project-browser.js`의 폴더/다중 선택·생성·검색·내용 검색 | 라벨/즐겨찾기·OR 타입 필터·전체 트리 키/아이콘 크기 프로필 |
| [Unity Shortcuts](https://docs.unity3d.com/6000.0/Documentation/Manual/ShortcutsManager.html) | 전역/문맥 명령·충돌·변경·프로필 | 텍스트/IME/게임 입력 포커스 가드·문서 단축키 | 검색/변경 가능한 키 설정·충돌 UI·사용자 프로필 |
| [Unity Animation Curves](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-AnimationCurves.html) | 속성 커브/키·Dopesheet/Curve 표현·여러 속성·Euler/Quaternion 보간 차이 | 같은 `sampleTimeline` 커브 평가로 position/rotation/scale 실행; HB 회전은 XYZ Euler degree | 임의 속성·Quaternion 보간·Skeleton/블렌드. HB 실행 규칙을 Unity Animator와 동일하다고 표현하지 않음 |

이전 세부 조사(변수·함수·통신·생명주기·Timeline·Animation·충돌·임포트·직렬화·오디오/UI)의 URL과 분석은 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md)에 유지한다. 과거 Blueprint 컴파일러 자료는 4.27임을 표시하고 현재 UE의 기본 nativization으로 해석하지 않는다. Unity의 일반 게임 스크립트 C#과 native C++ 플러그인/IL2CPP도 구분한다.

## 현재 제작 연결: 코드와 검사

| 흐름 | 코드 근거 | 재현 검사/다음 완료 조건 |
| --- | --- | --- |
| 폴더 우클릭 → 에셋 만들기 | `project-browser.js:createDialog`, `project-service.mjs:create`, `external-editor.mjs:createCppClass` | `test:assets`: JSON 에셋 8종·부모 7종·C++ 쌍·중복 거부. 별도 Struct/Enum/Interface/Prefab/VFX/UI/Audio 제작 메뉴는 미구현 |
| 여러 파일 → 각각 편집/Undo/저장/닫기 | `asset-documents.js:AssetDocuments`, `app.js:activateDocument/captureDocument/closeDocument` | `test:assets`: 편집 격리·저장 실패·저장 중 변경·닫기 보호. 화면 탭/분할/닫기 QA도 별도로 수행 |
| C++ 파일 → 외부 IDE → BP로 감싸기 → 호출 | `openProjectAsset/wrapSource`, `external-editor.mjs`, `native-model.js`, `native-host.mjs` | `test:native/test:host/test:assets`: 부모형·공개 선언·실제 빌드/호출. 임의 프로젝트 전체 빌드는 미구현 |
| 레벨의 서로 다른 BP 파일 → 각 객체 실행 | `loadSceneBindings`, `app.js:startPlay`, `blueprint-runtime.js` | `test:assets`: 같은 이벤트 ID가 있는 서로 다른 BP가 각 인스턴스에서 실행; native worker에 다른 모듈의 class/properties를 보내지 않음 |
| IA → IMC → BP 설정/이벤트 → 게임 입력 | `asset-editor-ui.js`, `InputActions`, `BlueprintRuntime.input/actionEvents` | `test:assets`: 값 타입·우선순위/소비·held 프레임 실행. 이후 C++ 직접 구독과 플레이어별 문맥까지 검증 |
| 머테리얼 파일 → preview → 장면 참조 | `evaluateMaterial`, `app.js`·`engine-services.js:setMaterial` | `test:assets`: 스칼라 표면 계산·잘못된 노드 ID 거부. Texture/HLSL/GPU까지는 미완료 |
| Animation/Curve → 키 편집 → 파일 저장 → 대상 실행 | `asset-documents.js`, `TimelineEditor`, `engine-services.js:playAnimation/stopAnimation` | `test:runtime`: position/rotation/scale·정지/완료·반복·Rate/시간 배율·마지막 키 길이·검증 실패·대상 파괴·기본 파일 읽기·모델 클립 우선. 선택적 `readAsset`로 열린 편집본 공급; Skeletal/상태 머신/Animation 이벤트는 미지원 |
| 에셋 이름 변경 → 구 참조 → 재열기 | `ProjectService.rename/resolve`·`.hbredirects.json` | `test:assets/test:project`: 서버 재시작 후 구 경로 해석·금지 경로·중복/실패 보존 |

검사 명령의 존재와 실제 실행 결과는 별개다. 기능 변경 후 담당자가 해당 명령과 화면 시나리오를 실행하고 커밋 본문에 결과를 기록한다. 브라우저 UI·WebGL 실행·C++ worker를 Win32/DX11 네이티브 엔진/완성된 cooking/배포로 부르지 않는다.

## 다음 분석/구현의 고정 점검 순서

1. 해당 분야의 `indexed` 하위 문서를 실제 본문 확인 후 `detail` 근거로 추가한다. 조작·데이터 타입·실행 순서·오류·수명·저장·플랫폼 차이를 기록한다.
2. 기존 API/에셋 타입/명령을 찾아 연결한다. 같은 기능의 C++와 BP를 별도로 정의해 의미가 갈라지지 않게 한다.
3. 에셋 작성과 런타임 소비자를 함께 구현한다. 편집 화면만 존재하는 기능은 미리보기/편집 상태로 기록한다.
4. 최소 정상 시나리오와 실패/복구 시나리오를 검증한다. 다른 열린 문서·사용자 원본·Stop 뒤 편집 월드를 보존한다.
5. 조사 상태·구현 상태·재현 결과를 이 문서와 분야 명세에 반영한다. 사용자가 누락을 발견해야만 목록에 추가하는 방식으로 진행하지 않는다.
