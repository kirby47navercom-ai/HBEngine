# HBEngine 현재 인계 · 2026-11-17

Windows 편집기와 게임은 네이티브 빌드만 있어요. WebView2 호환 편집기·`HBPlayer.exe`·게임 `windowsRuntime: webview`는 제거했어요([편집기 안내](docs/EDITOR_NATIVE.md)의 "WebView2 제거"). 바탕화면 "HBEngine"은 개발용으로 저장소 빌드(dist/HBEngineNative/HBEngineNative.exe)를 실행하고, "HBEngine 사용자용"은 사용자 설치를 실행해요. 사용자 설치는 요청할 때만 갱신해요(2026-11-16 언리얼 스타일 편집기로 갱신). 영수증은 [USER_INSTALL_20261116-3](docs/research/USER_INSTALL_20261116-3.json)이에요.

- 4비트 IMA ADPCM WAV는 편집기 파형·미리듣기와 게임의 믹서·탐색·반복·가상 음성에서 지원해요. 패키지 구간 읽기와 스테레오 표본 검사는 native-platform-K9dZtN, 실제 D3D12 배포 게임 40프레임 검사는 native-game-DbBbNJ, 단독 Win32 편집기와 오디오 제작 검사 native-authoring-5W0Hxk에 있어요. 증거 위치는 native/build예요.
- D3D12 프레임은 같은 자원을 한 번만 보유하고 펜스 티켓을 순환 배열에서 찾아요. 하드웨어·WARP 결과는 native/build/d3d12-direct-ckuFFn/acceptance.json과 native/build/d3d12-particles-fklJ0a/acceptance.json이에요.
- 일반 실행은 프레임별 긴 진단을 생략하고 보고서 요청에서는 타이머 기상·호스트 왕복·렌더 명령 시간으로 지연을 나눠요. 증거는 native/build/native-game-jyLQFB/acceptance.json이에요.

- 2026-11-17 편집기·엔진 기본 기능 묶음(커밋 03d1ce2c~35165f11, 항목마다 커밋): 플레이 일시정지·한 프레임 진행(F6/F7), 프로젝트 설정(프로젝트 게임 설정), 출력 로그 심각도·필터·묶기, 컴포넌트 순서·초기화·복사, 피벗/중심·프리팹 파란색, 명령·에셋 검색(Ctrl+K), 프로파일러 탭, 조명 빌드(UV1 메시), 내비 메시 굽기·표시(P), 방향광 캐스케이드 그림자, 게임 UI 한글 IME 조합, 스크립트 크래시 보고서, 이름 붙인 레이아웃. 설명은 [편집기 안내](docs/EDITOR_NATIVE.md). 플레이 포함 검사는 `node tools/check-native-authoring.mjs dist/HBEngineNative/HBEngineNative.exe dist/HBEngineNative/HBNativePlayer.exe`.
- 남은 부족 기능: 파티클(VFX) 편집기, 프리팹 단독 편집, 엔진 에셋 썸네일, 소스 관리 패널, 단축키 재지정 편집기·편집기 환경설정, 텍스처·오디오 가져오기 설정, 자유 분리/중첩 도킹, 사각형·통합 기즈모, 추가 보기 모드·프레임 디버거, 레벨 스트리밍 UI, 오디오 믹서·입력·현지화·충돌 전용 편집기; 엔진은 가림 컬링, MP3/Ogg 스트리밍·영상, 네이티브 ShaderMaterial/Points, 네트워크 예측, 잡 시스템, HLOD·자동 LOD, 기본 도형 UV1 자동 생성. check-native-scene-render는 그림자 맵 최소 256 기대값 불일치로 이전부터 실패해요.


다음 작업과 완료 근거는 [누적 원장](docs/research/ENGINE_STATUS.json), 네이티브 조작은 [편집기 안내](docs/EDITOR_NATIVE.md)를 참고해요. 11월 13일 Windows 제작·렌더링과 WORK3443까지의 이전 기록은 [인계 보관본](docs/archive/CODEX_HANDOFF_THROUGH_3443_AND_NATIVE_WINDOWS.md)에 있어요. 작업별 소유자는 node tools/hb.mjs context "작업명" --compact로 찾아요.
