# 구간 알림·이벤트 인자 · 2026-10-05

## 공식 근거와 자체 계약

[Epic Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine)의 기술 본문을 다시 대조했어요. [Unreal5.8 UAnimNotifyState](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimNotifyState)의 자체 선언·변수·함수 요약0–153을 읽고 Begin/Tick/End·기간/프레임 시간·편집 속성을 확인했어요. 추측한 개별 NotifyBegin/Received_NotifyTick 주소는 본문 없음/접근 실패여서 읽기로 세지 않아요. 상속/연결 클래스·그림/영상은 미독이에요.

Unity6000.0 AnimationEvent의 [float](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent-floatParameter.html), [int](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent-intParameter.html), [string](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent-stringParameter.html), [object reference](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent-objectReferenceParameter.html), [functionName](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent-functionName.html)의 각 선언/Description을 새로 읽었어요. 원문·추출 본문·SHA256·읽기 경계 manifest는 `native/build/animation-notify-docs-BKjIEx`에 보존해요. 전체 원장/API 완료로 승격하지 않아요.

HB는 각 Sequence Player 노드에 단일/구간 알림 메타데이터를 저장하고 소유 Actor의 Custom Event로 보내요. Unreal의 AnimNotifyState 자식 클래스·가져온 Sequence/Skeleton 공유 알림 형식 자체를 구현한 것은 아니에요. Unity의 함수0/1인자 규칙과도 달리 HB는 자료형 있는 이름별 데이터 핀을 사용해요.

## 사람의 편집

상세 타임라인 우클릭 또는 구간 알림의+로 만들고 이름·시작·길이·시작/갱신/종료 이벤트·최소 가중치/팔로워를 편집해요. 막대의 가운데는 구간 전체 이동, 왼쪽/오른쪽 손잡이는 범위 조절이에요. 구간은 각각 별도 줄에 배치하며 많이 생기면 타임라인 안에서 스크롤해요. Ctrl 스냅·좌우/Shift 좌우 이동·Enter 속성·Delete 키·Undo/Redo/Save·실행 편집 잠금은 마커와 공유해요. 입력/버튼 이외의 긴 안내는 편집 화면에 넣지 않아요.

단일/구간 알림의 이벤트 인자에 이름·자료형·값을 추가/삭제해요. bool/int/float/string/vec2/vec3/color/object8종을 지원하며 자료형을 바꾸면 해당 기본값으로 바꿔요. 벡터/색상은 각 성분을 편집해요. object 값은 실행 Actor ID 또는 null이며 Unity의 일반 Object/에셋 참조로 확대하지 않아요.

기존 블루프린트 Custom Event에 같은 이름/자료형의 출력 핀을 추가하면 해당 인자를 바로 연결해요. Begin/Tick/End도 독립 Custom Event 이름이고 빈 이름은 그 콜백을 생략해요. 사용자 C++ 함수는 기존 nativeCall 핀으로 연결해 같은 값을 받아요. 별도 C++ 알림 클래스 ABI를 새로 만든 것은 아니에요.

## 실행·수명

구간은 클립 로컬 초로 `[time,time+duration)`이며 클립 안의 양수 길이예요. 반복 경계를 가로지르는 구간 하나는 거절하고 두 구간으로 나눠요. 시작 위치가 구간 안이면 현재 진행률의 Begin을 한 번 보내요. Tick은 이번 프레임과 겹친 기간이 양수일 때 보내요. deltaSeconds는 겹친 **시뮬레이션 시간**, time은 로컬 클립 초, duration은 클립 초, progress는0–1이에요. 배속/동기화된 다른 길이에도 겹친 비율을 적용해요. 한 프레임에 전체 구간을 지나면 Begin/Tick/End를 모두 시간 순서로 보내요. 일시정지/0시간/정지한 클립 시계는 Tick을 만들지 않아요.

최소 가중치/팔로워 필터를 유지해요. 활성 구간이 혼합에서 빠지면 irrelevant, 필터에서 빠지면 filtered, 문맥 재진입이면 restarted, 시계가 기존 구간 밖으로 바뀌면 timeChanged 이유로 End를 보내요. 자연 종료는 completed예요. Stop은 stopped, 다른 재생으로 교체는 replaced, SpriteSkin Reset은 reset, 풀 반환/파괴는 released, 세계 종료는 worldStopped예요. 세계 종료의 구간 정리는 Actor EndPlay 전에 실행해요.

미리 계산한 범위와 실제 전달한 Begin을 분리해요. 콜백 안에서 Stop/교체/삭제하면 남은 예전 이벤트를 취소하고 이미 전달한 Begin만 짝이 맞는 End로 정리해요. 정리 중 같은 Actor의 재생/삭제 재진입을 막아요. End가 새 그래프를 재생하면 나중 명령이 이전 교체 요청에 덮이지 않아요. 정리 콜백 하나가 실패해도 나머지 End/세계 정리를 시도하고 첫 오류를 반환해요. 편집기 미리보기/서비스 dispose는 실행 논리 콜백을 새로 만들지 않고 자료를 해제해요.

