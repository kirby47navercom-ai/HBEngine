# 2278 이후 — 태스크 중단 대기·효과 캡처 태그

[태스크 중단 대기](BEHAVIOR_DEFERRED_ABORT.md)는 opt-in BT v2에서 FinishAbort·중단/실행 상태 노드와 C++ SDK를 공유해요. [효과 태그 조건](EFFECT_TAG_REQUIREMENTS.md)은 효과 v2의 적용/항목 조건, 편집기 Undo·AI revision/dryRun·공용 ApplyEffectSpec에 연결해요. 구버전은 v2를 거절하며 기본 v1의 즉시 중단과 조건 없는 효과는 유지해요. native BTTask 상속 클래스와 동적 지속 태그 조건은 별도 잔여예요.

# 1738–1741 — 시퀀스 회전·이산 값의 반복 범위

Play Sequence·Pause·Seek 노드는 같은 시퀀스 에셋의 preInfinity/postInfinity를 사용해요. 쿼터니언 회전과 표시·변수·C++ 속성·컴포넌트 값에 유지/반복/왕복을 설정해요. 이벤트 발화·부모/생성 참조·클립 시계는 바꾸지 않아요. 키 없는 AI 범위 수정도 revision/dryRun/Undo·저장을 공유해요. 실제 BP 시작→재생→일시정지→Seek4.5에서 회전5도/표시false를 확인했어요. 자세한 자료형별 지원과 남은 각속도/누적 외삽은 CURVE_INFINITY.md를 봐요.

# 1696–1702 — 저장된 구조체 값의 새 필드 반영

[저장·AI 계약](NATIVE_TYPE_MIGRATION.md): 선언을 사용하는 BP 값·상속·장면·프리팹 변형/연결 충돌·시퀀스/Take 키를 새 멤버 기본값으로 보완해요. 원본·헤더·연관 파일의 기존 트랜잭션과 전체 Undo/Redo, 열린 초안의 저장/충돌 보호를 연결해요. 기존 값·Actor ID·배열 순서를 유지하며 일반 삭제/타입변경·무표식 JSON·실행 중 메모리 배치 변경은 허용하지 않아요.

# 1469–1482 — C++ 사용자 값 구조체

[제작·실행·AI 계약](NATIVE_RECORDS.md): 중첩 필드/배열/enum/액터 참조, Make/Break/선택 Set·분할 핀·함수/매크로 참조·속성/변수/인스턴스 상세·시퀀스/Take·동일 C++ 실행과 AOT 내부 타입 격리를 연결해요. 전용 struct 에셋·필드 스키마 마이그레이션·관리 참조 그래프는 별도 잔여예요.

# 1458–1463 — C++ 열거형·비트마스크·이름 있는 분기

[열거형 제작 계약](NATIVE_ENUMS.md)에 따라 C++ 값·반환·출력 참조·배열·이벤트, 이름 선택 속성·핀·변수·정수 Switch, 비트 위치/직접 마스크와 AI 조회를 연결해요. 전용 enum 에셋과 일반 사용자 구조체는 잔여예요.

# 1241 — 구조체 필드 수정·참조·분기 제작

Make/Break/선택 Set Members, 변수·중첩 필드·배열·함수 입력의 원본 반영, 10개 자료형과 배열 Select, Switch 비교값·순서·Name·기존 그래프 호환, 공용 C++와 revision 기반 AI 편집은 [제작 계약](BLUEPRINT_STRUCT_OPERATIONS.md)을 따라요. 사용자 정의 구조체·enum과 일반 native 속성 참조는 별도 잔여예요.

# 1228 — 독립 접힌 그래프·복제·펼치기

기본값·주석·관찰·중첩 분할 핀·순수 계산·지연 흐름을 보존하는 접기/복제/펼치기와 사람/AI 공용 경로는 [제작 계약](BLUEPRINT_FOLDING.md)을 참고해요. 기존 함수·매크로 저장 형식을 확장하고 VM과 네이티브 바이너리는 재사용해요.

# 1219 — 2D 클래스·실제 컴포넌트 뷰포트

SpriteActor/Pawn2D/Character2D/TopDownCharacter2D의 생성·배치·상속 조회·C++ 형식·Spawn·GameMode defaultPawn을 연결해요. 실제 에셋 미리보기와 AI 명령·카메라/창 수명·요청 시 그리기는 [공용 계약](BLUEPRINT_2D_CLASSES.md)을 참고해요. 기존 작성 파일의 컴포넌트는 보존해요.

# 165 — 제작·게임플레이 공용 확장

능력/속성/효과12·EQS2·문화권2·UI2개 서비스 선언을 Game.hpp에서 생성한다. BP746개·공용 계산289개. C++ queued write/동기화 getter, BP·AI·사람 제작 공용 검증을 유지한다. [20항목 묶음 계약/검증](ENGINE_WORK_165.md).

# 156–164 — 공용 원장·오디오 전환·2D 제작/조회

가중 스냅샷 배열, 대상 파라미터 전환 지정/해제를 Game.hpp 한 선언에서 C++/BP로 제공한다. 현재 BP728개·공용 계산289개다. 예전 mixerSnapshot 명령은 유지한다. SpriteSkin/IK2D8 getter의 선언 return 핀을 실제 반환에 맞춰 연결 오류를 수정했다. 2D 리타게팅으로 만든 클립은 기존 SpriteSkin/AnimationGraph와 같은 재생/조회 경로를 사용한다. 사람/AI의 저작은 같은 revision·dryRun·Undo/저장이다. [구체적 계약/검증](ENGINE_WORK_156.md)·[현재 원장](ENGINE_STATUS.md).

# 154–155 — 기준 포즈 XYZ 관절 제약의 공용 C++/BP/AI 연결

AnimationGraph의 Two Bone/FABRIK/CCD에 선택적 jointLimits를 추가한다. 같은 Game.hpp 선언에서 SetIKJointLimit/ClearIKJointLimit와 한국어·영어 검색 BP 노드2개를 생성한다. 범위·관절 검증, 속성창/Undo/저장, AI document.patch/dryRun/revision과 runtime 상태를 공유한다. 실제 Editor/배포 Player에서 C++ 설정·해제/잘못된 범위 거절, BP 잠금·해제와 실제 골격 바인딩을 확인했다. 세 솔버·2D IK·리타게팅·루트 모션·725 BP노드/공용 계산289 회귀 통과. bind XYZ는 기존 입력 포즈 cone 및 Full Body/Control Rig와 구별한다. [계약](ANIMATION_JOINT_LIMITS_154.md)·[묶음 검증](research/RENDERING_151.json). 전체 누적 목표·corpus gate는 유지한다.

2026-10-15: [초기 준비·프로파일러·C++ 빌드 진단](RENDERING_145.md). profiler.read와 실제 표가 동일한 rendering[]을 반환하고, native.build는 실제 compiler/workerProtocol을 반환해요. 외부 소스 참조 그래프는 공용 blueprint.connect로 해석된 C++ 핀을 연결하며 revision/Undo/저장 모델은 유지해요.

2026-10-15: [복잡 노멀맵·컴파일 재사용·준비 진단](RENDERING_141.md). 머테리얼/Components의 C++·BP·사람·AI 공용 속성은 유지하고, 기존 엔진 스키마에 shaderCompilation/pipelinePreparation의 읽기 전용 단계·시간·캐시 계약을 추가해요.

2026-10-15: [접선 가이드·구름 갱신·분산 하늘 필터](RENDERING_138.md). SkyLight.realTimeCapture/captureVersion과 기존 Components C++·BP·AI 경로를 그대로 사용해요. 공용 스키마에 필터 단계 진단을 추가해요.

2026-10-15: [변형 가이드·그림자·장면 하늘](RENDERING_134.md). 기존 곡면/시간 필터·Components C++/BP/AI 속성·명령을 재사용하고 SkyLight.captureVersion으로 명시적인 재캡처를 요청해요. 별도 AI 상태나 저장 통로를 만들지 않아요.

2026-10-15: [DirectX 래스터 조명](RASTER_LIGHTING_131.md). 기존 SkyLight HDRI·회전·밝기와 PostProcessVolume.rasterLightCulling을 사람·Components C++/BP·AI 공용 스키마로 연결해요. 광원 타일 비트셋은 개수 제한 없이 전체 평가와 같은 결과를 보존하고, 읽기 전용 메모리·갱신 진단을 공개해요.

2026-10-15: [다중 광원·SkyLight·편집기 도구](LIGHTING_TOOLS_128.md). 기존 Components Get/Set Bool/Float/String C++·BP와 공용 속성 schema에 새 광원 설정을 연결해요. 실제 C++/세 실행기·문서 revision·Undo 검증은 별도 묶음 원장에 기록해요.

2026-10-13: [두 단계 BVH·GPU 코스틱·이차 표면 필터](RENDERING_117.md). 기존 컴포넌트 속성 Get/Set·C++·AI에 코스틱 설정 네 개를 연결해요. 기본 꺼짐·32KiB GPU 캐시·세기 0 해제·이력 초기화·자료형 범위 검사를 사용해요.

2026-10-12: [화면 밖·중첩 굴절, 추가 셰이딩·후처리·다중 바운스 GI](RENDERING_098.md). 공용 Surface 10입력/함수·레이어·MI·C++/BP/AI, 깊이/HDR 층 캡처·프로브 굴절, sheen/이방성/박막/specular, 색 보정·비네트·색수차·그레인, 프로브 1~8바운스와 정적 재사용을 연결했어요. 세 실행기 픽셀·기존2D/파티클/그림자 회귀와 제한·비용·지정 읽기 범위는 기계 기록에 있어요. 설치 영수증은 별도 기록하며 전체 corpus/API·Lumen/재귀 RT·전역 FPS를 완료로 승격하지 않아요.

2026-10-12: [색 흡수·벡터 파라미터·색 분산](NATIVE_VOLUME_097.md). Materials SetVector/SetColor C++·BP2·AI, 공용 Surface/속성·함수/레이어/MI·GLSL/TSL/HLSL, Glass/TintedGlass/Prism을 연결했어요. 1,000회 typed uniform·clone·다중 슬롯 사전 거부와 전체 GPU60노드/기존2D·조명·파티클·프로브 회귀, 실제 세 실행기의 C++/T·V키 BP·흡수/분산/재사용·오류0/종료0를 검증했어요. 설치 갱신 후 영수증을 별도로 남기며 전체 corpus/FPS/실기기·남은 셰이딩/후처리/GI를 완료 처리하지 않아요.

2026-10-12: [투과·두께·굴절](NATIVE_TRANSMISSION_096.md). 기존 Surface/속성·함수/레이어/인스턴스와 SetFloat CPP/BP/AI에 Thickness·Transmission 별칭을 연결하고, DirectX HDR 불투명 장면 캡처/mip·IOR/노멀·거칠기와 해제를 구현했어요. WebGPU 투과 노드와 그리기 목록 활성화를 함께 고쳤어요. 실제 세 실행기 C++/T키 BP·재사용·오류0, GPU60노드 회귀와 최종 sampler/Bloom 조합·공용 검증은 기계 기록에 있어요. 중첩/화면 밖/깊이 추적·체적 흡수/분산과 남은 셰이딩/후처리/GI·설치 갱신 순서는 유지해요.

2026-10-12: [코팅층·분리 노멀·IOR](NATIVE_COATING_095.md). 기존 Surface/속성·함수/레이어/인스턴스와 SetFloat CPP/BP/AI를 DirectX 직접광/프로브 및 GLSL/TSL에 연결해요. AO/Clearcoat/CoatRoughness/IOR 별칭·분리 노멀·값 변경 재사용, 실제 세 실행기 C++/C키 BP와 마지막 레이어/MI 검증을 기록해요. 네이티브 투과·추가 셰이딩/GI 및 설치 갱신 순서는 유지해요.

2026-10-08 후속: [CCD IK](ANIMATION_CCD_073.md)에 세 번째 3D 솔버·이름별 전체 회전 제한·공용 C++/BP·AI/Undo/미리보기와 실제 Editor/Player 검증을 연결했다. 2D IK 기존 경로는 유지하고 새 2D 각도 제약·Full Body IK/Control Rig·리타게팅 연산 등 남은 세부를 유지한다.

2026-10-12: [DirectX 일반 텍스처](NATIVE_MATERIAL_TEXTURES_094.md). 기존 cube/array/volume 에셋·노드·함수/레이어/MI와 Materials SetTexture C++·BP·AI 제작 계약을 네이티브 업로드/HLSL에 연결해요. GPU 여섯 면·mip LOD·레이어/볼륨·R 반복/클램프와 실제 Windows 네 종류 교체·프로그램/자원 수명 검증을 기록해요. 전체 corpus/FPS/실기기·설치 갱신은 승격하지 않아요.

2026-10-11: [반사 프로브](NATIVE_PROBES_093.md). ReflectionProbe의 실제 제작 필드/검증과 ReflectionProbes C++·BP3, 기존 Components/document.patch·Undo/Save를 공유해요. DirectX HDR/GGX compute/SH9/BRDF·box/fade·두 프로브와 브라우저 PMREM·한 프로브, 자원 진단/해제·실행 검증 및 미구현 경계를 명시해요.

2026-10-08 후속: [골격 리타게팅](ANIMATION_RETARGET_072.md)에 리그·기준 포즈·프로필/체인 매핑·FK/IK·시작 포즈·루트/골반 배율·베이크 클립·공용 SDK/BP5·AI·별도 미리보기와 실제 Editor/Player 검증을 연결했다. 임의 Op Stack/LOD/Muscle·커브/모프·2D 전용 리타게팅과 다른 누적 세부를 유지한다.

2026-10-08 후속: [3D IK](ANIMATION_IK_071.md)에 Two Bone/FABRIK·공용 C++/BP8·네 공간/가중치/늘이기·AI 편집 계약·실제 뼈 실행·격리 Editor/Player 검증을 연결했다. 이전 미구현 목록은 당시 이력이며 리타게팅과 나머지 누적 세부를 유지한다.

# 070 루트 모션 공용 함수

SDK SetRootMotionMode/GetRootMotionPosition/GetRootMotionRotation과 BP3개가 같은 Actor/그래프 실행기와 물리를 사용한다. 최종 실제 Editor/Player·코어·물리 검증과 읽기 경계는 [070 기록](ANIMATION_ROOT_MOTION_070.md)에 보존한다.

# 069 애니메이션 Enum 실행

animGraphSetEnum/GetEnum 공용 서비스와 C++ SetEnum/GetEnum/GetEnumValue<E> 연결·실제 실행 통과. BP wire는 Integer, 실행 graph enum domain 검증이며 일반 BP Enum 자료형/자동 C++ Enum 리플렉션 완료로 세지 않는다. [상세](ANIMATION_ENUM_SELECTION_069.md).

2026-10-08 후속: [068 애니메이션 정수 포즈 선택](ANIMATION_INTEGER_SELECTION_068.md)은 기존 BP Integer Set/Get과 C++ SetInteger/GetInteger를 공용 실행으로 연결한다. BP Get 결과가 실제 C++ 인자로 전달되는 Editor/Player를 확인했다. BP 함수 수 증가나 전체 Blueprint/엔진 완료로 계산하지 않는다.

# HBEngine 블루프린트와 C++ 구현 기준

2026-10-06: [2D Sprite 광원·볼륨 빛](research/2D_COOKIE_VOLUME_035.md). Light2D 공용 C++/BP7개로 스프라이트·텍스처 cookie 지정/조회/크기, 볼륨 활성/강도/독립 그림자를 연결해요. 사람의 Scene/BP 속성과 AI component schema가 같은 필드를 편집하고 프로젝트 내부 외부 폴더 에셋 참조도 출력에 포함해요. 기존 노드·클래스·핀 구조는 유지해요.

2026-10-06: [실행 중 생성·찾기 계약](AURIC_RUNTIME_SPAWN.md). C++/BP의 BP·Prefab·클래스 Spawn/Destroy, 실제 C++ 객체·기본값·수명, 자동 풀 용량·재사용·취소, 클래스/태그/ID 검색과 없는 Actor 참조의 null 처리를 연결해요. 전체 노드601개/공용 선언289개예요. 모듈 간 생성 후 호출과 모바일 AOT도 같은 명령 순서를 검증해요.

2026-10-06: [BP 상속·인스턴스 계약](BLUEPRINT_INHERITANCE.md). BP 부모의 컴포넌트·변수·그래프·C++를 해석하고 얇은 자식 파일을 저장해요. 이벤트/함수/Construction 부모 호출과 명시적 클래스/인스턴스 기본값, 순환/redirect/cook, revision을 공유해요. 실제 Editor·Game.exe의 C++ 값과 호출 순서를 검사해요.

2026-10-06: [Auric C++ 묶음 계약](AURIC_NATIVE_BATCH.md). 함수·매크로·여러 Tick·C++ Timer·Input Action의 직선 native 호출을 같은 빌드에서 묶고, 콜백/자료 의존성/실패/작업 취소 경계를 유지해요. Action은 owner별 샘플 시점과 다른 모듈 조회 상태를 PC worker·모바일 AOT에서 대조해요. 전체 BP 상속·전체 함수 실행 최적화의 완료로 계산하지 않아요.

2026-10-05 추가: [전용 Light2D](2D_LIGHTING.md)의 공용 C++/BP16개와 Sprites 조명 모드2개를 연결해 기본 노드594개예요. 반경·각도·노멀의 여러 반환 핀/같은 C++ 호출의 읽기·쓰기·실제 배포 Player를 검증했어요. 이전 숫자는 당시 스냅샷이에요.

