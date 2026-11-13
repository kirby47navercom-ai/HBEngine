# HBEngine 현재 인계 · 2026-11-13

Windows 네이티브 편집기와 게임이 기본 빌드예요. 별도 호환 빌드가 WebView2를 사용해요. 사용자 설치는 보류 중이며 마지막 설치 영수증은 [USER_INSTALL_3443](docs/research/USER_INSTALL_3443.json)이에요.

- 4비트 IMA ADPCM WAV는 편집기 파형·미리듣기와 게임의 믹서·탐색·반복·가상 음성에서 지원해요. 패키지 구간 읽기와 스테레오 표본 검사는 native-platform-K9dZtN, 실제 D3D12 배포 게임 40프레임 검사는 native-game-DbBbNJ, 단독 Win32 편집기와 오디오 제작 검사 native-authoring-5W0Hxk에 있어요. 증거 위치는 native/build예요.
- D3D12 프레임은 같은 자원을 한 번만 보유하고 펜스 티켓을 순환 배열에서 찾아요. 하드웨어·WARP 결과는 native/build/d3d12-direct-ckuFFn/acceptance.json과 native/build/d3d12-particles-fklJ0a/acceptance.json이에요.
- 일반 실행은 프레임별 긴 진단을 생략하고 보고서 요청에서는 타이머 기상·호스트 왕복·렌더 명령 시간으로 지연을 나눠요. 증거는 native/build/native-game-jyLQFB/acceptance.json이에요.

다음 작업과 완료 근거는 [누적 원장](docs/research/ENGINE_STATUS.json), 네이티브 조작은 [편집기 안내](docs/EDITOR_NATIVE.md)를 참고해요. 11월 13일 Windows 제작·렌더링과 WORK3443까지의 이전 기록은 [인계 보관본](docs/archive/CODEX_HANDOFF_THROUGH_3443_AND_NATIVE_WINDOWS.md)에 있어요. 작업별 소유자는 node tools/hb.mjs context "작업명" --compact로 찾아요.
