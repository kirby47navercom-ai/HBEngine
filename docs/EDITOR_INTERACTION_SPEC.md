# HBEngine 편집기 인터랙션 기준

공식 자료와 설계 이유는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md), 전체 분야/세부 본문 조사 상태는 [조사 범위](REFERENCE_COVERAGE.md)에 있다. 아래 표는 **HB의 동작 계약**이며 모두 현재 구현됐다는 뜻은 아니다. 구현/검사는 마지막 표에 연결하고 입력 처리 코드를 이 계약에 맞춘다.

## 공통 규칙

1. 포커스한 창의 문맥 명령만 실행한다. 저장·Undo 등의 전역 명령과 텍스트 입력의 기본 동작을 구분한다. `input/textarea/contenteditable` 및 IME 조합은 문자 편집을 우선한다.
2. 버튼은 이름·상태·단축키 툴팁을 갖고 키보드로 접근 가능해야 한다. 입력 오류는 해당 필드에 표시하며 기존 유효 값을 보존한다.
3. 작업 화면의 제목·노드·핀·탭·카드·툴바에서는 브라우저 글자 선택이 일어나지 않는다. 코드·검색·일반 입력칸에서는 선택·복사가 가능하다.
4. 한 드래그·여러 선택 대상의 일괄 편집·한 명령은 Undo 한 단계다. 취소/실패는 기록이나 원본을 오염시키지 않는다.
5. 도움말은 F1/도움말 메뉴로 연다. 긴 안내문·기능 약속·개발 구현 설명을 상시 작업 화면에 넣지 않는다. 오류와 빈 검색 결과는 필요한 상태로 표시한다.
6. 미구현 명령을 성공한 것처럼 처리하지 않는다. 실행 중 편집할 수 없는 속성은 명확히 비활성화한다.

## 엔진 시작과 프로젝트

프로젝트의 생성/열기 근거와 WebView2 수명·배포 조건은 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md#엔진-실행-프로젝트-파일-데스크톱-배포)에 있다. 현재 Windows x64 EXE는 Win32 창 안의 WebView2에서 편집기를 표시한다. 렌더링은 Three/WebGL이다.

| 입력/상태 | HB 동작 | 검증 조건 |
| --- | --- | --- |
| HBEngine.exe 무인자 실행 | 최근·새 프로젝트·찾아 열기 허브 | 설치된 전역 Node/npm 없이 동봉 런타임 사용; WebView2 Runtime 필요 |
| `.hbproject` 더블클릭/EXE로 드롭/인자 | descriptor를 검증하고 해당 프로젝트 열기 | 한글·공백·다른 작업 폴더; 잘못된 파일/버전/상대 경로 거부 |
| 최초 일반 실행 / `--register` | 현재 사용자 HKCU에 파일 열기·아이콘 연결 | EXE 위치가 바뀌면 다시 등록; 관리자 권한 없이 동작 |
| 새 프로젝트 | 이름·부모 폴더 → 새 폴더/예제 에셋/소스/descriptor → 편집기 | 이름 오류/같은 폴더 거부; 기존 파일을 덮어쓰지 않음 |
| 찾기/최근 클릭 | 실제 `.hbproject`를 열고 최근 목록 갱신 | 실패 시 현재 선택 유지; 없는/비호환 프로젝트는 최근 목록에서 제외 |
| 편집기 진입 | 세션 UUID·시작 에셋과 프로젝트 디스크 상태를 읽은 뒤 복구/배치/Project 폴더/SaveGame 로드 | 다른 프로젝트와 저장 키 분리; 같은 프로젝트의 허브/직접 실행 origin 차이에도 복원; QuietGarden 기존 복구는 한 번만 이관 |
| 프로젝트 전환 | pending 상태 변경을 디스크에 반영한 뒤 다른 프로젝트 선택 | 저장 실패 시 기존 상태 보호; 늦게 도착한 파일 쓰기/빌드가 새 프로젝트를 수정하지 않음 |
| Windows 닫기/Alt+F4 | Play 종료 → 수정 문서 저장/저장 안 함/취소 → 복구/디스크 저장 완료 → 창 종료 | 취소·저장/복구 실패 시 창 유지; 소유 서버와 C++ worker 정리 |