payload는 기존 notify/clip/context/group/time/cycle/weight와 phase/name, 구간의 instance/duration/deltaSeconds/progress/reason 및 사용자 인자예요. 예약 메타데이터·prototype 관련 이름·중복/잘못된 이름·자료형/값을 거절해요. 데이터 핀 ID는 대소문자를 구분해요. 이벤트 값은 작성 메타데이터 복사본이라 콜백이 벡터를 바꿔도 에셋은 보존해요.

## AI·한도·검증

schema.animationGraph.sync의 실제 notifyStates/notifyParameters 계약을 공개해요. 사람과 document.patch의 공용 검증·revision/dryRun·Undo/Save를 사용해요. `runtime.state.objects[].gameplayDebug.animationGraph.notifyStates`는 인스턴스·ID/이름·클립/문맥·반복 회차·실제 시각/기간/진행률/가중치예요. 이는 현재 처리된 포즈의 활성 범위이고 이벤트를 저장 파일에 복사하지 않아요.

클립별 구간64개·알림별 인자8개·활성 범위2048개·한 프레임 이벤트/경계4096개에서 멈춰요. 기존 그래프/문맥/포즈 메모리 한도와 버퍼 재사용을 유지해요. 알림이 없을 때의 Map/목록 비용도 무할당이라고 표현하지 않아요. 전체 모바일/FPS/대규모 애니메이션 비용은 별도 실측 대상이에요.

`test:animation-notifies`는 반복/길이 끝·중간 진입/배속/정지·필터/비관련/재진입/시계 변경·예약 이름/자료형/한도·실제 BP 인자·Begin 안 Stop/미전달 Begin 취소·교체/End 안 새 재생·오류 뒤 다른 End·세계 종료/Actor 파괴를 검사해요. 포즈/상태/동기화·main/API/integration·게임플레이·모바일 입력·UI/오디오 회귀도 함께 검사해요.

최종 실제 Editor `animation-notifies-editor-toxXVX`는 사람 범위 편집·자료형 변경·Undo/AI·단일 알림의 정수/한글/벡터→사용자 C++·구간 Begin/Tick/End→C++·C++ Stop의 짝 맞는 End·뼈/GPU·pause·원본/exit0/서버 정리가 통과했어요. 첫 eVqdu5 PNG의 겹친 구간 이름은 별도 줄로 수정했고 toxXVX PNG의 분리/가독성을 확인했어요. release Player `animation-notifies-player-xp4juH`에서도 실제 입력/BP/컴파일 C++ 인자·구간·pause/Stop·뼈/GPU·원본/exit0/서버 정리가 통과했어요. 마지막 직접 재생 호환 수정은 코어 회귀로 검사했고 두 실제 시나리오의 활성 VM 경로는 유지해요. 실제 시작 위치/첫 프레임 C++ HUD는 `startup-state-y2IMwg`예요.

실패 hwMQC9는0길이 패치를 엔진이 올바르게 거절했지만 시험의 오류 문구 정규식이 맞지 않은 경우예요. 초기 코어 시험의 Run 알림 시각 기대/없는 vm.variables 접근도 시험 오류로 바로잡았어요. 실제 회귀 검사에서는 새 중지 보호가 실행 전 직접 모델 재생을 거절해 check-runtime의64줄에서 위치0/기대1로 실패했어요. 활성 여부 대신 요청 ID/Actor 동일성/VM generation/정리 상태를 대조해 기존 경로를 복원했고 재실행의 실제 C++→BP까지 통과했어요. 이어 나온 libuv abort의 별도 원인은 확인하지 않았으며 원래 단언 실패와 구분해요.

`animation-notify-cost-dCTpO4/cpu-cost.json`은 한 Actor/두 트랜스폼 클립/구간0또는1개,100회 워밍업 후5×1000 Tick의 CPU 검사예요. 중앙 Tick은 구간 없음0.008397ms·1개0.0119702ms, 포즈120bytes/버퍼 재사용을 유지했어요. 구간이 전혀 없는 그래프는 구간 계획의 추가 Map/Set을 만들지 않아요. 전체 FPS/프로세스 메모리·대규모/물리 모바일 검증으로 확대하지 않아요.

공유 Sequence/Skeleton 알림 에셋, 알림 클래스/프리셋, 확률/LOD/편집 전용 필터, 사운드/입자/소켓 전용 알림, 몽타주 알림/Branching Point/슬롯·root motion과 모든 다른 엔진 세부는 계속 구현할 범위예요. 사용자 설치본/프로필/게임 원본/현재 창은 변경하지 않아요.
