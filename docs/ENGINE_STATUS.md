# 엔진 현재 상태와 추가 구현 원장

갱신일: 2026-10-16 · 대조 기준 커밋: `f5c7191a`

기준 데이터는 [ENGINE_STATUS.json](research/ENGINE_STATUS.json) 하나다. 과거 문서의 “아직 없음”보다 각 행의 구체적인 구현/잔여 범위를 우선한다. verified는 해당 행의 구현 범위만 검증했다는 뜻이다. 등록 항목 수는 Unreal/Unity 전체 API 분모가 아니므로 전체 완료율은 계산하지 않는다.

현재 등록 78항목: 정의한 범위 구현·검증 근거 있음 39개 / 구현된 부분과 추가 구현이 함께 있음 28개 / 아래 remaining의 제작/실행 경로 미구현 8개 / 실행 경로 또는 일부 표본은 있으나 요구 조건 검증 안 됨 3개

`node tools/hb.mjs status --local`은 창/서버 없이 읽는다. 실행 서버에서는 `GET /api/engine/status`를 사용한다. id·area·status·search 필터와 전체/일치 항목 수를 제공한다. 원장 갱신 후 `node tools/engine-status.mjs --write`로 이 문서를 동기화한다. 조회는 프로젝트 파일·실행 상태를 변경하지 않는다.

## 프로젝트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PRJ-01 설치형 실행기·프로젝트 생성/열기 | verified | Win32 에디터·플레이어, .hbproject 연결과 독립 프로젝트 경로 | 이 행의 범위는 검증됨 | [USER_INSTALL_151.json](research/USER_INSTALL_151.json) |
| PRJ-02 실행/편집 상태와 사용자 작업 격리 | verified | 별도 실행 월드·프로필·임시 검사 프로젝트 | 이 행의 범위는 검증됨 | [USER_DEVELOPMENT_SEPARATION.md](USER_DEVELOPMENT_SEPARATION.md) |
| PRJ-03 복구 저장·데이터 호환 | partial | 버전 데이터 검증·복구 경로 | 중단·디스크 부족·다양한 구버전 전환의 통합 검증 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |

## 에셋

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AST-01 드래그 가져오기·의존 참조 | verified | 파일/폴더 가져오기·참조 이름 변경·재열기 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| AST-02 모델 임포트 하위 에셋·재가져오기 | partial | 모델/클립 로딩과 형식별 로더 | 메시·골격·클립 하위 ID 보존 · 임포트 오버라이드 유지·단위/좌표계·형식별 품질 검증 | [ENGINE_PLAN.md](ENGINE_PLAN.md) |
| AST-03 임포트 캐시·쿠킹·압축 | partial | 의존성을 따라 배포 리소스 수집·중복 런타임 축소 | 지속 캐시 무효화 · 대상 플랫폼별 텍스처/모델 쿠킹·압축 컨테이너 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| AST-04 프리팹·변형·오버라이드 | partial | 프리팹 생성·인스턴스 구성 | 변형 상속·속성별 적용/되돌리기·중첩 갱신과 충돌 해결 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) |
| AST-05 미디어 변환·동기화 | partial | 이미지/오디오·등록 모델과 미디어 읽기 경로 | 추가 코덱 변환기 · 영상·오디오·시퀀스 동기화와 seek 정밀도 | [ENGINE_PLAN.md](ENGINE_PLAN.md) · [WEB_MEDIA_CONTRACTS_023.md](research/WEB_MEDIA_CONTRACTS_023.md) |

## 편집기

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| EDT-01 문서 탭·에셋별 전용 편집기 | verified | BP·머테리얼·애니메이션·게임플레이 에셋을 구분한 문서 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-02 독립 창·도킹·복원 | partial | 독립 창과 재도킹·세션 배치 | 다중 모니터/DPI·종료/복구·대화상자 중 창 이동의 추가 안정성 검증 | [DETACHED_WINDOWS_RESEARCH.md](DETACHED_WINDOWS_RESEARCH.md) |
| EDT-03 작업창별 탐색·콘텐츠 브라우저 | verified | 독립 탐색 기록·폴더·검색/필터·다중 선택·생성 메뉴 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-04 계층·컴포넌트 제작 | verified | 계층/부모·복제/그룹·등록 컴포넌트 속성 편집 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-05 Undo·단축키·재지정 | partial | 문서별 Undo와 등록 조작 단축키/설정 | 모든 전용 편집기 조작의 재지정·포커스/텍스트 입력 충돌 대조 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-06 프로젝트 제작 도구 확장 | verified | 데이터 도구 에셋·입력 바인딩·동일 명령/Undo 실행 | 이 행의 범위는 검증됨 | [LIGHTING_TOOLS_128.md](LIGHTING_TOOLS_128.md) |
| EDT-07 현지화·접근성 | partial | 한국어/영어 검색과 DOM 기본 입력 접근 | 지역화 테이블·문화권 전환 · 전용 편집기 키보드/스크린리더·색약/배율 검증 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) |

