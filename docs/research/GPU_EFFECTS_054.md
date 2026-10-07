# GPU 입자 정렬·투사체 연결 — 054

2026-10-07. 기존 ParticleSystem과 Projectiles 서비스·BP·C++ 함수를 유지하고 메인 GPU 렌더링에 연결했어요. 사용자 설치7df780dd9a47cf5b는 유지하며, 누적 선행 작업을 끝낸 뒤 갱신해요.

- 거리·깊이·나이와 역순 정렬은 GPU alive 인덱스에 bitonic 단계를 적용해요. 정렬 없는 효과에는 추가 버퍼·정렬 단계가 없어요. 정지 상태와 같은 카메라/월드 행렬에서는 정렬을 생략하고, 버퍼와 파이프라인은 재사용해요. 선택적 정렬 비용은 O(N log² N)이므로 전체 게임의 프레임 측정과 구분해요.
- GPU 투사체 재질은 기존 InstancedBufferGeometry·스프라이트 크롭·XY/XZ 평면과 스타일 소유자를 재사용해요. 이동·swept 충돌·인스턴스 위치 업로드는 기존 CPU 경로예요. GPU 투사체 물리 또는 전체 탄막 목표 FPS 완료로 표시하지 않아요.
- 보통 프레임에는 입자 위치 readback이 없어요. 개인 acceptance 실행만 명시적 진단 readback을 허용하며, 사용 횟수를 따로 기록해요. 공용 런타임·C++/BP의 자동 readback으로 넣지 않았어요.

`npm run test:gpu-effects`, `node tools/check-gpu-scene.mjs --effects --webgl`의 실제 분리 release Player/Win32/WebView2 최종 증거는 `native/build/gpu-scene-fH6fo7/acceptance.json`(GPU), `native/build/gpu-scene-pKFBLF/acceptance.json`(GL)이에요. 여섯 정렬·65개/128슬롯·31개 생존/빈 슬롯·정지 캐시·원근 거리·월드/로컬, 실제 P 키 BP·컴파일 C++ 발사·스프라이트 아틀라스/알파·swept 충돌·XZ 표시 PASS. 전환 뒤 지오메트리·텍스처·GPU 입자 버퍼 반환, 오류0·원본 보존·종료0·서버 종료 PASS. 마지막 검사 소스 SHA를 캐시 manifest에서 대조해요. 첫 검사에서 테스트가 잘못 추측한 회전 명령과 ACES 색상 기준은 실제 Scene::SetRotation과 색상 우세 조건으로 수정했어요.

읽기 기록과 원문 SHA: `native/build/gpu-effects-research-054/manifest.json`. 전체 본문/API 분석으로 계산하지 않아요.

- [Unity 6 ParticleSystemSortMode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemSortMode.html): 자체 설명·일곱 enum 속성 표를 읽었어요. 개별 연결 API 본문은 미독이에요.
- [Unity 6 Renderer module](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysRendererModule.html): 자체 렌더 모드·정렬·크기·정렬 방향·마스크·스트림·그림자·프로브 속성 표를 읽었어요. 이미지와 연결 모듈은 미독이에요.
- [Unreal 5.8 Niagara renderer reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/render-module-reference-for-niagara-effects-in-unreal-engine): 도입/Component·Light 일부와 Sprite/Decal 자체 표를 읽었어요. Mesh·Ribbon 및 연결 자료·이미지는 미독이에요.

대조에서 남은 범위: stretched/mesh/ribbon renderer, custom facing·속성별 binding·custom sort·SubUV blending·Sort Fudge·피벗/플립·커스텀 스트림·모션 벡터·프로브 등은 이 GPU 연결로 구현되지 않아요. 투사체의 기존 용량/스타일 제한도 유지돼요. 에디터·모바일 GPU 연결과 기존 게임 PC120/모바일60·장기 메모리 및 누적 엔진 작업을 이어가요.
