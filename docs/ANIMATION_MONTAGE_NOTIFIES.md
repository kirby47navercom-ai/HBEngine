# 몽타주 구간 알림 · 2026-10-05

## 근거와 읽기 경계

[Epic5.8 Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine?application_version=5.8)의 기술 본문0–260을 재대조했어요. Notify State의 기간·Begin/Tick/End, Montage Notify Window, 편집 속성, 동기/비동기 알림, 슬롯 링크·사용자 알림 클래스의 차이를 확인했어요. [EMontageNotifyTickType::Type](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/EMontageNotifyTickType__Type?application_version=5.8)의 자체 선언/두 값 설명0–35도 읽었어요. Queued와 Branching Point는 정밀도와 비용의 선택이에요.

[UAnimNotify_PlayMontageNotifyWindow](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimNotify_PlayMontageNotifyWindow?application_version=5.8)의 웹 본문은 접근 실패했어요. 직접 받은 HTML의200 응답을 자체 본문 읽기로 세지 않아요. 뒤의 재조회에서는 위 두 주소도 웹 리더에서 실패했고, 보존된 원문의 해당 기술 문단을 확인했어요. 원문/응답/SHA/원래 읽기 경계는 `native/build/montage-notify-docs-hpk9dZ/manifest.json`에 있어요. 이미지·영상·연결/상속 API·전체 corpus gate를 승격하지 않아요.

HB는 기존 [그래프 Notify State](ANIMATION_NOTIFIES.md)의 범위 처리기를 몽타주에서 공유해요. 자체 Actor Custom Event/자료형 핀 계약이며 UE의 Play Montage proxy나 AnimNotifyState C++ 자식 클래스와 같은 API는 아니에요. Unity AnimationEvent 인자 분석 경계는 기존 문서에 유지해요.

## 데이터와 편집

몽타주 JSON의 선택 필드 `notifyStates`는 최대64개예요. 기존 에셋에 없으면 빈 목록으로 처리하고, 기존 점 알림1024개 한도와 형식도 보존해요. 새 에셋에는 빈 배열을 만들어요. 각 구간은 `id/name/time/duration/minWeight/onBegin/onTick/onEnd/parameters`를 저장하고 `[time,time+duration)`이 몽타주 길이 안에 있어야 해요. 양수 길이, 유한 값, 식별자/중복, 자료형 인자, 예약된 메타데이터 이름을 공유 검사해요. 점/구간 ID가 겹치거나 인자가 `asset`을 덮는 것도 거절해요.

라이브러리 또는 타임라인 우클릭으로 구간을 만들어요. 우클릭 위치가 시작 시간이에요. 각 구간은 별도 줄에 표시하고 가운데 드래그는 전체 이동, 양쪽 손잡이는 시작/끝 조절이에요. 기본60Hz 격자에 맞추고 Shift 드래그는 연속 이동이에요. 선택 구간/손잡이의 좌우 키는1프레임, Shift 좌우는10프레임, Delete는 삭제예요. 프레임/키 이동에도 구간 시작·끝을 포함해요. 선택 줄을 화면에 보이게 하고 속성을 바꿀 때 패널 스크롤을 보존해요. Undo·검증·저장·실행 편집 잠금은 기존 문서 경로를 사용해요.

속성에서 이름·시작/길이·세 이벤트 이름·최소 가중치와 이름별 인자를 편집해요. 인자는 최대8개, bool/int/float/string/vec2/vec3/color/object를 사용해요. 자료형을 바꾸면 기본값도 바뀌어요. object는 Actor ID/null 계약이에요. 원시 에셋 참조·임의 C++ 포인터로 확대하지 않아요. 인자 속성 렌더러도 그래프와 공유해요. `engine.schema`에 필드·한도·수명·조작 계약을 넣어 AI의 문서 패치도 같은 검증을 받아요.

## 실행과 C++

Begin/Tick/End는 해당 Actor의 Custom Event로 보내요. 같은 이름/자료형의 출력 핀을 사용자 C++ 함수의 `nativeCall`에 연결해요. 몽타주를 BP/C++ 어느 쪽에서 시작하든 같은 실행기를 사용해요. 별도 알림 DLL ABI를 추가하지 않아요.

페이로드에는 `asset/group/instance/notify/clip/context/cycle/phase/time/weight/duration/deltaSeconds/progress/reason`과 사용자 인자가 있어요. `time/duration`은 몽타주 로컬 초, Tick `deltaSeconds`는 이번 구간과 겹친 시뮬레이션 초예요. 배속2에서0.3초 구간 이동은0.15초 Tick이에요. 최소 기여도는 현재 처리 구간 끝의 혼합 가중치로 판단해요. 한 프레임에 전체 범위를 지나면 Begin/Tick/End를 시간 순서로 처리해요. 같은 시점에서는 저장된 점 알림 순서가 먼저이고, 구간은 목록 순서·Begin/Tick/End 순서예요. 기여도가0/기준 미만이면 Begin/Tick을 생략하고 기존 활성 구간은 filtered End로 닫아요.

