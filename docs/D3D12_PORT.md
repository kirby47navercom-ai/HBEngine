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
   - **3-3b 화면 효과·Hi-Z·MRT·모션 벡터 (완료)**
   - **3-4a 머테리얼 노드 프로그램·동적 메시·뷰포트 클리어 (완료)**
   - **3-4b 2D 패스·렌더 타겟 텍스처 (완료)**
   - **3-4c 파티클 그리기·시뮬레이션 전체 (완료)**
4. 엔진 연결·성능 비교 후 기본값 전환
   - **4-0 전환 준비 (완료)**: 렌더러 쪽 빈 API 채우기, 지연 해제 안전성
   - **4-0b 파티클 시뮬레이션 이전 (완료)**
   - **4-0c 통계·진단 API (완료)**
   - **4-0d 경로 추적·노이즈 제거·커스틱·HDRI·거리장 AO 대조 (완료)**
   - 4-1 `SceneRenderBridge` 연결(다른 세션의 멀티 카메라 작업 커밋 후)
   - 4-2 실제 게임 FPS·GPU 시간 비교, 기본값 전환

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

## 3-3b단계 화면 효과·Hi-Z·MRT·모션 벡터

- `ScreenEffectsPass`에서 백엔드 공통 부분을 정적 함수로 분리했어요(동작 동일): `validateSettings`(begin 검증), `validateScene`(지오메트리·HDRI·거리장 배치 검증, `DataInfo`), `programVariant/programSource`(Resolve 변형 소스). D3D12는 같은 함수와 같은 바이트코드 캐시(`compileSource`)를 써요.
- Resolve 단계 0~5(경로 추적·가이드·필터·포톤·시간 필터·보조)를 고정 레이아웃(t0~t15, u0, b0, s0)으로 실행하고, 변형별 PSO를 캐시해요. 히스토리·디노이즈 핑퐁, 유효성(`valid/filterValid`) 규칙은 DX11과 같아요.
- Hi-Z: `HierarchicalDepth`의 같은 다운샘플 커널로 레벨을 만들고 아틀라스에 쌓아요.
- MRT: 화면 효과가 표면 정보를 요구하면 `SceneRenderer::surfaceShader` PS로 색·노멀·알베도·모션·앰비언트 5개 대상에 그려요. 없는 대상은 UNKNOWN 슬롯 + null RTV로 PSO를 구분해요. 블렌드는 DX11처럼 RT0 설정을 모든 대상에 적용해요.
- 모션 벡터: 이전 월드 행렬·모션 플래그, `setPose(..., previous=true)`, `setPreviousInstances`, `releaseMotion`.
- 데이터 텍스처: `createDataTexture`(2D 한 층, RGBA8 또는 RGBA32F), `setGeometryScene/setPathEnvironment/setDistanceFieldScene`.

검증: `check-native-d3d12-scene` 23장면(효과 없음, SSR, SSGI+Hi-Z, AO, 지오메트리 GI, TAA 2프레임, 모션 블러[이전 행렬·포즈·인스턴스] 추가) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. DX11 기준 SSR 2072, SSGI 2537, AO 2996, 지오메트리 GI 4724, 모션 블러 819픽셀 변화. TAA는 정지 화면에서 같은 이미지로 수렴해 픽셀 동일성만 확인해요.
DX11 회귀: `check-native-scene-render --post-only`를 수정 전·후 헤더로 각각 빌드해 반복 실행했어요. 통과한 실행(각 3회)의 출력 JSON은 md5까지 같았어요. 같은 바이너리 둘 다 이후 연속 실행에서는 시작 직후 세그폴트로 똑같이 종료돼(수정 전도 동일) 이 변경과 무관한 기존 불안정으로 기록해요. 원인은 미조사예요.
경로 추적·거리장 AO·HDRI 경로 환경의 대조는 아래 4-0d 참고.

## 3-4a단계 머테리얼 노드 프로그램·동적 메시·뷰포트 클리어

- `SceneRenderer::materialProgramBase`를 분리했어요(`materialProgramSource`는 그 결과에 `surfaceShader`를 씌운 것, 동작 동일). D3D12 프로그램은 같은 소스로 그래프 PS(단일 대상), 표면 PS(화면 효과 MRT), `ShadowPS` 셋을 컴파일하고 프로그램마다 PSO를 캐시해요.
- 프로그램 바인딩: 파라미터 t7(float 구조체 버퍼), 맵 t8~t23, 샘플러 키는 맵 순서대로 s0~(DX11과 같음). 장면 루트 시그니처를 t0~t52·s0~s15로 고정하고, 프로그램 리플렉션이 그 범위를 넘으면 생성 시 거부해요. 반사·투과는 샘플러 하나(s14)를 예약해요.
- 단순화: `create*ProgramAsync`는 동기로 컴파일해요. 작업 큐 연결은 필요할 때 해요.
- 동적 메시: `createMesh(..., dynamic=true)`, `updateMeshVertices`는 위치·노멀을 큐 순서 복사로 갱신해요.
- 뷰포트 클리어: DX11처럼 뷰포트 영역에 무조명 사각형을 그려요.