## 2D·2.5D

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| 2D-01 스프라이트·타일·애니메이션 입력 | verified | 스프라이트/타일맵과 게임 중 교체·반전·플레이어 조회 | 이 행의 범위는 검증됨 | [INPUT_SPRITE_TILEMAP.md](INPUT_SPRITE_TILEMAP.md) · [AURIC_RUNTIME_FEATURES.md](AURIC_RUNTIME_FEATURES.md) |
| 2D-02 2D 조명·노멀·그림자 | verified | 공용 GL/GPU 조명·쿠키·노멀·블렌드·그림자 | 이 행의 범위는 검증됨 | [GPU_2D_LIGHTING_053.md](research/GPU_2D_LIGHTING_053.md) |
| 2D-03 마스크·윤곽선·정렬·픽셀 정렬 | verified | 스프라이트/타일/입자 마스크와 효과·정렬 | 이 행의 범위는 검증됨 | [GPU_2D_052.md](research/GPU_2D_052.md) · [GPU_EFFECTS_054.md](research/GPU_EFFECTS_054.md) |
| 2D-04 2D 골격·세 IK·각도 제한 | verified | Sprite rig·skin·Limb/CCD/FABRIK와 bind 각도 제약·8개 BP Return 핀과 C++ 실제 조회 대조 | 이 행의 범위는 검증됨 | [2D_IK_CONSTRAINTS_074.md](2D_IK_CONSTRAINTS_074.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| 2D-05 2D 전용 리타게팅 | partial | 같은 부모 계층 bind 상대 클립 리타게팅·이름/ID 뼈 대응·이동 비례·키 보존·수동/AI Undo/Redo·기존 C++/BP 재생 | 다른 체인/계층을 대응하는 2D 포즈 솔버 리타게팅 · 실행 중 IK/제약까지 포함한 재표본화 베이크 | [ANIMATION_RETARGET_072.md](ANIMATION_RETARGET_072.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| 2D-06 자동 타일·2.5D 제작 통합 | partial | 타일 제작·2D/3D 공존과 카메라 차원 | 복합 자동 타일 규칙·동기 충돌 편집 · 2.5D 제작 샘플·서로 다른 렌더 경로 품질 대조 | [2D_RENDERING_SHORTCUTS.md](2D_RENDERING_SHORTCUTS.md) |

## 월드 제작

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| WLD-01 도형 배치·월드 편집 | verified | 원시 도형·광원·카메라·환경 액터 배치/속성 | 이 행의 범위는 검증됨 | [ENVIRONMENT_ACTORS_RESEARCH.md](ENVIRONMENT_ACTORS_RESEARCH.md) |
| WLD-02 폴리곤·메시 저작 | partial | 기본 도형과 가져온 메시 편집 소유자 | 정점/간선/면 선택·토폴로지 작업·실제 충돌/UV 갱신 | [ENGINE_PLAN.md](ENGINE_PLAN.md) |
| WLD-03 지형 브러시·폴리지 | unimplemented | — | 지형 높이/레이어 브러시 · 폴리지 산포·인스턴스 편집·충돌·Undo | [WORK_ORDER_051.md](WORK_ORDER_051.md) |
| WLD-04 LOD 제작·전환 | unimplemented | — | 메시 LOD 생성/저작·거리/화면 크기 전환·충돌/애니메이션 LOD | [WORK_ORDER_051.md](WORK_ORDER_051.md) |
| WLD-05 월드 분할·레벨 스트리밍 | unimplemented | — | Additive 로드/언로드 · 셀·액터 수명·참조·물리/스크립트 합류와 재진입 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) |
| WLD-06 내비게이션·군중 | partial | 평면 충돌 그리드 기반 경로 | 실제 다각형 NavMesh·경사·오프메시 링크·동적 타일 · 군중 회피·에디터 베이크 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) |

