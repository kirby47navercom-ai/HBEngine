# 입자 충돌과 이벤트

ParticleSystem의 Collision·Events 속성을 사람과 AI가 같은 컴포넌트 편집 경로로 바꿔요. `hb schema --local --section particleInteractions`와 `--section components.ParticleSystem`에서 필드 계약을 읽어요. 일반 Components Set/Get C++·블루프린트 명령에도 같은 필드가 적용돼요.

`collisionMode`는 none/bounce/kill이에요. `collisionNormal`을 정규화한 법선 n과 `collisionOffset`으로 `dot(n,position)=offset` 평면을 정해요. 좌표는 `simulationSpace`를 따라요. world는 월드 좌표, local은 이미터 로컬 좌표예요. 입자가 평면 아래로 들어가면 위치를 평면으로 보정하고, 들어가는 속도에만 반사·소멸을 적용해요. `collisionRestitution`은 법선 반발, `collisionFriction`은 접선 감쇠예요. 씬 메시·물리 콜라이더 충돌이나 가속도 곡선의 연속 교차 해법은 별도예요.

`deathEvents`·`collisionEvents`를 켜면 `eventName`(기본 OnParticleEvents)의 Custom Event로 `component` 문자열과 `events` JSON 문자열을 보내요. 각 기록은 type, index, position, velocity, age, lifetime, time을 담아요. index는 입자 풀 슬롯/CPU 방출 번호이며 재사용돼요. 액터 ID가 아니에요. collisionMode=kill은 충돌과 사망 두 기록을 만들 수 있어요. 이미터의 방출 종료와 입자의 사망은 달라요. 기존 start/end 하위 이미터 동작은 유지해요.

CPU는 같은 물리 tick, GPU는 완료된 읽기를 받은 이후 tick에 전달해요. GPU 슬롯 간 순서는 정해져 있지 않아요. 재시작·clear·dispose·이벤트 설정 변경의 세대가 달라지면 이전 응답을 버려요. 이벤트 호출 중 소유 액터가 없어지거나 풀이 비활성화되면 다음 처리를 중단해요.

eventCapacity(기본256,1..4096)는 이벤트 버퍼 용량이에요. **입자 수 제한이 아니에요.** 켜면 GPU 기록은 `16+48*capacity`바이트이고 CPU 대기 큐도 제한돼요. 넘친 기록은 eventDropped, 읽기 역압력은 eventDroppedFrames에 남아요. 임의로 무한 큐를 늘리지 않아요. WebGPU는 효과마다 한 개의 staging 버퍼를 재사용하며 진행 중인 map이 끝난 뒤 해제해요. DirectX는 기존 FrameResources의 3개 staging 슬롯과 비차단 poll을 사용해요. 이벤트를 끄면 이벤트 저장·읽기 버퍼가 없고, 충돌도 끄면 기존 계산 경로를 사용해요. 입자 위치 전체를 자동 읽지 않아요.

검사 소스는 `tools/check-particle-interactions-3338.mjs`예요. 실제 CPU·공용 런타임·Three WGSL 생성과 창 없는 DirectX compute를 구분해 기록해요. `tools/check-particle-interactions-webgpu-3342.mjs`는 별도 소유 프로필의 headless Chrome에서 WebGPU 드라이버 실행을 확인해요. 실제 사용자 창·네이티브 WebView 전달·휴대폰 검증 및 설치 업데이트는 포함하지 않아요. 개별 입자 리본과 범용 VFX 그래프는 별도 작업이에요.
