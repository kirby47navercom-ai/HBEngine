# 187 — 시간 노멀맵의 이전 GPU 표본

불투명 머테리얼의 Normal만 Time에 의존하면 이전에 성공한 프레임의 절대 시간을 사용해 이전 표본을 다시 계산하고, 기존 이전 정점/노멀/UV 접선 프레임으로 옮긴다. DirectX HLSL·WebGL GLSL·WebGPU TSL은 각 프로그램 본문을 한 번만 생성하고 현재/이전 호출의 시간 문맥을 공유한다. 기존 forward.w를 사용하며 새 상수 버퍼·아틀라스 레코드·이력 이미지·상시 GPU 읽기를 추가하지 않았다.

현재 시간과 시간 차를 float32로 더하면 장시간 실행 후 이전 표본이 틀릴 수 있어 절대 이전 시간을 전달한다. 이전 시간이 0이어도 유효하다. 성공한 프레임만 시간을 확정하며 실패·되감기·머테리얼 변경·기능 해제/종료는 이전 포즈와 시간을 함께 무효화한다. MC 누적은 시간 변화에 맞춰 계속 초기화하고 표시 필터의 재투영 가능 여부만 분리한다.

월드/시점 입력, 다른 표면 필드의 시간 변화, 시간 노멀을 쓰는 투명체는 기존 보수적 거절을 유지한다. 투명체는 이전/현재 법선에 따라 전반사 여부부터 달라질 수 있기 때문이다. 이전 mip footprint와 이전 굴절 분기 복원은 이 변경의 범위에 포함하지 않는다.

CPU7개와 기존106/110/138/141 회귀, 실제 하드웨어 D3D11 Compute 및 WebGL/WebGPU의 부호 있는 법선 픽셀을 검사했다. 0→0.5와 1000000.01→1000000.04 시간 표본의 최대 성분 오차는 약5.93e-8이다. 실제 패키징 게임 3개 렌더 경로에서 이력·아틀라스 크기와 D3D 프로그램 재사용·오류0/종료0을 별도로 확인했다. 단순 프로브의 컴파일 시간은 복잡 그래프의 초기 컴파일 지연이나 전체 게임 FPS를 뜻하지 않는다. [검증](research/ENGINE_WORK_187.json).

설계 대조: [Unreal Time 표현식](https://dev.epicgames.com/documentation/en-us/unreal-engine/constant-material-expressions-in-unreal-engine#time)의 Time 본문152–161과 [TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine)의308–328에 나온 이전 프레임 입력/셰이딩 거절 설명을 읽었다. 후자는 WPO 설명으로, 올바른 이전 입력을 제공한다는 설계 원칙을 HB 노멀 표본에 적용한 추론이며 Unreal TSR과 같은 알고리즘이라는 뜻은 아니다. 연결 API·미디어·문서 전체 분석으로 계산하지 않는다.


187–189 설치 확인: 44a236f286ae030e·명세2538파일 실행 후 SHA 일치·설치 EXE 제작 조작/키 반복/입력·IME/Undo/분리 HWND/사용자 키와 독립 버튼·설정 복원 및 장시간 GL/GPU 시간 노멀 픽셀 PASS·오류0/종료0. 사용자 프로필10385파일 SHA 불변·바로가기2/.hbproject 연결·이전 설치174512983바이트 정리·Versions1. 근거 docs/research/USER_INSTALL_189.json.
