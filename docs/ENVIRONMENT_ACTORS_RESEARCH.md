# 환경 Actor와 렌더링 연결 — 2026-10-03

이 기록은 실제 확인한 공식 문서 본문과 HBEngine의 저장·컴포넌트·렌더링 계약을 연결한다. 기존 환경 팝업의 전역 숫자를 늘리는 대신, 사용자가 Outliner에서 이름·부모·Transform·활성화·컴포넌트를 관리할 수 있는 별도 환경 오브젝트를 사용한다. 누적 엔진 요구 전체를 이 분야로 축소하지 않는다.

## 확인한 자료와 적용

| 실제 본문 자료 | 확인한 역할/조작 | HBEngine 연결 |
| --- | --- | --- |
| [Epic Sky Atmosphere](https://dev.epicgames.com/documentation/en-us/unreal-engine/sky-atmosphere-component-in-unreal-engine) | Place Actors에서 대기·태양광·하늘광을 배치한다. 대기 광원 인덱스로 태양/달을 구별하고 Ctrl+L/Shift를 이용해 방향을 조절한다. 부모 Transform도 대기 배치에 관여한다. | SkyAtmosphere 컴포넌트를 별도 Actor에 붙인다. DirectionalLight의 atmosphereSunLight/index, 부모를 포함한 월드 방향을 sky shader의 두 원반과 연결한다. |
| [Epic Directional Lights](https://dev.epicgames.com/documentation/en-us/unreal-engine/directional-lights-in-unreal-engine) | 무한히 먼 광원의 평행광이며 방향·밝기·색상·그림자를 편집한다. | 태양 방향은 Actor의 Y-up 월드 회전에서 계산한다. Actor 위치를 태양 방향으로 해석하지 않는다. 기존 DirectionalLight의 실제 장면 조명과 동일 오브젝트를 참조한다. |
| [Epic Sky Lights](https://dev.epicgames.com/documentation/en-us/unreal-engine/sky-lights-in-unreal-engine) | 하늘의 색과 환경 반사를 연결한다. 자동 캡처/명시적 재캡처, 큐브 해상도와 비용을 분리한다. | SkyLight 색상·밝기·반사 배율·자동 캡처·64/128/256/512 해상도를 편집한다. 실제 sky/cloud GPU 장면에서 PMREM을 만들고 재사용한다. |
| [Epic Volumetric Cloud](https://dev.epicgames.com/documentation/en-us/unreal-engine/volumetric-cloud-component-in-unreal-engine) | 대기·태양광·하늘광·구름이 서로 연결되며, 구름 층/볼륨 머테리얼/추적 품질을 분리한다. | VolumetricCloud 컴포넌트의 구름량·색상·불투명도·층 높이·두께·범위·바람이 공유 구름 미리보기에 적용된다. |
| [Epic Exponential Height Fog](https://dev.epicgames.com/documentation/en-us/unreal-engine/exponential-height-fog-in-unreal-engine) | Actor의 높이가 안개 기준 높이이고 밀도/높이 감쇠/색상/최대 불투명도/시작·제외 거리를 편집한다. | 동일 속성을 저장하고 실제 월드 높이·카메라부터 표면까지의 거리를 사용하는 shader 밀도 적분으로 적용한다. |
| [Epic Environment Light Mixer](https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-light-mixer-in-unreal-engine) | 전용 창이 장면의 환경 컴포넌트를 참조한다. Actor 추가/삭제 상태와 속성 상세 수준을 함께 표시한다. | 환경 관리 UI는 Scene의 오브젝트를 참조해야 한다. 별도 UI 전용 환경 값 사본을 만들지 않는다. |
| [Three PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) 및 설치된 Three 0.180.0 소스 | Scene 캡처를 roughness별 환경 맵으로 가공한다. 해상도·카메라·자원 해제를 제어한다. | `fromScene`의 결과를 해당 렌더러의 렌더 직전에 Scene.environment에 연결한다. 같은 Scene을 그려도 WebGL context마다 target/generator를 개별 소유한다. |

## 저장·AI 계약

- Actor 종류는 `skyAtmosphere`, `skyLight`, `volumetricCloud`, `heightFog`; 대응 컴포넌트는 `SkyAtmosphere`, `SkyLight`, `VolumetricCloud`, `ExponentialHeightFog`이다. 일반 오브젝트와 동일한 ID/이름/부모/Transform/표시/컴포넌트 구조를 사용한다.
- `scene.environment.mode='actors'`는 환경을 장면 오브젝트에서 읽는 명시적인 권한이다. 마지막 환경 Actor를 지워도 숨겨 둔 legacy 환경이 다시 생기지 않는다.
- 기존 Scene의 mode가 없고 환경 컴포넌트도 없으면 기존 `scene.environment`와 `surface.light`가 렌더링의 호환 경로다. 로드/렌더 과정은 원본 JSON을 변경하거나 Actor를 자동으로 생성하지 않는다.
- 기존 Scene에서 환경 Actor를 명시적으로 배치하면 해당 Scene은 `actors` 모드로 저장한다. 삭제·되돌리기도 같은 Scene 편집 이력에 들어가야 한다.
- `environmentActorPreset(environment,surface,{idPrefix})`는 명시적인 변환/새 Scene 배치를 위한 데이터만 반환한다. 기존 객체를 지우거나 파일에 쓰지 않는다. 호출자는 고유 prefix와 기존 태양광의 재사용/대체를 결정한 뒤 하나의 편집 트랜잭션으로 적용한다.
- 스키마는 `componentDefinitions`를 읽으므로 인간 Inspector와 AI 컴포넌트 편집이 동일한 필드 이름/기본값/검증을 사용한다. 변환 및 컴포넌트 값은 JSON으로 읽고 수정할 수 있다.
- 여러 SkyLight는 밝기를 합산하고 색상을 밝기 비율로 혼합한다. 대기/구름/높이 안개는 활성 상태의 우선순위가 높은 층 하나를 사용한다. 같은 우선순위는 Scene 순서가 우선이다. 태양/달은 인덱스별 가장 밝은 활성 DirectionalLight를 사용한다.
- 부모의 표시를 끄면 자식 환경도 비활성화한다. 부모 회전은 태양 방향, 부모 위치는 안개 기준 높이, 부모 Transform은 구름 위치/회전/크기에 반영된다.

## 실행·뷰포트 통합

`applySceneEnvironment({...})`는 에디터와 Player가 공유한다. 실제 렌더 직전에 Scene/Actor 상태를 읽어야 Blueprint/C++의 enabled/색상/밝기/회전과 런타임 생성·삭제도 반영된다.

`syncSkyToCamera({skyDome,cloudGroup},camera,delta)`는 카메라가 멀리 이동해도 하늘이 작은 반구의 끝으로 사라지지 않게 하고 안개 카메라 위치·구름 바람을 갱신한다. 하늘 반경은 카메라 far의 85%이며 카메라 중심을 따라간다. 구름은 카메라 주변 XZ와 Actor 오프셋을 사용한다. 기존 별도 `cloudGroup.rotation` 누적 경로는 중복 실행하지 않는다.

높이 안개는 재질의 기존 `onBeforeCompile`와 `customProgramCacheKey`를 보존한다. 색상/노드 머테리얼을 먼저 처리한 후 표준 fog chunk를 대체한다. World/instance/batching 변환을 적용한 표면 위치와 카메라의 실제 거리를 사용한다. 시작 거리부터 표면까지 지수 높이 밀도를 적분하고 최대 불투명도와 제외 거리를 적용한다. 표준 안개가 사용되지 않는 재질/ShaderMaterial은 별도의 fog shader 연동 대상으로 유지한다.

하늘광은 기본 RoomEnvironment 반사 대신 실제 sky shader와 구름 mesh를 별도 캡처 Scene에서 렌더한다. SkyLight 색상은 캡처를 tint하고 밝기×반사 배율은 IBL 강도를 제어한다. Actor digest가 같으면 PMREM을 재생성하지 않는다. 자동 갱신은 변경 중 250ms 간격으로 제한하고, 자동 캡처를 끈 경우 기존 target을 유지한다. 수동 `recaptureSceneEnvironment(scene)`은 다음 갱신을 요청한다. `SkyLight` 밝기 0/비활성화/삭제는 환경 반사를 제거하고 소유 target을 해제한다.

환경 Actor와 Scene의 논리 데이터는 기본·추가 뷰포트가 공유하지만 GPU 캡처 텍스처는 공유하지 않는다. `scene.userData.skyCaptures`는 Renderer를 키로 하며 각 항목이 target/generator·변경 digest·재캡처 시각을 따로 소유한다. 각 뷰포트는 렌더 직전에 자기 context의 환경 맵을 Scene.environment에 연결한다. `skyCapture`는 현재 연결한 항목을 가리키는 진단 별칭이며 캡처의 단일 소유자가 아니다. 같은 캔버스를 OS 창으로 옮기는 경우 Renderer를 교체하지 않으므로 해당 캡처도 유지한다.

`recaptureSceneEnvironment(scene)`은 현재 등록된 모든 Renderer의 항목에 dirty를 표시한다. 추가 뷰포트를 닫을 때는 `releaseSceneEnvironmentRenderer(scene,renderer)`로 해당 target/generator와 legacy 호환 캡처만 해제한다. 다른 뷰포트의 캡처는 유지한다. Scene 역할 재구성/Player Scene 종료/편집기 종료에는 `disposeSceneEnvironment(scene)`가 등록된 모든 항목을 해제하고 저장해 둔 legacy 맵을 복원한다. 기본 Renderer의 legacy 맵을 다른 context에서 그대로 사용하지 않으며, 추가 Renderer는 자기 context의 호환 캡처를 만든다.

환경 Actor는 editorHelper 표식으로 뷰포트 선택을 지원한다. Game/Player 표시에서는 이 표식을 숨긴다. 명시적으로 배치한 Ground/Plane는 Scene Actor이고, 임시 편집기 바닥은 자동으로 다시 표시하지 않는다.

## 검증과 다음 렌더 구현

`node tools/check-environment-actors.mjs`는 33개 검사로 legacy 원본 보존, actor 권한/삭제, 기본 컴포넌트·검증, Y-up 태양·부모 변환·2광원, 여러 하늘광, 우선순위, 높이 밀도 적분/거리, 노드 재질 hook/키 보존, 카메라 상대 하늘, 구름 속성, 캡처 digest/자동·수동/해제 수명주기와 Renderer별 캡처 격리를 확인한다. 캡처 스케줄/해제 검사는 실제 Three target과 캡처 callback 대역을 쓰며 GPU 영상 검증과 구별한다. 실제 shader 컴파일/반사색/저장·되돌리기·Player 실행 증거는 통합 뷰포트 검사에 기록한다.

현재 하늘은 색상/태양 고도와 두 광원 원반을 렌더하는 sky shader이고, 구름은 기존 mesh 기반 미리보기를 Actor 속성으로 제어한다. Epic의 행성 곡률·Rayleigh/Mie LUT·volume material raymarch·구름 자체 그림자·공간 volumetric fog·Distance Field AO·baked Lightmass·다중 안개 층·원거리 geometry 캡처는 별개의 렌더 세부다. 실제 PMREM/높이 밀도 shader 구현과 이 미구현 항목을 같은 것으로 기록하지 않는다. 이 항목도 전체 엔진 세부 구현 지도에서 계속 관리한다.
