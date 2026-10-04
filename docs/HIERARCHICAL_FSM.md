# 계층 상태 머신 제작·실행 계약

2026-10-05. 일반 게임 로직용 FSM에 하위 상태와 사람·AI 공용 편집을 연결했어요. 기존 version 1의 평면 상태 파일은 새 필드 없이 계속 실행해요. 애니메이션 블렌딩 그래프와 StateTree 전체 구현의 완료 기록은 아니에요.

## 참고한 실제 문서 범위

- [Unity 6000.0 Sub-state machines](https://docs.unity3d.com/6000.0/Documentation/Manual/NestedStateMachines.html): 중첩 상태 제작, 더블클릭 진입, 경로 탐색, 외부 상태 연결의 기술 본문을 읽었어요. 문서 이미지 여섯 장은 이번 검사에서 읽지 않았어요.
- [Unity State machine transitions](https://docs.unity3d.com/6000.0/Documentation/Manual/StateMachineTransitions.html): Entry·조건·기본 상태와 하위 그래프 사이 전환의 본문 구역을 읽었어요. 전체 API·그림 분석 완료로 계산하지 않아요.
- [Epic StateTree overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine): 선택 조건, 활성 계층, 루트부터 실행하는 태스크, 하위부터 평가하는 전환, 데이터 연결과 공용 태스크의 기술 본문·표를 읽었어요. 그림과 관련 API 전체는 별도 미검증이에요.

이 문서의 의미를 자체 FSM 실행 규칙으로 정했어요. Unreal StateTree의 병행 태스크·완료 트리거·Evaluator·Global Task·데이터 바인딩·Linked Tree와 Unity Animator의 Exit 노드·블렌딩·인터럽트 설정은 이번 구현 범위와 같지 않아요. 전체 연구 원장의 승격이나 전체 완료율은 변경하지 않아요.

## 데이터와 실행

상태는 안정적인 `id`를 갖고 `parent`가 부모 ID를 참조해요. `initialChild`는 직계 자식 ID예요. `enterConditions`는 기존 타입 있는 파라미터·비교 규칙을 사용해요. 루트부터 지정 대상까지의 조건을 확인하고, 기본 자식부터 나머지 자식 순으로 진입 가능한 말단을 선택해요. 선택이 불가능한 직접 Jump는 현재 상태를 보존하고 오류를 반환해요. 대상 진입이 불가능한 전이는 다음 후보를 평가해요.

- 진입은 부모→자식, 종료는 자식→부모, Update는 부모→자식 순서예요.
- 형제 전환은 공통 부모를 유지해요. 부모의 누적 시간은 유지하고 새 하위 상태의 시간은 0부터 시작해요.
- 전이는 말단→상위→전역 Any State 순으로 검사하고, 같은 소스에서는 파일의 순서를 사용해요. Tick마다 하나를 선택해요.
- Exit Time은 전이 소스 상태의 시간/duration이에요. 전역 Any State는 말단의 시간/duration이에요.
- 선택한 말단이 현재 말단과 같으면 기본적으로 재진입하지 않아요. 전이의 `reenter:true`는 이를 허용해요. 직접 Jump는 지정한 활성 상태와 그 하위 계층을 재진입해요.
- 이벤트는 한 Tick의 전이 평가가 끝나면 소모돼요. 실행 중 전달한 이벤트는 다음 평가에서 사용해요.
- 콜백 안의 Jump/Stop 요청은 진행 중인 상태 변경 뒤 처리해요. 재진입 반복은 64회로 제한해요. Update 중 상태가 바뀌면 이전 하위 상태의 Update를 이어 호출하지 않아요.
- OnExit에서 새 FSM을 시작하거나 에셋 읽기가 다른 순서로 끝나도 최신 Start 요청이 이전 Start에 덮이지 않아요.
- Stop은 종료 콜백을 호출해요. 월드 폐기는 콜백을 다시 실행하지 않고 내부 상태를 정리해요.

상태는 256개, 전이는 512개, 각 조건은 32개까지예요. 부모 순환·없는 부모·직계 자식이 아닌 기본값·타입이 다른 조건을 저장 전에 거절해요. 런타임은 상태·자식·소스별 전이를 캐시하고 매 프레임 그래프를 다시 분석하지 않아요. 이 설계만으로 대규모 성능이나 60 FPS를 증명하지는 않아요.

## 사람과 AI 편집

상태 추가·하위 상태 머신 생성·더블클릭 진입·경로/상위 버튼·부모 변경·기본 자식·진입 조건·전이의 재진입 옵션을 제공해요. 각 하위 그래프의 이동/배율을 기억해요. 우클릭 또는 휠 버튼으로 이동하고, 우클릭 메뉴로 현재 하위 그래프에 생성해요. 그룹 삭제는 하위 상태와 관련 전이도 함께 삭제해요. 연결된 외부 상태는 현재 그래프의 상위 연결로 투영해 보여줘요.

실행 중에는 상태와 파라미터를 수정하지 않고 그래프 탐색과 활성 경로 강조를 사용해요. `gameplayDebug.stateMachine.active`는 루트→말단의 `{id,name,time}` 배열이며 `elapsed`는 말단 시간이에요. 이전 `gameplayDebug.state`의 말단 이름도 유지해요.

AI의 `state.add`, `state.reparent`, `state.remove`는 `path`·`expectedRevision`·`dryRun`을 받고 같은 검증·Undo/Redo·저장 경로를 사용해요. `state.add`의 `submachine:true`는 그룹과 기본 Idle 자식을 만들고 새 그룹의 ID를 반환해요. 화면 좌표나 목록 인덱스로 상태를 지정하지 않아요. 부모/하위 제거의 변경이 한 번의 Undo 항목이에요.

## 블루프린트와 사용자 C++

기존 Start/Stop/Jump/SendEvent/파라미터 함수에 `hb::States::IsInState`, `GetPath`, `GetElapsed`를 추가하고 공용 C++ 선언에서 BP 노드를 생성했어요. `IsInState`는 활성 부모도 검사하고 ID와 이름을 받으며, GetPath는 이름의 배열을 반환해요. 실행 중인 FSM이 없으면 새 조회는 false/빈 배열/0을 반환해요. 기존 GetState의 오류 계약은 유지해요.

BP의 null·누락·`self` 대상은 바인딩 소유자를 사용해요. C++ 변경 명령은 사용자 함수가 반환한 뒤 공용 서비스가 처리해요. 조회는 마지막 처리된 상태를 읽으므로 같은 C++ 함수에서 Jump 직후 GetPath가 새 상태를 읽는다고 가정하지 않아요.

## 실제 검증

- `npm run test:state-hierarchy`: 평면 파일 호환·조건/부모 검증·우선순위·부모 시간·재진입·종료·중첩 콜백·64회 한도·읽기 순서·OnExit 재시작·실제 컴파일된 C++ 조회/이벤트를 검사해요.
- `npm run test:state-editor-window`: 고유 프로젝트·프로필·포트의 실제 HBEngine.exe에서 포인터 더블클릭, 경로, 하위 생성, AI dryRun/순환 거절/Undo/Redo/저장, Play·BP 키 입력·상태 강조·Stop→Play·원본 보존·정상 종료를 검사해요.
- `npm run test:state-player-window`: release Game.exe로 내보내 실제 키 입력→BP→사용자 C++→FSM 이벤트/부모 Jump를 검사해요. C++는 활성 부모·경로·시간을 조회해 공개 bool 속성으로 검사 결과를 전달해요. 원본 파일과 자체 서버 종료도 확인해요.

원자료는 저장소의 무시된 `native/build/state-*-window-*` 아래 acceptance.json·포인터 기록·스크린샷에 남겨요. 물리 모바일·DX11·Unity/Unreal 전체 기능 완료의 근거로 확대하지 않아요.
