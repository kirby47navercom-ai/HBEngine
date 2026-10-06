# 오디오 측정 버퍼의 할당·재사용 분석 — 028

2026-10-06. 공식 Chromium 소스의 고정 커밋 `751b533743c567cc069f12da53e4470f51008e7a`에서 아래 8개 파일의 본문 전체를 읽었다. 설치된 WebView2와 이 커밋의 대응 관계, 연결된 전체 오디오 구현, WebKit 구현 및 독립 검증은 확인하지 않았다. 기존 027의 해시가 고정된 조사 기록은 수정하지 않는다.

| 직접 읽은 파일 | 원문 SHA-256 |
| --- | --- |
| [realtime_analyser.cc](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/realtime_analyser.cc) | `71a7b7d59afcc1381b830bfe5a44031b00b4ef044963370a661b9cd065599c94` |
| [realtime_analyser.h](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/realtime_analyser.h) | `5a2d72a847bed87e5b3f67447cc9139f07271cafcefee824b62661186b45e8f8` |
| [analyser_node.cc](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/analyser_node.cc) | `b33a4cd3c339352cad5c848af9a299bd6f1240e53f2a8867b1895f7cf1e6db0d` |
| [analyser_node.h](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/analyser_node.h) | `a199994fb5e200a9168879af6ccbb1b609c8e5175c2712276c48a1448d879d89` |
| [analyser_handler.cc](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/analyser_handler.cc) | `0107a55bab69d8bf4dd90bb76deb2aeb82ab28d049d47f4bfdeaa22d647add10` |
| [analyser_handler.h](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/analyser_handler.h) | `65f12f8cfc13a6f75fcb88fccdb9750bab548155168c3d7a81b6a71a60edd2f9` |
| [audio_basic_inspector_node.cc](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/audio_basic_inspector_node.cc) | `fad7e5f6066dcad87f0d25bfa7ceccd97ffe3698f5a4f923377ee2f6d3a04bd6` |
| [audio_basic_inspector_node.h](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/audio_basic_inspector_node.h) | `50100ed8258260b8d139db3ccdb89d9650bc9066c1c62f798af7e584f7546d62` |

원문과 범위 기록은 `native/build/frame-order-docs-20261006/analyser-source-capture.json`에 보존한다. 참조용 소스를 엔진 구현에 복사하지 않았다.

## 실제 소스의 계약

Node는 Handler에 설정과 측정을 위임한다. Handler는 입력을 RealtimeAnalyser에 기록하고 오디오는 그대로 통과시키며, 입력이 없을 때도 내부 기록을 갱신한다. 자동 pull과 출력 연결은 서로 다른 경로이고, tail 처리는 최대 FFT 크기와 sampleRate를 기준으로 남는다. 이 선언만으로 모든 브라우저에서 disconnect 직후 이전 파형이 지워진다고 보장하지 않는다.

RealtimeAnalyser는 생성 시 입력 ring, 다운믹스 버스, FFT 및 크기 버퍼를 갖는다. 이 커밋의 입력 ring은 65,536개의 float, 즉 원소 데이터만 262,144바이트다. FFT 크기를 바꿔도 입력 ring 크기는 그대로다. 시간 영역 읽기는 마지막 fftSize개의 샘플을 가져오며, 주파수 읽기는 Blackman 창·FFT·크기 평활화·dB 변환을 별도로 수행한다. 길이가 짧은 출력 배열은 그 배열 길이까지만 채운다. FFT는 32~32,768의 2의 거듭제곱이고, 평활화는 0~1, min/max dB는 순서 검사를 받는다.

FFTFrame의 플랫폼별 내부 할당, AudioFloatArray·AudioBus·DeferredTaskHandler의 구현은 아직 읽지 않았다. 따라서 뒤의 약 512KiB 샘플이 위 256KiB ring 하나라고 동일시하지 않는다. 심볼화하지 않은 설치 DLL의 주소를 이 과거 소스 함수에 귀속시키지도 않는다.

## 실제 엔진 대조와 변경

별도 실제 Game.exe에서 같은 GameInstance·1,000발·중립 입력·자연 GC를 유지한 세 구간을 비교했다. 기존 `memory-controlled-bOMG23`의 첫 약 123초에는 크기 524,284바이트의 샘플 할당 53개, 약 247초 뒤에는 105개가 관측됐다. PCM 경로인 `JhXfdi`도 54→106개였다. Analyser를 Gain으로만 교체한 진단 `mbH9a3`에서는 두 시점 모두 0개였지만, 이는 오디오 측정을 제거한 대조이며 제품 변경이나 기능 합격 증거가 아니다.

공용 AudioRouting에서 유휴 Analyser를 최대 16개 재사용하고, 이전 입력 기록을 충분히 비운 뒤 새 재생에 연결하도록 변경했다. 측정값·샘플 길이·재생 이득·공간화 API는 유지한다. 처음 단순 disconnect와 시간 대기만 사용한 `features-window-iXrtCr`에서는 .8 뒤 .02 신호가 .8로 측정되는 실제 실패가 발생했다. 이후 유휴 Analyser를 입력 없이 destination에 연결하여 침묵을 기록하고, 오디오 시계가 `(fftSize+128)/sampleRate`만큼 진행한 뒤 재사용한다. AudioRouting 종료에서는 유휴 연결도 모두 끊는다. 동시 재생은 16개보다 많을 수 있으며, 이 상한은 유휴 보관량이다.

수정된 실제 `features-window-cSnRHl`은 40ms 신호 .8/.02를 12회 교대로 재생하면서 Analyser 생성 1개, 각 peak 오차 .005 이내를 통과했다. 기존 생성93·소리20·HUD·6장면·누름 유지·F12/60초 초기화·1,000발/적30개600프레임도 통과했다. 평균59.596531fps, 작업p95 9.5ms였다.

자연 GC의 수정 실행 `memory-controlled-egPsS8`에서는 약 123초/248초 뒤 해당 큰 샘플이 각각 1개였다. 첫 구간 sampled 합계는 22.5MiB, 다음 구간 38.765625MiB였다. 프로세스 private는 활성608.6→681.7, Runtime 진단 비활성681.7→655.9, 일시정지665.0→573.6MiB였다. 이것은 반복 대형 할당을 줄인 증거다. 샘플 합계를 전체 메모리나 누수량으로 읽지 않으며, 초기 사용량이 다른 실행 사이에 단순 차감을 하지 않는다.

약 6분 대조, 강제 snapshot을 사용한 이전 객체 수명 검사, Windows 신호 측정을 실제 8시간 안정성·휴대폰 발열/배터리·스피커 청취·iOS 검증으로 대신하지 않는다. 불변 8시간 실행 `zjUtGE`는 이전 패키지를 계속 측정하며 전체 private 증가가 남아 있다. 전체 Unreal/Unity 본문·API 분모·독립 검증 gate도 승격하지 않는다.
