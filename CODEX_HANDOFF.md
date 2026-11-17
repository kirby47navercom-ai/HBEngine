# HBEngine 현재 인계 · 2026-11-17

Windows 편집기와 게임은 네이티브 빌드만 있어요. WebView2 호환 편집기·`HBPlayer.exe`·게임 `windowsRuntime: webview`는 제거했어요([편집기 안내](docs/EDITOR_NATIVE.md)의 "WebView2 제거"). 바탕화면 "HBEngine"은 개발용으로 저장소 빌드(dist/HBEngineNative/HBEngineNative.exe)를 실행하고, "HBEngine 사용자용"은 사용자 설치를 실행해요. 사용자 설치는 요청할 때만 갱신해요(2026-11-16 언리얼 스타일 편집기로 갱신). 영수증은 [USER_INSTALL_20261116-3](docs/research/USER_INSTALL_20261116-3.json)이에요.

- 4비트 IMA ADPCM WAV는 편집기 파형·미리듣기와 게임의 믹서·탐색·반복·가상 음성에서 지원해요. 패키지 구간 읽기와 스테레오 표본 검사는 native-platform-K9dZtN, 실제 D3D12 배포 게임 40프레임 검사는 native-game-DbBbNJ, 단독 Win32 편집기와 오디오 제작 검사 native-authoring-5W0Hxk에 있어요. 증거 위치는 native/build예요.
- D3D12 프레임은 같은 자원을 한 번만 보유하고 펜스 티켓을 순환 배열에서 찾아요. 하드웨어·WARP 결과는 native/build/d3d12-direct-ckuFFn/acceptance.json과 native/build/d3d12-particles-fklJ0a/acceptance.json이에요.
- 일반 실행은 프레임별 긴 진단을 생략하고 보고서 요청에서는 타이머 기상·호스트 왕복·렌더 명령 시간으로 지연을 나눠요. 증거는 native/build/native-game-jyLQFB/acceptance.json이에요.

- 2026-11-17 편집기·엔진 기본 기능 묶음(커밋 03d1ce2c~35165f11, 항목마다 커밋): 플레이 일시정지·한 프레임 진행(F6/F7), 프로젝트 설정(프로젝트 게임 설정), 출력 로그 심각도·필터·묶기, 컴포넌트 순서·초기화·복사, 피벗/중심·프리팹 파란색, 명령·에셋 검색(Ctrl+K), 프로파일러 탭, 조명 빌드(UV1 메시), 내비 메시 굽기·표시(P), 방향광 캐스케이드 그림자, 게임 UI 한글 IME 조합, 스크립트 크래시 보고서, 이름 붙인 레이아웃. 설명은 [편집기 안내](docs/EDITOR_NATIVE.md). 플레이 포함 검사는 `node tools/check-native-authoring.mjs dist/HBEngineNative/HBEngineNative.exe dist/HBEngineNative/HBNativePlayer.exe`.
- 2026-11-17 이어서(11f4d81f~f0b5b3ee): 소스 관리 패널, 프리팹 모드(11f4d81f의 컴파일 오류는 1a9660ce에서 수정), 단축키 지정, 메시·머티리얼 썸네일, 충돌 표시(Alt+C), LOD 자동 생성, MP3/Ogg/FLAC 스트리밍 표시 클립 전체 디코드 재생, 기본 도형 UV1 자동 생성, 네이티브 Points 렌더. 빌드 실패를 놓치지 않도록 빌드 뒤 dist 실행 파일 시각을 확인해요.
- 2026-11-17 추가: 파티클 편집기(389be4ce), 가림 컬링(1554bab4), 레벨 스트리밍 범위(9cb969f5).
- 남은 기본 기능(우선순위): 플레이 로그·print를 편집기 출력 로그로, 디테일 색 선택기, 에셋 필드 선택·끌어놓기·브라우저에서 찾기, 콘텐츠 브라우저 다중 선택, 탐색기 끌어놓기 가져오기, 장면 전체 선택·Esc 선택 해제·반전, 다른 이름 저장·모두 저장, 트랜스폼·속성 기본값 되돌리기, 디테일 검색, 에셋 복제, H 숨기기·모두 보이기·격리, 디버그 그리기 API, 진행 표시줄·취소·알림, 이름 붙인 충돌 레이어·행렬, 여기서 플레이·뷰포트 안 플레이, 실행 중 해상도·전체 화면·VSync 설정, Home 전체 보기·빈 부모 만들기, 트랜스폼 값 복사/붙여넣기, Windows 아이콘·버전·스플래시, 게임패드 진동·로딩 화면. 그 밖에 파티클 노드 그래프, 프레임 디버거, 자유 도킹, 통합 기즈모, 영상 재생, 네트워크 예측, 잡 시스템, HLOD, 래그돌. check-native-scene-render는 그림자 맵 최소 256 기대값 불일치로 이전부터 실패해요.


다음 작업과 완료 근거는 [누적 원장](docs/research/ENGINE_STATUS.json), 네이티브 조작은 [편집기 안내](docs/EDITOR_NATIVE.md)를 참고해요. 11월 13일 Windows 제작·렌더링과 WORK3443까지의 이전 기록은 [인계 보관본](docs/archive/CODEX_HANDOFF_THROUGH_3443_AND_NATIVE_WINDOWS.md)에 있어요. 작업별 소유자는 node tools/hb.mjs context "작업명" --compact로 찾아요.
