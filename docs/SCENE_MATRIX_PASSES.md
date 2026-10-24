# 깊은 계층의 공용 월드 변환

공용 JS `sceneWorldMatrix`와 C++ `bridgeToWorld/bridgeFromWorld`의 재귀·64단계 제한을 반복 계산으로 바꿨어요. 부모 순환은 계속 거절하고, 기존 위치·회전·비균일/음수 배율의 계산 순서를 유지해요. 공용 VM/BP `getWorldPosition/setWorldPosition`과 C++ `Scene::GetWorldPosition/SetWorldPosition`이 이 경로를 사용해요. 극단적인 합성 배율로 수치가 유한 범위를 벗어나면 명시적으로 실패해요. JS 월드 위치 설정은 부모 역행렬이 특이하거나 결과가 유한하지 않으면 이전 로컬 위치를 보존해요.

여러 오브젝트를 같은 동기 읽기 구간에서 계산할 때는 `sceneMatrixCache(objects)`를 만들고 `sceneWorldMatrix(object,objects,cache)` 또는 `sceneWorldPosition(object,objects,cache)`에 전달해요. 부모 ID 인덱스는 부모가 실제 필요할 때 한 번 만들어요. 부모별 행렬도 공유하며 루트만 읽는 구간에는 부모 인덱스를 만들지 않아요. 반환 행렬은 캐시와 공유하므로 직접 바꿔야 하면 복제해요.

이 캐시는 명시적인 한 계산 구간용이에요. 위치·회전·배율·부모·오브젝트 정체성을 바꿨으면 새 캐시를 만들거나 `clear()`해요. 일반 `Map`을 전달하는 기존 호출은 현재 배열의 부모를 찾는 동작을 유지해요. 숨은 전역 월드 캐시나 변경 감시자는 추가하지 않아요. EQS actor index의 한 sync와 기존 접촉 검사가 이 임시 인덱스를 사용해요. EQS의 전체 mutable 월드 스캔 O(N) 자체를 제거한 것은 아니에요.

일반 계층은 이전 구현과 행렬을 직접 대조하고, 4000단계 JS 계산·512단계 공용 VM 위치 설정·실제 C++ 128단계 읽기/역변환·회전/비균일/음수 배율·순환 거절과 오류 후 복구를 확인해요. Three의 전체 장면 그래프, 모든 편집기 기즈모, 렌더러 픽셀이나 기기의 최대 깊이를 이 수치로 보증하지 않아요. 원래 JS/C++ 숫자 정밀도도 그대로예요.
