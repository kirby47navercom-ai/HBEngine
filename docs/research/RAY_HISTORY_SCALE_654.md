# 이전 표면 이력과 기하 배율 642–654

이 기록은 이전 머테리얼 입력·노멀·밉과 그 기하 경로를 다뤄요. 전체 조사·전체 엔진 완료를 뜻하지 않아요. 원문에서 확인한 구역은 [642 기록](OPTICAL_FOOTPRINT_642.md)에 분리했어요.

## 재현과 수정

- GI 수집이 절대 행렬식·삼각형 면적으로 작은 모델을 제외했어요. 상대 축/면 검사로 바꾸고, 일반 삼각형의 기존 산술과 패킹 바이트를 보존했어요.
- Gram 분모의 절대 하한과 가늘고 기울어진 모서리의 소거 오차를 제거했어요. 일반 조건은 기존 내적 계산을 쓰고, 작은/조건이 나쁜 삼각형은 모서리를 각각 스케일한 dual basis로 계산해요. 현재·이전 barycentric, 별도 offset, UV 미분, 공유 로컬 메시 경로가 같은 helper를 써요. 큰 월드에서 작은 offset을 절대 점에 먼저 더하지 않아요.
- 작은 모델의 TBN 접선 길이와 이전 면 노멀의 절대 면적 검사 때문에 노멀맵·코팅 노멀·이력 유효성이 사라졌어요. 상대 정규화로 고쳤어요.
- 가늘게 전단한 강체는 float 행렬 왕복이 이전 노멀 오차를 증폭했어요. infinity-norm 조건 추정치가 64를 넘는 강체만 기존 변형 노멀 snapshot 경로를 써요. 일반 강체는 기존 96B/인스턴스, 선택 snapshot은 48B/삼각형이에요. 꺼진 필터에서는 0B이며 새 GPU 텍스처·타깃·uniform·운영 readback은 없어요. 포워드 행렬은 한 번만 계산해 재사용해요.
- 현재/이전 삼각형 교차의 절대 determinant 하한 때문에 작은 삼각형을 놓쳤어요. 일반 Möller 경로를 유지하고 작은 determinant에서는 상대 면/방향 판정과 안정적인 좌표를 써요.
- 현재 TLAS/BLAS 경계 상자의 0 방향을 `1e-7`로 바꾸면 큰 인스턴스의 로컬 광선이 옆으로 기울어졌어요. 0축은 평행 slab로 검사하고, 다른 축은 실제 방향으로 나눠요. 탐색 방문 예산·불완전 탐색 거부·마스크·원래 거리 epsilon 정책은 유지해요.

## 독립 대조와 실제 GPU

새 검사의 좌표 기대값은 지정한 가중치 `(0.1,0.2,0.7)`과 전단의 역식으로 직접 계산해요. 백엔드끼리 같은 값이라는 것만으로 통과시키지 않아요. 기존 GPU 오차 기준 `4e-5`를 유지해요. 광선 거리는 장면 배율로 정규화해 같은 기준으로 비교하고 ID·적중·완료 플래그는 그대로 비교해요.

- `triangle-coordinates-643-k355qO/baseline.json`: 올바른 독립 기준으로 확인한 원래 소거 오차예요. 1e-6 모델은 수집에서 빠졌고, 가는 전단 삼각형은 오류가 커졌어요. 앞선 P07Imk는 검사 UV 기저를 잘못 지정한 기록으로 성과·엔진 결함 근거에서 제외해요.
- `triangle-coordinates-643-D3PQw8/acceptance.json`: 실제 GL/WebGPU 9형상·배율, 오차 최대 약 `1.2e-7`이에요.
- `triangle-scale-642-2AAv8e/acceptance.json`: 실제 GL/WebGPU 기본 색·기본/코팅 노멀 입력·코팅/비등방성 입력·두 밉 폭의 현재/이전 대조예요.
- `triangle-scale-644-native-C2OJpn/acceptance.json`: 실제 D3D11 18문맥의 독립 좌표와 머테리얼 입력/밉이에요.
- `normal-scale-645-TAd3s6/baseline.json`: 원래 작은 배율에서는 decoded normal이 평면 노멀로 바뀌고 committed normal은 0이었어요.
- `normal-scale-645-lXATlY/acceptance.json`, `normal-scale-646-native-hlD3ZN/acceptance.json`: decoded 기본/코팅 노멀과 temporal 유효성의 실제 GL/WebGPU/HLSL 대조예요. D3D11은 가는 전단 형상까지 18문맥을 검사했어요.
- `previous-geometry-368-wu3GiN/baseline.json`: 작은 장면의 실제 GL/WebGPU 이전 교차에서 28개 적중을 놓쳤어요. `RiLjcA/acceptance.json`이 수정 후 180광선/백엔드 검사예요.
- 현재 교차 `previous-geometry-368-lglDju/acceptance.json`, 네이티브 `previous-geometry-368-native-6H9DEL/acceptance.json`과 이전 교차 `previous-geometry-368-native-GOOHtM/acceptance.json`은 공유/비공유·마스크·작은 방향·역방향·거리 제한을 3배율로 검사해요.
- `triangle-coordinates-643-IkjwrJ/baseline.json`은 실제 공유 저장을 켠 뒤 확인한 WebGPU 로컬 작은 메시의 약 `0.9` 좌표 오차예요. 앞선 PtlZD2는 공유 절감 조건에 못 미친 fixture라서 공유 경로 근거로 쓰지 않아요. `960N1Z/acceptance.json`에서 수정 후 약 `1.2e-7` 이하예요.
- CPU 3112삼각형·5포즈의 기존 패킹 바이트 일치, 기존 30이력 입력·변형 플래그·소유권/해제, 큰 월드의 sub-ULP 노멀/밉 GL/WebGPU/HLSL을 대조했어요. 수치와 정확한 경로는 작업 원장에 고정해요.

중간 TSL slab 후보는 assignment-arrow에서 잘못된 scalar return이 생성됐어요. 생성 WGSL로 원인을 확인하고 부수효과 콜백을 중괄호로 고친 후 실제 GPU에서 다시 통과했어요. 실패 후보·검사 정수 float literal·검사 HLSL 예약어 오류는 성공으로 계산하지 않아요.

## AI와 사용 경로

저장된 씬·머테리얼 그래프·IR·주소 ABI는 그대로예요. AI와 C++/블루프린트 사용자가 모델 크기에 따라 별도 epsilon을 작성할 필요가 없어요. `raySurfaceHistoryContract.normalPose`, `uvFootprint.triangleCoordinates`에 선택 규칙과 비용이 있어요. `sharedRayInfo().normalSnapshotTriangles/normalSnapshotBytes`로 snapshot 비용을 볼 수 있고 기존 deformed 이름도 호환 별칭으로 유지해요. 내부 수식 수정은 GLSL/HLSL과 TSL 공용 helper 및 실제 GPU 검사를 함께 바꿔요.

전역 곡면/변경 투명 경로의 역대응, 거친 복합 로브·참여 매질의 footprint, 초기 GL/FXC 비용과 누적 엔진 원장의 다른 잔여는 그대로 이어갈 작업이에요. 이 기록은 모든 크기·모든 float 중간 범위의 불변성이나 새 FPS 수치를 보장하지 않아요.
