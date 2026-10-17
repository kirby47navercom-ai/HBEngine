# 249 · 시퀀스 쿼터니언 회전

- 선택 rotation.quaternionInterpolation boolean·누락/false는 기존 EulerXYZ 보간·true는 shortest-arc Slerp·정확/단계 키는 작성 degree 보존
- 한 번 준비한 Float64 quaternion 키/재사용 Quaternion2/Euler·매 프레임 키 변환/정렬 없음·제작 checkbox/Undo/저장·C++ 회전 조회/종료 복원·독립 D3D/WebGL

검증 근거: [기계 판독 기록](research/ENGINE_WORK_249.json).

남은 범위:

- 360도 이상 의도적인 Euler 회전은 기존 모드를 선택·spline quaternion tangent/전문 DCC rig는 별도 잔여
