2026-10-08 후속: [정수 선택 혼합](ANIMATION_INTEGER_SELECTION_068.md)에14번째 포즈 노드·포즈별 시간/곡선·세 자식 갱신·독립 시계·중단·공용 BP/C++/AI·우클릭 입력 제작/실제 Editor/Player를 연결했다. 과거 수량과 미구현 기록은 당시 이력이며 Enum/Root Motion/리타게팅 등의 후속을 함께 유지한다.

# 애니메이션 그래프·포즈 혼합

2026-10-05 후속: [몽타주 슬롯](ANIMATION_MONTAGE_SLOTS.md)의13번째 포즈 노드·여러 슬롯/그룹·새 뼈/마스크/상태 버퍼 통합·사람/AI·공용 C++/BP6개를 연결했어요. 현재 BP566개/API289개이며 아래 수량은 당시 기록이에요.

2026-10-05 후속: [혼합 샘플 알림 정책](ANIMATION_NOTIFY_POLICY.md)의1D/2D All/Highest/None·별도 허용 경로·구간 filtered End·중첩/공유·사람/AI·실제 C++/BP를 연결했어요. 기존 포즈/시계/동기화 기여도는 유지해요.

2026-10-05 후속: [두 축 Blend Space](ANIMATION_BLEND_SPACE.md)의 Cartesian/방향·속도 혼합·축/보정/샘플 편집·공용 BP/C++/AI·실제 Editor/Player와 2D 스프라이트/가져온 뼈 검사를 연결했어요. 현재 포즈 노드12종/BP560개이며 이전 아래 수량은 각 추가 당시 기록이에요.

2026-10-05 후속: [구간 알림·이벤트 인자](ANIMATION_NOTIFIES.md)의 상세 범위/인자 제작과 Begin/Tick/End·재생 수명 정리·실제 Editor/Player BP→C++를 연결했어요. 2D 스프라이트도 같은 알림 실행기를 사용해요.

2026-10-05 후속: [동기화·마커·알림](ANIMATION_SYNC.md)의 Sync 노드·Group/Graph·리더 역할·반복 마커·길이 대체·단일 Custom Event 알림·C++/BP3개·AI·실제 Editor/Player를 연결했어요. 현재 포즈 노드는11종, 공용 BP는560개예요. 아래 동기화 미구현 문장은 최초 추가 당시의 기록이며 후속 계약을 함께 읽어요.

2026-10-05 후속: [포즈 상태·전이](ANIMATION_STATES.md)의 전용 상태/포즈 페이지·독립 시계·혼합/중단·Integer/Trigger·Custom Event·중첩·C++/BP12개·AI와 실제 Editor/Player 검증을 연결했어요. 아래는 최초9개 포즈 노드 계약의 기록이고 State Machine을 추가한 현재 노드는10종, 공용 BP 카탈로그는557개예요. 상태/동기화의 모든 후속이 완료된 것으로 세지 않아요.


2026-10-05. 전체 엔진 세부 구현을 이어 추가한 제작/실행 계약이에요. 전체 Unity·Unreal 문서/API 연구와 누적 엔진 목표를 완료로 승격하지 않아요.

## 실제 공식 근거

[Unity 1D Blending](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendTree-1DBlending.html)의 기술 본문/임계값 표, [Direct blending](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendTree-DirectBlending.html)의 기술 본문을 새로 읽었어요. 임계값별 인접 혼합·균등 배치·미리보기 드래그와 직접 가중치를 대조했어요.

