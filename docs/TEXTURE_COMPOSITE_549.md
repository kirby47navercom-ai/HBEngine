# 노멀·거칠기 합성

텍스처 2D 에셋을 열고 속성의 **노멀·거칠기 합성**에서 노멀 원본·거칠기 채널·강도를 지정해요. 노멀은 원본 이미지 또는 텍스처 2D 에셋으로 지정할 수 있어요. 미리보기의 밉과 R/G/B/A 선택으로 결과를 확인하고, 일반 문서와 같은 저장·Undo·Redo를 사용해요.

선택한 채널에는 기존 거칠기 값이 있어야 해요. 흰색 1은 이미 최대 거칠기라 더 바뀌지 않아요. 노멀과 대상은 같은 UV를 사용하고 노멀의 가로·세로는 대상 이상이어야 해요. 같은 이미지의 RGB 노멀과 A 거칠기를 함께 쓸 수도 있어요. 합성을 끄려면 노멀 원본을 없음으로 바꾸고, 강도 0은 원래 밉 값을 그대로 유지해요.

알파를 거칠기로 합성하면서 같은 알파의 마스크 커버리지를 유지하는 설정은 거부해요. 다른 채널을 선택하거나 텍스처를 나눠서 사용해요. 원본 파일을 덮어쓰지 않아요.

합성은 가져올 때만 계산해 기존 RGBA8 밉에 저장해요. 실행 중 추가 샘플러·텍스처·매 프레임 합성은 없어요. 일반 표면과 광선 표면은 같은 밉을 사용하고, C++에서도 기존 텍스처 설정 함수를 사용해요.

```cpp
hb::Materials::SetTexture(target, "Paint", "Assets/T_Rough.hbtexture2d.json");
```

AI와 사람이 같은 설정을 편집해요. `engine.schema.textureComposite`에 기본값·채널·강도·참조·충돌 규칙이 있고, 문서 패치의 revision·dryRun·Undo 검증도 같아요.

```json
"composite": {
  "normalTexture": "Assets/T_Normal.hbtexture2d.json",
  "channel": "a",
  "power": 1
}
```

기본값은 기존 등방 근사식을 유지해요. **분산 방식 → 방향별 거칠기**를 고르면 tangent X/Y 기울기의 분산을 서로 다른 RGBA 두 채널에 저장해요. Y 거칠기 채널, 최대 기울기, 분산 임계값·상한을 함께 지정해요. 두 채널은 달라야 하고 알파 출력과 알파 커버리지 유지는 동시에 사용할 수 없어요.

```json
"composite": {
  "normalTexture": "Assets/T_Normal.hbtexture2d.json",
  "mode": "directional",
  "channel": "r",
  "secondaryChannel": "g",
  "power": 1,
  "varianceThreshold": 0,
  "varianceLimit": 10000,
  "maxSlope": 16
}
```

중앙 기울기 moment를 합성해 기울어진 평면 노멀의 큰 평균에서 분산을 빼는 오차를 피하고, 홀수 크기·더 큰 노멀 원본·작성한 밉도 처리해요. 수평선 부근의 기울기 제한 횟수와 축별 분산을 결과에 기록해요. 필요한 한 단계의 moment만 보존하고 기존 텍스처 채널을 쓰므로 실행 중 샘플러를 늘리지 않아요.

저장한 두 거칠기 채널은 머테리얼에서 필요한 입력에 연결해요. 축이 돌아간 공분산 전체·이방성 BRDF 자동 연결까지 구현했다는 뜻은 아니에요. 기존 등방 근사식은 [기술 기록](research/TEXTURE_COMPOSITE_549.md), 새 처리의 실제 로더·worker·프로젝트 저장 근거는 `tools/check-normal-slopes-2799.mjs` 14개에 있어요. 기하 곡률을 이용하는 화면 공간 Specular AA는 별도 기능이에요.
