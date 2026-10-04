# C++ 경량화 검증 — 2026-10-04

- 기준 pVE0Gf: 480개 이동/매프레임 사용자 C++ Update에서11.2루프/초·work p9592.5ms. 전체 browser→HTTP 요청/host JSON 복사와 비교/worker patch 전체 복사/미변경480개 Transform 반환이 반복됐다.
- protocol3의 양쪽 delta·불변 경로 복사·patch_inplace·changed snapshot으로 비용을 줄였다. 단위 native-world가 통과해도 Player 연결 오타는 잡지 못했다. 첫 실제9Sv81F runtime-report의 `awaitnativeWorldClient is not defined`를 확인해 정확한 호출 이름으로 고쳤다. 실제 EXE 재검사만 성공으로 계산한다.
- 하나의 패키지 native token이 여러 BP path의 다른 build 객체에 반환될 수 있다. build 객체별 client는 서로 기준을 어긋나게 하므로 VM/token 기준으로 공유한다. 새 worldId와 host sequence 확인으로 다른 VM의 같은 번호를 조용히 적용하지 않는다. 공유/owner 교체/clock/reset/유실 응답/오류/worker 종료·재시작을 실제 C++ wire에서 검사했다.
- 최종WCjb5G는480+C++16.7루프/초·p9581ms·35.6초 지속15.1. 앞선19.9/20.9와 CPU/RPC/렌더 편차를 원자료에 유지하며 좋았던 실행만 선택하지 않는다. 대형C++60루프 목표는 남아 있다. 입력/물리/스프라이트/타일·원본 보존은 회귀 검사로 확인했다.
- 실제 Windows 전체 프로세스 트리 표본은 준비/스트레스/끝 private584/662/666MiB. WebView2/Node 기본 비용을 숨기지 않는다. 이전 OS 표본이 없어 전후 전체 메모리 감소·30초 표본만의 무누수 증명은 없다. `docs/PERFORMANCE_BUDGETS.md`의 루프/표시FPS·private/working set/heap/GPU 구분을 따른다.
- editor-api-window-wLg3Xr는 C++ 재실행/원본 복구 후 종료만 대기했다. Undo 후 원본 데이터는 같지만 dirty 문서를 fixture가 저장하지 않아 closeChoice가 뜨는 경로였다. 본체의 저장 확인을 우회하지 않고 fixture 원본 저장을 추가했다. Ywixc6 재검사에서 입력으로 두 번째 C++ 호출·Stop→Play 두 번·정상 종료까지 통과했다. 기존5181 ECONNREFUSED는 고립된 에디터를 띄운 테스트로 대체하며 사용자 창을 조작하지 않는다.

# 해결됨: 독립 Player 준비·오디오·종료 (2026-10-03)

- 숨긴 WebView2에서 RAF와 최초 Web Audio resume이 대기했다. 공식 AUTOPLAY 권한만 주거나 진단용 autoplay-policy를 적용해도 숨긴 오디오 대기는 같았다. 같은 가설을 반복하지 않고 Chromium의 MediaLoadDeferrer/AudioContext visibility 경로와 실제 visible 창을 대조했다.
- Player smoke만 -20000,-20000의 보이는 비활성 창/검사 전용 16ms clock을 사용한다. 일반 게임은 실제 visible 창과 RAF다. 공식 origin AUTOPLAY 허용을 Navigate 전 완료하고, 브라우저 입력이 필요한 경우 게임 시작 버튼으로 resume한다. 진단용 flags는 배포에 넣지 않는다.
- test:package 실제 2D 개발/3D 배포 Game.exe에서 GPU draw·BP→precompiled C++ 이동·AudioContext running/voice playing·준비 10프레임·컴파일러 없는 PATH·EndPlay SaveGame flush/재실행 보존·자식 서버 종료를 통과했다. 무음 WAV로 재생 상태를 확인했으며 가청 음질 검사가 아니다.
- player.js의 실패 정리 Promise를 close가 기다리도록 연결했다. 실패 report 대기 중 X를 누르더라도 EndPlay/flush 뒤 close를 보낸다. closed 상태의 중복 종료 요청은 억제하고 저장 실패 시 다시 종료해 재시도한다.
- 컴파일 취소는 부분 출력이 완성 worker cache로 남을 수 있었다. 시도별 소스/임시 EXE를 쓰고 compiler close/성공/취소 확인 뒤 rename한다. 실제 g++ 취소 대역→같은 해시 재시도 반환42, 같은 해시 동시 실제 빌드 두 개 반환[42,42]·임시 EXE0으로 검사했다.
- Assets 접두어로만 참조를 골라 루트 Textures/External 파일이 빠지던 문제는 안전한 ProjectService 경로의 재귀 의존 수집으로 고쳤다. native.header/source 코드 문자열은 별도로 제외한다. 실제 패키지 HTTP 읽기/EXE 검사를 통과했다.
- build 프로필 저장 중 후속 편집은 snapshot/revision queue로 보존하고 owner 변경 때 임시 파일을 지운다. 외부 Builds junction은 게임 실행 전에 거부한다. 검증 fixture는 native/build 아래이며 사용자 5181/QuietGarden은 수정하지 않는다.

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
