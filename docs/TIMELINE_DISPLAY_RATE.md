# 시퀀스 분수 편집 격자

`sequenceasset.displayRate`는 선택적인 `{numerator,denominator}` 분수예요. 양의 int32 쌍, 1~240 FPS를 허용하고 공용 helper는 약분해 사용해요. 생략하면 기존 정수 `fps`를 그대로 따라요. `displayDropFrame`은 정확히 `30000/1001`, `60000/1001`에서만 켤 수 있어요.

사람은 시퀀스 왼쪽의 **편집 격자**에서 23.976·29.97·59.94 또는 직접 분수를 지정해요. 초·프레임·TC 표시, 프레임 이동, 눈금, 키·클립·하위 구간 드래그, 범위 핸들의 프레임 이동, 시퀀스 곡선 기본 베이크 간격이 같은 비율을 써요. Shift 드래그는 자유로운 초 단위 이동을 유지해요. 곡선의 여러 키를 옮길 때는 공통 이동량을 스냅해 상대 간격을 보존해요. 키 선택 후 곡선 열기는 소유 트랙으로 전환해 열어요.

값은 계속 초 단위로 저장해요. 격자 변경은 기존 키·클립·길이·배속을 재작성하지 않고, 엔진 FPS나 재생 시계를 고정하지 않아요. 녹화의 `recordingClock.rate`와 정수 기준 `fps`도 독립적이에요. 베이크의 명시적인 `fps` 입력은 기본 격자를 덮어쓰며, 선택한 범위의 시작을 기준으로 샘플링하고 끝점을 보존해요.

AI는 `schema.timelineDisplayRate`를 읽고 기존 `document.patch`의 expectedRevision·dryRun·Undo·저장을 사용해요. 예를 들어 `displayRate`에 `{"numerator":30000,"denominator":1001}`, `displayDropFrame`에 `true`를 지정해요. TC/프레임 보기 전환과 미리보기 이동은 문서 값을 수정하지 않아요. `sequence.curve.tool`의 bake도 fps를 생략하면 문서 격자를 사용해요. 소유자는 `timelineRate`, `timelineFrameAt`, `timelineRateMarkup`의 정확한 심볼 조회로 찾아요.

C++와 공용 BP에는 `hb::LevelSequence::SeekFrame`, `GetFrame`, `GetFrameRateNumerator`, `GetFrameRateDenominator`가 있어요. 재생 중인 시퀀스의 격자를 사용하고, getter는 실행 중인 시퀀스가 없으면 0을 돌려줘요. SeekFrame은 정수 프레임만 받고 마지막 부분 프레임만 문서 끝으로 제한해요. 범위를 벗어난 요청은 위치를 바꾸지 않아요. GetFrame은 가장 가까운 프레임 번호예요. 기존 C++ 명령 적용과 스냅샷 조회의 프레임 장벽 규칙은 같아요.

DF 표기는 라벨만 건너뛰며 재생·키·프레임을 버리지 않아요. 29.97의 17982프레임은 `00:10:00;00`, 107892프레임은 `01:00:00;00`이고, 존재하지 않는 `00:01:00;00`은 거절해요. NDF는 가장 가까운 정수 명목 프레임률로 표시해요.

1871–1873의 계산·회귀와 실제 편집기·C++ 실행 근거, 최종 설치 검사는 WORK1873 및 USER_INSTALL1875를 따라요. Custom/PlayEveryFrame·외부 timecode/genlock·개별 채널 시간 상속·정수 tick 저장소 전환은 별도예요.

이번 새 읽기는 [Epic Sequencer Time Refactor Technical Notes, UE4.27](https://dev.epicgames.com/documentation/unreal-engine/sequencer-time-refactor-technical-notes?application_version=4.27)의 DisplayRate/TickResolution, 분수 FFrameRate, 평가 종류와 타입 이관 설명, [Unity Timeline Options, 1.8.4](https://docs.unity.cn/Packages/com.unity.timeline@1.8/manual/tl-options.html)의 단위·길이·마커·프레임률 설명이에요. 표시 프레임률과 실제 저장/평가 시계를 구분하는 근거로 사용했어요. HBEngine은 초 단위 저장을 유지하며 두 엔진의 tick 저장소·프레임 잠금과 동일하다고 주장하지 않아요. 전체 본문/API 분석 gate는 승격하지 않아요.
