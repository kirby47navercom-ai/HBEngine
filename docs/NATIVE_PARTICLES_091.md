# 091 — DirectX 공용 ParticleSystem 실행

Windows의 `windowsRenderer=d3d11`에서 기존 ParticleSystem 에셋·컴포넌트가 게임 장면에 그려져요. CPU는 기존 seeded birth와 방출 시간만 준비하고, GPU가 이동·힘·중력·감쇠·수명·살아 있는 개수·정렬을 처리해요. 기존 별도 GPU 효과 화면을 게임의 깊이 타깃·HDR·블룸·viewport/scissor에 연결했어요. 사람과 AI가 서로 다른 에셋이나 함수를 사용할 필요가 없어요.

## 제작과 실행

- Main/Emission/Shape/Force/Velocity/Renderer의 기존 속성과 지연·rate·rate over distance·확률/반복 burst·로컬/월드 공간을 공유해요. 색/크기 수명 변화, SVG/일반 텍스처, 알파/가산 혼합, 화면 높이 기준 최소/최대 크기와 sorting layer/order도 유지해요.
- `hb::Particles::Play/Stop/Pause/Emit/GetCount`와 기존 BP 노드·컴포넌트 편집·AI schema/patch/Undo/Save를 사용해요. 새 compute backend도 C++ 즉시 명령·개수 조회가 같은 서비스를 통하도록 수정했어요.
- 거리/깊이/나이와 각 반대 방향의 여섯 정렬을 GPU에서 수행해요. 정사영 카메라의 거리 모드는 기존 WebGPU처럼 깊이를 사용해요. 정상 프레임에는 위치·개수를 CPU에 읽지 않아요. 명시 `GetCount`만 GPU 개수 전송을 기다려요.
- 숨긴 효과도 시뮬레이션을 계속해요. 빈 효과는 draw/sort를 생략하고, 같은 pool 상태·카메라/월드/정렬 조건은 compacted/sorted indices를 재사용해요. 파티클만 카메라에 따라 변하는 draw는 광원 그림자를 다시 만들지 않아요. GPU 버퍼는 효과 해제·장면 전환·종료에서 정리돼요.

## 자원과 검사

pool은 입자당 32B, 요청 버퍼는 실제 방출량에 따라 성장하며 재사용해요. 자유 슬롯/개수는 GPU 버퍼이고, 공유 alive indices와 선택 정렬 key는 필요할 때만 성장해요. 서로 다른 pool 용량 때문에 매 draw마다 재할당하지 않아요. 실제 정렬 작업 크기는 해당 pool의 다음 2의 거듭제곱이에요. draw 상수 버퍼 세 개는 재사용해요. 렌더 타깃과 텍스처도 기존 장면 소유자를 사용해요.

진단은 `particlePools`, `particleBufferBytes`, `particleSteps`, `particleBirths`, `particleSortPasses`, `particleCountReadbacks`, `particleIndexAllocations`, `particleEmissionAllocations`를 제공해요. bytes는 지정 GPU 버퍼 추정이며 전체 프로세스 RAM이나 드라이버 메모리가 아니에요. 객체 snapshot은 `backend: D3D11 compute`, `count: null` 또는 명시 조회 결과, `cpuSimulationParticles: 0`, `automaticPositionReadbacks: 0`을 보여줘요.

[증거 원장](research/NATIVE_PARTICLES_091.json)에 실제 GPU 픽셀/이동·소멸/깊이/텍스처 방향/화면 크기/정렬/HDR, Windows 2D·3D·C++·K키 BP·2049 단일 draw·정지 재사용·해제와 기존 54종 HLSL·스프라이트/한글 HUD·애니메이션 회귀의 경로/SHA를 남겨요. 별도 GPU 효과의 65,537 입자 검사도 통과했지만 그 작은 검사 장면을 전체 게임 FPS로 환산하지 않아요. 검사 프로젝트·프로필·포트·숨긴 창은 격리했고 사용자 설치본/원본/기존 창은 건드리지 않았어요.

## 확인한 원출처

[Unity 6000.0 Renderer module](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysRendererModule.html)의 자체 기술 본문과 표를 읽었어요. 빌보드/메시·정렬·화면 크기·정렬/정렬축·머테리얼·마스크·추가 vertex stream 등 설정을 구분했어요. 이번 연결은 기존 HB 제작 속성에 해당하는 빌보드 부분이고 Unity 모듈의 모든 설정을 구현했다는 뜻은 아니에요. 연결 모듈/API·미디어는 미독으로 남겨요.

[UE 5.8 Niagara renderer reference](https://dev.epicgames.com/documentation/unreal-engine/render-module-reference-for-niagara-effects-in-unreal-engine?lang=en-US)의 Sprite Renderer 절 전체 표와 옵션을 확인했어요. facing/pivot·정렬·SubUV·속성 binding·cutout/opacity·sort order를 각각 따져 남은 렌더 기능에 반영해요. Mesh/Ribbon/Decal 전체와 연결 API·미디어를 모두 읽었다고 계산하지 않아요.

[Microsoft DrawInstancedIndirect](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-drawinstancedindirect)와 [CopyStructureCount](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-copystructurecount)의 자체 선언·인자·제약을 확인했어요. APPEND count를 간접 인자에 GPU 안에서 복사하며, 명시 조회만 staging을 사용해요. 원문 snapshot/SHA와 읽기 경계는 원장에 등록하고 전체 corpus/독립 검증 gate는 유지해요.

## 남은 세부

mesh/ribbon/stretch 및 수평/수직/custom facing, 회전/pivot/SubUV/custom vertex streams, 입자 그림자·충돌/조명·GPU 이벤트와 더 많은 모듈은 남아 있어요. 파티클 마스크와 전용 2D 광원은 다음 네이티브 2D 패스에서 연결하며 지금은 명시 오류예요. 선택 bitonic 정렬은 O(N log² N)이어서 변화가 많은 큰 효과는 radix/키 갱신 비용을 더 줄일 여지가 있어요. 기존 공용 방출의 호출당 100,000 제한과 burst 시간 샘플링도 별도 확장 항목으로 유지해요. 장면 오브젝트 개수에 새 500/1000 제한을 넣지 않았어요.

네이티브 GI/반사·추가 텍스처 계열과 누적 엔진 세부는 계속해요. 사용자 설치 갱신은 누적 선행 묶음을 끝낸 뒤 진행해요. 실제 전체 게임 PC 120/모바일 60fps, 전체 RAM·장기 실행·폰 발열/실기기·iOS 검사는 이번 통과로 대체하지 않아요.
