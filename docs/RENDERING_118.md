# 118 — 면 광원·HDRI 코스틱과 시간·렌즈 필터

발광 머테리얼과 HDRI를 기존 GPU 광자 패스에 연결한다. 분석 광원, 발광 삼각형, HDRI를 함께 선택하며 광원 선택 확률·발광 면적·기하 코사인·거리 제곱·HDRI 입체각 PDF로 가중한다. 발광 텍스처와 알파 컷오프도 기존 광선 머테리얼 평가를 사용한다. HDRI 회전·밝기와 중첩 매질·흡수·Fresnel은 기존 경로를 공유한다.

코스틱이 켜진 경우 광원→매끄러운 경계→확산 표면 경로는 광자 추정기가 담당한다. 같은 경로의 카메라 발광/HDRI 기여와 직선 투과 근사 그림자를 제외한다. 직접 보이는 발광체·HDRI, 일반 직접광, 코스틱이 꺼진 경로는 유지한다. 광자 캐시는 계속 1024경로·32KiB이고, 픽셀마다 광자 경로를 새로 추적하지 않는다.

시간 필터는 공간 필터 결과와 전 프레임의 결과·가이드를 사용한다. 표면 종류·깊이·법선이 일치하는 픽셀만 이력을 섞고, 주변 3×3 색 범위로 이전 색을 제한한다. 원본 Monte Carlo 이력에 필터 결과를 쓰지 않는다. 카메라·렌즈·기하·머테리얼·광원·환경 변경, 크기 변경과 실패는 필터 이력을 초기화한다. 필터만 바뀔 때 원본 누적은 보존한다. TAA의 0.25초 이상 시간 간격 초기화와 경로 추적의 transport 초기화는 분리한다. 정적인 장면은 긴 프레임·정지·캡처 간격으로 샘플을 잃지 않고, 시간 되감기·문서/카메라 교체·수동 이력 버전 변경·실패는 계속 초기화한다.

렌즈 필터는 중심 광선의 깊이와 실제 조리개·초점 거리에서 혼란원 반경을 계산한다. 반경은 필터 간격·밝기 가중치에 적용하고, 깊이·법선·혼란원 경계를 보호한다. 최대 반경 32픽셀, 공간 필터 1–4단계, 기존 5×5 커널을 유지한다. 초점을 움직이면 이전 렌즈 결과를 재사용하지 않는다.

후처리 컴포넌트의 **시간 필터 혼합**(`pathTracingDenoiseTemporal`, 0–0.95, 기본 0)과 **렌즈 필터 세기**(`pathTracingDenoiseLens`, 0–1, 기본 1)를 C++ Components 함수·블루프린트·AI 스키마와 연결한다. 기존 프로젝트에는 기본값을 적용한다. 꺼진 시간 필터는 추가 이력 텍스처를 만들지 않는다. 켜지면 뷰포트 픽셀당 24바이트의 이력이 추가되고, 끄거나 뷰포트를 폐기하면 해제한다. 렌즈 필터 세기 0은 렌즈 영상의 필터를 생략한다.

AI 편집은 `engineSchema()`의 `components.PostProcessVolume.properties`에서 이름·기본값·허용 범위를 읽고, `document.get`의 revision을 넣은 `document.patch`를 사용한다. 대상 오브젝트의 ID를 JSON Patch `test`로 확인한 다음 컴포넌트 `properties/pathTracingDenoiseTemporal`·`pathTracingDenoiseLens`를 바꾼다. 여러 에셋·C++ 변경은 기존 `files.apply`의 dryRun/expectedRevision과 undo/redo를 사용한다. 같은 값은 사람용 상세 속성과 C++ `hb::Components::SetFloat`에서도 편집된다. AI 전용 숨은 설정이나 서로 다른 스키마를 추가하지 않는다.

검증: `tools/check-rendering-118.mjs`에서 AI patch의 revision·대상 ID·범위·실패 시 원본 보존을 확인한다. native 118 독립 구역, 실제 DirectX·WebGL·WebGPU 플레이어의 면 광원/HDRI/혼합/일반 직접광/렌즈 장면을 기존 회귀 검사에 묶었다. 실행 결과와 설치 파일 대조는 [구현 기록](research/RENDERING_118.json), [설치 기록](research/USER_INSTALL_118.json)에 남긴다. 아직 실행하지 않은 gate를 통과로 계산하지 않는다.

참고한 범위는 PBRT [면 광원](https://pbr-book.org/4ed/Light_Sources/Area_Lights)의 면적·방향·알파/발광 평가, [무한 면 광원](https://www.pbr-book.org/3ed-2018/Light_Sources/Infinite_Area_Lights)의 HDRI 분포·입체각, [카메라](https://www.pbr-book.org/3ed-2018/Camera_Models/Projective_Camera_Models)의 얇은 렌즈·혼란원, [NRD](https://github.com/NVIDIA-RTX/NRD)의 이력 confidence와 가이드 필요성이다. 자체 필터 구현이며 PBRT/NRD 라이브러리 통합이나 전체 문서·API 분석 완료를 뜻하지 않는다.

한계: 광자 밀도 추정은 유한 반경의 편향 추정이고 거친 경계 코스틱·진행 반경 축소는 별도다. 시간 이력은 동일 transport에서 재사용하며 움직인 장면에 대한 모션 재투영은 하지 않는다. 조리개를 통한 이차 반사·굴절은 중심 가이드만으로 정확한 가상 초점을 알 수 없어 원본을 유지한다. 가이드가 없는 배경·날카로운 표면도 원본을 유지한다. 물리 휴대폰·전체 게임 FPS와 다른 엔진의 전체 기능 동등성은 이번 검증 범위가 아니다.
