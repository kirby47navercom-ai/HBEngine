# 801–806 · 머테리얼 그래프 밉 수요와 풀 취소

## 수요 계산

GL·WebGPU·네이티브 sampler binding에 실제 `sourceNode`를 연결했다. 같은 해석된 머테리얼 그래프와 scoped 파라미터·재생 시각으로 UV의 선형 계수를 계산한다. 지원 범위는 UV/상수/파라미터/Time, 증명 가능한 산술·tiling/panner/회전·조합/분리/dot/lerp다. UV끼리 곱하는 비선형 식·노이즈·world/view 좌표·증명하지 못한 경로는 높은 해상도0을 요청한다. 이 요청도 풀의 실제 예산/우선순위 제한을 따른다. 강제 pin으로 예산을 무시하지 않는다.

명시 LOD·uniform 기울기·bias를 별도로 반영한다. 밉 없는 sampler는 수준0을 요청한다. 큐브·볼륨은 기존의 보수적 수준0을 유지한다. 지원 그래프의 계수는 정확히 계산하지만, 화면 수요는 여전히 메시 UV 범위/투영 bounding sphere 기반 추정이다. 삼각형별 국소 UV 미분이나 보조 카메라/굴절 경로의 실제 footprint를 읽는 시스템으로 승격하지 않는다. 기존 graph-only와 texture matrix 해석 중 더 세밀한 수요를 택하며 anisotropy 여유도 반영한다. raster의 UV 변환 구현 자체를 바꾸거나 shader에 새 연산을 삽입하지 않는다.

그래프 node/edge index는 머테리얼 생성 때 만들고, 수요 조회는 풀의 기존 갱신 주기에 수행한다. 관련 upstream 파라미터 값·시각이 바뀔 때만 결과를 갱신한다. 좌표와 무관한 색상 파라미터나 연결되지 않은 Time은 캐시를 깨지 않는다. 지원하지 않거나 깊이를 증명하지 못한 경로는 보수적 요청으로 끝내며 원본 shader 실행이나 게임 오브젝트 수를 제한하지 않는다. 새 GPU uniform/buffer/target/readback·디스크 캐시는 없다.

사람·C++·블루프린트의 기존 `SetFloat/SetVector/updateTime` 경로가 같은 수요를 갱신한다. 별도 추정용 값을 입력할 필요가 없다. `schema.textureResidencyPool.graphDemand`, 머테리얼 binding의 `sourceNode`, `profiler.textureResidency` 항목의 `demandBasis/desiredBase`로 AI가 원인과 실제 그래프를 연결할 수 있다. private data를 직접 변조하지 말고 기존 문서 CAS/런타임 setter를 사용한다.

## 진행 중인 풀의 취소

기존 풀은 설정이 바뀌면 마지막 적용을 거부했지만, 준비 Promise가 끝날 때까지 이미지 읽기를 기다렸다. 이제 각 entry의 owned AbortController를 binding 준비에 연결한다. 예산·선택된 설정·장면 수명이 바뀌면 그 요청만 중단한다. 아직 prepare가 시작되지 않은 취소 batch는 IO를 시작하지 않는다. 준비 후보가 정리될 때까지 임시 예약을 유지한 뒤 반환하며, 이전 batch가 나중에 들어온 수동 요청을 취소하지 않는다. 외부 abort listener는 적용/취소/실패 때 제거한다. 설정 변경과 동일한 파라미터의 수동 요청을 소유권으로 구분한다.

## 실제 근거

- 801:6개 지원 그래프×2시각×2UV 위치에서 기존 독립 CPU 머테리얼 평가기에 샘플 좌표를 반환시켜 선형 계수를 대조했다. 파라미터 변경, 무관한 색/Time 캐시 재사용, 비선형 fallback, bias/LOD/gradient·no-mip·anisotropy·texture matrix를 확인했다. 캐시10만 조회는 약3.1ms인 CPU 관측이며 FPS 측정이 아니다.
- 80302LwCr:실제 GL/WebGPU12조건·22샘플. UV 축소/반복, Time, bias, 명시 LOD/gradient, 비선형 보수 요청을 production 풀에서 적용했다. 각 resident 출력은 별도 full-source draw와 최대오차0, 원래4e-5 유지. GL program ID도 유지했다. 초기 harness의 WebGPU `programStable:true` 표기는 실제 pipeline identity 계측이 아니므로 그 부분은 완료 근거에서 제외했고 이후 보고값을 null로 고쳤다. WebGPU 근거는 실제 픽셀·수요/상주 상태다.
- 804VzqpIk:새 패키징 DirectX 게임에서 실제 SDK C++/블프 F/R의 UV 값 변경으로 desired0→3→1→0→3. 매번 풀을 꺼 수준0으로 복원한 화면과 resident 화면을 비교해 기존3byte 기준을 통과했다. 경로 추적2샘플도 full/resident와 같고 native 주 머테리얼 프로그램을 유지했다. Native 전용 factory에도 수요 연결을 추가했다. 최초 최소 갱신간격과 unwrapped full texture의 진단을 고친 것은 harness 수정이다.
- 8057jKdz9:실제 지연 HTTP와 SceneTextureStreaming 수집/계획. 예산 변경·수동 대체·dispose의3요청이 중단됐다. 미제출 batch 취소는 IO0, 이전 취소 뒤 새 수동 stage는 유지, 최종 decoded/pending/staged0. viewport 크기는 CPU 수요 검사를 위한 fixture이며 GPU 증거로 세지 않는다.
- 806:기존 transaction·가져오기/합성·상주/영역/풀/사용자 지정2D·수요 oracle·native/API 생성 일치13회귀/JS12구문. 기존 네 자료형×GL/WebGPU 풀768oEAV0E8조건도 통과했다.

## 공식 문서와 비교 범위

[Unreal5.8 Building Texture Streaming Data](https://dev.epicgames.com/documentation/en-us/unreal-engine/building-texture-streaming-data-in-unreal-engine)의 검색으로 반환된 본문 중 per-texture UV/scale, bounds·mesh UV density·material scale 및 분석 실패 구역을 대조했다. HB의 fallback0은 이 글의 UV0/scale1 fallback과 같은 알고리즘이 아니다. 기능별 정확도 시각화 전체를 구현했다고도 세지 않는다.

[Unity6000.6 Mipmaps](https://docs.unity.com/en-us/engine/6000.6/manual/materials-and-shaders/textures/textures-getting-started/texture-mipmaps-introduction)의 반환된 bias/샘플 선택 구역도 대조했다. 검색에 나온 Unity7000 streaming configure/use/introduction과 bias API는 발견 항목으로 등록하며 그 버전 전체 본문/API를 분석했다고 계산하지 않는다. 전체 UE/Unity corpus gate는 그대로 남는다.

남은 범위는 국소 삼각형/비선형/절차 UV 미분과 보조 뷰·광학 footprint, 다른 디스크 차원/자동 쿠킹·압축/HDR/raw·전체 heap, 복잡 GL/FXC 준비 및 누적 엔진 목표다. 이 변경으로 전체 렌더링이나 엔진 목표를 완료 처리하지 않는다.
