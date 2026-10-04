# 추가 누적 요구: 게임 출력·플레이와 PC·모바일 에디터

2026-10-04 주인님의 추가 지시를 영속 기록해요. **기존 전체 엔진 분석·제작 요구에 추가**하며 몇 개 export 버튼, 웹 미리보기, 원격 화면만으로 완료 처리하지 않아요. 현재 단계는 `research_only`이며 구현 시작 순서는 [전체 분석 규약](ANALYSIS_PROTOCOL.md)을 유지해요.

사용자 결과는 두 가지예요. HBEngine에서 제작한 게임을 PC 실행 파일 또는 모바일 앱으로 내보내 실제 기기에서 플레이할 수 있어야 해요. HBEngine 에디터 자체도 컴퓨터와 모바일 기기에서 프로젝트를 제작·편집할 수 있어야 해요. 게임을 모바일에 내보내는 능력과 모바일 에디터 앱의 제작 능력은 각각 완료 조건을 가져요.

## 누적 요구와 상세 분석 대기열

| 요구 ID | 사용자 결과 | 분석에 반드시 포함할 세부 |
| --- | --- | --- |
| HB-EXPORT-PC | PC에서 독립 게임 실행 | Windows exe·portable/installer, macOS/Linux 대응 경로·의존 런타임·CPU/GPU/OS 지원·아이콘/제품 정보·창/전체 화면·입력/오디오·설치/삭제·사용자 저장 위치·업데이트·오프라인·C++/노드 공통 실행 |
| HB-EXPORT-MOBILE | 모바일 기기에 게임 설치·플레이 | Android APK/AAB·iOS/iPadOS 앱/Xcode 산출물·SDK/NDK/JDK/Xcode·기기/시뮬레이터·ABI·서명/프로비저닝·앱 ID/version·권한·스토어/직접 설치·터치/컨트롤러·orientation/safe area·suspend/resume·메모리/열/배터리·저장/업데이트 |
| HB-EDITOR-PC | 독립 PC 에디터에서 제작 | 에디터 실행 파일/설치·프로젝트 연결·창/도킹/모니터·외부 IDE·import/cache·GPU backend·플러그인/toolchain·메뉴/키/마우스·게임 실행/디버그·복원·업데이트 |
| HB-EDITOR-MOBILE | 모바일 에디터 앱에서 실제 제작 | 프로젝트/파일/에셋 접근과 재열기·2D/2.5D/3D viewport·component/graph/material/animation/UI 등 동일 편집 데이터·touch/pen/IME·외부 keyboard/mouse·접근성·작은 화면/태블릿/fold·앱 중단/복원·local Play·C++ source와 native plugin·local/원격 빌드·설치/업데이트 |
| HB-BUILD-COMMON | 사람이 내보내기까지 쉽게 수행 | profile/target 설정→검사→C++ compile/link→platform shader/asset cook→선택 content와 dependency stage→package→sign→install→launch→play/debug. 단계별 로그/진행/취소/실패/재시도·캐시/증분/chunk·서명 참조·artifact/report/version |
| HB-AI-PLATFORM | AI도 같은 작업을 정확히 수행 | 같은 profile/schema/타입/stable ID·project/source revision·dry-run·작업 상태/오류·artifact hash·대상 기기/host capability·허용 파일/서명 참조·취소/복원·사람/AI 편집 충돌·공통 CLI/API·재현 가능한 build manifest |

이 표도 완전한 엔진 분모가 아니에요. 공식 본문/API에서 새로 발견하는 세부와 플랫폼 의존 기능을 계속 연결해요. 플랫폼 호환 제약을 미확인 항목으로 유지하며 ‘지원하지 않을 것’으로 임의 삭제하지 않아요.

## 분석 결과를 제품 구조에 연결할 때

공통 C++/노드 runtime과 editor 데이터/변경 명령의 의미는 플랫폼마다 같아야 해요. OS window/input/file/권한/audio/GPU·compiler·installer 경계는 실제 지원 자료를 따라 조사해요. Windows/Win32/DX11 기반 목표만으로 Android/iOS 호스트 지원이 성립하지 않으므로 portable backend·mobile shell·shader/native plugin toolchain의 세부 근거를 확보해야 해요.

에디터 빌드, 게임 runtime 빌드, 사용자 C++ module 빌드, 에셋 변환, 최종 package는 산출물·대상·판본을 분리해요. 원격 빌드가 필요할 경우도 모바일의 로컬 제작/편집 요구를 대체하지 않으며 host/toolchain·소스 전송/revision·네트워크 오류·취소·서명·결과 수신을 조사해요. 가벼운 작업·오프라인 제작과 전체 기능을 유지할 방법을 함께 분석해요.

현재 근거는 [Unity·Unreal 빌드/호스트 011](BUILD_EDITOR_PLATFORM_RESEARCH_011.md)과 [실제 모바일 에디터·플랫폼 012](MOBILE_EDITOR_BODY_012.md)이에요. 한 플랫폼의 성공을 다른 플랫폼의 성공으로 계산하지 않고 official editor host·게임 target·remote companion과 HBEngine의 설계 요구를 구분해요. 아래 검증 조건은 구현 후 별도로 수행할 작업이며 이번 연구에서 실행한 검사가 아니에요.

## 각각의 완료 조건

1. 사람과 AI가 같은 프로젝트를 생성/열기→에셋/오브젝트/각 편집 문서 작성→디스크 또는 허용 provider 저장→종료/재열기→실제 runtime 효과까지 확인해요. PC와 모바일 editor host마다 독립 증거가 필요해요.
2. 출력 파일의 identity·version·CPU/OS·내용/참조·C++ ABI·shader/asset format·서명·설치 가능성을 검사해요. 성공 report만 남고 손상/누락 artifact가 생기는 경로도 검증해요.
3. 실제 대상 기기에서 새 설치→cold launch→2D/2.5D/3D gameplay/입력/오디오/저장→pause/background/resume→종료→업데이트·저장 호환까지 확인해요. editor preview와 remote streaming은 해당 native game 검증을 대신하지 않아요.
4. missing SDK/device·잘못된 profile/signing reference·기기 ABI 불일치·읽기 전용/권한 상실·공간 부족·compile/cook 실패·중단/네트워크 장애를 재현하고 실패 위치·복원·재시도와 취소 완료를 검사해요.
5. 개발/배포 구성에서 디버그·성능·패키지 크기·기기별 shader·지속 실행/열·종료/저장 계약을 각각 확인해요. 빌드에 에디터 데이터나 서명 비밀이 들어가는지 별도 확인해요.

기존 Windows/WebView2 Game.exe 경로는 과거 prototype 기록으로 보존하며 이번에 재실행하지 않았어요. 현재 추가 지시는 SDK 설치·플랫폼 지원 구현 완료로 표시하지 않고 전체 연구/향후 제작의 요구로 남겨요.
