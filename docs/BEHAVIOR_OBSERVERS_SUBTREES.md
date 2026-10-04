# 조건 감시·병렬 정책·하위 행동트리

2026-10-05. [태스크 수명 계약](BEHAVIOR_TASK_LIFECYCLE.md)의 후속 구현이에요. 전체 누적 엔진 범위를 유지하며 이 추가를 엔진 전체나 공식 연구 전체 완료로 계산하지 않아요.

## 실제 공식 근거와 구현 선택

[Epic Decorator reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-decorators)의 기술 본문/표를 다시 읽고 Blackboard의 감시 알림·중단 네 모드·키 비교를 대조했어요. [Composite reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-composites)의 기술 본문 전체를 새로 읽고 기억하는 Selector/Sequence와 병렬 Immediate/Delayed를 대조했어요. [Task reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-tasks)의 Run Behavior/Run Behavior Dynamic 본문을 다시 읽었어요. static subtree의 루트 조건 감시와 실행 중 에셋 교체 금지를 반영해요. 이미지·영상·클래스 구현/API 전체를 분석한 것으로 세지 않아요.

현재 HBEngine에서는 조건을 자식 하나를 감싸는 데코레이터 노드로 표현해요. 에셋·BB 키·자식 순서·속성을 사람이 편집하거나 AI가 같은 JSON으로 변경해요. 단순히 노드 메뉴 이름만 추가하지 않고 실행·중단·C++·디버깅·패키지·화면 없는 실행을 연결해요.

## 조건 감시

`condition.properties.abortMode`와 `compareBlackboard.properties.abortMode`는 `none/self/lower/both`예요. notify는 `result/value`예요.

| 값 | 현재 동작 |
|---|---|
| none | 활성 분기를 조건 변경으로 중단하지 않아요. 다음 진입에서는 조건을 다시 검사해요. |
| self | 조건이 거짓이 되면 해당 활성 분기를 중단해요. |
| lower | 조건이 참이 되면 상위 Selector에서 오른쪽의 실행 분기를 중단하고 이 분기를 다시 검색해요. 자신은 조건이 거짓으로 바뀌어도 진행할 수 있어요. |
| both | 자신의 중단과 낮은 우선순위 분기의 중단을 함께 허용해요. |
| result | 조건의 bool 결과가 바뀔 때 감시 요청을 만들어요. |
| value | 감시 키 값이 바뀔 때 다시 조건을 확인해요. |

새 Selector는 reactive=false로 실행 중인 자식을 기억해요. 조건 감시 또는 완료·실패 때문에 필요한 탐색만 다시 해요. 기존 파일에서 reactive가 없는 Selector는 종전의 주기별 우선순위 재검사를 유지해요. reactive=true를 명시하면 그 방식이 적용돼요. 그 옵션을 켠 재검색은 감시만 사용하는 memory Selector와 다르게 분기를 바꿀 수 있어요.

같은 값을 다시 쓰거나 관계없는 키를 변경해도 새 memory Selector의 태스크 갱신을 깨우지 않아요. 여러 조건을 감싼 분기는 아직 실행하지 않은 조건도 감시하되 진입 조건이 모두 유효할 때만 낮은 분기를 중단해요. 교체할 때 이전 태스크의 Abort/작업 정리를 먼저 끝내고 새 태스크 Start를 호출해요. Lower Priority는 상위 Selector의 자식 순서로 결정해요. 전체 Sequence rewind 정책을 제공하는 것으로 확대하지 않아요.

`compareBlackboard`는 같은 자료형의 keyA/keyB에 equal/notEqual을 적용해요. 누락/다른 자료형은 트리를 시작하기 전에 거절해요. 최초 탐색은 첫 Tick에서 즉시 실행하고 이후 태스크 갱신은 interval을 사용해요.

## 병렬 실행

Simple Parallel의 properties.finishMode는 immediate/delayed예요. 첫 자식의 결과가 전체 결과를 결정해요. Immediate는 주 작업 완료 후 보조 분기를 중단해요. 이미 주 작업이 즉시 완료했다면 그 프레임에 새 보조 태스크를 시작하지 않아요. Delayed는 주 작업 결과를 보존하고 현재 보조 분기의 완료를 기다려요. 기다리는 동안 완료한 주 작업을 다시 시작하지 않아요.

여러 개의 독립 작업을 실행하는 일반 병렬 스케줄러, 모든 결과 집계 정책·native BTTask 클래스·비동기 FinishAbort는 아직 이 구현으로 제공한 것이 아니에요.

## 하위 트리 제작·로드·실행

`subtree`의 properties.asset에 행동트리 에셋을 지정해요. 선택한 노드의 트리 열기 또는 헤더 더블클릭으로 별도 문서 탭에 열어요. 실행 중에도 내부 그래프와 현재 노드를 볼 수 있고 편집은 잠겨요. 같은 에셋을 여러 곳에서 실행하면 실행 대상 선택에 Actor와 제작한 분기 이름을 표시해요. UUID를 사람용 분기 이름으로 쓰지 않아요.

