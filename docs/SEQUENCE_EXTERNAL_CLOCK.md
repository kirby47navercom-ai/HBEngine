# 외부 시퀀스 시계

시퀀스의 재생 시계를 **외부 시간 입력**으로 선택해요. BP 노드나 C++ `hb::LevelSequence::SetExternalTime(director, seconds)`에 공급자가 읽은 시각을 넣어요. 첫 입력은 기준점을 잡고, 다음 입력부터 두 시각의 차이에 시퀀스 재생 속도를 곱해 진행해요. 입력이 없으면 현재 위치를 유지해요. 기존 이벤트·반복·하위 시퀀스·애니메이션·종료 복원을 같은 경로로 처리해요.

```cpp
hb::LevelSequence::SetClockSource(director, "external");
hb::LevelSequence::SetExternalTime(director, 1700000000.0);      // 기준점
hb::LevelSequence::SetExternalTime(director, 1700000000.03125); // 1/32초 진행
```

C++ 초 입력·조회는 `double`이고 BP 숫자는 기존 JavaScript 수치 정밀도를 사용해요. 허용 범위는 ±2^40초예요. 값이 작아야 한다고 Unix epoch를 임의로 잘라내지 않아요. 별도의 고주파 타이머·스레드·워커·장치 폴링은 만들지 않아요. 네이티브 명령의 큐 처리와 조회 스냅샷의 프레임 장벽은 기존과 같아요.

- `SetExternalFrame(director, frame, numerator, denominator)`는 외부 프레임 번호를 해당 분수 FPS의 초로 변환해 공급해요. 프레임은 0~int32 최댓값, 분수의 두 정수는 양수 int32이고 FPS는 1~240이에요. 외부 프레임률은 시퀀스 표시 격자와 독립적이에요. 생략한 C++ 분수와 새 BP 노드의 기본값은 30/1이에요. 30000/1001도 그대로 계산해요.
- `GetExternalTime`은 마지막에 수신한 시각을 조회해요. 입력이 없거나 정지한 시퀀스는 0이에요.
- `HasExternalTime`은 현재 재생 문맥에서 기준점이 유효한지 알려줘요. 일시 정지 중에는 거짓이며 일시 정지/재개, Seek, Evaluate, 시계 변경 뒤에는 새 입력으로 기준점을 잡아요.
- `ResetExternalTime`은 마지막 시각·역행 횟수를 지우고 다음 입력을 새 기준점으로 삼아요. 외부 모드에서만 사용해요.

공급 시각이 뒤로 가면 장치 재시작·시간코드 래핑으로 취급해 새 기준점을 잡고 이벤트를 재실행하지 않아요. 다음 정상 증가부터 진행해요. 일시 정지 동안 입력을 받아도 재생은 진행하지 않으며, 재개 뒤 새 기준점을 요구해 밀린 시간을 한꺼번에 실행하지 않아요. 한 입력의 진행량이 시퀀스 길이의 255배를 넘으면 상태 변경 전에 거절해요. 큰 점프를 기준점 변경으로 받아들이려면 먼저 Reset을 명시해요. 중간 시각으로 실제 탐색하려면 기존 Seek를 사용해요.

런타임 `gameplayDebug.sequence`와 기존 `runtime.state`에는 `externalTime`, `externalTimeReady`, `externalDiscontinuities`가 있어요. AI는 `schema.sequencePlaybackClock.external` 및 `sequenceExternalDelta`·`sequenceExternalFrameTime`·`resetSequenceExternal`의 소유자를 조회해요. 제작 설정은 기존 `document.patch`의 revision·dryRun·Undo·저장을 사용해요.

이 기능은 외부 **시간 입력 수신 경로**예요. RTC·SMPTE·오디오 장치의 I/O, pull 공급자 등록, PCM 표본 동기화, 하드웨어 genlock은 별도예요. 외부 모드의 오디오는 평가 위치에 정지/탐색해 자체 시간이 앞서가지 않도록 하며 연속 음성 동기화라고 주장하지 않아요. 기존 1879의 공식 시계 enum·Evaluate 읽기 근거를 재사용하고 새 문서 전체 분석 완료로 계산하지 않아요.
