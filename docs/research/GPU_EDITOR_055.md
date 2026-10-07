# GPU 에디터·공용 실행 연결 — 055

2026-10-07. 기존 에디터에 공용 createGameRenderer를 연결했어요. 기본 GL을 유지하고 씬/저장된 렌더러 선택으로 GPU를 켜요. 월드 설정의 저장·적용은 저장 후 재열기 방식이에요. 머테리얼 미리보기는 같은 선택을 사용하고, 추가 GPU 씬 뷰포트는 같은 GPU 자원/시뮬레이션을 공유해요. GL 추가 뷰포트는 기존 독립 렌더러를 유지해요. 추가 GPU 창의 캔버스 크기 변경·브라우저 복사 비용은 남으며 전체 FPS 달성을 뜻하지 않아요. 다른 종류의 모델/컴포넌트 미리보기는 기존 GL 경로예요.

보기 모드의 GPU 진단 재질은 원본 노드·빌보드 위치·마스크·텍스처를 빌려요. 임시 재질과 원본 소유권을 분리하고, 뷰포트 종료가 공용 렌더러를 파괴하지 않도록 했어요. 에디터 C++ 호출에도 기존 양방향 GPU 입자 질의를 연결했어요. GPU debug 상태는 실행 복제본에만 쓰고 작성 중인 씬에 섞지 않아요. AI의 window.open/close와 viewport.get에도 실제 창/렌더러 상태를 제공해요.

`npm run test:gpu-editor`, `node tools/check-gpu-editor.mjs --webgl`: 실제 분리 Win32/WebView2 에디터 최종 GPU O0KfBR / GL seYlCw PASS. 여섯 보기 모드·추가 2D 뷰포트·실제 머테리얼 미리보기 PNG, 스프라이트 색상·BP P 입력·컴파일 C++ 방출/개수65·투사체 색상, GPU CPU 입자0/자동 위치 readback0, 종료·자원 반환·원본 Assets/Source bytes 보존·저장 후 보존·서버 종료 PASS. 파일 SHA는 캐시 manifest의 proof와 대조했어요. 영향을 받은 배포 Player GPU effects uYufWW도 현재 소스 SHA로 통과했어요. 채널 보안/유실 호출 재시도 방지, 뷰포트 격리/복구 기존 검사는 각각 통과했어요. 실제 독립 창 이동, 모든 단축키, 렌더러 적용 버튼 재열기 흐름을 이 검사로 전부 검증했다고 표시하지 않아요.

실패와 수정: 초기 에디터 import map의 three/webgpu 누락, 빌보드 진단 재질 normalScale 부재, C++ renderer query 서버 전달 누락, GPU 상태의 작성 씬 오염을 고쳤어요. 검사기의 잘못된 index URL 가정과 저장 포맷 비교는 실제 URL·정식 JSON 저장 형식으로 고쳤어요.

읽기 범위/원문 SHA: `native/build/gpu-editor-research-055/manifest.json`.

- [Unreal Viewport Modes](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-modes-in-unreal-engine): 자체 텍스트/모드·단축키·디버그 표를 읽었어요. 이미지·연결 본문은 미독이에요.
- [Unity 6 View modes](https://docs.unity.com/en-us/engine/6000.0/manual/working-with-scenes/scenes-manage-gameobjects/overlays/view-modes): 자체 드로 모드/표시 옵션 텍스트와 표를 읽었어요. 이미지·연결 본문은 미독이에요.
- 설치 Three 0.180.0 Normal.js의 normalView 분기/context.setupNormal과 normalWorld 변환을 읽었어요. 다른 accessor 전체 분석으로 세지 않아요.

대조에서 남은 사항: 엔진별 렌더 경로/GBuffer/GI/라이트맵·반사/LOD/Overdraw/Shader complexity 등 추가 디버그 모드, 전체 에디터·플랫폼 API 분석과 UI 동작 완성은 이 연결과 별개로 남아요. 모바일 GPU 질의·전체 게임 PC120/모바일60·장기 RAM 및 누적 선행 목표를 이어가며 사용자 설치7df780dd9a47cf5b는 유지해요.
