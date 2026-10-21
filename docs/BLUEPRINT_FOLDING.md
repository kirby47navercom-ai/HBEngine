# 접힌 그래프·독립 복제·노드 펼치기

노드 선택 후 우클릭의 **그래프로 접기**를 사용해요. 입력과 출력 터널은 기존 외부 연결과 열린 핀에서 만들어져요. 열린 입력의 작성 값과 단위 scale 기본값을 보존해요. 함수·매크로로 묶을 때도 같은 처리를 사용해요.

접힌 그래프는 재사용 매크로와 달리 한 호출 노드가 내부 그래프를 소유해요. 복사·복제하면 내부 노드·하위 접힌 그래프·주석의 ID도 독립적으로 복사해요. My Blueprint의 그래프 목록에서 찾거나 노드를 더블클릭해서 내부를 열어요. 일반 매크로 호출 목록에는 나타나지 않아요. 다른 문서로 붙일 때는 소유한 접힌 그래프도 전달해요. 참조하는 외부 함수·변수는 대상 문서의 기존 검증 규칙을 따라야 해요.

우클릭의 **노드 펼치기**는 접힌 그래프·함수·매크로 호출을 현재 그래프의 노드와 연결로 바꿔요. 접힌 그래프의 사용하지 않는 소유 정의는 제거하고, 재사용 함수·매크로의 정의는 유지해요. 입력값·구조체 분할·배열 터널을 보존하려고 필요한 곳에는 기존 형식 reroute를 사용해요. 입력 터널의 다중 실행 진입과 출력 터널의 지연 실행도 기존 VM에서 처리해요. 내부 주석과 데이터 관찰을 이동하고, 잘못된 펼치기는 문서를 변경하지 않아요.

입출력 터널의 속성에서는 실행 핀도 추가·삭제할 수 있어요. 일반 함수는 방향마다 실행 핀 하나, 순수 함수는 실행 핀 없음이라는 기존 제약을 따라요. 매크로·접힌 그래프의 실행 핀이 없는 구성은 순수 데이터 계산으로 처리해요. 순수 함수·매크로·접힌 그래프는 노드 미리보기와 게임 실행이 같은 기본값·분할 입력을 읽어요.

## AI 명령

기존 document.get의 revision을 사용해요. 사람 UI와 같은 모델 함수·Undo·저장·충돌 검사를 거쳐요.

    {"method":"blueprint.collapse","params":{"path":"Assets/BP_Player.hbblueprint.json","expectedRevision":"...","view":"event","nodes":["Move","Print"],"kind":"graph","name":"MoveAndPrint","dryRun":true}}
    {"method":"blueprint.expand","params":{"path":"Assets/BP_Player.hbblueprint.json","expectedRevision":"...","view":"event","node":"callNodeId"}}

kind는 graph/function/macro, view는 event/construction/정의 ID예요. dryRun은 문서와 revision을 변경하지 않아요. raw JSON Patch로 접힌 정의를 두 호출이 공유하도록 만들면 거절해요.

## 범위와 검증

[Epic Nodes의 Collapsed Graphs·Tunnels·Collapse·Expand 본문](https://dev.epicgames.com/documentation/unreal-engine/nodes-in-unreal-engine?lang=en-US)과 [Collapsing Graphs 4.27의 그래프·함수·매크로·Expand 설명](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs?application_version=4.27)을 대조했어요. 해당 본문 기준이며 연결된 API 전체를 분석했다는 주장은 아니에요.

현재 저장 표현은 기존 매크로 정의에 collapsed 소유 플래그를 추가해요. 기존 파일은 그대로 읽어요. 실행기와 패키지는 기존 매크로/함수 VM을 재사용해요. 별도 해석기·네이티브 렌더 패스·백그라운드 프로세스를 추가하지 않아요.

Timeline은 기존 Event Graph 전용 규칙을 유지해요. wildcard 핀은 형식을 지정한 뒤 펼쳐야 해요. 사용자 정의 struct/enum과 Set Members의 전체 제작은 별도 원장 항목으로 남아 있어요. 매크로·함수 호출의 모든 외부 라이브러리 참조를 다른 문서에 자동 이식하는 기능은 이 작업의 범위가 아니에요.

검사는 check-blueprint-folding-1228.mjs의 모델·순수 미리보기·지연 VM·중첩 Transform·복제·관찰, check-blueprint-folding-1229-window.mjs의 실제 우클릭·내부 편집·실행 핀·Undo·AI revision·실행, check-blueprint-folding-1230-player.mjs의 설치본 빌더와 Windows 게임을 사용해요. 실제 통과·설치 여부는 최신 작업·설치 원장을 기준으로 해요.