2026-10-05 추가: [구간 알림·이벤트 인자](ANIMATION_NOTIFIES.md). 단일/구간 알림은 사용자 Custom Event의 같은 이름/자료형 데이터 출력으로 int/float/bool/string/vec2/vec3/color/object를 전달해요. 범위 Begin/Tick/End→nativeCall 사용자 C++와 Stop의 정리를 실제 Editor/Player에서 확인했어요. 독립 알림 클래스 ABI로 표현하지 않아요.

2026-10-05 추가: AnimationGraph::GetSyncLeader/GetSyncPhase/GetSyncMode3개를 공용 C++/BP·실제 Editor/Player에 연결했어요(전체560개). 단일 애니메이션 알림은 Actor의 Custom Event를 통해 사용자 C++도 호출해요. ID/처리 시점·마커/시계·검증은 [동기화 계약](ANIMATION_SYNC.md)에 기록해요.

2026-10-05 추가: AnimationGraph의 정수/트리거와 상태 전환·현재/다음/시간/정규화 시간/가중치/진행률12개를 공용 선언·실행에 연결했어요(전체557개). [포즈 상태 계약](ANIMATION_STATES.md)에 C++ 명령 처리 시점·단위·실제 Editor/Player BP Trigger→State Custom Event→사용자 C++ callback 근거를 기록해요.


2026-10-05 추가: `hb::IK2D`의 목표/회전 Set/Get·Actor 목표 연결/해제·솔버 가중치 Set/Get·활성 Set/Get·전체 가중치 Set/Get12개가 같은 2D IK 실행기를 사용해요. C++ setter 직후 조회는 같은 요청 값이고 뼈 계산은 IK 갱신 단계예요. [2D IK 계약·실제 Editor/Player 근거](2D_IK.md)에 제작/수명·가중치/순서·headless/AI·한계를 기록해요. 전체 카탈로그545개예요.


2026-10-05 추가: SpriteSkin::Set/GetBonePosition, Set/GetBoneRotation, Set/GetBoneScale, Reset 7개를 공용 C++/BP로 연결했어요(전체533개). [2D 리그](2D_SPRITE_RIG.md)·[시작 위치/HUD 계약](STARTUP_STATE.md) 참고. 새 Construction 기본 그래프는 이벤트만 있고, 변경 없는 예전 원점 초기화 예제는 실행 복사본에서 제외해요. 실제 Editor/Player C++ Construction에서 첫 Tick 전 HUD 수정/조회·배치 위치 보존이 통과했어요.


2026-10-05 추가: `hb::States::IsInState/GetPath/GetElapsed`의 BP 노드 세 개와 계층 FSM을 연결했어요. 카탈로그는 517개예요. 기존 평면 FSM 파일과 GetState는 유지하며 C++ 변경 명령은 함수 반환 후 처리해요. [FSM 제작·실행·실제 창 검증](HIERARCHICAL_FSM.md)에 세부 계약을 기록해요.

2026-10-05 추가: `hb::Sprites`의 색상/크기/정렬/마스크/조명 설정과 읽기 10개를 공용 선언에서 생성했어요. 사용자 C++ 함수 안의 변경 후 읽기와 BP의 같은 서비스 검증을 확인했어요. 전체 카탈로그는 514개이며, 등각 Tilemaps 좌표/즉시 충돌 질의도 공용 격자 기준을 사용해요. 세부 동작·검증 범위는 [2D·단축키 계약](2D_RENDERING_SHORTCUTS.md)에 있어요. 노드 수를 전체 누적 엔진 완성으로 해석하지 않아요.

조사 갱신: 2026-10-03. 전체 공식 근거와 엔진 범위는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 분야별 조사 상태와 코드 대조는 [조사 범위](REFERENCE_COVERAGE.md), 조작 계약은 [인터랙션 기준](EDITOR_INTERACTION_SPEC.md), 노드별 핀·C++ 대응은 [노드 카탈로그](NODE_CATALOG.md)에 있다.

**실행됨**은 공용 BlueprintRuntime/게임 서비스에 연결됐다는 뜻이고 **공통 C++**은 실제 C++ 함수도 존재한다는 뜻이다. 편집기 Play, 화면 없는 로직 검사, 독립 Windows Player의 검사 범위를 각각 구분한다. Game.exe는 기본 웹 장면 경로와 선택 가능한 Windows DirectX 11 장면 경로를 구분한다. D3D11 정적/인스턴스/뼈대·모프·그림자·HDR/HLSL·GPU ParticleSystem의 실제 범위와 증거는 086–091 기록을 따른다.

## 2026-10-04 입력·모바일·풀 연동

- Input Event의 Pressed/Released와 hb::Input의 키/축/마우스 CSS 좌표/델타/월드 ray/조준 평면을 에디터 Play·Player·headless·실제 C++에 연결했다. 핀의 자료형과 out 매개변수는 공통 헤더에서 생성한다.
- hb::ActorPool Acquire/Release/IsActive는 PooledActor의 미리 배치한 탄환·적을 재사용한다. 반환 시 물리/충돌·Tick·소유 Delay/Timer/Timeline·AI/FSM·UI/오디오를 정리하며 OnPoolAcquire/OnPoolRelease 사용자 이벤트를 지원한다.
- hb::Sprites SetFlip/GetFlip/SetSprite/GetSprite와 스프라이트 애니메이션이 같은 렌더 경로를 사용한다. 반전은 렌더 메시만 바꾸고 Actor 변환이나 콜라이더를 바꾸지 않는다.
- TopDownMovement2D를 BP에서 추가한 경우에도 플레이어 자동 제어권/Gameplay.GetPlayerPawn을 연결한다. 새 프로젝트의 탑다운 슈터는 일반 BP 그래프·변수·사용자 C++ 파일이다.
- 기존 위젯 편집기의 모바일 프리셋과 AI widget.mobileControls는 같은 스키마·문서 revision·Undo를 사용한다. 가상 입력은 키/축 소스 합성 뒤 동일 Input Event/Input Action으로 전달한다.

검증 범위·실제 프레임 측정·재현 명령은 [입력·모바일·풀](INPUT_MOBILE_POOL.md)에 기록한다.

## 공식 근거

