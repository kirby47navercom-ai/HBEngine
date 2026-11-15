# 전체 검사 실행 기록 (2026-11-15)

`tools/check-*.mjs` 877개를 한 번씩 실행했어요.
- 실행 방식: 3개씩 병렬, 검사마다 20분 제한이에요.
- 실패한 검사는 `package.json`의 노드 옵션과 `--expose-gc`를 붙여 하나씩 다시 실행했어요.
- 그래도 실패하면 성능 작업 이전 커밋 `0a9efe97`의 작업 트리에서 같은 검사를 돌려 비교했어요.

## 결과

| 구분 | 수 |
|---|---|
| 통과 | 767 → 재실행 후 771 |
| 제외 | 10 (Auric: 주인님 게임 원본 필요 7, 브라우저 3) |
| 성능 작업 이후 회귀 | 4 → 모두 수정 |
| 성능 작업 이전부터 실패 | 92 |

## 고친 회귀

- **`check-engine-175`(관절 모터)**
  - 모터 관절 물체가 목표 각도 0.1° 앞에서 수면 상태로 들어갔어요.
  - 예전에는 충돌체 매 sync 재생성 버그가 물체를 계속 깨워 두어 우연히 통과했어요.
  - 수정: 켜진 관절 모터는 동적 물체를 매 단계 깨워요(`wakeMotorJoints`).
- **`check-engine-integration`, `check-render-resources`**
  - 스프라이트 판·기본 도형 지오메트리 공유로 소유·해제 개수가 바뀌었어요.
  - 수정: 검사 기대값을 공유 동작에 맞췄어요. 공유본은 그룹이 소유하지 않고, 팩토리가 한 번 해제해요.
- **`check-native-visible-traversal`**
  - 소스 문자열을 바꿔 끼우는 예전 A/B 검사였는데, 인코더 순회가 바뀌어 대상 문자열이 없어졌어요.
  - 수정: 현재 렌더러에서 성질을 직접 확인하도록 다시 썼어요. 숨긴 하위 트리를 읽지 않는지, 보이기·이동·숨기기·루트 숨기기 때 그리기와 광원이 맞게 생기고 사라지는지 봐요.

## 성능 작업 이전부터 실패하는 검사

같은 검사가 `0a9efe97`에서도 실패해요. 원인별로 나눴어요.

- **Android·iOS 기기·SDK 필요** (12): `check-android-mobile`, `check-android-runtime`, `check-deformables-mobile-242`, `check-engine-185-mobile`, `check-ios-mobile`, `check-mobile-player`, `check-runtime-sdk-mobile-248`, `check-runtime-sdk-mobile-258`, `check-runtime-sdk-mobile-267`, `check-runtime-sdk-mobile-273`, `check-runtime-sdk-mobile-280`, `check-streamed-build-200`
- **코드·검사 불일치(성능 작업 이전부터)** (58): `check-assets`, `check-authoring`, `check-camera-surface-1136-native`, `check-context-focus-1373`, `check-context-install-1071`, `check-cubemap-lod-281`, `check-curve-density-1323`, `check-curve-range-bake-1336`, `check-curve-subdivision-1378`, `check-differential-plan-446`, `check-engine-188`, `check-game-resources`, `check-gpu-shared-shader`, `check-headless-hierarchy-2395`, `check-installed-retained-native-602`, `check-launcher`, `check-layered-import-2816`, `check-library`, `check-material-texture-families`, `check-mesh-renderer-1621`, `check-mixer-blends`, `check-montage-timeline-1557`, `check-native-cancel`, `check-native-draw-history`, `check-native-gameplay-read-cost`, `check-native-material-packing`, `check-native-reconcile-freeze`, `check-native-scene-render`, `check-native-spawn-aot`, `check-native-ui-dispatch`, `check-native-uncapped`, `check-native-widget-delta-worker`, `check-native-widget-frame-cost`, `check-native-widget-paint-work`, `check-native-widget-snapshot-cost`, `check-native-world-matrix-reuse`, `check-package`, `check-photon-shader`, `check-play-world-native`, `check-player-lifecycle`, `check-previous-records-367`, `check-probe-atlas-1116`, `check-probe-priority-1356`, `check-probe-selection-1010`, `check-rendering-106`, `check-rendering-127`, `check-rendering-145`, `check-rendering-189`, `check-rendering-274`, `check-scene-program-preparation-553`, `check-sequence-indexed-fixture-2139`, `check-signed-scale-1203`, `check-skeleton-1859`, `check-startup-state`, `check-take-filter-215`, `check-texture-raster-527-native`, `check-ui-audio`, `check-window-workflow`
- **인자 필요(비교 도구)** (14): `check-authored-mip-references-699`, `check-authored-mips-695-native`, `check-camera-views-native`, `check-native-binary-upload`, `check-native-sdk-read-cost`, `check-native-ui-replay`, `check-native-ui-transport-cost`, `check-performance-comparison`, `check-rendering-253-native`, `check-resident-mip-758-native`, `check-runtime-sync`, `check-texture-composite-545-native`, `check-texture-mips-461-native`, `check-texture-regions-729-native`
- **실행 중인 편집기·개발 서버 필요** (6): `check-authoring-editor`, `check-collision-editor`, `check-editor-api`, `check-physics-editor`, `check-ui-audio-editor`, `check-viewport-workflow`
- **저장소 루트 실행 파일 필요** (2): `check-native-package-paths`, `check-native-portable-imports`
