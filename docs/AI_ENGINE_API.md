# 사람과 AI가 함께 편집하는 HBEngine

AI 친화성은 블루프린트 파일에 한정하지 않는다. 프로젝트, 에셋, 장면, 컴포넌트, 머테리얼, 애니메이션, 실행 상태가 버전 있는 데이터로 표현되고, UI와 자동화가 같은 검증·실행 취소·저장 경로를 사용한다. 화면 좌표와 한국어 표시 이름을 데이터 식별자로 쓰지 않는다.

## 현재 연결

- `GET /api/schema`: 생성 가능한 에셋의 예제, 컴포넌트 필드·범위·기본값, 클래스 상속, 블루프린트 노드와 핀, 머테리얼 노드, 편집기 명령. 실제 UI/런타임 정의를 가져오므로 별도 AI용 사본이 없다.
- `GET /api/project?recursive=1`: 파일, 폴더, 종류, 안정적인 에셋 UUID. 생성·이름 변경·가져오기는 기존 `/api/asset/create`, `/api/rename`, `/api/import`를 공유한다.
- `GET /api/asset/info?path=...`: SHA-256, 재가져오기 revision, 직접 의존성과 역참조, 누락된 파일. `POST /api/asset/reimport`는 `{paths:[...]}`를 받고 간접 영향 목록을 돌려준다.
- `GET /api/automation`: 연결된 편집기 인스턴스와 각 창의 프로젝트, 열린 문서, 선택, 실행 상태. 인스턴스가 여러 개면 `clientId`를 명시해야 한다.
- `POST /api/automation/command`: `{clientId,requestId,method,params}`. 반환된 `id`를 `GET /api/automation/command?id=...`로 확인한다. 같은 `requestId`와 내용은 중복 실행하지 않는다.
- `document.get`: 저장하지 않은 현재 편집 데이터와 SHA-256 revision을 반환한다. 디스크 파일만 읽어 사람의 진행 중인 편집을 놓치지 않는다.
- `document.patch`: `expectedRevision`과 JSON Patch의 `test/add/replace/remove`를 사용한다. 모든 작업을 복사본에 적용하고 최종 에셋을 검증한 뒤 한 번의 Undo 항목으로 반영한다. `dryRun:true`는 적용하지 않고 검증 결과를 반환한다.
- `document.save`, `editor.undo`, `editor.redo`: 같은 revision 보호를 사용한다. 저장할 때 디스크의 이전 내용도 대조하고 `Saved/Backups`에 원본을 남긴다.
- `scene.select`, `document.open`, `native.build`, `runtime.play/stop/pause/resume/input/openScene/state`: UI의 실제 편집·실행 함수를 사용한다. 런타임 상태는 현재/대기 장면, 차원, 뷰 모드, 환경, 오브젝트, 게임 프레임워크, 시간, 로그를 JSON으로 반환한다. 객체의 `gameplayDebug`에는 소유 에셋·blackboard/parameters·BT 상태·FSM 상태·montage/sequence 시간·navigation 경로/상태·perception 자극·particles 수가 포함된다.

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

현재 JSON 데이터 검증과 편집 명령이 제공된다. 전체 JSON Schema 표준, 다중 문서 원자적 트랜잭션, 원격 협업 병합, C++ 코드 자동 수정, 독립 native 게임 플레이어, 전체 성능 프로파일러까지 완성했다는 뜻은 아니다. 새로운 엔진 기능은 구현과 함께 이 공통 명령·스키마·검증 경로에 노출해야 한다.

## 검증

`npm run test:integration`은 패치 실패 시 원본 보존, 위험한 JSON 경로, 명령 중복·다른 창 응답 차단, 에셋 ID/참조/재가져오기, 디스크 충돌·백업을 검사한다. `npm run test:editor-api`는 별도 `integration-qa-*` 프로젝트를 연 실제 편집기에서 수정·충돌 거부·Undo·저장·2D 착지·종료 복구를 확인한다. 사용자 작업 프로젝트에서 변경 검사를 실행하지 않는다.

## 화면 없이 게임 로직 검사

```powershell
node tools/run-project.mjs C:/Games/MyGame/MyGame.hbproject scenario.json
```

`scenario.json`은 `{ "frames": 180, "delta": 0.016666666666666666, "inputs": [{ "frame": 60, "key": "d", "value": 1 }, { "frame": 90, "key": "d", "value": 0 }] }`처럼 프레임과 입력을 지정한다. 선택적인 `scene`은 프로젝트 상대 경로다. 같은 BlueprintRuntime·컴포넌트·고정 물리·게임 프레임워크·사용자 C++ 호스트를 사용한다. C++이 연결되면 실제 컴파일과 함수 호출을 수행한다.

결과 JSON의 `mode`는 `headless-logic`이며 오브젝트, 역할, 변수, 시간, 로그, 스프라이트 프레임 전환, 해당 실행의 저장 슬롯을 제공한다. 게임 저장은 실행마다 격리된 메모리 슬롯이고 사용자 저장 파일을 덮지 않는다. 입력에 대한 최종 위치·충돌·이벤트·변수의 예상값을 자동으로 검사할 수 있다. GPU 그림·음향·위젯을 검사했다고 표시하지 않는다. 해당 서비스 호출은 실제 화면 검사가 필요하다는 오류로 실패하며 몰래 성공 처리하지 않는다.

`npm run test:headless`는 독립 임시 2D 프로젝트의 이동·점프·착지·원본 보존과 실제 사용자 C++ 함수의 공통 서비스 호출 결과를 검사한다.

`runtime.input`은 `{key:"d",value:1}`(눌림), `{key:"d",value:0}`(놓기)을 받아 같은 PlayerController/InputAction 경로를 실행한다. 일시 정지 중 입력은 거부하며 `runtime.resume`으로 재개한다. `runtime.openScene`은 `{path:"Assets/Scenes/Next.hbscene.json"}`을 검증해 전환을 요청한다. 완료는 `runtime.state.scene`으로 확인한다. 장면 전환 후 Stop해도 기존 편집 장면과 원본 파일은 보존한다. 화면 없는 결과에는 `sceneHistory`의 전환 장면/프레임이 추가된다.


## AI·상태·연출·효과 데이터

`/api/schema`에 43종 컴포넌트, 473개 기본 BP 노드, 102개 C++ 실행 서비스와 새 에셋 예제를 함께 노출한다. 타입 ID는 `blackboard`, `behaviortree`, `statemachine`, `montage`, `sequenceasset`이다. UI 생성·파일 검증·JSON Patch·의존성 추출·실행기가 같은 정의를 사용한다. 표시 이름 대신 객체/노드/상태/트랙/클립의 안정적인 ID로 연결한다.

- BB: `keys[{name,type,value}]`; `bool/int/float/string/vec3/object`. int32·벡터·객체 ID 검증을 적용한다.
- BT: `blackboard`, `root`, `interval`, `nodes[{id,type,properties,children,services,x,y}]`. 순환/다중 부모·자료형·노드 수/깊이를 검증한다. 서비스는 이벤트/간격을 가진다.
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
