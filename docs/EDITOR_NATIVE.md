# 편집기 네이티브 전환

목표: 편집기도 게임과 같은 C++/Win32/DirectX로 돌리고 WebView2를 없애요. 순서는 아래 세 단계예요.

1. 장면 뷰포트를 엔진 렌더러로 (완료, 아래)
2. 편집기 패널을 네이티브 위젯(게임 UI의 Skia 위젯 시스템)으로 하나씩 이전: 계층·속성·에셋 목록부터, 노드 그래프는 나중에
3. WebView2 제거, 예전 WebView 게임 실행 옵션(`windowsRuntime: 'webview'`) 삭제

## 1단계 장면 뷰포트

- 편집기 EXE(`HBEngine.exe`)에 `SceneRenderBridge`를 넣었어요. 전에는 WebView 게임 플레이어 빌드에만 있어서 편집기는 three.js/WebGL로만 그렸어요.
- 데스크톱 호스트에서는 `#scene-canvas`를 `createGameRenderer(...,'d3d11',...,{embedded:true})`로 열어요. 브리지에 `auto`를 요청하므로 하드웨어 직접 Direct3D12 우선, 실패하면 Direct3D11이에요. 네이티브가 안 열리면 오류를 로그에 남기고 WebGL2로 그려요.
- 그리는 방식: 호스트 창 전체 크기의 스왑체인이 투명한 WebView 뒤에 있고, 캔버스 사각형을 뷰포트·가위 영역으로 써요. 캔버스 밖은 편집기 배경색(`--bg`)으로 지우고, 캔버스의 조상 요소 배경은 투명하게 바꿔요(`native-scene-renderer.js`의 `embed`).
- 편집기도 셰이더 디스크 캐시를 쓰고, 처음 실행할 때 번들 `Shaders`(`dist/HBEngine/Shaders`)로 채워요. 전에는 편집기 빌드에 캐시 설정이 없어 DX12 초기화가 매번 약 30초 걸렸어요.
- 프레임은 한 번에 하나만 보내요. 제출 뒤 `hbFinishFrame`으로 완료를 기다리고, 앞 프레임이 끝나기 전 프레임은 건너뛰어요.
- 남은 WebGL: 머테리얼 미리보기(호스트에 네이티브 렌더러가 하나라서), 렌더러를 공유하는 추가 도킹 뷰포트(네이티브에서는 비어 있음; 카메라 뷰 `selectCameraView`로 옮길 예정), RoomEnvironment 기본 환경맵(네이티브는 자체 하늘 캡처·프로브 사용).

검증: `node tools/check-editor-native-viewport.mjs` — 숨긴 실제 편집기와 임시 3D 프로젝트에서 뷰포트 백엔드 `D3D12`(`requestedBackend:auto`), 그리기 33개, 네이티브 표면 캡처에서 캔버스 안은 음영 있는 장면(서로 다른 색 14개), 캔버스 밖은 편집기 배경 `32,34,38`. 기존 `check-distance-field-822-editor`, `check-mesh-renderer-1620-editor` 통과. 보이는 창 사람 확인은 하지 않았어요.
