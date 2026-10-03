# 강체·관절·공간 검색의 제작/실행 대조 — 2026-10-03

이후 형상 추가와 검증은 [충돌 형상 연구](COLLISION_GEOMETRY_RESEARCH.md)에 연결했다. 실제 convex hull/triangle mesh·오목한 PolygonCollider2D/열린 EdgeCollider2D, 편집/생성/저장·AI revision·BP/C++ 동일 query가 추가됐다. 기본 강체 136개 검사와 형상 67개 검사를 각각 유지한다.

사용자의 요구 범위는 Unreal/Unity 전 영역과 각 영역의 세부 동작이다. 이번 물리 구현은 그 범위의 일부다. 전체 매뉴얼·API·패키지를 모두 읽었거나 엔진 전체를 완성한 상태로 기록하지 않는다. [전체 영역 대조](REFERENCE_COVERAGE.md)와 [분야별 기존 연구](ENGINE_WORKFLOW_RESEARCH.md)를 함께 유지한다.

## 실제 읽은 자료와 적용 판단

본문 확인 범위는 [detail-audit.json](reference-index/detail-audit.json)에 따로 기록한다. 링크된 다른 페이지를 자동으로 읽음 처리하지 않는다. Unity 자료는 6000.0, Epic 제약 속성 페이지는 조사 당시 표시된 UE 5.8, 적용 라이브러리는 Rapier 0.21.0이다.

