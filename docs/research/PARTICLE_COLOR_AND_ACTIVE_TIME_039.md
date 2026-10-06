# 039 파티클 출력 색상·텍스처 방향과 모바일 프레임 측정

2026-10-07. 전체 렌더/API/엔진 완료를 뜻하지 않는다. Renderer의 공통 출력 단계와 실제 앱 진단에서 발견한 문제를 수정한다. 기존 사용자 설치5946523bdd1003b6·프로필·원본 Auric 게임은 유지하고 검증 후 다음 불변 버전을 만든다.

## 확인한 자료와 입력 의미

- [Three Color Management](https://threejs.org/manual/pages/color-management.html) 자체 전체 본문, 원시 SHA dd3adaa7a76857bff163974b3780804917e2a0059490f958f00ff2f111845fed. 연결 API/다른 문서 전체로 계산하지 않는다.
- 설치 고정 Three0.180.0의 Color.setRGB 자체 선언·본문, ColorManagement workingColorSpace, map_particle_fragment·tonemapping_fragment·colorspace_fragment의 실제 코드. 원시 SHA/범위 native/build/particle-color-pending-039/implementation-sources.json. 공식 구현은 [Three 소스](https://github.com/mrdoob/three/tree/r180/src/renderers/shaders/ShaderChunk)와 대응한다.
- ParticleSystem 시작/종료 RGB는 기존 Float32 속성을 선형 RGB로 그대로 전달한다. JSON·컴포넌트·C++/BP/AI 입력 수치나 수명 보간·알파 의미를 변환하지 않는다. sRGB 텍스처는 기존 SRGBColorSpace로 읽고 최종 출력에 tone mapping·색 공간 변환을 적용한다. Three가 선택한 중간 렌더 타깃 정책을 따른다.

## 재현·수정

- 수정 전 격리 Edge GPU에서 sRGB128/64/192 텍스처의 기본 PointsMaterial 화면값128/64/192와 엔진55/13/134가 달랐다. 위 빨강/아래 파랑 텍스처도 엔진에서 반대였다. 원시 gpu-before.json을 보존했다. 실제 엔진이 아닌 대조 실험으로 표시한다.
- production ShaderMaterial에 기존 Three 출력 chunk를 사용하고 point UV의 Y를 기본 PointsMaterial과 맞춘다. 텍스처가 없는 원형 alpha, 정렬/마스크·자료 저장/배치/시뮬레이션 순서를 바꾸지 않는다. 새 텍스처/버퍼나 후처리 패스를 만들지 않는다.
- runParticleColorCase는 production sceneRendering의 실제 재질을 기본 PointsMaterial과 비교한다. 흰색 및 선형(.5,.25,.75)/alpha.5, NoToneMapping·ACES, 화면/선형/sRGB 타깃12조합과 비대칭 텍스처 방향2개·프로그램 링크1개 총15조건이다. 중간 타깃의 이중 변환도 거절한다.
- 실제 Windows/WebView2 native/build/authoring-window-Hh3b8Y: 기존2D GPU181/광원111와 새15조건·오류0을 통과했다. 앞 BJvkgV 검사는 기존 정렬 검사가 선형 .5를 출력값128로 단정해 실패했다. 출력 .5의 sRGB 값은 Three 변환으로 산출해 검사를 바로잡고 동일 실제 창 검사를 재실행했다. 순서 검사를 제거하거나 비교를 완화하지 않았다.
- iOS 검사 프로젝트만 같은 함수 본문을 WKWebView에서 실행하도록 추가했다. 검사 재질/대체 셰이더로 production을 바꾸지 않고 실제 쿠킹된 Renderer를 호출한다. 결과·실패 때의 추가 증거를 별도 파일로 보존한다. 실제 앱 결과는 후속 기록하며 아직 성공으로 표시하지 않는다.

## 프레임 측정 수정

- source bb36739의 실제 iOS 앱 보고는 work 평균46.8977ms/렌더 제출 평균.9791ms인데 frame interval 평균69.6514ms였다. FrameProfiler는 시작 시각 사이를 그대로 차감하고 Player는 앱 전환에서 게임 delta만 초기화해, 검사 중 배경6초가 FPS에 들어갔다. 시작한 프레임이 네이티브 응답을 기다리다 배경으로 가면 work/simulation에도 같은 대기가 섞일 수 있었다.
- FrameProfiler의 누적 비활성 시간 두 숫자와 time(now)를 사용해 interval·work·simulation·render 제출을 동일 활성 시간으로 잰다. 첫 복귀 프레임/누적 표본을 버리거나 높은 비용 표본을 걸러내지 않는다. 호출이 중복돼도 비활성 시간을 중복 차감하지 않으며 표본 reset은 활성 시계 상태를 보존한다. C++ 게임 시계·프레임 스케줄·물리·입력 delta는 그대로다.
- check-frame-rate: 정해진6초 배경이 기존100fps/9ms work/8ms simulation 표본과 같아야 한다. 배경 중 시계 정지·중복 suspend/resume·대기 중 프레임·reset 보존을 확인했다. check-player-lifecycle은 실제 Player 함수를 실행해 활성 상태와 타임스탬프 전달을 검사했다. 두 검사가 통과했다. 이 수정은 측정의 정정이며 모바일60 달성/게임 처리 시간 개선으로 주장하지 않는다.
- CI 재사용은 Player·Profiler의 기준 본문을 비교해 이 명시된 변경만 허용한다. 다른 변경은 전체 검사를 요구한다. 바뀐 Renderer/VM 검사는 실행하고 공용 C++/프레임 채널/캐시/AI 실행은 불변 소스 증거를 재사용한다. 긴 스트레스 검사는 추가하지 않는다.


### 2026-10-07 — 실제 앱의 파티클 출력·활성 시간 측정 확인

- 실행 source478e610, iOS run37487615079은 기기/시뮬레이터 SDK 컴파일·독립 iPhone SE3 WKWebView 앱1080프레임/오류0을 통과했어요. production 파티클의 흰색·선형 RGB/alpha·두 tone mapping·화면/선형/sRGB 타깃12조합, 비대칭 UV2개·셰이더 링크1개 총15조건이 기본 PointsMaterial과 일치했어요. 기존 C++2AOT/동기Rapier/파일 range·한글/SVG·오디오 신호·배경 정지/복귀도 통과했어요. https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37487615079
- 실제 Windows Hh3b8Y에서도 기존2D181/광원111와 새15조건·오류0이에요. Android Lwbr7o 두CPU Java/DEX/JNI/C++·16KB ELF/서명·정렬·APK/AAB와 실제 패키지의 공유 실행파일4개 SHA 일치를 확인했어요. APK SHA7c560f279ae2fac358fad244e88734b15532bb8f3f1deed7c7696b44dfa9fc70, AAB SHA7f45fb5bced8eb48cde92579b23f8a843d12e34635ecd2bab5c396633cc1dbb7예요. 실물폰 설치/실행·iOS 배포서명·가청은 미검증이에요.
- FrameProfiler가 배경6초를 interval/work/simulation에 섞던 문제를 공통 활성 시계로 고쳤어요. 표본을 삭제하거나 큰 값을 제한하지 않아요. 실제 iOS 마지막600프레임25.2951fps/work 평균39.2833/중앙37/p95 58ms, simulation 평균38.1167/p95 57ms, render 제출 평균1.0383/p95 2ms이며60목표미달이에요. 앞 CI와 부하가 통제된 비교가 아니며 측정 정정을 성능 개선으로 주장하지 않아요.
- check-frame-rate·check-player-lifecycle의 실제 함수 회귀, 변경 Renderer/VM 검사를 통과했고 불변 C++ 공유 기반은 소스 대조로 재사용했어요. 증거 native/build/particle-color-result-039.json·ios-color-37487615079-ios-particle-color.json·particle-color-android-039.json. 새 장시간 검사를 추가하거나 원본 게임/에셋/C++/검사기·사용자 창·프로필·기존8시간 검사에는 손대지 않았어요.
- 엔진_요청_프레임.md의 새 보스전 기록(기존 설치82abc,78.2fps·simulation 평균10ms·편집기 clientOperations 약160ms/0.3초)을 확인했어요. 이 기록을 누락하지 않고 편집기 명령 적용 경로를 다음 조사 대상으로 유지해요. 전체 엔진/전체 API 완료로 계산하지 않아요.

- 2026-10-07 사용자 설치 완료: source273f38a(실행478e610)/bundleff86c664879f12a3, C:/Users/kirby/HBEngine/Versions/ff86c664879f12a3/HBEngine.exe.1785파일/변경21SHA 일치, 기존5946523 설치 manifest·프로필과 adb14204 보존, 사용자용 바탕화면 바로가기/HKCU .hbproject 경로 일치예요. 설치 당시 실행 중인 사용자 엔진은 없었으며 앱을 열거나 닫지 않았어요. 다음 실행부터 적용돼요. 증거 native/build/particle-color-user-install-039.json. 이 뒤 기록 커밋은 설치 실행 소스와 구분해요.
