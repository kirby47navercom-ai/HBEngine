# C++ 접근 범위와 블루프린트 연결

`HB_PROPERTY`, `HB_FUNCTION`, `HB_NODE`로 명시한 멤버는 C++의 public·protected·private 구역에서 등록할 수 있어요. 원본 소스는 그대로 두고 컴파일 사본에 `HB_ReflectionAccess` friend를 생성해요. private를 public으로 바꾸는 매크로는 사용하지 않아요. 주석·문자열 속 가짜 선언과 중괄호·세미콜론을 멤버로 판독하지 않아요.

```cpp
HB_CLASS(Blueprintable)
class Health : public hb::Actor {
private:
    HB_PROPERTY(BlueprintReadOnly) int HP=100;
    HB_FUNCTION(BlueprintCallable) void Damage(int amount);
};
```

이 클래스의 HP는 기존 클래스 기본값·인스턴스 속성 화면에서 보이고 블루프린트 Get 노드로 읽어요. BlueprintReadOnly이므로 Set 노드는 만들지 않아요. Damage는 블루프린트에서 호출할 수 있어요. 어노테이션 없는 비공개 멤버는 노드나 메타데이터에 추가하지 않아요. 일반 사용자 C++가 `object.HP`에 직접 접근하면 원래의 접근 오류가 유지돼요.

이름 있는 namespace와 private 중첩 클래스, protected/private의 HB_ENUM 타입·배열·함수 인자·반환·이벤트를 같은 연결 경로로 다뤄요. 원래 C++ 함수 포인터에서 정확한 인자 타입을 구해 const 참조·출력 참조·double 배열의 정밀도를 보존해요. 엔진·표준 표현과 일치하는 값 전달 문자열·배열은 이미 복호화한 임시 값을 이동해서 전달해요. 참조와 사용자 정의 표현, 구조체는 기존 전달 경로를 유지해요. 생성된 접근자는 인라인 코드이고 상시 worker·타이머·영구 색인을 추가하지 않아요.

기존 상태 복구·CPP 이벤트의 기본 구현/블루프린트 재정의·Component 소유 Actor·sourceReference 저장·모바일용 분리 모듈에도 적용돼요. 클래스의 C++ 정규 이름이나 namespace가 바뀌면 실행 중 코드 재적용을 거부하고 다시 실행하도록 해요. C++ 접근 범위와 블루프린트 함수의 호출 권한은 별개예요. 이 기능을 BP Public/Protected/Private 호출 권한이나 Unreal의 BlueprintProtected self-only 규칙 구현으로 해석하지 않아요.

## AI의 작은 조회

`native.classes.read`는 열린 블루프린트의 파생 메타데이터를 읽어요. `name`이 없으면 클래스 이름·정규 이름·namespace·부모·멤버 개수를, 이름을 주면 멤버 페이지를 반환해요. `kind=all/property/function`, `offset=0`, `limit=32`가 기본이고 최대128이에요. 속성/함수마다 `cppAccess`와 핀 자료형을 제공하고 큰 기본값·C++ 소스·구조체 테이블은 복제하지 않아요. 반환 값을 에셋 원본에 덮어쓰지 않아요. enum·record 상세는 기존 `native.enums.read`, `native.structs.read`로 좁혀 읽어요.

`hb context "C++ 접근 범위" --symbol nativeAccess`는 생성 접근자 소유자, `nativeClassScopes`는 선언 범위 판독, `inspectNativeClasses`는 페이지 조회로 바로 안내해요. 일반 C++ 전처리·타입 별칭 추론·임의 템플릿 반사·final 클래스 프록시·사용자 클래스끼리의 일반 상속·rvalue 참조 핀 전체를 구현했다는 뜻은 아니에요.

## 참고한 범위

- [Unreal5.7 Functions](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine?application_version=5.7): 함수 접근·순수/실행·인자·편집·호출 본문을 읽었어요.
- [Unreal5.7 Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine?application_version=5.7): struct·function·property 구역을 읽었어요. BlueprintProtected와 C++ 접근 제어를 분리해요.
- [Unreal5.8 FBlueprintMetadata](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/BlueprintGraph/FBlueprintMetadata?lang=en-US): 실제 반환된5.8 API 페이지의 AllowPrivateAccess·Private·Protected·PropertyGet/Set 항목을 읽었어요. 접근되지 않은5.7 API 본문으로 계산하지 않아요.
- [Unity6000.0 SerializeField](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SerializeField.html): private 필드의 명시적 직렬화 설명과 예제를 읽었어요. Unity 직렬화나 Unreal 반사 전체의 복제를 주장하지 않아요.