실행 전 모든 정적 참조를 읽고 자료형/순환/누락을 확인해요. 현재 제한은 깊이32·확장 노드4096·공유 키128개예요. 같은 파일은 로드 과정에서 재사용하지만 각 활성화는 독립적인 상태·핸들을 가져요. 로드 실패는 이미 실행 중인 트리를 교체하지 않아요. BP/C++ RunBehaviorTree와 autoStart가 같은 로더를 사용해요. 의존성 수집·rename·패키징은 기존 asset 참조 경로를 공유해요.

블랙보드는 같은 이름·같은 자료형을 공유하고 루트의 기본값을 우선해요. 자식에서 새로 선언한 키도 공유 BB에 추가해요. 다른 자료형의 같은 이름은 거절해요. 이 방식은 HBEngine의 명시적인 계약이며 Unreal Blackboard 클래스 상속 API 자체를 구현한 것으로 표현하지 않아요.

부모의 갱신 간격이 길어도 활성 자식은 자신의 시간과 감시를 처리해요. 자식 완료는 부모를 깨워 다음 작업으로 이어져요. 실행 전 실패한 하위 트리의 루트 조건도 부모의 우선순위 감시에 연결해요. 조건이 충족될 때까지 낮은 분기를 유지하고, 충족되면 이전 분기를 정리한 뒤 자식을 시작해요. 활성 자식의 Self 중단은 자식 실행기가 담당해 중복 Abort를 피하도록 해요.

자식의 task ID는 `subtreeNodeId/taskId`로 표시하고 sourceNode와 asset을 함께 관측해요. GetTaskHandle/FinishTask는 내부 핸들까지 연결돼요. ID 경로를 쓰면 여러 인스턴스의 같은 이름을 구분할 수 있어요. 이름만 조회하면 탐색 중 처음 찾은 활성 태스크를 사용하므로 중복 이름을 대상으로 삼는 AI 작업은 경로를 사용해요. Blueprint custom event의 node도 그 경로를 전달해요.

## 사람·AI·C++ 공용 관측

`/api/schema.gameplay.behaviorChoices`에 감시/종료 선택지를 노출해요. behaviorNodes의 필드 정의를 UI와 파일 검증이 공유해요. document.patch의 revision/dryRun/Undo/Save와 실행 중 잠금도 같아요.

`runtime.state.objects[].gameplayDebug.behavior.instances`에는 scope(제작한 서브트리 노드 ID 경로), path(사람이 정한 분기 이름), asset, blackboard, result, status, tasks가 있어요. 에디터는 열린 파일과 일치하는 인스턴스를 찾아 그 그래프를 강조해요. 루트의 tasks는 현재 자식 태스크까지 모으며 C++ snapshot 조회도 이를 사용해요. 이 관측값을 에셋의 기본값으로 저장하지 않아요.

PC Player와 화면 없는 runProject도 native 타이머의 owner/scope 전달과 해제를 사용해요. 이는 이전 태스크 수명 구현에서 추가로 연결한 headless 경로예요.

## 실제 증거와 남은 동작

- `test:behavior-program`: 감시 네 모드·결과/값 변경·무관한 키·복수 조건·Abort→Start 순서·병렬 즉시/대기·키 비교, 정적 로드/공유 기본값·ID/핸들·자식 시간/감시·정적 루트 조건·중단·순환/깊이/확장 제한·자료형/실패 보존·참조/rename을 검사해요.
- `test:behavior-program-editor`: 실제 Win32 Editor에서 감시 메뉴/Undo/Redo/저장, 루트의 개별 조건·하위 트리 더블클릭·내부 활성 강조·읽기 전용·BP/C++ 완료·예약 작업 제거·원본·정상 종료를 검사해요. 고유 임시 프로젝트·프로필·포트·비활성 창만 사용해요.
- `test:behavior-program-player`: 실제 release Game.exe의 E/R/F 키→BP→컴파일 C++→조건 감시/태스크 완료, Abort/Start 순서와 BP Delay·C++ Timer의 예약 시간 이후 위치0, 원본·종료/서버 정리를 검사해요. 같은 시나리오를200프레임의 headless AI 실행에도 적용해요. 화면 없는 실행을 화면/음향의 증거로 세지 않아요.

Dynamic subtree 교체/주입 태그, 모든 root decorator의 타이머 감시·Apply Decorator Scope, EQS/커스텀 조건 그래프, native Task 클래스, NavMesh/전체 MoveTo 옵션, 전체 event-driven 탐색은 계속 구현할 범위예요. 기존 모든 2D·애니메이션·렌더·에셋/월드·UI·네트워크·모바일·성능 요구도 유지해요.
