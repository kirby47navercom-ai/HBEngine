# C++ 호스트 사용량·참조 진단 — 062

2026-10-08. 대기 큐 응답 보관을 고친 061은 3036085로 푸시했다. 프로세스 private만으로 살아 있는 데이터와 확보한 힙을 혼동하지 않도록 NativeHost의 기존 소유자에서 읽기 전용 진단을 제공한다. GET /api/native/inspect는 Node PID/버전, process.memoryUsage 바이트와 모듈별 worker PID·busy·request/transport 행 수·세계 공유 여부·스폰 context/template/object 참조 수를 반환한다. 토큰·파일 경로·객체 내용은 내보내지 않는다. 프레임 안이나 평소 자동 폴링에서 실행하지 않는다. 편집기의 현재 프로젝트 호스트와 개발 패키지에서 사용할 수 있고 일반 release에서는 404, 격리 smoke 검사만 허용한다. /api/schema에서 AI가 같은 경로를 발견할 수 있다.

## 실행 근거

`node tools/check-native-resources.mjs`는 호스트 정리/스냅샷 독립/민감 데이터 제외, 실제 개발·release·smoke HTTP 경계, 잘못된 Origin/메서드 거부, 서버 종료와 별도 프로필의 GUI 없는 편집기 경로·schema를 통과했다. native/build/native-resources-7HMKC9/acceptance.json. 개발 API를 배포판에서 몰래 켜지 않는다.

`node tools/check-auric-frame.mjs --backend=webgpu --memory-probe`는 격리된 실제 현재 release 게임 fCUCL4를 실행했다. 기존 CLI가 옵션을 첫 파일 경로로 오해한 도구 오류(ENOENT)는 argument-failure 로그에 보존하고, 첫 비옵션 인자를 사용하도록 고쳤다. 새 실행은 608개 원본 Assets/Source SHA 보존, 실제 sprite/HUD/오디오, 장면3회/F12 새 GameInstance3회, 자연 GC, 오류0·종료0을 통과했다. 포장된 native-host/player-server/native-transport SHA가 검사 소스와 일치한다. 진단은 프레임 측정 뒤 메모리 구간에서만 실행했다. 결과와 호스트 메모리 단위를 [HOST_MEMORY_062.json](HOST_MEMORY_062.json)에 보존했다.

| 구간 | 전체 private MiB | Node private MiB | Node heapUsed / heapTotal MiB | external / ArrayBuffer MiB | context 수 / 모듈 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 활성 시작 | 904.8 | 115.9 | 33.3 / 56.1 | 9.76 / 3.35 | 1 |
| 활성64초 | 912.6 | 152.5 | 44.5 / 89.9 | 9.90 / 3.49 | 1 |
| 전환·초기화·20초 정리 뒤 | 1105.0 | 216.1 | 30.3 / 152.2 | 6.70 / 0.30 | 7 |

두 모듈은 처음부터 끝까지 같은 worker PID, world432행이며 마지막 context는 모듈당7개·template/object210참조다. 참조 수는 객체 바이트 크기나 중복 제거한 소유권이 아니다. 기존 context 상한8을 줄이지 않았고 다른 VM으로 돌아가기/worker 재시작 자료를 보존한다. Node 사용 중 힙과 external은 마지막에 시작보다 낮지만 heapTotal/private는 높다. 따라서 이 실행의 Node private 증가를 같은 양의 살아 있는 객체 누수로 볼 수 없다는 근거다. V8 힙 확보/회수 정책은 원인 후보이며 모든 Node private를 heapTotal로 설명하지 않는다. Browser renderer/GPU private도 남아 있으므로 **전체 RAM 안정성 해결 또는 이전8시간 증가 해결로 승격하지 않는다**. 강제 GC, 힙 상한 축소, 사용자 기능/객체 제거는 하지 않았다.

기존 전체 게임 FPS 구간은 대기120.02(p95 작업7.2ms), 공격119.20(p95 8.9ms)로 전체 목표 false다. 단일 실행을 전후 개선 또는 PC120/모바일60 지속 달성으로 세지 않는다. 새8시간 검사나 사용자 창 변경·설치 갱신은 하지 않았다. 다음은 실제 프레임의 반복 직렬화/검증·렌더·물리 비용과 누적 선행 세부 구현을 계속한다.

## 읽은 원출처

실행 Node v24.15.0과 일치하는 [공식 process.md의 process.memoryUsage 자체 구역](https://github.com/nodejs/node/blob/v24.15.0/doc/api/process.md#processmemoryusage)을 본문·두 예제·모든 필드·Worker 주의·호출 비용·glibc 주의까지 읽었다. arrayBuffers는 external에 포함되어 더하면 중복이다. heapUsed/heapTotal은 V8, rss는 전체 프로세스 resident이며 Windows private와 같은 지표가 아니다. glibc 설명을 Windows 누수 원인으로 가져오지 않는다. memoryUsage.rss 별도 API와 다른 process API·V8 전체 구현은 미독이다. 원문 전체를 저장했지만 읽은 자체 구역2383바이트만 인정한다. 캐시/SHA/범위는 native/build/host-memory-research-062/manifest.json이다. 웹 nodejs.org 현재 API 직접 열기는 실패했고 버전 고정 공식 Git 소스로 확인했다. Unreal/Unity 전체 분석 완료나 이들의 전체 프로파일러 동등성 주장이 아니다.
