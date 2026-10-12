# 105 — 광선 투과 그림자·누적 경로 추적

카메라에서 실제 월드 삼각형으로 광선을 쏘는 경로 추적과, 투명한 차폐 물체의 색·흡수를 통과시키는 광선 그림자를 D3D11·WebGL2·WebGPU에 연결해요. 화면 밖 발광체 샘플링, GGX·확산 반사, 유리의 반사·굴절, 누적 샘플, 카메라 렌즈 심도도 같은 실행 경로에 포함해요. 기본값은 꺼져 있어요.

## 제작과 공용 함수

PostProcessVolume의 **경로 추적**을 켜면 반사 횟수·최대 누적 샘플·프레임당 샘플·광선 거리·휘도 제한·환경광·렌즈 심도를 조절할 수 있어요. 샘플 수에 도달하면 결과를 재사용해요. 카메라·해상도·장면·기하·포즈·머테리얼·광원·광선 설정·이력 버전 변경이나 실패 프레임은 누적을 초기화해요.

**광선 투과 그림자**는 경로 추적과 기하 GI에서 사용해요. 반투명 색과 불투명도, 투과율·금속성·흡수 색·흡수 거리·두께를 반영해요. 메시의 그림자 생성/받기와 광원의 그림자 옵션을 따라요. 교차나 BVH 탐색 예산을 소진하면 불완전한 광선을 밝은 결과로 채택하지 않아요. 일반 래스터 그림자 맵에 색을 저장하는 기능까지 포함하지는 않아요.

```cpp
hb::Components::SetBool(post, "PostProcessVolume", "pathTracingEnabled", true);
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingBounces", 6);
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingSamples", 256);
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingSamplesPerFrame", 1);
hb::Components::SetBool(post, "PostProcessVolume", "coloredTransmissionShadows", true);
hb::Components::SetBool(post, "PostProcessVolume", "pathTracingDOF", true);
hb::Components::SetFloat(post, "PostProcessVolume", "focusDistance", 10);
hb::Components::SetFloat(camera, "Camera", "aperture", 2.8f);
hb::Materials::SetFloat(glass, "Transmission", 1);
hb::Materials::SetFloat(glass, "IOR", 1.5f);
hb::Materials::SetVector(glass, "AbsorptionTint", {1, .15f, .1f});
```

기존 Components·Materials 함수와 블루프린트 노드, JSON 컴포넌트·AI 패치 경로를 그대로 사용해요. 별도 DirectX 코드가 필요하지 않아요. 렌즈 심도에는 원근 Camera의 Physical Lens가 필요해요. 초점 거리와 F값으로 조리개 반경을 계산하고 카메라의 광선 시작점을 샘플링해요. 경로 렌즈 심도 사용 중에는 기존 화면 심도 흐림을 중복 적용하지 않아요. Volume의 `path`·`geometry` 오버라이드도 검증하고 저장해요.

## 계산과 비용

- 확산·GGX 혼합 BSDF의 `f*cos/pdf`, Fresnel·전반사·Beer 흡수, Russian roulette를 사용해요. 발광 삼각형은 면적 샘플링하고 BSDF로 발광체에 도달하는 경로와 power heuristic MIS로 결합해요.
- 카메라 기본 광선에 픽셀 지터를 적용하며, 직교·원근 투영을 지원해요. D3D11은 8×8 컴퓨트, 브라우저는 GPU 전체 화면 패스를 사용해요. WebGPU의 중첩 BVH 함수는 명시적 TSL 함수로 공유해 셰이더 확장과 상수 버퍼 한도 초과를 방지해요.
- 기존 BVH의 노드 48바이트·삼각형 96바이트·광원 64바이트에, 광선 머테리얼 사용 시 삼각형당 32바이트와 발광 삼각형당 16바이트를 추가해요. 텍스처 패딩은 별도예요. 화면 상수는 세 프레임 버퍼 각각 80바이트 추가해요.
- 누적은 기존 두 HDR 이력 이미지와 광선 BVH를 사용해요. 기본 비활성 상태에는 새 광선 이미지/BVH를 할당하지 않으며 끄면 사용 자원을 해제해요. 정적 장면의 BVH는 재사용하고 기하·포즈·머테리얼·광원이 바뀌면 CPU에서 재구성해요. 런타임 자동 GPU→CPU 읽기는 추가하지 않았어요.

경로 추적은 누적 이미지 품질을 위한 선택 모드예요. 이를 켠 게임의 120/60fps나 큰 동적 장면의 재구성 성능은 이번 검사로 보증하지 않아요.

## 검사와 정확도 경계

실제 Windows 실행기의 C++ 설정, 경로 카메라 발광체, 색 투과/불투명 차폐/교차 예산, 메시·광원 그림자 옵션, 한 번의 반사에서도 화면 밖 발광체 샘플링, 렌즈 심도·조리개, 유리/불투명 전환을 검사해요. 기존 투과·분산·후처리·AO·AA·모션·Hi-Z·기하 GI·표면 셰이딩과 네이티브 2D·파티클·프로브·변형 셰이더도 함께 확인해요. 최종 결과와 설치는 [검사 기록](research/RENDERING_105.json), [설치 영수증](research/USER_INSTALL_105.json)에 따로 남겨요.

광선 머테리얼은 삼각형 중심에서 색/발광을 평가해요. 텍스처 UV·법선맵을 각 교차점에서 평가하는 기능, 닫힌 고체·중첩 매질 스택, HDRI 중요도 샘플링·하늘 대기·볼륨 산란, 코팅/피부/모발의 모든 경로 로브, 디노이저·정확한 caustics는 남아 있어요. 현재 굴절은 얇은 경계 근사예요. 2D 스프라이트·사용자 임의 변형은 이 광선 BVH에서 제외해요. 기존 래스터 2D 기능은 기본 경로를 유지해요. 실게임·실제 휴대폰 성능은 측정하지 않았어요.

## 읽은 근거

- [Unreal 색 투과 그림자](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-colored-translucent-shadows-in-unreal-engine): 불투명도·색, 사용 가능한 조명 방식과 제작 설정 부분을 읽었어요.
- [Unity HDRP 경로 추적 이해](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/path-tracing-understand.html), [설정](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/path-tracing-setup.html), [제약](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/path-tracing-limitations.html): 카메라 광선·누적·재설정·투과 표와 Volume 설정, 래스터 기능과의 차이를 대조했어요.
- [PBRT 경로 추적](https://pbr-book.org/4ed/Light_Transport_I_Surface_Reflection/A_Better_Path_Tracer), [투과율](https://pbr-book.org/4ed/Volume_Scattering/Transmittance): throughput·발광체 샘플링·MIS·Russian roulette와 곱셈 투과율 부분을 읽었어요.
- [Three TSL 함수와 변수](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language#function), [설치 버전 r180 함수 구현](https://github.com/mrdoob/three.js/blob/r180/src/nodes/tsl/TSLCore.js): 지정 구역을 읽고 설치 소스 SHA를 대조했어요.

원문 저장과 지정 구역 읽기를 구분해 기록해요. 전체 Unreal·Unity 본문/API·연결 문서를 전부 분석했다거나 두 엔진의 모든 렌더링 기능을 완성했다고 표시하지 않아요.
