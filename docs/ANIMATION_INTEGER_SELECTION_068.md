# 정수 선택 포즈 혼합 — 068

2026-10-08. Animation Graph에 `Blend by Integer / 정수 선택 혼합`을 추가했다. 정수 파라미터로 여러 입력 포즈를 고르며 각 포즈의 전환 시간을 따로 저장한다. 기존 그래프/클립/상태/동기화/몽타주와 같은 포즈·notify 실행기를 사용한다. 새 별도 게임 실행기나 C++ 함수 집합을 만들지 않는다.

## 근거와 읽기 범위

Unreal5.8 [Blend Nodes의 Int/Enum 절](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-blend-nodes-in-unreal-engine)은 정수별 포즈·포즈별 전환 시간·동적 핀 제작을 설명한다. 이번에는 Int68–73/Enum74–79를 재대조했다. [FAnimNode_BlendListByInt](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_BlendListByInt)의 자체63줄 선언/필드/override 요약, [Base](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_BlendListBase)의 자체142줄 선언/필드·함수 요약/구식 Reset 속성의 deprecation, [ChildUpdateMode](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/EBlendListChildUpdateMode)의 자체30줄 선언/세 값·설명을 새로 읽었다. 최신 모드의 비활성 중단·활성화 초기화·항상 갱신을 대조했다. Unreal C++ 본체의 알고리즘이나 모든 상속/연결 메서드 본문을 읽었다는 기록이 아니다.

Unity6000.0 [Animator.SetInteger](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animator.SetInteger.html)의 두 선언234–241, 인자246–266, 설명270–274, 설정과 전체 코드 예제278–307을 새로 읽었다. 정수로 다수 방향/상태를 제어하는 C++/BP 제작 흐름에 대응한다. Unity Animator 상태 컨트롤러 전체와 HB의 포즈 노드를 같은 구현이라고 표현하지 않는다. 연결 Animator/입력/클래스 API는 이번 읽기에서 제외됐다. HTTP원문/SHA/범위는 `native/build/int-blend-research-068/manifest.json`에 저장했고 큐에 Unreal API3·guide1을 추가, 기존 Unity URL에는 새 provenance만 추가했다. 자동 다운로드/등록을 본문 읽기나 전체 corpus gate로 승격하지 않는다.

## 제작과 실행 계약

노드 목록/우클릭 한·영 검색에서 생성한다. `PoseIndex` 정수가 없으면 생성하며 동명 다른 타입은 별도 이름을 사용한다. 오른쪽에 정수 선택·전환 곡선·자식 갱신·포즈별 전환 시간을 표시한다. 우클릭 포즈 추가/특정 핀 제거, 연결 제거, Undo/Redo·검증/Save·미리보기/실행 잠금은 기존 문서 경로다. 마지막 입력은 삭제 버튼을 잠근다. 번호는0부터이며 음수/범위 밖 값은 포즈0을 선택한다. 이 fallback은 HB의 명시 계약이며 읽은 Int API 요약에 해당 구현 본체가 있었다고 주장하지 않는다. 우클릭 생성 위치는 커서의 그래프 좌표다.

전환을 다시 중단하면 현재 모든 기여도를 출발값으로 보존하여 포즈가 튀지 않는다. 기존 선형/부드럽게/천천히 시작/천천히 끝 곡선을 재사용한다. 각 입력은 독립 문맥/시계/포즈 버퍼를 갖는다. 같은 클립 노드를 두 입력에 연결해도 시계가 섞이지 않는다. 활성 포즈만 갱신은 비활성 시계를 멈추고, 초기화 모드는 가중치0인 자식을 다시 활성화할 때 기존 resetContext로 재시작하며, 모두 갱신은 비활성 클립과 중첩 상태 머신의 시계·포즈도 진행한다. 모두 갱신의 비활성 클립 notify는 발생하지 않는다. 그 모드를 선택하면 모든 입력을 평가하는 추가 CPU 비용이 있다. 기본 모드는 활성 포즈만이다.

가중치/출발 배열과 포즈 버퍼는 재사용하고 문맥은 로드 때 생성한다. 반복 전환/재초기화로 문맥·poseBytes가 늘지 않으며 dispose가 전체 문맥을 정리한다. 기존 전체 노드/포즈 문맥/메모리 검사도 유지한다. 기존 Bool 선택의 데이터와 동작은 바꾸지 않았다. Runtime debug의 selections에는 문맥·선택 번호·입력 기여도가 있어 사람의 실행 표시와 AI 관측에 함께 쓰인다. schema에 자료형/시간/갱신/시계/fallback을 기록하고 기존 atomic document.patch/dryRun/revision 경로로 편집한다.

`hb::AnimationGraph::SetInteger/GetInteger`와 BP `animGraphSetInt/GetInt`를 그대로 사용한다. 실제 C++가 값을 바꾸어 포즈를 선택하고 BP의 정수 Get 결과가 실제 C++ 인자로 전달되는 실행을 확인했다. 2D 스프라이트는 최고 기여 프레임을 선택하고 가져온 뼈의 위치/회전 포즈는 기존 계산으로 혼합한다. enum 타입·inertialization·custom curve/Blend Profile·Root Motion/리타게팅의 남은 세부가 이 노드 하나로 완성된 것은 아니다.

## 확인

`check-animation-graph.mjs`는3포즈 중단·포즈별 시간/곡선·세 갱신 모드·공유 클립의 독립 시계·중첩 상태 완료/초기화·0시간/fallback·타입/시간 오류·버퍼 재사용/정리·2D/notify·가져온 뼈를 통과했다. 스프라이트 fixture에 경로를 에셋 이름으로 넣은 오류와 없는 path 변수 오류를 고치고 해당 실패 로그를 보존했다. 기존 State/Sync/Blend Space/Montage 코어 검사도 통과했다.

격리된 실제 Editor2v0nuS는 상세 편집·Int step1·이름 참조 갱신·우클릭 포즈 추가/제거·연결 핀·마지막 입력 보호·Undo·dryRun/잘못된 patch 거절·Save·원본을 바꾸지 않는 미리보기와 BP/C++·실행 잠금·종료를 통과했다. 이전8bDZSZ도 보존했다. 실제 release Player GW6cSH는 정수 선택으로 객체를 x10으로 이동, BP의 선택0과 C++ 인자 전달로 x0 복귀·기존 뼈 레이어/정지/복귀·원본/서버 정리를 통과했다. 최종 에디터 캡처의 텍스트·핀·속성 표시도 확인했다. [소스 SHA와 증거](research/ANIMATION_INTEGER_SELECTION_068.json). 이 기능 추가로 전체 PC120/모바일60·장시간 RAM·상용 엔진/전체 연구를 완료 처리하지 않는다. 사용자 창·원본·설치는 보존하며 누적 선행 작업을 계속한다.
