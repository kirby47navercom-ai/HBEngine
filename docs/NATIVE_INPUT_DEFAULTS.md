# C++ 호출의 생략 인수

공용 `NativeProtocol.decodeRequest`가 이미 파싱된 함수 입력 기본값을 채운 뒤 기존 전체 wire 검증을 실행해요. 데스크톱 NativeHost와 모바일/AOT 실행이 같은 경로를 써요. BP 핀에 명시한 값과 기존 완전한 호출 패킷은 그대로 유지해요.

```cpp
HB_FUNCTION(BlueprintCallable)
void Configure(bool enabled=true, float maximum=1.5f);
```

이 함수의 wire 호출에서 `enabled`와 `maximum` 키가 없으면 `true`, `1.5`를 사용해요. 명시한 `false`, `0`, 빈 문자열, `null`, `undefined`는 생략과 다르며 바꾸지 않아요. 자료형에 맞지 않으면 기존 검증에서 실패해요. 수신 오브젝트, 필수 인수, 속성 setter 값은 여전히 필요해요.

정수·실수·bool·문자열·벡터·배열·반영된 enum/record 등 파서가 확정한 기본값만 대상이에요. 임의 C++ 표현식, 매크로, 전처리·constexpr를 실행하거나 추측하지 않아요. 파서가 기본값을 제공하지 않으면 호출자가 값을 지정해요. 기본값도 동일한 enum·record·현재 actor 참조 검증을 받아요.

생략 값이 있을 때만 패킷/인수 사본을 만들며, 삽입 배열·구조체는 호출마다 분리해요. 원래 요청과 공유 메타데이터는 수정하지 않아요. 묶음 호출과 snapshot transport의 세대/세계 식별 정보도 유지해요. `schema.nativeInputDefaults`에서 계약을 조회해요.
