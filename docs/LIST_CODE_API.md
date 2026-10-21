# 게임 코드에서 목록과 트리 옮기기

`hb::UI`의 함수와 같은 이름의 블루프린트 노드가 공용 위젯 런타임을 호출해요.

| C++ 함수 | 노드 ID | 작업 |
|---|---|---|
| GetListItems | uiGetListItems | 최신 처리된 위젯 데이터 JSON 조회 |
| MoveListItems | uiMoveListItems | 같은 평면 목록에서 인덱스 묶음 이동 |
| ReparentTreeItems | uiReparentTreeItems | 같은 트리에서 ID 묶음의 부모 변경 |
| TransferListItems | uiTransferListItems | 같은 소유자의 다른 인스턴스·목록으로 이동 |
| TransferTreeItems | uiTransferTreeItems | 다른 트리 부모 아래로 가지 이동 |

```cpp
hb::UI::MoveListItems(this,"HUD","Inventory",{0,2},5);
hb::UI::ReparentTreeItems(this,"HUD","Equipment",{"sword"},"weapons",0);
hb::UI::TransferTreeItems(this,"HUD","Equipment",{"weapons"},
    "Storage","Tree","root",0);
```

UI를 `Show`한 뒤 표시된 목록에 사용해요. 명시적인 게임 코드 호출은 마우스 재정렬 옵션·드래그 그룹과 독립적으로 동작해요. 평면 목록은 원래 배열 경계 인덱스, 트리는 지정 부모의 원래 자식 배열 경계 인덱스를 사용해요. 빈 부모 문자열은 루트예요. 부모와 자식을 함께 지정해도 가지는 한 번만 이동해요. 같은 목록으로 transfer하면 로컬 이동과 같아요.

기존 순환·중복 ID·깊이·shape·항목 예산을 재사용하고, 두 목록의 후보 데이터를 먼저 검증한 다음 둘 다 적용한 후 이벤트를 통지해요. 선택·초점·부모 펼침·가상화 행 풀을 같은 경로로 갱신해요. `changed` 이벤트에는 `listChange`, `listPeer`, `reorderParent`, `reorderFrom`, `reorderTo`가 들어 있어요. 코드 호출에도 원본 에셋은 변하지 않아요.

C++ 쓰기는 기존 명령 큐를 따라 처리해요. 같은 C++ 함수에서 바로 읽으면 아직 처리되지 않은 쓰기를 반영하지 않으며, `GetListItems`는 마지막으로 완료된 런타임 스냅샷을 읽어요. 잘못된 음수 인덱스·목적지는 C++에서도 명령 발행 전에 거절해요. 다른 소유자·다른 종류·공유 원본 별도 뷰·표시 없는 headless 목록의 이동은 이번 API 범위 밖이에요. 임의 외부 hook의 비동기 rollback도 보장하지 않아요.
