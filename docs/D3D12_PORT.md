# Direct3D12 직접 포트

목표는 D3D11On12 번역층이 아니라 `ID3D12GraphicsCommandList`로 직접 그리는 네이티브 렌더러예요. 현재 빌드 프로필의 `nativeGraphicsAPI: d3d12`는 여전히 D3D11On12 경로(`backend:D3D12-11on12`)이며, 이 포트가 끝나기 전에는 기본값을 바꾸지 않아요.

## 단계

1. **코어 (완료)** — `native/include/HBEngine/D3D12Direct.hpp`
2. **기본 메시·머테리얼 (완료)** — `native/include/HBEngine/SceneRenderD3D12.hpp`
3. 나머지 기능 이전
   - **3-1 그림자·인스턴싱·스키닝/모프·라이트 타일 (완료)**
   - **3-2a 반사 프로브 캡처·필터·바인딩, 하늘 HDRI (완료)**
   - **3-2b 반사 프로브 아틀라스(전역 프로브)·베이크 라이트맵 (완료)**
   - **3-3a HDR·블룸·후처리 합성·자동 노출·LUT·FXAA·투과·밉 생성 (완료)**
   - 3-3b 화면 효과(SSAO/SSR/TAA 등)·모션 벡터·MRT
   - 3-4 머테리얼 노드 프로그램·2D·파티클
4. 성능 비교 후 기본값 전환

## 1단계 코어 내용

- 장치: 하드웨어 실패 시 WARP, 실패 이유 둘 다 보고. `validation=true`면 디버그 레이어 사용(설치된 PC만).
- 직접 큐 1개·펜스·프레임 3개 동시 진행. 프레임마다 명령 할당자와 펜스 값을 가지고 재사용 전에 기다려요.
- 업로드 링: 프레임별 영구 매핑 구역. 구역보다 큰 요청은 별도 업로드 버퍼를 만들고 그 프레임 펜스가 지난 뒤 해제해요(고정 용량 실패 없음).
- 디스크립터: RTV/DSV CPU 풀(슬롯 재사용), 셰이더용 CBV/SRV/UAV 힙은 프레임별 구역(초과 시 명확한 오류).
- 리소스 상태 추적(`Resource::state`)과 전환 배리어, 지연 해제(`retire`).
- 루트 시그니처 직렬화, 그래픽 PSO. HLSL은 DX11과 같은 `ShaderBytecodeCompiler`·디스크 캐시로 SM5 바이트코드를 만들어요.
- RGBA8 읽기(`read`), 플립 모델 스왑체인(획득·표시·크기 변경).
- MinGW `d3d12.h`의 구조체 반환 ABI를 MSVC와 맞추려고 `WIDL_EXPLICIT_AGGREGATE_RETURNS`를 정의해요(`D3D12Interop.hpp`).

## 검증

`node tools/check-native-d3d12-direct.mjs` — 실제 하드웨어 GPU와 WARP에서 루트 상수·루트 CBV·깊이 테스트·읽기 픽셀, 30프레임 링 재사용과 초과 업로드, 디스크립터 초과 오류, 숨긴 창 표시 6회와 크기 변경, 디버그 레이어 오류 0을 확인해요. 장면 렌더러 전체나 게임 FPS 검사는 아니에요. 기존 `check-native-d3d12-interop`(D3D11·11On12)도 계속 통과해요.

## 2단계 메시·머테리얼 내용

- `SceneMeshRenderer`는 DX11 `SceneRenderer`와 같은 장면 VS/PS 소스·상수 배치(`Constants`)·래스터 규칙을 써요(`friend`로 공유, 셰이더 복사 없음).
- 루트 시그니처는 셰이더 반사(`D3DReflect`)로 만들어요. cbuffer마다 루트 CBV, SRV t0~t52 표 1개, 샘플러 표 1개. 쓰지 않는 슬롯은 셰이더 선언 차원에 맞춘 null 디스크립터로 채워요(DX11의 미바인딩과 같은 0 읽기).
- 지원: 메시·보조 UV, 머테리얼 상수, 맵 6개(sRGB/선형)와 샘플러 키(기본·확장 인코딩 동일), 방향/점/스포트/반구 조명, 안개·노출·톤매핑, 알파/가산/불투명 블렌드, 깊이 테스트/쓰기, 컬링·음수 행렬식 감김, 뷰포트·가위.
- PSO는 래스터 6 × 블렌드 3 × 깊이 4 조합을 처음 쓸 때 만들어요. 샘플러 표는 키 조합별로 한 번만 만들고 재사용해요(힙이 차면 GPU를 한 번 기다리고 다시 채움).
- 코어 추가: 단일 밉 텍스처 업로드(`Device::texture`), 셰이더용 샘플러 힙, 프레임별 셰이더 디스크립터 기본 16384개.
- 아직 3단계: 그림자·프로브·인스턴싱·스키닝/모프·머테리얼 프로그램·2D·투과·라이트 타일·블룸/후처리, GPU 밉 생성(지금은 1밉).

