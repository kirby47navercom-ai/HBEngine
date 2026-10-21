# Shot·Sub-Sequence 제작과 실행

기존 레벨 시퀀스 에셋을 다른 시퀀스의 `sections`에 배치해요. 별도 시퀀스 형식을 복제하지 않아요. 라이브러리에서 시퀀스를 골라 Shot/Sub-Sequence를 추가하고, 타임라인에서 이동·시작/끝 트림, 상세 속성에서 소스 시작·시간 배율·반복·행·계층 우선순위·비활성을 편집해요. 시작 트림은 소스 오프셋도 같이 변경해 내용의 위치를 유지해요. 시간 입력은 부동소수점 잔여 숫자를 줄여 표시해요. 구간 우클릭으로 열기·복제·삭제를 하고 더블클릭으로 원본 에셋을 열어요.

```json
{
  "id": "Shot01",
  "name": "도입",
  "kind": "shot",
  "asset": "Assets/LS_Intro.hbsequence.json",
  "start": 1,
  "duration": 3,
  "sourceStart": 0.5,
  "rate": 1,
  "loop": false,
  "row": 0,
  "bias": 100,
  "muted": false
}
```

구간은 시작 포함·끝 제외예요. 중첩 로컬 시간은 `sourceStart + (부모 시간 - start) × rate`예요. 반복을 끄면 소스 끝에서 마지막 값을 유지해요. 반복을 켜면 소스 길이로 순환해요. 시퀀스 에셋의 자체 `rate`는 루트로 재생할 때 사용하며, 중첩 재생은 구간의 배율을 사용해요. Seek·일시정지·편집기 스크럽은 게임 이벤트를 재발행하지 않아요. 정상 재생에서는 통과한 구간·반복 경계의 이벤트 범위를 순서대로 전달해요.

Sub-Sequence는 동시에 평가할 수 있어요. Shot은 겹치는 구간 중 가장 위쪽 행, 같은 행에서는 더 늦게 시작한 구간이 우선해요. 자식의 채널 우선순위는 부모 우선순위 + 구간 bias + 자식 에셋 priority예요. int32 범위를 넘는 전체 트리는 재생 전에 거절해요. 동률의 값 혼합은 기존 실행 순서 규칙을 따르며 가중 혼합을 추가했다는 뜻은 아니에요.

각 자식은 기존 채널 소유권·생성 오브젝트·오디오 핸들을 사용해요. 구간 이탈·중지·재진입·부모 종료에서 해당 자식의 소유권을 정리하고 원래 값 또는 다른 활성 시퀀스의 최신 값으로 복원해요. 자식 로딩·검증 실패는 이미 재생 중인 시퀀스를 대체하지 않아요. 순환·과도한 깊이·잘못된 소스 범위는 편집기/게임 로드와 공용 패키징에서 거절해요. 취소되거나 소유자가 바뀐 요청은 추가 자식 로딩을 중단해요.

편집기 미리보기·실제 게임·기존 Blueprint/C++ `LevelSequence::Play/Pause/Seek/Stop/SetPriority` 경로가 같은 트리를 사용해요. 프로젝트 원본을 수정하거나 미리보기에서 사용자 게임 스크립트를 다시 실행하지 않아요. 새 타이머·상주 워커·전체 장면 사본은 추가하지 않아요. 미리보기는 실제 애니메이션 대상의 경계를 맞추고 이동을 따라가며, timeline.preview.read의 focusTarget/focusProjection으로 화면 안 배치를 확인할 수 있어요.

## AI와 조회

- `sequence.section.edit`: path/revision, operation add/update/remove, id, section 속성, dryRun. 기존 문서 Undo/저장/충돌 검증을 공유해요.
- `runtime.sequenceTree`: target, offset, limit. 현재 트리의 에셋·구간 경로·활성 여부·로컬 시간·누적 우선순위를 요청할 때만 읽어요.
- `timeline.preview.read`: 에셋 path. 미리보기의 실제 오브젝트와 시간을 읽어요.
- `hb context "하위 시퀀스"`: 모델·실행기·제작창 위치를 찾으며 서버나 색인 워커를 띄우지 않아요.

변환 원점, 타임워프 곡선, 부모 문맥 안에서의 하위 에셋 편집, 가중 혼합, Shot 썸네일·Take 메타데이터와 전문 영상 출력은 별도 잔여예요. 이 구현을 전체 시네마틱 완료로 계산하지 않아요.

## 읽은 근거

[Epic UE 5.1 Master Sequences, Shots, and Takes](https://dev.epicgames.com/documentation/en-us/unreal-engine/master-sequences-shots-and-takes-in-unreal-engine?application_version=5.1)의 Shot 구간·상위 행 우선·소스 오프셋·반복·배율·계층 bias 구역을 대조했어요. 역사 버전의 제작 동작 참고이며 UE 5.8 전체 기능 확인으로 계산하지 않아요.

[Unity Timeline 1.7.7 Nesting Timeline instances](https://docs.unity3d.com/Packages/com.unity.timeline@1.7/manual/wf_nested.html)의 자체 본문에서 부모/자식 조합·Control 구간 활성 범위·더블클릭 원본 편집을 확인했어요. 연결 API·이미지 원본·전체 Timeline 패키지 분석은 포함하지 않아요.
