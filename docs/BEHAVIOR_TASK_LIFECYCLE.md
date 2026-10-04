# 행동트리 태스크·서비스 제작과 실행 계약

2026-10-05. 기존 version1 행동트리 파일을 유지하며 사람의 속성 편집, AI의 JSON Patch, BP와 사용자 C++가 같은 실행기를 사용해요.

## 실제로 확인한 공식 근거

- [Epic Behavior Tree Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview): 기술 본문 전체를 읽었어요. 이벤트에 의한 평가, 자식의 우선순위, 조건 데코레이터, 서비스, Simple Parallel을 대조했어요.
- [Decorator reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-decorators), [Task reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-tasks), [Service reference](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-behavior-tree-node-reference-services): 실제 Overview의 링크에서 기술 본문·속성 표를 읽었어요. 실패한 추측 version=5.6 주소는 읽기로 세지 않아요.
- [UBTTask_BlueprintBase API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/UBTTask_BlueprintBase?lang=en-US): 검색 도구가 반환한 클래스 설명·함수 정보를 읽었어요. 실행/갱신/중단/완료와 중단 때 latent 작업을 정리하는 계약을 대조했어요. 클래스 구현 소스와 API 전체를 읽은 것으로 세지 않아요.

이 문서의 추가는 전체 문서·API 분석 완료가 아니에요. 이미지·영상·원장 승격·전체 연구 gate를 대신하지 않아요. 아래에서 현재 구현과 남은 동작을 구분해요.

## 제작

콘텐츠 브라우저에서 행동트리 에셋을 만들고 노드 메뉴 또는 그래프 우클릭으로 추가해요. `task`는 onStart/onTick/onFinish/onAbort 이벤트 이름을 편집해요. 연결된 루트부터 깊이 우선 실행 순서 번호가 보이고, 선택한 부모의 자식 목록에서 우선순위를 앞뒤로 바꿔요. 위치는 실행 순서를 바꾸지 않아요. 변경은 문서 Undo/Redo·저장을 사용해요. 실행 중에는 실제 태스크 이름·결과와 노드 강조를 보여 주며 편집을 잠가요.

새 노드는 `task`, `waitBlackboard`, `cooldown`, `timeLimit`, `forceSuccess`예요. 키 대기는 float/int의 0 이상 시간을 활성화 때 읽어요. 쿨다운은 자식의 완료 뒤 시작하며, 시간 제한은 실행 중 자식을 중단하고 failure를 반환해요. Force Success는 running을 유지하고 완료 결과를 success로 바꿔요.

서비스는 기존 event/interval에 randomDeviation, callOnStart, restartTimer, onActivation/onDeactivation을 선택적으로 저장해요. 진입/이탈 콜백과 활성 분기에서만 발생하는 갱신을 제공해요. 초기 갱신을 끄면 interval 후 시작하며 이후 간격에 편차를 적용해요. restartTimer=false는 분기 재진입 때 이전 예약 시간을 유지해요.

## 실행 수명과 소유자

태스크 활성화마다 고유한 handle을 만들어요. onStart는 한 번, onTick은 활성화 중 평가마다, onFinish는 성공/실패 완료 때 한 번, onAbort는 분기 교체·시간 제한·Stop 때 한 번 호출해요. 이벤트 인수는 node(안정 ID), task(handle), delta, time, phase(start/tick/finish/abort), 완료 시 success예요. 태스크 이벤트는 트리 소유 객체 BP에 전달하고, 기존 서비스/event 노드 이벤트는 제어 대상 Pawn에 전달해요.

`hb::AI::GetTaskHandle(actor,nodeIdOrName)` / BP 실행 중 태스크 핸들로 조회하고 `hb::AI::FinishTask(actor,handle,success)` / BP 태스크 완료로 끝내요. 오래된 활성화·이전 실행·이미 완료한 핸들은 무시해요. C++ 쓰기는 공용 엔진 명령 큐를 사용하므로 이후 처리 상태를 확인해요. Finish 후 다음 평가가 완료 결과를 반영해요.

