# 공용 타임라인 조작·실행 추적 · 2026-10-05

## 실제로 읽은 근거와 경계

[Unity6000.0 Use the Animation view](https://docs.unity3d.com/6000.0/Documentation/Manual/animeditor-UsingAnimationEditor.html)의 기술 본문127–243을 읽었어요. 선택 대상·속성/키·Dopesheet/Curves·선택/전체 맞춤·재생과 시간/프레임·이전/다음/처음/끝·Comma/Period/Alt·창 잠금/색 설정을 대조했어요. [AnimationWindow](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationWindow.html)는 자체 Description243–248과8개 속성 요약258–265만 읽었어요. [time](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationWindow-time.html), [frame](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationWindow-frame.html), [previewing](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationWindow-previewing.html), [playing](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationWindow-playing.html)는 각 자체 선언233·Description239·관련 설명242를 읽었어요. 미리보기/재생의 관계와 시간/프레임 playhead를 확인했어요.

[Epic5.8 Animation Sequence Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sequence-editor-in-unreal-engine)의 기술 본문0–177을 읽었어요. 선택 항목에 따른 상세 패널, 별도 preview 장면, Skeleton Tree/Browser·이전/다음·새 창/탐색기, reimport/export/compression·data model/controller/meta·additive/root motion·가져오기 설정을 대조했어요. 모든 이미지/영상, 각 연결 API/문서·Unity 상속 멤버는 미독이에요. 새 발견인 압축/프레임 제거·모델/컨트롤러/메타/공유 Skeleton·기록/곡선 선택·잠금/색 설정도 누적 후속 대상에 포함해요.

7개 HTTP 응답/원문/SHA와 경계는 `native/build/animation-editor-docs-uTk8GW/manifest.json`에 있어요. 수집만으로 본문 읽기/독립 검증/전체 corpus gate를 승격하지 않아요. 이 문서는 HBEngine 자체 계약과 확인한 근거를 구분해요.

## 현재 공용 제작·디버그 계약

몽타주와 레벨 시퀀스는 같은 조작 코드를 사용해요. 이전/다음 프레임·처음/끝·재생/일시정지, 초/프레임 입력·눈금, 타임라인 빈 공간/눈금 클릭 및 드래그 스크럽을 제공해요. 프레임 이동은 그리드의 바로 이전/다음 위치로 이동해요. 시퀀스는 에셋 fps, 몽타주는 현재60Hz 제작 그리드를 사용하며 가져온 클립의 실제 샘플률로 표현하지 않아요. 프레임 입력은 초로 변환해 길이 안으로 제한하고 표시/눈금은 반올림해요. 숫자 입력은 유한한 값만 허용해요.

타임라인/재생 조작에 포커스가 있을 때 Comma/Period는 이전/다음 프레임, Alt 조합은 키/섹션/Notify/클립 경계로 이동해요. Home/End는 처음/끝, Space는 미리보기 재생/정지예요. 텍스트·숫자 입력/조합/다른 창 단축키는 해당 로컬 조작으로 가로채지 않아요. 큰 유효 키 목록은 Math.min/max 인자 개수 한도로 실패하지 않아요. 스크럽은 미리보기를 멈추며 반복 재생은 넘어간 시간을 보존해요. 비반복 종료는 마지막 시간에서 멈추고 버튼 상태를 갱신해요.

주황 미리보기 재생선/입력과 녹색 실행선/읽기 전용 시간·프레임·일시정지 표시는 독립적이에요. 실행 추적은 게임의 시간/포즈/저장 에셋/Undo를 바꾸지 않아요. 별도 preview 장면은 실제 게임 포즈의 복제/동일 재현으로 표현하지 않아요. 몽타주는 실행 대상/그룹, 시퀀스는 실제 에셋/소유 Actor를 기준으로 조회해요. 컴포넌트 없이 C++/BP로 시작한 시퀀스도 `gameplayDebug.sequence.asset/time/paused`로 식별해요. 중지하면 실행선만 숨기고 편집 시간을 보존해요. 공통 프레임 루프는 현재 에셋뿐 아니라 표시/분리된 에셋 편집기도 갱신해요.

AI schema는 시간·그리드·단축키·진단을 공개하고 사람이 쓰는 동일 문서/실행 상태를 제공해요. 신규 의존성·타이머/실행기·BP 노드를 추가하지 않아요. 현재 BP566/API289개예요.

## 검사와 다음 세부

`node tools/check-gameplay-timeline.mjs`는 유한/범위 입력·30/60fps·경계·256×1024키·종료/반복·미리보기 독립 시간을 검사해요. DOM/실제 EXE의 근거로 세지 않아요. 실제 창 검사는 `node tools/check-animation-graph-window.mjs --editor --montage`와 `node tools/check-animation-graph-window.mjs --montage`로 격리 프로젝트/프로필/포트에서 실행해요. 물리적 키/마우스·단위 전환·에셋 revision/data 보존, C++ 몽타주·시퀀스 Pause/Seek/Stop·실행선/편집선·원래 위치 복원·원본 바이트·종료/서버 정리를 확인하며 개별 결과/실패는 인계에 기록해요.

곡선 제작/자동 기록·키 다중 선택/확대/선택 맞춤·조작 재지정 전체, 공유 Skeleton/애니메이션 메타·몽타주 구간 알림/교체 혼합·압축/루트 모션/리타깃과 전체2D/렌더/월드/게임/C++/AI/UI/오디오/모바일/배포/가벼움 세부는 계속 구현해요. 전체 분석/전체 엔진 완료로 보고하지 않아요.