검증: `check-native-d3d12-scene` 27장면(그래프 프로그램+인스턴스, 표면 프로그램+SSR MRT, 프로그램 그림자 캐스터, 동적 메시+뷰포트 클리어 추가) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. 장면이 늘어 검사 프로세스 제한 시간을 20분으로 올렸어요.

## 3-4b단계 2D 패스·렌더 타겟

- `createRenderTarget`(RGBA8 + 선택 D24S8 스텐실), `begin2D/end2D`, `Bindings2D`(b1 설정, t31~t38 맵, s13 마스크 샘플러, s14/s15 = 키 16/17). Scene2D 검증 규칙은 DX11과 같아요.
- 오프스크린 모드 1~6: DX11 `blends2D`(ONE/ONE ADD·MAX, 모드 6은 색 쓰기 끔)와 `stencils2D`(깊이 끔; 스텐실 끔/항상 교체/같지 않음/같음, 참조값 모드 6=0 그 외 1)를 PSO로 옮겼어요. 2D 패스 안에서는 HDR·프로브·하늘·아틀라스·투과·라이트 타일을 끄는 DX11 규칙을 따라요.
- `createDataTexture`가 한 층 배열 텍스처(2D 쿠키)도 만들어요.
- DX11 작업 중 변경에만 있는 `begin3DTarget/end3DTarget/compositeView`(다른 세션 미커밋 작업)는 커밋된 뒤에 옮겨요.

검증: `check-native-d3d12-scene` 35장면(`scene-2d.hpp` 시나리오: 마스크 안/밖, 2D 조명 데이터, 조명 마스크 채널, 블렌드 스타일, 쿠키 배열 + 스텐실/가산 모드 3~6 합성, 2D 패스 안에서 다른 렌더 타겟 샘플) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0.

## 3-4c단계 파티클

- 파티클 데이터가 DX11 컴퓨트 장치(`Particles`)에 있어 D3D12에서 그대로 쓸 수 없어요. D3D12 장치에 같은 레코드(위치+나이, 속도+수명) 버퍼를 두는 `createParticles/stepParticles/clearParticles`를 추가했고, 검증과 `Main/Clear` 커널은 `Particles`와 같아요.
- 그리기는 `ParticleRenderer`와 같은 셰이더·상수: 살아있는 입자 append 압축(UAV 카운터) → 개수를 간접 그리기 인자로 복사 → `ExecuteIndirect`, 정렬 모드면 같은 바이토닉 정렬(단계마다 UAV 배리어). 스프라이트 시트, 2D 마스크, HDR(블룸 대상)·톤매핑 규칙도 같아요. VS와 PS가 모두 t0를 쓰므로 단계별 SRV 표를 따로 둬요.
- 단순화: 압축·정렬을 그리기마다 다시 해요(DX11은 리비전·카메라로 캐시).
- 남은 것: `emit`(빈 슬롯 스캔·생성), `interact`(충돌·이벤트)와 읽기 프레임은 아직 DX11 전용이에요. 4단계 전환 전에 D3D12로 옮겨야 해요.

검증: `check-native-d3d12-scene` 39장면(가산, 거리 정렬 알파+스프라이트 시트, HDR 블룸, 2D 마스크 파티클 추가; 일부 입자는 이미 만료된 상태로 압축 검증) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. 파티클이 기본 장면을 947픽셀 바꿔 실제로 그려짐을 확인했어요.

## 4-0단계 전환 준비

엔진 연결 코드(`native/desktop/SceneRenderBridge.hpp`, `HBNativePlayer.cpp`)와 `SceneRender.hpp`는 다른 세션의 미커밋 작업(멀티 카메라 정리)이 진행 중이라 이번에 건드리지 않았어요. 렌더러 쪽만 준비했어요.

