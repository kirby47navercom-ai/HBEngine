# PlayerLoopSystem 개별 필드 읽기 025

2026-10-06. [024](FRAME_ORDER_ANALYSIS_024.md)의 후속으로 Unity6000.0의 자체 필드5개 선언·Description 전체를 새로 읽었어요. 본문 이미지0개이며 연결된 owner/함수/기본 시스템·delegate 타입은 별도 대상이에요. 원문/본문SHA와읽기범위는 `native/build/frame-order-docs-20261006/manifest.json`에 고정해요. 원장전체gate나독립검증을완료로올리지않아요.

| 개별 API | 선언 자료형 | 출처의 계약과 HB 대조 |
| --- | --- | --- |
| [loopConditionFunction](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem-loopConditionFunction.html) | IntPtr | 네이티브 반복 조건이에요. GetDefaultPlayerLoop에서 얻은 유효값을 복사해야 해요. 이 값을 JSON으로 만든 임의 포인터나 C++ 사용자 함수 주소로 치환하는 기능이 아니에요. |
| [subSystemList](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem-subSystemList.html) | PlayerLoopSystem[] | 부모 시스템에 속한 하위 실행 트리예요. HB의 객체 목록/아웃라이너 부모 관계와 같은 개념으로 합치면 실행 의존성과 장면 부모 수명이 혼동돼요. 실행 트리와 장면 트리를 각각 표현해야 해요. |
| [type](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem-type.html) | Type | 순회·조회·프로파일러 식별에 쓰며 사용자 시스템도 식별 타입이 필요해요. 빈 클래스도 가능하고 기본 struct들은 UnityEngine.PlayerLoop에 있어요. HB에서는 안정된 시스템 ID와 사람이 읽을 이름을 함께 유지할 설계 근거예요. |
| [updateDelegate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem-updateDelegate.html) | UpdateFunction | 사용자 관리 업데이트 delegate예요. 타입 이름만 보고 인수/반환·비동기·스레드 권한을 확정하지 않아요. 연결된 delegate 타입의 자체 선언을 추가로 읽어야 해요. |
| [updateFunction](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/LowLevel.PlayerLoopSystem-updateFunction.html) | IntPtr | 기본 네이티브 시스템 함수이며 기본 트리에서 유효값을 복사해야 해요. 관리 delegate와 저장·수명·호출 경계가 달라요. |

이 표의 HB 열은 설계 판단이에요. 현재 엔진에 임의 업데이트 트리/네이티브 함수 포인터 편집 기능이 구현됐다는 뜻이 아니에요. 기존448a9b5의모듈응답대기최적화도이전체트리교체기능과구분해요. 다음 연결은 UpdateFunction delegate, UnityEngine.PlayerLoop 단계 struct 전체 목록, 초기화 attribute의 loadType과 실제 재개 위치예요.