실제로 전달한 Begin만 활성 수명으로 인정해요. Begin/Tick에서 만든 BP Delay·타임라인·타이머·구독과 C++ 타이머는 `instance` 작업 범위를 공유해요. End 전달 전에 해당 범위를 취소하고, End 자체는 Actor 수명에서 실행해 종료 처리를 할 수 있어요. 이미 실행된 외부 효과를 자동으로 되돌리지는 않아요. 이전에 만료된 타이머를 소급 취소하지도 않아요.

일시정지는 활성 수명을 유지하고 Tick을 만들지 않아요. 알림 안에서 Pause를 호출하면 남은 예정 알림을 버리고 실제 전달된 Begin과 현재 커서를 보존해요. 재개 시 Begin을 반복하지 않아요. 아직 전달하지 않은 Tick은 취소된 이전 구간에서 뒤늦게 보내지 않아요. Tick의 종료 커서에서 Pause하더라도 그 커서의 End는 한 번 전달해요. 같은 시점의 점 알림을 재개 때 중복 실행하던 기존 초기 플래그도 수정했어요.

Seek/Jump는 기존 구간을 seeked/jumped End로 닫고 새 시계 구간에서 필요한 Begin을 다시 판단해요. 일시정지된 Seek는 즉시 새 Begin을 만들지 않아요. 연속 섹션 경계는 활성 구간을 유지하고 불연속 점프/반복은 sectionChanged End로 닫아요. 인스턴스 ID의 재생 토큰/Actor/그룹/재시작 epoch가 다른 실행의 작업과 충돌하지 않게 해요. 몽타주의 `cycle`은0이고 반복 식별은 epoch로 구분해요.

Stop은 시각적인 중단 혼합이 남아 있어도 즉시 구간을 닫아요. 교체·해제·비활성·월드 종료·정상 종료도 같은 정리 경로예요. 종료 콜백 하나가 실패해도 다른 활성 구간의 End와 몽타주 Ended를 시도하고 정리한 뒤 오류를 전달해요. End가 새 몽타주를 시작해도 이전 정리가 새 인스턴스를 삭제하지 않아요. 구간 없는 몽타주는 처리기와 추가 가중치 계산을 만들지 않고, 알림 없는 프레임은 큐 생성을 건너뛰어요.

## 검증과 후속

- `node tools/check-montage-notify-windows.mjs`: 기존 데이터/불법 값·자료형·작업 범위·배속/필터·콜백 Pause/Seek/Jump/Stop·연속 섹션/반복·그룹·콜백 오류/교체 정리를 확인해요. 기존 몽타주/그래프/Sync/상태/알림 정책/게임 흐름·AI schema·scene·분리 창 검사도 통과해요.
- 실제 Editor `animation-montage-editor-wYidzz`: 마우스 손잡이·키보드·자료형/기본값·우클릭 생성·스크롤·Undo/AI 거절·2D/3D 인자→BP→C++·Seek/Stop·타이머/Delay 취소·원본 바이트·exit0/소유 서버 종료가 통과해요. `montage-notify-authoring.png`의 별도 구간 줄/손잡이를 직접 확인했어요. Model Begin/End5/5, Sprite2/2, 두 Actor의 지연 호출0, work 목록이 모두 비어 있어요.
- 초기 Editor `WIb5vj`는 C++ Float32의0.10000000149를 원본0.1과 정확 비교한 검사 오류였어요. 위치 오차1e-6으로 고쳐 `k5aheb`가 통과했고, 2D 인자/스크롤/우클릭을 포함한 최종 Editor는 위 `wYidzz`예요. 사용자 설치/게임/프로필/창/서버는 보존해요.

배포 Player `animation-montage-player-Oa3qxq`도2D/3D typed→BP→C++·타이머/Delay 취소·원본/exit0/서버 종료를 통과해요. Model Begin/End3/3·Sprite1/1, 지연 호출0/work 비움이에요. 공용 Graph Notify 실제 Player `animation-notifies-player-0JF4lu` 회귀도 통과해요. 전체 FPS·탄막 한도·모바일 발열의 새 근거는 아니에요. Queued/Branching Point 선택, 슬롯/Sequence 링크 및 편집 시 자동 재배치, shared Skeleton/Sequence 알림 클래스·Disable Root Motion·발사 확률/LOD/서버/에디터 조건, 같은 그룹 교체 혼합과 다른 전체 엔진 세부는 누적 후속으로 유지해요.
