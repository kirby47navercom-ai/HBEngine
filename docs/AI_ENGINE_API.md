# 처음 연결하는 AI

월드 제작 상태는 `world.preview.read {path,offset?,limit?}`로 읽어요. 실제 기하 ID·인스턴스 용량·직전 부분 갱신 수·선택 ID 페이지를 반환하고 원본/revision/Undo는 바꾸지 않아요. 지형·폴리지 편집 명령과 사람 UI는 같은 부분 갱신 경로를 사용해요. [제작 비용 묶음과 측정 범위](research/WORLD_EDIT_BATCH_1062.md).

[빠른 시작](AI_START.md)을 먼저 읽고 `node tools/hb.mjs context "작업명"`으로 필요한 소스·근거·검사 후보를 찾아요. 이 문서 전체를 시작 전 필수로 읽지 않아요. 실행 중인 엔진의 스키마도 `node tools/hb.mjs schema --section blueprint --url URL`처럼 필요한 부분만 출력할 수 있어요.

# 165 — 새 제작 분야

2026-10-19: `/api/schema`의 `raySurfaceHistory.normalPose`, `uvFootprint.triangleCoordinates`, `opticalSpread.pixelProjection/reflection`은 상대 기하·조건별 노멀 이력·렌즈 픽셀 기저·현재/이전 로브 footprint의 선택과 비용을 제공해요. 씬/그래프 설정과 C++/BP ABI는 유지해요. [렌더링 수식 편집 규칙](GPU_SHADER_EDITING.md), [기하 이력](research/RAY_HISTORY_SCALE_654.md), [렌즈](research/LENS_PIXEL_FOOTPRINT_664.md), [거친 반사](research/ROUGH_REFLECTION_FOOTPRINT_669.md)를 함께 참고해요.

메시·지형·폴리지·LOD·내비·EQS·능력·효과·문자열/스타일 자산 예제를 `/api/schema`에서 읽는다. `world.mesh.edit/simplify`, `world.terrain.brush`, `world.foliage.scatter/erase`, `navigation.bake`, `prefab.override/revert`, `tilemap.rules.resolve`, `rig.clip.retarget(positionMode=pose)`는 기존 revision/dryRun/Undo를 공유한다. 모델 하위 에셋은 `/api/asset/info`의 subassets, `/api/asset/model-override` POST로 다룬다. 오프라인 패치는 hb CLI patch.create/patch.apply를 사용한다. [상세 계약/제약](ENGINE_WORK_165.md).

2026-10-12: [화면 밖·중첩 굴절, 추가 셰이딩·후처리·다중 바운스 GI](RENDERING_098.md). 공용 Surface 10입력/함수·레이어·MI·C++/BP/AI, 깊이/HDR 층 캡처·프로브 굴절, sheen/이방성/박막/specular, 색 보정·비네트·색수차·그레인, 프로브 1~8바운스와 정적 재사용을 연결했어요. 세 실행기 픽셀·기존2D/파티클/그림자 회귀와 제한·비용·지정 읽기 범위는 기계 기록에 있어요. 설치 영수증은 별도 기록하며 전체 corpus/API·Lumen/재귀 RT·전역 FPS를 완료로 승격하지 않아요.

2026-10-12: [색 흡수·벡터 파라미터·색 분산](NATIVE_VOLUME_097.md). Materials SetVector/SetColor C++·BP2·AI, 공용 Surface/속성·함수/레이어/MI·GLSL/TSL/HLSL, Glass/TintedGlass/Prism을 연결했어요. 1,000회 typed uniform·clone·다중 슬롯 사전 거부와 전체 GPU60노드/기존2D·조명·파티클·프로브 회귀, 실제 세 실행기의 C++/T·V키 BP·흡수/분산/재사용·오류0/종료0를 검증했어요. 설치 갱신 후 영수증을 별도로 남기며 전체 corpus/FPS/실기기·남은 셰이딩/후처리/GI를 완료 처리하지 않아요.

2026-10-12: [투과·두께·굴절](NATIVE_TRANSMISSION_096.md). 기존 Surface/속성·함수/레이어/인스턴스와 SetFloat CPP/BP/AI에 Thickness·Transmission 별칭을 연결하고, DirectX HDR 불투명 장면 캡처/mip·IOR/노멀·거칠기와 해제를 구현했어요. WebGPU 투과 노드와 그리기 목록 활성화를 함께 고쳤어요. 실제 세 실행기 C++/T키 BP·재사용·오류0, GPU60노드 회귀와 최종 sampler/Bloom 조합·공용 검증은 기계 기록에 있어요. 중첩/화면 밖/깊이 추적·체적 흡수/분산과 남은 셰이딩/후처리/GI·설치 갱신 순서는 유지해요.

2026-10-12: [코팅층·분리 노멀·IOR](NATIVE_COATING_095.md). 기존 Surface/속성·함수/레이어/인스턴스와 SetFloat CPP/BP/AI를 DirectX 직접광/프로브 및 GLSL/TSL에 연결해요. AO/Clearcoat/CoatRoughness/IOR 별칭·분리 노멀·값 변경 재사용, 실제 세 실행기 C++/C키 BP와 마지막 레이어/MI 검증을 기록해요. 네이티브 투과·추가 셰이딩/GI 및 설치 갱신 순서는 유지해요.

# 사람과 AI가 함께 편집하는 HBEngine

2026-10-12: [DirectX 일반 텍스처](NATIVE_MATERIAL_TEXTURES_094.md). 기존 cube/array/volume 에셋·노드·함수/레이어/MI와 Materials SetTexture C++·BP·AI 제작 계약을 네이티브 업로드/HLSL에 연결해요. GPU 여섯 면·mip LOD·레이어/볼륨·R 반복/클램프와 실제 Windows 네 종류 교체·프로그램/자원 수명 검증을 기록해요. 전체 corpus/FPS/실기기·설치 갱신은 승격하지 않아요.

2026-10-11: [반사 프로브](NATIVE_PROBES_093.md). ReflectionProbe의 실제 제작 필드/검증과 ReflectionProbes C++·BP3, 기존 Components/document.patch·Undo/Save를 공유해요. DirectX HDR/GGX compute/SH9/BRDF·box/fade·두 프로브와 브라우저 PMREM·한 프로브, 자원 진단/해제·실행 검증 및 미구현 경계를 명시해요.

2026-10-06: [실행 중 생성·찾기 계약](AURIC_RUNTIME_SPAWN.md). 공용 C++ 선언에서 생성한 Scene Spawn/Destroy/클래스·태그·ID 찾기 노드를 기존 그래프 API로 편집해요. BP 부모/클래스 기본값·Prefab 로컬 ID/컴포넌트 오브젝트 참조·PooledActor.maxInactive는 사람 UI와 동일한 저장 schema와 검증을 사용해요. 기존 ActorPool API도 유지해요.

2026-10-05 추가: [구간 알림·이벤트 인자](ANIMATION_NOTIFIES.md). schema.animationGraph.sync.notifyStates/notifyParameters는 실제 이름/자료형/한도·Begin/Tick/End/수명 계약을 제공해요. 문서 패치·revision/dryRun·Undo/Save는 사람과 같고 runtime.state의 animationGraph.notifyStates에 현재 인스턴스/시계/진행률을 제공해요.

2026-10-05 추가: [동기화·마커·알림](ANIMATION_SYNC.md). schema.animationGraph.sync와 document.patch는 Sequence Player의 안정적 마커/알림 ID·공용 검증·revision/dryRun·Undo/Redo/저장을 공유해요. runtime.state의 animationGraph.syncGroups는 리더/위상/방식·참여자/시계를 제공하며 BP/C++3개 조회도 같은 실행 상태예요.

2026-10-05 추가: [포즈 상태·전이](ANIMATION_STATES.md). schema.animationGraph.states와 `anim.state.add/remove`, `anim.transition.add/remove`는 사람의 상태/전이/포즈 편집과 같은 검증·revision/dryRun·Undo/Redo를 사용해요. 세부/연결은 document.patch로 다뤄요. runtime.state의 animationGraph.machines는 인스턴스 key·현재/다음·시계·전이·가중치/한도를 제공해요. C++12개와 같은 실행기이며 Integer/Trigger·중첩/공유 클립·콜백 정지 의미를 계약에 기록해요.


2026-10-05 추가: [2D IK](2D_IK.md). schema.spriteRig.ik는 실제 솔버/한도/좌표·평면/체인·업데이트 계약을 제공해요. `rig.ik.add/remove/reorder`와 document.patch는 ID·expectedRevision·dryRun·검증·Undo/Redo·저장을 공유해요. `runtime.state.spriteSkin[].ik`는 작성 데이터와 다른 실제 목표/가중치/도달/계산 한도 snapshot이에요. C++/BP12개는 같은 서비스와 staged getter를 사용해요. clock/reset 요청에는 전체 뼈/솔버 데이터를 매 프레임 보내지 않아요.


2026-10-05 추가: [2D 스프라이트 리그](2D_SPRITE_RIG.md), [시작 상태](STARTUP_STATE.md). schema.spriteRig와 spriterig 에셋·rig.bone/mesh/weights 명령은 안정적 ID·expectedRevision·dryRun·Undo/Redo를 사용해요. runtime.state.spriteSkin과 native 요청은 같은 실제 포즈를 조회해요. clock/reset 요청에는 이 전체 snapshot을 보내지 않아요. 저장된 값으로 Undo가 돌아오면 dirty를 해제해요. 자동 UIWidget은 사용자 Construction 전에 준비돼 첫 프레임 대기가 필요하지 않아요.


2026-10-05 추가: [계층 FSM](HIERARCHICAL_FSM.md). `state.add/reparent/remove`는 안정적인 상태 ID·expectedRevision·dryRun·Undo/Redo를 사용해요. 활성 계층은 `gameplayDebug.stateMachine.active`의 부모→말단 `{id,name,time}` 배열이에요. UI와 AI는 같은 부모/조건/삭제 검증을 사용하며 사용자 C++ 조회·명령은 같은 실행 상태에 연결돼요.

2026-10-05 추가: [UI 배율·안전 영역·SVG](UI_SCALING_SVG.md). schema.ui.scaling/images와 실제 widget 정의를 공유해요. scaleRule/scaleMatch/safeAreaPadding 및 Image·Button·TouchButton의 vectorTexture/imageFit/imageRendering은 revision 보호 document.patch/dryRun·Undo/Redo·저장으로 편집해요. SVG 의존성·폴더 이름 변경·소수 배율 선택도 같은 런타임 규칙이에요.

2026-10-05 추가: [2D 정렬·마스크·등각 타일과 단축키](2D_RENDERING_SHORTCUTS.md). 공용 schema의 render2d/shortcuts와 실제 컴포넌트 정의를 사용해요. `editor.shortcuts.get/set`은 전체 JSON·expectedRevision·dryRun·충돌 거절과 프로젝트 디스크 저장을 제공해요. 정렬 레이어의 안정적 ID, 단축키 문맥/두 키/프로필, C++ 선언에서 생성한 스프라이트 서비스 10개는 사람 UI와 동일한 검증을 사용해요. 단축키 프로필은 장면 Undo와 별개의 설정이에요.

AI 친화성은 블루프린트 파일에 한정하지 않는다. 프로젝트, 에셋, 장면, 컴포넌트, 머테리얼, 애니메이션, 실행 상태가 버전 있는 데이터로 표현되고, UI와 자동화가 같은 검증·실행 취소·저장 경로를 사용한다. 화면 좌표와 한국어 표시 이름을 데이터 식별자로 쓰지 않는다.

## 현재 연결

- `GET /api/schema`: 생성 가능한 에셋의 예제, 컴포넌트 필드·범위·기본값, 클래스 상속, 블루프린트 노드와 핀, 머테리얼 노드, 편집기 명령과 build 타깃/구성/포함/출력/API 계약. 실제 UI/런타임 정의를 가져오므로 별도 AI용 사본이 없다.
- `GET /api/project?recursive=1`: 파일, 폴더, 종류, 안정적인 에셋 UUID. 생성·이름 변경·가져오기는 기존 `/api/asset/create`, `/api/rename`, `/api/import`를 공유한다.
- `GET /api/asset/info?path=...`: SHA-256, 재가져오기 revision, 직접 의존성과 역참조, 누락된 파일. `POST /api/asset/reimport`는 `{paths:[...]}`를 받고 간접 영향 목록을 돌려준다.
- `GET /api/automation`: 연결된 편집기 인스턴스와 각 창의 프로젝트, 열린 문서, 선택, 실행 상태. 인스턴스가 여러 개면 `clientId`를 명시해야 한다.
- `POST /api/automation/command`: `{clientId,requestId,method,params}`. 반환된 `id`를 `GET /api/automation/command?id=...`로 확인한다. 같은 `requestId`와 내용은 중복 실행하지 않는다.
- `document.get`: 저장하지 않은 현재 편집 데이터와 SHA-256 revision을 반환한다. 디스크 파일만 읽어 사람의 진행 중인 편집을 놓치지 않는다.
- `document.patch`: `expectedRevision`과 JSON Patch의 `test/add/replace/remove`를 사용한다. 모든 작업을 복사본에 적용하고 최종 에셋을 검증한 뒤 한 번의 Undo 항목으로 반영한다. `dryRun:true`는 적용하지 않고 검증 결과를 반환한다.
- `document.save`, `editor.undo`, `editor.redo`: 같은 revision 보호를 사용한다. 저장할 때 디스크의 이전 내용도 대조하고 `Saved/Backups`에 원본을 남긴다.
- `scene.select`, `document.open`, `native.build`, `runtime.play/stop/pause/resume/input/openScene/state`: UI의 실제 편집·실행 함수를 사용한다. 런타임 상태는 현재/대기 장면, 차원, 뷰 모드, 환경, 오브젝트, 게임 프레임워크, 시간, 로그를 JSON으로 반환한다. 객체의 `gameplayDebug`에는 소유 에셋·blackboard/parameters·BT 상태·FSM 상태·montage/sequence 시간·navigation 경로/상태·perception 자극·particles 수가 포함된다.