- 프레임 자기 관리: 생성·설정·그리기 함수가 필요하면 프레임을 열고(`record`), `present`가 최종 이미지를 창 백버퍼로 복사·제출·표시해요. 테스트처럼 `Device::begin/end`를 직접 써도 돼요.
- 창 출력: 생성자에 HWND(선택), 플립 스왑체인, `resize`(대상·스왑체인·후처리 재생성), `finish`.
- GPU 시간: 프레임마다 타임스탬프 쌍, 같은 프레임 슬롯을 다시 쓸 때 읽어 `gpuTimeMs()`.
- 텍스처: 명시적 밉 체인 `createTexture(..., mipLevels)`, `updateTextureRegions`(2D RGBA8, 자동 밉 텍스처는 DX11처럼 거부), `updateRayScenes/updateRayScene`(RGBA32F 행 묶음).
- 지연 해제: D3D11은 사용 중인 리소스를 놓아도 안전하지만 D3D12는 아니에요. 그리기·파티클·후처리가 참조한 호출자 소유 리소스(메시 버퍼, 텍스처, 인스턴스·변형 버퍼, 프로브, 데이터 텍스처, 프로그램 파라미터·PSO)는 그 프레임 펜스까지 참조를 잡아요(`Device::keep`). WARP에서 메시를 렌더러보다 먼저 놓았을 때의 종료 문제를 이 방식으로 고쳤어요.
- `releasePostProcess/releaseProbes/releaseParticles`, `draws()/presents()`.

### 연결 전에 남은 차이 (브리지 기준 115개 중)

- 장치 차이: 브리지는 `hb::gpu::Device`와 `hb::gpu::Particles`를 써요. 파티클은 같은 API의 `d3d12::Particles`(아래)로 바꿔 끼우면 되고, 브리지의 다른 DX11 컴퓨트 직접 사용은 없어요(`device->backend()/software()` 표시만).
- 멀티 카메라: HEAD의 `selectCameraView/cameraViewBytes`는 다른 세션이 바꾸는 중이라 그 결과에 맞춰 옮겨요.

검증: `check-native-d3d12-scene` 41장면(명시적 밉+영역 패치, 레이 씬 행 갱신→지오메트리 GI 추가) 실제 GPU·WARP 모두 DX11 대비 픽셀 최대 차이 0, 디버그 레이어 오류 0. 숨긴 창에서 렌더러 자기 관리 프레임 6회 표시(3번째 뒤 80×60로 크기 변경), GPU 시간 측정값 확인.

## 4-0b단계 파티클 시뮬레이션 이전

- `native/include/HBEngine/D3D12Particles.hpp`의 `d3d12::Particles`: `hb::gpu::Particles`와 같은 공개 API(`Preparation/prepare`, 생성자 4종, `step`, `interact`, `resetEvents`, `pollEvents`, `eventCapacity`, `droppedEventFrames`, `emit`, `clear`, `reset`, `read`, `enqueueReadback/pollReadback/pendingReadbacks`, `count`, `revision`, `identityId`, `storageBytes`, `emissionBufferAllocations`).
- 같은 레코드 검증과 커널(`source` Main/Clear, `freeSource`, `emitSource`, `particleInteractionSource` 이벤트 0/1)을 하나의 루트(b0, t0~t2, u0~u1)로 실행해요. 빈 슬롯 스캔은 UAV 카운터 append, 개수는 `Buffer<uint>` 타입 버퍼로 복사해요.
- 읽기 링 3칸: 기록 중 프레임의 티켓(`Device::ticket`)을 저장하고 그 프레임 펜스가 지나면(`ticketDone`) 맵해요. 링이 차면 DX11처럼 거부하고 이벤트는 `droppedEventFrames`를 늘려요.
- 단순화: `Preparation`은 동기 컴파일(공유 바이트코드 캐시), 커널 PSO를 같은 장치의 풀들이 공유해요.
- 장면 렌더러는 `drawParticles(const d3d12::Particles&)`로 같은 버퍼를 그려요.

검증: `node tools/check-native-d3d12-particles.mjs` — 같은 명령 순서(진행, 40개 방출, 평면 반사+충돌 이벤트, 소멸+사망 이벤트, 읽기 링 3칸 채움·4번째 거부, 클리어, 리셋)를 DX11과 D3D12에서 실행해 살아있는 레코드와 이벤트를 정렬 비교했어요(빈 슬롯·이벤트 순서는 GPU 순서라 비교하지 않음). 실제 GPU·WARP 모두 상태 최대 차이 0, 충돌·사망 이벤트 각 210개 일치, 방출 뒤 살아있는 입자 정확히 +40, 디버그 레이어 오류 0.

## 4-0c단계 통계·진단 API

