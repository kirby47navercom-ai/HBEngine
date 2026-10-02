# HBEngine 블루프린트와 C++ 구현 기준

조사일: 2026-10-02. 전체 공식 근거와 엔진 범위는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 조작 계약은 [인터랙션 기준](EDITOR_INTERACTION_SPEC.md), 노드별 핀·C++ 대응은 [372개 카탈로그](NODE_CATALOG.md)에 있다.

**실행됨**은 브라우저 게임 실행기에 연결됐다는 뜻이고 **공통 C++**은 실제 C++ 함수도 존재한다는 뜻이다. 편집/실행/네이티브 렌더러/배포의 상태를 구분한다.

## 공식 근거

[Epic C++/Blueprint 혼합](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus?lang=en-US), [공개 메타데이터](https://dev.epicgames.com/documentation/en-us/unreal-engine/exposing-gameplay-elements-to-blueprints-visual-scripting-in-unreal-engine), [UFUNCTION](https://dev.epicgames.com/documentation/en-us/unreal-engine/ufunctions-in-unreal-engine), [변수](https://dev.epicgames.com/documentation/unreal-engine/blueprint-variables-in-unreal-engine?lang=en-US), [흐름 제어](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine?lang=en-US), [함수](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine), [매크로](https://dev.epicgames.com/documentation/en-us/unreal-engine/macros-in-unreal-engine), [그래프 추출](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine)를 참고했다. HB는 자체 코드·저장 형식·실행기를 사용한다.

## 노드 라이브러리

기본 노드 **372개**, 그중 공통 C++ API **289개**다. 이번 확장은 수학/삼각/지수/보간, 정수/비트/비교, Vec2/Vec3, 회전·방향·Transform, 색상, 문자열, 자료형 변환, 8종 배열 × 11연산의 **221개 공통 함수**와 **8개 흐름 제어**다. 노드마다 실제 계산/제어 코드와 서명 검사를 두었다. C++/JS 동등성 검사는 각 새 공통 함수의 실제 C++ 호출 결과를 비교한다. 모든 수치·경계 조합을 증명하는 검사는 아니다.

- bool/int/float/string/vec2/vec3/color/transform/object/hit, 단일·배열 변수와 내장 구조체 분할/합치기.
- Branch, Sequence, ForLoop, ForEach, While, Break가 있는 반복, DoOnce/DoN, Gate/MultiGate, FlipFlop, Delay/재시작 지연, 정수/문자열 Switch.
- Delay는 대기 중 같은 노드의 재호출을 무시하고, 재시작 지연은 완료 시간을 다시 설정한다.
- 배열의 Length/Get/Find/Contains/Reverse/Append/Slice/Unique는 자료형별 함수다. 복사 연산은 원본을 바꾸지 않고 새 배열을 반환한다. 배열 변수 변경은 Set/Add/Remove 실행 노드로 한다.
- Sequence는 2출력, MultiGate와 Switch는 3출력을 제공한다. 임의 개수의 동적 실행 핀은 아직 미지원이다.
- int는 C++에 맞는 32비트 정수다. 문자열 인덱스는 새 Text 함수에서 Unicode scalar 단위이고 대소문자 변환은 ASCII다. Color는 0~1 RGBA다. 회전은 XYZ Euler degree, Forward +Z, Up +Y다. Unreal의 좌표계와 동일하다고 가정하지 않는다.
- 편집 배열·새 공통 배열 계산은 128원소, 그래프는 1,000노드/5,000연결, 반복/한 이벤트 계산은 10,000단계와 재귀 64단계로 제한한다.

## 제작 기능 상태

| 기능 | 현재 동작 | 남은 범위 |
| --- | --- | --- |
| My Blueprint / Inspector | 이벤트·함수·매크로·변수·통신·컴포넌트·클래스 상세 편집, JSON 저장 | 클래스 전용 컴포넌트 뷰포트 |
| 함수·매크로 | 시그니처·내부 그래프·순수 함수·선택 추출·실제 호출, 매크로 지연 후 재개 | 로컬 변수·참조 매개변수 의미·독립 라이브러리 에셋 |
| Construction | 별도 그래프, 실행 시작 때 BeginPlay 전에 실행 | 편집 중 속성 변경마다 재구성하는 native 생명주기 |
| 이벤트 | Begin/End/Tick·키/축 입력, AABB 기반 Overlap/Hit, 사용자 이벤트 | Enhanced Input 수준 매핑·실제 물리 이벤트 |
| 핀/변수 | 단일/배열 검사·기본값·Get/Set·중첩 분할·관찰·변수 승격 | 사용자 Struct/Enum/Set/Map·soft/interface 참조·자동 변환 삽입 |
| 상속 | C++ 부모와 공개 기본값·void 이벤트 재정의 | BP→BP 상속·부모 호출·인스턴스별 override |
| 편집 | RMB/MMB 이동·휠/Ctrl 확대·사각/다중 선택·복사/복제·주석·Undo/Redo·검색 | 북마크·정렬/분배·자동 배선·Diff |
| 도킹/Project | 실제 폴더·다중 선택/가져오기/문서·파일 내부 검색·창 분할 | 여러 BP/Material/Animation을 독립 편집하는 문서 모델 |
| 타이머·지연 | 게임 시간 배율·정지, Delay·재시작 지연·타이머 완료 이벤트 | native/VM 공통 핸들 풀·비동기 서비스 전반 |
| Timeline | 4종 트랙·커브/접선/키 편집·재생/역방향/스크럽·실행 이벤트 | 외부 Curve 에셋·클립/상태 머신과의 제작 연결 |
| 디스패처·인터페이스 | 시그니처, 구독·해제·이벤트·메시지 실제 실행 | 독립 계약 에셋·다중 BP 클래스 검사 |
| 디버거 | 실제 노드 중단점·Step/Continue·호출 스택 표기·계산 핀 값 | 실행 객체 선택, 프레임/Step Into/Out 구분·native 코드 디버거 |
| 오브젝트/서비스 | 생성/제거/부모·기본 컴포넌트, Mesh Raycast, 표면/광원, 오디오·모델 클립·기본 위젯·SaveGame | 강체 solver·3D 음향·장면 전환·AnimationBP·UI 바인딩 |
| 빌드/배포 | 사용자 .h/.cpp 실제 g++ 빌드와 작업 프로세스 RPC | DX11 런타임·DLL 교체·cooking·Windows 게임 배포 |
| 네트워크/확장 | 미구현 | 복제/RPC·권한·플러그인·에디터 도구 |

## C++ 연결의 실제 동작

1. HB_CLASS/HB_PROPERTY/HB_FUNCTION 공개 선언을 제한된 분석기로 읽는다. 미지원 공개 자료형·선언은 오류다. 함수 본문은 g++이 컴파일한다.
2. Callable/Pure/static/Get/Set/읽기 전용·반환·출력 참조·Native/Implementable void 이벤트로 노드 핀을 생성한다.
3. 헤더/구현/생성 wrapper/공통 헤더의 해시로 빌드하고 별도 C++ 실행 프로세스를 호출한다. JSON에는 주소 대신 등록된 객체 ID를 전달한다.
4. 객체 Transform·공개 기본값·함수 입력을 전달하고 C++ 출력·속성·객체·이벤트를 **전체 검증한 뒤** 적용한다. 잘못된 타입·범위·반환·컴파일 오류는 실패로 표시한다.
5. C++ 이벤트 override는 호출 종료 후 해당 BP 인스턴스로 전달한다. 이벤트 그래프에서 다시 C++ 함수를 호출할 수 있다. 임의 반환값을 C++ 호출 내부에서 동기적으로 받는 override는 아직 없다.
6. 게임 프레임은 native Clock/Timer를 진행하고 VM을 실행한다. native와 VM 타이머 핸들 풀은 별개다. 공통 API 수학/시간/변환은 C++에서 직접 호출할 수 있지만 브라우저 렌더/오디오/UI 서비스를 전부 C++로 옮긴 것은 아니다.

지원 입력은 헤더+구현 한 쌍이다. Actor/Component/Library 공개 선언과 static 호출을 지원하고, 현재 편집기 실행 월드의 주 바인딩은 Actor다. 추가 사용자 헤더·라이브러리·다중 번역 단위·DLL 핫 리로드·임의 구조체는 지원하지 않는다. [문 예제 헤더](../prototype/examples/DoorController.h), [구현](../prototype/examples/DoorController.cpp), [BP 실행 예제](../prototype/examples/BP_NativeDoor.blueprint.json)를 참조한다.

## 저장·AI·검증

Project 파일과 브라우저 복구 저장은 장면·환경·BP/함수/매크로/Construction·C++ 원문·기본값·통신·Timeline을 유지한다. BP 내보내기 파일은 안정적인 ID와 명시적 타입/핀/연결을 포함한다. 잘못된 JSON/타입/연결은 기존 편집값을 바꾸기 전에 거부한다.

검사는 npm test, api:check, test:library, test:native, test:runtime, test:host, test:project로 재현한다. 화면에서는 실제 C++ 빌드→함수 호출→C++ 이벤트→BP 이동과 Stop 복원, 파일 내부 검색, 다중 가져오기/선택/문서, 창 분할/최대화, OBJ 미리보기와 Timeline 키 편집을 확인했다. 완성된 Unreal/Unity 대체 엔진이라고 부르지 않는다.
