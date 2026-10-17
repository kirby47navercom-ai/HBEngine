# 281 · 기존 큐브맵 LOD 입력의 광선 연결

- 기존 sampleCube LOD 입력을 광선의 전체 색상/알파에도 적용했어요. 기존 핀/IR/주소/프로그램 키와 2D·배열·볼륨 cutout 정책을 유지해요.
- 정수/분수·상하 경계·nearest/trilinear·mip 비활성8조건을 실제 D3D/GL/GPU RGBA golden과 대조했어요.

검증 근거: [기계 판독 기록](research/ENGINE_WORK_281.json).

검증 범위와 잔여:

- 미분 mip footprint의 이전 프레임 이력이나 sampler LOD bias 전체 기능은 아니에요. 큐브맵 명시 LOD와 일반 implicit mip 선택을 구분해요.
