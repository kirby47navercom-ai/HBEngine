# 사람과 AI가 함께 편집하는 HBEngine

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

사람의 Play와 AI의 `runtime.play`는 같은 `native-transport.js`를 사용한다. C++ 빌드 결과 `metadata.workerProtocol:3`은 첫 전체 입력 이후의 변경분과 변경된 객체만 반환하는 계약이다. 이전 메타데이터 1/2는 기존 전체 요청을 유지한다. BP 노드/에셋을 AI가 변경할 때 이 내부 전송 캐시를 에셋에 저장하지 않는다.

직접 `/api/native/call`을 호출하는 도구는 기존 `{token,request:{objects,...}}` 전체 요청을 계속 사용할 수 있다. 변경분 전송은 `request.worldTransport:1`, `worldId`, `baseSequence`, `worldSequence`를 사용하며 첫 요청은 `baseSequence:0/worldSequence:1/objects`다. 후속 요청은 objects를 생략하고 `objectPatch`와 이전/다음 sequence를 전달한다. 같은 worker를 쓰는 여러 BP는 같은 Play 세계의 전송 상태를 공유한다. 응답의 worldSequence 확인 후에만 기준을 갱신하고, 오류/유실 응답 이후 다음 명시적 호출은 전체 입력으로 동기화한다. 함수 실행을 자동 재시도하지 않는다. 새 Play/장면은 명시적 reset으로 기존 C++ 수명을 정리한다.

응답의 `objects:[]`는 C++ Transform/공개 속성에 변화가 없다는 뜻이다. 전체 장면이 사라졌다는 뜻으로 해석하지 않는다. `transport`의 `upstreamMode/upstreamBytes`, worker `mode/bytes`, `prepareMs/rpcMs`, `replyBytes/returnedObjects`는 전송/반환 비용이다. GPU/화면 표시 FPS로 해석하지 않는다. 전체 장면 검증·형상 질의·JSON 한도/복구는 [경량화 계약](PERFORMANCE_BUDGETS.md)에 연결한다.

후속 worker는 `transport.parseMs/patchMs/syncMs/invokeMs/snapshotMs/workerMs`를, host는 `decodeMs/validateMs/replyValidationMs`를 반환한다. AI도 전체 왕복이 느린지 실제 사용자 함수가 느린지 이 값으로 구분할 수 있다. 호출/프로세스 대기와 출력 직렬화가 포함된 `rpcMs`와 내부 `workerMs`를 더하지 않는다. 이전 worker에서 없는 필드는 미측정으로 처리한다. 실행 진단을 BP 에셋의 선언/핀/기본값에 저장하지 않는다.

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

결과 JSON의 `mode`는 `headless-logic`이며 오브젝트, 역할, 변수, 시간, 로그, 스프라이트 프레임 전환, 해당 실행의 저장 슬롯을 제공한다. 게임 저장은 실행마다 격리된 메모리 슬롯이고 사용자 저장 파일을 덮지 않는다. 입력에 대한 최종 위치·충돌·이벤트·변수의 예상값을 자동으로 검사할 수 있다. GPU 그림·음향·위젯을 검사했다고 표시하지 않는다. 해당 서비스 호출은 실제 화면 검사가 필요하다는 오류로 실패하며 몰래 성공 처리하지 않는다.

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
