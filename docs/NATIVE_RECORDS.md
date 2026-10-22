# C++ 값 구조체 제작 계약 — 1469–1482

```cpp
#include <HBEngine/Game.hpp>
#include <HBEngine/Struct.hpp>
HB_STRUCT(BlueprintType, DisplayName="피해")
struct Damage {
    HB_PROPERTY(DisplayName="수치") int Amount=42;
    HB_PROPERTY(DisplayName="방향") hb::Vec3 Direction={1,2,3};
};
HB_CLASS(Blueprintable) class CombatActor : public hb::Actor {
public:
    HB_PROPERTY(BlueprintReadWrite) Damage LastHit;
    HB_FUNCTION(BlueprintCallable) Damage Apply(Damage value, Damage& previous);
};
```

전역·이름 있는 namespace의 `HB_STRUCT` 선언을 공개 C++ 속성·입력·반환·출력 참조·배열·이벤트에 사용해요. 공용 Source 상대 헤더도 기존 include closure로 읽어요. 필드는 HB_PROPERTY로 선언한 복사 가능한 값·기존 벡터/색/Transform/HitResult·열거형·액터 포인터·다른 값 구조체·std::vector를 지원해요. 생성 코드가 JSON 변환을 담당하고 C++ 컴파일러가 실제 필드 대입과 aggregate/copy 조건을 확인해요.

## 편집과 실행

변수·함수 시그니처의 자료형 선택, 우클릭 노드 검색, Make/Break/Set Members/Select 및 자료형을 맞춘 배열 노드를 사용해요. 정규 structName을 보존하고 다른 이름의 구조체 직접 연결은 거절해요. 핀은 중첩 필드까지 분할·재결합해요. Set Members는 선택한 필드만 바꾸고 BlueprintReadOnly 필드는 쓰기 대상으로 노출하지 않아요. 변수·배열 원소·함수 입력·접힌 매크로의 참조 경로를 통해 원래 저장값을 수정해요. 임시 값은 값으로 다뤄요.

클래스 기본값·인스턴스·변수·노드 상세에서 필드별로 편집해요. 중첩 구조체 배열은 추가·삭제·위아래 이동이 가능해요. enum 이름 선택과 int BitmaskEnum 체크박스를 필드 안에서도 사용해요. 기존 Transform/HitResult 필드의 상세 값은 현재 JSON 입력을 유지해요. 자료형 변경은 새 타입의 기본값으로 초기화하며 Undo/Redo와 저장을 사용해요.

SDK의 `hb::Struct::Make<T>(...)`, `Break(value,&T::field,...)`, `SetMembers(value,source,&T::field,...)`, `WithMembers(...)`가 같은 C++ 값에 동작해요. Break는 tuple을 반환하고 WithMembers는 복사본을 반환해요. 기존 기본 구조체의 숫자 mask 오버로드도 유지해요.

시퀀스의 BP 변수·C++ 속성 바인딩과 TakeRecorder는 structName을 저장해요. 구조체 키는 step으로 재생하고 실제 바인딩의 필드·enum 범위를 확인한 뒤 전체 변경을 준비해요. 중첩 액터 참조는 현재 월드에 맞춰 self를 ID로 바꾸고 사라진 대상은 null로 처리해요. 저장 키당 기존64KiB·배열128의 제작 예산을 유지해요. 곡선으로 구조체 전체를 수치 보간하지 않아요.

실행 중 코드 재적용은 같은 구조체 필드 이름·자료형·읽기 전용 구성을 요구해요. 구현 변경은 현재 공개 값을 보존하고, 레이아웃 변경은 기존 worker를 교체하기 전에 거절해 다시 실행하도록 해요. 필드 추가/삭제/이름 변경의 자동 마이그레이션을 제공한다고 주장하지 않아요.

## 저장·AI·비용

값은 `type:"record", structName:"Namespace::Type"`와 필드 이름의 JSON 객체예요. sourceReference 에셋은 파생 struct/enum 표를 저장하지 않아요. 함수·접힌 그래프의 저장 포트에도 파생 inspection 표를 복제하지 않아요. VM 안의 검증된 선언은 읽기 전용으로 한 번 캡처해 액터들이 공유하고 각 액터의 실제 값·변수·컴포넌트 상태는 따로 소유해요. 고정 선언의 필드 핀·기본값·액터 참조 경로도 재사용해요. 새 worker/타이머/GPU 리소스를 추가하지 않아요. [상태 복구 비용](NATIVE_CHECKPOINTS.md): 기존 속성 읽기의 snapshot을 생략하고 쓰기는 수신 객체만 저장하며, 구조체 snapshot은 필요할 때 만들어요. 임의 C++ 함수의 전체 복구와 구조체 복사는 유지해요. 전체 heap/FPS 개선 수치는 측정하지 않았어요.

- `native.structs.read {path,name?,offset?,limit?}`: 기본32/최대128, 선언 요약 또는 필드 페이지. 큰 기본값 대신 종류·개수·짧은 미리보기를 제공해요.
- `native.structs.defaults.read {path,name,fieldPath?,offset?,limit?}`: 필드·배열 번호를 따라 scalar 또는 페이지를 읽어요. 구조체 전체 기본값을 중복 출력하지 않아요.
- 수정은 기존 문서 patch/CAS·Undo·save를 사용해요. 소유 코드 탐색은 `hb context "구조체" --symbol "parseNativeStructs"` 등을 사용해요.

제작 기본값은 배열128, 필드128, 정의512, 중첩16, 정의당2만 노드·2MiB 문자열, 메타데이터 전체20만 노드·8MiB 문자열 예산을 적용해요. 실행 배열은 기존 native10만 상한 및 값 검증200만 노드 예산에 맞춰요. 이 수치는 오브젝트 개수 제한이 아니에요. 구조체 기본값의 반복 확장이 메모리를 과도하게 쓰기 전에 거절해요. 값 비교는 JSON 객체 키 순서에 영향받지 않아요.

## 조사와 경계

Unreal [Structs](https://dev.epicgames.com/documentation/en-us/unreal-engine/structs-in-unreal-engine)의 값 선언, [4.27 Struct Variables in Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/struct-variables-in-blueprints?application_version=4.27)의 타입 선택·분할·Make/Break·선택 필드 쓰기를 대조했어요. Unity6000 [SerializeReference](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SerializeReference.html)의 값 직렬화와 참조 ID·다형성·순환 그래프 차이를 읽고, HB 값 구조체와 액터 ID를 분리했어요. 본문 구간은 CORPUS_MANIFEST.supplemental1469에 기록해요. Unity의 관리 참조 객체 모델을 구현했다는 뜻이 아니에요.

현재 공개 값 구조체에는 사용자 생성자·메서드·상속·static/const/reference 필드·순환 값 스키마를 넣지 않아요. 함수는 Actor/Library에 두세요. 임의 전처리·템플릿/alias/constexpr 함수 해석, 전용 struct 에셋·프로젝트 전체 타입 레지스트리, 일반 객체 identity·다형성·null 구조체, 스키마 마이그레이션과 네이티브 속성 일반 참조 쓰기는 별도 잔여예요. 모바일 공용 AOT를 호스트에서 실행한 근거와 실제 기기 실행은 구분해요.

독립 AOT 모듈은 사용자 타입뿐 아니라 생성 wrapper/checkpoint/내부 상태 타입도 번역 단위 안에서 격리해요. 동일한 클래스·정규 구조체 이름을 가진 두 모듈에 다른 기본값을 넣고 번갈아 실행하는 검사가 이 경계를 확인해요.
