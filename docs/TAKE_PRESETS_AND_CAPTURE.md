# 녹화 프리셋·채널·뼈 필터

시퀀스 편집기의 **녹화 설정**에서 기본·트랜스폼·캐릭터·게임플레이·시네마틱 프리셋을 선택해요. 개별 옵션을 바꾸면 사용자 설정으로 표시돼요. 위치·회전·크기·표시 채널을 각각 제외할 수 있고, 골격을 켜면 쉼표로 구분한 뼈 이름을 지정할 수 있어요. 뼈 목록이 비어 있으면 전체 골격을 녹화해요. 존재하지 않는 뼈 이름은 키에 포함하지 않으며, 모델 교체로 선택한 뼈가 사라진 구간은 빈 포즈로 남겨요.

상위 프리셋이 있는 독립 에셋은 아래의 **상속 프리셋** 절을 따라 먼저 해석해요.

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

AI 계약은 `engine.schema.takePresets`, 설정 소유자는 take-preset-assets.js, 소스 해석은 take-sources.js, 상속 해석은 take-preset-inheritance.js, 저장 창은 take-preset-save.js예요. 독립 clock/timecode·마이크/Live Link/다른 시퀀스 등의 외부 캡처 소스는 별도 잔여예요. [Unreal Take Recorder](https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine)의 Sources·Any Actor·Player·World, 소스 활성화·프리셋 저장/불러오기와 FPS·키 줄이기 설정 본문을 대조했어요. 전체 문서/API 분석 완료나 Unreal의 모든 소스 옵션을 구현했다는 뜻은 아니에요.

## 저장한 녹화 소스

프리셋 편집기와 시퀀스 녹화 설정에서 **대상 방식 → 저장된 소스 목록**을 선택해요. 액터는 현재 장면의 ID로 지정하고, 플레이어는 녹화 시작 때 게임 프레임워크가 조종하는 폰을 찾아요. 월드 액터는 그 시점에 활성인 액터를 포함해요. 풀에서 비활성인 액터·삭제 중인 액터·위젯/컴포넌트 보조 오브젝트는 월드 편입에서 제외해요. 소스 추가·선택 추가·삭제·개별 활성 체크를 사용하고 일반 Undo/Redo·저장으로 유지해요. 액터 이름이 바뀌어도 ID는 유지하며, 없는 ID를 같은 이름의 다른 액터로 바꾸지 않아요.

프리셋의 선택 `sources`와 시퀀스/결과 Take의 선택 `recordingSources`는 같은 목록이에요. 각 행은 `{id,type,enabled,actor?}`예요. `id`는 행의 고유 ID이고 `type`은 `actor`, `player`, `world`예요. `actor` 필드는 actor 행에만 필요해요. player는 현재 단일 로컬 게임 프레임워크의 폰이며 멀티플레이어 인덱스를 지원한다는 뜻은 아니에요. 중복 대상은 한 번만 녹화하고, 꺼진 소스는 연결을 요구하지 않아요. 켜진 액터·플레이어가 없거나 월드가 비었거나 전체가 꺼져 있으면 시작 전 오류를 내요. 다른 선택 대상으로 조용히 대체하지 않아요.

sources가 없는 기존 프리셋/시퀀스는 UI의 현재 선택(선택이 없으면 전체) 방식을 유지해요. **현재 선택**으로 바꾸면 저장된 목록을 제거해요. 빈 목록은 의도적인 미설정 상태이며 자동 전체 녹화로 해석하지 않아요. 프리셋 불러오기와 새 파일 저장에는 목록이 함께 복사돼요. 기존 키·트랙은 유지해요. 실행 중 목록 편집은 다음 녹화에만 쓰고 진행 중에는 편집을 잠가요. 비동기 프리셋 읽기 도중 사람이 실행 설정을 바꾸면 늦게 도착한 프리셋은 적용하지 않아요.

AI는 먼저 읽기 전용 `runtime.take.sources`에 presetAsset/expectedPresetRevision 또는 sources를 전달해 실제 targets와 행별 bindings를 확인해요. 같은 입력으로 `runtime.take.start`를 호출해요. 명시적인 `targets`가 있으면 소스 목록보다 우선하고, 빈 targets는 오류예요. 프리셋 없는 AI 호출은 targets 또는 sources를 지정해야 해요.

```json
{"method":"runtime.take.sources","params":{"sources":[{"id":"hero","type":"player","enabled":true},{"id":"camera","type":"actor","actor":"Camera01","enabled":true}]}}
```

