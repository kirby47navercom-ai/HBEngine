# 210 — 애니메이션 시각 포즈 예산·다중 카메라·공용 SDK

- 선택형 AnimationBudget 컴포넌트와 배치 메뉴; 우선순위 manager/actor·여러 카메라 중 최근접 구 경계 거리·2D 평면 보존
- 실제 graph.tick wall ms EMA로 선택적 시각 포즈의 Hz 할당; 최소 갱신/보호 비용 초과를 숨기지 않음; 안정 ID 위상·포즈/계획/후보 재사용·비활성/풀 manager 제외
- 시간/이벤트·root motion·몽타주·리타게팅·게임플레이 포즈 보호; 공용 C++4함수/BP4노드·동일 컴포넌트 명령/즉시 스냅샷·AI runtime.lod 진단
- 사람 Inspector 설정/Undo·4Hz 라이브 수치와 최소 비용 초과 표시; 실제16 glTF Graph·C++ BeginPlay와 D3D11 패키지에서 선택적 포즈 절감/시간 진행

남은 범위: soft budget이며 초기 포즈/최소 Hz/보호 work는 예산을 초과할 수 있음. 측정은 graph.tick wall 시간이며 CPU cycle·전체 프레임·GPU/IPC 예산이나120/60fps 보장 아님 / 보호 그래프/레거시 Mixer/SpriteSkin의 전체 CPU 예산·뼈 LOD·시야/가림 중요도와 큰 장면/실기기 지속 성능은 잔여 / 추가 viewport 다중 카메라 hook 연결; 순수/VM 다중 카메라 검증과 실제 단일 게임 카메라를 검사. 모든 분리창/DPI 조합 실측 주장은 아님

근거: [ENGINE_WORK_210.json](research/ENGINE_WORK_210.json). 설치 검증은 별도 영수증에 기록한다.


210–211 설치 확인: 757399520cda70d2·명세2654파일 실행 후 SHA동일·SDK 헤더 포함·설치 EXE의 예산 Inspector/Undo/C++와 생성 Take 설정/적용/Undo·독립 제작 미리보기/조회·CPP 재생/Seek/Stop 통과. 예외/콘솔오류0·종료0, 캡처3 직접 시각검토. User10385파일 SHA불변·링크2/.hbproject·이전설치175366600B 제거·Versions1. USER_INSTALL_211.json.
