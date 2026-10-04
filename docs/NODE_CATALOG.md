# HBEngine 기본 노드 전체 목록

기본 노드 **519개**, 실제 공통 C++ API **437개**. 변수·사용자 함수/매크로·C++ 공개 선언·통신 시그니처에서 생성되는 추가 노드는 별도다. 이 문서는 tools/generate-catalog.mjs가 실제 등록 테이블에서 생성한다.

모든 노드에 실행 경로가 있다. 서비스가 필요한 노드는 아래 범위와 [BP 구현 상태](BLUEPRINT_SPEC.md)를 따른다. 실행 경로가 존재한다는 뜻을 모든 시스템의 native 구현 완료로 해석하지 않는다. 새 공통 221개 함수는 실제 C++/JS 결과 비교를 수행한다.

[공식 흐름 제어](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine?lang=en-US), [공식 String 라이브러리](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UKismetStringLibrary), [Epic 4.27 배열 노드](https://dev.epicgames.com/documentation/en-us/unreal-engine/array-nodes?application_version=4.27)를 제작 흐름 참고 자료로 사용했다. 아래 함수 구현은 HB 자체 코드다.

## 분야별 수

| 분야 | 노드 | 공통 C++ |
| --- | ---: | ---: |
| 이벤트 | 13 | 0 |
| 흐름 제어 | 16 | 0 |
| 디버그 | 1 | 0 |
| 변환 | 29 | 28 |
| 벡터 | 34 | 34 |
| 수학 | 52 | 50 |
| 배열 | 95 | 88 |
| 물리 | 16 | 14 |
| 오브젝트 | 8 | 0 |
| C++ 공개 함수 | 1 | 0 |
| 오디오 | 7 | 4 |
| 사용자 정의 | 2 | 0 |
| 시간 | 16 | 15 |
| 비교 | 8 | 4 |
| 논리 | 7 | 3 |
| 컴포넌트 | 3 | 0 |
| 문자열 | 23 | 19 |
| 애니메이션 | 2 | 0 |
| 렌더링 | 3 | 0 |
| UI | 12 | 9 |
| 저장 | 2 | 0 |
| 정수 | 14 | 14 |
| 벡터2 | 20 | 20 |
| 회전 | 9 | 9 |
| 색상 | 10 | 10 |
| 게임플레이 | 9 | 9 |
| 오브젝트 풀 | 3 | 3 |
| 입력 | 6 | 6 |
| 입력 액션 | 6 | 6 |
| 2D 스프라이트 | 14 | 14 |
| 2D 타일맵 | 12 | 12 |
| 물리 질의 | 7 | 7 |
| AI | 17 | 17 |
| 상태 머신 | 11 | 11 |
| 몽타주 | 7 | 7 |
| 시퀀스 | 5 | 5 |
| AI 내비게이션 | 4 | 4 |
| AI 감지 | 3 | 3 |
| 파티클 | 5 | 5 |
| 게임플레이 태그 | 7 | 7 |

## 범위와 사용 규칙

- C++ 칸이 있는 함수는 Game.hpp를 include해 같은 이름으로 직접 호출한다. VM 제어 노드는 C++ 함수와 다른 실행 구조이며, 브라우저 게임 서비스의 native API는 별도 구현 대상이다.
- 자료형별 배열의 Reverse/Append/Slice/Unique는 사본 반환이다. Set/Add/Remove는 배열 변수를 수정하는 실행 노드다. 저장과 공통 배열 계산은 128원소다.
- 32비트 int, 0~1 RGBA Color, XYZ Euler degree, +Z Forward/+Y Up을 사용한다. 새 Text 연산은 Unicode scalar 기준이고 대소문자 변환은 ASCII다.
- Switch/MultiGate는 3출력, Sequence는 2출력이다. 동적 출력 핀은 미지원이다.
- openScene은 실행 서비스를 아직 구현하지 않아 명시적으로 실패한다. Audio는 브라우저 코덱, Animation은 가져온 모델의 포함 클립을 사용한다. 충돌은 AABB 접촉, Trace는 Three mesh 검사, Impulse는 속도 적용이다.
- Construction은 별도 그래프의 진입점이고 Timeline 트랙 핀은 편집한 트랙에 따라 추가된다. 사용자 이벤트·피해/위젯 이벤트에는 외부 emit 호출이 필요하다.

## 이벤트

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| construction | Construction Script / 생성 시 구성 | — | then: exec | — | VM 이벤트 진입점 |
| beginPlay | Begin Play / 게임 시작 | — | then: exec | — | VM 이벤트 진입점 |
| tick | Event Tick / 매 프레임 | — | then: exec, delta: float | — | VM 이벤트 진입점 |
| fixedTick | Fixed Update / 고정 물리 업데이트 | — | then: exec, delta: float | — | VM 이벤트 진입점 |
| beginOverlap | Begin Overlap / 겹침 시작 | — | then: exec, other: object | — | VM 이벤트 진입점 |
| endOverlap | End Overlap / 겹침 종료 | — | then: exec, other: object | — | VM 이벤트 진입점 |
| input | Input Event / 키·마우스 이벤트 | — | then: exec, released: exec | — | VM 이벤트 진입점 |
| customEvent | Custom Event / 사용자 이벤트 | — | then: exec | — | VM 이벤트 진입점 |
| endPlay | End Play / 게임 종료 | — | then: exec, reason: string | — | VM 이벤트 진입점 |
| hitEvent | Event Hit / 충돌 이벤트 | — | then: exec, other: object, hit: hit | — | AABB 접촉; 강체 solver 없음 |
| inputAction | Input Action / 입력 액션 이벤트 | — | started: exec, triggered: exec, completed: exec, ongoing: exec, canceled: exec, value: bool, elapsed: float | — | VM 이벤트 진입점 |
| inputAxis | Input Axis / 축 입력 | — | then: exec, value: float | — | VM 이벤트 진입점 |
| anyDamage | Any Damage / 피해 이벤트 | — | then: exec, damage: float, instigator: object | — | VM 이벤트 진입점 |

## 흐름 제어

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| branch | Branch / 조건 분기 | exec: exec, condition: bool | true: exec, false: exec | — | VM / 브라우저 서비스 |
| delay | Delay / 기다리기 | exec: exec, duration: float | then: exec | — | VM / 브라우저 서비스 |
| sequence | Sequence / 순서대로 실행 | exec: exec | first: exec, second: exec | — | VM / 브라우저 서비스 |
| forLoop | For Loop / 반복 실행 | exec: exec, first: int, last: int | body: exec, index: int, completed: exec | — | VM / 브라우저 서비스 |
| forEach | For Each Loop / 배열 반복 | exec: exec, array: float[] | body: exec, item: float, index: int, completed: exec | — | VM / 브라우저 서비스 |
| doOnce | Do Once / 한 번 실행 | exec: exec, reset: exec | then: exec | — | VM / 브라우저 서비스 |
| flipFlop | Flip Flop / 번갈아 실행 | exec: exec | a: exec, b: exec, isA: bool | — | VM / 브라우저 서비스 |
| gate | Gate / 실행 게이트 | exec: exec, open: exec, close: exec, toggle: exec | then: exec | — | VM / 브라우저 서비스 |
| doN | Do N / 정해진 횟수 실행 | exec: exec, reset: exec, count: int | then: exec, counter: int | — | VM / 브라우저 서비스 |
| multiGate | Multi Gate / 여러 경로 순차 실행 | exec: exec, reset: exec, loop: bool, random: bool, startIndex: int | out0: exec, out1: exec, out2: exec, index: int | — | VM / 브라우저 서비스 |
| whileLoop | While Loop / 조건 반복 | exec: exec, condition: bool | body: exec, completed: exec | — | VM / 브라우저 서비스 |
| forLoopBreak | For Loop With Break / 중단 가능한 반복 | exec: exec, break: exec, first: int, last: int | body: exec, index: int, completed: exec | — | VM / 브라우저 서비스 |
| forEachBreak | For Each With Break / 중단 가능한 배열 반복 | exec: exec, break: exec, array: float[] | body: exec, item: float, index: int, completed: exec | — | VM / 브라우저 서비스 |
| retriggerDelay | Retriggerable Delay / 다시 시작하는 지연 | exec: exec, duration: float | then: exec | — | VM / 브라우저 서비스 |
| switchInt | Switch Integer / 정수 분기 | exec: exec, selection: int, case0: int, case1: int, case2: int | out0: exec, out1: exec, out2: exec, default: exec | — | VM / 브라우저 서비스 |
| switchString | Switch String / 문자열 분기 | exec: exec, selection: string, case0: string, case1: string, case2: string | out0: exec, out1: exec, out2: exec, default: exec | — | VM / 브라우저 서비스 |

## 디버그

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| print | Print String / 문자열 출력 | exec: exec, message: string | then: exec | — | VM / 브라우저 서비스 |

## 변환

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| location | Get Position / 위치 가져오기 | target: object | return: vec3 | hb::Scene::GetPosition | 공통 C++ + VM |
| setPosition | Set Position / 위치 설정 | exec: exec, target: object, position: vec3 | then: exec | hb::Scene::SetPosition | 공통 C++ + VM |
| makeTransform | Make Transform / 트랜스폼 만들기 | position: vec3, rotation: vec3, scale: vec3 | return: transform | — | VM / 브라우저 서비스 |
| getTransform | Get Transform / 트랜스폼 가져오기 | target: object | return: transform | hb::Scene::GetTransform | 공통 C++ + VM |
| setTransform | Set Transform / 트랜스폼 설정 | exec: exec, target: object, value: transform | then: exec | hb::Scene::SetTransform | 공통 C++ + VM |
| getRotation | Get Rotation / 회전 가져오기 | target: object | return: vec3 | hb::Scene::GetRotation | 공통 C++ + VM |
| getScale | Get Scale / 크기 가져오기 | target: object | return: vec3 | hb::Scene::GetScale | 공통 C++ + VM |
| setRotation | Set Rotation / 회전 설정 | exec: exec, target: object, value: vec3 | then: exec | hb::Scene::SetRotation | 공통 C++ + VM |
| setScale | Set Scale / 크기 설정 | exec: exec, target: object, value: vec3 | then: exec | hb::Scene::SetScale | 공통 C++ + VM |
| translate | Add Offset / 벡터로 위치 이동 오프셋 | exec: exec, target: object, value: vec3 | then: exec | hb::Scene::AddOffset | 공통 C++ + VM |
| rotate | Add Rotation / 회전 더하기 | exec: exec, target: object, value: vec3 | then: exec | hb::Scene::AddRotation | 공통 C++ + VM |
| openScene | Open / 장면 열기 | exec: exec, scene: string | then: exec | hb::Scene::Open | 공통 C++ + VM |
| moveActorTowards | Move Actor Towards / 오브젝트 목표로 이동 | exec: exec, target: object, destination: vec3, speed: float, delta: float | then: exec, return: bool | hb::Scene::MoveActorTowards | 공통 C++ + VM |
| transformPosition | Transform Position / 로컬 위치를 월드로 | transform: transform, value: vec3 | return: vec3 | hb::Extended::TransformPosition | 공통 C++ + VM |
| inverseTransformPosition | Inverse Transform Position / 월드 위치를 로컬로 | transform: transform, value: vec3 | return: vec3 | hb::Extended::InverseTransformPosition | 공통 C++ + VM |
| transformDirection | Transform Direction / 로컬 방향을 월드로 | transform: transform, value: vec3 | return: vec3 | hb::Extended::TransformDirection | 공통 C++ + VM |
| inverseTransformDirection | Inverse Transform Direction / 월드 방향을 로컬로 | transform: transform, value: vec3 | return: vec3 | hb::Extended::InverseTransformDirection | 공통 C++ + VM |
| intToString | Int To String / 정수를 문자열로 | value: int | return: string | hb::Extended::IntToString | 공통 C++ + VM |
| boolToString | Bool To String / 불리언을 문자열로 | value: bool | return: string | hb::Extended::BoolToString | 공통 C++ + VM |
| intToFloat | Int To Float / 정수를 실수로 | value: int | return: float | hb::Extended::IntToFloat | 공통 C++ + VM |
| floatToInt | Float To Int / 실수를 정수로 버림 | value: float | return: int | hb::Extended::FloatToInt | 공통 C++ + VM |
| boolToInt | Bool To Int / 불리언을 정수로 | value: bool | return: int | hb::Extended::BoolToInt | 공통 C++ + VM |
| intToBool | Int To Bool / 정수를 불리언으로 | value: int | return: bool | hb::Extended::IntToBool | 공통 C++ + VM |
| vector2ToVector3 | Vector2 To Vector3 / 벡터2를 벡터3로 | value: vec2, z: float | return: vec3 | hb::Extended::Vector2ToVector3 | 공통 C++ + VM |
| vector3ToVector2 | Vector3 To Vector2 / 벡터3의 XY | value: vec3 | return: vec2 | hb::Extended::Vector3ToVector2 | 공통 C++ + VM |
| getWorldPosition | Get World Position / 월드 위치 가져오기 | target: object | return: vec3 | hb::Scene::GetWorldPosition | 공통 C++ + VM |
| setWorldPosition | Set World Position / 월드 위치 설정 | exec: exec, target: object, position: vec3 | then: exec | hb::Scene::SetWorldPosition | 공통 C++ + VM |
| getLocalPosition | Get Local Position / 로컬 위치 가져오기 | target: object | return: vec3 | hb::Scene::GetLocalPosition | 공통 C++ + VM |
| setLocalPosition | Set Local Position / 로컬 위치 설정 | exec: exec, target: object, position: vec3 | then: exec | hb::Scene::SetLocalPosition | 공통 C++ + VM |

## 벡터

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| vec3 | Make Vector3 / 벡터3 만들기 | x: float, y: float, z: float | return: vec3 | hb::VectorMath::MakeVector3 | 공통 C++ + VM |
| vec2 | Make Vector2 / 벡터2 만들기 | x: float, y: float | return: vec2 | hb::VectorMath::MakeVector2 | 공통 C++ + VM |
| vectorAdd | Add Vector / 벡터 더하기 | a: vec3, b: vec3 | return: vec3 | hb::VectorMath::AddVector | 공통 C++ + VM |
| vectorSubtract | Subtract Vector / 벡터 빼기 | a: vec3, b: vec3 | return: vec3 | hb::VectorMath::SubtractVector | 공통 C++ + VM |
| vectorScale | Scale Vector / 벡터 배율 | value: vec3, scale: float | return: vec3 | hb::VectorMath::ScaleVector | 공통 C++ + VM |
| vectorLength | Vector Length / 벡터 길이 | value: vec3 | return: float | hb::VectorMath::VectorLength | 공통 C++ + VM |
| normalize | Normalize Vector / 벡터 정규화 노멀벡터 단위벡터 | value: vec3 | return: vec3 | hb::VectorMath::NormalizeVector | 공통 C++ + VM |
| distance | Distance / 벡터 거리 | a: vec3, b: vec3 | return: float | hb::VectorMath::Distance | 공통 C++ + VM |
| dot | Dot Product / 벡터 내적 | a: vec3, b: vec3 | return: float | hb::VectorMath::DotProduct | 공통 C++ + VM |
| cross | Cross Product / 벡터 외적 | a: vec3, b: vec3 | return: vec3 | hb::VectorMath::CrossProduct | 공통 C++ + VM |
| vectorLerp | Lerp Vector / 벡터 보간 | a: vec3, b: vec3, alpha: float | return: vec3 | hb::VectorMath::LerpVector | 공통 C++ + VM |
| vectorLengthSquared | Vector Length Squared / 벡터 길이 제곱 | value: vec3 | return: float | hb::VectorMath::VectorLengthSquared | 공통 C++ + VM |
| distanceSquared | Distance Squared / 벡터 거리 제곱 | a: vec3, b: vec3 | return: float | hb::VectorMath::DistanceSquared | 공통 C++ + VM |
| vectorInterp | VInterp To / 벡터 따라가기 보간 이동 | current: vec3, target: vec3, delta: float, speed: float | return: vec3 | hb::VectorMath::VInterpTo | 공통 C++ + VM |
| vectorMoveTowards | Move Towards / 목표로 벡터 이동 일정속도 | current: vec3, target: vec3, distance: float | return: vec3 | hb::VectorMath::MoveTowards | 공통 C++ + VM |
| vectorReflect | Reflect Vector / 노멀벡터 반사 | value: vec3, normal: vec3 | return: vec3 | hb::VectorMath::ReflectVector | 공통 C++ + VM |
| vectorProject | Project Vector / 벡터 투영 | value: vec3, onto: vec3 | return: vec3 | hb::VectorMath::ProjectVector | 공통 C++ + VM |
| vectorClampLength | Clamp Vector Length / 벡터 길이 제한 | value: vec3, maxLength: float | return: vec3 | hb::VectorMath::ClampVectorLength | 공통 C++ + VM |
| vector2Length | Vector2 Length / 벡터2 길이 | value: vec2 | return: float | hb::VectorMath::Vector2Length | 공통 C++ + VM |
| vector2Normalize | Normalize Vector2 / 벡터2 정규화 | value: vec2 | return: vec2 | hb::VectorMath::NormalizeVector2 | 공통 C++ + VM |
| vector3Multiply | Vector3 Multiply / 벡터3 성분 곱하기 | a: vec3, b: vec3 | return: vec3 | hb::Extended::Vector3Multiply | 공통 C++ + VM |
| vector3Divide | Vector3 Divide / 벡터3 성분 나누기 | a: vec3, b: vec3 | return: vec3 | hb::Extended::Vector3Divide | 공통 C++ + VM |
| vector3Min | Vector3 Min / 벡터3 성분 최솟값 | a: vec3, b: vec3 | return: vec3 | hb::Extended::Vector3Min | 공통 C++ + VM |
| vector3Max | Vector3 Max / 벡터3 성분 최댓값 | a: vec3, b: vec3 | return: vec3 | hb::Extended::Vector3Max | 공통 C++ + VM |
| vector3Abs | Vector3 Abs / 벡터3 절댓값 | value: vec3 | return: vec3 | hb::Extended::Vector3Abs | 공통 C++ + VM |
| vector3Negate | Vector3 Negate / 벡터3 반전 | value: vec3 | return: vec3 | hb::Extended::Vector3Negate | 공통 C++ + VM |
| vector3Floor | Vector3 Floor / 벡터3 내림 | value: vec3 | return: vec3 | hb::Extended::Vector3Floor | 공통 C++ + VM |
| vector3Ceil | Vector3 Ceil / 벡터3 올림 | value: vec3 | return: vec3 | hb::Extended::Vector3Ceil | 공통 C++ + VM |
| vector3NearlyEqual | Vector3 Nearly Equal / 벡터3 거의 같다 | a: vec3, b: vec3, tolerance: float | return: bool | hb::Extended::Vector3NearlyEqual | 공통 C++ + VM |
| vector3IsZero | Vector3 Is Zero / 벡터3 거의 0 | value: vec3, tolerance: float | return: bool | hb::Extended::Vector3IsZero | 공통 C++ + VM |
| vector3Clamp | Vector3 Clamp / 벡터3 성분 제한 | value: vec3, min: float, max: float | return: vec3 | hb::Extended::Vector3Clamp | 공통 C++ + VM |
| vector3GetX | Vector3 Get X / 벡터3 X 성분 읽기 | value: vec3 | return: float | hb::Extended::Vector3GetX | 공통 C++ + VM |
| vector3GetY | Vector3 Get Y / 벡터3 Y 성분 읽기 | value: vec3 | return: float | hb::Extended::Vector3GetY | 공통 C++ + VM |
| vector3GetZ | Vector3 Get Z / 벡터3 Z 성분 읽기 | value: vec3 | return: float | hb::Extended::Vector3GetZ | 공통 C++ + VM |

## 수학

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| add | Add Float / 실수 더하기 | a: float, b: float | return: float | hb::Math::AddFloat | 공통 C++ + VM |
| multiply | Multiply / 곱하기 | a: float, b: float | return: float | hb::Math::Multiply | 공통 C++ + VM |
| subtract | Subtract / 빼기 | a: float, b: float | return: float | hb::Math::Subtract | 공통 C++ + VM |
| divide | Divide / 나누기 | a: float, b: float | return: float | hb::Math::Divide | 공통 C++ + VM |
| min | Min / 최솟값 | a: float, b: float | return: float | hb::Math::Min | 공통 C++ + VM |
| max | Max / 최댓값 | a: float, b: float | return: float | hb::Math::Max | 공통 C++ + VM |
| power | Power / 거듭제곱 | a: float, b: float | return: float | hb::Math::Power | 공통 C++ + VM |
| abs | Abs / 절댓값 | value: float | return: float | hb::Math::Abs | 공통 C++ + VM |
| sqrt | Sqrt / 제곱근 | value: float | return: float | hb::Math::Sqrt | 공통 C++ + VM |
| sin | Sin / 사인 | value: float | return: float | hb::Math::Sin | 공통 C++ + VM |
| cos | Cos / 코사인 | value: float | return: float | hb::Math::Cos | 공통 C++ + VM |
| floor | Floor / 내림 | value: float | return: float | hb::Math::Floor | 공통 C++ + VM |
| ceil | Ceil / 올림 | value: float | return: float | hb::Math::Ceil | 공통 C++ + VM |
| round | Round / 반올림 | value: float | return: float | hb::Math::Round | 공통 C++ + VM |
| clamp | Clamp / 범위 제한 | value: float, min: float, max: float | return: float | hb::Math::Clamp | 공통 C++ + VM |
| lerp | Lerp / 선형 보간 | a: float, b: float, alpha: float | return: float | hb::Math::Lerp | 공통 C++ + VM |
| random | Random Float in Range / 범위 안 무작위 | min: float, max: float | return: float | — | VM / 브라우저 서비스 |
| makeColor | Make Color / 색상 만들기 | r: float, g: float, b: float, a: float | return: color | — | VM / 브라우저 서비스 |
| nearlyEqual | Nearly Equal / 거의 같은 실수 | a: float, b: float, tolerance: float | return: bool | hb::Math::NearlyEqual | 공통 C++ + VM |
| mapRange | Map Range / 범위 변환 | value: float, inMin: float, inMax: float, outMin: float, outMax: float | return: float | hb::Math::MapRange | 공통 C++ + VM |
| smoothStep | Smooth Step / 부드러운 보간 | min: float, max: float, value: float | return: float | hb::Math::SmoothStep | 공통 C++ + VM |
| degreesToRadians | Degrees To Radians / 도를 라디안으로 | value: float | return: float | hb::Math::DegreesToRadians | 공통 C++ + VM |
| radiansToDegrees | Radians To Degrees / 라디안을 도로 | value: float | return: float | hb::Math::RadiansToDegrees | 공통 C++ + VM |
| floatInterp | FInterp To / 실수 따라가기 보간 | current: float, target: float, delta: float, speed: float | return: float | hb::Math::FInterpTo | 공통 C++ + VM |
| tan | Tan / 탄젠트 | value: float | return: float | hb::Extended::Tan | 공통 C++ + VM |
| asin | Asin / 역사인 | value: float | return: float | hb::Extended::Asin | 공통 C++ + VM |
| acos | Acos / 역코사인 | value: float | return: float | hb::Extended::Acos | 공통 C++ + VM |
| atan | Atan / 역탄젠트 | value: float | return: float | hb::Extended::Atan | 공통 C++ + VM |
| exp | Exp / 지수 | value: float | return: float | hb::Extended::Exp | 공통 C++ + VM |
| log | Log / 자연 로그 | value: float | return: float | hb::Extended::Log | 공통 C++ + VM |
| log2 | Log2 / 밑 2 로그 | value: float | return: float | hb::Extended::Log2 | 공통 C++ + VM |
| log10 | Log10 / 밑 10 로그 | value: float | return: float | hb::Extended::Log10 | 공통 C++ + VM |
| truncate | Truncate / 버림 | value: float | return: float | hb::Extended::Truncate | 공통 C++ + VM |
| fraction | Fraction / 소수 부분 | value: float | return: float | hb::Extended::Fraction | 공통 C++ + VM |
| sign | Sign / 부호 | value: float | return: float | hb::Extended::Sign | 공통 C++ + VM |
| square | Square / 제곱 | value: float | return: float | hb::Extended::Square | 공통 C++ + VM |
| cube | Cube / 세제곱 | value: float | return: float | hb::Extended::Cube | 공통 C++ + VM |
| oneMinus | One Minus / 1에서 빼기 | value: float | return: float | hb::Extended::OneMinus | 공통 C++ + VM |
| saturate | Saturate / 0~1 제한 | value: float | return: float | hb::Extended::Saturate | 공통 C++ + VM |
| sinh | Sinh / 쌍곡 사인 | value: float | return: float | hb::Extended::Sinh | 공통 C++ + VM |
| cosh | Cosh / 쌍곡 코사인 | value: float | return: float | hb::Extended::Cosh | 공통 C++ + VM |
| tanh | Tanh / 쌍곡 탄젠트 | value: float | return: float | hb::Extended::Tanh | 공통 C++ + VM |
| atan2 | Atan2 / 방향의 역탄젠트 | y: float, x: float | return: float | hb::Extended::Atan2 | 공통 C++ + VM |
| modulo | Modulo / 실수 나머지 | a: float, b: float | return: float | hb::Extended::Modulo | 공통 C++ + VM |
| wrap | Wrap / 반복 범위 | value: float, min: float, max: float | return: float | hb::Extended::Wrap | 공통 C++ + VM |
| inverseLerp | Inverse Lerp / 보간 비율 구하기 | a: float, b: float, value: float | return: float | hb::Extended::InverseLerp | 공통 C++ + VM |
| mapRangeClamped | Map Range Clamped / 제한된 범위 변환 | value: float, inMin: float, inMax: float, outMin: float, outMax: float | return: float | hb::Extended::MapRangeClamped | 공통 C++ + VM |
| easeIn | Ease In / 가속 보간 | alpha: float, exponent: float | return: float | hb::Extended::EaseIn | 공통 C++ + VM |
| easeOut | Ease Out / 감속 보간 | alpha: float, exponent: float | return: float | hb::Extended::EaseOut | 공통 C++ + VM |
| easeInOut | Ease In Out / 가속 감속 보간 | alpha: float, exponent: float | return: float | hb::Extended::EaseInOut | 공통 C++ + VM |
| floatMoveTowards | Float Move Towards / 일정 속도 실수 이동 | current: float, target: float, distance: float | return: float | hb::Extended::FloatMoveTowards | 공통 C++ + VM |
| snapFloat | Snap Float / 격자에 실수 맞추기 | value: float, grid: float | return: float | hb::Extended::SnapFloat | 공통 C++ + VM |

## 배열

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| arrayLength | Array Length / 배열 길이 | array: any[] | return: int | — | VM / 브라우저 서비스 |
| arrayGet | Array Get / 배열 원소 읽기 | array: float[], index: int | return: float | — | VM / 브라우저 서비스 |
| arraySet | Array Set / 배열 원소 설정 | exec: exec, array: float[], index: int, item: float | then: exec | — | VM / 브라우저 서비스 |
| arrayAdd | Array Add / 배열 원소 추가 | exec: exec, array: float[], item: float | then: exec, index: int | — | VM / 브라우저 서비스 |
| arrayRemove | Array Remove Index / 배열 원소 삭제 | exec: exec, array: float[], index: int | then: exec | — | VM / 브라우저 서비스 |
| arrayFind | Array Find / 배열 원소 찾기 | array: float[], item: float | return: int | — | VM / 브라우저 서비스 |
| arrayContains | Array Contains / 배열 원소 포함 | array: float[], item: float | return: bool | — | VM / 브라우저 서비스 |
| arrayBoolLength | Array Bool Length / 배열 길이 · Bool | array: bool[] | return: int | hb::Extended::ArrayBoolLength | 공통 C++ + VM |
| arrayBoolLastIndex | Array Bool Last Index / 마지막 배열 인덱스 · Bool | array: bool[] | return: int | hb::Extended::ArrayBoolLastIndex | 공통 C++ + VM |
| arrayBoolIsEmpty | Array Bool Is Empty / 빈 배열 · Bool | array: bool[] | return: bool | hb::Extended::ArrayBoolIsEmpty | 공통 C++ + VM |
| arrayBoolIsValidIndex | Array Bool Is Valid Index / 유효한 배열 인덱스 · Bool | array: bool[], index: int | return: bool | hb::Extended::ArrayBoolIsValidIndex | 공통 C++ + VM |
| arrayBoolGet | Array Bool Get / 배열 원소 읽기 · Bool | array: bool[], index: int | return: bool | hb::Extended::ArrayBoolGet | 공통 C++ + VM |
| arrayBoolFind | Array Bool Find / 배열 원소 찾기 · Bool | array: bool[], item: bool | return: int | hb::Extended::ArrayBoolFind | 공통 C++ + VM |
| arrayBoolContains | Array Bool Contains / 배열 원소 포함 · Bool | array: bool[], item: bool | return: bool | hb::Extended::ArrayBoolContains | 공통 C++ + VM |
| arrayBoolReverse | Array Bool Reverse / 배열 역순 사본 · Bool | array: bool[] | return: bool[] | hb::Extended::ArrayBoolReverse | 공통 C++ + VM |
| arrayBoolAppend | Array Bool Append / 배열 합친 사본 · Bool | array: bool[], other: bool[] | return: bool[] | hb::Extended::ArrayBoolAppend | 공통 C++ + VM |
| arrayBoolSlice | Array Bool Slice / 배열 구간 사본 · Bool | array: bool[], start: int, count: int | return: bool[] | hb::Extended::ArrayBoolSlice | 공통 C++ + VM |
| arrayBoolUnique | Array Bool Unique / 중복 없는 배열 사본 · Bool | array: bool[] | return: bool[] | hb::Extended::ArrayBoolUnique | 공통 C++ + VM |
| arrayIntLength | Array Int Length / 배열 길이 · Int | array: int[] | return: int | hb::Extended::ArrayIntLength | 공통 C++ + VM |
| arrayIntLastIndex | Array Int Last Index / 마지막 배열 인덱스 · Int | array: int[] | return: int | hb::Extended::ArrayIntLastIndex | 공통 C++ + VM |
| arrayIntIsEmpty | Array Int Is Empty / 빈 배열 · Int | array: int[] | return: bool | hb::Extended::ArrayIntIsEmpty | 공통 C++ + VM |
| arrayIntIsValidIndex | Array Int Is Valid Index / 유효한 배열 인덱스 · Int | array: int[], index: int | return: bool | hb::Extended::ArrayIntIsValidIndex | 공통 C++ + VM |
| arrayIntGet | Array Int Get / 배열 원소 읽기 · Int | array: int[], index: int | return: int | hb::Extended::ArrayIntGet | 공통 C++ + VM |
| arrayIntFind | Array Int Find / 배열 원소 찾기 · Int | array: int[], item: int | return: int | hb::Extended::ArrayIntFind | 공통 C++ + VM |
| arrayIntContains | Array Int Contains / 배열 원소 포함 · Int | array: int[], item: int | return: bool | hb::Extended::ArrayIntContains | 공통 C++ + VM |
| arrayIntReverse | Array Int Reverse / 배열 역순 사본 · Int | array: int[] | return: int[] | hb::Extended::ArrayIntReverse | 공통 C++ + VM |
| arrayIntAppend | Array Int Append / 배열 합친 사본 · Int | array: int[], other: int[] | return: int[] | hb::Extended::ArrayIntAppend | 공통 C++ + VM |
| arrayIntSlice | Array Int Slice / 배열 구간 사본 · Int | array: int[], start: int, count: int | return: int[] | hb::Extended::ArrayIntSlice | 공통 C++ + VM |
| arrayIntUnique | Array Int Unique / 중복 없는 배열 사본 · Int | array: int[] | return: int[] | hb::Extended::ArrayIntUnique | 공통 C++ + VM |
| arrayFloatLength | Array Float Length / 배열 길이 · Float | array: float[] | return: int | hb::Extended::ArrayFloatLength | 공통 C++ + VM |
| arrayFloatLastIndex | Array Float Last Index / 마지막 배열 인덱스 · Float | array: float[] | return: int | hb::Extended::ArrayFloatLastIndex | 공통 C++ + VM |
| arrayFloatIsEmpty | Array Float Is Empty / 빈 배열 · Float | array: float[] | return: bool | hb::Extended::ArrayFloatIsEmpty | 공통 C++ + VM |
| arrayFloatIsValidIndex | Array Float Is Valid Index / 유효한 배열 인덱스 · Float | array: float[], index: int | return: bool | hb::Extended::ArrayFloatIsValidIndex | 공통 C++ + VM |
| arrayFloatGet | Array Float Get / 배열 원소 읽기 · Float | array: float[], index: int | return: float | hb::Extended::ArrayFloatGet | 공통 C++ + VM |
| arrayFloatFind | Array Float Find / 배열 원소 찾기 · Float | array: float[], item: float | return: int | hb::Extended::ArrayFloatFind | 공통 C++ + VM |
| arrayFloatContains | Array Float Contains / 배열 원소 포함 · Float | array: float[], item: float | return: bool | hb::Extended::ArrayFloatContains | 공통 C++ + VM |
| arrayFloatReverse | Array Float Reverse / 배열 역순 사본 · Float | array: float[] | return: float[] | hb::Extended::ArrayFloatReverse | 공통 C++ + VM |
| arrayFloatAppend | Array Float Append / 배열 합친 사본 · Float | array: float[], other: float[] | return: float[] | hb::Extended::ArrayFloatAppend | 공통 C++ + VM |
| arrayFloatSlice | Array Float Slice / 배열 구간 사본 · Float | array: float[], start: int, count: int | return: float[] | hb::Extended::ArrayFloatSlice | 공통 C++ + VM |
| arrayFloatUnique | Array Float Unique / 중복 없는 배열 사본 · Float | array: float[] | return: float[] | hb::Extended::ArrayFloatUnique | 공통 C++ + VM |
| arrayStringLength | Array String Length / 배열 길이 · String | array: string[] | return: int | hb::Extended::ArrayStringLength | 공통 C++ + VM |
| arrayStringLastIndex | Array String Last Index / 마지막 배열 인덱스 · String | array: string[] | return: int | hb::Extended::ArrayStringLastIndex | 공통 C++ + VM |
| arrayStringIsEmpty | Array String Is Empty / 빈 배열 · String | array: string[] | return: bool | hb::Extended::ArrayStringIsEmpty | 공통 C++ + VM |
| arrayStringIsValidIndex | Array String Is Valid Index / 유효한 배열 인덱스 · String | array: string[], index: int | return: bool | hb::Extended::ArrayStringIsValidIndex | 공통 C++ + VM |
| arrayStringGet | Array String Get / 배열 원소 읽기 · String | array: string[], index: int | return: string | hb::Extended::ArrayStringGet | 공통 C++ + VM |
| arrayStringFind | Array String Find / 배열 원소 찾기 · String | array: string[], item: string | return: int | hb::Extended::ArrayStringFind | 공통 C++ + VM |
| arrayStringContains | Array String Contains / 배열 원소 포함 · String | array: string[], item: string | return: bool | hb::Extended::ArrayStringContains | 공통 C++ + VM |
| arrayStringReverse | Array String Reverse / 배열 역순 사본 · String | array: string[] | return: string[] | hb::Extended::ArrayStringReverse | 공통 C++ + VM |
| arrayStringAppend | Array String Append / 배열 합친 사본 · String | array: string[], other: string[] | return: string[] | hb::Extended::ArrayStringAppend | 공통 C++ + VM |
| arrayStringSlice | Array String Slice / 배열 구간 사본 · String | array: string[], start: int, count: int | return: string[] | hb::Extended::ArrayStringSlice | 공통 C++ + VM |
| arrayStringUnique | Array String Unique / 중복 없는 배열 사본 · String | array: string[] | return: string[] | hb::Extended::ArrayStringUnique | 공통 C++ + VM |
| arrayVec2Length | Array Vec2 Length / 배열 길이 · Vec2 | array: vec2[] | return: int | hb::Extended::ArrayVec2Length | 공통 C++ + VM |
| arrayVec2LastIndex | Array Vec2 Last Index / 마지막 배열 인덱스 · Vec2 | array: vec2[] | return: int | hb::Extended::ArrayVec2LastIndex | 공통 C++ + VM |
| arrayVec2IsEmpty | Array Vec2 Is Empty / 빈 배열 · Vec2 | array: vec2[] | return: bool | hb::Extended::ArrayVec2IsEmpty | 공통 C++ + VM |
| arrayVec2IsValidIndex | Array Vec2 Is Valid Index / 유효한 배열 인덱스 · Vec2 | array: vec2[], index: int | return: bool | hb::Extended::ArrayVec2IsValidIndex | 공통 C++ + VM |
| arrayVec2Get | Array Vec2 Get / 배열 원소 읽기 · Vec2 | array: vec2[], index: int | return: vec2 | hb::Extended::ArrayVec2Get | 공통 C++ + VM |
| arrayVec2Find | Array Vec2 Find / 배열 원소 찾기 · Vec2 | array: vec2[], item: vec2 | return: int | hb::Extended::ArrayVec2Find | 공통 C++ + VM |
| arrayVec2Contains | Array Vec2 Contains / 배열 원소 포함 · Vec2 | array: vec2[], item: vec2 | return: bool | hb::Extended::ArrayVec2Contains | 공통 C++ + VM |
| arrayVec2Reverse | Array Vec2 Reverse / 배열 역순 사본 · Vec2 | array: vec2[] | return: vec2[] | hb::Extended::ArrayVec2Reverse | 공통 C++ + VM |
| arrayVec2Append | Array Vec2 Append / 배열 합친 사본 · Vec2 | array: vec2[], other: vec2[] | return: vec2[] | hb::Extended::ArrayVec2Append | 공통 C++ + VM |
| arrayVec2Slice | Array Vec2 Slice / 배열 구간 사본 · Vec2 | array: vec2[], start: int, count: int | return: vec2[] | hb::Extended::ArrayVec2Slice | 공통 C++ + VM |
| arrayVec2Unique | Array Vec2 Unique / 중복 없는 배열 사본 · Vec2 | array: vec2[] | return: vec2[] | hb::Extended::ArrayVec2Unique | 공통 C++ + VM |
| arrayVec3Length | Array Vec3 Length / 배열 길이 · Vec3 | array: vec3[] | return: int | hb::Extended::ArrayVec3Length | 공통 C++ + VM |
| arrayVec3LastIndex | Array Vec3 Last Index / 마지막 배열 인덱스 · Vec3 | array: vec3[] | return: int | hb::Extended::ArrayVec3LastIndex | 공통 C++ + VM |
| arrayVec3IsEmpty | Array Vec3 Is Empty / 빈 배열 · Vec3 | array: vec3[] | return: bool | hb::Extended::ArrayVec3IsEmpty | 공통 C++ + VM |
| arrayVec3IsValidIndex | Array Vec3 Is Valid Index / 유효한 배열 인덱스 · Vec3 | array: vec3[], index: int | return: bool | hb::Extended::ArrayVec3IsValidIndex | 공통 C++ + VM |
| arrayVec3Get | Array Vec3 Get / 배열 원소 읽기 · Vec3 | array: vec3[], index: int | return: vec3 | hb::Extended::ArrayVec3Get | 공통 C++ + VM |
| arrayVec3Find | Array Vec3 Find / 배열 원소 찾기 · Vec3 | array: vec3[], item: vec3 | return: int | hb::Extended::ArrayVec3Find | 공통 C++ + VM |
| arrayVec3Contains | Array Vec3 Contains / 배열 원소 포함 · Vec3 | array: vec3[], item: vec3 | return: bool | hb::Extended::ArrayVec3Contains | 공통 C++ + VM |
| arrayVec3Reverse | Array Vec3 Reverse / 배열 역순 사본 · Vec3 | array: vec3[] | return: vec3[] | hb::Extended::ArrayVec3Reverse | 공통 C++ + VM |
| arrayVec3Append | Array Vec3 Append / 배열 합친 사본 · Vec3 | array: vec3[], other: vec3[] | return: vec3[] | hb::Extended::ArrayVec3Append | 공통 C++ + VM |
| arrayVec3Slice | Array Vec3 Slice / 배열 구간 사본 · Vec3 | array: vec3[], start: int, count: int | return: vec3[] | hb::Extended::ArrayVec3Slice | 공통 C++ + VM |
| arrayVec3Unique | Array Vec3 Unique / 중복 없는 배열 사본 · Vec3 | array: vec3[] | return: vec3[] | hb::Extended::ArrayVec3Unique | 공통 C++ + VM |
| arrayColorLength | Array Color Length / 배열 길이 · Color | array: color[] | return: int | hb::Extended::ArrayColorLength | 공통 C++ + VM |
| arrayColorLastIndex | Array Color Last Index / 마지막 배열 인덱스 · Color | array: color[] | return: int | hb::Extended::ArrayColorLastIndex | 공통 C++ + VM |
| arrayColorIsEmpty | Array Color Is Empty / 빈 배열 · Color | array: color[] | return: bool | hb::Extended::ArrayColorIsEmpty | 공통 C++ + VM |
| arrayColorIsValidIndex | Array Color Is Valid Index / 유효한 배열 인덱스 · Color | array: color[], index: int | return: bool | hb::Extended::ArrayColorIsValidIndex | 공통 C++ + VM |
| arrayColorGet | Array Color Get / 배열 원소 읽기 · Color | array: color[], index: int | return: color | hb::Extended::ArrayColorGet | 공통 C++ + VM |
| arrayColorFind | Array Color Find / 배열 원소 찾기 · Color | array: color[], item: color | return: int | hb::Extended::ArrayColorFind | 공통 C++ + VM |
| arrayColorContains | Array Color Contains / 배열 원소 포함 · Color | array: color[], item: color | return: bool | hb::Extended::ArrayColorContains | 공통 C++ + VM |
| arrayColorReverse | Array Color Reverse / 배열 역순 사본 · Color | array: color[] | return: color[] | hb::Extended::ArrayColorReverse | 공통 C++ + VM |
| arrayColorAppend | Array Color Append / 배열 합친 사본 · Color | array: color[], other: color[] | return: color[] | hb::Extended::ArrayColorAppend | 공통 C++ + VM |
| arrayColorSlice | Array Color Slice / 배열 구간 사본 · Color | array: color[], start: int, count: int | return: color[] | hb::Extended::ArrayColorSlice | 공통 C++ + VM |
| arrayColorUnique | Array Color Unique / 중복 없는 배열 사본 · Color | array: color[] | return: color[] | hb::Extended::ArrayColorUnique | 공통 C++ + VM |
| arrayTransformLength | Array Transform Length / 배열 길이 · Transform | array: transform[] | return: int | hb::Extended::ArrayTransformLength | 공통 C++ + VM |
| arrayTransformLastIndex | Array Transform Last Index / 마지막 배열 인덱스 · Transform | array: transform[] | return: int | hb::Extended::ArrayTransformLastIndex | 공통 C++ + VM |
| arrayTransformIsEmpty | Array Transform Is Empty / 빈 배열 · Transform | array: transform[] | return: bool | hb::Extended::ArrayTransformIsEmpty | 공통 C++ + VM |
| arrayTransformIsValidIndex | Array Transform Is Valid Index / 유효한 배열 인덱스 · Transform | array: transform[], index: int | return: bool | hb::Extended::ArrayTransformIsValidIndex | 공통 C++ + VM |
| arrayTransformGet | Array Transform Get / 배열 원소 읽기 · Transform | array: transform[], index: int | return: transform | hb::Extended::ArrayTransformGet | 공통 C++ + VM |
| arrayTransformFind | Array Transform Find / 배열 원소 찾기 · Transform | array: transform[], item: transform | return: int | hb::Extended::ArrayTransformFind | 공통 C++ + VM |
| arrayTransformContains | Array Transform Contains / 배열 원소 포함 · Transform | array: transform[], item: transform | return: bool | hb::Extended::ArrayTransformContains | 공통 C++ + VM |
| arrayTransformReverse | Array Transform Reverse / 배열 역순 사본 · Transform | array: transform[] | return: transform[] | hb::Extended::ArrayTransformReverse | 공통 C++ + VM |
| arrayTransformAppend | Array Transform Append / 배열 합친 사본 · Transform | array: transform[], other: transform[] | return: transform[] | hb::Extended::ArrayTransformAppend | 공통 C++ + VM |
| arrayTransformSlice | Array Transform Slice / 배열 구간 사본 · Transform | array: transform[], start: int, count: int | return: transform[] | hb::Extended::ArrayTransformSlice | 공통 C++ + VM |
| arrayTransformUnique | Array Transform Unique / 중복 없는 배열 사본 · Transform | array: transform[] | return: transform[] | hb::Extended::ArrayTransformUnique | 공통 C++ + VM |

## 물리

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| trace | Raycast / 레이캐스트 | exec: exec, start: vec3, end: vec3 | then: exec, return: hit | — | VM / 브라우저 서비스 |
| lineTrace | Line Trace / 선 충돌 검사 | exec: exec, start: vec3, end: vec3, channel: string | then: exec, hit: hit | — | VM / 브라우저 서비스 |
| impulse | Add Impulse / 충격량 더하기 | exec: exec, target: object, impulse: vec3 | then: exec | hb::Physics::AddImpulse | 공통 C++ + VM |
| collisionEnabled | Set Collision Enabled / 충돌 활성화 | exec: exec, target: object, enabled: bool | then: exec | hb::Physics::SetCollisionEnabled | 공통 C++ + VM |
| getVelocity | Get Velocity / 속도 가져오기 | target: object | return: vec3 | hb::Physics::GetVelocity | 공통 C++ + VM |
| setVelocity | Set Velocity / 속도 설정 | exec: exec, target: object, velocity: vec3 | then: exec | hb::Physics::SetVelocity | 공통 C++ + VM |
| addForce | Add Force / 힘 더하기 | exec: exec, target: object, force: vec3 | then: exec | hb::Physics::AddForce | 공통 C++ + VM |
| getAngularVelocity | Get Angular Velocity / 각속도 가져오기 | target: object | return: vec3 | hb::Physics::GetAngularVelocity | 공통 C++ + VM |
| setAngularVelocity | Set Angular Velocity / 각속도 설정 | exec: exec, target: object, velocity: vec3 | then: exec | hb::Physics::SetAngularVelocity | 공통 C++ + VM |
| physicsMass | Get Mass / 실제 질량 가져오기 | target: object | return: float | hb::Physics::GetMass | 공통 C++ + VM |
| physicsSleeping | Is Sleeping / 수면 상태 가져오기 | target: object | return: bool | hb::Physics::IsSleeping | 공통 C++ + VM |
| physicsSleep | Set Sleeping / 강체 수면 설정 | exec: exec, target: object, sleeping: bool | then: exec | hb::Physics::SetSleeping | 공통 C++ + VM |
| physicsForce | Apply Force / 모드로 힘 적용 | exec: exec, target: object, force: vec3, mode: string | then: exec | hb::Physics::ApplyForce | 공통 C++ + VM |
| physicsForceAt | Apply Force At Position / 위치에 힘 적용 | exec: exec, target: object, force: vec3, position: vec3, mode: string | then: exec | hb::Physics::ApplyForceAtPosition | 공통 C++ + VM |
| physicsTorque | Add Torque / 토크 적용 | exec: exec, target: object, torque: vec3 | then: exec | hb::Physics::AddTorque | 공통 C++ + VM |
| physicsAngularImpulse | Add Angular Impulse / 각 충격량 적용 | exec: exec, target: object, impulse: vec3 | then: exec | hb::Physics::AddAngularImpulse | 공통 C++ + VM |

## 오브젝트

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| members | Get Object Members / 공개 멤버 읽기 | target: object | name: string, position: vec3, visible: bool | — | VM / 브라우저 서비스 |
| isValid | Is Valid / 객체 유효성 | target: object | return: bool | — | VM / 브라우저 서비스 |
| cast | Cast To Class / 클래스 변환 | exec: exec, target: object, class: string | then: exec, object: object, failed: exec | — | 기본 객체 클래스 검사 |
| self | Self / 자기 자신 | — | return: object | — | VM / 브라우저 서비스 |
| spawn | Spawn Actor / 액터 생성 | exec: exec, class: string, transform: transform | then: exec, actor: object | — | VM / 브라우저 서비스 |
| destroy | Destroy Actor / 액터 제거 | exec: exec, target: object | then: exec | — | VM / 브라우저 서비스 |
| visibility | Set Visibility / 표시 설정 | exec: exec, target: object, visible: bool | then: exec | — | VM / 브라우저 서비스 |
| attach | Attach To / 부모에 연결 | exec: exec, target: object, parent: object | then: exec | — | VM / 브라우저 서비스 |

## C++ 공개 함수

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| door | Open Door / 문 열기 | exec: exec | then: exec | — | VM / 브라우저 서비스 |

## 오디오

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| sound | Play Sound / 효과음 재생 | exec: exec, name: string | then: exec | — | VM / 브라우저 서비스 |
| playSoundAt | Play Sound At Location / 위치에서 소리 재생 | exec: exec, sound: string, position: vec3, volume: float | then: exec | — | 오디오 재생; 위치 음향 없음 |
| stopSound | Stop Sound / 소리 정지 | exec: exec, sound: string | then: exec | — | VM / 브라우저 서비스 |
| mixerSet | Set Float / 믹서 파라미터 지정 | exec: exec, target: object, asset: string, parameter: string, value: float | then: exec | hb::AudioMixer::SetFloat | 공통 C++ + VM |
| mixerGet | Get Float / 믹서 파라미터 가져오기 | target: object, asset: string, parameter: string | return: float | hb::AudioMixer::GetFloat | 공통 C++ + VM |
| mixerClear | Clear Float / 믹서 파라미터 재정의 해제 | exec: exec, target: object, asset: string, parameter: string | then: exec | hb::AudioMixer::ClearFloat | 공통 C++ + VM |
| mixerSnapshot | Transition To / 믹서 스냅샷 전환 | exec: exec, target: object, asset: string, snapshot: string, duration: float | then: exec | hb::AudioMixer::TransitionTo | 공통 C++ + VM |

## 사용자 정의

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| customFunction | Custom Function / 사용자 함수 | exec: exec | then: exec | — | VM / 브라우저 서비스 |
| reroute | Reroute / 연결 정리 | value: float | value: float | — | VM / 브라우저 서비스 |

## 시간

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| timeline | Timeline / 타임라인 | play: exec, start: exec, stop: exec, reverse: exec, reverseEnd: exec, setTime: exec, time: float | update: exec, finished: exec, direction: string | — | VM / 브라우저 서비스 |
| timer | Set Timer / 타이머 설정 | exec: exec, duration: float, loop: bool, event: string | then: exec, handle: string | hb::Timers::SetTimer | 공통 C++ + VM |
| clearTimer | Clear Timer / 타이머 해제 | exec: exec, handle: string | then: exec | hb::Timers::ClearTimer | 공통 C++ + VM |
| time | Get Game Time / 게임 시간 초 시간측정 | — | return: float | hb::Clock::GetGameTime | 공통 C++ + VM |
| deltaSeconds | Get World Delta Seconds / 프레임 델타 시간 | — | return: float | hb::Clock::GetWorldDeltaSeconds | 공통 C++ + VM |
| realTime | Get Real Time / 실제 경과 시간 초 | — | return: float | hb::Clock::GetRealTime | 공통 C++ + VM |
| timeScale | Set Time Scale / 게임 시간 배율 | exec: exec, scale: float | then: exec | hb::Clock::SetTimeScale | 공통 C++ + VM |
| gamePaused | Set Paused / 게임 시간 일시정지 | exec: exec, paused: bool | then: exec | hb::Clock::SetPaused | 공통 C++ + VM |
| pauseTimer | Pause Timer / 타이머 일시정지 | exec: exec, handle: string | then: exec | hb::Timers::PauseTimer | 공통 C++ + VM |
| resumeTimer | Resume Timer / 타이머 재개 | exec: exec, handle: string | then: exec | hb::Timers::ResumeTimer | 공통 C++ + VM |
| timerElapsed | Get Timer Elapsed / 타이머 경과 시간 | handle: string | return: float | hb::Timers::GetTimerElapsed | 공통 C++ + VM |
| timerRemaining | Get Timer Remaining / 타이머 남은 시간 | handle: string | return: float | hb::Timers::GetTimerRemaining | 공통 C++ + VM |
| timerActive | Is Timer Active / 타이머 활성 여부 | handle: string | return: bool | hb::Timers::IsTimerActive | 공통 C++ + VM |
| startStopwatch | Start Stopwatch / 시간측정 시작 스톱워치 | exec: exec, name: string | then: exec, handle: string | hb::Timers::StartStopwatch | 공통 C++ + VM |
| stopwatchElapsed | Get Stopwatch Elapsed / 시간측정 경과 스톱워치 | handle: string | return: float | hb::Timers::GetStopwatchElapsed | 공통 C++ + VM |
| stopStopwatch | Stop Stopwatch / 시간측정 종료 스톱워치 | exec: exec, handle: string | then: exec, return: float | hb::Timers::StopStopwatch | 공통 C++ + VM |

## 비교

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| greater | Greater / 크다 | a: float, b: float | return: bool | — | VM / 브라우저 서비스 |
| less | Less / 작다 | a: float, b: float | return: bool | — | VM / 브라우저 서비스 |
| equal | Equal / 같다 | a: float, b: float | return: bool | — | VM / 브라우저 서비스 |
| notEqual | Not Equal / 다르다 | a: float, b: float | return: bool | — | VM / 브라우저 서비스 |
| greaterEqual | Greater Equal / 크거나 같다 | a: float, b: float | return: bool | hb::Extended::GreaterEqual | 공통 C++ + VM |
| lessEqual | Less Equal / 작거나 같다 | a: float, b: float | return: bool | hb::Extended::LessEqual | 공통 C++ + VM |
| inRange | In Range / 범위 안에 있는 실수 | value: float, min: float, max: float | return: bool | hb::Extended::InRange | 공통 C++ + VM |
| nearlyZero | Nearly Zero / 거의 0 | value: float, tolerance: float | return: bool | hb::Extended::NearlyZero | 공통 C++ + VM |

## 논리

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| and | AND / 그리고 | a: bool, b: bool | return: bool | — | VM / 브라우저 서비스 |
| or | OR / 또는 | a: bool, b: bool | return: bool | — | VM / 브라우저 서비스 |
| not | NOT / 반전 | value: bool | return: bool | — | VM / 브라우저 서비스 |
| select | Select Float / 조건 값 선택 | condition: bool, a: float, b: float | return: float | — | VM / 브라우저 서비스 |
| boolXor | Bool Xor / 불리언 배타적 OR | a: bool, b: bool | return: bool | hb::Extended::BoolXor | 공통 C++ + VM |
| boolNand | Bool Nand / 불리언 NAND | a: bool, b: bool | return: bool | hb::Extended::BoolNand | 공통 C++ + VM |
| boolNor | Bool Nor / 불리언 NOR | a: bool, b: bool | return: bool | hb::Extended::BoolNor | 공통 C++ + VM |

## 컴포넌트

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| getComponent | Get Component / 컴포넌트 찾기 | target: object, class: string | return: object | — | VM / 브라우저 서비스 |
| addComponent | Add Component / 컴포넌트 추가 | exec: exec, target: object, class: string | then: exec, return: object | — | VM / 브라우저 서비스 |
| componentEnabled | Set Component Enabled / 컴포넌트 활성화 | exec: exec, target: object, enabled: bool | then: exec | — | VM / 브라우저 서비스 |

## 문자열

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| concat | Append String / 문자열 합치기 | a: string, b: string | return: string | — | VM / 브라우저 서비스 |
| stringLength | String Length / 문자열 길이 | value: string | return: int | — | VM / 브라우저 서비스 |
| contains | Contains / 문자열 포함 | value: string, search: string | return: bool | — | VM / 브라우저 서비스 |
| toString | Float To String / 실수를 문자열로 | value: float | return: string | — | function toString() { [native code] } |
| stringEqual | String Equal / 문자열 같다 | a: string, b: string | return: bool | hb::Extended::StringEqual | 공통 C++ + VM |
| stringNotEqual | String Not Equal / 문자열 다르다 | a: string, b: string | return: bool | hb::Extended::StringNotEqual | 공통 C++ + VM |
| startsWith | Starts With / 문자열로 시작하는지 | value: string, search: string | return: bool | hb::Extended::StartsWith | 공통 C++ + VM |
| endsWith | Ends With / 문자열로 끝나는지 | value: string, search: string | return: bool | hb::Extended::EndsWith | 공통 C++ + VM |
| stringIsEmpty | String Is Empty / 빈 문자열 | value: string | return: bool | hb::Extended::StringIsEmpty | 공통 C++ + VM |
| unicodeLength | Unicode Length / 한글 포함 문자 수 | value: string | return: int | hb::Extended::UnicodeLength | 공통 C++ + VM |
| reverseString | Reverse String / 문자열 뒤집기 | value: string | return: string | hb::Extended::ReverseString | 공통 C++ + VM |
| leftString | Left String / 앞에서 문자열 자르기 | value: string, count: int | return: string | hb::Extended::LeftString | 공통 C++ + VM |
| rightString | Right String / 뒤에서 문자열 자르기 | value: string, count: int | return: string | hb::Extended::RightString | 공통 C++ + VM |
| leftChop | Left Chop / 뒤쪽 문자 제거 | value: string, count: int | return: string | hb::Extended::LeftChop | 공통 C++ + VM |
| rightChop | Right Chop / 앞쪽 문자 제거 | value: string, count: int | return: string | hb::Extended::RightChop | 공통 C++ + VM |
| substring | Substring / 문자열 구간 | value: string, start: int, count: int | return: string | hb::Extended::Substring | 공통 C++ + VM |
| findString | Find String / 문자열 위치 찾기 | value: string, search: string | return: int | hb::Extended::FindString | 공통 C++ + VM |
| replaceString | Replace String / 문자열 모두 바꾸기 | value: string, search: string, replacement: string | return: string | hb::Extended::ReplaceString | 공통 C++ + VM |
| splitString | Split String / 문자열 분리 배열 | value: string, separator: string | return: string[] | hb::Extended::SplitString | 공통 C++ + VM |
| joinStrings | Join Strings / 문자열 배열 합치기 | values: string[], separator: string | return: string | hb::Extended::JoinStrings | 공통 C++ + VM |
| trimString | Trim String / 공백 문자 제거 | value: string | return: string | hb::Extended::TrimString | 공통 C++ + VM |
| lowerString | Lower String / 영문 소문자로 | value: string | return: string | hb::Extended::LowerString | 공통 C++ + VM |
| upperString | Upper String / 영문 대문자로 | value: string | return: string | hb::Extended::UpperString | 공통 C++ + VM |

## 애니메이션

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| playAnimation | Play Animation / 애니메이션 재생 | exec: exec, target: object, clip: string, loop: bool | then: exec | — | VM / 브라우저 서비스 |
| stopAnimation | Stop Animation / 애니메이션 정지 | exec: exec, target: object | then: exec | — | VM / 브라우저 서비스 |

## 렌더링

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| setMaterial | Set Material / 머테리얼 지정 | exec: exec, target: object, material: string, slot: int | then: exec | — | VM / 브라우저 서비스 |
| materialFloat | Set Material Float / 머테리얼 실수 설정 | exec: exec, target: object, parameter: string, value: float | then: exec | — | VM / 브라우저 서비스 |
| lightIntensity | Set Light Intensity / 광원 밝기 설정 | exec: exec, target: object, value: float | then: exec | — | VM / 브라우저 서비스 |

## UI

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| createWidget | Create Widget / 위젯 생성 | exec: exec, class: string | then: exec, widget: object | — | VM / 브라우저 서비스 |
| addViewport | Add To Viewport / 뷰포트에 위젯 추가 | exec: exec, widget: object | then: exec | — | VM / 브라우저 서비스 |
| setText | Set Text / 텍스트 설정 | exec: exec, widget: object, text: string | then: exec | — | VM / 브라우저 서비스 |
| uiShow | Show / 위젯 UI 표시 | exec: exec, target: object, asset: string, instance: string | then: exec | hb::UI::Show | 공통 C++ + VM |
| uiRemove | Remove / 위젯 UI 제거 | exec: exec, target: object, instance: string | then: exec | hb::UI::Remove | 공통 C++ + VM |
| uiSetText | Set Text / 위젯 텍스트 지정 | exec: exec, target: object, instance: string, element: string, text: string | then: exec | hb::UI::SetText | 공통 C++ + VM |
| uiGetText | Get Text / 위젯 텍스트 가져오기 | target: object, instance: string, element: string | return: string | hb::UI::GetText | 공통 C++ + VM |
| uiSetValue | Set Value / 위젯 값 지정 | exec: exec, target: object, instance: string, element: string, value: float | then: exec | hb::UI::SetValue | 공통 C++ + VM |
| uiGetValue | Get Value / 위젯 값 가져오기 | target: object, instance: string, element: string | return: float | hb::UI::GetValue | 공통 C++ + VM |
| uiSetVisible | Set Visible / 위젯 표시 상태 | exec: exec, target: object, instance: string, element: string, visible: bool | then: exec | hb::UI::SetVisible | 공통 C++ + VM |
| uiSetEnabled | Set Enabled / 위젯 활성 상태 | exec: exec, target: object, instance: string, element: string, enabled: bool | then: exec | hb::UI::SetEnabled | 공통 C++ + VM |
| uiFocus | Focus / 위젯 입력 포커스 | exec: exec, target: object, instance: string, element: string | then: exec | hb::UI::Focus | 공통 C++ + VM |

## 저장

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| saveGame | Save Game / 게임 저장 | exec: exec, slot: string | then: exec, success: bool | — | VM / 브라우저 서비스 |
| loadGame | Load Game / 게임 불러오기 | exec: exec, slot: string | then: exec, data: object | — | VM / 브라우저 서비스 |

## 정수

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| intAdd | Int Add / 정수 더하기 | a: int, b: int | return: int | hb::Extended::IntAdd | 공통 C++ + VM |
| intSubtract | Int Subtract / 정수 빼기 | a: int, b: int | return: int | hb::Extended::IntSubtract | 공통 C++ + VM |
| intMultiply | Int Multiply / 정수 곱하기 | a: int, b: int | return: int | hb::Extended::IntMultiply | 공통 C++ + VM |
| intDivide | Int Divide / 정수 나누기 | a: int, b: int | return: int | hb::Extended::IntDivide | 공통 C++ + VM |
| intModulo | Int Modulo / 정수 나머지 | a: int, b: int | return: int | hb::Extended::IntModulo | 공통 C++ + VM |
| bitAnd | Bit And / 비트 AND | a: int, b: int | return: int | hb::Extended::BitAnd | 공통 C++ + VM |
| bitOr | Bit Or / 비트 OR | a: int, b: int | return: int | hb::Extended::BitOr | 공통 C++ + VM |
| bitXor | Bit Xor / 비트 XOR | a: int, b: int | return: int | hb::Extended::BitXor | 공통 C++ + VM |
| intMin | Int Min / 정수 최솟값 | a: int, b: int | return: int | hb::Extended::IntMin | 공통 C++ + VM |
| intMax | Int Max / 정수 최댓값 | a: int, b: int | return: int | hb::Extended::IntMax | 공통 C++ + VM |
| intEqual | Int Equal / 정수 같다 | a: int, b: int | return: bool | hb::Extended::IntEqual | 공통 C++ + VM |
| intNotEqual | Int Not Equal / 정수 다르다 | a: int, b: int | return: bool | hb::Extended::IntNotEqual | 공통 C++ + VM |
| intGreater | Int Greater / 정수 크다 | a: int, b: int | return: bool | hb::Extended::IntGreater | 공통 C++ + VM |
| intLess | Int Less / 정수 작다 | a: int, b: int | return: bool | hb::Extended::IntLess | 공통 C++ + VM |

## 벡터2

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| vector2Multiply | Vector2 Multiply / 벡터2 성분 곱하기 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Multiply | 공통 C++ + VM |
| vector2Divide | Vector2 Divide / 벡터2 성분 나누기 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Divide | 공통 C++ + VM |
| vector2Min | Vector2 Min / 벡터2 성분 최솟값 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Min | 공통 C++ + VM |
| vector2Max | Vector2 Max / 벡터2 성분 최댓값 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Max | 공통 C++ + VM |
| vector2Abs | Vector2 Abs / 벡터2 절댓값 | value: vec2 | return: vec2 | hb::Extended::Vector2Abs | 공통 C++ + VM |
| vector2Negate | Vector2 Negate / 벡터2 반전 | value: vec2 | return: vec2 | hb::Extended::Vector2Negate | 공통 C++ + VM |
| vector2Floor | Vector2 Floor / 벡터2 내림 | value: vec2 | return: vec2 | hb::Extended::Vector2Floor | 공통 C++ + VM |
| vector2Ceil | Vector2 Ceil / 벡터2 올림 | value: vec2 | return: vec2 | hb::Extended::Vector2Ceil | 공통 C++ + VM |
| vector2NearlyEqual | Vector2 Nearly Equal / 벡터2 거의 같다 | a: vec2, b: vec2, tolerance: float | return: bool | hb::Extended::Vector2NearlyEqual | 공통 C++ + VM |
| vector2IsZero | Vector2 Is Zero / 벡터2 거의 0 | value: vec2, tolerance: float | return: bool | hb::Extended::Vector2IsZero | 공통 C++ + VM |
| vector2Clamp | Vector2 Clamp / 벡터2 성분 제한 | value: vec2, min: float, max: float | return: vec2 | hb::Extended::Vector2Clamp | 공통 C++ + VM |
| vector2GetX | Vector2 Get X / 벡터2 X 성분 읽기 | value: vec2 | return: float | hb::Extended::Vector2GetX | 공통 C++ + VM |
| vector2GetY | Vector2 Get Y / 벡터2 Y 성분 읽기 | value: vec2 | return: float | hb::Extended::Vector2GetY | 공통 C++ + VM |
| vector2Add | Vector2 Add / 벡터2 더하기 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Add | 공통 C++ + VM |
| vector2Subtract | Vector2 Subtract / 벡터2 빼기 | a: vec2, b: vec2 | return: vec2 | hb::Extended::Vector2Subtract | 공통 C++ + VM |
| vector2Dot | Vector2 Dot / 벡터2 내적 | a: vec2, b: vec2 | return: float | hb::Extended::Vector2Dot | 공통 C++ + VM |
| vector2Cross | Vector2 Cross / 벡터2 외적 | a: vec2, b: vec2 | return: float | hb::Extended::Vector2Cross | 공통 C++ + VM |
| vector2Distance | Vector2 Distance / 벡터2 거리 | a: vec2, b: vec2 | return: float | hb::Extended::Vector2Distance | 공통 C++ + VM |
| vector2Lerp | Vector2 Lerp / 벡터2 보간 | a: vec2, b: vec2, alpha: float | return: vec2 | hb::Extended::Vector2Lerp | 공통 C++ + VM |
| vector2Rotate | Vector2 Rotate / 벡터2 회전 | value: vec2, degrees: float | return: vec2 | hb::Extended::Vector2Rotate | 공통 C++ + VM |

## 회전

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| rotateVector | Rotate Vector / 벡터 회전 | value: vec3, rotation: vec3 | return: vec3 | hb::Extended::RotateVector | 공통 C++ + VM |
| unrotateVector | Unrotate Vector / 벡터 역회전 | value: vec3, rotation: vec3 | return: vec3 | hb::Extended::UnrotateVector | 공통 C++ + VM |
| forwardVector | Forward Vector / 회전의 전방 벡터 | rotation: vec3 | return: vec3 | hb::Extended::ForwardVector | 공통 C++ + VM |
| rightVector | Right Vector / 회전의 오른쪽 벡터 | rotation: vec3 | return: vec3 | hb::Extended::RightVector | 공통 C++ + VM |
| upVector | Up Vector / 회전의 위쪽 벡터 | rotation: vec3 | return: vec3 | hb::Extended::UpVector | 공통 C++ + VM |
| normalizeAngle | Normalize Angle / 각도 -180~180 정규화 | degrees: float | return: float | hb::Extended::NormalizeAngle | 공통 C++ + VM |
| deltaAngle | Delta Angle / 최단 각도 차이 | a: float, b: float | return: float | hb::Extended::DeltaAngle | 공통 C++ + VM |
| lerpAngle | Lerp Angle / 최단 각도 보간 | a: float, b: float, alpha: float | return: float | hb::Extended::LerpAngle | 공통 C++ + VM |
| lookAtRotation | Look At Rotation / 목표 방향 회전 | start: vec3, target: vec3 | return: vec3 | hb::Extended::LookAtRotation | 공통 C++ + VM |

## 색상

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| colorRed | Color Red / 색상 빨강 | value: color | return: float | hb::Extended::ColorRed | 공통 C++ + VM |
| colorGreen | Color Green / 색상 초록 | value: color | return: float | hb::Extended::ColorGreen | 공통 C++ + VM |
| colorBlue | Color Blue / 색상 파랑 | value: color | return: float | hb::Extended::ColorBlue | 공통 C++ + VM |
| colorAlpha | Color Alpha / 색상 알파 | value: color | return: float | hb::Extended::ColorAlpha | 공통 C++ + VM |
| colorLerp | Color Lerp / 색상 보간 | a: color, b: color, alpha: float | return: color | hb::Extended::ColorLerp | 공통 C++ + VM |
| colorMultiply | Color Multiply / 색상 곱하기 | a: color, b: color | return: color | hb::Extended::ColorMultiply | 공통 C++ + VM |
| colorLuminance | Color Luminance / 색상 휘도 | value: color | return: float | hb::Extended::ColorLuminance | 공통 C++ + VM |
| colorInvert | Color Invert / 색상 반전 | value: color | return: color | hb::Extended::ColorInvert | 공통 C++ + VM |
| sRGBToLinear | SRGBTo Linear / sRGB를 선형 색상으로 | value: color | return: color | hb::Extended::SRGBToLinear | 공통 C++ + VM |
| linearToSRGB | Linear To SRGB / 선형 색상을 sRGB로 | value: color | return: color | hb::Extended::LinearToSRGB | 공통 C++ + VM |

## 게임플레이

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| getGameMode | Get Game Mode / 게임 모드 가져오기 | — | return: object | hb::Gameplay::GetGameMode | 공통 C++ + VM |
| getGameState | Get Game State / 게임 상태 가져오기 | — | return: object | hb::Gameplay::GetGameState | 공통 C++ + VM |
| getPlayerController | Get Player Controller / 플레이어 컨트롤러 가져오기 | — | return: object | hb::Gameplay::GetPlayerController | 공통 C++ + VM |
| getPlayerState | Get Player State / 플레이어 상태 가져오기 | — | return: object | hb::Gameplay::GetPlayerState | 공통 C++ + VM |
| getPlayerPawn | Get Player Pawn / 플레이어 폰 가져오기 | — | return: object | hb::Gameplay::GetPlayerPawn | 공통 C++ + VM |
| possess | Possess / 폰 제어권 연결 | exec: exec, controller: object, pawn: object | then: exec | hb::Gameplay::Possess | 공통 C++ + VM |
| unPossess | Un Possess / 폰 제어권 해제 | exec: exec, controller: object | then: exec | hb::Gameplay::UnPossess | 공통 C++ + VM |
| addMovementInput | Add Movement Input / 이동 입력 더하기 | exec: exec, target: object, direction: vec3, scale: float | then: exec | hb::Gameplay::AddMovementInput | 공통 C++ + VM |
| jump | Jump / 캐릭터 점프 | exec: exec, target: object | then: exec | hb::Gameplay::Jump | 공통 C++ + VM |

## 오브젝트 풀

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| poolAcquire | Acquire / 재사용 오브젝트 꺼내기 | exec: exec, pool: object[], transform: transform | then: exec, return: object | hb::ActorPool::Acquire | 공통 C++ + VM |
| poolRelease | Release / 재사용 오브젝트 반환 | exec: exec, target: object | then: exec | hb::ActorPool::Release | 공통 C++ + VM |
| poolActive | Is Active / 재사용 오브젝트 활성 상태 | target: object | return: bool | hb::ActorPool::IsActive | 공통 C++ + VM |

## 입력

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| inputKeyDown | Is Key Down / 키·마우스 버튼 눌림 | key: string | return: bool | hb::Input::IsKeyDown | 공통 C++ + VM |
| inputAxisValue | Get Axis / 입력 축 값 가져오기 | key: string | return: float | hb::Input::GetAxis | 공통 C++ + VM |
| mousePosition | Get Mouse Position / 마우스 위치 가져오기 | — | return: bool, position: vec2 | hb::Input::GetMousePosition | 공통 C++ + VM |
| mouseDelta | Get Mouse Delta / 마우스 이동량 가져오기 | — | return: vec2 | hb::Input::GetMouseDelta | 공통 C++ + VM |
| mouseRay | Deproject Mouse Position To World / 마우스 월드 방향 가져오기 | — | return: bool, origin: vec3, direction: vec3 | hb::Input::DeprojectMousePositionToWorld | 공통 C++ + VM |
| mouseWorldPlane | Get Mouse World Position / 마우스 조준 평면 위치 | normal: vec3, point: vec3 | return: bool, position: vec3 | hb::Input::GetMouseWorldPosition | 공통 C++ + VM |

## 입력 액션

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| actionValue | Get Action Value / 입력 액션 값 | target: object, action: string | return: vec3 | hb::Input::GetActionValue | 공통 C++ + VM |
| actionState | Get Action State / 입력 액션 상태 | target: object, action: string | return: string | hb::Input::GetActionState | 공통 C++ + VM |
| actionEvent | Has Action Event / 입력 액션 이벤트 여부 | target: object, action: string, event: string | return: bool | hb::Input::HasActionEvent | 공통 C++ + VM |
| actionElapsed | Get Action Elapsed / 입력 액션 유지 시간 | target: object, action: string | return: float | hb::Input::GetActionElapsed | 공통 C++ + VM |
| inputAddContext | Add Mapping Context / 입력 컨텍스트 추가 | exec: exec, target: object, context: string, priority: int | then: exec | hb::Input::AddMappingContext | 공통 C++ + VM |
| inputRemoveContext | Remove Mapping Context / 입력 컨텍스트 제거 | exec: exec, target: object, context: string | then: exec | hb::Input::RemoveMappingContext | 공통 C++ + VM |

## 2D 스프라이트

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| spriteFlip | Set Flip / 스프라이트 좌우·상하 반전 | exec: exec, target: object, flipX: bool, flipY: bool | then: exec | hb::Sprites::SetFlip | 공통 C++ + VM |
| spriteGetFlip | Get Flip / 스프라이트 반전 가져오기 | target: object | flipX: bool, flipY: bool | hb::Sprites::GetFlip | 공통 C++ + VM |
| spriteSet | Set Sprite / 스프라이트 지정 | exec: exec, target: object, sprite: string | then: exec | hb::Sprites::SetSprite | 공통 C++ + VM |
| spriteGet | Get Sprite / 스프라이트 가져오기 | target: object | return: string | hb::Sprites::GetSprite | 공통 C++ + VM |
| spriteSetColor | Set Color / 스프라이트 색상 지정 | exec: exec, target: object, color: color | then: exec | hb::Sprites::SetColor | 공통 C++ + VM |
| spriteGetColor | Get Color / 스프라이트 색상 가져오기 | target: object | return: color | hb::Sprites::GetColor | 공통 C++ + VM |
| spriteSetSize | Set Size / 스프라이트 크기 지정 | exec: exec, target: object, size: vec2 | then: exec | hb::Sprites::SetSize | 공통 C++ + VM |
| spriteGetSize | Get Size / 스프라이트 설정 크기 가져오기 | target: object | return: vec2 | hb::Sprites::GetSize | 공통 C++ + VM |
| spriteSetSorting | Set Sorting / 스프라이트 정렬 지정 | exec: exec, target: object, layer: string, order: int | then: exec | hb::Sprites::SetSorting | 공통 C++ + VM |
| spriteGetSorting | Get Sorting / 스프라이트 정렬 가져오기 | target: object | layer: string, order: int | hb::Sprites::GetSorting | 공통 C++ + VM |
| spriteSetMask | Set Mask Interaction / 스프라이트 마스크 지정 | exec: exec, target: object, mode: string | then: exec | hb::Sprites::SetMaskInteraction | 공통 C++ + VM |
| spriteGetMask | Get Mask Interaction / 스프라이트 마스크 가져오기 | target: object | return: string | hb::Sprites::GetMaskInteraction | 공통 C++ + VM |
| spriteSetLit | Set Lit / 스프라이트 광원 적용 | exec: exec, target: object, lit: bool | then: exec | hb::Sprites::SetLit | 공통 C++ + VM |
| spriteIsLit | Is Lit / 스프라이트 광원 적용 여부 | target: object | return: bool | hb::Sprites::IsLit | 공통 C++ + VM |

## 2D 타일맵

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| tileGet | Get Tile / 타일 가져오기 | target: object, layer: string, cell: vec2 | return: int | hb::Tilemaps::GetTile | 공통 C++ + VM |
| tileHas | Has Tile / 타일 존재 여부 | target: object, layer: string, cell: vec2 | return: bool | hb::Tilemaps::HasTile | 공통 C++ + VM |
| tileSet | Set Tile / 타일 지정·삭제 | exec: exec, target: object, layer: string, cell: vec2, index: int | then: exec | hb::Tilemaps::SetTile | 공통 C++ + VM |
| tileBoxFill | Box Fill / 타일 영역 채우기 | exec: exec, target: object, layer: string, cell: vec2, end: vec2, index: int | then: exec | hb::Tilemaps::BoxFill | 공통 C++ + VM |
| tileFloodFill | Flood Fill / 같은 타일 채우기 | exec: exec, target: object, layer: string, cell: vec2, index: int | then: exec | hb::Tilemaps::FloodFill | 공통 C++ + VM |
| tileClear | Clear Tiles / 타일 레이어 비우기 | exec: exec, target: object, layer: string | then: exec | hb::Tilemaps::ClearTiles | 공통 C++ + VM |
| tileWorldToCell | World To Cell / 월드 좌표를 타일 셀로 | target: object, position: vec3 | return: vec2 | hb::Tilemaps::WorldToCell | 공통 C++ + VM |
| tileCellToWorld | Get Cell Center World / 타일 중심 월드 좌표 | target: object, cell: vec2 | return: vec3 | hb::Tilemaps::GetCellCenterWorld | 공통 C++ + VM |
| tileRefresh | Refresh Tile / 타일 새로고침 | exec: exec, target: object, layer: string, cell: vec2 | then: exec | hb::Tilemaps::RefreshTile | 공통 C++ + VM |
| tileProcessChanges | Process Tilemap Changes / 타일 화면·충돌 즉시 갱신 | exec: exec, target: object | then: exec | hb::Tilemaps::ProcessTilemapChanges | 공통 C++ + VM |
| tileHasChanges | Has Tilemap Changes / 타일 변경 대기 여부 | target: object | return: bool | hb::Tilemaps::HasTilemapChanges | 공통 C++ + VM |
| tileLayerVisible | Set Layer Visible / 타일 레이어 표시 | exec: exec, target: object, layer: string, visible: bool | then: exec | hb::Tilemaps::SetLayerVisible | 공통 C++ + VM |

## 물리 질의

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| physicsRaycast | Raycast / 충돌체 레이캐스트 | start: vec3, end: vec3, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: hit | hb::Physics::Raycast | 공통 C++ + VM |
| physicsRaycastAll | Raycast All / 모든 충돌체 레이캐스트 | start: vec3, end: vec3, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: hit[] | hb::Physics::RaycastAll | 공통 C++ + VM |
| physicsSphereCast | Sphere Cast / 구체 이동 충돌 검사 | start: vec3, end: vec3, radius: float, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: hit | hb::Physics::SphereCast | 공통 C++ + VM |
| physicsBoxCast | Box Cast / 상자 이동 충돌 검사 | start: vec3, end: vec3, extent: vec3, rotation: vec3, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: hit | hb::Physics::BoxCast | 공통 C++ + VM |
| physicsOverlapSphere | Overlap Sphere / 구체 겹침 검사 | center: vec3, radius: float, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: object[] | hb::Physics::OverlapSphere | 공통 C++ + VM |
| physicsOverlapBox | Overlap Box / 상자 겹침 검사 | center: vec3, extent: vec3, rotation: vec3, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: object[] | hb::Physics::OverlapBox | 공통 C++ + VM |
| physicsClosestPoint | Closest Point / 가장 가까운 충돌체 점 | point: vec3, dimension: int, mask: int, includeTriggers: bool, ignore: object | return: hit | hb::Physics::ClosestPoint | 공통 C++ + VM |

## AI

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| runBehaviorTree | Run Behavior Tree / 행동트리 실행 | exec: exec, target: object, asset: string | then: exec | hb::AI::RunBehaviorTree | 공통 C++ + VM |
| stopBehaviorTree | Stop Behavior Tree / 행동트리 정지 | exec: exec, target: object | then: exec | hb::AI::StopBehaviorTree | 공통 C++ + VM |
| behaviorTaskHandle | Get Task Handle / 실행 중 태스크 핸들 | target: object, node: string | return: string | hb::AI::GetTaskHandle | 공통 C++ + VM |
| behaviorTaskFinish | Finish Task / 태스크 완료 | exec: exec, target: object, task: string, success: bool | then: exec | hb::AI::FinishTask | 공통 C++ + VM |
| blackboardSetBool | Set Bool / 블랙보드 불리언 지정 | exec: exec, target: object, key: string, value: bool | then: exec | hb::Blackboard::SetBool | 공통 C++ + VM |
| blackboardGetBool | Get Bool / 블랙보드 불리언 가져오기 | target: object, key: string | return: bool | hb::Blackboard::GetBool | 공통 C++ + VM |
| blackboardSetFloat | Set Float / 블랙보드 실수 지정 | exec: exec, target: object, key: string, value: float | then: exec | hb::Blackboard::SetFloat | 공통 C++ + VM |
| blackboardGetFloat | Get Float / 블랙보드 실수 가져오기 | target: object, key: string | return: float | hb::Blackboard::GetFloat | 공통 C++ + VM |
| blackboardSetInt | Set Int / 블랙보드 정수 지정 | exec: exec, target: object, key: string, value: int | then: exec | hb::Blackboard::SetInt | 공통 C++ + VM |
| blackboardGetInt | Get Int / 블랙보드 정수 가져오기 | target: object, key: string | return: int | hb::Blackboard::GetInt | 공통 C++ + VM |
| blackboardSetString | Set String / 블랙보드 문자열 지정 | exec: exec, target: object, key: string, value: string | then: exec | hb::Blackboard::SetString | 공통 C++ + VM |
| blackboardGetString | Get String / 블랙보드 문자열 가져오기 | target: object, key: string | return: string | hb::Blackboard::GetString | 공통 C++ + VM |
| blackboardSetVector | Set Vector / 블랙보드 벡터 지정 | exec: exec, target: object, key: string, value: vec3 | then: exec | hb::Blackboard::SetVector | 공통 C++ + VM |
| blackboardGetVector | Get Vector / 블랙보드 벡터 가져오기 | target: object, key: string | return: vec3 | hb::Blackboard::GetVector | 공통 C++ + VM |
| blackboardSetObject | Set Object / 블랙보드 오브젝트 지정 | exec: exec, target: object, key: string, value: object | then: exec | hb::Blackboard::SetObject | 공통 C++ + VM |
| blackboardGetObject | Get Object / 블랙보드 오브젝트 가져오기 | target: object, key: string | return: object | hb::Blackboard::GetObject | 공통 C++ + VM |
| blackboardClear | Clear / 블랙보드 키 비우기 | exec: exec, target: object, key: string | then: exec | hb::Blackboard::Clear | 공통 C++ + VM |

## 상태 머신

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| startStateMachine | Start / 상태 머신 실행 | exec: exec, target: object, asset: string | then: exec | hb::States::Start | 공통 C++ + VM |
| stateGet | Get State / 현재 상태 가져오기 | target: object | return: string | hb::States::GetState | 공통 C++ + VM |
| stateEvent | Send Event / 상태 이벤트 보내기 | exec: exec, target: object, event: string | then: exec | hb::States::SendEvent | 공통 C++ + VM |
| stateJump | Jump / 상태 변경 | exec: exec, target: object, state: string | then: exec | hb::States::Jump | 공통 C++ + VM |
| stateStop | Stop / 상태 머신 정지 | exec: exec, target: object | then: exec | hb::States::Stop | 공통 C++ + VM |
| stateSetFloat | Set Float / 상태 파라미터 실수 지정 | exec: exec, target: object, key: string, value: float | then: exec | hb::States::SetFloat | 공통 C++ + VM |
| stateIsActive | Is In State / 계층 상태 활성 확인 | target: object, state: string | return: bool | hb::States::IsInState | 공통 C++ + VM |
| stateGetPath | Get Path / 활성 상태 경로 | target: object | return: string[] | hb::States::GetPath | 공통 C++ + VM |
| stateElapsed | Get Elapsed / 상태 경과 시간 | target: object | return: float | hb::States::GetElapsed | 공통 C++ + VM |
| stateSetBool | Set Bool / 상태 파라미터 불리언 지정 | exec: exec, target: object, key: string, value: bool | then: exec | hb::States::SetBool | 공통 C++ + VM |
| stateSetString | Set String / 상태 파라미터 문자열 지정 | exec: exec, target: object, key: string, value: string | then: exec | hb::States::SetString | 공통 C++ + VM |

## 몽타주

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| playMontage | Play / 몽타주 재생 | exec: exec, target: object, asset: string, section: string | then: exec | hb::Montage::Play | 공통 C++ + VM |
| montageStop | Stop / 몽타주 정지 | exec: exec, target: object | then: exec | hb::Montage::Stop | 공통 C++ + VM |
| montagePause | Pause / 몽타주 일시 정지 | exec: exec, target: object, paused: bool | then: exec | hb::Montage::Pause | 공통 C++ + VM |
| montageJump | Jump To Section / 몽타주 섹션 이동 | exec: exec, target: object, section: string | then: exec | hb::Montage::JumpToSection | 공통 C++ + VM |
| montageNext | Set Next Section / 다음 몽타주 섹션 지정 | exec: exec, target: object, section: string, next: string | then: exec | hb::Montage::SetNextSection | 공통 C++ + VM |
| montagePosition | Get Position / 몽타주 재생 위치 | target: object | return: float | hb::Montage::GetPosition | 공통 C++ + VM |
| montageSeek | Seek / 몽타주 재생 위치 지정 | exec: exec, target: object, time: float | then: exec | hb::Montage::Seek | 공통 C++ + VM |

## 시퀀스

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| playSequence | Play / 레벨 시퀀스 재생 | exec: exec, target: object, asset: string | then: exec | hb::LevelSequence::Play | 공통 C++ + VM |
| sequenceStop | Stop / 레벨 시퀀스 정지 | exec: exec, target: object | then: exec | hb::LevelSequence::Stop | 공통 C++ + VM |
| sequencePause | Pause / 레벨 시퀀스 일시 정지 | exec: exec, target: object, paused: bool | then: exec | hb::LevelSequence::Pause | 공통 C++ + VM |
| sequenceSeek | Seek / 레벨 시퀀스 시간 이동 | exec: exec, target: object, time: float | then: exec | hb::LevelSequence::Seek | 공통 C++ + VM |
| sequencePosition | Get Position / 레벨 시퀀스 재생 위치 | target: object | return: float | hb::LevelSequence::GetPosition | 공통 C++ + VM |

## AI 내비게이션

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| navigationMove | Move To / 경로를 따라 이동 | exec: exec, target: object, destination: vec3 | then: exec | hb::Navigation::MoveTo | 공통 C++ + VM |
| navigationStop | Stop / 경로 이동 정지 | exec: exec, target: object | then: exec | hb::Navigation::Stop | 공통 C++ + VM |
| navigationStatus | Get Status / 경로 이동 상태 | target: object | return: string | hb::Navigation::GetStatus | 공통 C++ + VM |
| navigationPath | Get Path / 이동 경로 가져오기 | target: object | return: vec3[] | hb::Navigation::GetPath | 공통 C++ + VM |

## AI 감지

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| perceptionTargets | Get Targets / 감지한 오브젝트 | target: object | return: object[] | hb::Perception::GetTargets | 공통 C++ + VM |
| perceptionForget | Forget / 감지 기억 비우기 | exec: exec, target: object | then: exec | hb::Perception::Forget | 공통 C++ + VM |
| reportNoise | Report Noise / 소리 자극 알림 | exec: exec, target: object, position: vec3, loudness: float, radius: float, tag: string | then: exec | hb::Perception::ReportNoise | 공통 C++ + VM |

## 파티클

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| particlePlay | Play / 파티클 재생 | exec: exec, target: object | then: exec | hb::Particles::Play | 공통 C++ + VM |
| particleStop | Stop / 파티클 정지 | exec: exec, target: object, clear: bool | then: exec | hb::Particles::Stop | 공통 C++ + VM |
| particlePause | Pause / 파티클 일시정지 | exec: exec, target: object, paused: bool | then: exec | hb::Particles::Pause | 공통 C++ + VM |
| particleEmit | Emit / 파티클 방출 | exec: exec, target: object, count: int | then: exec | hb::Particles::Emit | 공통 C++ + VM |
| particleCount | Get Count / 파티클 개수 | target: object | return: int | hb::Particles::GetCount | 공통 C++ + VM |

## 게임플레이 태그

| ID | 영어 / 한글 | 입력 핀 | 출력 핀 | C++ | 실행 범위 |
| --- | --- | --- | --- | --- | --- |
| tagAdd | Add / 게임플레이 태그 추가 | exec: exec, target: object, tag: string | then: exec | hb::Tags::Add | 공통 C++ + VM |
| tagRemove | Remove / 게임플레이 태그 제거 | exec: exec, target: object, tag: string | then: exec | hb::Tags::Remove | 공통 C++ + VM |
| tagGet | Get / 게임플레이 태그 목록 | target: object | return: string[] | hb::Tags::Get | 공통 C++ + VM |
| tagHas | Has / 게임플레이 태그 확인 | target: object, tag: string, exact: bool | return: bool | hb::Tags::Has | 공통 C++ + VM |
| tagAny | Has Any / 하나 이상의 태그 확인 | target: object, tags: string[], exact: bool | return: bool | hb::Tags::HasAny | 공통 C++ + VM |
| tagAll | Has All / 모든 태그 확인 | target: object, tags: string[], exact: bool | return: bool | hb::Tags::HasAll | 공통 C++ + VM |
| tagQuery | Matches Query / 태그 조건 쿼리 | target: object, query: string | return: bool | hb::Tags::MatchesQuery | 공통 C++ + VM |
