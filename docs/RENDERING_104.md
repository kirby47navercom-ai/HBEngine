# 104 — 깊이 계층·기하 간접광·표면 셰이딩·변형 모션

이번 묶음은 Hi-Z, 화면 밖 삼각형의 간접광과 차폐, 피부·왁스·잎·모발·눈 머테리얼 제작, 뼈·모프·인스턴스의 이전 프레임 정보, 간접광만 차폐하는 AO를 기존 D3D11·WebGL2·WebGPU 실행 경로에 연결해요. 새 선택 효과는 기본 비활성이며 기존 2D·기본 PBR·후처리 설정을 유지해요.

## 제작

PostProcessVolume에서 **깊이 계층**, **기하 GI**, **AO 방식: 간접광**을 설정해요. 기하 GI는 강도·거리·1–4회 반사·1–16개 샘플·16–4096 탐색 단계·표면 바이어스를 조절해요. 공간 Volume override와 같은 Components 함수·블루프린트 노드·AI 패치 스키마를 사용해요.

```cpp
hb::Components::SetBool(post, "PostProcessVolume", "screenRayHiZ", true);
hb::Components::SetBool(post, "PostProcessVolume", "geometryGIEnabled", true);
hb::Components::SetFloat(post, "PostProcessVolume", "geometryGISamples", 4);
hb::Components::SetFloat(post, "PostProcessVolume", "geometryGIBounces", 2);
hb::Components::SetString(post, "PostProcessVolume", "aoMode", "ambient");
hb::Components::SetBool(post, "PostProcessVolume", "aoEnabled", true);
hb::Materials::SetFloat(actor, "Subsurface", 1);
hb::Materials::SetFloat(actor, "ScatterThickness", .5f);
hb::Materials::SetFloat(actor, "Foliage", 1);
hb::Materials::SetFloat(actor, "Hair", 1);
hb::Materials::SetVector(actor, "HairTangent", {0, 1, 0});
```

머테리얼 Surface에 산란 강도·색·두께, 잎 역광, 모발 강도·방향·광택 이동 핀과 속성을 추가했어요. 함수·속성 구조체·레이어와 기존 머테리얼 파라미터 경로에서도 사용해요. skin/wax/foliage/hair/eye 프리셋과 Eye UV 노드가 있어요. Eye UV는 시선과 깊이에 따른 홍채 좌표 이동이에요.

MeshRenderer의 기존 perObject/camera/none 모션 설정을 유지하며 perObject에 뼈·모프·인스턴스 이전 상태를 포함해요. 정상 프레임만 이력을 확정하고 생성·메시 교체·토폴로지 변경·카메라 전환·실패 프레임은 이력을 거부해요. 2D 스프라이트와 사용자가 작성한 임의 변형 셰이더는 카메라 모션 경로를 유지해요.

## 구현과 비용

Hi-Z는 홀수 해상도의 끝 픽셀도 포함하는 min/max RG32F 계층을 GPU에서 생성해요. 가장 가까운 깊이보다 앞에 있는 구간을 보수적으로 검사해 기존 화면 광선의 네 단계를 건너뛰어요. D3D11은 8×8 컴퓨트와 세 상수 버퍼, 브라우저는 각 레벨 GPU 렌더 패스를 사용해요. 이미지 비용은 atlas와 각 레벨 픽셀 합 × 8바이트예요. 전체 SSSR/DDA/SPD나 시간 디노이저를 구현했다고 해석하지 않아요.

기하 GI는 실제 월드 삼각형으로 stackless BVH를 만들고 GPU에서 유한한 반사와 광원 차폐를 계산해요. 화면 밖 발광 물체와 차폐 물체도 포함해요. 정적 장면의 BVH를 재사용하고 기하·포즈·인스턴스·머테리얼·광원 변경 시 CPU에서 다시 구성해요. 논리 데이터는 노드 48바이트, 삼각형 96바이트, 광원 64바이트와 텍스처 패딩이에요. 탐색 예산이 부족하면 불완전한 반사/그림자를 채택하지 않아요. 큰 동적 장면의 BVH 재구성 비용은 별도 실게임 측정이 필요해요.

변형 모션은 기존 현재 포즈와 별도로 이전 포즈/인스턴스를 보관해요. 네이티브 이전 포즈는 poseBytes × 3, 이전 인스턴스는 capacity × 64 × 3바이트이며 선택 모션을 끄면 해제해요. 브라우저는 이전 상태의 Float 텍스처를 사용해요. 네이티브 표면 셰이딩 상수는 세 버퍼 각각 48바이트, 화면 효과 상수는 이 묶음에서 각각 80바이트 추가해요. 간접광 AO를 켜면 추가 HDR 표면 이미지 8바이트/픽셀을 사용해요. 자동 GPU→CPU 읽기는 추가하지 않았으며 검사의 픽셀 읽기는 별도예요.

간접광 AO는 발광·직접광·안개 색을 그대로 두고 주변/프로브 간접광 성분을 차폐해요. 코팅·천 에너지 보정과 안개의 표면 감쇠를 적용해요. 기존 전체 화면 AO 방식은 호환용으로 남겨요.

## 확인 범위와 남은 정확도

실제 Windows 실행기 세 종류와 네이티브 GPU, 공용 스키마·C++·블루프린트·AI·생성 헤더 검사를 묶어 수행해요. 원문 SHA·최종 검사·산술 자원 비용·설치 영수증은 [기계 기록](research/RENDERING_104.json)에 기록해요. 검사 성공과 설치 성공은 별도 기록이에요.

기하 GI의 색/발광은 삼각형 중심에서 평가해요. 텍스처 texel/UV·alpha coverage·투명 굴절 경로를 추적하지 않으며 마스크 삼각형은 불투명 기하로 취급해요. Lumen의 SDF·카드·surface cache·hardware RT나 경로 추적에 해당하지 않아요. 피부/왁스는 표면 wrap/backscatter, 잎은 얇은 역광, 모발은 폴리곤의 두 광택 로브예요. diffusion profile·실제 모발 가닥·완전한 Unreal 눈 모델은 아니에요. 투명/2D/사용자 임의 변형 모션, 색 투과 그림자, 전경 심도 복원, 실게임/실기기 성능은 별도 잔여 범위예요.

## 읽은 근거

- [Unreal Lumen 기술 설명](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine): surface cache, 화면 추적과 화면 밖 기하 fallback, 품질 비용 부분을 대조했어요.
- [Unreal 셰이딩 모델](https://dev.epicgames.com/documentation/en-us/unreal-engine/shading-models-in-unreal-engine): 피부·잎·모발·눈의 제작 목적과 입력을 확인했어요.
- [Unity HDRP 17.0.4 모션 벡터](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Motion-Vectors.html): 물체·카메라 순서, 제작 모드, alpha clip과 투명 깊이 한계를 확인했어요.
- [AMD FidelityFX SSSR](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/stochastic-screen-space-reflections/): 깊이 계층과 광선 교차 구간을 대조했어요.

각 페이지의 실제 읽은 구간과 미독 연결 API·미디어를 원문 snapshot SHA와 함께 기록해요. 문서 전체·SDK/API 전체를 읽거나 두 엔진을 그대로 완성했다고 표시하지 않아요.
