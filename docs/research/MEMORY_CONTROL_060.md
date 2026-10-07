# 오디오 측정 배열과 현재 메모리 대조 — 060

2026-10-08. AudioMixerGraph.levels의 버스별 시간 영역 샘플 배열을 재사용한다. FFT 크기가 바뀐 버스만 새 크기의 배열을 만든다. 현재 신호를 매번 읽어 RMS를 계산하며 종료에서는 AudioNode를 연결 해제하고 Map/배열 소유권을 해제한다. 믹서·스냅샷·필터·우회·미터·C++/BP API를 제거하지 않는다. 이 작은 할당 감소를 과거 장시간 RAM 증가의 원인/해결로 주장하지 않는다.

`check-streaming-audio.mjs`의 200회 측정 버퍼 동일성·현재 강/약 신호 RMS·FFT 변경1개 버스·종료 연결 해제와 기존200스트리밍 lease/콜백/늦은재생/예약 검사가 통과한다. buffered-audio/audio-sources도 영향 경로만 실행해 통과한다. 실제 GPU Player mD50n3 안의 Web Audio 믹서는 4버스/200회 배열4개 유지, FFT 변경 뒤5개, RMS .352774→.014436/FFT512 .013965, Map정리·context.close를 확인했다. 실제 스피커 청취/실기기/모든 DSP 효과의 새 검사로 바꾸지 않는다.

## 현재 고정 게임의 자연 GC 대조

기존 check-auric-frame에 --backend=webgl2|webgpu 선택과 --memory-probe를 추가했다. 기본 전체 프레임 비교는 그대로다. 메모리 옵션은 private 패키지에서 엔진 키오스크 무입력 타이머를0으로 하고, 게임 자체 C++ IdleReset60 경로를 기존 중립키5로 방지한다. 활성60초·같은 GameInstance 장면 열기3회·실제 F12 새 GameInstance 초기화3회·20초 정리 뒤를 비교한다. renderer는 같은 인스턴스다. native Memory.startSampling16KiB·JS heap/DOM·소유 프로세스 private·GPU/GL 자원 수를 기록한다. Memory.prepareForLeakDetection/collectGarbage/메모리 압박은 호출하지 않는다. 샘플링 자체 비용이 있으므로 아래 수치는 짧은 진단이며 성능 보장 수치가 아니다.

|경로|활성 시작/끝 private|초기화 정리 뒤 private|활성 끝/정리 뒤 JS heap|활성 끝/정리 뒤 도형·텍스처|
|---|---|---|---|---|
|GL|694.9/699.0MiB|809.9MiB|51.7/51.9MiB|15·21 / 14·20|
|GPU|934.0/896.9MiB|1087.4MiB|65.5/103.3MiB|15·29 / 14·28|

GL은 최초 버퍼 변경 전 패키지 UwL2J7, GPU는 버퍼 변경 후 패키지 mD50n3이며 두 행을 서로 같은 조건의 성능 우열/변경 효과로 차감하지 않는다. 두 실행 모두 Assets/Source608개 보존, 게임 지속/명시적 새 세션·소리 재생 상태·오류0·자기 프로세스 종료0이다. GPU 정리 뒤 private 내역은 node223.0/GPUprocess409.7/renderer336.9MiB이고 시작은118.8/404.2/303.1MiB다. 종료한 DOM 이벤트/도형·텍스처 수가 돌아온 사실만으로 프로세스 증가를 해결했다고 세지 않는다. CPU Node 호스트의 C++ 전송/스폰 카탈로그 보관도 후속 원인 후보에 포함한다.

샘플링된524284바이트 allocation은 두 실행의 활성 구간0개, 초기화 뒤1개다. 이것을 과거 Chromium 함수나 전체 실제 누수량으로 귀속하지 않는다. 주소 심볼과 설치 버전의 본문은 아직 대응하지 않았다. **8시간 안정성은 false**, 과거 2GiB대 증가 기록은 유지한다. FPS도 공격 p95>8.33ms로 목표false다. 이 진단 때문에 8시간 검사를 다시 시작하지 않았다.

처음 도구의 async report 취급(yxCCdx), 자동 초기화 혼입(VIRXUG), 게임 자체 C++ 타이머 혼입(Ybiz5W) 실패를 보존했다. product 오류로 분류하거나 숨기지 않는다. 현재 검사에서는 동일 세션 조건과 수동 초기화를 분리했다. 사용자 게임/설치/프로필/창은 건드리지 않았다.

## 근거 읽기 범위

[공식 CDP Memory](https://chromedevtools.github.io/devtools-protocol/tot/Memory/)와 공식 미러 browser_protocol.json의 Memory domain 자체 선언·설명·인수·반환·타입을 전체 읽었다. experimental API이고 sampled total은 프로세스 private와 다른 수치다. 강제 GC가 포함된 누수 준비 메서드와 native sampling을 구분한다. Chromium 구현이나 전체 CDP 분석으로 세지 않는다.

[Unity Resources load/unload 가이드](https://docs.unity3d.com/cn/6000.0/Manual/assets-resources-system-load.html)의 자체 본문·예제·패킹·해제·추가 링크 목록을 읽었다. 객체 파괴와 참조가 없는 에셋 해제를 구분한다. 연결된 Resources API 전체는 미독이며 UnloadUnusedAssets의 시도한 API URL은 오류 페이지였다.

[Epic Memory Insights](https://dev.epicgames.com/documentation/en-us/unreal-engine/memory-insights-in-unreal-engine)의 자체232줄 본문·표를 읽었다. 활성/증가/감소/해제/짧은·긴 수명·전환 후 남는 할당을 시간 구간으로 구분하고 태그/콜스택/모듈 심볼/주소 공간을 함께 보아야 한다. HB의 샘플링·숫자 기록을 UE의 모든 allocation/free 추적·태그·심볼·쿼리 UI 구현으로 동일시하지 않는다. 연결 이미지·LLM·엔진 소스는 미독이고 로컬 HTML 다운로드403도 기록한다.

원문 SHA/구역/실행·실패·현재 소스는 native/build/memory-research-060/manifest.json, 공개 수치는 [JSON](MEMORY_CONTROL_060.json)이다. 누적 선행 작업과 설치 순서를 유지한다.
