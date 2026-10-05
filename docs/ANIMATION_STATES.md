# 포즈 상태·전이 제작과 실행 · 2026-10-05

후속: [동기화·마커·단일 알림](ANIMATION_SYNC.md)을 실제 공용 실행기와 사람/AI/C++/BP·Editor/Player에 연결했어요. 아래 Sync Groups의 다음 구현 표시는 상태 추가 당시 기록이에요. 구간 알림·몽타주/다른 애니메이션 세부는 계속 구현해요.

## 실제 공식 읽기

[Unreal5.8 State Machines](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-machines-in-unreal-engine) 기술 본문0–146, [Transition Rules](https://dev.epicgames.com/documentation/en-us/unreal-engine/transition-rules-in-unreal-engine)0–135, [Sync Groups](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sync-groups-in-unreal-engine)0–106을 읽었어요. Entry·상태 내부 포즈·조건·재진입·전이 순서/중단·상태 이벤트·다시 relevant가 되는 경우·동기화 역할을 대조했어요. 연결된 모든 하위 페이지/API·그림/영상·상속 내용을 읽은 것으로 세지 않아요. Sync Groups 본문은 다음 구현의 근거이고, 이 상태 머신 추가를 Sync Group 구현 완료로 세지 않아요.

[Unity6000.0 Animation transitions](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transition.html)의 기술 본문·속성/중단 표를 읽었어요. [AnimatorStateInfo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimatorStateInfo.html), [AnimatorTransitionInfo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimatorTransitionInfo.html)의 자체 속성/메서드 요약과 [Animator.CrossFade](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animator.CrossFade.html)의 두 선언·기본 인자·Parameters·Description을 읽었어요. 각 링크의 개별 속성 API·상속 내용은 미독이에요. 원문/본문/SHA를 native/build/anim-state-docs-X9OC0r에 보존해요. 이 보조 읽기를 전체 corpus/API gate 승격으로 세지 않아요.

## 사람의 제작 흐름

Anim Graph에 State Machine을 추가하고 Output Pose로 연결해요. 노드 더블클릭·왼쪽 그래프 목록·속성의 열기 버튼으로 상태 그래프를 열어요. Entry 출력→상태는 기본 상태 지정, 상태/Any State 출력→상태는 단방향 전이 생성이에요. 상태·선택 선·목록을 클릭하면 해당 상세를 편집해요. 오른쪽 클릭으로 상태를 추가하고 콘텐츠 브라우저의 애니메이션을 놓으면 클립을 담은 상태를 만들어요. 여러 클립도 동시에 받아요.

상태는 이름·속도·시작 비율·진입 초기화·진입/퇴장/혼합 완료 이벤트를 가져요. 상태 더블클릭 또는 포즈 그래프 버튼으로 전용 포즈 페이지를 열어요. 이 페이지의 Output Pose에 클립·혼합·다른 상태 머신을 연결해요. 다른 상태 전용 노드가 한 화면에 섞이지 않으며 breadcrumb로 돌아가요. 미연결 초안은 저장할 수 있지만 실행 전에 모든 사용 상태의 포즈를 검증해요.

전이는 출발/도착·우선순위·종료 시점·초/정규화 혼합 시간·대상 시작 비율·혼합 곡선·중단 검사/순서·자기 전이·AND 조건·콜백 이벤트를 가져요. Float/Integer/Boolean/Trigger 파라미터를 사용해요. 선택 전이의 우선순위가 같으면 배열 순서가 적용되고 위/아래로 바꿔요. 미리보기 파라미터는 작성 기본값과 별개이며 Trigger는 선택 후 한 번 소비돼요.

우클릭/가운데 이동·휠 확대·F 전체·Delete·기존 문서 Ctrl Z/Y/S를 사용해요. 상태/포즈/속성/연결·AI 변경이 같은 Undo/Redo·revision·저장 경로를 공유해요. 실행 중 필드를 잠그고 실제 상태·시간·전이 진행률·활성 강조를 보여줘요. 별도 미리보기 객체·스켈레톤에서 같은 서비스를 사용하며 장면 원본을 바꾸지 않아요.

## 실행 의미

- 각 상태는 공유 클립/혼합 노드를 재사용해도 독립적인 시계·Bool 혼합 상태·포즈 버퍼를 가져요. resetOnEntry를 끄면 떠날 때의 시계를 이어가요. reinitialize를 켠 머신은 한 프레임 이상 평가에서 빠졌다 다시 사용될 때 Entry에서 시작해요. 중첩 머신도 독립 문맥이고 ID/이름이 중복된 인스턴스 조회에는 공개 key를 사용해요.
- 상태의 가장 높은 분기 가중치 클립으로 정규화 시간을 계산해요. 이 분기 가중치는 뼈별 마스크의 모든 슬롯 가중치나 root-motion 거리와 동일한 값은 아니에요. 종료 비율<1은 루프마다 해당 경계를 지나는 갱신, >=1은 누적 정규화 시간의 단일 경계를 검사해요. Has Exit Time과 조건을 함께 쓰면 그 경계에서 AND 조건이 필요해요. 0은 진입 시점이에요. 초 단위가 아니면 출발 상태의 관련 클립 길이/배속을 기준으로 혼합 시간을 계산해요.
- Any State 전이가 먼저 검사되고 현재/다음/현재→다음/다음→현재/없음 중단 큐를 적용해요. Ordered가 켜지면 현재 전이에 도달할 때 더 낮은 후보를 중단해요. 기본은 자기 전이를 거절해요. 선택된 Trigger만 해제하고 조건 검사만으로 소모하지 않아요.
- 숫자 포즈는 가중 혼합, 회전은 quaternion slerp예요. 스프라이트는 가장 큰 기여 프레임을 선택해요. 중단과 자기 재진입은 직전 혼합 포즈를 별도 재사용 버퍼에 보존해 튀는 것을 막아요. 선형/smooth/easeIn/easeOut을 제공해요. 시간은 각 tick의 이산 갱신이고, 경계에서 프레임을 더 작게 쪼개지 않아요.
- onEnter/onExit/onFullyBlended와 전이 Start/End/Interrupt는 같은 Actor의 이름 있는 Custom Event로 보내요. 이벤트가 그래프를 정지/교체하면 남은 예전 그래프 이벤트를 보내지 않아요. 이 이벤트에 Unreal Skeleton Notify State 클래스 ABI나 모든 잠재 작업의 상태 수명 scope를 구현했다고 표현하지 않아요.

머신8·전체 상태128/머신64·전이256/머신·조건16/전이·결정32/프레임·확장 포즈 문맥2048·포즈 버퍼64MiB 한도를 적용해요. 공유 DAG 관련성 계산은 memo를 사용해 지수적인 재귀를 막아요. poseBytes를 공개하며 tick마다 포즈 버퍼를 새로 할당하지 않아요. 이 수치는 전체 메모리나 모바일 FPS 보증이 아니에요. 기존 그래프 파일은 새 필드 없이 계속 실행돼요.

## C++·블루프린트·AI

`hb::AnimationGraph`에 Set/GetInteger·Set/ResetTrigger·CrossFade·GetState/GetNextState/GetStateTime/GetNormalizedTime/GetStateWeight·IsTransitioning/GetTransitionProgress12개를 추가했어요. 공용 선언에서 생성한 BP 카탈로그는557개예요. 기존 Float/Bool 함수도 실제 타입을 검사해요.

HB CrossFade의 duration은 **초**, offset은 **대상 정규화 비율**이에요. Unity CrossFade의 normalizedTransitionDuration을 그대로 받는 계약은 아니에요. 명령 전환 도중에는 Any State만 자동 중단 후보가 되며 출발 상태의 일반 규칙이 지정 시간을 덮지 않아요. C++ 변경 명령은 함수가 반환한 뒤 처리하고 상태/전이 조회는 마지막 처리된 상태예요. Integer·Trigger setter의 요청 값은 같은 호출의 snapshot에 반영돼요.

schema.animationGraph의 상태 한도·조건·곡선·중단·시계 계약과 `anim.state.add/remove`, `anim.transition.add/remove`를 제공해요. document.patch로 세부/포즈 연결을 편집해요. ID·scope·expectedRevision·dryRun·원본 검증·Undo/Redo·저장을 사람 UI와 공유해요. 상태 삭제는 소유 포즈와 관련 전이를 함께 제거하며 외부 공유 포즈는 임의로 삭제하지 않아요. runtime.state.objects[].gameplayDebug.animationGraph.machines는 실제 인스턴스 key·현재/다음·상태 시간/가중치·전이/한도예요. headless도 같은 런타임이에요.

## 검증과 다음 세부

코어는 경계/루프·AND/Trigger/Integer·우선순위/중단·혼합 보존·자기 재진입·공유 클립 시계·진입 초기화/이어가기·중첩/모호한 조회·메모리/결정 제한·DAG·콜백 정지·공용 BP 서비스를 검사해요. 기존 graph/runtime·시작 위치/HUD·IK·main557/API/integration 회귀도 통과했어요.

최종 실제 Editor `native/build/animation-states-editor-veTo8X`, release Player `native/build/animation-states-player-Y1zo4q`: 물리 Entry/전이/상태 Output Pose 연결·사람/AI 생성/dryRun·상태 생성/삭제와 Undo 두 번·저장·격리 미리보기·실행 잠금·C++12개·BP Trigger·AttackEnter→사용자 C++ StateEntered·모델 뼈 마스크·일시정지·원본·exit0·서버 정리를 확인했어요. 두 오류 배열은 비었고 실제 Editor PNG를 확인했어요. acceptance.json은 종료 뒤 작성해요. 사용자 설치본/프로필/게임 원본/창을 변경하지 않았어요.

yvF6O9는 상태 그래프가 이미 열렸는데 top 그래프의 열기 버튼을 찾은 시험 오류예요. w0buaQ는 진단 없이 exit1이므로 성공으로 세지 않아요. 단계/프로세스 종료 기록을 보강한 Y1zo4q로 최종 성공을 구분해요. 이 통과가 w0buaQ의 원인을 특정한다는 뜻은 아니에요.

Sync Group/marker/notify·Conduit/State Alias·공유 규칙/곡선·Custom Blend/Inertialization·뼈 Blend Profile·몬타주 슬롯·2D Blend Space 등의 세부를 이어가요. 다른 전체 누적 2D·렌더·월드·에셋·프레임워크·C++·AI·UI/오디오·모바일/배포·가벼움도 유지하며 전체 엔진 완료 판정으로 세지 않아요.
