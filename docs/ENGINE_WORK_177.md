# 목록·트리 자동 내용 높이

위젯 목록/트리의 내용에 맞춘 높이(autoRows)를 켜면 실제 글자·너비·글꼴로 표시 행 높이를 측정한다. 기존 rowHeight는 최소/미측정 추정치이며 variableRows의 명시 height는 우선한다. 긴 한글/줄바꿈을 표시하고 고정/명시 높이의 넘친 글자는 행 안에서 자른다. 고정 높이 에셋은 기본 false로 유지한다.

Fenwick 누적합으로 높이 한 개 변경·좌표/표시구간 탐색을 O(log N)에 수행한다. 스크롤마다 전체 목록을 재작성하지 않고 화면 주변 버튼을 재사용한다. 너비/글꼴 변경 때 다시 측정하며 보이는 첫 행/바닥 위치를 보존한다. 위젯 종료는 observer·예약 frame·행 DOM/자료/측정 cache를 해제한다. 고정/자동 모드 전환과 늦은 종료 후 갱신도 확인한다.

ListView/TreeView에 키보드 포커스를 제공하고 비활성/실행 입력 차단을 공유한다. C++/BP UI::SetListItems로 자료 교체 후 목록 범위 밖 선택을 비우며 ListView SetValue의 잘못된 인덱스를 변경 전 거부한다. 새 노드를 늘리지 않고 기존 UI SDK·AI schema/문서 편집·Undo를 사용한다.

[CPU5군·기존171 18군·격리Win32제작/Undo·출시D3D/WebGPU게임](research/ENGINE_WORK_177.json). 실제 한글/너비/글꼴 재측정·1.5배 행 경계·키보드End/C++선택읽기/자료교체·비활성입력·트리접기와 기존 병합/Git/위젯/관절/차량/네트워크를 함께 확인했다. CPU의 100000행/10000높이변경 표본은 게임 FPS나 휴대폰 성능 수치가 아니다. 새 의존성/자동GPU회수0.

대조: [Unity6000.6 ListView](https://docs.unity.com/en-us/engine/6000.6/manual/uitoolkits/uielements/uie-element-ref/uie-uxml-element-list-view) 본문318–443의 행높이/재활용/갱신/키보드 설계를 참고했다. 연결API/미디어/전체문서를 읽은 것으로 세지 않는다. 임의 복합 위젯 행·브라우저 높이 한계를 넘는 분할 스크롤·전체 접근성은 별도 잔여다.
