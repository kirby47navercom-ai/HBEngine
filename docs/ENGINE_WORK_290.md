# 290 · 시간 전용 CPU 매질의 준비된 부분 평가

- CPU-only closedVolume 시간 변경은 관련 출력만 평가하고 Time 리터럴과 매질 메타데이터만 갱신해요. 기본값/무관 프로그램/레이아웃과 이전 스냅샷은 재사용해요.
- 기존 WeakMap 엔트리에 필요한 경우에만 소유 복사본의 평가 closure 하나를 두어요. 매개변수·graph 교체/잘못된 순환·되감기·긴 시간·실패 후 복구와 실제 geometry/filter 전환을 검사했어요.
- 무관한 texture callback은 생략하고 기본 전체 evaluator 계약은 유지해요. 선택 field 배열은 자체 Set으로 고정하며 새 GPU readback/history target은 없어요.

범위와 한계:

- 하나의 준비된 metadata 스냅샷은 추가돼요.286의 추가 복사0 수치를290 전체에 적용하지 않아요.
- 최신60회 CPU 표본은 전체64.6417/66.7342ms 대 부분5.9299/5.8823ms였고 이전9.3ms 표본과 부하가 달라 전체 게임 속도 배율로 사용하지 않아요.

근거: [기계 판독 기록](research/ENGINE_WORK_290.json).
