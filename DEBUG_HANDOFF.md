# 현재 실행 결함 조사

## 충돌 형상 제작에서 확인한 세부 동작 — 2026-10-03

- Geometry 배열을 generic BP valueControl의 vec3로 렌더하면 nested path/mesh JSON이 깨진다. json 속성은 일반 행에서 제외하고 공통 전용 형상 모달로 편집한다. Scene과 BP Apply/Undo/save를 실제 API로 확인했다.
- 오목한 polygon을 convex hull 하나로 대체하면 빈 영역이 채워진다. 단순 경로를 정확히 삼각화한 하나의 compound collider로 만들고 실제 ray/overlap/closest point·면적/관성으로 검사했다. 중첩 경로는 구멍으로 해석하지 않고 거부한다.
- render bake에서 actor world matrix를 저장하면 scale/pose가 실행 시 다시 적용된다. owner inverse world matrix로 자식 geometry를 변환한 로컬 정점을 저장한다. translate/rotate/비균일 scale를 가진 owner와 다른 actor 제외·실제 OBJ를 검사했다.
- JS double에서 유효한 삼각형이 float32의 큰 좌표에서 붕괴할 수 있다. solver 정점으로 변환한 뒤 퇴화 검사를 추가해 WASM 생성 전에 설명 가능한 오류로 거부했다.
- Hinge/Slider 설정 상태로 다른 jointType을 검증하면 기존 motor/limit 때문에 전환이 막힌다. 공통 editComponentProperty에서 관련 설정을 해제한 다음 검증한다. isKinematic을 해제해도 bodyType=kinematic이 남는 경우도 함께 동기화한다. 다중 선택은 모든 대상 검증 후 적용해 일부만 잘못된 조합으로 변하는 일을 막는다.
- cube 렌더 mesh는 로컬 y=0~1이며 기본 collider centered box와 다르다. bake된 mesh의 실제 최상단으로 Play 착지 기대값을 계산해 테스트하며 기본 box로 대신한 것으로 오판하지 않는다.
- 본문/검증 근거: docs/COLLISION_GEOMETRY_RESEARCH.md. 형상 67개 WASM·actual C++ mirror·브라우저·편집기 저장/실행과 배포 EXE 검사를 구분해서 기록했다.

2026-10-02: 화면 없는 2D 입력 검사에서 캐릭터 X가 -2.6에 멈췄다. 입력 전달 실패로 보였지만 프레임 60에서 속도 [2.5, 5.8365, 0]이므로 입력·점프는 전달됐다. 프레임 80부터 측면 충돌의 마찰이 수직 속도를 0으로 만들어 플랫폼 벽에 붙는 현상을 확인했다.

- 최초 검사는 오른쪽 이동만, 다음 검사는 이동과 점프를 동시에 입력했다. 둘 다 벽 통과에 실패했다. 입력 지연이나 테스트 시간을 계속 바꾸는 방식은 반복하지 않는다.
- 원인 가설: 일반 Rigidbody의 마찰 .5를 캐릭터 캡슐에도 적용해, 벽으로 누르는 이동력이 수직 마찰로 변환된다.
- 수정 대상: 공통 캐릭터 기본 콜라이더의 마찰을 0으로 두고 기존 물리 재질/사용자 마찰 설정은 존중한다.
- 확인: `node tools/check-headless.mjs`의 이동+점프 시나리오와 `test:scene`의 일반 바디 마찰·충돌 검사를 함께 통과해야 한다.

## 수정·검증

캐릭터 기본 콜라이더는 friction=0 / frictionCombine=min으로 생성한다. 물리 재질 조합 순서는 Unity 공식 규칙 average < min < multiply < max를 양쪽 순서와 무관하게 적용한다. 사용자 지정 마찰은 보존한다. 2026-10-02 `test:headless`의 이동·점프·착지와 실제 사용자 C++ 실행, `test:scene`의 일반 바디 마찰·반발·접촉·축 고정·계층 이동 회귀 검사 모두 통과했다.

## Rapier 전환에서 확인하고 수정한 실행 결함 — 2026-10-03

- Rapier 0.21.0의 `world.step(undefined,hooks)`는 설치 PhysicsPipeline 구현의 분기 때문에 hooks를 실행하지 않는다. EventQueue와 함께 전달해 solver/intersection filter를 적용했다. layer31/마스크0 통과·변경 뒤 착지를 실제 WASM 양 차원으로 재현/검증했다. EventQueue도 Dispose에서 해제한다.
- 수동 setLinvel/setAngvel은 축 잠금과 별개로 입력 속도를 유지할 수 있다. 공용 속도 경로에서 잠긴 축을 0으로 투영한 뒤 solver에 전달한다. 위치/회전 불변 조건으로 검사했다.
- Fixed/fixed는 Rapier contact graph에서 기존 HB 이벤트를 생성하지 않는다. 캐시한 보수적 bounding-sphere 후보 sweep 뒤 exact contactCollider를 사용해 정적 이벤트 의미를 유지했다. 동적 solver를 AABB로 교체하지 않았다.
- 크기 변경 뒤 manual mass가 예전 density를 다시 곱하는 문제를 unit-density 정규화→질량 비율 적용으로 막았다. sensor 형상도 질량/관성에 기여한다. autoMass인데 collider가 없으면 설정 mass로 돌아가며 추가/마지막 제거 뒤 전환을 실제 검사했다.
- 2D debug vertices는 XY stride다. XYZ로 확장해 Three vertex count/NaN 문제를 해결했다. shape cast의 witness/normal은 상대 collider 로컬 값이어서 회전/이동으로 월드 좌표에 변환했다.
- Rapier 모터·한계는 body2-relative-body1이다. HB는 body1 소유자의 양의 축이므로 한계 [-upper,-lower]와 음의 목표 위치/속도를 사용한다. 2D/3D Hinge +90도/s와 Slider +1m가 실제 양의 방향으로 움직이는 조건을 통과했다. 각속도 API rad/s와 Hinge UI degree/s를 구분한다.
- Scene 컴포넌트 change 뒤 Inspector 재구성이 details를 접어 버렸다. 객체/컴포넌트 ID로 열린 그룹·스크롤·현재 field 포커스를 복원한다. enableLimit 뒤에도 입력 그룹이 열린 실제 GUI로 확인했다.
- BP Inspector도 문서/그래프/선택 ID를 기준으로 열린 그룹·속성 검색·스크롤·입력 포커스를 복원한다. 컴포넌트 그룹을 접고 운동 형식을 바꾸거나 검색 상태에서 재구성해도 유지되는 실제 GUI를 확인했다. 기존 authoring 검사의 `line.scale.z=.01`은 과거 AABB 표시 구현을 고정한 조건이었다. 새 실제 형상의 XY 평면 깊이/월드 위치/트리거 재질을 검사하도록 바꿨고 통과했다.
- 브라우저 플러그인의 locator.fill은 일부 숫자/name 입력에서 native change를 확정하지 않았다. 이를 제품 실행 오류로 간주하지 않고 ControlOrMeta+A→pressSequentially→Tab으로 실제 타이핑을 검사했다. 사용자 5181 미저장 탭은 검증용으로 쓰지 않는다.
