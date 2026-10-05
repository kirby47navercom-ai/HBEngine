# 배치 위치와 첫 프레임 전 HUD · 2026-10-05

게임 규칙 C++를 플레이어에 붙일 때 위치가 원점으로 바뀌던 경로를 확인했어요. createAsset('blueprint')가 defaultBlueprint의 예제 Construction Script를 복사하면서 입력 값이 없는 `setPosition`을 자동 실행했고, 기본 입력 `(0,0,0)`이 배치 위치를 덮었어요. C++ Actor 기본 생성자만의 문제로 판정하지 않아요.

새 기본/작성 블루프린트의 Construction Script는 연결 없는 이벤트만 가져요. 기존 파일은 수정하지 않고, 실행 복사본에서 **예전 자동 생성 그래프와 모든 필드가 정확히 같은 경우만** 위치 초기화를 제외하고 로그를 남겨요. 노드·배치·연결·속성·주석을 편집한 경우, 명시적인 inputValues로 위치를 지정한 경우는 그대로 실행해요. 예전 기본 그래프를 정확히 유지하며 원점 초기화를 의도한 경우에는 위치 입력을 명시하면 돼요.

UIWidget 자동 표시를 모든 Actor의 사용자 Construction/BeginPlay 전에 await해요. 타일 준비→자동 위젯 준비→사용자 Construction→다른 실행 컴포넌트 시작→BeginPlay→Tick 순서예요. startActor가 위젯을 중복 생성해 초기 글자를 지우지 않고, 풀 해제 때 준비 표시를 지워 다시 획득할 때 새 위젯을 준비해요. showOnStart=false 또는 비활성 UI에는 이 준비를 적용하지 않아요. 잘못된 instance/요소를 지정하거나 표시하지 않은 위젯을 사용하면 여전히 명시적인 오류예요.

[Unreal Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)의 생성/Construction/컴포넌트 초기화/BeginPlay 순서와 [Unity 실행 순서](https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html), [Awake API](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.Awake.html)의 초기 참조 준비와 시작 이벤트 분리를 대조했어요. HB의 위젯 선행 준비는 사용자 제작 편의를 위한 자체 계약이며 두 엔진의 모든 콜백·Player loop를 동일하게 구현한 주장은 아니에요. Awake 설명 본문과 관련 예제, Epic lifecycle 본문을 읽었고 관련 이미지·PlayerLoop 전체 API는 이번 검사 범위가 아니에요. Unity 6.3 보조 읽기로 기존 6.0 corpus gate를 승격하지 않아요.

`test:startup-state`는 새 문서, 변경 없는 예전 템플릿, 사용자 위치 변경 각각에서 실제 C++를 실행해요. 배치 위치·회전·크기와 C++ 조회, 첫 Tick 전 UI 텍스트 변경, 원본 BP 보존이 통과했어요(`startup-state-r7TDDl`). `test:sprite-rig-editor-window`와 `test:sprite-rig-player-window`도 C++ Construction에서 HUD를 변경·조회해 initialized를 확인하고 실제 화면 한글을 확인했어요. 2프레임 대기나 Director를 요구하지 않아요. 원래 게임의 우회 코드는 자동 변경하지 않았고, 사용자 설치본 업데이트도 하지 않았어요.

첫 검사의 `.1` 좌표 deep equality 실패(`startup-state-TnhpL3`)는 C++ float32의 `.10000000149`를 허용하지 않은 검사 문제였어요. 좌표 허용 오차 1e-5로 검사하고 원점 초기화/명시적 이동은 따로 단언해요. HUD의 원래 게임 모든 경로·수동 Show 직후 같은 C++ 호출 내 Get·물리 모바일 화면까지 확인했다는 의미는 아니에요.
