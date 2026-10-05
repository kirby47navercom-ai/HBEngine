# 몽타주 슬롯·포즈 통합 · 2026-10-05

공용 제작/실행 창의 프레임·키 이동, 초/프레임·별도 미리보기/실행 재생선과 C++ 직접 시퀀스 진단은 [타임라인 조작 계약](ANIMATION_TIMELINE_CONTROLS.md)에 이어 기록해요.

## 후속: 지정 시간의 Stop 혼합·Ended

[Epic5.8 Montage_Stop](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance/Montage_Stop)의 자체 Description/선언0–25를 새로 읽었어요. null 몽타주 전체 중단과 지정 BlendTime에 에셋 BlendOut 설정을 사용하는 동작을 대조했어요. [UAnimInstance](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance)의 자체 delegate 요약112–127과 몽타주 요약740–849에서 BlendingOut/Ended의 구분·StopGroupByName(float,Name)을 읽었어요. 전체 클래스/상속/링크된 API를 읽기로 세지 않아요. StopGroupByName 개별 URL은 web 읽기가 실패했고 직접 받은200 HTML에서도 기술 본문을 확인하지 못했으므로 자체 본문 미독이에요. 원문/응답/SHA/경계는 `native/build/montage-stop-docs-5QRB0I`에 있어요. 연결 선언/프로파일/동기화 API도 후속 대상으로 유지해요.

`Montage::Stop(target, blendTime=0.0f)`와 `StopGroup(target,group,blendTime=0.0f)`에 동일한 BP Float 핀을 추가했어요. 기존 저장 노드와 인자 없는 C++ 호출은0초 즉시 중단으로 호환해요. 0~60초의 유한 수만 허용하고 null/문자열/NaN/무한/범위 밖 입력은 기존 재생을 바꾸기 전에 거절해요. 재생 추가/별도 노드 없이 기존 공용 경로를 사용하며 BP/API 수량은566/289개로 유지해요.

양의 시간은 현재 가중치/포즈를 잡고 linear/smooth로0까지 줄여요. 몽타주 일시정지 중에도 중단 혼합은 진행해요. 현재 HBEngine Stop은 **중단 위치의 포즈를 고정**하며 그 이후 클립 시간/Notify를 진행하지 않아요. UE의 모든 blend-out 평가/Notify 동작과 동일하다고 표현하지 않아요. 같은 Stop을 다시 호출해 남은 시간을 늘리지 않고 더 짧은 시간으로 줄일 수 있어요. 다른 그룹은 유지하며0 가중치에서 기준 그래프 포즈로 돌아가요. 반환/파괴/컴포넌트 비활성/세계 정리는 혼합을 기다리지 않아요.

중단 혼합 시작은 아직 BlendOut을 시작하지 않은 인스턴스의 `OnMontageBlendOut(interrupted=true)`를 한 번 전달해요. `OnMontageInterrupted`는 호환을 위해 완전히 끝난 시점에 전달하고, 뒤이어 새 `OnMontageEnded(asset,group,reason,interrupted)`를 전달해요. 자연 종료의 Ended는 interrupted=false예요. Play Montage proxy의 모든 출력과 동일한 ABI로 세지 않아요. 정리를 먼저 끝내서 사용자 콜백이 실패해도 프로그램을 남기지 않고, 첫 콜백 실패 뒤에도 Ended를 시도해요. 전체 Stop 중 콜백이 만든 새 인스턴스는 오래된 목록의 후속 처리로 중단하지 않아요.

runtime/schema에 `stopping`과 중단 계약을 추가하고 몽타주 창의 실행 상태에 실제 기여도와 중단 중 상태를 표시해요. AI와 사람은 같은 상태/Float 핀·revision/검증·실행 잠금을 사용해요. 기존 그룹 조회로 혼합의 가중치를 읽을 수 있어요.

코어 검사는 짧은/부드러운 혼합, 일시정지, 시간을 늘리는 재호출 거절/단축, 불법 시간의 원본 보존, 중단 뒤 Notify 억제, 콜백 생성 인스턴스 보존, 콜백 오류 뒤 정리/Ended를 통과해요. 실제 Editor/Player의 C++ StopGroup→중간 뼈 포즈·다른 그룹 유지→Ended BP→사용자 C++, BP StopGroup→중간 뼈/가중치→기본 포즈 복원을 검사해요. 개별 근거와 실패는 최신 인계에 기록해요. 같은 그룹 교체의 outgoing pose 혼합·프로파일·시간 보정·공유 Skeleton/Notify Window·Root Motion/Sequencer 슬롯과 다른 전체 엔진 요구는 계속 구현해요. 아래 즉시 Stop 설명은 최초 슬롯 통합 당시 기록이에요.

## 실제로 읽고 대조한 공식 근거

