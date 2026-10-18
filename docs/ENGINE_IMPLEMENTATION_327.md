# 시퀀스 다중 소유권과 제작·실행 연결

부모 연결·전체 컴포넌트·골격 포즈·애니메이션 클립이 기존 위치/변수 트랙과 같은 우선순위 규칙을 사용해요. C++ `hb::LevelSequence::Play/Pause/Seek/Stop/SetPriority`와 기존 블루프린트 노드가 동일한 실행 경로를 사용해요. 에셋 버전·기존 SDK 호출 이름은 바뀌지 않아요.

- 부모 연결은 한 프레임의 변경을 먼저 모아 순환을 검증해요. 유효한 여러 연결의 교환을 한꺼번에 적용하고, 복원 중 외부 계층과 순환하면 소유한 연결만 루트로 풀어요. 숨겨진 시퀀스는 마지막 표본만 유지해요.
- 전체 컴포넌트 트랙은 존재/자료형/순서와 개별 속성으로 나눠 소유해요. 개별 속성 트랙과 같은 필드를 공유해 중지 순서에 관계없이 처음 값을 복원해요. 삭제된 컴포넌트의 숨겨진 표본도 유지하고, 관계없는 컴포넌트는 보존해요.
- Transform 컴포넌트의 position/rotation/scale과 직접 트랙은 같은 필드예요. 골격 포즈는 최초로 표본이 필요한 시점에 원본을 저장하고, 하위 소유자 인계·우선순위 변경에서 실제 포즈를 바로 적용해요. 마지막 소유자가 끝나면 계속 표본하는 상태를 해제해요.
- 애니메이션 클립은 이긴 소유자의 활성 구간만 재생해요. 구간 사이에서는 그 클립 필드만 하위 소유자에 돌려줘요. 한 시퀀스에서 같은 객체를 제어하는 트랙이 여러 개면 마지막 활성 트랙이 우선해요.
- 부모·전체 컴포넌트·골격에도 트랙의 default/restore/keep과 시퀀스 forceRestore를 적용해요. 애니메이션 클립의 Keep/외부 재생 상태 복원·가중 혼합까지 구현됐다는 뜻은 아니에요.

AI는 기존 `document.patch/files.apply`의 revision/Undo와 `runtime.call`, `runtime.sequencePose`, `runtime.sequenceOwnership`를 그대로 사용해요. `/api/schema`의 `sequenceOwnership`가 공유 규약이에요. 전체 월드 이력 복사·자동 프레임 조회·GPU 읽기·타이머를 추가하지 않았어요. 이미 있던 일반 스칼라의 어댑터/원본 값은 첫 표본에서 한 번만 만들어요.

## 확인한 공식 자료와 적용 판단

- [Unreal 4.27 Keep/Restore](https://dev.epicgames.com/documentation/en-us/unreal-engine/keeping-or-restoring-changes-made-by-sequencer?application_version=4.27): 역사 버전의 본문 0–90행을 읽었어요. 트랙별 완료 동작과 전역 복원 우선순위 사례를 HB의 기존 forceRestore에 대조했어요. 현재 Unreal 전체 동작의 직접 근거로 승격하지 않아요.
- [Unreal Animation Track](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-animation-track-in-unreal-engine): 본문 0–131행을 읽었어요. 복수 트랙, 구간 혼합, 슬롯, 완료 동작과 클립 편집/오프셋/루트 설정을 대조했어요. 이번 구현은 소유권·인계이며 가중 혼합·슬롯/클립 편집 전체를 구현한 것이 아니에요.
- [Unity Timeline 트랙 순서](https://docs.unity3d.com/Packages/com.unity.timeline@1.8.13/manual/trk-reorder.html): 1.8 URL이 반환한 패키지 표시 1.8.13의 본문 115–128행을 읽었어요. 같은 객체를 제어하는 후순위 트랙과 Override 트랙 바인딩을 확인했어요. HB의 명시 우선순위는 기존 자산 값과 동일 우선순위 시작 순서를 유지하고, 한 시퀀스의 클립은 마지막 활성 트랙을 선택해요.

그림의 픽셀·각 연결 API/하위 문서 전체·독립 검증은 수행하지 않았어요. 위 읽기를 corpus `body_reviewed/analyzed/verified`로 승격하지 않고 CORPUS_MANIFEST의 미해결 조사 목록에 연결해요. 추가 잔여는 외부 애니메이션/그래프의 정확한 원상태 복원, 애니메이션·골격·Transform 및 렌더 속성 사이의 나머지 별칭, 가중 혼합과 비동기 외부 setter 롤백이에요.

## 재현

`npm run test:sequence-structural`은 구조·클립·재진입 CPU 검사와 실제 C++/블루프린트 편집기·DirectX/WebGL 게임을 실행해요. 검사별 프로젝트·프로필·포트·창은 독립되고 숨겨져 있어요. 결과와 검증 범위는 ENGINE_WORK_327/USER_INSTALL_327에 기록해요.
