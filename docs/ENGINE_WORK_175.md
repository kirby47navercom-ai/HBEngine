# 2D·3D 독립 관절 프레임과 SDK

Physics Constraint/2D에 독립 로컬/연결 프레임·자동 맞춤·회전 영점 보정·최대 모터 힘/토크를 추가했다. 기존 useFrames=false 동작을 유지하며 fixed/hinge/slider에 적용한다. 2D는 Z 회전과 XY 직선축을 지원한다. 수동 연결축도 별도로 설정한다. 모터·한계·기준각 편집 때 영점 기준을 유지하며 새 관절을 준비한 뒤 이전 관절을 해제한다. 편집기에서 앵커 연결선/축을 표시하고 관련 옵션만 노출한다.

Physics::SetJointFrames/SetJointMotor/SetJointLimits는 같은 블루프린트 서비스를 사용한다. 유한값·범위·잘못된2D회전/0축·자기연결을 검증하고 JS 설정 실패는 이전 속성을 복원한다. C++ 함수 안에서 변경 직후 속성 읽기도 반영한다.

[실제 물리11군·C++/BP·Win32 제작/Undo·D3D 출시/WebGPU](research/ENGINE_WORK_175.json). 2D/3D60°고정,30°영점,회전된직선축,힘제한,연속기준각변경,2D Y축 직선모터를 확인했다. 전체 관절·cloth/파괴 완료로 승격하지 않는다.
