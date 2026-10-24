# 3D 로프 제작과 실행

오브젝트 배치의 **Rope 3D · 입체 로프**를 선택해요. 기존 `Cloth` 컴포넌트의 형상을 `3D 로프`로 바꾸는 방식이라 별도 물리 월드를 만들지 않아요. 시작/끝의 XYZ, 입자 수, 고정 영역과 개별 고정점을 편집해요. 천 격자에는 기존 너비/높이/가로·세로 입자만, 로프에는 로프용 필드만 표시해요. 로프 표시 너비와 단면 수는 물리 입자 수와 독립적이에요.

공용 Rapier 3D soft-body rope가 중력·XYZ 외력·충격·자체 접촉/월드 충돌·레이어/마스크·절전·강체 연결을 처리해요. 부모 변환과 비균일 배율을 적용한 끝점, 움직이는 고정점, 실행 중 고정 해제/다시 고정·초기화를 기존 입자 수명 경로에서 처리해요. 풀 해제나 컴포넌트 비활성화는 표면·프레임을 제거하고, 같은 ID가 돌아와도 새 세대를 주어 이전 프레임과 혼동하지 않아요. 2D 로프의 XY 힘·표시 Z·입자 범위는 유지해요.

기존 `physicsClothPin/Impulse/Attach/Reset/Count/Particle`과 C++ `hb::Physics`의 Cloth 입자 함수들을 공유해요. AI도 기존 `scene.place({path,expectedRevision,kind:"rope3d",dryRun?})`와 `document.patch` 트랜잭션으로 같은 컴포넌트를 편집해요. 실제 메서드 인자는 `schema.commands`, `schema.rope3D`로 조회해요. 실행 진단은 기존 `runtime.cloth`와 `gameplayDebug.cloth`를 사용해요.

```cpp
hb::Physics::PinClothParticle(rope, 0, false);
hb::Physics::AddClothImpulse(rope, hb::Vec3{0, 0, 0.1f}, 5);
auto count = hb::Physics::GetClothParticleCount(rope);
```

첫 물리 프레임 전에는 입자 수 스냅샷이 없을 수 있어요. C++의 천/2D 로프 입자 수와 차량 RPM/기어/속도 getter는 JS와 같이 0을 반환하고, 물리 프레임 후에는 실제 스냅샷을 읽어요. 특정 입자의 위치/속도를 요구하는 API에는 유효한 입자가 필요해요.

표시는 입자 체인을 따라 만든 입체 원형 튜브예요. 고정된 position/normal/UV/index 버퍼를 재사용하고 UV 이음매의 정점을 나누어요. 물리 프레임의 버전/세대가 같으면 다시 쓰지 않고, 정지하면 원래 모양을 복원해요. 기존 clothFrame과 일반 메시·정점 모션 경로를 사용해요. 기본 튜브 끝은 평면 노멀과 별도 UV로 닫혀 있고 **로프 끝 막기**를 끄면 열린 튜브로 표시해요. 표시 너비·단면·끝 막기만 바꾸면 물리의 원래 모양·고정·연결을 유지하며, 잠든 물리도 새 표시 프레임은 한 번 다시 내보내요. 같은 ID의 새 오브젝트 또는 교체된 컴포넌트는 캡처한 객체/컴포넌트 수명으로 구분해 새 물리와 세대를 만들어요. 임의 메시/스키닝 천·연속 고정 가중치·tether·자동 찢기/절단·체적 softbody/GPU solver는 이 로프 구현과 구분해요.

소유한 테스트 장면의 실제 CPU/WASM 물리와 Three 메시 버퍼 수학, 공용 VM 및 실제 C++ 명령을 확인해요. 사용자 창, DirectX/WebGL/WebGPU 픽셀, 모바일 실기기, 사용자 설치본에서 새 로프를 확인했다는 뜻은 아니에요.
