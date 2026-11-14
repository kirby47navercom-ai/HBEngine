# 변경 알림(리비전) 설계

목표: 매 프레임 "바뀌었는지 확인"하는 비용을 "바뀐 것만 처리"로 바꿔요. 대상은 2D·3D 공통 오브젝트당 비용이에요.

## 왜 필요한가 (측정, 2026-11-14)

2D 스프라이트 2000개, 묶음 렌더링 켬, D3D12, 프레임 작업 기준 비중:

| 비용 | 비중 | 지금 매 프레임 하는 일 |
|---|---|---|
| 행렬 갱신 3회 | 약 17% | three `updateMatrixWorld`가 모든 노드를 합성·곱셈 |
| 물리 정적 확인 | 약 8% (+ `sync` 순회 6%) | 정적 충돌체마다 컴포넌트 스냅샷 깊은 비교(`matchStatic`) |
| 그리기 머테리얼 비교 | 약 9% | 스프라이트마다 머테리얼 값 약 70개 비교(`nativeMaterialInto`) |

세 가지 모두 값이 바뀌었는지 알 수 없어서 전부 다시 확인하는 비용이에요. 확인 비용을 더 싸게 만드는 시도(값 비교로 행렬 건너뛰기)는 three 계산보다 느렸어요(D3D12_PORT.md). 남은 방법은 쓰는 쪽이 알려 주는 것이에요.

## 쓰기 경로 조사

| 대상 | 쓰기 지점 | 성격 |
|---|---|---|
| C++ 게임 상태 | `tools/run-project.mjs` `Object.assign(object,state)` (바뀐 오브젝트만 전달) | 한 지점 |
| C++·블루프린트 컴포넌트 값 | `engine-services.js` `componentSet*` 연산 | 한 지점 |
| 물리 결과 | `physics-world.js` `setSceneWorldPosition`·`rotation` 대입 | 한 모듈 |
| JS 런타임 컴포넌트 속성 직접 쓰기 | 25개 모듈 (ui-runtime 16곳, engine-services 8곳, 템플릿·애니메이션·위젯·스폰·레벨 스트리밍 등) | 흩어짐 |
| 컴포넌트 배열 교체(`components=`) | 12곳 (스폰, 시퀀스, 블루프린트 상속, 템플릿) | 흩어짐 |
| 장면 오브젝트 변환 직접 쓰기 | 12개 모듈 (편집기 제외 시 engine-services, scene-runtime, level-streaming, physics-world, gameplay-runtime, animation-graph-runtime 등) | 흩어짐 |
| 스프라이트 머테리얼 | scene-rendering, sprite-color-policy, gpu-2d-rendering, two-d-rendering, native-scene-renderer (효과 uniform은 매 프레임 감쇠) | 5개 모듈 |
| three 노드 변환 | 26개 모듈 + three 내부 | 범위 밖(4단계) |

## 설계

### 1. 리비전 모듈 `prototype/object-revision.js`

- 장면 오브젝트에 심볼 키 리비전을 둬요(JSON·저장·복제에 섞이지 않게 열거 불가).
  - `transform`: 위치·회전·크기·부모
  - `components`: 컴포넌트 배열과 속성
- 쓰기 API: `touchTransform(o)`, `touchComponents(o)`, `setComponentProperty(o,c,key,value)`(값 쓰기와 알림을 한 번에).
- 전역 일련번호를 하나 둬서 "같은 리비전 = 같은 값"이 프레임 사이에서도 성립하게 해요(되돌린 값도 새 번호).

### 2. 소비자는 "신뢰 표시"가 있을 때만 건너뛰어요

- 쓰기 지점을 다 바꾸기 전에는 리비전을 믿을 수 없어요. 그래서 종류별 신뢰 표시를 둬요.
  - `trusted.components`, `trusted.transform`
  - 해당 종류의 모든 런타임 쓰기 지점을 바꾼 단계에서만 켜요.
- 신뢰 표시가 꺼져 있으면 지금처럼 전부 비교해요. 결과는 지금과 같아요.

### 3. 검증 모드 (빠진 쓰기 지점 찾기)

- `HB_VERIFY_REVISIONS=1`(검사 실행 기본값)에서는 소비자가 두 가지를 다 해요.
  - 리비전으로 건너뛰는 판단
  - 기존 전체 비교
