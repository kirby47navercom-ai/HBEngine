# AI의 장면 레시피 배치

AI는 `schema.placement`에서 사람의 배치 창과 같은 레시피를 조회해요. `scene.place({path,expectedRevision,kind,position?,id?,name?,parent?,dryRun?})`로 하나를, `scene.placeBatch({path,expectedRevision,placements,dryRun?})`로 여러 개를 배치해요. `placements`의 각 항목은 `{kind,position?,id?,name?,parent?}`예요. `rope3d`도 같은 레시피예요.

배치는 기존 `automationAuthoringEdit`의 장면 복사·전체 검증·revision/dryRun·Undo·미저장 문서 경로를 한 번 공유해요. 항목을 모두 준비하고 고유 ID·부모 존재·순환을 검사한 뒤에만 draft에 추가해요. 뒤에 쓰인 부모를 참조할 수 있으며 작성한 오브젝트 순서는 유지해요. 같은 배치에서 실패한 항목이 있으면 앞 항목도 공개하지 않아요. 명시한 ID와 결과의 컴포넌트 ID를 다음 편집에 쓸 수 있어요.

ID/부모 인덱스와 반복형 경로 검사로 항목마다 장면 전체를 다시 찾거나 깊은 부모 체인에서 호출 스택을 소모하지 않아요. 오브젝트 500/1000개 같은 새 전체 개수 제한을 넣지 않아요. 기존 요청 바이트/문서 검증·브라우저 메모리 예산은 그대로예요. 큰 장면의 첫 복사·검증·렌더 재설치 비용까지 없애지는 않아요. 실제 앱 GUI의 전체 Undo나 프레임 성능을 새로 측정했다는 뜻은 아니에요.

전체 장면 부모 검증도 한 ID 인덱스와 반복 경로 검사로 바꿨어요. 이전 작은 장면/순환/누락/빈 루트 ID와 차분 대조하며 기존 값 검증을 유지해요. 깊은 계층의 공용 좌표 실행은 [월드 변환 계산](SCENE_MATRIX_PASSES.md)으로 연결해요.