`controller.Close`는 `beforeunload`를 발생시키지 않으므로 네이티브 닫기는 `hbEngineRequestClose`와 웹메시지를 통해 편집기의 결정을 기다린다. 생성 중/닫는 중 비동기 콜백이 늦게 와도 종료한 HWND를 재사용하지 않는다. EXE smoke는 WebView2 탐색 이후 JS 준비 메시지·실제 닫기 핸들러/메시지·프로젝트 경로·종료 후 서버 정리를 검사하며 수정/저장/취소 화면 시나리오는 따로 확인한다.

복구·배치·Project 폴더·SaveGame은 `/api/storage`를 통해 프로젝트의 `Saved/Editor/storage.json`에 UUID별 변경 키를 반영한다. 브라우저 localStorage는 기존 백업·복원 경로를 유지한다. 같은 프로젝트를 허브 창과 직접 열기 창에서 동시에 열 수 있으나 에셋 파일의 동시 편집 충돌 감지·병합은 미지원이다.

현재 생성은 기본 예제 한 종류다. 템플릿 선택·프로젝트 설정/업그레이드/백업·여러 엔진 버전 선택은 남아 있다.

## 창과 배치

위쪽 파일 탭은 BP/Material/Animation/입력/레벨 등 **에셋 문서 선택**이고, 작업 영역 안의 탭은 해당 문서의 **그래프/컴포넌트 뷰포트/Timeline/Project/Console 배치**다. 문서마다 모델·선택·Undo·dirty·배치를 보존한다. 서로 다른 BP 파일에 한 그래프를 재사용해 내용을 바꾸면 안 된다. C++는 콘텐츠에서 열 때 외부 Visual Studio/VSCode로 보내며 BP 화면에 코드 편집기를 겹쳐 넣지 않는다.

| 입력 | HB 동작 | 검증 조건 |
| --- | --- | --- |
| 탭 좌클릭 | 해당 문서 활성화와 문맥 포커스 | 다른 열린 문서의 편집 값 유지 |
| 파일 탭 중간 클릭/닫기, Ctrl+W | 해당 문서 닫기 | 수정된 파일은 저장/저장 안 함/취소; 저장 실패 시 열린 편집 유지 |
| Ctrl+Tab / Ctrl+Shift+Tab | 다음/이전 파일 문서 | 각 문서의 선택·Undo·배치 보존 |
| Ctrl+S / Ctrl+Shift+S | 현재 문서/수정 문서 모두 저장 | 성공한 파일만 dirty 해제; 저장 중 추가 변경 보존 |
| 탭 드래그 | 가운데는 탭 이동, 가장자리는 상하좌우 분할 | 미리보기 위치와 실제 위치 일치 |
| 탭 더블클릭 | 작업 영역 최대화/복원 | 다른 창 크기·활성 탭 복원 |
| 탭 우클릭 | 분할·닫기·최대화·별도 창으로 분리 | 마지막 필수 창을 닫아 복구 불가능하지 않음; 분리 시 같은 문서/DOM 유지 |
| 분할 경계 드래그/방향키 | 두 영역 크기 조절 | 최소 크기·키보드 포커스 유지 |
| 창 메뉴 | 닫힌 창 열기, 새 뷰포트/콘텐츠 브라우저, 현재 창/아웃라이너/속성 분리, 모두 합치기, 배치 초기화 | 여러 뷰포트가 독립 카메라·보기 설정 사용; 별도 HWND에서 선택/속성/저장 공유 |
| 분리 창 닫기/합치기 | 기존 도킹 위치로 원본 패널 복귀 | 문서·Undo·선택·WebGL context 유지; 자식 입력/예약 정리 |
| 종료/재열기 | 저장한 배치 복원 | 알 수 없는/삭제된 문서는 나머지 배치를 보존하며 제외 |