## 2단계 검증

`node tools/check-native-d3d12-scene.mjs` — 같은 장면(조명 큐브+텍스처 2장, 반투명 사각형, 거울 가산 사각형; 전체 화면과 뷰포트·가위 2회)을 DX11과 D3D12로 그려 실제 GPU와 WARP 모두 픽셀 최대 차이 0, 디버그 레이어 오류 0을 확인했어요.

### WARP 멈춤 해결

- 증상: D3D12 WARP에서 조명 그리기의 첫 펜스가 끝나지 않음(9분 이상).
- 원인: WARP는 셰이더를 첫 그리기 때 GPU 타임라인에서 JIT 컴파일해요. 투과 분산 계산이 `[unroll]` 3채널 + 일반 경로로 `refractedBackground`(프로브 아틀라스 탐색 포함)를 네 번 인라인해서 JIT 시간이 폭증했어요. 무한 루프는 아니었어요(구간별 조기 반환·치환으로 확인).
- 수정: 채널 수(1 또는 3)만큼 도는 `[loop]` 하나로 바꿨어요. 결과 식은 같고(DX11 `--transmission-only` 결과 전 항목 동일, `dispersionChangedChannels` 568), WARP 첫 그리기는 약 6초로 끝나요.
- WARP 장치의 펜스 대기는 첫 그리기 JIT를 고려해 120초, 하드웨어는 10초 그대로예요.

## 3-1단계 그림자·인스턴싱·변형·라이트 타일

- 코어: `Device::update`(큐 순서로 버퍼 제자리 갱신, DX11 `UpdateSubresource`와 같은 의미), UAV 버퍼, 컴퓨트 PSO.
- 인스턴스(`createInstances/setInstances/setShotPositions`), 스키닝·모프(`createDeformation/setPose`)는 기본 힙 버퍼 하나를 갱신해 t26~t31로 붙여요. 거울 인스턴스 감김·앞뒤 판정 비트도 DX11과 같아요.
- 그림자: R32 배열 텍스처(층마다 DSV), `ShadowPS`와 기울기 바이어스 PSO, t24/t25. `beginShadow/endShadow` 흐름은 DX11과 같아요.
- 라이트 타일: `SceneLightTiles`의 같은 컬링 컴퓨트 셰이더를 루트 CBV/SRV/UAV로 실행(조명 16개 이상), t48/b3. `begin`마다 다시 계산해요.
- `draw`는 DX11과 같은 인자 순서(프로그램 자리는 아직 null만 허용)라 이후 전환 때 호출부를 그대로 쓸 수 있어요.
- 아직: 점광 큐브 그림자(6면) 별도 검사, 이전 포즈·이전 인스턴스(모션 벡터), 동적 메시 스트림.

검증: `check-native-d3d12-scene` — 기존 2장면에 인스턴스(거울 포함)·샷 위치·스킨+모프를 더하고, 방향광+스포트 그림자 장면과 조명 20개 타일 장면을 추가. 실제 GPU·WARP 모두 4장면 픽셀 최대 차이 0, 디버그 레이어 오류 0. 그림자를 끈 DX11 렌더와 1448픽셀 달라 그림자 패스가 실제로 반영됨을 확인했어요.

## 3-2a단계 반사 프로브·하늘

