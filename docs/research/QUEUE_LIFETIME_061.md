# C++ 대기 큐 응답 소유권 — 061

2026-10-08. NativeHost와 공용 NativeWorldClient의 직렬 작업 tail이 job.catch로 마지막 C++ 전체 응답을 그대로 보관했다. 순서 대기용 tail은 성공/실패 양쪽에서 void로 완료하도록 고쳤다. 호출자에게 반환하는 원래 job은 그대로이며 응답·오류·세계 snapshot과 변경 전송·실패 후 재시도 조건·모듈 프레임 게이트는 유지한다. 실제로 필요한 acknowledged world·spawn context를 삭제하지 않는다. 공용 클라이언트는 PC/모바일의 같은 전송 경로에 적용되고 Node 호스트 변경은 PC 호스트에 적용된다.

## 전후 회귀 증거

기존 코드에 먼저 대기 큐 완료값 검사를 추가했다. 실제 C++ world-patch와 client concurrency 두 검사가 모두 exit1로 전체 응답이 tail에 남는 것을 재현했다(`native/build/queue-baseline-061.json`, 개별 로그). 수정 뒤 두 검사는 통과한다. C++ 직접 중첩 값 변경·삭제·clock 분리·reset·worker 재시작, timer-free 동시 진행/외부 호출/새 actor/중단 순서, 실제 두 C++ 시계가 함께 검증된다. native-frame/transport도 정밀 float 시계·타이머/배치·일시정지·실패 재전송 금지·손실/거절/레거시 복구를 통과한다. 임의 강제 GC나 실제 게임 기능 제거 없이 큐의 소유권 조건을 검사한다.

현재 실제 GPU 고정 게임 UAr6xF도 활성60초·장면3회·F12 초기화3회·20초 정리·WebAudio200회/FFT 변경·608파일 보존·오류0·종료0을 통과한다. package manifest의 native-host/native-transport SHA가 현재 소스와 일치한다. 전체 private895.5→898.5(활성)→1102.8MiB(정리), JS heap53.1→89.3→80.4MiB다. 정리 뒤 Node223.9/GPUprocess413.8/renderer348.7MiB이며 도형·텍스처는15·29→14·28이다. 이전060과 자연 GC/실행 부하가 달라 순수 변경 효과나 전체 RAM 개선으로 차감하지 않는다. 이 수정은 불필요한 마지막 응답 보관의 해제이고, **장시간 메모리 안정성 해결로 표시하지 않는다**. FPS도 대기117.66/공격119.37, 작업p95 8.7/8.5ms로 목표false다. 8시간 검사는 반복하지 않는다.

## 근거와 남은 추적

[ECMAScript control-abstraction](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.catch)의 catch/then(내부 PerformPromiseThen 포함)/NewPromiseReactionJob/Promise 인스턴스 slots의 지정 clause 전체 본문·알고리즘·표를 읽었다. PerformPromiseThen 자체 구역은 중복 재읽기다. fulfilled handler가 없으면 입력값이 이어지고 PromiseResult에 완료값이 남는다. 새 fulfillment handler는 void를 돌려준다. 이 추상 의미와 실제 두 큐의 완료값을 대조했다. 전체 ECMAScript/V8 구현이나 GC 시점을 분석했다고 세지 않는다. HTML/구역 SHA와 실제 실행 근거는 native/build/queue-lifetime-research-061/manifest.json이다.

NativeHost의 heap/external/ArrayBuffer와 스폰 카탈로그·world snapshot 보관을 프로세스 private에서 더 구분하여 추적한다. 종료할 때 필요한 C++ 상태/다중 VM 카탈로그를 무작정 줄이지 않는다. 누적 선행 작업/설치 순서와 과거 실패 기록을 유지한다.
