# 237 · 3D 6축 관절 제작·공용 모터

- 3D Generic 관절의 이동XYZ/회전XYZ별 고정/제한/자유·ForceBased 모터·영점 보존·독립 프레임·owner-local m/degree 의미
- Scene/BP 상세 6축 편집/Undo·C++/BP SetJointAxis/SetJointAxisMotor·runtime.physics.joints bounded 조회
- 실제선형/회전 잠금/한계/복합 모터/영점수정/수명·실제 C++/BP와 독립 D3D 게임·2D/3D 기존관절11군 회귀·2D generic 거부·기존관절 6행 할당 없음

검증 근거: [기계 판독 기록](research/ENGINE_WORK_237.json).

남은 범위:

- 회전 한계/목표는[-180,180]·대각 coupled-axis 한계·break force/plasticity/multibody articulation은 잔여
- 로컬 이동축은 회전과 함께 움직이며 월드 축 고정 이동으로 표현하지 않는다·진단은 반력/임펄스 측정이 아니다
