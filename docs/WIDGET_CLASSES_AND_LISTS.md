# 위젯 클래스와 복합 목록

기존 `.hbwidget.json` 문서·디자이너·Undo·저장·패키징을 그대로 사용해요. 새 필드는 선택 사항이라 기존 위젯은 바뀌지 않아요. 루트 Canvas를 선택하면 위젯 클래스, 상속 요소, 슬롯, 생명주기 설정이 나오고 ListView/TreeView를 선택하면 행 위젯과 자료 바인딩이 나와요.

## 부모와 초기 표시

```json
{
  "parent": "Assets/UI/W_Base.hbwidget.json",
  "parentOverrides": {"Title": {"text": "장비", "color": "#ffd080"}},
  "parentSlots": {"Body": "Assets/UI/W_Inventory.hbwidget.json"},
  "preConstruct": {"Parent/Title": {"visible": true}},
  "lifecycle": {
    "initialized": "UI_Initialized",
    "preConstruct": "UI_PreConstruct",
    "construct": "UI_Construct",
    "destruct": "UI_Destruct"
  }
}
```

위 필드는 일반 위젯 문서의 최상위에 추가해요. 부모의 요소는 `Parent/Title`처럼 펼쳐지고 부모 원본은 수정하지 않아요. 부모 기본 이벤트는 상속하고 같은 단계에 자식 이벤트를 지정하면 대체해요. 참조·상속·행 위젯은 순환/깊이/펼친 요소 예산을 함께 검사해요.

`preConstruct`는 디자이너와 게임에서 모두 적용하는 **지역 표시 속성**이에요. 게임 콜백을 디자이너에서 실행하지 않아요. 런타임 `initialized → preConstruct` 콜백은 DOM 생성 전에, `construct`는 글꼴 준비 후에 실행해요. 기존 C++ `UI::Show`와 블루프린트 `uiShow`의 공용 실행 서비스에서 처리하며 콜백은 소유 액터의 커스텀 이벤트에 연결해요. 인자는 `widget`, `phase`, `isDesignTime=false`예요. Show를 기다린 다음 곧바로 HUD 값을 바꿀 수 있어요.

명시적 Remove와 액터 해제는 Destruct를 기다려요. 종료 시 `dispose`는 자원 정리이며 정지한 VM에서 게임 이벤트를 새로 실행하지 않아요. 중첩 시각 위젯·행 템플릿이 별도 C++ 위젯 객체를 생성하거나 디자이너에서 임의 BP/C++를 실행한다는 뜻은 아니에요.

NamedSlot의 `properties.exposeOnInstanceOnly=true`는 자식 디자이너에서 해당 슬롯 가지를 감춰요. 일반 재사용 인스턴스와 런타임 `UI::SetSlotContent`에서는 접근할 수 있고 이미 지정한 내용도 보존해요. 슬롯은 한 자식만 받아요. 할당 생략은 부모 기본 내용, `null`은 비우기예요.

## 복합 행

ListView/TreeView 요소의 properties에 지정해요.

```json
{
  "rowWidget": "Assets/UI/W_ItemRow.hbwidget.json",
  "rowBindings": "{\"Name\":{\"text\":\"name\"},\"Health\":{\"value\":\"stats.hp\"}}",
  "rowHeight": 64,
  "listItems": "[{\"name\":\"한글 검\",\"stats\":{\"hp\":0.75}}]"
}
```

자료 경로는 항목의 직접 필드, 점으로 이은 필드, `$item`, `$index`를 받아요. 요소 이름은 행 위젯 안의 이름이에요. 항목이 바뀌면 이전 항목의 값과 눌린 터치 입력을 먼저 정리하고 새 자료를 바인딩해요. 자료형이 틀리거나 필드가 없으면 저작 기본값으로 돌아가요. 아이템 전체의 DOM을 만들지 않고 보이는 행과 여분 행만 재사용해요. 행의 자원도 기존 UI 요소 예산을 사용해요.

행 안의 버튼·입력 이벤트는 기존 커스텀 이벤트 연결을 사용해요. `element`는 바깥 목록 ID이고 추가 인자는 `rowIndex`, `rowElement`, `item` JSON, `itemTruncated`예요. JSON이 10,000자를 넘으면 `item=null`, `itemTruncated=true`로 보내고 번호로 원본 자료를 찾을 수 있어요. 항목 원본을 자동으로 변경하는 양방향 바인딩은 아니에요.

논리 높이는 행 100,000개 × 4,096px도 다루고 물리 스크롤 영역은 4,000,000px 안에 둬요. 스크롤바는 전체 범위를, 휠·단일 터치는 실제 이동 거리를 사용해요. Home/End/화살표, 가변 높이 측정, 너비 변경 후 위치 보존, ARIA 위치와 선택을 유지해요. 입력칸의 편집 키와 내부 버튼의 Enter/Space는 가로채지 않아요. 실제 휴대폰·스크린리더 전체 검증을 뜻하지 않아요.

같은 문서의 같은 글꼴 URL은 FontFace 하나를 참조 계수로 공유해요. 마지막 뷰가 사라지면 해제하고 늦게 끝난 글꼴 로드가 해제된 글꼴을 다시 등록하지 않아요.

AI는 `hb context ui`, `schema --section ui`, 기존 `document.get/patch`의 revision/dryRun과 저장을 사용해요. `parent`, `parentSlots`, `rowWidget`은 콘텐츠 수집과 에셋 이름 변경에도 연결돼요.
