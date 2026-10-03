# 위젯·오디오·참조·계측 세부 대조

확인일: 2026-10-03. 이 기록은 아래 본문을 직접 읽고 적용한 범위다. 매뉴얼 목차에 포함된 모든 본문·API·패키지를 읽거나 구현했다는 뜻이 아니다. 전체 누적 요구는 [전체 조사/구현 대조](REFERENCE_COVERAGE.md)에 유지한다. 사용자가 든 예시는 추가 요구이며 다른 분야나 세부 기능을 제외하는 경계가 아니다.

| 실제 확인한 본문 | 조작·실행 의미 | 이번 HB 구현 | 남은 세부 기능 |
|---|---|---|---|
| [Epic Unity 개발자를 위한 시스템·작업 흐름](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engines-systems-and-workflows-overview-for-unity-developers) | 편집 UI뿐 아니라 physics/AI/animation/framework/world/render/audio/UI가 연결된다. 본문의 비교 기준은 UE 5.5.4와 Unity 6 6000.0.30f1이다. | 기존 2D/3D 공용 런타임에 Widget/Audio 실행·참조 관리·계측을 연결했다. | Chaos/cloth/vehicle/destruction, ability/network, smart objects/Mass/StateTree, rig/bone blend, world partition/PCG/water, GI/Nanite 등은 아직 미구현이다. 이름만 등록하지 않는다. |
| [Epic UMG Anchors](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-anchors-in-unreal-engine-ui) | 고정/늘이기 앵커의 offsets 의미, 정렬, 화면 크기 변화, 중첩 canvas | normalized anchors·고정 x/y/width/height·늘이기 여백·alignment·해상도/scale·프리셋과 실제 DOM resize | safe zone·DPI 곡선·장치별 profile·세계 공간 위젯·복합 위젯 클래스 |
| [Unity UI Builder 계층 조작](https://docs.unity3d.com/6000.0/Documentation/Manual/UIB-structuring-ui-elements.html) | 팔레트/계층 드롭·부모/순서·선택 속성·복사/잘라내기/붙여넣기/복제/삭제·문맥 메뉴 | 전용 위젯 문서·14종 팔레트·계층 재부모화·캔버스 이동/크기·Ctrl C/X/V/D/Delete·하위 트리 JSON 복사·Undo/저장 | UXML/USS 호환·읽기 전용 내부 shadow tree·재사용 template·스타일 자산·속성 기본값 표시·캔버스 텍스트 인라인 편집 |
| [Unity Audio Mixer](https://docs.unity3d.com/6000.0/Documentation/Manual/AudioMixerOverview.html) | source 감쇠와 mixer bus 분리, 계층 routing, Mute/Solo/Bypass, 실제 meter, snapshot과 노출 파라미터 | 독립 mixer·Master/Music/SFX/UI·사용자 bus·실제 gain/filter/compressor chain·RMS·snapshot capture/apply/rename·Source→bus·preview | FX 순서 편집·send/return·reverb/delay/sidechain·pitch bus·native DSP·voice priority/가상화 |
| [Unity AudioMixer.SetFloat API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Audio.AudioMixer.SetFloat.html) | 노출 이름으로 수정, 실패 반환, SetFloat 이후 snapshot과 수동 값 관계 및 ClearFloat | HB Set/Get/ClearFloat·snapshot transition·범위/존재 검증·명시적 override는 Clear까지 유지·BP/C++ 공용 서비스 | 여러 snapshot 가중 혼합·전환 보간 곡선·모든 mixer API·native 오디오 스레드 수명 |
| [Epic Reference Viewer](https://dev.epicgames.com/documentation/en-us/unreal-engine/reference-viewer-in-unreal-engine) | incoming/outgoing·별도 깊이/너비·필터 중간 연결 유지·재중심/뒤로·pan/zoom·키·경로 복사/내보내기 | 양방향 graph·별도 depth·bounded breadth·순환/누락/중복 처리·창 자체 history·RMB/MMB pan/Ctrl wheel/F/Ctrl F/R/D/L·타입/검색 dim·경로 복사/CSV | hard/soft/management reference 구분·AssetManager bundle·여러 root·SizeMap/cooked size·collection·모든 키/필터 |
| [Unity CPU Profiler](https://docs.unity3d.com/6000.0/Documentation/Manual/ProfilerCPU.html) | frame 선택·live·timeline/hierarchy·구간별 비용과 스레드/flow·호출·자기 시간의 차이 | bounded 300프레임·실제 elapsed wall time·BP/물리/AI/animation·C++ IPC·render submission·draw/triangle/resource 개수·집계/검색/JSON·AI 조회/기록 | 현재 시간은 CPU exclusive/GPU duration이 아니다. native thread/flow·allocation·memory/file/network·GPU timer/query·장치 연결이 남아 있다. |
| [Unity Sprite Renderer](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/renderer/sprite-renderer-reference.html), [drawMode API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteRenderer-drawMode.html), [9-slicing](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/9-slice/9-slicing.html) | Simple/Sliced/Tiled, corner 보존과 edge/center stretch/repeat, border·sorting·mask·continuous/adaptive 차이 | border[left,bottom,right,top]·편집/가이드·실제 9분할 GPU geometry·continuous repeat와 마지막 UV crop·작은 목표 크기·atlas/Pivot/Flip 유지 | Adaptive threshold·SpriteMask·SortingLayer·2D light/material·physics shape 자동 갱신·2D skeletal animation |

## 실제 연결과 검증

- `.hbwidget.json`: 14종 타입, 단일 Canvas root, 안정 ID/고유 이름, 부모/slot/properties/events/bindings. 최대 256개/깊이 32, 순환·중복·값 범위·파일 경로를 공통 validator로 검사한다. UI와 AI는 같은 add/duplicate/remove/reparent 함수를 사용한다.
- WidgetSystem: 소유자별 32개 인스턴스, 256개 이벤트 큐, 소유 BP custom event, 변수 name/ID 바인딩, 부모 disabled 상속, 현재 TextInput submit/CheckBox click 값, 실제 포커스·DOM disabled·숨김·resize·종료 정리. 재사용 위젯/지역화/애니메이션 등은 별도 남은 구현이다.
- AudioMixer: 64 bus/snapshot·128 exposed 제한, 계층/명칭/스냅샷 검증, source별 동일 clip 동시 재생, 실행 중 volume, 비활성화와 Stop 이후 늦은 play 정리. 실제 WebAudio HRTF/inverse distance로 실행하며 공간 소리의 모든 Unity/UE 옵션을 구현한 것은 아니다.
- `Game.hpp` 선언 → 자동 BP 핀 생성 → `Bridge.hpp` → 같은 JS 실행 서비스. UI 9개와 mixer 4개를 더해 정적 BP 457개, 공통 C++ 289코어+86실행 서비스다. 기존 생성 서비스 노드의 dispatch 누락도 공통 경로에서 수정했다.
- C++ getter는 전달 snapshot을 읽는다. 일부 setter는 호출 안의 로컬 snapshot도 갱신한다. Show/Remove/Transition의 비동기 완료를 같은 호출에서 즉시 읽을 수 있다고 가정하지 않는다. 다음 런타임 상태로 확인한다.
- `test:ui-audio`: 계층/앵커/바인딩·실제 BP 호출·C++ `-Wall -Wextra -Werror` 컴파일/반환/명령 적용·snapshot override·참조 cycle/redirect·bounded elapsed frame·오디오 소스 수명.
- `prototype/tests/ui-audio.html`: 실제 DOM 버튼→BP custom event→변수, TextInput submit/CheckBox click/부모 disabled, 실제 PannerNode/listener, OfflineAudioContext PCM. −6dB 측정 비율 0.5011869, Mute/Solo 신호 0, 8kHz 입력의 500Hz lowpass RMS 0.0022901(원신호 0.7202839), 실제 Bypass RMS 0.7071176. 2D Sliced의 GPU 모서리/중앙 픽셀과 Tiled 분할도 검사했다.
- `tools/check-ui-audio-editor.mjs URL`: `authoring-qa`에서만 변경한다. revision/dryRun·실패 원자성·subtree 복제/삭제·Undo/Redo·디스크 저장·실제 registry·게임 실행 프레임과 render 통계. 사용자 프로젝트/미저장 탭은 수정하지 않는다.
- 실제 mixer GUI에서 −6dB 편집·snapshot·클립 preview·Music/Master RMS를 확인했다. 참조 창에서 오디오 파일→mixer/clip 그래프와 재중심→창 자체 뒤로·타입 필터 유지도 확인했다. toolbar icon과 콘텐츠 목록이 보이는 기본 분할 높이를 함께 수정했다.

## 모든 분야에 적용할 세부 판정

기능명 하나는 완료 단위가 아니다. 각 분야에서 실제 본문·API를 더 읽고 누락 항목을 확장한다. 생성/임포트 → 필드/자료형/기본값 → 문맥 메뉴/단축키/drag → 참조/상속/연결 → 저장/재열기/호환 → 실행 단계/수명/취소 → BP/C++ → AI schema/명령/Undo → 오류 복구/측정/타깃의 연결을 확인한다. 모든 세부 사항의 조사·구현·검증이 끝났다는 상태로 표시하지 않는다.

이 기준은 프로젝트/에셋·편집기·2D/2.5D/3D·world/render/material/light·physics/input/framework·AI·animation/VFX·UI/audio/media·build/profiling/debug·network/XR/platform/package/production pipeline 전 영역에 적용한다. 이번 변경이 끝나도 전체 확장 요구는 끝나지 않는다.
