# 행동트리 중단 완료 대기

사용자 태스크의 **중단 완료 기다리기**를 켜면 `OnTaskAbort`에서 정리 작업을 시작하고, 끝날 때 `hb::AI::FinishAbort(target, task)` 또는 **태스크 중단 완료** 노드를 호출해요. 기존 `FinishTask`는 중단 중인 태스크를 완료할 수 없어요. `GetTaskHandle`은 중단 중에도 같은 핸들을 반환하고, `IsTaskAborting`/`IsTaskExecuting`으로 상태를 구분해요.

기존 실행 범위의 Delay·Timer·Timeline·구독은 중단 시작 때 취소해요. 대기를 선택한 태스크의 중단 콜백에는 별도의 `handle:abort` 범위를 주므로 정리용 지연/타이머를 사용할 수 있어요. `FinishAbort`는 그 범위를 닫아요. 같은 핸들의 반복 완료와 이전 실행의 핸들은 무시해요. 다음 행동과 트리의 성공/실패 결과 공개는 정리가 끝날 때까지 기다리고, 게임 프레임과 살아 있는 상위 노드의 서비스 기한은 계속 진행해요. 중첩 하위 트리의 중단 핸들도 상위 트리에서 찾고 완료할 수 있어요.

명시적 트리 정지·교체·월드 종료·오류는 기다리지 않고 남은 정리 범위를 취소해요. 콜백이 반환하지 않는 임의의 Promise나 외부 I/O를 강제로 끝내는 기능은 아니에요. 네이티브 `BTTask` 상속 클래스/인스턴스별 노드 메모리는 별도 잔여예요.

## 파일 호환성과 되돌리기

기존 BT v1은 그대로 읽고, 생략/false인 `waitForAbort`는 즉시 중단해요. 대기 기능을 켤 때 태스크 플래그와 문서 `version:2`를 같은 편집·Undo에 넣어요. 구버전 엔진은 v2 전체를 거절하므로 새 플래그를 무시하고 실행하지 않아요. 기본 새 BT는 계속 v1이에요. 비활성화해도 v2를 유지하며, 모두 false/생략으로 바꾼 뒤 명시적으로 v1로 내릴 수 있어요. 직전 Undo는 두 필드를 함께 되돌려요. 설치 업데이트 보류 중에는 v2를 이전 설치본에 보내지 않아요.

AI는 `behavior.task.abort({path,expectedRevision,node,waitForAbort,dryRun?})`를 사용해요. 기존 저작 트랜잭션의 복사·검증·revision·Undo·미저장 문서 경로를 공유해요. `schema.behaviorAbort`에서 계약을 조회해요.

설계 대조: [Unreal Blueprint 태스크 수명 API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/UBTTask_BlueprintBase?lang=en-US), [네이티브 AbortTask API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/BehaviorTree/UBTTaskNode/AbortTask?application_version=5.5). HBEngine의 데이터 태스크/공용 실행 계약이며 Unreal의 클래스 전체를 구현했다는 뜻은 아니에요.
