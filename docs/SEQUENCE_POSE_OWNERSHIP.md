# 시퀀스 골격 제어와 복원

골격 포즈 트랙은 키에 포함된 뼈마다 `skeletalPose:<이름>` 채널을 얻어요. 서로 다른 시퀀스가 Root와 Hand를 따로 제어할 수 있고, 같은 뼈가 겹치면 시퀀스 우선순위와 시작 순서가 결정해요. 가려진 시퀀스의 최신 샘플은 유지해요. 위 시퀀스를 멈추면 그 샘플로 돌아가요. 빈 포즈 키나 다음 키에서 빠진 뼈는 해당 채널을 양보해요.

골격 트랙을 선택하면 속성의 **포즈 가중치**를 편집할 수 있어요. `poseWeight`는 생략 시 1이고 0~1의 유한한 수예요. 0은 제어를 양보하고, 중간값은 제어 시작 전의 공유 포즈와 트랙 포즈 사이에서 로컬 위치·크기를 선형 보간하고 회전을 최단 호 쿼터니언으로 보간해요. 프레임마다 이미 혼합한 값에 다시 더하지 않아요. 값은 문서에 저장하며 UI 편집·Undo/Redo·`document.patch`·공용 에셋 검증을 사용해요. `poseWeight`는 골격 트랙 전용이에요.

복원은 실제로 쓴 **뼈 객체의 수명**을 기준으로 해요. 이름만 같은 새 뼈나 새 모델에 이전 모델의 TRS를 넣지 않아요. 재생 중 새 모델을 실제로 샘플했다면 그 새 뼈에 처음 쓰기 직전의 값을 복원해요. 제어하지 않은 뼈와 다른 액터의 뼈는 건드리지 않아요. 이름·조상 부모·액터 소유 표식이 바뀐 바인딩은 쓰기 전에 다시 확인해요. 트랙에서 요구하는 뼈가 사라졌다면 샘플을 거절하지만 정지·해제는 누락된 뼈에 쓰지 않아요.

트랙의 `completionMode`와 시퀀스의 `restoreState`·`forceRestore`는 뼈별로 적용돼요. `keep`은 마지막 값을 유지하면서 제어를 해제하고, 다른 시퀀스가 있으면 먼저 그 시퀀스가 이어받아요. `forceRestore`는 마지막 소유자의 `keep`보다 우선해요.

`runtime.sequencePose`와 C++ `hb::Skeleton` 조회는 같은 실제 포즈를 읽어요. AI 조회의 `controlledBoneCount`는 전체 제어 수, `controlledBones`는 **반환된 뼈 페이지 안**의 제어 이름이에요. 전체 포즈를 매번 복사하지 않아요. C++의 기존 `hb::LevelSequence` Play/Pause/Seek/Stop을 그대로 사용해요.

프로그램과 모델 바인딩은 약한 캐시를 사용하고, 활성 뼈들은 트랙·시간별로 묶어 샘플해요. 같은 트랙의 뼈 수만큼 바인딩을 만들지 않아요. 정지 시 같은 대상의 복원 뼈는 한 번 순회하고 월드 행렬도 한 번 갱신해요. 뼈별 채널/활성 샘플 관리 비용은 실제로 생기며, 전체 프레임 속도나 메모리 수치 개선을 이 구조만으로 주장하지 않아요.

같은 우선순위의 정규화 레이어 혼합은 SEQUENCE_LAYER_BLENDING.md에 설명해요. 가져온 클립의 전체 뼈 TRS도 공용 골격 채널을 사용해요(SEQUENCE_IMPORTED_POSE_ALIASES.md). 루트·일반 오브젝트·렌더러·인덱스 단위 뼈 속성 별칭과 임의 알림 콜백의 부작용·비동기 외부 setter 되돌리기는 별도 범위예요. 바인딩에 관계없는 새 중복 뼈 삽입은 기존 활성화/조회 검증에서 확인해요.

소유자는 `prototype/sequence-pose-ownership.js`, `prototype/sequence-skeletal-channels.js`, `prototype/sequence-pose-playback.js`예요. AI는 `schema.sequencePoseOwnership`으로 계약을 확인하고 `hb context "시퀀스 골격" --symbol SequencePoseOwnership`으로 좁혀요. 검사 근거는 WORK1927에 기록해요.
