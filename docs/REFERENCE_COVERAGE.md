# HBEngine 공식 문서 조사와 구현 대조

2026-10-05 구현 후속: [2D 정렬·마스크·등각 타일과 편집기 단축키](2D_RENDERING_SHORTCUTS.md)에 이번에 읽은 본문/이미지 미독 경계와 실제 구현·검증을 따로 기록했어요. 정렬 그룹/레이어, 마스크, 기본 lit 2D 표면, 등각 공용 좌표/충돌, 등록된 33개 편집기 명령의 프로필/충돌/재지정/AI·디스크 저장이 연결됐어요. 아래 과거 표와 연구 원장의 전체 미독/미구현 상태를 이번 부분 구현으로 완료 처리하지 않아요.

이 문서는 **연구 단계 이전의 부분 조사·구현 대조 이력**이다. 현재는 [전체 본문·API 분석 선행](research/RESEARCH_STATUS.md)을 진행하며, 아래 `overview/detail`을 새 원장의 읽기·분석·검증 상태로 직접 매핑하지 않는다. 과거 실행 검사를 이번 연구에서 다시 실행한 것으로 해석하지 않는다.

2026-10-03 추가 대조: [빌드 프로필·독립 게임 실행](BUILD_PLAYER_RESEARCH.md). Unity 6000.0의 프로필/Scene List/창 설정 본문 3개와 Epic 패키징 UE 5.8 본문을 읽어 설정·장면 포함/순서·Build/Cook/Stage/Package/Run·진단/취소를 대조했다. 현재 Windows x64 Game.exe는 Win32/WebView2·Node·Three/WebGL2·Rapier와 사전 빌드 C++ worker를 사용한다. cook/압축/chunk·installer·다중 플랫폼·DX11/HLSL은 추가 제작 대상으로 유지한다.

2026-10-03 추가 대조: [충돌 형상 제작/실행](COLLISION_GEOMETRY_RESEARCH.md). Unity Mesh/Polygon2D/Edge2D/편집 조작과 Epic simple/complex·편집 자동화 본문, Rapier의 Shapes/Mass를 별도 세부 기록으로 연결했다. 실제 hull/삼각형/오목 경로/선분과 사람/AI/BP/C++ 동작을 검증했다. 다중 convex decomposition·UCX/LOD collision·Composite/effector·edge radius/adjacent normal·레이어 override 세부 조합은 해당 연구 표의 추가 항목으로 유지한다.

2026-10-03 추가 대조: [뷰포트](VIEWPORT_CONTROLS_RESEARCH.md), [환경 Actor](ENVIRONMENT_ACTORS_RESEARCH.md), [독립 작업창](DETACHED_WINDOWS_RESEARCH.md). Unreal 원근/직교 입력·툴바·Preferences/API 여섯 본문, 환경 여섯 본문과 Three PMREM API/설치 소스, Unreal 4.27/Unity 6.2 작업창 배치 본문을 실제 확인 범위대로 detail 기록에 추가한다. 큰 좌표 입력·북마크·Camera Actor·Ctrl+L·축 위젯·진단 보기·Renderer별 캡처·별도 HWND·사람/AI 공용 명령을 연결했다. 누적 2D·2.5D·3D 및 다른 모든 분야의 세부 요구를 유지하고 단일 분야의 검사로 전체 엔진을 완료 처리하지 않는다.

