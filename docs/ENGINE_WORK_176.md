# 차량 제작·실제 물리·C++·휠 표시

오브젝트 만들기의 Vehicle 레시피는 1200kg 동적3D Rigidbody·차체 충돌·4개 RaycastVehicle 휠을 만든다. 장면/블루프린트 속성 창에서 휠 이름·차체기준 위치·반지름/폭·서스펜션 길이/이동/강성/감쇠/최대힘·마찰·조향비율·구동/제동/주차제동을 편집하고 추가·삭제·Undo한다. 같은 정의를 AI schema/JSON문서 revision·patch 경로에서 사용한다.

Physics::SetVehicleInput(actor,throttle,steering,brake,handbrake)와 GetVehicleSpeed(actor)를 C++와 BP에서 공유한다. 입력은[-1,1]/[-1,1]/[0,1]/[0,1], 속도는 차체앞+Z 투영m/s이다. 자동차+키보드/터치 액션 연결은 기존 입력 이벤트에서 이 함수를 호출한다. 자동 키 가로채기는 하지 않는다.

기존 Rapier0.21 레이캐스트 차량을 fixed step 전에 갱신한다. 노면은 자신의 차체/트리거/질의전용 충돌을 제외하고 mask로 선택한다. 휠별 접촉·서스펜션 힘/길이·회전·조향을 runtimeDebug에 공개한다. 타이어/림은 공유 기하1·머테리얼2로 표시하며 비균일 root scale 아래에서도 물리m를 보존한다. 비활성·pool·body삭제/교체·장면 종료 때 컨트롤러와 리소스를 정리한다. 새 의존성/자동 GPU 회수0, 전체차량 고정상한없음.

[CPU8군·실제 C++/BP·Win32 제작/Undo·D3D 출시/개발·WebGPU](research/ENGINE_WORK_176.json). 1200kg 정지 지지/가속/후진/제동/조향, 필터, 수명/실패, 시각척도/리소스, 사람의 장면 및 BP 휠 편집·추가·Undo와 기존172~175병합/Git/UI/네트워크/관절 회귀를 묶어 확인했다. D3D 실제 메시 화면은 native renderer capture로 별도 확인했다.

변속기·차동장치·ABS·엔진RPM/토크곡선·타이어부피충돌·고급bone드라이버·손상/네트워크예측·cloth/파괴는 별도 잔여다.


175–176 설치 확인: a2c8c587c0dfb8ef·명세2426파일 실행 후 SHA 일치·격리 설치 EXE의 병합/Git/사람 위젯 속성/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173280443바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_176.json.
