# 실행 중 메시 렌더러 속성

블루프린트의 컴포넌트 속성 노드와 C++ `hb::Components`는 같은 실행 서비스를 사용해요. 반사·라이트맵 혼합, 간접광 강도, 그림자 생성·받기, 모션 벡터는 다른 시각 속성 변경이 없으면 기존 그룹·메시·UV·라이트맵 페이지·재질을 유지해요. 값만 바꿔도 되는 다섯 속성 때문에 모델과 베이크를 다시 읽지 않아요.

```cpp
auto* actor = hb::Scene::FindActorById("Receiver");
hb::Components::SetFloat(actor, "MeshRenderer", "lightmapIntensity", 0.5f);
hb::Components::SetBool(actor, "MeshRenderer", "castShadow", false);
hb::Components::SetBool(actor, "MeshRenderer", "receiveShadow", false);
hb::Components::SetString(actor, "MeshRenderer", "motionVectors", "camera");
```

공용 속성 스키마의 범위·자료형·열거형 검사를 그대로 거쳐요. 메시·머테리얼 경로 등 다른 시각 데이터가 함께 바뀌었거나 에셋 리비전 표식이 있으면 기존 재구축으로 돌아가요. 모델 자체의 그림자 오버라이드와 스프라이트 처리를 보존해요. 처음 모델/베이크를 준비하거나 재질을 비동기로 교체하는 중에 수정한 값도 준비 뒤 최신 값으로 반영해요. 매 프레임에 추가 서명 직렬화를 넣지 않아요.

실시간 GI가 베이크를 끄는 동안 요청 강도를 바꿔도 실제 라이트맵 강도는0이에요. GI를 끄면 가장 최근 요청 강도로 돌아와요. 기하가 변경되어 베이크가 무효일 때도0을 유지해요. 강도가 이미0인 상태에서 GI를 켜도 source 상태를 갱신해요.

기존 `gameplayDebug.lightmap`의 `requestedIntensity`, `effectiveIntensity`로 요청/실제 강도를 구분하고 `inPlacePropertyUpdates`로 그룹을 유지한 변경 횟수를 확인해요. 혼합만의 `inPlaceMixUpdates`와 기존 JSON/저장/Undo/Stop 복원 계약도 유지해요. 이는 실행 상태 진단이며 주인님의 편집 값은 Stop으로 복원돼요.

`check-mesh-renderer-1621.mjs`는 실제 sceneRendering의 지연 에셋 준비, 인코딩된 라이트맵 페이지, GI 전환, 그림자 오버라이드, 모션 열거형, 데이터·GPU 자원 소유 동일성, 잘못된 값과 재구축 복귀를 확인해요. 실제 창·컴파일된 C++·Windows 게임은 `check-mesh-renderer-1620-editor.mjs`의 최종 설치 검사에서 확인해요. 임의의 모든 컴포넌트가 재구축 없이 바뀐다는 주장은 아니에요.
