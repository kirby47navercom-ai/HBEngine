# 289 · 초기 준비의 제출·후속 대기 진단

- 기존 준비 단계 진단에 submitMS/afterSubmitMS를 추가해 사람과 AI가 제출과 그 이후 경과를 구분해 읽을 수 있어요. 매 프레임 기록/무제한 이력은 없어요.
- 선택형 private trace는 최신 path/시간 가이드 두 단계의 GLSL과 가능한 ANGLE 번역 HLSL만4MiB 이내로 보존하고 hook을 복원해요. 실제 시간 가이드 표본은 제출0.4ms/후속6876.5ms, GLSL54961B/번역101620B였어요. path 번역이 없었던 결과도 그대로 기록했어요.

범위와 한계:

- afterSubmitMS에는 비동기 작업 중첩·다른 제출·poll 간격이 포함돼요. GPU 하드웨어 timestamp나 드라이버만의 시간이 아니에요.
- trace는 opt-in 검사 도구이며 제품 화면에서 원문 수집을 자동 실행하지 않아요. Complex141 첫 지연의 해결을 의미하지 않아요.

근거: [기계 판독 기록](research/ENGINE_WORK_289.json).