- 리비전이 같은데 값이 다르면 오브젝트 ID, 컴포넌트, 속성으로 바로 실패시켜요. 알리지 않은 쓰기 지점을 이렇게 찾아요.
- 실제 게임에서는 프레임마다 정적 오브젝트 일부(예: 1/64)를 돌아가며 전체 비교해요.
  - 불일치가 나오면 해당 종류의 신뢰 표시를 끄고 한 번만 기록해요.
  - 화면이나 물리가 틀린 상태로 계속 가지 않게 하는 안전장치예요.

### 4. 소비자별 적용

| 소비자 | 건너뛰는 조건 | 예상 절감(2D 2000개) |
|---|---|---|
| 물리 정적 확인 `matchStatic` | `components` 리비전과 `transform` 리비전이 스냅샷과 같음 | 약 8% |
| 그리기 머테리얼 비교 | 스프라이트 머테리얼 리비전(아래 3단계)이 같음 | 약 9% |
| 행렬 갱신 | 정적 하위 트리 방문 생략(4단계) | 최대 약 17% |

## 단계

1. **기반 + 한 지점 쓰기 + 검증**
   - 리비전 모듈을 만들어요.
   - C++ 상태 반영(`Object.assign`), `componentSet*`, 물리 결과 쓰기에 알림을 넣어요.
   - 검증 모드를 넣고, 기존 검사를 검증 모드로 돌려 빠진 지점 목록을 만들어요.
   - 이 단계에서는 신뢰 표시를 켜지 않아서 동작 변화가 없어요.
2. **흩어진 컴포넌트·변환 쓰기 이전**
   - 25개 모듈과 배열 교체 12곳을 `setComponentProperty`/`touch*`로 바꿔요.
   - 검증 모드에서 불일치가 0이 되면 `trusted.components`·`trusted.transform`을 켜고, 물리 정적 확인을 건너뛰어요.
   - A/B를 측정해요.
3. **스프라이트 머테리얼 리비전**
   - 5개 모듈의 머테리얼 쓰기에 알림을 넣어요.
   - 효과 uniform 감쇠는 값이 바뀌는 프레임에만 알려요.
   - 유지형 그리기에서 머테리얼 리비전이 같으면 `nativeMaterialInto`를 건너뛰어요.
   - 검증 모드로 패킷 동일을 확인해요.
4. **변환 하위 트리 생략**
   - 엔진 그룹의 변환 쓰기(실행기 `update`, 스프라이트 뒤집기·피벗)에 알림을 넣어요.
   - 리비전이 같고 자식이 모두 엔진 관리인 하위 트리는 방문하지 않아요.
   - 외부 쓰기가 있는 three 노드(뼈대, 바퀴, LOD, 선 풀, 프록시)는 지금처럼 매번 갱신해요.
   - 실제 D3D12 화면 비교(`check-native-sprite-batch-gpu`와 같은 방식)로 확인해요.

## 위험과 대응

- **알리지 않은 쓰기:** 검증 모드와 실제 실행 표본 검증으로 잡아요. 신뢰 표시는 종류별로 끌 수 있어요.
- **사용자 C++·블루프린트:** 모두 `componentSet*`과 상태 반영 한 지점을 지나서 1단계에서 처리돼요.
- **저장·복제:** 리비전은 심볼 키라 JSON·`structuredClone`에 나타나지 않아요. 복제된 오브젝트는 리비전이 없어 "모름"으로 처리해 전체 비교해요.
- **편집기:** 편집기 쓰기(app.js, scene-editor 등)는 런타임 소비자와 무관해요. 편집기 플레이 시작 때 리비전을 새로 매겨요.

## 진행 상황

### 1단계 (2026-11-14, 완료)

- `prototype/object-revision.js`
  - 심볼 키 리비전: `touchComponents`, `touchTransform`, `revisionSnapshot`, `sameRevision`
  - 신뢰 표시 `revisionTrust`(모두 꺼짐)
  - 검증 모드 `HB_VERIFY_REVISIONS=1`
  - 보고서 `HB_REVISION_REPORT` 또는 `HB_REVISION_REPORT_DIR`(프로세스별 파일)
