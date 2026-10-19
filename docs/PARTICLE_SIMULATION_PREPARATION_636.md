# 파티클 첫 실행 준비

데스크톱의 ParticleSystem 에셋은 GPU 커널과 렌더 셰이더를 준비한 다음 시뮬레이션을 생성해요. 그때부터 방출 시계를 시작하므로 컴파일을 기다리는 동안 첫 방출 명령을 잃거나 모아 두지 않아요. 파티클이 없는 장면에서는 이 준비를 요청하지 않아요.

시뮬레이션·빈 슬롯 검색·탄생·초기화 네 커널은 기존 `Device::compileAsync`를 사용해요. 렌더링 세 단계와 필요한 정렬 두 단계도 같은 작업자에서 준비해요. 기존 작업자 한 개와 8MiB 예산을 유지해요. GPU 셰이더 생성·채택은 소유 스레드에서 처리해요.

## C++ SDK

기존 `Particles(device, capacity)`와 원시 브리지의 기존 명령은 동기 동작을 유지해요. 비동기를 선택하려면 `auto prepared = hb::gpu::Particles::prepare(device)`를 사용해요. 프레임마다 `prepared.poll()`을 호출하고, `true`가 된 뒤 `hb::gpu::Particles pool(device, capacity, prepared)`로 생성해요. 초기 레코드를 넘기는 생성자도 있어요.

`Preparation`은 이동만 가능하고 `info()`, `poll()`, `cancel()`을 제공해요. `Device`는 준비와 풀보다 오래 살아 있어야 해요. 같은 준비 결과로 여러 풀을 만들 수 있어요. GPU 셰이더만 공유하고 버퍼·상수 링·프레임 상태는 각 풀이 소유해요. 준비 객체를 해제해도 이미 생성한 풀은 계속 사용할 수 있어요. 취소·이동되었거나 다른 Device의 준비 결과로 생성하는 것은 거부해요.

## 에셋·씬 수명

`hbPrepareParticles(sorting)`은 동시 에셋 요청을 합치고 준비 결과를 재사용해요. 나중에 정렬이 필요하면 정렬 단계도 기다려요. 준비 중 정렬 요청이 추가되었을 때 앞선 기본 준비 응답으로 완료를 알리지 않아요.

씬 해제는 JavaScript 세대를 바꾸고 네이티브 요청을 해제해요. 이전 씬의 늦은 응답·오류가 새 시뮬레이션을 생성하거나 새 씬 상태를 덮어쓰지 않아요. 실제 컴파일 오류는 현재 요청에 전달하고 다음 시도를 허용해요.

상태는 `shaderPreparation.raster.particleSimulation`에 있고, AI 스키마의 `nativeShaderPreparation.particleSimulation`은 준비·소유권·취소·기존 API 동작을 설명해요. 런타임의 자동 위치·개수 readback은 추가하지 않아요.

## 검증

- `node tools/check-particle-simulation-preparation-631.mjs`: 실제 D3D11 커널 네 단계, 준비 중 다른 Compute 실행, 풀별 계산/상수 링, 초기화·탄생 시 추가 컴파일 없음, 동기 결과 일치, 이동·취소·다른 장치 거부, 브리지 최초 방출과 해제. 설치 검사는 `--sdk-root`를 사용해요.
- `node tools/check-particle-asset-preparation-631.mjs`: 동시 요청, 이전 씬 응답/오류, 취소·실패·재시도, 정렬 추가와 완료 시점.
- `check-native-probe-readiness-559-window.mjs <소유 검사 프로젝트> --prepared-particles`: 실제 패키지의 2D 첫 표시·마스크·정렬·재열기·해제와 기존 광원/프로브/C++/블루프린트.

전체 GL/FXC의 복잡한 그래프 컴파일 비용이나 큰 HDRI 필터 비용은 별도 목표예요. 이 검증만으로 전체 최초 실행 시간·FPS를 판정하지 않아요.