## C++ 실행 전송과 비용

`schema.read`의 `build.nativeSources`는 프로젝트 `Source/` 전체 수집·상대 include·보조 파일 캐시 무효화·모바일 모듈 상태 격리와 크기/시간 제한을 제공해요. `native.build`, 화면 없는 실행, Windows/Android/iOS 출력이 같은 소스 스냅샷을 사용해요. 대량 타일 편집은 `tileSetMany` / `hb::Tilemaps::SetTiles`의 좌표·인덱스 배열로 한 번에 전달해요. [소스·타일 계약](PROJECT_NATIVE_SOURCES.md)을 참고해요.

사람의 Play와 AI의 `runtime.play`는 같은 `native-transport.js`를 사용한다. C++ 빌드 결과 `metadata.workerProtocol:3`은 첫 전체 입력 이후의 변경분과 변경된 객체만 반환하는 계약이다. 이전 메타데이터 1/2는 기존 전체 요청을 유지한다. BP 노드/에셋을 AI가 변경할 때 이 내부 전송 캐시를 에셋에 저장하지 않는다.

직접 `/api/native/call`을 호출하는 도구는 기존 `{token,request:{objects,...}}` 전체 요청을 계속 사용할 수 있다. 변경분 전송은 `request.worldTransport:1`, `worldId`, `baseSequence`, `worldSequence`를 사용하며 첫 요청은 `baseSequence:0/worldSequence:1/objects`다. 후속 요청은 objects를 생략하고 `objectPatch`와 이전/다음 sequence를 전달한다. 같은 worker를 쓰는 여러 BP는 같은 Play 세계의 전송 상태를 공유한다. 응답의 worldSequence 확인 후에만 기준을 갱신하고, 오류/유실 응답 이후 다음 명시적 호출은 전체 입력으로 동기화한다. 함수 실행을 자동 재시도하지 않는다. 새 Play/장면은 명시적 reset으로 기존 C++ 수명을 정리한다.

응답의 `objects:[]`는 C++ Transform/공개 속성에 변화가 없다는 뜻이다. 전체 장면이 사라졌다는 뜻으로 해석하지 않는다. `transport`의 `upstreamMode/upstreamBytes`, worker `mode/bytes`, `prepareMs/rpcMs`, `replyBytes/returnedObjects`는 전송/반환 비용이다. GPU/화면 표시 FPS로 해석하지 않는다. 전체 장면 검증·형상 질의·JSON 한도/복구는 [경량화 계약](PERFORMANCE_BUDGETS.md)에 연결한다.

후속 worker는 `transport.parseMs/patchMs/syncMs/invokeMs/snapshotMs/workerMs`를, host는 `decodeMs/validateMs/replyValidationMs`를 반환한다. AI도 전체 왕복이 느린지 실제 사용자 함수가 느린지 이 값으로 구분할 수 있다. 호출/프로세스 대기와 출력 직렬화가 포함된 `rpcMs`와 내부 `workerMs`를 더하지 않는다. 이전 worker에서 없는 필드는 미측정으로 처리한다. 실행 진단을 BP 에셋의 선언/핀/기본값에 저장하지 않는다.

호스트 메모리·참조 진단은 `GET /api/native/inspect`로 읽는다. 현재 편집기 프로젝트 또는 개발 패키지에서 가능하고 일반 release는 제공하지 않는다(smoke 격리 검사 예외). PID/Node 버전·바이트 단위 rss/heapTotal/heapUsed/external/arrayBuffers와 모듈별 world행·생성 카탈로그 참조 수를 반환하며 토큰/경로/세계 내용을 노출하지 않는다. arrayBuffers는 external에 이미 포함된다. 프로세스 private와 live heap을 같은 값으로 취급하거나 둘을 합산하지 않는다. 호출은 측정 비용이 있어 프레임마다 실행하지 않는다.


## 입력·스프라이트·타일 제작

`schema.input`은 실제 8개 트리거, 유지/탭/반복 시간 기본값, 5개 이벤트와 모디파이어 종류를 반환한다. 입력 액션의 시간·조합 액션 경로·처리 순서는 사람이 쓰는 입력 에셋 편집기와 같은 데이터다. `schema.sprites`는 픽셀/피벗/테두리 좌표, 분할 방식과 기존 분할 적용 방식을 설명한다.

`sprite.slice`는 `{path,expectedRevision,settings,method?,dryRun?}`을 받는다. settings.mode는 `size/count/automatic`, method는 `smart/safe/delete`다. Smart는 겹친 기존 분할의 ID·이름·pivot·border·출력 에셋 참조를 보존한다. `sprite.trim`은 `{path,expectedRevision,slice?,threshold?,dryRun?}`이며 slice는 화면 목록 인덱스 대신 고유 ID다. 생략하면 본문 rect의 투명 여백을 자른다. 두 명령은 UI와 같은 이미지 픽셀/검증/Undo를 사용하며 비동기 픽셀 읽기 후 revision도 다시 확인한다. 결과 데이터가 같으면 `noChange:true`를 반환하고 빈 Undo 항목과 새로운 dirty 상태를 만들지 않는다.

분할 에셋의 `sheet/sliceId`가 원본의 현재 분할을 참조한다. 생성된 일반 .hbsprite.json을 애니메이션과 SpriteRenderer에 사용하고 Smart 재분할 시 기존 파일 경로를 유지한다. 파일 이동·의존성·패키지는 sheet/chordAction/context 참조를 추적한다.

`schema.blueprint.nodes`의 입력 액션 6개·타일맵 12개 공용 함수는 `hb::Input`과 `hb::Tilemaps`의 C++ 선언에서 생성된다. `runtime.state`의 오브젝트에는 원본과 분리한 `runtimeTilemap/tilemapDirty/tileColliders`가 있다. Play 변경을 원본 문서에 저장하려면 자동 저장으로 간주하지 말고 명시적인 저작 변경을 작성한다. 좌표·시간·갱신 순서와 검증은 [구현 계약](INPUT_SPRITE_TILEMAP.md)에 기록한다.

## 뷰포트와 독립 작업창

`GET /api/schema`의 `viewport`는 `directions/modes/flags/defaults/positionLimit`을 제공한다. 방향은 `3d/2d/top/bottom/front/back/left/right`, 보기 모드는 `lit/unlit/wireframe/lighting/detailLighting/normals`다. 표시 이름 대신 이 key를 사용한다. `id`를 생략하면 기본 뷰포트 `scene`이며 추가 뷰포트 ID는 `editor.state.layout`의 작업창 ID에서 조회한다. 다른 에셋 편집기 ID를 레벨 뷰포트 ID로 사용하면 거부된다.

| 편집 명령 | 입력과 결과 |
| --- | --- |
| `viewport.get` | `{id?}` → `id/direction/presentation/state/bookmarks/piloting`. state는 실제 카메라의 position/target/quaternion/up/projection/zoom/near/far 및 조작 settings, 원근에서는 fov도 포함한다. piloting은 편집기의 현재 Camera Actor 조종 ID다. |
| `viewport.configure` | `{id?,direction?,presentation?,controls?,state?}`. presentation과 controls는 부분 설정이다. 반환값은 적용된 `id/state/presentation`이다. 잘못된 방향·보기 설정·카메라 상태를 거부하고 적용 도중 실패하면 이전 카메라·표시·조작 상태로 되돌린다. 복원 이벤트는 조종 중인 Actor를 쓰거나 탐색 이력을 추가하지 않는다. |
| `viewport.action` | `{id?,action}`. 허용 값은 `focus/game/realtime/immersive/screenshot/pilot/unpilot/align-object/align-camera/camera/floor/pivot-center/pivot-reset/surface-snap/surface-normal`이다. 반환값은 editor.state와 같은 편집기 상태다. |
| `viewport.bookmark` | `{id?,slot,action}`. slot은 정수 0~9, action은 `save/restore`; 결과는 `{slot,state}` 목록이다. 저장되지 않은 슬롯 복원은 거부된다. 같은 방향 복원도 Actor 조종을 먼저 종료한다. |
| `window.detach` | `{id?}`. 생략하면 focusedWindow를 별도 OS 창으로 분리하고 편집기 상태를 반환한다. 알려진 작업창 ID만 허용하며 창을 열지 못하면 오류다. |
| `window.redock` | `{id?}`. 해당 작업창을 합치고, 생략하면 모든 분리 창을 합친다. 편집기 상태를 반환한다. |

`viewport.configure`에서 `state`를 전달하면 그 상태의 카메라 자세·FOV/clip을 복원한다. 이때 `presentation.camera`가 state를 덮어쓰지 않는다. `state`가 없는 `presentation.camera` 부분 변경은 대상 카메라의 실제 FOV/near/far와 합쳐 검증한다. state 복원 뒤 표시 설정에 남은 옛 far/near를 기준으로 잘못된 클립을 허용하거나 유효한 요청을 거부하지 않는다. `state.projection/direction`이 현재 뷰와 다르면 맞는 `direction`도 함께 지정한다. 회전 quaternion과 up은 검증 뒤 정규화한다. 카메라/표시 변경은 저작 에셋의 revision을 바꾸지 않지만 `camera`, `align-object`, `floor`처럼 오브젝트를 만드는/옮기는 동작은 Scene 편집 이력과 미저장 데이터에 반영된다. 그런 동작 후에는 `document.get`으로 새 revision을 조회한 뒤 `document.save`한다. 북마크 복원이나 시점 이동을 Scene 저장으로 대신하지 않는다.

`game/realtime/surface-snap/surface-normal`은 토글이다. gameView·realtime을 특정 값으로 만들려면 `viewport.configure`의 presentation에 Boolean을 지정한다. `pilot/align-camera`는 선택 오브젝트의 Camera 컴포넌트를 사용하고 기본 뷰포트에서 동작한다. 추가 뷰포트의 조종을 지원한다고 가정하지 않는다. `screenshot`은 해당 캔버스의 PNG 다운로드를 요청하며 명령 결과에 이미지 바이트를 반환하지 않는다. `viewport.configure/action`은 Play 중이나 사람이 드래그·대화상자를 조작 중이면 변경을 거부한다.

창 분리는 같은 문서·DOM·캔버스를 다른 Window/Document로 옮긴다. 별도 편집기 인스턴스나 문서 복사본을 만들지 않으므로 같은 clientId와 문서 revision을 사용한다. `editor.state.windows.detached`는 분리한 작업창 ID 목록, `windows.count`는 현재 분리 창 수다. 기본 콘텐츠 브라우저는 `project`, 사이드바는 `outliner/inspector`이며 에셋 편집기는 조회한 실제 ID를 사용한다. 창 닫기/합치기는 기존 문서와 편집 상태를 유지한다. 실제 별도 HWND는 Windows 데스크톱 호스트가 제공하고, 브라우저 실행에서는 허용된 팝업 창을 사용한다. 팝업 차단이나 native 창 생성 실패를 새 탭 성공으로 취급하지 않는다.

```json
{
  "id": "scene",
  "direction": "top",
  "controls": {"speed": 60, "speedScalar": 1, "sensitivity": 0.003},
  "presentation": {"mode": "wireframe", "flags": {"fog": false, "helpers": true}}
}
```

이 JSON을 `node tools/hb.mjs viewport.configure @viewport.json --url <편집기 URL> --client <조회한 clientId>`로 전달한다. 명령 후 `viewport.get`으로 실제 state를 확인한다. 입력·보기 설정은 인간 툴바와 같은 정의를 사용한다. 하늘 환경의 Renderer별 캡처는 런타임 자원이므로 이 JSON에 GPU 텍스처나 캡처 핸들을 저장하지 않는다.

## 환경 Actor 편집

`schema.placement`의 `skyAtmosphere/skyLight/volumetricCloud/heightFog`를 `scene.place`에 전달하면 일반 Scene 오브젝트와 동일한 안정적인 ID·Transform·부모·표시·컴포넌트 데이터로 생성된다. 대응 컴포넌트는 `SkyAtmosphere/SkyLight/VolumetricCloud/ExponentialHeightFog`이며 태양/달은 `DirectionalLight`의 `atmosphereSunLight/atmosphereSunLightIndex`와 월드 회전으로 연결한다. 범위·기본값·색상 배열·select 형식은 `schema.components`에서 조회한다. 예를 들어 captureResolution은 숫자로 추측하지 않고 스키마의 문자열 선택값 `"64"/"128"/"256"/"512"`를 사용한다.

생성은 `scene.place`의 `{path,expectedRevision,key,position,dryRun?}`를 사용한다. 반영 결과의 `result.object`가 오브젝트 ID이며 최종 revision과 dirty도 반환한다. 환경 종류를 배치하면 그 Scene의 `environment.mode`는 `actors`로 바뀐다. 하나만 배치해도 저장된 legacy 값은 이후 렌더 권한을 갖지 않으므로 기존 환경을 유지하며 변환하려면 Scene 전체와 기존 태양광을 읽고 네 환경 Actor·DirectionalLight를 함께 준비한다. 변환 데이터는 `environmentActorPreset`이 생성할 수 있지만 별도의 자동화 명령 이름은 아니다. 명시적인 한 번의 `document.patch`로 검증·Undo를 적용한다.