- 알림을 넣은 한 지점 쓰기:
  - `tools/run-project.mjs`의 C++ 상태 반영(변환·컴포넌트)
  - `engine-services.js`의 `componentSet*`(Transform이면 변환도)과 큐 에셋·반사 경계 연산
  - `physics-world.js`의 물리 결과 위치·회전 쓰기
- 물리 정적 확인: 스냅샷에 리비전을 함께 저장해요. 검증 모드에서 리비전은 같은데 값이 다르면 `physicsStatic` 보고(자세·컴포넌트·타일 중 무엇인지)를 남겨요. 신뢰 표시가 꺼져 있어 동작은 그대로예요.
- 검사: `tools/check-object-revision.mjs`
  - 리비전이 JSON·스프레드·`structuredClone`에 섞이지 않아요.
  - 알리지 않은 컴포넌트 쓰기와 이동은 보고하고, 알린 쓰기는 보고하지 않아요.
- 검증 모드 실행(`check-native-backend-fps` 2D·3D, check-native-game, check-native-chain, check-native-lifecycle-263, check-collision-dispatch, check-2d-extensions, check-input-authoring, check-blueprint-2d-1219, check-engine-175/176/179)에서 정적 충돌체 불일치는 0건이었어요.
  - 이 검사들은 템플릿·UI·애니메이션 쓰기 경로를 정적 충돌체에 거의 쓰지 않아요. 그래서 2단계에서 25개 모듈을 바꾼 뒤 신뢰 표시를 켜기 전에, 게임플레이 템플릿이 들어간 장면으로 검증 모드를 다시 돌려야 해요.

### 2단계 (2026-11-14, 물리 정적 확인 적용)

- 신뢰 범위를 소비자 기준으로 좁혔어요.
  - `revisionTrust.physics`: 충돌체·물리 몸체 컴포넌트, `tileColliders`, 루트 변환을 쓰는 런타임 경로가 모두 알려요.
  - 조명·UI·위젯 속성 쓰기는 물리 정적 스냅샷(충돌체·물리 몸체 컴포넌트만 비교)에 영향이 없어서 이 범위에서 빠져요.
- 알림을 넣은 경로
  - **변환:** `scene-runtime`의 `setSceneWorldPosition`·이동 도우미, 실행기 `update`(엔진 연산 32곳이 `hooks.update`로 거침), `engine-services` 부모 붙이기, `physics-world` 이동, `animation-graph-runtime` 루트 모션, `runtime-game` 폰 회전
  - **컴포넌트:** 실행기 `update`, `engine-services` 관절 연산(실패 되돌리기 포함), `level-streaming`·`actor-references` 참조 정리, `blueprint-overrides`, `sequence-component-channels`, `sequence-state`
  - **타일 충돌체:** `scene-rendering`, `tilemap-runtime`, `world-collision-lod` 2곳, `world-rendering` 2곳, 실행기 타일맵
  - 스폰·템플릿처럼 장면에 들어가기 전 오브젝트를 만드는 쓰기와 애니메이션·행동 트리·위젯 노드 쓰기는 대상이 아니에요.
- `physics-world` 정적 확인
  - 충돌·재질 수와 부모가 같고 컴포넌트·변환 리비전이 스냅샷과 같으면 깊은 비교(`matchStatic`, 자세 비교, 충돌체 목록 필터) 없이 재사용해요.
  - 검증 모드는 항상 전체 비교해요.
  - 검증 모드가 아니면 건너뛴 오브젝트 64개 중 1개를 돌아가며 전체 비교해요. 불일치가 나오면 보고하고 `revisionTrust.physics`를 꺼서 이후 전부 비교해요. 알리지 않은 쓰기가 남아 있어도 최대 약 64번의 건너뛰기 동안만 늦게 반영되고, 그 뒤에는 원래 방식으로 돌아가요.
