# 031 — 렌더 해제와 진단 명령의 실제 비용

확인일: 2026-10-06. 전체 API·저장소 분석으로 계산하지 않는다. 원문/읽은 범위/SHA는 `native/build/render-lifetime-source-20261006/sources.json`에 보존한다.

## 설치된 Three 0.180.0의 실제 경로

설치 원문의 `WebGLRenderer.js` 1047–1085에서 머테리얼의 `dispose` 이벤트가 프로그램 참조 해제와 머테리얼 속성 제거로 이어지는 것을 읽었다. `WebGLPrograms.js` 584–638에서 프로그램 획득/참조 증가, 해제/감소, 마지막 참조의 프로그램 파괴를 읽었다. Light/DirectionalLight/PointLight/SpotLight/LightShadow의 해제 메서드도 읽었다. 파일 전체 읽기로 기록하지 않는다.

HB의 기존 Player는 오브젝트를 월드에서 분리한 뒤 남은 월드의 머테리얼만 순회했다. 기본 도형의 공유/고유 머테리얼은 기존 오브젝트 자원 집합에 등록되지 않았고 공유 제작기도 해제 메서드가 없었다. 같은 GPU의 원문 대조에서 20회 장면 생성/해제 후 머테리얼 참조가 9→369, 수정 후 9→9임을 확인했다. 프로그램 수나 샘플 할당을 전체 프로세스 누수량으로 환산하지 않는다.

## 힙 샘플 명령도 강제 GC를 일으킬 수 있다

[공식 DevTools 프로토콜](https://github.com/ChromeDevTools/devtools-protocol/blob/d209a9a38897d2935a078a0bf00ca821811d21ed/json/js_protocol.json)의 HeapProfiler `startSampling`, `getSamplingProfile`, `stopSampling`, `takeHeapSnapshot` 자체 선언/매개변수만 읽었다. 전체 JSON/API 분석이 아니다.

[V8 inspector 원문](https://github.com/v8/v8/blob/d29ab8674c6a5f294550a9f890185a15a8416462/src/inspector/v8-heap-profiler-agent-impl.cc#L556)의 556–592와 637–667을 읽었다. `startSampling`은 `kSamplingForceGC` 플래그를 사용하며 `getSamplingProfile`은 `GetAllocationProfile`을 호출한다. [SamplingHeapProfiler](https://github.com/v8/v8/blob/d29ab8674c6a5f294550a9f890185a15a8416462/src/profiler/sampling-heap-profiler.cc#L306)의 306–349에서는 이 플래그가 있을 때 전체 GC를 수행한다. `heap-profiler.cc` 248–254의 전달 경로도 읽었다.

따라서 자연 GC만 허용하는 진행 중 8시간 검사에 HeapProfiler 샘플/스냅샷 명령을 추가하지 않았다. 이번 후속 진단도 기존 native `Memory` 샘플과 실제 프로세스 사용량을 쓰며 힙 샘플 명령을 실행하지 않았다. 설치 Edge revision과 이 V8 커밋의 일치는 검증되지 않았다. 연결된 다른 V8 파일/전체 API/독립 검증도 남아 있다.

각 이동 브랜치 원문은 위 고정 커밋의 원문과 SHA가 같음을 재확인했다. 이 소스 확인은 진단 수단의 한계 분석이며 전체 엔진 안정성이나 전체 문서 완료 근거가 아니다.