## 렌더링

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| RND-01 DirectX11·WebGL2·WebGPU 실행 | verified | 실제 장면/머테리얼/조명 공용 렌더와 네이티브 경로 | 이 행의 범위는 검증됨 | [RENDERING_145.md](RENDERING_145.md) |
| RND-02 인스턴스·변형·부분 전송 | verified | 정적 인스턴스·skeletal/morph·변경 범위/버퍼 갱신 | 이 행의 범위는 검증됨 | [NATIVE_INSTANCING_089.md](NATIVE_INSTANCING_089.md) · [NATIVE_DEFORMATION_090.md](NATIVE_DEFORMATION_090.md) · [RENDERING_123.md](RENDERING_123.md) |
| RND-03 광원·HDRI·환경 액터 | verified | 래스터 HDRI/다중 광원·MegaLights/SkyLight 제작·분산 캡처 | 이 행의 범위는 검증됨 | [RASTER_LIGHTING_131.md](RASTER_LIGHTING_131.md) · [RENDERING_138.md](RENDERING_138.md) |
| RND-04 GI·경로 추적·중첩 매질 | verified | 소프트웨어 기하 GI/경로 추적·매질·HDRI 표본 | 이 행의 범위는 검증됨 | [RENDERING_107.md](RENDERING_107.md) · [RENDERING_145.md](RENDERING_145.md) |
| RND-05 굴절·코스틱·공간/시간/렌즈 필터 | partial | 굴절/색 투과·광자·이차 필터·변형 모션 이력 | 전역 곡면 역해 · 거친 복합 로브/참여 매질 산란의 정밀 확장 | [RENDERING_145.md](RENDERING_145.md) · [RENDERING_151.md](RENDERING_151.md) |
| RND-06 초기 셰이더 준비 비용 | partial | GL/GPU 준비·진단·취소·공유 지역값·코드/네이티브 캐시·GL 독립 프로그램 일괄 제출·비렌즈 가이드 특화 | 복잡 그래프 GL 첫 path 약7.9초/시간 가이드 약7.4초 추가 절감 · WebGPU 첫 path/약2초 가이드 추가 절감 | [RENDERING_145.md](RENDERING_145.md) · [RENDERING_151.md](RENDERING_151.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| RND-07 이전 노멀·mip 이력 | partial | 이전 정점/노멀/UV 접선과 정적 노멀맵 복원 | 시간/월드/시점 의존 노멀 이전 표본 · mip footprint 보존 | [RENDERING_138.md](RENDERING_138.md) |
| RND-08 DFAO·베이크·HWRT | unimplemented | — | 거리장 AO · Lightmass 계열 베이크/라이트맵 · 하드웨어 레이 트레이싱 가속 | [RENDERING_145.md](RENDERING_145.md) |

## 머테리얼

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| MAT-01 함수·레이어·인스턴스·타입 | verified | 함수 추출·typed ports·스택/MI·파라미터·실제 셰이더 | 이 행의 범위는 검증됨 | [MATERIAL_TYPED_FUNCTIONS_078.md](MATERIAL_TYPED_FUNCTIONS_078.md) · [MATERIAL_LAYERS_076.md](MATERIAL_LAYERS_076.md) |
| MAT-02 미리보기·런타임 텍스처 | verified | 개별 출력/메시·환경 미리보기와 네 종류 텍스처 setter | 이 행의 범위는 검증됨 | [MATERIAL_PREVIEW_SCENE_080.md](MATERIAL_PREVIEW_SCENE_080.md) · [MATERIAL_TEXTURE_PARAMETERS_082.md](MATERIAL_TEXTURE_PARAMETERS_082.md) |
| MAT-03 텍스처 고급 설정·도메인 | partial | 2D/Cube/Array/3D 텍스처와 표면 셰이딩 | Sampler State·배열/볼륨 mip · 압축 컨테이너·전용 채널 검사 · 추가 머테리얼 도메인 | [MATERIAL_TEXTURE_FAMILIES_081.md](MATERIAL_TEXTURE_FAMILIES_081.md) |

## 애니메이션

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| ANM-01 그래프·Blend Space·상태·슬롯 | verified | 선택/상태·혼합/레이어·동기·notifies·몽타주 슬롯 | 이 행의 범위는 검증됨 | [ANIMATION_GRAPH.md](ANIMATION_GRAPH.md) · [ANIMATION_MONTAGE_SLOTS.md](ANIMATION_MONTAGE_SLOTS.md) · [ANIMATION_ENUM_SELECTION_069.md](ANIMATION_ENUM_SELECTION_069.md) |
| ANM-02 루트 모션 | verified | 클립/몽타주 추출·모드·물리/중력·2D/3D 이동 | 이 행의 범위는 검증됨 | [ANIMATION_ROOT_MOTION_070.md](ANIMATION_ROOT_MOTION_070.md) |
| ANM-03 3D IK·bind XYZ 제약 | verified | Two Bone/FABRIK/CCD·공간/대상·기준 포즈 제한·SDK/BP | 이 행의 범위는 검증됨 | [ANIMATION_JOINT_LIMITS_154.md](ANIMATION_JOINT_LIMITS_154.md) · [RENDERING_151.md](RENDERING_151.md) |
| ANM-04 골격 리타게팅·베이크 | partial | 리그/체인/기준 포즈·FK/IK·새 클립 베이크 | 커브/모프·이벤트 베이크 · 임의 연산 스택·LOD/Avatar/Muscle · 정지 발·Stride/Pole/접촉 | [ANIMATION_RETARGET_072.md](ANIMATION_RETARGET_072.md) |
| ANM-05 Full Body IK·Control Rig | unimplemented | — | 다중 체인/관절 연결 솔버 · 리그 저작·컨트롤·기즈모·재생/베이크 | [ANIMATION_IK_071.md](ANIMATION_IK_071.md) · [RENDERING_151.md](RENDERING_151.md) |
| ANM-06 시퀀스·녹화 제작 | partial | 시퀀스/타임라인 트랙·키 편집/스크럽·게임 실행 | Take Recorder·다중 actor/컴포넌트 녹화 · 전문 시네마틱 트랙·동기화/베이크 | [ANIMATION_TIMELINE_CONTROLS.md](ANIMATION_TIMELINE_CONTROLS.md) |

## 물리

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PHY-01 2D·3D 물리/콜라이더/질의 | verified | Rapier·중력·충돌/트리거·회전·질량·CCD·모터·공용 SDK | 이 행의 범위는 검증됨 | [PHYSICS_RUNTIME_RESEARCH.md](PHYSICS_RUNTIME_RESEARCH.md) · [CONTACT_LIFETIME_064.md](research/CONTACT_LIFETIME_064.md) |
| PHY-02 관절 프레임·cloth/차량/파괴 | partial | 기본 관절·모터와 형상 편집 | 독립 연결 프레임/기준 각도 · cloth·vehicle·destruction 시스템 | [PHYSICS_RUNTIME_RESEARCH.md](PHYSICS_RUNTIME_RESEARCH.md) |

## 게임 시스템

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| GAM-01 게임 프레임워크·입력·생성 | verified | GameMode/Controller·캐릭터·입력·마우스·생성/풀·배치 보존 | 이 행의 범위는 검증됨 | [AURIC_RUNTIME_FEATURES.md](AURIC_RUNTIME_FEATURES.md) · [AURIC_RUNTIME_SPAWN.md](AURIC_RUNTIME_SPAWN.md) |
| GAM-02 행동트리·Blackboard·계층 FSM | verified | 태스크 Start/Tick/Abort·조건 observer·subtree·서비스·계층 전이 | 이 행의 범위는 검증됨 | [BEHAVIOR_OBSERVERS_SUBTREES.md](BEHAVIOR_OBSERVERS_SUBTREES.md) · [BEHAVIOR_TASK_LIFECYCLE.md](BEHAVIOR_TASK_LIFECYCLE.md) · [HIERARCHICAL_FSM.md](HIERARCHICAL_FSM.md) |
| GAM-03 행동트리 고급 태스크·EQS | partial | 기본 행동트리/감지/태그 실행 | 일반 병렬 결과 집계·FinishAbort/native BTTask · EQS·Smart Object/Mass 계열 | [BEHAVIOR_OBSERVERS_SUBTREES.md](BEHAVIOR_OBSERVERS_SUBTREES.md) |
| GAM-04 Ability·효과/태그 체계 | unimplemented | — | 재사용 ability·cooldown·비용·효과/태그 수명·예측과 제작 UI | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) |

