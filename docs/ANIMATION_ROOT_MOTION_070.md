# 루트 모션 제작·혼합·물리·C++ 실행 — 070

2026-10-08. Animation Graph와 몽타주에서 루트 이동·회전을 추출해 기존 고정 물리 단계에 전달한다. 2D와 3D가 같은 서비스·물리 수명 경로를 사용한다. 기존 버전1 에셋의 생략된 설정은 비활성이며 기존 포즈 재생을 유지한다.

## 제작과 실행 계약

그래프 모드는 `none`(기존 포즈), `ignore`(추출·고정·조회, Actor 이동 제외), `all`(연결된 클립과 몽타주), `montages`(슬롯 몽타주만)이다. 클립·몽타주에 사용 여부, 최상위 루트 뼈, 첫 프레임/참조 포즈/원점 고정, 항상 고정을 편집한다. 항상 고정은 이동 추출을 꺼도 동작한다. 지정 뼈·위치/Quaternion 트랙이 없거나 설정이 잘못되면 거절한다. 스프라이트 프레임만 있는 클립을 이동 트랙처럼 취급하지 않는다.

반복의 끝과 시작을 단순 차감하지 않고 루프 변환을 누적한다. 여러 바퀴·회전하는 루프·정확한 끝 경계와 부모의 회전/크기를 처리한다. 추출한 Actor 루트 포즈가 배치 위치를 덮어쓰지 않는다. 뼈 포즈에는 선택한 루트 고정을 적용한다. 혼합·레이어 마스크·상태 전환·정수/Enum/직접/가산 혼합은 기존 포즈 가중치·시계에 대응하는 이동량을 혼합한다. 비활성 기능은 이동용 노드 버퍼를 만들지 않는다.

몽타주는 실제로 재생한 세그먼트 구간에서 이동량을 얻는다. Seek/Jump는 건너뛴 거리를 적용하지 않는다. 종료 직전 마지막 이동량은 슬롯 또는 독립 몽타주에서 한 번 소비한다. 일시 정지·완료 포즈 유지·정지 혼합이 옛 이동량을 반복하지 않는다. 그래프·몽타주 미리보기는 별도 월드에서 같은 서비스를 재생한다. 몽타주 기본 애니메이션은 연결된 Slot 그래프를 선택한다.

동적 강체는 이동량/고정 dt를 속도로 전달해 기존 CCD·접촉을 사용한다. 키네마틱은 기존 Rapier의 캐릭터 컨트롤러로 이동 경로를 조정한다. 걷기/낙하는 애니메이션의 수직 이동을 제외하고 중력을 유지하며 비행은 수직 이동을 사용하고 중력을 제외한다. 2D 탑다운은 XY를 사용한다. 축 고정·정적 충돌체·부모 변환·삭제/풀 비활성화·ID 재사용도 기존 물리 수명에 따른다. 물리 한 프레임의 최대 substep 시간에 맞춰 대기 이동을 제한하며 오브젝트 수 제한을 추가하지 않는다.

C++ `hb::AnimationGraph::SetRootMotionMode`, `GetRootMotionPosition`, `GetRootMotionRotation`과 BP `animGraphRootMode/Position/Rotation`은 같은 실행기를 사용한다. 조회는 직전 애니메이션 프레임의 Actor 로컬 이동량과 도 단위 회전량이며 세계 위치나 속도가 아니다. None 모드는 영(0) 이동량이다. AI schema는 같은 모드·에셋 필드·물리·조회 계약을 제공하고 기존 document.patch/dryRun/revision·Undo/Save가 동일 데이터를 검증한다.

## 확인과 보존

`npm run test:root-motion`은 여러 루프/회전, 네 모드·배치 보존, 추출 비활성의 강제 고정, 혼합·상태·뼈 마스크, 정규화하지 않은 직접 혼합, 2D/3D의 30/60/120Hz 고정 단계 이동, 동적/키네마틱 벽·걷기 중력·비행, 부모 변환, 정적 충돌체/ID 재사용, 몽타주 마지막 구간/Seek/Pause, 공용 함수와 Slot 실행을 검사한다. 이 주파수 검사는 이동 정확도 검사이며 FPS 성능 측정이 아니다. 키네마틱 걷기의 세로 이동 누적 실패를 발견하고 공용 축 필터에서 수정한 뒤 통과했다.

