# HBEngine 편집기 인터랙션 기준

공식 자료와 설계 이유는 [엔진 분석](ENGINE_REFERENCE_ANALYSIS.md)에 있다. 아래 표는 **HB의 동작 계약**이며 모두 현재 구현됐다는 뜻은 아니다. 구현/검사는 같은 표에 연결하고 입력 처리 코드를 이 계약에 맞춘다.

## 공통 규칙

1. 포커스한 창의 문맥 명령만 실행한다. 저장·Undo 등의 전역 명령과 텍스트 입력의 기본 동작을 구분한다. `input/textarea/contenteditable` 및 IME 조합은 문자 편집을 우선한다.
2. 버튼은 이름·상태·단축키 툴팁을 갖고 키보드로 접근 가능해야 한다. 입력 오류는 해당 필드에 표시하며 기존 유효 값을 보존한다.
3. 작업 화면의 제목·노드·핀·탭·카드·툴바에서는 브라우저 글자 선택이 일어나지 않는다. 코드·검색·일반 입력칸에서는 선택·복사가 가능하다.
4. 한 드래그·여러 선택 대상의 일괄 편집·한 명령은 Undo 한 단계다. 취소/실패는 기록이나 원본을 오염시키지 않는다.
5. 도움말은 F1/도움말 메뉴로 연다. 긴 안내문·기능 약속·개발 구현 설명을 상시 작업 화면에 넣지 않는다. 오류와 빈 검색 결과는 필요한 상태로 표시한다.
6. 미구현 명령을 성공한 것처럼 처리하지 않는다. 실행 중 편집할 수 없는 속성은 명확히 비활성화한다.

## 창과 배치

| 입력 | HB 동작 | 검증 조건 |
| --- | --- | --- |
| 탭 좌클릭 | 해당 문서 활성화와 문맥 포커스 | 다른 열린 문서의 편집 값 유지 |
| 탭 드래그 | 가운데는 탭 이동, 가장자리는 상하좌우 분할 | 미리보기 위치와 실제 위치 일치 |
| 탭 더블클릭 | 작업 영역 최대화/복원 | 다른 창 크기·활성 탭 복원 |
| 탭 우클릭 | 분할·닫기·최대화 | 마지막 필수 창을 닫아 복구 불가능하지 않음 |
| 분할 경계 드래그/방향키 | 두 영역 크기 조절 | 최소 크기·키보드 포커스 유지 |
| 창 메뉴 | 닫힌 창 열기, 새 뷰포트, 레이아웃 초기화 | 여러 뷰포트가 독립 카메라 사용 |
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
| Home, Page Up/Down | 선택/전체 초점, 단계 확대/축소 |
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

