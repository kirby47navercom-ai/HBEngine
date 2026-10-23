# 시퀀스 재생 시계

시퀀스 왼쪽 **재생 시계**에서 게임 시간, 배율 무시, 수동, 매 프레임을 선택해요. 기존 문서는 `playbackClock`을 생략하고 게임 시간을 사용해요. 설정을 바꿔도 키·클립·구간의 초 단위 시각, 편집 격자, 녹화율, 게임 FPS는 바뀌지 않아요. 실행 중인 문서 설정은 잠기며 런타임 API로 현재 director만 바꿀 수 있어요. 편집 미리보기의 직접 스크럽은 재생 시계와 독립적이에요.

```json
{"playbackClock":{"source":"playEveryFrame","secondsPerFrame":0.1}}
```

`source`는 `game`, `unscaled`, `manual`, `playEveryFrame`이에요. `secondsPerFrame`은 0.001~60초이고 생략하면 표시 격자의 한 프레임 길이를 사용해요. 다른 필드나 잘못된 값은 공용 문서 검증에서 거절해요.

- `game`: 게임 배율이 적용된 delta에 재생 속도를 곱해 진행해요.
- `unscaled`: 배율 적용 전 VM delta에 재생 속도를 곱해요. 게임 배율 0에서도 움직이지만 에디터/VM 전체 일시 정지를 우회하지 않아요.
- `manual`: 자동 진행을 멈추고 `Advance`로 공급한 증분만 평가해요. 증분은 0 이상의 유한한 초이고 재생 속도를 곱해요. 한 호출에 길이의 255배를 넘는 증분은 반복 폭주 방지를 위해 거절해요. 시퀀스 자체 Pause 상태에서는 Advance를 거절해요. Seek/SeekFrame은 계속 직접 위치를 바꿀 수 있어요.
- `playEveryFrame`: 배율 적용 전 활성 VM 경과 시간에 재생 속도를 적용해서 유지 시간을 세요. 시간이 차면 다음 표시 프레임으로 한 번만 진행해요. 느린 업데이트에서 프레임을 건너뛰거나 뒤늦게 여러 프레임을 몰아서 실행하지 않아요. 초과 경과 시간은 버려요. 분수 격자의 다음 프레임을 직접 계산하므로 delta 덧셈으로 프레임 격자가 밀리지 않아요.

일시 정지, Seek, 시계/유지 시간 변경, Evaluate는 유지 시간의 누적을 초기화해요. 하위 시퀀스는 root의 평가 시각에 소스 오프셋·구간 속도를 적용해요. 하위 문서의 시계로 따로 달리지 않아요. 수동·프레임 재생의 오디오는 평가된 위치에 정지/탐색해서 자체 재생 시간이 앞서가지 않도록 해요. 프레임별 오디오 연속 재생이나 전문 오디오 동기화를 뜻하지 않아요.

공용 BP와 C++ `hb::LevelSequence`에는 `SetClockSource`, `GetClockSource`, `Advance`, `Evaluate`, `SetSecondsPerFrame`, `GetSecondsPerFrame`가 있어요. Advance는 건너간 이벤트·반복·하위 구간·종료 복원을 기존 경로로 처리해요. Evaluate는 현재 위치를 이벤트 없이 다시 적용해요. 이벤트 콜백이 Seek/Pause/시계를 바꾸면 이전 평가의 후속 이벤트와 완료 처리가 새 제어를 덮지 않아요. 재생이 없으면 getter는 빈 문자열/0이에요. C++ 명령 적용과 스냅샷 조회의 프레임 장벽은 기존과 같아요.

AI는 `schema.sequencePlaybackClock`과 `sequenceClockSettings`/`sequenceClockDelta`/`sequenceClockMarkup`의 정확한 소유자를 조회해요. 기존 `document.patch`의 expectedRevision·dryRun·Undo·저장을 그대로 써요. 새 서버·타이머·워커·GPU 버퍼를 추가하지 않아요.

1877의 새 읽기는 [Epic EUpdateClockSource, UE5.8](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/MovieScene/EUpdateClockSource?lang=en-US)의 전체 enum·값 설명, [Unity DirectorUpdateMode, 6000.7 beta](https://docs.unity.com/en-us/engine/6000.7/script-reference/unityengine/playables/directorupdatemode)의 Definition·Fields, [Unity PlayableDirector.Evaluate, 6000.0](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Playables.PlayableDirector.Evaluate.html)의 선언·Description이에요. 게임/비배율/수동 평가와 프레임 유지 방식을 대조했어요. HB의 프레임 유지 시간은 활성 VM delta 기준이며 Epic의 전역 플랫폼 시계와 동일하다고 주장하지 않아요. 오디오/timecode/RTC/genlock 공급자, 개별 채널 시간 상속은 남겨요. 이번 읽기는 링크된 모든 API/본문 분석이나 전체 gate 승격이 아니에요.
