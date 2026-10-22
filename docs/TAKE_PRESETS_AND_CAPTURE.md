# 녹화 프리셋·채널·뼈 필터

시퀀스 편집기의 **녹화 설정**에서 기본·트랜스폼·캐릭터·게임플레이·시네마틱 프리셋을 선택해요. 개별 옵션을 바꾸면 사용자 설정으로 표시돼요. 위치·회전·크기·표시 채널을 각각 제외할 수 있고, 골격을 켜면 쉼표로 구분한 뼈 이름을 지정할 수 있어요. 뼈 목록이 비어 있으면 전체 골격을 녹화해요. 존재하지 않는 뼈 이름은 키에 포함하지 않으며, 모델 교체로 선택한 뼈가 사라진 구간은 빈 포즈로 남겨요.

| 프리셋 | 추가로 켜는 항목 |
|---|---|
| 기본 | 트랜스폼·표시와 컴포넌트 속성 |
| 트랜스폼 | 트랜스폼·표시 |
| 캐릭터 | 트랜스폼·표시, 부모 연결, 골격 |
| 게임플레이 | 기본, 부모 연결, 변수·C++, 생성·삭제 |
| 시네마틱 | 모든 녹화 종류 |

명시한 개별 값이 프리셋보다 우선해요. 내장 프리셋 선택은 FPS를 유지하고, 독립 프리셋 에셋을 불러오면 에셋의 FPS·키 오차도 적용해요. 생성 필터의 평면은 편집기에서 2D이면 XY, 그 외에는 XYZ로 시작하고 직접 XZ를 고를 수 있어요. 기존 반경·종류·클래스·컴포넌트 편입 정책은 유지해요.

편집 중 바꾼 값은 시퀀스의 `recordingSettings`에 저장하며 기존 Undo·Redo·revision·저장 경로를 사용해요. 실행 중 설정은 현재 녹화 옵션으로 적용하고 결과 Take에 포함해요. 녹화 도중에는 설정을 잠가요. 녹화 설정의 프리셋 에셋에서 불러오기·프리셋으로 저장을 사용할 수 있어요. 기존 키와 트랙은 유지하고 설정을 복사해요. 이 필드가 없는 기존 시퀀스는 이전 기본 동작을 유지해요.

## 공용 실행·AI

`runtime.take.start`는 `preset`, `properties`, `boneNames`와 기존 개별 옵션을 함께 받아요. 예:

```json
{"method":"runtime.take.start","params":{"name":"Walk","targets":["Player"],"fps":30,"preset":"character","properties":["position"],"boneNames":["Hips","Spine"]}}
```

`runtime.take.state`는 녹화 여부·FPS·키 오차·표본·트랙 수·현재 설정과 골격 scratch 관찰값을 반환해요. 키 전체를 복사하지 않아요. 결과는 기존 `runtime.take.finish`와 `sequence.take.apply`로 적용하고 블루프린트·C++ `LevelSequence::Play/Seek/Stop`으로 재생해요. 편집기 녹화 제어를 게임용 C++ ABI로 새로 추가한 것은 아니에요.

골격 캡처는 한 Take 안에서 뼈 행과 세 벡터의 임시 자료를 재사용해요. 실제로 받아들인 키는 독립 복사본을 가지므로 이후 프레임이나 모델 교체가 지난 키를 바꾸지 않아요. 기존 공개 `captureSkeletalPose`의 독립 스냅샷 계약은 그대로예요. 필터·이름·순서·모델 부재·정상화된 쿼터니언과 양수 크기를 확인해요. 최대 2048개 뼈, 기존 키·트랙 예산을 유지해요. scratch 계수는 해당 자료 생성 수이며 전체 메모리·FPS 측정값은 아니에요.

## 독립 프리셋 에셋

콘텐츠 브라우저의 애니메이션 → Take 녹화 프리셋에서 만들어요. `takepreset` / `.hbtakepreset.json`의 version1 자료는 name, fps(정수1..240), tolerance(유한한0이상), settings(기존 녹화 설정version1), 선택 description을 저장해요. 전용 편집기는 기존 채널·뼈·생성 필터 컨트롤을 재사용하고 일반 문서 Undo/Redo·revision·저장을 사용해요. 간략한 settings도 기본값을 해석해 편집해요.

시퀀스 녹화 설정의 **불러오기**는 fps/recordingTolerance/recordingSettings만 복사해요. 중지 상태에서는 문서의 한 편집으로 Undo/Redo하고, 실행 중에는 다음 녹화 옵션만 바꿔요. **프리셋으로 저장**은 폴더·이름을 고르는 창을 열고 새 파일을 만들어요. 기존 파일을 덮어쓰지 않으며, 원본 시퀀스의 파일·열린 문서 기준을 검사해요. 생성 파일은 같은 파일 묶음 Undo/Redo로 지우거나 복구할 수 있어요.

AI는 `sequence.take.preset.apply`에 열린 시퀀스 path/expectedRevision, presetAsset, 선택 expectedPresetRevision(`files.get` 기준)을 넣어요. 동일 설정의 적용은 noChange이며, 오래된 문서/프리셋 기준은 쓰기 전에 거절해요. 게임 실행 중에는 `runtime.take.start`의 presetAsset/expectedPresetRevision을 사용해요. 파일을 한 번 읽은 뒤 명시한 개별 옵션을 덮어쓰고, spawnFilter는 명시한 필드만 덮어써요. 진행 중인 녹화는 나중의 파일 수정·삭제·이동을 다시 읽지 않아요.

녹화기는 FPS와 키 오차를 실제 표본/키 줄이기에 사용하고 결과 시퀀스에 fps/recordingTolerance/recordingSettings를 복사해요. 녹화 프리셋은 편집기 전용으로 일반 게임 내보내기에서 제외해요. 게임에서 해당 파일을 직접 참조하면 빌드가 거절돼요. 기록된 시퀀스의 BP·C++ 재생은 프리셋 파일 없이 독립적으로 동작해요. 이미 저장된 결과에 원본 프리셋 변경이 자동 반영되는 라이브 링크가 아니에요. 새 상주 cache/worker/timer/GPU 자원은 없고 선택/불러오기 시 기존 프로젝트 인덱스와 파일 읽기를 사용해요.

AI 계약은 `engine.schema.takePresets`, 모델 소유자는 take-preset-assets.js, 저장 창은 take-preset-save.js예요. 실제 설정 프리셋·복사/녹화·키 줄이기·C++/게임 재생이 지원 범위예요. Actor/source 바인딩 목록·프리셋 상속·독립 clock/timecode·외부 캡처 소스는 별도 잔여예요. [Unreal Take Recorder](https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine)의 preset 저장/불러오기와 FPS·키 줄이기 설정 본문을 대조했으며, Unreal의 전체 source 프리셋 구현이나 전체 문서/API 분석 완료를 뜻하지 않아요.