컴포넌트 변경도 `document.get` → 오브젝트 ID 및 컴포넌트 ID를 `test`한 `document.patch` → `document.save` 경로다. 부모·회전·활성화·밝기·삭제는 같은 Scene 데이터에서 에디터와 Player가 읽는다. 마지막 환경 Actor를 삭제해도 actors 모드를 유지해 숨겨진 legacy 하늘이 되살아나지 않는다. 재질의 높이 안개 hook과 Renderer별 하늘 캡처는 저장 데이터에서 파생된 렌더 자원이다. `runtime.state.environment`는 실행 관측값이며 에디터 Scene 기본값으로 덮어쓰지 않는다. 저장·우선순위·부모 변환·개별 WebGL 캡처의 계약은 [환경 Actor 연구](ENVIRONMENT_ACTORS_RESEARCH.md)에 연결한다.

## CLI

편집기를 연 상태에서 저장소 또는 배포 폴더에서 실행한다. 기본 포트는 5173이며 데스크톱의 동적 포트는 사용자 데이터 `Sessions/*.json`의 `port`에서 확인한다.

```powershell
node tools/hb.mjs clients --url http://127.0.0.1:5181
node tools/hb.mjs schema --url http://127.0.0.1:5181
node tools/hb.mjs document.get --url http://127.0.0.1:5181
node tools/hb.mjs document.patch @edit.json --url http://127.0.0.1:5181
node tools/hb.mjs runtime.play --url http://127.0.0.1:5181
node tools/hb.mjs runtime.state --url http://127.0.0.1:5181
node tools/hb.mjs runtime.stop --url http://127.0.0.1:5181
```

`edit.json`은 실제 조회한 revision과 오브젝트 ID를 사용한다. 배열 인덱스 변경에도 잘못된 오브젝트를 수정하지 않도록 `test`로 ID를 확인한다.

```json
{
  "path": "Assets/Scenes/Garden.hbscene.json",
  "expectedRevision": "document.get에서 받은 revision",
  "operations": [
    {"op":"test","path":"/objects/0/id","value":"조회한 오브젝트 ID"},
    {"op":"replace","path":"/objects/0/position","value":[0,2,0]}
  ]
}
```

블루프린트는 `nodes/edges/variables/functions/macros/construction`, 머테리얼은 `graph/surface`, 스프라이트·타일맵·애니메이션은 스키마의 예제 필드를 같은 방식으로 편집한다. 노드 연결은 ID와 핀 ID를 사용한다. 최종 데이터가 기존 `validAsset` 검증을 통과해야 한다.

## 충돌·실패 계약

`REVISION_CONFLICT`면 최신 문서를 다시 읽고 변경을 재계산한다. `EDITOR_BUSY`면 사람의 드래그·대화상자 작업이 끝난 뒤 요청한다. 실행 중 문서 변경은 거부한다. `document.open`은 현재 장면과 Blackboard/BehaviorTree/FSM/Montage/Sequence 진단 에셋을 읽기 전용으로 열 수 있으며 Play 월드나 장면 바인딩을 교체하지 않는다. 명령 제한은 대기 50개, 시간 제한 120초, 결과 보관 5분이다. 연결 해제된 명령을 자동 재실행하지 않는다. 저장되지 않은 문서는 재가져오기로 덮어쓰지 않는다.

편집기 연결의 프로젝트 ID는 현재 서버 세션의 프로젝트 ID와 일치해야 한다. 프로젝트가 바뀐 뒤 이전 창이 보내는 `/api/automation/poll`은 HTTP 409로 거부한다. 프로젝트 전환 후 기존 `clientId`를 계속 사용하지 말고 연결 목록과 문서를 다시 조회한다.

이 API는 기존 로컬 서버의 loopback/Origin/편집기 헤더 검사를 그대로 사용한다. 임의 JavaScript 실행이나 외부 파일 접근 명령은 없다. C++ 빌드는 사용자가 작성한 로컬 코드를 실제 컴파일·실행한다.

현재 JSON 데이터 검증과 편집 명령이 제공된다. 전체 JSON Schema 표준, 다중 문서 원자적 트랜잭션, 원격 협업 병합, C++ 코드 자동 수정, DirectX native 게임 렌더러나 전체 성능 프로파일러까지 완성했다는 뜻은 아니다. Windows 독립 Game.exe 패키지는 아래 빌드 경로로 제공하며 Win32/WebView2·Node·Three/WebGL2·Rapier·사전 빌드 C++ worker를 사용한다. 새로운 엔진 기능은 구현과 함께 이 공통 명령·스키마·검증 경로에 노출해야 한다.

## 검증

`npm run test:integration`은 패치 실패 시 원본 보존, 위험한 JSON 경로, 명령 중복·다른 창 응답 차단, 에셋 ID/참조/재가져오기, 디스크 충돌·백업을 검사한다. `npm run test:editor-api`는 별도 `integration-qa-*` 프로젝트를 연 실제 편집기에서 수정·충돌 거부·Undo·저장·2D 착지·종료 복구를 확인한다. 사용자 작업 프로젝트에서 변경 검사를 실행하지 않는다.

`node tools/check-viewport-workflow.mjs <검증 전용 편집기 URL>`은 프로젝트 이름이 `viewport-qa`인 연결 하나만 허용한다. 같은 공용 명령으로 50,000/60,000 좌표의 선택 초점, 직교↔원근 북마크, 실패 시 카메라/설정 보존, 보기 모드와 에셋 revision 격리, Camera Actor 생성/조종 및 같은 방향 북마크의 조종 종료, 환경 Actor를 포함한 Play/Stop과 저장을 검사한다. 이 검사는 검증 프로젝트를 편집하므로 사용자 작업 프로젝트에 실행하지 않는다. 카메라 수학의 185개 검사와 환경의 33개 검사는 각각 [뷰포트 조작 연구](VIEWPORT_CONTROLS_RESEARCH.md), [환경 Actor 연구](ENVIRONMENT_ACTORS_RESEARCH.md)에 기록하고 실제 GPU/네이티브 창 검사와 구분한다.

## 화면 없이 게임 로직 검사

```powershell
node tools/run-project.mjs C:/Games/MyGame/MyGame.hbproject scenario.json
```

`scenario.json`은 `{ "frames": 180, "delta": 0.016666666666666666, "inputs": [{ "frame": 60, "key": "d", "value": 1 }, { "frame": 90, "key": "d", "value": 0 }] }`처럼 프레임과 입력을 지정한다. 선택적인 `scene`은 프로젝트 상대 경로다. 같은 BlueprintRuntime·컴포넌트·고정 물리·게임 프레임워크·사용자 C++ 호스트를 사용한다. C++이 연결되면 실제 컴파일과 함수 호출을 수행한다.

결과 JSON의 `mode`는 `headless-logic`이며 오브젝트, 역할, 변수, 시간, 로그, 스프라이트 프레임 전환, 해당 실행의 저장 슬롯과 요청 시 모델 포즈 `animation`을 제공한다. 게임 저장은 실행마다 격리된 메모리 슬롯이고 사용자 저장 파일을 덮지 않는다. 입력에 대한 최종 위치·충돌·이벤트·변수의 예상값을 자동으로 검사할 수 있다. GPU 그림·음향·위젯을 검사했다고 표시하지 않는다. 해당 서비스 호출은 실제 화면 검사가 필요하다는 오류로 실패하며 몰래 성공 처리하지 않는다.

`npm run test:headless`는 독립 임시 2D 프로젝트의 이동·점프·착지·원본 보존과 실제 사용자 C++ 함수의 공통 서비스 호출 결과를 검사한다.

`runtime.input`은 `{key:"d",value:1}`(눌림), `{key:"d",value:0}`(놓기)을 받아 같은 PlayerController/InputAction 경로를 실행한다. 일시 정지 중 입력은 거부하며 `runtime.resume`으로 재개한다. `runtime.openScene`은 `{path:"Assets/Scenes/Next.hbscene.json"}`을 검증해 전환을 요청한다. 완료는 `runtime.state.scene`으로 확인한다. 장면 전환 후 Stop해도 기존 편집 장면과 원본 파일은 보존한다. 화면 없는 결과에는 `sceneHistory`의 전환 장면/프레임이 추가된다.


## AI·상태·연출·효과 데이터

`/api/schema`에 컴포넌트, 기본 BP 노드, C++ 실행 서비스와 새 에셋 예제를 함께 노출한다. 기능 수를 고정해 AI의 분기 기준으로 삼지 않고 현재 스키마를 조회한다. 타입 ID는 `blackboard`, `behaviortree`, `statemachine`, `montage`, `sequenceasset`이다. UI 생성·파일 검증·JSON Patch·의존성 추출·실행기가 같은 정의를 사용한다. 표시 이름 대신 객체/노드/상태/트랙/클립의 안정적인 ID로 연결한다.

- BB: `keys[{name,type,value}]`; `bool/int/float/string/vec3/object`. int32·벡터·객체 ID 검증을 적용한다.
- BT: `blackboard`, `root`, `interval`, `nodes[{id,type,properties,children,services,x,y}]`. 순환/다중 부모·자료형·노드 수/깊이를 검증한다. 서비스는 이벤트/간격을 가진다.
- BT 태스크는 `onStart/onTick/onFinish/onAbort`와 활성화 handle을 사용한다. `behaviorTaskHandle/behaviorTaskFinish`와 사용자 C++ `hb::AI::GetTaskHandle/FinishTask`가 같은 실행기를 사용한다. stale 완료는 무시하고 태스크 완료/중단 때 해당 BP 작업·native 타이머 수명을 정리한다. `runtime.state.work`는 BP의 scopes/delays/timers/timelines/subscriptions 관측이다. 서비스 선택 필드·추가 노드·실제 창 증거와 남은 Observer/Subtree 범위는 [태스크 수명 계약](BEHAVIOR_TASK_LIFECYCLE.md)을 따른다.
- 후속 Observer의 abortMode/notify, Selector reactive, Parallel finishMode, compareBlackboard, subtree와 내부 인스턴스는 [조건/하위 트리 계약](BEHAVIOR_OBSERVERS_SUBTREES.md)을 따른다. `gameplay.behaviorChoices`를 조회해 선택 값을 사용하고 `gameplayDebug.behavior.instances`의 asset/scope/path/status/tasks로 현재 열린 트리를 대조한다. 정적 subtree는 실행 전에 로드/검증하며 같은 키의 자료형을 공유하고, root defaults를 우선한다. C++와 headless도 같은 핸들·타이머 수명을 사용한다.
- FSM: `initial`, `parameters`, `states`, `transitions`. 전이는 from/to·event·hasExitTime/exitTime·conditions로 표현하며 `from:"any"`는 Any State다.
- Montage: `length/rate/loop/group`, `sections`, `clips`, `notifies`. clip은 start/duration/sourceStart/rate/slot, section은 time/name/next, Notify는 time/event다.
- Sequence: `length/rate/loop/fps/restoreState`, `tracks[{id,type,target,keys,clips}]`. target은 장면 객체 ID이며 animation/audio 트랙만 clip 구간을 가진다.

`NavigationGrid/Agent/Obstacle`, `AIPerception/PerceptionSource`, `ParticleSystem`, `Decal`, `TopDownMovement2D`의 속성·범위·기본값은 컴포넌트 스키마에서 조회한다. ParticleSystem 필드의 `section`은 Inspector의 모듈 구분과 동일하다. 객체 `tags`는 점으로 구분한 계층 이름(최대 32개)이고 TagsMatchesQuery는 JSON Any/All/None 트리를 받는다. BP 핀 ID/호출 인수는 생성된 스키마에서 조회하고 추측하지 않는다.

`runtime.state.objects`의 `gameplayDebug`는 현재 실행 관측값이다. 예를 들어 `blackboard.Target/HasTarget`, `behavior.status/result`, `state/parameters`, `navigation.status/path`, `perception[{id,sense,sensed,location,age}]`, `particles.count`를 시나리오 예상값과 비교한다. 이 값을 편집 문서의 기본값으로 덮어쓰지 않는다. 실행 종료 후 편집 객체·에셋 파일은 원래 값으로 복구된다.

새 프로젝트 템플릿 ID는 `gameplay2d`, `gameplay3d`다. 허브에서 각각 2D/3D AI와 효과 예제를 생성하며 같은 `run-project.mjs`로 600프레임 시나리오를 실행할 수 있다. `test:systems`가 경로 도착·FSM·파티클·2D 탑다운 입력·원본 보존의 재현 예제다.

C++ 실행 서비스는 호출 중 쌓인 명령을 호출 종료 후 실제 VM에 검증·적용한다. 조회 API는 C++ 호출의 전달 snapshot을 읽으므로 비동기 Start/Play/Move/Emit 완료를 같은 호출 안에서 새 상태로 읽을 수 있다고 가정하지 않는다. 성공 여부는 다음 `runtime.state`/이벤트로 확인한다. C++ tag 읽기의 Unicode 문법 오류 처리까지 JS와 모두 같다고 보장하지 않으며, 변경 적용은 공통 JS 검증을 거친다. 헤드리스 결과는 로직 증거이고 GPU 데칼/파티클 그림과 미리보기 품질은 별도 화면 검증 대상이다.

## 사람이 쓰는 제작 동작과 같은 명령

`/api/schema.placement`는 38개 배치 조합의 `key/label/category/kind/components`를 제공한다. `/api/schema.material.nodes`는 54종 실제 계산/출력 노드다. 다음 변경 명령 모두 `path`, `expectedRevision`, 선택적 `dryRun`을 받는다. 먼저 `document.get`을 조회하며 실패한 편집은 원본과 Undo 기록을 보존한다.