## 네트워크

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| NET-01 복제·RPC·권한·예측 | unimplemented | — | 게임 host/client·소유권·상태 복제/RPC·재접속 · 예측/보정·지연/손실 검증 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) |

## 이펙트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| VFX-01 입자·투사체·GPU 계산 | verified | 입자 모듈·GPU 방출/간접 draw·정렬·탄환 서비스/충돌 | 이 행의 범위는 검증됨 | [GPU_EMISSION_049.md](research/GPU_EMISSION_049.md) · [GPU_EFFECTS_054.md](research/GPU_EFFECTS_054.md) |
| VFX-02 이펙트 고급 저작 | partial | 등록 ParticleSystem·Decal·효과 속성 | 트레일·서브 이미터·시트 애니메이션 고급 모듈 · 범용 VFX 그래프/디버깅 | [WORK_ORDER_051.md](WORK_ORDER_051.md) |

## 게임 UI

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| UI-01 위젯·레이아웃·SVG·입력 | verified | 전용 위젯·모서리/배율/안전 영역·SVG·한글·포커스/이벤트 | 이 행의 범위는 검증됨 | [UI_SCALING_SVG.md](UI_SCALING_SVG.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| UI-02 모바일 조작 UI | verified | 조이스틱·방향/버튼·동시 터치·해제·안전 영역 | 이 행의 범위는 검증됨 | [INPUT_MOBILE_POOL.md](INPUT_MOBILE_POOL.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| UI-03 복합/월드 UI·가상화·지역화 | partial | 기본 위젯 트리·데이터 바인딩 | 재사용 위젯/스타일 자산 · 큰 목록 가상화·월드 UI · 지역화 테이블·입력 접근성 통합 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) |

## 오디오

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AUD-01 믹서·공간 음향·스트리밍 | verified | 버스·노출값·snapshot·RMS·PCM/stream·정지/복귀·앱 분리 | 이 행의 범위는 검증됨 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [WINDOWS_GAME_IDENTITY_108.md](WINDOWS_GAME_IDENTITY_108.md) · [AUDIO_STREAMING_LIFETIME_032.md](research/AUDIO_STREAMING_LIFETIME_032.md) |
| AUD-02 가중 스냅샷·보간 곡선 | verified | 정규화 가중 snapshot·네 곡선·중단/override·공용 SDK/BP·편집기 적용/미리듣기 | 이 행의 범위는 검증됨 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| AUD-03 오디오 고급 DSP/가상화 | partial | gain/filter/compressor·routing/계측 | FX 순서·send/return·reverb/delay/sidechain · voice 우선순위/가상화·native DSP | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) |
| AUD-04 스냅샷/파라미터별 전환 오버라이드 | verified | 대상 snapshot/버스/파라미터별 네 곡선·시작/끝 step·가중 보간·기본값 상속·편집/Undo·공용 C++/BP/AI | 이 행의 범위는 검증됨 | [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |

## C++·블루프린트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| CPP-01 블루프린트 제작/실행·공용 SDK | verified | 변수/함수/매크로·이벤트·타임라인·핀 변환/분할·C++ 공개 | 이 행의 범위는 검증됨 | [BLUEPRINT_SPEC.md](BLUEPRINT_SPEC.md) |
| CPP-02 다중 소스·빌드·웹/모바일 AOT | verified | 외부 C++ 소스·실제 compiler/프로토콜·다중 모듈·Wasm/AOT | 이 행의 범위는 검증됨 | [PROJECT_NATIVE_SOURCES.md](PROJECT_NATIVE_SOURCES.md) · [WEB_GAME_EXPORT_083.md](WEB_GAME_EXPORT_083.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| CPP-03 코드 재적용·네이티브 디버거 | partial | C++ 재빌드·호스트 교체·기본 BP debug/step | 인스턴스 상태를 보존하는 live reload · native debugger/브레이크·스택·스레드 연결 | [BLUEPRINT_SPEC.md](BLUEPRINT_SPEC.md) |

## AI·자동화

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AI-01 원자적 여러 문서 편집 | verified | revision·dryRun·document.patch/files.apply·Undo 공용 계약 | 이 행의 범위는 검증됨 | [AI_ENGINE_API.md](AI_ENGINE_API.md) · [AI_ASSET_TRANSACTIONS_041.md](research/AI_ASSET_TRANSACTIONS_041.md) |
| AI-02 코드/기능 상태 최신 조회 | verified | 안정 ID 원장·로컬 CLI·HTTP 조회/필터·등록 분모 구분 | 이 행의 범위는 검증됨 | [ENGINE_STATUS.md](ENGINE_STATUS.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| AI-03 에디터 확장 API 확대 | partial | 데이터 기반 제작 도구와 공용 schema/명령 | 추가 제작 분야 전용 명령 · 버전 호환 확장 ABI·툴 배포·안전한 코드 확장 | [LIGHTING_TOOLS_128.md](LIGHTING_TOOLS_128.md) |

## 디버깅

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| DBG-01 프레임/컴파일 프로파일러 | verified | 실측 구간/호출·300프레임·셰이더 준비·AI/JSON | 이 행의 범위는 검증됨 | [RENDERING_151.md](RENDERING_151.md) |
| DBG-02 GPU 시간·메모리/크래시 진단 | partial | 리소스 수·일부 GPU Query·C++ host 메모리 진단 | 편집기 GPU timer/스레드 flow · 할당·누수·크래시 덤프·장치 연결 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [HOST_MEMORY_062.md](research/HOST_MEMORY_062.md) |

## 배포·플랫폼

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| BLD-01 Windows·웹 게임 배포 | verified | 독립 앱 ID/오디오·실행파일·정적 웹·C++ Wasm·공개 실행 | 이 행의 범위는 검증됨 | [WINDOWS_GAME_IDENTITY_108.md](WINDOWS_GAME_IDENTITY_108.md) · [WEB_GAME_EXPORT_083.md](WEB_GAME_EXPORT_083.md) |
| BLD-02 Android 빌드·가상 기기 | verified | ARM64/x86_64 APK/AAB·서명/정렬·설치·게임/터치·복귀 | 이 행의 범위는 검증됨 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| BLD-03 iOS 원격 빌드·시뮬레이터 | verified | Xcode 두 대상·C++/물리/UI·반복 오디오·백그라운드 복귀 | 이 행의 범위는 검증됨 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) · [IOS_REMOTE_DISTRIBUTION.md](IOS_REMOTE_DISTRIBUTION.md) |
| BLD-04 실제 휴대폰·스토어 배포 | unverified | 모바일 출력/빌드 경로 있음 | 실물 기기 설치/열/배터리/음향 · Apple 서명·IPA/TestFlight·스토어 배포 | [IOS_REMOTE_DISTRIBUTION.md](IOS_REMOTE_DISTRIBUTION.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| BLD-05 모바일 편집기 | unimplemented | — | 프로젝트 저장/복구·터치 편집·모바일 C++ 제작 제약 · 실제 Android/iOS 에디터 앱 | [MOBILE_EDITOR_BODY_012.md](research/MOBILE_EDITOR_BODY_012.md) |
| BLD-06 번들·패치·협업/소스 관리 | partial | 기본 패키지·의존 리소스 수집·프로젝트 텍스트 | 증분 콘텐츠 번들/패치·검증/롤백 · 에셋 diff/merge·VCS 작업 UI | [WORK_ORDER_051.md](WORK_ORDER_051.md) |

## 성능·용량

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PER-01 PC120·모바일60 전체 프레임 | unverified | PC 단일 재현에서 일부 통과·여러 CPU/GPU 비용 절감 | 대표/고부하 장면 p95/p99·장시간 안정성 · 실제 모바일 지속60·발열/배터리 | [SPAWN_CATALOG_LIFETIME_067.md](research/SPAWN_CATALOG_LIFETIME_067.md) · [MOBILE_PERFORMANCE_BUDGET.md](MOBILE_PERFORMANCE_BUDGET.md) |
| PER-02 용량·캐시·설치 한 개 유지 | verified | 검사 빌드/프로필 정리·공유 캐시32·이전 설치 자동 정리 | 이 행의 범위는 검증됨 | [USER_INSTALL_151.json](research/USER_INSTALL_151.json) · [INSTALL_RETENTION_114.md](INSTALL_RETENTION_114.md) |
| PER-03 대규모 월드·장시간 RAM | unverified | 일부 자원 수명·큐/서명/업로드 개선과 소규모 재현 | 대규모 메시/스켈레톤/탄막·전환 반복 · 프로세스 전체 RAM/VRAM 장기 증가 원인 종결 | [MEMORY_CONTROL_060.md](research/MEMORY_CONTROL_060.md) · [HOST_MEMORY_062.md](research/HOST_MEMORY_062.md) |

## 연구 대조

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| RES-01 Unreal/Unity 전체 본문·API 대조 | partial | 출처 원장·개별 본문/소스 대조·증거/미독 경계 | 전체 discovery 분모·추가 버전/API/미디어 대조 · 전체 독립 분석 gate | [RESEARCH_STATUS.md](research/RESEARCH_STATUS.md) · [ANALYSIS_PROTOCOL.md](research/ANALYSIS_PROTOCOL.md) |