[Epic Animation Blueprint Blend Nodes](https://dev.epicgames.com/documentation/unreal-engine/animation-blueprint-blend-nodes-in-unreal-engine)의 기술 본문/표를 새로 읽고 포즈 핀·Alpha·Bool 전환·뼈 필터의 양수/0/음수 깊이와 가산 포즈를 대조했어요. 나머지 mesh space·곡선·inertialization·enum/int·linked layers 설명도 읽고 아래 후속 범위로 유지해요. 처음 추측한 `en-us/.../blend-nodes-in-unreal-engine`은 접근 실패여서 읽기로 세지 않아요. 그림·영상·클래스/API 원문 전체를 읽거나 독립 검증한 것으로 세지 않아요.

공식 엔진의 내부 코드를 그대로 구현했다고 표현하지 않아요. 현재 HBEngine 계약과 구현 차이를 명시해요.

## 제작 문서와 화면

콘텐츠 브라우저의 애니메이션 그룹에서 `AG_` 이름의 `.hbanimgraph.json`을 만들어요. 각 문서는 독립 탭과 Undo/Redo/Save/revision을 가져요. 전용 편집기에서 파라미터·노드 목록, 포즈 그래프, 선택 속성을 사용해요. 중복된 바깥 요약/속성 패널을 숨겨 그래프 공간을 확보해요. 예전 장면·블루프린트·타임라인 파일 형식은 바꾸지 않아요.

클립 또는 혼합 노드 이름 옆의 삼각형은 출력 포즈 핀이에요. 입력 포즈로 드래그하거나 출력 다음 입력을 클릭해 연결해요. 연결 해제·삭제·이름/클립/반복/배속/시작 시간·입력 포즈 추가/삭제·필터 추가/삭제를 제공해요. 중간 제작 파일의 미연결 핀은 저장할 수 있지만 실행/미리보기 시작 전에는 연결된 출력 경로의 모든 포즈/클립을 검사해요. 순환은 제작 단계에서 거절해요.

우클릭/가운데 버튼 이동, 휠 확대·축소, 우클릭 한·영 검색, F 전체 보기, Delete 노드 삭제를 제공해요. Ctrl Z/Y/S는 기존 문서 명령을 사용해요. 노드 이동은 실제 이동 때만 Undo에 기록해요. 출력 노드는 삭제하지 않아요. 실행 중에는 파일 편집을 잠그고 활성 노드·파라미터·시간을 관측해요.

1D 노드의 속성에 임계값/가중치 도표를 표시하고 드래그해 미리보기 파라미터를 바꿔요. 균등 배치는 현재 임계값의 최솟값~최댓값을 사용해요. 현재는 root motion에서 속도/각속도를 자동 계산하는 Compute Thresholds 자체를 제공하지 않아요.

미리보기는 선택 대상의 별도 객체/스켈레톤/머테리얼 복사본에서 공용 실행기를 사용해요. 모델을 별도로 지정하면 그 파일을 미리보기 대상으로 로드해요. 재생·되감기·파라미터 입력은 장면 원본/실행 대상을 수정하지 않아요. 그래프가 대상 루트를 이동시키면 미리보기 카메라도 같은 이동을 따라가요. 모델 속성은 미리보기/의존성용이며 런타임 Actor의 MeshRenderer를 바꾸거나 다른 스켈레톤에 리타게팅하지 않아요.

## 포즈 노드의 현재 계약

| 노드 | 실행 |
|---|---|
| Output / Reference | 최종 출력과 시작할 때 캡처한 기준 속성 |
| Sequence Player | 가져온 모델 내 클립 이름, 트랜스폼 에셋, 스프라이트 애니메이션 에셋 |
| Blend | 상수/Float 파라미터 Alpha로 두 포즈 혼합 |
| Blend 1D | 임계값 정렬 후 인접한 두 포즈만 평가, 범위 밖은 양 끝 포즈 |
| Direct Blend | 각 포즈의 상수/파라미터 가중치, 선택적 정규화 |
| Blend by Bool | 전환 시간 동안 혼합, 도중 역전 때 현재 혼합값부터 다시 전환 |
| Layered Blend | 기준/레이어 포즈와 뼈 분기 필터, Alpha/Float 파라미터 |
| Apply Additive | 시작 기준 포즈와 가산 입력의 로컬 차이를 기준 입력에 적용 |

회전 포즈는 quaternion slerp를 사용해요. 가져온 모델의 numeric/quaternion 트랙을 Three PropertyBinding/KeyframeTrack interpolant로 연결해요. position/scale/morph 숫자 속성은 선형 혼합해요. 미포함 속성은 시작 기준값을 사용해요. 트랜스폼 에셋의 회전 키 자체는 기존 Euler 채널 보간을 유지한 후 quaternion으로 변환해 혼합해요. 완전한 quaternion 키 편집기를 추가한 것은 아니에요.

가산 위치/크기는 `base + (additive - capturedReference) × Alpha`이고 회전은 기준 회전과의 로컬 quaternion 차이를 적용해요. 실제 skeleton bind pose나 별도의 reference frame 지정, Unreal mesh space additive/scale ratio API와 동일하다고 표현하지 않아요.

Direct의 각 입력값은0~1로 제한해요. 정규화가 켜지고 합이 양수면 합으로 나눠요. 정규화를 끄면 합이1 미만인 나머지를 기준 포즈로 채우고 숫자 값은 가중 합이에요. 합이1보다 크면 숫자 값은 더 커질 수 있어요. quaternion은 가중치 상대 비율로 섞어 단위 회전을 유지해요. 합0은 기준 포즈예요.

뼈 필터 depth0은 그 뼈와 모든 자손에1을 적용해요. 양수는 `(자손 거리+1)/depth`를1까지 증가시켜요. 음수는 같은 비율을 앞선 필터 가중치에서 빼요. 필터는 작성 순서대로0~1에 제한해요. `*`는 전체 속성이에요. 존재하지 않는 뼈는 실행 전 거절해요. 선택 뼈 밖의 속성은 Alpha1에서도 기준 입력이 유지돼요. mesh space 회전/크기·곡선 집계·root motion 필터를 제공한 것으로 계산하지 않아요.

스프라이트 이미지는 연속 포즈로 섞을 수 없으므로 기여도가 가장 높은 프레임 에셋을 선택해요. 기존 스프라이트 에셋이 있으면 기준 프레임으로 사용해요. 이미지 crossfade·2D skeleton/skin/rig는 별도 후속이에요.

각 클립 시간은 그 노드가 평가되는 동안만 진행하고, 공유 노드는 한 Tick에서 한 번 평가해요. loop/rate/offset은 노드 속성이에요. 서로 다른 길이의 클립을 normalized phase로 동기화한 것은 아니에요. 그래프는 게임 시간 배율과 AnimationGraph 컴포넌트 speed를 사용해요. 정지/컴포넌트 비활성화는 마지막 포즈를 유지하고 인스턴스를 해제해요.

## 사람·AI·블루프린트·C++

`AnimationGraph` 컴포넌트는 asset/autoPlay/speed를 제공해요. 에셋을 장면 선택 대상으로 드롭하면 같은 컴포넌트에 연결해요. 다른 애니메이션 재생 또는 Stop은 이전 그래프를 정리해요. 새 그래프는 파일·연결·클립·속성 바인딩을 사전 검사하고 실패 시 기존 실행을 교체하지 않아요. 정지/파괴/실행 종료 이후 도착한 비동기 로드는 시작하지 않아요.

`hb::AnimationGraph::{Play,Stop,Pause,SetFloat,SetBool,GetFloat,GetBool}`와 생성된 BP7개 노드는 같은 엔진 서비스를 사용해요. Float/Bool 자료형을 검사하고 C++의 Set 후 Get도 같은 호출의 최신 값을 읽어요. 기존 단일 Animator·FSM·몽타주·시퀀스 재생 경로는 유지해요. 이 추가만으로 FSM 상태에 AnimGraph를 포즈로 삽입하거나 다중 몽타주 슬롯을 연결한 것은 아니에요.

`/api/schema.animationGraph`는 노드/예시·파라미터·클립/공간·제한을 공개해요. 에셋 예시, component definitions, BP/C++ 서명, document.patch의 revision/dryRun/Undo/Save는 같은 정의를 사용해요. model/clip 의존성 수집·rename·빌드 패키징도 연결돼요. 기존 애니메이션 model 참조가 의존성 목록에서 빠졌던 부분도 함께 보강했어요.

`objects[].gameplayDebug.animationGraph`는 에셋·시간·일시정지·파라미터·활성 노드·노드 혼합값·클립 시간·속성 수를 제공해요. `runtime.state.animation`과 Player debug inspect의 animation은 요청할 때 현재 바인딩 이름/포즈 값을 읽어요. 매 프레임 전체 뼈 포즈를 JSON으로 복사하지 않아요.

## 비용과 검증

현재 파일 제한은 노드256·클립64·파라미터64·포즈 경로 깊이64예요. 모델 속성1024·포즈 값8192를 넘으면 실행 전 거절해요. 순환과 DAG의 긴 공유 경로를 함께 검사해요. 노드별 포즈 버퍼와 클립 interpolant를 로드 때 할당하고 재사용해요. 임계값0 기여 입력은 평가하지 않고 공유 포즈는 캐시해요. 이 방식만으로 전체 엔진이 가볍거나 대규모 캐릭터/모바일60Hz가 검증된 것은 아니에요. 많은 Actor의 포즈 버퍼 총량·실행 비용은 기존 성능 예산에 이어 측정할 대상이에요.

- `test:animation-graph`: 미연결/순환/깊이, quaternion 짧은 경로, 1D/Direct/Bool 중도 역전/가산, 뼈 깊이/제외·누락, 스프라이트, 의존성/rename, 컴포넌트 실행/비활성화, 취소된 로드의 첫 publication 전 정리를 검사해요.
- `test:animation-graph-editor`: 고유 Win32 Editor에서 물리 포즈 핀 드래그·차트 드래그, 속성/Undo/Redo/AI dryRun/저장, 원본과 분리된 미리보기/모델 로드, 실행 잠금/강조, BP/C++ 파라미터·실제 스켈레톤 필터·일시정지/재개, 원본/정상 종료를 검사해요.
- `test:animation-graph-player`: release Game.exe의 실제 키→BP→컴파일 C++→파라미터/순수 조회, 가져온 glTF의 Spine/Arm과 Leg 분리, 정지/재개·원본/정상 종료·소유 서버 종료를 검사해요. 물리 모바일·전체 모델 형식·전체 스켈레톤 품질로 확대하지 않아요.

아직 구현할 세부는2D skeletal/skin, 2D/방향별 Blend Space, animation state graph/transition rules/normalized time sync, 실제 bind/reference frame, mesh space/additive/curve 정책, named blend mask, IK·리타게팅·root motion·다중 montage 슬롯·notifies, inertialization/LOD·linked layers·전체 편집 단축키/주석·독립 animation debugger예요. headless의 가져온 모델 포즈 로드는 [후속 계약](HEADLESS_MODEL_POSE.md)으로 연결했어요. 다른 모든2D/렌더/월드/게임 프레임워크/네트워크/UI/모바일/빌드/AI 세부도 누적 요구에 그대로 유지해요.

최종 실제 Editor 근거는 `native/build/animation-graph-editor-fAgxU4`, release Player는 `animation-graph-player-72pITM`이에요. 저작/모델/실행 PNG와 acceptance JSON을 보존해요. 마지막1D 가중치0 가지 생략은 unit에서 확인한 뒤 반영했고 두 실제 시나리오의0/.75 혼합 결과를 바꾸지 않아요.
