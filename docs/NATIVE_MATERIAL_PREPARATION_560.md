# DirectX 머테리얼 준비

일반 노드 머테리얼도 화면 효과와 같은 단일 컴파일 워커를 사용해요. 게임 코드의 `hb::Materials::SetFloat`, `SetTexture`, `SetVector` 호출은 그대로예요. 편집기와 실행기는 본체·그림자 셰이더가 모두 준비된 뒤 그 머테리얼을 그려요. 나머지 장면과 C++ 실행은 이어가요.

바이트코드 컴파일과 디스크 캐시 접근을 렌더러의 컨텍스트 잠금에서 분리했어요. 워커가 장치·장면·파라미터 버퍼를 소유하지 않고, 렌더를 담당하는 스레드가 완성한 바이트코드를 GPU 셰이더로 받아요. 준비 중에 바꾼 파라미터는 현재 버퍼에 남아 완성 후에도 적용돼요.

준비가 덜 된 재질은 기본 재질로 대신 그리지 않아요. 관련 그림자·반사·하늘 캡처와 화면 효과의 이력을 기다리고, 준비를 마친 실제 프레임에서 갱신해요. 캡처가 시작할 때 준비 중이었다면 상태가 끝난 후 다시 그린 화면을 받아요.

기존 큐의 8MiB 대기 예산과 유휴 종료를 공유해요. 객체 개수 제한이 아니에요. 완료한 프로그램의 소스·작업 바이트코드는 놓아주며, 유휴 프레임에서는 준비 중인 프로그램만 조회해요. 진단은 `pipelinePreparation.rasterPending`, 머테리얼·머테리얼 그림자 단계와 전체 준비 수에 표시돼요. 같은 계약이 `engine.schema.nativeShaderPreparation`에 있어요.

저수준 DirectX SDK에서 직접 렌더러를 쓰는 경우에는 기존 `createProgram`·`createSurfaceProgram`이 동기 기본값을 유지해요. 직접 비동기 준비를 관리하려면 다음 경로를 사용해요.

```cpp
auto program = renderer.createSurfaceProgramAsync(declarations, evaluation, values);

// 매 프레임 장치 소유 스레드에서 확인해요.
if (renderer.pollProgramPreparation(program)) {
    // 기존 renderer.draw(...)에 program을 전달해요.
}
```

실패는 준비 상태와 기존 오류 경로로 전달하고, 파기한 프로그램의 늦은 작업은 장치에 게시하지 않아요. 장치가 준비된 바이트코드를 거부하면 한 번 새로 컴파일한 뒤 다시 거부할 경우 오류로 끝나요.

이 변경은 처음 컴파일 자체를 없애거나 전체 프레임 속도를 보장한다는 뜻이 아니에요. 전체 초기 비용·드라이버 생성 비용은 계속 측정하며, 검사 범위와 실제 실행 기록은 [기술 기록](research/NATIVE_MATERIAL_PREPARATION_560.md)에 남겨요.