기존 그래프·상태·동기화·Blend Space·몽타주·62 컴포넌트·697 BP 노드/289 공통 서명 검사와 생성 API 일치를 함께 확인했다. 실제 C++와 Rapier의 166 물리/질의·Hit 배열·분할 핀 검사를 유지했다. 실제 격리 Editor와 내보낸 release Player에서는 사용자 C++ 재생/조회, BP 모드 전환·조회 결과의 C++ 전달, Slot 몽타주 이동을 검사한다. 편집기에는 루트 필드·Undo·오류 dryRun의 revision 보존·별도 미리보기·물리적 포즈 핀 연결·저장을 포함한다. 원본/오류0/종료0/서버 정리는 acceptance에 기록한다.

현재 최종 증거 경로·제품 SHA와 읽기 범위는 [070 증거](research/ANIMATION_ROOT_MOTION_070.json)에 기록한다. 원본 게임 Assets/Source/tools를 편집하지 않았고 두 사용자 MD에는 이전 전체 바이트를 보존한 진행 기록만 추가한다. 이전 실패 증거도 남긴다. 같은 8시간 검사나 전체 FPS 대조를 반복하지 않았다.

## 직접 읽은 근거와 경계

[Unreal Root Motion](https://dev.epicgames.com/documentation/en-us/unreal-engine/root-motion-in-unreal-engine) 자체 111줄에서 네 모드·가중 추출·루트 고정·이동/중력·디버깅 설명을 읽었다. [Unity Root Motion](https://docs.unity3d.com/6000.0/Documentation/Manual/RootMotion.html) 자체 본문125–194에서 Body/Root 투영·회전/Y/XZ bake·offset/feet·루프·Generic을 읽었다. [Animator.deltaPosition](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animator-deltaPosition.html) 자체 선언/설명234–244, [OnAnimatorMove](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnAnimatorMove.html) 자체 설명과 전체 예제234–278도 읽고 프레임 이동량과 물리 속도/수직 속도 유지 흐름을 대조했다.

[Rapier 캐릭터 컨트롤러](https://rapier.rs/docs/user_guides/javascript/character_controller/) 자체31–191의 수명·이동 조정·필터·중력·회전 제한과 설치0.21 wrapper의 compute/free 부분을 읽었다. WASM 필터 안에서 다른 collider의 isSensor를 다시 호출해 소유권 borrow 오류가 난 경로를 캐시된 충돌 속성 조회로 고쳤다. 키네마틱 장애물 조정은 병진 이동이며 회전의 연속 충돌 sweep은 구현하지 않았다.

원문 다운로드/SHA와 직접 읽기는 별도다. `native/build/root-motion-research-070/manifest.json`의5주소 범위만 직접 읽었다. 연결 API·이미지/영상·실제 Unreal/Unity 구현 본체·전체 Avatar/리타게팅은 미독이다. 신규 guide1·기존 Unity URL provenance를 발견 원장에 반영했으며 전체 corpus gate를 완료로 바꾸지 않았다. Rapier 읽기는 의존 API 근거이며 Unreal/Unity 전체 원장의 새 엔진 루트로 세지 않는다.

Unity Humanoid Body 투영·feet bake·Motion Warping·Root Motion Sources/네트워크 예측·리타게팅 전체를 이 작업으로 구현했다고 표시하지 않는다. 해당 세부와 나머지 누적 선행 요구, 전체 PC120/mobile60·장시간 RAM·실기기/iOS 검증은 별도로 유지한다. [선행 작업 순서](WORK_ORDER_051.md)에 따라 묶음 검증 뒤 설치를 갱신한다. 현재 사용자 설치본·사용 중인 창을 바꾸지 않았다.