| 명령 | 추가 인수와 결과 |
|---|---|
| `blueprint.connect` | `view`(event/construction/함수/매크로 ID), `from:{node,pin}`, `to:{node,pin}`. 호환 자료형은 명시적 변환 노드를 추가하고 `result.conversionNode` ID를 반환한다. |
| `blueprint.variable.drop` | `variableId`, `target:{node,pin,direction:"in" 또는 "out"}` 또는 null, `position:{x,y}`, 빈 곳의 `mode:"get" 또는 "set"`. 데이터 입력은 Get, 실행 핀은 Set, 기존 실행선 보존. 새 노드 ID는 `result.node`. |
| `scene.place` | 스키마의 `key`, `position:[x,y,z]`. 실제 컴포넌트 기본값이 있는 객체를 생성하고 `result.object` ID를 반환한다. |

자동 연결·변수 드롭은 UI와 `blueprint-connections.js`를 공유한다. 위치는 필요한 경우 기존 노드를 피한다. `dryRun`은 후보 데이터만 반환하므로 이를 최종 ID로 간주하지 말고 실제 변경 응답의 ID를 사용한다. 변경 후 `document.get`으로 읽거나 `editor.undo/redo`, `document.save`를 이어서 호출한다. 코드별 동작 확인은 `tools/check-authoring-editor.mjs`에 재현 가능한 실제 클라이언트 검증으로 보관한다.

## 위젯·오디오·참조·프로파일

현재 `/api/schema`는 473종 BP 노드와 102개 실행 서비스, `ui.widgets/events/defaults/anchors/variables`, `audio.busDefaults/parameters/snapshotOverride`를 제공한다. `.hbwidget.json`과 `.hbaudiomixer.json`은 UI 생성, 파일 검증, JSON Patch, 참조 registry, 저장·복구와 같은 스키마를 사용한다. 헤드리스 로직 실행은 실제 DOM/음향 서비스가 필요하면 명시적으로 실패하며 PCM/GPU 검증으로 표시하지 않는다.

| 명령 | 추가 인수/동작 |
|---|---|
| `widget.add` | `type`, 선택적 `parent/name`. 새 ID는 `result.node`. 생략한 parent는 실제 Canvas root ID다. |
| `widget.reparent` | `node,parent`. 순환·루트 이동·비컨테이너 부모를 거부한다. |
| `widget.duplicate` | `node`, 선택적 `parent,offset:[x,y]`. 하위 트리를 새 ID/고유 이름으로 복제한다. |
| `widget.remove` | `node`. 하위 트리를 함께 삭제하고 `result.removed`를 제공한다. |
| `profiler.read` | bounded 실제 frame/sample/counter 기록. C++은 IPC 포함 elapsed 시간, WebGL 제출은 GPU 시간이 아니다. |
| `profiler.record` | `recording:Boolean`. 실제 실행/렌더 프레임 계측을 시작/중지한다. |
| `profiler.clear` | 기록을 지운다. |

위젯 변경은 `path,expectedRevision,dryRun`을 받으며 UI와 `ui-assets.js`의 동일 계층 함수를 사용한다. 먼저 `document.get`으로 읽고 후보 변경을 검증한다. 실패 시 문서·Undo 기록 보존, 성공 후 Undo/Redo·저장·재열기를 실제 편집기에서 확인했다. 속성·이벤트·바인딩·mixer bus/snapshot/exposed는 `document.patch`로 공통 검증한다.

`GET /api/asset/registry`는 현재 프로젝트의 path/id/kind/size/dependencies/referencers와 redirect로 해석한 참조를 제공한다. source 원본의 물리 JSON 경로를 자동으로 rewrite했다고 가정하지 않는다. 참조 뷰어와 AI는 같은 registry를 조회한다. registry는 대략 O(에셋+참조)로 한 번 구성하여 양방향 그래프 탐색에서 파일마다 전체 재검색하지 않는다.

`runtime.state.objects[].gameplayDebug.ui[instance][element]`에는 type과 현재 위젯 값이, `audioMixers[asset][exposed]`에는 snapshot 전환/override의 현재 값이 들어간다. 읽은 디버그 값을 에셋 기본값으로 덮어쓰지 않는다. C++ Show 등의 비동기 결과는 다음 snapshot으로 확인한다.

재현: `node tools/check-ui-audio-editor.mjs http://127.0.0.1:5182`는 `authoring-qa` 프로젝트 이름을 확인한 뒤 새 검증 파일만 만든다. 사용자 프로젝트에서는 실행하지 않는다. 실제 UI/PCM 검사 및 남은 세부 구현은 [위젯·오디오 연구](AUTHORING_UI_AUDIO_RESEARCH.md)에 기록했다.

## 물리 저작과 실제 실행 관찰

`/api/schema.physics`는 2D/3D 차원, 단위, 네 forceModes, 7개 queryKeys, queryDefaults, 결과 의미·실행 제한·C++ 적용 시점·관절 한계를 제공한다. component 스키마에서 Rigidbody/2D·PhysicsConstraint/2D·ConstantForce/2D와 Collider의 필드/기본값/범위를 읽는다. 객체 Transform/관절 각도는 도, 각속도는 rad/s이며 2D는 XY/Z다. UI의 축 체크박스는 JSON 0/1 벡터다. bodyType을 직접 수정할 때 구형 isKinematic 우선 규칙을 함께 확인한다.

Scene/BP 문서를 document.get → expectedRevision/dryRun 기반 document.patch → document.save로 수정하고 UI와 같은 검증·Undo를 사용한다. 실행 중에는 저작 변경이 거부된다. `runtime.state.physics`는 backend/fixedStep/elapsed와 차원별 bodies/joints를, objects[].gameplayDebug.physics는 mass/sleeping/velocity/angularVelocity/ccd/colliders를 제공한다. Stop 후 physics=null이며 편집 문서는 복구된다. 관측값을 기본값으로 덮지 않는다.

C++ 공간 검색은 현재 C++ 변환/충돌 flags를 합친 읽기 전용 정확 형상 월드에서 동기 응답을 받는다. 다른 변경 명령의 solver 완료까지 동기라는 뜻은 아니다. 함수당 128질의/4 MB 메시지, 검색 결과 1,000개 등의 제한은 스키마에서 조회한다. 상세한 query-only/physics-only·레이어·단위·오류·수명·실제 검사는 [물리 연구](PHYSICS_RUNTIME_RESEARCH.md)와 tools/check-physics-editor.mjs에 있다. 이 도구는 authoring-qa에서만 새 검증 장면을 만든다.

## 저장된 메시·다각형·선분 충돌

`schema.physics.geometry`는 MeshCollider의 convex/mesh·4096 정점/8192 삼각형, PolygonCollider2D의 16개 분리 단순 경로/512점, EdgeCollider2D의 열린 선분/512점과 좌표·운동 형식 계약을 제공한다. component의 `json` 필드는 중첩 배열이다. 실제 값 형식은 [형상 계약](COLLISION_GEOMETRY_RESEARCH.md)에 있으며 일반 vec3로 취급하지 않는다. 사람의 형상 창과 AI document.patch가 같은 검증/Undo/저장 데이터를 사용한다.

`collision.bake`는 `path`, `expectedRevision`, `object`(Scene), `component`, `dryRun`을 받는다. component는 MeshCollider다. sourceMesh가 있으면 실제 모델을 읽고, 없으면 장면의 준비된 렌더 메시에서 로컬 정점·삼각형을 생성한다. BP에는 sourceMesh가 필요하다. 반환 result는 component ID와 정점/삼각형 수다. dryRun의 data에서 실제 생성할 배열을 검사하고, 적용 후 별도로 document.save한다. 모달/Play 중 명령과 stale revision은 거부한다. sourceMesh 의존성과 이름 변경 참조도 갱신한다. 저장된 geometry는 Play/BP/C++ 질의에 그대로 사용한다.

## 빌드 프로필과 독립 게임 패키지

사람의 **파일 → 빌드 프로필**(`Ctrl+Shift+B`)과 AI가 같은 `Settings/BuildProfiles.json`을 사용한다. `GET /api/schema`의 `build`는 현재 Windows x64, WebView2/WebGL2, 개발/배포 구성, 포함/출력과 API 계약을 제공한다. 프로필 ID와 Scene의 전체 프로젝트 상대 경로를 식별자로 사용한다.

| 요청 | 입력/결과 |
| --- | --- |
| `GET /api/build/profiles` | `version/profiles/revision`과 설정 파일 조회; 없으면 시작 Scene을 가진 기본 windows 프로필 |
| `PUT /api/build/profiles` | `{version:1,profiles,expectedRevision}`; 모든 프로필 검증 후 revision 조건부 저장 |
| `POST /api/build` | `{profileId,expectedRevision,dryRun}`; HTTP 202로 비동기 작업 생성 |
| `GET /api/build/job?id=...` | `status/stage/profileId/startedAt`; 완료 시 `result`, 실패/취소 시 `error`와 종료 시각 |
| `POST /api/build/cancel` | `{id}`; 해당 프로젝트의 실행 중 작업 취소 |
| `POST /api/build/open` | 완료된 `{id,action:"run"}` 또는 `"reveal"`; 검사만 한 작업이나 임의 경로 실행은 거부 |

이 경로는 `/api/automation/command`의 편집 명령과 별도의 서버 API다. `tools/hb.mjs`에 없는 빌드 명령 이름을 만들어 호출하지 않는다. 쓰기 요청에는 기존 `X-HB-Editor: 1`과 JSON Content-Type을 사용한다. 프로필 충돌은 현재 HTTP 400의 `error` 메시지이며 편집 문서의 `REVISION_CONFLICT` 코드와 혼용하지 않는다. 새 revision을 조회하고 변경을 재계산한다.

프로필의 각 항목은 `{id,name,configuration,productName,width,height,scenes:[{path,enabled}]}`이다. 설정 예제:

```json
{
  "id": "windows",
  "name": "Windows 개발",
  "configuration": "development",
  "productName": "MyGame",
  "width": 1280,
  "height": 720,
  "scenes": [{"path":"Assets/Scenes/Main.hbscene.json","enabled":true}]
}
```

프레임 설정은 선택 필드 `targetFrameRate`(15~240 정수)와 `framePacing`(`fixed/display`)예요. 생략 시 Windows120/fixed, Android·iOS60/display를 사용해요. 씬의 `runtime`에도 같은 필드를 둘 수 있고 빌드 프로필 값이 패키지 실행을 결정해요. `runtime.state.frameSettings`와 `GET /api/schema`의 `build.frameDefaults/frameLimits`에서 해석한 값/계약을 확인해요. 실제 FPS와 프레임 예산 초과는 프로파일러 측정값이며 목표값 자체가 성능 보장이 아니에요. [실행 비용과 증거](research/FRAME_PERFORMANCE_20261006.md)

프로필은 1~32개, Scene 목록은 1~256개이며 하나 이상의 Scene이 활성이어야 한다. 경로 중복·이탈을 거부하고 첫 활성 Scene이 시작 Scene이다. 너비는 320~7680, 높이는 240~4320의 정수다. 구성은 `development/release`이다. UI에서 열린 Scene 추가·드롭·체크 제외·제거·순서를 지원하고 AI는 같은 배열을 revision 보호로 저장한다.

빌드는 **디스크에 저장된 에셋**을 소비한다. AI가 열린 문서를 변경했다면 `document.get` → 조건부 변경 → `document.save`를 먼저 완료한다. 프로필 저장과 에셋 저장을 한 원자적 트랜잭션으로 취급하지 않는다. UI의 모두 저장하고 빌드는 에셋 저장을 먼저 수행하고, 검사/CLI/직접 빌드 API는 열린 미저장 편집을 자동 반영하지 않는다. C++ 소스가 BP에 등록한 소스와 다르면 `native.build` 후 해당 BP를 저장한다.

작업 상태는 `running/done/error/canceled`이다. 프로젝트당 실행 중 빌드는 하나이며 종료 상태를 확인하기 전 자동 재제출하지 않는다. 현재 프로젝트가 바뀌면 이전 프로젝트 작업의 조회/실행을 새 프로젝트에 적용하지 않는다. 작업 목록은 서버 메모리에 있고 결과의 `build-report.json`·실패의 `build-failed.json`은 출력 폴더에 남는다.

화면 없는 CLI 검사/출력은 다음과 같다. 앞의 인수는 실제 descriptor 경로와 저장한 프로필 ID다.

```powershell
npm run desktop:build
node tools/build-game.mjs C:/Games/MyGame/MyGame.hbproject windows --dry-run
node tools/build-game.mjs C:/Games/MyGame/MyGame.hbproject windows
```

`dryRun`은 참조/형식/소스 일치를 검사하고 출력 폴더를 만들지 않는다. 실제 빌드는 활성 Scene과 모든 비장면 Assets를 기본 포함하며, JSON/GLTF가 참조한 프로젝트 내부 파일을 폴더 위치와 관계없이 재귀 수집한다. BP의 native.header/source 코드 문자열은 경로로 해석하지 않으며 사용하는 C++ 소스 쌍은 따로 대조한다. 제외 Scene 참조와 프로젝트 밖 링크는 거부한다. 개발 worker는 디버그 정보, 배포 worker는 최적화/기호 제거를 적용하고 `Builds/<profile>/<unique build id>`를 생성한다. 타깃 에셋 변환/압축·미사용 에셋 제거·chunk/installer와는 구별한다.

독립 `Game.exe`에는 Node와 이미 빌드한 C++ worker를 동봉하며 실행 환경에 별도 Node/CXX 설치가 필요하지 않다. WebView2 Runtime은 필요하다. Player의 `/api/native/build`는 헤더/소스 서명에 등록된 worker 조회이며 새 컴파일을 허용하지 않는다. 에셋 생성·쓰기·외부 IDE 실행 API는 제공하지 않는다. 게임 저장은 프로젝트 UUID의 사용자 데이터에 기록하고 에디터 복구/레이아웃을 패키지에 가져오지 않는다.

