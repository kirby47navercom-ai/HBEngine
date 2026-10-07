# 열거형 포즈 선택과 제작·실행 연결 — 069

2026-10-08. Animation Graph의 15번째 포즈 노드 `Blend by Enum / 열거형 선택 혼합`을 추가했다. 정수 선택의 혼합·독립 시계·포즈별 전환 시간·중단·세 자식 갱신 실행기를 공유한다. 기존 그래프 버전1과 Float/Int/Bool/Trigger 데이터는 유지한다.

## 근거와 읽기 범위

Unreal5.8 [FAnimNode_BlendListByEnum](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_BlendListByEnum) 자체62줄의 선언·ActiveEnumValue·EnumToPoseIndex·get/set/override 요약을 이번에 직접 읽었다. 값과 포즈 순번의 매핑, 매핑 밖 기본 포즈 계약을 대조했다. [UAnimGraphNode_BlendListByEnum](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/AnimGraph/UAnimGraphNode_BlendListByEnum) 자체125줄의 선언·enum 의존 인터페이스·갱신/핀 노출·제거/상세·컴파일 검증/메뉴 요약도 읽었다. 해당 함수의 C++ 구현 본체와 연결 클래스·메서드는 읽지 않았다. 068의 공식 Int/Enum guide와 ChildUpdateMode, Unity SetInteger 읽기를 재사용하며 이번에 Unity API를 다시 읽었다고 세지 않는다. 원문/SHA는 `native/build/enum-blend-research-069/manifest.json`, 큐 등록2개이며 전체 원장 읽기·분석·검증 gate를 승격하지 않았다.

HB는 그래프 파라미터에 이름·정수 값의 자체 enum domain을 저장한다. Unreal의 UEnum 에셋·uint8 리플렉션과 동일 구현은 아니다. HB의 기존 수치 범위 -100000..100000, enum 값1..64개, 고유 이름/값을 검증한다. 일반 BP 변수 전체의 enum 자료형/C++ enum 리플렉션 생성·공유 enum 에셋은 이 작업에 포함된 것으로 세지 않는다.

## 제작·실행 계약

파라미터 Enum 자료형과 기본값, 이름·값 추가·수정·삭제, 이름 선택 미리보기를 제공한다. 핀의 이름은 파라미터 domain에서 읽고, 번호를 바꾸면 기본값·연결 포즈·상태 전이 조건도 같은 원자적 편집으로 갱신한다. 이름 변경은 핀 이름에 반영하며 값 정체성과 연결을 유지한다. 사용 중인 domain 값 삭제는 해당 포즈·전이를 먼저 해제하라는 오류로 거절한다. 마지막 domain 값도 유지한다. 저장·Undo/Redo·AI document.patch/dryRun/expectedRevision은 기존 경로다. 미리보기의 낡은 파라미터 값은 문서가 바뀌면 제거한다.

첫 입력 `samples[0].value:null`은 삭제할 수 없는 기본 포즈다. 나머지는 고유한 선언된 숫자 값에 연결한다. 0,7,42,-10처럼 값이 띄엄띄엄 있어도 배열 인덱스와 혼동하지 않는다. 선언되어 있으나 핀을 노출하지 않은 값은 기본 포즈를 사용한다. 선언되지 않은 값이나 다른 자료형의 지정은 거절한다. 우클릭/상세의 포즈 추가는 미노출 값을 사용하고, 특정 포즈 제거는 연결도 함께 제거한다. 파라미터 목록과 상태 머신의 미리보기는 이름 선택이며 상태 전이는 Enum의 같음/다름과 선언된 값으로 편집·검증한다.

BP `animGraphSetEnum/GetEnum`과 C++ `hb::AnimationGraph::SetEnum/GetEnum`은 같은 서비스와 실행 파라미터를 사용한다. BP 값 핀은 기존 Integer wire이며 그래프 domain이 실행에서 타입/값을 검증한다. C++ enum 값을 SetEnum으로 직접 전달하고 GetEnumValue<E>로 받을 수 있다. C++의 큰 underlying 값이 잘리거나 반환 enum의 underlying 범위를 넘는 변환은 거절한다. 사용자 E의 열거 값은 그래프 domain과 맞추어야 한다. C++ enum 선언의 자동 리플렉션을 구현했다고 표현하지 않는다.

2D 스프라이트 선택과 가져온 뼈 포즈의 혼합은 기존 실행기다. 전환마다 포즈/가중치/문맥을 새로 만들지 않는다. schema에 domain·기본값·매핑·편집·BP/C++ 계약을 제공하며 runtime selections의 값·이름·문맥·포즈 기여도로 관측한다.

## 확인

- `check-animation-graph.mjs`: sparse/음수 값, 기본 포즈,3포즈 중단, 선언·타입·이름/값 중복 오류, Enum 전이, 2D 스프라이트·가져온 뼈, 공용 서비스 Set/Get·정리 통과. 기존 Int/세 child mode/notify/독립 시계 검사를 함께 유지했다.
- 기존 states/sync/blend-space/montage 검사와 에셋·실제 C++ 게임플레이·전체 BP 기본 검사를 한 묶음에서 통과했다. 생성 API 일치 검사도 통과. 같은 장시간 스트레스 검사를 반복하지 않았다.
- 실제 격리 Editor U6Kc5a: 이름/값·연결 갱신, 이름 선택, 우클릭 핀 추가/제거·기본 보호, 전이 조건 편집/파라미터 교체, Undo·dryRun/오류 revision 보존·Save·물리적 포즈 연결·미리보기·실제 BP/C++·정지/재개·원본 보존·오류0·종료0·서버 정리 통과. 앞선6fT613/WayRmV도 보존했다.
- 내보낸 release Player5p7bBX: C++ enum7→포즈1/위치10, BP enum42 Set/Get→실제 C++ 인자42→기본 포즈/위치0, 큰 enum/narrow 반환 거절·가져온 뼈·일시정지·원본/오류0/종료0/서버 정리 통과. 앞선f6QkWR도 보존했다.

## 이어가는 선행 작업

루트 모션의 공식 Unreal 자체111줄과 Unity6000.0 본문125–194도 직접 대조했다. 네 모드·root lock·가중치·루프·이동/중력과 root transform/bake/feet/Generic 설명 범위이며 이미지·연결 API·실제 엔진 구현 본체는 미독이다. `native/build/root-motion-research-070/manifest.json`에 읽기 범위를 분리했고 큐에 Unreal guide1개, 기존 Unity URL에 provenance를 추가했다. 현재 HB에는 rootMotion 실행이 없으며 그래프가 pose를 쓰고 그 뒤 fixed physics가 이동하는 순서를 확인했다. 이 분석으로 rootMotion 완료를 세지 않는다.

전체 PC120/mobile60·장시간 RAM·모바일 실기기·메인 네이티브 렌더러/전체 선행 목표는 승격하지 않는다. 설치본은 누적 선행 묶음의 검증 뒤 갱신한다. 이번 작업으로 사용자 설치·브라우저/창·게임 원본을 변경하지 않았다.