기준일: 2026-10-03. 조사 단위는 기능 이름이 아니라 **만들기 → 편집 → 저장 → 배치/참조 → 실행 → 진단 → 재열기** 흐름이다. 전체 설계는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 조작 계약은 [편집기 기준](EDITOR_INTERACTION_SPEC.md), 그래프와 C++ 상태는 [블루프린트 기준](BLUEPRINT_SPEC.md)에 연결한다.

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
| [Get started](https://docs.unity3d.com/6000.0/Documentation/Manual/get-started.html) | 설치·프로젝트 생성·설정·첫 실행 | EXE·프로젝트 허브·descriptor·최근·2D/3D 기본/AI 템플릿 | 설치/업데이트·엔진 버전 선택·변환/백업·타깃 설정 |
| [Upgrade](https://docs.unity3d.com/6000.0/Documentation/Manual/UpgradeGuides.html) | 순차 버전 변경·코드/에셋 호환성 | `validAsset`/`validBlueprint`의 버전 검사 | 백업·데이터 마이그레이션·실패 복원 |
| [Building Blocks](https://docs.unity3d.com/6000.0/Documentation/Manual/building-blocks.html) | 반복 제작을 동작하는 구성으로 제공 | 클래스 기본 컴포넌트·2D 플랫폼/탑다운·3D 제어·AI/효과 예제 | 프레임워크의 나머지 수명·확장 템플릿·완성 게임 제작/배포 검증 |
| [Editor interface](https://docs.unity3d.com/6000.0/Documentation/Manual/unity-editor.html) | 창·포커스·검색·설정·자동화 | `app.js`·도킹/실제 별도 HWND·원본 DOM/context·분리 창 frame 예약·공용 AI 명령 | 단축키 재설정·명령 충돌 검사·명명 배치 import/export·분리 창 직접 도킹/일괄 재생성 |
| [Packages](https://docs.unity3d.com/6000.0/Documentation/Manual/PackagesList.html) | 기능 묶음·의존성·버전·진단 | npm 개발 의존성만 사용 | 사용자 플러그인 등록·버전 잠금·의존성 충돌 UI |
| [Assets and media](https://docs.unity3d.com/6000.0/Documentation/Manual/assets-and-media.html) | 원본·변환 결과·임포트 설정·런타임 로딩 분리 | 원본 보존·다중 파일/폴더 드롭·임포트 메타데이터/재가져오기·ID/redirect·참조 뷰어 | 전체 포맷 변환·하위 에셋·import preset·DDC·cook·동시 편집 충돌 |
| [2D](https://docs.unity3d.com/6000.0/Documentation/Manual/Unity2D.html) | Sprite·Tilemap·2D 물리·2D 조명 | Sprite atlas/Pivot/Flip/Order·타일 팔레트/레이어/충돌·Flipbook·Rapier XY 회전/관절/CCD·9-slice Sliced/Tiled | SpriteMask·SortingLayer·Adaptive tiling·2D 조명·다각형 물리/전체 joint 세부·2D skeleton |
| [XR](https://docs.unity3d.com/6000.0/Documentation/Manual/XR.html) | 장치·추적·양안 화면·입력·실행 | 미구현 | XR 장치 계층·스테레오 렌더·상호작용·빌드 |
| [Multiplayer](https://docs.unity3d.com/6000.0/Documentation/Manual/multiplayer.html) | 접속·세션·상태 동기화·검증 | 미구현 | 권한·복제·RPC·지연/끊김 검사 |
| [Platforms](https://docs.unity3d.com/6000.0/Documentation/Manual/PlatformSpecific.html) | 플랫폼별 기능·SDK·출력·오류 | Windows x64 편집기/독립 Game.exe·WebView2·Node 동봉·C++ worker·빌드 프로필 | DX11 게임 렌더러·다른 플랫폼/SDK·전체 타깃/Player 설정 |
| [GameObjects](https://docs.unity3d.com/6000.0/Documentation/Manual/working-with-gameobjects.html) | 컴포넌트·Transform·활성·태그·레이어·Prefab | 50종 컴포넌트·42종 배치 조합·환경 Actor·계층/그룹/복제·태그·Prefab 저장/인스턴스 생성 | Variant/오버라이드 재적용·전체 활성/비활성/파괴 콜백·SerializeReference 수준 타입 모델 |
| [Scenes](https://docs.unity3d.com/6000.0/Documentation/Manual/working-with-scenes.html) | 생성·저장·다중 장면·템플릿·텍스트 데이터 | 독립 Scene 문서·환경 프리셋·BP/C++ 런타임 단일 장면 전환 | 다중 장면 동시 월드·스트리밍 |
| [Cameras](https://docs.unity3d.com/6000.0/Documentation/Manual/Cameras.html) | 직교/원근·여러 카메라·출력·종횡비 | 원근/일곱 직교 방향·축 위젯·북마크·Camera 생성/조종/정렬 fieldOfView/near/far·게임/시퀀스 카메라 | 물리 카메라·culling mask·RenderTexture·stack·시네마틱 카메라/블렌드 |
| [World building](https://docs.unity3d.com/6000.0/Documentation/Manual/CreatingEnvironments.html) | 하늘·Terrain·환경 편집과 런타임 최적화 | 도형·하늘/하늘광/구름/높이 안개 Actor·대기 태양 회전·큰 좌표/그리드/하늘 추적 | Terrain 페인트·식생·LOD·큰 월드 로딩·행성 대기/volume cloud 세부 |
| [Physics](https://docs.unity3d.com/6000.0/Documentation/Manual/PhysicsSection.html) | 2D/3D 물리의 다른 구현과 힘·충돌·시간 단계 | Rapier 2D/3D·정확 primitive/회전·질량/관성·힘/토크·6종 관절/모터·CCD·32비트 필터·동기 C++/BP 질의·Hit/Overlap | mesh/convex/polygon·정밀 controller·관성/보간/solver 저작·전체 6-DOF/articulation·채널 응답·차량/cloth/파괴 |
| [Input](https://docs.unity3d.com/6000.0/Documentation/Manual/Input.html) | 장치 입력과 게임 동작·UI/IME 문맥 분리 | `input-actions.js`·IA/IMC 전용 문서 | 게임패드/마우스 축·리바인딩·플레이어별 문맥·C++ 액션 구독 |
| [UI systems](https://docs.unity3d.com/6000.0/Documentation/Manual/UIToolkits.html) | 편집기 UI와 게임 UI 제작/런타임 구분 | 14종 Widget Designer·계층·앵커/레이아웃·스타일·이벤트/변수 바인딩·DOM 실행·BP/C++·AI 명령 | 재사용 위젯/스타일·폰트/지역화·UI 애니메이션·세계 공간 UI·가상 목록·포커스/입력 모드 |
| [Animation](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationSection.html) | 속성 커브·클립·Animator·상태/블렌드·리타깃 구분 | Transform/Curve·가져온 skeletal clip·Flipbook·평면 FSM·Montage 섹션/Notify·11종 Sequence 트랙 | Anim Graph·뼈별 blend/mask·IK/rig/retarget·root motion·겹치는 montage slot·임의 속성/Quaternion 커브 |
| [Audio](https://docs.unity3d.com/6000.0/Documentation/Manual/Audio.html) | Clip/Source/Listener·공간음향·Mixer·효과·진단 | 실제 WebAudio 버스/필터/컴프레서·Mute/Solo/Bypass·RMS·snapshot/노출 파라미터·HRTF/거리 감쇠·BP/C++ | Send/return·reverb/delay/sidechain·Sound graph·우선순위/가상 음원·Doppler/커브·native backend |
| [Video](https://docs.unity3d.com/6000.0/Documentation/Manual/Video.html) | 소스·디코더·플레이어·오디오·스트리밍·연출 | 파일 보존·브라우저 media 미리보기 | AVI 등 코덱별 변환·Seek/동기화·시퀀스 연출 |
| [Lighting](https://docs.unity3d.com/6000.0/Documentation/Manual/LightingOverview.html) | 직접/간접광·그림자·반사·환경·품질 | Three 광원/그림자·환경 Actor·Renderer별 실제 PMREM·높이 밀도 shader | DX11 조명·GI/Lightmap·반사 probe·DF AO·측정 가능한 품질 단계 |
| [Materials and shaders](https://docs.unity3d.com/6000.0/Documentation/Manual/materials-and-shaders.html) | 텍스처·표면·Shader·색 공간·HDR·진단 | 54종 노드·Texture/UV/Normal·GLSL 실제 GPU 실행·PBR/인스턴스·4종 템플릿 | Material function/layer·전체 shading model/domain·Substrate·HLSL/DX11·shader variant/cook |
| [VFX](https://docs.unity3d.com/6000.0/Documentation/Manual/visual-effects.html) | 파티클·Decal·Trail·효과 그래프와 실행 | 모듈식 CPU ParticleSystem·seed/방출/힘/색/크기/텍스처·Points 셰이더·표면 DecalGeometry | VFX graph·GPU 시뮬레이션·충돌/trail/sub-emitter·mesh particle·volumetric 효과 |
| [Render pipelines](https://docs.unity3d.com/6000.0/Documentation/Manual/render-pipelines.html) | 대상별 렌더 경로·재질/광원 호환성 | Three/WebGL 프로토타입 | Win32/DX11 패스·자원 수명·상태·품질/기능 계약 |
| [Post-processing](https://docs.unity3d.com/6000.0/Documentation/Manual/post-processing-and-full-screen-effects.html) | 화면 효과의 렌더 경로·지원 차이 | 기본 노출/tone mapping | 볼륨·Bloom/AO/DOF·효과 순서·GPU 비용 |
| [Programming](https://docs.unity3d.com/6000.0/Documentation/Manual/scripting.html) | 코드 작성·컴파일·재로딩·진단과 편집기 연결 | 공통 C++ API·native host·외부 IDE 열기 | 다중 번역 단위·IDE 프로젝트 생성·native 디버거·DLL 교체 |
| [Optimization](https://docs.unity3d.com/6000.0/Documentation/Manual/analysis.html) | CPU/GPU/메모리 측정과 타깃 실험 | 실측 프레임·BP/물리/AI/애니메이션 구간·C++ IPC·WebGL 제출·draw/triangle/resource 개수·기록/내보내기 | GPU 타이머·native 스레드/CPU exclusive·할당/메모리·파일/네트워크 profiler·타깃 캡처 |
| [Build/publish](https://docs.unity3d.com/6000.0/Documentation/Manual/building-and-publishing.html) | Player·내용 출력·설정·캐시·재현 빌드 | 사용자 C++ worker·편집기 EXE·Windows 독립 게임 build/package·프로필·AI 작업/CLI | 플랫폼별 cook/압축/chunk·증분/clean/기호·installer/서명/설치·스토어 출시 |
| [Services](https://docs.unity3d.com/6000.0/Documentation/Manual/UnityServices.html) | 계정·세션·분석·배포 서비스와 게임 분리 | 미구현 | 엔진 확장 경계·서비스 오류/인증·사용자 선택 |
| [Best practices](https://docs.unity3d.com/6000.0/Documentation/Manual/best-practice-guides.html) | 분야별 제작·운영·최적화 검증 기준 | 공통 API·저장 검증·재현 스크립트 | 예제 게임·실측·팀 제작/버전 관리 시나리오 |
| [Troubleshooting](https://docs.unity3d.com/6000.0/Documentation/Manual/TroubleShooting.html) | 가져오기/코드/렌더/플랫폼 오류 원인과 복구 | 파일 검증·컴파일 오류·실행 오류 로그 | 분야별 진단 위치·실패 결과 복구·크래시 보고 |
| [Glossary](https://docs.unity3d.com/6000.0/Documentation/Manual/Glossary.html) | 동명 용어의 역할·단위 구분 | 에셋 타입·BP/Clip/Timeline 구분 | 도움말의 한국어/영어 용어 사전·동작 단위 명시 |

## Unreal 21분야: 개요 본문과 HB 제작 요구

| 공식 분야 | 제작 흐름에서 확인할 요구 | 현재 코드 근거 | 남은 구현 |
| --- | --- | --- | --- |
| [What's New](https://dev.epicgames.com/documentation/unreal-engine/whats-new) | 릴리스·migration·실험/안정 기능 구분 | 버전 있는 에셋 형식 | 기능별 안정성/호환성·migration 기록 |
| [Basics](https://dev.epicgames.com/documentation/unreal-engine/understanding-the-basics-of-unreal-engine) | 창·키·프로젝트·콘텐츠·Actor·실행·패키징 연결 | 허브·descriptor·파일별 문서·도킹/별도 HWND/합치기·창별 탐색·Unreal 원근/직교 입력·배치/스냅·Play·2D/3D 템플릿·Windows Game.exe/프로필 | 설정 가능한 키/충돌·명명 배치/분리 창 직접 도킹·프로젝트 버전 변환·플랫폼별 cook/설치/출시 |
| [Content](https://dev.epicgames.com/documentation/unreal-engine/working-with-content-in-unreal-engine) | 외부 Mesh/Skeleton/Texture와 내부 에셋의 임포트 경계 | 원본 임포트·OBJ/GLTF/FBX 미리보기·메타데이터·재가져오기·참조 그래프 | 전체 Interchange 변환·Skeleton 하위 에셋·축/단위/압축·import preset·DDC/cook |
| [Virtual Worlds](https://dev.epicgames.com/documentation/unreal-engine/building-virtual-worlds-in-unreal-engine) | 레벨·환경·조명·배치·큰 월드 제작 | 레벨 파일·도형·별도 환경 Actor·Ctrl+L 두 대기광원·큰 좌표 카메라/하늘/그리드 | Landscape/Foliage·메시 편집·월드 분할/스트리밍·환경 volume 세부 |
| [Rendering/Graphics](https://dev.epicgames.com/documentation/unreal-engine/designing-visuals-rendering-and-graphics-with-unreal-engine) | 표면·빛·그림자·품질·렌더 자원·진단 | Three 표면/광원·GPU 머테리얼·Renderer별 PMREM·높이 안개·6종 보기/Show Flags·진단재질 cache 해제 | DX11/HLSL·LOD/culling·GPU 측정·GI/반사 probe·전체 진단 buffer/volume renderer |
| [AI Tools/Plugins](https://dev.epicgames.com/documentation/unreal-engine/ai-features-tools-and-plugins-in-unreal-engine) | 제작 자동화·검색·도구 연결과 게임 AI 구분 | 공용 스키마·안정 ID·revision/검증·dryRun·원자적 patch/Undo·실제 실행/프로파일 API | semantic 검색·플러그인 프로토콜/권한·멀티 창/작성자 충돌·전체 분야의 전용 AI 조작 |
| [VFX](https://dev.epicgames.com/documentation/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine) | System/Emitter/Module·시뮬레이션·편집기·진단 | CPU 모듈/시뮬레이션·Points 셰이더·표면 데칼·BP/C++ Play/Stop/Emit/Count | Niagara 수준 System/Emitter/Module graph·GPU/충돌/trail·mesh renderer·디버그 |
| [Gameplay Tutorials](https://dev.epicgames.com/documentation/unreal-engine/gameplay-tutorials-for-unreal-engine) | 실제 게임 메커니즘을 코드/노드로 재현 | 문 C++/BP 실행 예제 | 캐릭터·카메라·아이템·상호작용·2D 예제 게임 |
| [Blueprint](https://dev.epicgames.com/documentation/unreal-engine/blueprints-visual-scripting-in-unreal-engine) | 객체 클래스·그래프·통신·디버그·C++ 확장 | 473종 정적 노드·타입/배열/struct split·함수/매크로/통신/Timeline·VM/디버그·C++ | BP 상속/부모 호출·로컬 변수·전체 Struct/Enum/Map/Set·tick 의존성·모든 엔진 API 노드화 |
| [C++](https://dev.epicgames.com/documentation/unreal-engine/programming-with-cplusplus-in-unreal-engine) | Reflection·클래스·컨테이너·Delegate·IDE/컴파일 | 289 코어+102 실행 서비스·헤더 메타데이터→BP 핀·외부 IDE·실제 worker 빌드/호출 | 다중 번역 단위·.sln/.vcxproj·DLL 교체·native debugger·포인터/객체/동기 override 수명 |
| [Gameplay Systems](https://dev.epicgames.com/documentation/unreal-engine/gameplay-systems-in-unreal-engine) | Framework·Input·Physics·AI/Nav·Ability·네트워크 | 역할별 GameMode/State/Instance/Player/Controller/Pawn·possession·2D/3D 이동·입력·고정 물리·BT/FSM/BB·perception/grid A*·tags | Ability/attribute/effect·replication/RPC·EQS/계층 StateTree·정밀 NavMesh/RVO·PlayerLoop/tick group |
| [Mobile](https://dev.epicgames.com/documentation/unreal-engine/getting-started-with-mobile-development-in-unreal-engine) | SDK·장치·성능·플랫폼 서비스·출시 | 미구현 | 모바일 렌더/입력·SDK 빌드·실장치 검증 |
| [Animation](https://dev.epicgames.com/documentation/unreal-engine/animating-characters-and-objects-in-unreal-engine) | Skeletal/AnimBP·Sequencer·Control Rig·Paper2D 구분 | Transform/Flipbook/skeletal clip·Montage section/Notify·FSM·다중 대상 Sequence·복제 장면 preview | 뼈별 포즈/blend·AnimBP·Control Rig/IK·retarget/root motion·take recorder·slot blend |
| [Motion Design](https://dev.epicgames.com/documentation/unreal-engine/motion-design-in-unreal-engine) | 도형·cloner·리깅·재질·전환/연출 구성 | 기본 도형 배치 | 절차적 도형/복제·레이어 재질·연출 제어 |
| [UI](https://dev.epicgames.com/documentation/unreal-engine/creating-user-interfaces-with-umg-and-slate-in-unreal-engine) | Designer/Widget·텍스트/폰트·접근성·최적화 | 14종 Designer/런타임·계층/앵커/스타일·입력/이벤트/바인딩·BP/C++·AI 편집 | 위젯 클래스 상속/재사용·Slate/native renderer·폰트/지역화·UI 애니메이션/세계 공간/가상 목록 |
| [Audio](https://dev.epicgames.com/documentation/unreal-engine/working-with-audio-in-unreal-engine) | 소스·감쇠·버스·mix·메모리·진단 | WebAudio bus graph·snapshot/노출·실측 RMS·필터/압축·HRTF 감쇠·독립 소스 재생 | MetaSounds/SoundCue·send/submix·reverb/duck·가상화/우선순위·native/DSP backend |
| [Media](https://dev.epicgames.com/documentation/unreal-engine/working-with-media-in-unreal-engine) | Source/Player·색 관리·동기·캡처/출력 | 파일 보존·지원 코덱 preview | 디코더/변환·영상 동기·캡처·영상 텍스처 |
| [Production Pipeline](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-production-pipeline-in-unreal-engine) | 에셋 관리·캐시·버전 관리·redirect·자동화 | ID/redirect·다중 임포트·재가져오기·양방향 참조 탐색·공용 schema/AI 명령·Git | redirect Fixup·source control UI·DDC·chunk/cook·asset manager bundle·동시 작성 충돌 |
| [Testing/Optimization](https://dev.epicgames.com/documentation/unreal-engine/testing-and-optimizing-your-content) | 성능 계측·로그·크래시·자동 검사 | 로직/실제 C++/GPU/DOM/PCM 검사·실측 프레임·render/resource 개수·JSON 기록 | native/GPU/스레드 profiler·alloc/file/network·타깃 캡처·crash report |
| [Release](https://dev.epicgames.com/documentation/unreal-engine/sharing-and-releasing-projects-for-unreal-engine) | Build/Cook/Package/Deploy와 타깃 차이 | 사용자 함수 worker·Windows 편집기 EXE·독립 Game.exe/게임 폴더·구성/장면 프로필·진행/취소 | DX11/HLSL Player·cook/chunk/patch·기기 deploy·다중 타깃/SDK·installer/서명/출시 |
| [Samples](https://dev.epicgames.com/documentation/unreal-engine/samples-and-tutorials-for-unreal-engine) | 동작하는 템플릿을 열고 분해·확장 | `prototype/examples` | 2D/2.5D/3D 제작→배포 전체 샘플 |

## 초기 세부 본문 확인과 대응 (당시 상태)

아래 초기 표의 구현 차이는 2026-10-02 당시 기록이다. 이후 구현 상태는 위 분야 표, [제작 흐름 연구](ENGINE_WORKFLOW_RESEARCH.md), [세부 검증](AUTHORING_UI_AUDIO_RESEARCH.md)로 대조한다.

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
| [Epic Project Creation](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-a-new-project-in-unreal-engine) | Project Browser·이름/위치/템플릿·생성 후 편집기 진입 | `project-hub.js`, `project-manifest.mjs:createProject`: 새 폴더·기본 예제·descriptor·열기 | 현재 기본 예제 한 종류; 템플릿 선택·플랫폼/품질 기본 설정 |
| [Epic Project Opening](https://dev.epicgames.com/documentation/en-us/unreal-engine/opening-an-existing-unreal-engine-project) | 최근·Browse·프로젝트 파일 더블클릭·버전 호환성/변환 | 허브/실제 파일 선택기·최근 JSON·HKCU `.hbproject` 연결·비정상 파일 거부 | 엔진 버전 선택·프로젝트 변환/백업·최근 썸네일/타깃 정보 |
| [Epic Project Descriptor](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Projects/FProjectDescriptor) | JSON descriptor의 버전·엔진 연결·Modules/Plugins·Read/Save | HB 전용 `.hbproject` 파일 버전/engineVersion/UUID·시작 에셋 상대경로 검증 | 모듈/플러그인/타깃 등록·업그레이드 schema·프로젝트 설정 UI |
| [Microsoft WebView2 Win32](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/win32) | 환경/controller 비동기 생성·bounds·탐색·웹메시지 | `HBEngine.cpp`의 COM 콜백·Win32 창·WebView2 편집기·창 크기/포커스 | HTML/JS 편집기와 WebGL 렌더러를 유지; DX11/OS 부동 패널은 별도 구현 |
| [Microsoft WebView2 Threading](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model) | STA UI 스레드·메시지 펌프·재진입/동기 대기 금지 | `CoInitializeEx`·UI 메시지 루프·비동기 콜백 | UI/서버 장기 작업 취소와 모든 실패 경로 반복 검증 |
| [Microsoft WebView2 Distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) | Loader 아키텍처와 별도 Runtime·설치 확인·Evergreen/Fixed 구분 | `build-desktop.mjs`: x64 loader·Node/편집기 파일 동봉, Runtime 오류 표시 | Runtime 설치/업데이트 흐름·다른 아키텍처·오프라인 배포 |
| [Microsoft WebView2 SDK License](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4258.31/License) | SDK/Loader 소스·바이너리 배포의 고지 보존 | 안정 SDK 1.0.4258.31의 LICENSE를 `licenses/WebView2-SDK.txt`에 포함 | Runtime 자체 재배포 시 해당 별도 조건 확인; SDK 고지와 혼용하지 않음 |
| [Microsoft WebView2 Close](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2controller#close) | controller.Close가 WebView를 정리하며 beforeunload를 발생시키지 않음 | `WM_CLOSE` → `hbEngineRequestClose` → 수정 확인/복구 → 메시지 → 종료·소유 Job 정리 | 미저장/저장 실패/취소·닫는 중 콜백의 실제 UI 시나리오 계속 검증 |
| [Node Windows Runtime](https://nodejs.org/en/download/archive/v24.15.0)·[LICENSE](https://raw.githubusercontent.com/nodejs/node/v24.15.0/LICENSE) | 공식 Windows 배포·Node 및 번들 라이브러리 고지 | 빌드에 사용한 `process.execPath` 동봉·그 버전의 전체 LICENSE 복사 | 별도 Node 설치는 불필요; C++ 컴파일러는 별도 준비. Node 전체 API 조사로 계산하지 않음 |

이전 세부 조사(변수·함수·통신·생명주기·Timeline·Animation·충돌·임포트·직렬화·오디오/UI)의 URL과 분석은 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md)에 유지한다. 과거 Blueprint 컴파일러 자료는 4.27임을 표시하고 현재 UE의 기본 nativization으로 해석하지 않는다. Unity의 일반 게임 스크립트 C#과 native C++ 플러그인/IL2CPP도 구분한다.

## 초기 제작 연결: 코드와 검사 (2026-10-02 당시)

| 흐름 | 코드 근거 | 재현 검사/다음 완료 조건 |
| --- | --- | --- |
| EXE → 허브 → 프로젝트 생성/열기 → 재실행 | `HBEngine.cpp`, `build-desktop.mjs`, `project-manifest.mjs`, `project-hub.js`, `serve.mjs` | `test:launcher`: descriptor/UUID·한글/공백·원본 보호·최근·동적 포트·두 프로젝트/진행 중 쓰기/C++ 전환. 템플릿 선택·업그레이드는 미구현 |
| 프로젝트 ID → 편집기 복구/배치/게임 저장 | `project-session.js`·`project-storage.mjs`·`/api/storage`·`Saved/Editor/storage.json` | `test:session/test:launcher`: 세션 선행 로드·UUID 분리·기본 프로젝트 1회 이관·원본 보존·디스크 연결. 전환/종료는 저장 완료를 기다리고 포트/origin이 바뀌어도 복구한다. localStorage 백업은 유지 |
| Windows 창 → WebView2/JS 준비 → 닫기 → 종료 | `HBEngine.cpp:windowProcedure/MessageHandler`·`app.js:hbEngineRequestClose` | `test:desktop`: 배포 허브/루트 EXE·다른 cwd·한글/공백 프로젝트·비정상 descriptor 보존·JS 준비 메시지·실제 닫기 핸들러/메시지·소유 서버 제거. 모든 편집 UI 조작 검증은 별도 |
| 폴더 우클릭 → 에셋 만들기 | `project-browser.js:createDialog`, `project-service.mjs:create`, `external-editor.mjs:createCppClass` | `test:assets`: JSON 에셋 8종·부모 7종·C++ 쌍·중복 거부. 별도 Struct/Enum/Interface/Prefab/VFX/UI/Audio 제작 메뉴는 미구현 |
| 여러 파일 → 각각 편집/Undo/저장/닫기 | `asset-documents.js:AssetDocuments`, `app.js:activateDocument/captureDocument/closeDocument` | `test:assets`: 편집 격리·저장 실패·저장 중 변경·닫기 보호. 화면 탭/분할/닫기 QA도 별도로 수행 |
| C++ 파일 → 외부 IDE → BP로 감싸기 → 호출 | `openProjectAsset/wrapSource`, `external-editor.mjs`, `native-model.js`, `native-host.mjs` | `test:native/test:host/test:assets`: 부모형·공개 선언·실제 빌드/호출. 임의 프로젝트 전체 빌드는 미구현 |
| 레벨의 서로 다른 BP 파일 → 각 객체 실행 | `loadSceneBindings`, `app.js:startPlay`, `blueprint-runtime.js` | `test:assets`: 같은 이벤트 ID가 있는 서로 다른 BP가 각 인스턴스에서 실행; native worker에 다른 모듈의 class/properties를 보내지 않음 |
| IA → IMC → BP 설정/이벤트 → 게임 입력 | `asset-editor-ui.js`, `InputActions`, `BlueprintRuntime.input/actionEvents` | `test:assets`: 값 타입·우선순위/소비·held 프레임 실행. 이후 C++ 직접 구독과 플레이어별 문맥까지 검증 |
| 머테리얼 파일 → preview → 장면 참조 | `evaluateMaterial`, `app.js`·`engine-services.js:setMaterial` | `test:assets`: 스칼라 표면 계산·잘못된 노드 ID 거부. Texture/HLSL/GPU까지는 미완료 |
| Animation/Curve → 키 편집 → 파일 저장 → 대상 실행 | `asset-documents.js`, `TimelineEditor`, `engine-services.js:playAnimation/stopAnimation` | `test:runtime`: position/rotation/scale·정지/완료·반복·Rate/시간 배율·마지막 키 길이·검증 실패·대상 파괴·기본 파일 읽기·모델 클립 우선. 선택적 `readAsset`로 열린 편집본 공급; Skeletal/상태 머신/Animation 이벤트는 미지원 |
| 에셋 이름 변경 → 구 참조 → 재열기 | `ProjectService.rename/resolve`·`.hbredirects.json` | `test:assets/test:project`: 서버 재시작 후 구 경로 해석·금지 경로·중복/실패 보존 |

검사 명령의 존재와 실제 실행 결과는 별개다. 기능 변경 후 담당자가 해당 명령과 화면 시나리오를 실행하고 커밋 본문에 결과를 기록한다. Win32/WebView2 편집기 EXE·배포 폴더와 WebGL·C++ worker를 구현했다. 2026-10-03에는 별도 Player/Game.exe와 빌드 프로필을 추가했다. 실제 렌더러는 WebGL2이며 DX11 렌더러·타깃 cooking·압축/chunk·installer/출시는 별도 남은 구현이다. 편집기 배포와 독립 게임 패키지의 검사 결과를 구분한다.

같은 프로젝트를 허브 창과 직접 열기 창에서 동시에 열 수 있으나 에셋 파일의 동시 편집 충돌 감지·병합은 미지원이다.

## 다음 분석/구현의 고정 점검 순서

1. 해당 분야의 `indexed` 하위 문서를 실제 본문 확인 후 `detail` 근거로 추가한다. 조작·데이터 타입·실행 순서·오류·수명·저장·플랫폼 차이를 기록한다.
2. 기존 API/에셋 타입/명령을 찾아 연결한다. 같은 기능의 C++와 BP를 별도로 정의해 의미가 갈라지지 않게 한다.
3. 에셋 작성과 런타임 소비자를 함께 구현한다. 편집 화면만 존재하는 기능은 미리보기/편집 상태로 기록한다.
4. 최소 정상 시나리오와 실패/복구 시나리오를 검증한다. 다른 열린 문서·사용자 원본·Stop 뒤 편집 월드를 보존한다.
5. 조사 상태·구현 상태·재현 결과를 이 문서와 분야 명세에 반영한다. 사용자가 누락을 발견해야만 목록에 추가하는 방식으로 진행하지 않는다.


## 2026-10-02 후속 대조

컴포넌트·프레임워크·물리·2D·머테리얼·에셋 생명주기·AI 자동화의 본문 확인 자료, 적용 결정, 실행 검증과 남은 전체 분야는 [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md)에 연결했다. 문서 목록 수집 건수를 본문 전체 확인 수로 바꾸지 않는다.


## 전체 범위와 세부 완료 판정 — 2026-10-03

사용자의 예시는 범위를 제한하지 않는다. 모든 분야와 하위 매뉴얼·API·패키지·조작·오류·플랫폼 차이를 조사/구현 대상으로 유지한다. 위 표는 현재 확인한 대응이며 엔진 전체 기능의 최종 목록이 아니다. 미조사 항목을 필요 없다고 판단하거나 완료 처리하지 않는다. 이름/메뉴만 추가한 항목은 구현 완료가 아니다.

세부 기능은 생성·편집 속성·단축키/문맥 메뉴·자료형/파일 참조·저장/재열기·실행 순서/수명·오류 복구·BP/C++·AI 편집·실측 검증 각각을 확인한다. 한 항목이 추가되어도 같은 분야의 나머지 기능이 완료되지 않는다. Widget Designer와 Audio Mixer도 재사용/지역화/애니메이션/가상 목록 및 send/reverb/우선순위 등 남은 세부 구현을 계속 유지한다. 실제 본문 확인 기록은 `reference-index/detail-audit.json`에서 indexed 목차와 분리한다.

## 강체·관절·공간 질의 후속 대조 — 2026-10-03

[PHYSICS_RUNTIME_RESEARCH.md](PHYSICS_RUNTIME_RESEARCH.md)에 공식 속성/API 본문과 설치된 Rapier 0.21.0의 실제 선언/구현을 대조하고 2D·3D 공용 실행·단위·C++ 동기 검색·AI 스키마·작성/저장/Play/복구 검증을 기록했다. 확인 범위는 detail-audit.json에 추가했으며 전체 링크/문서/API 확인으로 계산하지 않는다. Primitive 물리의 추가로 mesh/controller/관절 전체·native backend나 다른 엔진 전 영역을 완료 처리하지 않는다.

## 빌드 프로필·독립 Player 후속 대조 — 2026-10-03

[BUILD_PLAYER_RESEARCH.md](BUILD_PLAYER_RESEARCH.md)는 실제 읽은 네 공식 본문의 범위, 설정·키·Scene 드롭/제외/순서, 파일 포함/참조/소스 일치 검증, 개발/배포 구성의 정확한 의미, 패키지 생성/취소/손상 검사, Scene/게임 저장/종료 수명과 AI API를 코드에 연결한다. 독립 게임 package가 추가되어 기존 `독립 게임 배포 미구현` 항목을 갱신했으며 raw 에셋 보존과 타깃 cook를 구분한다. 기존 물리·UI·오디오·블루프린트 등 다른 모든 분야의 누적 세부 요구는 이 변경으로 완료 처리하지 않는다. 실제 실행 결과는 CODEX_HANDOFF.md에 따로 기록하고 오디오 등 진행 중 검사 항목을 원문 재사용만으로 통과 처리하지 않는다.


## 뷰포트·환경 Actor·독립 창 후속 대조 — 2026-10-04

[뷰포트 조사](VIEWPORT_CONTROLS_RESEARCH.md), [환경 Actor 조사](ENVIRONMENT_ACTORS_RESEARCH.md), [독립 창 조사](DETACHED_WINDOWS_RESEARCH.md)에 실제 읽은 공식 본문의 버전/범위와 데이터·입력·렌더·자원 수명·저장/복구를 연결했다. 상위 색인과 실제 본문 확인은 detail-audit.json에서 구분한다.

레벨·추가 뷰포트와 모델/BP 컴포넌트/머테리얼/트랜스폼 애니메이션/몽타주·시퀀스/메시 충돌 미리보기의 카메라 입력을 공유한다. 2D의 XY/직교 조작과 3D의 RMB 비행·Alt 탐색을 유지한다. 방향 위젯·카메라 생성/조종/정렬·fieldOfView/near/far·10개 북마크·보기/표시·스냅/피벗과 환경 Actor가 같은 Scene/Undo/API를 사용한다. AI의 잘못된 투영·클립·입력 설정은 현재 카메라와 조종 상태를 보존한다.

각 HWND는 실제 원본 패널을 표시하며 같은 문서·선택·Undo·저장을 공유한다. Outliner/Inspector 포커스는 편집 중 입력 DOM을 교체하지 않는다. 모든 살아 있는 창의 frame 예약과 입력 ownerDocument를 관리한다. 별도 WebGL renderer마다 PMREM을 소유하고 진단용 재질 사본은 Scene에서 원본 참조가 사라질 때 해제한다.

행성 대기 LUT·volume 구름 raymarch/그림자·공간 volumetric fog·Lightmass/DF AO·전체 진단 buffer·분리 창 간 직접 도킹/명명 배치 import/export·세계 스트리밍과 나머지 엔진 분야는 별도 세부 계약으로 유지한다. 현재 구름은 mesh 미리보기다. 위 항목의 구현으로 전체 Unreal/Unity 기능을 완료 처리하지 않는다.

## 2026-10-07 후속 구현 대조 — 045

위 초기 대조표의 Animation Graph/뼈별 포즈 혼합·슬롯·2D Rig/IK 일부는 후속 구현 문서에 반영됐어요. 최신 남은 항목 판단은 초기 표만 사용하지 않고 각 상세 구현/검증 문서와 대조해요. 이번에는 ANIMATION_MONTAGE_SLOTS.md의 같은 그룹 outgoing 교체 혼합을 구현했어요. 정확한 계약·읽은 세 API 본문 범위·검증은 research/MONTAGE_REPLACEMENT_BLEND_045.md에 있어요. 전체 API/corpus 완료나 Root Motion/프로파일까지 구현한 것으로 세지 않아요.


## 046 실제 컴퓨트 셰이더 — 2026-10-07

기존 compute 부재를 코드로 확인하고 Direct3D11/HLSL cs_5_0/구조화 버퍼/상수/실제Dispatch·명시적readback과 GPU상태 유지 파티클을 SDK에 추가했어요. BP→C++→실GPU, 실제 release Player의2D·3D 이동·버퍼 유지/해제·원본/종료 PASS.65,537레코드20step 중앙값 CPU 4.0771ms, GPU한번readback 1.2039ms, 매stepreadback 10.8629ms. 전체FPS로 세지 않아요. Android2ABI 헤더 컴파일 PASS이며 모바일 GPU는 미구현이에요. 기본CPU파티클/탄막과 WebGL2렌더러의 직접GPU버퍼 공유가 후속이에요. research/GPU_COMPUTE_046.md에 실제 본문5개 읽기 범위/코드/검증·실패보존을 연결했어요. 사용자 창/원본게임/프로필은 사용하지 않았어요. 설치는 검증 source의 production commit 뒤 진행해요.


## 046 사용자 설치 기록 — 2026-10-07

production c775bb5를 C:/Users/kirby/HBEngine/Versions/b82a5239ad35ec47에 갱신했어요.1806파일·변경15SHA·바로가기/.hbproject 연결·이전f906 버전/프로필/프로세스 보존 PASS. 실제사용자 창을 시작/종료하지 않았어요. native/build/gpu-compute-user-install-046.json.


## 047 프레임 리소스 추가 — 2026-10-07

컴퓨트 경로에3개 순환 상수 버퍼·동적WRITE_DISCARD 업로드,3개 결과 슬롯·완료query·대기 없는 비동기회수·가득 찬 슬롯 보존·reset/해제를 구현했어요. C++/BP 제출·회수 함수와 실제 release Player의2D/3D 경로 PASS. 공용 파티클 렌더러는 동적 버퍼의 활성 범위만 재업로드하고 배열을 재사용해요. GPU코어90zRwE·실제Player0EJH77·공용Renderer검사 PASS/currentSHA일치. 프레임FPS/전체렉/모바일GPU/네이티브씬렌더 이식 완료라고 세지 않아요. 자세한근거/검증은 research/FRAME_RESOURCES_047.md에 있어요. 설치는 검증source를 커밋한 뒤 불변 버전으로 갱신해요.


## 047 사용자 설치 갱신 완료 — 2026-10-07

검증 production 1e988f232925180c5bf75d35a0ddd7bd96543912를 C:\Users\kirby\HBEngine\Versions\88db6de5ffe7c1bf에 불변 설치했어요.1807파일·변경13개SHA·바로가기/.hbproject 연결 검증,이전b82/f906 버전·실행파일·기존SDK·프로필·프로세스 보존 PASS. GPU컴퓨트/순환상수버퍼/비동기결과슬롯과 공용파티클 활성업로드 범위를 포함해요. 사용자창을 시작/종료하거나 기존Android/iOS산출물을 다시 빌드하지 않았어요. 실제GPU/내보낸Player/공용렌더러의 currentSHA검증을 재사용하고 불필요한전체재검사·8시간스트레스를 하지 않았어요. 전체FPS 또는GPU전용씬렌더러완료로 세지 않아요. 증거 native/build/frame-resources-user-install-047.json.


## 048 GPU 버퍼 직접 렌더·편의 API — 2026-10-07

실제 DirectCompute 파티클 버퍼→GPU 활성 인덱스/개수→간접 draw→텍스처/깊이 타깃→선택 HWND flip 출력 경로를 추가했어요. 위치/활성 개수 CPU 회수0,3개 상수 재사용,수명 제외/resize/해제·같은 창 재생성을 연결했어요. 게임 코드는 ParticleEffect의 update/draw/resize/texture와 카메라 함수를 호출하며 HLSL·D3D 버퍼를 직접 작성하지 않아도 돼요. DrawGPU는 사용자 C++에서 블루프린트로 노출되며 실제 release Player에서도 실행돼요. 공통 편의 함수221개도 실제C++/BP 결과·타입·오류 비교 PASS예요. GPU render UIDtfw/core3tRrRV/Playerj7k2Gr가 최신SHA증거예요.65,537개20frame간접계산·draw·최종image회수 배치1.5927/2.0115/1.6714ms이며 전체게임FPS로 계산하지 않아요. 메인WebGL2씬/기본CPU방출·탄막충돌·모바일GPU를 새경로로 모두이식한 상태는 아니에요. 근거·계약·미독범위/다음작업은 research/GPU_RESIDENT_RENDER_048.md에 있어요. 기존게임/창/프로필을 건드리지 않았고 두원본MD에는 덧붙이기만 했어요.


## 048 사용자 설치 갱신 완료 — 2026-10-07

검증 production 3316dc90a1e8b1c3d52513bdc1b00951ef178d89를 C:/Users/kirby/HBEngine/Versions/944ae8b62a7b3bc8에 불변 설치했어요.1812파일·변경17개SHA·바로가기/.hbproject 연결 검증 PASS. 이전88db 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자창을 시작/종료하지 않았어요. GPU직접렌더/활성목록·간접draw/ParticleEffect편의API/사용자C++ 노드를 포함해요. 공통편의함수221개·실제GPU·releasePlayer의최신SHA증거를사용했고 불필요한전체/8시간검사는 하지 않았어요. 기존메인씬과기본CPU효과를자동GPU로바꾼설치는아니며,전체게임FPS/모바일GPU성공으로세지않아요. 증거 native/build/gpu-render-user-install-048.json. 다음실행부터새버전이열려요.


## 049 GPU 파티클 방출·수명·간편 함수 — 2026-10-07

GPU에서 빈 슬롯을 찾아 새 입자를 넣고, 수명이 끝난 슬롯을 재사용하도록 연결했어요. C++ ParticleEffect는 emit/rate/play/pause/stop/clear를 제공하며 사용자 C++ HB_FUNCTION은 블루프린트로 노출돼요. 가득 찬 경우 살아 있는 입자를 보존하고 요청 버퍼를 재사용해요. 실제 하드웨어·픽셀·release Player의 2D/3D BP/C++ 방출/수명/일시정지/재개/제거·배치 위치 보존이 통과했어요. 최신 core eZAFNC/render mEgSrZ/Player azWd4k/debug 오류0은 현재 SHA예요. 기존 편의 함수221개의7파일은 변경이 없어 실제 C++/BP 비교 증거를 재사용했어요. 방출1024개/frame·65,537슬롯·20frame의 계산/방출/그리기/최종이미지 회수는1.3395/1.1724/1.2401ms이고 전체 게임 FPS가 아니에요. Unity의4개 자체 API 본문·예제, Epic GPU 두 가이드의 자체 텍스트, Microsoft 세 API 읽기/재읽기 범위를 research/GPU_EMISSION_049.md에 기록했어요. 연결문서/이미지/전체문서 분석 완료로 세지 않아요. 메인 WebGL2 씬의 GPU 타깃 합성·모바일GPU·누적 엔진 기능은 이어갈 작업이에요. 원본 게임/창/프로필과 기존 장기 검사는 사용하지 않았어요. 설치는 검증 소스 커밋 뒤 새 불변 버전으로 갱신해요.


## 049 사용자 설치 갱신 완료 — 2026-10-07

검증 production 022b7decbfa4ebb450936edfa9f598f46846588b를 C:\Users\kirby\HBEngine\Versions\7a1921f1526ee62d에 불변 설치했어요.1813파일·변경15개 SHA·바로가기/.hbproject 연결 검증 PASS. 이전944ae8 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자 창을 시작/종료하지 않았어요. GPU 방출/수명/빈 슬롯 재사용과 ParticleEffect의 emit/rate/play/pause/stop/clear, 사용자C++→BP 노드를 포함해요. 실제 GPU·픽셀·배포 Player·debug 오류0·현재 소스 SHA 검증을 사용했고 변경 없는 편의 함수221개 검사는 재사용했어요. 기존메인씬/CPU 탄막을 자동 GPU로 이식한 설치나 전체게임 FPS/모바일GPU 검증으로 세지 않아요. 증거 native/build/gpu-emission-user-install-049.json. 다음 실행부터 새 버전이 열려요.


## 059 스프라이트 자원/통계 — 2026-10-08

자체 본문/API 표·설치 r180 읽기 범위와 실제 2D/에디터/전체 게임 대조를 [research/SPRITE_RESOURCES_059.md](research/SPRITE_RESOURCES_059.md)에 기록했다. 12회 프레임/C++/BP 자원 유지·픽셀 검증 통과. 전체 게임 FPS 개선·PC120/모바일60·장기 RAM·전체 분석/동등성은 승격하지 않는다. 설치 대기.


- 062: C++ 호스트 실제 사용/확보 힙과 world·카탈로그 참조의 읽기 전용 진단·개발/release 경계·편집기/schema 구현. 실제 GPU 고정 게임 fCUCL4 608파일 보존/전환/초기화/오류0·종료0. Node heapUsed33.3→30.3MiB이나 heapTotal56.1→152.2MiB; 전체RAM/FPS/8시간 목표 미승격. [상세](research/HOST_MEMORY_062.md). 061 3036085 푸시 완료; 설치 대기.


- 063: 충돌의 미연결 async 대기/바인딩 재검색 절감. BP→실제C++ Enter/Exit/Hit/방향/컴포넌트/배치 동일성·62컴포넌트 검사 통과, 부분CPU1.6947→.5478ms. GPU 고정게임4회608파일 보존/오류0·종료0이나 공격p95 목표false. [상세](research/COLLISION_DISPATCH_063.md). 062 88599ff 푸시 완료; 다음 접촉 수명/누적 세부, 설치 대기.


## 075 — 머테리얼 함수

075 자체 UE Material Functions Overview/Unity Sub Graph17.0.4 전체 기술 본문을 대조하고 독립 함수·편집/타입/저장 전파·공용 렌더/배포를 검증했다. 연결 콘텐츠/전체 corpus 미승격. [상세](MATERIAL_FUNCTIONS_075.md); Texture/StaticBool/Attributes·추출·Layer/Blend 세부는 남는다.


## 076 — 속성 묶음·머테리얼 레이어

UE Using Material Layers/Material Attributes Expressions 및 Unity HDRP17.0.4 Layered Lit/Inspector Reference 네 자체 기술 본문을 대조했다. Attributes 함수 타입·Layer/Blend 독립 에셋/스택·인스턴스와 실제 GL/GPU·C++/BP·AI 저장을 검증했다. 연결 콘텐츠/전체 corpus 미승격. [상세](MATERIAL_LAYERS_076.md). Texture/StaticBool·추출/개별 미리보기·height/influence/triplanar/detail/displacement·추가 도메인/GI·WebGL2 Float 재생성 비용은 남는다.


## 077 — Float uniform·인스턴스 레이어 배치

Three Material 관련 API/Uniform 자체 본문과 설치 r180의 uniform upload/종료 구역을 대조해 WebGL2 재생성 비용을 줄였다. 선택 구역 확인은 전체 dependency/Unity/Unreal corpus 분석이 아니다. 실제 Editor/Player·원본·자원 보존은 [077](MATERIAL_UNIFORMS_077.md).


## 078 — 머테리얼 함수 추출·Texture2D/StaticBool

Unreal5.8 Material Functions Overview 자체 기술 본문 전체, Unity17.0.4 Create a Sub Graph 자체 본문 전체와 Property Types 공통/Boolean/Texture2D 구역만 읽었다. typed 객체/정적 분기·선택 추출을 기존 graph/compiler/파일 transaction에 연결했다. 연결 API/영상/소스 및 전체 corpus 미승격. [실제 창/남은 세부](MATERIAL_TYPED_FUNCTIONS_078.md).


## 079 — expression 미리보기

UE5.8 Previewing and Applying와 Unity ShaderGraph17.0.4 Main Preview/Preview Node 자체 기술 본문 전체(Generated Code 포함)를 읽었다. linked API/영상/소스/전체 corpus 미승격. 노드·출력 선택/종료와 입력 불변 흐름을 적용했고 메시/환경/Realtime 설명은 다음 세부로 유지한다. [실제 범위·GL/GPU 증거](MATERIAL_PREVIEW_079.md).
