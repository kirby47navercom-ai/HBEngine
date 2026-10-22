# 사용자 타입·데이터 에셋 대조 — 부분 읽기

2026-10-22. 전용 타입 에셋과 공용 C++/BP 타입 제작 경로를 확장하려고 현재 코드를 읽었다. 아래 페이지의 표시된 본문만 읽었으며 연결 API 전체나 두 엔진 전체 분석을 완료한 기록이 아니다.

- [UE5.8 Struct Variables](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-struct-variables-in-unreal-engine): 반환 본문0–97. 사용자 구조체를 콘텐츠에서 만들고 기본값을 편집해 변수 타입으로 사용하며 Split/Make/Break/Set Members로 접근한다.
- [UE5.8 Structs](https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine): 반환 본문0–57. C++ 선언·필드 메타데이터·BlueprintType과 Make/Break 조건을 읽었다. HB_STRUCT는 HB의 독자 API이며 UE 매크로를 가져오지 않는다.
- [Unity6.0 ScriptableObject](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ScriptableObject.html): HTML 본문126–148,208–212 중심. 컴포넌트와 독립된 공유 데이터 에셋, 메뉴 생성·Inspector 편집·참조와 저장 구분을 읽었다.
- [Unity6.0 Serialization rules](https://docs.unity3d.com/6000.0/Documentation/Manual/script-serialization-rules.html): 반환 본문126–208. 직렬화 필드와 값·객체 참조, 공유/순환/다형성의 차이를 읽었다. HB의 값 record와 Actor ID 참조는 독자 실행 계약을 유지한다.

현재 HB는 C++ HB_ENUM/HB_STRUCT, 기본값·배열·Make/Break/Set Members·Actor 참조·C++ codec과 BP 값을 지원한다. 전용 enum/struct 에셋 종류는 없다. 런타임 타입 정의 조회가 선형이며 필드/참조 계획이 선언 객체 하나만 키로 삼는 부분을 확인했다. 원본 선언 묶음이 다른 경우의 자식 스키마/참조 오염을 이전 Git 코드로 재현하고 snapshot 전용 약한 색인과 묶음별 계획으로 수정했다. [실행 색인 범위](../NATIVE_TYPE_SNAPSHOT_INDEX.md).

전용 에셋은 생성 메뉴만 추가해서 끝낼 수 없다. 안정적인 타입/항목/필드 ID, 기본값·배열·참조 규칙, C++ 헤더/codec과 동일 schema, 순환·중복·삭제·이름 변경, BP 타입 선택/핀/값, 문서 transaction·Undo/저장, Play·패키징까지 같은 선언을 사용해야 한다. 이 제작 흐름과 스키마 마이그레이션은 아직 구현하지 않은 후속이다. 색인 개선을 전역 타입 registry나 전용 에셋 완료로 계산하지 않는다.
