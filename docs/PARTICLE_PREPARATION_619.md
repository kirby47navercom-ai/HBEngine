# 파티클 렌더링 셰이더 준비

데스크톱의 비동기 셰이더 옵션을 켜면 파티클을 사용하지 않는 장면에서는 파티클 셰이더를 컴파일하지 않아요. 파티클 그리기·명시적 개수 조회에 정점·표면·활성 인덱스 압축 세 단계를 요청하고, 정렬을 사용할 때 정렬 두 단계를 추가해요. 기존 작업자 한 개와 8MiB 예산을 공유해요.

C++ SDK의 기존 생성자는 동기 동작을 유지해요. `ParticleRenderer(device, width, height, hwnd, true)` 또는 `SceneRenderer`의 다섯 번째 인자를 통해 비동기를 선택할 수 있어요.

- `ParticleRenderer::pollPreparation(request, sorting)`은 필요한 단계를 요청하고 완료 바이트코드를 소유 스레드에서 채택해요. 준비 중에는 `false`를 반환해요.
- `preparationInfo()`는 `enabled`, `requested`, `sorting`, `pending`, `ready`, 다섯 `stages`, `error`를 제공해요.
- `SceneRenderer`는 `pollParticlePreparation`과 `particlePreparationInfo`로 같은 상태를 노출해요. 기본 장면 렌더링은 계속할 수 있어요.
- 비동기 SDK의 `livingCount`는 준비 전 호출하면 준비 중 오류를 내요. 데스크톱의 JavaScript `countAsync`는 준비를 비동기로 기다리고 명령을 중복 제출하지 않아요.
- `releaseParticles`와 객체 파괴는 미완료 요청을 버려요. GPU 리소스·드로우·채택은 작업자에서 실행하지 않아요. 장치가 캐시 바이트코드를 거부하면 해당 단계만 새로 컴파일해 한 번 재시도해요.

데스크톱 상태는 `shaderPreparation.raster.particleRendering`에 있고, AI 스키마의 `nativeShaderPreparation.particleRendering`에도 준비·대기·취소 규칙이 있어요. 준비 중 파티클 드로우와 의존 캡처·시간 이력은 보류해요. 일반 래스터는 계속해요. 정상 프레임에 개수·위치 readback을 추가하지 않아요.

실제 하드웨어 검사는 `node tools/check-particle-preparation-619.mjs`로 실행해요. `--sdk-root`에는 설치본 디렉터리를 전달할 수 있어요. 기본 세 단계와 선택 정렬 두 단계, 실제 잘못된 셰이더 종류의 캐시 복구, 동기 정렬 픽셀 일치, 준비 중 다른 Compute·일반 래스터 실행, 취소·개수 조회 명령 한 번 실행을 확인해요.

이 변경은 파티클 렌더링·압축·정렬 준비에 해당해요. `Particles`의 시뮬레이션·탄생·Clear 커널 초기 준비는 여전히 동기예요. 전체 최초 실행 시간이나 게임 FPS를 이 검사만으로 판정하지 않아요.
