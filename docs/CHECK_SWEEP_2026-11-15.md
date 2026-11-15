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
- **코드·검사 불일치(성능 작업 이전부터)** (58): 수정 결과는 아래 "불일치 수정 결과"에 있어요.
- **인자 필요(비교 도구)** (24): 불일치에서 옮긴 10개 `check-installed-retained-native-602`, `check-native-draw-history`, `check-native-gameplay-read-cost`, `check-native-material-packing`, `check-native-reconcile-freeze`, `check-native-ui-dispatch`, `check-native-widget-delta-worker`, `check-native-widget-paint-work`, `check-native-widget-snapshot-cost`, `check-native-world-matrix-reuse`, 그리고 `check-authored-mip-references-699`, `check-authored-mips-695-native`, `check-camera-views-native`, `check-native-binary-upload`, `check-native-sdk-read-cost`, `check-native-ui-replay`, `check-native-ui-transport-cost`, `check-performance-comparison`, `check-rendering-253-native`, `check-resident-mip-758-native`, `check-runtime-sync`, `check-texture-composite-545-native`, `check-texture-mips-461-native`, `check-texture-regions-729-native`
- **실행 중인 편집기·개발 서버 필요** (6): `check-authoring-editor`, `check-collision-editor`, `check-editor-api`, `check-physics-editor`, `check-ui-audio-editor`, `check-viewport-workflow`
- **저장소 루트 실행 파일 필요** (3): `check-native-package-paths`, `check-native-portable-imports`, `check-native-uncapped`(`runtime/node.exe`)

## 불일치 수정 결과

커밋 `033e4171`, `f640f4e0`, `4713346f`에서 고쳤어요. 58개를 이렇게 나눴어요.

| 구분 | 수 |
|---|---|
| 지금 통과 | 46 |
| 인자 필요로 재분류 | 10 |
| 저장소 루트 실행 파일 필요로 재분류 | 1 |
| 셰이더 컴파일이 느려 제한 시간 초과 (미해결) | 1 |

코드 수정:
- 이름 변경 전에 메모리에만 있던 발견 에셋 ID를 저장해요. 쓰기 직후 이름을 바꾸면 409가 나던 문제예요.
- 숫자패드 단축키를 허용해요.
- glTF 깊이 128 제한 회귀를 되돌렸어요.
- 빌드 중 프로젝트를 전환하면 409로 알려요.
- 그 밖에 Bridge 초기화 경고, 타입 라이브러리 EEXIST, 카메라 보기 null 보호를 고쳤어요.

나머지는 현재 설계에 맞춘 검사 기대값이에요. 예: 패키지 `game.hbdata` 묶음, C++ 진입 경로, 반구광 /π, `SceneInstance` 176바이트, 컴파일러 식별 캐시 키.

멈춤 조사 결과 (2026-11-16):
- 원인 1: 장면 픽셀 셰이더 fxc 컴파일이 셰이더 하나에 18–30초 걸렸어요. `Shade`가 큰 프로브 평가(`indirectProbes`)를 기본·시트·박막 성분마다 따로 불러 세 번 인라인됐어요.
  - 수정: 세 성분이 가중치·SH·반사 방향을 한 번만 계산해요. 박막은 기본 반사 샘플을 다시 쓰고, 시트는 같은 방향을 자기 거칠기로 한 번 더 샘플해요.
  - 결과: 기본 PS 18→11초, 표면 PS 21→11초, 노드 머테리얼 PS 30→12초, 바이트코드 296→199KB.
  - 화면 동일성: 이전/새 헤더 A/B 렌더(단일·이중 프로브 × 기본·시트·박막·혼합 8가지)에서 최대 차이 1/255예요.
- 원인 2: `check-package`는 예전 WebView 셸의 `--smoke-test`를 썼는데, 패키지 게임(`HBNativePlayer`)은 이 인자를 무시하고 계속 실행됐어요.
  - 검사를 `--hidden --silent --frames 40 --report`와 `HB_NATIVE_TEST_STATE` 방식으로 바꿨어요.
  - 이 과정에서 실제 버그를 찾았어요: 네이티브 게임의 에셋 이름 해석이 이름 변경 리디렉션을 따르지 않아, 이름을 바꾼 오디오를 못 찾았어요. `run-project`가 프로젝트의 `redirect()`를 거치게 고쳤어요.
- 지금 통과: `check-camera-surface-1136-native`, `check-scene-program-preparation-553`, `check-package`, `check-texture-raster-527-native`(노드 셰이더 약 14개라 171초, 실행 제한을 300초로 올림)
- 미해결: `check-native-scene-render`는 노드 머테리얼 61개를 차례로 컴파일해 약 13분이 걸려요. 셰이더 준비 큐가 작업자 1개라서예요.
- 남은 개선 후보: 클리어코트 프로브 호출을 합치면 기본 PS가 약 6초로 줄지만 코트 법선 영향 모드에서 근사가 돼요. 셰이더 준비 큐 병렬화도 남았어요.