[Epic C++/Blueprint 혼합](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus?lang=en-US), [공개 메타데이터](https://dev.epicgames.com/documentation/en-us/unreal-engine/exposing-gameplay-elements-to-blueprints-visual-scripting-in-unreal-engine), [UFUNCTION](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine), [변수](https://dev.epicgames.com/documentation/unreal-engine/blueprint-variables-in-unreal-engine?lang=en-US), [흐름 제어](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine?lang=en-US), [함수](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine), [매크로](https://dev.epicgames.com/documentation/en-us/unreal-engine/macros-in-unreal-engine), [그래프 추출](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine)를 참고했다. HB는 자체 코드·저장 형식·실행기를 사용한다.

## 노드 라이브러리

기본 노드 **486개**, 공통 C++ 코어 API **289개**와 실행 서비스 API **115개**를 제공한다. 라이브러리에는 수학/삼각/지수/보간, 정수/비트/비교, Vec2/Vec3, 회전·방향·Transform, 색상, 문자열, 자료형 변환, 8종 배열 × 11연산의 **221개 공통 함수**와 **8개 흐름 제어**가 추가되어 있다. 새 `inputAction`은 독립 IA 에셋의 값 타입과 Started/Triggered/Completed 실행 출력을 갖는 이벤트다. 노드마다 실제 계산/제어 코드와 서명 검사를 두었다. C++/JS 동등성 검사는 공통 함수의 실제 C++ 호출 결과를 비교한다. 모든 수치·경계 조합을 증명하는 검사는 아니다.

- bool/int/float/string/vec2/vec3/color/transform/object/hit, 단일·배열 변수와 내장 구조체 분할/합치기.
- Branch, Sequence, ForLoop, ForEach, While, Break가 있는 반복, DoOnce/DoN, Gate/MultiGate, FlipFlop, Delay/재시작 지연, 정수/문자열 Switch.
- Delay는 대기 중 같은 노드의 재호출을 무시하고, 재시작 지연은 완료 시간을 다시 설정한다.
- 배열의 Length/Get/Find/Contains/Reverse/Append/Slice/Unique는 자료형별 함수다. 복사 연산은 원본을 바꾸지 않고 새 배열을 반환한다. 배열 변수 변경은 Set/Add/Remove 실행 노드로 한다.
- Sequence는 2출력, MultiGate와 Switch는 3출력을 제공한다. 임의 개수의 동적 실행 핀은 아직 미지원이다.
- int는 C++에 맞는 32비트 정수다. 문자열 인덱스는 새 Text 함수에서 Unicode scalar 단위이고 대소문자 변환은 ASCII다. Color는 0~1 RGBA다. 회전은 XYZ Euler degree, Forward +Z, Up +Y다. Unreal의 좌표계와 동일하다고 가정하지 않는다.
- 편집 배열·새 공통 배열 계산은 128원소, 그래프는 1,000노드/5,000연결, 반복/한 이벤트 계산은 10,000단계와 재귀 64단계로 제한한다.

## 제작 기능 상태

| 기능 | 현재 동작 | 남은 범위 |
| --- | --- | --- |
| My Blueprint / Inspector | 이벤트·함수·매크로·변수·통신·컴포넌트·클래스 상세 편집, JSON 저장; 클래스 전용 컴포넌트 뷰포트 | 전체 컴포넌트 계층·Skeletal/카메라 등 시각화 |
| 함수·매크로 | 시그니처·내부 그래프·순수 함수·선택 추출·실제 호출, 매크로 지연 후 재개 | 로컬 변수·참조 매개변수 의미·독립 라이브러리 에셋 |
| Construction | 별도 그래프, 실행 시작 때 BeginPlay 전에 실행 | 편집 중 속성 변경마다 재구성하는 native 생명주기 |
| 이벤트 | Begin/End/Tick·키/축·typed IA 입력, 실제 2D/3D 콜라이더의 Overlap/Hit, 사용자 이벤트 | 전체 입력 Trigger/Modifier·장치/플레이어별 문맥·정밀 물리 이벤트 |
| 핀/변수 | 단일/배열 검사·기본값·Get/Set·중첩 분할·관찰·변수 승격 | 사용자 Struct/Enum/Set/Map·soft/interface 참조·자동 변환 삽입 |
| 클래스/상속 | Actor/Pawn/Character/PlayerController/GameMode/Component/SceneComponent 템플릿·C++ 부모·공개 기본값·void 이벤트 재정의·BP→BP 상속·부모 호출·클래스/인스턴스 override | 정밀 Character 이동 solver·추가 C++ 수명 주기/리플렉션 계약 |
| 편집 | RMB/MMB 이동·휠/Ctrl 확대·사각/다중 선택·복사/복제·주석·Undo/Redo·검색 | 북마크·정렬/분배·자동 배선·Diff |
| 도킹/Project | 실제 폴더·다중 선택/가져오기·파일 내부 검색·창 분할; BP/Material/Animation/Curve/IA/IMC/Data/Scene 파일별 문서·Undo·저장/닫기 보호 | OS 부동창·명명 레이아웃·전용 에셋 종류 확대·전체 Project 키/필터 |
| 타이머·지연 | 게임 시간 배율·정지, Delay·재시작 지연·타이머 완료 이벤트 | native/VM 공통 핸들 풀·비동기 서비스 전반 |
| Timeline/Animation | 4종 트랙·커브/접선/키 편집·재생/역방향/스크럽·BP 실행 이벤트; 독립 Curve/Transform Animation 파일·미리보기·Play/Stop Animation 대상 실행 | Curve 에셋의 BP 참조·임의 속성/Animation 이벤트 트랙·뼈 저작·계층 FSM·포즈 블렌딩 |
| 디스패처·인터페이스 | 시그니처, 구독·해제·이벤트·메시지 실제 실행; 장면의 서로 다른 BP 파일을 객체별 실행 | 독립 계약 에셋·다중 BP 클래스 간 정적 계약 검사 |
| 디버거 | 실제 노드 중단점·Step/Continue·호출 스택 표기·계산 핀 값 | 실행 객체 선택, 프레임/Step Into/Out 구분·native 코드 디버거 |
| 오브젝트/서비스 | 생성/제거/부모·기본 컴포넌트, Mesh Raycast, 표면/광원, 오디오·모델 클립/Transform Animation·기본 위젯·SaveGame | 정밀 강체 solver·3D 음향·장면 스트리밍·AnimationBP·UI 바인딩 |
| 빌드/배포 | 사용자 .h/.cpp 실제 g++ 빌드/RPC·프로필·사전 컴파일 worker 동봉·독립 Windows Game.exe의 공용 BP 실행 | DX11/HLSL 런타임·DLL 교체/다중 번역 단위·타깃 cook/압축/chunk·installer·다른 플랫폼 |
| 네트워크/확장 | 미구현 | 복제/RPC·권한·플러그인·에디터 도구 |

## 에셋과 입력 제작 흐름

- 콘텐츠 폴더에서 우클릭해 BP 클래스·C++ 클래스·IA·IMC·Material·Transform Animation·Curve·Data·레벨을 실제 파일로 만든다. 추가한 독립 에셋은 Sprite/TileMap/Flipbook, MaterialInstance/PhysicalMaterial, Prefab/GameConfig/AudioAsset와 Blackboard/BehaviorTree/FSM/Montage/Sequence까지 공통 생성·검증·문서 경로를 사용한다. C++는 `.h/.cpp` 한 쌍이다. 사용자 Struct/Enum/Interface/UI/VFX graph 에셋은 추가 대상이다.
- BP 생성 시 부모 7종을 선택하고 클래스에 맞는 기본 컴포넌트를 만든다. Character의 Capsule/CharacterMovement 설정과 뷰포트 미리보기, 실제 보행·점프·Possess와 고정 스텝 물리 연결을 제공한다. Capsule 충돌은 AABB 근사이고 정밀 경사/계단 controller는 남아 있다.
- IA는 bool/float/vec2/vec3, dead zone, pressed/held/released, 입력 소비를 편집한다. IMC는 액션·키·축·배율·우선순위를 편집한다. 클래스에 IMC를 지정한 뒤 우클릭 검색에서 IA 파일 이름으로 typed 이벤트를 놓는다.
- 입력 실행기는 우선순위/소비를 적용하고 Started/Triggered/Completed를 내보낸다. held는 키 반복 메시지가 아니라 게임 프레임에서 실행한다. Ongoing/Canceled·Hold/Tap/Chord·실행 중 Context 교체·플레이어별 문맥·C++ 직접 액션 구독은 남아 있다.
- 장면 오브젝트는 BP 이름만이 아니라 `blueprintAsset` 파일 경로를 참조한다. Play는 해당 파일과 IA/IMC를 검증해 인스턴스별 실행에 연결한다. 에셋 이름 변경 후 구 경로는 영속 redirect로 해석한다.

## 독립 Animation의 런타임 의미

`Play Animation`은 대상 모델에 같은 이름의 내장 클립이 있으면 기존 Three AnimationMixer 경로를 우선 사용한다. 없으면 Animation 에셋을 읽어 검증한 뒤 `position/rotation/scale` ID의 키가 있는 vec3 트랙을 적용한다. 각 값은 대상 Transform 속성의 절대값으로 덮어쓰며 회전은 XYZ Euler degree다. 임의 컴포넌트 속성·Skeletal 포즈·상태 머신·Animation 이벤트 트랙은 이 경로의 지원 범위가 아니다.

에셋 재생은 0초에서 시작한다. 반복은 노드의 `Loop` 입력을 사용하고, 에셋의 `playRate`, `lastKeyframe`, `ignoreTimeDilation`을 적용한다. 마지막 키 길이는 같은 `timelineLength` 규칙을 사용한다. 반복 시 남은 프레임 시간을 보존하고 비반복 완료 뒤 마지막 값을 유지하며 업데이트를 종료한다. `Stop Animation`은 현 값을 유지하고 해당 대상의 재생을 해제한다. 게임 전체 Stop은 별도로 편집 월드를 복원한다.

`engineOperations`의 선택적인 `readAsset` hook으로 열린 편집본을 공급할 수 있다. 기본 경로는 Project API의 실제 파일 읽기다. 재생 시 데이터를 복제하므로 이후 에셋 편집으로 재생 중 데이터가 바뀌지 않는다. 에셋 검증 실패는 대상 Transform을 변경하지 않으며, 대상 파괴와 서비스 종료는 재생 상태를 정리한다. `test:runtime`은 세 속성·정지/완료·반복·재생 속도/시간 배율·검증 실패·파괴/정리·파일 읽기·기존 모델 클립 우선을 검사한다.

## C++ 연결의 실제 동작

1. HB_CLASS/HB_PROPERTY/HB_FUNCTION 공개 선언을 제한된 분석기로 읽는다. 미지원 공개 자료형·선언은 오류다. 함수 본문은 g++이 컴파일한다.
2. Callable/Pure/static/Get/Set/읽기 전용·반환·출력 참조·Native/Implementable void 이벤트로 노드 핀을 생성한다.
3. 헤더/구현/생성 wrapper/공통 헤더의 해시로 빌드하고 별도 C++ 실행 프로세스를 호출한다. JSON에는 주소 대신 등록된 객체 ID를 전달한다.
4. 객체 Transform·공개 기본값·함수 입력을 전달하고 C++ 출력·속성·객체·이벤트를 **전체 검증한 뒤** 적용한다. 잘못된 타입·범위·반환·컴파일 오류는 실패로 표시한다.
5. C++ 이벤트 override는 호출 종료 후 해당 BP 인스턴스로 전달한다. 이벤트 그래프에서 다시 C++ 함수를 호출할 수 있다. 임의 반환값을 C++ 호출 내부에서 동기적으로 받는 override는 아직 없다.
6. 게임 프레임은 native Clock/Timer를 진행하고 VM을 실행한다. native와 VM 타이머 핸들 풀은 별개다. 공통 API 수학/시간/변환은 C++에서 직접 호출할 수 있지만 브라우저 렌더/오디오/UI 서비스를 전부 C++로 옮긴 것은 아니다.

지원 입력은 헤더+구현 한 쌍이다. Actor 계열·Component 계열·Library 공개 선언과 static 호출을 지원하고, 현재 편집기 실행 월드의 주 바인딩은 Actor다. 콘텐츠의 C++ 파일은 외부 Visual Studio를 우선 탐색해 열고, 없으면 Visual Studio Code를 찾는다. C++ 생성/외부 편집/BP로 감싸기를 연결했지만 `.sln/.vcxproj` 생성과 IntelliSense 설정은 아직 없다. 추가 사용자 헤더·라이브러리·다중 번역 단위·DLL 핫 리로드·임의 구조체는 지원하지 않는다. [문 예제 헤더](../prototype/examples/DoorController.h), [구현](../prototype/examples/DoorController.cpp), [BP 실행 예제](../prototype/examples/BP_NativeDoor.blueprint.json)를 참조한다.

여러 BP/C++ 파일을 쓰는 장면에서는 파일별 빌드 결과와 소유 인스턴스를 연결한다. `nativeWorld`는 다른 빌드의 객체를 일반 Actor로 전달하고 해당 빌드가 소유한 native 클래스/속성만 보낸다. 한 worker가 다른 모듈의 공개 상태를 잘못 생성·덮어쓰지 않도록 한다. 디스크 C++ 원문과 등록 원문이 달라지면 재빌드를 요구한다.

## 저장·AI·검증

블루프린트 편집 UI는 노드 제목 14px/핀 이름 12px, 종류별 문서 탭, 현재 선택의 속성창을 사용한다. C++ 편집/빌드는 연결된 native BP에서만 노출하고 일반 BP에서 다른 클래스의 헤더를 열지 않는다. 게임 실행은 공통 툴바, 그래프의 한 단계는 중단점에 멈춘 실행에서만 활성화한다. 화면 변경은 `EDITOR_INTERACTION_SPEC.md`의 화면 정리와 별도 시각 검증으로 확인한다.

Project 파일과 브라우저 복구 저장은 장면·환경·BP/함수/매크로/Construction·C++ 원문·기본값·통신·Timeline과 독립 머테리얼/애니메이션/커브/입력/데이터 문서를 유지한다. 각 파일은 선택/배치·Undo·dirty 상태를 따로 가지며 전환으로 다른 파일의 편집을 덮지 않는다. 저장 실패나 저장 중 추가 편집은 dirty를 유지하고, 닫기는 저장/저장 안 함/취소를 제공한다. BP 내보내기 파일은 안정적인 ID와 명시적 타입/핀/연결을 포함한다. 잘못된 JSON/타입/연결은 기존 편집값을 바꾸기 전에 거부한다.

검사는 npm test, api:check, test:library, test:native, test:runtime, test:host, test:project, test:assets로 재현한다. `test:assets`는 문서 격리/저장 실패·초기 에셋 8종·부모 7종·입력 우선순위·다중 BP 실행·rename 재열기·native 모듈 소유 상태를 확인한다. 화면 검증은 별도로 수행하고 커밋 본문에 결과를 적는다. 기존 화면 검증은 실제 C++ 빌드→함수 호출→C++ 이벤트→BP 이동과 Stop 복원, 파일 내부 검색, 다중 가져오기/선택/문서, 창 분할/최대화, OBJ 미리보기와 Timeline 키 편집을 포함한다. 완성된 Unreal/Unity 대체 엔진이라고 부르지 않는다.

## 2026-10-02 실행·제작·AI 연계

공통 `scene-components.js` 27종은 장면 Inspector와 Blueprint 컴포넌트 편집·기본값·검증·런타임을 공유한다. 클래스에는 Controller/PlayerController/AIController, GameMode/GameState/PlayerState/Pawn을 구분한다. Blueprint 컴포넌트를 설치한 뒤 렌더·타일 충돌을 준비하고 모든 Construction 이후 서비스 초기화, BeginPlay를 실행한다. Fixed Update는 누적된 고정 스텝마다 물리 적분 전에 실행하며 컴포넌트별 Begin/EndOverlap과 Hit를 구분한다. 2D는 XY 물리와 표시 깊이를 분리한다.

기존 289개 코어 C++ API에 EngineService 19개(역할 조회/소유/이동/충격/힘/속도·월드/로컬 위치·장면 전환)를 실제 플레이 서비스로 연결했다. 정적 BP 카탈로그는 390개이며 사용자 C++ 노드는 등록된 함수에 따라 늘어난다. 노드 수만으로 기능 완료를 판단하지 않는다. C++ 변환·반환을 검증한 뒤 소유 실행 월드에 적용한다.

Sprite/TileMap/SpriteAnimation, 물리/머테리얼 인스턴스, 게임 설정, 프리팹, 오디오 에셋도 독립 파일이다. 스프라이트 프레임 애니메이션은 기존 PlayAnimation 서비스로 실행된다. 머테리얼 54종 노드는 별도 타입 그래프와 GLSL 생성·실제 Three GPU 재질을 사용하며 BP 이벤트 그래프와 섞지 않는다. Windows D3D11의 지정 54종 HLSL 실행과 해결된 머테리얼 함수/레이어 연결은 086 이후 기록을 따르며 모든 고급 셰이딩/텍스처 종류가 지원되는 것은 아니다.

AI는 `/api/schema`의 공통 정의와 `document.get/patch/save`, Undo/Redo, native.build, Play/Stop/State를 사용한다. 사람의 저장 전 편집을 revision으로 보호하고 디스크 변경 시 저장을 거부·백업한다. `tools/run-project.mjs`는 같은 VM/물리/C++를 화면 없이 시나리오로 실행한다. 인터페이스와 한계는 [AI_ENGINE_API.md](AI_ENGINE_API.md), 실행 증거와 누적 미완료 분야는 [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md)에 이어 기록한다.

Open Scene과 C++ `hb::Scene::Open`은 대상 장면 검증 후 프레임 경계에서 월드를 교체한다. 이전 인스턴스 EndPlay(reason=LevelTransition), 지연·타이머·입력·서비스 정리 이후 새 월드 Construction/BeginPlay를 실행한다. EndPlay 오류가 있어도 모든 인스턴스 종료와 정리를 수행한다. Stop은 편집 원본과 뷰/환경 설정을 복원한다. 중복 이름은 전체 경로를 요구하며 읽는 중 종료된 VM에는 새 전환 요청을 남기지 않는다.


## 2026-10-03 AI·상태·연출·효과 확장

컴포넌트는 **39종**, 정적 BP 카탈로그는 **444개**, 공통 실행 서비스는 **73개**다. 앞 절의 27종/390개/19개는 2026-10-02 당시 수치다. 서비스 선언은 `native/include/HBEngine/Game.hpp`에서 BP 핀을 생성하고 `Bridge.hpp` 명령을 같은 `engineOperations`로 실행한다. 실제 C++ 빌드·명령 재생·반환값 검사를 거친다.

| 독립 에셋 | 제작과 실제 실행 |
|---|---|
| Blackboard | bool/int32/float/string/vec3/object 키, 자료형 기본값·객체 선택·XYZ 입력. 소유자별 실행 값은 기본값과 분리한다. |
| BehaviorTree | Selector/Sequence/SimpleParallel/Condition/Inverter/Repeat/Wait/Set/MoveTo/LookAt/Event/PlayAnimation/Succeed/Fail 14종. 우선순위 재평가, 실행 중 대기 기억, 조건 탈락 시 중단, 서브트리 서비스 간격, 블랙보드와 실제 경로 이동. |
| FSM | 상태·시작 상태·Enter/Update/Exit·클립, 파라미터·AND 조건·이벤트·정규화 종료 시간·Any State 전이. 평면 상태 머신이며 UE StateTree의 계층 상태/병렬 선택을 구현한 것은 아니다. |
| Montage | 섹션과 Next/Jump, Notify, 슬롯의 클립 구간, 재생/정지/일시정지/Seek. Transform/Flipbook/가져온 skeletal 클립을 실제 시간으로 샘플링한다. 한 대상의 겹치는 full-body 슬롯은 오류로 거부한다. 뼈별 마스크·root motion·네트워크 동기화는 남아 있다. |
| Sequence | position/rotation/scale/visible/event/camera/animation/audio/light/material/timeScale 11종. 객체 ID 바인딩·키·animation/audio 클립, FPS 스냅(Shift 자유 이동), 재생/일시정지/Seek·종료 시 복원. 독립 복제 장면 미리보기는 같은 실행 서비스와 파티클을 사용하며 편집 원본은 변경하지 않는다. |

각 에셋은 폴더 우클릭으로 생성하고 파일마다 전용 문서·저장·Undo·복구를 사용한다. BT/FSM 그래프는 RMB/MMB 이동·휠 확대·입출력 연결·Alt 연결 해제·Delete·전체 맞춤을 제공한다. BT 우클릭은 한영 검색이다. 플레이 중 진단 에셋/현재 장면을 열 수 있으며 문서 수정은 거부한다. 여러 소유자가 같은 에셋을 쓰면 실행 대상을 선택한다. 다른 에셋 창이 활성인 상태에서도 마지막 작업 장면을 복구한다.

NavigationGrid/Agent/Obstacle은 2D XY 또는 3D XZ의 장애물과 에이전트 콜라이더 크기를 고려하는 격자 A*다. 다각형 NavMesh·경사·off-mesh link·RVO는 미지원이다. AIPerception/PerceptionSource는 시야/시야 이탈·각도·차폐·소리·기억과 `OnTargetPerceptionUpdated`, Target/HasTarget 블랙보드 동기화를 제공한다. 계층 태그와 Any/All/None 재귀 질의를 BP/C++에서 사용한다.

ParticleSystem은 seed 기반 CPU 시뮬레이션과 Three Points 셰이더를 공유한다. 시간/거리 방출·버스트 확률/반복, cone/sphere/box/circle2D, local/world, force/drag/gravity·색/크기 변화·텍스처/혼합/정렬을 편집한다. 대상별 Play/Stop/Pause/Emit/Count가 BP/C++로 연결된다. 파티클 충돌·trails·mesh renderer·sub-emitter·GPU simulation은 남아 있다. Decal은 수신 메시 표면으로 실제 기하 투영을 수행하고 GPU 자원을 정리한다.

새 `2D · AI와 효과`, `3D · AI와 효과` 프로젝트는 위 흐름을 실제 에셋과 장면으로 생성한다. 2D에는 중력 없는 탑다운 입력을 별도 컴포넌트로 제공하고 기존 플랫폼 이동을 보존한다. `test:gameplay`, `test:systems`는 실행/실패 보존/실제 C++ 호출과 두 프로젝트의 600프레임 이동·상태·효과·원본 보존을 검사한다. UI 화면 검증에는 런타임 상태 선택, XYZ 편집→Undo, 시퀀스 정·역방향 스크럽과 재실행 후 장면 복원을 포함한다.

C++ 변경 명령은 호출 종료 후 소유 플레이 월드에서 검증·적용한다. 상태 조회는 호출에 전달된 런타임 snapshot을 읽으며 모든 쓰기 직후 동기 조회를 보장하지 않는다. 일부 setter의 로컬 snapshot 반영과 실제 비동기 서비스 완료를 혼동하지 않는다. 몽타주/시퀀스 미리보기는 이벤트/음향을 실행하지 않고, 긴 스크럽은 최대 4,096 스텝 이후 큰 간격을 사용한다. 전체 프레임의 결정론적 bake는 추가 범위다.

## 제작 UI와 공통 편집 명령 — 2026-10-03

- 이벤트 제목 오른쪽 삼각형은 실제 실행 출력 핀이다. 중복 본문 실행 출력은 제거했다. Get 변수는 제목 옆 데이터 핀을 가진 작은 노드로 표시한다.
- 변수 드래그: 실행 입력/출력은 Set 삽입과 이전 실행선 보존, 데이터 입력은 Get 연결. 빈 그래프는 Get/Set 메뉴, Ctrl Get, Alt Set이다. 배열·참조를 임의 스칼라로 변환하지 않는다.
- 자동 변환은 공통 노드 `intToFloat/floatToInt/intToString/toString/boolToString/boolToInt/intToBool/vector2ToVector3/vector3ToVector2`를 사용한다. 실패와 순환 연결은 원자적으로 거절한다. 추가 노드는 기존 노드와 겹치지 않는 가까운 공간을 찾는다.
- 입력→출력 역방향 드래그, 핀에서 검색 후 자동 연결, 방향키/Enter 검색, 선 더블클릭 데이터 재배선, 좌/상/간격 정렬, 노드 내부 숫자·bool·문자열 기본값 편집을 제공한다.
- My Blueprint는 검색/접기/추가와 상세 Inspector를 함께 사용한다. 컴포넌트 추가는 2D/3D 공통 검색 창이며 사용자 C++ 컴포넌트 항목을 포함한다.
- 오브젝트 배치는 38개 실제 조합·검색·분류·도킹·드래그를 제공한다. 위치/회전/크기 스냅과 월드/로컬 변환, 선택 Q·이동 W·회전 E·크기 R·Space 순환·Ctrl+Space 창 최대화를 제공한다. 선택/전체 충돌 미리보기는 현 solver의 경계를 보여준다.
- 머테리얼 54종 노드(21종 추가): 월드 위치/법선·시선·Fresnel, 채널 분해/조합, 외적/반사/거리, 절차적 패턴과 그라데이션, 추가 수학. CPU 평가와 GPU GLSL 실행을 연결했다. 네 가지 템플릿은 노드·핀·파라미터를 일반 머테리얼 에셋으로 저장한다.
- `test:authoring`은 실제 VM 출력, 연결 보존, 실패 무변경, 배치 컴포넌트, 2D 부모 아래 충돌 경계, Fresnel 각도와 템플릿을 검증한다. 실제 UI/API 저장·Undo·파일 검증은 `node tools/check-authoring-editor.mjs URL`이며 전용 `authoring-qa` 프로젝트에서만 실행한다.

## 위젯·믹서 실행 서비스 — 2026-10-03

정적 카탈로그는 457종(289 코어+86 C++ 실행 서비스+기타 이벤트/제어 노드)이다. 이번 UI 9개와 Mixer 4개는 `Game.hpp` 선언에서 BP 핀을 생성하고 `Bridge.hpp`로 같은 실행 서비스에 연결한다. 생성 서비스 노드의 dispatch도 전체 공통 경로로 수정했다. 노드 수는 Unreal/Unity 전체 API 구현 완료 수가 아니다.

- `hb::UI::Show/Remove/SetText/GetText/SetValue/GetValue/SetVisible/SetEnabled/Focus`: 소유 Actor와 위젯 instance, 요소 이름/ID로 조작한다. 위젯 파일의 click/changed/submit/focus/blur는 소유 BP의 custom event로 전달되며 widget/element/type/text/value를 제공한다. 변수 ID 또는 이름으로 text/value/visible/enabled/checked를 바인딩한다.
- UI setter/getter는 실제 DOM과 런타임 상태에 연결된다. Checkbox value는 0/1이고 Slider/ProgressBar는 min/max로 제한한다. 부모 disabled는 자식 입력에도 적용한다. 현재 입력값으로 TextInput submit과 Checkbox click을 전달한다.
- `hb::AudioMixer::SetFloat/GetFloat/ClearFloat/TransitionTo`: asset 경로와 노출 이름, snapshot/전환 시간으로 제어한다. SetFloat override는 ClearFloat까지 snapshot에 우선한다. 범위 밖·없는 이름·잘못된 bus/snapshot/계층은 실패한다. 실제 WebAudio 버스/필터/압축기/신호로 실행한다.
- C++ 읽기는 호출에 전달된 snapshot이다. Show 이후 생성/삭제, snapshot 전환을 같은 호출에서 동기 완료로 취급하지 않는다. 다음 상태와 실행 이벤트로 확인한다.
- `test:ui-audio`는 실제 BP/C++ 실행·공용 snapshot·값 범위·수명을 검사한다. `prototype/tests/ui-audio.html`은 실제 DOM 이벤트와 PCM 감쇠/필터/Mute/Solo/공간 노드를 검사한다. 별도 위젯 클래스/애니메이션/지역화, mixer send/reverb/voice priority/native backend 등은 남아 있다.

## 강체 서비스와 C++ 동기 질의

16개 물리 서비스 선언에서 BP 핀을 생성해 공용 실행기로 연결했다. 각속도/질량/sleep, 네 힘 모드·작용점·토크·각 충격량, Raycast/All·Sphere/BoxCast·OverlapSphere/Box·ClosestPoint를 제공한다. 기본값 dimension=3·mask=-1·includeTriggers=false·ignore=null은 C++ 선언에서 가져오며 2D는 dimension=2를 지정한다. `hb::HitResult`와 BP hit/split pin·HitResult[]·Actor[]를 같은 JSON으로 연결한다.

C++의 공간 검색 7종은 읽기 전용 Rapier 질의 월드에서 동기 결과를 반환한다. 같은 함수의 Transform/collisionEnabled 수정은 질의에 보이고, 대기 중인 힘 적용의 solver 결과는 함수 반환 뒤 확인한다. receiver 핀과 인수 target을 구분하고 알려진 객체/파생 Actor 배열을 검증한다. 실제 강체·모터·CCD·단위·제한과 남은 물리 범위는 [물리 연구](PHYSICS_RUNTIME_RESEARCH.md)에 연결했다. 앞의 추가 당시 수치와 현재 수치를 구별한다.

### 컴포넌트의 메시·2D 다각형·선분

컴포넌트 목록은 46종이다. MeshCollider·PolygonCollider2D·EdgeCollider2D의 중첩 배열은 별도 형상 창에서 편집하고 BP 컴포넌트 상세에 수량과 편집/생성 버튼을 표시한다. 원본 모델에서 생성하는 경로는 Scene과 BP, AI collision.bake가 공유한다. BP 컴포넌트 뷰포트에도 실제 기본/메시/2D 경계를 렌더한다. Apply 한 작업을 문서 Undo/Redo로 복원한다. 몸체 형식/키네마틱 체크를 함께 갱신하고 Hinge/Slider에서 다른 관절로 바꿀 때 해당 모터/한계를 해제한 뒤 검증한다.

기존 물리 질의 노드와 사용자 C++ Physics 호출은 같은 저장 형상을 검색한다. 오목한 polygon의 빈 영역, 삼각형 표면, open edge, convex hull을 구분한다. 실제 컴파일된 사용자 함수와 GUI/VM 검증은 [충돌 형상 연구](COLLISION_GEOMETRY_RESEARCH.md)에 기록했다. 기존 BP 473개·코어 289/서비스 102개 수치는 이번 형상 확장에서 바뀌지 않는다.

## 독립 Windows 게임의 BP·C++ 실행 — 2026-10-03

프로젝트의 빌드 프로필은 Scene 포함/제외·순서·첫 활성 시작 Scene, 게임 이름·창 크기·개발/배포 구성을 저장한다. 파일 → 빌드 프로필(`Ctrl+Shift+B`)의 검사/빌드/실행과 AI API/CLI가 같은 디스크 검증·빌드 함수를 사용한다. 현재 473개 기본 BP 노드·289개 코어/102개 서비스의 수치는 이 패키지 추가로 변하지 않는다.

독립 Player는 `preparePlayWorld` → `BlueprintRuntime` → `engineOperations`와 `Game.hpp/Bridge.hpp`의 기존 C++ 서비스 경로를 사용한다. BP/C++의 별도 함수 목록이나 다른 수학/물리 규칙을 만들지 않는다. 도형·환경·머테리얼/스프라이트/모델 렌더링도 편집기와 공유한다. 실제 화면은 Three/WebGL2, 실제 2D/3D 물리는 Rapier WASM이다.

1. 활성 Scene과 비장면 Assets를 검증한다. BP의 native metadata에 저장한 header/source와 디스크 Source가 같아야 한다. 다르면 편집기에서 다시 빌드하고 BP를 저장한다. 등록된 소스 서명별 worker를 제작 단계에서 개발/배포 구성으로 사전 컴파일한다.
2. 패키지의 `/api/native/build`는 서명에 해당하는 worker/token/metadata를 조회한다. Player에서 새 소스를 컴파일하지 않으며 알려지지 않은 서명은 실패한다. C++17 컴파일러는 제작 환경에 필요하고 게임 실행에는 동봉 Node/worker를 사용한다.
3. Scene의 BP/컴포넌트·입력·프레임워크를 준비해 Construction/서비스 초기화/BeginPlay를 실행하고 매 프레임 native clock/timer와 VM을 진행한다. 배포용 복사본의 breakpoint를 제거하므로 에디터 Step 대기로 정지하지 않는다. BP 그래프 원본 파일의 중단점을 삭제하는 작업과 다르다.
4. `Open Scene`/`hb::Scene::Open`은 같은 검증/전환 요청을 사용한다. 포함되지 않은 Scene은 런타임에서 로드할 수 없다. 이전 월드의 EndPlay·타이머·입력·서비스/GPU 자원을 정리한 후 새 월드를 준비한다.
5. 게임 종료는 진행 중 프레임을 기다린 후 EndPlay·서비스 정리·SaveGame 디스크 flush·Win32 창/소유 서버 종료로 이어진다. `Esc` 메뉴에 계속·전체 화면·종료가 있고 게임 입력칸/포커스 해제를 구분한다. 저장은 `%LOCALAPPDATA%/HBEngine/Games/<project UUID>`에 보존하며 에디터 복구 상태를 게임에 가져오지 않는다.

실제 `test:package`는 2D 개발/3D 배포 Game.exe에서 GPU draw·BP BeginPlay→사용자 C++ 이동·AudioContext running/음원 voice playing·EndPlay SaveGame/재열기·컴파일러 없는 환경·서버 종료를 확인했다. Scene 참조·프로필 revision·취소·파일 손상·편집 API 차단도 검사한다. 음원 voice 상태는 모든 출력 장치/공간 음향/코덱의 품질을 증명하는 검사는 아니다.

구체적인 프로필/수명/AI 계약은 [빌드 Player 연구](BUILD_PLAYER_RESEARCH.md), [AI API](AI_ENGINE_API.md)에 있다. Game.exe는 Win32/WebView2·Node·WebGL2를 묶은 독립 실행 파일이며 DirectX 11/HLSL·전체 에셋 cook/압축·installer·모든 타깃 SDK 구현과 구분한다. 기존 모든 엔진 분야와 BP/C++의 세부 확장 요구는 계속 유지한다.


## 행동트리 태스크와 C++ 작업 수명 — 2026-10-05

2026-10-06 Auric P0-1·P0-2 실행 경로: 동일한 헤더·구현의 BP는 편집기와 화면 없는 실행에서도 하나의 worker를 공유해요. 독립 terminal C++ Tick은 같은 빌드별 묶음으로 보내며, 이벤트·엔진 작업·시간 변경 경계에서 후속 인자를 다시 읽어요. 실패한 호출의 변경은 적용하지 않고 앞선 성공 결과를 보존하며 다음 호출은 전체 상태로 재동기화해요. 일반 BP 연결·데이터 의존성·중단점은 기존 순서대로 실행해요. 모든 이벤트/함수 경로의 묶음 처리, 다른 빌드 접근 API, Auric 변경 엔진·실제 창·Android 성능 완료 기준은 검증 전이에요.

다른 빌드 접근 후보는 `<HBEngine/Native.hpp>`의 `hb::Native::GetFloat(actor, "MaxHp")`, `SetFloat(actor, "MaxHp", value)`, `Call(actor, "TakeDamage", {{"amount", value}})`이에요. `Call`은 반환 핀·출력 인자를 이름별 JSON으로 돌려줘요(`result` 등 등록된 출력 핀 이름). 같은 빌드는 실제 객체에 직접 접근하며 다른 빌드는 대상 모듈의 자료형·읽기 전용·참조·이벤트를 검증한 뒤 동기 호출해요. PC worker와 모바일 AOT의 순환 호출은 거절하며 깊이8·호출128로 제한해요. 대상의 값·이벤트·엔진 작업은 그 객체의 실행 수명에 반영해요. JS 검증과 실제 C++/모바일 AOT 검증을 분리하며 실제 검증 전에는 제공 완료로 처리하지 않아요.

현재 카탈로그519개에 공용 AI 태스크 핸들 조회·완료 서비스를 연결했어요. 태스크 시작/갱신/완료/중단 이벤트와 시간 제한·쿨다운·키 대기·서비스 활성화/비활성화를 실제 게임 실행에 연결해요. 작업 scope는 BP 함수/매크로/인터페이스와 C++ 호출을 거쳐 Delay/Timer/Timeline/구독을 정리하고, C++ 타이머는 소유 Actor와 종료 수명을 확인해요. 같은 C++ 클래스의 다른 Actor로 방송하지 않아요. 상세 제작·AI·큐 처리·실제 Editor/release Player 증거와 아직 제공하지 않은 범위는 [행동트리 계약](BEHAVIOR_TASK_LIFECYCLE.md)이에요. 이 기능 수는 Unreal/Unity 전체 API 완료율이 아니에요.


## 조건 감시·정적 하위 행동트리 — 2026-10-05

조건 중단 네 모드·결과/값 감시, memory Selector/legacy reactive, 병렬 즉시/대기·키 비교·정적 하위 트리 실행을 공용 제작/검증/실행 경로에 연결했어요. 루트 조건의 감시·자식 독립 시간·경로 핸들·내부 그래프 진단을 제공하며 사용자 C++와 headless도 같은 서비스를 사용해요. 세부 한계와 실제 Editor/release Player/AI 증거는 [조건/하위 트리 계약](BEHAVIOR_OBSERVERS_SUBTREES.md)이에요. BP 기본 카탈로그는519개로 유지하며 행동트리 전용 노드 정의와 구분해요.

### 포즈 애니메이션 그래프 추가(2026-10-05)

[애니메이션 그래프 계약](ANIMATION_GRAPH.md)의 독립 animgraph 포즈 에셋/제작기·공용 실행기를 추가했어요. BP/C++ Play/Stop/Pause/SetFloat/SetBool/GetFloat/GetBool7개가 생성되어 전체 BP 노드는526개예요. 별도의9개 포즈 노드 카탈로그는 BP 수에 합치지 않아요. 실제 Editor/Player 키→BP→C++→포즈/파라미터/조회/뼈 레이어를 확인했고2D rig·AnimGraph 상태·IK·root motion·다중 슬롯·전체 잔여는 그대로 이어 구현해요.
# 2026-10-05 몽타주 슬롯 후속

[몽타주 슬롯 계약](ANIMATION_MONTAGE_SLOTS.md)의6개 그룹 제어/조회 BP와 C++ 실행 연결을 추가했어요. BP566개/API289개이며 기존 본문의 수량은 당시 기록이에요. 사람/AI·실제 Editor/Player·2D/가져온 모델·배치 위치/HUD 검증과 남은 세부를 해당 계약에 기록해요.

2026-10-05 공용 [타임라인 조작·추적](ANIMATION_TIMELINE_CONTROLS.md)은 기존 C++/BP 몽타주·시퀀스 실행을 같은 창에서 식별해요. 새 노드 수를 늘리지 않고 에셋/Actor/그룹·실행 시간과 미리보기 시간을 분리하며 원본/revision/Undo를 보존해요. 전체 누적 세부를 계속 구현해요.

## 몽타주 구간 알림 후속 · 2026-10-05

[구간 알림 계약](ANIMATION_MONTAGE_NOTIFIES.md)에 사람/AI·typed Custom Event→C++·Begin/Tick 작업 범위/End 취소·조작/호환·실제 Editor/Player 근거를 기록해요. BP566/API289개를 유지하며 다른 전체 기능 후속도 계속해요.

## 2D 표면 후속 · 2026-10-05

[2D 표면 계약](2D_SURFACE_NORMAL_SHADOWS.md)의 blend/cutoff·normal texture/strength/Y·cast/receive 설정/조회7개를 같은 C++/BP 서비스로 추가했어요. BP573/API289개예요. 실제 배포 Player의 BP→C++ 즉시 조회/쓰기→BP 다중 반환 핀→C++ 인자, 제작기/AI·GPU49개를 확인해요. 다른 전체 세부도 계속해요.


2026-10-06 C++ 묶음 후속: Tick/Begin Play/Fixed Tick의 직선 C++ 연결도 같은 빌드와 인스턴스 사이에서 묶어요. 50개 인스턴스·각 2함수는 100→1 RPC를 실제 사용자 C++로 검사해요. 입력·Overlap/Hit·피해·사용자/네이티브 이벤트·Construction·BP 함수 내부의 연속 C++ 호출도 묶어요. 앞 호출의 출력·월드 조회·분기·중단점·BP 콜백/엔진 작업은 순서 보존 경계예요. 중간 반환 뒤 아직 실행하지 않은 연결과 다른 Tick 이벤트를 이어가며 실패한 호출을 재시도하지 않아요. 모든 이벤트 종류의 여러 인스턴스에 걸친 묶음, 순서에 영향을 주지 않는 일반 BP 연산의 통합은 계속 남아 있어요.

2026-10-06 P0 이벤트 묶음 후속: 여러 오브젝트의 Construction·키 Pressed/Released/Axis·Begin/EndOverlap·Hit·EndPlay도 terminal 직선 C++ 호출은 같은 build별 요청으로 모아요. 실제 C++50인스턴스100/150호출→1, 원래 native input·값·trace·순서 일치를 검사해요. BP callback/engine 작업 이후에는 미래 인자를 다시 읽고, 입력 키 맵·충돌 기록은 성공 prefix의 원래 시점에서 갱신해요. InputContext/Action 또는 기존 Action state가 있는 입력 경로, BP 함수/매크로로 감싼 인스턴스 간 호출과 native Timer callback 묶음 등은 추가 구현 대상이에요. 한 owner의 EndPlay가 실패하면 그 호출을 재실행하지 않고 나머지 owner를 종료하며, 응답을 잃어 완료 cursor를 모르는 요청은 재전송하지 않아요. 이 상세 진단은 제작 화면의 안내문으로 노출하지 않아요.

2026-10-06 terminal BP 함수 묶음: primitive 함수 인자, functionInput→C++ 직선 호출→functionOutput 및 사용하지 않는 exec-only 반환을 여러 인스턴스 이벤트/Construction/EndPlay/Tick/Begin/Fixed에서 함께 전송해요. 실제 C++100/200→1과 출력·변수·trace·stack 일치, 콜백 뒤 현재 인자 유지/미래 인자 재평가, 함수·return 중단점 및 Tick interval을 검사했어요. 배열·구조체 입력은 alias를 유지하는 기존 경로로 처리하고 배열 callback 회귀를 대조해요. 여러 Tick의 BP wrapper·매크로·InputAction·Timer 경로 전체가 완료됐다는 뜻은 아니에요.


### 2026-10-07 — 물리 개수 제한·전체 질의 결과 누락 제거(043)

- 042 후속으로 공유 물리 월드의 차원별 충돌체8,000/관절512, C++ snapshot 전체·타일 충돌체8,000 검사를 제거했어요. RaycastAll/Overlap의1,000개 절단도 제거해요. 단일 Raycast는 첫 결과만 변환하고 C++ snapshot 복사는 인자 펼치기 없이 반복해요. ID/형상/좌표/필터/통신 크기 검증을 유지해요.
- 수정 전 실제 1,201개 교차가1,000개로 줄어드는 실패를 재현했어요. 최종 tools/check-physics-capacity.mjs 10검사(physics-capacity-BRW5lX): 2D/3D 각각10,001충돌체/solver1프레임/전체겹침, 각각600관절, 한 오브젝트8,001타일충돌체, 실제 C++ RaycastAll/OverlapBox 각1,201결과·잘못된 값 거절. 기존 check-physics.mjs 156WASM검사와 C++/BP 연결도 통과해요. 검사 개수를 새 상한/FPS 성능 판정으로 쓰지 않아요.
- Unity6000.0 RaycastAll/OverlapBoxAll 자체 본문과 반환·정렬·메모리 의미를 읽었어요. docs/research/PHYSICS_COUNT_LIMITS_043.md에 근거/범위/최종2파일SHA를 기록해요. C++ 호출당128질의/4MB패킷·형상 크기 등 자원/입력 검증은 남아 있어요. 원본게임/사용자창·프로필/장기 검사를 건드리지 않았어요. 041/042 결과를 유지하며 이번 기록은 전체 엔진/조사 완료를 뜻하지 않아요.


### 2026-10-07 — 큰 월드의 C++ 질의 준비 비용 제거(044)

- 공유 engineQuery가 각 snapshot행마다 전체 월드를 찾는 중첩 검색을 하던 원인이에요. 기존 bridgeStateIndices로 바로 찾고 범위/ID가 맞지 않으면 안전하게 기존 검색을 해요. 현재 actor transform/nativeProperties, 월드 순서와 추가 속성·검증을 유지해요. 새 캐시/의존성이나 개수 상한을 만들지 않았어요.
- 같은5,000행 실제 컴파일 C++ 입력의 snapshot/merge/패킷 구성 단계만 순차 비교했어요. 이전1,949.3/2,001.2/2,021.3ms → 이후31.2/33.4/34.6ms. IPC·물리·렌더링·전체FPS를 포함하지 않으며 장면 전체120fps 합격으로 쓰지 않아요. 원본게임/사용자창·프로필·장기 검사 불변이에요.
- query-world-ZgeKee에서 현재 transform/추가 값/행 순서와 잘못되거나 없는 인덱스 fallback을 실제 C++로 통과했어요. 새 SDK로 물리 capacity10검사(12CXiy), 기존156물리검사와 C++/BP연결, 실제 별도 C++ worker/Windows에서 만든 모바일 AOT 모듈 호출(RzTUIe), Spawn/Destroy/Construction/실패회복9검사(MXspEq)도 통과했어요. Android/iOS 실기기·새 패키지 검사가 아니에요. docs/research/CPP_QUERY_WORLD_LOOKUP_044.md·native/build/query-world-result-044.json에 근거를 기록해요. 041/042/043을 유지해요.

### 2026-10-07 — 몽타주 교체 혼합(045)

- 기존 Play Montage/C++ Montage::Play의 동일 그룹 교체가 이전 포즈를 BlendOut으로 줄이며 새 BlendIn과 혼합해요. Quaternion/여러 슬롯·그룹/빠른 연속 교체와 2D 프레임에 공용 경로를 사용해요. Notify 범위는 교체 시작에 정리하고 Interrupted/Ended는 기여 종료 때 전달해요.
- AI runtime/schema와 몽타주 창에서 montageTransitions/instance/retiring을 관찰해요. 추가 바인딩 때문에 오래된 외부 포즈 연결표를 쓰던 문제도 고쳤어요. 기존 API/노드 수·임의 개수 제한 제거를 유지해요. 근거/검증은 research/MONTAGE_REPLACEMENT_BLEND_045.md에 기록해요.


## 046 실제 컴퓨트 셰이더 — 2026-10-07

기존 compute 부재를 코드로 확인하고 Direct3D11/HLSL cs_5_0/구조화 버퍼/상수/실제Dispatch·명시적readback과 GPU상태 유지 파티클을 SDK에 추가했어요. BP→C++→실GPU, 실제 release Player의2D·3D 이동·버퍼 유지/해제·원본/종료 PASS.65,537레코드20step 중앙값 CPU 4.0771ms, GPU한번readback 1.2039ms, 매stepreadback 10.8629ms. 전체FPS로 세지 않아요. Android2ABI 헤더 컴파일 PASS이며 모바일 GPU는 미구현이에요. 기본CPU파티클/탄막과 WebGL2렌더러의 직접GPU버퍼 공유가 후속이에요. research/GPU_COMPUTE_046.md에 실제 본문5개 읽기 범위/코드/검증·실패보존을 연결했어요. 사용자 창/원본게임/프로필은 사용하지 않았어요. 설치는 검증 source의 production commit 뒤 진행해요.


## 046 사용자 설치 기록 — 2026-10-07

production c775bb5를 C:/Users/kirby/HBEngine/Versions/b82a5239ad35ec47에 갱신했어요.1806파일·변경15SHA·바로가기/.hbproject 연결·이전f906 버전/프로필/프로세스 보존 PASS. 실제사용자 창을 시작/종료하지 않았어요. native/build/gpu-compute-user-install-046.json.


## 047 프레임 리소스 추가 — 2026-10-07

컴퓨트 경로에3개 순환 상수 버퍼·동적WRITE_DISCARD 업로드,3개 결과 슬롯·완료query·대기 없는 비동기회수·가득 찬 슬롯 보존·reset/해제를 구현했어요. C++/BP 제출·회수 함수와 실제 release Player의2D/3D 경로 PASS. 공용 파티클 렌더러는 동적 버퍼의 활성 범위만 재업로드하고 배열을 재사용해요. GPU코어90zRwE·실제Player0EJH77·공용Renderer검사 PASS/currentSHA일치. 프레임FPS/전체렉/모바일GPU/네이티브씬렌더 이식 완료라고 세지 않아요. 자세한근거/검증은 research/FRAME_RESOURCES_047.md에 있어요. 설치는 검증source를 커밋한 뒤 불변 버전으로 갱신해요.


## 048 GPU 버퍼 직접 렌더·편의 API — 2026-10-07

실제 DirectCompute 파티클 버퍼→GPU 활성 인덱스/개수→간접 draw→텍스처/깊이 타깃→선택 HWND flip 출력 경로를 추가했어요. 위치/활성 개수 CPU 회수0,3개 상수 재사용,수명 제외/resize/해제·같은 창 재생성을 연결했어요. 게임 코드는 ParticleEffect의 update/draw/resize/texture와 카메라 함수를 호출하며 HLSL·D3D 버퍼를 직접 작성하지 않아도 돼요. DrawGPU는 사용자 C++에서 블루프린트로 노출되며 실제 release Player에서도 실행돼요. 공통 편의 함수221개도 실제C++/BP 결과·타입·오류 비교 PASS예요. GPU render UIDtfw/core3tRrRV/Playerj7k2Gr가 최신SHA증거예요.65,537개20frame간접계산·draw·최종image회수 배치1.5927/2.0115/1.6714ms이며 전체게임FPS로 계산하지 않아요. 메인WebGL2씬/기본CPU방출·탄막충돌·모바일GPU를 새경로로 모두이식한 상태는 아니에요. 근거·계약·미독범위/다음작업은 research/GPU_RESIDENT_RENDER_048.md에 있어요. 기존게임/창/프로필을 건드리지 않았고 두원본MD에는 덧붙이기만 했어요.


## 048 사용자 설치 갱신 완료 — 2026-10-07

검증 production 3316dc90a1e8b1c3d52513bdc1b00951ef178d89를 C:/Users/kirby/HBEngine/Versions/944ae8b62a7b3bc8에 불변 설치했어요.1812파일·변경17개SHA·바로가기/.hbproject 연결 검증 PASS. 이전88db 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자창을 시작/종료하지 않았어요. GPU직접렌더/활성목록·간접draw/ParticleEffect편의API/사용자C++ 노드를 포함해요. 공통편의함수221개·실제GPU·releasePlayer의최신SHA증거를사용했고 불필요한전체/8시간검사는 하지 않았어요. 기존메인씬과기본CPU효과를자동GPU로바꾼설치는아니며,전체게임FPS/모바일GPU성공으로세지않아요. 증거 native/build/gpu-render-user-install-048.json. 다음실행부터새버전이열려요.


## 049 GPU 파티클 방출·수명·간편 함수 — 2026-10-07

GPU에서 빈 슬롯을 찾아 새 입자를 넣고, 수명이 끝난 슬롯을 재사용하도록 연결했어요. C++ ParticleEffect는 emit/rate/play/pause/stop/clear를 제공하며 사용자 C++ HB_FUNCTION은 블루프린트로 노출돼요. 가득 찬 경우 살아 있는 입자를 보존하고 요청 버퍼를 재사용해요. 실제 하드웨어·픽셀·release Player의 2D/3D BP/C++ 방출/수명/일시정지/재개/제거·배치 위치 보존이 통과했어요. 최신 core eZAFNC/render mEgSrZ/Player azWd4k/debug 오류0은 현재 SHA예요. 기존 편의 함수221개의7파일은 변경이 없어 실제 C++/BP 비교 증거를 재사용했어요. 방출1024개/frame·65,537슬롯·20frame의 계산/방출/그리기/최종이미지 회수는1.3395/1.1724/1.2401ms이고 전체 게임 FPS가 아니에요. Unity의4개 자체 API 본문·예제, Epic GPU 두 가이드의 자체 텍스트, Microsoft 세 API 읽기/재읽기 범위를 research/GPU_EMISSION_049.md에 기록했어요. 연결문서/이미지/전체문서 분석 완료로 세지 않아요. 메인 WebGL2 씬의 GPU 타깃 합성·모바일GPU·누적 엔진 기능은 이어갈 작업이에요. 원본 게임/창/프로필과 기존 장기 검사는 사용하지 않았어요. 설치는 검증 소스 커밋 뒤 새 불변 버전으로 갱신해요.


## 049 사용자 설치 갱신 완료 — 2026-10-07

검증 production 022b7decbfa4ebb450936edfa9f598f46846588b를 C:\Users\kirby\HBEngine\Versions\7a1921f1526ee62d에 불변 설치했어요.1813파일·변경15개 SHA·바로가기/.hbproject 연결 검증 PASS. 이전944ae8 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자 창을 시작/종료하지 않았어요. GPU 방출/수명/빈 슬롯 재사용과 ParticleEffect의 emit/rate/play/pause/stop/clear, 사용자C++→BP 노드를 포함해요. 실제 GPU·픽셀·배포 Player·debug 오류0·현재 소스 SHA 검증을 사용했고 변경 없는 편의 함수221개 검사는 재사용했어요. 기존메인씬/CPU 탄막을 자동 GPU로 이식한 설치나 전체게임 FPS/모바일GPU 검증으로 세지 않아요. 증거 native/build/gpu-emission-user-install-049.json. 다음 실행부터 새 버전이 열려요.


## 050 메인 씬 GPU 렌더·기존 함수 연결 — 2026-10-07

실행 렌더러 선택(runtime.renderBackend/WebGL2 기본·WebGPU 선택), 실제 메인 카메라/깊이 버퍼의 GPU ParticleSystem, 기존 Play/Stop/Pause/Emit/GetCount BP·C++ 함수 연결을 구현했어요. C++ 함수 안의 정지→방출→명시적 개수 조회도 실제 컴파일한 release Player에서 확인했어요. 위치/나이 계산·슬롯 재사용·생존 인덱스/간접 draw는 GPU에 남아요. 공용 장치와 버퍼 재사용, 새 출생이 없을 때 재업로드 방지, PMREM 배경/compute 전용 버퍼 소유권 해제로 장면 전환 뒤 자원 증가를 막았어요. 65,537 경계·2D/3D·깊이 가림·월드/로컬 이동·정지/수명/전환·GPU 오류0·종료0 PASS. GPU24G6Ni/기존WebGLXFO4wW 및 CPU32경우2560스텝/채널/CPU파티클 검사 증거를 research/GPU_SCENE_050.md에 연결했어요. 원본 게임의 렌더러를 바꾸거나 FPS/모바일/모든 셰이더 완료로 세지 않아요. 편집기 미리보기와 미이식 머테리얼·조명·마스크·후처리는 기존 경로를 유지해요. 누적 엔진 요구와 후속 이식은 계속해요.


### 050 사용자 설치 갱신 확인 — 2026-10-07

검증한 production `8dabf2d180bb42c640139dde9de2969bdb09ea80`를 `C:/Users/kirby/HBEngine/Versions/7df780dd9a47cf5b`에 불변 설치했어요. 1,817파일·변경27파일 SHA·바로가기·.hbproject 연결을 확인했고, 이전7a192 버전/실행 파일/기존 GPU SDK/프로필/사용자 프로세스를 보존했어요. 창을 열거나 닫거나 새로고침하지 않았으며 다음 실행부터 새 버전이에요. 설치 증거는 `native/build/gpu-scene-user-install-050.json`이에요. 기존 게임 원본/Source/에셋/tools와 모바일 산출물은 변경하지 않았어요. 이 기록은 기존 게임의 FPS 목표 달성으로 세지 않아요.


051 GPU 머테리얼/환경: 기존 Set Material/Set Material Float 노드와 새 hb::Materials::Set/SetFloat가 같은 검증/서비스를 호출해요. 인스턴스 재정의를 포함한 GPU 숫자 파라미터는 uniform 재사용; actual releasePlayer GPU sH8prw/defaultGL pzP5Za에서 C++와 실제 키 입력 BP·픽셀·해제 PASS. [세부 근거](research/GPU_MATERIAL_ENVIRONMENT_051.md). 전체 BP/엔진/조사 완료로 세지 않으며 선행 목표 묶음 완료 뒤 설치해요.


## 052 GPU 2D 스프라이트·마스크·픽셀 정렬 — 2026-10-07

기존 Sprite/Tilemap/Particle 마스크·SortingGroup/범위·발광·C++ Flash·카메라 픽셀 정렬을 GPU 실행에 연결했어요. 실제 release Player GPU BkkAjH / GL HBMYkk 픽셀·자원 반환·분리 원본 보존 PASS. 상세와 본문/API 읽기 범위는 docs/research/GPU_2D_052.md예요. 전체 선행 목표 완료 뒤 설치, 이후 추가 연구 목표 순서를 유지해요.


## 053 GPU 2D 조명·그림자 — 2026-10-07

기존 광원/노멀/쿠키/블렌드 스타일/마스크/ShadowCaster/Composite/볼륨을 메인 GPU에 연결했어요. 실제 release Player GPU7WAkd3/GL10vKc6에서 C++·실제 BP·광원·픽셀·3셀 아틀라스·정렬/마스크·변경 없는 프레임 캐시·자원 반환·종료 PASS. 공용 스프라이트 영향 xlTL92 PASS. 상세와 읽기 범위/미완료 대조: research/GPU_2D_LIGHTING_053.md. 설치는 누적 선행 목표 완료 뒤, 추가 연구 목표는 그다음 순서예요.


### 054 GPU 입자/투사체 실행

ParticleSystem의 기존 여섯 sortMode와 C++/BP Projectiles는 GPU draw 경로를 공유해요. 입자 정렬은 GPU 인덱스만 정렬하며 위치 readback은 개인 acceptance 진단에서만 허용해요. Projectiles 이동·swept 충돌은 기존 CPU 서비스예요. 세부 증거 GPU_EFFECTS_054.md.


055: 에디터 GPU 실행에도 공용 C++ 입자 질의를 연결하고 작성 씬의 실행 debug 오염을 방지. AI window.open/close/viewport.get은 실제 공유 렌더러 상태를 제공. 상세 research/GPU_EDITOR_055.md.


056/057: 기존 Particle SDK/BP 함수를 모바일 renderer 질의에 연결하고 대상/입력/응답 검증을 PC와 공유. GPU 입자의 유휴 제출을 생략하며 기존 방출/정지 의미 유지. 실제 모바일 GPU device는 미검증. research/GPU_MOBILE_056.md와 GPU_IDLE_057.md 참고.


2026-10-08 접촉 수명/Stay 후속: Overlap Stay·Collision Stay·Collision Exit는 같은 카탈로그/AI schema와 Collider 상세에서 생성하고 대상 컴포넌트를 선택한다. 고정 물리 dt를 실제 사용자 C++ float에 전달하며 화면 fallback 중복·수면 solid Stay를 막는다. 삭제/풀 반환 owner를 호출하지 않고 제거된 상대는 null, 재사용 바인딩은 새 수명으로 처리한다. 마지막 HitResult/수신자 법선을 보존하는 solid Exit와 실제 Rapier2D/3D 및 비배치=배치 검증은 [064](research/CONTACT_LIFETIME_064.md)에 있다. 기존 Event Hit의 첫 접촉 계약과 자료형 검증을 유지하며 UE 전체 Hit/Unity Collision 동등성은 주장하지 않는다.


## 074 — 2D 관절 회전 제한

IK2D SetRotationLimit/ClearRotationLimit 두 SDK 선언에서 같은 BP 서비스를 생성한다. 안정적 뼈 ID·bind 상대 도 범위·공용 검증·실제 잠금/해제와 작성/Undo/dryRun은 [074](2D_IK_CONSTRAINTS_074.md). BP713·공용C++628(core289/service339) 검사 통과, 전체 선행·설치 대기 유지.


## 075 — 머테리얼 함수

075 머테리얼 함수 그래프는 BP 함수와 다른 셰이더 도메인이다. 내부 파라미터는 기존 materialSet/materialFloat와 hb::Materials::Set/SetFloat가 제어한다. 실제 C++/BP→인스턴스/중첩 함수→GL/GPU 픽셀 검증은 MATERIAL_FUNCTIONS_075.md.


## 076 — 머테리얼 레이어 파라미터

Materials::LayerParameterKey SDK 선언에서 순수 BP materialLayerParameter를 생성한다. 안정적 항목 ID·한글/영문 이름·Layer/Blend 구분과 기존 materialFloat로 반복 Layer를 독립 제어한다. BP714·서비스340/core289·SDK629 연결, 실제 C++/BP→GPU/GL 픽셀·인스턴스/숨김·AI 묶음 저장 검증은 [076](MATERIAL_LAYERS_076.md).

## 082 — 머테리얼 텍스처 서비스

Materials::SetTexture SDK 선언에서 materialTexture 노드를 생성한다. 자료형을 유지하는 Texture2D/Cube/Array/3D와 LayerParameterKey, 동일 에셋 no-op·atomic staging·실패/경합 해제를 공용 실행기에 연결했다. BP715·core289/service341·SDK630. 실제 배포 C++ 호출/T 키 BP·GL/GPU 픽셀/셰이더 객체·원본/SHA 검증은 [082](MATERIAL_TEXTURE_PARAMETERS_082.md).

## 086 — DirectX 장면 실행

Windows 빌드의 `windowsRenderer: d3d11`은 기존 BP 입력/이동/머테리얼 서비스와 C++ `Scene::SetPosition`·`Materials::SetFloat`를 그대로 실행한다. 노드 머테리얼의 공용 해석 결과를 HLSL로 컴파일하고 Float 변경은 숫자 버퍼만 갱신한다. 실제 게임의 E 키 BP/C++ 이동·M 키 발광·텍스처 픽셀/셰이더 재사용은 [086](NATIVE_SCENE_RENDERING_086.md). 새 BP 노드나 별도 머테리얼 스키마를 추가하지 않았다. 네이티브 미연결 렌더 패스와 전체 FPS/엔진 완료는 별도로 남긴다.

## 087 — 그림자 제작과 C++/BP 공용 연결

광원 그림자 해상도/범위/bias/필터/강도는 기존 Light 컴포넌트 속성, AI schema·patch·Undo·저장, C++ Components::SetBool/SetFloat와 BP componentSetBool/Float를 사용한다. D3D11 실제 S/T키 BP와 C++ 토글/opacity/이동은 [087](NATIVE_SHADOWS_087.md). 독립 API/별도 장면 파일을 만들지 않았다.

## 088 — 후처리 제작과 C++/BP 공용 연결

PostProcessVolume의 활성화·우선순위·블룸 임계값/강도/반경/해상도 배율을 기존 컴포넌트 서비스로 D3D11 HDR/compute에 연결했다. 별도 노드를 복제하지 않는다. 실제 C++ 설정과 N/B 키 BP가 2D SVG·3D HLSL 머테리얼의 번짐·타깃 할당/해제에 도달하는 증거는 [088](NATIVE_BLOOM_088.md). AI Windows 렌더 스키마의 지원/후속 범위도 갱신했다.

## 089 — 투사체 네이티브 공용 연결

기존 projectileFire/projectileClear와 C++ Projectiles::FireText/Clear를 D3D11 스타일별 compact GPU 배치로 연결했다. 이동·수명·충돌·소유자·JSON 제작 흐름은 공용 서비스를 사용하며 별도 BP 노드를 복제하지 않는다. 실제 P 키 BP/C++·전체/분할 SVG·2049 단일배치·자원 수명 증거는 [089](NATIVE_INSTANCING_089.md). GPU 시뮬레이션이나 전체 FPS의 완료를 의미하지 않는다.

## 090 — 뼈대·모프 실행과 쉬운 공용 함수

기존 임포트/Animation Graph 포즈를 D3D11 GPU skin/morph와 그림자에 연결했다. C++ Morphs::GetNames/GetWeight/SetWeight와 morphNames/morphWeight/morphSetWeight BP를 Game.hpp에서 함께 생성하고 동일 서비스를 사용한다. 다중 메시의 이름 충돌은 mesh 인자로 해소하며 유한 가중치·없는 이름을 검증한다. 초기/애니메이션 gameplayDebug.morphs·C++ 같은 호출 Set/Get·실제 H/J 키 화면/해제 증거는 [090](NATIVE_DEFORMATION_090.md). 기존 UI·AI 노드 검색/실행 스키마를 사용한다. 네 영향 초과·cloth·인스턴스별 모프·보수적 animated bounds는 후속이며 전체 애니메이션/엔진 완료로 승격하지 않는다.

## 091 — 파티클 네이티브 공용 연결

ParticleSystem의 기존 제작 속성과 particlePlay/Stop/Pause/Emit/Count, C++ Particles::Play/Stop/Pause/Emit/GetCount를 D3D11 GPU 시뮬레이션·간접 빌보드 draw에 연결했다. 같은 seeded birth/timing을 사용하고 살아 있는 위치는 CPU에 복제하지 않는다. C++ 즉시 명령/개수 조회가 새 compute backend를 인식하도록 수정했다. 실제 K키 BP·C++·2049 단일 draw·2D/3D SVG·블룸·정지 정렬 재사용·장면 해제 증거는 [091](NATIVE_PARTICLES_091.md). 마스크/전용 2D 광원, mesh/ribbon/stretch/SubUV와 입자 그림자는 별도이며 전체 Niagara/Unity 기능 완료로 승격하지 않는다.

## 092 — 2D 마스크·광원·그림자 공용 연결

기존 spriteSetMask와 light2dSetIntensity/SetShadows·Components 속성 노드, C++ Sprites::SetMaskInteraction 및 Light2D 함수가 Windows d3d11에 도달한다. sorting 범위·4 블렌드 스타일·normal·cookie·shadow/volume 자료는 공용 컴포넌트와 AI schema/Undo/Save를 공유한다. 실제 I/L 키 BP·C++ 토글·masked GPU particles·resize/장면 해제 증거는 [092](NATIVE_2D_092.md). 파티클 조명/그림자와 엔진 전체 완료를 이 단계로 승격하지 않는다.

## 118 — 발광면/HDRI 코스틱·시간/렌즈 필터

기존 후처리 컴포넌트에 시간 필터 혼합과 렌즈 필터 세기 추가. 공용 컴포넌트 C++ Get/SetFloat·BP·AI 스키마와 동일 범위 검증을 사용한다. 발광 머테리얼/HDRI도 기존 에셋·파라미터를 재사용한다. 원본 누적과 필터 이력은 독립이며 시간 필터가 꺼지면 추가 이력이 해제된다. 실제 검증은 [118 기록](research/RENDERING_118.json)을 따른다.

## 119 — 모션 재투영·이차 렌즈 공용 경로

118의 시간/렌즈 필터와 DOF/초점 속성을 그대로 사용한다. CPP Get/SetFloat·SetBool, 컴포넌트 속성 BP, 상세 속성·AI revision patch가 같은 값을 편집한다. 모션 재투영은 같은 속성에서 자동 적용되며 별도 AI 설정이나 노드 복제는 없다. 포장·실제 창·원본 복원·설치 증거와 국소 근사 범위는 [119](RENDERING_119.md)를 따른다.

## 166 — 애니메이션 커브와 속성 Take

AnimationGraph::GetCurve/animGraphGetCurve는 같은 포즈 혼합 결과의 named curve를 조회한다. 커브 저작/모프/머테리얼 구동·Take 기본 컴포넌트 키는 기존 그래프/시퀀스 실행을 쓴다. 실제 C++·블루프린트 실행과 범위는 [166](ENGINE_WORK_166.md), 남은 상위 범위는 단일 상태 원장을 따른다.

## 167 — 레벨 수명 공용 노드

Levels::Load/Unload/IsLoaded/GetActor/GetInstances/SetVisible와 levelLoad/levelUnload/levelLoaded/levelActor/levelInstances/levelVisible는 같은 실행 서비스를 사용한다. 총 노드753개. 영구 월드 유지, 결정적 ID, Construction/BeginPlay/EndPlay와 생성 액터·물리 수명, 사람의 LevelStreaming 컴포넌트와 AI 명령이 같은 데이터로 이어진다. C++ 변경은 서비스 큐, 결과 조회는 후속 호출 기준이다. [계약/검사](ENGINE_WORK_167.md).

## 168 — 프리팹·타일 청크 공용 실행

기존 Tilemaps C++/BP의 Set/SetMany/Fill/Clear/ProcessChanges를 변경 청크 렌더/충돌에 연결했다. 새 중복 노드 없이 총753개를 유지한다. Play 준비에서 연결 프리팹의 최신 원본과 로컬 수정 병합 후 타입 있는 C++/BP 액터 참조를 월드 ID로 재배치한다. 자동 문자열 변환/원본 게임 변경은 없다. 사람 속성 창·AI6명령·원자 Undo/Play 복원은 [168](ENGINE_WORK_168.md), 남은 전체 범위는 원장에 유지한다.


## 169 — 다중 IK·오디오 사이드체인 공용 노드

AnimationGraph::SetIKEffectorTarget/Actor/Weight/GetIKEffectorError와 animGraphIKEffectorTarget/Actor/Weight/Error가 안정 목표ID를 사용한다. AudioMixer::SetDucking/ClearDucking/GetDuckingGain과 mixerDuckingSet/Clear/Gain은 같은 버스 RMS 경로를 사용한다. Game.hpp에서 함께 생성하며 총760노드·공용코어289개다. 실제 C++ 호출·J키 BP 목표 변경·D3D11 dev/release/WebGPU, 편집기 음량 신호/Undo·Take 검사는 [169](ENGINE_WORK_169.md)를 따른다. 명령은 프레임 큐에 적용되며 관측값은 후속 호출 기준이다.


## 170 — 루트·회전 IK와 음성 관리

AnimationGraph::SetIKEffectorRotation/SetIKEffectorRotationWeight/SetIKRootSettings 및 Audio::SetVoiceBudget/SetPriority/GetRealVoiceCount/GetVirtualVoiceCount를 같은 서비스의7노드로 생성했다. 총767노드/코어289. 실제 C++와 BP가 같은 실행기로 이어지고 기존 입력 J키·목표 변경을 보존했다. PCM 실제2/가상6과 우선순위 변경·시계, 루트 이동 한계와 목표 회전, UV/프리팹 제작/Undo의 근거는 [170](ENGINE_WORK_170.md).


## 171 — 네트워크와 코드 재적용

Network::Connect/Disconnect/SendRPC/SetOwner/GetStateText/HasAuthority를 공용 서비스6노드로 생성했다. Network Session/Replica의 안정 ID·소유권과 허용 RPC 이벤트를 사용한다. 클라이언트의 비소유 상태 변경과 멀티캐스트를 거부한다. getter는 명령이 반영된 후속 프레임의 관측값이다. 공개 C++ 상태를 유지하는 런타임 재적용은 기존 BP 변수/타이머를 유지하며 원래 BeginPlay를 반복하지 않는다. 전체773노드/코어289. 액터 전체 수명 복제·예측·비공개 C++ 상태와의 경계는 [171](ENGINE_WORK_171.md)를 따른다.


173: 기존 Scene::Spawn/Destroy의 NetworkReplica 프리팹은 호스트의 생성/풀 반환/제거를 원격 카탈로그와 연결한다. 네트워크 클래스에 새 함수 이름을 따로 만들지 않고 같은 C++/노드를 사용한다. NetworkSession 관심 기준·Replica 거리/소유자 상세 폼과 AI schema를 공용으로 쓴다. 773노드/코어289 유지. 원격 코드 실행/에셋 다운로드 없음.


174: 재사용 위젯은 기존 uiSetText/Value 등의 element에 Player/Label 같은 namespace 이름을 받는다. 자식 이벤트를 부모 customEvent에 매핑하고 자식 binding 이름을 부모 변수로 연결한다. 별도 SDK 중복 노드 없이 C++/BP가 같은 서비스를 사용한다. 총773/공유코어289 유지.


175–176: Physics::SetJointFrames/SetJointMotor/SetJointLimits/SetVehicleInput/GetVehicleSpeed와 동일 서비스 5개가 카탈로그에 추가됐다. 총778노드/공통C++693함수. C++실제컴파일/관절·차량 실행과 BP노드 실제 실행 확인. Blueprint 컴포넌트 상세에서 휠을 일반 입력/추가/삭제/Undo로 편집한다.


177: 새노드 증가 없이 기존 UI::SetListItems/SetValue/GetValue·같은 BP UI서비스에서 자동행높이를 사용한다. 카탈로그778/공통C++693 유지. C++자료교체·선택읽기와 입력/위젯 제작·Undo를 실제 게임에서 확인했다.


179: RuntimeLOD는 일반 컴포넌트로 Scene/BP 제작과 문서 Undo/AI patch를 공유한다. 별도 노드 수를 늘리지 않고 기존 Components 수치/문자 서비스로 거리 기준/강제 단계·표시 Hz를 사용한다. 같은 서비스의 실제 C++ 호출 뒤 물리 동기화와 대상 RaycastAll을 검증했다.


180: 기존 Physics 공용 C++/BP 함수의 의미와 노드는 유지한다. C++ 백엔드 질의 월드 재사용은 호출당 승인과 직접 Transform 변경을 보존한다. Windows와 모바일 AOT2모듈의 같은 세션 공유/동시 질의/세대 정리를 검사했다.


181: 명명 슬롯 콘텐츠도 기존 UI 함수/BP 이벤트를 쓴다. 예: UI::SetText(owner,"WorldCard","Dialog/Body/Content/Label",text). 중복 노드를 추가하지 않고 공용 문서/빌드 종속성으로 검증한다.


185: Get Instance Actor/Actors/Local Id는 타입 있는 공용 C++ 순수 노드다. 인스턴스의 루트 또는 자식을 전달하고 원본 로컬 ID를 사용한다. 생성기에서 서비스 선언 분류를 존중하며 새 핀 라벨은 인스턴스/로컬 ID/비활성 포함이다. 노드781/공통 C++696(Core289와 별개).


191: ConfigureAvoidance(target,mode="orca",horizon=2,neighborDistance=5,maxNeighbors=16,priority=50), GetSteeringVelocity/GetPreferredVelocity(target)는 실제 공용 C++/BP 서비스3개다. 카탈로그784/공용 C++699. GetPath/속도 배열은 복사 반환한다.


210: AnimationBudget SetBudget(target,budgetMS=2), SetEnabled(target,enabled=true), GetObservedMS/GetThrottledCount(target) 공용 SDK/BP4함수. 카탈로그788·공용 C++703(Core289와 별도). 같은 컴포넌트 쓰기·완료 프레임 진단이며 전체 FPS/강제 ms 한도 보장은 아니다.


234: Abilities::ApplySet(target,asset,preserveBase=true,retainEffects=true) 공용 C++/BP 명령을 추가했다. 카탈로그789·공용C++704. 동일 서비스로 저장 정의 재로드와 원자 상태 교체를 실행하며 실제 C++/BP/Inspector/AI·독립 D3D 게임을 검사했다. 즉시 반환 질의/네트워크 예측 구현은 아니다.


236–237: 차량 기어/RPM/현재기어 공용3함수와 관절 축 운동/모터 공용2함수를 같은 SDK/BP에 추가했다. 노드794·공용C++709. 실제 사용자 C++/BP·장면/BP 컴포넌트 표/6축 편집·Undo·독립D3D를 검증했다. 기본 힘 차량/2D 관절은 유지한다.


239–241: 천/2D로프 각 핀·충격·강체연결·초기화·개수 공용SDK10 및 동일BP를 실제 제작/실행에 연결했다. 총804노드/공용C++719. Scene/BP 핀 mouse/keyboard/Undo와 런타임Inspector·AI페이지를 검증했다. 상세 범위는 ENGINE_WORK_239–242를 따른다.


243–248: 효과 레벨/커브 SDK4·천/2D로프 실제 입자 getter2를 BP와 공용화, 총810노드/공용C++725. 부모연결 Take와 AI runtime.effect/level·문맥 단축키124 포함. ENGINE_WORK_243–248 참조.


249–252: 기존 LevelSequence::Seek/BP가 평가 완료 뒤 응답하고 paused end를 유지한다. 회전 트랙 선택 Slerp·트랙별 voice handle·runtime.audio source/handle·완료 sampleTime/sampleSerial을 AI schema에도 등록. 공용725/노드810 유지.


253–260: 공용728/노드813. effectApplySpec(target,asset,source,level,parameters JSON), effectSetParameter, uiSetSlotContent 공유 SDK·C++ EffectArguments 편의 객체. 효과 source/target snapshot과 caller 값/레벨 커브의 원자 계산, UI 입력/슬롯 수명은 ENGINE_WORK_254–256.


## 261–267 · C++ 수명주기와 Tick

`HB_FUNCTION(BlueprintCallable, Lifecycle="tick") void Update(float delta);`는 저장 그래프를 바꾸지 않고 실행용 Event Tick에 연결해요. 일반 메서드 이름 Tick/Start는 자동 실행하지 않아요. construction/beginPlay/endPlay, overlap/hit begin/stay/end도 명시할 수 있고 인자 자료형은 AI schema의 nativeLifecycle.events에서 조회해요. 같은 단계의 사용자 BP보다 먼저 실행하며 C++ 구성은 런타임/스폰 단계예요. 생명주기 선언 변경은 재실행이 필요해요.

새 C++ 클래스는 Start가 beginPlay이고 Tick은 생성 창에서 선택해요. `Scene::SetTickEnabled/IsTickEnabled/SetTickInterval/GetTickInterval`과 같은 BP 노드가 액터별 실행 정책을 바꿔요. 0초는 매 프레임, setter는 큐 처리, getter는 최근 처리 스냅샷이에요. 기본 클래스/노드 설정은 저장 변경하지 않아요. 공용 SDK732, 전체 노드817. 상세 근거 ENGINE_WORK_261–267.


## 268–273 · 시퀀스 상태 소유권과 제작 설정

샘플한 값만 첫 적용 직전 baseline을 공유해요. 높은 priority가 우선하고 동률은 실제 재생 시작 순서예요. 하위 재생은 최신 값을 보관하며 상위가 정지하면 즉시 인계해요. TRS/visible·카메라/시간·빛/머테리얼·BP 변수/C++ 속성·개별 컴포넌트 속성을 지원해요. 부모/구조/골격/애니메이션/별칭/가중 혼합은 잔여예요.

트랙 completionMode는 default/restore/keep이고, restoreState는 기본값, optional forceRestore는 마지막 소유자의 복원을 강제해요. 다른 활성 소유권이 있으면 그 값이 우선해요. priority는 optional int32 기본0이고 `LevelSequence::SetPriority/GetPriority`와 같은 BP 노드가 실행 중 override를 바꿔요. setter는 큐 처리·getter는 최신 처리 snapshot이에요. `runtime.sequenceOwnership`/player inspect는 요청 시 lease 수를 반환해요. 공용 SDK734/노드819. ENGINE_WORK_268–273 근거와 각 limits를 함께 보세요.


## 274–281 · 광선·2D 실행·AI 제작 연결

광선 알파는 출력 의존성만 실행하고 고정 필드 호출은 관련 프로그램만 참조해요. 기존 sampleCube의 LOD 핀은 전체색과 알파의 GL/GPU/native 광선에서도 정수/분수/경계/필터대로 동작해요. 패킷/키/명령 예산과 다른 텍스처의 cutout 정책은 보존해요.

기존 Tilemaps CPP/BP 쓰기는 async load·render·release·dispose에서 늦은 상태를 버리고 새 편집을 보존해요. runtime.tilemap.inspect({target,layer?,offset?,limit?,cell?})와 player.tilemapState는 읽기 전용·기본64/최대256·단일 셀 조회이며 원본을 편집하거나 자동 로드하지 않아요. 숫자는 응답 페이지 크기이며 생성 제한이 아니에요. SpriteRenderer/TilemapRenderer의 toneMapping은 scene(기존 기본) 또는 display(머테리얼 원본색)이에요. 전역 후처리 우회와 별개예요. SDK734/노드819는 그대로예요. ENGINE_WORK_274–281에 실제 표본/한계를 기록했어요.


## 283 · display 원본색 출력

기존 SpriteRenderer/TilemapRenderer scene/display enum을 유지해요. WebGPU direct canvas는 혼합 화면에서만 표시 attachment를 쓰고 반사/굴절 HDR을 보존해요. 불투명 display 전용은 extra0, 투명 혼합은 extra1이며 미사용 시 해제해요. renderer.displayColors는 mode/targets/bytes/multisampleBytes/automaticReadbacks를 제공하며 byte는 계산된 attachment 크기예요. 전역 후처리와 명시 offscreen은 기존 정책을 유지해요. SDK734/노드819는 그대로예요.


## 284–293 · 렌더 값/시간 실행과 SDK 갱신

기존 CPP/BP 머테리얼 파라미터와 시간 호출은 그대로 사용해요. GL/GPU/DX 소유 그래프는 불변 ID, live 값/외부 원본은 편집 가능하며 CPU-only 매질 Time은 관련 출력만 갱신해요. 이전 normalTime은 base-normal Time 프로그램에만 포함해요. C++ build 응답 sdk.fingerprint/files/bytes는 간접/생성/JSON SDK 헤더 내용을 포함하며 같은 사용자 코드도 SDK가 바뀌면 재빌드해요. SDK734/노드819는 그대로예요. 새 wrapper 수를 부풀리지 않고 공용 기존 함수를 보완했어요.


## 308–318 · 이전 머테리얼 입력과 대형 타일 좌표

기존 CPP/BP Tilemaps 함수 이름·배열 핀을 유지해요. BoxFill/FloodFill은 전체 맵 면적 배열 없이 점유 셀을 사용하고 SetTiles의 좌표 키는64비트예요. 맵256 제한을 제거하고100만×100만 좌표의 실제 C++·BP/편집·Undo를 확인했어요. 동기 단일 편집262144셀은 작업 예산이며 전체 맵/오브젝트 수 제한이 아니에요. 타입 Vec2의float 정밀도와 큰 월드 원점은 별도 범위예요.

머테리얼 노드/CPP 파라미터와 IR 키·필드 마스크·전송 버전도 유지해요. 이전 노멀은 이전 삼각형·정점별 법선·시점·시각·밉 폭에서 평가해요. 다른 시간/월드 표면과 투과 분기는 보수적 거부/후속 구현 범위예요. 새 함수 수를 올리지 않았으며 SDK734/노드819는 그대로예요. AI의 tilemap.view는 같은 편집 화면의 보기만 다루고 source revision을 변경하지 않아요. 상세 근거는 ENGINE_IMPLEMENTATION_318.md·research/ENGINE_WORK_318.json을 따라요.


### 319–327 · 시퀀스 공통 실행

부모·whole component/property·Transform 별칭·골격·클립 소유권을 기존 LevelSequence CPP/BP와 AI operation에 연결했어요. 트랙 완료 정책은 부모/componentState/skeletal까지 확장하고 클립 구간의 부분 해제는 다른 필드를 유지해요. 외부 재생/그래프 복원·나머지 별칭·가중 혼합은 잔여예요. ENGINE_IMPLEMENTATION_327/ENGINE_WORK_327을 참조해요.

### 727–732 · 텍스처 밉 영역 픽셀

`Materials::SetTextureRegion`에서 `materialTextureRegion` 노드를 생성해요. 대상·텍스처 파라미터·밉·시작 XYZ·크기 XYZ·Color 배열을 받아요. Color는 저장 자료의 0~1 RGBA이며 픽셀 순서는 X→Y→Z예요. 배열/큐브에서는 Z가 면이고 볼륨에서는 깊이예요. 정수 경계·픽셀 수·색상 범위를 검증하고 현재 실행 중인 명시적 RGBA8 텍스처만 바꿔요. 원본 파일은 유지해요. 실제 98에셋 게임에서 네 자료형의 C++ 변경→키보드 블루프린트 변경→원래 값 복원을 확인했어요. 각 자료형 3회/12바이트 갱신과 추가 텍스처 할당 0을 확인했어요.

736–745: 기존 `componentSetString` 노드와 `hb::Components::SetString`으로 PostProcessVolume의 `pathTracingNormalFootprint`를 off/geometry/material로 바꿀 수 있어요. 실제 패키징 게임에서 C++와 Y/U 입력 노드의 모드 전환·원복·샘플·캡처 준비를 검증했어요. 새 제작용 전용 명령은 추가하지 않았어요. [실행 근거와 비용](research/NORMAL_FOOTPRINT_746.md).

756–772: `Materials::SetResidentMip`에서 `materialResidentMip` 노드를 생성해요. 대상/텍스처 파라미터/원본 시작 밉을 받고 -1은 자동 복귀예요. 기존 Components 노드/C++로 `TextureStreaming`과 MeshRenderer의 상주 예산·전환 예산·우선순위를 설정해요. 네 텍스처 자료형에서 실제 CPP 지정→블루프린트 전체 복원/자동 복귀, 원본 밉 부분 수정0/4바이트, 래스터·경로 색과 같은 프로그램을 확인했어요. 풀/원본 수명/AI/이전 노멀 이력의 검증 범위와 잔여는 [TEXTURE_RESIDENCY_772](research/TEXTURE_RESIDENCY_772.md)에 있어요.
<!-- 810–824: 기존 컴포넌트 노드로 제어하는 메시 거리장 차폐 -->

`PostProcessVolume.aoMode="distanceField"`와 AO 활성·거리·편향·세기·거리장 해상도/atlas 예산은 기존 `componentSetBool/componentSetString/componentSetFloat`와 C++ `hb::Components` 함수에 연결돼요. 별도 화면 상태만 바꾸는 가짜 노드를 만들지 않아요. 실제 패키지 DirectX에서 C++·키보드 블루프린트의 활성 결과 일치와 직접광 보존을 확인했어요. [근거와 범위](research/MESH_DISTANCE_FIELD_AO_821.md).

1210–1212 제작: Sequence/MultiGate/Switch 동적 출력·Switch 기본 출력·Gate Start Closed·실행 입력 합류/Setter 삽입·변수로 만들기의Get/Set/자동연결·typed 단위 크기·중첩Split/Recombine·미리보기/VM 공통값·C++ aggregate/배열/문자열 기본값. [계약과 공식 읽기 범위](BLUEPRINT_FLOW_PINS.md). 현재 검증 영수증은 후속 ENGINE_WORK/USER_INSTALL을 확인한다. Custom struct/enum 및 Set Members·Collapsed Graph Expand는 이 변경으로 구현되었다고 주장하지 않는다.

1266: 타임라인과 시퀀스가 공용 Hermite 표본 계산을 사용해요. 공용 커브 편집기의 선택 키에 실제 진입/진출 핸들을 표시하며 드래그는 연결 기울기, Alt/Break는 한쪽만 변경해요. 선택하지 않은 축의 자동 기울기를 보존해요. 시퀀스의 기존 LevelSequence 노드·C++ 재생 경로가 에셋의 기준점·커브를 읽어요. 사용자 정의 구조체/반환 참조 등의 CPP 잔여는 유지해요.

1316–1322: 공용 Timeline/Curve/Sequence/골격 메타데이터에 Clamped Auto·선택 곡선 도구·단축키와 원자적 AI 편집을 연결해요. UI::GetListItems/MoveListItems/ReparentTreeItems/TransferListItems/TransferTreeItems는 같은 C++/노드 서비스로 호출해요. C++ 쓰기는 기존 명령 큐, 읽기는 마지막 완료 스냅샷이에요. [곡선 계약](CURVE_TOOLS.md)·[목록 코드 API](LIST_CODE_API.md)의 범위를 따라요. 전체 기능/네이티브 플랫폼 완료를 뜻하지 않아요.

1342–1347: Timeline/Curve/Sequence/골격 공통 키 클립보드·상대 시간/전체 채널/핸들 보존, 입력칸 분리·프로필/단축키 재지정, 비동기 소유권 가드·AI copy/cut/paste/revision/dryRun/Undo. Sequence 바깥/내부 곡선 재생 헤드 양방향 동기화. [계약](CURVE_TOOLS.md)을 따른다.

1354–1362: ReflectionProbes::SetPriorityBlend(target,bool,component)와 반사 우선 캡처 덮어쓰기 노드는 같은 priorityBlend 컴포넌트 서비스예요. 기존 꺼짐/정규화·같은캡처·9행/144B 유지, 첫 후보가 뒤 가중치를 b*(1-a)로 가려요. [계약·정확한 검증 범위](PROBE_PRIORITY_BLEND.md)를 확인해요.

1370: Timeline 트랙 삭제는 현재 graph의 출력 배선을 changed 전에 함께 제거해 한 Undo/Redo·저장으로 유지해요. 문서 이름 변경 후 창 닫기는 editor 동일성으로 참조를 정리하고 리스너·observer·WeakMap을 해제해요. 다시 열면 새 editor가 생겨요. 실제 격리 편집기에서 Undo로 graph 교체→트랙/배선 삭제·복원→콘텐츠 브라우저 F2 rename→close/reopen을 확인했어요.

1407 이후: ReflectionProbes::SetProxyVolume(target,proxy=nullptr,component,proxyComponent)와 SetUseInfluenceVolume(target,bool,component)을 공용 서비스/생성 노드로 제공해요. 프록시 오브젝트+컴포넌트 참조/무한/영향영역 복원·즉시 C++ 읽기·위치 보존을 지원해요. 현재 아틀라스는 14행/224B이며, 위1354의 9행/144B는 당시 기록이에요. [투영 계약](PROBE_PROJECTION.md)을 확인해요.

1424 이후 ReflectionProbes::SetAdvancedBlend/SetBlendFaces/SetFaceFade/SetNormalBlendDistance/SetNormalBlendFaces 다섯 공용 C++·생성 노드는 같은 ReflectionProbe 속성으로 실행해요. 면별 함수가 모드를 자동으로 켜지는 않으며 Inspector의숨은 값·Undo/저장·AI편집과 공유해요. [계약](PROBE_INFLUENCE.md)과 실제 C++/노드 게임 증거를 후속 원장에서 확인해요.

### C++ 비공개 멤버의 명시 반사 — 1501–1508

HB_PROPERTY/HB_FUNCTION/HB_NODE는 protected/private 구역에서도 기존 노드·기본값·인스턴스·이벤트 연결을 사용해요. 컴파일 사본에만 friend 접근자를 만들고 C++ 일반 접근은 계속 제한해요. namespace/private 중첩 클래스/비공개 enum·배열·정확한 const/ref 인자/모바일 모듈 분리와 bounded `native.classes.read`를 함께 제공해요. 블루프린트 함수의 별도 호출 권한과는 구분해요. [계약](NATIVE_CPP_ACCESS.md).

반사·라이트맵 혼합은 MeshRenderer.lightmapReflectionMix Bool이며 기존 컴포넌트 Bool 설정/읽기와 C++ Components::SetBool/GetBool을 공유해요. 실제 BP→C++ 실행·원래 위치·Stop 복원을 [실행 계약](PROBE_LIGHTMAP_MIX.md)에 연결해요.

1618: 공용 Component SetBool/Float/String의 lightmapReflectionMix/lightmapIntensity/castShadow/receiveShadow/motionVectors를 시각 그룹 유지 경로로 연결해요. C++ Components와 동일 서비스이며 범위/열거형/다른 변경의 재구축을 유지해요. docs/MESH_RENDERER_LIVE_PROPERTIES.md와 후속 설치 영수증을 따라요.

2026-10-23: [비등간격 곡선 필터](CURVE_RESAMPLE_FILTER.md). BP Timeline과 Curve·Sequence·골격 곡선은 원본 보간을 재표본화해 시간·개수·핸들을 유지하며 저/고역·대역 통과/제거를 편집해요. 저장된 키를 기존 BP와 C++ LevelSequence Play/Pause/Seek가 함께 실행해요. 별도 런타임 필터나 새 ABI는 없어요.

2026-10-23: [쿼터니언 범위 밖 회전](QUATERNION_INFINITY.md)의 각속도·누적 모드를 기존 BP와 C++ LevelSequence가 공통으로 실행해요. Sequence 속성/AI revision·Undo 계약을 그대로 사용하고 이산/참조/이벤트 시계는 유지해요.

2026-10-23: [월드 거리장 쿠킹](DISTANCE_WORLD_COOKING.md)은 기존 MeshRenderer의 월드 메시·지형·폴리지·LOD와 같은 에셋을 사용해요. BP/C++ Components의 PostProcessVolume 설정과 Scene 이동이 같은 쿠킹 필드의 적중·LOD 전환·해제/재생성을 실행해요. 새 노드/ABI나 원본 복제는 없어요.

편집기 거리장 사전 생성은 `distanceFields.prepare`와 같은 흐름으로 프로젝트 CookCache를 준비해요. 런타임에서 기존 PostProcessVolume·MeshRenderer를 제어하는 블루프린트와 C++ API는 유지하며, 편집기 재실행에서도 같은 정적 기하를 재사용해요. 편집기 전용 캐시 준비를 게임 중 C++ 호출로 노출하지 않아요. 자세한 계약은 [EDITOR_DISTANCE_CACHE.md](EDITOR_DISTANCE_CACHE.md)에 있어요.

Take 녹화는 프리셋·Transform 채널·뼈 필터와 시퀀스별 recordingSettings를 지원해요. runtime.take.start/state/finish 및 사람의 녹화 UI가 같은 TakeRecorder를 사용하며, 결과는 기존 BP/CPP LevelSequence 제어로 재생해요. 자세한 저장·복사·검증 범위는 [TAKE_PRESETS_AND_CAPTURE.md](TAKE_PRESETS_AND_CAPTURE.md)에 있어요.

시퀀스 애니메이션 트랙은 종료 시 기본/복원/유지 정책을 쓰며, 스프라이트·Transform 타임라인·가져온 단일 클립의 기존 재생 시간·반복·포즈를 복원해요. BP/C++ LevelSequence와 UI/AI가 같은 서비스이며 `runtime.animationPlayback`에서 읽기 전용으로 확인해요. Graph/몽타주 내부 이력 등 잔여 범위는 [ANIMATION_PLAYBACK_RESTORE.md](ANIMATION_PLAYBACK_RESTORE.md)에 적혀 있어요.

골격 시퀀스의 키 준비·모델 바인딩 재사용과 범위별 포즈 조회도 같은 BP/C++ 실행 서비스를 사용해요. `runtime.sequencePose`의 `sampling`은 준비·복원·조회 작업 횟수를 명시적 요청에서만 보여 줘요. [SEQUENCE_POSE_PREPARATION.md](SEQUENCE_POSE_PREPARATION.md)에 재검증·수명·독립 포즈 대조 범위를 적었어요.

직접 작성한 C++ 포함 헤더의 구조체 필드 추가도 기존 BP 변수·함수 입력·상속·장면·프리팹·시퀀스 값과 함께 이관해요. `files.apply` 미리보기 계획 검사와 열린 문서·전체 묶음 Undo/Redo를 공유하고, 컴파일된 사용자 C++는 같은 새 필드 자료를 읽어요. 자동 이관과 외부 IDE·ABI의 경계는 [NATIVE_TYPE_MIGRATION.md](NATIVE_TYPE_MIGRATION.md)에 적었어요.
# 개별 데이터 타입 제작 경로

열거형 `.hbenum.json`·구조체 `.hbstruct.json`은 콘텐츠 브라우저의 별도 에셋으로 만들고 대표 선언 편집기로 열어요. 같은 파일 보조 타입/배열·기본값, 명시적 BP 타입 가져오기, 원본 참조 저장의 enum 변수·Set 입력값, 생성 C++ 헤더, additive 소비자 이관과 그룹 UndoRedo를 공용 경로로 연결했어요. 자세한 형식·이동/identity·AI 계약·남은 경계는 [NATIVE_TYPE_DECLARATIONS.md](NATIVE_TYPE_DECLARATIONS.md)에 있어요. 새 에셋 경로도 `native.typeLibraries` 키를 유지해요.

# Take 기록 프리셋 에셋과 공용 재생

1835–1837: 프리셋과 시퀀스에 액터 ID·현재 플레이어 폰·월드 액터 소스 목록을 저장해요. UI에서 소스 추가/선택 추가·삭제·활성 체크, Undo/Redo·불러오기/새 파일 저장을 사용해요. AI는 `runtime.take.sources`로 공용 해석 결과를 먼저 읽고 `runtime.take.start`에 같은 목록이나 프리셋을 전달해요. 명시 targets가 우선하며, 켜진 소스 연결 부재·빈/전체 비활성 목록은 시작 전에 오류를 내요. 시작 시 대상 ID와 목록을 고정해 진행 중 파일/폰/월드 변화와 분리하고, 결과는 recordingSources 메타데이터와 실제 대상 키를 가진 일반 시퀀스로 저장해 기존 BP·C++ 재생을 사용해요. 소스 없는 기존 UI 선택 방식을 유지하고 프리셋은 편집기 전용이에요. 상세 계약은 TAKE_PRESETS_AND_CAPTURE.md예요. 프리셋 상속·clock/timecode·외부 캡처는 별도 잔여예요.

Take 녹화 프리셋은 전용 에셋/편집기에서 만들고 시퀀스의 설정으로 복사해요. UI 불러오기·새 파일 저장과 파일 묶음 Undo/Redo, AI sequence.take.preset.apply/runtime.take.start의 원본 기준 검사를 공유해요. FPS·키 오차와 채널/뼈/생성 필터는 실제 녹화기로 전달하고 결과 시퀀스에 남겨요. 기록한 결과는 기존 BP·C++ LevelSequence::Play/Seek/Stop을 사용하며 게임용 녹화 C++ ABI를 새로 추가한 것은 아니에요. 설정 에셋은 게임 빌드에서 제외해요. 형식·복사 정책·원본 변경/키 줄이기·남은 source 바인딩/timecode는 TAKE_PRESETS_AND_CAPTURE.md에 있어요.

1841–1843: Take 프리셋 다단계 상속 parentPreset/overrides, FPS·키오차·설정·소스 묶음 덮어쓰기, 유효값 표시/상속입력잠금/덮어쓰기초기값복사·상위새로고침·상속해제·UndoRedo. take.preset.resolve/sequence.apply/runtime preview/start의 공용 해석·전체 chain revision 검사·누락/순환/깊이 오류·진행중 snapshot분리. 결과 시퀀스/SaveAs는 flat복사로 기존 BP·CPP 재생을 사용하고 preset파일은 게임에 넣지 않아요. 상세는 TAKE_PRESETS_AND_CAPTURE.md예요. clock/timecode·외부capture는 별도 잔여예요.

1847–1849: Take game/unscaled/platform 시계·정수 non-drop 시작 타임코드·clock/recordingClock 프리셋/시퀀스/결과저장·clock묶음상속/UndoRedo·AI start부분override/state timecode 연결. game은배율·pause적용,unscaled는완료frame rawDelta/pause정지,platform은단조시계/기존실행loop의안전한정지포즈표본. 키는상대초라기존BP/CPP재생유지. 오디오/외부timecode/RTC/genlock/분수·dropframe은별도잔여. 상세TAKE_PRESETS_AND_CAPTURE.md.

1853–1855: Take 시계의 양의 분수 수집 FPS(분자/분모)·29.97/59.94 DF 표기/유효 입력·정수 편집 격자 구분·프리셋 clock 상속/SaveAs/UndoRedo·AI 부분 override와 sampleRate/sampleFPS/skippedSamples 상태를 연결해요. 시작 기준 표본 스케줄로 누적 지연을 방지하고 놓친 구간의 가짜 포즈를 만들지 않아요. BP/C++ 재생 키는 상대 초를 유지해요. 외부 오디오/동기 시계와 분수 편집 격자는 잔여예요.

1859–1861: 공용 hb::Skeleton 6개 함수에서 BP 순수 조회 노드 생성(개수/이름 페이지/존재/로컬·월드 위치·XYZ회전도·크기). 사람의 시퀀스 골격 속성 뷰와 AI named page/world affine matrix·trsExact를 공용 helper에 연결해요. 뼈 이름/중첩 actor 경계 검증·실패 활성화/복원 보존·전체 대상 준비 후 포즈 쓰기와 중첩 루트 행렬 통합. 즉시 Seek·모델 교체/제거/역방향/복원은 유지해요. 뼈별 소유권·가중 혼합·외부 graph/montage 복원은 잔여예요. docs/SEQUENCE_POSE_AND_SKELETON.md.

1871–1873: LevelSequence::SeekFrame/GetFrame/GetFrameRateNumerator/GetFrameRateDenominator의 공용 BP 노드4개를 추가해요. 선택 시퀀스 displayRate 분수 격자와 같은 프레임 위치를 사용해요. 값 저장·시간 이동은 초 단위이고 편집 표시율이 엔진 FPS를 고정하지 않아요. 계약/검증은 docs/TIMELINE_DISPLAY_RATE.md 및 WORK1873/USER_INSTALL1875를 따라요.

1877–1879: [시퀀스 재생 시계](SEQUENCE_PLAYBACK_CLOCK.md)에 game/unscaled/manual/PlayEveryFrame 설정·6공용 CPP/BP API·AI 편집 계약을 연결했어요. 기존 격자·초 저장·녹화율은 독립적으로 유지해요.

1885에서는 공용 BP 타임라인의 Clamped Auto 저장 검증도 화면·샘플러와 맞췄어요. 여러 곡선 선택·편집과 같은 보간 모드를 저장하고 원래 평가를 사용해요.

1883–1885: [다중 시퀀스 곡선](SEQUENCE_MULTI_CURVE.md)의 표시/선택·공통 드래그·그룹 클립보드·원자적 도구·Undo·AI 배치 편집을 연결했어요. 정규화/쌓기 보기와 키별 다른 채널 축 동시 선택은 별도예요.

1889–1891: [실제 값·정규화·쌓기 보기](CURVE_VIEW_MODES.md), 키/탄젠트 역변환·범위 선택·값 축 확대/이동·레인 스크롤·Undo 뒤 채널 숨김 유지·view-only AI read/set/CAS/dryRun을 연결했어요. 키·핸들 저장과 C++ 재생은 실제 단위를 유지해요.

1895: 공용 TimelineEditor에서 키별 여러 축과 다중 소유자 채널 선택·역변환 드래그·값/탄젠트/가중 입력·선택 축 도구·가시 채널 범위/전체 선택·선택 맞춤을 연결해요. 시간/보간/삭제/클립보드는 기존 공유 벡터 키 범위예요. AI selections 원자적 검증과 실행 값은 [채널 선택](CURVE_CHANNEL_SELECTION.md)을 참고해요.

1901: 시퀀스 외부 시계 수신을 double 초/분수 프레임·기준점 초기화·조회/동기화 상태 5공용 C++/BP API로 연결해요. 입력 중단/역행/일시 정지/Seek와 동일 이벤트·반복·하위 평가·복원을 사용해요. 장치 I/O·PCM·하드웨어 동기화는 [외부 시계 계약](SEQUENCE_EXTERNAL_CLOCK.md)에 구분해요.

1907: 공유 곡선에 선택적 arriveControl/leaveControl 값 오프셋과 단조0..4/3 시간 핸들 검증을 추가해요. 수직·범위 밖 핸들이 필요한 내부 경계를 정확히 분할/부분 베이크하고, incoming-only 핸들 편집·숫자 변환·다중축 tool·클립보드·Sequence/골격/BP 평가를 연결해요. [명시적 제어점](CURVE_EXPLICIT_CONTROLS.md)을 참고해요.

2178–2208: [효과 캡처](LIVE_EFFECT_CAPTURES.md)의 snapshot 선택을 기존 효과 노드/편집기/공용 런타임에 연결해요. 지속 효과의 종속 전파와 주기 실행 묶음의 입력 재평가, 적용 당시 네 역할/태그의 Cue·조회 전달을 지원해요. ApplyEffectSpec의 기존 입력은 보존하고 선택 instigator·causer 핀은 null이면 출처를 사용해요. 신규 source 사례와 실제 C++ 구·신 호출 → 명령 재생 → 속성·문맥 조회를 확인했어요. 지연 묶음 내부 매 주기의 과거 입력 복원·사용자 설치 업데이트는 별도예요.

2209–2218: [EQS 서비스](BEHAVIOR_QUERY_SERVICES.md)를 행동트리의 기존 서비스/편집기/명령/JSON 스키마·RunBehaviorTree 공용 실행에 연결해요. 활성 노드 주기·종료 수명과 형이 지정된 블랙보드를 공유하고, 중단·교체된 비동기 결과는 기록하지 않아요. [관리 채널 묶음](SEQUENCE_BATCH_ROLLBACK.md)은 중복 필드 마지막 값과 실패 소유권/값 복원·최신 샘플 보호·clear 퇴역을 지원해요. source26 새 사례와 관련 gate를 확인했으며 일반 외부 부작용·GUI·새 네이티브 바이너리 검증 범위는 구분해요.

2219–2229: 공용 소리 명령은 정지·같은 핸들 교체·출처 퇴역 시 개별 로딩을 취소하고, 에셋 탐색 중의 늦은 시작도 차단해요. 공유 URL의 다른 음성은 유지해요. 기존 EQS 태스크와 서비스는 정지/활성화 교체 뒤 결과를 쓰지 않고, 활성 callback 안의 중지도 다음 작업 전에 반영해요. 미리듣기 로딩 취소·재생 정지 버튼은 같은 수명을 사용해요. source 사례와 공용 native 명령 재생으로 확인했으며 새 네이티브 바이너리·실기기 검증 주장은 아니에요.

## 2230–2243 소스 확장

- 환경 질의 편집기는 실행하지 않은 장면도 수동 검사해요. 복사한 월드에서 기존 EQS·NavMesh·2D/3D 충돌 질의를 사용하고 단계 UI와 editor.eqs.run/read/view를 공유해요. 실행 중 runtime.eqs 장벽은 유지해요.
- 시퀀스의 가져온 Euler scalar 회전은 액터·모델 자식·골격 뼈에서 호환되는 축만 소유해요. 여섯 Euler 순서·정규화/우선순위/0 가중치·Stop 복원·native 명령 재생을 공용으로 처리해요. 서로 다른 순서/회전 원점 축 투영은 전체 방향 규칙을 유지해요. 종료 때 중간에 드러난 하위 클립을 다시 시작하지 않아요.
- 소유 소스 검사 범위이며 실제 창/신규 C++ 바이너리/설치 증명은 아니에요. 업데이트 보류와 예약 금지를 유지해요.


## 2335–2367 공용 실행 확장

- [천·로프 물성](DEFORMABLE_HOT_PROPERTIES.md)은 기존 컴포넌트 수치 지정 노드/C++ setter에서 실행 중 입자·고정·연결을 유지해요. 직접 setter가 없는 물성은 기존 재생성 경로를 유지해요.
- [C++ 생략 인수](NATIVE_INPUT_DEFAULTS.md)는 반영된 기본값만 공용 protocol에서 채우고 원래 전체 검증을 실행해요. 명시한 값과 필수 수신자를 유지해요.
- [다중 IK 늘이기 설정](FULL_BODY_STRETCH.md) 노드와 AnimationGraph::SetIKStretchSettings는 같은 검증과 활성 그래프 override를 사용해요. 편집기의 선택적 늘이기·뼈별 강성과 같은 평가를 사용해요.
- [타일 변경 좌표](TILE_DIRTY_CELLS.md)는 기존 단일/묶음 BP·C++ 쓰기의 누적 dirty 목록 복사를 줄이고 비동기 처리·실패·revision 경계를 보존해요. 실제 점유 배열 복사와 디스크 청크 비용은 남아요.

2370–2379: [편집 EQS 테스트 오브젝트](EQS_TESTING_PAWN.md)는 scene.place/Batch와 같은 배치 데이터·컴포넌트 폼/문서 편집을 사용해요. 선택한 정지 장면에서 저작 변경을 합쳐 query-only 평가하고, 수동 질의/숨기기는 다음 변경까지 자동 평가를 멈춰요. 원본/게임 시뮬레이션을 바꾸지 않으며 게임 빌드에서는 테스트 컴포넌트를 제거해요. 기존 C++/BP 런타임 EQS는 그대로 유지해요.

2380–2391: [모델 클립 추출](MODEL_CLIP_EXTRACTION.md)은 기존 골격 클립 형식을 생성하고 기존 그래프/몽타주/시퀀스 및 C++ 재생 명령을 사용해요. 원본 키/보간과 고유 노드 바인딩을 유지하고 사용자 보간 베이크는 명시적으로 선택해요. 새 SDK나 런타임 형식을 추가하지 않아요.

2402 이후: 모델 독립 클립은 선택 구간과 정확한 TRS 경계·알림/곡선 구간을 지원해요. BP/C++ 타일 쓰기는 내부 불변 청크와 기존 JSON 공개를 함께 사용하고, EQS는 최신 월드 확인을 유지하며 변경 행만 준비해요. v3 [효과 면역](EFFECT_IMMUNITY.md)은 기존 ApplyEffect/ApplyEffectSpec 노드·C++ 공용 처리에서 캡처와 변경 전에 판정해요. 능력은 비동기 로딩 뒤 소유자·능력 세대·비용·태그를 다시 검사해 중복 활성화나 늦은 비용 지출을 막아요. 새 SDK/바이너리·실기기 검증 주장은 아니에요.

### 2436–2455: 모델 재질·기존 클립 구간·지속 조건

모델 하위 재질의 Standard/Physical PBR 상수와 외부 프로젝트 이미지/채널/UV/샘플러를 기존 v1 머테리얼 그래프로 추출하고, 기존 골격 클립은 TRS/모프·알림·곡선을 같은 경계 보존 도구로 잘라 한 Undo로 저장해요. 사람용 편집과 AI CAS/dryRun이 같은 검증을 사용해요. v4 효과 ongoingRequirements는 현재 역할 태그/수명으로 억제·재개하며 수치/태그/면역/주기 실행과 검사창 상태를 연결해요. 양의 부여 연쇄를 같이 계산하고 모순 순환·수치 재활성 오류는 비용/태그/Cue까지 원자 복원해요. 기존 BP/C++ 명령의 공용 서비스 경로이며 새 실제 C++ 바이너리/창 실행을 증명한 변경은 아니에요. 세부 범위와 미지원은 MODEL_MATERIAL_EXTRACTION, SKELETAL_CLIP_RANGE, EFFECT_ONGOING 문서를 참고하세요.

### 2486–2513: 관절 수명과 공유 초안 충돌 해결

[관절 파손](JOINT_BREAKAGE.md)은 2D/3D 거리·각도 조건과 BP/C++ `Physics::SetJointBroken`을 실제 solver 해제/재연결에 연결해요. 작성 속성은 유지하고 같은 컴포넌트/강체 수명 동안 파손을 보존하며 기존 AI 관절 페이지로 복사 상태를 읽어요. 반력 기반 force/torque 판정은 별도 잔여예요. [문서 합치기](DOCUMENT_CONFLICT_MERGE.md)는 사람/AI의 동일 3방향 비교·충돌 선택·CAS·한 Undo 초안을 사용하고, 저장은 기존 파일 CAS로 따로 해요. 지속 효과 조건의 태그/수치 갱신은 실제 참여자/종속자만 복사·공개해 무관 소유자 순회를 줄여요.

2523 이후: [게임플레이 Cue 자산](GAMEPLAY_CUE_ASSETS.md)은 AbilitySystem 시작 Cue 바인딩과 기존 BP/C++ 효과/능력 명령을 통해 태그·시점별 one-shot 음향/기존 emitter burst를 자동 실행해요. 비용/태그 트랜잭션 확정 후 실행하고 같은 사용자 Cue 이벤트를 유지해요. 소유자 세대·효과 핸들·채널로 음향을 구분하고 비동기 준비 중 교체/종료를 차단해요. 미디어 오류는 수치 로직 중단 대신 로그/마지막 요약으로 남아요.

2536 이후: Cue 자산 경로는 기존 컴포넌트 문자열/JSON BP·C++ 공용 쓰기로 실행 중 교체/비울 수 있어요. 새 경로만 새로 읽고 검증 뒤 함께 반영하며 최신 요청/소유 수명을 지켜요. 실패·늦은 요청은 이전 설정을 덮지 않고 다른 속성 편집을 보존해요. 이전 프로그램의 대기 음성·늦은 파티클 방출도 취소해요. 같은 경로 반복 지정은 I/O를 추가하지 않아요.

2545 이후: [골격 TRS/모프 키 편집](SKELETAL_TRACK_KEYS.md)은 기존 v1 클립에 트랙 생성·키 시간/값/보간·삭제/표본삽입을 연결해요. 사람 위젯과 skeletal.track.create/keys/read는 같은 검증·실행기 Float32 정밀도·한Undo/CAS를 사용하고 큰 준비는 나눠서 완료 후 게시해요. 저장된 위치/Euler/인덱스 scale/전체모프 배열이 실제 AnimationGraphPlayer에서 재생되는지 확인했어요. 새로운 SDK·GPU 출력·설치 실행을 뜻하지 않아요.

2561 이후: [독립 Cue VFX](GAMEPLAY_CUE_ASSETS.md)는 v2 프리팹·부착/분리 TRS·게임 시계·채널 교체/정지·풀과 비동기 수명 보호를 기존 BP/C++ 공용 생성/능력 서비스에 연결해요. 기존 v1은 명시적으로 변환해요. [공동 저장 충돌 복구](TRANSACTION_RECOVERY.md)는 실제 원문/해시를 비교하는 사람·AI 선택과 전체 파일 CAS, 자식 기록의 롤백/재시작을 사용해요. 단일 문서 초안 Undo와 별개의 디스크 복구이며 일반 쓰기는 충돌 해결 전 보류돼요. 새 네이티브 바이너리·GUI·GPU·설치 검증 주장은 아니에요.

2595 이후: [골격 클립 길이 재조정](SKELETAL_CLIP_RETIME.md)은 양수 균일 시간 배율로 TRS/모프·점/구간 알림·선택 sync 마커·가중/명시 control/반복 영역 곡선을 함께 옮겨요. 값과 보간은 표본화하지 않고 유지하며 초당 접선만 나눠요. 사람 한 Undo/미리보기 수명과 AI skeletal.retime의 협력 준비·최종 CAS/복사 초안·저장을 공유해요. 신규15·구간9/키20와 실제 저장 Graph의 위치/quat/인덱스scale/full morph 재생을 확인했어요.

2609 이후: 관절 파손은 설정한 정상 후보만 substep 전후에 순회하고, 대상별 페이지/수동 명령은 소유자 색인을 사용해요. 소유자·컴포넌트 ID의 구분자 충돌도 제거했어요. 실제 2D/3D 신규8·파손9/DOF7을 확인했으며 새 SDK 실행 없이 공용 VM 명령을 유지해요. 전체 물리 동기화/solver 비용·force/torque 반력·plasticity는 별도예요.

2620 이후: 일반 능력 tick의 임시 배열을 제거하고 유휴 iterator를 건너뛰어요. 정상 능력 상태 판정은 한 번, 만료 뒤 쿨다운은 다시 확인해 마지막 0 표시를 보존해요. 시계 게시에서는 불변 표시 행을 공유하고 바뀌는 시간/쿨다운은 계속 갱신해요. 신규11·시계5/ongoing22/live13/재적용6/Cue25/VFX26과 공용 명령 재생을 확인했어요. 전체 수명/조건 순회 비용과 실제 FPS 검증은 별도예요.
# 골격 소켓·부착과 Cue v3

SkeletalSocket/SkeletalAttachment는 기존 componentGet/Set String·Vector·Bool·Json 공용 명령과 native 명령 재생으로 제작·실행해요. 부모 Bone/소켓·로컬 TRS, 초기/풀 획득 이벤트 전 적용, 애니메이션·물리·시퀀스 후 갱신·중첩 부모 우선·수명/오류 진단을 연결했어요. Cue v3는 한 Undo 변환·뼈/소켓 VFX 추적/분리·상대 자식 이미터 경로를 지원해요. [정확한 계약과 검증 경계](SKELETAL_SOCKETS.md)를 참고해요. 전용 부착 시퀀스 트랙·동적 강체 결합·한 액터의 다중 ParticleSystem·새 C++ 바이너리/GPU/GUI/실기기·설치는 별도예요.

소켓 순수 조회 노드 7개(`socketCount/Names/Has/Position/Rotation/Scale/Transform`)와 `hb::Skeleton`의 같은 조회 함수를 연결했어요. 월드 기본값·액터 로컬 선택, 선언 목록 페이지, 실행 액터 권한·입력/응답 검증과 전단 시 정확한 위치/비근사 TRS 거절 계약을 공유해요. 현재 소켓 API C++ 실행 근거와 이전 부착 기능의 source/native 명령 재생 근거는 원장에서 구분해요.