- [Epic5.8 Animation Slots](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-slots-in-unreal-engine) 기술 본문0–92를 다시 읽었어요. 기본 포즈 통과, 완전 덮어쓰기와 Always Update Source, 전신/상체 배치, 공유 Skeleton 슬롯 관리, 같은 그룹 중단/다른 그룹 병행, Sequencer 슬롯을 대조했어요.
- [Epic5.8 Montage Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-editor-in-unreal-engine) 본문0–153과 [Animation Montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine) 본문0–126을 읽었어요. 클립·슬롯·섹션/Notify 제작, 복제/삭제·그룹 제한, Play/Completed/BlendOut/Interrupted, 혼합·자동 종료·프로파일/시간 보정·자식 몽타주/루트 모션 설명을 대조했어요.
- [Unity6000.0 Animation Layers](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationLayers.html) 기술 본문127–168과 [Avatar Mask](https://docs.unity3d.com/6000.0/Documentation/Manual/class-AvatarMask.html) 본문126–186을 읽었어요. Override/Additive·뼈 필터·동기화 레이어/Timing·Mute/Solo, Humanoid/Transform/IK 마스크와 가져오기/실행 비용을 대조했어요.
- [Unity SetLayerMaskFromAvatarMask](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animations.AnimationLayerMixerPlayable.SetLayerMaskFromAvatarMask.html)의 자체 선언234–235·인자240–256·설명259–263·예제266–293을 읽었어요. 마스크 변경 후 재적용과 LayerMixer/ClipPlayable/AnimationOutput 그래프 수명을 대조했어요.

여섯 HTML 원문·응답/SHA·경계는 `native/build/montage-slot-docs-jmWetA/manifest.json`에 보존해요. 연결 Skeleton/Sequencer/API 전체, 이미지·영상·패키지 전체 읽기로 세지 않아요. 자체 포즈/마스크 구현이며 Epic/Unity 내부 코드·동일 알고리즘 구현으로 표현하지 않아요. 이 출처들을 후속 연구 대상에도 포함하고 전체 corpus/API gate는 유지해요.

## 제작·실행 계약

Animation Graph의 `slot` 노드는 입력 `pose`, `group`, `slot`, `alwaysUpdateSource`를 가져요. 재생이 없으면 기본 포즈를 통과시켜요. 활성 슬롯은 몽타주 포즈와 현재 가중치로 섞어요. 완전히 덮으면 기본 가지 평가/시계를 멈추고 Always Update Source는 평가/시계를 유지해요. 공유 클립은 계획에서 한 번만 진행해요. 뼈 Layer 뒤/앞 배치와 기존 마스크·가산/상태/동기화 노드를 함께 사용해요.

몽타주는 같은 슬롯의 클립 겹침을 거절하고 서로 다른 슬롯의 같은 시간 클립을 허용해요. 한 몽타주의 슬롯은 같은 그룹에 속해요. 같은 Actor·그룹의 새 재생은 이전 재생을 교체하고 다른 그룹은 독립 재생/일시정지/시간 이동/중지가 가능해요. 재생 전 출력에 도달하는 대응 그래프 슬롯을 검사해요. 그래프 없는 예전 사용은 단일 슬롯·그룹의 전신 재생을 유지하고 캡처한 기준 포즈에서 혼합해요.

`blendIn`, `blendOut`, `blendCurve`(linear/smooth), `autoBlendOut`을 저장해요. 생략한 예전 에셋은 혼합 시간0·자동 종료로 호환해요. 자연 종료의 마지막 섹션은 남은 실제 시간으로 혼합 종료하고 Completed를 내요. 자동 종료를 끄면 마지막 포즈를 유지해요. BlendOut 시작/Completed/Interrupted의 Custom Event에 asset/group과 필요한 reason/interrupted를 전달해요. 현재 Stop/교체는 즉시 정리하며 명시적인 중단 혼합 시간·완전한 UE 콜백 모델은 다음 구현 대상이에요.

몽타주 클립은 그래프와 같은 컴파일/샘플러를 재사용해요. 모델 내부 클립, 트랜스폼 클립, 2D 스프라이트 프레임을 같은 슬롯 경로로 샘플링해요. 임시 모델 포즈를 장면에 먼저 쓰지 않고 최종 그래프 포즈만 적용해요. 새 뼈/속성은 그래프 기준 포즈·상태별 포즈·중단 시 고정 포즈·마스크에 한 번 추가해요. 회전은 Quaternion 최단 경로 혼합을 사용해요. 같은 바인딩의 재생은 그래프 포즈 버퍼를 늘리지 않아요.

그래프의 합친 바인딩1024·수치8192·포즈 버퍼64MiB, 몽타주256클립/64고유 클립의 입력 경계를 검사해요. 잘못된 슬롯/겹침/바인딩/메모리 제한 교체는 기존 재생을 보존해요. 로드 중 더 늦은 교체·그룹/전체 Stop·세계 종료가 발생하면 오래된 요청은 재생을 복원하지 않아요. Notify에서 Stop/Seek/Jump/Pause를 하면 이전 진행을 버려요. 월드 종료/반환/파괴/중지는 프로그램과 슬롯을 정리해요.

블루프린트 클래스 기본 MeshRenderer가 장면에 설정한 모델을 덮던 공통 결합 문제도 수정했어요. 클래스 기본값의 이전 스냅샷과 실제 개별 속성을 대조해 모델/머테리얼 등 개별 값을 유지하며, 손대지 않은 상속 속성은 새 클래스 기본값을 따라요. 이전 스냅샷이 없는 파일은 컴포넌트 기본값을 기준으로 호환해요. 기본값과 같은 값으로 명시적으로 덮어쓴 속성을 구별하는 별도 override 표시는 추가 대상이에요. 렌더러 없는 실행은 공통 mesh 훅을 null 대상으로 처리해 2D IK 조회가 일반 물리/게임 실행을 막지 않아요.

## 사람·AI·C++

몽타주 전용 창에서 미리보기와 섹션/슬롯/Notify 줄을 함께 표시하고 속성은 오른쪽에 모았어요. 선택 Actor만 미리보기하고 기본 Animation Graph를 선택해 슬롯과 뼈 마스크를 확인해요. 슬롯 우클릭의 추가/복제/삭제와 클립 추가, 혼합/그룹 설정을 제공해요. 드래그는 미리보기 위치를 보여 준 뒤 검증된 변경 한 번으로 Undo에 기록해요. 잘못된 겹침은 에셋을 바꾸지 않아요. 각 문서의 revision/Undo/Save와 실행 잠금·AI document.patch/dryRun/schema는 기존 경로를 공유해요.

`hb::Montage::StopGroup/PauseGroup/SeekGroup/GetGroupPosition/GetGroupWeight/IsGroupPlaying`과 동일한6개 BP 노드를 추가했어요. 기존 Play/Stop/Pause/Jump/Next/Position/Seek도 유지해요. 기존 Stop은 모든 그룹을 중지하고 나머지 그룹 미지정 제어는 최근 그룹을 대상으로 해요. 실행 진단은 `gameplayDebug.montageGroups`에 그룹/슬롯/시간/가중치/상태를 제공해요. C++·BP·편집기·Player·AI가 같은 실행기를 호출해요. 현재 포즈 노드13종, BP566개, 공용 C++ API289개예요.

## 검증 근거

- `test:animation-montage`: 실제 모델 뼈의 새 바인딩/마스크·동시 슬롯/그룹·기본 시계/Always Source·혼합/정지/시간 이동/유지·2D 프레임·배치 위치·상속/개별 속성·비동기 취소·실패 교체 보존·Notify 취소·Quaternion과 비활성 상태/중단 버퍼 확장·해제 검사를 통과해요.
- 실제 Editor `animation-montage-editor-BAKSDk`: Slot 속성/Undo·AI 불법 슬롯 dryRun 거절·몽타주 설정/Undo·슬롯 우클릭 복제/추가/Undo·독립 미리보기·C++ 두 그룹/조회·BP 조회→사용자 C++·BP/C++ Stop과 Interrupted·2D 프레임 전환/복원·배치 위치/원본 보존·exit0/소유 서버 정리를 검사했어요. `montage-editor.png`를 직접 확인했어요.
- release Player `animation-montage-player-juVNeC`는 같은 C++/BP 제어와 뼈/스프라이트·기본 그래프 복원·원본/exit0/서버 정리를 검사해요. 이전48wKLs도 스프라이트 경로를 통과했어요. 최신 Player는 Notify 재제어/독립 혼합/렌더러 없는 훅 보강 후 빌드예요.
- `test:scene`·기본 포즈/상태/Sync/구간/알림 정책·main 검사도 통과했어요. C++ 배치 위치와 첫 HUD는 실제 startup-IIW7qZ에서 확인했어요. 실패 및 수정 이력은 DEBUG_HANDOFF에 남겨요.
- `check-animation-montage-cost.mjs`, `animation-montage-cost-vHTl4m`: Actor1·모델 클립3·마스크 슬롯2·준비100/5×1000Tick, 비활성 .0099786ms·활성 .0088387ms CPU 중앙, 그래프432/몽타주336bytes 포즈 버퍼 재사용이에요. 실행 순서/JIT/실제 가지 작업이 달라 순수 추가 비용이나 활성 재생이 더 빠르다는 근거로 쓰지 않아요. VM/이벤트/GPU/전체FPS/모바일/탄막 검사가 아니에요.

사용자 설치본·프로필·게임 원본·열린 창을 보존했어요. 공유 Skeleton 슬롯 관리자, Notify Window/typed 범위·동기화 메타데이터, 명시적 Stop/교체 혼합, Blend Profile/시간 보정 곡선/자식 몽타주/Root Motion/Sequencer 슬롯 연결은 다음 세부 작업이에요. 전체2D/렌더/월드/게임/C++/AI/UI/오디오/모바일/배포·가벼움 요구도 계속 유지해요.