시작 시 소스와 대상 ID를 독립 복사해요. 이후 프리셋 변경이나 폰 조종 전환·새 액터 추가는 현재 Take의 초기 대상 목록을 바꾸지 않아요. 시작 후 생성 녹화는 별도 includeSpawned/spawnFilter 옵션으로 관리해요. `runtime.take.state`에는 기존 targets 개수와 함께 resolvedTargets/sourceBindings/sources를 반환해요. 결과 키는 실제 액터 ID에 베이크되어 기존 BP·C++ LevelSequence 재생을 그대로 사용하며, 프리셋이나 소스 해석 기능이 게임 패키지에 있어야 하는 것은 아니에요. 월드 소스 판정은 시작/미리보기 때 한 번 순회하며 새 감시·타이머·상주 월드 색인·GPU 자원을 만들지 않아요.

## 상속 프리셋

프리셋 편집기의 **상위 프리셋**은 저장된 다른 Take 프리셋을 가리켜요. 다단계 상속을 지원하며, **이 프리셋에서 덮어쓰기**에서 FPS·키 오차·녹화 설정·녹화 소스 묶음을 각각 선택해요. name/description은 항상 자기 값이에요. settings와 sources는 각각 전체 묶음으로 덮어쓰며, 개별 채널을 부모와 합치는 규칙은 아니에요. 상위의 저장하지 않은 편집은 적용하지 않아요.

상속받는 입력은 실제 상위 값으로 표시하고 잠가요. 덮어쓰기를 켤 때 현재 보이는 유효 값을 먼저 복사해 값이 튀지 않게 해요. **상위 새로고침**은 디스크의 최신 상위 설정을 다시 읽어요. **상속 해제** 또는 상위 선택의 독립 프리셋은 현재 유효 값을 복사하고 parentPreset/overrides를 제거해요. 일반 Undo/Redo·저장을 사용해요. 비동기 미리보기 중 문서가 바뀌면 늦은 결과를 새 문서에 적용하지 않아요. 닫힌 창을 다시 그리지 않아요.

version1의 선택 parentPreset은 Assets/*.hbtakepreset.json 경로이고, 함께 필요한 overrides는 fps/tolerance/settings/sources의 중복 없는 배열이에요. 빈 배열은 전부 상속해요. sources를 덮어쓰면서 자체 sources가 없으면 기존 선택 방식으로 명시적으로 바꾸고, 빈 sources 배열이면 미설정 목록을 그대로 유지해요. 기존 상속 필드 없는 자료는 그대로 동작해요. 누락 파일·잘못된 자료·순환 참조·32단계 초과는 해석 오류예요. 상위 프리셋을 해석하지 않은 상태로 동기 takePresetOptions를 사용하면 오류를 내요.

AI의 읽기 전용 take.preset.resolve는 presetAsset을 받아 유효 data와 leaf→root 순서의 chain[{path,revision}]을 반환해요. sequence.take.preset.apply, runtime.take.sources/start에도 동일한 해석을 사용해요. 선택 expectedPresetRevision은 시작 파일만 검사하고, expectedPresetRevisions에 전체 chain의 path:revision 객체를 전달하면 상위 파일까지 검사해요. 빠진 항목·불필요한 항목·오래된 revision은 거절해요. 읽는 동안 파일이 달라지는 경우도 다시 읽어 검사해요. 파일 이동은 기존 프로젝트 redirect 해석과 참조 인덱스를 사용해요.

시퀀스 불러오기·새 프리셋 저장·실제 Take 시작은 해석한 설정의 독립 복사본을 사용해요. 결과 시퀀스와 새 파일 저장은 상속 링크를 만들지 않아요. 녹화 중 상위 파일을 바꿔도 해당 Take의 FPS·필터·대상을 바꾸지 않아요. 모든 프리셋은 편집기 전용이며 베이크된 시퀀스의 BP/C++ 재생과 게임 패키지에는 필요하지 않아요. 전역 감시·지속 파일 캐시·작업자·타이머·GPU 자원은 추가하지 않았어요. 열린 프리셋 패널의 현재 문서에만 미리보기 결과를 보관해요.

[Unity Presets](https://docs.unity3d.com/6000.0/Documentation/Manual/Presets.html)의 설정 재사용·편집기 적용 본문과 [Unreal Take Recorder](https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine)의 소스 프리셋 흐름을 참고했어요. 위 parentPreset/overrides와 체인 revision은 HBEngine의 재사용/AI 편집 계약 확장이며 두 엔진의 동일한 상속 형식을 복제했다는 주장은 아니에요. 새로 읽은 Unity 지정 본문과 기존 Unreal 관련 구역 재확인에 한정하며 전체 API 분석은 아니에요.
