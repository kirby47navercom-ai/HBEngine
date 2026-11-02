# 네이티브 입력·목록·긴 경로 · WORK3416

네이티브 게임 실행기의 입력과 기본 목록·트리를 기존 공용 VM·위젯·C++ API에 연결해요. 프레임 목표나 게임 원본은 바꾸지 않아요.

입력·문자·포커스 해제를 하나의 발생 순서로 적용해요. 포커스를 잃기 전에 대기하던 키 누름을 초기화 뒤에 다시 적용하지 않아요. 같은 입력 경계 사이의 마우스 이동만 마지막 위치로 합치며 클릭·문자·해제 경계는 남겨요. 10000개 이동 샘플이 한 이동 이벤트로 합쳐지는 경우도 현재 위치와 프레임 이동량, 클릭 위치를 유지해요. 여러 마우스 버튼을 누르면 마지막 버튼을 놓을 때 캡처를 풀고, 캡처 상실·취소·포커스 상실 때 누른 상태를 해제해요. XButton1/2는 `ThumbMouseButton`, `ThumbMouseButton2`로 받아요.

XInput 컨트롤러는 최대 4개 장치의 변경 상태만 기존 입력 키로 보내요. 연결 안 된 슬롯은 1초 뒤 다시 확인하며, 입력을 받을 때까지 DLL을 로드하지 않아요. 시스템 DLL만 사용하며 새 DLL을 게임에 복사하지 않아요. 스틱의 원형 데드존과 트리거 임계값을 적용하고 연결 해제·포커스 상실을 해제 입력으로 보낸 뒤 복귀 시 현재 상태를 복원해요. 장치별 `native:gamepad:<0..3>` 소스는 공용 입력 상태에서 병합돼요. 로컬 플레이어별 라우팅과 진동 API는 이번 구현 범위가 아니에요.

| 기존 Input/C++/매핑에 넣을 키 | 값 |
| --- | --- |
| `Gamepad_LeftX`, `Gamepad_LeftY`, `Gamepad_RightX`, `Gamepad_RightY` | -1..1, 위쪽 Y가 양수 |
| `Gamepad_LeftTriggerAxis`, `Gamepad_RightTriggerAxis` | 0..1 |
| `Gamepad_LeftTrigger`, `Gamepad_RightTrigger` | 임계값을 넘으면 1 |
| `Gamepad_FaceButton_Bottom/Right/Left/Top` | A/B/X/Y, 0 또는 1 |
| `Gamepad_DPad_Up/Down/Left/Right` | 0 또는 1 |
| `Gamepad_LeftShoulder/RightShoulder`, `Gamepad_LeftThumbstick/RightThumbstick` | 0 또는 1 |
| `Gamepad_Special_Right/Left` | Start/Back, 0 또는 1 |

예를 들어 기존 `hb::Input::GetAxis("Gamepad_LeftX")`와 Input Mapping의 축을 그대로 사용해요. 실제 컨트롤러 하드웨어 시험은 아직 없어요. Windows XInput 상태를 주입한 C++ 검사에서 데드존·범위·4개 슬롯·변경 없음·재연결·포커스 복귀를 확인했어요.

기본 `ListView`·`TreeView`는 공용 `listLayout`·`ListSelection`으로 그려요. 보이는 행만 그리며 목록 문자열이나 높이가 바뀌었을 때만 레이아웃을 재구성해요. 단일/다중 선택, Shift/Ctrl, 방향·Home/End·Page 키, 트리 펼침, 스크롤과 기존 `UI::SetListItems`, `MoveListItems`, `ReparentTreeItems`, 목록 간 이동을 연결해요. 두 목록을 이동할 때는 양쪽 자료를 먼저 바꾸고 변경 이벤트를 내요. 사용자 행 위젯·자동 행 높이·드래그/전송 그룹은 계속 명시적으로 거절하며 기본 행으로 조용히 대체하지 않아요.

스크롤 조상 영역 밖에 잘린 요소는 클릭되지 않아요. 화면이 다시 그려져도 누르던 버튼의 요소 정체성을 유지해요. 회전·배율이 있는 슬라이더·가상 축은 실제 로컬 좌표로 계산하고 비활성 입력란은 입력을 받지 않아요. 공용 마우스 월드 방향 조회는 Raycaster/좌표 scratch를 재사용하며 입력 초기화·무효 카메라 때 이전 카메라 참조를 놓아요.

긴 경로에서는 C++ worker 실행에 Windows 확장 경로를 사용해요. 실행 파일 정보 기록은 Windows 리소스 API의 긴 경로 한계를 피해 PE 한 개를 짧은 TEMP에서 처리하고, 실제 앱 이름을 보존한 뒤 같은 폴더의 임시 파일을 원자적으로 교체해요. 실패 때 원본을 남기고 임시 파일을 지워요. 빌드 helper는 오류 창을 기다리지 않고 stderr와 종료 코드로 실패를 돌려줘요. 서명된 공급자 실행 파일의 변경 거절은 유지해요.

검증은 `check-native-input-lists.mjs`, `check-native-package-paths.mjs`, `check-native-ui-sdk-flow.mjs`, `check-native-game.mjs`로 묶었어요. 실제 숨긴 release DirectX 창40프레임에서 한글·SVG·음성·C++ 목록 이동·트리 이동·다시 그리는 중 클릭·포커스/캡처 해제·정상 종료를 확인했어요. 이는 전체 사용자 게임 FPS나 수신 PC 백신 판정의 보장이 아니에요.

플랫폼 동작 근거: [Microsoft XInput 지침](https://learn.microsoft.com/en-us/windows/win32/xinput/getting-started-with-xinput), [캡처 변경](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-capturechanged), [Windows 긴 경로](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation), [리소스 기록 API](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-beginupdateresourcew).
