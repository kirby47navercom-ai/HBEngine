# 편집기 GPU 시간

프로파일러의 기존 기록/중지·지우기와 `profiler.record/read/clear`를 함께 사용해요. 뷰포트·머테리얼 렌더러에 최근 GPU 시간·120개 창의 평균/p95·표본 수·비동기 결과 상태를 제공해요. 프로파일러의 `GPU` 보기에서는 CPU 차트를 숨겨 작은 도킹 창에서도 두 렌더러의 표를 읽을 수 있어요. 다른 작업공간에 주차된 프로파일러를 다시 열 때는 하단에 배치하고 기존 도킹/분리 창은 유지해요.

새 측정은 WebGL/WebGPU 기록을 켰을 때만 시작해요. 중지하면 새 쿼리·readback을 만들지 않으며, 이미 진행 중인 WebGPU 매핑은 끝난 뒤 소유 자원을 해제해요. 결과의 세대가 바뀌면 이전 결과를 게시하지 않아요. 별도 polling 타이머·동기 GPU 대기·프로젝트 쓰기는 없어요. GL은 최대 4개 쿼리, WebGPU는 256 timestamp 슬롯과 두 2,048바이트 버퍼·한 번의 진행 중인 결과 조회로 제한해요. QuerySet의 드라이버 메모리는 별도이므로 4,096바이트를 전체 GPU 메모리로 계산하지 않아요.

WebGL은 elapsed query 사이의 GPU 시간축을 측정하므로 명령 제출 사이의 유휴 간격도 들어갈 수 있어요. WebGPU는 해당 동기 그리기 안에서 새로 만든 인코더의 timestamp 렌더/컴퓨트 패스 합계예요. 사전 생성·외부 command buffer는 포함하지 않아요. 외부 timestamp를 덮어쓰거나 슬롯 초과의 부분 측정값을 전체처럼 게시하지 않아요. DirectX는 기존 비동기 GPU 프레임 쿼리의 수집 정책을 유지하며, 그 값을 같은 표에 연결해요.

`profiler.read`의 `rendering[].gpuTiming`에서 `completedSequence`, `lastMs`, `lastPasses`, `meanMs`, `p95Ms`, `samples`, `skipped`, `pending`, `retiring`, `queryOwners`, `supported`, `status`, `scope`를 읽어요. 지원되지 않거나 disjoint·실패한 시간은 `null`이에요. 실제 API가 반환한 0은 정밀도 제한이 있는 실제 결과일 수 있어 미지원과 구분해요. `engineSchema.gpuTiming`은 불변 읽기 계약이에요. 공유 렌더러는 한 소유자로 중복 제거하며, 이 표본의 p95를 모든 게임 프레임의 p95나 FPS로 변환하지 않아요.

```json
{"method":"profiler.record","params":{"recording":true}}
{"method":"profiler.read","params":{}}
{"method":"profiler.record","params":{"recording":false}}
{"method":"profiler.clear","params":{}}
```

실제 숨긴 소유 창에서 두 API의 같은 픽셀·지원/시간·해제를 검사했어요. WebGPU는 16번 그리기의 장면/톤 출력 32패스와 컴퓨트 1패스를 확인했으며 컴퓨트 출력은 독립 정수 계산과 대조했어요. 출력 검사용 버퍼 readback은 검사 도구에만 있어요. 실제 에디터에서는 인간 기록/지우기·AI 조회/중지·뷰포트/머테리얼·전체 행 가시성·원본 revision/SHA·종료0을 확인해요. 단위 검사는 자원 상한·지연 해제·stale/외부 쿼리·overflow·draw 오류·NULL·HTML escape도 포함해요.

[MDN WebGL 타이머](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)의 WebGL2 대응·가용성/disjoint/ns 구역, [렌더 패스 timestampWrites](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass)의 선택 feature·시작/끝 인덱스·ns 구역, [쿼리 resolve](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/resolveQuerySet)의 복사/정렬/검증 구역을 지정 읽고 실제 API와 대조했어요. Three r180의 `_renderScene/_renderOutput`도 읽어 장면 이외의 출력 패스를 구분했어요. 전체 MDN·WebGPU 사양·Three·Unreal/Unity 분석 완료는 아니에요.

스레드 flow·패스별 시간 트레이스·사전 생성/외부 GPU 명령·할당/누수/크래시와 모바일 실기기 검증은 누적 원장에 남아 있어요. 원래 391의 HDRI 4배 오차 감소 목표와 RND06의 복잡 셰이더 초기 준비도 이 작업으로 완료되지 않아요.
