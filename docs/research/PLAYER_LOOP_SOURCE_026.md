# Unity PlayerLoop 참조 소스의 구조 분석 — 026

2026-10-06. 공식 저장소의 `6000.0` 브랜치를 조회한 뒤 커밋 `0c7f0bfc4f9b21d3d84fffc9ee9001ad82f0fbc4`의 [PlayerLoop.bindings.cs](https://github.com/Unity-Technologies/UnityCsReference/blob/0c7f0bfc4f9b21d3d84fffc9ee9001ad82f0fbc4/Runtime/Export/PlayerLoop/PlayerLoop.bindings.cs)를 읽었다. 본문 440줄의 선언과 변환 코드를 확인했다. 캐시 SHA-256은 `83dd9055260436eaeec40cd6543a5c3d34f3550f0b2af8ecbe078c742d61fc32`이다. 이 파일을 읽었다는 증거와 엔진 전체 분석 완료는 별개다.

## 직접 확인한 계약

- `PlayerLoopSystem.UpdateFunction`은 인자·반환값 없는 관리형 델리게이트다. 프레임 델타를 인자로 받는다는 가정은 틀린다.
- 공개 시스템은 `type`, `subSystemList`, `updateDelegate`, `updateFunction`, `loopConditionFunction`을 가진다. 내부 표현은 하위 목록 대신 `numSubSystems`를 사용한다.
- 변환은 부모부터 배열에 기록하는 재귀 순회다. 내부 개수는 직접 자식 수가 아닌 **전체 후손 수**다. 역변환은 그 범위 끝까지 재귀적으로 읽는다.
- 기본·현재 루프 조회와 교체의 관리형 코드 끝에는 세 네이티브 호출이 있다. 실제 시스템 실행·조건·동기화는 이 C# 파일에 구현되어 있지 않다.
- `TimeUpdate`부터 `PostLateUpdate`까지 여덟 단계의 타입과 입력·2D/3D 물리·애니메이션·오디오·UI·렌더링 표지가 선언된다. 빈 구조체의 나열만으로 실제 활성 시스템, 실행 순서, 작업 스레드, 생략 조건을 증명할 수 없다.

## HBEngine 적용 판단

HBEngine의 노드·C++ 이벤트는 델타를 가진 기존 API를 유지한다. Unity의 무인자 델리게이트를 그대로 복제하지 않는다. 단계 ID와 객체 ID를 구분하고, 에디터·PC·모바일·헤드리스가 공유하는 실행 순서를 먼저 확정해야 한다. AI 편집 자료에는 네이티브 포인터 대신 안정적인 단계 ID·의존 관계를 저장해야 한다. 서로 다른 모듈의 프레임 RPC를 겹치는 현재 구현은 일반 사용자 Tick의 병렬 실행이나 Unity의 전체 PlayerLoop 교체 기능을 제공한다는 증거가 아니다.

## 남은 확인

각 표지의 문서 본문·네이티브 실행·패키지 삽입 지점과 조건을 대조해야 한다. `RequiredByNativeCode`, `MovedFrom`, 네이티브 연결 속성의 본문과 라이선스 문서는 아직 이 분석에서 읽지 않았다. 독립 검증은 수행하지 않았고, 전체 문서·API의 완료 상태를 올리지 않는다.
