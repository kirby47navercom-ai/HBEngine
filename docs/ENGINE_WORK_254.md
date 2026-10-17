# 254 · 효과 출처·대상 속성 스냅샷

- modifier.magnitudeSource attribute/source|target/base|current·계수×레벨커브×캡처 숫자·참조한 속성만 적용 시 캡처
- 캡처는 출처 삭제/값 변경/레벨 변경 뒤 유지·액터 참조 보관 없음·독립 핸들별 컨텍스트/공유 스택의 최신 허용 입력·누락/오버플로 원자 거부
- 효과 편집기 출처/대상·속성/기준 선택/보기 전용 입력 미리보기·Undo/저장·C++ ApplyEffectSpec/BP/독립 D3DGL

검증 근거: [기계 판독 기록](research/ENGINE_WORK_254.json).

검증 범위와 잔여:

- live 비스냅샷 종속 전파·태그/instigator 전체 캡처·사용자 실행 계산·네트워크 예측은 별도 잔여
