# 032 — 반복 스트리밍 재생과 소스 수명

확인일: 2026-10-06. 전체 문서/API 완료로 계산하지 않는다.

## 실제 읽은 원문

고정 Chromium `751b533743c567cc069f12da53e4470f51008e7a`의 MediaElementAudioSourceNode/Handler `.cc`·`.h`와 DeferredTaskHandler `.cc`·`.h` 6개를 전체 읽었다. 원문 SHA와 실제 읽기 범위는 `native/build/media-source-lifetime-20261006/source-capture.json`과 별도 `read-scope.json`에 있다. 다운로드 당시의 읽기 전 메타데이터는 덮어쓰지 않았다. 설치 Edge revision과 이 커밋의 일치는 검증되지 않았다.

[Node 원문](https://chromium.googlesource.com/chromium/src/+/751b533743c567cc069f12da53e4470f51008e7a/third_party/blink/renderer/modules/webaudio/media_element_audio_source_node.cc)은 같은 HTMLMediaElement의 중복 source 생성을 거절하고, context의 시작된 소스 목록에 등록한다. `HasPendingActivity`는 context가 running인 동안 참이다. Handler는 media의 약한 참조·형식/리샘플링·CORS 무음을 처리한다. DeferredTaskHandler는 종료한 소스와 tail/orphan handler의 렌더 스레드→메인 스레드 정리를 맡는다. 이 일부 경로만으로 설치 브라우저의 모든 보유 객체나 전체 프로세스 증가량을 설명하지 않는다.

[Web Audio 1.1 편집 초안](https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode)의 1.22 자체 설명·선언·옵션·CORS 절을 읽었다. 같은 media element의 src/탐색/일시정지/볼륨 변경을 유지해야 하며, source 출력의 채널 수는 현재 media에 대응한다. 다른 연결 절·HTML 알고리즘·전체 API를 읽었다고 기록하지 않는다. 편집 초안의 설치 구현 대응도 별도다.

6개 구현 주소를 기존 Chromium 발견 계열에 추가했다. 발견 등록을 독립 검증이나 전체 corpus gate 통과로 승격하지 않는다.

## HB 공용 경로의 수정

기존 `AudioRouting.player→connect`는 PC 재생마다 새 HTMLMediaElement와 MediaElementAudioSourceNode를 만들었다. 실제 같은 GameInstance의 자연 GC 진단 VzfhAY에서 AudioHandlers가 4→59→110으로 증가했고, 일시정지 구간에서는 112를 유지했다. 전체 private 사용량은 구간마다 오르내렸으므로 이 수치를 전체 메모리 누수량으로 환산하지 않는다.

PC 스트리밍은 element/source 쌍을 재사용하고 재생마다 별도 lease를 만든다. Stop은 이전 이벤트 전달·파일·연결을 정리하고, 옛 핸들은 다음 재생을 제어할 수 없다. 미연결/늦은 play/세션 종료도 같은 수명 경로를 쓴다. 긴 음악을 모두 PCM으로 바꾸지 않는다. 모바일의 기존 PCM 경로와 32MiB 보유 캐시는 유지한다. 스트리밍 source 보유량은 누적 재생 횟수 대신 최고 동시 재생 수를 따른다. 전체 동시 voice 예산/우선순위 정책은 별도다.

믹서 9개 파라미터는 값이 변경될 때 예약한다. 상태 전이·노출 변수·mute/solo/필터/컴프레서의 결과는 유지하며 고정 값의 매 프레임 자동화 이벤트를 줄인다. Auric의 전체 메모리 증가가 이것으로 해결됐다는 주장은 하지 않는다.

## 검증

수정 전 동일 runnable check는 200회 재생에 source 200개를 생성해 실패했다. 수정 후 source 1개, 서로 다른 두 동시 재생, 반복/피치/탐색, 옛 핸들/이벤트 격리, 늦은 play와 미연결 종료를 통과했다. 기존 버퍼/컴포넌트/위젯/C++/믹서 검사도 통과했다. 실제 PC 강/약 신호·게임 기능·성능과 최신 모바일 빌드, 자연 GC 장기 검사의 결과는 별도 후속 기록으로 남긴다.

실제 Windows fPV6Zw 통합 검사는 통과했다. 같은 소스에서 스트리밍12회/source1개/옛 ended0회, 강0.800012·약0.019990의 신호, 기존20개 소리·12개 버퍼 신호·3개 HUD 해상도·93개 생성·6장면·연속 입력·F12/60초 초기화를 확인했다.1,000발/적30개600프레임은59.404764fps였으며 고정59fps/작업p95≤16.667ms 기준을 유지했다. source 재사용을 전체 메모리 무누수로 계산하지 않는다.

수정 전 c984007의 별도 buffered 대조 WYT5MC는 같은 GameInstance·자연GC/native샘플에서 활성 구간 AudioHandlers1→15, 다음 활성 구간6→9였다. 기존 스트리밍 VzfhAY의4→59→110과 구분하며 다른 프로세스의 초기 private 차이를 개선량으로 환산하지 않는다. 현재 스트리밍 수정의 jRfgbl 측정과 기존 두 고정 패키지8시간 검사는 계속된다. 강제 GC/시계 가속/통과 기준 변경은 없다.