- 브리지가 부르는 렌더러 함수 115개 중 113개가 D3D12 렌더러에 같은 이름·형식으로 있어요. 남은 2개(`selectCameraView`, `cameraViewBytes`)는 다른 세션의 멀티 카메라 작업이 끝나면 옮겨요.
- 카운터: 업로드, 메시·텍스처 영역·레이 씬 갱신(횟수·바이트), 2D 패스·그리기, 그림자 패스·그리기, 투과 할당·복사, 블룸 할당·디스패치·합성, 라이트 타일 디스패치, 프로브 캡처·디스패치, 아틀라스 복사·업로드·패딩·메타데이터, 파티클 정렬 패스·인덱스 할당·개수 읽기, 캡처, GPU 타이밍 프레임. `draws/shadowDraws`는 DX11처럼 `begin`마다 0부터 세요.
- 바이트: 블룸·화면 효과 이미지, 그림자, 투과 밉, 라이트 타일, 하늘·아틀라스·공유 프로브, 파티클 인덱스.
- 준비 정보(`*PreparationInfo`, `poll*Preparation`): D3D12는 동기 컴파일이라 항상 준비됨으로 DX11 구조체 그대로 보고해요. `shaderCompilationInfo`는 공유 화면 효과 컴파일 캐시, `shaderDiskCacheInfo`는 공유 디스크 캐시 값이에요.
- 다른 점: 아틀라스는 부분 갱신 대신 재생성이라 `probeAtlasMetadataFastUpdates`는 0, `constantBufferStats`는 캐시 생략 없이 그리기마다 올린 횟수예요. `particleCount`는 레코드를 읽어 CPU에서 세요(DX11도 동기 읽기).
- `width()/height()`가 DX11과 같은 이름이에요(내부 멤버 이름을 바꿨어요).

검증: `check-native-d3d12-scene`이 커밋된 브리지에서 `renderer->` 호출 이름을 뽑아 D3D12 헤더에 모두 있는지 확인해요(보류 2개 외 누락 0). 같은 장면 스크립트 뒤 두 렌더러의 2D·그림자·갱신·프로브 캡처·투과·아틀라스·블룸 단계·캡처 통계가 같아야 통과해요.

## 4-0d단계 경로 추적·거리장 AO 대조

- `node tools/check-native-d3d12-path.mjs`: 기존 DX11 테스트가 쓰는 JS 패킷(`rendering118Packets`, `rendering120Packets`: area, HDRI 환경, mixed, direct, lens, 120은 커스틱 타깃 포함)을 같은 설정으로 두 렌더러에 그려 원본 누적(8샘플), 공간 노이즈 제거, 시간 필터, 커스틱 포톤(16샘플)을 비교해요. 거리장 AO는 엔진 JS `MeshDistanceFieldScene`이 만든 아틀라스(브라우저 워커 대신 같은 프로세스에서 굽기)로 켬/끔 장면을 그려요.
- 기준: DX11 렌더러를 D3D11On12(같은 D3D12 드라이버 셰이더 컴파일러)로 실행한 결과와 정확히 같아야 해요. 순수 D3D11과는 노이즈 제거(à-trous) 장면의 한 하이라이트 주변만 다른데(드라이버의 D3D11/D3D12 컴파일러 부동소수점 차이를 필터가 증폭), D3D11On12로 같은 DX11 코드를 돌리면 D3D12 포트와 0 차이라 포트 문제가 아님을 확인했고 이 값은 보고만 해요.
- 포트 수정: DX11 `ScreenEffectsPass::begin`처럼 단계별 셰이더 변형이 바뀌면 히스토리·필터 유효성을 무효로 해요.
- 결과(실제 GPU): 38개 이미지 D3D11On12 대비 최대 차이 0, 디버그 레이어 오류 0, 거리장 AO 켬/끔 965픽셀 차이. 순수 D3D11 대비 48채널(최대 45). WARP는 경로 추적 셰이더 JIT가 1시간을 넘겨 `--warp`로만 실행해요.

## 4-1단계 엔진 연결

