# 543–549 노멀 분산과 거칠기 합성

## 출처와 대조

[Unreal 4.27 Composite Texture](https://dev.epicgames.com/documentation/en-us/unreal-engine/composite-texture?application_version=4.27)의 반환된 짧은 본문45행을 읽었어요. 기존 roughness 채널·normal 원본·채널 선택·강도·같은 UV/해상도 조건과 등방 근사를 이번 제작 경로에 반영했어요. Epic의 구현 소스·연결 API·예제 프로젝트까지 분석했다는 뜻은 아니에요.

[Unity HDRP17 Geometric Specular AA](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Geometric-Specular-Anti-Aliasing.html)는 실제 본문114–135행을 읽었어요. 기하 곡률의 화면 공간 smoothness 보정과 두 설정을 설명해요. 이번 텍스처 가져오기 분산과 계산 시점·입력이 달라 별도 잔여 기능으로 구분해요. HDRP 구현 소스·연결 API는 미독이에요.

원문 snapshot/SHA/크기/선택 범위는 `CORPUS_MANIFEST.supplemental549`에 등록해요. 전체 본문/API gate는 승격하지 않아요.

## HB 구현 선택

`texture-composite.js`가 사람이 쓰는 편집기와 AI JSON의 공통 계약이에요. `composite.normalTexture/channel/power`만 허용하고 경로 탈출·외부 URL·다른 차원·잘못된 채널/비유한 강도는 거부해요. `power`는0–16, 기본1이에요. 기존 에셋의 기본값은 합성 없음이에요.

원본 RGB를 단위 노멀로 해석하고 면적 가중 평균을 만들어요. 평균한 벡터를 다시 단위화하지 않아 소실된 길이를 유지해요. 홀수 크기도 면적을 나누며, topMip/maxSize에서 건너뛴 단계도 같은 순서로 줄여 선택 설정이 결과를 바꾸지 않아요. 더 높은 원본은 대상의 기본 크기로 먼저 줄여요. 다른 에셋의 이미지를 참조하면 그 에셋의 cooked/정규화된 밉이나 중첩 합성을 재귀 평가하지 않아요.

HB의 근사식은 `v=max(0,1-|mean|-1e-6)/max(|mean|,1e-4)`, `rOut=clamp(r^4+power*v,0,1)^(1/4)`이에요. Epic의 수식을 복제했다고 주장하지 않아요. RGB 채널은 대상의 가져오기 색 공간을 따라 선형에서 합성하고 A는 선형으로 취급해요. 다른 채널은 바이트 그대로 두고 평평한 노멀·강도0은 기존 결과와 같아요. 변경이 있을 때만 출력 복사본을 만들어요. 알파가 바뀌면 커버리지 보고도 새 값으로 다시 계산해요.

순간 버퍼 정점을 실측했다고 주장하지 않아요. 단계 사이에는 노멀 moment 한 레벨만 유지하고, 축소 중에는 이전·새 레벨이 함께 있어요. `peakMomentLevelBytes`는 가장 큰 단일 moment 레벨 크기예요. self source는 이미지 디코드와 픽셀 버퍼를 재사용해요. 기존 단일 lazy worker로 두 입력을 전달하고 중복 transfer를 제거해요. 보조 노멀만 detach된 실패도 재디코드 대상으로 돌려요. 프레임당 합성·새 GPU 샘플러는 추가하지 않아요.

## 제작과 실행

원본/descriptor 참조는 저장·이름 변경·패키징 의존 수집에 연결돼요. 머테리얼 해석은 root의 합성 노멀 descriptor와 이미지를 포함하고, 에디터의 원본 변경 갱신은 그 의존성을 사용해요. 실행 중 파라미터 교체는 root뿐 아니라 합성 descriptor 내용도 비교해요. GL·TSL·native가 교체 후 같은 리소스 목록을 유지하도록 공통 binding owner를 사용해요. 실제 C++ `Materials::SetTexture` 왕복은 별도 새 게임으로 확인해요.

실제 검사 경로·지문·독립 정답·남은 범위는 `ENGINE_WORK_549.json`에 남겨요. 가져오기 RGBA8 노멀 분산이 연결된 범위만 승격하며, HDR·압축·사용자 배열/볼륨 밉·스트리밍·화면 공간 기하 AA·전체 초기 셰이더 비용과 누적 엔진 목표는 별도로 유지해요.
