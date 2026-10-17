# 236 · 차량 엔진·변속기·구동 배분

- 기존 휠당 힘 모드 기본 호환·선택 동력계 토크/RPM/응답·기어비/종감속/효율·자동수동/중립/후진/변속시간/클러치/엔진브레이크
- 앞뒤 차축 토크 배분·실제휠 N·m→N·제동 토크→Rapier 단계 충격량·차체 가속/후진/자동변속과 재사용 휠 배열
- Scene/BP 기어비/토크 표 편집·행 추가/삭제/Undo·공용 SetVehicleGear/GetVehicleRPM/GetVehicleGear·라이브 Inspector·runtime.vehicle 페이지

검증 근거: [기계 판독 기록](research/ENGINE_WORK_236.json).

남은 범위:

- RPM은 운동학적 응답이며 독립 바퀴 회전관성/ABS/LSD·타이어 부피/변형·손상/예측은 별도 잔여
- 앞뒤 차축 분류는 로컬Z>0과 나머지이며 임의 다중 차축 차동 모델은 아니다