- 다른 세션의 미커밋 작업은 엔진 공용 기능(UI 글자 테두리·이미지 다각형 자르기, 변환 하한 검사)만 골라 커밋했고 나머지는 `git stash`에 보관했어요. 그 위에서 연결했어요.
- `SceneRenderBridge`: 기존 본문을 `SceneRenderBridgeCore<Backend>` 템플릿으로 바꾸고, DX11(`SceneRenderer`+`hb::gpu::Particles`)과 D3D12(`SceneMeshRenderer`+`d3d12::Particles`)를 같은 JSON 프로토콜로 돌려요. 바깥 `SceneRenderBridge`가 `init`의 `backend`로 골라요: `d3d12`=직접 D3D12, `d3d12-11on12`/`auto`=기존 11On12 경로, `d3d11`. D3D12는 비동기 셰이더 준비를 끄고(동기 컴파일) `nativeCommandLists:true`를 보고해요.
- 다중 카메라: `selectCameraView/cameraViewBytes`를 DX11 계약 그대로 옮겼어요. 카메라마다 시간 후처리 상태(자동 노출, TAA·노이즈 제거 히스토리, 변형 키)를 따로 두고 바꿔 끼우며, 각 뷰의 영역을 합성 텍스처에 복사해 마지막 뷰에서 표시해요. 중간 뷰는 제출만 하고 표시하지 않아요.
- 데이터 텍스처: `createDataTexture`가 DX11과 같은 인자(배열·큐브·볼륨, RG/RGBA 16F/32F, 명시 RGBA8 밉)를 받아요. ponytail: 자동 밉 생성은 2D RGBA8만(다른 형식은 오류).
- 브리지가 쓰는 객체 크기 함수(`Mesh::bufferBytes/cpuBytes`, `Texture/Probe::storageBytes`, `Instances/Deformation::bytes`)와 `Program::preparationInfo`, `setAsyncShaderPreparation` 추가.
- 수명 수정: 업로드 복사 대상(버퍼·텍스처·영역 갱신)도 그 프레임 펜스까지 붙잡아요. 업로드 직후 텍스처를 놓으면 GPU가 해제된 리소스에 복사해 장치가 멈췄어요(887A0006).
- 첫 실행: D3D12 렌더러 초기화는 셰이더 캐시가 비면 약 31초, 캐시가 있으면 0.2~0.3초예요. `--prepare-shaders`가 D3D12 파이프라인도 미리 컴파일해 게임 패키지 `Shaders`에 넣고, JS `init` 응답 제한을 120초로 늘렸어요.

검증:
- `check-native-d3d12-scene`: 브리지 115개 함수 누락 0(보류 없음), 41장면 + 데이터 텍스처 6형태 저장 크기 DX11과 동일, 실제 GPU·WARP 픽셀 최대 차이 0, 디버그 레이어 오류 0.
- `check-native-d3d12-particles`, `check-native-d3d12-path`(실제 GPU, D3D11On12 대비 38장 0 차이) 재통과.
- `HB_TEST_GRAPHICS_API=d3d12 node tools/check-native-game.mjs`: 숨긴 실제 게임 빌드가 `win32-d3d12-v8`로 40프레임, 입력·UI·오디오·종료 단계 통과. 단, 같은 검사의 `EndPlay` UI 해제 두 줄은 DX11에서도 똑같이 실패하는 기존 문제라 그 두 줄을 뺀 임시 사본으로 확인했어요.
- `HB_CAMERA_GRAPHICS_API=d3d12 node tools/check-camera-views-native.mjs <엔진> <작업>`: 분할·PiP·혼합 투영·레터박스·5카메라·홀수 크기 변경·시간 효과 4프레임·해제를 DX11과 같이 통과. 합성 메모리는 D3D12 585,396바이트(카메라별 시간 상태만), DX11 1,105,748바이트(카메라별 BloomPass 전체).
- 하지 않은 것: 실제 게임 FPS 비교와 기본값 전환(4-2), 보이는 창 GUI 확인, 설치본 갱신.

## 4-2단계 실제 게임 성능 비교

`node tools/check-native-backend-fps.mjs [프레임] [라운드] [light|heavy]`: 엔진으로 만든 릴리스 3D 게임 하나(그림자 받는 기본 도형 400개, 점 조명 8개·스포트 2개, 후처리 볼륨, 반사 프로브, 파티클 2개)를 숨긴 창·프레임 제한 해제로 `d3d11`, `d3d12-11on12`, `d3d12`에서 번갈아 실행해요. 앞 1/4 프레임은 빼고 계산해요. 모든 백엔드의 그리기 수가 같아야 통과해요.

이 PC 실측(600프레임 × 2라운드, 라운드마다 순서 반대):

| 설정 | 백엔드 | 프레임 시간 기준 FPS | 러너 전체 기준 FPS | 중앙값 ms | p99 ms | 마지막 프레임 GPU ms |
|---|---|---|---|---|---|---|
| light 1280×720, 블룸 | D3D11 | 175.3 | 210.3 | 5.67 | 8.39 | — |
| | D3D12-11on12 | 171.2 | 210.1 | 6.06 | 8.56 | — |
| | D3D12 | 170.7 | 208.1 | 5.88 | 8.52 | — |
| heavy 1920×1080, SSR·SSGI·AO·TAA·모션 블러·자동 노출 | D3D11 | 161.8 | 194.5 | 6.36 | 9.18 | 2.69 |
| | D3D12-11on12 | 157.1 | 190.9 | 6.50 | 13.89 | 2.58 |
| | D3D12 | 161.1 | 194.1 | 6.37 | 9.02 | 2.37 |

