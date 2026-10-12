# 103 — 카메라 렌즈·피사계 심도·보케

카메라의 물리 렌즈를 켜면 센서 높이와 초점거리로 수직 시야각을 계산해요. 후처리 심도 방식을 `카메라 렌즈`로 선택하면 현재 원근 카메라의 조리개·초점거리·센서 높이로 픽셀별 흐림 반경을 계산해요. 거리 범위 방식이 기본값이라 기존 장면은 같은 설정으로 작동해요. 직교 카메라와 물리 렌즈를 끈 카메라는 기존 거리 범위 계산을 유지해요.

카메라 속성에는 초점거리 1–500 mm, 센서 높이 1–100 mm, 조리개 F값 0.7–128, 날개 3–11개, 회전 ±180°, 날개 둥글기 0–1을 추가했어요. F값이 작으면 더 흐려지고, 둥글기 1은 원형, 0은 다각형이에요. 후처리에는 심도 샘플 4–32개를 추가했고 기본값 12개를 유지했어요. 렌즈를 켜면 수동 시야각을 숨기고 렌즈 속성을 표시하며, 직교 카메라는 렌즈 속성을 숨겨요.

```cpp
hb::Components::SetBool(camera, "Camera", "physicalLens", true);
hb::Components::SetFloat(camera, "Camera", "focalLength", 50);
hb::Components::SetFloat(camera, "Camera", "sensorHeight", 24);
hb::Components::SetFloat(camera, "Camera", "aperture", 2.8f);
hb::Components::SetFloat(camera, "Camera", "apertureCurvature", 0);
hb::Components::SetString(post, "PostProcessVolume", "dofMode", "physical");
hb::Components::SetFloat(post, "PostProcessVolume", "focusDistance", 10);
hb::Components::SetFloat(post, "PostProcessVolume", "dofSamples", 24);
hb::Components::SetBool(post, "PostProcessVolume", "dofEnabled", true);
```

이 속성과 동일한 Components 노드·원자적 AI 컴포넌트 패치를 사용해요. 심도 공간 혼합에 방식·샘플을 포함하고, 혼합 뒤 샘플 수는 정수로 반올림해요. 카메라를 바꾸면 해당 카메라의 렌즈를 사용하며 실행 중 초점거리 변경은 투영 행렬도 갱신해요.

## 계산과 비용

GLSL과 생성 HLSL, WebGPU 모두 얇은 렌즈의 착란원 반경을 센서 높이에 대한 화면 높이 비율로 환산해요. 장면 거리 단위는 m, 렌즈·센서는 mm예요. 흐림은 기존 최대 심도 반경 0–16 픽셀 안으로 제한해요. 렌즈보다 가까운 불가능한 초점거리의 분모는 작은 양수로 제한하며, 광학적으로 유효한 초점 배치라고 해석하지 않아요.

기존 HDR/깊이 패스에 조리개 모양의 샘플 위치를 적용해요. 더 가까운 전경 깊이를 배경 흐림에 섞지 않는 기존 검사를 유지해요. 조리개가 노출을 자동으로 바꾸지는 않아요. 추가 이미지·자동 CPU GPU 읽기는 없고, 네이티브 후처리 상수에 32 바이트를 추가해 기존 세 상수 버퍼를 사용해요. 기본 심도는 계속 비활성이에요. 많은 샘플은 활성 심도의 색/깊이 읽기를 늘리므로 무료인 효과는 아니에요.

보케는 제한된 화면 샘플의 gather 방식이에요. 가려진 배경 복원, 전경 흐림 확산의 별도 레이어, 점광원의 정확한 scatter, 렌즈 수차·경로 추적·FidelityFX SDK 전체 기법을 구현한 것은 아니에요.

## 참고와 검증

[Unity HDRP 심도 문서](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.high-definition/Documentation~/Post-Processing-Depth-of-Field.md)의 자체 본문에서 Volume·수동/물리 방식·날개/곡률·경로 추적 구분을 확인했어요. [Unreal의 cinematic DOF 설명](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-depth-of-field-in-unreal-engine)은 초점거리·F값·초점·필름백·날개 설정 부분을 읽었어요. [AMD FidelityFX DOF 설명](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/depth-of-field/)은 얇은 렌즈 반경 공식·단위·반경 제한·샘플 품질 부분을 대조했어요. 공식 관계를 기존 HB gather에 적용했으며 SDK를 새로 가져오지 않았어요. 전체 API·연결 문서·동영상을 모두 읽었다는 뜻은 아니에요.

[기계 검증 기록](research/RENDERING_103.json)에는 실제 실행기의 조리개·초점·날개 회전 픽셀, C++·L 키 블루프린트, 앞선 렌더링 회귀와 실패 이력을 기록해요. [설치 검증 기록](research/USER_INSTALL_103.json)은 배포 파일과 실행 파일·바로가기·기존 설치 및 프로필 보존 범위예요. 전체 게임 FPS/VRAM·실제 휴대폰·장시간 측정은 별도 검증이 필요해요.