- 검사
  - `check-object-revision`: 검증 모드 보고, 신뢰 상태에서 알린 쓰기 반영과 알리지 않은 쓰기 건너뜀, 표본 검사 발견 → 신뢰 해제 → 충돌체 재생성 → 이후 직접 쓰기 반영
  - `check-revision-verify-games`: shooter2d·gameplay2d·garden·2d·3d 템플릿 게임을 검증 모드로 600프레임 돌려 불일치 0건. 다만 템플릿들이 정적 충돌체를 실행 중에 거의 바꾸지 않아 강한 증명은 아니에요.
  - 물리·스폰·시퀀스·타일맵·충돌·관절·천·루트 모션·2D·게임 실행 검사 25개 통과
  - `check-runtime-sync`(기능 부분 `--baseline`), `check-native-gameplay-read-cost`, `check-native-spawn-aot`는 변경 전에도 같은 방식으로 실패해요.
- 성능: ABBA 4회. 2D 2000개 70.5→76.4 FPS(중앙 프레임 13.65→12.46ms, 4회 중 3회 개선). 3D 258.0→272.1 FPS(잡음 범위).

### 3단계 (2026-11-14, 스프라이트 머테리얼)

- `object-revision`: `touchMaterial`/`materialRevision`(머테리얼 객체의 심볼 키), `revisionTrust.spriteMaterial`
- 알림
  - 스프라이트 생성·재사용 끝(`scene-rendering` `sprite`)
  - `onBeforeRender`의 번쩍임·발광 값: 실제로 바뀔 때만 쓰고 알려요. 예전에는 매 렌더 다시 썼어요.
  - 머테리얼 연산 `material`·`materialFloat`·`materialVector`·`materialTexture`·`materialTextureRegion`·`materialResidentMip`과 `spriteFrame`·`syncSprite`: 호출 뒤(비동기는 완료 뒤에도) 그룹 머테리얼 전체에 알려요.
- 인코딩: 유지형 그리기에서 스프라이트 머테리얼 리비전과 머테리얼 객체가 같으면 `nativeMaterialInto`(값 약 70개 읽기·비교)를 건너뛰어요. 검증 모드는 항상 읽고, 그 밖에는 64번 중 1번 표본을 읽어요. 리비전이 같은데 값이 다르면 보고하고 `revisionTrust.spriteMaterial`을 꺼요.
- 검사
  - `check-sprite-material-revision`: 알린 변경 반영, 표본 끔 상태에서 알리지 않은 변경 건너뜀, 표본 발견·신뢰 해제·반영, 검증 모드 반영
  - `check-revision-verify-games`: 템플릿 5종 600프레임 불일치 0건(물리·머테리얼)
  - `check-native-sprite-batch-gpu`: 픽셀 동일, 그리기 364→175
  - 렌더러·2D·파티클 검사 통과

## 규모 측정과 다음 목표 (2026-11-14)

`check-native-backend-fps` D3D12, 프레임 작업 중앙값:

| 장면 | 2000개 | 1만 개 |
|---|---|---|
| 2D 스프라이트 | 11.7ms (81 FPS) | 184.7ms (5 FPS) |
| 3D 메시 | 15.8ms (59 FPS) | 183.2ms (5 FPS) |

- 개수가 5배인데 시간이 15배예요.
- 1만 개 2D 프로파일
  - 물리 `advance`가 48.5%예요. 프레임이 느리면 고정 단계 물리가 프레임당 최대 8번 돌고, 매번 전체 `sync`·접촉 수집·고정 접촉 서명을 다시 해요. 느릴수록 일이 늘어요.
  - 2D 준비 15.5%, 행렬 갱신 13.5%, 인코딩 12.7%: 매 프레임 전체 순회예요.
- 목표: 정적 오브젝트의 프레임당 비용을 0에 가깝게 해서 1만 개에서 1000 FPS급, 10만 개에서 240 FPS급으로 가요. 그러려면 "전체 순회 안의 비교 생략"이 아니라 "바뀐 것만 방문"이 필요해요.
  - **A. 물리:** 알림이 쌓이는 변경 집합만 동기화해요. 오브젝트 추가·삭제·활성 변경도 알림으로 받아요. 고정 접촉 서명은 리비전으로 대체하고, 접촉 수집은 비고정 몸체만 해요.
  - **B. 그리기:** 정적 노드 방문 생략(변환·머테리얼·가시성 리비전), 호스트 쪽 공간 컬링
  - **C. 행렬:** 변경된 하위 트리만 갱신
  - **D. 2D 정렬:** 변경 시에만 재정렬
  - **E. 게임 서비스:** 컴포넌트 종류별 등록 목록으로 순회
