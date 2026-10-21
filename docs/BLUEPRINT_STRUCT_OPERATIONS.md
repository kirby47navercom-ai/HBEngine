# 구조체 제작·선택 수정·분기

Vector2/Vector3/Color/Transform/HitResult의 `makeStruct`, `breakStruct`, `setMembers`는 `valueType`과 공용 필드 정의를 사용해요. 핀 우클릭의 Make/Break/Set Members, 한·영 노드 검색, 상세 속성, AI 명령이 같은 자료형·연결 검증을 거쳐요. 기존 Make Vector/Transform 노드도 유지해요.

Set Members의 상세 속성에서 필드를 켜면 입력 핀이 생겨요. 끈 필드는 원래 값을 유지해요. 다이아몬드 Struct 핀에 변수, 중첩 분할 필드, Reroute, 배열 원소, 함수·매크로 입력을 연결하면 저장된 원본에 반영해요. 계산으로 만든 임시 값은 결과 사본을 출력해요. 배열 인덱스는 값을 읽은 시점에 고정하므로 무작위 인덱스를 다시 계산해 다른 원소에 쓰지 않아요. 함수 입력의 후속 읽기도 현재 값을 읽어요. 임의 C++ 속성이나 함수 반환의 원본까지 추적하는 기능은 포함하지 않아요.

Break 노드는 출력별 표시와 연결된 핀만 보기를 지원해요. 숨김·자료형 변경 시 사라진 핀의 연결·기본값·분할·관찰만 정리해요. 실행 연결은 보존해요. 상속 부모 노드의 직접 수정은 거절해요. 잘못된 설정은 적용 전에 거절하고 Undo·revision·dryRun을 공유해요.

`selectValue`는 기존 10개 자료형과 각 배열을 지원해요. `condition=true`는 A, false는 B를 선택해요. 새 Switch Int/String/Name은 Default 출력에서 시작해요. 상세 속성에서 비교값을 편집하고 분기를 추가·삭제·위아래 이동할 수 있어요. 연결은 출력 ID를 따라 유지돼요. Name은 ASCII 영문 대소문자를 구분하지 않고, String의 기본값은 구분이에요. String은 구분 옵션을 끌 수 있어요. 별도 Name 자료형이나 enum 에셋 기능을 구현했다는 뜻은 아니에요. 기존 동적 Case 입력 핀 그래프는 그대로 읽고 실행해요.

## C++

`#include <HBEngine/Struct.hpp>`로 `hb::Struct::Make`, `Break`, `SetMembers`, `WithMembers`, `Select`, `Switch`, `Equal`을 사용해요. 기존 SDK의 구조체를 받으며 새 직렬화나 네이티브 실행기를 만들지 않아요. `SetMembers`는 원본 참조, `WithMembers`는 사본을 반환해요. 마스크의 비트 순서는 다음과 같아요.

| 자료형 | 비트 0부터 순서 |
| --- | --- |
| Vec2 | x, y |
| Vec3 | x, y, z |
| Color | r, g, b, a |
| Transform | position, rotation, scale |
| HitResult | hit, position, normal, actor |

```cpp
hb::Transform pose{{1,2,3},{4,5,6},{1,1,1}};
hb::Transform fields;
fields.position={10,20,30};
hb::Struct::SetMembers(pose,fields,1); // position만 수정
auto copy=hb::Struct::WithMembers(pose,fields,1);
```

## AI

`blueprint.struct.configure`: 문서 path/revision, view, node, type, members, hideUnconnected, dryRun.
`blueprint.switch.configure`: path/revision, view, node, cases `[{id?,value}]`, hasDefault, caseSensitive, dryRun. 기존 id를 명시하면 연결을 유지해요. 새 항목의 id는 생략할 수 있어요. 노드 생성은 기존 `document.patch`의 검증·Undo를 사용해요. `schema.blueprintStructs`와 `hb context "Set Members"`에서 소유 경로를 찾아요.

## 읽은 공식 근거

- [Struct Variables](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-struct-variables-in-unreal-engine): 구조체 중첩, Split/Recombine, Make/Break, Set Members의 필드 노출과 비노출 값 보존, Break의 미연결 출력 숨김 절.
- [Flow Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/flow-control-in-unreal-engine): Switch 입력·출력, Default, 비교값 편집·추가·이동/삭제 절.
- [Switch on Name](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Utilities/FlowControl/Switch/SwitchonName): 이름 비교에 따른 실행 출력 계약.

위 절의 제작 동작을 대조했어요. 사용자 구조체·enum, UE 전체 API 또는 전체 엔진 문서를 분석·구현했다는 기록은 아니에요.
