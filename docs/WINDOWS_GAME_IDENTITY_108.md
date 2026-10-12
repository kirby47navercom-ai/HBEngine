# Windows 패키지별 앱·오디오 독립

107 중첩 매질·HDRI·디노이저 설치 후, 게임별 Windows 식별 문제를 처리해요. 실제 검사와 원문 SHA는 [기계 기록](research/WINDOWS_GAME_IDENTITY_108.json)에 있어요.

## 원인과 변경

기존 코드에는 프로젝트 ID별 WebView2 프로필과 저장 폴더가 이미 있었어요. 격리한 게임 두 개로 확인하니 프로세스와 오디오 그룹 GUID는 달라도 `GetSessionIdentifier`는 같은 `msedgewebview2.exe` 식별자를 돌려줬어요. 이름이나 그룹만 바꾸는 것으로 저장된 음량 식별까지 분리됐다고 판단하지 않았어요.

Windows 패키지는 프로젝트 UUID로 고정된 `HBGame_<UUID>.exe`와 `HBEngine.Game.<UUID>` AppUserModelID를 사용해요. 실행 파일의 제품명·설명은 빌드 프로필의 게임 이름으로 기록하고, 이름을 바꾸거나 다시 빌드해도 같은 프로젝트의 UUID는 유지해요. 변경한 PE 바이트로 파일 목록의 크기·SHA를 다시 계산해요. 키오스크도 새 파일명을 읽고 기존 `Game.exe` 형식을 지원해요.

기존 AudioRouting에서 믹싱한 최종 스테레오 PCM을 공유 버퍼로 전달하고, 해당 게임 실행 파일의 WASAPI 세션에서 출력해요. 프로젝트 UUID가 오디오 세션·그룹 GUID이며 이름과 아이콘 경로도 게임에 연결해요. 믹서, 공간 음향, AudioSource, 블루프린트 및 C++ 재생 함수는 같은 기존 경로를 사용해요. Web Audio는 무음 sink로 그래프를 처리해 WebView2 소리를 중복 출력하지 않아요. 마이크 권한은 요청하지 않아요.

Windows 게임은 입력 없이 시작하는 자동 재생을 허용해요. 실제 소리 요청이 들어올 때 컨텍스트와 네이티브 버퍼를 만들고, 웹·모바일의 기존 입력/자동 재생 정책은 유지해요. 기존 사용자 프로필·게임 저장 경로는 바꾸지 않았어요.

## 비용과 수명

- 48 kHz, 2채널 Float32, 512프레임 블록: 약 10.67 ms 단위 전송이에요.
- 공유 슬롯은 16 KiB, 네이티브 큐 할당은 32 KiB예요. 음원별로 PCM 통신을 만들지 않아요.
- Worklet 버퍼는 4개, 미확인 메시지는 최대 3개예요. 호스트가 복사하고 확인한 슬롯만 다시 사용해요.
- UI가 멈추면 늦은 블록을 누적하지 않아요. 네이티브 대기열도 2,048프레임을 넘기지 않아요.
- PCM을 JSON으로 변환하거나 웹 서버로 전송하지 않아요. 소리 없는 블록은 두 블록 뒤 전송을 쉬어요.
- 입력이 끊기면 300 ms 뒤 출력 장치를 해제해요. 종료할 때 출력 스레드, 장치 알림, 공유 버퍼와 큐를 정리해요.

관찰된 WASAPI 장치 버퍼는 1,056프레임이었어요. 이 값과 블록 크기는 음향 지연 실측값이 아니에요. `underflows` 진단 수치는 대기 중인 블록을 부분적으로 읽은 횟수이며 하드웨어 글리치나 청취 품질 측정이 아니에요.

## 묶음 검증

서로 다른 프로젝트 두 개를 새로 만들어 무음으로 실제 Windows 패키지를 실행했어요. 게임 이름·제품 메타데이터·앱 ID, 게임 프로세스가 소유한 활성 오디오 세션 하나, 서로 다른 지속 식별자·그룹을 확인했어요. A의 음량을 0.23으로 바꿔도 B의 0.61이 유지됐고, 음소거 상태도 분리됐어요. 같은 실행 파일을 다시 열었을 때 A의 음량이 유지됐어요. 모든 검사 플레이어가 정상 종료했어요.

실제 AudioSource의 PCM peak는 두 게임 모두 약 0.06104였고 장치 오류는 0, 늦은 큐 폐기로 기록된 프레임도 0이었어요. 기존 `Game.exe` 형식과 범위를 벗어난 슬롯 거부도 검사했어요. 별도 Worklet 검사에서는 UI 응답이 오지 않을 때 버퍼·메시지 상한과 무음·종료를 확인했어요.

입력 없는 2D·3D 패키지의 자동 재생, BP/C++ 실행, 저장, 컴파일러 없는 실행, 파일 무결성 거부 및 서버 종료가 통과했어요. 키오스크의 검사 전용 PID 강제 종료/자동 재시작과 정상 종료, 위젯·C++·믹서·버퍼/스트리밍 오디오 검사도 통과했어요. 기존 C++ 식별자 판정은 최신 컴파일러의 `-Werror` 검사에 맞게 괄호만 명시했어요.

## 적용 범위

엔진 업데이트 뒤 게임을 다시 내보내야 새 실행 파일과 오디오 연결이 포함돼요. 이전에 내보낸 게임, 원본 프로젝트와 실행 중인 사용자 창은 수정하지 않았어요. 같은 경로에서의 재실행 음량 유지는 확인했지만 다른 폴더로 옮긴 패키지의 Windows 음량 승계는 확인하지 않았어요.

실제 스피커 청취, Windows 출력 장치 선택 화면, 장치 연결/분리와 실게임 전체 FPS·모바일 하드웨어는 이번 검증에 포함하지 않았어요. 엔진 AudioRouting 밖에서 직접 만든 미디어 출력은 별도 연결이 필요해요.

## 공식 근거

[WebView2 사용자 데이터](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder), [AppUserModelID 초기화](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-setcurrentprocessexplicitappusermodelid), [오디오 그룹](https://learn.microsoft.com/en-us/windows/win32/api/audiopolicy/nf-audiopolicy-iaudiosessioncontrol-setgroupingparam), [세션 이름](https://learn.microsoft.com/en-us/windows/win32/api/audiopolicy/nf-audiopolicy-iaudiosessioncontrol-setdisplayname), [지속/인스턴스 식별자](https://learn.microsoft.com/en-us/windows/win32/api/audiopolicy/nf-audiopolicy-iaudiosessioncontrol2-getsessionidentifier), [WASAPI 초기화와 세션 GUID](https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nf-audioclient-iaudioclient-initialize), [공유 버퍼 수명](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2sharedbuffer), [스크립트 메시지/버퍼](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/javascript/webview), [Chrome 무음 sink](https://developer.chrome.com/blog/audiocontext-setsinkid/), [Chromium 출력 구현](https://raw.githubusercontent.com/chromium/chromium/main/media/audio/win/audio_low_latency_output_win.cc)를 지정 구역에서 대조했어요. 전체 페이지·API·엔진 문서 분석 완료로 승격하지 않아요.
