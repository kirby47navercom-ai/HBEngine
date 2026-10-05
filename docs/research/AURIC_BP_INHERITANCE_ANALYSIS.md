# Auric P0-3: BP 상속·인스턴스 재정의 분석

2026-10-06. 원본 엔진 개선 요청 P0-3의 구체 계약을 준비하는 추가 읽기예요. 아래 본문과 코드 대조 범위만 인정하고 전체 corpus/API gate는 승격하지 않아요. 기능 구현과 실제 실행 검증은 별도로 기록해요.

## 읽은 공식 본문

| 출처·기준본 | 읽은 계약 | HBEngine 대응 |
| --- | --- | --- |
| [Unreal Blueprint Class, 5.8 표시](https://dev.epicgames.com/documentation/unreal-engine/blueprint-class-assets-in-unreal-engine?lang=en-US) | Parent Classes·Data-Only Blueprint: BP를 부모로 선택하고 그래프·변수·컴포넌트를 상속; 자식에서 특화 | 자식 파일에 부모 BP 경로를 저장하고 실행·편집 시 부모부터 해석. C++ 부모는 최상위 선언에서 상속 |
| [Unreal Blueprint Variables, 5.8 표시](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-variables-in-unreal-engine) | Instance Editable·Private·Class Defaults·Get/Set와 Ctrl/Alt drag. 기본값과 배치 인스턴스 값은 구별 | ID가 유지되는 상속 변수. 공개 인스턴스 값은 scene overrides에 저장. 클래스 값 수정과 오브젝트 값 수정이 다른 문서에 기록 |
| [Unreal Add Function Override, BP API](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/BlueprintEditor/AddFunctionOverride?lang=en-US) | 부모 시그니처를 상속한 함수 그래프·부모 호출 노드 생성, 이미 있으면 재사용, 이벤트로 재정의했으면 충돌 | 재정의 함수 입력/출력의 자료형을 보존. 부모 호출은 실제 부모 구현을 실행하며 자식 구현을 다시 부르지 않음 |
| [Unity Prefab Variants, 6000.0](https://docs.unity3d.com/6000.0/Documentation/Manual/PrefabVariants.html) | 부모 variant도 가능; 자식값이 부모값보다 우선; 계층과 override 확인·Revert/Apply | 상속 계층과 재정의 출처 표시. 덮어쓰지 않은 값은 부모 변경을 따라가고 명시적인 재정의는 유지 |
| [Unity Prefab Instance Overrides, 6000.0](https://docs.unity3d.com/6000.0/Documentation/Manual/PrefabInstanceOverrides.html) | 속성·컴포넌트·자식 오브젝트 재정의. 굵은 속성·왼쪽 선·추가 표시. 명시적 재정의는 값이 같아도 유지. root 배치 Transform은 별도. 전체/선택/개별 Revert·Apply | 굵은 속성·기본값 되돌리기, 원본값과 유효값 조회, 오브젝트 override 삭제로 부모값 복구. 배치 위치를 클래스 기본 위치로 덮어쓰지 않음 |

이 페이지들의 연결 문서 전체, 매뉴얼/API 전체, 이미지 전체를 읽었다는 기록은 아니에요. 검색에서 발견한 별도 API·커뮤니티 자료는 구현의 확인된 본문 근거로 계산하지 않아요.

## 현재 코드에서 확인한 결손

- `blueprint-model.js`는 parentClass를 내장/C++ 이름만 허용해 BP 경로를 받아들이지 않아요. 변수·함수의 참조와 핀 검증은 현재 root 안의 선언을 기준으로 해요.
- `asset-documents.js`의 loadSceneBindings는 BP 하나만 읽고 부모를 해석하지 않아요. C++를 가진 부모를 상속하는 자식은 같은 source/build를 재사용해야 해요.
- `play-world.js`는 매번 nativeProperties를 BP nativeDefaults로 바꿔서 배치 인스턴스의 값을 잃어요. defaults → 자식 defaults → 명시적 scene overrides 순서가 필요해요.
- `scene-components.js`는 BP 컴포넌트 설치 때 기존 값과 blueprintSources 기본값을 비교해요. ID와 재정의 출처를 보존하고 inherited 컴포넌트를 잘못 중복 설치하지 않아야 해요.
- BlueprintRuntime의 frame/callDefinition/emit은 현재 root 그래프만 실행해요. 부모 호출에 부모 그래프·시그니처·수명(scope)·인스턴스 변수 저장소를 연결하고, 재정의하지 않은 이벤트는 부모 구현을 상속해야 해요.

## 구현·검증 계약

1. 저장되는 부모는 BP 경로 또는 내장/C++ 이름이에요. 경로를 정규화해 순환/없는 부모/다른 종류 에셋/과도한 깊이를 거부하고 rename redirect와 에셋 참조 수정에 연결해요.
2. 부모 선언의 안정적인 ID를 유지하며 컴포넌트·변수·함수·이벤트·C++ 부모를 해석해요. 임의로 코드를 자식에 복사하지 않아요. 부모 수정 뒤 다시 해석한 유효값과 명시적 재정의 값이 구분돼요.
3. 부모 구현 호출은 현재 인스턴스·변수·인자·scope를 사용해요. 부모→자식 순서를 실제 trace로 검사하고 중단점/잠재 작업·오류 경계를 검증해요.
4. scene overrides는 타입 검사를 거친 명시적 값만 저장하고 기본값 되돌리기는 해당 키를 삭제해요. 0/false/빈 문자열을 없는 값으로 처리하지 않아요. 이전 파일의 nativeProperties도 호환해요.
5. 사람의 Details와 AI 변경은 같은 문서/Undo/revision/검증 함수를 사용해요. 부모값 수정과 인스턴스 수정은 해당 문서만 dirty로 만들어요.
6. Auric 격리 프로젝트의 EnemyStats → BP_Enemy → BP_Skeleton 3개 중 하나만 MaxHp10, 부모 Speed 변경의 전파, 부모 이벤트 호출 순서를 편집기·Game.exe에서 검증해요. Android/AOT도 같은 resolver를 사용하고 기존 원본 checker9개를 다시 검사해요.
