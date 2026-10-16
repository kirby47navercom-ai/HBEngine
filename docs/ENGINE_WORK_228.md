# 228 · HDRI·스카이라이트 간접 반사와 텍스처 샘플링

- 기존 우선순위 SkyLight resolver의 실제 HDR/EXR Half/Float 원본·회전·간접 강도를 불변 작업 스냅샷으로 전달
- 기존 경로추적 atan2(z,x)-rotation 규칙의 HDRI 조회와 기하로 가려진 하늘빛의 확산 반사
- 원본 재료의 sampler/wrap을 따르는 CPU 샘플링·선형광 sRGB 보간·볼륨 trilinear·wrapR
- primary 환경광은 실시간에 남겨 직접 하늘빛의 중복 베이크 방지·HDRI 원본 누락 명시 오류

검증 근거: [기계 판독 기록](research/ENGINE_WORK_228.json).

남은 범위:

- 절차적 하늘은 현재 hemisphere 색을 사용한다. 구름/태양 원반까지 캡처한 베이크 환경맵은 추가 잔여
- 샘플러 mip/LOD/anisotropy·cube seam 및 volume mip 품질 확장은 별도 잔여
- 낮은 샘플의 Monte Carlo 오차는 남는다. 기본 bake는 CPU Worker이며 GPU/HWRT Lightmass와 동일하지 않다