## 그래프

[Epic 그래프 조작](https://dev.epicgames.com/documentation/unreal-engine/graph-editor-for-the-blueprints-visual-scripting-editor-in-unreal-engine), [단축키](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine)를 기반으로 한다.

| 입력 | HB 동작 |
| --- | --- |
| 빈 공간 RMB 짧은 클릭 | 위치 기준 노드 검색 메뉴, 검색칸 포커스 |
| RMB/MMB 드래그 | 그래프 이동; 마우스 이동 임계값을 넘으면 메뉴 안 열림 |
| 휠 | 커서 위치 기준 확대/축소; 기본 최대 100% |
| Ctrl+휠 | 100% 이상 확대 허용 |
| Shift+휠 | 가로 이동 |
| LMB 노드/제목 드래그 | 선택/선택한 노드 그룹 이동 |
| 빈 공간 LMB 드래그 | 영역 선택 |
| Shift/Ctrl 선택 | 추가/토글 선택; 사각 선택에도 같은 규칙 적용 |
| Home | 선택/전체 초점 |
| Page Down / Page Up | 선택 노드의 자식 그래프 / 부모 그래프로 이동; 현재 HB 함수/매크로의 부모는 Event Graph |
| Ctrl+B | 현재 에셋의 콘텐츠 폴더와 파일 위치 찾기 |
| Ctrl+A, Delete/Backspace | 현재 그래프 전체 선택, 선택 삭제 |
| Ctrl+C/X/V/D | 복사/잘라내기/붙여넣기/복제; ID 갱신과 내부 연결 보존 |
| Ctrl+Z/Y, Ctrl+Shift+Z | Undo/Redo |
| C | 선택을 감싸는 주석; 색·제목·크기·그룹 이동 |
| B/D/S/G/F/M/N/O/P 누른 채 클릭 | Branch/Delay/Sequence/Gate/ForEach/MultiGate/DoN/DoOnce/BeginPlay |
| Ctrl/Alt 변수 드래그 | Get/Set 배치 |
| 핀 드래그 | 호환 타입만 연결; 빈 공간 드롭은 호환 노드 검색 |
| 핀 Alt+클릭, Ctrl+드래그 | 해당 연결 해제, 연결 이동 |
| 핀 RMB | 구조체 분할/합치기, 변수 승격, 관찰, 연결 해제 |
| 선 더블클릭 | 타입 보존 Reroute 배치 |
| Ctrl+F / Ctrl+Shift+F | 현재 BP / 프로젝트 범위 검색 |
| F7 / F9 / Ctrl+Shift+F9 | 그래프 컴파일·검증 / 중단점 토글 / 전체 해제 |
| 함수/매크로/Timeline 더블클릭 | 해당 내부 그래프/전용 문서 열기 |

접근 범위·배열·기본값·순수 여부·입출력·카테고리·상속·컴포넌트 속성은 오른쪽 Inspector에서 편집한다. 이벤트 노드에는 편집 대상인 이벤트 이름/입력 액션/설정이 있으면 제공한다. 선택한 실행 중 객체의 값과 에셋 기본값은 구분한다.

## 뷰포트와 Hierarchy

[Unity 카메라 조작](https://docs.unity3d.com/6000.0/Documentation/Manual/SceneViewNavigation.html)과 [Epic 뷰포트](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-controls-in-unreal-engine)의 조작을 비교하고, 2026-10-03에는 Unreal 원근/직교 조작을 공통 입력 모듈로 연결했다. 실제 본문 확인 범위와 수학/플랫폼 검사의 차이는 [뷰포트 연구](VIEWPORT_CONTROLS_RESEARCH.md)에 있다.

| 입력 | HB 동작 |
| --- | --- |
| LMB / Ctrl·Shift LMB | 선택 / 토글·범위 다중 선택 |
| 원근 RMB 드래그 / LMB 드래그 | 제자리 시선 회전 / 지면 방향 이동·수평 회전; 짧은 클릭과 구분 |
| MMB 또는 LMB+RMB 드래그 | 원근 Pan; 직교 MMB/RMB는 화면 평면 Pan |
| 휠 / RMB+휠 | 원근 전후 이동·직교 커서 중심 확대 / 원근 비행 속도 변경 |
| Alt+LMB/MMB/RMB | 원근 초점 주위 Orbit/Pan/Dolly; 직교는 Pan/Zoom |
| RMB+WASD/QE, Shift | 3D Fly와 HB의 4배 빠른 이동; 문자 입력 중에는 무시 |
| RMB+R/F 또는 Z/C | 카메라 로컬 위아래 이동 / FOV 조절 후 RMB 해제 시 복귀 |
| 직교 LMB/Shift+LMB/Ctrl+RMB 드래그 | 범위 선택 교체/추가/제거 |
| Q/W/E/R, Space | 선택/이동/회전/크기, 도구 순환 |
| F | 선택 대상에 초점; Inspector 입력칸에서는 문자 |
| 방향 축 위젯·뷰 선택 | 원근·2D XY·Top/Bottom/Front/Back/Left/Right 전환; 카메라 회전으로 축 위치 갱신 |
| Ctrl+0~9 / 0~9 | 카메라 북마크 저장/복원; 같은 방향 복원도 Actor 조종 종료 |
| Ctrl+L·포인터 이동 / Ctrl+Shift+L | 첫 번째/두 번째 대기 태양광 회전; 한 조작 Undo·Scene 저장 |
| G / Ctrl+R / F11 | Game View / Realtime / Immersive |
| Alt+G/H/J/K / Alt+1/2/4/5/6 | 원근/상단/정면/왼쪽 / Wireframe/Unlit/Lit/DetailLighting/LightingOnly |
| End / V / Alt+MMB | 선택 바닥 맞춤 / 정점 스냅 보조 / 임시 피벗 위치 |
| Ctrl+D / Delete / F2 | 오브젝트 복제 / 삭제 / 이름 변경 |
| Hierarchy 드래그 | 부모/순서 변경; 순환 검사·월드 위치 유지 |
| 눈/선택 잠금 | 편집 뷰포트 표시/선택 가능 변경; 게임 활성과 구분 |
| Transform 값·스냅 | 단위 표시, Local/World, 이동/회전/크기 스냅 |

뷰포트 카메라와 게임 카메라는 별개다. 2D XY, Top XZ, Front XY, Side YZ를 구분하고 각 뷰포트의 조작·기즈모·렌더 모드를 보존한다. RMB 비행 중 W/E/R/F는 카메라 입력이 먼저 소비한다. Play 중 편집 카메라 조작은 비활성화한다. 카메라 생성/정렬/조종은 Camera의 `fieldOfView/near/far/projection/orthographicSize`와 실제 월드 자세를 사용한다. 선택 초점·방향 변경·북마크는 조종을 먼저 종료해 Camera Actor를 의도치 않게 옮기지 않는다. 기존 4~28 거리 제한과 지면 위 반구 제한을 적용하지 않으며 큰 좌표 탐색과 월드 스트리밍 완료를 혼동하지 않는다.

## Project

[Unity Project](https://docs.unity3d.com/6000.0/Documentation/Manual/ProjectView.html)를 기준으로 실제 파일과 에셋 제작 흐름을 연결한다.

| 입력 | HB 동작 |
| --- | --- |
| 폴더 클릭/경로 버튼 | 실제 폴더로 이동, 현재 경로 표시 |
| 카드 LMB, Ctrl/Shift 클릭 | 하나/토글/연속 범위 선택 |
| Ctrl+A | 현재 결과 전체 선택 |
| Enter/더블클릭 | 폴더 열기 또는 에셋 전용 편집기 열기 |
| Backspace | 상위 폴더; 검색 입력칸에서는 글자 삭제 |
| F2 / RMB | 이름 변경 / 새 에셋·폴더·재가져오기·복제·삭제·위치 찾기 |
| Ctrl+F | Project 검색칸 포커스 |
| 검색 범위·타입·내용 | 현재/전체 폴더, 타입 OR, 다른 조건 AND; 텍스트 파일 내부 검색 |
| 외부 다중 파일/폴더 드롭 | 목적지 확인·원본 보존·실제 디스크 임포트 |
| 내부 에셋 드래그 | Scene 배치/컴포넌트 할당/핀 참조; 외부 임포트와 구분 |
| 여러 에셋 열기 | 각각 문서로 열기; 기존 문서를 임의로 덮어쓰지 않음 |

검색 결과는 파일명·경로·타입과 내용 검색의 일치 위치를 제공한다. 새로고침·서버 재시작 후에도 디스크의 같은 파일이 보여야 한다.

새 에셋 메뉴는 BP/C++ 부모 클래스 선택, Material, Transform Animation, Curve, Input Action, Input Mapping Context, Data, 레벨의 실제 파일 생성에 연결한다. 같은 이름의 파일을 덮지 않는다. IA는 자료형/Trigger/데드존/소비, IMC는 액션/키/축/배율/우선순위를 해당 에셋 전용 화면에서 편집한다. 타입이 다른 제작 도구를 BP 하나에 섞지 않는다. 이름 변경은 열린 문서/배치/참조를 갱신하고 디스크의 기존 참조는 영속 redirect로 유지한다.

## Timeline와 Animation

[Epic Timeline](https://dev.epicgames.com/documentation/en-us/unreal-engine/editing-timelines-in-unreal-engine), [Epic Keys](https://dev.epicgames.com/documentation/unreal-engine/keys-and-curves-in-unreal-engine), [Unity Curves](https://docs.unity3d.com/6000.0/Documentation/Manual/EditingCurves.html)에서 확인한 요구를 HB 규칙으로 고정한다.

| 입력 | HB 동작 |
| --- | --- |
| 트랙 추가 | Float/Vector/Color/Event, 고유 이름·출력 핀 생성 |
| 채널 선택 | XYZ/RGBA 표시·선택과 채널별 색 |
| 키 클릭/드래그 | 선택과 Time/Value 편집; 다중 키 상대 위치 유지 |
| Shift/Ctrl 클릭, 영역 선택 | 키 추가/토글 선택, 범위 선택 |
| Enter/RMB 추가, Delete | 현재 위치 키 추가, 선택 키 삭제 |
| 휠 / Ctrl+휠 / MMB·RMB 드래그 | 시간 확대 / 값 축 확대 / Pan |
| Home/A, F | 전체/선택 키 초점 |
| 보간 메뉴 | Auto/User/Break/Linear/Constant; 구간과 접선 저장·미리보기 일치 |
| 스크럽·Space·재생 버튼 | 시간 이동·재생/정지·역방향 미리보기 |
| 길이/Loop/Autoplay/Rate | 재생 의미에 적용; 마지막 키 길이 사용 옵션 |
| Undo/Redo·저장·재열기 | 키·트랙·설정과 연결 핀 보존 |

RMB 이동과 RMB 메뉴는 이동 임계값으로 구분한다. Event 트랙은 수치 커브가 없고 시간을 통과할 때 실행한다. BP Timeline의 Play/Reverse/Set New Time와 Clip/State Machine의 제어를 혼동하지 않는다.

독립 Transform Animation은 `Play Animation`/`Stop Animation` 노드의 대상에 연결한다. position/rotation/scale의 vec3 키 값을 대상 속성에 덮어쓰고 XYZ Euler degree 회전을 사용한다. 노드 Loop·에셋 Rate/마지막 키 길이/시간 배율 무시를 적용하며 정지는 현재 값을 유지한다. 모델 내장 클립은 같은 이름의 에셋보다 우선한다. BP Timeline의 Event 트랙 실행과 달리 독립 Animation의 이벤트 트랙·Skeletal/상태 머신은 아직 실행하지 않는다.

## 실행과 디버그

| 조작 | 검증 조건 |
| --- | --- |
| Play | 검증 성공한 그래프/네이티브 코드로 실행 월드 생성 |
| Pause/Continue | 시간·지연 작업·Timeline 정지/재개; 계속할 실행 순서 보존 |
| Step | 선택 실행 인스턴스의 다음 노드/한 프레임 명령을 구분 |
| Stop | EndPlay·타이머/구독/객체 정리 후 원래 편집 장면 복원 |
| 중단점/관찰 | 실제 계산 값·객체·스택·실행 위치 표시 |
| 컴파일 결과 클릭 | 그래프 노드/핀 또는 .h/.cpp의 실제 줄로 이동 |
| 게임 입력 | 게임 뷰 포커스 때만 받고 편집기 단축키 차단 |

## 구현자가 먼저 수행할 시나리오

- 그래프에서 이동·선택·복사·주석·검색 후 코드 입력칸에서 같은 키를 누른다. 입력이 훼손되지 않아야 한다.
- BP/Timeline/Scene/Project/Console을 상하좌우로 배치하고 최대화·복원·새로고침한다. 창과 파일이 유지되어야 한다.
- 여러 외부 파일을 가져오고 새 폴더에서 이름/타입/파일 내용으로 찾고 여러 개를 연다. 서버 재시작 후 같은 원본이 있어야 한다.
- C++ 공개 함수와 BP를 연결해 실제 객체를 이동하고 C++ 이벤트로 BP를 호출한다. 컴파일 오류·잘못된 객체·반환 타입은 위치와 함께 실패해야 한다.
- BeginPlay → 함수 → Sequence/Loop → Delay/Timeline → EndPlay를 실행하고 중간에 중단점에서 멈췄다가 이어간다. Stop 후 편집 값이 복원되어야 한다.
- 작은 화면에서 툴바가 여러 줄이 되어도 그래프·커브·입력칸·메뉴를 조작할 수 있어야 한다. 작업 영역을 최소 크기 이하로 줄일 때 스크롤/최대화 경로가 있어야 한다.

## 현재 구현과 검증 범위

| 영역 | 구현/검증 | 아직 목표인 항목 |
| --- | --- | --- |
| 시작/프로젝트 | Win32/WebView2 EXE·Node 동봉·허브·`.hbproject`·최근·생성/열기·파일 연결·실제 EXE 탐색/종료 smoke | 템플릿 선택·프로젝트 설정/업그레이드·설치/업데이트·모든 닫기 화면 시나리오 |
| 창 | 파일별 문서·배치/Undo·분할/최대화; 실제 별도 HWND·원본 DOM/context 이동·아웃라이너/속성/검색/저장·닫기 복귀 검사 | 명명 레이아웃 import/export·분리 창끼리 직접 도킹·재실행 시 분리 창 일괄 재생성·창 전체 키 접근 검사 |
| 그래프 | 다중/사각 선택·RMB/MMB 이동·확대·주석·핀·추출·빠른 생성키·부모/자식 이동·Ctrl+B·타입/저장 검사 | Shift휠·변수 드래그·Ctrl 핀 이동·선 더블클릭·북마크/정렬 전체 프로필 |
| Project | 실제 폴더·다중 가져오기/선택/문서·우클릭 에셋/클래스 생성·이름 변경/영속 redirect·단일 타입 필터·파일 내용/하위 검색 | OR 타입/라벨 필터·즐겨찾기·재임포트·의존성 viewer/외부 감시·일괄 이름 변경 |
| Timeline/Animation | 전용 문서·키 선택/시간/보간 편집·4종 트랙·접선·BP 실행 이벤트; 독립 Curve/Transform Animation 키 저장·미리보기·대상 Transform 재생/정지 | Curve 파일의 BP 참조·임의 속성/Animation 이벤트 트랙·Skeletal/상태 머신 |
| Play/C++ | 실제 빌드/호출/이벤트/상태·Stop 복원·다중 BP 파일 바인딩·입력 에셋 실행·외부 IDE 열기 | 실행 객체 선택·Step Into/Out·프레임 명령·native 파일/줄 진단·IDE 프로젝트 생성 |
| 저장 | 문서별 모델/Undo/dirty·프로젝트 UUID별 복구/도킹/폴더/SaveGame의 디스크 저장·localStorage 백업; 기본 프로젝트 1회 이관; Material/Animation/Curve/IA/IMC/Data 저장; 저장 실패/동시 변경 보존 | 형식 migration·전체 편집기/프로젝트 복구 화면 시나리오·동시 에셋 편집 충돌·삭제/의존성 복원 |
| 장면/뷰포트 | 다중 선택·계층/그룹·독립 카메라·Unreal 원근/직교 입력·축 위젯·북마크·보기/표시·Camera 생성/조종·표면/정점 스냅·환경 Actor | 동시 다중 Scene 월드·Terrain/Foliage/LOD/스트리밍·모든 변형/스냅의 전체 세부 조합 |
| 환경/표시 | 하늘·하늘광·구름·높이 안개 별도 컴포넌트; Ctrl+L·두 대기광원·Renderer별 PMREM·높이 shader·진단재질 삭제 cache 해제 | 행성 대기 LUT·volume raymarch·구름 자체 그림자·공간 volumetric fog·Lightmass/DF AO·전체 진단 버퍼 |
| 클래스 컴포넌트 | 부모 7종 템플릿·클래스별 컴포넌트 속성·Transform/기본 Mesh/충돌체 뷰포트 | 전체 컴포넌트 계층·Skeleton/카메라 preview·Possession/Character 이동 |
| 머테리얼 | 독립 그래프/표면 문서·색/스칼라 연결·preview·장면 적용 | HLSL/GPU 컴파일·Texture/UV/Normal·전체 그래프 조작·재질 함수/인스턴스 |

위 동작 표는 전체 목표 계약이다. 편집기 구현은 `app.js`, `asset-documents.js`, `asset-editor-ui.js`, `project-browser.js`, `dock-layout.js`에 있고 문서 격리/실패 보존·입력·클래스 생성·다중 BP·rename 재열기는 `test:assets`로 검사한다. 프로젝트/창은 `HBEngine.cpp`, `project-manifest.mjs`, `project-session.js`, `project-storage.mjs`, `serve.mjs`와 `test:launcher/test:session/test:desktop`에 연결된다. 화면 검증과 자동 검사 결과는 변경별 커밋 본문에 적는다. 남은 항목을 현재 도움말이나 성공 동작으로 표시하지 않는다. 화면 검증에는 실제 파일/입력을 사용하고 사용자 원본 장면을 덮어쓰지 않는다.

## 2026-10-02 사람을 위한 화면 정리

[Unreal 편집기 인터페이스](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-interface), [Unreal 프로젝트 브라우저](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-a-new-project-in-unreal-engine), [Unity Inspector](https://docs.unity3d.com/6000.0/Documentation/Manual/UsingTheInspector.html), [Unity Project 창](https://docs.unity3d.com/6000.0/Documentation/Manual/ProjectView.html)을 대조했다. 현재 문서의 도구와 선택 대상의 속성을 구별하고, 파일 탐색과 프로젝트 열기를 목록 중심으로 정리했다. 픽셀 수치는 HBEngine의 데스크톱 화면 검증으로 정한 값이며 공식 엔진의 규격이라고 주장하지 않는다.

- 프로젝트 허브: 이름/경로 검색 → 선택 → 열기. 더블클릭/Enter 열기와 위아래 이동을 제공한다. 새 프로젝트는 이름/위치만 입력하는 별도 대화상자에 둔다. 실패하면 입력과 선택을 유지하며 오류를 해당 창에 표시한다.
- 편집기: 로컬 Segoe UI/맑은 고딕 13px, 보조 정보 11–12px, 입력 30px, 중립 회색 패널과 파란 선택 상태를 사용한다. 파일 탭에는 종류별 아이콘/색과 수정 표시를 유지한다. 아이콘 버튼의 hover 이름/단축키와 키보드 포커스를 제공한다.
- 문서/선택: 연결된 C++가 있는 BP에서만 해당 헤더/빌드 도구를 보여준다. 실행은 공통 툴바에서 하고, BP의 한 단계 버튼은 중단점에서만 활성화한다. 카메라/광원에 머테리얼 입력을 보여주지 않는다. 햇빛/그림자는 환경에 두고 그림자 상태도 저장/Undo/문서 전환에 연결한다. 이전 장면에서 그림자 필드가 없으면 켜진 상태로 읽는다.
- 콘텐츠: 기본 목록에 확장자 포함 이름/타입/경로를 표시하고 타일로 전환할 수 있다. 기존 다중 선택/열기/우클릭/드래그를 재사용한다. 표시 방식은 프로젝트별 디스크 복구에 저장한다.
- 배치: 작은 화면의 새 문서/초기화는 상단 58%, 큰 화면은 68%로 시작한다. 사용자가 저장한 배치를 우선한다. 1280×720과 1440×900에서 가로 넘침, 필드/핀 잘림, 목록 영역, 선택/재개 상태를 확인한다.

자동 재현은 npm test, test:hub-ui, test:session, test:launcher, test:runtime, desktop:build, test:desktop을 사용한다. 시각 검증은 별도 검사 프로젝트에서 수행하며 사용자 QuietGarden의 원본/미저장 복구는 유지한다.


## 뷰포트·환경 Actor·독립 창 후속 대조 — 2026-10-04

[뷰포트 조사](VIEWPORT_CONTROLS_RESEARCH.md), [환경 Actor 조사](ENVIRONMENT_ACTORS_RESEARCH.md), [독립 창 조사](DETACHED_WINDOWS_RESEARCH.md)에 실제 읽은 공식 본문의 버전/범위와 데이터·입력·렌더·자원 수명·저장/복구를 연결했다. 상위 색인과 실제 본문 확인은 detail-audit.json에서 구분한다.

레벨·추가 뷰포트와 모델/BP 컴포넌트/머테리얼/트랜스폼 애니메이션/몽타주·시퀀스/메시 충돌 미리보기의 카메라 입력을 공유한다. 2D의 XY/직교 조작과 3D의 RMB 비행·Alt 탐색을 유지한다. 방향 위젯·카메라 생성/조종/정렬·fieldOfView/near/far·10개 북마크·보기/표시·스냅/피벗과 환경 Actor가 같은 Scene/Undo/API를 사용한다. AI의 잘못된 투영·클립·입력 설정은 현재 카메라와 조종 상태를 보존한다.

각 HWND는 실제 원본 패널을 표시하며 같은 문서·선택·Undo·저장을 공유한다. Outliner/Inspector 포커스는 편집 중 입력 DOM을 교체하지 않는다. 모든 살아 있는 창의 frame 예약과 입력 ownerDocument를 관리한다. 별도 WebGL renderer마다 PMREM을 소유하고 진단용 재질 사본은 Scene에서 원본 참조가 사라질 때 해제한다.

행성 대기 LUT·volume 구름 raymarch/그림자·공간 volumetric fog·Lightmass/DF AO·전체 진단 buffer·분리 창 간 직접 도킹/명명 배치 import/export·세계 스트리밍과 나머지 엔진 분야는 별도 세부 계약으로 유지한다. 현재 구름은 mesh 미리보기다. 위 항목의 구현으로 전체 Unreal/Unity 기능을 완료 처리하지 않는다.