onStart/onTick에서 시작한 BP Delay·재시작 Delay·Timer·Timeline·Dispatcher 구독은 해당 handle에 속해요. 함수/매크로/인터페이스와 native 이벤트 경로에도 수명을 전달해요. 완료/중단 때 그 작업을 제거해요. 다른 태스크의 같은 Delay 노드는 독립적으로 유지해요. onFinish/onAbort는 정리 작업을 할 수 있도록 종료된 수명 밖에서 실행해요. 모든 외부 비동기 API·사용자 스레드·네트워크 콜백까지 자동으로 취소하는 계약은 아니에요.

C++ `hb::Timers::SetTimer`도 호출 대상 Actor와 현재 태스크 handle을 기록해요. worker에 전달하는 살아 있는 수명 목록으로 다음 호출/프레임에서 종료된 타이머를 해제하고, 이미 전달된 콜백도 VM에서 종료 수명을 확인해 무시해요. 같은 C++ 클래스를 쓰는 다른 Actor에게 방송하지 않아요. 기존 native `TakeEvents()`와 timerEvents 문자열 배열은 호환용으로 유지하며 새 런타임은 timerCallbacks의 owner/scope/handle을 사용해요. 수명이 없는 완료 타이머 핸들은 ClearTimer 또는 월드 Reset 전까지 질의할 수 있어요.

## AI와 디버깅

`/api/schema.gameplay.behavior`와 behaviorNodes에 속성·이벤트·완료 규칙을 노출해요. `document.get` → `document.patch`의 expectedRevision/dryRun → Undo/Redo → Save 흐름은 사람이 편집한 파일과 같은 검증을 거쳐요. 안정적인 노드 ID를 사용하고 표시 이름으로 파일 연결을 추측하지 않아요.

`runtime.state.objects[].gameplayDebug.behavior`에 result/status/tasks가 있어요. `runtime.state.work`는 BP scopes/delays/timers/timelines/subscriptions의 읽기 전용 관측값이에요. C++ worker 타이머 목록을 포함하는 값은 아니에요. 에디터 관측값은 문서 기본값을 덮어쓰지 않아요.

## 검증과 경계

- `npm run test:behavior-lifecycle`: 시작/갱신/완료/중단·오래된 핸들·조건 우선순위·시간 제한/쿨다운/키 대기·서비스 수명·공유 Delay/Timer/Timeline 취소·실제 C++ 완료/타이머 취소·객체별 전달·콜백 재시작의 프레임 중복 방지를 검사해요.
- 실제 Editor `native/build/behavior-editor-window-wJK2Gz`: 태스크 생성·자식 순서/Undo·서비스 속성·공용 패치/저장·실행 그래프·BP→컴파일 C++ 완료·작업 제거·Stop/Play의 새 핸들·원본/정상 종료를 검사했어요. 별도 프로젝트·프로필·자동 포트·비활성 창이에요.
- 실제 release Game.exe `native/build/behavior-player-window-2wt1oc`: 물리 키→BP→사용자 C++ 완료, 다음 Wait 실행, BP Delay와 C++ Timer의 예약 시간이 지난 뒤에도 위치 변경이 발생하지 않는 것, 원본·정상 종료/서버 폐기를 확인했어요.
- 초기 1초 Editor Delay는 완료 입력 처리 전 시간이 지날 수 있어 취소 증거로 쓰지 않아요. 후속 Editor에서는 pending 작업을 먼저 관측하고 완료 후 scopes/delays가 빈 것을 확인해요. Player에서는 빠른 CDP 입력과 3초 예약으로 실제 예정 시간 이후도 확인해요. 실패 원자료와 fixture 수정은 DEBUG_HANDOFF에 남겨요.

현재 트리는 interval 평가를 유지하고 Blackboard revision·태스크 완료 때 다음 tick을 깨워요. 전체 event-driven 탐색, 조건 데코레이터의 Observer Aborts 4모드·Notify 결과/값 변화, 비동기 FinishAbort, subtree/EQS, native BTTask 클래스, NavMesh, 완전한 병렬 정책은 아직 이 구현으로 제공한 것이 아니에요. 전체 누적 엔진 기능의 후속 구현 대상으로 유지해요.
