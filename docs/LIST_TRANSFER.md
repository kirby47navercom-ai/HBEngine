# 트리 재부모화와 목록 간 이동

ListView와 TreeView의 상세 패널에서 **항목 이동 허용**을 켜요. 다른 목록과 이동하려면 두 목록에 같은 **목록 이동 그룹**을 지정해요. 빈 그룹은 내부 이동만 허용하고, ListView끼리 또는 TreeView끼리 이동해요.

트리 행의 위·아래쪽은 형제 사이 삽입, 가운데는 해당 항목의 자식으로 삽입해요. 목록의 빈 공간에 놓으면 최상위 끝으로 이동해요. 선 또는 테두리로 삽입 위치를 표시해요. 선택한 부모와 자식이 함께 있으면 가지를 한 번만 이동해요. 접힌 자식도 보존하며 트리 ID를 다시 만들지 않아요.

Alt+위/아래는 같은 부모의 선택 묶음을 이동해요. Alt+오른쪽은 앞선 형제 안으로 들여쓰고, Alt+왼쪽은 부모 다음으로 내어써요. 이동 가능한 트리에 초점이 있을 때 이 키를 에디터의 뒤로/앞으로 탐색이 가로채지 않아요. 입력칸의 편집 키는 기존대로 분리해요.

자기 하위로 넣는 순환, 대상에 이미 있는 ID, 최대 계층/항목 수 초과, 서로 다른 그룹·종류, 같은 원본 배열을 공유하는 별도 뷰의 이동은 거부해요. 자료 교체·이동 비활성·선택 모드 변경·뷰 종료 중인 드래그도 취소해요. 드래그 중 DataTransfer의 문자열을 신뢰해서 항목을 만들지 않아요. 같은 문서에서 시작한 살아 있는 목록 참조만 사용해요.

목록 사이의 이동은 두 실행 인스턴스의 JSON을 먼저 검증하고, 두 원본과 가상 행을 모두 변경한 뒤 이벤트를 보내요. 대상이 거부하면 원본도 바뀌지 않아요. 평면 목록은 중복 원시 값과 객체 참조의 순서를 보존하고, 트리는 바뀐 조상 경로만 복사해요. 기존 행 풀을 사용하며 외부 원본 에셋은 수정하지 않아요. 편집 순간의 JSON 직렬화·검증·레이아웃 재계산 비용은 여전히 있어요. 별도 폴링·워커·문서 전역 이벤트 리스너는 추가하지 않았어요.

Changed 이벤트의 `listChange`는 `reparented`, `transferIn`, `transferOut`을 포함해요. `listPeer`는 상대 목록의 ID, `reorderParent`는 삽입 부모 ID예요. 기존 선택 JSON과 이벤트 크기 제한을 유지해요. 사람의 위젯 상세 패널과 AI의 문서 수정은 같은 `reorderable:boolean`, `transferGroup:string` 속성 검증을 사용해요. 여러 에셋의 제작 변경은 기존 문서 transaction/revision/dryRun을 사용해요.

JavaScript 제작 확장은 `list-transfer.js`의 순수 자료 연산과 `createVirtualList().reparent(keys,parent,destination)`를 사용할 수 있어요. 새 전용 C++/블루프린트 이동 함수는 아직 추가하지 않았어요. 기존 UI::Show·SetListItems·SetValue와 소유자 이벤트 경로는 유지해요.

1274는 경로 복사·원본 불변·중복·순환·깊이·삽입 경계·키보드 목적지·선택 대응·속성을 검사해요. 1275는 격리된 실제 편집기에서 상세 설정/Undo, 공용 WidgetSystem·가상 행의 합성 HTML 드래그, 거부의 원자성·교체 중 취소·VM 이벤트·자원 해제를 확인해요. 기존1080의 10만 선택·행 풀8·기존 순서/복합 행 입력 검사도 같은 창에서 함께 확인해요. 설치본의 D3D11 게임은 기존 블루프린트 UI 표시로 생성한 UI를 실제 실행해 이동 결과를 확인해요. 합성 HTML 드래그는 OS 마우스 드래그·실기기 터치·게임 FPS 측정으로 계산하지 않아요.

터치 재정렬, 외부 창/종류가 다른 목록·공유 원본 뷰의 전송, 전용 C++/BP 명령과 임의 외부 비동기 콜백의 롤백은 잔여 범위예요.

공식 본문 대조 범위:

- [Unity 6.0 TreeView](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-uxml-element-TreeView.html): 자료의 ID/인덱스·재활용·선택, drag 시작/갱신/수락과 reorderable의 역할을 읽었어요. HB의 그룹·원자 적용·키보드 계약은 자체 규칙이에요. 연결된 API와 외부 창 예제 전체를 읽거나 구현한 것으로 세지 않아요.
- [Unreal 5.8 Drag and Drop UI](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-drag-and-drop-ui-in-unreal-engine): 위젯 참조를 실은 드래그와 수신 측 OnDrop의 역할을 대조했어요. 임의 위젯 재배치·DragDropOperation 상속 체계 전체의 구현은 아니에요.