[Unity 카메라 조작](https://docs.unity3d.com/6000.0/Documentation/Manual/SceneViewNavigation.html), [Epic 뷰포트](https://dev.epicgames.com/documentation/unreal-engine/viewport-controls-in-unreal-engine)를 비교한 HB 기본 프로필이다.

| 입력 | HB 동작 |
| --- | --- |
| LMB / Ctrl·Shift LMB | 선택 / 토글·범위 다중 선택 |
| MMB 드래그, 휠 | 카메라 Pan, 커서/관찰 대상 기준 Zoom |
| Alt+LMB | 3D Orbit; 2D에서는 Pan |
| RMB+WASD/QE, Shift | 3D Fly와 빠른 이동; 문자 입력 중에는 무시 |
| Q/W/E/R, Space | 선택/이동/회전/크기, 도구 순환 |
| F | 선택 대상에 초점; Inspector 입력칸에서는 문자 |
| 방향 기즈모·뷰 선택 | Perspective/Top/Front/Side, 직교·원근 전환 |
| Ctrl+D / Delete / F2 | 오브젝트 복제 / 삭제 / 이름 변경 |
| Hierarchy 드래그 | 부모/순서 변경; 순환 검사·월드 위치 유지 |
| 눈/선택 잠금 | 편집 뷰포트 표시/선택 가능 변경; 게임 활성과 구분 |
| Transform 값·스냅 | 단위 표시, Local/World, 이동/회전/크기 스냅 |

뷰포트 카메라와 게임 카메라는 별개다. 2D XY, Top XZ, Front XY, Side YZ를 구분하고 각 뷰포트의 조작·기즈모·렌더 모드를 보존한다.

## Project

[Unity Project](https://docs.unity3d.com/6000.0/Documentation/Manual/ProjectView.html)를 기준으로 실제 파일과 에셋 제작 흐름을 연결한다.

| 입력 | HB 동작 |
| --- | --- |
| 폴더 클릭/경로 버튼 | 실제 폴더로 이동, 현재 경로 표시 |
| 카드 LMB, Ctrl/Shift 클릭 | 하나/토글/연속 범위 선택 |
| Ctrl+A | 현재 결과 전체 선택 |
| Enter/더블클릭 | 폴더 열기 또는 에셋 전용 편집기 열기 |
| Backspace | 상위 폴더; 검색 입력칸에서는 글자 삭제 |
| F2 / RMB | 이름 변경 / 새 폴더·재가져오기·복제·삭제·위치 찾기 |
| Ctrl+F | Project 검색칸 포커스 |
| 검색 범위·타입·내용 | 현재/전체 폴더, 타입 OR, 다른 조건 AND; 텍스트 파일 내부 검색 |
| 외부 다중 파일/폴더 드롭 | 목적지 확인·원본 보존·실제 디스크 임포트 |
| 내부 에셋 드래그 | Scene 배치/컴포넌트 할당/핀 참조; 외부 임포트와 구분 |
| 여러 에셋 열기 | 각각 문서로 열기; 기존 문서를 임의로 덮어쓰지 않음 |

검색 결과는 파일명·경로·타입과 내용 검색의 일치 위치를 제공한다. 새로고침·서버 재시작 후에도 디스크의 같은 파일이 보여야 한다.

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

## 이번 구현에서 검증한 범위

| 영역 | 구현/검증 | 아직 목표인 항목 |
| --- | --- | --- |
| 창 | 분할·탭·최대화/복원·초기화·독립 직교 뷰포트, 두 텍스트 문서 동시 표시 | 떠 있는 OS 창, 동적 문서 재열기 복구 |
| 그래프 | 다중/사각 선택·RMB/MMB 이동·확대·주석·핀·추출·빠른 생성키·타입/저장 검사 | Shift휠·변수 드래그·Ctrl 핀 이동·선 더블클릭·북마크/정렬 전체 프로필 |
| Project | 실제 폴더·다중 가져오기/선택/문서·이름 변경·단일 타입 필터·파일 내용/하위 검색 | OR 타입 필터·재임포트·의존성/외부 파일 감시·일괄 이름 변경 |
| Timeline | 읽히는 전용 문서·키 선택/시간/보간 편집·4종 트랙·접선·실행 이벤트 | 외부 Curve 에셋·전용 Animation 클립 편집 |
| Play/C++ | 실제 빌드→C++ 호출→C++ 이벤트→BP 이동/회전, Stop 복원; 중단점 이어가기·루프/매크로/지연 자동 검사 | 실행 객체 선택·Step Into/Out·프레임 명령·native 파일/줄 진단 링크 |
| 저장 | 디스크 Scene/BP/Source/열린 텍스트, 손상 거부와 에셋 ID 재열기 | 머테리얼 그래프/Animation 키 저장·전체 에디터 Undo·문서별 복구 |
| 장면 | 단일 선택·Transform·도형/광원·2D/3D·모델 미리보기/배치 | 다중 장면 선택·Hierarchy 부모 드래그·Fly 프로필·Prefab·모든 스냅 도구 |

위 동작 표는 전체 목표 계약이다. 남은 항목을 현재 도움말이나 성공 동작으로 표시하지 않는다. 화면 검증은 실제 파일/입력을 사용했고 사용자 원본 장면을 덮어쓰지 않았다.
