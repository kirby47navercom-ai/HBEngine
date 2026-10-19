# 광선 footprint 대조 기록 642

전체 엔진·문서 분석 완료를 뜻하지 않는 선택 구역 대조예요. 구현 변경 전 원문과 기존 수식을 확인했어요.

NVIDIA의 [Refraction Ray Cones](https://research.nvidia.com/publication/2021-08_refraction-ray-cones-texture-level-detail)는 논문의 반각과 다른 ray-cone 자료의 전체각 표기가 다름을 정오표에 명시해요. 공개 Falcor 구현은 전체각을 사용한다고 설명해요. 여기서는 초록·정오표를 읽었고 논문 PDF 전체는 아직 읽지 않았어요.

[Improved Shader and Texture LOD](https://research.nvidia.com/publication/2021-04_improved-shader-and-texture-level-detail-using-ray-cones)의 초록·정오표도 대조했어요. 폭/반지름과 기울기 샘플의 배율을 구분해야 해요. 이 원문의 전체 본문 분석을 완료한 것은 아니에요.

[PBRT 4판 10.1](https://www.pbr-book.org/4ed/Textures_and_Materials/Texture_Sampling_and_Antialiasing)에서 픽셀 이웃 광선과 UV 미분을 연결하는 구역, 법선 미분이 반사·굴절 방향 미분에 들어가는 설명을 확인했어요. 책 전체 분석으로 승격하지 않아요.

HB의 카메라 cone은 한 픽셀 이웃 방향 차이 또는 정사영 한 픽셀 폭을 사용하고, UV helper도 그 폭을 기울기로 사용해요. 따라서 정오표만 보고 임의로 두 배를 곱하지 않아요. 광선 곡률·거친 로브·참여 매질의 전파는 별도 구현 과제예요.

코드에서 현재/이전 barycentric·UV offset에 `max(a*c-b*b,1e-18)`이 반복되는 것을 찾았어요. 절대 길이 배율에 따라 분모가 잘리거나 가늘고 비스듬한 삼각형에서 뺄셈 오차가 커질 가능성이 있어요. 정규화한 모서리의 cross/dual basis로 계산하는 방법을 자체 유도하고, 실제 GPU 관찰을 먼저 남겨요. 아직 구현 수정이나 통과 판정은 없어요.

`check-triangle-scale-642-window.mjs --baseline`은 색/기본 노멀/코팅·비등방성/코팅 노멀의 현재·이전 입력과 두 밉 폭을 1e-6/1/1e6 및 가늘고 sheared인 삼각형에서 대조해요. `geometry-gi-shader.js`의 교차 판정에도 절대 determinant 임계값이 있으므로 이 검사를 전체 ray visibility 검증으로 계산하지 않아요.

위의 미수정 상태는 642 조사 시점 기록이에요. 이후 재현·구현·세 GPU 대조와 교차 검사 결과는 [654 구현 기록](RAY_HISTORY_SCALE_654.md)에 이어져요. 원문 전체 분석 완료로 승격하지 않아요.