`test:package`의 실제 2D 개발/3D 배포 검사는 Win32/WebView2 GPU 제출·BP→C++ 호출, 컴파일러 없는 PATH, AudioContext running/음원 voice playing, EndPlay의 SaveGame flush와 저장 재열기, 소유 서버 종료를 확인했다. 이는 native DX11·모든 코덱/장치·전체 엔진 기능의 완료 근거가 아니다. 공용 BP/서비스 수명과 원본 형식/배포 제약은 [빌드/Player 연구](BUILD_PLAYER_RESEARCH.md)에 연결한다.

애니메이션 그래프는 [포즈 계약](ANIMATION_GRAPH.md)의 animgraph/AnimationGraph/animationGraph schema를 사용해요. 9개 포즈 노드·Float/Bool 파라미터·공용 BP/C++7개·실행 active/weights/시간과 요청 시 runtime.state.animation 속성 포즈를 제공해요. 기존 revision/dryRun/patch/Undo/Save/잠금을 공유해요. named bone 필터·captured reference·우세 sprite 프레임과 [headless model pose](HEADLESS_MODEL_POSE.md)와 아직 없는 IK/normalized sync를 혼동하지 않아요.


## 에셋·C++ 파일 묶음 편집(041)

- `files.get {path}`: 디스크 data/revision 및 열린 문서의 editorData/editorRevision. 창을 바꾸거나 외부 IDE를 띄우지 않아요. 없는 파일은 exists:false/revision:null이에요.
- `files.apply {entries,dryRun}`: entries는 `{path,expectedRevision,expectedEditorRevision,operations}` 또는 data 또는 delete:true. 열린 문서는 expectedEditorRevision도 필요해요. 닫힌 파일을 만들 때 expectedRevision:null과 data를 사용해요. 삭제할 파일은 닫아야 해요. 반환 transaction은 그룹 ID예요. 다른 JSON/Source 파일에 걸친 BP/부모/C++ 시그니처 검증 후 한 저장 묶음으로 적용해요.
- `files.undo {transaction}` / `files.redo {transaction}`: 원래 그룹 ID로 현재 세션의 묶음을 제어해요. 인간/외부의 새 편집은 거절하고 보존해요. 기존 Ctrl+Z/Ctrl+Y에서도 묶음 전체와 C++를 함께 처리해요. C++만 수정해도 당시 작업창에서 되돌릴 수 있어요.
- 파일1~64개/원본+결과8MB, 세션 Undo40그룹이에요. dryRun은 컴파일이 아니라 공개 시그니처/그래프/참조 검증이에요. 새 인간 편집이 저장 대기 중 생기면 파일 전체를 되돌려 요청을 거절해요. 복구와 외부 변경이 충돌하면 TRANSACTION_RECOVERY_REQUIRED와 복구 ID를 확인하세요.
- 보호된 POST `/api/asset/batch`는 `{entries:[{path,text,expected}],dryRun}`을 사용해요. expected는 에셋 JSON 또는 텍스트 자체를 JSON.stringify한 저장 기준/null이에요. POST `/api/asset/batch/undo {transaction}`은 기록을 읽어 현재 디스크 기준을 검사하므로 세션이 바뀌어도 최신 기록 ID로 사용할 수 있어요. 일반 AI 작업은 editor 명령의 열린 문서 보호를 이용하세요.

근거·검증·세션/파일 시스템 범위: docs/research/AI_ASSET_TRANSACTIONS_041.md.


2026-10-08 접촉 이벤트: 공용 노드 catalog/schema의 overlapStay·hitStay·endHit 및 effectivePins를 이용한다. Stay delta는 고정 물리 시간(float), Exit hit는 마지막 접촉의 hit=false와 유효 상대/null이다. AI 수정·핀 연결·컴포넌트 선택은 사람 UI와 같은 문서/검증/런타임을 사용한다. 삭제·풀 수명과 실제 C++/Rapier 검증은 [064](research/CONTACT_LIFETIME_064.md)에 있다.


## 머테리얼 Attributes·Layer/Blend(076)

`schema.material.attributes`는 11개 표면 필드·Make/Set/Get/Break/Blend와 타입 검증을, `schema.material.layers`는 독립 `materiallayer`/`materialblend` 에셋·고정 경계·스택 배열·배경·독립 값·인스턴스 `layerStacks`를 공개한다. Layer 항목 ID로 `layer.ID.layer.NAME`/`layer.ID.blend.NAME`을 구분한다. `hb::Materials::LayerParameterKey`/순수 BP `materialLayerParameter`와 기존 SetFloat를 사용한다. 사람과 AI는 같은 문서·revision·dryRun·검증·Undo·Save/여러 파일 계약을 쓴다. 저장/그룹 Undo는 의존 머테리얼과 부모/레이어 캐시를 갱신하며 다른 문서를 자동 저작하지 않는다. [작성/실행/실제 검증](MATERIAL_LAYERS_076.md).


077: 기존 Materials::SetFloat/materialFloat의 WebGL2 경로도 연결된 Float uniform을 갱신해 머테리얼을 유지한다. LayerParameterKey의 Layer/Blend 이름·instance/data 계약은 076 그대로다. 1000 writes·clone/검증·실제 에디터/배포·원본 보존은 [077](MATERIAL_UNIFORMS_077.md).


## 머테리얼 함수 추출·정적 입력(078)

`schema.material.functions.types`는 float/vec2/vec3/vec4/texture2d/staticBool/attributes를 공개한다. Texture Object→Sample의 textureObject 핀, Static Bool→Switch의 condition 핀을 사용한다. Static Switch의 valueType은 numeric 또는 동일 typed type이다. Bool instance/layer 값은 JSON boolean이다.

`material.extract {path,expectedRevision,nodeIds,targetPath,name,positions?,dryRun?}`은 보호 root를 제외한 선택을 독립 MF 에셋으로 저장하고 호출로 교체한다. 현재 의존성/서명/순환 검사 후 기존 files.apply를 사용한다. 새 경로는 기존 파일을 덮어쓰지 않는다. dryRun/단일 Undo/Redo·생성 파일/tab·fan-out·literal 보존 계약과 실제 창은 [078](MATERIAL_TYPED_FUNCTIONS_078.md). 예시는 `tools/check-material-typed.mjs`/`tools/material-typed-window-actions.mjs`다.


## 머테리얼 expression 미리보기(079)

`material.preview {path,node?,pin?,reset?,expectedRevision?}`은 current view 조회/출력 선택/표면 복귀를 지원한다. node 생략은 조회, reset=true는 종료, pin 생략은 첫 출력(FunctionOutput은 value 입력). 서명/revision·필수 입력을 검사하고 원본/dirty/Undo는 바꾸지 않는다. numeric→발광 RGB·Float 반복·Vec2 XY0·Vec4 XYZ·Texture 샘플·Bool0/1·Attributes PBR, upstream slice와 기존 resolver/compiler를 사용한다. [계약/실제 창](MATERIAL_PREVIEW_079.md).

## 머테리얼 미리보기 장면(080)

`material.scene {path,patch?,reset?,expectedRevision?}`는 view 조회/변경/기본값 복귀다. patch는 mesh/model/direction/mode/realtime/autoRotate/grid/background/backgroundColor/lightScale/environment/exposure를 받는다. 모델은 Assets의 기존 OBJ/FBX/glTF/GLB만 허용하며 타입/범위/미등록 필드를 검사한다. 원본·revision·dirty·Undo는 유지한다. [기본값·사람 조작·최종 창 증거](MATERIAL_PREVIEW_SCENE_080.md).

## 텍스처 리소스 계열(081)

콘텐츠 생성 kind에 cubemap/texturearray/volumetexture를 추가했다. `version:1,name,dimension:kind,images:[Assets 이미지 경로]`를 기존 document.patch/files.apply/Undo/Save로 편집한다. cube는 여섯 면 +X/-X/+Y/-Y/+Z/-Z, 다른 둘은 순서 있는 슬라이스다. 함수 핀 texturecube/texturearray/texture3d와 Object/Parameter/Sample을 사용하며 종류가 다른 연결은 거절한다. 리소스 노드의 material.preview도 지원한다. [사람 UI·타입·렌더/검증·남은 세부](MATERIAL_TEXTURE_FAMILIES_081.md).

## 런타임 텍스처 파라미터(082)

SDK Materials::SetTexture에서 생성된 materialTexture 노드는 target(object)/parameter(string)/texture(string)를 받는다. 기존 BP/C++ 문서 편집·함수 연결·실행 경로를 공유한다. Texture2D/Cube/Array/3D는 sampler의 파라미터 원점과 자료형을 유지한다. LayerParameterKey로 레이어 범위를 지정한다. 파라미터 staging은 실행 중 원본 파일을 쓰지 않으며 실패/경합에 이전 텍스처를 유지한다. [사람 API·실제 C++/BP 배포/자원 검증](MATERIAL_TEXTURE_PARAMETERS_082.md).

`/api/schema.textureRegionUpdates`는 같은 텍스처의 명시적 RGBA8 밉 영역을 바꾸는 공통 계약이에요. `materialTextureRegion`은 C++ `Materials::SetTextureRegion(target,parameter,level,origin,size,pixels)`에서 생성돼요. XYZ 정수 원점/크기와 X→Y→Z 순서의 0~1 RGBA Color 배열을 사용해요. 저장 색 공간의 수치를 그대로 지정하며 파일 원본은 쓰지 않아요. 2D·배열·큐브·볼륨을 같은 제작·실행 경로에서 다루고, 실패한 배치는 부분 적용하지 않아요. [부분 갱신·실행·자원 근거](research/TEXTURE_REGIONS_732.md).


## 웹 빌드(083)

`build.targets.web`과 기존 빌드 프로필·검사·작업·취소 API를 사용한다. `POST /api/build/tools/web`는 Emscripten 설치 작업을 시작한다. 결과 `artifactType:web`, `artifact:index.html`, `output`을 확인하고 `/api/build/open`의 run/reveal을 사용한다. 정적 게시 CLI는 `tools/publish-web.mjs <검증한 출력 폴더> <GitHub HTTPS 저장소>`이며 기존 다른 사이트·게임을 덮어쓰지 않는다. [제작·배포·원본 공개 범위](WEB_GAME_EXPORT_083.md).

## DirectX GPU 파티클(091)

기존 ParticleSystem 컴포넌트 스키마·document.patch/Undo/Save·BP/C++ 제작 API를 그대로 사용한다. Windows 빌드 windowsRenderer=d3d11에서 CPU는 shared seeded birth/timing만 준비하며 GPU가 이동/소멸·alive count·정렬·간접 빌보드 draw를 맡는다. inspect의 renderer 진단에 particlePools/particleBufferBytes/particleSteps/particleBirths/particleSortPasses/particleCountReadbacks/particleIndexAllocations/particleEmissionAllocations가 나온다. 객체 gameplayDebug.particles의 backend는 D3D11 compute, count는 명시 GetCount 전에는 null, cpuSimulationParticles/automaticPositionReadbacks는0이다. 빈/일시정지 상태와 카메라 변화에 따라 작업을 생략하며 같은 동작을 별도 AI 전용 에셋으로 만들지 않는다. 후속092에서 스프라이트/타일 2D 광원과 스프라이트/파티클 마스크를 연결했다. 추가 입자 렌더러·조명·그림자는 후속이다. [실행·읽기·남은 경계](NATIVE_PARTICLES_091.md).

## DirectX 2D 공용 연결(092)

기존 SpriteMask/Light2D/ShadowCaster2D/CompositeShadowCaster2D와 SpriteRenderer/TilemapRenderer/ParticleSystem 속성을 사용한다. Windows d3d11의 지원 목록·twoDResources·sampler 제한은 windowsBuild에서 조회한다. renderer.targets2d/target2dBytes는 현재 타깃 추정, passes2d/draws2d는 누적 횟수이며 자동 readback이 아니다. 같은 document.patch/Undo/Save·BP·C++를 사용하고 별도 AI 전용 파일이나 게임 함수를 추가하지 않는다. [계약/원출처/실제 창](NATIVE_2D_092.md).

## 현재 구현과 잔여 조회

`node tools/hb.mjs status --local`은 에디터나 서버를 열지 않고 docs/research/ENGINE_STATUS.json을 읽는다. 실행 서버의 GET /api/engine/status는 id/area/status/search를 필터링한다. totalItems는 등록 전체, matchedItems는 필터 결과다. 전체 UE/Unity API 분모/완료율과 혼동하지 않는다. 정의한 범위의 verified/partial/unimplemented/unverified와 sources/evidence/remaining을 함께 사용한다. 인간 문서는 docs/ENGINE_STATUS.md이며 같은 원장에서 동기화한다.

오디오 가중 전환은 schema.audio.weightedSnapshots와 mixerSnapshots 노드의 string/float 배열을 사용한다. SetFloat override와 기존 단일 mixerSnapshot을 유지한다. runtime.audio.mixers[asset].transition은 진행/곡선/정규화 가중치를 읽기 전용으로 공개하고 완료 후 null이다. 편집기 미리듣기와 가중치/시간/곡선 view 설정은 에셋 revision을 변경하지 않는다. 값 적용은 기존 Undo/저장 경로다.

2026-10-16: rig.clip.retarget {path,expectedRevision,source,sourceRevision?,clip,mapping?,positionMode?,name?,dryRun?}는 수동 2D 리타게팅과 같은 변환/Undo를 쓴다. mapping은 {source,target} 안정 ID 배열, 생략하면 뼈 이름을 맞춘다. 이동 boneLength/relative/none; 같은 부모 계층을 검증한다. source의 열린 초안이 우선이며 files.get의 editorRevision 또는 revision을 기준으로 보호할 수 있다. 결과 clip은 기존 SpriteSkin/AnimationGraph/C++/BP 재생 경로를 쓴다.

