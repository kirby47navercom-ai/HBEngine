# HBEngine 작업 인계 — 2026-10-02

- 누적 요구: Unreal/Unity의 전체 제작 흐름을 근거로 자체 C++/Win32/DX11 2D·2.5D·3D 엔진 구현. 사용자 사례로 범위를 줄이지 않는다. 사람에게 편한 전용 편집기와 AI의 구조화된 편집·실행 경로를 함께 구현한다.
- 이번 변경: 도킹 병합/분할과 브라우저별 탐색, 계층/다중 변환, 27종 컴포넌트와 고정 스텝 물리/게임 프레임워크, 실제 2D Sprite/Tile/Flipbook 제작/실행, 33노드 GLSL 머테리얼, C++ 서비스 19개, 에셋 ID/참조/재가져오기, revision 보호 편집 API/CLI, 같은 VM/C++를 사용하는 화면 없는 로직 실행기.
- 공식·원저자 자료 대조는 docs/ENGINE_WORKFLOW_RESEARCH.md, AI 계약은 docs/AI_ENGINE_API.md. 문서 전체 확인이나 상용 엔진 완성을 주장하지 않는다. DX11 renderer/HLSL, 정밀 물리, 자동 변환/cooking, 독립 게임 패키지 등은 연구 기록의 전체 작업 지도로 계속 관리한다.
- 기본 사용자 Projects/QuietGarden와 5173 서버는 건드리지 않는다. 별도 5181 서버는 native/build/integration-qa-1790942483241 프로젝트, 사용자 데이터 native/build/integration-user-data. 다음 UI 검증도 사용자 프로젝트 대신 이 독립 프로젝트를 사용한다.
- 통과: npm test, api:check, test:runtime, test:native, test:host, test:library, test:project, test:assets, test:server, test:windows, test:scene, test:2d, test:material, test:integration, test:headless, test:editor-api, test:launcher, test:hub-ui, test:session, desktop:build, test:desktop. 최신 관련 변경 후 해당 검사를 재실행했다. 실제 배포/루트 EXE의 WebView2 준비와 종료·소유 서버 정리도 통과했다.
- 실제 UI 확인: 타일 칠하기→Ctrl+Z→저장, Sprite atlas/crop/PPU/pivot, 머테리얼 100% 프레이밍과 프리셋 변경의 그래프/Inspector 동기화. 2D 전용 문서에서는 중복 전역 패널을 숨기고 도구·팔레트·캔버스·문서 속성을 사용한다. 화면 증거는 Git에서 제외한 native/build/ui-2d-integrated.png에 있다.
- 실제 편집기 API 확인: revision 충돌·잘못된 데이터 거부, Undo·저장·2D 플레이/일시 정지/복구, 실패한 Play 복구, 사용자 C++ 빌드, 2D→3D 장면 전환과 Stop 시 원본 복구. 서버는 현재 프로젝트 ID와 다른 이전 창의 automation poll을 거부한다.
- 장면 전환은 공통 play-world.js 준비 경로를 사용한다. BP Open Scene, C++ hb::Scene::Open, AI runtime.openScene과 화면 없는 실행기가 같은 검증을 거친다. 프레임 경계에서 이전 EndPlay(LevelTransition)·타이머·입력을 정리한다. EndPlay 하나가 실패해도 나머지 바인딩과 정리를 수행하고, 종료된 월드의 비동기 C++ 응답/장면 읽기는 버린다. 가산/스트리밍 장면은 남은 작업이다.
- 저장소 계정 kirby47navercom-ai만 사용하고 한글 제목·변경/검증 본문으로 체크포인트를 커밋·푸시한다. 전체 엔진의 남은 구현은 연구 기록의 작업 지도를 따른다. 텍스트 줄바꿈은 기존 HEAD와 같은 LF로 유지한다. 자동 생성물, 테스트 프로젝트, 스크린샷, dist/HBEngine, HBEngine.exe는 Git에 넣지 않는다. 종료된 하위 에이전트를 재개하지 않았다.
