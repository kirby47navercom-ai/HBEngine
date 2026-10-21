# 공용 렌더링 수식 편집

사람과 AI는 같은 씬·머테리얼 그래프·C++/블루프린트 명령을 사용해요. `/api/schema`의 `raySurfaceHistory`에서 이전 입력·노멀·밉·로브 선택·자원 비용을 먼저 읽고, `/api/engine/status`의 항목별 `remaining`을 확인해요. 기능 제목을 엔진 전체 완료로 해석하지 않아요.

렌더링 수식은 GLSL/HLSL과 TSL 경로를 함께 수정해요. 삼각형 좌표는 `ray-coordinate-basis.js`와 `ray-coordinate-basis-gpu.js`, 렌즈 픽셀 투영은 `path-pixel-footprint.js`와 GPU 모듈, 광선 폭은 `path-ray-cone.js`와 GPU 모듈을 사용해요. 현재·이전 입력은 서로 다른 시각/기하를 유지하며 새 값을 이전 값으로 덮지 않아요. 생성 네이티브 헤더를 손으로 편집하지 않고 `tools/generate-screen-effects.mjs`로 생성해요.

TSL의 조건문에서 부수효과만 필요한 콜백은 `()=>{ result.assign(value); }`처럼 중괄호를 써요. `()=>result.assign(value)`는 자동 return을 만들어 함수 반환형과 다른 형식을 반환할 수 있어요. 명시 layout의 공용 함수는 `gpuFn`으로 만들어 builder마다 바인딩을 분리해요. 같은 함수 결과를 여러 성분에서 쓰면 함수 내부의 `.toVar()`로 불필요한 중복 호출을 피하되 전역에 프레임 변수나 uniform을 붙잡지 않아요.

기대값은 가능하면 별도 해석 기하/지정 가중치로 계산해요. 백엔드끼리 같은 값만으로 통과시키지 않아요. 현재·이전·반전·전단·작은/큰 배율·퇴화 거부를 필요한 범위에서 검사하고, 정상·실패·수정 후 결과를 구분해요. 원래 오차 기준을 바꾸지 않고, 검사 출력 계측은 실제로 컴파일되는 특화/일반 분기를 모두 다뤄요.

변경된 수식에 맞는 실제 GPU 검사와 제작·실행 검사를 묶어서 수행해요. 사용자 프로필과 게임 원본을 fixture로 사용하지 않고 기존 소유 검사 장면과 격리 프로필을 써요. GPU 자원·운영 readback·컴파일·캐시 비용을 기록하고 재생성할 수 있는 검사 런타임은 정리해요. 설치본은 검증 후 전환하고 이전 Versions를 쌓지 않아요.

공간 차분의 상수 여부와 프레임 시간 의존성은 달라요. `rayVaryingCoordinateInstructions`는 레지스터의 작성 순서를 따라 UV·월드 위치·노멀에서 오는 차분만 남겨요. Time의 현재·이전 값 평가를 지우지 않아요. 새 문맥 입력을 추가하면 JS의 분류와 `generate-ray-programs.mjs`의 C++ 생성기를 함께 갱신해요. 상수 덮어쓰기 뒤에는 오래된 차분 레지스터를 읽지 않아요.

일반 큐브 픽셀은 바이트 입력끼리는 Uint8, Float32끼리는 Float32를 이어 붙이고 나머지는 Float64로 수치를 보존해요. raw-half 저장값을 디코딩 지원으로 해석하지 않아요. 자동 광선 밉의 필터 전환은 같은 버전의 변환된 기본 레벨을 공유하되 반환한 레벨 목록의 길이를 나중에 바꾸지 않아요.

명시적 RGBA8 밉의 부분 변경은 `texture-region-updates.js`를 사용해요. 런타임에서는 사람·AI 모두 `Materials::SetTextureRegion`에서 생성한 같은 노드를 써요. 직접 JS로 쓰면 GL에서는 `prepareGPUAuthoredMips(renderer,map)`도 호출해요. 저장 원본, 다른 밉, 배열 면과 이전 광선 float 스냅샷을 덮지 않아요. 마지막 한 배치만 보관하며 누락된 버전이나 재생성된 GPU 자원은 전체 업로드로 복구해요. 세 API의 부분/전체 업로드, 명시적 해제 후 같은 버전 재생성을 대조해요. 실제 컨텍스트 손실 복구는 별도 검증 대상이에요.

### 선택적 노멀 필터 폭 (736–745)

`PostProcessVolume.pathTracingNormalFootprint`: `off`(기본)/`geometry`/`material`. 현재·이전 기하/시각/뷰/밉 폭을 각각 평가하며 기본·코팅 반사/굴절 cone에 로컬 각도 외피를 더해요. 끄기는 추가 노멀 평가를 생성하지 않아요. GPU 타깃·uniform·읽기 추가 없이 기존 `pathQuality.w` 비트21–22를 써요. 자세한 비용·실행 근거·전역 해법의 남은 범위는 [NORMAL_FOOTPRINT_746](research/NORMAL_FOOTPRINT_746.md)에 있어요.

### CPU 변환 캐시와 GPU 상주량 구분 (749–752)

`ray-mip-cache.js`의256MiB 기본 풀은 변환 Float32 밉 재사용만 제한해요. 활성 현재/이전 스냅샷·source·GPU/ray atlas 메모리는 별도예요. `profiler.rayMipCache`와 프로파일러 UI가 같은 예산/비우기를 사용해요. 0/퇴역 뒤에도 네 자료형·네 모드의 현재/이전 atlas 바이트가 같고 실제 네이티브 실행도 검증했어요. [GPU 상주 전환의 다음 조건](research/RAY_MIP_CACHE_752.md).

### WebGL 곡면 가이드 준비 특화 (1282–1290)

`path-guide-specialization.js`는 `pathTracingCurvedFilter`가 꺼진 고정 패스에서만 `curved=false`를 생성해요. 기본 인자는 `true`여서 기존 호출의 소스는 그대로예요. 공용 추적·노멀·이전 프레임 수식과 네이티브 생성 헤더를 바꾸지 않아요. 필터 전환은 `screen-effects-gl.js`의 준비 키에 포함하고, 이전 준비 대기를 취소해요. 곡면 설정만 바뀌면 보조 머테리얼만 교체하고 노멀 가이드와 타깃은 재사용하며 시간 이력은 무효화해요. 새 GPU 타깃·상주 캐시·작업자는 없어요.

`gpuPathPreparationInfo()`의 선택 필드 `guideCurved`·`guideLens`는 실제 준비 상태이며 `false`도 출력해요. 다른 백엔드에서 필드가 없으면 꺼짐으로 추측하지 않아요. 실제 보조 가이드 타깃은 `denoiser.images[3]`이고 `[2]`는 공간 필터 핑퐁이에요.

실제 WebGL2 게임에서 기존 비특화 가이드와 전체 320×240 raw-half 성분 307200개가 정확히 같았어요. 켜기·모프 변형·다시 끄기와 자원 해제를 확인했어요. 한 쌍의 관측에서 보조 가이드 준비는 6276.9→1859.1ms, 제품 연결 후 1827.4ms였어요. 두 번째 실행의 주 경로는 캐시 적중이므로 전체 초기 준비/FPS 개선 수치로 쓰지 않아요. 주 경로는 제품 검사에서도 7169.2ms가 남았어요. 자세한 재현·실패 범위는 [GUIDE_PROFILE_1290](research/GUIDE_PROFILE_1290.md)에 있어요.
