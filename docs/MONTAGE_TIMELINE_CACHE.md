# 몽타주 섹션과 notify 재생 준비

2026-10-22. `MontageTimeline`은 Play의 캡처된 데이터에서 섹션 순서·이름 표·다음 경계·Seek 시간표를 한 번 준비해요. 매 프레임 섹션 배열을 복사하고 sort/find하던 경로를 이 표로 바꿨어요. Pause, Jump, 다음 섹션 지정, 루프와 섹션 변경에 따른 notify 취소는 기존 실행 흐름을 사용해요. 같은 시간에 있는 섹션의 순서도 순수 비교 검사에서 보존하지만, 실제 에셋은 원래대로 고유한 섹션 시간을 요구해요.

point notify가 32개 이상이면 기존 `SequenceEventIndex`의 범위 조회를 재사용해요. 작은 notify 배열은 원래 배열을 순회해요. 첫 프레임 포함·끝 포함·같은 시간의 원래 순서와 콜백 중 재진입을 유지해요. Seek 자체는 notify를 방출하지 않아요. Pause/Seek/Jump/Stop 콜백이 실행되면 기존 revision·소유자·scope 검사로 뒤의 이벤트를 중단해요. notify-state 창의 begin/tick/end 처리와 typed payload 규칙은 바꾸지 않았어요.

표는 활성/퇴역 중인 몽타주 state의 수명에만 연결돼요. 전역 캐시·워커·타이머·GPU 리소스·프레임 파일 접근은 없어요. 에셋 형식과 공개 C++/블루프린트 연산, 편집 UI도 그대로예요. authoring 변경 뒤 새 Play에는 새 표가 만들어져요.

`tools/check-montage-timeline-1557.mjs`는 이전 sort/find/notify 조건과 대조해요. 1,024개 notify의 빈 범위는 time 읽기 20회였고, 준비된 섹션의 seek/name/end 조회는 원본 time을 다시 읽지 않았어요. 재진입 이터레이터와 유효한 64-notify·16-section 게임 데이터에서 콜백 Pause, 중복 없는 resume, notify 없는 Seek, Jump와 Stop 정리를 확인했어요. 이는 CPU 조회 계수이며 전체 FPS 측정치가 아니에요.

기존 몽타주·루트 모션의 2D/3D 30/60/120 스텝·교체·notify 창·140개 이벤트 색인 검사도 묶어서 통과했어요. 실제 숨긴 편집기와 같은 저장 Windows D3D11 게임에서는 64클립 몽타주의 Play/Pause/126.5초 Seek·기존 `[10,3,0]` 위치·후속 노드 도달을 확인했어요. 이 창 검사를 64-notify 콜백 검증으로 확대해서 주장하지 않아요.
