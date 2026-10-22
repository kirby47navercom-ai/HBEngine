# C++ 열거형 제작 계약 — 1458–1463

`HB_ENUM(BlueprintType) enum class Mode : std::uint8_t { Idle=4, Attack=12 };` 선언을 `HB_PROPERTY`와 `HB_FUNCTION`의 값·const 참조 입력·출력 참조·반환·배열·이벤트 인자로 사용해요. `HB_ENUM_VALUE(DisplayName="대기",ToolTip="...")`와 `Hidden`을 지원해요. 실제 C++ 컴파일 결과에 대해 기반형과 각 항목 값을 static_assert로 대조해요.

## 사람의 제작

클래스 기본값, 오브젝트 인스턴스, 노드 입력과 그래프 안의 작은 값 입력에서 이름을 선택해요. 값12는 목록의 12번째 항목이 아니에요. 숨김·이름 없는 기존 값은 현재 값으로 표시해 보존하며 일반 선택 목록에는 숨김 항목을 추가하지 않아요. 배열은 항목별 선택·추가·삭제이고 기존128항목 제한을 유지해요.

정수 변수의 열거형 선택에서 BlueprintType 선언을 고를 수 있어요. Promote도 enum 이름을 보존해요. 같은 기반형이어도 서로 다른 enum의 직접 연결은 거절해요. 일반 정수와의 기존 연결은 유지하고, native 인자/속성·enum 변수 쓰기 시 실제 기반형 범위를 확인해요. 배열과 변수·기본값은 같은 int32 저장 형식을 써요. enum 정보를 노드마다 복제하지 않고 소스 선언 메타데이터에서 조회해요.

정수 Switch 속성에서 enum을 고르면 표시 항목별 분기와 표시명이 생겨요. 중복된 숫자의 별칭은 같은 분기로 다루고 숨김 항목은 새 분기에 넣지 않아요. 다시 구성할 때 같은 숫자의 분기 ID·연결을 유지하고 삭제된 핀의 연결·관찰을 정리해요. 저장 후 소스 선언 순서를 바꿔도 숫자를 자동 재배정하지 않아요.

`HB_ENUM(Bitflags)`는0–31을 비트 위치로 사용해요. `UseEnumValuesAsMaskValuesInEditor=true`는 각 숫자를 직접 마스크로 사용해요. 정수 속성의 `HB_PROPERTY(Bitmask,BitmaskEnum="GameTypes::Layers")`에서 체크박스로 편집해요. 일반 enum 값과 정수 마스크를 별개로 구분해, int 속성에 enum을 대입하는 C++ 코드가 생성되지 않아요. 배열 마스크의 별도 체크박스 UI는 아직 없어요.

## C++ 공용 함수

`hb::Enum::ToValue/FromValue/ToValues/FromValues`, `Name/DisplayName/Values/IsValid/TryParse/Parse`, 원시 비트 연산 `HasAny/HasAll/Add/Remove/Toggle`, 비트 위치/직접 마스크를 구분하는 `Mask/HasFlag/SetFlag/IsValidFlags`를 제공해요. Parse는 코드 이름을 사용하고 잘못된 namespace나 일부만 맞는 조합은 출력값을 바꾸지 않아요. 등록 표는 생성 worker가 정적 수명으로 소유하고 Describe는 최초 조회 뒤 색인을 재사용해요. 임의의 사용자 전역 초기화 순서에 대한 보장은 없어요.

기반형은8·16·32비트예요. U32의0x80000000은 전송 시 -2147483648로 보존하고 C++에서 같은 비트로 복원해요. JSON 양수4294967295를 wire에 직접 보내지 않아요. float·bool·범위 밖 값은 native 함수 실행 전에 거절하며 배열도 전부 해석한 뒤 대입해요. 이름 없는 기반형 내 값은 비트마스크·앞선 버전 값을 위해 허용해요. `IsValid`는 이름 있는 값 여부를 따로 확인해요.

## 소스와 AI

Source 안의 명시적 상대 include와 Source 루트 경로를 따라 공용 헤더의 enum을 읽어요. class·이름 있는 namespace의 정규 이름과 원본 경로·줄을 보존해요. 동일 이름의 충돌은 namespace로 나눠요. SDK/시스템 헤더는 C++ 컴파일러가 처리해요. 일반 임의 헤더 검색·조건부 전처리·constexpr 함수 호출·템플릿/별칭 타입 전체 해석은 지원한다고 주장하지 않아요.

`native.enums.read {path,name?,offset?,limit?,includeHidden?}`는 on-demand 읽기이며 페이지 기본128/최대256이에요. name을 생략하면 선언 요약, 지정하면 실제 wire 숫자·표시명·줄이 있는 항목 페이지를 반환해요. 수정은 기존 document.patch/CAS·Undo·save 경로를 써요. 에셋은 기존 sourceReference를 유지하고 파생 enum 표를 저장하지 않아요. `hb context "열거형" --symbol "parseNativeEnums"` 등으로 소유 코드에 바로 접근해요.

## 근거와 경계

Unreal [Metadata Specifiers](https://dev.epicgames.com/documentation/en-us/unreal-engine/metadata-specifiers-in-unreal-engine)의 enum 표와 [Properties](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-uproperties?lang=en-US)의 정수·비트마스크 본문, Unity6000.0 [serialization rules](https://docs.unity3d.com/6000.0/Documentation/Manual/script-serialization-rules.html)의 필드·enum·배열 구간을 읽고 HB 저장/실행 계약에 맞춰 구현했어요. 읽은 구간은 CORPUS_MANIFEST.supplemental1458에 등록해요. 전체 공식 문서/API를 다 읽었다는 뜻이 아니에요.

C++ 값 구조체는 [NATIVE_RECORDS.md](NATIVE_RECORDS.md)에서 별도로 구현해요. 전용 enum 에셋 편집기, 모든 C++ 문법/매크로·외부 헤더·alias 추론, 자동 숫자 재배정 마이그레이션, 고유 Name 타입, 임의 함수/매크로 시그니처에서 enum 정체성 일반화는 잔여예요. 모바일 공용 AOT의 호스트 실행과 실제 Android/iOS 기기 검증을 구분해요.
