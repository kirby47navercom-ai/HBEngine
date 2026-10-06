# iOS 초기 실행 구별 검사 — 2026-10-06

[원격 실행37466333179](https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37466333179)의 Xcode SDK18.5 기기 및 시뮬레이터 컴파일은 성공했고 독립 iPhone SE3 설치도 성공했다. 첫 `simctl launch`가180초 뒤 시간 초과했다. 앱의 런타임 보고와 HBGame 프로세스 로그는 없었다. 컴파일 성공을 앱 실행 성공으로 계산하지 않는다.

실패 로그의 CoreSimulatorBridge는 부팅 후108초에 `bootLeeway:120` 및 FrontBoard 열기 요청을 기록했다. 앱 등록의 placeholder 변경도 계속됐다. 새 시뮬레이터 서비스 초기화 지연이라는 가설이며 확정 원인이 아니다. 생성·설치된 장치 외에는 종료·삭제하지 않았다.

[Apple WWDC19 Simulator 설명](https://developer.apple.com/videos/play/wwdc2019/418/) 중249–304줄의 simctl 구역을 다시 읽었다. launch는 시스템에 설치된 앱 시작을 요청하고, spawn은 시뮬레이션 환경의 명령을 실행한다. get_app_container로 앱 자료를 읽고 로그로 실패를 구별할 수 있다. 이 구역의 읽기를 Apple 문서 전체 본문/API 완료로 계산하지 않는다.

검사만 바꿨다. 새 장치 부팅 후 두 SDK를 컴파일하는 동안 서비스를 초기화하고, 시스템 Safari 앱 실행을 별도 기준으로 기록한다. 그 후 게임 설치, 앱 자료 경로 확보, 게임 실행 순서로 진행한다. 테스트용 main 진입 로그와 실패 시 보고 수집을 추가했다. 게임 코드·타임아웃·합격 조건을 바꾸지 않았다. 새 원격 결과 전에는 WKWebView/C++/오디오/복귀 합격을 표시하지 않는다.

공용 검사는 실행 소스가 이미 통과한7ff2a077과 같은 경우에만 재사용한다. 재사용 허용 목록은 문서·두 검사 파일·워크플로뿐이고 다른 변경은 전체 검사를 요구한다. Windows 설치본을 다시 빌드할 필요는 없다.
