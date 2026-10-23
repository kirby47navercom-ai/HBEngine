# 가져온 클립과 녹화 골격 포즈의 공용 소유권

모델의 가져온 애니메이션 클립에서 뼈의 전체 `position`·`quaternion`·`scale` 트랙은 녹화 `skeletalPose`와 같은 `skeletalPose:<뼈 이름>` 채널을 사용해요. 기존 시퀀스의 혼합 방식·가중치·우선순위와 C++ `hb::LevelSequence` 조작을 그대로 사용해요. 새 에셋 필드나 공개 함수는 필요 없어요.

- 다른 시퀀스는 뼈별 우선순위와 시작 순서로 중재해요. 같은 우선순위의 정규화 레이어는 위치·크기를 가중 평균하고 회전을 같은 반구의 단위 쿼터니언으로 평균해요. 녹화 트랙의 `poseWeight`는 먼저 공유 기준 포즈와 섞여요.
- 하나의 시퀀스에서는 트랙 작성 순서가 같은 뼈의 마지막 값을 결정해요. 기존의 대상별 마지막 활성 애니메이션 트랙 선택은 유지해요. 클립에 없는 뼈의 TRS 성분은 공용 제어 시작 전의 실제 로컬 포즈를 사용해요.
- 클립 공백·0 가중치·재활성화·트랙별 keep/restore·forceRestore를 같은 소유권에서 처리해요. 믹서가 공용 포즈를 별도로 쓰거나 잘못된 bind pose를 캡처하지 않도록 해당 트랙만 믹서 액션에서 제외해요. 비골격 트랙은 기존 믹서에서 계속 평가해요.
- 제어 시작 전에 기준 포즈를 캡처해요. 기존 믹서·그래프·몽타주는 기존 재생 인스턴스와 시각·fade·반복 이력을 보관하고 재개해요. 유지된 클립 포즈도 실제 캡처 값을 복원해요. 이후 직접 시작한 외부 재생기를 이전 시퀀스가 다음 프레임에 다시 빼앗지 않아요.
- 골격 전용 시퀀스 아래에서 일반 믹서가 계속 진행한다면, 제어 중인 뼈만 외부 presentation을 보관해요. 동일 시각 재평가에서도 mixer의 unchanged 값 최적화 때문에 잘못된 포즈가 남지 않게 해요. 최종 정지 시 현재 외부 presentation을 즉시 보여줘요. 임의 외부 setter·알림 부수효과의 되돌림은 포함하지 않아요.

원래 키 트랙과 타입 배열을 공유하고 가져오기에서 만든 interpolant를 재사용해요. GLTF cubic spline 전용 factory와 discrete 보간도 유지해요. 샘플 결과는 기존 THREE 믹서와 같은 double 버퍼로 받아 불필요한 float 반올림을 추가하지 않아요. 키 베이크·키 복제·추가 타이머·워커는 없어요. 바인딩은 약한 캐시이며 실제 활성 뼈만 포즈 채널과 외부 presentation을 가져요. 모델 교체 시 새 뼈의 첫 쓰기 직전 포즈를 보관하고 이름이 같은 이전 뼈의 값을 복원하지 않아요. 행렬 갱신은 대상 루트별로 모아요.

AI 편집은 기존 `document.patch` revision·dryRun·Undo·Save를 사용해요. 런타임 `runtime.sequencePose`와 C++ `hb::Skeleton`은 같은 포즈를 읽어요. `runtime.animationPlayback`의 애니메이션 계열 표시는 나머지 믹서·스프라이트 선택을 설명하며, 공용 골격 채널의 소유 범위는 `runtime.sequencePose`에서 확인해요.

AI 소유자 탐색: `node tools/hb.mjs context "가져온 골격 별칭" --symbol ImportedSequencePoseProgram`. 관련 소유자는 `sequence-imported-pose.js`, `sequence-skeletal-channels.js`, `sequence-pose-playback.js`, `sequence-animation-mixing.js`예요.

전체 액터 루트·일반 모델 노드 TRS는 SEQUENCE_IMPORTED_TRANSFORM_ALIASES.md에 연결돼 있어요. 남은 별칭은 렌더 속성과 인덱스 단위 변환·뼈 속성이에요. 임의 외부 추가 액션·비동기 setter·notify 부수효과 롤백도 별도예요. 이 변경만으로 전체 프레임 속도·메모리·실기기 검증을 주장하지 않아요.