AudioMixer::SetSnapshotTransition/ClearSnapshotTransition과 BP mixerSetTransition/mixerClearTransition은 런타임 사본을 바꾼다. 저작 자료는 snapshots[].transitions[bus][parameter]이고, 값 '' 대신 필드를 지우면 상속한다. 숫자는 네 연속 곡선/stepStart/stepEnd, bool은 step 두 종류다. 가중 혼합은 각 대상의 곡선을 가중하며 이미 진행 중인 계획은 바꾸지 않는다. runtime.audio.mixers[].transition.parameterOverrides는 요청 시만 생성한다.

## 166 — 월드 세부 저작·커브·패치

world.mesh.edit의 operation은 간선 splitEdges, weld(tolerance/preserveUV), duplicateFaces, flatNormals/smoothNormals/setNormals(normal), uvPack(padding)를 추가 지원한다. world.terrain.brush의 hole/fillHole/stamp는 같은 자산/충돌 자료를 바꾼다. world.foliage.edit는 안정 ID의 transform/duplicate/delete를 수행한다. 모두 expectedRevision/dryRun/Undo 계약을 유지한다. 커브와 component sequence track 예제·서명/복구 patch CLI는 [166](ENGINE_WORK_166.md)에 있다.

## 167 — 추가 레벨과 2D 외부 IK

runtime.levels/load/unload/visible는 실행 사본을 조작하고 저작 revision을 바꾸지 않는다. 수명 변경은 현재 프레임 뒤 직렬화하며 디버그 일시 정지 해제 후 요청한다. rig.clip.retarget는 mapMode hierarchy 및 sceneTargets를 추가 지원하며 기존 revision/dryRun/Undo를 공유한다. 입력 예제·장면/솔버 ID 계약·빌드 장면 포함 조건은 [167](ENGINE_WORK_167.md).

## 168 — 연결 프리팹 인스턴스

scene.prefab.inspect {path,object}는 루트/자식 ID에서 연결 루트, sourceRevision, changes/conflicts를 읽어요. scene.prefab.instantiate {path,expectedRevision,asset,position?,dryRun?}는 안정 ID 인스턴스를 만들어요. refresh/unpack는 {path,expectedRevision,object,dryRun?}, revert는 여기에 all:true 또는 localId/property를 받아요. apply는 localId/property 및 선택 sourceRevision을 받고 원본/장면을 기존 files.apply의 원자 Undo로 수정해요. property는 ['scale',0] 또는 ['components','StableComponentId','properties','enabled']처럼 안정 ID를 사용해요. 사람 속성 창도 같은 명령을 호출해요.

자동 원본 갱신은 열린 문서의 파생 결과를 갱신하고 로컬 수정/충돌을 보존해요. runtime Tilemaps의 변경 셀은 렌더/충돌 청크에 전달되며 데이터 형식/기존 C++·BP 함수는 유지해요. TilemapRenderer renderMode=chunk/individual/layer, 기본 chunk예요. inspector의 긴 안내 대신 [형식·실행·남은 세부](ENGINE_WORK_168.md)를 참고해요.


## 169 — 다중 IK·Take·제작 세부

`anim.ik.effector.add {path,expectedRevision,node,settings?,dryRun?}`와 `anim.ik.effector.remove {path,expectedRevision,node,goal,dryRun?}`는 FullBodyIK의 안정 목표ID를 편집한다. settings는 id/bone/target/targetActor/space/weight이며 사람과 같은 검증·Undo를 사용한다. `runtime.take.start {targets,name?,fps?,includeComponents?,includeStructure?,includeSkeleton?,includeAudio?}` / `runtime.take.finish`는 실행 프레임 장벽에서 녹화를 제어한다. 중첩 settings가 아닌 직접 필드를 받으며 targets는 실제 런타임 ID 배열이다. `sequence.take.apply {path,expectedRevision,data,dryRun?}`는 검증한 결과를 기존 시퀀스에 적용하고 Undo한다. world.mesh.edit의 operation에 bridge/insetFaces(distance)를 추가한다.

NavigationArea와 Agent areaMask/areaCosts, 자동타일 extended/transform, 믹서 bus.ducking은 기존 document.patch/schema/Undo로 편집한다. 게임용 목표 API4개·사이드체인API3개는 C++/BP 공유이며 총760노드다. [형식·비용·남은 세부](ENGINE_WORK_169.md).


## 170 — 구조 프리팹·UV·IK 뼈·가상 음성

scene.prefab.adopt {path,expectedRevision,object,ids?,dryRun?}는 루트 아래 자식을 안정 ID 인스턴스에 포함한다. scene.prefab.apply는 all:true 또는 localId/property:[]로 구조를 적용한다. 원본/장면 revision과 원자 files Undo를 유지한다. 중첩 구조는 원본 편집을 요구한다. 변형 overrides는 components 다음에 안정 ID를 받을 수 있고 remove:true로 삭제한다.

world.mesh.edit의 operation은 uvCut/uvTransform/uvUnwrap/uvPackIslands를 추가한다. settings는 faces,wholeIsland,offset:[u,v],scale:[u,v],rotation:도,padding을 받는다. world.mesh.uv.view {path,expectedRevision?,open?,center?,zoom?,faces?,fit?}는 카메라/선택을 조회·설정하며 에셋 revision/Undo를 바꾸지 않는다.

anim.ik.bone.add/remove는 effector 명령과 같은 path/expectedRevision/node/dryRun을 받는다. add.settings는 bone/rotationStiffness/positionStiffness/preferredAngle, remove는 bone이다. 루트 외의 양의 positionStiffness는 거부한다. AudioListener/Source/오디오 에셋은 기존 schema/document.patch/Undo를 쓴다. C++/BP 루트·회전3과 음성 예산·우선순위·실제/가상 조회4를 공유한다. 총767노드. getter 관측은 명령 적용 후 프레임 기준이다. [세부](ENGINE_WORK_170.md).


## 171 — 실행 중 C++과 네트워크·추가 제작

`native.reapply {path,dryRun?}`는 실행 중인 C++ 블루프린트의 실제 소스에서 호환성을 검사한다. dryRun은 빌드/월드 변경 없이 검사한다. 실제 적용은 기존 공개 속성·월드·BP 상태를 유지하며 비공개/정적 C++ 저장소와 네이티브 타이머는 재생성된다. 타입/기존 함수 시그니처 변경과 빌드 중 소스 변경은 거부한다. `runtime.network`는 연결·소유권·sequence/RPC 진단만 읽는다.

Network Session/Replica, World Streaming Budget/LevelStreaming 추정 비용·우선순위, LOD collisionLevel, 위젯 TreeView/variableRows/selectedItemId/listItems의 `id/children/height`, retarget 프로필 morphMappings의 `source/sourceMesh/target/targetMesh/scale/offset/min/max`, ability/effect cues의 `tag/event/on`은 기존 schema/document.patch/expectedRevision/dryRun/Undo를 쓴다. `world.mesh.edit`의 uvStitch는 분리 노멀을 보존한 UV 경계 좌표 맞춤이다. 선택 토폴로지 병합과 구별한다. 게임용 네트워크6함수는 C++/BP와 동일 서비스다. 총773노드·공유코어289. [계약·실행·경계](ENGINE_WORK_171.md).


172: document.merge는 base/theirs와 expectedRevision을 받고 충돌이 있거나 dryRun이면 결과만 반환한다. resolutions는 안정 경로별 ours/theirs/base 또는 {value}. 깨끗하고 유효한 결과만 기존 document.patch/Undo로 적용한다. sourcecontrol.status/diff는 읽기 전용, stage/commit/configure는 expectedIndexRevision 필수. init은 명시적 프로젝트 저장소 생성, configure는 프로젝트 로컬 작성자만 변경한다. 원격 자동 push 없음. 상세 ENGINE_WORK_172.md.


173: NetworkReplica.relevancyRadius(0 전체)/ownerOnly·NetworkSession.interestTarget를 기존 컴포넌트 schema/document.patch로 편집한다. 생성 프리팹의 루트 Replica가 필요하고 동적 인스턴스는 고유 object ID를 복제 ID로 쓴다. 기존 Scene.Spawn/Destroy와 C++/BP 공용 서비스가 복제 생성/삭제까지 연결된다. runtime.network는 remote 수를 포함한다. ENGINE_WORK_173.md의 권한·장면/예측 경계를 따른다.


174: widget schema의 Widget 요소 properties.widgetAsset/widgetOverrides/widgetEvents/widgetBindings를 기존 문서 명령으로 편집한다. 오버라이드는 상대 요소 이름별 properties 객체(JSON 문자열), 이벤트/변수는 원래 이름→부모 이름 map이다. runtime 요소 경로 Player/Label을 기존 UI SDK에 사용한다. UIWidget.space=tracked/worldOffset/drawWidth/drawHeight/pivotX/pivotY/maxDistance/distanceScale/unitsPerPixel, UIBudget.maxInstances/maxNodes는 공용 컴포넌트 상세/schema를 따른다. authored 데이터와 펼친 런타임을 구분한다. ENGINE_WORK_174.md.


175–176: component schema PhysicsConstraint/2D의 useFrames/frameRotation/autoConnectedFrame/connectedFrameRotation/connectedAxis/referenceAngle/motorMaxForce; RaycastVehicle의 wheels(semantic vehiclewheels array)·구동/조향/제동을 공용 revision/patch/Undo로 편집한다. wheel.position은 차체m, 각 숫자/boolean은 schema검증을 따른다. placement vehicle 레시피 사용. SDK Physics::SetJointFrames/SetJointMotor/SetJointLimits/SetVehicleInput/GetVehicleSpeed와 동일 BP서비스. gameplayDebug.vehicle.speed/wheels에 접촉/힘/회전/조향 공개.


177: ListView/TreeView properties.autoRows=true는 실제 내용 높이를 측정한다. rowHeight는 최소/추정치, variableRows=true의 item.height는 우선한다. 기존 문서 revision/patch/Undo와 UI::SetListItems/SetValue를 공유한다. ListView 인덱스는 -1 또는 자료범위 안이며 교체로 사라진 선택은 -1로 비운다. UI03의 복합행/큰스크롤·상속/명명슬롯·3DUI 잔여와 구별한다.


178: modelimport.open({path:원본.gltf/glb/obj/fbx})→편집 가능한 .import.json의 path/kind/revision. 기존 document.get/patch/save·editor.undo/redo 사용. modelimport.preview({path:설정문서})→ready/meshes/visible/CPU bounds, GPU 읽기 없음. settings와 subassets/unresolvedSubassets는 검증된 JSON, sourceOnly 종류이므로 새 빈 에셋 생성 대신 원본에서 연다. 미연결의 수동 대응은 새 대상 overrides에 복사하고 미연결 행을 제거하는 한 번의 문서 patch/Undo로 표현한다.


179: RuntimeLOD 컴포넌트(distanceMode:auto/xy/xz/xyz,nearDistance/farDistance,boundsRadius,hysteresis,forcedLevel:-1~2,midAnimationRate/farAnimationRate,alwaysAnimate)를 일반 Scene/BP 문서 patch/Undo로 편집한다. WorldCollision.lodMode:fixed|runtime. runtime.lod는 실행 중 스케줄/충돌 캐시 추정치/예산을 읽는다. C++/BP 기존 Components::SetFloat/GetFloat로 forcedLevel과 Hz를 편집한다. collisionLevel 진단은 요청 거리 구간이며 실제 자산의 부족한 단계는 마지막 단계로 제한한다. 모드0Hz는 모든 프레임이며 논리 이벤트/곡선은 표시 간격과 별개다.


180: NativeHost.inspectResources().physicsQueries는 worlds/retiredWorlds/idleWorlds/activeContexts/worldBuilds/queries/maxIdleWorlds를 읽는다. C++ 응답 transport.physicsQueryMs/physicsQueryCount/physicsCacheReused는 해당 호출 비용과 시작 시 캐시 재사용 여부다. 진단은 필요할 때 읽으며 게임 FPS가 아니다. 캐시는 세션별·백엔드 유휴1개이며 reset/종료 시 해제한다.


181–183: Widget.properties.widgetSlots JSON(슬롯명→위젯 경로/null,미지정=기본),NamedSlot 단일자식/일반 patch·Undo. world.mesh.edit에 insetRegion/retriangulateRegion/bridgeOffset,열린·불균등 브리지. editor.shortcuts.get/set에는 widget/modeling22명령 추가/전체55명령. sourceOnly 에셋 생성 예제는 생략해 모델 메타도 정상 조회한다.


184: scene.prefab.apply의 property:[]는 중첩 포함 자식 추가/삭제를 바깥 원본의 additions/removed에 기록한다. additions는 해석된 중첩 부모를 참조하는 일반 Actor 행이며 최종 resolve/build 계층 검증이 필요하다. resolvedAnchors는 계산 메타이며 원본에 적은 값은 사용하지 않는다. sourceRevision·dryRun·원본/장면 파일 묶음 Undo는 기존 계약과 같다.


185: sceneInstanceActor(instance,localId,includeInactive=false),sceneInstanceActors(instance,includeInactive=false),sceneInstanceLocalId(instance) 노드는 Scene의 같은 C++ 함수와 연결된다. localId는 원본 Actor ID(중첩 anchor/child)이며 표시 이름/생성 월드 ID가 아니다. null/일반 Actor는 null/[]/빈문자열, 삭제 Actor 제외. localId 최대1000 UTF-8 bytes. SDK+generate-api 결과를 함께 사용한다.


186: prefab.stage.get {path} → resolved,revision,sources,preview 자원 정보. prefab.stage.edit {path,expectedRevision,expectedSources?,dryRun?,settings:{operation,object,...}} → 같은 원본 제작/Undo. operation: property/transform/create/duplicate/paste/group/ungroup/remove/reparent/component.add/component.remove/component.set/component.reset/component.properties. 부모는 안정 로컬ID, reparent.keepWorld 기본 true. paste.objects는 닫힌 계층 JSON. 사람 UI와 같은 공용 함수·안쪽 원본 revision 충돌 거부. reparented:[{object,parent}]는 해석 후 검증되는 선택 필드.


