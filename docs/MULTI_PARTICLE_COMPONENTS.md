# 액터의 여러 파티클 컴포넌트

한 액터에 붙인 활성 ParticleSystem은 각자 시뮬레이션·용량·버퍼·재질·정렬·리본을 가져요. 기존 액터 대상 Play/Stop/Pause/Emit/GetCount는 첫 활성 컴포넌트를 제어해요. 새 `hb::Particles::PlayComponent`, `StopComponent`, `PauseComponent`, `EmitComponent`, `GetComponentCount`와 같은 이름의 BP 노드는 **컴포넌트 ID 또는 고유한 이름**을 받아요. 이름이 겹치면 ID로 지정해요. 비활성·없는 대상은 거절해요.

CPU 표시와 공용 게임 서비스가 같은 컴포넌트 상태를 사용해요. WebGPU·DirectX 팩토리에는 추가 이미터별 일반 자식 transform group을 넘겨 기존 백엔드의 버퍼·네이티브 ID를 분리해요. 첫 이미터는 기존 root/particleState/2D 식별자를 유지하고, 추가 이미터의 2D 식별자는 컴포넌트 ID를 포함해요. 월드 공간 입자는 각 표시 그룹의 역행렬로 변환해요.

두 인수만 받는 기존 createParticleState/particleSnapshot 연결도 반환 시뮬레이션의 소유 레지스트리를 통해 작동해요. 준비된 현재 컴포넌트의 상태가 소유 그룹 레지스트리와 같으면 다음 프레임에는 비동기 준비 훅을 다시 부르지 않아요. 그룹 교체·dispose·컴포넌트 교체는 이 빠른 경로를 해제해요. 추가 worker·자동 GPU 입자 위치 readback은 없어요.

컴포넌트를 끄거나 지우면 해당 방출·입자를 정리해요. 재생 재시작과 clear는 그 이미터의 리본도 초기화해요. 액터 풀 비활성화·제거는 해당 액터의 모든 상태를 정리해요. 렌더 그룹 해제는 모든 이미터의 리소스를 반환해요. 텍스처/셰이더 준비 도중 소유자가 종료되면 늦은 풀을 만들지 않아요. 파티클이 없는 액터는 상태 Map을 만들지 않아요.

`gameplayDebug.particleSystems`는 ID·이름별 요약이며 기존 `particles`는 첫 활성 컴포넌트의 요약이에요. GPU 개수는 명시적인 GetCount에서 읽고, 일반 프레임 요약 때문에 읽지 않아요.

게임플레이 Cue는 명시적으로 v4로 변환하면 `emitComponent`를 사용할 수 있어요. 기존 v1/v2/v3와 기본 생성 v2를 보존해요. v3의 상대 이미터 경로/고유한 단일 이미터 규칙도 유지해요. v4는 `emitTarget`의 자식 액터 경로를 찾은 뒤 emitComponent로 해당 컴포넌트를 선택해요. 다른 이미터의 속성 변경은 선택한 이미터의 비동기 요청을 취소하지 않고, 선택 컴포넌트의 교체·속성 identity 변경·비활성화는 취소해요. 기존 자산 폼·검증·Undo·저장을 사용해요.

C++의 새 컴포넌트 함수는 살아 있는 실행 질의 채널을 사용해요. 같은 C++ 호출 안의 방출 후 GetComponentCount도 실제 공용 상태를 읽어요. 실행 질의 채널이 없는 오프라인 C++ 실행은 이 리소스 제어를 흉내 내지 않고 거절해요. 기존 액터 함수의 전송 방식은 유지해요.

WORK2960 근거는 실제 CPU 런타임·Three 버퍼·정렬·리본, 공용 native-operation 재생, Cue 폼/Undo와 effect→Cue 실행, 네이티브/WebGPU JS 팩토리의 소유 큐/compute stub에서 ID·할당·해제 확인이에요. 현재 SDK의 실제 C++ 바이너리로 5메서드·5호출·10 live 질의(6쓰기/4읽기)와 2개 큐 명령을 확인했어요. JS 팩토리 검사를 실제 GPU 셰이더 실행·픽셀·창·기기·FPS 검증으로 계산하지 않아요. 파티클별 리본·GPU 충돌/사망 이벤트·범용 VFX 그래프는 별도 잔여예요.