| 자료 | 확인한 세부 의미 | HB 적용 / 남은 차이 |
| --- | --- | --- |
| [Unity Rigidbody](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Rigidbody.html) | 질량·감쇠·질량 중심/관성·중력·키네마틱·충돌 감지·축 고정 속성 | 실제 질량/회전 관성을 가진 강체, 감쇠·중력 배율·운동 형식·CCD·축 고정. 질량 중심/관성 텐서 직접 편집·보간·전체 감지 모드 조합은 남음. |
| [Unity Dynamic Rigidbody 2D](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/rigidbody/body-types/dynamic/dynamic-body-type-reference.html) | 밀도 기반 질량, 선형/각 감쇠, XY 이동/Z 회전 제한, 잠들기·보간·레이어 속성 | 별도 2D solver와 Circle/Box/Capsule, 자동/수동 질량·축 체크박스. Simulated·초기 sleep mode·보간·include/exclude override 전체는 남음. |
| [Unity Kinematic 2D](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/rigidbody/body-types/kinematic/kinematic-body-type-reference.html), [Static 2D](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/rigidbody/body-types/static/static-body-type-reference.html) | 직접 이동 바디와 고정 바디의 구분, 형식별 속성, 접촉 통지의 차이 | Dynamic/Kinematic/Static 선택과 실제 solver 상태. HB의 enabled·모든 접촉 통지 의미가 Unity Simulated/Full Kinematic Contacts와 같다고 보장하지 않음. |
| [Unity Joints](https://docs.unity3d.com/6000.0/Documentation/Manual/Joints.html) | 강체 연결/월드 고정, 관절 형식별 자유도, 한계/구동, articulation 구분 | Fixed/Hinge/Slider/Spring/Rope/Ball, 로컬/연결 앵커, 한계와 모터. articulation·전체 configurable axes·파괴 조건은 남음. |
| [Unity AddForce](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rigidbody.AddForce.html) | 네 적용 모드의 질량/시간 의존성, 동적 바디 요구, 0 힘과 sleep | force/acceleration/impulse/velocityChange를 실제 강체에 적용하고 질량/고정 시간별 결과 검사. HB는 비동적 대상 호출을 오류로 거부함. |
| [Epic Physics Constraint Reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-constraint-reference-in-unreal-engine) | 연결 Actor/Component, 앵커, 선형/각 자유도·한계·구동, 충돌, projection/soft/break/plasticity | 유형별 속성 그룹과 실제 관절. UE의 전체 6자유도·Swing/Twist·SLERP·soft limit·break force·plasticity·projection 제어는 구현하지 않았음. |
| [Epic Collision Response](https://dev.epicgames.com/documentation/unreal-engine/collision-response-reference-in-unreal-engine?lang=en-US) | 질의와 solver 사용 구분, 채널 응답/트리거와 접촉의 차이 | both/query/physics/none과 기존 trigger·32비트 layer/mask. 채널별 Block/Overlap/Ignore 표와 전체 collision profile·Hit 통지 옵션은 남음. |
| [Rapier Getting Started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/), [Rigid Bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/) | WASM 준비, 별도 월드/바디/콜라이더, 질량·회전 관성·동적 상태 | 실제 WASM 초기화 후 Play. 2D/3D 월드를 분리하고 에디터/VM/C++ 객체 ID를 공유함. |
| [Rapier Joint Constraints](https://rapier.rs/docs/user_guides/javascript/joint_constraints/) | impulse constraint와 multibody articulation의 차이, 오차·안정성 고려 | impulse joints 적용. reduced-coordinate articulation을 구현한 것으로 표시하지 않음. |
| [Rapier Advanced Collision Detection](https://www.rapier.rs/docs/user_guides/javascript/advanced_collision_detection_js/) | broad/narrow phase, contact/intersection graph, hooks, EventQueue, CCD 역할 | solver 필터·실제 접촉 법선·침투와 트리거 graph를 연결함. static/static은 별도 정확 형상 검사로 기존 HB 이벤트 의미를 유지함. |
| 설치된 Rapier 0.21.0의 `physics_pipeline`·`physics_hooks`·`rigid_body`·`impulse_joint`·`collider`·`shape` 선언/구현 | 현재 버전의 정확한 함수·단위·반환 좌표계·호출 분기 | 공식 웹 설명과 실제 설치 버전을 함께 대조함. hooks에는 EventQueue가 함께 있어야 하는 구현 분기, 2D debug vertex stride, shape cast의 로컬 witness/normal을 직접 확인함. |

## 공용 실행 경로

`scene-components.js` → 파일 생성/검증 → Scene/BP Inspector 또는 revision 기반 AI 수정 → 저장 JSON → `play-world.js`의 원본 복제 → `engine-services.js` → `physics-world.js` → 같은 BP/C++ 서비스 → `runtime.state`/접촉 이벤트/충돌 표시 → Stop 정리와 원본 복구.

편집 화면·헤드리스 로직 실행·블루프린트는 기본적으로 Rapier를 사용한다. 기존 `createScenePhysics`는 기존 직접 검사와 명시적 legacy hook 호환용으로만 남긴다. UI에서 AABB 근사 solver를 기본 실행으로 선택하지 않는다. 네이티브 C++ 물리 backend나 DX11 게임 Player를 구현한 상태는 아니다.

2D는 XY 이동/Z 회전, 3D는 XYZ 이동/회전이다. 두 차원의 충돌체는 서로 충돌하거나 검색되지 않는다. 2D 객체의 표시용 Z를 유지하므로 2.5D 렌더 구성과 결합할 수 있다. 2.5D 전용 제작 도구 전체 완료라는 뜻은 아니다.

고정 스텝은 프로젝트 설정을 사용한다. 각 스텝의 FixedUpdate/C++ 명령 → 입력/지속 힘 → solver → 객체의 월드/로컬 변환 갱신 → Overlap/Hit 경로를 사용한다. 프레임 단위 힘이 누적돼 다음 스텝에 계속 남지 않도록 스텝 뒤 force/torque를 정리한다. 늦은 프레임의 무한 catch-up은 `maxSubsteps`로 제한한다.

## 실제 추가한 설정과 동작

- `Rigidbody`/`Rigidbody2D`: 운동 형식, 수동/밀도 기반 질량, 선형/각 감쇠, 중력 배율, 시작 선속도/각속도, CCD, 위치/회전 축 고정, sleep/wake 조회/변경. 복수 콜라이더의 질량·관성 계산과 크기 변경을 반영한다. 트리거 전용 강체에도 형상 질량·관성을 계산한다.
- Box/Sphere/Capsule와 대응 2D 형상: 회전된 실제 형상, 중심/크기, trigger, 사용 모드, 32비트 layer/mask, 물리 재질의 밀도/마찰/반발·혼합 규칙. `query`는 검색/트리거용, `physics`는 검색 제외/solver용, `none`은 제거다.
- `PhysicsConstraint`/`PhysicsConstraint2D`: Fixed/Hinge/Slider/Spring/Rope/Ball, 월드 고정 또는 객체 ID 연결, 앵커 자동 계산/수동 입력, 충돌 허용, Hinge/Slider 한계·모터, Spring 길이/강성/감쇠, Rope 최대 길이. 연결 대상 삭제/컴포넌트 제거 때 실제 관절을 정리한다.
- `ConstantForce`/`ConstantForce2D`: 매 고정 스텝의 월드 힘·토크. 2D 토크는 Z를 사용한다.
- 편집 UX: 운동 형식 하나로 선택하며 구형 `isKinematic` 데이터도 읽는다. 2D 축 고정은 XY/Z 체크박스다. 관절 형식에 해당하는 필드만 표시하고, 자동 앵커일 때 수동 연결 앵커는 숨긴다. 같은 차원의 실제 물리 대상만 연결 목록에 표시하고 유효하지 않은 기존 ID는 유지/표시한다. 속성 변경 후 열린 그룹·스크롤·컴포넌트 포커스를 유지한다.
- 충돌 표시: 편집 시 정확 형상/회전 미리보기, 실행 시 실제 solver의 debug 기하·관절. 2D debug XY 버퍼를 XYZ로 변환한다. 자원을 Stop/Dispose에서 해제한다.

축 고정의 JSON 표현은 기존 호환성을 위해 `[0,1,0]` 같은 0/1 벡터다. UI 체크박스와 AI가 같은 데이터로 편집한다. 오브젝트 Transform 회전과 Hinge 한계/모터 각도는 도, 실제 각속도 API는 rad/s다. Slider 위치/한계는 m, 선속도는 m/s다. `isKinematic:true`는 구형 호환 규칙상 `bodyType`보다 우선하며 UI에서 운동 형식을 바꾸면 두 필드를 맞춘다.

자동 질량은 활성 형상이 있을 때 밀도 합을 사용한다. collider가 없으면 설정된 `mass`를 사용하고 선형 힘/충격에 반응한다. 형상을 추가하면 밀도 질량으로, 마지막 형상을 제거하면 설정 질량으로 돌아간다. 형상 없는 바디의 회전 관성 직접 지정은 아직 지원하지 않는다.

모터의 양의 값은 관절 소유자의 양의 축 방향이다. Rapier의 body2-relative-body1 기준과 소유자 body1 기준 사이의 부호를 한계/목표 위치/목표 속도에 일관되게 변환한다. 2D Ball은 회전 자유로운 revolute이며 3D spherical과 자유도 수가 다르다. Slider는 현재 양쪽의 정렬된 로컬 회전 프레임을 요구한다. 독립 연결 프레임/기준 각도 편집은 남은 구현이다.

## 힘·질의 API

추가 16개 실행 서비스는 `Game.hpp` 선언 → 생성 노드 핀 → `Bridge.hpp` → 실제 VM 서비스로 연결한다. 총 정적 BP 473종, C++ 코어 289개 + 실행 서비스 102개다. 사용자 정의 함수/변수/클래스에서 생기는 동적 노드는 정적 노드 수에 포함하지 않는다.

| API | 실제 의미 |
| --- | --- |
| Get/SetAngularVelocity, GetMass, Is/SetSleeping | 현재 강체의 각속도·질량·sleep/wake. 동적 강체 대상 여부를 확인함. |
| ApplyForce, ApplyForceAtPosition | `force`: F·dt/m, `acceleration`: a·dt, `impulse`: J/m, `velocityChange`: Δv. 작용점은 월드 좌표이고 중심에서 벗어난 힘/충격은 회전을 생성함. |
| AddTorque, AddAngularImpulse | 회전 관성에 따른 토크와 각 충격량. 2D는 Z 성분. |
| Raycast, RaycastAll | 시작→끝 선분의 실제 형상 교차. All은 도착 순서/ID 순으로 정렬된 콜라이더별 결과. |
| SphereCast, BoxCast | 구/상자 형상의 실제 sweep. Box 회전은 XYZ Euler 도. Hit의 접촉 위치/법선은 월드 좌표. |
| OverlapSphere, OverlapBox | 실제 형상 겹침, 중복 없는 정렬된 Actor ID 배열. |
| ClosestPoint | 선택 차원/필터의 가장 가까운 충돌체 표면/내부 투영. 내부 점은 자기 위치, normal은 `[0,0,0]`. |

질의 기본값은 `dimension=3, mask=-1, includeTriggers=false, ignore=nullptr`다. 2D는 dimension=2를 명시한다. layer 31도 검사한다. 결과 `HitResult`는 기존 BP `hit` 자료형의 `hit/position/normal/actor` 필드와 같은 JSON을 사용하고 핀 분할·객체 참조·배열 반환을 지원한다. miss는 false·0 벡터·null이다.

지금은 정확한 collider narrow phase를 후보마다 직접 호출한다. 초기 BeginPlay나 같은 프레임의 teleport 직후에도 최신 형상을 읽는다. 후보 검색은 O(콜라이더 수)이며 공간 인덱스 기반 고성능 질의라고 표시하지 않는다. 결과는 최대 1,000개, 차원별 collider 8,000개/joint 512개로 제한한다. C++ 질의 snapshot은 총 collider 8,000개/객체 2,000개 제한이다.

## C++의 실제 동기 검색과 AI 계약

일반 C++ 변경 서비스는 함수가 반환한 뒤 VM에서 검증/적용한다. 공간 검색 7종은 예외로 `HB_QUERY` 요청 → 호스트의 읽기 전용 Rapier 월드 → stdin 응답을 기다려 실제 결과를 같은 C++ 함수에서 반환한다. 그 함수 안에서 변경한 Transform과 collisionEnabled는 질의 snapshot에 합친다. 검색 월드는 스텝/힘/관절을 실행하거나 원본 월드를 변경하지 않는다. ApplyForce 같은 대기 명령의 solver 결과까지 같은 호출에서 완료되는 것은 아니다.

호스트는 질의 키·자료형·객체 집합·알려진 Actor 참조·형상/바디 설정·부모 순환·좌표·크기·개수·메시지 크기를 검증한다. 함수당 질의 128개, 메시지 4 MB, 기존 C++ 함수 timeout 5초를 유지한다. 요청 종료/실패/timeout 뒤 WASM 월드를 해제한다. 엔진 쪽 receiver 핀과 함수 인수 `target`의 이름 충돌을 피하며 `Actor*`/파생 Actor 배열도 입력/반환에서 참조를 검증한다.

`GET /api/schema.physics`는 단위·forceModes·queryKeys/defaults/반환·제한·C++ 적용 시점·현재 관절 한계를 제공한다. `components`의 공용 필드와 `blueprint.nodes`의 생성 핀도 같은 스키마다. `runtime.state.physics`는 backend·고정 스텝·elapsed와 차원별 바디/관절, `objects[].gameplayDebug.physics`는 mass/sleep/velocity/angularVelocity/ccd/collider 수를 제공한다. Stop 뒤 physics는 null이다. 진단 값을 편집 문서 기본값으로 덮지 않는다.

## 검증과 남은 작업

`test:physics`는 Node에서 실제 WASM으로 136개 조건을 확인한다. 같은 `physics-cases.js`를 `prototype/tests/physics.html`에서 실제 브라우저로 실행한다. 캡슐 모서리/회전 상자/shape cast 법선, layer31/마스크/트리거, 힘 4모드/질량/회전, sensor 질량/관성, collider 없는 바디의 질량/충격/형상 추가·제거, CCD, sleep/축 고정, 6종 관절과 실제 Hinge/Slider 모터, 삭제/부모 변환/debug stride/잘못된 snapshot을 검사한다. 같은 명령에서 실제 컴파일한 사용자 C++의 동기 검색·HitResult/배열·함수 안 이동/충돌 비활성·힘·BP split pin을 추가 확인한다.

`node tools/check-physics-editor.mjs http://127.0.0.1:5182`는 `authoring-qa`에서만 새 장면을 만들고 공용 schema/MIME, revision/dryRun/Undo/저장, 실제 2D/3D Play·착지/질량/CCD/월드 관절·pause·Stop 원본 복구를 확인한다. 사용자 문서를 대상으로 실행하지 않는다. 실제 키보드로 2D 회전 축 체크·CCD·Hinge ±20도 값을 편집하여 파일/Play/AI 관측값 일치도 확인했다. 브라우저 도구의 `fill`만으로 native change가 발생한다고 가정하지 않으며 숫자는 실제 타이핑/확정으로 검사했다.

BP Inspector도 같은 선택의 속성 재구성 뒤 접기·검색·스크롤·입력 포커스를 보존한다. 자체 QA에서 컴포넌트 그룹을 접고 운동 형식을 바꾼 뒤 접힌 상태와 `운동` 검색 결과가 유지되는 것을 실제 DOM으로 확인했다. `test:desktop`은 배포 폴더의 물리 모듈을 Node로 불러 같은 136조건을 검사하고, 실제 EXE/WebView2 시작·허브·프로젝트 경로·종료를 별도로 검사한다. 개발 서버 브라우저 검사와 배포 검사 환경을 구별한다.

이 구현은 정밀 primitive 강체 단계다. Mesh/Convex/Polygon/Heightfield·terrain collision, character step/slope/platform controller, contact filtering 프로필/충돌 채널 전체, COM/관성/보간/solver 설정 저작, 완전한 연결 프레임/6-DOF/break/soft/articulation, ragdoll/vehicles/cloth/destruction, native 물리 backend·병렬 처리·공간 질의 최적화·규모별 성능 검증은 계속 남아 있다. 렌더링·애니메이션·머테리얼·UI·오디오·에셋/빌드·네트워크·AI 등 다른 전 영역도 기존 전체 작업 지도의 모든 세부 항목을 유지한다.
