# BP 상속·클래스 기본값·인스턴스 값

`settings.parentClass`에 `Assets/...hbblueprint.json`을 지정하면 BP 부모를 사용해요. 에셋을 읽는 동안 부모의 컴포넌트·변수·함수·매크로·디스패처·인터페이스·이벤트/Construction 그래프와 C++ 기반 클래스를 해석해요. 읽기 경로는 에디터, Play, headless, Player가 공유해요.

## 저장과 편집

자식 파일에는 자신이 작성한 항목과 명시적 덮어쓰기만 저장해요. 부모 C++ 원문과 부모 그래프를 자식에 복사하지 않아요. `inheritance`, 해석된 부모 노드 ID, 부모 구현 함수 ID는 저장용 필드가 아니에요. 저장/생성 API는 부모까지 해석하고 자료형·참조·그래프·깊이 32·순환을 검사한 뒤 파일을 바꿔요. BP 부모도 에셋 의존성이므로 registry, reimport, redirect, cook에서 따라가요.

콘텐츠 브라우저의 에셋 만들기에서 프로젝트 BP를 부모로 선택하거나 BP 에셋 우클릭의 **자식 블루프린트 생성**을 사용해요. 자식 이벤트 그래프는 자신이 작성한 노드만 보여요. 상속 이벤트 목록의 **재정의**는 이벤트와 부모 호출을 만들고 이벤트의 자료 핀을 연결해요. 상속 함수는 부모에서 열어 보거나 **재정의**로 같은 ID/입력/반환/순수 함수 시그니처를 가진 자식 구현을 만들어요. 부모의 내부 구현을 편집 대상으로 복제하지 않아요.

상속 변수·컴포넌트의 이름/자료형/시그니처는 부모에서 수정해요. 자식에서는 기본값을 바꾸고 부모 기본값으로 되돌릴 수 있어요. 부모와 같은 값으로 명시적으로 바꿔도 덮어쓰기로 보존해요.

```json
{
  "version": 1,
  "name": "BP_Skeleton",
  "settings": {
    "parentClass": "Assets/BP_Enemy.hbblueprint.json",
    "variableDefaults": {"count": 4},
    "componentOverrides": {"sprite": {"flipX": false}},
    "nativeDefaults": {"EnemyStats.Speed": 6}
  },
  "variables": [], "components": [], "nodes": [], "edges": []
}
```

## 호출과 인스턴스

자식에서 재정의하지 않은 이벤트는 상속된 흐름을 실행해요. 재정의한 이벤트는 자식만 자동 실행하고, `Call Parent`를 연결한 지점에서 부모 흐름을 실행해요. 동일 Actor와 BP 변수 저장소·실행 수명을 사용해요. 여러 세대의 부모 호출, 함수의 인자/반환, Construction과 일반 이벤트를 구분해요. 부모 함수의 자격 있는 내부 구현 호출과 일반 함수의 재정의된 구현 호출을 구분해요.

부모 노드 ID는 출처 에셋/그래프/노드에서 만든 안정적인 ID예요. 부모 내부 중단점은 원본 부모 에셋의 노드를 열어 표시해요. 실행용 해석 그래프를 열린 에셋의 저장 데이터로 넣지 않아요.

장면 오브젝트의 `overrides: {"MaxHp": 10}`을 지원해요. 변수/속성 이름이 겹치면 `overrides.variables`의 변수 ID와 `overrides.nativeProperties`의 C++ 속성 이름으로 구분해요. 컴포넌트는 `overrides.components`의 BP 컴포넌트 ID 아래에 값을 넣어요. 세부 패널은 명시적 값을 굵게 표시하고 되돌리기를 제공해요. `0`, `false`, 빈 문자열, 빈 배열을 유지하고 배열은 인스턴스별로 복사해요. 기존 장면의 `nativeProperties`도 명시적 인스턴스 값으로 유지해요. 잘못된 속성·자료형은 실행 월드를 바꾸기 전에 거절해요.

```json
{
  "blueprintAsset": "Assets/BP_Skeleton.hbblueprint.json",
  "overrides": {
    "MaxHp": 10,
    "variables": {"count": 0},
    "components": {"sprite": {"flipX": false}}
  }
}
```

C++ 함수에는 해석된 클래스 기본값에 인스턴스 값을 적용한 Actor를 전달해요. C++ 헤더/구현과 공개 메타데이터는 기반 BP 한 곳에서 소유하고, 자식 빌드 버튼은 기반 BP의 빌드로 연결해요. 동일 소스 쌍은 실행 준비에서 한 번 빌드해요. 배치 위치를 클래스 초기값으로 덮어쓰지 않아요.

## AI와 검증

`/api/schema`의 `blueprint.inheritance.get`은 얇은 원본과 해석된 출처/기본값/그래프를 함께 반환해요. `blueprint.override.event`, `blueprint.override.function`, `blueprint.default.set/reset`, `scene.blueprint.override`는 같은 편집 헬퍼와 revision/Undo/자료형 검사를 사용해요. 변경 명령에는 `expectedRevision`을 넣어요. `dryRun`은 작성 데이터를 바꾸지 않아요.

- `npm run test:blueprint-inheritance`: 상속·여러 세대·부모 이벤트/Construction/순수 함수·값 보존/복원·디스크 순환/redirect·실제 C++ 조회.
- `npm run test:blueprint-inheritance-window`: 격리 Windows 에디터의 만들기 화면·변수 기본값·얇은 자식·세부 속성·Undo·C++ 실행/재실행·부모 중단점.
- `npm run test:blueprint-inheritance-player`: 부모/소스 의존성이 포함된 Game.exe에서 같은 값·호출 순서·위치를 세 번 대조해요.

이 계약은 BP 상속과 인스턴스 덮어쓰기에 대한 검증 범위예요. Unreal/Unity 전체 API 분석이나 누적 엔진 요구의 전체 완료로 계산하지 않아요. 근거는 [분야 분석](research/AURIC_BP_INHERITANCE_ANALYSIS.md)에 기록했어요.
