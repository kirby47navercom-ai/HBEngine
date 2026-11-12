# Direct3D12 직접 포트

목표는 D3D11On12 번역층이 아니라 `ID3D12GraphicsCommandList`로 직접 그리는 네이티브 렌더러예요. 현재 빌드 프로필의 `nativeGraphicsAPI: d3d12`는 여전히 D3D11On12 경로(`backend:D3D12-11on12`)이며, 이 포트가 끝나기 전에는 기본값을 바꾸지 않아요.

## 단계

1. **코어 (완료)** — `native/include/HBEngine/D3D12Direct.hpp`
2. 기본 메시·머테리얼 그리기를 D3D12로 옮기고 DX11과 픽셀 대조
3. 그림자·라이트 타일·프로브·블룸·후처리·컴퓨트 이전
4. 성능 비교 후 기본값 전환

## 1단계 코어 내용

- 장치: 하드웨어 실패 시 WARP, 실패 이유 둘 다 보고. `validation=true`면 디버그 레이어 사용(설치된 PC만).
- 직접 큐 1개·펜스·프레임 3개 동시 진행. 프레임마다 명령 할당자와 펜스 값을 가지고 재사용 전에 기다려요.
- 업로드 링: 프레임별 영구 매핑 구역. 구역보다 큰 요청은 별도 업로드 버퍼를 만들고 그 프레임 펜스가 지난 뒤 해제해요(고정 용량 실패 없음).
- 디스크립터: RTV/DSV CPU 풀(슬롯 재사용), 셰이더용 CBV/SRV/UAV 힙은 프레임별 구역(초과 시 명확한 오류).
- 리소스 상태 추적(`Resource::state`)과 전환 배리어, 지연 해제(`retire`).
- 루트 시그니처 직렬화, 그래픽 PSO. HLSL은 DX11과 같은 `ShaderBytecodeCompiler`·디스크 캐시로 SM5 바이트코드를 만들어요.
- RGBA8 읽기(`read`), 플립 모델 스왑체인(획득·표시·크기 변경).
- MinGW `d3d12.h`의 구조체 반환 ABI를 MSVC와 맞추려고 `WIDL_EXPLICIT_AGGREGATE_RETURNS`를 정의해요(`D3D12Interop.hpp`).

## 검증

`node tools/check-native-d3d12-direct.mjs` — 실제 하드웨어 GPU와 WARP에서 루트 상수·루트 CBV·깊이 테스트·읽기 픽셀, 30프레임 링 재사용과 초과 업로드, 디스크립터 초과 오류, 숨긴 창 표시 6회와 크기 변경, 디버그 레이어 오류 0을 확인해요. 장면 렌더러 전체나 게임 FPS 검사는 아니에요. 기존 `check-native-d3d12-interop`(D3D11·11On12)도 계속 통과해요.
