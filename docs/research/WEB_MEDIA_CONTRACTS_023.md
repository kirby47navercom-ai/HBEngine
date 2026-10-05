# 웹 미디어·포트의 부분 계약 — 2026-10-06

WHATWG의 [미디어 오프셋과 반복](https://html.spec.whatwg.org/multipage/media.html#offsets-into-the-media-resource), [전방 재생 종료](https://html.spec.whatwg.org/multipage/media.html#playing-the-media-resource), [MessagePort](https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports)의 자체 선언·큐·이전/수신·게시·start/close·onmessage·회수를 읽었어요. 전체 HTML 표준과 연결된 DOM·구조화 복사·MessageEvent API를 전부 읽었다는 뜻은 아니에요. 각 HTML snapshot은 2026-10-06 확인본으로 고정하고 미독 구역과 링크를 전체 조사 대상에 남겨요.

미디어 duration과 currentTime의 단위는 초예요. loop는 끝에서 시작점으로 탐색하고, 전방 종료 알고리즘은 loop가 있으면 그 탐색 뒤 반환해요. loop가 없으면 timeupdate·pause·ended를 처리해요. HTTP PCM 파일의 duration이 처음2초였다가 반복 뒤 마이크로초로 바뀐 실제 iOS 결과는 정상 계약으로 인정하지 않아요. 숨긴 DOM 부착·동일 바이트 Blob·ended 수동 재개도 길이 손상이 있었으므로 이 대안으로 완료 처리하지 않아요.

MessagePort 게시에는 원본 포트나 중복 포트를 transfer로 넘길 수 없고 복제/역직렬화 실패 처리가 필요해요. 새 큐는 비활성이며 start 또는 첫 onmessage 설정으로 활성화돼요. 수신된 메시지 작업은 포트 이전을 따라 새 문서 큐로 이동하고, 전달된 객체는 발신 측에서 계속 사용할 수 없어요. close는 연결을 해제하며 명시적 닫기를 생략하면 회수가 늦어질 수 있어요. Android Java의 포트 제약과 JS 표준을 같은 계약으로 혼동하지 않아요.

W3C [Web Audio 1.1의 고정된 2026-09-22 초안](https://www.w3.org/TR/2026/WD-webaudio-1.1-20260922/)에서는 decodeAudioData의 자체 선언·인수·Promise·동작, AudioScheduledSourceNode 자체 선언·onended/start/stop·조건·인수, AudioBufferSourceNode 자체 소개·선언·생성자·buffer/loop/rate/detune/start·옵션·Looping·Playback 알고리즘 본문을 읽었어요. 연결 BaseAudioContext 전체·AudioParam 전체·그림·다른 판본·전체 표준은 미독이에요. 이 문서는 Working Draft이며 모든 현재 플랫폼이 최신 초안을 구현한다는 보증으로 사용하지 않아요.

decodeAudioData는 완전한 파일 ArrayBuffer를 소비해 비동기로 PCM을 만들고 context의 sample rate로 맞춰요. 입력 버퍼는 detach되고, 이미 detach됐거나 지원되지 않는 형식은 실패해요. BufferSource의 start는 한 번만 호출할 수 있어서 재개·탐색은 같은 PCM 위의 새 source로 처리해요. loop/rate 변경은 재생 중 적용할 수 있고 시간 좌표는 context.currentTime을 사용해요. stop 이전·이후에는 무음이며 종료 이벤트는 source의 종료를 알려요. 엔진의 반복 경로는 노드를 JS 타이머로 재생성하지 않고 기본 loop를 사용해요.

원문·본문 추출 snapshot과 원문 SHA는 `native/build/whatwg-023/manifest.json`에 있어요. media SHA는 `6c843fd84dacbcc8922e0e735b9ef89c89c6d69c4f516ec7033c47b44c8ff95e`, web-messaging은 `f8e90334743067d3b364e9900a488f7d3124244c1981652170f2bf18538750ce`, Web Audio는 `8dbacf76c5a3f92900a5ff915a53ee7f1ac43a1c10257fc53df541d8e99588f1`예요. 각 페이지의 읽은 구역만 분리하며 전체 body_reviewed/analyzed/verified로 올리지 않아요.

HB 적용은 iOS 출력 manifest의 target으로 선택해요. 공용 AudioRouting과 믹서 미리듣기에서 같은 플레이어 생성기를 쓰고, Windows·Android의 기존 미디어 경로는 유지해요. PCM 캐시는32MiB이며 동시 로딩은 공유하고 오래된 캐시를 비워요. 이 예산은 재생 중인 음성·디코딩 임시 메모리까지 포함한 전체 메모리 상한이 아니에요. 종료 후 늦은 디코딩은 캐시에 넣지 않아요. `node tools/check-buffered-audio.mjs`는 반복·시간 진행·탐색·속도·일시정지/재개·종료 이벤트·늦은 작업 정리·PCM 공유/예산을 검사해요. 실물 기기 청취·배포 서명·큰 음악 메모리 실측은 별도 검증 대상이에요.