187: renderer.rayGeometry.materialTimeShift / previousMaterialTime은 마지막 성공한 프레임 기준의 진단이에요. 불투명 Normal 전용 Time 그래프만 이전 시간을 재평가하며 world/view/다른 시간 필드·transmission은 이력 거절을 유지해요. 시간은 기존 forward.w로 전달하며 추가 GPU 이미지/자동 읽기가 없어요.


188: editor.shortcuts.get.commands는 전용 scope·keys·when·repeat를 포함해요. when=notify는 선택 구간/핸들에서만 적용하며 repeat=true는 누른 채 이동할 수 있어요. 같은 editor.shortcuts.set expectedRevision/dryRun 및 사용자 프로필을 사용해요. 일반 창/분리 HWND가 같은 제작 명령을 사용해요.


189: 기존 ray opcode 정보로 비시간 이전 노멀을 특화해요. profiler.read의 준비 단계·동시성·시간을 그대로 조회하며 새 GPU 읽기/변형 캐시나 다른 제작 API가 필요하지 않아요. 단일 가이드의 링크 시간과 전체 게임 프레임 시간을 구분해요.


190: 미연결 시간 노드는 정적 UV 기하를 매 프레임 재준비하지 않아요. 수동 플래그 대신 실제 컴파일 opcode와 기존 캐시를 사용해요. 기존 renderer.bvh/rayGeometry 및 네이티브 raySceneUpdates/Bytes로 관찰할 수 있고, CPU 준비 비용과 전체 게임 FPS는 구분해야 해요.


191: NavigationAgent.avoidanceMode(simple/orca/none), avoidancePlane(auto/XY/XZ), avoidanceHorizon, neighborDistance, maxNeighbors(0 전체), avoidancePriority(0–99 낮을수록 우선), avoidanceBias를 기존 문서/컴포넌트 스키마·CAS/Undo로 편집한다. C++ Navigation 공용3함수와 BP 동일 서비스. player.inspect().navigation에 월드 경로 수/평면별 agents/indexCapacity/scratchCapacity/bytes, actor.gameplayDebug.navigation에 velocity/preferred/neighbors/infeasible/status가 있다. 속도는 월드 단위/초이며 물리 충돌 후 실제 변위와 구별한다.


192: runtime.audio.capture.start {maxSeconds?:60,maxBytes?:33554432}는 실제 게임 믹스를 시작한다. finish {folder?:"Assets/Recordings",name?}는 WAV 에셋 경로/frames/duration/sampleRate/channels/bits/reason/truncated를 반환한다. runtime.audio의 capture에 상태/PCM 바이트를 공개한다. 잘못된 저장 인자는 진행을 유지하고, 실패 후 finish 재시도로 같은 완료 자료를 저장한다. 종료 시 자동 저장하며 실패 자료는 같은 프로젝트에서 재시도한다. 녹음은 현재 렌더 스테레오 믹스이며 게임시각과 표본시각 동기화/마이크/멀티채널 stem은 별도다.


193: installEditor/설치 CLI가 deferred:true,reason:"running-install",active:[{pid,version,name}],bundleHash,source,destination,files를 반환하면 설치 완료/업데이트라고 보고하지 않는다. 사용 중인 이전 버전은 중단하지 않고 배포본을 준비한 채 종료 후 같은 설치를 재시도한다. active PID는 종료 권한이 아니다.


194–196: ray program.fields는 선택적인0–9 정수 고유 배열이며 누락된 옛 자료는 모든 필드에 대응해요. 키/아틀라스 배치는 그대로예요. RuntimeLOD.reducePoseEvaluation은 기본true이고 공용 Components SetBool/문서 패치로 편집해요. animationGraph.poseEvaluation.trace가 planned-clips이면 active/weights는 계산한 포즈 전체가 아닌 현재 계획 방문/클립 정보예요. texture.view({path,settings:{channel,filter,zoom,pan,index},pixel:[x,y]})는 열린 텍스처의 사람 UI와 같은 보기/원본8비트 픽셀을 반환해요. source document revision/dirty를 바꾸지 않아요.

197: RuntimeLOD.staggerAnimation 기본true, interpolatePose 기본false예요. 공용 Components/문서 편집을 사용해요. interpolated/interpolationDelay/interpolationBudgetLimited 진단과 poseBytes로 선택형 지연/메모리를 확인할 수 있어요. 보간은 한 갱신 주기 지연을 만들고, 보호 경로와 기본 추가 버퍼0을 유지해요.

199: runtime.navigation은 활성 게임의 경로/회피와 meshes별 투영 인덱스 질의 수·후보/삼각 평가 수를 복사해 반환해요. 읽기가 실행 인덱스를 바꾸지 않아요. 기하 편집 뒤 NavigationMesh를 다시 컴파일하고, 기존 공용 Navigation MoveTo/경로와 EQS가 같은 투영을 사용해요.

203: prefab.stage.view {path?,settings?:{mode:"isolation"|"context",scene,instance,environment,appearance:"normal"|"hidden"}}는 같은 프리팹 UI의 보기만 바꾼다. context는 scene의 원본과 일치하는 instance 루트ID가 필요하고 루트 Transform 편집을 잠근다. sceneRevision은 배경 스냅샷 기준이며 새로고침은 settings:{}로 요청한다. 배경은 stage 편집/선택 대상이 아니다.

204: project.browser.read {id?:"project",offset?:0,limit?:100}은 total/nextOffset/rendered/entries를 반환한다. limit1000은 응답 페이지 크기이며 자산 수 제한이 아니다. project.browser.view {id?,settings:{folder?,view?:"list"|"tiles",selected?:경로배열,focus?:전체목록인덱스}}는 같은 탐색/선택/포커스를 사용하며 원본 에셋을 수정하지 않는다.

200: build report.streaming은 chunkBytes/fileBackedFiles/fileBackedBytes/bufferedBytes를 제공한다. JSON/glTF/C++는 검사 버퍼이며 불투명 소스와 런타임은 파일 참조다. 중단·원본 변경은 출력 실패로 보고하고 완료 명세를 만들지 않는다.


## 206–209: 프리팹 대상·보기·동기화와 녹화 포즈

`scene.prefab.applyTargets({path,object,localId,property})`의 revision·sourceRevisions·targets를 조회한다. 선택한 key를 `scene.prefab.apply`의 targetKey와 함께 보내며 expectedRevision과 sourceRevisions를 유지한다. expands면 effectiveProperty/scope를 먼저 확인하고 allowExpansion:true를 명시한다. All은 바깥 원본이다. 개별 자식 추가/삭제는 property:[]이며 안쪽 적용도 같은 파일 묶음 Undo를 쓴다. 안쪽 공개 C++/BP 참조 메타데이터 미연결 범위는 안전 거부한다.

`prefab.stage.view`의 appearance(normal/gray/hidden), showOverrides와 snap({enabled,mode:grid/surface/vertex,translation,rotation:도,scale})은 보기 전용이다. `prefab.stage.snap({path,expectedRevision,object,ray:{origin,direction},mode,target,dryRun})`은 실제 잠금 장면 지오메트리를 사용하고 같은 Transform 편집/Undo를 거친다. hidden 배경은 타깃이 아니고 문맥 root는 잠긴다.

`editor.synchronize()`는 대기/진행 중 프리팹 상속 동기화를 마치고 각 문서 revision/dirty를 반환한다. 저장도 같은 장벽을 사용한다. 자동 저장이나 전역 작업 완료 명령은 아니다.

`runtime.sequencePose({target,offset:0,limit:64})`는 현재 실제 모델의 뼈·로컬 포즈·제어 시각과 nextOffset을 요청할 때만 반환한다. limit 최대512는 한 페이지 예산이며 골격 수 제한을 추가하지 않는다. 구성 또는 컴포넌트 녹화와 골격을 함께 켜면 모델 교체/제거를 Take에 남기고 이후 시퀀스에서 재생/되감기/정지 복원한다.


## 210–211: 선택 애니메이션 예산·생성 Take

AnimationBudget 컴포넌트(enabled,budgetMS,minRate,maxRate,initialCostMS,smoothing,priority)를 같은 scene 편집/revision/Undo로 설정한다. RuntimeLOD.animationPriority가 actor 우선순위다. runtime.lod.animationBudget의 observedMS는 graph.tick wall 시간이고 전체 프레임/GPU 시간이 아니다. minimumExceedsBudget는 최소Hz+보호work 때문에 초과한 경우다. C++ hb::AnimationBudget의 SetBudget/SetEnabled/GetObservedMS/GetThrottledCount와 BP4노드가 같은 속성/명령을 쓴다.

runtime.take.start에 includeSpawned:true를 주면 시작 뒤 추가된 오브젝트를 spawn bool 트랙과 시각 템플릿으로 기록한다. 고유 ID의 passive 복사본만 재생하며 사용자 코드/물리를 다시 실행하지 않는다. 임의 native 상태/기존 대상 수명/소스 필터까지 기록하는 기능은 아니다. sequence.take.apply는 기존 dryRun/expectedRevision/Undo와 동일하다. runtime.state의 소유자 gameplayDebug.sequence.spawned에서 source/id 대응을 조회한다.

timeline.preview.read({path})는 열린 sequenceasset/montage 제작 미리보기의 time,busy,error,objects를 요청할 때만 반환한다. 원본/스크러버 시각을 바꾸지 않으며 busy가 false가 된 뒤 실제 독립 복사본을 확인한다.


## 212–213: 타입 있는 상태 녹화와 실행 검사

runtime.take.start의 includeVariables:true는 공개 C++ 쓰기 속성/배열과 BP 변수/배열을 기록한다. variable 트랙은 variable(안정ID), nativeProperty 트랙은 className/property를 가지며 양쪽 모두 valueType/array와 검증된 keys를 저장한다. 배열은 step이고 기본 float/vector/color는 보간한다. 키JSON64KiB/배열128개 예산, readonly C++/미등록 struct/중첩 컨테이너는 제외한다. 같은 LevelSequence C++/BP Play/Pause/Seek/Stop과 worker snapshot/변수 Map에 연결하며 별도 per-frame nativeSet 질의는 없다.

runtime.values({target,offset:0,limit:64})는 녹화 가능한 변수의 metadata/value와 total/nextOffset을 읽는다. limit 최대256은 한 페이지다. development player에서는 hbPlayerDebug.values(target,options). timeline.preview.read.values는 실제 독립 미리보기의 바인딩 값이다. 미리보기는 BP/C++ 선언/기본값을 읽고 사용자 코드/물리/AI를 재실행하지 않는다.

scene.select는 실행 중에도 오브젝트를 선택/검사할 수 있다. 제작값 변경 명령의 실행 중 차단은 유지한다. 선택 Inspector는4Hz로 현재 leaf만 갱신하고 등록 컴포넌트/선언 구조가 바뀌었을 때만 레이아웃을 갱신한다. 참조 component/widget 핸들은 아웃라이너 액터 수에서 제외되지만 런타임 조회용 ID는 보존한다.

### 노멀 변화와 현재·이전 필터 폭

`schema.raySurfaceHistory.opticalSpread.normalVariation`의 불변 계약을 따르세요. `PostProcessVolume.pathTracingNormalFootprint`에 `off`/`geometry`/`material`을 공유 컴포넌트 명령으로 설정해요. C++는 `hb::Components::SetString(actor,"PostProcessVolume","pathTracingNormalFootprint","material")`, 노드는 `componentSetString`이에요. 기본값 `off`를 유지하면 추가 노멀 평가가 없어요. DirectX 진단의 `pathNormalFootprint`는 0/1/2예요. 비용·미분 모델·남은 전역 한계와 실제 패키징 근거는 [NORMAL_FOOTPRINT_746](research/NORMAL_FOOTPRINT_746.md)에 있어요.

### CPU 광선 밉 변환 캐시

`schema.rayMipCache`, `profiler.read.rayMipCache`와 `profiler.rayMipCache`를 사용해요. 후자는 선택 `budgetBytes`(안전한 정수>=0), `clear`(Boolean)를 받아요. 기본256MiB이고0은 보관을 꺼요. 같은 풀을 프로파일러 UI에서 조작해요. 현재·이전 활성 스냅샷은 퇴역/비우기 뒤에도 유지돼요. 이 수치는 변환 Float32 캐시만 세며 전체 RAM/VRAM·GPU 상주 예산은 아니에요. [실행·비용·다음 GPU 단계](research/RAY_MIP_CACHE_752.md).

### 머테리얼 GPU 상주 밉

`schema.textureResidency`와 `schema.textureResidencyPool`을 따르세요. 장면의 `TextureStreaming` 컴포넌트는 상주/전환 예산 MiB·갱신 초·한 번의 전환 수·해상도 배율·밉 보정·설정 우선순위를 제공해요. `MeshRenderer.textureStreamingPriority`로 품질 배분을 바꾸고 `textureStreaming=false`로 전체 밉을 고정해요. 제작에는 기존 document CAS/Undo/Redo, 실행에는 기존 Components C++/노드를 사용해요.

`Materials::SetResidentMip(actor,"Paint",1)`/`materialResidentMip`는 수동 지정, -1은 자동 복귀예요. 원본 밉 번호로 샘플링/부분 수정하며 전체 복원은 CPU 원본을 사용해요. `profiler.textureResidency({offset:0,limit:64})`는 소유자/파라미터별 요청·예산·상주 밉과 페이로드 바이트, 임시 예약, 필수 초과와 차단/오류를 읽어요. limit 최대256은 페이지예요. 같은 수치를 실제 프로파일러에서 보여줘요. 이 풀은 노드 머테리얼의 명시적 RGBA8 밉 페이로드이며 전체 VRAM/드라이버 heap/디스크 스트리밍이 아니에요. [지원·수명·실행·남은 범위](research/TEXTURE_RESIDENCY_772.md).

