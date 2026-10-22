# 시퀀스 이전 애니메이션 재생 복원

스프라이트 애니메이션, 기존 Transform 타임라인, 가져온 모델의 단일 AnimationClip은 시퀀스가 처음 제어한 시점의 재생 시간·반복·정지 설정을 보관해요. 마지막 복원 소유자가 끝나면 이 시간부터 재개해요. 시네마틱이 재생된 만큼 원래 애니메이션의 시간을 진행시키지는 않아요.

애니메이션 트랙의 상세 속성에서 `시퀀스 기본값`, `원래 값 복원`, `마지막 값 유지`를 고를 수 있어요. 기존 `completionMode: default|restore|keep`, 시퀀스 `restoreState`와 `forceRestore`를 함께 사용하며, Undo/Redo·저장·revision/dryRun 계약도 같아요. `keep`는 마지막 포즈를 고정하고 일반 재생기의 평가를 멈춰요. 다음 Play/Stop이나 월드 종료는 평소처럼 정리해요.

여러 시퀀스가 겹치면 우선순위가 높은 소유자의 샘플을 보여 줘요. 그 소유자가 해제되면 낮은 소유자의 최신 시간으로 즉시 돌아가며, 마지막 해제에서 공유한 원래 재생 상태를 복원해요. 클립 사이 빈 구간도 해당 채널을 해제해요. 새 외부 재생 요청이나 같은 ID의 새 액터·새 모델이 이전 복원에 덮어써지지 않도록 요청 번호와 개체 수명을 확인해요.

사람은 기존 시퀀스 트랙 상세 속성을 쓰고, AI는 같은 JSON의 `tracks[i].completionMode`를 편집해요. 기존 BP 노드와 C++ `hb::LevelSequence::Play/Pause/Seek/Stop`도 같은 서비스로 실행해요. 새 ABI·노드·캐시·타이머·작업자는 추가하지 않았어요.

`runtime.animationPlayback`는 선택한 `target`과 `limit`(기본64, 최대512)에 대해 현재 단순 재생기의 `actor,type,source,time,length,loop,controlled`와 복원 진단 카운터를 읽어요. 실행기의 `hbPlayerDebug.inspect().animationPlayback`도 같은 자료예요. 비공개 스냅샷과 모델 참조는 내보내지 않아요. 정확한 소유자는 `captureAnimationPlayback`, `restoreMixerPlayback`, `animationAdapter`로 찾을 수 있어요.

스냅샷은 기존 불변 클립 자료와 공개 action 설정만 참조해요. 이전 live mixer를 유지하거나 중복 평가하지 않아요. 복원 시 mixer를 새로 바인딩하고 `update(0)`으로 저장 시각의 포즈를 평가해요. Transform·스프라이트 재생기도 시퀀스 제어 중 일반 tick을 진행하지 않도록 수정했어요.

Animation Graph·몽타주의 상태 머신/전이/notify 이력, 외부 비공개 crossfade·유한 반복 내부 이력, Transform/골격 채널과의 가중 혼합, 임의 비동기 외부 setter의 시각적 rollback은 아직 이 복원의 범위에 포함하지 않아요. 모델이 바뀌면 이전 모델에 속한 클립을 새 모델로 복원하지 않아요.

이번 참고 원문은 [Epic Animation Track](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-track?application_version=4.27), [Epic Keep/Restore](https://dev.epicgames.com/documentation/unreal-engine/keeping-or-restoring-changes-made-by-sequencer?application_version=4.27), [Unity Animation clip properties](https://docs.unity.cn/Packages/com.unity.timeline%401.8/manual/insp-clip-anim.html)예요. 트랙 종료·클립 구간/외삽과 엔진의 재생 소유권을 구분해 적용했어요. HBEngine의 `restoreState`는 기본 정책이고, 전역 강제는 `forceRestore`예요. 두 엔진 전체 분석이나 동일 동작을 주장하지 않아요.
