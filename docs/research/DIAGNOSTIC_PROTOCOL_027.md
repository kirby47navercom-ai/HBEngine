# 안전 영역·메모리 진단의 증거 범위 — 027

2026-10-06. 공식 [Chrome DevTools 프로토콜](https://github.com/ChromeDevTools/devtools-protocol/blob/d209a9a38897d2935a078a0bf00ca821811d21ed/json/browser_protocol.json)의 커밋 `d209a9a38897d2935a078a0bf00ca821811d21ed`에서 아래 명령과 직접 참조 타입을 읽었다. 전체 JSON이나 브라우저 구현을 읽은 기록은 아니다. 원문 SHA-256: `37b77cd1dadbef05c627f7c0578b15c212577493cbb6f234aef144633646ee6c`.

## 안전 영역

`Emulation.setSafeAreaInsetsOverride`는 실험적 명령이며 `SafeAreaInsets`를 받는다. 네 방향과 각 최대값은 선택적 정수다. 생략한 값은 이전 override가 있어도 정의되지 않게 된다. 따라서 복원 검사에서 네 방향을 명시적으로 0으로 설정했다. 실제 창의 CSS `env()`와 HUD 좌표 검사는 통과했지만, 물리적 노치·OS 제스처·화면 회전의 실기기 증거는 아니다.

## 메모리

`Memory.startSampling`은 간격과 무작위 간격 억제 옵션을 받는다. `getSamplingProfile`은 샘플 크기·귀속된 바이트·할당 스택과 모듈 정보를 반환한다. 이 선언은 그 합계가 전체 프로세스 사용량, 모든 살아 있는 객체의 정확한 크기, 누수량이라고 보장하지 않는다. 심볼화하지 않은 주소만으로 원인 함수를 특정하지 않는다.

별도 실행본 `memory-controlled-bOMG23`은 같은 GameInstance·중립 입력을 유지했고 강제 GC 없이 활성/디버거 Runtime 비활성/일시정지의 세 구간을 비교했다. 프로세스 전용 메모리는 각각 591.7→699.7, 705.3→734.2, 733.0→632.6 MiB였고, AudioHandlers는 4→112→214로 증가했다. 이것은 장면 재시작이나 Runtime 이벤트 연결만으로 설명되지 않는 현상이다. 오디오와 실제 네이티브 호출을 분리한 후속 대조가 필요하며, 아직 원인 확정이나 장시간 합격으로 기록하지 않는다.

[Chromium AudioParamTimeline 구현](https://chromium.googlesource.com/chromium/src/+/0aee4434a4db/third_party/blink/renderer/modules/webaudio/audio_param_timeline.cc)은 과거 커밋의 조사 단서로 등록했다. 검색에서 확인한 일부 처리 코드만으로 설치된 WebView2의 구현이나 오디오 누수를 증명할 수 없다. 해당 원문 전체·버전 대조·연결 소스와 독립 검증은 남아 있다.