### GL 가이드 준비 선택

`schema.pipelinePreparation.glGuideSpecialization`과 `pipelinePreparation.guideMode`를 읽으세요. general/noMirror/diffuse는 실제 base/coat 값과 동적 채널에서 보수적으로 선택돼요. 사람·C++·블루프린트가 기존 머테리얼 파라미터를 바꾸면 같은 준비 경로가 갱신돼요. 가이드만 바뀔 때는 기존 path 머테리얼/프로그램을 유지해요. 이전 클록·노멀·밉과 표면/가시성 거부는 유지하며 강제 선택 명령은 없어요. [실제 픽셀/게임/준비 시간 범위](research/GL_GUIDE_PREPARATION_783.md).

`schema.pipelinePreparation.glRayAtlas`와 `renderer.rayAtlasRecovery`는 GL 광선 atlas의 최초 전체 초기화·리소스 복구 횟수와 CPU 페이로드 바이트를 설명해요. 같은 리소스의 후속 변경은 기존 행 부분 전송을 유지해요. 이 값은 GPU heap 사용량이나 모든 프레임 전송량을 뜻하지 않아요.

### 사용자 지정2D 디스크 밉

`schema.textureDiskMips`를 읽으세요. 텍스처2D의 전체 사용자 지정 이미지 체인에 `streaming:{enabled:true,width:4,height:4,initialMip:2}`를 설정하면 최하위 이미지부터 필요한 꼬리만 읽어요. 사람은 미리보기 뒤 속성의 **디스크 밉 사용**, AI는 같은 문서의 CAS 패치·저장·Undo를 사용해요. C++의 `hb::Materials::SetResidentMip(actor,"Bands",0)`과 블루프린트 `materialResidentMip`, TextureStreaming 풀은 같은 비동기 준비/적용을 사용해요. 풀이 없으면 초기 밉이 다음 요청까지 유지돼요.

binding의 `residency.disk.decodedBytes/logicalBytes/pendingReads/reads`와 머테리얼의 `pendingRequests/stagedRequests`로 상태를 확인하세요. `reads`는 브라우저 캐시를 포함한 이미지 로드 시도예요. 현재·후보 view가 사용하지 않는 decoded 꼬리와 진행 요청은 해제돼요. 선택을 바꾸거나 해제하면 오래된 transaction은 commit:false이고 완료된 미적용 후보도 정리돼요. 디스크 view의 dispose는 종료이며 재사용에는 새 view가 필요해요.

현재 디스크 모드는 처리 없는 RGBA8 사용자 지정2D 체인이에요. 커버리지·합성·노멀 재처리·상위 밉 필터/다른 차원·압축/HDR/raw·런타임 영역 수정에는 일반 가져오기 경로를 사용하세요. 디스크 소스를 위한 영역 수정은 읽기 전용으로 거부돼요. [제작·취소·실제 세 GPU/게임/AI 검증과 범위](research/TEXTURE_DISK_MIPS_796.md).

`schema.textureResidencyPool.graphDemand`는 같은 머테리얼 그래프의 UV·파라미터·시간과 LOD/기울기/bias 수요를 설명해요. `profiler.textureResidency.items[].demandBasis/desiredBase`와 머테리얼 `textures.bindings[].sourceNode`로 해당 그래프 노드를 찾으세요. 기존 C++·블루프린트 파라미터 setter와 문서 편집이 같은 계산을 갱신해요. 비선형/지원하지 않는 수요는 수준0을 요청하되 예산을 따라요. 화면 투영은 bounds 추정이며 보조 광학/삼각형 미분의 완료를 뜻하지 않아요. 설정·장면 취소는 이전 풀의 owned 읽기만 중단하고 새 수동 요청은 유지해요. [지원 범위와 실제 실행 근거](research/UV_GRAPH_DEMAND_806.md).

### 메시 거리장 차폐

`schema.meshDistanceFields`에서 속성과 진단·제약을 읽으세요. `PostProcessVolume`의 `aoEnabled=true`, `aoMode="distanceField"`로 선택하고 `aoRadius/aoBias/aoIntensity/aoDistanceFieldResolution/aoDistanceFieldBudgetMB`를 같은 문서 CAS·Undo/Redo·저장으로 편집해요. 사람용 속성 UI와 같은 설정이에요. 기존 `hb::Components::SetBool/SetString/SetFloat`와 `componentSetBool/componentSetString/componentSetFloat` 블루프린트 노드를 사용해 게임에서도 변경할 수 있어요.

`profiler.read`의 rendering 항목과 실행기 `renderer.distanceFields`에서 준비·대기·제외 원인·로컬 볼륨/atlas/대기 입력 페이로드·정적/강체 부분 쓰기를 확인하세요. 비활성·장면 해제는 소유한 작업과 자료를 정리해요. CPU 볼륨 복사 0은 전체 GPU 전송 0이나 전체 메모리 0을 뜻하지 않아요. [구현·실제 GL/WebGPU/DirectX·제작 검증과 남은 정밀도/시간 필터](research/MESH_DISTANCE_FIELD_AO_821.md).

`distanceFields.analyticFields/voxelFields`는 검증된 기본 도형의 거리식과 일반 모델의 볼륨 수를 구분해요. `ready`만으로 전체 준비를 판정하지 말고 `pending===0`과 실패·제외 진단도 읽으세요. [도형 판별·일반 볼륨 보존·352B 큰 평면 장면의 실제 검증](research/MESH_DISTANCE_PRIMITIVES_835.md).

## 회전 반사 영역 · 986–995
ReflectionProbe의 기존 크기/offset/captureOffset/blendDistance/boxProjection과 오브젝트 Transform을 편집해요. 영역 회전은 일반 Transform/C++ Scene::SetRotation/같은 블루프린트 노드로 지정하며 새 네이티브 코드를 작성하지 않아도 돼요. 부모 전단·음수/비균일 크기의 전체 affine 역변환을 GL/WebGPU/DirectX가 공유해요. localX/localY/localZ/faceScale은 파생 바인딩 행이며 저장 에셋에 작성하지 않아요. 캡처점이 고정된 영역 변형은 기존 캡처를 재사용해요. 직접GPU SDK에서는 hb::gpu::setProbeWorldToLocal(ProbeSettings&,const Matrix&)가 검증/예외와 실패 시 원래 값 보존을 제공해요. 새128바이트 ProbeSettings와 실행기를 함께 사용해요. 수치·실제 C++/BP 게임·미구현 범위는 [995 기록](research/AFFINE_REFLECTION_PROBES_995.md)을 확인해요.

## 현재·이전 노멀 디코딩 · 1030–1037
자동화 raySurfaceHistory.normalDecode 계약2는 RGB를 signed tangent normal로 푼 뒤 최대 절대 성분으로 먼저 크기를 조절하는 GPU 정규화를 명시해요. CPU는 기존 double hypot예요. 기존 Normal Map 노드·파라미터·C++ Materials::SetFloat/블루프린트 materialFloat를 그대로 사용하며 새 에셋 키나 수동 쉐이더 패치가 필요하지 않아요. 중립[0,0,1]은 유지하고, 유한하고 GPU에서 표현 가능한 중간 성분을 대상으로 해요. 이전/현재 필드·Float 노멀 밉·실제 SDK 게임 증거와 미지원 수치 범위는 [1037 기록](research/NORMAL_RANGE_1037.md)에 있어요.

GPU 물리 시선 계약은 schema.cameraView와 WebGPU renderer.cameraView에서 읽어요. 시선/막 간섭/명시 읽기의 소유·비용·범위는 docs/GPU_PHYSICAL_VIEW.md를 확인해요. C++ Materials::SetFloat와 생성 BP 노드는 기존 공용 서비스를 사용해요.

반사 후보 공간 인덱스는 reflectionProbeBlending version3/atlasContract에서 읽어요. 기존 C++/BP 명령과 JSON은 같아요. renderer.probes.atlas.spatial/candidates 및 native probeAtlasSpatial* 진단을 사용하며 낮은 수준의 native table SRV는 stride16 float4 행이에요. docs/PROBE_SPATIAL_INDEX.md를 확인해요.

## 1241 — 구조체·분기 편집

`blueprint.struct.configure`와 `blueprint.switch.configure`는 문서 revision/dryRun/Undo/상속 소유 검증을 공유해요. 타입·선택 필드·고정 Case ID·정렬은 [구조체/분기 계약](BLUEPRINT_STRUCT_OPERATIONS.md)과 `schema.blueprintStructs`에서 확인해요. 노드는 기존 document.patch로 생성하고, 원본 변수·배열·함수 입력 참조 수정과 임시 값의 결과 사본을 구분해요.

## 1250 — Shot/Sub-Sequence

`sequence.section.edit`는 기존 문서 revision/dryRun/Undo를 공유해요. `runtime.sequenceTree`는 활성 트리의 로컬 시간/누적 우선순위를 페이지로 조회해요. [구간 제작·실행 계약](SEQUENCE_SECTIONS.md)에 저장 형식과 지원 범위를 적었어요.

## 1259 — 네트워크 관심 후보

`schema.replicationInterestIndex`와 서버의 `inspect().interestIndex`는 가변 반경 후보/셀/소유자/동일 셀 갱신 통계를 요청할 때 읽어요. 기존 컴포넌트·메시지·권한 규칙은 [네트워크 관심 영역 계약](NETWORK_INTEREST_INDEX.md)을 따라요.

### 시퀀스 기준점·커브 (1266)

`sequence.origin.edit`: `path`, `expectedRevision`, `origin:{mode:inherit|transform|actor,actor,position:[x,y,z],rotation:[x,y,z]}`, `dryRun`. origin 생략은 설정 제거예요. `sequence.curve.edit`: 같은 문서 인자와 `track` ID, `key` 배열 인덱스, `interpolation`, `arriveTangent`, `leaveTangent`를 받아요. 탄젠트는 키 값과 같은 형식의 초당 기울기이며 null은 제거예요. 두 명령은 공용 검증·Undo·revision을 사용해요. `runtime.sequenceTree`의 origin은 요청한 설정이며 전체 월드를 표본화하지 않아요. 세부 규칙은 [SEQUENCE_ORIGINS_CURVES](SEQUENCE_ORIGINS_CURVES.md)에 있어요.

### 가상 목록·트리 이동 (1274)

ListView/TreeView의 `properties.reorderable:boolean`, `transferGroup:string`(최대80자)을 기존 document.patch/transaction·CAS·dryRun·Undo로 편집해요. 그룹이 비어 있으면 내부 이동만 가능해요. 공용 모델/런타임 계약과 소스는 [LIST_TRANSFER](LIST_TRANSFER.md)에 있어요. 실행 Changed 이벤트는 `listChange:reparented|transferIn|transferOut`, `listPeer`, `reorderParent`와 기존 선택 정보를 전달해요. 새 전용 게임 C++/BP 이동 함수는 추가하지 않았어요.

C++ 클래스·명시 반사 멤버는 `native.classes.read`로 페이지 조회해요. C++ 접근 범위·namespace·정규 클래스명과 핀 자료형을 기본값/소스 전체 복제 없이 읽어요. 자세한 인자·원본 접근 제어와의 구분은 [NATIVE_CPP_ACCESS.md](NATIVE_CPP_ACCESS.md)를 참고해요.

## 블루프린트 멤버 접근 조회 (1531–1536)

`blueprint.members.read({path,kind:"all",offset:0,limit:32,query:""})`: functions/macros/variables를 최대128개씩 조회해요. owner/access/inherited/callable/editable/overrideAllowed와 핀 자료형을 반환해요. 그래프·변수값·기본값은 복제하지 않아요. `readOnly:true`, `count`, `nextOffset`으로 페이지를 이어가고, 수정은 기존 expectedRevision 명령을 사용해요. Public/Protected/Private의 실제 상속·참조·네이티브 래퍼 검사와 Private 재정의 거부는 `docs/BLUEPRINT_ACCESS.md`를 확인해요. C++ cppAccess와 별개예요.

1574–1576 네트워크 수명: `runtime.network`는 kind(replicas/remote/removals/failures), offset, limit(32/최대128), query(최대160자)로 메타데이터를 나눠 읽는다. kind 생략 시 기존 요약을 유지한다. 값·변환·그래프·접속 키는 반환하지 않으며 원격 생성의 접속 세대/루트 생존·같은 ID 교체·오프라인 풀 등록을 보호한다. [실행 계약과 경계](NETWORK_LIFETIME.md).

1582 이후 `editor.history.inspect`는 slotBudget(기본2000000/최대8000000)과 truncatedBy를 제공한다. `includeRevision:false`는 현재 문서 캡처/해시 없이 확정된 이력만 읽고 revision:null/unflushed:true를 반환하며 expectedRevision 병용은 거부한다. [예산·격리 계약](DOCUMENT_HISTORY.md).

반사·베이크 혼합: MeshRenderer.lightmapReflectionMix Bool(기본false), Components::SetBool/GetBool 및 같은 BP 공용 노드. runtime.state의 gameplayDebug.lightmap에 reflectionMixEnabled/Eligible·valid/source를 제공한다. [정책·비용·실행 근거](PROBE_LIGHTMAP_MIX.md).

MeshRenderer 실행 속성 다섯 개의 자원 유지 갱신과 requestedIntensity/effectiveIntensity/inPlacePropertyUpdates는 docs/MESH_RENDERER_LIVE_PROPERTIES.md를 따라요. document.patch/Undo와 실행 값은 구분해요.
