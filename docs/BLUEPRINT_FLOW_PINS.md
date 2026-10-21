# 실행 출력과 핀 기본값

Sequence·MultiGate·Switch Int/String은 노드 아래의 **핀 추가**, 출력 핀의 **우클릭 → 출력 핀 삭제**, 오른쪽 **실행 출력**에서 편집한다. Switch의 **기본 출력**을 끄면 일치하지 않는 입력은 실행을 내보내지 않는다. 삭제한 핀의 연결과 그 그래프의 관찰 항목만 제거하며 나머지 출력 ID는 바꾸지 않는다. Sequence/MultiGate는 최소 한 출력을 유지한다. 이벤트당 실행량 10000 보호는 그대로 적용한다.

Sequence는 화면 순서대로 각 출력을 실행한다. MultiGate는 모든 출력의 순차·무작위·반복·시작 인덱스·Reset을 적용한다. Switch의 비교값은 기존처럼 입력값에서 편집한다. Gate의 Start Closed는 처음 진입할 때의 상태이며 Open/Close/Toggle 입력으로 바꿀 수 있다. 실행 입력에는 여러 경로를 합칠 수 있다. 값 입력은 한 원본, 실행 출력은 한 다음 경로를 유지한다. 변수 Set을 합쳐진 실행 입력 앞에 넣으면 모든 선행 경로를 Setter로 옮긴다. 이전 문서는 기존 first/second·out0/out1/out2 ID와 실행 상태를 읽는다.

크기 지정·트랜스폼 만들기·UI 크기·2D 뼈 크기의 새 핀 기본값은 단위 크기다. 명시적으로 저장한 값은 우선한다. 구조체를 여러 단계로 나누어 편집한 값은 합칠 때도 보존하며 편집기 미리보기와 게임 VM이 같은 필드 기본값을 읽는다. 분할·합치기의 기존 연결은 이전과 같이 제거하므로 새 필드에 다시 연결한다.

데이터 핀의 **변수로 만들기**는 입력에서 Get, 출력에서 Set 노드를 만들어 연결한다. 입력 리터럴과 자료형/배열을 보존한다. 출력 소유 노드의 실행 출력이 하나이면 Set을 기존 실행 흐름 사이에 넣어 다음 연결을 유지한다. 순수 노드나 여러 실행 분기가 있는 출력은 Set의 데이터만 연결하며 실행 시점은 사용자가 연결한다.

C++ 공개 함수의 `Vec2{…}`, `Vec3{…}`, `Transform{…}`, 벡터 배열과 이스케이프된 문자열 기본값은 리터럴로 읽어 핀에 전달한다. C++ 임의 표현식을 JavaScript로 실행하지 않는다. 자료형에 맞지 않는 기본값은 거부한다. 노드의 편의 기본값이 C++ 함수의 필수 인자를 자동으로 생략한다는 뜻은 아니다.

AI는 같은 JSON 문서를 `document.get` → revision을 지정한 `document.patch` 또는 파일 transaction으로 수정한다. 선택 항목은 `flowOutputs: ["first","second","then3"]` 또는 `["out0","out2","out3"]`, Switch 기본 출력은 `flowHasDefault`다. Switch 비교 입력 ID는 출력 `out3`에 대해 `case3`이다. 추가·삭제 시 연결/관찰도 같은 transaction에 넣는다. `prototype/flow-pins.js`의 순수 함수를 사용하면 사람의 편집과 같은 규칙으로 문서를 만들 수 있다. 최종 에셋 검증 전에는 원문을 변경하지 않는다.

공식 대조: [Unreal Flow Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/flow-control-in-unreal-engine)의 Switch 편집·MultiGate·Sequence·Gate, [Struct Variables](https://dev.epicgames.com/documentation/en-us/unreal-engine/struct-variables-in-blueprints?application_version=4.27)의 중첩·분할/재결합 구역을 읽었다. HB는 기존 에셋 연결을 보존하기 위해 핀 ID를 재번호하지 않는다. 이 특정 구역의 대조를 전체 Unreal·Unity 문서 분석 완료로 계산하지 않는다.

실행 입력 합류는 [역사적 Epic Wiki 예제](https://ue4wiki.imzlp.com/mediawikiv2-website-prod05.ol.epicgames.net/index6b14.html?title=Blueprint_Spotlight_On/Off_Switch_Tutorial)의 명시적인 fan-in 설명과 대조했다. 현재 공식 [Nodes](https://dev.epicgames.com/documentation/en-us/unreal-engine/nodes-in-unreal-engine)의 Promote to Variable 설명도 대조했다.
