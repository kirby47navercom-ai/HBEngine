# 셰이더 준비 시간 조회

DirectX `pipelinePreparation.elapsedMS`는 현재 준비 구간의 벽시계 시간이에요. 완료·취소되면 고정하고, 완료 상태를 계속 조회해도 늘리지 않아요. 같은 revision에서 나중에 준비가 다시 시작되면 새 구간으로 세어요.

`cycles`는 실제 대기를 관찰한 구간 수예요. 처음부터 준비된 상태는 0회예요. `preparationMS`는 이 구간들의 시간을 더하며 구간 사이의 유휴 시간은 제외해요. revision 변경은 새 집계를 시작해요. 취소·실패·연결 종료에서도 이미 측정한 값은 고정해요. 구간별 배열·상주 타이머·새 GPU 측정은 추가하지 않아요.

프로파일러의 준비 표는 DirectX에서 합계와 횟수를 보여줘요. WebGPU/GL의 기존 준비 정보는 유지해요. 이 시간에는 CPU 작업·스케줄링·드라이버 대기가 섞이므로 GPU 실행 시간, 단독 FXC 컴파일 시간, FPS 또는 앱 전체 시작 시간으로 해석하지 않아요. 다른 시간대에 측정한 구간을 합쳐 전체 게임 지연을 단정하지 않아요.

소유자는 `prototype/native-path-preparation.js`, 표시 소유자는 `prototype/profiler.js`예요. `nativeShaderPreparationContract`와 기존 `player.inspect().renderer.pipelinePreparation`에서 AI도 같은 정의를 읽어요. 결정적 시계·완료 반복 조회·유휴 간격·취소·revision·실패 검사는 `tools/check-preparation-timing-1425.mjs`예요.
