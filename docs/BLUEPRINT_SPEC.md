# HBEngine 블루프린트 조사와 구현 기준

조사일: 2026-10-02. 아래는 Unreal 공식 문서를 바탕으로 정한 **HBEngine의 제작 목표와 현재 구현 상태**다. C 주석은 그래프 조작의 한 항목이다. 목표는 C++ 기반 클래스, 시각적 로직, 컴포넌트, 데이터, 디버거가 연결되는 제작 시스템이다.

`편집 가능`은 실제 UI 입력·타입 검사·JSON 저장을 구현했다는 뜻이다. 게임 실행, C++ 컴파일, 네트워크가 동작한다는 뜻은 아니다. `설계 대상`은 아직 구현하지 않은 항목이다. 아래 상태를 기능 추가 시 함께 갱신한다.

## 클래스와 C++

Unreal의 [C++/Blueprint 혼합 방식](https://dev.epicgames.com/documentation/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus?lang=en-US)과 [공개 메타데이터](https://dev.epicgames.com/documentation/en-us/unreal-engine/exposing-gameplay-elements-to-blueprints-visual-scripting-in-unreal-engine)를 참고했다. HBEngine은 자체 메타데이터와 실행기를 만든다.

| 제작 기능 | HBEngine에서의 동작 | 상태 |
| --- | --- | --- |
| C++ 부모 클래스 | 등록한 C++ 클래스를 선택하고 블루프린트로 확장 | 편집 가능 |
| 클래스 기본값 | 상속한 공개 속성의 기본값을 블루프린트별로 변경 | 편집 가능 |
| 공개 함수 | 헤더의 이름·매개변수·반환형으로 검색 가능한 노드 생성 | 편집 가능 |
| 순수 함수 | 데이터 핀만 사용하는 호출 노드 | 편집 가능 |
| 함수 라이브러리 | 공개 static 함수는 Target 없이 호출 | 헤더 등록 지원; 독립 라이브러리 에셋은 설계 대상 |
| 공개 속성 | Get/Set 노드, 읽기 전용 속성의 Set 차단 | 편집 가능 |
| C++ 이벤트 재정의 | 현재 C++ 부모의 Native/Implementable Event 인자를 가진 이벤트 노드 | 편집 가능 |
| 반환·참조 인자 | 반환값과 비 const 참조 인자를 출력 핀으로 변환 | 편집 가능 |
| 클래스 멤버 접근 | 등록된 클래스 포인터 반환 핀에서 공개 속성 노드 생성 | 편집 가능 |
| 벡터·내장 구조체 반환 | Vec2/Vec3/Color/Transform/HitResult 핀을 필드별로 분할 | 편집 가능 |
| 임의 구조체·열거형 | C++와 블루프린트에서 정의한 타입을 공통 타입 레지스트리로 등록 | 설계 대상 |
| 블루프린트 상속 | 블루프린트를 부모로 자식 에셋 생성, 함수 재정의, 부모 호출 | 설계 대상 |
| 클래스별 인스턴스 | 장면에 배치한 인스턴스별 속성·컴포넌트 오버라이드 | 설계 대상 |
| 공통 C++ 함수 | 수학·벡터·시간·타이머·측정·변환 68개, 헤더에서 노드 서명 생성 | 실제 C++ 구현·컴파일·호출 검사, 브라우저 계산 미리보기 |
| C++ 호출 실행 | 등록된 native thunk 호출, 블루프린트 override 디스패치 | 설계 대상 |
| C++ 빌드·갱신 | 진단 위치, 빌드 취소, 안전한 DLL 교체와 인스턴스 복구 | 설계 대상 |

기본 노드 143개 중 공통 C++ 코어 68개는 실제 구현이다. 나머지는 편집 가능한 노드 서명이다. 코어 소스와 실행 검사는 `native/include/HBEngine/Game.hpp`, `native/tests/core.cpp`에 있으며 `npm run test:native`로 재현한다. 브라우저 미리보기는 JS 계산이고 native DLL 호출은 아니다.

현재 헤더 등록은 `HB_CLASS`, `HB_PROPERTY`, `HB_FUNCTION` 선언을 읽는 제한된 분석기다. 함수 본문이나 초기화 표현식을 실행하지 않는다. 지원하지 않는 공개 타입·선언은 오류로 표시한다. 등록 결과는 일반 JSON이므로 AI도 같은 구조로 수정할 수 있다. Unreal 헤더 자체를 빌드하거나 임의 C++ 전체를 분석하는 도구는 아니다.

헤더의 `BlueprintCallable`, `BlueprintPure`, `BlueprintNativeEvent`, `BlueprintImplementableEvent`, `BlueprintReadOnly`, `BlueprintReadWrite`, `Blueprintable`, `DisplayName`, `Category` 의미를 HBEngine 문법에 반영했다. 실제 C++ 엔진에서는 헤더 분석을 Clang AST와 생성 코드로 교체한다.

## 그래프·데이터·편집기

공식 [종류](https://dev.epicgames.com/documentation/unreal-engine/types-of-blueprints-in-unreal-engine), [변수](https://dev.epicgames.com/documentation/unreal-engine/blueprint-variables-in-unreal-engine?lang=en-US), [그래프 묶기](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine), [단축키](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine)를 참고했다.

| 제작 기능 | HBEngine 기준 | 상태 |
| --- | --- | --- |
| My Blueprint / Details | 왼쪽 제작 목록, 가운데 그래프, 오른쪽 선택 대상 속성 | 편집 가능 |
| Event Graph | 시작·종료·Tick·Overlap·Hit·입력·피해·사용자 이벤트 | 편집 가능 |
| Construction Script | 이벤트 그래프와 분리된 생성 구성 그래프 | 편집 가능; 생명주기 실행은 설계 대상 |
| 함수 | 생성, 시그니처, 내부 그래프, 호출, 접근·카테고리, 순수 함수 | 편집 가능 |
| 매크로 | 여러 실행 입출력, 내부 그래프와 경계 핀 | 편집 가능 |
| 선택 추출 | 함수·매크로로 묶고 외부 연결 보존 | 편집 가능 |
| Collapsed Graph | 지역 그래프로 묶기, 확장, 함수·매크로 승격 | 설계 대상 |
| 로컬 변수 | 함수 범위의 변수, 입력·출력·참조·기본값 | 설계 대상 |
| 기본 변수 | bool/int/float/string/vec2/vec3/color/transform/object/hit | 편집 가능 |
| 변수 공개 옵션 | 인스턴스 편집·생성 시 노출·비공개·카테고리 | 편집 데이터 지원; 런타임 적용은 설계 대상 |
| 배열 | 타입별 배열, 기본값, Get/Set/Add/Remove/Find/Length/ForEach | 편집 가능 |
| Set / Map | 중복 없는 집합, 키·값 자료형, 컨테이너별 노드 | 설계 대상 |
| 사용자 Struct / Enum | 타입 에셋 편집, 기본값·필드·열거 항목, Make/Break/Switch | 설계 대상 |
| 참조 타입 | 클래스·오브젝트·인터페이스·soft reference·delegate 핀 구분 | 일반 Object 지원; 나머지는 설계 대상 |
| 분할 핀 | 벡터·중첩 내장 구조체 분할·합치기, 입력값 보존 | 편집 가능 |
| 핀 기본값 | 연결 안 된 입력값 편집, 연결 상태 표시 | 편집 가능 |
| 타입 연결 | 배열/단일·실행/데이터 검사, 핀에서 호환 노드 검색 | 편집 가능 |
| 자동 변환 | int/float 등의 허용된 변환 노드 자동 삽입 | 설계 대상 |
| Reroute | 타입·배열을 지정해 연결 정리 | 편집 가능 |
| 흐름 제어 | Branch/Sequence/Loop/DoOnce/FlipFlop/Gate/Delay/Timer | 노드 편집 가능; 타이머 코어는 구현, 전체 그래프 스케줄러는 설계 대상 |
| 화면 조작 | 우클릭·휠 버튼 이동, 휠 확대, Ctrl 확대, 선택에 초점 | 편집 가능 |
| 선택·편집 | 다중 선택·영역 선택·복사·붙여넣기·복제·삭제·이동 | 편집 가능 |
| 히스토리 | 실행 취소·다시 실행, 실패한 JSON 적용 시 원본 보존 | 편집 가능 |
| 주석 | 박스·노드 주석, 색·크기·글자·그룹 이동 | 편집 가능 |
| 검색 | 모든 내부 그래프의 노드·주석·변수 검색 후 이동 | 편집 가능 |
| 검증 결과 | 데이터 오류·미연결 실행 입력 위치로 이동 | 편집 가능; 컴파일러는 설계 대상 |
| 독립 클래스 뷰포트 | 컴포넌트 트리·소켓·부모 연결과 배치 미리보기 | 설계 대상 |
| 에셋 종류 | Class/Level/Interface/Function Library/Macro Library/Data-only | 한 클래스 편집 지원; 독립 에셋 관리는 설계 대상 |
| 문서·정렬 도구 | 탭 이력, 북마크, 정렬·분배, 자동 배선 정리, Diff | 설계 대상 |

## 통신·시간·디버그·게임 시스템

공식 [디스패처](https://dev.epicgames.com/documentation/en-us/unreal-engine/event-dispatchers-in-unreal-engine), [인터페이스](https://dev.epicgames.com/documentation/unreal-engine/blueprint-interface-in-unreal-engine), [타임라인](https://dev.epicgames.com/documentation/en-us/unreal-engine/timelines-in-unreal-engine), [디버거](https://dev.epicgames.com/documentation/unreal-engine/blueprint-debugging-example-in-unreal-engine), [네트워크](https://dev.epicgames.com/documentation/unreal-engine/networking-overview-for-unreal-engine)를 참고했다.

| 제작 기능 | HBEngine 기준 | 상태 |
| --- | --- | --- |
| 이벤트 디스패처 | 시그니처, Call/Bind/Unbind/Event 노드 | 편집 가능; 이벤트 구독 실행은 설계 대상 |
| 인터페이스 | 시그니처·입출력과 Message 노드 | 편집 가능; 독립 계약 에셋·구현 그래프·검사는 설계 대상 |
| Custom Event | 이름·인자·연결 | 편집 가능 |
| Timeline | Float/Vector/Color 키·Linear/Step·길이·Loop·Autoplay·값 스크럽 | 편집 가능; 게임 시간 실행·이벤트 트랙은 설계 대상 |
| Delay / Timer / async | 실행 지속 상태, 취소, 완료 이벤트, 소유 객체 파괴 시 정리 | 타이머 설정·조회·일시정지·재개·완료 큐 구현; Delay·async 그래프 실행은 설계 대상 |
| 시간·측정 | 게임 시간·델타·배율·일시정지·실시간, 스톱워치 시작·조회·종료 | 공통 C++ API와 호출 미리보기 구현 |
| Breakpoint | 노드·F9·전체 해제·위치 목록 | 편집 가능; 게임 일시 정지는 설계 대상 |
| Pin Watch | 핀 관찰 목록·위치 이동·공통 API 마지막 출력값 | 미리보기 계산 값 지원; 전체 런타임 실시간 관찰은 설계 대상 |
| 실행 추적 | 연결을 따라 강조하는 UI 테스트 | 미리보기 지원 |
| 실제 디버거 | 인스턴스 선택, Step/Continue, 호출 스택, 값·배열 전개 | 설계 대상 |
| 입력·게임플레이 | 입력 매핑, 액터·컴포넌트 생명주기, 생성·제거·장면 전환 | 노드 편집 가능; 엔진 실행은 설계 대상 |
| 물리·오디오·렌더링 | 충돌·Trace·힘, 오디오, 머테리얼·광원 속성 | 노드 편집 가능; 엔진 호출은 설계 대상 |
| UI / Animation Blueprint | 위젯 이벤트·바인딩, 상태 머신·블렌드·애니메이션 이벤트 | 일부 노드·미리보기 지원; 전용 그래프는 설계 대상 |
| 복제·RPC | 변수 복제·RepNotify·Server/Client/Multicast·권한 검사 | 설계 대상 |
| 저장·설정 | SaveGame·Transient·Config 플래그, 버전 변환 | 편집 장면 JSON 지원; 게임 저장은 설계 대상 |
| 에디터 도구 | Call in Editor, 에셋 일괄 작업, 편집기 위젯·플러그인 | 설계 대상 |
| 빌드·패키징 | 의존성 수집, 검증, cooked 그래프, Windows 배포 | 설계 대상 |

## 실제 엔진의 연결 구조

[Unreal 컴파일러 개요](https://dev.epicgames.com/documentation/unreal-engine/blueprint-compiler-overview?application_version=4.27)는 그래프 편집과 실행 코드 생성이 별도 작업이라는 점을 확인하는 자료다. 다음 파이프라인은 HBEngine의 설계안이다.

1. C++ 헤더의 공개 메타데이터를 읽어 클래스·속성·함수·구조체·열거형의 타입 ID와 서명 ID를 생성한다.
2. 같은 타입 레지스트리를 노드 검색, 핀 검사, Details, 저장 검증, AI 편집에 사용한다. C++ 함수마다 수동으로 UI 노드를 다시 만들지 않는다.
3. C++ 함수 호출 wrapper와 속성 accessor를 생성해 native 라이브러리에 연결한다. 임의 객체 주소를 JSON으로 전달하지 않고 엔진 객체 ID를 검사한다.
4. 블루프린트 클래스는 C++ 또는 다른 블루프린트 부모를 참조하고, 기본값·컴포넌트·재정의 그래프를 저장한다. C++ 기본 구현과 블루프린트 override의 호출 규칙을 한 곳에서 처리한다.
5. 그래프를 타입 검사한 중간 표현으로 변환한다. 함수 호출 프레임, 매크로 확장, 조건·반복, 지연 작업, 이벤트 구독, 디버그 위치를 보존한다.
6. 실제 VM 또는 생성 C++ backend를 연결한다. 브라우저의 선 강조를 게임 실행으로 취급하지 않는다. 오류는 노드·핀·소스 줄로 돌려준다.
7. 서명이 바뀌면 영향받는 그래프와 핀을 표시하고 변환을 검증한다. 변환 실패 시 기존 에셋을 보존한다. 재컴파일·DLL 갱신·배포에도 같은 규칙을 쓴다.

AI와 사람 모두 JSON의 안정적인 ID·타입·연결·기본값을 편집한다. 렌더링된 화면 좌표만으로 게임 로직을 복구하지 않는다. 기능이 늘어나도 메타데이터로 검색 가능한 노드를 추가하고, 상시 안내 문구는 도움말에만 둔다.