- 프로브: R16G16B16A16F 큐브 캡처(면마다 RTV, 깊이 별도), 필터된 밉 체인, SH 9계수 버퍼. `createProbe/beginProbe/endProbe/filterProbe(Step)`는 DX11과 같은 흐름이에요.
- 필터: `SceneProbes`의 같은 Prefilter/Integrate/Diffuse/Equirect 컴퓨트 커널. 루트 b0 + SRV 표 2 + UAV 표 3 + 정적 샘플러 2(클램프, U 반복). BRDF LUT(128², RG32F)는 처음 쓸 때 한 번 계산해요.
- 캡처 중에는 HDR PSO(R16G16B16A16F 대상)와 `2048` 비트를 써요. 라이트 타일은 캡처 중 끄는 DX11 규칙을 그대로 따라요.
- 장면 바인딩: 로컬 프로브 2개(t39~t42), BRDF(t43), 하늘(t46/t47), 프로브 설정 b2를 그리기마다 올리고, 프로브가 있으면 샘플러 s14를 키 16으로 바꿔요.
- 하늘: `setSkyEnvironment`(파노라마 → Equirect → 필터), `setSkyProbe`, `setSkyIntensity`.

검증: `check-native-d3d12-scene`에 프로브 반사(6면 캡처 → 필터 → 크롬 큐브)와 하늘 HDRI 장면, 각각 끈 장면을 추가해 8장면 모두 실제 GPU·WARP에서 DX11과 픽셀 최대 차이 0, 디버그 레이어 오류 0. DX11 기준으로 프로브는 2564픽셀, 하늘은 4456픽셀을 바꿔 실제로 반영됨을 확인했어요.

## 3-2b단계 프로브 아틀라스·라이트맵

- `setGlobalProbes`: DX11 `SceneProbeAtlas`와 같은 배치(`layout`을 템플릿으로 공유), 레코드(설정+영역) + `ProbeSpatialIndex` 공간 인덱스 표, SH 버퍼, 같은 테두리 채움 컴퓨트 커널(`probeAtlasPaddingSource`)을 써요. t50/t51/t52.
- 단순화: 바인딩·캡처 리비전·설정이 바뀌면 아틀라스 전체를 다시 만들어요. DX11의 부분 갱신(레코드 범위 업로드, 슬롯 유지)은 프로파일링에서 필요하면 옮겨요.
- `draw`의 `globalProbes` 인자, 베이크 라이트맵(t49, UV1 필수, 반사 혼합 비트)도 DX11과 같은 인자 순서로 받아요. 모션 플래그는 3-3 전까지 0만 허용해요.

검증: `check-native-d3d12-scene` 11장면(기존 8 + 아틀라스, 아틀라스 끔, 라이트맵) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. DX11 기준 아틀라스 2564픽셀, 라이트맵 1892픽셀 변화로 실제 반영 확인.

## 3-3a단계 HDR·블룸·후처리·투과·밉

- `ReflectedLayout`: 셰이더 반사로 루트 시그니처(cbuffer별 루트 CBV, SRV/UAV 표, 정적 샘플러)와 null로 채운 표를 만드는 공용 도구. 이후 화면 효과 이전에도 써요.
- HDR 장면 대상(R16G16B16A16F): 블룸·투과·후처리 중 하나라도 켜지면 DX11 `BloomPass::begin`과 같은 조건·영역·선형 클리어로 만들어요. 그리기는 HDR PSO와 `128` 비트를 써요.
- 블룸·합성: `BloomPass::shaderCode`(Extract/Blur/Meter/VS/PS/PFxaa)와 같은 상수 구조체를 그대로 써요. 단계 체인 5개, 자동 노출 1×1 핑퐁, 깊이 샘플(피사계 심도·차폐), LUT(t7), FXAA 중간 대상.
- 깊이 대상은 R32 typeless + D32 DSV로 바꿔 후처리에서 R32_FLOAT로 읽어요.
- 투과: HDR 불투명 패스와 깊이를 복사하고 밉 체인을 만들어 t44/t45, s14=키16, `4096` 비트.
- 밉 생성: 2×2 선형 다운샘플 컴퓨트. sRGB 텍스처는 typeless 저장 + sRGB SRV로 읽고 UNORM UAV에 sRGB로 다시 인코딩해요. `createTexture(..., mipmaps=true)`가 DX11처럼 기본으로 밉을 만들어요.
- 단순화: 후처리 설정 범위 검사는 DX11 `BloomPass::begin`만 하고, DX12 경로는 유한값만 검사해요.

검증: `check-native-d3d12-scene` 16장면(기본, 블룸, 후처리 전체[그레이드·비네트·색수차·그레인·피사계 심도·차폐·자동 노출 2프레임·LUT·FXAA], 투과, 밉맵 추가) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. DX12 밉 생성도 DX11 `GenerateMips`와 같은 픽셀이에요.