- 해석: 세 백엔드 차이가 라운드 간 흔들림(약 ±5%) 안이에요. 이 장면은 JS 시뮬레이션·전송(프레임당 약 5.7~6.4ms)이 병목이고 GPU는 약 2.4~2.7ms라, 백엔드를 바꿔도 FPS가 거의 같아요. GPU 시간은 마지막 프레임 한 번 값이라 참고용이에요.
- 비교 중 고친 D3D12 문제: 프레임 밖에서 파티클·프로브 준비가 GPU 작업을 기록해 실패(공개 진입점이 프레임을 자동으로 열게 함), 메시 400개에서 프레임당 셰이더 디스크립터 16,384개 초과(엔진 장치는 프레임당 262,144개, 3프레임 합계가 100만 한도 안; ponytail: 그리기 약 4,900개/프레임 상한), 파티클 그리기를 그리기 수에 안 세던 차이.
- 하지 않은 것: 다른 PC·저사양 GPU, 보이는 창, 주인님 게임 원본, 기본값 전환.

### auto를 직접 D3D12 우선으로

- `nativeGraphicsAPI:auto`(또는 `--graphics-api auto`)는 하드웨어 어댑터에서 직접 D3D12 렌더러를 먼저 만들고, 장치·렌더러 생성이 실패하면 그 이유를 `fallback`으로 보고하며 D3D11(HW, 다음 WARP)로 이어가요. D3D12는 WARP로 내려가지 않아요(느린 소프트웨어 D3D12보다 D3D11이 나아서).
- 검증: `HB_TEST_GRAPHICS_API=auto node tools/check-native-game.mjs`(EndPlay UI 두 줄 제외 사본) 숨긴 실제 게임이 `win32-d3d12-v8`, `requestedBackend:auto`, 대체 없음으로 40프레임·입력·UI·오디오·종료 통과. D3D12가 없는 PC의 대체 경로는 이 PC에서 실행해 보지 못했어요.

### 기본값을 auto로

- 빌드 프로필에 `nativeGraphicsAPI`가 없으면 `auto`예요(`defaultNativeGraphicsAPI`). 편집기 선택 목록 맨 위가 "자동 · DirectX 12 우선 (기본)"이에요. 이미 `d3d11`을 저장한 프로필은 바꾸지 않아요.
- 빌드 보고서 렌더러 이름은 선택한 API를 따라요(`nativeRendererLabels`: auto는 `Win32/DirectX 12 (DirectX 11 대체)`).
- 검증: `check-build-profiles`, `check-native-upload-batches` 통과. 기본 프로필 그대로 만든 숨긴 실제 게임(`check-native-game`, EndPlay UI 두 줄 제외 사본)이 `win32-d3d12-v8`, `requestedBackend:auto`, 대체 없음으로 통과.
- `check-native-platform`은 이 변경 전부터 두 곳에서 실패해요(목록 위젯이 이미 네이티브 지원인데 거부를 기대, 모의 패키지에 `readBytes` 없음). 렌더러 이름 기대값만 바꿨어요.

### 편집기·WebView 실행기도 auto로

- `prototype/game-renderer.js`의 `d3d11` 장면 백엔드(WebView2 UI + 네이티브 장면, 편집기 플레이와 WebView 실행기)가 브리지에 `auto`를 요청해요. 같은 `SceneRenderBridge`라 하드웨어 직접 D3D12 우선, 실패하면 D3D11이에요. 장면 설정 값 이름 `d3d11`은 저장 데이터 호환 때문에 그대로예요. 빌드 보고서 이름은 `DirectX 12 (DirectX 11 대체) + WebView2 UI`예요.
- 편집기 호스트는 사용자 셰이더 캐시를 쓰므로 첫 D3D12 초기화만 캐시가 비어 있으면 약 30초 걸리고 이후 0.2초 안팎이에요.
- 렌더러 `backend`를 `D3D11`로 기대하던 창·플레이어 검사 120개 파일을 `D3D12`로 바꿨어요(이 PC 기준 auto 결과).
- 검증 한계: `dist` 편집기·WebView 실행기 EXE는 다시 빌드했지만, 대표 창 검사 `check-native-scene-window`는 WebView 디버그 페이지가 45초 안에 안 열려 시간 초과로 끝났어요. 변경 전 JS로 돌려도 똑같이 실패해서 이번 변경과 무관한 검사 환경 문제로 보지만, WebView 경로의 D3D12 화면은 아직 직접 확인하지 못했어요. 바꾼 120개 검사도 실행하지 않았어요.

## 성능: JS 장면 인코딩 비용 (2026-11-13)

