# 220 — EQS의 XY2D 생성·점수·실제 충돌 검사

- EQS grid/ring의 XY/XZ 생성 평면·기존 무지정 XZ 호환; XY actors 반경·distance/dot는 Z깊이 제외·height는 기존 world Y 유지·기본 forward도 선택 평면 사용
- XY 질의는 실제 Physics2D 콜라이더로 가림을 검사하고 XZ는 기존3D 유지; XY가 같은 깊이만 다른 점은 zero-ray/물리생성을 생략·무관한3D NavMesh로 XY를 평탄화하지 않음
- 구형 에셋도 원본 자동수정 없이 생성평면 선택 UI 제공·편집/Undo/저장·AI schema/진단 plane과 기존 C++/BP Run/Results 공용 실행
- 실제 2D 장면의 양쪽 원형 후보·정적 벽 가림·뷰포트 점수 및 별도 DirectX 게임 BP BeginPlay 질의 검증·디버그 off 경로와 GPU읽기0

남은 범위: 임의 회전 평면·EQS별 레이어/깊이 필터·XY NavMesh 투영/공간 인덱스/정적 테스트 Pawn·중간 단계 선택은 잔여 / 거리/방향은 선택 평면 정책이며 기존 XZ 질의의3D 거리 의미는 변경하지 않음. 전체 NavMesh/군중/행동트리 기능 완료로 표현하지 않음

근거: [ENGINE_WORK_220.json](research/ENGINE_WORK_220.json). 설치는 후속 영수증에 기록한다.
