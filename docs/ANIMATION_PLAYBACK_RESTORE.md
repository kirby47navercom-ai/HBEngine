# 시퀀스 이전 애니메이션 재생 복원

스프라이트 애니메이션, 기존 Transform 타임라인, 가져온 모델의 단일 AnimationClip, Animation Graph와 몽타주는 시퀀스가 처음 제어한 시점의 재생 시간·반복·정지 설정을 보관해요. 마지막 복원 소유자가 끝나면 이 시간부터 재개해요. 시네마틱이 재생된 만큼 원래 애니메이션의 시간을 진행시키지는 않아요.

애니메이션 트랙의 상세 속성에서 `시퀀스 기본값`, `원래 값 복원`, `마지막 값 유지`를 고를 수 있어요. 기존 `completionMode: default|restore|keep`, 시퀀스 `restoreState`와 `forceRestore`를 함께 사용하며, Undo/Redo·저장·revision/dryRun 계약도 같아요. `keep`는 마지막 포즈를 고정하고 일반 재생기의 평가를 멈춰요. 다음 Play/Stop이나 월드 종료는 평소처럼 정리해요.

여러 시퀀스가 겹치면 우선순위가 높은 소유자의 샘플을 보여 줘요. 그 소유자가 해제되면 낮은 소유자의 최신 시간으로 즉시 돌아가며, 마지막 해제에서 공유한 원래 재생 상태를 복원해요. 클립 사이 빈 구간도 해당 채널을 해제해요. 새 외부 재생 요청이나 같은 ID의 새 액터·새 모델이 이전 복원에 덮어써지지 않도록 요청 번호와 개체 수명을 확인해요.

사람은 기존 시퀀스 트랙 상세 속성을 쓰고, AI는 같은 JSON의 `tracks[i].completionMode`를 편집해요. 기존 BP 노드와 C++ `hb::LevelSequence::Play/Pause/Seek/Stop`도 같은 서비스로 실행해요. 새 ABI·노드·캐시·타이머·작업자는 추가하지 않았어요.

`runtime.animationPlayback`는 선택한 `target`과 `limit`(기본64, 최대512)에 대해 현재 재생기의 `actor,type,source,time,length,loop,controlled`와 복원 진단 카운터를 읽어요. `preanimated`는 보관 중인 대상·종류·단계·고정 시각·몽타주 개수만 돌려주고, `restoration.retained`는 필터에 맞는 보관 개수예요. 실행기의 `hbPlayerDebug.inspect().animationPlayback`도 같은 자료예요. 비공개 스냅샷과 모델 참조는 내보내지 않아요. 정확한 소유자는 `AnimationPlaybackLease`, `inspectAnimationPlayback`, `animationAdapter`로 찾을 수 있어요.

이전 재생기를 활성 평가 목록에서 분리해 보관해요. 새 재생기를 만들어 과거 이력을 흉내 내지 않아요. 원래 mixer의 Repeat/PingPong 유한 반복·진행 중 fade, 그래프 파라미터·상태 머신/전이·동기화 시계, 몽타주 섹션·가중치·블렌드 아웃 중인 이전 몽타주를 그대로 재개해요. 중복 tick·대기 타이머는 없고, 제어 대상의 실제 표시 포즈만 진입 시 한 번 복사해 복원 직후에도 보이게 해요. 원본과 같은 액터/모델인지 확인하며 마지막 값 유지·더 최신 외부 재생·삭제·월드 종료는 보관물을 해제해요. 분리 mixer의 uncacheRoot가 새 소유자의 포즈를 덮어쓰지 않도록 폐기는 참조 해제로 처리해요.

알림은 시퀀스 중단 경계에서 활성 구간의 End(reason=`sequence-suspended`)를 한 번 전달해 scope에 묶인 대기·타이머를 취소해요. 재개 다음 tick에 여전히 해당하는 구간은 Begin부터 다시 진입해요. 몽타주 Interrupted/Ended는 단순 보관 시 발생하지 않아요. 이미 실행한 콜백 부작용이나 취소된 latent 작업을 되감아 복원하지는 않아요. 엔진 관리 action 외에 임의로 추가한 mixer action, Transform/골격 채널과의 가중 혼합, 임의 비동기 외부 setter의 시각적 rollback은 별도 잔여예요. 모델이 바뀌면 이전 모델에 속한 클립을 새 모델로 복원하지 않아요.

이번 참고 원문은 [Epic Animation Track](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-track?application_version=4.27), [Epic Keep/Restore](https://dev.epicgames.com/documentation/unreal-engine/keeping-or-restoring-changes-made-by-sequencer?application_version=4.27), [Unity Animation clip properties](https://docs.unity.cn/Packages/com.unity.timeline%401.8/manual/insp-clip-anim.html)예요. 트랙 종료·클립 구간/외삽과 엔진의 재생 소유권을 구분해 적용했어요. HBEngine의 `restoreState`는 기본 정책이고, 전역 강제는 `forceRestore`예요. 두 엔진 전체 분석이나 동일 동작을 주장하지 않아요.

1865–1867: 같은 mixer 유한 Repeat/PingPong·fade를 독립 무중단 대조군과 비교하고, 실 서비스에서 그래프/몽타주·전이·retiring fade·notify scope·서로 다른 최종 director·keep·외부 교체·월드 정리를 확인해요. 실제 사용자 C++ AnimationGraph/Montage 설정과 LevelSequence 조작·편집기·별도 D3D11 패키지는 WORK1867/설치 영수증의 확정 근거를 따르세요.