- 측정 도구: `HB_FPS_CPU_PROFILE=1 HB_FPS_BACKENDS=d3d12 node tools/check-native-backend-fps.mjs` — 게임 스크립트 런타임에 V8 CPU 프로파일(100프레임 이후)을 `<작업>/cpu-*.cpuprofile`로 남겨요(`HB_CPU_PROFILE`, `tools/native-game-runner.mjs`).
- 프로파일 결과(D3D12, 메시 400개): 프레임 CPU의 약 44%가 JS 장면 인코딩(`native-scene-renderer.js` encode), 그중 그리기 변경 비교(`native-draw-history.js` same/stamp) 약 14%, 형상 서명(`geometryStreamStamp`) 약 3~4%, 물리 동기화 약 16%였어요. 호스트 D3D12 렌더 명령은 1.5ms였어요.
- 수정: 변경되지 않은 형상(같은 index·attribute 객체와 버전)은 JSON 서명을 만들지 않고 건너뛰어요. 그리기 비교는 저장한 값의 키 목록을 한 번만 만들고 숫자 배열은 재귀 없이 비교해요.
- 검증: `check-native-draw-history`(변경 전/후 렌더러가 61프레임 동안 같은 패킷), `check-native-geometry-stream-240`, `check-native-frame-307`, `check-native-material-packing`, `check-native-deformation`, `check-native-particles` 통과. 변경 전 작업 트리와 번갈아 3회씩: 중앙값 84.2→129.7 FPS(프레임 작업 11.44→7.76ms). PC가 다른 게임 실행 중(CPU 40~80%)이라 1회차는 반대로 나올 만큼 흔들림이 커요.
- 남은 큰 비용: 그리기 비교(`same`)는 여전히 약 11%, 매 프레임 `updateMatrixWorld`, 물리 `sync`의 런타임 데이터 깊은 비교. `check-native-2d`는 변경 전에도 "bounded upload packets" 단계에서 실패해요.
- 2차: 데워진 그리기 기록과 정적 물리 충돌체 스냅샷을 모양별 생성형 비교기(`runtimeDataMatcher`)로 비교해요. ABBA 4회 평균 153.8→162.9 FPS.
- 3차: 정적 충돌체 변경 확인을 매 프레임 JSON 대신 값 목록 비교로, 접촉 쌍 키의 JSON 생성을 4회→2회로 줄였어요. 2D 마스크·2D 조명이 없는 머테리얼은 2D 설정 배열(약 10개)을 만들지 않아요. ABBA 4회 평균 183.0→191.8 FPS(중앙 프레임 5.24→5.02ms), 2회차는 반대로 나와 잡음 범위 안의 개선이에요.
- 3차 프로파일에서 확인한 것: 데워진 그리기 비교는 항상 생성형 비교기로 끝나고(범용 비교로 넘어가는 경우 0), 매 프레임 다시 JSON을 만드는 그리기 약 30개는 실제로 world/normal 행렬이 바뀌는 물체예요. `scene.updateMatrixWorld`가 한 프레임에 세 번(2D 준비 시작, `TwoDRendering.prepare`, 인코딩) 불려 약 7%예요. 사이에 바퀴·천·로프·LOD 갱신이 위치를 바꿀 수 있어 그대로 두었어요.
- 4차: 파티클은 2D 정렬에 들어가려고 항상 `draw2d`를 달아서, 3D 장면도 `TwoDRendering.prepare`의 장면 전체 `updateMatrixWorld`를 매 프레임 한 번 더 했어요. 2D 조명이 없으면 정렬에 쓰는 노드와 그 부모만 한 번씩 갱신해요(`updateWorldMatrix(false,false)`, 결과 행렬은 전체 갱신과 같아요). 2D 조명이 있으면 조명·그림자가 임의 그룹 행렬을 읽으므로 전체 갱신을 그대로 해요. 2D 준비 뒤 인코딩 전까지 행렬을 읽는 곳은 후처리 볼륨 위치뿐인데, 그 사이 갱신(바퀴·천·로프·LOD·본·파티클)은 후처리 볼륨을 옮기지 않아요. 검사: `check-two-d-sort-matrices`(부모 이동 120프레임, 전체 갱신을 먼저 한 장면과 정렬 순서·행렬 동일, 갱신을 끄면 실패). ABBA 4회 평균 193.1→212.0 FPS(중앙 프레임 4.90→4.45ms), 4회 중 3회 개선.
- 5차(유지형 그리기): 프로그램·변형·인스턴스·모션 벡터·하늘·2D 마스크/조명이 없는 일반 메시는 그리기 ID마다 기록 하나를 계속 쓰고, 값이 다를 때만 덮어쓰며 바뀜 여부를 그 자리에서 판단해요. 변하지 않은 그리기는 새 배열·객체를 만들지 않고 별도 비교도 하지 않아요. 바뀐 그리기만 `structuredClone`으로 전송 사본을 만들어요. 머테리얼은 `nativeMaterialInto`(기존 `nativeMaterial`도 같은 구현을 써요), 프로브 바인딩은 깊은 쓰기에서 모양이 바뀌면 사본을 저장해요. 자원 호출 순서(형상→라이트맵→맵 6개→프로브)는 그대로예요. 그 밖의 그리기는 기존 전체 생성·비교를 써요. 검사: `check-native-draw-history`(61프레임 전체 패킷 동일), `check-native-world-matrix-reuse . <기준> [--lit]`(반사 프로브 포함 12프레임 패킷 동일, 마지막 호출 횟수 비교는 옛 기준용이라 실패), `check-native-material-packing`, `check-native-geometry-stream-240`, `check-native-deformation`, `check-native-frame-307`, `check-native-particles`, `check-rendering-110`, `check-probe-*` 통과. `check-native-scene-render`(C++ 픽셀 검사)는 변경 전에도 실패해요. ABBA 4회 모두 개선: 평균 211.4→229.4 FPS, 중앙 프레임 4.47→4.21ms, p99 8.4~11.5→6.6~7.0ms.
- 6차: 바뀐 그리기의 전송 사본을 `structuredClone`(프로파일 4.9%) 대신 일반 데이터 복사로 만들어요(1.7%). 그리기 ID 문자열(`uuid:번호`)을 노드별로 재사용해 Map 조회 때마다 새 문자열 해시를 만들지 않아요. 그리기 순서 변경은 JSON 문자열 대신 이전 ID 배열과 원소 비교로 판단해요. 인코딩만 재는 400메시 벤치에서 1.165→1.01ms/프레임. 검사: `check-native-draw-history`, `check-native-world-matrix-reuse` 일반/`--lit` 패킷 동일, `check-native-material-packing`, `check-native-frame-307`, `check-native-particles`, `check-rendering-110`, `check-probe-instances-1050`, `check-native-deformation` 통과. ABBA 4회 모두 개선: 평균 238.3→256.2 FPS, 중앙 프레임 4.06→3.75ms.
- 7차(반사 프로브): 프로브가 있는 장면은 메시마다 매 프레임 월드 경계 상자(8꼭짓점 변환)와 프로브 바인딩을 새로 만들었어요. 일반 메시의 경계 상자는 같은 로컬 경계 기록과 비트까지 같은 월드 행렬이면 이전 결과를 그대로 써요(`reflection-probe-bounds.js`). 렌더러는 프로브 목록의 JSON 값이 바뀔 때만 프로브 세대를 올리고, 유지형 그리기는 세대·위치·경계 상자가 같으면 이전 바인딩을 그대로 둬요(전송은 JSON이라 같은 JSON이면 같은 패킷). `check-native-draw-history`에 프로브 강도·위치·크기 변경을 넣었고, 바인딩을 갱신하지 않게 고친 변이는 25프레임에서 잡혀요. 인코딩 벤치(프로브 1개): 2.03→1.31ms/프레임, 프로브 없음은 그대로. ABBA 4회 모두 개선: 평균 257.4→280.7 FPS, 중앙 프레임 3.74→3.39ms. `check-probe-selection-1010`은 변경 전에도 실패해요.
- 물리: 남은 물리 동기화는 약 3%이고 대부분 정적 충돌체 컴포넌트 비교(`matchStatic`, 이미 생성형 비교기)예요. 컴포넌트를 C++·스크립트가 제자리에서 고칠 수 있어 변경 알림 없이는 더 줄이지 않았어요. 프로파일의 `physics`(engine-services) 1.8%는 물리가 아니라 네트워크·능력·UI·파티클 등 매 프레임 게임 서비스 순회예요.
- 안 넣은 시도: 노드별로 이전 로컬·부모·월드 행렬을 기억해 같으면 곱셈을 건너뛰는 `updateMatrixWorld` 캐시는 three와 비트까지 같았지만 값 32개 비교가 행렬 곱셈보다 비싸 정적 2000노드에서 1.6~2배 느렸어요.
- 되돌린 시도: 반사 프로브 경계 상자 변환을 중심·반경식으로 바꾸면 약 1.4% 줄지만, 8꼭짓점 `applyMatrix4`와 마지막 자리 비트가 달라 `check-probe-instances-1050`의 정확 일치 조건을 깨서 넣지 않았어요. `check-probe-selection-1010`은 변경 전에도 실패해요.
