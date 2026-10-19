# 현재·이전 거친 반사 footprint 665–669

방사광 적분기는 선택한 반사 로브의 거칠기로 cone을 넓히는데, 가이드는 같은 반사 뒤에도 기존 spread를 유지했어요. `rough-footprint-665-7cHvVh/baseline.json`에서 기본 금속·코팅 전용 반사를 각각 재현했어요. 앞선 lJpQQa 관찰은 이전 시각을 현재 시각으로 넣은 검사라서 이전 거칠기 결함의 근거로 쓰지 않아요.

기본 반사는 physical roughness, 코팅 전용 반사는 coat roughness를 선택해 기존 적분기와 같은 로컬 스칼라 모델 `min(1.57,spread+max(.02,roughness)^2/2)`을 적용해요. 이력은 이미 평가한 이전 physical/coat 값에서 자기 거칠기를 가져와요. 현재 값을 이전 값으로 대체하지 않아요. 새 머테리얼 평가·광선·타깃·uniform·readback은 추가하지 않았어요. 유리의 정반사/TIR·굴절 ratio/cos 모델과 기존 이력 거부 조건은 유지해요.

`opticalSpread.reflection` 계약에 선택 로브·식·비용을 기록했어요. 그래프·씬·C++/블루프린트 ABI와 사용자 제작 설정은 그대로예요. 이 모델은 방사광 적분기의 기존 근사와 가이드를 맞추는 확장이며 전체 비등방/복합 로브 분포나 참여 매질 산란을 완성한 것으로 계산하지 않아요.

실제 가이드의 반환값만 계측해 카메라 광선·거울 평면·방 안쪽 벽을 독립적으로 계산한 폭과 비교했어요. 현재와 이전 거칠기는 서로 다르면서 기존 이력 허용오차 안에 있도록 지정했어요.

- `rough-footprint-665-j7DIOl/acceptance.json`: GL/WebGPU 기본·코팅의 36표본, 기존 `4e-5` 유지, 최대 약 `3.6e-6`이에요.
- `rough-footprint-667-native-3rncBL/acceptance.json`과 `17vmFI/acceptance.json`: 실제 D3D11 특화·일반 가이드 각각 18표본, 최대 약 `3.4e-6`이에요.
- `optical-guide-375-mlsVZf/acceptance.json`과 `optical-guide-375-native-fGQWCx/acceptance.json`: 기존 굴절 cone과 실제 이전 노멀맵 mip 대조를 유지했어요. 원래 unbent-cone 대조는 다른 값을 내요.

기존 네이티브 광학 검사의 첫 시도는 생성 소스의 첫 번째 반환값만 계측해서 비활성 특화 분기만 바뀌었어요. 원래 UV/깊이 값이 나온 것이 근거였고, 모든 동일 반환 위치를 계측한 후 통과했어요. 이 검사 오류를 엔진의 굴절 실패나 구현 성과로 세지 않아요.

전역 곡면/변경 경로 역대응·노멀 방향 미분·전체 거친 복합 로브/참여 매질 footprint, 초기 컴파일 비용과 누적 원장의 다른 엔진 목표는 계속 다뤄요. 실제 설치·게임 연결은 후속 설치 영수증으로 구분해요.
