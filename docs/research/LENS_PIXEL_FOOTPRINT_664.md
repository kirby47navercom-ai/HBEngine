# 렌즈 픽셀 기저 659–664

작은 물리 좌표에서는 `max(1e-20,a*c*1e-6)` 때문에 렌즈 변위의 픽셀 반경이 0이 됐어요. 큰 좌표에서는 Gram 소거·float 곱셈 범위도 문제가 됐어요. 실제 세 GPU의 `pixel-footprint-659-X1HYlK/baseline.json`에 원래 값을 남겼어요.

`hbPathOffset`과 TSL의 같은 경로가 상대 축 각도로 퇴화 여부를 검사하고 스케일한 dual basis로 투영하도록 바꿨어요. 기존 `sin²<=1e-6` 거부와 최대 32픽셀을 유지해요. 추가 광선·타깃·uniform·운영 readback은 없어요. 공용 dual 함수를 분리해 기존 작은 삼각형 좌표와 공유하고, 가이드에 공용 GLSL 본문을 중복 삽입하지 않아요.

`opticalSpread.pixelProjection` 불변 계약으로 AI가 좌표 단위·퇴화 정책·자원 비용과 한계를 읽을 수 있어요. 사용자는 머테리얼·카메라 설정을 그대로 쓰며 별도 epsilon을 작성하지 않아요.

검증은 단순히 두 구현이 같은지만 비교하지 않아요.

- `pixel-footprint-659-2I3kQN/acceptance.json`: 실제 GL/WebGPU/D3D11의 동적 float 입력 30조건/백엔드예요. 배율 `1e-10..1e10`, 회전·반전·전단·0축·거의 평행한 축의 독립 기대 변위를 대조했고 오차 최대 약 `1.2e-7`이에요.
- `lens-scale-662-n1qukp/acceptance.json`: 전체 곡면·시간·렌즈 GL/WebGPU 가이드 54표본이에요. 카메라/렌즈 광선을 거울 평면과 방의 안쪽 벽에 해석적으로 교차시킨 독립 계산과 비교했고 최대 약 `7.9e-7`이에요.
- `lens-scale-663-native-lj6Xt5/acceptance.json`: 실제 특화 HLSL 전체 가이드 27표본도 같은 독립 기준을 통과했어요. 최대 약 `5.0e-7`이에요.

원래 GPU 기준 `4e-5`를 유지했어요. 초기 검사에서 일반 Camera를 쓴 WebGPU harness 오류는 정사영 테스트 카메라로 수정했으며 성공으로 세지 않아요. 전체 장면/설치본 증거는 후속 원장과 구분해요.

## 읽은 원문과 다음 범위

[PBRT 4판 10.1.2–10.1.3](https://www.pbr-book.org/4ed/Textures_and_Materials/Texture_Sampling_and_Antialiasing)의 매질 경계·정반사/굴절 광선 미분 본문과 수식을 읽었어요. 무산란 경계에서는 미분 광선이 이어지고, 정반사/굴절 방향은 입사 방향과 노멀 변화의 영향을 받아요. 거친 비정반사 미분은 유일하게 정해지지 않는다고 설명해요. 여기의 dual 투영은 HB 좌표 문제에서 자체 유도했으며 PBRT 구현을 그대로 재현한 것으로 계산하지 않아요.

[642 지정 읽기](OPTICAL_FOOTPRINT_642.md)는 NVIDIA 두 자료의 초록·정오표와 PBRT 지정 구역에 한정돼요. PDF/책 전체·연결 API·UE/Unity 전체 조사는 미완료예요. 전체 조사 gate를 승격하지 않아요. 다음 구현은 현재/이전의 거친 로브 footprint, 곡면/변경 경로 역대응과 매질 전파이며 초기 준비 비용·누적 엔진 목표도 유지해요.
